/**
 * Pure, deterministic risk utilities for the opportunity risk-assessment pipeline.
 *
 * Warnings and the overall risk level are derived from AI-scored dimensions using
 * fixed thresholds so the logic is testable without a model call.
 */

import { type RiskLevel, type RiskWarning } from "../schemas/opportunity.js";

const LINK_RISK_THRESHOLD = 60;
const CTA_RISK_THRESHOLD = 60;
const PRODUCT_MENTION_RISK_THRESHOLD = 70;
const HIGH_RISK_THRESHOLD = 70;
const MEDIUM_RISK_THRESHOLD = 40;

/**
 * Derive actionable warnings from three of the four AI risk scores.
 *
 * - avoid_links: a link in the reply would likely be perceived as spam.
 * - avoid_cta: a call-to-action or self-promotional framing would violate norms.
 * - avoid_product_mention: any product name-drop would be out of place.
 */
export function computeRiskWarnings(
  ruleViolationRisk: number,
  promotionRisk: number,
  linkRisk: number,
): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  if (linkRisk >= LINK_RISK_THRESHOLD) {
    warnings.push("avoid_links");
  }

  if (promotionRisk >= CTA_RISK_THRESHOLD || ruleViolationRisk >= CTA_RISK_THRESHOLD) {
    warnings.push("avoid_cta");
  }

  if (promotionRisk >= PRODUCT_MENTION_RISK_THRESHOLD) {
    warnings.push("avoid_product_mention");
  }

  return warnings;
}

/**
 * Derive the headline risk band from the worst of the four AI risk scores.
 * high ≥ 70, medium ≥ 40, low < 40.
 */
export function computeOverallRiskLevel(
  ruleViolationRisk: number,
  promotionRisk: number,
  linkRisk: number,
  moderationRisk: number,
): RiskLevel {
  const max = Math.max(ruleViolationRisk, promotionRisk, linkRisk, moderationRisk);
  if (max >= HIGH_RISK_THRESHOLD) return "high";
  if (max >= MEDIUM_RISK_THRESHOLD) return "medium";
  return "low";
}
