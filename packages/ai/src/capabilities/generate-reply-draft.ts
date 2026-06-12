import {
  replyDraftAiResultSchema,
  type ProductProfile,
  type ReplyDraftAiResult,
  type RiskWarning,
  type SignalType,
} from "@distribution-copilot/shared";

import { AI_MODELS } from "../models.js";
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
 * Signal type injects tone guidance so the reply matches the conversation's
 * buying-signal pattern. Persistence is the caller's responsibility.
 */
export async function generateReplyDraft(
  postTitle: string,
  postBody: string | null,
  communityName: string,
  profile: ProductProfile,
  riskWarnings: RiskWarning[],
  signalType: SignalType | null,
  provider: Provider,
): Promise<GenerateReplyDraftResult> {
  const { data, model } = await provider.completeJson(
    REPLY_GENERATION_SYSTEM_PROMPT,
    buildReplyGenerationUserMessage(
      postTitle,
      postBody,
      communityName,
      profile,
      riskWarnings,
      signalType,
    ),
    replyDraftAiResultSchema,
    AI_MODELS.REPLY,
  );

  return { draft: data, model };
}
