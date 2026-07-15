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
 * BullMQ keys a repeatable job by its exact repeat options, so re-adding one
 * with a *different* `every` (e.g. after changing MONITOR_INTERVAL_MINUTES
 * and restarting) does not replace the old schedule — it registers a second
 * one alongside it, and both keep firing forever. To keep this an idempotent
 * upsert regardless of interval changes, every existing "monitor-sweep"
 * schedule is removed before the current one is added.
 */
export function startMonitorWorker(): Worker {
  const intervalMs =
    (parseInt(process.env["MONITOR_INTERVAL_MINUTES"] ?? "", 10) || DEFAULT_INTERVAL_MINUTES) *
    60 *
    1_000;

  const queue = new Queue(MONITOR_QUEUE, { connection: redisConnection });
  void (async () => {
    const existing = await queue.getRepeatableJobs();
    await Promise.all(
      existing
        .filter((job) => job.name === "monitor-sweep")
        .map((job) => queue.removeRepeatableByKey(job.key)),
    );
    await queue.add(
      "monitor-sweep",
      {},
      {
        repeat: { every: intervalMs },
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 20 },
      },
    );
  })();

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
