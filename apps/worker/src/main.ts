import { redisConnection } from "./config/redis";

/**
 * Worker entrypoint (scaffold).
 *
 * No queues or processors are registered yet. When background jobs are
 * introduced, define BullMQ `Worker`s under `./queues` and start them here,
 * e.g.:
 *
 *   import { Worker } from "bullmq";
 *   new Worker("discovery", processor, { connection: redisConnection });
 */
function bootstrap(): void {
  // Reference the connection config so the scaffold reflects real wiring,
  // without actually opening a connection.
  void redisConnection;

  console.log("[worker] started — no queues registered yet");
}

bootstrap();
