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
  intentScore: zod.number().int().nullable(),
  relevanceScore: zod.number().int().nullable(),
  engagementScore: zod.number().int().nullable(),
  recencyScore: zod.number().int().nullable(),
  overallScore: zod.number().int().nullable(),
  scoringModel: zod.string().nullable(),
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
