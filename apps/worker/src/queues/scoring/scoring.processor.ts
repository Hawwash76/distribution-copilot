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
  createProvider,
  extractPainPoints,
  generateReplyDraft,
  scoreOpportunity,
} from "@distribution-copilot/ai";
import { prisma } from "@distribution-copilot/database";
import { Queue } from "bullmq";

import { ScoringRepository } from "../../repositories/scoring.repository.js";
import { redisConnection } from "../../config/redis.js";
import { NOTIFICATION_QUEUE } from "../notification/notification.types.js";
import { type ScoringJobPayload, type ScoringJobResult } from "./scoring.types.js";

const payloadSchema = zod.object({
  productId: zod.string().min(1),
});

/**
 * Opportunities scoring below this threshold are automatically dismissed
 * rather than surfaced to the user. Keeps the list free of irrelevant noise.
 * Partial scores (no product profile) max out around 30, so they are always
 * auto-dismissed — the user only sees AI-scored results.
 */
const AUTO_DISMISS_THRESHOLD = 35;

/**
 * Scores all `new` opportunities for a product, then assesses engagement risk
 * for each opportunity that received full AI scoring.
 *
 * - Loads all opportunities with status="new" for the given product.
 * - If a product profile exists: calls AI for intent + relevance + signal type,
 *   then calls AI for four-dimension risk assessment and derives warnings + level,
 *   then calls AI for a signal-type-aware reply draft.
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
  const provider = createProvider();

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
  const scoredOpportunityIds: string[] = [];

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
        scores.signalType,
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
        signalType: scores.signalType,
        signalRationale: scores.signalRationale,
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
        status: overallScore >= AUTO_DISMISS_THRESHOLD ? "scored" : "dismissed",
      });

      log(
        `[scoring] opp=${opp.id} intent=${String(scores.intentScore)} relevance=${String(scores.relevanceScore)} signal=${scores.signalType} engagement=${String(engagementScore)} recency=${String(recencyScore)} overall=${String(overallScore)} risk=${overallRisk}`,
      );
      opportunitiesScored++;
      if (overallScore >= AUTO_DISMISS_THRESHOLD) {
        scoredOpportunityIds.push(opp.id);

        // Extract pain points from the discussion content (once per discussion,
        // shared across products). Skip if already extracted.
        const alreadyExtracted = await repo.hasDiscussionPainPoints(opp.discussionId);
        if (!alreadyExtracted) {
          const { painPoints } = await extractPainPoints(opp.title, opp.body, provider);
          if (painPoints.length > 0) {
            await repo.savePainPoints(opp.discussionId, painPoints);
            log(
              `[scoring] extracted ${String(painPoints.length)} pain points for discussion=${opp.discussionId}`,
            );
          }
        }
      }
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
        signalType: null,
        signalRationale: null,
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
        // Partial scores (no profile) always fall below threshold — auto-dismiss.
        status: "dismissed",
      });

      log(
        `[scoring] opp=${opp.id} (partial) engagement=${String(engagementScore)} recency=${String(recencyScore)} overall=${String(overallScore)}`,
      );
      partialScores++;
    }
  }

  // Enqueue a notification job for any opportunities that reached status="scored".
  // The notification processor will apply the product's alertThreshold and skip
  // channels that haven't been configured — safe to enqueue unconditionally.
  if (scoredOpportunityIds.length > 0) {
    const notificationQueue = new Queue(NOTIFICATION_QUEUE, { connection: redisConnection });
    await notificationQueue.add(
      "notify",
      { productId, opportunityIds: scoredOpportunityIds },
      { attempts: 3, backoff: { type: "exponential", delay: 3_000 } },
    );
    await notificationQueue.close();
    log(
      `[scoring] enqueued notification job for ${String(scoredOpportunityIds.length)} opportunities`,
    );
  }

  log(`[scoring] done — scored=${String(opportunitiesScored)} partial=${String(partialScores)}`);
  return { opportunitiesScored, partialScores };
}
