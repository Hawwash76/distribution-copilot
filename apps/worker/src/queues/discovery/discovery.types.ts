/** BullMQ queue name — must match the string used by the API producer. */
export const DISCOVERY_QUEUE = "discovery";

/** Job payload enqueued by the API. Only the product ID is needed — keywords
 *  are loaded from the product's AI profile inside the processor. */
export interface DiscoveryJobPayload {
  productId: string;
}

/** Result written back to BullMQ on successful completion. */
export interface DiscoveryJobResult {
  urlsFound: number;
  extractJobsEnqueued: number;
}
