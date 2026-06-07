import { z } from "zod";

/**
 * Placeholder product schema. A product is the thing a founder is
 * distributing — used later for matching and reply context.
 */
export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;
