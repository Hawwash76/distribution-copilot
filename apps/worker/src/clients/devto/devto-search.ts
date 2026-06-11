import type { DiscoveryResult, DiscoverySource } from "../discovery-source.js";

const DEVTO_API_URL = "https://dev.to/api/articles";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

interface DevToArticle {
  id: number;
  title: string;
  description: string | null;
  path: string; // e.g. "/username/some-slug"
  positive_reactions_count: number;
  comments_count: number;
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
 */
export const devToSource: DiscoverySource = {
  name: "devto",

  async search(
    query: string,
    limit: number,
    log: (msg: string) => void = console.log,
  ): Promise<DiscoveryResult[]> {
    const tag = queryToTag(query);

    const params = new URLSearchParams({
      tag,
      per_page: String(Math.min(limit, 30)),
      state: "fresh",
    });

    let response: Response;
    try {
      response = await fetch(`${DEVTO_API_URL}?${params.toString()}`, {
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
      console.warn(`[devto] rate-limited (429) for query="${query}"`);
      return [];
    }

    if (!response.ok) {
      console.error(
        `[devto] search failed: ${String(response.status)} for query="${query}" tag="${tag}"`,
      );
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
    }));

    log(`[devto] parsed ${String(results.length)} articles for query="${query}" tag="${tag}"`);
    return results;
  },
};
