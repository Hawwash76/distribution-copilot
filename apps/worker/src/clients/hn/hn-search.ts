import type {
  DiscoveryResult,
  DiscoverySearchOptions,
  DiscoverySource,
} from "../discovery-source.js";

const ALGOLIA_SEARCH_URL = "https://hn.algolia.com/api/v1/search";

/** Minimum comments to consider a thread worth engaging with. */
const MIN_COMMENTS = 3;

/** Fallback cutoff when no since date is provided: 24 months back. */
const DEFAULT_MAX_AGE_MONTHS = 24;

/** How long to wait after a 429 before retrying (used if Retry-After header is absent). */
const DEFAULT_RETRY_AFTER_MS = 10_000;

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AlgoliaHit {
  objectID: string;
  title: string;
  story_text: string | null;
  num_comments: number;
  points: number;
  created_at?: string;
  author?: string;
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

  async search(
    query: string,
    limit: number,
    options?: DiscoverySearchOptions,
    log: (msg: string) => void = console.log,
  ): Promise<DiscoveryResult[]> {
    const cutoffEpoch = options?.since
      ? Math.floor(options.since.getTime() / 1000)
      : Math.floor((Date.now() - DEFAULT_MAX_AGE_MONTHS * 30 * 24 * 60 * 60 * 1000) / 1000);
    const params = new URLSearchParams({
      query,
      tags: "story",
      hitsPerPage: String(Math.min(limit, 100)),
      numericFilters: `num_comments>=${String(MIN_COMMENTS)},points>=1,created_at_i>=${String(cutoffEpoch)}`,
    });

    const url = `${ALGOLIA_SEARCH_URL}?${params.toString()}`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      } catch (err) {
        console.error(`[hn] network error for query="${query}": ${String(err)}`);
        return [];
      }

      if (response.status === 429) {
        const retryAfterSec = parseInt(response.headers.get("retry-after") ?? "0", 10);
        const waitMs = retryAfterSec > 0 ? retryAfterSec * 1_000 : DEFAULT_RETRY_AFTER_MS;
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `[hn] rate-limited (429) for query="${query}" — waiting ${String(waitMs / 1_000)}s before retry ${String(attempt + 1)}/${String(MAX_ATTEMPTS)}`,
          );
          await sleep(waitMs);
          continue;
        }
        console.warn(
          `[hn] rate-limited (429) for query="${query}" — giving up after ${String(MAX_ATTEMPTS)} attempts`,
        );
        return [];
      }

      if (!response.ok) {
        console.error(
          `[hn] search failed: ${String(response.status)} for query="${query}"${attempt < MAX_ATTEMPTS ? ` — retrying (${String(attempt + 1)}/${String(MAX_ATTEMPTS)})` : " — giving up"}`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(2_000);
          continue;
        }
        return [];
      }

      const body = (await response.json()) as AlgoliaSearchResponse;
      const results: DiscoveryResult[] = [];

      for (const hit of body.hits) {
        results.push({
          url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          title: hit.title,
          snippet: hit.story_text?.slice(0, 300) ?? "",
          publishedAt: hit.created_at ?? undefined,
          author: hit.author ?? undefined,
        });
      }

      log(`[hn] parsed ${String(results.length)} stories for query="${query}"`);
      return results;
    }

    return [];
  },
};
