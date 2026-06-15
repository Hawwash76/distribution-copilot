import type {
  DiscoveryResult,
  DiscoverySearchOptions,
  DiscoverySource,
} from "../discovery-source.js";

const DEVTO_API_URL = "https://dev.to/api/articles";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

/** How long to wait after a 429 before retrying (used if Retry-After header is absent). */
const DEFAULT_RETRY_AFTER_MS = 10_000;

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DevToArticle {
  id: number;
  title: string;
  description: string | null;
  path: string; // e.g. "/username/some-slug"
  positive_reactions_count: number;
  comments_count: number;
  published_at?: string;
  user?: { username?: string };
}

interface DevToResponse {
  result?: DevToArticle[];
}

/**
 * Convert a freeform query string to a DEV.to tag.
 *
 * DEV.to tags are lowercase single-word or short compound strings.
 * We take the first meaningful word and lowercase it, which maps
 * common keywords ("workflow automation" → "workflow") to likely
 * DEV.to tag candidates.
 */
function queryToTag(query: string): string {
  const stopWords = new Set(["for", "a", "an", "the", "to", "in", "of", "and", "or", "with"]);
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return (words[0] ?? query.toLowerCase().replace(/[^a-z0-9]/g, "")).slice(0, 20);
}

/**
 * Discovery source backed by the DEV.to public articles API.
 *
 * No credentials required. Uses tag-based search — the documented, stable
 * endpoint. Queries are converted to a single tag; if the tag does not exist
 * on DEV.to the response is simply empty (graceful, no errors).
 *
 * DEV.to articles tend to be longer-form and discussion-heavy, complementing
 * the Q&A format of Stack Overflow and HN.
 *
 * The DEV.to API does not support date filtering. options.since is accepted but
 * ignored — state=fresh already returns recent articles, and the extract
 * pipeline's upsert deduplication prevents re-processing already-seen URLs.
 */
export const devToSource: DiscoverySource = {
  name: "devto",

  async search(
    query: string,
    limit: number,
    _options?: DiscoverySearchOptions,
    log: (msg: string) => void = console.log,
  ): Promise<DiscoveryResult[]> {
    const tag = queryToTag(query);

    const params = new URLSearchParams({
      tag,
      per_page: String(Math.min(limit, 30)),
      state: "fresh",
    });

    const feedUrl = `${DEVTO_API_URL}?${params.toString()}`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(feedUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            "api-key": process.env["DEVTO_API_KEY"] ?? "",
          },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        console.error(`[devto] network error for query="${query}" tag="${tag}": ${String(err)}`);
        return [];
      }

      if (response.status === 429) {
        const retryAfterSec = parseInt(response.headers.get("retry-after") ?? "0", 10);
        const waitMs = retryAfterSec > 0 ? retryAfterSec * 1_000 : DEFAULT_RETRY_AFTER_MS;
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `[devto] rate-limited (429) for query="${query}" — waiting ${String(waitMs / 1_000)}s before retry ${String(attempt + 1)}/${String(MAX_ATTEMPTS)}`,
          );
          await sleep(waitMs);
          continue;
        }
        console.warn(
          `[devto] rate-limited (429) for query="${query}" — giving up after ${String(MAX_ATTEMPTS)} attempts`,
        );
        return [];
      }

      if (!response.ok) {
        console.error(
          `[devto] search failed: ${String(response.status)} for query="${query}" tag="${tag}"${attempt < MAX_ATTEMPTS ? ` — retrying (${String(attempt + 1)}/${String(MAX_ATTEMPTS)})` : " — giving up"}`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(2_000);
          continue;
        }
        return [];
      }

      let articles: DevToArticle[] | DevToResponse;
      try {
        articles = (await response.json()) as DevToArticle[] | DevToResponse;
      } catch (err) {
        console.error(`[devto] failed to parse response: ${String(err)}`);
        return [];
      }

      // The public /api/articles endpoint returns an array directly.
      const items: DevToArticle[] = Array.isArray(articles)
        ? articles
        : ((articles as DevToResponse).result ?? []);

      const results: DiscoveryResult[] = items.slice(0, limit).map((article) => ({
        url: `https://dev.to${article.path}`,
        title: article.title,
        snippet: article.description ?? "",
        publishedAt: article.published_at ?? undefined,
        author: article.user?.username ?? undefined,
      }));

      log(`[devto] parsed ${String(results.length)} articles for query="${query}" tag="${tag}"`);
      return results;
    }

    return [];
  },
};
