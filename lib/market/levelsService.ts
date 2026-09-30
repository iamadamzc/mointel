/**
 * Resistance levels on request: one name, computed from the store when asked,
 * memoized in-process per (symbol, the latest completed 5m close).
 *
 * Spec section 6 replaces section 2's worker + table for tonight with this: no
 * worker change, no schema, no market restart. The row contract is unchanged.
 */

import 'server-only';

import { loadMarketConfig } from './config';
import { latestFiveMinuteClose, type ResistanceLevels } from './levels';
import { computeLevelsFromStore } from './levelsStore';
import { databaseExists, openDatabase, type MarketDatabase } from './store/db';

export type LevelsLookup =
  /** A computed row. `levels: []` with `aboveAllStored` is EMPTY, not absent. */
  | { kind: 'present'; row: ResistanceLevels }
  /** Not computable: no stored 1m bar for the symbol. There is no row. */
  | { kind: 'absent' }
  /** The store itself could not be read. */
  | { kind: 'unavailable'; reason: string };

/** The compute moment and the memo key; defined with the computation so scripts share it. */
export { latestFiveMinuteClose };

/**
 * How long after a 5m close a result is still not memoized. The close's last
 * 1m bar reaches the store a few seconds after the minute ends (stream bar,
 * then the worker's flush), so a row computed in that gap would be missing it
 * and, memoized, would stay short for the whole five minutes. Inside the gap
 * the row is computed per request; after it, once per close.
 */
export const MEMO_SETTLE_MS = 15_000;

/** A hard ceiling on memo entries, so a long-lived process cannot grow it without bound. */
const MEMO_MAX_ENTRIES = 5_000;

export interface LevelsMemo {
  get(symbol: string, nowMs: number): ResistanceLevels | null;
  size(): number;
}

/**
 * The memo, over any compute function (the route passes the store's). Absent
 * results are memoized too, so an unknown symbol costs one read per close.
 * Entries from an older close are dropped when a newer close is first seen.
 */
export function createLevelsMemo(
  compute: (symbol: string, t: number) => ResistanceLevels | null,
): LevelsMemo {
  let close = -Infinity;
  const entries = new Map<string, ResistanceLevels | null>();
  return {
    get(symbol, nowMs) {
      const t = latestFiveMinuteClose(nowMs);
      if (t > close) {
        close = t;
        entries.clear();
      }
      if (t === close && entries.has(symbol)) return entries.get(symbol) ?? null;
      const row = compute(symbol, t);
      if (t === close && nowMs - t >= MEMO_SETTLE_MS) {
        if (entries.size >= MEMO_MAX_ENTRIES) entries.clear();
        entries.set(symbol, row);
      }
      return row;
    },
    size: () => entries.size,
  };
}

const globalStore = globalThis as typeof globalThis & {
  __mointelLevels?: { db: MarketDatabase; path: string; memo: LevelsMemo } | null;
};

function connection(dbPath: string): { db: MarketDatabase; memo: LevelsMemo } | null {
  const cached = globalStore.__mointelLevels;
  if (cached && cached.path === dbPath) return cached;
  if (!databaseExists(dbPath)) return null;
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const memo = createLevelsMemo((symbol, t) => computeLevelsFromStore(db, symbol, t));
  globalStore.__mointelLevels = { db, path: dbPath, memo };
  return globalStore.__mointelLevels;
}

function resetConnection(): void {
  try {
    globalStore.__mointelLevels?.db.close();
  } catch {
    /* already gone */
  }
  globalStore.__mointelLevels = null;
}

/** One name's levels at the latest completed 5m close before `nowMs`. */
export function getResistanceLevels(symbol: string, nowMs: number): LevelsLookup {
  const { dbPath } = loadMarketConfig();
  try {
    const store = connection(dbPath);
    if (!store) return { kind: 'unavailable', reason: 'no state store on disk' };
    const row = store.memo.get(symbol, nowMs);
    return row ? { kind: 'present', row } : { kind: 'absent' };
  } catch (error) {
    // The worker can recreate the file; the next request reopens it.
    resetConnection();
    return { kind: 'unavailable', reason: (error as Error).message };
  }
}
