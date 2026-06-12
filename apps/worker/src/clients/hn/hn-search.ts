import type { DiscoveryResult, DiscoverySource } from "../discovery-source.js";

const ALGOLIA_SEARCH_URL = "https://hn.algolia.com/api/v1/search";

/** Minimum comments to consider a thread worth engaging with. */
const MIN_COMMENTS = 3;

/** Only surface threads created within this many months. */
const MAX_AGE_MONTHS = 24;

interface AlgoliaHit {
  objectID: string;
  title: string;
  story_text: string | null;
  num_comments: number;
  points: number;
}

interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
}

/**
 * Discovery source backed by Hacker News via the Algolia search API.
 *
 * Free, no API key required, generous rate limits. Only indexes HN stories
 * (excludes comments, jobs, polls). Thread URL is always the HN item page
 * so the extractor can fetch the full discussion.
 */
export const hnSource: DiscoverySource = {
  name: "hn",

  async search(query: string, limit: number): Promise<DiscoveryResult[]> {
    const cutoffEpoch = Math.floor((Date.now() - MAX_AGE_MONTHS * 30 * 24 * 60 * 60 * 1000) / 1000);
    const params = new URLSearchParams({
      query,
      tags: "story",
      hitsPerPage: String(Math.min(limit, 100)),
      numericFilters: `num_comments>=${String(MIN_COMMENTS)},points>=1,created_at_i>=${String(cutoffEpoch)}`,
    });

    const response = await fetch(`${ALGOLIA_SEARCH_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error(`[hn] search failed: ${String(response.status)} for query="${query}"`);
      return [];
    }

    const body = (await response.json()) as AlgoliaSearchResponse;
    const results: DiscoveryResult[] = [];

    for (const hit of body.hits) {
      results.push({
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        title: hit.title,
        snippet: hit.story_text?.slice(0, 300) ?? "",
      });
    }

    return results;
  },
};
