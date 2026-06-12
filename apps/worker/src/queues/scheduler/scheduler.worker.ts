import { Queue, Worker } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { runScheduler } from "./scheduler.processor.js";
import { SCHEDULER_QUEUE } from "./scheduler.types.js";

/**
 * Cron expression for daily discovery. Defaults to 08:00 UTC.
 * Override with DISCOVERY_CRON env var (standard cron syntax).
 */
const DAILY_CRON = process.env.DISCOVERY_CRON ?? "0 8 * * *";

/**
 * Starts the scheduler worker and registers the daily repeatable job.
 *
 * BullMQ deduplicates repeatable jobs by queue + cron pattern, so calling
 * this on every startup is safe — it acts as an upsert.
 */
export function startSchedulerWorker(): Worker {
  // Register the repeatable job in Redis. The worker below processes it when it fires.
  const queue = new Queue(SCHEDULER_QUEUE, { connection: redisConnection });
  void queue.add(
    "daily-discovery",
    {},
    {
      repeat: { pattern: DAILY_CRON },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  );

  const worker = new Worker(SCHEDULER_QUEUE, async (job) => runScheduler((msg) => job.log(msg)), {
    connection: redisConnection,
    concurrency: 1,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  });

  worker.on("completed", (job) => {
    console.log(`[scheduler] job ${job.id} completed`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[scheduler] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
