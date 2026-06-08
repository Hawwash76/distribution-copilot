import { Injectable } from "@nestjs/common";
import { prisma } from "@distribution-copilot/database";
import type { PrismaClient } from "@distribution-copilot/database";

/**
 * Thin NestJS-injectable wrapper around the database package's prisma singleton.
 * Provides type-safe access to the Prisma client via NestJS DI.
 */
@Injectable()
export class PrismaService {
  readonly db: PrismaClient = prisma;
}
