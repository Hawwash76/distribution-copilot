/**
 * @distribution-copilot/ai
 *
 * All AI capabilities for the platform. Application code imports capability
 * functions and the provider factory from here — never the Anthropic SDK directly.
 *
 * Capabilities implemented:
 *   - generateProductProfile: builds structured intelligence from a product description
 */

export {
  generateProductProfile,
  type ProductProfileResult,
} from "./capabilities/generate-product-profile.js";

export { createMockProvider } from "./providers/mock.js";
export { type Provider, type JsonCompletion } from "./providers/provider.js";
