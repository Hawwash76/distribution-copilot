/** BullMQ queue name for the daily discovery scheduler. */
export const SCHEDULER_QUEUE = "scheduler";

/** Scheduler job has no payload — it reads all products from DB on execution. */
export type SchedulerJobPayload = Record<string, never>;

export interface SchedulerJobResult {
  jobsEnqueued: number;
}
