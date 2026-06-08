import { type RedisOptions } from "ioredis";

/** Redis connection options shared with the worker. BullMQ requires maxRetriesPerRequest: null. */
export const redisConnection: RedisOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
};
