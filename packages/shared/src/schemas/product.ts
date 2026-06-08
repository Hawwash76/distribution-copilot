import { z as zod } from "zod";

/**
 * Product schema — the thing a founder is distributing.
 * Used for matching opportunities and generating context-aware replies.
 */
export const productSchema = zod.object({
  id: zod.string(),
  userId: zod.string(),
  name: zod.string(),
  website: zod.string().nullable(),
  description: zod.string().nullable(),
  audience: zod.string().nullable(),
  competitors: zod.string().nullable(),
  createdAt: zod.coerce.date(),
  updatedAt: zod.coerce.date(),
});

export const createProductSchema = zod.object({
  name: zod.string().min(1, "Name is required"),
  website: zod.string().url("Must be a valid URL").optional(),
  description: zod.string().optional(),
  audience: zod.string().optional(),
  competitors: zod.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type Product = zod.infer<typeof productSchema>;
export type CreateProductInput = zod.infer<typeof createProductSchema>;
export type UpdateProductInput = zod.infer<typeof updateProductSchema>;
