import { z as zod } from "zod";

/** No body is required — the productId comes from the URL param and keywords
 *  are loaded from the product's AI profile inside the worker. */
export const triggerDiscoverySchema = zod.object({});

export type TriggerDiscoveryInput = zod.infer<typeof triggerDiscoverySchema>;
