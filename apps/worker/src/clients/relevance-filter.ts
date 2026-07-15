/**
 * Shared pre-filters applied to raw DiscoverySource results before they're
 * enqueued for extraction. Used by both discovery.processor.ts (one-shot) and
 * monitor.processor.ts (recurring sweep) so the two pipelines can't drift —
 * the monitor sweep previously skipped these checks entirely, which let every
 * unfiltered search result (regardless of topical relevance) flow straight to
 * extraction.
 */

/** Maximum age of a discovered post in days before it's dropped. */
export const MAX_RESULT_AGE_DAYS = 90;

/** Returns true when publishedAt is known and older than MAX_RESULT_AGE_DAYS. */
export function isTooOld(publishedAt?: string): boolean {
  if (!publishedAt) return false;
  const date = new Date(publishedAt);
  if (isNaN(date.getTime())) return false;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) > MAX_RESULT_AGE_DAYS;
}

/**
 * Filler words dropped when extracting a term's significant words. Deliberately
 * a curated list rather than a length cutoff — a length cutoff drops short but
 * meaningful words too (e.g. "vs" in a competitor-comparison term "Apollo vs"),
 * which leaves single-word terms like a short/common competitor name ("Apollo")
 * as the *only* thing required to match — and "Apollo" alone also means the
 * NASA program, a boxing character, a theater, etc., producing false positives.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "in",
  "on",
  "at",
  "to",
  "of",
  "or",
  "and",
  "for",
  "with",
  "from",
  "by",
  "this",
  "that",
  "as",
  "it",
  "its",
  "i",
  "we",
  "you",
  "he",
  "she",
  "my",
  "our",
  "your",
  "his",
  "her",
]);

/**
 * Returns true when the title or snippet contains enough signal words from
 * at least one of the given terms to be worth extracting.
 *
 * For each term, every word except filler stop-words must appear in the text
 * as a whole word (word-boundary match, not substring) — this catches
 * paraphrased language ("my emails keep going to spam" matches the term
 * "emails landing spam") without requiring an exact phrase match, and without
 * the false positives a plain substring check allows (e.g. term "cat" would
 * otherwise match "category"). Filler words (a, an, the, in, to, …) are
 * skipped automatically, but short *meaningful* words (vs, b2b, …) are kept —
 * see STOP_WORDS above for why a length cutoff isn't used.
 *
 * This is a coarse pre-filter, not the relevance judgment — since the same
 * terms are also used as the platform search query, most search results will
 * trivially pass. The AI scoring stage's relevanceScore is the real filter
 * for topical relevance (see AUTO_DISMISS_THRESHOLD / MIN_RELEVANCE_SCORE in
 * scoring.processor.ts).
 */
export function isRelevant(title: string, snippet: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const text = `${title} ${snippet}`.toLowerCase();
  return terms.some((term) => {
    const words = term
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
    // Words are already \w-only (split on \W+), so no regex-escaping is needed.
    return words.length > 0 && words.every((w) => new RegExp(`\\b${w}\\b`).test(text));
  });
}
