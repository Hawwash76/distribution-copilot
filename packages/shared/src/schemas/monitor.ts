import { z } from "zod";

import { discussionSourceSchema } from "./discussion";

export const productMonitorSchema = z.object({
  id: z.string(),
  productId: z.string(),
  source: discussionSourceSchema,
  enabled: z.boolean(),
  lastCheckedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductMonitor = z.infer<typeof productMonitorSchema>;

/** Lightweight shape returned by the monitors list endpoint. */
export const monitorStatusSchema = z.object({
  source: discussionSourceSchema,
  enabled: z.boolean(),
  lastCheckedAt: z.coerce.date().nullable(),
});

export type MonitorStatus = z.infer<typeof monitorStatusSchema>;

export const toggleMonitorInputSchema = z.object({
  enabled: z.boolean(),
});

export type ToggleMonitorInput = z.infer<typeof toggleMonitorInputSchema>;
