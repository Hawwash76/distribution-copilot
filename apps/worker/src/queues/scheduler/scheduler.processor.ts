import { prisma } from "@distribution-copilot/database";
import { Queue } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { DISCOVERY_QUEUE } from "../discovery/discovery.types.js";
import { type SchedulerJobResult } from "./scheduler.types.js";

/**
 * Core logic for the daily scheduler job.
 *
 * Finds every non-deleted product that has a generated profile and enqueues a
 * discovery job for each. The discovery queue (concurrency = 1) serialises the
 * jobs, so the SERP rate limit is still respected regardless of product count.
 *
 * Idempotent: jobId is `scheduled-discovery-<productId>` — BullMQ skips
 * re-adding a job that is already waiting/active with the same ID.
 */
export async function runScheduler(
  log: (msg: string) => void = console.log,
): Promise<SchedulerJobResult> {
  log("[scheduler] starting daily discovery pass");

  // Only products with a profile can run discovery — they need keywords.
  const products = await prisma.product.findMany({
    where: { isDeleted: false, profile: { isNot: null } },
    select: { id: true, name: true },
  });

  log(`[scheduler] found ${String(products.length)} products with profiles`);

  if (products.length === 0) {
    return { jobsEnqueued: 0 };
  }

  const discoveryQueue = new Queue(DISCOVERY_QUEUE, { connection: redisConnection });
  let jobsEnqueued = 0;

  for (const product of products) {
    await discoveryQueue.add(
      "discovery",
      { productId: product.id },
      {
        // Stable jobId prevents double-enqueue if the scheduler fires while a
        // prior discovery job for the same product is still waiting.
        jobId: `scheduled-discovery-${product.id}`,
        attempts: 2,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    log(`[scheduler] enqueued discovery for product=${product.id} name="${product.name}"`);
    jobsEnqueued++;
  }

  log(`[scheduler] done — jobsEnqueued=${String(jobsEnqueued)}`);
  return { jobsEnqueued };
}
