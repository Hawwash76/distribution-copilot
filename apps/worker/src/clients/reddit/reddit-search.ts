import type { DiscoveryResult, DiscoverySource } from "../discovery-source.js";

const REDDIT_RSS_URL = "https://www.reddit.com/search.rss";
const USER_AGENT = "DistributionCopilot/1.0 (non-commercial; discovery)";

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
): { title: string; url: string; snippet: string }[] {
  const rawEntries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  log(`[reddit] raw <entry> blocks found: ${String(rawEntries.length)}`);

  const results: { title: string; url: string; snippet: string }[] = [];

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

    results.push({ title, url, snippet });
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
 * Discovery source backed by Reddit's public Atom search feed.
 *
 * No credentials required. Identifies posts by t3 prefix in the Atom entry ID,
 * then builds the Reddit discussion URL from the subreddit name + post base36 ID.
 * This handles both self posts (link already a Reddit URL) and link posts
 * (link points to an external URL — URL is reconstructed).
 */
export const redditSource: DiscoverySource = {
  name: "reddit",

  async search(
    query: string,
    limit: number,
    log: (msg: string) => void = console.log,
  ): Promise<DiscoveryResult[]> {
    const params = new URLSearchParams({
      q: query,
      sort: "new",
      t: "year",
      limit: String(Math.min(limit, 25)),
      type: "link", // submissions only — excludes subreddit and user results
    });

    const url = `${REDDIT_RSS_URL}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error(`[reddit] network error for query="${query}": ${String(err)}`);
      return [];
    }

    if (response.status === 429) {
      console.warn(`[reddit] rate-limited (429) for query="${query}"`);
      return [];
    }

    if (!response.ok) {
      console.error(`[reddit] RSS feed failed: ${String(response.status)} for query="${query}"`);
      return [];
    }

    let xml: string;
    try {
      xml = await response.text();
    } catch (err) {
      console.error(`[reddit] failed to read response for query="${query}": ${String(err)}`);
      return [];
    }

    const entries = parseAtomEntries(xml, log);
    log(`[reddit] parsed ${String(entries.length)} post URLs from feed for query="${query}"`);
    return entries.map((e) => ({ url: e.url, title: e.title, snippet: e.snippet }));
  },
};
