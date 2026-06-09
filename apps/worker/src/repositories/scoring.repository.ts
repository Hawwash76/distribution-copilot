import { type PrismaClient } from "@distribution-copilot/database";
import {
  type Opportunity,
  type ProductProfile,
  type RiskLevel,
  type RiskWarning,
} from "@distribution-copilot/shared";

/** Opportunity enriched with community context for the scoring + risk pipeline. */
export interface ScoringOpportunity extends Opportunity {
  communityName: string;
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
  // Risk assessment — null when no product profile was available
  ruleViolationRisk: number | null;
  promotionRisk: number | null;
  linkRisk: number | null;
  moderationRisk: number | null;
  overallRisk: RiskLevel | null;
  riskWarnings: RiskWarning[];
  riskRationale: string | null;
  riskModel: string | null;
  // Reply draft — null when no product profile was available
  replyDraft: string | null;
  replyDraftModel: string | null;
}

/**
 * All Prisma access for the scoring pipeline.
 * Keeps Prisma calls out of the processor so logic is testable in isolation.
 */
export class ScoringRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Load all opportunities with status="new" for this product, newest first.
   * Includes community name and description for risk assessment.
   */
  async findNewByProduct(productId: string): Promise<ScoringOpportunity[]> {
    const rows = await this.db.opportunity.findMany({
      where: { productId, status: "new" },
      orderBy: { publishedAt: "desc" },
      include: { community: true },
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
        status: "scored",
      },
    });
  }

  private toScoringOpportunity(row: {
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
    replyDraft: string | null;
    replyDraftModel: string | null;
    community: { name: string; description: string | null };
  }): ScoringOpportunity {
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
      replyDraft: row.replyDraft,
      replyDraftModel: row.replyDraftModel,
      communityName: row.community.name,
      communityDescription: row.community.description,
    };
  }
}
