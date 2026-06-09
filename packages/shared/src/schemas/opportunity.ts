import { z as zod } from "zod";

/**
 * Opportunity schemas — a discovered online conversation that may be worth
 * engaging with. Source and status enum values are lowercase to match the
 * Prisma-generated DB enum literals so both layers share the same strings.
 */

export const opportunitySourceSchema = zod.enum(["reddit"]);
export type OpportunitySource = zod.infer<typeof opportunitySourceSchema>;

export const opportunityStatusSchema = zod.enum(["new", "scored", "reviewed", "dismissed"]);
export type OpportunityStatus = zod.infer<typeof opportunityStatusSchema>;

/** Specific actionable warnings generated from risk scores. */
export const riskWarningSchema = zod.enum(["avoid_links", "avoid_cta", "avoid_product_mention"]);
export type RiskWarning = zod.infer<typeof riskWarningSchema>;

/** Headline risk band derived from the four individual risk scores. */
export const riskLevelSchema = zod.enum(["low", "medium", "high"]);
export type RiskLevel = zod.infer<typeof riskLevelSchema>;

export const opportunitySchema = zod.object({
  id: zod.string(),
  productId: zod.string(),
  communityId: zod.string(),
  source: opportunitySourceSchema,
  externalId: zod.string(),
  status: opportunityStatusSchema,
  title: zod.string(),
  body: zod.string().nullable(),
  url: zod.string().url(),
  author: zod.string(),
  score: zod.number().int(),
  commentCount: zod.number().int(),
  publishedAt: zod.coerce.date(),
  createdAt: zod.coerce.date(),
  updatedAt: zod.coerce.date(),
  // Scoring fields
  intentScore: zod.number().int().nullable(),
  relevanceScore: zod.number().int().nullable(),
  engagementScore: zod.number().int().nullable(),
  recencyScore: zod.number().int().nullable(),
  overallScore: zod.number().int().nullable(),
  scoringModel: zod.string().nullable(),
  intentRationale: zod.string().nullable(),
  relevanceRationale: zod.string().nullable(),
  // Risk assessment fields — null until the scoring job runs (requires product profile)
  ruleViolationRisk: zod.number().int().nullable(),
  promotionRisk: zod.number().int().nullable(),
  linkRisk: zod.number().int().nullable(),
  moderationRisk: zod.number().int().nullable(),
  overallRisk: riskLevelSchema.nullable(),
  riskWarnings: zod.array(riskWarningSchema),
  riskRationale: zod.string().nullable(),
  riskModel: zod.string().nullable(),
});

export type Opportunity = zod.infer<typeof opportunitySchema>;

/**
 * The validated shape returned by the AI for intent + relevance scoring.
 * Engagement and recency are computed by pure functions — not from the AI.
 */
export const scoringAiResultSchema = zod.object({
  intentScore: zod.number().int().min(0).max(100),
  relevanceScore: zod.number().int().min(0).max(100),
  intentRationale: zod.string(),
  relevanceRationale: zod.string(),
});

export type ScoringAiResult = zod.infer<typeof scoringAiResultSchema>;

/**
 * The validated shape returned by the AI for risk assessment.
 * Warnings and overall risk level are computed by pure functions — not from the AI.
 */
export const riskAiResultSchema = zod.object({
  ruleViolationRisk: zod.number().int().min(0).max(100),
  promotionRisk: zod.number().int().min(0).max(100),
  linkRisk: zod.number().int().min(0).max(100),
  moderationRisk: zod.number().int().min(0).max(100),
  riskRationale: zod.string(),
});

export type RiskAiResult = zod.infer<typeof riskAiResultSchema>;
