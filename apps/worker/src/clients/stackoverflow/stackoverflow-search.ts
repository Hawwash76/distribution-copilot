import type {
  DiscoveryResult,
  DiscoverySearchOptions,
  DiscoverySource,
} from "../discovery-source.js";

const SE_API_URL = "https://api.stackexchange.com/2.3/search/advanced";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

/** How long to wait after a 429 before retrying (used if Retry-After header is absent). */
const DEFAULT_RETRY_AFTER_MS = 10_000;

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  creation_date?: number;
  owner?: { display_name?: string };
}

interface SeResponse {
  items?: SeItem[];
}

/** Fallback cutoff when no since date is provided: 24 months back. */
const DEFAULT_MAX_AGE_MONTHS = 24;

/**
 * Factory producing a DiscoverySource backed by the Stack Exchange search API.
 *
 * Free tier: 300 requests/day without a key, 10 000/day with a free app key
 * (STACK_EXCHANGE_KEY env var). Supports both stackoverflow.com and
 * softwarerecs.stackexchange.com — the latter is particularly high-signal
 * because every question explicitly asks for a tool recommendation.
 *
 * When options.since is provided it is passed as fromdate for precise server-side
 * filtering; otherwise falls back to the default 24-month window.
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
      options?: DiscoverySearchOptions,
      log: (msg: string) => void = console.log,
    ): Promise<DiscoveryResult[]> {
      const cutoffEpoch = options?.since
        ? Math.floor(options.since.getTime() / 1000)
        : Math.floor((Date.now() - DEFAULT_MAX_AGE_MONTHS * 30 * 24 * 60 * 60 * 1000) / 1000);

      const params = new URLSearchParams({
        q: query,
        site,
        sort: "activity",
        order: "desc",
        filter: "withbody",
        pagesize: String(Math.min(limit, 30)),
        fromdate: String(cutoffEpoch),
      });

      const apiKey = process.env["STACK_EXCHANGE_KEY"];
      if (apiKey) params.set("key", apiKey);

      const feedUrl = `${SE_API_URL}?${params.toString()}`;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let response: Response;
        try {
          response = await fetch(feedUrl, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(15_000),
          });
        } catch (err) {
          console.error(`[${site}] network error for query="${query}": ${String(err)}`);
          return [];
        }

        if (response.status === 429) {
          const retryAfterSec = parseInt(response.headers.get("retry-after") ?? "0", 10);
          const waitMs = retryAfterSec > 0 ? retryAfterSec * 1_000 : DEFAULT_RETRY_AFTER_MS;
          if (attempt < MAX_ATTEMPTS) {
            console.warn(
              `[${site}] rate-limited (429) for query="${query}" — waiting ${String(waitMs / 1_000)}s before retry ${String(attempt + 1)}/${String(MAX_ATTEMPTS)}`,
            );
            await sleep(waitMs);
            continue;
          }
          console.warn(
            `[${site}] rate-limited (429) for query="${query}" — giving up after ${String(MAX_ATTEMPTS)} attempts`,
          );
          return [];
        }

        if (!response.ok) {
          console.error(
            `[${site}] search failed: ${String(response.status)} for query="${query}"${attempt < MAX_ATTEMPTS ? ` — retrying (${String(attempt + 1)}/${String(MAX_ATTEMPTS)})` : " — giving up"}`,
          );
          if (attempt < MAX_ATTEMPTS) {
            await sleep(2_000);
            continue;
          }
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
          const publishedAt =
            item.creation_date != null
              ? new Date(item.creation_date * 1000).toISOString()
              : undefined;
          results.push({
            url: `${baseUrl}/questions/${String(item.question_id)}`,
            title: decodeHtmlEntities(item.title ?? ""),
            snippet: stripHtml(decodeHtmlEntities(item.body ?? "")).slice(0, 300),
            publishedAt,
            author: item.owner?.display_name ?? undefined,
          });
        }

        log(`[${site}] parsed ${String(results.length)} questions for query="${query}"`);
        return results;
      }

      return [];
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
