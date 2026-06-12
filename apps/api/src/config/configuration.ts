/**
 * Typed configuration factory consumed by `@nestjs/config`. Reads from
 * `process.env` with sensible local defaults.
 */
export const configuration = () => ({
  port: parseInt(process.env.PORT ?? "3848", 10),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    starterPriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    proPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  },
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3847",
});

export type AppConfig = ReturnType<typeof configuration>;
