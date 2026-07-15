import type {
  DiscoveryResult,
  DiscoverySearchOptions,
  DiscoverySource,
} from "../discovery-source.js";

const REDDIT_RSS_URL = "https://www.reddit.com/search.rss";

// Reddit requires a descriptive user-agent and is more permissive when
// the request looks like a browser visiting the site.
const USER_AGENT =
  "Mozilla/5.0 (compatible; DistributionCopilot/1.0; +https://distributioncop.com)";

const REQUEST_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

/** How long to wait after a 429 before retrying (used if Retry-After header is absent). */
const DEFAULT_RETRY_AFTER_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse Reddit Atom entries from raw XML.
 *
 * Reddit's Atom feed mixes entry types. Each entry carries an <id> prefix:
 *   t3 = post/submission  ← what we want
 *   t5 = subreddit        ← skip
 *
 * For self posts the <link href> is the Reddit discussion URL.
 * For link posts the <link href> is the external URL — we reconstruct the
 * Reddit discussion URL from <category term="subreddit"> + the t3 base36 ID.
 */
function parseAtomEntries(
  xml: string,
  log: (msg: string) => void,
): { title: string; url: string; snippet: string; publishedAt?: string; author?: string }[] {
  const rawEntries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  log(`[reddit] raw <entry> blocks found: ${String(rawEntries.length)}`);

  const results: {
    title: string;
    url: string;
    snippet: string;
    publishedAt?: string;
    author?: string;
  }[] = [];

  for (const entry of rawEntries) {
    // Reddit Atom ID format: t{kind}_{base36id}
    // t3 = submission (post), t5 = subreddit — skip everything else.
    const idMatch = /<id>t(\d)_([a-z0-9]+)<\/id>/i.exec(entry);
    const kind = idMatch?.[1];
    const postId = idMatch?.[2];

    if (kind !== "3" || !postId) continue;

    const rawTitle =
      /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(entry)?.[1]?.trim() ?? "";
    const title = decodeXmlEntities(rawTitle);

    // The <link href> for self posts is the Reddit discussion URL.
    // For link posts it is the external URL the post links to.
    // In both cases we can use <category term="subreddit"> + postId to build
    // the canonical Reddit discussion URL.
    const subreddit =
      /<category[^>]+term="([^"]+)"/.exec(entry)?.[1] ??
      /<category[^>]+term='([^']+)'/.exec(entry)?.[1];

    const linkHref = /href="([^"]+)"/.exec(entry)?.[1] ?? "";

    let url: string;
    if (linkHref.includes("/comments/")) {
      // Self post — <link href> is already the Reddit discussion permalink.
      url = linkHref.replace(/\/$/, "");
    } else if (subreddit) {
      // Link post — reconstruct the Reddit discussion URL.
      url = `https://www.reddit.com/r/${subreddit}/comments/${postId}`;
    } else {
      log(`[reddit] skipped t3 entry (no subreddit found; title="${title.slice(0, 40)}")`);
      continue;
    }

    const rawContent =
      /<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i.exec(entry)?.[1] ?? "";
    const snippet = stripHtml(decodeXmlEntities(rawContent)).slice(0, 300);

    const publishedRaw = /<published>([\s\S]*?)<\/published>/i.exec(entry)?.[1]?.trim();
    const publishedAt = publishedRaw && !isNaN(Date.parse(publishedRaw)) ? publishedRaw : undefined;

    // Reddit Atom entries include <author><name>/u/username</name></author>.
    const rawAuthorName = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i.exec(entry)?.[1]?.trim();
    const author = rawAuthorName ? rawAuthorName.replace(/^\/u\//i, "") : undefined;

    results.push({ title, url, snippet, publishedAt, author });
  }

  return results;
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
 * Maps a since date to the nearest Reddit time-bucket parameter.
 * Reddit only supports coarse buckets; we pick the tightest one that covers
 * the requested window so we don't miss posts near the boundary.
 */
function toRedditTimeBucket(since?: Date): string {
  if (!since) return "year";
  const ageDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "week";
  if (ageDays <= 31) return "month";
  return "year";
}

