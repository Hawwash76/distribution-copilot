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
});

export type Opportunity = zod.infer<typeof opportunitySchema>;
