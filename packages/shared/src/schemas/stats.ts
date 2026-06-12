import { z as zod } from "zod";

/**
 * Dashboard statistics — aggregated from all the user's products and opportunities.
 * Returned by GET /stats; the frontend uses this to populate the home dashboard.
 */

export const productSummarySchema = zod.object({
  id: zod.string(),
  name: zod.string(),
  lastDiscoveredAt: zod.coerce.date().nullable(),
  opportunityCount: zod.number().int(),
  engagedCount: zod.number().int(),
  hasProfile: zod.boolean(),
});
export type ProductSummary = zod.infer<typeof productSummarySchema>;

export const dashboardStatsSchema = zod.object({
  totalOpportunities: zod.number().int(),
  newCount: zod.number().int(),
  scoredCount: zod.number().int(),
  reviewedCount: zod.number().int(),
  engagedCount: zod.number().int(),
  dismissedCount: zod.number().int(),
  products: zod.array(productSummarySchema),
});
export type DashboardStats = zod.infer<typeof dashboardStatsSchema>;
