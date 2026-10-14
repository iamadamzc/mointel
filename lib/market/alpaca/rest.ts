/**
 * Alpaca REST client (historical data, calendar, assets).
 *
 * Efficiency rules this client enforces:
 *   - multi-symbol endpoints only; never one request per symbol
 *   - next_page_token pagination is followed to completion
 *   - bounded concurrency with 429/5xx backoff that respects Retry-After
 *
 * Credentials are only ever sent as request headers, never logged or included
 * in thrown error messages.
 */

import { ALPACA_ENDPOINTS } from '../config';
import { redact, type AlpacaCredentials } from '../credentials';
import type { SplitAction } from '../splitRestate';
import type { MarketFeed } from '../types';

/** One row of `/v1/corporate-actions` as published, under its group (e.g. `reverse_splits`); null rates were absent. */
export interface CorporateActionRow {
  group: string;
  symbol: string;
  exDate: string | null;
  oldRate: number | null;
  newRate: number | null;
  raw: Record<string, unknown>;
}

/** One split row from `/v1/corporate-actions`, as published. */
interface AlpacaSplitRow {
  symbol?: string;
  ex_date?: string;
  old_rate?: number;
  new_rate?: number;
}

export interface AlpacaDailyBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n?: number;
  vw?: number;
}

export interface AlpacaCalendarDay {
  date: string;
  open: string;
  close: string;
}

export interface AlpacaAsset {
  symbol: string;
  name?: string;
  exchange?: string;
  status?: string;
  tradable?: boolean;
  class?: string;
}

export interface AlpacaSnapshot {
  latestTrade?: { p?: number; s?: number; t?: string; c?: string[]; z?: string };
  latestQuote?: { bp?: number; bs?: number; ap?: number; as?: number; t?: string };
  minuteBar?: AlpacaDailyBar;
  dailyBar?: AlpacaDailyBar;
  prevDailyBar?: AlpacaDailyBar;
}

/** Published maximum `limit` for `/v1beta1/news`. */
export const ALPACA_NEWS_MAX_LIMIT = 50;

/** One item from `/v1beta1/news`, as published. `content` only with include_content. */
export interface AlpacaNewsItem {
  id?: number;
  headline?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  summary?: string;
  content?: string;
  symbols?: string[];
  source?: string;
  url?: string;
}

export class AlpacaHttpError extends Error {
  readonly status: number;
  readonly body: string;
  /**
   * The provider's own `Retry-After`, in milliseconds, when it sent one.
   *
   * The client already waits on this internally; it is carried out to callers
   * so a caller doing its own pacing waits as long as the provider asked
   * rather than guessing a shorter interval and being throttled again.
   */
  readonly retryAfterMs: number | null;

