import { Worker, Queue } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { runDiscovery } from "./discovery.processor.js";
import { DISCOVERY_QUEUE } from "./discovery.types.js";
import { SCORING_QUEUE } from "../scoring/scoring.types.js";

/**
 * BullMQ worker for the discovery queue.
 *
 * Concurrency is intentionally 1: all jobs share one set of Reddit credentials
 * and rate limit state is tracked in-memory per RedditClient instance. Running
 * concurrent jobs would create independent clients that don't coordinate,
 * causing 429s. When we move to a Redis-based shared rate limiter this can be
 * raised safely.
 *
 * On completion, automatically chains to the scoring queue so newly discovered
 * opportunities are scored without manual intervention.
 */
export function startDiscoveryWorker(): Worker {
  const scoringQueue = new Queue(SCORING_QUEUE, { connection: redisConnection });

  const worker = new Worker(
    DISCOVERY_QUEUE,
    async (job) => {
      return runDiscovery(job.data, (msg) => job.log(msg));
    },
    {
      connection: redisConnection,
      concurrency: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[discovery] job ${job.id} completed`, job.returnvalue);

    // Chain to scoring: one job per product.
    // jobId without a timestamp allows BullMQ to deduplicate — if a scoring job
    // for this product is already waiting or active, the duplicate is silently dropped.
    const productId = (job.data as { productId?: string }).productId;
    if (productId) {
      void scoringQueue.add(
        "score",
        { productId },
        {
          jobId: `scoring:${productId}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
        },
      );
    }
  });

  worker.on("failed", (job, err) => {
    console.error(`[discovery] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
