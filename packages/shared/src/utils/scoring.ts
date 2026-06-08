/**
 * Pure, deterministic scoring utilities for the opportunity ranking pipeline.
 *
 * All inputs are explicit — no Date.now() or Math.random() calls inside.
 * Pass `now` from the caller so batches are deterministic and tests are easy.
 */

/**
 * Normalize Reddit platform metrics into a 0-100 engagement score.
 * Uses a log scale so viral posts (thousands of upvotes) don't dominate.
 * Upvotes contribute 70 points; comments contribute 30 points.
 */
export function computeEngagementScore(redditScore: number, commentCount: number): number {
  const upvoteNorm = Math.min(70, Math.round((Math.log1p(redditScore) / Math.log1p(1000)) * 70));
  const commentNorm = Math.min(30, Math.round((Math.log1p(commentCount) / Math.log1p(200)) * 30));
  return Math.min(100, upvoteNorm + commentNorm);
}

/**
 * Time-decay recency score using a 7-day half-life.
 * A post published right now scores 100; one published 7 days ago scores ~50;
 * 14 days ago ~25; and so on.
 */
export function computeRecencyScore(publishedAt: Date, now: Date): number {
  const ageMs = now.getTime() - publishedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const raw = 100 * Math.pow(0.5, ageDays / 7);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Weighted composite of all four scoring dimensions.
 * Weights: intent 35%, relevance 35%, engagement 20%, recency 10%.
 */
export function computeOverallScore(
  intentScore: number,
  relevanceScore: number,
  engagementScore: number,
  recencyScore: number,
): number {
  return Math.round(
    intentScore * 0.35 + relevanceScore * 0.35 + engagementScore * 0.2 + recencyScore * 0.1,
  );
}

/**
 * Overall score when AI scoring was skipped (no product profile).
 * Intent and relevance contribute 0, so the result is naturally lower than
 * a fully-scored opportunity — partial scores rank below full scores.
 */
export function computePartialOverallScore(engagementScore: number, recencyScore: number): number {
  return computeOverallScore(0, 0, engagementScore, recencyScore);
}
