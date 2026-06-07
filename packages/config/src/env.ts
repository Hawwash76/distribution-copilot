import { z } from "zod";

/**
 * Shared environment-variable schema (placeholder).
 *
 * This describes the *shape* of the environment common to all services.
 * Each service can extend it with `.merge()` and call `.parse(process.env)`
 * at startup once real validation is required. No parsing happens here.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
});

export type Env = z.infer<typeof envSchema>;
