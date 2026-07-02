import { Injectable } from "@nestjs/common";
import {
  type Opportunity,
  type RiskLevel,
  type RiskWarning,
  type SignalType,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for the competitor-monitor feature.
 * Queries opportunities classified as COMPETITOR_FRUSTRATION or ACTIVE_EVALUATION,
 * scoped to a product. Ownership is enforced in the service layer.
 */
@Injectable()
export class CompetitorMonitorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns non-dismissed opportunities where the signal type indicates a competitor context:
   * COMPETITOR_FRUSTRATION (users frustrated with a competitor) or ACTIVE_EVALUATION
   * (users comparing tools / looking for alternatives). Ordered best-first.
   */
  async findCompetitorSignals(productId: string): Promise<Opportunity[]> {
    const rows = await this.prisma.db.opportunity.findMany({
      where: {
        productId,
        status: { not: "dismissed" },
        signalType: { in: ["COMPETITOR_FRUSTRATION", "ACTIVE_EVALUATION"] },
      },
      orderBy: [{ overallScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: {
        discussion: {
          include: { community: true },
        },
      },
    });
    return rows.map((row) => this.toOpportunity(row));
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
    signalType: string | null;
    signalRationale: string | null;
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
    engagedAt: Date | null;
    engagedReply: string | null;
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
      status: row.status as Opportunity["status"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
      signalType: row.signalType as SignalType | null,
      signalRationale: row.signalRationale,
      ruleViolationRisk: row.ruleViolationRisk,
      promotionRisk: row.promotionRisk,
      linkRisk: row.linkRisk,
      moderationRisk: row.moderationRisk,
      overallRisk: row.overallRisk as RiskLevel | null,
      riskWarnings: row.riskWarnings as RiskWarning[],
      riskRationale: row.riskRationale,
      riskModel: row.riskModel,
      replyDraft: row.replyDraft,
      replyDraftModel: row.replyDraftModel,
      engagedAt: row.engagedAt,
      engagedReply: row.engagedReply,
    };
  }
}
