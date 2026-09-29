/**
 * The ten-second trade store: `trades.db`, a separate SQLite file.
 *
 * WHY A SEPARATE FILE. Every row in `market.db` lengthens every future
 * deploy's `quick_check`, which runs before the stop and has already grown
 * from 388s to 605s in one day. Ten-second buckets are the densest thing the
 * desk records; kept apart, they cost the deploy nothing, and their growth is
 * visible as its own file rather than as a slower integrity check nobody
 * connects to them. Ops's call, under the rule that a store's definer owns it.
 *
 * WHY THE PATH GUARD. Same failure as the identity store: a store inside
 * `/opt/mointel/releases/<sha>` survives one deploy and is deleted by
 * `prune.sh` on the second, silently. The path comes from MarketConfig
 * (TRADES_DB_PATH, else beside market.db); this refuses the place regardless.
 */

import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export type TradesDatabase = Database.Database;

/**
 * v1: counts per 10s bucket. v2 (2026-09-29, his Now column -- "trade counts,
 * dots and direction color"): the last trade price in each bucket, the feed
 * coverage intervals that turn an absent bucket into a measured zero, and the
 * worker's last-flush clock. v2 is purely additive; v1 rows read NULL prices.
 */
export const TRADES_SCHEMA_VERSION = 2;

export interface TradeBucketRecord {
  symbol: string;
  /** Bucket start, epoch ms. */
  bucketTs: number;
  trades: number;
  /** Price of the latest trade in the bucket by trade time; absent from v1 producers. */
  lastPrice?: number | null;
  /** Trade time (epoch ms) of that latest trade. */
  lastTs?: number | null;
}

/**
 * A span during which the stream was delivering trades for a symbol AND the
 * engine was counting them. A bucket with no row inside an interval is a
 * measured zero; outside every interval it is unknown.
 */
export interface FeedIntervalRecord {
  symbol: string;
  openedMs: number;
  /** Heartbeat, advanced every flush while open: the honest end of an interval a crash left open. */
  lastSeenMs: number;
  closedMs: number | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS trade_buckets (
  symbol       TEXT    NOT NULL,
  trading_date TEXT    NOT NULL,
  bucket_ts    INTEGER NOT NULL,
  trades       INTEGER NOT NULL,
  last_price   REAL,
  last_ts      INTEGER,
  PRIMARY KEY (symbol, trading_date, bucket_ts)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_trade_buckets_date ON trade_buckets (trading_date);
CREATE TABLE IF NOT EXISTS feed_intervals (
  symbol       TEXT    NOT NULL,
  trading_date TEXT    NOT NULL,
  opened_ms    INTEGER NOT NULL,
  last_seen_ms INTEGER NOT NULL,
  closed_ms    INTEGER,
  PRIMARY KEY (symbol, trading_date, opened_ms)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_feed_intervals_date ON feed_intervals (trading_date);
CREATE TABLE IF NOT EXISTS trades_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * v1 -> v2 on an existing store: add the two price columns in place. CREATE
 * TABLE IF NOT EXISTS cannot add columns to a table that already exists, so
 * without this a v1 file would be stamped v2 and still lack them.
 */
function migrateToV2(db: TradesDatabase): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(trade_buckets)').all() as Array<{ name: string }>).map(
      (column) => column.name,
    ),
  );
  if (!columns.has('last_price')) db.exec('ALTER TABLE trade_buckets ADD COLUMN last_price REAL');
  if (!columns.has('last_ts')) db.exec('ALTER TABLE trade_buckets ADD COLUMN last_ts INTEGER');
}

export function openTradesStore(file: string): TradesDatabase {
  const resolved = path.resolve(file);

  // Refuses the PLACE, before mkdirSync can create the doomed directory. Split
  // on both separators without a backslash literal -- an escaped one did not
  // survive being written into the identity store's copy of this guard.
  const segments = resolved.split(path.sep).flatMap((part) => part.split('/'));
  if (segments.includes('releases')) {
    throw new Error(
      `refusing to open a trades store inside a release directory: ${resolved}. ` +
        'It would not survive prune.sh. Set TRADES_DB_PATH outside the release tree ' +
        '(the server uses /var/lib/mointel/trades.db).',
    );
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  const current = Number(db.pragma('user_version', { simple: true }));
  if (current > TRADES_SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `trades store at ${resolved} is schema v${current}, newer than this build's ` +
        `v${TRADES_SCHEMA_VERSION} -- refusing to open`,
    );
  }
  db.transaction(() => {
    db.exec(SCHEMA);
    if (current < 2) migrateToV2(db);
    if (current < TRADES_SCHEMA_VERSION) db.pragma(`user_version = ${TRADES_SCHEMA_VERSION}`);
  })();
  return db;
}

