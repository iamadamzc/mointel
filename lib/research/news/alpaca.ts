import type { AlpacaNewsItem, AlpacaRestClient } from '../../market/alpaca/rest';
import { htmlToText } from '../sec/documents';
import type { NewsAdapter, NewsFetchResult, NewsItem } from './types';
import { recoverOriginatingWire } from './wire';

/**
 * Adapter 1: Alpaca News, which is Benzinga's feed.
 *
 * Licensed under the account the desk already pays for (Commercial,
 * `977e0d2`). Measured over five sessions of top-12 names: ~23% carry a
 * single-symbol item, ~47% any item (Ops, 2026-09-25). Known controls: `AIFF`
 * 2026-09-25 PRESENT at 07:47:17 ET; `MEDS` 2026-09-28 ABSENT (an ACCESS
 * Newswire release Benzinga never rewrote).
 */
export class AlpacaNewsAdapter implements NewsAdapter {
  readonly id = 'alpaca';

  constructor(
    private readonly client: Pick<AlpacaRestClient, 'getNews'>,
    private readonly maxPages = 2,
  ) {}

  fetchForTicker(ticker: string, window: { start: Date; end: Date }): Promise<NewsFetchResult> {
    return this.fetchForTickers([ticker], window);
  }

  async fetchForTickers(
    tickers: readonly string[],
    window: { start: Date; end: Date },
  ): Promise<NewsFetchResult> {
    try {
      const response = await this.client.getNews({
        symbols: [...tickers],
        start: window.start.toISOString(),
        end: window.end.toISOString(),
        includeContent: true,
        maxPages: this.maxPages,
      });
      const items: NewsItem[] = [];
      for (const raw of response.items) {
        const item = toNewsItem(raw);
        if (item) items.push(item);
      }
      return { ok: true, items, truncated: response.truncated, requests: response.pages };
    } catch (error) {
      // The client redacts credentials from everything it throws.
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message.slice(0, 200), requests: 1 };
    }
  }
}

export function toNewsItem(raw: AlpacaNewsItem): NewsItem | null {
  const headline = raw.headline?.trim();
  const url = raw.url?.trim();
  const created = raw.created_at ? Date.parse(raw.created_at) : Number.NaN;
  if (!headline || !url || !Number.isFinite(created) || raw.id === undefined) return null;

  const summary = raw.summary?.trim() || null;
  const bodyText = raw.content ? htmlToText(raw.content).trim() || null : null;
  return {
    adapter: 'alpaca',
    provider: (raw.source ?? 'unknown').toLowerCase(),
    providerItemId: String(raw.id),
    headline,
    summary,
    bodyText,
    url,
    publishedAt: new Date(created).toISOString(),
    symbols: (raw.symbols ?? []).map((symbol) => symbol.toUpperCase()),
    originatingWire: recoverOriginatingWire({
      author: raw.author?.trim() || null,
      bodyText,
      summary,
    }),
  };
}
