import { z as zod } from "@distribution-copilot/shared";
import {
  computeEngagementScore,
  computeOverallScore,
  computeOverallRiskLevel,
  computePartialOverallScore,
  computeRecencyScore,
  computeRiskWarnings,
} from "@distribution-copilot/shared";
import {
  assessRisk,
  createMockProvider,
  generateReplyDraft,
  scoreOpportunity,
} from "@distribution-copilot/ai";
import { prisma } from "@distribution-copilot/database";

import { ScoringRepository } from "../../repositories/scoring.repository.js";
import { type ScoringJobPayload, type ScoringJobResult } from "./scoring.types.js";

const payloadSchema = zod.object({
  productId: zod.string().min(1),
});

/**
 * Scores all `new` opportunities for a product, then assesses engagement risk
 * for each opportunity that received full AI scoring.
 *
 * - Loads all opportunities with status="new" for the given product.
 * - If a product profile exists: calls AI for intent + relevance scores, then
 *   calls AI for four-dimension risk assessment and derives warnings + level.
 * - If no profile: computes engagement + recency only (partial scoring, no risk).
 * - Saves all scores and advances each opportunity's status to "scored".
 *
 * Idempotent: re-running finds no `new` opportunities and returns early.
 */
export async function runScoring(
  raw: unknown,
  log: (msg: string) => void = console.log,
): Promise<ScoringJobResult> {
  const { productId } = payloadSchema.parse(raw) as ScoringJobPayload;
  log(`[scoring] starting product=${productId}`);

  const repo = new ScoringRepository(prisma);
  const provider = createMockProvider(); // TODO: replace with real provider from config

  const opportunities = await repo.findNewByProduct(productId);
  log(`[scoring] found ${String(opportunities.length)} opportunities with status=new`);

  if (opportunities.length === 0) {
    return { opportunitiesScored: 0, partialScores: 0 };
  }

  const profile = await repo.findProductProfile(productId);
  const hasProfile = profile !== null;

  if (!hasProfile) {
    log(`[scoring] no product profile for product=${productId} — computing partial scores only`);
  }

  // Capture "now" once before the loop so all recency scores in this batch
  // are computed at the same point in time (deterministic, no drift).
  const now = new Date();
  let opportunitiesScored = 0;
  let partialScores = 0;

  for (const opp of opportunities) {
    const engagementScore = computeEngagementScore(opp.platformScore, opp.commentCount);
    const recencyScore = computeRecencyScore(opp.publishedAt, now);

    if (hasProfile && profile) {
      const { scores, model } = await scoreOpportunity(opp.title, opp.body, profile, provider);
      const overallScore = computeOverallScore(
        scores.intentScore,
        scores.relevanceScore,
        engagementScore,
        recencyScore,
      );

      const { riskScores, model: riskModel } = await assessRisk(
        opp.title,
        opp.body,
        opp.communityName ?? "",
        opp.communityDescription,
        profile,
        provider,
      );

      const overallRisk = computeOverallRiskLevel(
        riskScores.ruleViolationRisk,
        riskScores.promotionRisk,
        riskScores.linkRisk,
        riskScores.moderationRisk,
      );
      const riskWarnings = computeRiskWarnings(
        riskScores.ruleViolationRisk,
        riskScores.promotionRisk,
        riskScores.linkRisk,
      );

      const { draft, model: draftModel } = await generateReplyDraft(
        opp.title,
        opp.body,
        opp.communityName ?? "",
        profile,
        riskWarnings,
        provider,
      );

      await repo.saveScores(opp.id, {
        intentScore: scores.intentScore,
        relevanceScore: scores.relevanceScore,
        engagementScore,
        recencyScore,
        overallScore,
        scoringModel: model,
        intentRationale: scores.intentRationale,
        relevanceRationale: scores.relevanceRationale,
        ruleViolationRisk: riskScores.ruleViolationRisk,
        promotionRisk: riskScores.promotionRisk,
        linkRisk: riskScores.linkRisk,
        moderationRisk: riskScores.moderationRisk,
        overallRisk,
        riskWarnings,
        riskRationale: riskScores.riskRationale,
        riskModel,
        replyDraft: draft.draft,
        replyDraftModel: draftModel,
      });

      log(
        `[scoring] opp=${opp.id} intent=${String(scores.intentScore)} relevance=${String(scores.relevanceScore)} engagement=${String(engagementScore)} recency=${String(recencyScore)} overall=${String(overallScore)} risk=${overallRisk}`,
      );
      opportunitiesScored++;
    } else {
      const overallScore = computePartialOverallScore(engagementScore, recencyScore);

      await repo.saveScores(opp.id, {
        intentScore: null,
        relevanceScore: null,
        engagementScore,
        recencyScore,
        overallScore,
        scoringModel: null,
        intentRationale: null,
        relevanceRationale: null,
        ruleViolationRisk: null,
        promotionRisk: null,
        linkRisk: null,
        moderationRisk: null,
        overallRisk: null,
        riskWarnings: [],
        riskRationale: null,
        riskModel: null,
        replyDraft: null,
        replyDraftModel: null,
      });

      log(
        `[scoring] opp=${opp.id} (partial) engagement=${String(engagementScore)} recency=${String(recencyScore)} overall=${String(overallScore)}`,
      );
      partialScores++;
    }
  }

  log(`[scoring] done — scored=${String(opportunitiesScored)} partial=${String(partialScores)}`);
  return { opportunitiesScored, partialScores };
}
