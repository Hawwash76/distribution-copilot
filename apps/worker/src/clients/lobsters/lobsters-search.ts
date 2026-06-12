import type {
  DiscoveryResult,
  DiscoverySearchOptions,
  DiscoverySource,
} from "../discovery-source.js";

const LOBSTERS_SEARCH_URL = "https://lobste.rs/search";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

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

    results.push({ url: commentsUrl, title, snippet });
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

    let response: Response;
    try {
      response = await fetch(`${LOBSTERS_SEARCH_URL}?${params.toString()}`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error(`[lobsters] network error for query="${query}": ${String(err)}`);
      return [];
    }

    if (response.status === 429) {
      console.warn(`[lobsters] rate-limited (429) for query="${query}"`);
      return [];
    }

    if (!response.ok) {
      console.error(`[lobsters] search failed: ${String(response.status)} for query="${query}"`);
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
  },
};
