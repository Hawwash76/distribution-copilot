/** BullMQ queue name — must match the string used when enqueuing. */
export const EXTRACT_QUEUE = "extract";

/** Job payload: a single URL to fetch, extract, and persist. */
export interface ExtractJobPayload {
  url: string;
  productId: string;
  /** Title from the discovery source — used as fallback if extraction fails. */
  sourceTitle: string;
  /** Snippet from the discovery source — used as fallback body if extraction fails. */
  sourceSnippet: string;
  /** ISO-8601 publish date from the discovery source, when available (e.g. Reddit Atom feed). */
  sourcePublishedAt?: string;
  /** Author username from the discovery source, when available (e.g. Reddit Atom `<author>` tag). */
  sourceAuthor?: string;
}

/** Result written back to BullMQ on successful completion. */
export interface ExtractJobResult {
  /** Null when the URL was rejected by a content quality gate (no Discussion or Opportunity created). */
  discussionId: string | null;
  /** True when a new Opportunity row was created; false when it already existed or was skipped. */
  opportunityCreated: boolean;
  /** True when the URL failed a quality gate and was intentionally skipped. */
  skipped: boolean;
}
