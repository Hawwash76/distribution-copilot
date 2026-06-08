import { z as zod } from "zod";

import { opportunitySourceSchema } from "./opportunity";

/** A community (subreddit, etc.) where opportunities are discovered. */
export const communitySchema = zod.object({
  id: zod.string(),
  source: opportunitySourceSchema,
  externalId: zod.string(),
  name: zod.string(),
  description: zod.string().nullable(),
  subscriberCount: zod.number().int().nullable(),
  createdAt: zod.coerce.date(),
  updatedAt: zod.coerce.date(),
});

export type Community = zod.infer<typeof communitySchema>;
