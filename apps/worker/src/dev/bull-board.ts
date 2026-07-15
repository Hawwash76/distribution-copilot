import "dotenv/config";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import express from "express";

import { redisConnection } from "../config/redis.js";
import { DISCOVERY_QUEUE } from "../queues/discovery/discovery.types.js";
import { EXTRACT_QUEUE } from "../queues/extract/extract.types.js";
import { MONITOR_QUEUE } from "../queues/monitor/monitor.types.js";
import { NOTIFICATION_QUEUE } from "../queues/notification/notification.types.js";
import { SCORING_QUEUE } from "../queues/scoring/scoring.types.js";

/**
 * Standalone local dev tool — a live web UI over the 5 BullMQ queues
 * (waiting/active/completed/failed jobs, payloads, retry state).
 *
 * Deliberately NOT wired into main.ts / bootstrap(): the worker process itself
 * must stay HTTP-free (see apps/worker/CLAUDE.md boundaries — it's triggered by
 * enqueued jobs, never HTTP). This is a separate, manually-run observability
 * script; it only reads queue state, it never processes jobs.
 *
 * Run with: pnpm --filter @distribution-copilot/worker bull-board
 */
const PORT = Number(process.env["BULL_BOARD_PORT"] ?? 3849);

const queues = [
  DISCOVERY_QUEUE,
  EXTRACT_QUEUE,
  SCORING_QUEUE,
  NOTIFICATION_QUEUE,
  MONITOR_QUEUE,
].map((name) => new Queue(name, { connection: redisConnection }));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/");

createBullBoard({
  queues: queues.map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
});

const app = express();
app.use("/", serverAdapter.getRouter());

app.listen(PORT, () => {
  console.log(`[bull-board] running at http://localhost:${String(PORT)}`);
});