/**
 * Discovery source backed by Reddit's public Atom search feed.
 *
 * No credentials required. Identifies posts by t3 prefix in the Atom entry ID,
 * then builds the Reddit discussion URL from the subreddit name + post base36 ID.
 * This handles both self posts (link already a Reddit URL) and link posts
 * (link points to an external URL — URL is reconstructed).
 *
 * Always sorts by "relevance" and always applies a time bucket (week/month/year,
 * the nearest one covering `options.since`, or "year" when since is omitted)
 * — every caller (one-shot discovery, manual "Run Discovery", the recurring
 * monitor sweep) gets identical, predictable search behavior: the best-matching
 * posts *within* the time window, rather than a pure chronological feed (which
 * has no relevance weighting at all) or relevance with no time bound (which
 * ranks across Reddit's entire history and was the main source of wildly
 * off-topic results). Exact epoch filtering is not supported by the Reddit
 * RSS API — only the coarse bucket.
 *
 * Multi-word queries are phrase-quoted (`"exact phrase"`) rather than sent as
 * bare space-separated words. Reddit's search treats an unquoted multi-word
 * query as effectively an OR across the individual words — e.g. "email
 * sequence software" would match anything containing just "email" or just
 * "software" — which floods results with noise dominated by whichever word is
 * most common. Quoting scopes the match to the phrase (or very close
 * variants); paraphrases are still caught downstream by the isRelevant()
 * word-overlap pre-filter, so this doesn't meaningfully cost recall.
 */
export const redditSource: DiscoverySource = {
  name: "reddit",

  async search(
    query: string,
    limit: number,
    options?: DiscoverySearchOptions,
    log: (msg: string) => void = console.log,
  ): Promise<DiscoveryResult[]> {
    const trimmedQuery = query.trim();
    const searchQuery = trimmedQuery.includes(" ") ? `"${trimmedQuery}"` : trimmedQuery;

    const params = new URLSearchParams({
      q: searchQuery,
      sort: "relevance",
      limit: String(Math.min(limit, 25)),
      type: "link", // submissions only — excludes subreddit and user results
      t: toRedditTimeBucket(options?.since),
    });

    const feedUrl = `${REDDIT_RSS_URL}?${params.toString()}`;
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(feedUrl, {
          headers: REQUEST_HEADERS,
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        console.error(`[reddit] network error for query="${query}": ${String(err)}`);
        return [];
      }

      if (response.status === 429) {
        const retryAfterSec = parseInt(response.headers.get("retry-after") ?? "0", 10);
        const waitMs = retryAfterSec > 0 ? retryAfterSec * 1_000 : DEFAULT_RETRY_AFTER_MS;
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `[reddit] rate-limited (429) for query="${query}" — waiting ${String(waitMs / 1_000)}s before retry ${String(attempt + 1)}/${String(MAX_ATTEMPTS)}`,
          );
          await sleep(waitMs);
          continue;
        }
        console.warn(
          `[reddit] rate-limited (429) for query="${query}" — giving up after ${String(MAX_ATTEMPTS)} attempts`,
        );
        return [];
      }

      if (!response.ok) {
        console.error(
          `[reddit] RSS feed returned ${String(response.status)} for query="${query}"${attempt < MAX_ATTEMPTS ? ` — retrying (${String(attempt + 1)}/${String(MAX_ATTEMPTS)})` : " — giving up"}`,
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
        console.error(`[reddit] failed to read response for query="${query}": ${String(err)}`);
        return [];
      }

      // Reddit sometimes returns an HTML page (captcha / login redirect) instead
      // of XML when it wants to challenge the client. Detect and skip.
      if (!xml.trimStart().startsWith("<")) {
        console.warn(`[reddit] non-XML response for query="${query}" — skipping`);
        return [];
      }

      const entries = parseAtomEntries(xml, log);
      log(`[reddit] parsed ${String(entries.length)} post URLs from feed for query="${query}"`);
      return entries.map((e) => ({
        url: e.url,
        title: e.title,
        snippet: e.snippet,
        publishedAt: e.publishedAt,
        author: e.author,
      }));
    }

    return [];
  },
};
