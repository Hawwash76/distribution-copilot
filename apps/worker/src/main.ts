import "dotenv/config";

import { startDiscoveryWorker } from "./queues/discovery/discovery.worker.js";
import { startExtractWorker } from "./queues/extract/extract.worker.js";
import { startScoringWorker } from "./queues/scoring/scoring.worker.js";
import { startSchedulerWorker } from "./queues/scheduler/scheduler.worker.js";

/**
 * Worker entrypoint — registers and starts all BullMQ workers.
 *
 * Pipeline: discovery → extract (one job per URL) → scoring (one job per product)
 * Scheduler: daily repeatable job that enqueues discovery for all products with profiles.
 */
function bootstrap(): void {
  const workers = [
    startDiscoveryWorker(),
    startExtractWorker(),
    startScoringWorker(),
    startSchedulerWorker(),
  ];

  console.log(
    `[worker] started — ${String(workers.length)} queue(s) registered: discovery, extract, scoring, scheduler`,
  );

  const shutdown = async (): Promise<void> => {
    console.log("[worker] shutting down…");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

bootstrap();
