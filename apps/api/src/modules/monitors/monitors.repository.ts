import { Injectable } from "@nestjs/common";
import { type DiscussionSource, type MonitorStatus } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { PrismaService } from "../../common/prisma.service";

/** The canonical set of sources a product can monitor. */
const ALL_SOURCES: DiscussionSource[] = [
  "reddit",
  "hackernews",
  "stackoverflow",
  "lobsters",
  "devto",
  "web",
];

/**
 * All Prisma access for the monitors feature.
 * Queries are scoped to productId; ownership is enforced in the service layer.
 */
@Injectable()
export class MonitorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the monitoring status for all sources for a product.
   * Missing rows are created on-the-fly as disabled — this acts as an upsert
   * so callers never have to worry about initialising monitors manually.
   */
  async findOrCreateAll(productId: string): Promise<MonitorStatus[]> {
    // Ensure every source row exists. createMany with skipDuplicates is cheaper
    // than N individual upserts when all rows already exist.
    await this.prisma.db.productMonitor.createMany({
      data: ALL_SOURCES.map((source) => ({ productId, source, enabled: false })),
      skipDuplicates: true,
    });

    const rows = await this.prisma.db.productMonitor.findMany({
      where: { productId },
      orderBy: { source: "asc" },
    });

    return rows.map((r) => ({
      source: r.source as DiscussionSource,
      enabled: r.enabled,
      lastCheckedAt: r.lastCheckedAt,
    }));
  }

  /** Enables or disables monitoring for a single source on a product. */
  async toggle(
    productId: string,
    source: DiscussionSource,
    enabled: boolean,
  ): Promise<MonitorStatus> {
    const row = await this.prisma.db.productMonitor.upsert({
      where: { productId_source: { productId, source } },
      create: { productId, source, enabled },
      update: { enabled },
    });

    return {
      source: row.source as DiscussionSource,
      enabled: row.enabled,
      lastCheckedAt: row.lastCheckedAt,
    };
  }
}
