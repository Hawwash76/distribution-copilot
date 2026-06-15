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
 * Thrown by platform extractors when the platform rate-limits us (429) or
 * returns a 5xx. Propagates through extractContent so BullMQ can retry the
 * whole job with exponential backoff instead of silently falling back to "web".
 */
class RetryableExtractError extends Error {
  constructor(
    public readonly platform: string,
    public readonly status: number,
    url: string,
  ) {
    super(`[extract] ${platform} returned ${String(status)} for ${url} — will retry`);
    this.name = "RetryableExtractError";
  }
}

/**
 * Extracts structured content from a URL.
 *
 * Returns null when content fails a quality gate (deleted/removed Reddit post,
 * NSFW, locked thread, heavily downvoted, link post with no discussion, etc.)
 * so the pipeline can skip creating an Opportunity entirely.
 *
 * Dispatches to platform-specific handlers:
 *   reddit.com          → Reddit public JSON API (no auth required)
 *   news.ycombinator.com → Algolia HN Search API
 *   stackoverflow.com / stackexchange.com → Stack Exchange API
 *   lobste.rs           → Lobsters JSON story API
 *   dev.to              → DEV.to articles API
 *   everything else     → uses the SERP fallback (title + snippet) as content
 *
 * Throws RetryableExtractError on 429/5xx so BullMQ can back off and retry.
 * Falls back to source="web" on any other non-fatal extraction failure.
 */
