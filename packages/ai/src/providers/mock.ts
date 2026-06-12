import {
  generatedProductProfileSchema,
  replyDraftAiResultSchema,
  riskAiResultSchema,
  scoringAiResultSchema,
  type z as zod,
} from "@distribution-copilot/shared";

import { type JsonCompletion, type Provider } from "./provider.js";

/** Static fixture for product-profile calls. */
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

/** Static fixture for scoring calls. */
const MOCK_SCORING = scoringAiResultSchema.parse({
  intentScore: 72,
  relevanceScore: 68,
  intentRationale:
    "Poster explicitly asks for tool recommendations to solve their workflow problem.",
  relevanceRationale:
    "Post mentions coordination overhead pain points that align with the product profile.",
  signalType: "RECOMMENDATION_REQUEST",
  signalRationale: "Poster is directly asking for tool recommendations in their workflow domain.",
});

/** Static fixture for risk-assessment calls. */
const MOCK_RISK = riskAiResultSchema.parse({
  ruleViolationRisk: 15,
  promotionRisk: 25,
  linkRisk: 10,
  moderationRisk: 10,
  riskRationale: "Low-risk community thread; direct product mention should be avoided.",
});

/** Static fixture for reply-draft calls. */
const MOCK_REPLY = replyDraftAiResultSchema.parse({
  draft:
    "Great question — I've seen a lot of teams struggle with this exact problem. The key is finding a tool that fits your existing workflow rather than forcing you to change how you work. Happy to share what's worked for others if that would be helpful.",
});

/**
 * Stub provider for local development when no real AI credentials are set.
 * Returns static fixture data without calling any external API.
 *
 * Dispatch order: attempts to parse each known fixture against the caller's
 * schema. Returns the first match. Falls back to the product-profile fixture.
 */
export function createMockProvider(): Provider {
  return {
    async completeJson<T>(
      _system: string,
      _user: string,
      schema: zod.ZodType<T>,
      _model?: string,
    ): Promise<JsonCompletion<T>> {
      const scoring = schema.safeParse(MOCK_SCORING);
      if (scoring.success) return { data: scoring.data, model: "mock" };

      const risk = schema.safeParse(MOCK_RISK);
      if (risk.success) return { data: risk.data, model: "mock" };

      const reply = schema.safeParse(MOCK_REPLY);
      if (reply.success) return { data: reply.data, model: "mock" };

      // Product-profile fixture — fallback
      return { data: MOCK_PROFILE as T, model: "mock" };
    },
  };
}
