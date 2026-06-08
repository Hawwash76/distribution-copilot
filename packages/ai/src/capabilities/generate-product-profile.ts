import {
  generatedProductProfileSchema,
  type GeneratedProductProfile,
  type Product,
} from "@distribution-copilot/shared";

import { type Provider } from "../providers/provider.js";
import {
  PRODUCT_PROFILE_SYSTEM_PROMPT,
  buildProductProfileUserMessage,
} from "../prompts/product-profile/index.js";

/** Typed result of the generate-product-profile capability. */
export interface ProductProfileResult {
  profile: GeneratedProductProfile;
  /** The exact model ID that produced this output — store alongside the data. */
  model: string;
}

/**
 * Generates structured product intelligence from the product's description.
 *
 * Pure orchestration: build prompt → call provider → validate → return.
 * Persistence is the caller's responsibility.
 */
export async function generateProductProfile(
  product: Product,
  provider: Provider,
): Promise<ProductProfileResult> {
  const { data, model } = await provider.completeJson(
    PRODUCT_PROFILE_SYSTEM_PROMPT,
    buildProductProfileUserMessage(product),
    generatedProductProfileSchema,
  );

  return { profile: data, model };
}
