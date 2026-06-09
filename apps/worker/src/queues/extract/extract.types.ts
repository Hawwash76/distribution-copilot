/** BullMQ queue name — must match the string used when enqueuing. */
export const EXTRACT_QUEUE = "extract";

/** Job payload: a single URL to fetch, extract, and persist. */
export interface ExtractJobPayload {
  url: string;
  productId: string;
  /** Title from the SERP result — used as fallback if extraction fails. */
  serpTitle: string;
  /** Snippet from the SERP result — used as fallback body if extraction fails. */
  serpSnippet: string;
}

/** Result written back to BullMQ on successful completion. */
export interface ExtractJobResult {
  discussionId: string;
  /** True when a new Opportunity row was created; false when it already existed (idempotent retry). */
  opportunityCreated: boolean;
}
