import { z } from "zod";

/**
 * Placeholder opportunity schema. An opportunity is a discovered online
 * conversation (Reddit thread, X post, …) that may be worth replying to.
 * Scoring, risk, and reply data are intentionally omitted for now.
 */
export const opportunitySourceSchema = z.enum(["reddit", "x", "hackernews", "other"]);
export type OpportunitySource = z.infer<typeof opportunitySourceSchema>;

export const opportunitySchema = z.object({
  id: z.string().uuid(),
  source: opportunitySourceSchema,
  url: z.string().url(),
  title: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;
