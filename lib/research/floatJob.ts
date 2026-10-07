/**
 * The float JOB: the validated pipeline (`docs/research/float-contract/validate.ts`, `collect`) moved into lib, the
 * audit removed, and ONE rule changed: holdings follow rule S1 (contract section 9a, `holdingsAtBoth`), because the
 * validated rule subtracted an insider who sold after the count at the larger holding. Plan:
 * docs/research/float-contract/build-plan-2026-10-05.md.
 *
 * One call per researched symbol, after the research job has saved its dossier. No model, $0: SEC fetches through the
 * caller's rate-limited client. The fetch and the store are injected so every rule can be tested against fakes.
 *
 * What may NOT happen here: a failed FETCH must never be stored as a fact about the company. A companyfacts or
 * submissions request that throws aborts the call (no row, the cell stays NOT_YET); only a fetched answer of "no count"
 * is UNKNOWN / NO_FILED_COUNT. The validation recorded a fetch error as NO_FILED_COUNT, which was harmless in a sample
 * and would be a false sentence on the board.
 */
import {
  floatCell,
  holdingsAtBoth,
  parseSection16,
  type FloatCell,
  type IssuanceRule,
  type OwnerFiling,
  type S1Holding,
  type SplitProof,
} from './insiderBound';
import { selectFiledCount, type CompanyFactsShares, type FiledCount } from './filedCount';
import { splitProofFromBars, splitProofR0, withAnnouncedSplits, type SpanBar } from './splitProof';
import type { SupplyBlock } from './types';

/** His ruling, 2026-10-05T21:22:37.844Z: the filed count may be at most 90 days old. NOT `FILED_SHARES_CURRENT_DAYS`. */
export const FLOAT_MAX_AGE_DAYS = 90;
/** The contract's rule (section 5): KNOWN_ACTIVE and POSSIBLY_ACTIVE. Open for his ruling; one constant. */
export const FLOAT_ISSUANCE_RULE: IssuanceRule = 'KNOWN_OR_POSSIBLY_ACTIVE';
/** Section 16 filings older than this are not read; an owner whose only holding is older is not subtracted. */
export const FLOAT_WINDOW_DAYS = 730;
/** Contract 9b: a row's fetch may be reused for at most this many calendar days after it was read. */
export const FLOAT_REUSE_DAYS = 4;

const SECTION16 = new Set(['3', '3/A', '4', '4/A', '5', '5/A']);

export interface StoredHolding extends S1Holding {
  /** R0, from the h0 as-of date to the count's. Only NONE is subtracted; `shares` is S1's min(h0, hD) summed. */
  split: SplitProof;
}

export interface FloatBoundRow {
  symbol: string;
  /** The ET date the job computed the cell for; the age and the count-span proof are measured to it. */
  asOfDate: string;
  cik: string | null;
  count: FiledCount;
  holdings: StoredHolding[];
  splitSinceCount: SplitProof;
  /**
   * Alpaca's announced split ex-dates (rule R-A) from the earliest holding's date through `asOfDate` + FLOAT_REUSE_DAYS
   * (published ahead, so a reader reusing the row within its span can check them); null = the fetch failed. Empty when
   * there was no count (nothing fetched).
   */
  announcedSplits: string[] | null;
  /**
   * Rule I-D: every 424B1/2/4/5 and 8-K item 3.02 in the submissions listing filed on or after the count's date, so a
   * reader at a later D re-applies [count, D]. Empty when there was no count (nothing fetched).
   */
  issuanceFilings: IssuanceFiling[];
  /** The dossier whose ledger was read; null = none existed (ISSUANCE_NOT_CHECKED). */
  analysisVersionId: number | null;
  issuanceRule: IssuanceRule;
  maxAgeDays: number;
  cell: FloatCell;
  computedAt: string;
}

export interface SubmissionsRecent {
  filings: { recent: { accessionNumber: string[]; form: string[]; filingDate: string[]; primaryDocument: string[]; items?: string[] } };
}

/** Rule I-D: a filing that reports an offering or a sale of equity (filed-issuance-registration-2026-10-06.md). */
export interface IssuanceFiling {
  form: string;
  filingDate: string;
  accession: string;
  items: string;
}

