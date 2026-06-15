import { Worker } from "bullmq";

import { redisConnection } from "../../config/redis.js";
import { runNotification } from "./notification.processor.js";
import { NOTIFICATION_QUEUE } from "./notification.types.js";

/**
 * BullMQ worker for the notification queue.
 *
 * Fires after the scoring processor saves results; sends Slack/Telegram alerts
 * for opportunities that crossed the product's alertThreshold.
 * Concurrency is 2 — these jobs are network-bound (webhook POST), not CPU/AI.
 */
export function startNotificationWorker(): Worker {
  const worker = new Worker(
    NOTIFICATION_QUEUE,
    async (job) => {
      return runNotification(job.data, (msg) => job.log(msg));
    },
    {
      connection: redisConnection,
      concurrency: 2,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[notification] job ${job.id} completed`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[notification] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
