import { z as zod } from "zod";

/** Intensity levels for a pain point — how strongly the pain is expressed. */
export const painPointIntensitySchema = zod.enum(["low", "medium", "high"]);
export type PainPointIntensity = zod.infer<typeof painPointIntensitySchema>;

/**
 * The structured output returned by the extract-pain-points AI capability.
 * Each item is one distinct pain point found in the discussion.
 */
export const painPointAiResultSchema = zod.object({
  painPoints: zod.array(
    zod.object({
      theme: zod.string().min(1),
      quote: zod.string().min(1),
      intensity: painPointIntensitySchema,
    }),
  ),
});
export type PainPointAiResult = zod.infer<typeof painPointAiResultSchema>;

/**
 * A pain point aggregated across multiple discussions for a product.
 * Returned by GET /products/:id/research/pain-points.
 * - count: number of distinct discussions expressing this theme
 * - score: frequency × intensity weight (low=1, medium=2, high=3), used for ranking
 */
export const aggregatedPainPointSchema = zod.object({
  theme: zod.string(),
  count: zod.number().int(),
  intensity: painPointIntensitySchema,
  score: zod.number(),
  quotes: zod.array(
    zod.object({
      quote: zod.string(),
      source: zod.string(),
      url: zod.string(),
    }),
  ),
});
export type AggregatedPainPoint = zod.infer<typeof aggregatedPainPointSchema>;
