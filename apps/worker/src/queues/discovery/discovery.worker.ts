import { Worker } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { runDiscovery } from "./discovery.processor.js";
import { DISCOVERY_QUEUE } from "./discovery.types.js";

/**
 * BullMQ worker for the discovery queue.
 *
 * Concurrency is 1: SERP API has a limited free-tier request budget and the
 * processor respects a minimum inter-request delay. Running concurrent
 * discovery jobs would exhaust that budget faster.
 *
 * Chaining to the extract queue happens inside the processor (one job per URL),
 * so this worker only needs to log completion and failures.
 */
export function startDiscoveryWorker(): Worker {
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
  });

  worker.on("failed", (job, err) => {
    console.error(`[discovery] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
