import type { DiscoveryResult, DiscoverySource } from "../discovery-source.js";

const SE_API_URL = "https://api.stackexchange.com/2.3/search/advanced";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

interface SeItem {
  question_id: number;
  title?: string;
  body?: string;
}

interface SeResponse {
  items?: SeItem[];
}

/**
 * Factory producing a DiscoverySource backed by the Stack Exchange search API.
 *
 * Free tier: 300 requests/day without a key, 10 000/day with a free app key
 * (STACK_EXCHANGE_KEY env var). Supports both stackoverflow.com and
 * softwarerecs.stackexchange.com — the latter is particularly high-signal
 * because every question explicitly asks for a tool recommendation.
 */
function createStackExchangeSource(
  site: "stackoverflow" | "softwarerecs",
  baseUrl: string,
): DiscoverySource {
  return {
    name: site,

    async search(
      query: string,
      limit: number,
      log: (msg: string) => void = console.log,
    ): Promise<DiscoveryResult[]> {
      const params = new URLSearchParams({
        q: query,
        site,
        sort: "votes",
        order: "desc",
        filter: "withbody",
        pagesize: String(Math.min(limit, 30)),
      });

      const apiKey = process.env["STACK_EXCHANGE_KEY"];
      if (apiKey) params.set("key", apiKey);

      let response: Response;
      try {
        response = await fetch(`${SE_API_URL}?${params.toString()}`, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        console.error(`[${site}] network error for query="${query}": ${String(err)}`);
        return [];
      }

      if (response.status === 429) {
        console.warn(`[${site}] rate-limited (429) for query="${query}"`);
        return [];
      }

      if (!response.ok) {
        console.error(`[${site}] search failed: ${String(response.status)} for query="${query}"`);
        return [];
      }

      let body: SeResponse;
      try {
        body = (await response.json()) as SeResponse;
      } catch (err) {
        console.error(`[${site}] failed to parse response: ${String(err)}`);
        return [];
      }

      const results: DiscoveryResult[] = [];
      for (const item of (body.items ?? []).slice(0, limit)) {
        results.push({
          url: `${baseUrl}/questions/${String(item.question_id)}`,
          title: decodeHtmlEntities(item.title ?? ""),
          snippet: stripHtml(decodeHtmlEntities(item.body ?? "")).slice(0, 300),
        });
      }

      log(`[${site}] parsed ${String(results.length)} questions for query="${query}"`);
      return results;
    },
  };
}

/** General programming Q&A — good for dev-tool discovery. */
export const stackOverflowSource = createStackExchangeSource(
  "stackoverflow",
  "https://stackoverflow.com",
);

/**
 * Software Recommendations Stack Exchange — the highest-intent source.
 * Every question is literally asking for a tool recommendation by definition.
 */
export const softwareRecsSource = createStackExchangeSource(
  "softwarerecs",
  "https://softwarerecs.stackexchange.com",
);
