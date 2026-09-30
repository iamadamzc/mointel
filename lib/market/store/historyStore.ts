/**
 * The history store: `history.db`, a separate SQLite file beside market.db.
 *
 * What it holds (docs/research/resistance-levels-spec.md section 3): 15-minute
 * candles back 39 calendar days and daily candles back 12 months, both
 * split-adjusted, for every band name, plus the per-symbol state that makes the
 * backfill resumable and the split re-fetch detectable.
 *
 * WHY A SEPARATE FILE. The same reason as trades.db: every row in market.db
 * lengthens every deploy's quick_check, and ~0.9 GB of 15m candles would land
 * on exactly that path. Kept apart, the growth is its own file, its schema has
 * its own user_version (independent of market.db's SCHEMA_VERSION), and a
 * failure to open it cannot take market.db or the research worker down.
 *
 * KEYING, THE ONE TRAP (spec section 3). Every candle is stored by its bucket
 * START in UTC, as minute_bars and Alpaca's own bars are. A fetched Alpaca
 * 15Min bar and a bucket rolled up from our 1m capture for the same start are
 * the SAME ROW (one primary key), never neighbours. Display converts to end
 * (start + timeframe); the store never does.
 *
 * BASIS. Every row carries `basis_as_of`: the ET date whose share basis its
 * prices are on (the fetch date for Alpaca rows, which Alpaca adjusts as of
 * fetch time; the bucket's own date for rollup rows, which are raw). The
 * symbol's `basis_epoch` is the date of its last full (re)fetch. A row older
 * than the epoch is on a basis the store has since replaced, so a reader that
 * finds one refuses the window rather than mixing bases.
 */

import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { addDays, etDateString, sessionStartUtc } from '../session';

export type HistoryDatabase = Database.Database;

/** v1 (2026-09-30): bars_15m, bars_daily, history_symbols, history_meta. */
export const HISTORY_SCHEMA_VERSION = 1;

/** His ruling: "15m for anything older. up to 39 days." Calendar days. */
export const FIFTEEN_MIN_WINDOW_DAYS = 39;
/** "dailys beyond", backfilled 12 months. */
export const DAILY_BACKFILL_DAYS = 365;

