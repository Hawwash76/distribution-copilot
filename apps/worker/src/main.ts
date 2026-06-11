import "dotenv/config";

import { startDiscoveryWorker } from "./queues/discovery/discovery.worker.js";
import { startExtractWorker } from "./queues/extract/extract.worker.js";
import { startScoringWorker } from "./queues/scoring/scoring.worker.js";

/**
 * Worker entrypoint — registers and starts all BullMQ workers.
 * Add new workers here as new queues are introduced.
 *
 * Pipeline: discovery → extract (one job per URL) → scoring (one job per product)
 */
function bootstrap(): void {
  const workers = [startDiscoveryWorker(), startExtractWorker(), startScoringWorker()];

  console.log(
    `[worker] started — ${String(workers.length)} queue(s) registered: discovery, extract, scoring`,
  );

  // Graceful shutdown: allow in-flight jobs to finish before exiting.
  const shutdown = async (): Promise<void> => {
    console.log("[worker] shutting down…");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

bootstrap();
