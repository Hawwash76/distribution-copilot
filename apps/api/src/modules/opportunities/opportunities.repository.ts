import { Injectable } from "@nestjs/common";
import { type Opportunity, type RiskLevel, type RiskWarning } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for the opportunities feature.
 * Queries are scoped to a productId; ownership is enforced in the service layer.
 */
@Injectable()
export class OpportunitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all scored (and reviewed) opportunities for a product,
   * ordered by overallScore descending.
   *
   * Excludes `new` (not yet scored) and `dismissed` opportunities.
   * Postgres places NULL overallScore values last on DESC — partial scores
   * naturally rank below fully-scored ones.
   */
  async findScoredByProduct(productId: string): Promise<Opportunity[]> {
    const rows = await this.prisma.db.opportunity.findMany({
      where: {
        productId,
        status: { in: ["scored", "reviewed"] },
      },
      orderBy: { overallScore: "desc" },
    });
    return rows.map((row) => this.toOpportunity(row));
  }

  /** Returns a single opportunity by id, scoped to a product. */
  async findById(id: string, productId: string): Promise<Opportunity | null> {
    const row = await this.prisma.db.opportunity.findFirst({
      where: { id, productId },
    });
    if (!row) return null;
    return this.toOpportunity(row);
  }

  private toOpportunity(row: {
    id: string;
    productId: string;
    communityId: string;
    source: string;
    externalId: string;
    status: string;
    title: string;
    body: string | null;
    url: string;
    author: string;
    score: number;
    commentCount: number;
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    intentScore: number | null;
    relevanceScore: number | null;
    engagementScore: number | null;
    recencyScore: number | null;
    overallScore: number | null;
    scoringModel: string | null;
    intentRationale: string | null;
    relevanceRationale: string | null;
    ruleViolationRisk: number | null;
    promotionRisk: number | null;
    linkRisk: number | null;
    moderationRisk: number | null;
    overallRisk: string | null;
    riskWarnings: string[];
    riskRationale: string | null;
    riskModel: string | null;
  }): Opportunity {
    return {
      id: row.id,
      productId: row.productId,
      communityId: row.communityId,
      source: row.source as Opportunity["source"],
      externalId: row.externalId,
      status: row.status as Opportunity["status"],
      title: row.title,
      body: row.body,
      url: row.url,
      author: row.author,
      score: row.score,
      commentCount: row.commentCount,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      intentScore: row.intentScore,
      relevanceScore: row.relevanceScore,
      engagementScore: row.engagementScore,
      recencyScore: row.recencyScore,
      overallScore: row.overallScore,
      scoringModel: row.scoringModel,
      intentRationale: row.intentRationale,
      relevanceRationale: row.relevanceRationale,
      ruleViolationRisk: row.ruleViolationRisk,
      promotionRisk: row.promotionRisk,
      linkRisk: row.linkRisk,
      moderationRisk: row.moderationRisk,
      overallRisk: row.overallRisk as RiskLevel | null,
      riskWarnings: row.riskWarnings as RiskWarning[],
      riskRationale: row.riskRationale,
      riskModel: row.riskModel,
    };
  }
}
