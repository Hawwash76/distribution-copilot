/**
 * Typed configuration factory consumed by `@nestjs/config`. Reads from
 * `process.env` with sensible local defaults. Validation can be layered in
 * later using the shared `envSchema` from `@distribution-copilot/config`.
 */
export const configuration = () => ({
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
