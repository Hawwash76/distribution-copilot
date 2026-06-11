import { Injectable } from "@nestjs/common";
import {
  type Opportunity,
  type OpportunityStatus,
  type RiskLevel,
  type RiskWarning,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for the opportunities feature.
 * Queries are scoped to a productId; ownership is enforced in the service layer.
 * The flat Opportunity domain type is assembled from the Opportunity row joined
 * through its Discussion (and optionally the Discussion's Community).
 */
@Injectable()
export class OpportunitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns non-dismissed opportunities for a product, best first.
   *
   * Ordering: overallScore DESC NULLS LAST, then createdAt DESC so that
   * unscored opportunities appear after all scored ones, and within the
   * same score band the most recent win.
   *
   * Dismissed opportunities (auto-dismissed by the scoring job or manually
   * dismissed by the user) are excluded from the default view.
   */
  async findAllByProduct(productId: string): Promise<Opportunity[]> {
    const rows = await this.prisma.db.opportunity.findMany({
      where: { productId, status: { not: "dismissed" } },
      orderBy: [{ overallScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: {
        discussion: {
          include: { community: true },
        },
      },
    });
    return rows.map((row) => this.toOpportunity(row));
  }

  /** Updates the status of a single opportunity scoped to a product. */
  async updateStatus(id: string, productId: string, status: OpportunityStatus): Promise<void> {
    await this.prisma.db.opportunity.updateMany({
      where: { id, productId },
      data: { status },
    });
  }

  /** Permanently deletes a single opportunity scoped to a product. */
  async deleteById(id: string, productId: string): Promise<void> {
    await this.prisma.db.opportunity.deleteMany({
      where: { id, productId },
    });
  }

  /** Returns a single opportunity by id, scoped to a product. */
  async findById(id: string, productId: string): Promise<Opportunity | null> {
    const row = await this.prisma.db.opportunity.findFirst({
      where: { id, productId },
      include: {
        discussion: {
          include: { community: true },
        },
      },
    });
    if (!row) return null;
    return this.toOpportunity(row);
  }

  private toOpportunity(row: {
    id: string;
    productId: string;
    discussionId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    intentScore: number | null;
    relevanceScore: number | null;
    painScore: number | null;
    urgencyScore: number | null;
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
    replyDraft: string | null;
    replyDraftModel: string | null;
    discussion: {
      source: string;
      externalId: string | null;
      url: string;
      title: string;
      body: string | null;
      author: string | null;
      platformScore: number | null;
      commentCount: number | null;
      publishedAt: Date | null;
      communityId: string | null;
      community: { name: string } | null;
    };
  }): Opportunity {
    const d = row.discussion;
    return {
      id: row.id,
      productId: row.productId,
      discussionId: row.discussionId,
      // Content sourced from the joined Discussion
      source: d.source as Opportunity["source"],
      externalId: d.externalId,
      communityId: d.communityId,
      communityName: d.community?.name ?? null,
      title: d.title,
      body: d.body,
      url: d.url,
      author: d.author,
      score: d.platformScore,
      commentCount: d.commentCount,
      publishedAt: d.publishedAt,
      // Lifecycle
      status: row.status as Opportunity["status"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Scoring
      intentScore: row.intentScore,
      relevanceScore: row.relevanceScore,
      painScore: row.painScore,
      urgencyScore: row.urgencyScore,
      engagementScore: row.engagementScore,
      recencyScore: row.recencyScore,
      overallScore: row.overallScore,
      scoringModel: row.scoringModel,
      intentRationale: row.intentRationale,
      relevanceRationale: row.relevanceRationale,
      // Risk
      ruleViolationRisk: row.ruleViolationRisk,
      promotionRisk: row.promotionRisk,
      linkRisk: row.linkRisk,
      moderationRisk: row.moderationRisk,
      overallRisk: row.overallRisk as RiskLevel | null,
      riskWarnings: row.riskWarnings as RiskWarning[],
      riskRationale: row.riskRationale,
      riskModel: row.riskModel,
      // Reply draft
      replyDraft: row.replyDraft,
      replyDraftModel: row.replyDraftModel,
    };
  }
}
