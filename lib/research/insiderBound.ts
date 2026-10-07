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

/** An owner under rule S1: `shares` is what is subtracted, the sum over classes of min(h0, hD); `asOf` is h0's. */
export interface S1Holding extends DatedHolding {
  classes: ClassHolding[];
}

/**
 * Rule S1 (registration docs/research/float-contract/insider-sale-registration-2026-10-05.md; contract section 9a).
 * Per owner and class: h0 by `holdingsAsOf` at the count's date, hD by `holdingsAsOf` at D, each one class at a time so
 * the selection is the validated one. Subtract min(h0, hD): a sale since the count subtracts what is left, a purchase
 * or grant subtracts h0. An owner or class with no h0 is not subtracted, whatever it filed later.
 */
export function holdingsAtBoth(filings: readonly OwnerFiling[], countAsOf: string, d: string, windowStart: string): S1Holding[] {
  const titles = [...new Set(filings.flatMap((f) => f.parse.rows.map((row) => row.title)))].sort();
  const byOwner = new Map<string, { name: string | null; classes: ClassHolding[]; accessions: Set<string>; filingDates: Set<string> }>();
  for (const title of titles) {
    const only = filings.map((f) => ({ ...f, parse: { ...f.parse, rows: f.parse.rows.filter((row) => row.title === title) } }));
    const atD = new Map(holdingsAsOf(only, d, windowStart).map((h) => [h.ownerCik, h]));
    for (const h0 of holdingsAsOf(only, countAsOf, windowStart)) {
      const hD = atD.get(h0.ownerCik) ?? h0;
      const entry = byOwner.get(h0.ownerCik) ?? { name: h0.ownerName, classes: [], accessions: new Set<string>(), filingDates: new Set<string>() };
      entry.classes.push({ title, h0: h0.shares, h0AsOf: h0.asOf, hD: hD.shares, hDAsOf: hD.asOf });
      for (const a of [...h0.accessions, ...hD.accessions]) entry.accessions.add(a);
      for (const f of [...h0.filingDates, ...hD.filingDates]) entry.filingDates.add(f);
      byOwner.set(h0.ownerCik, entry);
    }
  }
  return [...byOwner.entries()]
    .map(([ownerCik, e]) => ({
      ownerCik,
      ownerName: e.name,
      shares: e.classes.reduce((sum, c) => sum + Math.min(c.h0, c.hD), 0),
      asOf: e.classes.map((c) => c.h0AsOf).sort().at(-1)!,
      accessions: [...e.accessions].sort(),
      filingDates: [...e.filingDates].sort(),
      classes: e.classes,
    }))
    .sort((a, b) => a.ownerCik.localeCompare(b.ownerCik));
}

/* ------------------------------------------------------------ the cell state */

export type FloatCellReason =
  | 'NO_FILED_COUNT'
  | 'NO_CIK'
  | 'COUNT_SPLIT_ACROSS_FILINGS'
  | 'COUNT_TOO_OLD'
  | 'ISSUANCE_FLAGGED'
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
  /** Contract 9b: the newest read of the filings is more than the reuse span before D. Set by the reader, never by `floatCell`. */
  | 'FILINGS_NOT_REREAD';

export type FloatCell =
  | { state: 'PRODUCED'; bound: number; subtracted: number; holdings: OwnerHolding[]; refused: RefusedHolding[] }
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

/** Annual reports of a foreign private issuer, which reports on Form 6-K, never an 8-K item 3.02. */
const FOREIGN_ANNUAL_FORMS = new Set(['20-F', '20-F/A', '40-F', '40-F/A']);

const wholeDays = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

export interface FloatCellInput {
  cik: string | null;
  /** null = no usable count; `spreadAcrossFilings` = the latest date's values come from several filings. */
  /** `form` is the filing the count came from; `floatCellFor` always passes it. Absent only in measurement scripts. */
  count: { shares: number; asOf: string; form?: string } | null;
  spreadAcrossFilings: boolean;
  checkpointDate: string;
  maxAgeDays: number;
  holdings: readonly OwnerHolding[];
  /** Per owner: is there a split between that holding's as-of date and the count's? Missing = UNPROVEN. */
  holdingSplit: ReadonlyMap<string, SplitProof>;
  /** Is there a split between the count's as-of date and the checkpoint? */
  splitSinceCount: SplitProof;
  /** null = no dossier as of the checkpoint (issuance was not checked). */
  ledger: readonly SupplyBlock[] | null;
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
 */
export function floatCell(input: FloatCellInput): FloatCell {
  if (!input.cik) return { state: 'UNKNOWN', reason: 'NO_CIK' };
  if (input.spreadAcrossFilings) return { state: 'UNKNOWN', reason: 'COUNT_SPLIT_ACROSS_FILINGS' };
  if (!input.count) return { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' };
  // I-D before the ledger: a filing is the most specific and checkable cause (registration section 2).
  if (input.issuanceFiled) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FILED' };
  // After a filed issuance (the more specific cause), before "no dossier" (a structural gap, not a pending review).
  if (input.count.form !== undefined && FOREIGN_ANNUAL_FORMS.has(input.count.form)) {
    return { state: 'CANNOT_VERIFY', reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' };
  }
  if (input.ledger === null) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' };
  if (issuanceFlagged(input.ledger, input.issuanceRule)) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' };
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
  return { state: 'PRODUCED', bound, subtracted, holdings: used, refused };
}
