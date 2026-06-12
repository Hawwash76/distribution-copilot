import { z as zod } from "@distribution-copilot/shared";
import { prisma } from "@distribution-copilot/database";
import { Queue } from "bullmq";

import type { DiscoverySource } from "../../clients/discovery-source.js";
import { hnSource } from "../../clients/hn/hn-search.js";
import { redditSource } from "../../clients/reddit/reddit-search.js";
import {
  stackOverflowSource,
  softwareRecsSource,
} from "../../clients/stackoverflow/stackoverflow-search.js";
import { lobstersSource } from "../../clients/lobsters/lobsters-search.js";
import { devToSource } from "../../clients/devto/devto-search.js";
import { redisConnection } from "../../config/redis.js";
import { EXTRACT_QUEUE } from "../extract/extract.types.js";
import { type DiscoveryJobPayload, type DiscoveryJobResult } from "./discovery.types.js";

const payloadSchema = zod.object({
  productId: zod.string().min(1),
});

/** Maximum number of keywords to search per run. */
const MAX_KEYWORDS = 5;

/** Maximum number of competitor names to use in the competitor-tracking pass. */
const MAX_COMPETITORS = 3;

/** Results to request from each source per query. */
const RESULTS_PER_QUERY = 25;

/** Delay between requests to respect platform rate limits. */
const INTER_REQUEST_DELAY_MS = 1_000;

/**
 * All active discovery sources.
 *
 * Each source is searched for every query. Results are URL-deduplicated
 * before enqueuing, so running multiple sources is safe — the Discussion
 * table's unique constraint on url prevents duplicate storage.
 *
 * Sources in order of expected signal quality:
 *   - softwarerecs: tool recommendation requests by definition
 *   - stackoverflow: technical Q&A, tool comparisons
 *   - reddit: broad community discussions across many subreddits
 *   - hn: curated tech/startup discussions
 *   - lobsters: smaller curated tech community, different overlap from HN
 *   - devto: developer articles and community posts
 */
const SOURCES: DiscoverySource[] = [
  softwareRecsSource,
  stackOverflowSource,
  redditSource,
  hnSource,
  lobstersSource,
  devToSource,
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a set of queries against all sources, deduplicating URLs into seenUrls
 * and appending new results to urlsToExtract. Mutates both collections.
 */
async function searchAllSources(
  queries: string[],
  sources: DiscoverySource[],
  seenUrls: Set<string>,
  urlsToExtract: { url: string; title: string; snippet: string }[],
  log: (msg: string) => void,
): Promise<void> {
  for (const source of sources) {
    for (let i = 0; i < queries.length; i++) {
      if (i > 0) await sleep(INTER_REQUEST_DELAY_MS);

      const query = queries[i];
      if (!query) continue;
      const results = await source.search(query, RESULTS_PER_QUERY);

      log(`[discovery] source=${source.name} query="${query}" results=${String(results.length)}`);

      for (const result of results) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        urlsToExtract.push(result);
      }
    }
  }
}

/**
 * Core logic for the discovery job — isolated from BullMQ for testability.
 *
 * Steps:
 *   1. Validate payload.
 *   2. Load product + AI profile keywords from the DB.
 *   3. Run each keyword query against every discovery source.
 *   4. Run competitor-name queries to surface frustrated competitor users.
 *   5. Deduplicate URLs across all results.
 *   6. Enqueue one extract job per URL.
 */
export async function runDiscovery(
  raw: unknown,
  log: (msg: string) => void = console.log,
): Promise<DiscoveryJobResult> {
  const { productId } = payloadSchema.parse(raw) as DiscoveryJobPayload;
  log(`[discovery] starting product=${productId}`);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { profile: true },
  });

  if (!product) {
    throw new Error(`[discovery] product ${productId} not found`);
  }

  // ── Keyword pass ─────────────────────────────────────────────────────────
  // Use profile keywords if available; fall back to product name.
  const keywordQueries: string[] =
    product.profile && product.profile.keywords.length > 0
      ? product.profile.keywords.slice(0, MAX_KEYWORDS)
      : [product.name];

  log(
    `[discovery] keyword pass: queries=${keywordQueries.join(" | ")} sources=${SOURCES.map((s) => s.name).join(", ")}`,
  );

  const extractQueue = new Queue(EXTRACT_QUEUE, { connection: redisConnection });
  const seenUrls = new Set<string>();
  const urlsToExtract: { url: string; title: string; snippet: string }[] = [];

  await searchAllSources(keywordQueries, SOURCES, seenUrls, urlsToExtract, log);

  // ── Competitor-tracking pass ─────────────────────────────────────────────
  // Surfaces conversations where people express frustration with competitors
  // or actively compare alternatives — the highest-converting signal type.
  const competitorNames: string[] = [];

  if (product.profile && product.profile.competitors.length > 0) {
    competitorNames.push(...product.profile.competitors.slice(0, MAX_COMPETITORS));
  } else if (product.competitors) {
    // Fall back to the raw competitors string on Product if no profile yet
    competitorNames.push(
      ...product.competitors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_COMPETITORS),
    );
  }

  if (competitorNames.length > 0) {
    // Two high-signal query patterns per competitor: frustration + comparison
    const competitorQueries = competitorNames.flatMap((name) => [
      `${name} alternative`,
      `${name} vs`,
    ]);

    log(`[discovery] competitor pass: queries=${competitorQueries.join(" | ")}`);
    await searchAllSources(competitorQueries, SOURCES, seenUrls, urlsToExtract, log);
  }

  log(`[discovery] unique URLs=${String(urlsToExtract.length)}`);

  let extractJobsEnqueued = 0;
  for (const { url, title, snippet } of urlsToExtract) {
    await extractQueue.add(
      "extract",
      { url, productId, sourceTitle: title, sourceSnippet: snippet },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3_000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    extractJobsEnqueued++;
  }

  log(
    `[discovery] done — urlsFound=${String(urlsToExtract.length)} extractJobsEnqueued=${String(extractJobsEnqueued)}`,
  );

  return { urlsFound: urlsToExtract.length, extractJobsEnqueued };
}
