/** BullMQ queue name — must match the string used when enqueuing. */
export const NOTIFICATION_QUEUE = "notification";

/**
 * Job payload: the product that just finished scoring plus the IDs of all
 * opportunities that reached status="scored" in that run.
 * The notification processor fetches the product's alert config and filters
 * by alertThreshold before deciding whether to send anything.
 */
export interface NotificationJobPayload {
  productId: string;
  opportunityIds: string[];
}

/** Result written back to BullMQ on successful completion. */
export interface NotificationJobResult {
  sent: boolean;
  channels: string[]; // e.g. ["slack", "telegram"]
  notified: number; // number of opportunities included in the alert
}