/**
 * Final prospectuses for an offering or a shelf takedown. 424B2 added 2026-10-07 (Integration's call, on Commercial read
 * 21: Rule 424(b)(2) is a primary shelf takedown; b2-count-result-2026-10-07.md found none in 60 windows). NOT 424B3
 * (open: Commercial reads 424(b)(3) as a catch-all; its filings are being classified before any change), S-1, S-3, S-8.
 */
const OFFERING_PROSPECTUS = new Set(['424B1', '424B2', '424B4', '424B5']);

export interface FloatJobDeps {
  getJson: <T>(url: string) => Promise<T>;
  getText: (url: string) => Promise<string>;
  spanBars: (symbol: string, from: string, to: string) => SpanBar[];
  /** Alpaca's announced split ex-dates for the symbol in [start, end]; throws on failure. */
  announcedSplits: (symbol: string, start: string, end: string) => Promise<string[]>;
  now: () => string;
}

export interface FloatJobInput {
  symbol: string;
  cik: string | null;
  asOfDate: string;
  /** null = no dossier as of `asOfDate`. */
  dossier: { analysisVersionId: number; ledger: readonly SupplyBlock[] } | null;
}

const pad10 = (cik: string) => cik.padStart(10, '0');
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

/** The raw XML of a Section 16 filing: the primary document without the xsl rendering prefix (validate.ts `rawUrl`). */
export function section16XmlUrl(cik: string, accession: string, primaryDocument: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${primaryDocument.replace(/^xsl[^/]*\//, '')}`;
}

/** Forms 3, 4, 5 and their amendments filed in [since, until], from the submissions listing (recent page only). */
export function section16Filings(data: SubmissionsRecent, since: string, until: string): Array<{ accession: string; form: string; filingDate: string; primaryDocument: string }> {
  const r = data.filings.recent;
  const out: Array<{ accession: string; form: string; filingDate: string; primaryDocument: string }> = [];
  for (let i = 0; i < r.accessionNumber.length; i += 1) {
    const form = r.form[i]!;
    const filingDate = r.filingDate[i]!;
    if (!SECTION16.has(form) || filingDate < since || filingDate > until) continue;
    out.push({ accession: r.accessionNumber[i]!, form, filingDate, primaryDocument: r.primaryDocument[i]! });
  }
  return out;
}

/** Rule I-D's filings in the listing dated on or after `from` (the count's as-of date): offering prospectuses and 8-Ks with item 3.02. */
export function issuanceFilings(data: SubmissionsRecent, from: string): IssuanceFiling[] {
  const r = data.filings.recent;
  const out: IssuanceFiling[] = [];
  for (let i = 0; i < r.accessionNumber.length; i += 1) {
    const form = r.form[i]!;
    const filingDate = r.filingDate[i]!;
    if (filingDate < from) continue;
    const items = r.items?.[i] ?? '';
    const item302 = (form === '8-K' || form === '8-K/A') && items.split(',').map((s) => s.trim()).includes('3.02');
    if (OFFERING_PROSPECTUS.has(form) || item302) out.push({ form, filingDate, accession: r.accessionNumber[i]!, items });
  }
  return out;
}

/** Rule I-D at D: any stored filing dated in [countAsOf, d], the count's own date inside (registration section 1). */
export function issuanceFiledIn(filings: readonly IssuanceFiling[], countAsOf: string, d: string): boolean {
  return filings.some((f) => f.filingDate >= countAsOf && f.filingDate <= d);
}

/** Whether the listing reaches back to `date`: its earliest filing is on or before it. Otherwise "no hit" is unproven. */
export function listingReaches(data: SubmissionsRecent, date: string): boolean {
  const dates = data.filings.recent.filingDate;
  return dates.length > 0 && dates.reduce((min, d) => (d < min ? d : min)) <= date;
}

export async function computeFloatBound(input: FloatJobInput, deps: FloatJobDeps): Promise<FloatBoundRow> {
  const { symbol, asOfDate } = input;
  const cik = input.cik ? input.cik.replace(/^0+/, '') : null;
  const base = {
    symbol,
    asOfDate,
    cik,
    analysisVersionId: input.dossier?.analysisVersionId ?? null,
    issuanceRule: FLOAT_ISSUANCE_RULE,
    maxAgeDays: FLOAT_MAX_AGE_DAYS,
  };

  let count: FiledCount = { kind: 'NO_FILED_COUNT' };
  const holdings: StoredHolding[] = [];
  let splitSinceCount: SplitProof = 'UNPROVEN';
  let announcedSplits: string[] | null = [];
  let issuanceList: IssuanceFiling[] = [];

  if (cik) {
    // A throw here propagates: a failed fetch is not "no count".
    const facts = await deps.getJson<CompanyFactsShares>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad10(cik)}.json`);
    count = selectFiledCount(facts, asOfDate);
    if (count.kind === 'COUNT') {
      const since = addDays(asOfDate, -FLOAT_WINDOW_DAYS);
      const submissions = await deps.getJson<SubmissionsRecent>(`https://data.sec.gov/submissions/CIK${pad10(cik)}.json`);
      // Rule I-D: a listing that does not reach the count's date cannot prove "no filed issuance": no row, like a failed fetch.
      if (!listingReaches(submissions, count.asOf)) throw new Error(`submissions listing for ${symbol} does not reach the count date ${count.asOf}`);
      issuanceList = issuanceFilings(submissions, count.asOf);
      const owners: OwnerFiling[] = [];
      for (const meta of section16Filings(submissions, since, asOfDate)) {
        // One unreadable Form 4 leaves that owner out, which can only leave the bound higher (validate.ts did the same).
        let xml: string;
        try {
          xml = await deps.getText(section16XmlUrl(cik, meta.accession, meta.primaryDocument));
        } catch {
          continue;
        }
        const parse = parseSection16(xml);
        if (parse.ok) owners.push({ accession: meta.accession, filingDate: meta.filingDate, parse });
      }
      // Rule S1 (contract 9a): both holdings per owner and class, so a sale since the count is subtracted at what is left.
      const found = holdingsAtBoth(owners, count.asOf, asOfDate, since);
      // Rule R-A: one fetch over every span this row's proofs cover, through the reuse span; a failure refuses (null).
      const start = [count.asOf, ...found.map((h) => h.asOf)].sort()[0]!;
      try {
        announcedSplits = (await deps.announcedSplits(symbol, start, addDays(asOfDate, FLOAT_REUSE_DAYS))).sort();
      } catch {
        announcedSplits = null;
      }
      for (const holding of found) {
        const r0 = splitProofR0(deps.spanBars(symbol, holding.asOf, count.asOf), holding.asOf, count.asOf);
        holdings.push({ ...holding, split: withAnnouncedSplits(r0, announcedSplits, holding.asOf, count.asOf) });
      }
      const r1 = splitProofFromBars(deps.spanBars(symbol, count.asOf, asOfDate), asOfDate);
      splitSinceCount = withAnnouncedSplits(r1, announcedSplits, count.asOf, asOfDate);
    }
  }

  const issuanceFiled = count.kind === 'COUNT' && issuanceFiledIn(issuanceList, count.asOf, asOfDate);
  const cell = floatCellFor({ cik, count, holdings, splitSinceCount, ledger: input.dossier?.ledger ?? null, asOfDate, issuanceFiled });
  return { ...base, count, holdings, splitSinceCount, announcedSplits, issuanceFilings: issuanceList, cell, computedAt: deps.now() };
}

/** The cell from stored inputs: the one place `floatCell` is called with the job's constants. */
export function floatCellFor(input: {
  cik: string | null;
  count: FiledCount;
  holdings: readonly StoredHolding[];
  splitSinceCount: SplitProof;
  ledger: readonly SupplyBlock[] | null;
  asOfDate: string;
  /** Rule I-D at `asOfDate`; required here, so no production path can leave it out. */
  issuanceFiled: boolean;
}): FloatCell {
  return floatCell({
    cik: input.cik,
    count: input.count.kind === 'COUNT' ? { shares: input.count.shares, asOf: input.count.asOf } : null,
    spreadAcrossFilings: input.count.kind === 'COUNT_SPLIT_ACROSS_FILINGS',
    checkpointDate: input.asOfDate,
    maxAgeDays: FLOAT_MAX_AGE_DAYS,
    holdings: input.holdings,
    holdingSplit: new Map(input.holdings.map((h) => [h.ownerCik, h.split])),
    splitSinceCount: input.splitSinceCount,
    ledger: input.ledger,
    issuanceFiled: input.issuanceFiled,
    issuanceRule: FLOAT_ISSUANCE_RULE,
  });
}
