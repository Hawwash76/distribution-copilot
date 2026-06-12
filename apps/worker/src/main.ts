import "dotenv/config";

import { startDiscoveryWorker } from "./queues/discovery/discovery.worker.js";
import { startExtractWorker } from "./queues/extract/extract.worker.js";
import { startMonitorWorker } from "./queues/monitor/monitor.worker.js";
import { startScoringWorker } from "./queues/scoring/scoring.worker.js";

/**
 * Worker entrypoint — registers and starts all BullMQ workers.
 *
 * Pipeline:  discovery → extract (one job per URL) → scoring (one job per product)
 * Monitoring: monitor sweep fires on a repeatable schedule (default every 30 min),
 *             queries enabled ProductMonitor rows, and feeds URLs into the extract queue.
 */
function bootstrap(): void {
  const workers = [
    startDiscoveryWorker(),
    startExtractWorker(),
    startScoringWorker(),
    startMonitorWorker(),
  ];

  console.log(
    `[worker] started — ${String(workers.length)} queue(s) registered: discovery, extract, scoring, monitor`,
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
