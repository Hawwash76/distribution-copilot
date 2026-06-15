import { z as zod } from "@distribution-copilot/shared";
import { discussionSourceSchema } from "@distribution-copilot/shared";

/**
 * Optional source filter — when provided, only that platform is searched.
 * Omitting it runs all sources (the default behaviour).
 */
export const triggerDiscoverySchema = zod.object({
  source: discussionSourceSchema.optional(),
});

export type TriggerDiscoveryInput = zod.infer<typeof triggerDiscoverySchema>;
