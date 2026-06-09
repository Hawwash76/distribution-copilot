import {
  riskAiResultSchema,
  type ProductProfile,
  type RiskAiResult,
} from "@distribution-copilot/shared";

import { type Provider } from "../providers/provider.js";
import { RISK_SYSTEM_PROMPT, buildRiskUserMessage } from "../prompts/risk-analysis/index.js";

/** Typed result of the assess-risk capability. */
export interface AssessRiskResult {
  riskScores: RiskAiResult;
  /** The exact model ID that produced this output — store alongside the data. */
  model: string;
}

/**
 * Assesses community engagement risk for a single post against a product profile.
 *
 * Returns four AI-scored risk dimensions (rule violation, promotion, link, moderation)
 * and a one-sentence rationale. Warnings and the overall risk level are derived by
 * the caller using pure functions from @distribution-copilot/shared.
 * Persistence is the caller's responsibility.
 */
export async function assessRisk(
  postTitle: string,
  postBody: string | null,
  communityName: string,
  communityDescription: string | null,
  profile: ProductProfile,
  provider: Provider,
): Promise<AssessRiskResult> {
  const { data, model } = await provider.completeJson(
    RISK_SYSTEM_PROMPT,
    buildRiskUserMessage(postTitle, postBody, communityName, communityDescription, profile),
    riskAiResultSchema,
  );

  return { riskScores: data, model };
}
