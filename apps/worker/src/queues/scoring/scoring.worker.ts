import { Worker } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { runScoring } from "./scoring.processor.js";
import { SCORING_QUEUE } from "./scoring.types.js";

/**
 * BullMQ worker for the scoring queue.
 *
 * Concurrency is 1 while the mock provider is in use. Once a real AI provider
 * is wired up with its own rate limiter, raise this to 2-3 to process multiple
 * products in parallel.
 */
export function startScoringWorker(): Worker {
  const worker = new Worker(
    SCORING_QUEUE,
    async (job) => {
      return runScoring(job.data, (msg) => job.log(msg));
    },
    {
      connection: redisConnection,
      concurrency: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[scoring] job ${job.id} completed`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[scoring] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