export async function extractContent(
  url: string,
  fallback: { title: string; snippet: string; publishedAt?: string; author?: string },
): Promise<ExtractedContent | null> {
  try {
    if (isRedditUrl(url)) return await extractReddit(url, fallback);
    if (isHnUrl(url)) return await extractHackerNews(url, fallback);
    if (isStackExchangeUrl(url)) return await extractStackExchange(url, fallback);
    if (isLobstersUrl(url)) return await extractLobsters(url, fallback);
    if (isDevToUrl(url)) return await extractDevTo(url, fallback);
  } catch (err) {
    // Re-throw retryable errors (429/5xx) so BullMQ backs off and retries.
    if (err instanceof RetryableExtractError) throw err;
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

/**
 * Quality gate for Reddit posts. Returns a reason string when the post should
 * be skipped, null when it passes.
 *
 * Checks (in order):
 *  - Deleted or mod-removed text
 *  - Deleted author account
 *  - NSFW content
 *  - Locked thread (can't be engaged with)
 *  - Net-negative score (community rejected it)
 *  - Link post with fewer than 3 comments (link with no discussion)
 *  - Title too short to be a real discussion
 */
function redditQualityFailReason(post: RedditPost): string | null {
  if (post.selftext === "[deleted]" || post.selftext === "[removed]") return "deleted/removed";
  if (post.author === "[deleted]") return "deleted author";
  if (post.over_18) return "nsfw";
  if (post.locked) return "locked";
  if ((post.score ?? 1) < -1) return `score=${String(post.score)}`;
  if (!post.is_self && (post.num_comments ?? 0) < 3) return "link post with no discussion";
  if (!post.title || post.title.trim().length < 15) return "title too short";
  return null;
}

async function extractReddit(
  url: string,
  fallback: { title: string; snippet: string; publishedAt?: string; author?: string },
): Promise<ExtractedContent | null> {
  const cleanUrl = url.split("?")[0]?.split("#")[0] ?? url;
  const jsonUrl = cleanUrl.endsWith("/") ? `${cleanUrl}.json` : `${cleanUrl}.json`;

  const response = await fetch(jsonUrl, {
    headers: { "User-Agent": "DistributionCopilot/1.0 (content extractor; non-commercial)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    // 429 or 5xx: throw so BullMQ retries with backoff.
    if (response.status === 429 || response.status >= 500) {
      throw new RetryableExtractError("reddit", response.status, url);
    }
    // 403/404/other: we know it's a Reddit URL so attribute it correctly.
    console.warn(`[extract] reddit ${String(response.status)} for ${url} — using RSS fallback`);
    return redditFallback(url, fallback);
  }

  let data: RedditJsonResponse;
  try {
    data = (await response.json()) as RedditJsonResponse;
  } catch {
    // Reddit returned 200 but non-JSON (e.g. HTML login/captcha page).
    console.warn(`[extract] reddit returned non-JSON for ${url} — using RSS fallback`);
    return redditFallback(url, fallback);
  }

  const post = data?.[0]?.data?.children?.[0]?.data;

  if (!post) {
    console.warn(`[extract] reddit response had no post data for ${url} — using RSS fallback`);
    return redditFallback(url, fallback);
  }

  const failReason = redditQualityFailReason(post);
  if (failReason) {
    console.log(`[extract] reddit quality gate: skipped (${failReason}) url=${url}`);
    return null;
  }

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

  if (!itemId) return genericFallback(url, fallback);

  const response = await fetch(`https://hn.algolia.com/api/v1/items/${itemId}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return genericFallback(url, fallback);

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
// Stack Exchange (stackoverflow.com + softwarerecs.stackexchange.com)
// ---------------------------------------------------------------------------

function isStackExchangeUrl(url: string): boolean {
  return /(?:stackoverflow\.com|stackexchange\.com)\/questions\/(\d+)/.test(url);
}

async function extractStackExchange(
  url: string,
  fallback: { title: string; snippet: string },
): Promise<ExtractedContent> {
  const idMatch = /\/questions\/(\d+)/.exec(url);
  const questionId = idMatch?.[1];
  if (!questionId) return genericFallback(url, fallback);

  const site = url.includes("softwarerecs") ? "softwarerecs" : "stackoverflow";
  const apiKey = process.env["STACK_EXCHANGE_KEY"];
  const params = new URLSearchParams({
    site,
    filter: "withbody",
    ...(apiKey ? { key: apiKey } : {}),
  });

  const response = await fetch(
    `https://api.stackexchange.com/2.3/questions/${questionId}?${params.toString()}`,
    { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );

  if (!response.ok) return genericFallback(url, fallback);

  const data = (await response.json()) as SeItemResponse;
  const item = data.items?.[0];
  if (!item) return genericFallback(url, fallback);

  return {
    title: decodeHtmlEntities(item.title ?? fallback.title),
    body: item.body ? stripHtml(decodeHtmlEntities(item.body)) : null,
    author: item.owner?.display_name ?? null,
    publishedAt: item.creation_date ? new Date(item.creation_date * 1_000) : null,
    platformScore: item.score ?? null,
    commentCount: item.answer_count ?? null,
    source: "stackoverflow",
    externalId: String(questionId),
    communityExternalId: null,
  };
}

// ---------------------------------------------------------------------------
// Lobsters
// ---------------------------------------------------------------------------

function isLobstersUrl(url: string): boolean {
  return /lobste\.rs\/s\/[a-z0-9]+/.test(url);
}

async function extractLobsters(
  url: string,
  fallback: { title: string; snippet: string },
): Promise<ExtractedContent> {
  // Extract the short_id from the path: /s/{short_id}[/{slug}]
  const idMatch = /\/s\/([a-z0-9]+)/i.exec(url);
  const shortId = idMatch?.[1];
  if (!shortId) return genericFallback(url, fallback);

  const response = await fetch(`https://lobste.rs/s/${shortId}.json`, {
    headers: { "User-Agent": "DistributionCopilot/1.0 (non-commercial)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return genericFallback(url, fallback);

  const data = (await response.json()) as LobstersStory;

  return {
    title: data.title ?? fallback.title,
    body: data.description_plain ?? (data.description ? stripHtml(data.description) : null),
    author: data.submitter_user?.username ?? null,
    publishedAt: data.created_at ? new Date(data.created_at) : null,
    platformScore: data.score ?? null,
    commentCount: data.comment_count ?? null,
    source: "lobsters",
    externalId: data.short_id ?? shortId,
    communityExternalId: null,
  };
}

// ---------------------------------------------------------------------------
// DEV.to
// ---------------------------------------------------------------------------

function isDevToUrl(url: string): boolean {
  return /dev\.to\/[^/]+\/[^/]+/.test(url);
}

async function extractDevTo(
  url: string,
  fallback: { title: string; snippet: string },
): Promise<ExtractedContent> {
  // URL: https://dev.to/{username}/{slug}
  // API: https://dev.to/api/articles/{username}/{slug}
  const pathMatch = /dev\.to\/([^/]+\/[^/?#]+)/.exec(url);
  const articlePath = pathMatch?.[1];
  if (!articlePath) return genericFallback(url, fallback);

  const headers: Record<string, string> = {
    "User-Agent": "DistributionCopilot/1.0 (non-commercial)",
  };
  const apiKey = process.env["DEVTO_API_KEY"];
  if (apiKey) headers["api-key"] = apiKey;

  const response = await fetch(`https://dev.to/api/articles/${articlePath}`, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return genericFallback(url, fallback);

  const data = (await response.json()) as DevToArticle;

  return {
    title: data.title ?? fallback.title,
    body: data.body_markdown ?? data.description ?? null,
    author: data.user?.name ?? data.user?.username ?? null,
    publishedAt: data.published_at ? new Date(data.published_at) : null,
    platformScore: data.positive_reactions_count ?? null,
    commentCount: data.comments_count ?? null,
    source: "devto",
    externalId: data.id ? String(data.id) : null,
    communityExternalId: null,
  };
}

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

/**
 * Reddit-attributed fallback used when the JSON API fails but we already know
 * the URL is a Reddit post. Preserves source="reddit", subreddit, publish date,
 * and author from the RSS Atom feed so the opportunity isn't mislabelled as "web".
 * Score/upvotes are not available in the RSS feed — they remain null.
 */
function redditFallback(
  url: string,
  fallback: { title: string; snippet: string; publishedAt?: string; author?: string },
): ExtractedContent {
  const subredditMatch = /\/r\/([^/]+)\//.exec(url);
  const idMatch = /\/comments\/([a-z0-9]+)/i.exec(url);
  return {
    title: fallback.title,
    body: fallback.snippet || null,
    author: fallback.author ?? null,
    publishedAt: fallback.publishedAt ? new Date(fallback.publishedAt) : null,
    platformScore: null,
    commentCount: null,
    source: "reddit",
    externalId: idMatch?.[1] ?? null,
    communityExternalId: subredditMatch?.[1] ?? null,
  };
}

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
// Shared HTML helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Minimal response-shape types (only the fields we use)
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
  over_18?: boolean;
  locked?: boolean;
}

type RedditJsonResponse = { data?: { children?: { data?: RedditPost }[] } }[];

interface HnAlgoliaItem {
  title?: string;
  text?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
}

interface SeItem {
  question_id?: number;
  title?: string;
  body?: string;
  score?: number;
  answer_count?: number;
  creation_date?: number;
  owner?: { display_name?: string };
}

interface SeItemResponse {
  items?: SeItem[];
}

interface LobstersStory {
  short_id?: string;
  title?: string;
  description?: string;
  description_plain?: string;
  score?: number;
  comment_count?: number;
  created_at?: string;
  submitter_user?: { username?: string };
}

interface DevToArticle {
  id?: number;
  title?: string;
  description?: string;
  body_markdown?: string;
  positive_reactions_count?: number;
  comments_count?: number;
  published_at?: string;
  user?: { name?: string; username?: string };
}
