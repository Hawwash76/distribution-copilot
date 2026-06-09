import {
  replyDraftAiResultSchema,
  type ProductProfile,
  type ReplyDraftAiResult,
  type RiskWarning,
} from "@distribution-copilot/shared";

import { type Provider } from "../providers/provider.js";
import {
  REPLY_GENERATION_SYSTEM_PROMPT,
  buildReplyGenerationUserMessage,
} from "../prompts/reply-generation/index.js";

/** Typed result of the generate-reply-draft capability. */
export interface GenerateReplyDraftResult {
  draft: ReplyDraftAiResult;
  /** The exact model ID that produced this output — store alongside the draft. */
  model: string;
}

/**
 * Generates a draft reply for a discovered post.
 *
 * The draft is a starting point for the human to review and edit — it is
 * never posted automatically. Risk warnings are injected as hard constraints
 * so the model avoids flagged behaviors (links, CTAs, product mentions).
 * Persistence is the caller's responsibility.
 */
export async function generateReplyDraft(
  postTitle: string,
  postBody: string | null,
  communityName: string,
  profile: ProductProfile,
  riskWarnings: RiskWarning[],
  provider: Provider,
): Promise<GenerateReplyDraftResult> {
  const { data, model } = await provider.completeJson(
    REPLY_GENERATION_SYSTEM_PROMPT,
    buildReplyGenerationUserMessage(postTitle, postBody, communityName, profile, riskWarnings),
    replyDraftAiResultSchema,
  );

  return { draft: data, model };
}
