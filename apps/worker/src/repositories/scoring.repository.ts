import { type PrismaClient } from "@distribution-copilot/database";
import { type Opportunity, type ProductProfile } from "@distribution-copilot/shared";

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
}

/**
 * All Prisma access for the scoring pipeline.
 * Keeps Prisma calls out of the processor so logic is testable in isolation.
 */
export class ScoringRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Load all opportunities with status="new" for this product, newest first. */
  async findNewByProduct(productId: string): Promise<Opportunity[]> {
    const rows = await this.db.opportunity.findMany({
      where: { productId, status: "new" },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((row) => this.toOpportunity(row));
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
        status: "scored",
      },
    });
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
    };
  }
}
