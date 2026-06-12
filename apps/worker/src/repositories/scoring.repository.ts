import { type PrismaClient } from "@distribution-copilot/database";
import {
  type OpportunityStatus,
  type ProductProfile,
  type RiskLevel,
  type RiskWarning,
  type SignalType,
} from "@distribution-copilot/shared";

/**
 * Opportunity enriched with content fields from the linked Discussion and its
 * optional Community — everything the scoring + risk + reply-draft pipeline needs.
 */
export interface ScoringOpportunity {
  id: string;
  productId: string;
  discussionId: string;
  // Content from Discussion
  title: string;
  body: string | null;
  platformScore: number; // 0 when null in DB (engagement score treats null as no signal)
  commentCount: number; // 0 when null in DB
  publishedAt: Date; // falls back to fetchedAt when null
  // Community context for risk assessment (null for non-community sources)
  communityName: string | null;
  communityDescription: string | null;
}

/** Score data written per opportunity after the scoring job runs. */
export interface OpportunityScores {
  intentScore: number | null;
  relevanceScore: number | null;
  engagementScore: number;
  recencyScore: number;
  overallScore: number;
  scoringModel: string | null;
  intentRationale: string | null;
  relevanceRationale: string | null;
  signalType: SignalType | null;
  signalRationale: string | null;
  ruleViolationRisk: number | null;
  promotionRisk: number | null;
  linkRisk: number | null;
  moderationRisk: number | null;
  overallRisk: RiskLevel | null;
  riskWarnings: RiskWarning[];
  riskRationale: string | null;
  riskModel: string | null;
  replyDraft: string | null;
  replyDraftModel: string | null;
  /** Status to advance to: "scored" normally, "dismissed" when overallScore is below threshold. */
  status: OpportunityStatus;
}

/**
 * All Prisma access for the scoring pipeline.
 * Keeps Prisma calls out of the processor so logic is testable in isolation.
 */
export class ScoringRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Load all opportunities with status="new" for this product, newest first.
   * Joins through Discussion and its optional Community so the processor has
   * everything it needs without further queries.
   */
  async findNewByProduct(productId: string): Promise<ScoringOpportunity[]> {
    const rows = await this.db.opportunity.findMany({
      where: { productId, status: "new" },
      orderBy: { createdAt: "desc" },
      include: {
        discussion: {
          include: { community: true },
        },
      },
    });
    return rows.map((row) => this.toScoringOpportunity(row));
  }

  /** Load the product's AI-generated profile, or null if not yet generated. */
  async findProductProfile(productId: string): Promise<ProductProfile | null> {
    const row = await this.db.productProfile.findUnique({ where: { productId } });
    if (!row) return null;
    return {
      id: row.id,
      productId: row.productId,
      painPoints: row.painPoints,
      personas: row.personas,
      keywords: row.keywords,
      competitors: row.competitors,
      useCases: row.useCases,
      valueProps: row.valueProps,
      modelUsed: row.modelUsed,
      generatedAt: row.generatedAt,
    };
  }

  /**
   * Persist scores and advance status to "scored".
   * Idempotent: re-running on the same opportunity overwrites with the same
   * values — safe for BullMQ retries.
   */
  async saveScores(opportunityId: string, scores: OpportunityScores): Promise<void> {
    await this.db.opportunity.update({
      where: { id: opportunityId },
      data: {
        intentScore: scores.intentScore,
        relevanceScore: scores.relevanceScore,
        engagementScore: scores.engagementScore,
        recencyScore: scores.recencyScore,
        overallScore: scores.overallScore,
        scoringModel: scores.scoringModel,
        intentRationale: scores.intentRationale,
        relevanceRationale: scores.relevanceRationale,
        signalType: scores.signalType ?? undefined,
        signalRationale: scores.signalRationale,
        ruleViolationRisk: scores.ruleViolationRisk,
        promotionRisk: scores.promotionRisk,
        linkRisk: scores.linkRisk,
        moderationRisk: scores.moderationRisk,
        overallRisk: scores.overallRisk ?? undefined,
        riskWarnings: scores.riskWarnings,
        riskRationale: scores.riskRationale,
        riskModel: scores.riskModel,
        replyDraft: scores.replyDraft,
        replyDraftModel: scores.replyDraftModel,
        status: scores.status,
      },
    });
  }

  private toScoringOpportunity(row: {
    id: string;
    productId: string;
    discussionId: string;
    discussion: {
      title: string;
      body: string | null;
      platformScore: number | null;
      commentCount: number | null;
      publishedAt: Date | null;
      fetchedAt: Date;
      community: { name: string; description: string | null } | null;
    };
  }): ScoringOpportunity {
    const d = row.discussion;
    return {
      id: row.id,
      productId: row.productId,
      discussionId: row.discussionId,
      title: d.title,
      body: d.body,
      platformScore: d.platformScore ?? 0,
      commentCount: d.commentCount ?? 0,
      publishedAt: d.publishedAt ?? d.fetchedAt,
      communityName: d.community?.name ?? null,
      communityDescription: d.community?.description ?? null,
    };
  }
}
