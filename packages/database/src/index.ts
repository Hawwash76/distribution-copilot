import { PrismaClient } from "@prisma/client";

/**
 * @distribution-copilot/database
 *
 * Thin wrapper around the generated Prisma client. The schema lives at the
 * repo root (`prisma/schema.prisma`); run `pnpm db:generate` to (re)generate
 * the client before building.
 *
 * A single instance is reused in development to avoid exhausting connections
 * on hot-reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma types/enums so consumers import everything from one place.
export * from "@prisma/client";
