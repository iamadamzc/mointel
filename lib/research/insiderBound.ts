/**
 * The insider-only SEC float bound: filed share count minus insiders' direct holdings,
 * both as of ONE date. Contract: docs/research/float-contract/contract-2026-10-05.md.
 *
 * Pure functions, no I/O. The fetch, the split proof and the dossier are the caller's;
 * they arrive here as plain inputs so every rule can be tested against a fixture.
 *
 * The one thing this file exists to get right: a holding is subtracted only if it is
 * dated AT OR BEFORE the count's as-of date. A holding dated after the count can include
 * shares the count does not, and subtracting it moves the bound too LOW.
 */
import type { Restatement } from './floatRestate';
import type { SupplyBlock } from './types';

/* ----------------------------------------------------------------- parsing */

export interface Section16Row {
  /** ISO date the row's holding stands at (transaction date, or the report period). */
  asOf: string;
  /** Lower-cased security title, the grouping key for one class. */
  title: string;
  shares: number;
}

export type Section16Parse =
  | { ok: true; ownerCik: string; ownerName: string | null; rows: Section16Row[] }
  | { ok: false; reason: string };

function inner(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? match[1]! : null;
}

/** A field written either as <tag><value>x</value></tag> or <tag>x</tag>. */
function field(xml: string, tag: string): string | null {
  const body = inner(xml, tag);
  if (body === null) return null;
  return (inner(body, 'value') ?? body).trim();
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = (value: string | null) => (value !== null && ISO.test(value.slice(0, 10)) ? value.slice(0, 10) : null);

/**
 * One Form 3/4/5. Only a SINGLE-owner filing is attributed (a joint filing is not, which
 * can only leave the bound higher). Only direct (D) non-derivative common or ordinary rows.
 * A Form 4 transaction row stands at its transactionDate; a holding row (Form 3/5, or a
 * Form 4 holding) stands at the filing's periodOfReport.
 */
export function parseSection16(xml: string): Section16Parse {
  const owners = [...xml.matchAll(/<reportingOwner>([\s\S]*?)<\/reportingOwner>/g)].map((m) => m[1]!);
  if (owners.length !== 1) return { ok: false, reason: `${owners.length} reporting owners (joint filing, not attributed)` };
  const owner = owners[0]!;
  const period = isoDate(field(xml, 'periodOfReport'));
  const rows: Section16Row[] = [];
  for (const match of xml.matchAll(/<(nonDerivativeTransaction|nonDerivativeHolding)>([\s\S]*?)<\/\1>/g)) {
    const kind = match[1]!;
    const row = match[2]!;
    const title = (field(row, 'securityTitle') ?? '').toLowerCase();
    if (!/common|ordinary/i.test(title)) continue;
    if (field(row, 'directOrIndirectOwnership') !== 'D') continue;
    const shares = Number((field(row, 'sharesOwnedFollowingTransaction') ?? '').replace(/,/g, ''));
    if (!Number.isFinite(shares) || shares < 0) continue;
    const asOf = kind === 'nonDerivativeTransaction' ? isoDate(field(row, 'transactionDate')) : period;
    if (asOf === null) continue;
    rows.push({ asOf, title, shares });
  }
  if (rows.length === 0) return { ok: false, reason: 'no direct common-stock row with a date' };
  return {
    ok: true,
    ownerCik: (field(owner, 'rptOwnerCik') ?? '').replace(/^0+/, ''),
    ownerName: field(owner, 'rptOwnerName'),
    rows,
  };
}

/* ----------------------------------------------------- as-of holding choice */

export interface OwnerFiling {
  accession: string;
  filingDate: string;
  parse: Extract<Section16Parse, { ok: true }>;
}

export interface OwnerHolding {
  ownerCik: string;
  ownerName: string | null;
  /** Direct common shares across classes, each class at its latest row on or before the cutoff. */
  shares: number;
  /** The latest as-of date among the rows used. */
  asOf: string;
  accessions: string[];
}

/**
 * A holding with the FILED dates of the filings its rows came from (one per accession), for the
 * popover's "less insider holdings filed on {dates}" (Integration 30th, choice (a)). `asOf` is the
 * row's own date (transaction or period), never a filed date.
 */
export interface DatedHolding extends OwnerHolding {
  filingDates: string[];
}

/**
 * Per owner, per class, the latest row whose as-of date is ON OR BEFORE `cutoff` (the count's
 * as-of date), taken across every filing of that owner, including a filing made after the
 * cutoff (a late Form 4). Ties break to the later filing date, then accession; within one filing, to the smallest
 * value on that date. An owner with no
 * eligible row is absent from the result, which leaves the bound higher.
 *
 * `windowStart` drops a row older than the filing window; such an owner is also not subtracted.
 */
export function holdingsAsOf(filings: readonly OwnerFiling[], cutoff: string, windowStart: string): DatedHolding[] {
  type Best = { row: Section16Row; filingDate: string; accession: string };
  const byOwner = new Map<string, { name: string | null; titles: Map<string, Best> }>();
  for (const filing of filings) {
    const { ownerCik, ownerName, rows } = filing.parse;
    const entry = byOwner.get(ownerCik) ?? { name: ownerName, titles: new Map<string, Best>() };
    byOwner.set(ownerCik, entry);
    for (const row of rows) {
      if (row.asOf > cutoff || row.asOf < windowStart) continue;
      const current = entry.titles.get(row.title);
      const order = current ? (filing.filingDate + filing.accession).localeCompare(current.filingDate + current.accession) : 0;
      // Several rows of one filing on one date (a run of trades): the SMALLEST, never the first. The holding after the
      // day is the last row; the smallest is never more than it, in any row order, so the bound can only rise
      // (S1 result 32f5e351: the first row over-subtracted 5 of 81 owners).
      const better =
        !current ||
        row.asOf > current.row.asOf ||
        (row.asOf === current.row.asOf && (order > 0 || (order === 0 && row.shares < current.row.shares)));
      if (better) entry.titles.set(row.title, { row, filingDate: filing.filingDate, accession: filing.accession });
    }
  }
  const out: DatedHolding[] = [];
  for (const [ownerCik, entry] of byOwner) {
    const best = [...entry.titles.values()];
    if (best.length === 0) continue;
    out.push({
      ownerCik,
      ownerName: entry.name,
      shares: best.reduce((sum, b) => sum + b.row.shares, 0),
      asOf: best.map((b) => b.row.asOf).sort().at(-1)!,
      accessions: [...new Set(best.map((b) => b.accession))].sort(),
      filingDates: [...new Set(best.map((b) => b.filingDate))].sort(),
    });
  }
  return out.sort((a, b) => a.ownerCik.localeCompare(b.ownerCik));
}

/* ------------------------------------------- rule S1: sales after the count */

export interface ClassHolding {
  title: string;
  /** The latest row on or before the count's as-of date (the as-of alignment above). */
  h0: number;
  h0AsOf: string;
  /** The latest row on or before D, over the filings read; equal to h0 when nothing later was filed. */
  hD: number;
  hDAsOf: string;
}

/**
 * An owner under rule S1: `shares` is what is subtracted, the SMALLEST over titles of min(h0, hD) (one title: that
 * title's). `asOf` is that title's count-date holding (h0), the span the job's split proof covers. `heldAsOf`,
 * `accessions` and `filingDates` are those of the holding ACTUALLY subtracted, the smaller of h0 and hD (Commercial
 * read 23, Integration's names ruling). `classes` keeps every title, for the record.
 */
export interface S1Holding extends DatedHolding {
  classes: ClassHolding[];
  /** The title subtracted (the smallest, 2add4b2b). Optional: a row stored before it carries none. */
  title?: string;
  /** The date of the holding subtracted (hD after a sale since the count, else h0). Optional, as `title`. */
  heldAsOf?: string;
}

/**
 * Rule S1 (registration docs/research/float-contract/insider-sale-registration-2026-10-05.md; contract section 9a).
 * Per owner and class: h0 by `holdingsAsOf` at the count's date, hD by `holdingsAsOf` at D, each one class at a time so
 * the selection is the validated one. Subtract min(h0, hD): a sale since the count subtracts what is left, a purchase
 * or grant subtracts h0. An owner or class with no h0 is not subtracted, whatever it filed later. An owner with several
 * titles subtracts only the smallest title's min(h0, hD), never their sum (2026-10-07, Integration's yes).
 */
export function holdingsAtBoth(filings: readonly OwnerFiling[], countAsOf: string, d: string, windowStart: string): S1Holding[] {
  const titles = [...new Set(filings.flatMap((f) => f.parse.rows.map((row) => row.title)))].sort();
  type Titled = { holding: ClassHolding; heldAsOf: string; accessions: string[]; filingDates: string[] };
  const byOwner = new Map<string, { name: string | null; titled: Titled[] }>();
  for (const title of titles) {
    const only = filings.map((f) => ({ ...f, parse: { ...f.parse, rows: f.parse.rows.filter((row) => row.title === title) } }));
    const atD = new Map(holdingsAsOf(only, d, windowStart).map((h) => [h.ownerCik, h]));
    for (const h0 of holdingsAsOf(only, countAsOf, windowStart)) {
      const hD = atD.get(h0.ownerCik) ?? h0;
      const entry = byOwner.get(h0.ownerCik) ?? { name: h0.ownerName, titled: [] };
      // The holding subtracted is min(h0, hD); its date and filings, never the other's, describe it.
      const taken = hD.shares < h0.shares ? hD : h0;
      entry.titled.push({
        holding: { title, h0: h0.shares, h0AsOf: h0.asOf, hD: hD.shares, hDAsOf: hD.asOf },
        heldAsOf: taken.asOf,
        accessions: [...taken.accessions],
        filingDates: [...taken.filingDates],
      });
      byOwner.set(h0.ownerCik, entry);
    }
  }
  const held = (t: Titled) => Math.min(t.holding.h0, t.holding.hD);
  return [...byOwner.entries()]
    .map(([ownerCik, e]) => {
      // Several titles: only the SMALLEST is subtracted. One security filed under two titles ("common stock" and
      // "common stock, $0.0001 par value", KITT 2143744) was subtracted twice (S1 result 72bf286c); the smallest is never
      // more than the true holding, whether the titles are variants or real classes. Titles are not normalised.
      const chosen = e.titled.reduce((best, t) => (held(t) < held(best) ? t : best));
      return {
        ownerCik,
        ownerName: e.name,
        shares: held(chosen),
        title: chosen.holding.title,
        heldAsOf: chosen.heldAsOf,
        asOf: chosen.holding.h0AsOf,
        accessions: [...new Set(chosen.accessions)].sort(),
        filingDates: [...new Set(chosen.filingDates)].sort(),
        classes: e.titled.map((t) => t.holding),
      };
    })
    .sort((a, b) => a.ownerCik.localeCompare(b.ownerCik));
}

/* ------------------------------------------------------------ the cell state */

export type FloatCellReason =
  | 'NO_FILED_COUNT'
  | 'NO_CIK'
  | 'COUNT_SPLIT_ACROSS_FILINGS'
  | 'COUNT_TOO_OLD'
  | 'ISSUANCE_FLAGGED'
  /**
   * The ledger could not be read (`ledger` null) or was unusable. Since L8 a SUCCESSFUL read that found no analysis is
   * `NO_ANALYSIS` and reads PRODUCED with `filingsOnly` instead; rows stored before L8 also carry this reason for a name
   * with no dossier, which is why it stays in the type.
   */
  | 'ISSUANCE_NOT_CHECKED'
  /** Rule I-D (filed-issuance-registration-2026-10-06.md): a 424B1/2/4/5 or an 8-K item 3.02 filed on or after the count's date. */
  | 'ISSUANCE_FILED'
  /**
   * Integration's ruling 2026-10-07, option (a) of foreign-filer-cell-2026-10-07.md: the count is from a 20-F or 40-F, so
   * the company reports on Form 6-K, and I-D's 8-K item 3.02 half cannot run. A check that cannot run cannot clear a name.
   */
  | 'UNREGISTERED_SALE_NOT_CHECKABLE'
  | 'SPLIT_SINCE_COUNT'
  | 'BOUND_OUT_OF_RANGE'
  /** SEC answered companyfacts with 404: no count could be READ (says nothing about what was filed). Integration 36th, MTR. */
  | 'COMPANY_FACTS_NOT_AVAILABLE'
  /** Contract 9b: the newest read of the filings is more than the reuse span before D. Set by the reader, never by `floatCell`. */
  | 'FILINGS_NOT_REREAD';

export type FloatCell =
  | {
      state: 'PRODUCED';
      bound: number;
      subtracted: number;
      holdings: OwnerHolding[];
      refused: RefusedHolding[];
      /**
       * L8 (his "(b)", choice 2 of docs/research/float-options/float-tool-sizing-2026-10-09.md): the ledger was
       * `NO_ANALYSIS` (a successful read found no analysis for the name as of the checkpoint), so the ledger's check
       * (instruments already in place at the count) did not run; every check on the filings did. Present only as `true`;
       * a cell computed with a ledger carries no such field.
       */
      filingsOnly?: true;
      /**
       * L6: the count was restated across listed splits (floatRestate.ts); `bound` is measured from `restatedShares` and
       * `holdings` are in the same units. Set only by `floatCellFor`, after `floatCell` produced: absent otherwise.
       */
      restated?: Restatement;
    }
  | { state: 'UNKNOWN' | 'CANNOT_VERIFY'; reason: FloatCellReason };

export interface RefusedHolding {
  ownerCik: string;
  why: 'SPLIT_BETWEEN_HOLDING_AND_COUNT' | 'SPLIT_UNPROVEN';
}

export type SplitProof = 'NONE' | 'FOUND' | 'UNPROVEN';

/** Types that create shares after a count's date. Resale registration and shelf capacity create none. */
const ISSUING_TYPES = new Set([
  'ATM',
  'EQUITY_PURCHASE_AGREEMENT',
  'WARRANTS',
  'CONVERTIBLES',
  'PREFERRED_CONVERSION',
  'RECENT_OFFERING',
  'PIPE',
  'ACQUISITION_SHARES',
  'OTHER_ISSUED_SHARES',
]);

export type IssuanceRule = 'KNOWN_ACTIVE' | 'KNOWN_OR_POSSIBLY_ACTIVE';

/** True when the ledger carries a block that may have created shares since the count. effectiveDate is NOT consulted. */
export function issuanceFlagged(ledger: readonly SupplyBlock[], rule: IssuanceRule): boolean {
  return ledger.some((block) => {
    if (!ISSUING_TYPES.has(block.type)) return false;
    if (block.status === 'KNOWN_ACTIVE') return true;
    return rule === 'KNOWN_OR_POSSIBLY_ACTIVE' && block.status === 'POSSIBLY_ACTIVE';
  });
}

/**
 * The ledger value for "the read SUCCEEDED and found no analysis for the name" (L8). Distinct from null, which means
 * "could not tell" (a read that failed or found nothing usable) and keeps ISSUANCE_NOT_CHECKED (Commercial's condition 1).
 */
export const NO_ANALYSIS = 'NO_ANALYSIS';

/** A dossier's supply ledger, `NO_ANALYSIS`, or null (could not tell). */
export type FloatLedger = readonly SupplyBlock[] | typeof NO_ANALYSIS | null;

/** A ledger the issuance check can read: an array of objects. Anything else (null included) is "could not tell". */
function usableLedger(ledger: readonly SupplyBlock[] | null): ledger is readonly SupplyBlock[] {
  return Array.isArray(ledger) && ledger.every((block) => block !== null && typeof block === 'object');
}

/** Annual reports of a foreign private issuer, which reports on Form 6-K, never an 8-K item 3.02. */
const FOREIGN_ANNUAL_FORMS = new Set(['20-F', '20-F/A', '40-F', '40-F/A']);

const wholeDays = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

export interface FloatCellInput {
  cik: string | null;
  /** null = no usable count; `spreadAcrossFilings` = the latest date's values come from several filings. */
  /** `form` is the filing the count came from; `floatCellFor` always passes it. Absent only in measurement scripts. */
  count: { shares: number; asOf: string; form?: string } | null;
  spreadAcrossFilings: boolean;
  /** SEC's companyfacts answered 404 (`floatCellFor` always passes it; absent only in measurement scripts). */
  companyFactsNotAvailable?: boolean;
  checkpointDate: string;
  maxAgeDays: number;
  holdings: readonly OwnerHolding[];
  /** Per owner: is there a split between that holding's as-of date and the count's? Missing = UNPROVEN. */
  holdingSplit: ReadonlyMap<string, SplitProof>;
  /** Is there a split between the count's as-of date and the checkpoint? */
  splitSinceCount: SplitProof;
  /**
   * The dossier's ledger as of the checkpoint. `NO_ANALYSIS`: a successful read found none, so the ledger's check is
   * skipped and a PRODUCED cell is `filingsOnly` (L8). null, or a value that is not an array of blocks: could not tell,
   * ISSUANCE_NOT_CHECKED.
   */
  ledger: FloatLedger;
  issuanceRule: IssuanceRule;
  /**
   * Rule I-D: a filing on or after the count's date reports an offering or a sale of equity. The job and the reader
   * always pass it (`floatCellFor` requires it); absent only in the measurement scripts that predate the rule.
   */
  issuanceFiled?: boolean;
}

/**
 * The cell's state, in the prereg's precedence: UNKNOWN, issuance, split since the count, age,
 * range. A holding across a split is refused (not subtracted); it never decides the state.
 *
 * With the ledger `NO_ANALYSIS` (a successful read found no analysis), only the ledger's two checks are skipped; every
 * other check runs in the same order, and a cell that passes them is PRODUCED with `filingsOnly: true` (L8). A null or
 * unusable ledger still refuses as ISSUANCE_NOT_CHECKED, where it always did. The ONE place that rule lives: the job
 * (`floatCellFor`) and the reader (`floatCellAt`) both reach it through here.
 */
export function floatCell(input: FloatCellInput): FloatCell {
  if (!input.cik) return { state: 'UNKNOWN', reason: 'NO_CIK' };
  if (input.companyFactsNotAvailable) return { state: 'UNKNOWN', reason: 'COMPANY_FACTS_NOT_AVAILABLE' };
  if (input.spreadAcrossFilings) return { state: 'UNKNOWN', reason: 'COUNT_SPLIT_ACROSS_FILINGS' };
  if (!input.count) return { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' };
  // I-D before the ledger: a filing is the most specific and checkable cause (registration section 2).
  if (input.issuanceFiled) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FILED' };
  // After a filed issuance (the more specific cause), before the ledger (a structural gap, not a pending review).
  if (input.count.form !== undefined && FOREIGN_ANNUAL_FORMS.has(input.count.form)) {
    return { state: 'CANNOT_VERIFY', reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' };
  }
  // L8: a read that found no analysis skips the ledger's two checks; the cell is marked `filingsOnly` below.
  const ledger = input.ledger;
  if (ledger !== NO_ANALYSIS) {
    if (!usableLedger(ledger)) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' };
    if (issuanceFlagged(ledger, input.issuanceRule)) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' };
  }
  if (input.splitSinceCount !== 'NONE') return { state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' };
  const age = wholeDays(input.count.asOf, input.checkpointDate);
  // A count dated after the checkpoint is a look-ahead: a reconciliation fault, not an old count.
  if (age < 0) return { state: 'CANNOT_VERIFY', reason: 'BOUND_OUT_OF_RANGE' };
  if (age > input.maxAgeDays) return { state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' };

  const used: OwnerHolding[] = [];
  const refused: RefusedHolding[] = [];
  for (const holding of input.holdings) {
    const proof = input.holdingSplit.get(holding.ownerCik) ?? 'UNPROVEN';
    if (proof === 'NONE') used.push(holding);
    else refused.push({ ownerCik: holding.ownerCik, why: proof === 'FOUND' ? 'SPLIT_BETWEEN_HOLDING_AND_COUNT' : 'SPLIT_UNPROVEN' });
  }
  const subtracted = used.reduce((sum, h) => sum + h.shares, 0);
  const bound = input.count.shares - subtracted;
  if (!(bound > 0) || bound > input.count.shares) return { state: 'CANNOT_VERIFY', reason: 'BOUND_OUT_OF_RANGE' };
  const produced = { state: 'PRODUCED' as const, bound, subtracted, holdings: used, refused };
  return ledger === NO_ANALYSIS ? { ...produced, filingsOnly: true as const } : produced;
}
