/**
 * @distribution-copilot/ai
 *
 * All AI capabilities for the platform. Application code imports capability
 * functions and the provider factory from here — never the Anthropic SDK directly.
 *
 * Capabilities implemented:
 *   - generateProductProfile: builds structured intelligence from a product description
 *   - scoreOpportunity: scores a discovered post on intent and relevance vs a product profile
 *   - assessRisk: scores community engagement risk on four dimensions for a discovered post
 */

export {
  generateProductProfile,
  type ProductProfileResult,
} from "./capabilities/generate-product-profile.js";

export { scoreOpportunity, type ScoreOpportunityResult } from "./capabilities/score-opportunity.js";

export { assessRisk, type AssessRiskResult } from "./capabilities/assess-risk.js";

export { createMockProvider } from "./providers/mock.js";
export { type Provider, type JsonCompletion } from "./providers/provider.js";
