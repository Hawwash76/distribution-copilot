import {
  type RateLimitState,
  type RedditListing,
  type RedditSubredditResponse,
} from "./reddit.types.js";

const PUBLIC_BASE = "https://www.reddit.com";
const OAUTH_BASE = "https://oauth.reddit.com";

/** Minimum ms to wait between requests when no rate-limit headers are present. */
const MIN_REQUEST_INTERVAL_MS = 1_100;

/** How many times to retry on transient errors before giving up. */
const MAX_RETRIES = 3;

export interface RedditClientConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent: string;
}

/**
 * Thin HTTP client for the Reddit JSON API.
 *
 * - Uses public endpoints (no auth) when credentials are absent.
 * - Respects x-ratelimit-* response headers and backs off automatically.
 * - Retries up to MAX_RETRIES times on 429 and 5xx responses with exponential backoff.
 */
export class RedditClient {
  private readonly userAgent: string;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private lastRequestAt = 0;
  private rateLimitRemaining = Infinity;
  private rateLimitResetAt = 0;

  constructor(config: RedditClientConfig) {
    this.userAgent = config.userAgent;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private get isAuthenticated(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private async acquireToken(): Promise<void> {
    if (!this.clientId || !this.clientSecret) return;
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "User-Agent": this.userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Reddit OAuth failed: ${String(response.status)}`);
    }

    const body = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = body.access_token;
    this.tokenExpiresAt = Date.now() + body.expires_in * 1_000;
  }

  private parseRateLimitHeaders(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    if (remaining !== null) this.rateLimitRemaining = parseFloat(remaining);
    if (reset !== null) this.rateLimitResetAt = Date.now() + parseFloat(reset) * 1_000;
  }

  private async throttle(): Promise<void> {
    // If rate limit is nearly exhausted, wait until the window resets.
    if (this.rateLimitRemaining <= 2 && this.rateLimitResetAt > Date.now()) {
      const waitMs = this.rateLimitResetAt - Date.now() + 500;
      await sleep(waitMs);
      return;
    }

    // Otherwise enforce a minimum gap between requests.
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
  }

  async get<T>(path: string): Promise<T> {
    await this.throttle();

    if (this.isAuthenticated) await this.acquireToken();

    const base = this.isAuthenticated ? OAUTH_BASE : PUBLIC_BASE;
    const url = `${base}${path}`;

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      this.lastRequestAt = Date.now();

      const headers: Record<string, string> = { "User-Agent": this.userAgent };
      if (this.accessToken) headers["Authorization"] = `Bearer ${this.accessToken}`;

      const response = await fetch(url, { headers });
      this.parseRateLimitHeaders(response.headers);

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter ? parseFloat(retryAfter) * 1_000 : 60_000;
        await sleep(waitMs);
        attempt++;
        continue;
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(Math.pow(2, attempt) * 1_000);
        attempt++;
        continue;
      }

      if (response.status === 404) return null as T;

      throw new Error(`Reddit API ${String(response.status)}: ${path}`);
    }

    throw new Error(`Reddit API: exceeded retries for ${path}`);
  }

  async searchPosts(query: string, limit = 25): Promise<RedditListing> {
    const params = new URLSearchParams({
      q: query,
      sort: "new",
      type: "link",
      limit: String(limit),
      raw_json: "1",
    });
    return this.get<RedditListing>(`/search.json?${params.toString()}`);
  }

  async searchSubreddit(subreddit: string, query: string, limit = 25): Promise<RedditListing> {
    const params = new URLSearchParams({
      q: query,
      sort: "new",
      restrict_sr: "1",
      limit: String(limit),
      raw_json: "1",
    });
    return this.get<RedditListing>(`/r/${subreddit}/search.json?${params.toString()}`);
  }

  async fetchSubreddit(subreddit: string): Promise<RedditSubredditResponse | null> {
    return this.get<RedditSubredditResponse | null>(`/r/${subreddit}/about.json`);
  }

  getRateLimitState(): RateLimitState {
    return {
      remaining: this.rateLimitRemaining,
      resetInSeconds: Math.max(0, (this.rateLimitResetAt - Date.now()) / 1_000),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
