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
import { readCurrentAnalyses, researchTablesPresent } from '../market/store/researchRepo';
import { FLOAT_MAX_AGE_DAYS, FLOAT_REUSE_DAYS, floatCellFor, issuanceFiledIn, type FloatBoundRow } from './floatJob';
import type { Restatement } from './floatRestate';
import { readSpanBars } from './history';
import { NO_ANALYSIS, type FloatCell, type FloatCellReason, type FloatLedger, type SplitProof } from './insiderBound';
import { splitProofFromBars, withAnnouncedSplits, type SpanBar } from './splitProof';
import type { ResearchAnalysisVersion } from './types';

const wholeDays = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** A row read more than the reuse span before D, or after it, is not reused (contract 9b). */
const notReused = (row: FloatBoundRow, d: string) => row.asOfDate > d || wholeDays(row.asOfDate, d) > FLOAT_REUSE_DAYS;

/** The split proof between the filed count's date and D: the ONE computation the cell and `countChecks` share. */
function splitSinceCountAt(row: FloatBoundRow & { count: { kind: 'COUNT'; asOf: string } }, d: string, countSpanBars: readonly SpanBar[]): SplitProof {
  return withAnnouncedSplits(splitProofFromBars(countSpanBars, d), row.announcedSplits, row.count.asOf, d);
}

/**
 * The cell at D. `row` is the newest stored row on or before D (null: the job has not run, NOT_YET). `ledger` is the
 * dossier's ledger current at D, `NO_ANALYSIS` when a successful read found none (L8: `filingsOnly`), or null when the
 * caller could not tell (ISSUANCE_NOT_CHECKED); passed through unchanged, so the job and the reader decide alike.
 */
export function floatCellAt(row: FloatBoundRow | null, d: string, ledger: FloatLedger, countSpanBars: readonly SpanBar[]): FloatCell | null {
  if (!row) return null;
  if (notReused(row, d)) return { state: 'CANNOT_VERIFY', reason: 'FILINGS_NOT_REREAD' };
  const splitSinceCount = row.count.kind === 'COUNT' ? splitSinceCountAt({ ...row, count: row.count }, d, countSpanBars) : row.splitSinceCount;
  // Rule I-D re-applied at D over the stored filings; one made after the row's read is unseen (the reuse span bounds it).
  const issuanceFiled = row.count.kind === 'COUNT' && issuanceFiledIn(row.issuanceFilings, row.count.asOf, d);
  // L6: the same restatement the job ran, at D, from the row's listed actions (fetched through the reuse span) and the bars.
  return floatCellFor({
    cik: row.cik, count: row.count, holdings: row.holdings, splitSinceCount, ledger, asOfDate: d, issuanceFiled,
    restate: { actions: row.announcedActions, countSpanBars },
  });
}

/**
 * Both results the face needs to decide how it shows the FILED count on a refused row (float fix 1: his "3, yes",
 * Integration chat 1f30f0a2, user uuid fbafcf83, 2026-10-13T09:39:59.808Z; Integration 39th's ruling, option (i), payload
 * only; the shape agreed with Design and Integration 2026-10-13). The payload carries the results; WHAT the face does with
 * them is Design's view, under his later ruling (same chat, uuid 867ffe18, 2026-10-13T09:57:22.409Z: "3, no show a number
 * and another icon with a link and a tooltip, yes, with warning"), not this file's. `floatCell` stops at the first
 * failing check in the prereg's order, so a row refused for issuance never REPORTS its split or age; both are computed
 * here with the same inputs and code. NOT_RUN only where a check could not be computed: both with no filed count; the
 * split alone when the filings were not re-read (FILINGS_NOT_REREAD), whose age is still computed (Integration 39th).
 * Stored state, reasons and the precedence are unchanged.
 */
export interface FloatCountChecks {
  /** The split check between the filed count's date and D. */
  split: SplitProof | 'NOT_RUN';
  /** The count's age at D against FLOAT_MAX_AGE_DAYS (90): AFTER_DATE is a count dated after D (the cell's look-ahead fault). */
  age: 'WITHIN' | 'TOO_OLD' | 'AFTER_DATE' | 'NOT_RUN';
}

export const CHECKS_NOT_RUN: FloatCountChecks = { split: 'NOT_RUN', age: 'NOT_RUN' };

