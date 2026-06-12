/** BullMQ queue name — must match the string used when enqueuing. */
export const MONITOR_QUEUE = "monitor";

/** The monitor sweep job has no payload — it queries the DB itself. */
export type MonitorJobPayload = Record<string, never>;

/** Result written back to BullMQ on successful completion. */
export interface MonitorJobResult {
  /** Number of enabled (product, source) pairs swept this run. */
  monitorsSwepted: number;
  /** Total extract jobs enqueued across all swept monitors. */
  extractJobsEnqueued: number;
}
