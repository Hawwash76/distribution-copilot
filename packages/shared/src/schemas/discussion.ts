import { z as zod } from "zod";

/**
 * Discussion schemas — a piece of content fetched from the web via SERP discovery.
 * Source-agnostic: can be a Reddit post, HN thread, or any generic web page.
 * The url field is the canonical unique identifier.
 */

export const discussionSourceSchema = zod.enum([
  "reddit",
  "hackernews",
  "stackoverflow",
  "lobsters",
  "devto",
  "web",
]);
export type DiscussionSource = zod.infer<typeof discussionSourceSchema>;

export const discussionSchema = zod.object({
  id: zod.string(),
  source: discussionSourceSchema,
  externalId: zod.string().nullable(),
  url: zod.string().url(),
  title: zod.string(),
  body: zod.string().nullable(),
  author: zod.string().nullable(),
  platformScore: zod.number().int().nullable(),
  commentCount: zod.number().int().nullable(),
  publishedAt: zod.coerce.date().nullable(),
  fetchedAt: zod.coerce.date(),
  communityId: zod.string().nullable(),
  communityName: zod.string().nullable(),
  createdAt: zod.coerce.date(),
  updatedAt: zod.coerce.date(),
});

export type Discussion = zod.infer<typeof discussionSchema>;
