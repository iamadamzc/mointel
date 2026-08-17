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
  /** A high-res ticker quiet longer than this during RTH is marked stale. */
  tickerStaleSeconds: number;
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
    tickerStaleSeconds: num(env.MARKET_TICKER_STALE_SECONDS, 300),
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