  constructor(status: number, body: string, retryAfterMs: number | null = null) {
    super(`Alpaca HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = 'AlpacaHttpError';
    this.status = status;
    this.body = body;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface RestOptions {
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  onRateLimit?: (waitMs: number) => void;
}

export class AlpacaRestClient {
  private readonly credentials: AlpacaCredentials;
  private readonly feed: MarketFeed;
  private readonly batchSize: number;
  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onRateLimit?: (waitMs: number) => void;

  constructor(credentials: AlpacaCredentials, options: RestOptions = {}) {
    this.credentials = credentials;
    this.feed = credentials.feed;
    this.batchSize = options.batchSize ?? 200;
    this.concurrency = options.concurrency ?? 4;
    this.maxRetries = options.maxRetries ?? 5;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onRateLimit = options.onRateLimit;
  }

  private headers(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.credentials.keyId,
      'APCA-API-SECRET-KEY': this.credentials.secret,
      accept: 'application/json',
    };
  }

  private async request<T>(url: string): Promise<T> {
    let attempt = 0;

    for (;;) {
      let response: Response;
      try {
        response = await this.fetchImpl(url, { headers: this.headers() });
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw new Error(redact(error, this.credentials));
        }
        await sleep(backoffMs(attempt++));
        continue;
      }

      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = await response.text().catch(() => '');

      // 429 and 5xx are retryable; anything else is a real error.
      if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : backoffMs(attempt);
        this.onRateLimit?.(waitMs);
        attempt += 1;
        await sleep(waitMs);
        continue;
      }

      const retryAfterHeader = Number(response.headers.get('retry-after'));
      throw new AlpacaHttpError(
        response.status,
        redact(body, this.credentials),
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : null,
      );
    }
  }

  /** Market calendar for a date range; used to identify full sessions. */
  async getCalendar(start: string, end: string): Promise<AlpacaCalendarDay[]> {
    const url = `${ALPACA_ENDPOINTS.tradingLive}/v2/calendar?start=${start}&end=${end}`;
    try {
      return await this.request<AlpacaCalendarDay[]>(url);
    } catch (error) {
      // The calendar lives on the trading API; some data-only keys cannot reach
      // it. Try the paper host before giving up.
      if (error instanceof AlpacaHttpError && (error.status === 403 || error.status === 401)) {
        const paperUrl = `${ALPACA_ENDPOINTS.tradingPaper}/v2/calendar?start=${start}&end=${end}`;
        return this.request<AlpacaCalendarDay[]>(paperUrl);
      }
      throw error;
    }
  }

  /** Active, tradable US equities. Excludes crypto, options and OTC by design. */
  async listUsEquities(): Promise<AlpacaAsset[]> {
    const path = '/v2/assets?status=active&asset_class=us_equity';
    try {
      return await this.request<AlpacaAsset[]>(`${ALPACA_ENDPOINTS.tradingLive}${path}`);
    } catch (error) {
      if (error instanceof AlpacaHttpError && (error.status === 403 || error.status === 401)) {
        return this.request<AlpacaAsset[]>(`${ALPACA_ENDPOINTS.tradingPaper}${path}`);
      }
      throw error;
    }
  }

  /**
   * Multi-symbol historical bars with full pagination.
   * `adjustment` defaults to split so historical share volume is comparable to
   * the current share basis after a reverse split.
   */
  async getBars(
    symbols: string[],
    params: {
      timeframe: string;
      start: string;
      end?: string;
      adjustment?: 'raw' | 'split' | 'dividend' | 'all';
      limit?: number;
    },
  ): Promise<Map<string, AlpacaDailyBar[]>> {
    const results = new Map<string, AlpacaDailyBar[]>();
    const batches = chunk(symbols, this.batchSize);

    await runPool(batches, this.concurrency, async (batch) => {
      let pageToken: string | undefined;

      do {
        const query = new URLSearchParams({
          symbols: batch.join(','),
          timeframe: params.timeframe,
          start: params.start,
          adjustment: params.adjustment ?? 'split',
          feed: this.feed,
          limit: String(params.limit ?? 10000),
          sort: 'asc',
        });
        if (params.end) query.set('end', params.end);
        if (pageToken) query.set('page_token', pageToken);

        const payload = await this.request<{
          bars?: Record<string, AlpacaDailyBar[]> | null;
          next_page_token?: string | null;
        }>(`${ALPACA_ENDPOINTS.dataRest}/v2/stocks/bars?${query.toString()}`);

        for (const [symbol, bars] of Object.entries(payload.bars ?? {})) {
          if (!Array.isArray(bars)) continue;
          const existing = results.get(symbol);
          if (existing) existing.push(...bars);
          else results.set(symbol, [...bars]);
        }

        pageToken = payload.next_page_token ?? undefined;
      } while (pageToken);
    });

    return results;
  }

  /**
   * Reverse and forward splits from `/v1/corporate-actions`, ex-dates inside
   * [start, end]. Omit `symbols` for every symbol. A row with a missing or
   * non-positive rate is dropped: a ratio built from it would be a number where
   * there is no information. See lib/market/splitRestate.ts for why.
   */
  async getSplits(params: { symbols?: string[]; start: string; end: string }): Promise<SplitAction[]> {
    const results: SplitAction[] = [];
    const batches: Array<string[] | null> = params.symbols ? chunk(params.symbols, this.batchSize) : [null];

    for (const batch of batches) {
      if (batch && batch.length === 0) continue;
      let pageToken: string | undefined;

      do {
        const query = new URLSearchParams({
          types: 'reverse_split,forward_split',
          start: params.start,
          end: params.end,
          limit: '1000',
        });
        if (batch) query.set('symbols', batch.join(','));
        if (pageToken) query.set('page_token', pageToken);

        const payload = await this.request<{
          corporate_actions?: {
            reverse_splits?: AlpacaSplitRow[] | null;
            forward_splits?: AlpacaSplitRow[] | null;
          } | null;
          next_page_token?: string | null;
        }>(`${ALPACA_ENDPOINTS.dataRest}/v1/corporate-actions?${query.toString()}`);

        const actions = payload.corporate_actions ?? {};
        for (const row of [...(actions.reverse_splits ?? []), ...(actions.forward_splits ?? [])]) {
          const oldRate = Number(row.old_rate);
          const newRate = Number(row.new_rate);
          if (!row.symbol || !row.ex_date || !(oldRate > 0) || !(newRate > 0)) continue;
          results.push({ symbol: row.symbol.toUpperCase(), exDate: row.ex_date, oldRate, newRate });
        }

        pageToken = payload.next_page_token ?? undefined;
      } while (pageToken);
    }

    return results;
  }

  /**
   * Float fix 2 piece 1 (Commercial read 98): every corporate action of `types` (the API's own names) for `symbols`
   * with an ex-date in [start, end], AS PUBLISHED: rates are null where Alpaca gave none, so the float job can refuse on
   * an action it cannot restate instead of never seeing it (`getSplits` drops such rows, which is right for the bar
   * restatement and wrong for the float job). Each row keeps the group it came under and its raw fields.
   */
  async getCorporateActionsRaw(params: { symbols: string[]; start: string; end: string; types: readonly string[] }): Promise<CorporateActionRow[]> {
    const results: CorporateActionRow[] = [];
    for (const batch of chunk(params.symbols, this.batchSize)) {
      if (batch.length === 0) continue;
      let pageToken: string | undefined;
      do {
        const query = new URLSearchParams({ types: params.types.join(','), start: params.start, end: params.end, limit: '1000', symbols: batch.join(',') });
        if (pageToken) query.set('page_token', pageToken);
        const payload = await this.request<{ corporate_actions?: Record<string, Array<Record<string, unknown>> | null> | null; next_page_token?: string | null }>(
          `${ALPACA_ENDPOINTS.dataRest}/v1/corporate-actions?${query.toString()}`,
        );
        for (const [group, rows] of Object.entries(payload.corporate_actions ?? {})) {
          for (const row of rows ?? []) {
            const rate = (value: unknown) => (typeof value === 'number' || typeof value === 'string') && Number(value) > 0 ? Number(value) : null;
            results.push({
              group,
              symbol: typeof row.symbol === 'string' ? row.symbol.toUpperCase() : '',
              exDate: typeof row.ex_date === 'string' ? row.ex_date : null,
              oldRate: rate(row.old_rate),
              newRate: rate(row.new_rate),
              raw: row,
            });
          }
        }
        pageToken = payload.next_page_token ?? undefined;
      } while (pageToken);
    }
    return results;
  }

  /** Latest trade/quote/minute/daily/previous-daily bar for many symbols at once. */
  async getSnapshots(symbols: string[]): Promise<Map<string, AlpacaSnapshot>> {
    const results = new Map<string, AlpacaSnapshot>();
    const batches = chunk(symbols, this.batchSize);

    await runPool(batches, this.concurrency, async (batch) => {
      const query = new URLSearchParams({ symbols: batch.join(','), feed: this.feed });
      const payload = await this.request<Record<string, unknown>>(
        `${ALPACA_ENDPOINTS.dataRest}/v2/stocks/snapshots?${query.toString()}`,
      );

      // The endpoint has shipped both a bare map and a { snapshots: {...} }
      // envelope; accept either.
      const container = (
        payload && typeof payload === 'object' && 'snapshots' in payload
          ? (payload as { snapshots: Record<string, unknown> }).snapshots
          : payload
      ) as Record<string, AlpacaSnapshot>;

      for (const [symbol, snapshot] of Object.entries(container ?? {})) {
        if (snapshot && typeof snapshot === 'object') results.set(symbol, snapshot);
      }
    });

    return results;
  }

  /**
   * News items (Benzinga) for a symbol set over a window, newest first.
   *
   * `limit` is capped at the endpoint's published maximum of 50: a larger value
   * is an error response, and a parser reading `.news` off that error object
   * reports zero items, which is indistinguishable from no coverage. That
   * exact failure produced a 0% coverage reading on five days that contained a
   * known item. So a payload without a `news` array THROWS rather than
   * returning empty.
   */
  async getNews(params: {
    symbols: string[];
    start: string;
    end: string;
    maxPages?: number;
    includeContent?: boolean;
  }): Promise<{ items: AlpacaNewsItem[]; truncated: boolean; pages: number }> {
    const items: AlpacaNewsItem[] = [];
    const maxPages = params.maxPages ?? 2;
    let pageToken: string | null = null;

    for (let page = 0; page < maxPages; page += 1) {
      const query = new URLSearchParams({
        symbols: params.symbols.join(','),
        start: params.start,
        end: params.end,
        sort: 'desc',
        limit: String(ALPACA_NEWS_MAX_LIMIT),
      });
      if (params.includeContent) query.set('include_content', 'true');
      if (pageToken) query.set('page_token', pageToken);

      const payload = await this.request<unknown>(
        `${ALPACA_ENDPOINTS.dataRest}/v1beta1/news?${query.toString()}`,
      );
      const news = (payload as { news?: unknown } | null)?.news;
      if (!Array.isArray(news)) {
        throw new Error('Alpaca news payload carried no news array');
      }
      for (const item of news) {
        if (item && typeof item === 'object') items.push(item as AlpacaNewsItem);
      }
      const next = (payload as { next_page_token?: unknown }).next_page_token;
      pageToken = typeof next === 'string' && next !== '' ? next : null;
      if (!pageToken) return { items, truncated: false, pages: page + 1 };
    }

    return { items, truncated: true, pages: maxPages };
  }

  /** Cheap authenticated call used to verify credentials and data entitlement. */
  async verifyDataAccess(symbol = 'AAPL'): Promise<{ ok: boolean; detail: string }> {
    const query = new URLSearchParams({ symbols: symbol, feed: this.feed });
    try {
      await this.request(`${ALPACA_ENDPOINTS.dataRest}/v2/stocks/snapshots?${query.toString()}`);
      return { ok: true, detail: `historical ${this.feed} access confirmed` };
    } catch (error) {
      if (error instanceof AlpacaHttpError) {
        return { ok: false, detail: `HTTP ${error.status}: ${error.body.slice(0, 200)}` };
      }
      return { ok: false, detail: redact(error, this.credentials) };
    }
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/** Runs `worker` over `items` with at most `limit` in flight. */
export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const size = Math.max(1, limit);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  });

  await Promise.all(runners);
}

function backoffMs(attempt: number): number {
  const base = Math.min(30_000, 500 * 2 ** attempt);
  return base / 2 + Math.random() * (base / 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
