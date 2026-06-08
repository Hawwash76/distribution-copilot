/** Raw shapes returned by the Reddit JSON API — internal to the Reddit connector. */

export interface RedditPost {
  id: string;
  name: string; // e.g. "t3_abc123"
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  is_self: boolean; // true = text post, false = link post
}

export interface RedditListing {
  data: {
    children: { data: RedditPost }[];
    after: string | null;
  };
}

export interface RedditSubreddit {
  id: string;
  display_name: string;
  title: string;
  public_description: string;
  subscribers: number;
}

export interface RedditSubredditResponse {
  data: RedditSubreddit;
}

/** Rate-limit state parsed from Reddit API response headers. */
export interface RateLimitState {
  remaining: number;
  resetInSeconds: number;
}
