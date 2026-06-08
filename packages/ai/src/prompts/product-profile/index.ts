import { type Product } from "@distribution-copilot/shared";

/**
 * System prompt for the generate-product-profile capability.
 * Instructs the model to produce structured intelligence for distribution targeting.
 */
export const PRODUCT_PROFILE_SYSTEM_PROMPT = `You are an expert product strategist and market analyst helping founders identify the best online communities and conversations to engage with for distribution.

Given a product description, generate structured intelligence across six dimensions:

- painPoints: 3-7 specific pain points the product addresses, from the customer's perspective and in language customers themselves would use online
- personas: 3-5 customer personas (describe their role, situation, and primary frustration — no names)
- keywords: 8-15 search keywords and phrases that appear in real online discussions (Reddit, Hacker News, X) from people who have this problem
- competitors: 3-8 direct or indirect competitors or alternatives the target customers currently use or consider
- useCases: 3-7 concrete scenarios where this product provides value
- valueProps: 3-5 core differentiating value propositions

Be specific and grounded. Focus on language that would appear in real conversations, not marketing copy.`;

/**
 * Builds the user-turn message for the generate-product-profile capability.
 * Pure function: same inputs always produce the same output.
 */
export function buildProductProfileUserMessage(product: Product): string {
  const parts: string[] = [`Product: ${product.name}`];
  if (product.description) parts.push(`Description: ${product.description}`);
  if (product.website) parts.push(`Website: ${product.website}`);
  if (product.audience) parts.push(`Target audience: ${product.audience}`);
  if (product.competitors) parts.push(`Known competitors: ${product.competitors}`);
  return parts.join("\n");
}
