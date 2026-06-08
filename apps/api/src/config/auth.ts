import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@distribution-copilot/database";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET ?? "",
  baseURL: process.env.BETTER_AUTH_URL ?? "",
  trustedOrigins: [process.env.FRONTEND_URL ?? ""],
  emailAndPassword: { enabled: true },
});

export type Auth = typeof auth;
