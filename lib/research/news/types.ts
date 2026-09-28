/**
 * The news collector's source-neutral shapes.
 *
 * Built multi-source from the start by his ruling of 2026-09-28: "collector
 * first, and let's make sure we don't limit it to alpaca, we need as much
 * coverage as possible." Every source is an adapter behind `NewsAdapter`; the
 * collector never names a provider. Alpaca (Benzinga) is the first adapter
 * because it is licensed and its coverage is measured; the next one must not
 * need a rewrite, and must not enter code until Commercial clears its terms.
 */

/**
 * The wire an item ORIGINATED on, when the item says so.
 *
 * An intermediary's `source` field does not carry it: Alpaca labels a
 * GlobeNewswire release `benzinga`. A collector filtering on the field for the
 * wire's name returns nothing and looks exactly like no coverage.
 */
export type OriginatingWire =
  | 'GLOBENEWSWIRE'
  | 'PR_NEWSWIRE'
  | 'BUSINESS_WIRE'
  | 'ACCESS_NEWSWIRE'
  | 'NEWSFILE';

export interface NewsItem {
  /** Which adapter produced it, e.g. `alpaca`. */
  adapter: string;
  /** Who published this copy, as the adapter reports it, e.g. `benzinga`. */
  provider: string;
  providerItemId: string;
  headline: string;
  summary: string | null;
  /** Plain text of the body, when the adapter supplies one. Never stored whole. */
  bodyText: string | null;
  url: string;
  /** ISO-8601 UTC. Items without a parseable time are dropped by the adapter. */
  publishedAt: string;
  /** Every symbol the item is tagged with. Length 1 is a candidate primary. */
  symbols: string[];
  originatingWire: OriginatingWire | null;
}

/**
 * One adapter's answer. An error and an empty answer are DIFFERENT TYPES, so
 * nothing downstream can parse one as the other.
 */
export type NewsFetchResult =
  | { ok: true; items: NewsItem[]; truncated: boolean; requests: number }
  | { ok: false; error: string; requests: number };

export interface NewsAdapter {
  readonly id: string;
  fetchForTicker(ticker: string, window: { start: Date; end: Date }): Promise<NewsFetchResult>;
  /**
   * One request for many names, for the re-check poll. Optional: an adapter
   * without it is simply not polled, and the poll's detail says so.
   */
  fetchForTickers?(
    tickers: readonly string[],
    window: { start: Date; end: Date },
  ): Promise<NewsFetchResult>;
}
