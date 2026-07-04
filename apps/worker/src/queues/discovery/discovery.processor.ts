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
  source: zod.string().optional(),
  since: zod.string().datetime().optional(),
});

/**
 * Maximum age of a discovered post in days. Results with a known publishedAt
 * older than this are dropped before enqueuing. Results with no publishedAt
 * (source didn't provide one at discovery time) are always kept.
 *
 * This applies regardless of any `since` passed on the job — it's the last line
 * of defense for sources (Lobsters, Dev.to) that never filter server-side.
 */
const MAX_RESULT_AGE_DAYS = 90;

/** Maximum number of keywords to search per run. */
const MAX_KEYWORDS = 5;

/** Maximum number of pain points to use as additional search queries. */
const MAX_PAIN_POINT_QUERIES = 3;

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

/** Returns true when publishedAt is known and older than MAX_RESULT_AGE_DAYS. */
function isTooOld(publishedAt?: string): boolean {
  if (!publishedAt) return false;
  const date = new Date(publishedAt);
  if (isNaN(date.getTime())) return false;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) > MAX_RESULT_AGE_DAYS;
}

/**
 * Returns true when the title or snippet contains enough signal words from
 * at least one of the given terms to be worth extracting.
 *
 * For each term, all words longer than 3 characters must appear in the text.
 * This catches paraphrased language ("my emails keep going to spam" matches
 * the term "emails landing spam") without requiring an exact phrase match.
 * Short stop-words (a, an, the, in, to, …) are skipped automatically.
 */
function isRelevant(title: string, snippet: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const text = `${title} ${snippet}`.toLowerCase();
  return terms.some((term) => {
    const words = term
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    return words.length > 0 && words.every((w) => text.includes(w));
  });
}

/**
 * Runs a set of queries against all sources, deduplicating URLs into seenUrls
 * and appending new results to urlsToExtract. Mutates both collections.
 * Results whose title+snippet share no significant words with relevanceTerms
 * are dropped before enqueuing to avoid polluting the DB with junk.
 */
async function searchAllSources(
  queries: string[],
  sources: DiscoverySource[],
  seenUrls: Set<string>,
  urlsToExtract: {
    url: string;
    title: string;
    snippet: string;
    publishedAt?: string;
    author?: string;
  }[],
  relevanceTerms: string[],
  log: (msg: string) => void,
  since?: Date,
): Promise<void> {
  for (const source of sources) {
    for (let i = 0; i < queries.length; i++) {
      if (i > 0) await sleep(INTER_REQUEST_DELAY_MS);

      const query = queries[i];
      if (!query) continue;
      const results = await source.search(query, RESULTS_PER_QUERY, since ? { since } : undefined);

      log(`[discovery] source=${source.name} query="${query}" found=${String(results.length)}`);

      let kept = 0;
      for (const result of results) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        if (isTooOld(result.publishedAt)) {
          log(
            `[discovery] age-filtered: "${result.title.slice(0, 70)}" (${result.publishedAt ?? "no date"})`,
          );
          continue;
        }
        if (!isRelevant(result.title, result.snippet, relevanceTerms)) {
          log(`[discovery] relevance-filtered: "${result.title.slice(0, 70)}"`);
          continue;
        }
        urlsToExtract.push({
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          publishedAt: result.publishedAt,
          author: result.author,
        });
        kept++;
      }
      log(`[discovery] source=${source.name} query="${query}" kept=${String(kept)}`);
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
  const { productId, source, since } = payloadSchema.parse(raw) as DiscoveryJobPayload;
  const sinceDate = since ? new Date(since) : undefined;
  log(
    `[discovery] starting product=${productId}${source ? ` source=${source}` : ""}${since ? ` since=${since}` : ""}`,
  );

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { profile: true },
  });

  if (!product) {
    throw new Error(`[discovery] product ${productId} not found`);
  }

  // ── Build relevance terms for pre-filtering ──────────────────────────────
  // All keywords + pain points are used both as search queries AND as the
  // vocabulary for the pre-filter that drops clearly irrelevant results.
  const profile = product.profile;
  const keywordQueries: string[] =
    profile && profile.keywords.length > 0
      ? profile.keywords.slice(0, MAX_KEYWORDS)
      : [product.name];

  // Pain points describe the problem in customer language — excellent for
  // finding intent-rich posts that generic keywords miss.
  const painPointQueries: string[] =
    profile && profile.painPoints.length > 0
      ? profile.painPoints.slice(0, MAX_PAIN_POINT_QUERIES)
      : [];

  // The union of keywords + pain points is the relevance vocabulary.
  // A result must share significant words with at least one of these terms.
  const relevanceTerms: string[] = [...keywordQueries, ...painPointQueries];

  // When a source filter is provided, only that platform is searched.
  const activeSources = source ? SOURCES.filter((s) => s.name === source) : SOURCES;

  log(
    `[discovery] keyword pass: queries=${keywordQueries.join(" | ")} sources=${activeSources.map((s) => s.name).join(", ")}`,
  );

  const extractQueue = new Queue(EXTRACT_QUEUE, { connection: redisConnection });
  const seenUrls = new Set<string>();
  const urlsToExtract: {
    url: string;
    title: string;
    snippet: string;
    publishedAt?: string;
    author?: string;
  }[] = [];

  await searchAllSources(
    keywordQueries,
    activeSources,
    seenUrls,
    urlsToExtract,
    relevanceTerms,
    log,
    sinceDate,
  );

  // ── Pain-point pass ──────────────────────────────────────────────────────
  // Searches using customer pain language ("emails landing in spam") which
  // surfaces intent-rich posts that exact product-category keywords miss.
  if (painPointQueries.length > 0) {
    log(`[discovery] pain-point pass: queries=${painPointQueries.join(" | ")}`);
    await searchAllSources(
      painPointQueries,
      activeSources,
      seenUrls,
      urlsToExtract,
      relevanceTerms,
      log,
      sinceDate,
    );
  }

  // ── Competitor-tracking pass ─────────────────────────────────────────────
  // Surfaces conversations where people express frustration with competitors
  // or actively compare alternatives — the highest-converting signal type.
  const competitorNames: string[] = [];

  if (profile && profile.competitors.length > 0) {
    competitorNames.push(...profile.competitors.slice(0, MAX_COMPETITORS));
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
    // Competitor queries use their own terms as relevance anchors — a post
    // mentioning "Instantly alternative" is relevant even without keyword overlap.
    const competitorTerms = competitorNames;
    await searchAllSources(
      competitorQueries,
      activeSources,
      seenUrls,
      urlsToExtract,
      competitorTerms,
      log,
      sinceDate,
    );
  }

  log(`[discovery] unique URLs to extract=${String(urlsToExtract.length)}`);

  let extractJobsEnqueued = 0;
  for (const { url, title, snippet, publishedAt, author } of urlsToExtract) {
    await extractQueue.add(
      "extract",
      {
        url,
        productId,
        sourceTitle: title,
        sourceSnippet: snippet,
        ...(publishedAt ? { sourcePublishedAt: publishedAt } : {}),
        ...(author ? { sourceAuthor: author } : {}),
      },
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
    `[discovery] done — kept=${String(urlsToExtract.length)} extractJobsEnqueued=${String(extractJobsEnqueued)}`,
  );

  return { urlsFound: urlsToExtract.length, extractJobsEnqueued };
}
