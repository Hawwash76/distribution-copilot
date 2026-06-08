import { type OpportunitySource } from "@distribution-copilot/shared";

/**
 * Normalised shape of a post returned by any source connector.
 * Downstream stages (repository, scoring) program against this — not raw API responses.
 */
export interface RawPost {
  externalId: string;
  title: string;
  body: string | null;
  url: string;
  author: string;
  score: number;
  commentCount: number;
  publishedAt: Date;
  communityExternalId: string;
}

/** Normalised community/subreddit shape. */
export interface RawCommunity {
  externalId: string;
  name: string;
  description: string | null;
  subscriberCount: number | null;
}

export interface SearchOptions {
  /** Maximum posts to return per keyword. Defaults to 25. */
  limit?: number;
  /** Restrict search to these community IDs (e.g. subreddit names). */
  subreddits?: string[];
}

/**
 * Source connector — the extension point for adding new platforms.
 * Each platform (Reddit, Hacker News, X, …) implements this interface.
 * The discovery processor only knows this interface, not the vendor.
 */
export interface SourceConnector {
  readonly source: OpportunitySource;
  search(keywords: string[], options?: SearchOptions): Promise<RawPost[]>;
  fetchCommunity(externalId: string): Promise<RawCommunity | null>;
}
