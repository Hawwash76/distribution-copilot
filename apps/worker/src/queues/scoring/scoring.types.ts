/** BullMQ queue name — must match the string used when enqueuing. */
export const SCORING_QUEUE = "scoring";

/**
 * Minimal job payload — just the product ID.
 * The processor re-reads all `new` opportunities for this product from the DB.
 * Keeping the payload small ensures Redis stays lean and retries are idempotent.
 */
export interface ScoringJobPayload {
  productId: string;
}

/** Result written back to BullMQ on successful completion. */
export interface ScoringJobResult {
  opportunitiesScored: number;
  partialScores: number; // scored without AI (no product profile)
}
