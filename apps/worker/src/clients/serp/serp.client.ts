/** A single organic search result returned by the SERP provider. */
export interface SerpResult {
  title: string;
  url: string;
  snippet: string;
}

/** Minimal interface for the SERP provider so it can be swapped without touching callers. */
export interface SerpClient {
  search(query: string, limit?: number): Promise<SerpResult[]>;
}

/** Minimum delay between SERP requests to stay within free-tier rate limits. */
const MIN_REQUEST_INTERVAL_MS = 500;

/**
 * Creates a SerpAPI-backed SERP client.
 *
 * When no API key is provided (local dev without credentials), logs a warning
 * and returns empty results so the pipeline structure can be tested end-to-end
 * without real SERP calls.
 */
export function createSerpClient(apiKey: string | undefined): SerpClient {
  if (!apiKey) {
    console.warn(
      "[serp] SERP_API_KEY is not set — discovery will find no URLs. Set the key to run real searches.",
    );
    return { search: async () => [] };
  }

  let lastRequestAt = 0;

  return {
    async search(query: string, limit = 10): Promise<SerpResult[]> {
      // Enforce a minimum gap between requests.
      const elapsed = Date.now() - lastRequestAt;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
      }
      lastRequestAt = Date.now();

      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        num: String(limit),
        engine: "google",
      });

      const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        console.error(`[serp] search failed: ${String(response.status)} for query="${query}"`);
        return [];
      }

      const body = (await response.json()) as {
        organic_results?: { title?: string; link?: string; snippet?: string }[];
      };

      return (body.organic_results ?? [])
        .filter((r) => r.link)
        .map((r) => ({
          title: r.title ?? "",
          url: r.link ?? "",
          snippet: r.snippet ?? "",
        }));
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
