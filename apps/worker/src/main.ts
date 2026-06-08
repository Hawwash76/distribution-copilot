import { startDiscoveryWorker } from "./queues/discovery/discovery.worker.js";

/**
 * Worker entrypoint — registers and starts all BullMQ workers.
 * Add new workers here as new queues are introduced.
 */
function bootstrap(): void {
  const workers = [startDiscoveryWorker()];

  console.log(`[worker] started — ${String(workers.length)} queue(s) registered: discovery`);

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
