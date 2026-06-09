import { type DiscussionSource } from "@distribution-copilot/shared";

/** The normalised content extracted from a URL. */
export interface ExtractedContent {
  title: string;
  body: string | null;
  author: string | null;
  publishedAt: Date | null;
  platformScore: number | null;
  commentCount: number | null;
  source: DiscussionSource;
  externalId: string | null;
  /** Subreddit name, HN collection, etc. Null for generic web pages. */
  communityExternalId: string | null;
}

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Extracts structured content from a URL.
 *
 * Dispatches to platform-specific handlers:
 *   reddit.com  → Reddit public JSON API (no auth required)
 *   news.ycombinator.com → Algolia HN Search API
 *   everything else → uses the SERP fallback (title + snippet) as content
 *
 * Never throws. On any fetch or parse error, returns the fallback data so the
 * pipeline can continue and at minimum store what the SERP already gave us.
 */
export async function extractContent(
  url: string,
  fallback: { title: string; snippet: string },
): Promise<ExtractedContent> {
  try {
    if (isRedditUrl(url)) {
      return await extractReddit(url, fallback);
    }

    if (isHnUrl(url)) {
      return await extractHackerNews(url, fallback);
    }
  } catch (err) {
    console.warn(`[extract] failed to extract ${url}: ${String(err)}`);
  }

  return genericFallback(url, fallback);
}

// ---------------------------------------------------------------------------
// Reddit
// ---------------------------------------------------------------------------

function isRedditUrl(url: string): boolean {
  return /reddit\.com\/r\/[^/]+\/comments\//.test(url);
}

async function extractReddit(
  url: string,
  fallback: { title: string; snippet: string },
): Promise<ExtractedContent> {
  // Strip query string / fragment then append .json
  const cleanUrl = url.split("?")[0]?.split("#")[0] ?? url;
  const jsonUrl = cleanUrl.endsWith("/") ? `${cleanUrl}.json` : `${cleanUrl}.json`;

  const response = await fetch(jsonUrl, {
    headers: { "User-Agent": "DistributionCopilot/1.0 (content extractor; non-commercial)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return genericFallback(url, fallback);
  }

  const data = (await response.json()) as RedditJsonResponse;
  const post = data?.[0]?.data?.children?.[0]?.data;

  if (!post) {
    return genericFallback(url, fallback);
  }

  // Extract reddit post ID from URL path: /r/sub/comments/<id>/title/
  const idMatch = /\/comments\/([a-z0-9]+)\//i.exec(url);

  return {
    title: post.title ?? fallback.title,
    body: post.is_self && post.selftext ? post.selftext : null,
    author: post.author ?? null,
    publishedAt: post.created_utc ? new Date(post.created_utc * 1_000) : null,
    platformScore: post.score ?? null,
    commentCount: post.num_comments ?? null,
    source: "reddit",
    externalId: post.id ?? idMatch?.[1] ?? null,
    communityExternalId: post.subreddit ?? null,
  };
}

// ---------------------------------------------------------------------------
// Hacker News
// ---------------------------------------------------------------------------

function isHnUrl(url: string): boolean {
  return /news\.ycombinator\.com\/item\?id=/.test(url);
}

async function extractHackerNews(
  url: string,
  fallback: { title: string; snippet: string },
): Promise<ExtractedContent> {
  const idMatch = /\?id=(\d+)/.exec(url);
  const itemId = idMatch?.[1];

  if (!itemId) {
    return genericFallback(url, fallback);
  }

  const response = await fetch(`https://hn.algolia.com/api/v1/items/${itemId}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return genericFallback(url, fallback);
  }

  const data = (await response.json()) as HnAlgoliaItem;

  return {
    title: data.title ?? fallback.title,
    body: data.text ?? fallback.snippet,
    author: data.author ?? null,
    publishedAt: data.created_at ? new Date(data.created_at) : null,
    platformScore: data.points ?? null,
    commentCount: data.num_comments ?? null,
    source: "hackernews",
    externalId: String(itemId),
    communityExternalId: null,
  };
}

// ---------------------------------------------------------------------------
// Generic fallback
// ---------------------------------------------------------------------------

function genericFallback(
  _url: string,
  fallback: { title: string; snippet: string },
): ExtractedContent {
  return {
    title: fallback.title,
    body: fallback.snippet || null,
    author: null,
    publishedAt: null,
    platformScore: null,
    commentCount: null,
    source: "web",
    externalId: null,
    communityExternalId: null,
  };
}

// ---------------------------------------------------------------------------
// Minimal response shape types (only the fields we use)
// ---------------------------------------------------------------------------

interface RedditPost {
  id?: string;
  title?: string;
  selftext?: string;
  is_self?: boolean;
  author?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  subreddit?: string;
}

// Reddit JSON endpoint returns a two-element array: [post listing, comments listing]
type RedditJsonResponse = { data?: { children?: { data?: RedditPost }[] } }[];

interface HnAlgoliaItem {
  title?: string;
  text?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
}
