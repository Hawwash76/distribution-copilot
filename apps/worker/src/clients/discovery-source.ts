/** A single candidate discussion URL returned by a discovery source. */
export interface DiscoveryResult {
  url: string;
  title: string;
  snippet: string;
  /** ISO-8601 string when the source can provide a publish date (e.g. Reddit Atom feed). */
  publishedAt?: string;
  /** Author username when the source provides it (e.g. Reddit Atom `<author>` tag). */
  author?: string;
}

/** Options accepted by every discovery source's search method. */
export interface DiscoverySearchOptions {
  /**
   * Only return results published on or after this date.
   * Sources that support epoch filtering (HN, StackOverflow) apply it server-side.
   * Sources without date filtering (Lobsters, Dev.to) ignore it — deduplication
   * in the extract pipeline prevents re-processing already-seen URLs.
   */
  since?: Date;
}

/**
 * Common interface for all discussion-discovery sources (Reddit, HN, …).
 *
 * To add a new source: implement this interface and add it to the SOURCES array
 * in discovery.processor.ts. No other changes needed.
 */
export interface DiscoverySource {
  readonly name: string;
  search(
    query: string,
    limit: number,
    options?: DiscoverySearchOptions,
  ): Promise<DiscoveryResult[]>;
}
