/**
 * The float READER: the cell at a display date D from a stored row (contract section 9b, Integration 27th's option B).
 *
 * The row stores what the job FETCHED; every gate is re-run at D, so reusing a row can only move it toward "Cannot
 * verify", never toward a number: the age to D, the R1 proof through D on the stored bars, the announced splits the row
 * fetched through its reuse span (rule R-A), and the ledger of the dossier current at D. A row read more than
 * FLOAT_REUSE_DAYS before D is not reused: CANNOT_VERIFY / FILINGS_NOT_REREAD, never NOT_YET, because "not researched
 * yet" would be false of a name the desk read last week.
 *
 * D is the checkpoint's date, fixed when the checkpoint is written (Commercial 5k item 1); on the live board, the
 * trading date the board shows.
 */
import type { MarketDatabase } from '../market/store/db';
import { readLatestFloatBound } from '../market/store/floatBoundRepo';
import { readCurrentAnalyses } from '../market/store/researchRepo';
import { FLOAT_REUSE_DAYS, floatCellFor, issuanceFiledIn, type FloatBoundRow } from './floatJob';
import { readSpanBars } from './history';
import type { FloatCell, FloatCellReason } from './insiderBound';
import { splitProofFromBars, withAnnouncedSplits, type SpanBar } from './splitProof';
import type { SupplyBlock } from './types';

const wholeDays = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** The cell at D. `row` is the newest stored row on or before D (null: the job has not run, NOT_YET). */
export function floatCellAt(row: FloatBoundRow | null, d: string, ledger: readonly SupplyBlock[] | null, countSpanBars: readonly SpanBar[]): FloatCell | null {
  if (!row) return null;
  if (row.asOfDate > d || wholeDays(row.asOfDate, d) > FLOAT_REUSE_DAYS) return { state: 'CANNOT_VERIFY', reason: 'FILINGS_NOT_REREAD' };
  const splitSinceCount =
    row.count.kind === 'COUNT' ? withAnnouncedSplits(splitProofFromBars(countSpanBars, d), row.announcedSplits, row.count.asOf, d) : row.splitSinceCount;
  // Rule I-D re-applied at D over the stored filings; one made after the row's read is unseen (the reuse span bounds it).
  const issuanceFiled = row.count.kind === 'COUNT' && issuanceFiledIn(row.issuanceFilings, row.count.asOf, d);
  return floatCellFor({ cik: row.cik, count: row.count, holdings: row.holdings, splitSinceCount, ledger, asOfDate: d, issuanceFiled });
}

/**
 * What the board carries per symbol (Design builds the cell from it; plan section 5). NOT_YET is not a state here:
 * it is a symbol absent from the record, or null. `reason` is null exactly when PRODUCED; `bound` (raw shares) is
 * non-null exactly when PRODUCED, and the face is `compactBound(bound)` beside `countAsOf`. `filingsReadOn` is the
 * date the desk read the filings, for the popover's "Filings read on {date}" (Commercial 5k item 3).
 */
export interface FloatBound {
  state: 'PRODUCED' | 'UNKNOWN' | 'CANNOT_VERIFY';
  reason: FloatCellReason | null;
  bound: number | null;
  countAsOf: string | null;
  countFiled: string | null;
  subtractedHolders: number;
  filingsReadOn: string;
  /**
   * PRODUCED only (else []): the FILED dates, sorted and unique, of the filings the subtracted holdings were read from,
   * for "less insider holdings filed on {dates}" (Integration 30th/31st, choice (a)). Never a holding's own `asOf`.
   */
  holdingsFiledOn: string[];
  /** The filed share count's shares and the form it came from, whenever there is a count (as `countAsOf`); else null. */
  countShares: number | null;
  countForm: string | null;
  /**
   * PRODUCED only (else []): one row per insider subtracted (shares above zero), largest first, each with the SUBTRACTED
   * title only (2add4b2b) and its filed dates. For the click-through, variant A (his choice, 2026-10-07T00:51:24.442Z).
   */
  insiders: FloatInsider[];
}

