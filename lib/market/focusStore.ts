/**
 * The Focus list's server-side access point.
 *
 * Everywhere else in this application the Next.js process reads the state store
 * and the market worker writes it. Focus is the one exception, and deliberately
 * so: it records a user action taken in the browser, which the worker has no
 * way to observe. It therefore gets its own writable handle, kept separate from
 * the read-only connection so no other read path can acquire write access by
 * accident.
 *
 * WAL mode makes the concurrency safe, and the writes involved are a single row
 * on a click. Schema migrations remain the worker's job — this only ever runs
 * one idempotent CREATE TABLE IF NOT EXISTS for its own table.
 */

import 'server-only';

import { loadMarketConfig } from './config';
import { databaseExists, getMeta, openDatabase, type MarketDatabase } from './store/db';
import {
  ensureFocusTable,
  focusCount,
  isFocusSeeded,
  pinFocus,
  readFocus,
  unpinFocus,
  type FocusEntry,
} from './store/focusRepo';
import { etDateString } from './session';

const globalStore = globalThis as typeof globalThis & {
  __momentumFocusDb?: { db: MarketDatabase; path: string } | null;
};

function connection(dbPath: string): MarketDatabase | null {
  const cached = globalStore.__momentumFocusDb;
  if (cached && cached.path === dbPath) return cached.db;

  if (!databaseExists(dbPath)) return null;

  try {
    // skipSchema: the worker owns migrations. Only this table is ensured here.
    const db = openDatabase(dbPath, { skipSchema: true });
    ensureFocusTable(db);
    globalStore.__momentumFocusDb = { db, path: dbPath };
    return db;
  } catch {
    return null;
  }
}

/**
 * The trading date Focus is scoped to.
 *
 * The worker's resolved date is authoritative when present — it accounts for
 * the market calendar. Without it, the ET calendar date is the honest fallback.
 */
function resolveTradingDate(db: MarketDatabase): string {
  return getMeta(db, 'trading_date') || etDateString(new Date());
}

export interface FocusView {
  tradingDate: string;
  tickers: string[];
  entries: FocusEntry[];
  limit: number;
  seeded: boolean;
  /** Set when the store is unavailable; the UI degrades rather than throwing. */
  error: string | null;
}

function unavailable(reason: string, limit: number): FocusView {
  return { tradingDate: '', tickers: [], entries: [], limit, seeded: false, error: reason };
}

function view(db: MarketDatabase, tradingDate: string, limit: number): FocusView {
  const entries = readFocus(db, tradingDate);
  return {
    tradingDate,
    tickers: entries.map((entry) => entry.ticker),
    entries,
    limit,
    seeded: isFocusSeeded(db, tradingDate),
    error: null,
  };
}

/**
 * Reads today's Focus, seeding it once from the supplied candidates.
 *
 * `seedCandidates` are the desk's current A-priority names. They are only ever
 * consulted the first time a trading date is seen; after that the list belongs
 * to the user.
 */
export function getFocus(): FocusView {
  const config = loadMarketConfig();
  const db = connection(config.dbPath);
  if (!db) return unavailable('Market state store is not available yet.', config.focusMaxTickers);

  try {
    const tradingDate = resolveTradingDate(db);
    return view(db, tradingDate, config.focusMaxTickers);
  } catch (error) {
    return unavailable(`Focus unavailable: ${(error as Error).message}`, config.focusMaxTickers);
  }
}

export type FocusMutation =
  | { ok: true; focus: FocusView }
  | { ok: false; message: string; focus: FocusView };

export function pinTicker(ticker: string): FocusMutation {
  const config = loadMarketConfig();
  const db = connection(config.dbPath);
  if (!db) {
    const empty = unavailable('Market state store is not available yet.', config.focusMaxTickers);
    return { ok: false, message: empty.error as string, focus: empty };
  }

  const tradingDate = resolveTradingDate(db);
  const result = pinFocus(db, {
    ticker,
    tradingDate,
    limit: config.focusMaxTickers,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: `Focus holds ${result.limit} names. Unpin one first.`,
      focus: view(db, tradingDate, config.focusMaxTickers),
    };
  }

  return { ok: true, focus: view(db, tradingDate, config.focusMaxTickers) };
}

export function unpinTicker(ticker: string): FocusMutation {
  const config = loadMarketConfig();
  const db = connection(config.dbPath);
  if (!db) {
    const empty = unavailable('Market state store is not available yet.', config.focusMaxTickers);
    return { ok: false, message: empty.error as string, focus: empty };
  }

  const tradingDate = resolveTradingDate(db);
  unpinFocus(db, ticker, tradingDate);
  return { ok: true, focus: view(db, tradingDate, config.focusMaxTickers) };
}

/** Exposed for diagnostics; the UI reads `getFocus`. */
export function currentFocusCount(): number {
  const config = loadMarketConfig();
  const db = connection(config.dbPath);
  if (!db) return 0;
  return focusCount(db, resolveTradingDate(db));
}
