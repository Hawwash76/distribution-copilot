import { Queue, Worker } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { SCORING_QUEUE } from "../scoring/scoring.types.js";
import { runExtract } from "./extract.processor.js";
import { EXTRACT_QUEUE, type ExtractJobPayload } from "./extract.types.js";

/**
 * BullMQ worker for the extract queue.
 *
 * Concurrency is 3: URL fetches are network I/O-bound and can run in parallel
 * without sharing rate-limit state.
 *
 * On completion, automatically chains to the scoring queue (one job per product,
 * deduplicated by jobId so multiple parallel extracts for the same product
 * collapse into a single scoring run).
 */
export function startExtractWorker(): Worker {
  const scoringQueue = new Queue(SCORING_QUEUE, { connection: redisConnection });

  const worker = new Worker(
    EXTRACT_QUEUE,
    async (job) => {
      return runExtract(job.data, (msg) => job.log(msg));
    },
    {
      connection: redisConnection,
      concurrency: 3,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[extract] job ${job.id} completed`, job.returnvalue);

    const productId = (job.data as ExtractJobPayload).productId;
    void scoringQueue.add(
      "score",
      { productId },
      {
        jobId: `scoring:${productId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      },
    );
  });

  worker.on("failed", (job, err) => {
    console.error(`[extract] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
