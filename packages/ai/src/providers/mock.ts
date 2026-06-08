import { generatedProductProfileSchema } from "@distribution-copilot/shared";

import { type JsonCompletion, type Provider } from "./provider.js";

/** Static fixture used by the mock provider for all product-profile calls. */
const MOCK_PROFILE = generatedProductProfileSchema.parse({
  painPoints: [
    "Manual, time-consuming processes that don't scale",
    "Poor visibility into what the team is actually working on",
    "Context-switching between too many disconnected tools",
    "Hard to onboard new people quickly",
  ],
  personas: [
    "Solo founder managing every function themselves",
    "Early-stage startup ops lead drowning in coordination overhead",
    "Product manager keeping cross-functional teams aligned",
  ],
  keywords: [
    "workflow automation",
    "founder productivity",
    "team coordination tool",
    "project management for startups",
    "async team collaboration",
    "reduce meeting overhead",
    "single source of truth",
    "startup ops",
  ],
  competitors: ["Notion", "Linear", "Asana", "Monday.com", "ClickUp", "Jira"],
  useCases: [
    "Tracking milestones for a product launch",
    "Coordinating work across a fully remote team",
    "Replacing weekly status meetings with async updates",
    "Onboarding a new hire in under a day",
  ],
  valueProps: [
    "Saves 5+ hours per week on manual coordination",
    "One place for decisions, tasks, and context — no more tool-hopping",
    "Works out of the box with zero setup overhead",
  ],
});

/**
 * Stub provider for local development when ANTHROPIC_API_KEY is not set.
 * Returns static fixture data without calling any external API.
 * Replace this with the real Anthropic provider once you have credits.
 */
export function createMockProvider(): Provider {
  return {
    async completeJson<T>(_system: string, _user: string): Promise<JsonCompletion<T>> {
      return { data: MOCK_PROFILE as T, model: "mock" };
    },
  };
}
