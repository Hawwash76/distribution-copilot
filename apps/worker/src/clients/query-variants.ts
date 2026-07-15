/**
 * Query-shaping helpers shared by discovery.processor.ts and monitor.processor.ts,
 * used to prioritize natural, conversational phrasing over marketing/SEO-style
 * keyword phrases when building platform search queries.
 */

/**
 * Derives a shorter, more natural fragment from a multi-word marketing-style
 * term by dropping leading qualifier words and keeping only the last two.
 *
 * AI-generated product keywords read like SEO phrases ("B2B prospecting tool",
 * "email sequence software") that real users rarely type verbatim — someone
 * asking for help is far more likely to write "prospecting tool" or "sequence
 * software" than the full qualified phrase. Returns null when the term is
 * already short enough (≤2 words) that trimming it further would lose meaning.
 */
export function shortVariant(term: string): string | null {
  const words = term.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return null;
  return words.slice(-2).join(" ");
}

/**
 * Expands a list of terms with each multi-word term's shortVariant (when it
 * has one), de-duplicated and order-preserving. Used to add natural-language
 * query coverage without dropping the original, more specific terms.
 */
export function withShortVariants(terms: string[]): string[] {
  const expanded = terms.flatMap((term) => {
    const short = shortVariant(term);
    return short ? [term, short] : [term];
  });
  return Array.from(new Set(expanded));
}
