/**
 * The Float cell FROZEN at capture (performance record, Amendment 1 A8; schema v30).
 *
 * `writeFloatBound` upserts on (symbol, as_of_date), so a float row read later can hold a value the checkpoint never
 * had. The record therefore copies the cell the checkpoint itself would have shown, computed once here and written
 * with the checkpoint row: the newest stored row on or before the checkpoint's date, re-gated at that date by
 * `floatCellAt`, with the ledger of the checkpoint's OWN dossier (as `readFloatBoundsAt` requires for a checkpoint).
 *
 * NOT_YET when no row exists (the job has not run for the name). Never throws: a read failure is UNKNOWN with the
 * reason READ_FAILED, so a capture never fails on the float.
 */

import type { MarketDatabase } from '../market/store/db';
import { readLatestFloatBound } from '../market/store/floatBoundRepo';
import { floatCellAt } from './floatRead';
import { readSpanBars } from './history';
import type { SupplyBlock } from './types';

export interface CapturedFloat {
  /** PRODUCED, UNKNOWN, CANNOT_VERIFY, or NOT_YET (no stored row on or before the checkpoint's date). */
  state: string;
  /** Null exactly when PRODUCED or NOT_YET. */
  reason: string | null;
}

function floatTablePresent(db: MarketDatabase): boolean {
  return (
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'research_float_bounds'").get() !==
    undefined
  );
}

export function floatAtCapture(
  db: MarketDatabase,
  symbol: string,
  checkpointDate: string,
  ledger: readonly SupplyBlock[] | null,
): CapturedFloat {
  try {
    if (!floatTablePresent(db)) return { state: 'NOT_YET', reason: null };
    const row = readLatestFloatBound(db, symbol, checkpointDate);
    if (!row) return { state: 'NOT_YET', reason: null };
    const bars = row.count.kind === 'COUNT' ? readSpanBars(db, symbol, row.count.asOf, checkpointDate) : [];
    const cell = floatCellAt(row, checkpointDate, ledger, bars);
    if (!cell) return { state: 'NOT_YET', reason: null };
    return cell.state === 'PRODUCED' ? { state: cell.state, reason: null } : { state: cell.state, reason: cell.reason };
  } catch {
    return { state: 'UNKNOWN', reason: 'READ_FAILED' };
  }
}
