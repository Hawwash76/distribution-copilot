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

/**
 * The 6 structured fields returned by the generate-profile AI capability.
 * Used both as the Claude output schema (validated by zodOutputFormat) and as
 * the shape stored on ProductProfile in the database.
 */
export const generatedProductProfileSchema = zod.object({
  painPoints: zod
    .array(zod.string())
    .describe("Pain points the product solves, from the customer perspective"),
  personas: zod.array(zod.string()).describe("Customer personas likely to use the product"),
  keywords: zod
    .array(zod.string())
    .describe("Keywords and phrases appearing in relevant online discussions"),
  competitors: zod.array(zod.string()).describe("Direct and indirect competitors"),
  useCases: zod.array(zod.string()).describe("Specific scenarios where the product is used"),
  valueProps: zod.array(zod.string()).describe("Core value propositions of the product"),
});

/** A stored product profile including metadata about when it was generated. */
export const productProfileSchema = zod.object({
  id: zod.string(),
  productId: zod.string(),
  painPoints: zod.array(zod.string()),
  personas: zod.array(zod.string()),
  keywords: zod.array(zod.string()),
  competitors: zod.array(zod.string()),
  useCases: zod.array(zod.string()),
  valueProps: zod.array(zod.string()),
  modelUsed: zod.string(),
  generatedAt: zod.coerce.date(),
});

export type Product = zod.infer<typeof productSchema>;
export type CreateProductInput = zod.infer<typeof createProductSchema>;
export type UpdateProductInput = zod.infer<typeof updateProductSchema>;
export type GeneratedProductProfile = zod.infer<typeof generatedProductProfileSchema>;
export type ProductProfile = zod.infer<typeof productProfileSchema>;
