import {
  scoringAiResultSchema,
  type ProductProfile,
  type ScoringAiResult,
} from "@distribution-copilot/shared";

import { AI_MODELS } from "../models.js";
import { type Provider } from "../providers/provider.js";
import { SCORING_SYSTEM_PROMPT, buildScoringUserMessage } from "../prompts/scoring/index.js";

/** Typed result of the score-opportunity capability. */
export interface ScoreOpportunityResult {
  scores: ScoringAiResult;
  /** The exact model ID that produced this output — store alongside the data. */
  model: string;
}

/**
 * Scores a single post against a product profile using AI.
 *
 * Returns AI-assessed intent and relevance scores, rationales, and a signal
 * type classification. Engagement and recency scoring are pure functions —
 * handled by the caller. Persistence is the caller's responsibility.
 */
export async function scoreOpportunity(
  postTitle: string,
  postBody: string | null,
  profile: ProductProfile,
  provider: Provider,
): Promise<ScoreOpportunityResult> {
  const { data, model } = await provider.completeJson(
    SCORING_SYSTEM_PROMPT,
    buildScoringUserMessage(postTitle, postBody, profile),
    scoringAiResultSchema,
    AI_MODELS.SCORING,
  );

  return { scores: data, model };
}
