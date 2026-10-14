/**
 * The Float cell FROZEN at capture (performance record, Amendment 1 A8; schema v30).
 *
 * `writeFloatBound` upserts on (symbol, as_of_date), so a float row read later can hold a value the checkpoint never
 * had. The record therefore copies the cell the checkpoint itself would have shown, computed once here and written
 * with the checkpoint row: the newest stored row on or before the checkpoint's date, re-gated at that date by
 * `floatCellAt`, with the ledger of the checkpoint's OWN dossier (as `readFloatBoundsAt` requires for a checkpoint).
 * The ledger is chosen by the board's own `ledgerAt` (L8): a name with no analysis, on a store whose research tables
 * were read, is `NO_ANALYSIS` (a filings-only bound, as the board shows it), never null (ISSUANCE_NOT_CHECKED).
 *
 * NOT_YET when no row exists (the job has not run for the name). Never throws: a read failure is UNKNOWN with the
 * reason READ_FAILED, so a capture never fails on the float.
 */

import type { MarketDatabase } from '../market/store/db';
import { readLatestFloatBound } from '../market/store/floatBoundRepo';
import { researchTablesPresent } from '../market/store/researchRepo';
import { floatCellAt, ledgerAt } from './floatRead';
import { readSpanBars } from './history';
import type { ResearchAnalysisVersion } from './types';

export interface CapturedFloat {
  /** PRODUCED, UNKNOWN, CANNOT_VERIFY, or NOT_YET (no stored row on or before the checkpoint's date). */
  state: string;
  /** Null exactly when PRODUCED or NOT_YET. */
  reason: string | null;
  /**
   * L8's mark, frozen with the state (Commercial read 118): true exactly when the captured cell is PRODUCED with
   * `filingsOnly` (a name with no desk research, so the ledger's check did not run). False for every other capture,
   * NOT_YET and READ_FAILED included. Without it a filings-only PRODUCED froze as plain PRODUCED.
   */
  filingsOnly: boolean;
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
  analysis: ResearchAnalysisVersion | undefined,
): CapturedFloat {
  try {
    if (!floatTablePresent(db)) return { state: 'NOT_YET', reason: null, filingsOnly: false };
    const row = readLatestFloatBound(db, symbol, checkpointDate);
    if (!row) return { state: 'NOT_YET', reason: null, filingsOnly: false };
    const bars = row.count.kind === 'COUNT' ? readSpanBars(db, symbol, row.count.asOf, checkpointDate) : [];
    const cell = floatCellAt(row, checkpointDate, ledgerAt(researchTablesPresent(db), analysis), bars);
    if (!cell) return { state: 'NOT_YET', reason: null, filingsOnly: false };
    return cell.state === 'PRODUCED'
      ? { state: cell.state, reason: null, filingsOnly: cell.filingsOnly === true }
      : { state: cell.state, reason: cell.reason, filingsOnly: false };
  } catch {
    return { state: 'UNKNOWN', reason: 'READ_FAILED', filingsOnly: false };
  }
}
