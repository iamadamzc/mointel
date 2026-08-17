/**
 * Focus list persistence.
 *
 * Focus is a display preference, not intelligence. Nothing here reads or writes
 * a ranking, a classification or a research field — pinning a ticker changes
 * what is visible and nothing else.
 *
 * Rows are scoped to a trading date because momentum attention is
 * session-specific: yesterday's runner is not automatically today's problem.
 * Old rows are kept rather than deleted, so the list is auditable later.
 */

import { getMeta, setMeta, type MarketDatabase } from './db';

export interface FocusEntry {
  ticker: string;
  tradingDate: string;
  pinnedAt: string;
  displayOrder: number;
  source: 'USER' | 'SEED';
}

interface FocusRow {
  ticker: string;
  trading_date: string;
  pinned_at: string;
  display_order: number;
  source: string;
}

/** Marks that the one-time seed has already run for a trading date. */
const SEEDED_KEY = 'focus_seeded_date';

/**
 * Creates the table if an older store predates it.
 *
 * The market worker owns schema migrations; this is deliberately narrow — a
 * single idempotent CREATE for the one table the web process writes, so the
 * Focus list works without waiting for the worker to restart onto a new schema.
 */
export function ensureFocusTable(db: MarketDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS focus_tickers (
      ticker        TEXT NOT NULL,
      trading_date  TEXT NOT NULL,
      pinned_at     TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      source        TEXT NOT NULL DEFAULT 'USER',
      PRIMARY KEY (ticker, trading_date)
    );
    CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_tickers (trading_date, display_order);
  `);
}

function toEntry(row: FocusRow): FocusEntry {
  return {
    ticker: row.ticker,
    tradingDate: row.trading_date,
    pinnedAt: row.pinned_at,
    displayOrder: row.display_order,
    source: row.source === 'SEED' ? 'SEED' : 'USER',
  };
}

/** Today's focus list, in pin order. */
export function readFocus(db: MarketDatabase, tradingDate: string): FocusEntry[] {
  const rows = db
    .prepare(
      `SELECT ticker, trading_date, pinned_at, display_order, source
         FROM focus_tickers
        WHERE trading_date = ?
        ORDER BY display_order ASC, pinned_at ASC`,
    )
    .all(tradingDate) as FocusRow[];

  return rows.map(toEntry);
}

export function focusCount(db: MarketDatabase, tradingDate: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM focus_tickers WHERE trading_date = ?')
    .get(tradingDate) as { n: number };
  return row.n;
}

export function isFocused(db: MarketDatabase, ticker: string, tradingDate: string): boolean {
  const row = db
    .prepare('SELECT 1 FROM focus_tickers WHERE ticker = ? AND trading_date = ?')
    .get(ticker, tradingDate);
  return row !== undefined;
}

/** Next slot at the end of the list, so pin order is preserved. */
function nextOrder(db: MarketDatabase, tradingDate: string): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(display_order), -1) AS max FROM focus_tickers WHERE trading_date = ?')
    .get(tradingDate) as { max: number };
  return row.max + 1;
}

export type PinResult =
  | { ok: true; entry: FocusEntry }
  | { ok: false; reason: 'LIMIT_REACHED'; limit: number };

/**
 * Pins a ticker.
 *
 * At the limit this refuses rather than evicting: silently dropping someone
 * else's pinned name to make room is the kind of helpfulness nobody asked for.
 * Re-pinning an existing name is a no-op, not an error.
 */
export function pinFocus(
  db: MarketDatabase,
  options: { ticker: string; tradingDate: string; limit: number; source?: 'USER' | 'SEED' },
): PinResult {
  const { ticker, tradingDate, limit } = options;

  const existing = db
    .prepare(
      `SELECT ticker, trading_date, pinned_at, display_order, source
         FROM focus_tickers WHERE ticker = ? AND trading_date = ?`,
    )
    .get(ticker, tradingDate) as FocusRow | undefined;

  if (existing) return { ok: true, entry: toEntry(existing) };

  if (focusCount(db, tradingDate) >= limit) {
    return { ok: false, reason: 'LIMIT_REACHED', limit };
  }

  const entry: FocusEntry = {
    ticker,
    tradingDate,
    pinnedAt: new Date().toISOString(),
    displayOrder: nextOrder(db, tradingDate),
    source: options.source ?? 'USER',
  };

  db.prepare(
    `INSERT INTO focus_tickers (ticker, trading_date, pinned_at, display_order, source)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(entry.ticker, entry.tradingDate, entry.pinnedAt, entry.displayOrder, entry.source);

  return { ok: true, entry };
}

/**
 * Unpins a ticker.
 *
 * Removal affects this list only: the name stays in Discovery, stays tracked by
 * the market feed, keeps its research and keeps its Desk Priority.
 */
export function unpinFocus(db: MarketDatabase, ticker: string, tradingDate: string): void {
  db.prepare('DELETE FROM focus_tickers WHERE ticker = ? AND trading_date = ?').run(
    ticker,
    tradingDate,
  );
}

export function isFocusSeeded(db: MarketDatabase, tradingDate: string): boolean {
  return getMeta(db, SEEDED_KEY) === tradingDate;
}

/**
 * One-time seed for a trading date.
 *
 * Preserves the old behaviour — the desk's A-priority names start on screen —
 * without letting Desk Priority own the list forever. The marker is recorded
 * whether or not any candidates existed, so an empty seed still counts as
 * having happened: otherwise a user who removed every name would find the list
 * refilled on the next page load, and a new A-priority name appearing at 11:00
 * would silently overwrite a choice made at 09:45.
 */
export function seedFocus(
  db: MarketDatabase,
  options: { tradingDate: string; candidates: string[]; limit: number },
): FocusEntry[] {
  const { tradingDate, candidates, limit } = options;

  const seed = db.transaction(() => {
    if (isFocusSeeded(db, tradingDate)) return readFocus(db, tradingDate);

    for (const ticker of candidates.slice(0, limit)) {
      pinFocus(db, { ticker, tradingDate, limit, source: 'SEED' });
    }
    setMeta(db, SEEDED_KEY, tradingDate);
    return readFocus(db, tradingDate);
  });

  return seed();
}
