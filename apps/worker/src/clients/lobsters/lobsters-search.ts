import type {
  DiscoveryResult,
  DiscoverySearchOptions,
  DiscoverySource,
} from "../discovery-source.js";

const LOBSTERS_SEARCH_URL = "https://lobste.rs/search";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

/** How long to wait after a 429 before retrying (used if Retry-After header is absent). */
const DEFAULT_RETRY_AFTER_MS = 10_000;

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse RSS items from a Lobsters search feed.
 *
 * The <link> element in Lobsters RSS points to the *submitted external URL*
 * for link stories, so we use <comments> instead — that always points to the
 * Lobsters discussion page (lobste.rs/s/{id}/…) which the extractor can fetch
 * as JSON by appending .json to the short-id path.
 */
function parseLobstersRss(
  xml: string,
  limit: number,
  log: (msg: string) => void,
): DiscoveryResult[] {
  const rawItems = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  log(`[lobsters] raw <item> blocks found: ${String(rawItems.length)}`);

  const results: DiscoveryResult[] = [];

  for (const item of rawItems.slice(0, limit)) {
    const rawTitle =
      /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(item)?.[1]?.trim() ?? "";
    const title = decodeXmlEntities(rawTitle);

    // Use <comments> (the Lobsters discussion page) so the extractor can
    // fetch the structured JSON; <link> may be an external URL.
    const commentsUrl = /<comments>([\s\S]*?)<\/comments>/i.exec(item)?.[1]?.trim() ?? "";

    if (!commentsUrl || !commentsUrl.includes("lobste.rs/s/")) continue;

    const rawDesc =
      /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(item)?.[1] ?? "";
    const snippet = stripHtml(decodeXmlEntities(rawDesc)).slice(0, 300);

    const pubDateRaw = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(item)?.[1]?.trim();
    const publishedAt =
      pubDateRaw && !isNaN(Date.parse(pubDateRaw)) ? new Date(pubDateRaw).toISOString() : undefined;

    const rawAuthor =
      /<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i.exec(item)?.[1]?.trim() ??
      /<author>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/author>/i.exec(item)?.[1]?.trim();
    const author = rawAuthor ? decodeXmlEntities(rawAuthor) : undefined;

    results.push({ url: commentsUrl, title, snippet, publishedAt, author });
  }

  return results;
}

/**
 * Discovery source backed by Lobsters' RSS search feed.
 *
 * No credentials required. Lobsters is a curated tech link aggregator with a
 * different community overlap from HN — running both in parallel increases
 * coverage without duplication (Discussion is unique on url).
 *
 * The Lobsters RSS API does not support date filtering. options.since is accepted
 * but ignored — order=newest ensures we get the latest results, and the extract
 * pipeline's upsert deduplication prevents re-processing already-seen URLs.
 */
export const lobstersSource: DiscoverySource = {
  name: "lobsters",

  async search(
    query: string,
    limit: number,
    _options?: DiscoverySearchOptions,
    log: (msg: string) => void = console.log,
  ): Promise<DiscoveryResult[]> {
    const params = new URLSearchParams({
      q: query,
      what: "stories",
      order: "newest",
      format: "rss",
    });

    const feedUrl = `${LOBSTERS_SEARCH_URL}?${params.toString()}`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(feedUrl, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        console.error(`[lobsters] network error for query="${query}": ${String(err)}`);
        return [];
      }

      if (response.status === 429) {
        const retryAfterSec = parseInt(response.headers.get("retry-after") ?? "0", 10);
        const waitMs = retryAfterSec > 0 ? retryAfterSec * 1_000 : DEFAULT_RETRY_AFTER_MS;
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `[lobsters] rate-limited (429) for query="${query}" — waiting ${String(waitMs / 1_000)}s before retry ${String(attempt + 1)}/${String(MAX_ATTEMPTS)}`,
          );
          await sleep(waitMs);
          continue;
        }
        console.warn(
          `[lobsters] rate-limited (429) for query="${query}" — giving up after ${String(MAX_ATTEMPTS)} attempts`,
        );
        return [];
      }

      if (!response.ok) {
        console.error(
          `[lobsters] search failed: ${String(response.status)} for query="${query}"${attempt < MAX_ATTEMPTS ? ` — retrying (${String(attempt + 1)}/${String(MAX_ATTEMPTS)})` : " — giving up"}`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(2_000);
          continue;
        }
        return [];
      }

      let xml: string;
      try {
        xml = await response.text();
      } catch (err) {
        console.error(`[lobsters] failed to read response for query="${query}": ${String(err)}`);
        return [];
      }

      const results = parseLobstersRss(xml, limit, log);
      log(`[lobsters] parsed ${String(results.length)} stories for query="${query}"`);
      return results;
    }

    return [];
  },
};