/**
 * Writes drained buckets. A bucket still filling is re-emitted on every flush
 * with its running count, so the write must be idempotent -- but it keeps the
 * LARGER count rather than replacing it.
 *
 * Replacing is wrong in the case this capture exists for. The engine drops a
 * bucket once it is older than the current one; a trade for it arriving a
 * moment later (out of order, likeliest on the fastest tape) starts a fresh
 * bucket at 1, and a replacing write would overwrite the settled count with 1.
 * MAX keeps the settled count. It still misses those late trades themselves --
 * an undercount of the late arrivals only, never of the bucket.
 */
export function upsertTradeBuckets(
  db: TradesDatabase,
  tradingDate: string,
  rows: TradeBucketRecord[],
): number {
  if (rows.length === 0) return 0;
  // The price follows the LATER trade time, never the later write: a revived or
  // out-of-order emission carries an earlier last_ts and must not overwrite a
  // later price -- the same failure MAX guards against for the count.
  const statement = db.prepare(
    `INSERT INTO trade_buckets (symbol, trading_date, bucket_ts, trades, last_price, last_ts)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (symbol, trading_date, bucket_ts)
     DO UPDATE SET
       trades = MAX(trades, excluded.trades),
       last_price = CASE WHEN excluded.last_ts IS NOT NULL
                          AND (last_ts IS NULL OR excluded.last_ts > last_ts)
                         THEN excluded.last_price ELSE last_price END,
       last_ts = CASE WHEN excluded.last_ts IS NOT NULL
                       AND (last_ts IS NULL OR excluded.last_ts > last_ts)
                      THEN excluded.last_ts ELSE last_ts END`,
  );
  const write = db.transaction((batch: TradeBucketRecord[]) => {
    for (const row of batch) {
      statement.run(
        row.symbol,
        tradingDate,
        row.bucketTs,
        row.trades,
        row.lastPrice ?? null,
        row.lastTs ?? null,
      );
    }
  });
  write(rows);
  return rows.length;
}

