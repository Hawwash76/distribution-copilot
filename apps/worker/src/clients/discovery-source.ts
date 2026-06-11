/** A single candidate discussion URL returned by a discovery source. */
export interface DiscoveryResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Common interface for all discussion-discovery sources (Reddit, HN, Quora, …).
 *
 * To add a new source: implement this interface and add it to the SOURCES array
 * in discovery.processor.ts. No other changes needed.
 */
export interface DiscoverySource {
  readonly name: string;
  search(query: string, limit: number): Promise<DiscoveryResult[]>;
}
