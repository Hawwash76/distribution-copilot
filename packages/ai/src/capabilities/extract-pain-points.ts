import { painPointAiResultSchema, type PainPointAiResult } from "@distribution-copilot/shared";

import { AI_MODELS } from "../models.js";
import { type Provider } from "../providers/provider.js";
import {
  PAIN_POINT_SYSTEM_PROMPT,
  buildPainPointUserMessage,
} from "../prompts/pain-point-extraction/index.js";

/** Typed result of the extract-pain-points capability. */
export interface ExtractPainPointsResult {
  painPoints: PainPointAiResult["painPoints"];
  /** The exact model ID that produced this output. */
  model: string;
}

/**
 * Extracts concrete pain points from a discussion post using AI.
 *
 * Returns an array of theme/quote/intensity tuples found in the text.
 * An empty array means no pain points were present — not an error.
 * Persistence is the caller's responsibility.
 */
export async function extractPainPoints(
  postTitle: string,
  postBody: string | null,
  provider: Provider,
): Promise<ExtractPainPointsResult> {
  const { data, model } = await provider.completeJson(
    PAIN_POINT_SYSTEM_PROMPT,
    buildPainPointUserMessage(postTitle, postBody),
    painPointAiResultSchema,
    AI_MODELS.PAIN_POINTS,
  );

  return { painPoints: data.painPoints, model };
}
