import type { RedisOptions } from "ioredis";

/**
 * Redis connection options for BullMQ (placeholder — no connection is opened
 * here). BullMQ requires `maxRetriesPerRequest: null` for blocking commands.
 */
export const redisConnection: RedisOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  // password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};
