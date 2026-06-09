import { z as zod } from "@distribution-copilot/shared";
import { prisma } from "@distribution-copilot/database";
import { Queue } from "bullmq";

import { createSerpClient } from "../../clients/serp/serp.client.js";
import { redisConnection } from "../../config/redis.js";
import { EXTRACT_QUEUE } from "../extract/extract.types.js";
import { type DiscoveryJobPayload, type DiscoveryJobResult } from "./discovery.types.js";

const payloadSchema = zod.object({
  productId: zod.string().min(1),
});

/** Maximum number of keywords to search per run (keeps SERP usage reasonable). */
const MAX_KEYWORDS = 5;

/** Maximum SERP results to collect per keyword. */
const SERP_RESULTS_PER_QUERY = 10;

/**
 * Core logic for the discovery job — isolated from BullMQ for testability.
 *
 * Steps:
 *   1. Validate payload.
 *   2. Load product + AI profile keywords from the DB.
 *   3. Run SERP searches for each keyword (up to MAX_KEYWORDS).
 *   4. Deduplicate URLs across all results.
 *   5. Enqueue one extract job per URL.
 */
export async function runDiscovery(
  raw: unknown,
  log: (msg: string) => void = console.log,
): Promise<DiscoveryJobResult> {
  const { productId } = payloadSchema.parse(raw) as DiscoveryJobPayload;
  log(`[discovery] starting product=${productId}`);

  // Load product and its AI profile.
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { profile: true },
  });

  if (!product) {
    throw new Error(`[discovery] product ${productId} not found`);
  }

  // Determine search queries: use profile keywords (up to MAX_KEYWORDS), or
  // fall back to the product name when no profile has been generated yet.
  const queries: string[] =
    product.profile && product.profile.keywords.length > 0
      ? product.profile.keywords.slice(0, MAX_KEYWORDS)
      : [product.name];

  log(`[discovery] queries=${queries.join(" | ")}`);

  const serp = createSerpClient(process.env.SERP_API_KEY);
  const extractQueue = new Queue(EXTRACT_QUEUE, { connection: redisConnection });

  // Collect SERP results across all queries, deduplicating by URL.
  const seenUrls = new Set<string>();
  const urlsToExtract: { url: string; title: string; snippet: string }[] = [];

  for (const query of queries) {
    const results = await serp.search(query, SERP_RESULTS_PER_QUERY);
    log(`[discovery] query="${query}" results=${String(results.length)}`);

    for (const result of results) {
      if (seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);
      urlsToExtract.push({ url: result.url, title: result.title, snippet: result.snippet });
    }
  }

  log(`[discovery] unique URLs=${String(urlsToExtract.length)}`);

  // Enqueue one extract job per URL.
  let extractJobsEnqueued = 0;
  for (const { url, title, snippet } of urlsToExtract) {
    await extractQueue.add(
      "extract",
      { url, productId, serpTitle: title, serpSnippet: snippet },
      {
        jobId: `extract:${productId}:${Buffer.from(url).toString("base64url").slice(0, 40)}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 3_000 },
      },
    );
    extractJobsEnqueued++;
  }

  log(
    `[discovery] done — urlsFound=${String(urlsToExtract.length)} extractJobsEnqueued=${String(extractJobsEnqueued)}`,
  );

  return { urlsFound: urlsToExtract.length, extractJobsEnqueued };
}