interface TradesLogger {
  info: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Opens the store for the market worker, or returns null. A secondary store
 * must never take capture down with it, so a refusal (a release path, a newer
 * schema, a full disk) degrades to discarding counts -- loudly -- rather than
 * throwing out of the worker's constructor.
 */
export function openTradesStoreOrNull(
  file: string,
  logger: TradesLogger,
  redactError: (error: unknown) => string = String,
): TradesDatabase | null {
  try {
    const db = openTradesStore(file);
    const closed = closeAbandonedFeedIntervals(db);
    logger.info(
      `[trades] ten-second store: ${file}` +
        (closed > 0 ? ` (closed ${closed} feed interval(s) a previous run left open)` : ''),
    );
    return db;
  } catch (error) {
    logger.error(
      `[trades] store unavailable, ten-second counts are being DISCARDED: ${redactError(error)}`,
    );
    return null;
  }
}

/**
 * One flush's worth of ten-second counts. ALWAYS drains, whether or not the
 * store is open: the engine holds buckets until drained, so skipping the drain
 * would grow them without bound inside the market worker. A failed write is
 * logged and does not throw -- it must not stop the flush that persists
 * everything else, and it is its own file so it cannot hold market.db's lock.
 */
export function persistTradeBuckets(
  drain: () => TradeBucketRecord[],
  store: TradesDatabase | null,
  tradingDate: string,
  logger: TradesLogger,
  redactError: (error: unknown) => string = String,
  nowMs: number = Date.now(),
): { written: number; discarded: number } {
  const buckets = drain();
  if (!store) return { written: 0, discarded: buckets.length };
  try {
    const written = buckets.length > 0 ? upsertTradeBuckets(store, tradingDate, buckets) : 0;
    // Every flush, trades or not: a quiet minute must read as quiet, not as a
    // worker that stopped. The Now column's staleness is measured from this.
    setLastFlushMs(store, nowMs);
    return { written, discarded: 0 };
  } catch (error) {
    logger.error(`[trades] write failed: ${redactError(error)}`);
    return { written: 0, discarded: buckets.length };
  }
}

export function loadTradeBuckets(
  db: TradesDatabase,
  symbol: string,
  tradingDate: string,
): TradeBucketRecord[] {
  return (
    db
      .prepare(
        `SELECT symbol, bucket_ts AS bucketTs, trades, last_price AS lastPrice, last_ts AS lastTs
         FROM trade_buckets WHERE symbol = ? AND trading_date = ? ORDER BY bucket_ts`,
      )
      .all(symbol, tradingDate) as TradeBucketRecord[]
  );
}

/** Buckets for many symbols from `fromMs`, in one read: the Now column asks for every board name at once. */
export function loadRecentTradeBuckets(
  db: TradesDatabase,
  symbols: readonly string[],
  tradingDate: string,
  fromMs: number,
): TradeBucketRecord[] {
  if (symbols.length === 0) return [];
  return db
    .prepare(
      `SELECT symbol, bucket_ts AS bucketTs, trades, last_price AS lastPrice, last_ts AS lastTs
       FROM trade_buckets
       WHERE trading_date = ? AND bucket_ts >= ? AND symbol IN (${symbols.map(() => '?').join(',')})
       ORDER BY symbol, bucket_ts`,
    )
    .all(tradingDate, fromMs, ...symbols) as TradeBucketRecord[];
}

/**
 * Writes interval state from the engine. Opening inserts; a heartbeat only ever
 * moves last_seen_ms FORWARD; closing sets closed_ms once and never reopens.
 */
export function upsertFeedIntervals(
  db: TradesDatabase,
  tradingDate: string,
  intervals: FeedIntervalRecord[],
): number {
  if (intervals.length === 0) return 0;
  const statement = db.prepare(
    `INSERT INTO feed_intervals (symbol, trading_date, opened_ms, last_seen_ms, closed_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (symbol, trading_date, opened_ms)
     DO UPDATE SET last_seen_ms = MAX(last_seen_ms, excluded.last_seen_ms),
                   closed_ms = COALESCE(closed_ms, excluded.closed_ms)`,
  );
  db.transaction((batch: FeedIntervalRecord[]) => {
    for (const row of batch) {
      statement.run(row.symbol, tradingDate, row.openedMs, row.lastSeenMs, row.closedMs);
    }
  })(intervals);
  return intervals.length;
}

/**
 * Closes every interval a previous run left open, at its OWN last heartbeat --
 * never at "now". A worker that crashed stopped observing at its last flush;
 * closing later would claim measured zeros for minutes nobody watched. Called
 * once when the worker opens the store. Returns how many it closed.
 */
export function closeAbandonedFeedIntervals(db: TradesDatabase): number {
  return db
    .prepare('UPDATE feed_intervals SET closed_ms = last_seen_ms WHERE closed_ms IS NULL')
    .run().changes;
}

/** Intervals overlapping [fromMs, now): still open, or ended at or after fromMs. */
export function loadFeedIntervals(
  db: TradesDatabase,
  symbols: readonly string[],
  tradingDate: string,
  fromMs: number,
): FeedIntervalRecord[] {
  if (symbols.length === 0) return [];
  return db
    .prepare(
      `SELECT symbol, opened_ms AS openedMs, last_seen_ms AS lastSeenMs, closed_ms AS closedMs
       FROM feed_intervals
       WHERE trading_date = ? AND COALESCE(closed_ms, last_seen_ms) >= ?
         AND symbol IN (${symbols.map(() => '?').join(',')})
       ORDER BY symbol, opened_ms`,
    )
    .all(tradingDate, fromMs, ...symbols) as FeedIntervalRecord[];
}

/* ---- Research's call shape (2026-09-29), thin over the upserts above ---- */

export function openFeedInterval(
  db: TradesDatabase,
  interval: { symbol: string; tradingDate: string; openedMs: number },
): void {
  upsertFeedIntervals(db, interval.tradingDate, [
    { symbol: interval.symbol, openedMs: interval.openedMs, lastSeenMs: interval.openedMs, closedMs: null },
  ]);
}

/** Every open interval's heartbeat moves to nowMs (forward only), and the flush clock with it. */
export function heartbeatFeedIntervals(db: TradesDatabase, tradingDate: string, nowMs: number): number {
  const changed = db
    .prepare(
      `UPDATE feed_intervals SET last_seen_ms = MAX(last_seen_ms, ?)
       WHERE trading_date = ? AND closed_ms IS NULL`,
    )
    .run(nowMs, tradingDate).changes;
  setLastFlushMs(db, nowMs);
  return changed;
}

/** Closes the symbol's open interval(s) for the date; a closed interval is never touched again. */
export function closeFeedInterval(
  db: TradesDatabase,
  interval: { symbol: string; tradingDate: string; closedMs: number },
): number {
  return db
    .prepare(
      `UPDATE feed_intervals SET closed_ms = ?, last_seen_ms = MAX(last_seen_ms, ?)
       WHERE symbol = ? AND trading_date = ? AND closed_ms IS NULL`,
    )
    .run(interval.closedMs, interval.closedMs, interval.symbol, interval.tradingDate).changes;
}

/** Disconnect: every open interval for the date ends at closedMs. */
export function closeAllFeedIntervals(db: TradesDatabase, tradingDate: string, closedMs: number): number {
  return db
    .prepare(
      `UPDATE feed_intervals SET closed_ms = ?, last_seen_ms = MAX(last_seen_ms, ?)
       WHERE trading_date = ? AND closed_ms IS NULL`,
    )
    .run(closedMs, closedMs, tradingDate).changes;
}

/** Buckets in [fromMs, toMs) for many symbols. */
export function readTradeBuckets(
  db: TradesDatabase,
  tradingDate: string,
  symbols: readonly string[],
  fromMs: number,
  toMs: number,
): TradeBucketRecord[] {
  return loadRecentTradeBuckets(db, symbols, tradingDate, fromMs).filter((row) => row.bucketTs < toMs);
}

/**
 * Intervals overlapping [fromMs, toMs). An OPEN interval's coverage ends at its
 * last_seen_ms, never at "now" -- the reader must bound by it, so a process
 * that died mid-interval cannot claim minutes nobody observed.
 */
export function readFeedIntervals(
  db: TradesDatabase,
  tradingDate: string,
  symbols: readonly string[],
  fromMs: number,
  toMs: number,
): FeedIntervalRecord[] {
  return loadFeedIntervals(db, symbols, tradingDate, fromMs).filter((row) => row.openedMs < toMs);
}

/**
 * For the web tier: no migration, no writes. Refuses a store OLDER than this
 * build (the columns it reads would be missing) as well as a newer one; the
 * market worker is the only process that migrates.
 */
export function openTradesStoreReadonly(file: string): TradesDatabase {
  const db = new Database(path.resolve(file), { readonly: true, fileMustExist: true });
  db.pragma('busy_timeout = 2000');
  const version = Number(db.pragma('user_version', { simple: true }));
  if (version !== TRADES_SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `trades store is schema v${version}; this build reads v${TRADES_SCHEMA_VERSION} -- ` +
        'the market worker migrates it on its next start',
    );
  }
  return db;
}

