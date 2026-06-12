import { z as zod } from "zod";

import { discussionSourceSchema } from "./discussion";

/**
 * Opportunity schemas — a discovered discussion scored against a product.
 * Content fields (title, body, url, etc.) are sourced from the linked Discussion;
 * the API assembles a flat response so the frontend always sees one object.
 */

/** Re-exported alias for backward compatibility across the codebase. */
export const opportunitySourceSchema = discussionSourceSchema;
export type OpportunitySource = zod.infer<typeof opportunitySourceSchema>;

export const opportunityStatusSchema = zod.enum([
  "new",
  "scored",
  "reviewed",
  "engaged",
  "dismissed",
]);
export type OpportunityStatus = zod.infer<typeof opportunityStatusSchema>;

/** Request body for PATCH /products/:id/opportunities/:opportunityId. */
export const updateOpportunityStatusInputSchema = zod.object({
  status: opportunityStatusSchema,
});
export type UpdateOpportunityStatusInput = zod.infer<typeof updateOpportunityStatusInputSchema>;

/**
 * Request body for POST /products/:id/opportunities/:opportunityId/engage.
 * The user records what they actually replied to the conversation off-platform.
 */
export const markEngagedInputSchema = zod.object({
  reply: zod.string().min(1).max(10_000),
});
export type MarkEngagedInput = zod.infer<typeof markEngagedInputSchema>;

/** Specific actionable warnings generated from risk scores. */
export const riskWarningSchema = zod.enum(["avoid_links", "avoid_cta", "avoid_product_mention"]);
export type RiskWarning = zod.infer<typeof riskWarningSchema>;

/** Headline risk band derived from the four individual risk scores. */
export const riskLevelSchema = zod.enum(["low", "medium", "high"]);
export type RiskLevel = zod.infer<typeof riskLevelSchema>;

/**
 * The intent signal that best describes why this conversation is an opportunity.
 * Classified by AI during scoring; drives reply tone and priority ordering.
 *
 * RECOMMENDATION_REQUEST  — poster explicitly asks "what tool should I use?"
 * COMPETITOR_FRUSTRATION  — poster expresses frustration with a named competitor
 * ACTIVE_EVALUATION       — poster is comparing options or mid-purchase decision
 * PAIN_EXPRESSION         — poster describes a pain point without asking for solutions
 * BUDGET_SIGNAL           — poster discusses pricing, cost, or willingness to pay
 * CATEGORY_RESEARCH       — poster is learning about a solution category
 */
export const signalTypeSchema = zod.enum([
  "RECOMMENDATION_REQUEST",
  "COMPETITOR_FRUSTRATION",
  "ACTIVE_EVALUATION",
  "PAIN_EXPRESSION",
  "BUDGET_SIGNAL",
  "CATEGORY_RESEARCH",
]);
export type SignalType = zod.infer<typeof signalTypeSchema>;

export const opportunitySchema = zod.object({
  id: zod.string(),
  productId: zod.string(),
  discussionId: zod.string(),
  // Content fields assembled from the linked Discussion
  source: opportunitySourceSchema,
  externalId: zod.string().nullable(),
  communityId: zod.string().nullable(),
  communityName: zod.string().nullable(),
  title: zod.string(),
  body: zod.string().nullable(),
  url: zod.string().url(),
  author: zod.string().nullable(),
  score: zod.number().int().nullable(), // platformScore from Discussion
  commentCount: zod.number().int().nullable(),
  publishedAt: zod.coerce.date().nullable(),
  // Lifecycle
  status: opportunityStatusSchema,
  createdAt: zod.coerce.date(),
  updatedAt: zod.coerce.date(),
  // Scoring fields
  intentScore: zod.number().int().nullable(),
  relevanceScore: zod.number().int().nullable(),
  painScore: zod.number().int().nullable(),
  urgencyScore: zod.number().int().nullable(),
  engagementScore: zod.number().int().nullable(),
  recencyScore: zod.number().int().nullable(),
  overallScore: zod.number().int().nullable(),
  scoringModel: zod.string().nullable(),
  intentRationale: zod.string().nullable(),
  relevanceRationale: zod.string().nullable(),
  // Signal classification — null until AI scoring runs
  signalType: signalTypeSchema.nullable(),
  signalRationale: zod.string().nullable(),
  // Risk assessment fields
  ruleViolationRisk: zod.number().int().nullable(),
  promotionRisk: zod.number().int().nullable(),
  linkRisk: zod.number().int().nullable(),
  moderationRisk: zod.number().int().nullable(),
  overallRisk: riskLevelSchema.nullable(),
  riskWarnings: zod.array(riskWarningSchema),
  riskRationale: zod.string().nullable(),
  riskModel: zod.string().nullable(),
  // Reply draft fields
  replyDraft: zod.string().nullable(),
  replyDraftModel: zod.string().nullable(),
  // Engagement tracking
  engagedAt: zod.coerce.date().nullable(),
  engagedReply: zod.string().nullable(),
});

export type Opportunity = zod.infer<typeof opportunitySchema>;

/**
 * The validated shape returned by the AI for intent + relevance scoring.
 * Engagement and recency are computed by pure functions — not from the AI.
 * Also classifies the signal type that best describes why this is an opportunity.
 */
export const scoringAiResultSchema = zod.object({
  intentScore: zod.number().int().min(0).max(100),
  relevanceScore: zod.number().int().min(0).max(100),
  intentRationale: zod.string(),
  relevanceRationale: zod.string(),
  signalType: signalTypeSchema,
  signalRationale: zod.string(),
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

/**
 * The validated shape returned by the AI for reply draft generation.
 * The human always reviews and edits the draft before posting manually.
 */
export const replyDraftAiResultSchema = zod.object({
  draft: zod.string(),
});

export type ReplyDraftAiResult = zod.infer<typeof replyDraftAiResultSchema>;