export interface FloatInsider {
  ownerCik: string;
  /** As filed (`rptOwnerName` of the first filing read for the owner, XML whitespace trimmed), or null; never normalised or inferred. */
  ownerName: string | null;
  /** Null for a row stored before the title was kept. */
  title: string | null;
  shares: number;
  /** The date of the holding subtracted (the smaller of the count-date and the later holding); null on an older row. */
  heldAsOf: string | null;
  /** The filed dates of that holding's filings only. */
  filedOn: string[];
}

/** The insiders the bound subtracted, from the row's stored holdings, largest first (ties by CIK). */
function insidersOf(row: FloatBoundRow, used: FloatCell & { state: 'PRODUCED' }): FloatInsider[] {
  const stored = new Map(row.holdings.map((h) => [h.ownerCik, h]));
  return used.holdings
    .filter((h) => h.shares > 0)
    .map((h) => {
      const s = stored.get(h.ownerCik);
      return { ownerCik: h.ownerCik, ownerName: h.ownerName, title: s?.title ?? null, shares: h.shares, heldAsOf: s?.heldAsOf ?? null, filedOn: [...new Set(s?.filingDates ?? [])].sort() };
    })
    .sort((a, b) => b.shares - a.shares || a.ownerCik.localeCompare(b.ownerCik));
}

/** The filed dates of the holdings the bound subtracted (shares above zero), read from the row's stored holdings. */
function filedOn(row: FloatBoundRow, used: FloatCell & { state: 'PRODUCED' }): string[] {
  const subtracted = new Set(used.holdings.filter((h) => h.shares > 0).map((h) => h.ownerCik));
  return [...new Set(row.holdings.filter((h) => subtracted.has(h.ownerCik)).flatMap((h) => h.filingDates))].sort();
}

export function toFloatBound(row: FloatBoundRow, cell: FloatCell): FloatBound {
  const count = row.count.kind === 'COUNT' ? row.count : null;
  const filed = { countShares: count?.shares ?? null, countForm: count?.form ?? null };
  return cell.state === 'PRODUCED'
    ? { state: 'PRODUCED', reason: null, bound: cell.bound, countAsOf: count?.asOf ?? null, countFiled: count?.filed ?? null, subtractedHolders: cell.holdings.filter((h) => h.shares > 0).length, filingsReadOn: row.asOfDate, holdingsFiledOn: filedOn(row, cell), ...filed, insiders: insidersOf(row, cell) }
    : { state: cell.state, reason: cell.reason, bound: null, countAsOf: count?.asOf ?? null, countFiled: count?.filed ?? null, subtractedHolders: 0, filingsReadOn: row.asOfDate, holdingsFiledOn: [], ...filed, insiders: [] };
}

function tablePresent(db: MarketDatabase): boolean {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'research_float_bounds'").get());
}

/**
 * The LIVE board's read, D = the trading date it shows: per symbol, the cell at D, or null (NOT_YET). It reads the
 * CURRENT dossier, which is the dossier current at D only because D is today; a checkpoint or a report for an earlier
 * D must pass the checkpoint's own dossier version through `floatCellAt` instead. Reads nothing, and returns every symbol as null, on a
 * store without the table (an older store, or before the first open by a build that creates it).
 */
export function readFloatBoundsAt(db: MarketDatabase, symbols: readonly string[], d: string): Record<string, FloatBound | null> {
  const out: Record<string, FloatBound | null> = {};
  if (!tablePresent(db)) {
    for (const symbol of symbols) out[symbol] = null;
    return out;
  }
  const dossiers = readCurrentAnalyses(db, [...symbols]);
  for (const symbol of symbols) {
    const row = readLatestFloatBound(db, symbol, d);
    if (!row) {
      out[symbol] = null;
      continue;
    }
    const ledger = dossiers.get(symbol)?.dossier.structure.supplyLedger ?? null;
    const bars = row.count.kind === 'COUNT' ? readSpanBars(db, symbol, row.count.asOf, d) : [];
    out[symbol] = toFloatBound(row, floatCellAt(row, d, ledger, bars)!);
  }
  return out;
}
