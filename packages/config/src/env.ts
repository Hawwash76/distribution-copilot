import { z as zod } from "zod";

/**
 * Shared environment-variable schema (placeholder).
 *
 * This describes the *shape* of the environment common to all services.
 * Each service can extend it with `.merge()` and call `.parse(process.env)`
 * at startup once real validation is required. No parsing happens here.
 */
export const envSchema = zod.object({
  NODE_ENV: zod.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: zod.string().url().optional(),
  REDIS_HOST: zod.string().default("localhost"),
  REDIS_PORT: zod.coerce.number().int().positive().default(6379),
  SERP_API_KEY: zod.string().optional(),
});

export type Env = zod.infer<typeof envSchema>;
