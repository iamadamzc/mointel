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

export const TRADES_SCHEMA_VERSION = 1;

export interface TradeBucketRecord {
  symbol: string;
  /** Bucket start, epoch ms. */
  bucketTs: number;
  trades: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS trade_buckets (
  symbol       TEXT    NOT NULL,
  trading_date TEXT    NOT NULL,
  bucket_ts    INTEGER NOT NULL,
  trades       INTEGER NOT NULL,
  PRIMARY KEY (symbol, trading_date, bucket_ts)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_trade_buckets_date ON trade_buckets (trading_date);
`;

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
  db.exec(SCHEMA);
  if (current < TRADES_SCHEMA_VERSION) db.pragma(`user_version = ${TRADES_SCHEMA_VERSION}`);
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
  const statement = db.prepare(
    `INSERT INTO trade_buckets (symbol, trading_date, bucket_ts, trades)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (symbol, trading_date, bucket_ts)
     DO UPDATE SET trades = MAX(trades, excluded.trades)`,
  );
  const write = db.transaction((batch: TradeBucketRecord[]) => {
    for (const row of batch) statement.run(row.symbol, tradingDate, row.bucketTs, row.trades);
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
    logger.info(`[trades] ten-second store: ${file}`);
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
): { written: number; discarded: number } {
  const buckets = drain();
  if (buckets.length === 0) return { written: 0, discarded: 0 };
  if (!store) return { written: 0, discarded: buckets.length };
  try {
    return { written: upsertTradeBuckets(store, tradingDate, buckets), discarded: 0 };
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
        `SELECT symbol, bucket_ts AS bucketTs, trades FROM trade_buckets
         WHERE symbol = ? AND trading_date = ? ORDER BY bucket_ts`,
      )
      .all(symbol, tradingDate) as TradeBucketRecord[]
  );
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
  let removed = 0;
  for (const date of stale) removed += remove.run(date).changes;
  return removed;
}