export const FIFTEEN_MIN_MS = 15 * 60_000;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bars_15m (
  symbol       TEXT    NOT NULL,
  bucket_start TEXT    NOT NULL,
  open         REAL    NOT NULL,
  high         REAL    NOT NULL,
  low          REAL    NOT NULL,
  close        REAL    NOT NULL,
  volume       INTEGER NOT NULL,
  trade_count  INTEGER,
  vwap         REAL,
  source       TEXT    NOT NULL CHECK (source IN ('alpaca', 'rollup')),
  partial      INTEGER NOT NULL DEFAULT 0 CHECK (partial IN (0, 1)),
  basis_as_of  TEXT    NOT NULL,
  fetched_at   TEXT    NOT NULL,
  PRIMARY KEY (symbol, bucket_start)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS bars_daily (
  symbol       TEXT    NOT NULL,
  date         TEXT    NOT NULL,
  open         REAL,
  high         REAL,
  low          REAL,
  close        REAL,
  volume       INTEGER,
  trade_count  INTEGER,
  vwap         REAL,
  basis_as_of  TEXT    NOT NULL,
  fetched_at   TEXT    NOT NULL,
  PRIMARY KEY (symbol, date)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS history_symbols (
  symbol                TEXT PRIMARY KEY,
  first_seen_at         TEXT NOT NULL,
  daily_backfilled_at   TEXT,
  m15_backfilled_at     TEXT,
  fetch_epoch           TEXT,
  basis_epoch           TEXT,
  daily_through         TEXT,
  daily_checked_for     TEXT,
  rollup_floor          TEXT,
  rollup_through        TEXT,
  basis_break_at        TEXT,
  basis_break_detail    TEXT,
  refetch_daily_from    TEXT,
  refetch_m15_from      TEXT,
  tripwire_checked_date TEXT,
  retry_after           TEXT,
  last_error            TEXT,
  updated_at            TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS history_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/** Refuses a path inside a release directory, the same guard as trades.db. */
function refuseReleasePath(resolved: string): void {
  // Split on both separators without a backslash literal (see trades.ts).
  const segments = resolved.split(path.sep).flatMap((part) => part.split('/'));
  if (segments.includes('releases')) {
    throw new Error(
      `refusing to open a history store inside a release directory: ${resolved}. ` +
        'It would not survive prune.sh. Set HISTORY_DB_PATH outside the release tree ' +
        '(the server keeps market.db in /var/lib/mointel).',
    );
  }
}

/** HISTORY_DB_PATH, else history.db beside market.db (never cwd-relative on its own). */
export function resolveHistoryDbPath(env: NodeJS.ProcessEnv, marketDbPath: string): string {
  const explicit = env.HISTORY_DB_PATH?.trim();
  if (explicit) return path.resolve(explicit);
  return path.join(path.dirname(path.resolve(marketDbPath)), 'history.db');
}

export function openHistoryStore(file: string): HistoryDatabase {
  const resolved = path.resolve(file);
  refuseReleasePath(resolved);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  const current = Number(db.pragma('user_version', { simple: true }));
  if (current > HISTORY_SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `history store at ${resolved} is schema v${current}, newer than this build's ` +
        `v${HISTORY_SCHEMA_VERSION}: refusing to open`,
    );
  }
  db.transaction(() => {
    db.exec(SCHEMA);
    if (current < HISTORY_SCHEMA_VERSION) db.pragma(`user_version = ${HISTORY_SCHEMA_VERSION}`);
  })();
  return db;
}

/** For later readers (the levels computation, the web): no migration, no writes. */
export function openHistoryStoreReadonly(file: string): HistoryDatabase {
  const db = new Database(path.resolve(file), { readonly: true, fileMustExist: true });
  db.pragma('busy_timeout = 2000');
  const version = Number(db.pragma('user_version', { simple: true }));
  if (version !== HISTORY_SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `history store is schema v${version}; this build reads v${HISTORY_SCHEMA_VERSION}`,
    );
  }
  return db;
}

/* ------------------------------------------------------------------ rows */

export type FifteenMinSource = 'alpaca' | 'rollup';

export interface FifteenMinBar {
  symbol: string;
  /** Bucket START, ISO UTC with milliseconds (Date.toISOString). The key. */
  bucketStart: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number | null;
  vwap: number | null;
  source: FifteenMinSource;
  /** True when the bucket is missing minutes: its high is a lower bound. */
  partial: boolean;
  basisAsOf: string;
  fetchedAt: string;
}

export interface DailyHistoryBar {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  tradeCount: number | null;
  vwap: number | null;
  basisAsOf: string;
  fetchedAt: string;
}

/** Bucket start for an instant: floor(ts / 900 s) x 900 s, UTC, as the key string. */
export function bucketStartIso(ms: number): string {
  return new Date(ms - (((ms % FIFTEEN_MIN_MS) + FIFTEEN_MIN_MS) % FIFTEEN_MIN_MS)).toISOString();
}

const INSERT_15M = `INSERT INTO bars_15m
  (symbol, bucket_start, open, high, low, close, volume, trade_count, vwap, source, partial, basis_as_of, fetched_at)
  VALUES (@symbol, @bucketStart, @open, @high, @low, @close, @volume, @tradeCount, @vwap, @source, @partial, @basisAsOf, @fetchedAt)`;

const SET_15M = `open = excluded.open, high = excluded.high, low = excluded.low, close = excluded.close,
  volume = excluded.volume, trade_count = excluded.trade_count, vwap = excluded.vwap,
  source = excluded.source, partial = excluded.partial, basis_as_of = excluded.basis_as_of,
  fetched_at = excluded.fetched_at`;

function bind15m(row: FifteenMinBar) {
  return { ...row, partial: row.partial ? 1 : 0 };
}

/**
 * Writes 15m rows. A fetched ('alpaca') row replaces whatever holds its key.
 * A rollup row replaces only another rollup row: Alpaca's bar for a bucket
 * saw every trade, ours may have missed minutes, so ours never overwrites it.
 */
export function upsertFifteenMinBars(db: HistoryDatabase, rows: readonly FifteenMinBar[]): number {
  if (rows.length === 0) return 0;
  const fetched = db.prepare(`${INSERT_15M} ON CONFLICT (symbol, bucket_start) DO UPDATE SET ${SET_15M}`);
  const rolled = db.prepare(
    `${INSERT_15M} ON CONFLICT (symbol, bucket_start) DO UPDATE SET ${SET_15M}
     WHERE bars_15m.source = 'rollup'`,
  );
  let written = 0;
  db.transaction(() => {
    for (const row of rows) {
      written += (row.source === 'alpaca' ? fetched : rolled).run(bind15m(row)).changes;
    }
  })();
  return written;
}

const INSERT_DAILY = `INSERT INTO bars_daily
  (symbol, date, open, high, low, close, volume, trade_count, vwap, basis_as_of, fetched_at)
  VALUES (@symbol, @date, @open, @high, @low, @close, @volume, @tradeCount, @vwap, @basisAsOf, @fetchedAt)
  ON CONFLICT (symbol, date) DO UPDATE SET open = excluded.open, high = excluded.high,
    low = excluded.low, close = excluded.close, volume = excluded.volume,
    trade_count = excluded.trade_count, vwap = excluded.vwap,
    basis_as_of = excluded.basis_as_of, fetched_at = excluded.fetched_at`;

export function upsertDailyHistoryBars(db: HistoryDatabase, rows: readonly DailyHistoryBar[]): number {
  if (rows.length === 0) return 0;
  const statement = db.prepare(INSERT_DAILY);
  db.transaction(() => {
    for (const row of rows) statement.run(row);
  })();
  return rows.length;
}

/**
 * Replaces one symbol's whole 15m history in one transaction: the split
 * re-fetch's "replace it". The delete happens only once the fetched rows are
 * in hand, so a failed fetch leaves the old rows (and the break flag) standing.
 */
export function replaceFifteenMinBars(
  db: HistoryDatabase,
  symbol: string,
  rows: readonly FifteenMinBar[],
): number {
  const insert = db.prepare(INSERT_15M);
  db.transaction(() => {
    db.prepare('DELETE FROM bars_15m WHERE symbol = ?').run(symbol);
    for (const row of rows) insert.run(bind15m(row));
  })();
  return rows.length;
}

export function replaceDailyHistoryBars(
  db: HistoryDatabase,
  symbol: string,
  rows: readonly DailyHistoryBar[],
): number {
  const insert = db.prepare(INSERT_DAILY);
  db.transaction(() => {
    db.prepare('DELETE FROM bars_daily WHERE symbol = ?').run(symbol);
    for (const row of rows) insert.run(row);
  })();
  return rows.length;
}

interface Row15m {
  symbol: string;
  bucket_start: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number | null;
  vwap: number | null;
  source: FifteenMinSource;
  partial: number;
  basis_as_of: string;
  fetched_at: string;
}

function from15m(row: Row15m): FifteenMinBar {
  return {
    symbol: row.symbol,
    bucketStart: row.bucket_start,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    tradeCount: row.trade_count,
    vwap: row.vwap,
    source: row.source,
    partial: row.partial === 1,
    basisAsOf: row.basis_as_of,
    fetchedAt: row.fetched_at,
  };
}

interface RowDaily {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  trade_count: number | null;
  vwap: number | null;
  basis_as_of: string;
  fetched_at: string;
}

function fromDaily(row: RowDaily): DailyHistoryBar {
  return {
    symbol: row.symbol,
    date: row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    tradeCount: row.trade_count,
    vwap: row.vwap,
    basisAsOf: row.basis_as_of,
    fetchedAt: row.fetched_at,
  };
}

/** 15m rows in [fromIso, toIso), ascending by bucket start. */
export function readFifteenMinBars(
  db: HistoryDatabase,
  symbol: string,
  fromIso: string,
  toIso: string,
): FifteenMinBar[] {
  return (
    db
      .prepare(
        `SELECT * FROM bars_15m WHERE symbol = ? AND bucket_start >= ? AND bucket_start < ?
         ORDER BY bucket_start`,
      )
      .all(symbol, fromIso, toIso) as Row15m[]
  ).map(from15m);
}

/** Daily rows with date in [fromDate, toDate), ascending. */
export function readDailyHistoryBars(
  db: HistoryDatabase,
  symbol: string,
  fromDate: string,
  toDate: string,
): DailyHistoryBar[] {
  return (
    db
      .prepare('SELECT * FROM bars_daily WHERE symbol = ? AND date >= ? AND date < ? ORDER BY date')
      .all(symbol, fromDate, toDate) as RowDaily[]
  ).map(fromDaily);
}

/* ------------------------------------------------------------------ per-symbol state */

export interface HistorySymbolState {
  symbol: string;
  firstSeenAt: string;
  dailyBackfilledAt: string | null;
  m15BackfilledAt: string | null;
  fetchEpoch: string | null;
  basisEpoch: string | null;
  dailyThrough: string | null;
  dailyCheckedFor: string | null;
  rollupFloor: string | null;
  rollupThrough: string | null;
  basisBreakAt: string | null;
  basisBreakDetail: string | null;
  refetchDailyFrom: string | null;
  refetchM15From: string | null;
  tripwireCheckedDate: string | null;
  retryAfter: string | null;
  lastError: string | null;
  updatedAt: string;
}

const STATE_COLUMNS: Record<keyof HistorySymbolState, string> = {
  symbol: 'symbol',
  firstSeenAt: 'first_seen_at',
  dailyBackfilledAt: 'daily_backfilled_at',
  m15BackfilledAt: 'm15_backfilled_at',
  fetchEpoch: 'fetch_epoch',
  basisEpoch: 'basis_epoch',
  dailyThrough: 'daily_through',
  dailyCheckedFor: 'daily_checked_for',
  rollupFloor: 'rollup_floor',
  rollupThrough: 'rollup_through',
  basisBreakAt: 'basis_break_at',
  basisBreakDetail: 'basis_break_detail',
  refetchDailyFrom: 'refetch_daily_from',
  refetchM15From: 'refetch_m15_from',
  tripwireCheckedDate: 'tripwire_checked_date',
  retryAfter: 'retry_after',
  lastError: 'last_error',
  updatedAt: 'updated_at',
};

const SELECT_STATE = `SELECT ${Object.entries(STATE_COLUMNS)
  .map(([key, column]) => `${column} AS ${key}`)
  .join(', ')} FROM history_symbols`;

export function readSymbolState(db: HistoryDatabase, symbol: string): HistorySymbolState | null {
  return (
    (db.prepare(`${SELECT_STATE} WHERE symbol = ?`).get(symbol) as HistorySymbolState | undefined) ??
    null
  );
}

export function readSymbolStates(
  db: HistoryDatabase,
  where: string,
  params: readonly unknown[] = [],
): HistorySymbolState[] {
  return db.prepare(`${SELECT_STATE} WHERE ${where}`).all(...params) as HistorySymbolState[];
}

/** Registers names the store should hold. Existing rows are untouched. Returns how many were new. */
export function registerHistorySymbols(
  db: HistoryDatabase,
  symbols: readonly string[],
  nowIso: string,
): number {
  if (symbols.length === 0) return 0;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO history_symbols (symbol, first_seen_at, updated_at) VALUES (?, ?, ?)`,
  );
  let added = 0;
  db.transaction(() => {
    for (const symbol of symbols) added += insert.run(symbol, nowIso, nowIso).changes;
  })();
  return added;
}

/** Sets named fields on one symbol's state row. Only known fields are accepted. */
export function updateSymbolState(
  db: HistoryDatabase,
  symbol: string,
  fields: Partial<Omit<HistorySymbolState, 'symbol' | 'firstSeenAt'>>,
): void {
  const entries = Object.entries(fields).filter(([key]) => key in STATE_COLUMNS);
  if (!entries.some(([key]) => key === 'updatedAt')) {
    entries.push(['updatedAt', new Date().toISOString()]);
  }
  const assignments = entries
    .map(([key]) => `${STATE_COLUMNS[key as keyof HistorySymbolState]} = ?`)
    .join(', ');
  db.prepare(`UPDATE history_symbols SET ${assignments} WHERE symbol = ?`).run(
    ...entries.map(([, value]) => value ?? null),
    symbol,
  );
}

export function getHistoryMeta(db: HistoryDatabase, key: string): string | null {
  const row = db.prepare('SELECT value FROM history_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setHistoryMeta(db: HistoryDatabase, key: string, value: string): void {
  db.prepare(
    `INSERT INTO history_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

/* ------------------------------------------------------------------ the read for consumers */

export type LadderBarsStatus = 'ready' | 'not-backfilled' | 'basis-break';

export interface LadderBars {
  symbol: string;
  status: LadderBarsStatus;
  /**
   * The previous session back 39 calendar days, ascending by bucket start
   * (the ladder walks it backwards). Today's session is excluded: it is the
   * 5m window, rolled from 1m by the caller.
   */
  fifteenMin: FifteenMinBar[];
  /** Every stored daily session older than the 15m window, ascending. */
  daily: DailyHistoryBar[];
  horizon: { fifteenMinFrom: string | null; dailyFrom: string | null };
  /** Set with status 'basis-break': the older windows must not be walked. */
  basisBreak?: true;
  detail?: string;
}

/**
 * The 15m and daily windows for one name at one moment (spec section 1).
 *
 * REFUSES A MIXED BASIS rather than returning it: a pending split re-fetch, or
 * any row stamped with a basis older than the symbol's last full fetch, returns
 * status 'basis-break' with both windows empty. The row contract's
 * `basisBreak` comes from here.
 */
export function readLadderBars(db: HistoryDatabase, symbol: string, now: Date): LadderBars {
  const empty = { fifteenMin: [], daily: [], horizon: { fifteenMinFrom: null, dailyFrom: null } };
  const state = readSymbolState(db, symbol);
  // First: a detected split not yet re-fetched refuses, whatever else is stored.
  if (state?.basisBreakAt) {
    return {
      symbol,
      status: 'basis-break',
      basisBreak: true,
      detail: state.basisBreakDetail ?? 'split re-fetch pending',
      ...empty,
    };
  }
  if (!state || state.basisEpoch === null || state.m15BackfilledAt === null) {
    return { symbol, status: 'not-backfilled', ...empty };
  }
  const basisEpoch = state.basisEpoch;

  const today = etDateString(now);
  const windowStartDate = addDays(today, -FIFTEEN_MIN_WINDOW_DAYS);
  const fifteenFrom = sessionStartUtc(windowStartDate).toISOString();
  const todayStart = sessionStartUtc(today).getTime();
  // Completed candles only: before today's session, and ended by `now` in any case.
  const fifteenTo = new Date(Math.min(todayStart, now.getTime() - FIFTEEN_MIN_MS + 1)).toISOString();

  const fifteenMin = readFifteenMinBars(db, symbol, fifteenFrom, fifteenTo);
  const daily = readDailyHistoryBars(db, symbol, '0000-00-00', windowStartDate);

  const stale = [...fifteenMin, ...daily].find((row) => row.basisAsOf < basisEpoch);
  if (stale) {
    return {
      symbol,
      status: 'basis-break',
      basisBreak: true,
      detail: `mixed basis: a row stamped ${stale.basisAsOf} predates the basis epoch ${basisEpoch}`,
      ...empty,
    };
  }

  return {
    symbol,
    status: 'ready',
    fifteenMin,
    daily,
    horizon: {
      fifteenMinFrom: fifteenMin[0]?.bucketStart ?? null,
      dailyFrom: daily[0]?.date ?? null,
    },
  };
}
