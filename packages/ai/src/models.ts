/**
 * AI model IDs used by each capability.
 *
 * Scoring and classification (intent, signal type, risk) use Haiku — fast,
 * cheap, and accurate enough for structured extraction at bulk volume.
 *
 * Reply drafts and product profile generation use Sonnet — nuanced writing and
 * reasoning matters more than cost for these infrequent, user-visible outputs.
 */
export const AI_MODELS = {
  /** Scoring, signal classification, and risk assessment. */
  SCORING: "claude-haiku-4-5",
  /** Reply draft generation. */
  REPLY: "claude-sonnet-4-6",
  /** Product profile generation (one-off per product). */
  PROFILE: "claude-sonnet-4-6",
  /** Pain point extraction from discussion content. */
  PAIN_POINTS: "claude-haiku-4-5",
} as const;
