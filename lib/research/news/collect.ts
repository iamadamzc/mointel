import { etDateString } from '../../market/session';
import { hashContent } from '../fingerprint';
import type { NewResearchSource } from '../types';
import type { NewsAdapter, NewsItem } from './types';

/**
 * Runs every news adapter for one ticker and returns rows to store.
 *
 * WHAT IS STORED: items tagged with this ticker ALONE. A single-symbol item is
 * a candidate primary — the issuer's release, or an article about this name.
 * Its authority is NEWSWIRE only when the originating wire is recovered from
 * the item itself; otherwise it is SECONDARY, because a single tag on an
 * intermediary's own article is not the issuer speaking.
 *
 * WHAT IS COUNTED AND NOT STORED: multi-symbol items — market wraps like "12
 * Health Care Stocks Moving In Friday's Pre-Market Session", which tagged
 * `AIFF` eighteen minutes after its release. Storing one would (a) let the
 * interpreter attribute a move to a listicle and (b) change the evidence
 * fingerprint, which buys a paid re-interpretation on every wrap a name
 * appears in. They are counted in the detail string, so the signal that
 * something is moving is kept where diagnostics read it.
 *
 * DEDUPE ACROSS SOURCES: one release reaching two adapters is one row. The key
 * is the ET date plus the normalised headline, and it is also the row's
 * `documentFingerprint`, so the store's (ticker, document_fingerprint) index
 * collapses re-fetches and cross-adapter copies alike. The date keeps a
 * recurring headline on different days distinct. Copies of the same event
 * under different headlines (an IR post, an SEC exhibit) are clustering's job,
 * not this function's.
 */
export const MAX_NEWS_ROWS_PER_RUN = 10;

/** Stored excerpt length. The body is licensed for reading, not for copying whole. */
export const NEWS_EXCERPT_CHARS = 600;

export interface NewsCollection {
  rows: NewResearchSource[];
  /**
   * Per adapter, what came back — an item COUNT, never a boolean, so "read 0
   * items" and "ERROR" can never be read as each other and "the feed had
   * plenty, none about this name" is distinguishable from "got nothing".
   */
  detail: string;
  requests: number;
}

export function normaliseHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeKey(item: NewsItem): string {
  return `${etDateString(new Date(item.publishedAt))}|${normaliseHeadline(item.headline)}`;
}

/** Prefer the copy that names its wire, then the earliest. */
function better(a: NewsItem, b: NewsItem): NewsItem {
  if ((a.originatingWire === null) !== (b.originatingWire === null)) {
    return a.originatingWire !== null ? a : b;
  }
  return a.publishedAt <= b.publishedAt ? a : b;
}

export async function collectNews(
  adapters: readonly NewsAdapter[],
  ticker: string,
  window: { start: Date; end: Date },
  now: Date,
): Promise<NewsCollection> {
  const symbol = ticker.toUpperCase();
  const parts: string[] = [];
  let requests = 0;
  const byKey = new Map<string, NewsItem>();

  for (const adapter of adapters) {
    const result = await adapter.fetchForTicker(symbol, window);
    requests += result.requests;
    if (!result.ok) {
      parts.push(`${adapter.id}: ERROR ${result.error}`);
      continue;
    }
    let single = 0;
    let multi = 0;
    let untagged = 0;
    for (const item of result.items) {
      if (!item.symbols.includes(symbol)) {
        untagged += 1;
        continue;
      }
      if (item.symbols.length > 1) {
        multi += 1;
        continue;
      }
      single += 1;
      const key = dedupeKey(item);
      const held = byKey.get(key);
      byKey.set(key, held ? better(held, item) : item);
    }
    parts.push(
      `${adapter.id}: read ${result.items.length} items (${single} single-symbol, ${multi} multi-symbol` +
        `${untagged > 0 ? `, ${untagged} not tagged ${symbol}` : ''})${result.truncated ? ' TRUNCATED' : ''}`,
    );
  }

  const chosen = [...byKey.entries()]
    .sort(([, a], [, b]) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_NEWS_ROWS_PER_RUN);

  const rows: NewResearchSource[] = chosen.map(([key, item]) => {
    const body = item.summary ?? item.bodyText ?? item.headline;
    return {
      ticker: symbol,
      sourceType: 'NEWS_FEED',
      title: item.headline,
      url: item.url,
      publishedAt: item.publishedAt,
      publishedPrecision: 'EXACT',
      fetchedAt: now.toISOString(),
      accession: null,
      secForm: null,
      authority: item.originatingWire ? 'NEWSWIRE' : 'SECONDARY',
      contentHash: hashContent(`${normaliseHeadline(item.headline)}\n${item.summary ?? ''}`),
      documentFingerprint: hashContent(`news|${key}`),
      excerpt: body.slice(0, NEWS_EXCERPT_CHARS),
      metadata: {
        discoveredVia: item.adapter,
        provider: item.provider,
        providerItemId: item.providerItemId,
        originatingWire: item.originatingWire,
        symbols: item.symbols,
        originalTimestamp: item.publishedAt,
        timestampPrecision: 'EXACT',
      },
      active: true,
    };
  });

  return {
    rows,
    detail: parts.length > 0 ? parts.join('; ') : 'no news adapters configured',
    requests,
  };
}