const LAST_FLUSH_KEY = 'last_flush_ms';

/** The worker's flush clock, set every flush, so a stale Now column is detectable even with no trades. */
export function setLastFlushMs(db: TradesDatabase, ms: number): void {
  db.prepare(
    `INSERT INTO trades_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(LAST_FLUSH_KEY, String(ms));
}

export function readLastFlushMs(db: TradesDatabase): number | null {
  const row = db.prepare('SELECT value FROM trades_meta WHERE key = ?').get(LAST_FLUSH_KEY) as
    | { value: string }
    | undefined;
  const ms = row ? Number(row.value) : NaN;
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Keeps the N most recent stored SESSIONS plus the current trading date, and
 * deletes the rest one date at a time through the date index -- the shape
 * `pruneMinuteBars` had to be rewritten into after its NOT IN scanned a 3.7G
 * table under the write lock. An empty store deletes nothing.
 */
export function pruneTradeBuckets(
  db: TradesDatabase,
  retainSessions: number,
  tradingDate: string,
): number {
  const dates = (
    db
      .prepare('SELECT DISTINCT trading_date FROM trade_buckets ORDER BY trading_date DESC')
      .all() as Array<{ trading_date: string }>
  ).map((row) => row.trading_date);
  if (dates.length === 0 || retainSessions <= 0) return 0;

  const keep = new Set(dates.slice(0, retainSessions));
  keep.add(tradingDate);
  const stale = dates.filter((date) => !keep.has(date));
  if (stale.length === 0) return 0;

  const remove = db.prepare('DELETE FROM trade_buckets WHERE trading_date = ?');
  const removeIntervals = db.prepare('DELETE FROM feed_intervals WHERE trading_date = ?');
  let removed = 0;
  for (const date of stale) {
    removed += remove.run(date).changes;
    removeIntervals.run(date);
  }
  return removed;
}
