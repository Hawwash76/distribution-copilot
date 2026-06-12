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

/** One data point for the time-series chart (opportunities discovered per day). */
export const timeSeriesPointSchema = zod.object({
  /** ISO date string YYYY-MM-DD (UTC). */
  date: zod.string(),
  count: zod.number().int(),
});
export type TimeSeriesPoint = zod.infer<typeof timeSeriesPointSchema>;

/** Per-source opportunity count for the source-breakdown chart. */
export const sourceStatSchema = zod.object({
  source: zod.string(),
  count: zod.number().int(),
});
export type SourceStat = zod.infer<typeof sourceStatSchema>;

export const dashboardStatsSchema = zod.object({
  totalOpportunities: zod.number().int(),
  newCount: zod.number().int(),
  scoredCount: zod.number().int(),
  reviewedCount: zod.number().int(),
  engagedCount: zod.number().int(),
  dismissedCount: zod.number().int(),
  products: zod.array(productSummarySchema),
  /** Opportunities per day for the last 30 days (only days with activity included). */
  timeSeriesData: zod.array(timeSeriesPointSchema),
  /** Opportunity counts grouped by discovery source. */
  sourceData: zod.array(sourceStatSchema),
});
export type DashboardStats = zod.infer<typeof dashboardStatsSchema>;
