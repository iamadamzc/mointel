/**
 * Non-secret market configuration. Safe to import from both the Next server and
 * the worker. Credentials deliberately live in a separate, worker-only module
 * (lib/market/credentials.ts) so the web process never loads them at all.
 */

import path from 'node:path';

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export interface MarketConfig {
  /** Absolute path of the shared SQLite state store. */
  dbPath: string;
  /** Trader-facing discovery population size (Top N). */
  discoveryRank: number;
  /** Internal high-resolution candidate count. */
  internalRank: number;
  discoveryPriceMin: number;
  discoveryPriceMax: number;
  /** Target number of eligible full sessions in an RVOL baseline. */
  baselineSessions: number;
  /** Symbols per multi-symbol REST request. */
  restBatchSize: number;
  /** Concurrent in-flight REST requests. */
  restConcurrency: number;
  /** How often the engine flushes in-memory state to SQLite, ms. */
  flushIntervalMs: number;
  /** How often the browser is expected to poll /api/market, ms. */
  clientPollMs: number;
  /** Worker heartbeat older than this marks the feed offline in the UI. */
  heartbeatStaleMs: number;
  /**
   * Whole-market message age, in seconds, beyond which the feed stops being
   * FRESH. Measured on the global stream, not on any one ticker: an illiquid
   * name going quiet says nothing about the SIP connection.
   */
  marketDataFreshSeconds: number;
  /** Whole-market message age beyond which the feed is STALE rather than degraded. */
  marketDataStaleSeconds: number;
  /** A high-res ticker quiet longer than this during RTH is marked stale. */
  tickerStaleSeconds: number;
  /** How many tickers the user may keep in the Focus strip at once. */
  focusMaxTickers: number;
  /** Minute bars older than this many trading dates are pruned. */
  minuteBarRetentionDays: number;
  debug: boolean;
  /** Diagnostic-only trading-date override; see README. */
  tradingDateOverride: string | null;
}

export function loadMarketConfig(env: NodeJS.ProcessEnv = process.env): MarketConfig {
  const dbPath = env.MARKET_DB_PATH
    ? path.resolve(env.MARKET_DB_PATH)
    : path.resolve(process.cwd(), 'data', 'market.db');

  const override = env.DEMAND_TRADING_DATE_OVERRIDE?.trim();

  return {
    dbPath,
    discoveryRank: num(env.RVOL_DISCOVERY_RANK, 12),
    internalRank: num(env.RVOL_INTERNAL_RANK, 50),
    discoveryPriceMin: num(env.DISCOVERY_PRICE_MIN, 1),
    discoveryPriceMax: num(env.DISCOVERY_PRICE_MAX, 20),
    baselineSessions: num(env.RVOL_BASELINE_SESSIONS, 20),
    restBatchSize: num(env.ALPACA_REST_BATCH_SIZE, 200),
    restConcurrency: num(env.ALPACA_REST_CONCURRENCY, 4),
    flushIntervalMs: num(env.MARKET_FLUSH_INTERVAL_MS, 1000),
    clientPollMs: num(env.MARKET_CLIENT_POLL_MS, 1000),
    heartbeatStaleMs: num(env.MARKET_HEARTBEAT_STALE_MS, 15_000),
    // 90s absorbs an ordinary lull in whole-market traffic; 240s does not. A
    // four-minute silence during RTH is not a quiet tape, it is a problem.
    marketDataFreshSeconds: num(env.MARKET_DATA_FRESH_SECONDS, 90),
    marketDataStaleSeconds: num(env.MARKET_DATA_STALE_SECONDS, 240),
    tickerStaleSeconds: num(env.MARKET_TICKER_STALE_SECONDS, 300),
    focusMaxTickers: num(env.FOCUS_MAX_TICKERS, 6),
    minuteBarRetentionDays: num(env.MARKET_MINUTE_BAR_RETENTION_DAYS, 3),
    debug: bool(env.ALPACA_DEBUG),
    tradingDateOverride: override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : null,
  };
}

/** Alpaca endpoints. Kept here so nothing hard-codes a URL inline. */
export const ALPACA_ENDPOINTS = {
  dataRest: 'https://data.alpaca.markets',
  tradingLive: 'https://api.alpaca.markets',
  tradingPaper: 'https://paper-api.alpaca.markets',
  streamSip: 'wss://stream.data.alpaca.markets/v2/sip',
  streamIex: 'wss://stream.data.alpaca.markets/v2/iex',
  streamTest: 'wss://stream.data.alpaca.markets/v2/test',
} as const;

/** The symbol Alpaca's official test stream publishes. */
export const TEST_STREAM_SYMBOL = 'FAKEPACA';

/**
 * Which store `npm run market:test` is allowed to write synthetic prints into.
 *
 * It used to read: use `MARKET_DB_PATH` if set, otherwise `data/market-test.db`
 * — on the reasoning that setting the variable was an explicit act by the
 * operator. On a developer machine it is. On the server it is *ambient service
 * configuration*: `/etc/mointel/mointel.env` sets
 * `MARKET_DB_PATH=/var/lib/mointel/market.db` for every unit. So the guard
 * inverted precisely where contamination would matter, and the file's promise
 * that synthetic prints "can never contaminate real market state" was false on
 * the only machine where it counted. Nobody ran it there; it was found by
 * reading, and it is not left to be found the other way.
 *
 * The opt-in is now a dedicated variable that no service sets, and pointing it
 * at the live store is refused rather than honoured.
 */
export function resolveTestStorePath(options: {
  /** Deliberately not `NodeJS.ProcessEnv`: the caller supplies only what it sets. */
  env?: Record<string, string | undefined>;
  liveDbPath: string;
  cwd?: string;
}): { path: string } | { error: string } {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();

  const requested = env.MARKET_TEST_DB_PATH?.trim();
  const resolved = requested
    ? path.resolve(cwd, requested)
    : path.resolve(cwd, 'data', 'market-test.db');

  if (path.resolve(resolved) === path.resolve(options.liveDbPath)) {
    return {
      error:
        `refusing to run against the live store (${resolved}). ` +
        'This writes synthetic FAKEPACA prints; point MARKET_TEST_DB_PATH somewhere else.',
    };
  }

  return { path: resolved };
}
