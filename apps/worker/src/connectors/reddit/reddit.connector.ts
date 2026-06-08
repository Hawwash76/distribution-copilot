import { RedditClient, type RedditClientConfig } from "./reddit.client.js";
import {
  type RawCommunity,
  type RawPost,
  type SearchOptions,
  type SourceConnector,
} from "../source-connector.js";

/**
 * Reddit implementation of the SourceConnector interface.
 * Maps raw Reddit API responses to the normalised domain shapes expected by
 * the discovery processor.
 */
export class RedditConnector implements SourceConnector {
  readonly source = "reddit" as const;

  private readonly client: RedditClient;

  constructor(config: RedditClientConfig) {
    this.client = new RedditClient(config);
  }

  async search(keywords: string[], options: SearchOptions = {}): Promise<RawPost[]> {
    const { limit = 25, subreddits } = options;
    const posts: RawPost[] = [];
    const seen = new Set<string>();

    for (const keyword of keywords) {
      let listing;

      if (subreddits && subreddits.length > 0) {
        for (const subreddit of subreddits) {
          listing = await this.client.searchSubreddit(subreddit, keyword, limit);
          this.collectPosts(listing, posts, seen);
        }
      } else {
        listing = await this.client.searchPosts(keyword, limit);
        this.collectPosts(listing, posts, seen);
      }
    }

    return posts;
  }

  async fetchCommunity(externalId: string): Promise<RawCommunity | null> {
    const response = await this.client.fetchSubreddit(externalId);
    if (!response?.data) return null;

    const { data } = response;
    return {
      externalId: data.display_name,
      name: data.title || data.display_name,
      description: data.public_description || null,
      subscriberCount: data.subscribers ?? null,
    };
  }

  private collectPosts(
    listing: Awaited<ReturnType<RedditClient["searchPosts"]>>,
    out: RawPost[],
    seen: Set<string>,
  ): void {
    for (const child of listing?.data?.children ?? []) {
      const p = child.data;
      if (seen.has(p.id)) continue;
      seen.add(p.id);

      out.push({
        externalId: p.id,
        title: p.title,
        body: p.is_self && p.selftext ? p.selftext : null,
        url: `https://www.reddit.com${p.permalink}`,
        author: p.author,
        score: p.score,
        commentCount: p.num_comments,
        publishedAt: new Date(p.created_utc * 1_000),
        communityExternalId: p.subreddit,
      });
    }
  }
}

/** Factory that reads credentials from env and returns a configured connector. */
export function createRedditConnector(): RedditConnector {
  return new RedditConnector({
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    userAgent: process.env.REDDIT_USER_AGENT ?? "DistributionCopilot/1.0 (by /u/distcopilot)",
  });
}
