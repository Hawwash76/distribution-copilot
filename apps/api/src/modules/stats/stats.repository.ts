import { Injectable } from "@nestjs/common";
import { type DashboardStats, type ProductSummary } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for dashboard statistics.
 * Queries are scoped to a userId; results are aggregated rather than row-level.
 */
@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const [statusCounts, products, timeSeries, sourceRows] = await Promise.all([
      // Opportunity counts grouped by status — only for non-deleted products
      this.prisma.db.opportunity.groupBy({
        by: ["status"],
        where: { product: { userId, isDeleted: false } },
        _count: { _all: true },
      }),
      // Per-product summaries
      this.prisma.db.product.findMany({
        where: { userId, isDeleted: false },
        select: {
          id: true,
          name: true,
          lastDiscoveredAt: true,
          profile: { select: { id: true } },
          _count: { select: { opportunities: true } },
          opportunities: {
            where: { status: "engaged" },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Opportunities per day for the last 30 days
      this.prisma.db.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT
          TO_CHAR(o."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COUNT(*) AS count
        FROM opportunities o
        JOIN products p ON o."productId" = p.id
        WHERE p."userId" = ${userId}
          AND p."isDeleted" = false
          AND o."createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      // Opportunity count by discovery source
      this.prisma.db.$queryRaw<{ source: string; count: bigint }[]>`
        SELECT d."source", COUNT(*) AS count
        FROM opportunities o
        JOIN products p ON o."productId" = p.id
        JOIN discussions d ON o."discussionId" = d.id
        WHERE p."userId" = ${userId}
          AND p."isDeleted" = false
        GROUP BY d."source"
        ORDER BY count DESC
      `,
    ]);

    const byStatus = Object.fromEntries(
      statusCounts.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;

    const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

    const productSummaries: ProductSummary[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      lastDiscoveredAt: p.lastDiscoveredAt,
      opportunityCount: p._count.opportunities,
      engagedCount: p.opportunities.length,
      hasProfile: p.profile !== null,
    }));

    return {
      totalOpportunities: total,
      newCount: byStatus["new"] ?? 0,
      scoredCount: byStatus["scored"] ?? 0,
      reviewedCount: byStatus["reviewed"] ?? 0,
      engagedCount: byStatus["engaged"] ?? 0,
      dismissedCount: byStatus["dismissed"] ?? 0,
      products: productSummaries,
      timeSeriesData: timeSeries.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
      sourceData: sourceRows.map((row) => ({
        source: row.source,
        count: Number(row.count),
      })),
    };
  }
}
