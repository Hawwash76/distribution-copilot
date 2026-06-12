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
    const [statusCounts, products] = await Promise.all([
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
    ]);

    // Flatten status counts into named fields
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
    };
  }
}
