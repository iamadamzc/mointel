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

/**
 * A count where 0 is meaningful ("off"), which `num` would replace with its
 * fallback. Unset or unparseable takes the fallback; a negative is 0.
 */
function count(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export interface MarketConfig {
  /** Absolute path of the shared SQLite state store. */
  dbPath: string;
  /** Absolute path of the ten-second trade store (`trades.db`), kept apart from `dbPath`. */
  tradesDbPath: string;
  /** Trader-facing discovery population size (Top N). */
  discoveryRank: number;
  /** Internal high-resolution candidate count. */
  internalRank: number;
  /**
   * Big movers on the DAILY board, his ruling 2026-10-01T12:14:00Z ("VEEA is up
   * 43% from close. it should absolutely show on the baord somewhere"): up to
   * this many in-band names moving at least `boardMoversMinPct` from the prior
   * close, on at least `boardMoversMinVolume` shares since 04:00 ET, join the
   * board's rows after the ranked ones. `boardMoversK` 0 turns it off;
   * `boardMoversMinVolume` 0 is no volume floor.
   *
   * Defaults are his ruling of 2026-10-01T15:53:57Z, "10% with 500k shares, cap
   * 15", chosen from `docs/research/movers-vs-robust-baseline/floor-result.md`
   * and `liveband-result.md` (on the live band, 10% + 500k needed 13 at most).
   */
  boardMoversK: number;
  boardMoversMinPct: number;
  boardMoversMinVolume: number;
  discoveryPriceMin: number;
  discoveryPriceMax: number;
  /**
   * The CAPTURE (record) band, his ruling 2026-09-26: record $0.25-$50, qualify
   * the board inside it. CAPTURE_PRICE_MIN/MAX; NULL when unset, which keeps
   * the engine's capture equal to the qualify band -- today's behaviour. Read it
   * through captureBand(), which refuses a band that does not contain the
   * qualify band.
   */
  capturePriceMin: number | null;
  capturePriceMax: number | null;
  /**
   * The price range a VIEWER may ask the board for (Design's range control,
   * `4b7fca4`). NULL means the band the engine ranked in, read from the
   * worker's stored summary -- NOT this process's DISCOVERY_PRICE_* env, which
   * the web tier need not carry (production's worker runs $0.25; a web process
   * without the variable would read the $1 default and refuse the floor he set).
   * A range outside what the engine captures would rank a partial population
   * and print "top 25 of N" over it, so set these only when the capture band
   * widens (Ops) -- to his $0.25-$50.
   */
  boardRangeMin: number | null;
  boardRangeMax: number | null;
  /** The range the board opens on. His ruling: $1-$20. Clamped into the bounds above. */
  boardDefaultMin: number;
  boardDefaultMax: number;
  /**
   * The price range control's kill switch (BOARD_RANGE_OFF=1; rank once, Integration 37th 2026-10-10): the server
   * ignores any requested range, serves the engine's band board, and tells the client to hide the control. An env
   * change and a web restart, no deploy; the market worker is untouched either way.
   */
  boardRangeOff: boolean;
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
    // Unset, it sits BESIDE market.db: /var/lib/mointel/trades.db on the server,
    // and a test's own temp directory under a test. A cwd-relative default
    // would land inside the release on the server and in the repo under tests.
    tradesDbPath: env.TRADES_DB_PATH
      ? path.resolve(env.TRADES_DB_PATH)
      : path.join(path.dirname(dbPath), 'trades.db'),
    discoveryRank: num(env.RVOL_DISCOVERY_RANK, 12),
    internalRank: num(env.RVOL_INTERNAL_RANK, 50),
    boardMoversK: count(env.BOARD_MOVERS_K, 15),
    boardMoversMinPct: num(env.BOARD_MOVERS_MIN_PCT, 10),
    boardMoversMinVolume: count(env.BOARD_MOVERS_MIN_VOLUME, 500000),
    discoveryPriceMin: num(env.DISCOVERY_PRICE_MIN, 1),
    discoveryPriceMax: num(env.DISCOVERY_PRICE_MAX, 20),
    capturePriceMin: env.CAPTURE_PRICE_MIN ? num(env.CAPTURE_PRICE_MIN, 0) : null,
    capturePriceMax: env.CAPTURE_PRICE_MAX ? num(env.CAPTURE_PRICE_MAX, 0) : null,
    boardRangeMin: env.BOARD_RANGE_MIN ? num(env.BOARD_RANGE_MIN, 0) : null,
    boardRangeMax: env.BOARD_RANGE_MAX ? num(env.BOARD_RANGE_MAX, 0) : null,
    boardDefaultMin: num(env.BOARD_DEFAULT_MIN, 1),
    boardDefaultMax: num(env.BOARD_DEFAULT_MAX, 20),
    boardRangeOff: env.BOARD_RANGE_OFF === '1',
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
    // 20 sessions, one trading month: his number, 2026-09-12. minute_bars is an
    // operational buffer, not an archive -- replay needs a day, post-hoc
    // diagnosis wants weeks, tape research lives in R&D's offline store. Past a
    // month you are building an archive inside the hot store, where every
    // migration copies it. Raised only after the schema-backup reaper existed.
    minuteBarRetentionDays: num(env.MARKET_MINUTE_BAR_RETENTION_DAYS, 20),
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
 * at the live store is refused rather than honoured. Both halves are load
 * bearing and they are not alternatives: a dedicated variable alone still
 * **fails open** when someone passes the wrong path, while the refusal
 * **fails closed**. Every incident this desk has had was a safe-looking default
 * quietly doing something else, so the refusal is the part that must hold.
 *
 * The comparison is case-insensitive on Windows because the filesystem is:
 * `data/Market.db` is a different string and the same file, and a guarantee
 * that a different capitalisation can walk through is not a guarantee. On the
 * Linux server case matters and is respected.
 */
export function resolveTestStorePath(options: {
  /** Deliberately not `NodeJS.ProcessEnv`: the caller supplies only what it sets. */
  env?: Record<string, string | undefined>;
  liveDbPath: string;
  cwd?: string;
  /** Defaults to the running platform; a parameter so the property can be tested both ways. */
  caseInsensitiveFs?: boolean;
}): { path: string } | { error: string } {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const caseInsensitive = options.caseInsensitiveFs ?? process.platform === 'win32';

  const requested = env.MARKET_TEST_DB_PATH?.trim();
  const resolved = requested
    ? path.resolve(cwd, requested)
    : path.resolve(cwd, 'data', 'market-test.db');

  const comparable = (value: string): string => {
    const absolute = path.resolve(value);
    return caseInsensitive ? absolute.toLowerCase() : absolute;
  };

  if (comparable(resolved) === comparable(options.liveDbPath)) {
    return {
      error:
        `refusing to run against the live store (${resolved}). ` +
        'This writes synthetic FAKEPACA prints; point MARKET_TEST_DB_PATH somewhere else.',
    };
  }

  return { path: resolved };
}

type BandConfig = Pick<
  MarketConfig,
  'discoveryPriceMin' | 'discoveryPriceMax' | 'capturePriceMin' | 'capturePriceMax'
>;

/**
 * The capture (record) band, or null when none is configured or it is unusable.
 *
 * It must CONTAIN the qualify band: a name that could qualify but not be
 * recorded would reach the board with no bars behind it. A band that fails
 * that, or is inverted, is refused rather than silently narrowed -- the
 * worker logs it and runs on the qualify band, today's behaviour.
 */
export function captureBand(config: BandConfig): { min: number; max: number } | null {
  const { capturePriceMin: min, capturePriceMax: max } = config;
  if (min === null || max === null) return null;
  if (!(min <= max)) return null;
  if (min > config.discoveryPriceMin || max < config.discoveryPriceMax) return null;
  return { min, max };
}

/**
 * The prior-close band a restart or roll seeds as candidates.
 *
 * WITH a capture band: exactly that band. The desk seeds what it is permitted
 * to record -- no more (a x2 on a $50 ceiling would track $100 names only to
 * lengthen the replay), and no less (seeding qualify x2 = $40 would leave
 * $40-$50 absent after every restart while live admission tracks it, so the
 * store's contents would depend on whether a restart happened).
 * WITHOUT one: the old widening, x0.4 below and x2 above the qualify band, so
 * a gapper into the board band is still seeded. His ruling 2026-09-26; Ops's
 * ruling on the multiplier, recorded in ops.md.
 */
export function bootstrapBand(config: BandConfig): { min: number; max: number } {
  return (
    captureBand(config) ?? {
      min: config.discoveryPriceMin * 0.4,
      max: config.discoveryPriceMax * 2,
    }
  );
}
