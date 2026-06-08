import { z as zod } from "zod";

export const triggerDiscoverySchema = zod.object({
  keywords: zod.array(zod.string().min(1)).min(1, "At least one keyword is required"),
  subreddits: zod.array(zod.string().min(1)).optional(),
});

export type TriggerDiscoveryInput = zod.infer<typeof triggerDiscoverySchema>;
