import { type DiscussionSource } from "@distribution-copilot/shared";

/** BullMQ queue name — must match the string used by the API producer. */
export const DISCOVERY_QUEUE = "discovery";

/** Job payload enqueued by the API. Only the product ID is needed — keywords
 *  are loaded from the product's AI profile inside the processor.
 *  An optional source limits the run to a single platform (useful for testing). */
export interface DiscoveryJobPayload {
  productId: string;
  /** When set, only this platform is searched. Omit to run all sources. */
  source?: DiscussionSource;
}

/** Result written back to BullMQ on successful completion. */
export interface DiscoveryJobResult {
  urlsFound: number;
  extractJobsEnqueued: number;
}
