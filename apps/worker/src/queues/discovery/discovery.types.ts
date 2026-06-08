/** BullMQ queue name — must match the string used by the API producer. */
export const DISCOVERY_QUEUE = "discovery";

/** Job payload enqueued by the API. Keep it minimal — IDs and params only. */
export interface DiscoveryJobPayload {
  productId: string;
  keywords: string[];
  /** Optional: restrict search to these subreddits. Omit to search all of Reddit. */
  subreddits?: string[];
}

/** Result written back to BullMQ on successful completion. */
export interface DiscoveryJobResult {
  communitiesUpserted: number;
  opportunitiesUpserted: number;
}
