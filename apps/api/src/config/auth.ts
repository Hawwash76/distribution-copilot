/**
 * Better Auth setup placeholder.
 *
 * No flows are implemented yet. When auth is built out, configure the Better
 * Auth instance here (database adapter, providers, session strategy) and mount
 * its handler in the API. Example shape (kept commented to avoid requiring a
 * configured database at import time):
 *
 *   import { betterAuth } from "better-auth";
 *   import { prismaAdapter } from "better-auth/adapters/prisma";
 *   import { prisma } from "@distribution-copilot/database";
 *
 *   export const auth = betterAuth({
 *     database: prismaAdapter(prisma, { provider: "postgresql" }),
 *     secret: process.env.BETTER_AUTH_SECRET,
 *     baseURL: process.env.BETTER_AUTH_URL,
 *     emailAndPassword: { enabled: true },
 *   });
 */
export const authConfigPlaceholder = {
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
} as const;
