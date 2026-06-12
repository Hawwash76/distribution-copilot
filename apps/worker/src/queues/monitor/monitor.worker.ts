import { Queue, Worker } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { runMonitor } from "./monitor.processor.js";
import { MONITOR_QUEUE } from "./monitor.types.js";

/**
 * Default sweep interval in minutes. Override with MONITOR_INTERVAL_MINUTES env var.
 * Kept conservative (30 min) to stay well within all platform rate limits.
 */
const DEFAULT_INTERVAL_MINUTES = 30;

/**
 * Starts the monitor worker and registers the repeatable sweep job.
 *
 * BullMQ deduplicates repeatable jobs by queue + every pattern, so calling
 * this on every startup is safe — it acts as an upsert. The sweep runs at
 * the configured interval and finds all enabled ProductMonitor rows itself.
 */
export function startMonitorWorker(): Worker {
  const intervalMs =
    (parseInt(process.env["MONITOR_INTERVAL_MINUTES"] ?? "", 10) || DEFAULT_INTERVAL_MINUTES) *
    60 *
    1_000;

  const queue = new Queue(MONITOR_QUEUE, { connection: redisConnection });
  void queue.add(
    "monitor-sweep",
    {},
    {
      repeat: { every: intervalMs },
      removeOnComplete: { count: 20 },
      removeOnFail: { count: 20 },
    },
  );

  const worker = new Worker(MONITOR_QUEUE, async (job) => runMonitor((msg) => job.log(msg)), {
    connection: redisConnection,
    concurrency: 1,
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 20 },
  });

  worker.on("completed", (job) => {
    console.log(`[monitor] job ${job.id} completed`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[monitor] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