export function countChecksAt(row: FloatBoundRow | null, d: string, countSpanBars: readonly SpanBar[]): FloatCountChecks {
  if (!row || row.count.kind !== 'COUNT') return CHECKS_NOT_RUN;
  const days = wholeDays(row.count.asOf, d);
  const age = days < 0 ? 'AFTER_DATE' : days > FLOAT_MAX_AGE_DAYS ? 'TOO_OLD' : 'WITHIN';
  // FILINGS_NOT_REREAD (Integration 39th): the age is arithmetic on the count's date and D, so it is still known. The
  // split is not: the row's announced splits were read only through its own read date, and rule R-A needs both
  // sources, so the bars alone could say NONE across a split announced since.
  if (notReused(row, d)) return { split: 'NOT_RUN', age };
  return { split: splitSinceCountAt({ ...row, count: row.count }, d, countSpanBars), age };
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
  /**
   * Every row Research builds, PRODUCED included (`countChecksAt`): the split and age results for the filed count; how the
   * face shows the count (and which results carry a warning) is Design's view. Optional in the TYPE only, for objects built elsewhere (a synthesized cell, an older
   * stored payload); Design's reader takes a missing value as NOT_RUN, the value that claims least.
   */
  countChecks?: FloatCountChecks;
  /**
   * L7 (his "yes to all three", 2026-10-13T21:36:56.972Z; Research's "Design adds it"): where the count came from.
   * `stated`: a later filing states it, and the count fields ARE that filing's (form, filed, asOf). The rest is the read
   * of later filings (`StatedCountCheck`). Absent when the row has no read (an older row, or no cover count): today's words.
   */
  countSource?: FloatCountSource;
  /**
   * L8, for Design (his "(b)", choice 2 of docs/research/float-options/float-tool-sizing-2026-10-09.md; Marketing's words
   * approved at 84d0b9fd, docs/marketing/float-l8-words-2026-10-14.md): PRODUCED only, and only ever `true`. The desk has
   * no research on the name as of D, so the bound is the filed count less insiders with every check on the filings run
   * (filed issuance, foreign annual form, split since the count, age, range) but no check of warrants, convertible notes
   * or share-sale programs already in place. The face is the bound plus the circled i; the hover, the panel line and the
   * accessible name say "the true figure may be higher". Absent on a PRODUCED cell computed with a ledger, and on every
   * refused cell. A name researched later loses it at the next read, because the reader takes the dossier current at D.
   */
  filingsOnly?: true;
  /**
   * L6: PRODUCED only, the count restated across listed splits (floatRestate.ts `Restatement`, the fields Design's face
   * reads: splits oldest first as { exDate, oldRate, newRate }, factor, restatedShares, provenByBars). `countShares`
   * stays the FILED count; `bound` and every `insiders[].shares` are in the restated units, so restatedShares less the
   * insiders is the bound (Commercial read 114 (1)). Absent on a bound that was not restated.
   */
  restated?: Restatement;
}

export interface FloatCountSource {
  stated: boolean;
  read: number;
  unread: number;
  capped: number;
  /** The newest date that carried different counts (none used), or null. */
  conflictAsOf: string | null;
}

/** The row's later-filing read, for the face (L7). Undefined when the row has none. */
export function countSourceOf(row: FloatBoundRow): FloatCountSource | undefined {
  const s = row.statedCount;
  if (!s) return undefined;
  return { stated: s.found != null, read: s.read, unread: s.unread, capped: s.capped, conflictAsOf: s.conflict?.asOf ?? null };
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

/** L8's mark, copied from the cell (never re-derived here): `{ filingsOnly: true }` or nothing. */
const filingsOnlyOf = (cell: FloatCell & { state: 'PRODUCED' }): { filingsOnly?: true } => (cell.filingsOnly ? { filingsOnly: true } : {});

export function toFloatBound(row: FloatBoundRow, cell: FloatCell, countChecks: FloatCountChecks): FloatBound {
  const count = row.count.kind === 'COUNT' ? row.count : null;
  const source = countSourceOf(row);
  const filed = { countShares: count?.shares ?? null, countForm: count?.form ?? null, countChecks, ...(source ? { countSource: source } : {}) };
  return cell.state === 'PRODUCED'
    ? { state: 'PRODUCED', reason: null, bound: cell.bound, countAsOf: count?.asOf ?? null, countFiled: count?.filed ?? null, subtractedHolders: cell.holdings.filter((h) => h.shares > 0).length, filingsReadOn: row.asOfDate, holdingsFiledOn: filedOn(row, cell), ...filed, insiders: insidersOf(row, cell), ...filingsOnlyOf(cell), ...(cell.restated ? { restated: cell.restated } : {}) }
    : { state: cell.state, reason: cell.reason, bound: null, countAsOf: count?.asOf ?? null, countFiled: count?.filed ?? null, subtractedHolders: 0, filingsReadOn: row.asOfDate, holdingsFiledOn: [], ...filed, insiders: [] };
}

/**
 * The ledger at D from the current-dossier read (Commercial's condition 1 for L8). `NO_ANALYSIS` only when the read could
 * see the research tables (`researchTablesPresent`, the same guard `readCurrentAnalyses` applies) and found no current
 * analysis for the name. A store without them answers "none" without reading anything, so it is null (could not tell),
 * as is a dossier with no ledger; a read that throws never reaches here (`readFloatBoundsAt` throws, the board faults).
 */
export function ledgerAt(researchRead: boolean, found: ResearchAnalysisVersion | undefined): FloatLedger {
  if (!found) return researchRead ? NO_ANALYSIS : null;
  return found.dossier.structure.supplyLedger ?? null;
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
  const researchRead = researchTablesPresent(db);
  const dossiers = readCurrentAnalyses(db, [...symbols]);
  for (const symbol of symbols) {
    const row = readLatestFloatBound(db, symbol, d);
    if (!row) {
      out[symbol] = null;
      continue;
    }
    const ledger = ledgerAt(researchRead, dossiers.get(symbol));
    const bars = row.count.kind === 'COUNT' ? readSpanBars(db, symbol, row.count.asOf, d) : [];
    out[symbol] = toFloatBound(row, floatCellAt(row, d, ledger, bars)!, countChecksAt(row, d, bars));
  }
  return out;
}
