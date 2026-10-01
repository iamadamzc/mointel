/**
 * The web's read of one name's stored resistance levels: the whole of what
 * `/api/levels` does per request, kept here so `scripts/levels-box-cost.ts`
 * times exactly this code.
 *
 * One READ-ONLY open of history.db, one indexed lookup in `resistance_levels`
 * (spec section 2), the payload parsed, the connection closed. It never opens
 * market.db and never computes: the rows are written by the research worker's
 * refresh child (`worker/levels-refresh.ts`).
 */

import type { ResistanceLevels } from './levels';
import { openHistoryStoreReadonly, readResistanceLevels, type HistoryDatabase } from './store/historyStore';

/** The stored payload as the row, or null when it does not read as this name's row for the date. */
export function parseStoredLevels(
  payload: string,
  symbol: string,
  tradingDate: string,
): ResistanceLevels | null {
  try {
    const row = JSON.parse(payload) as ResistanceLevels | null;
    if (
      !row ||
      typeof row !== 'object' ||
      row.symbol !== symbol ||
      row.tradingDate !== tradingDate ||
      !Array.isArray(row.levels)
    ) {
      return null;
    }
    return row;
  } catch {
    return null;
  }
}

/**
 * One name's stored row for `tradingDate`, or null when none is stored (ABSENT)
 * or its payload does not read as the row. THROWS when history.db cannot be
 * opened or read (missing file, wrong schema, not a database); the route turns
 * that into absent as well.
 */
export function readStoredLevels(file: string, tradingDate: string, symbol: string): ResistanceLevels | null {
  let db: HistoryDatabase | null = null;
  try {
    db = openHistoryStoreReadonly(file);
    const stored = readResistanceLevels(db, tradingDate, [symbol]).get(symbol);
    return stored ? parseStoredLevels(stored.payload, symbol, tradingDate) : null;
  } finally {
    try {
      db?.close();
    } catch {
      /* already gone */
    }
  }
}
