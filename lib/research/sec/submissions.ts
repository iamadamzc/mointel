/**
 * SEC submissions API — filing history for one registrant.
 *
 * The API returns parallel arrays rather than objects, so parsing is index
 * alignment. Anything malformed is skipped rather than throwing: a single bad
 * row must not cost us an issuer's whole filing history.
 */

import { cikPathSegment } from './tickerMap';
import {
  FAMILY_POLICIES,
  formFamily,
  formSpec,
  inferForeignIssuer,
  normaliseForm,
  type FamilyPolicy,
  type FormFamily,
} from './forms';

export function submissionsUrl(cik: string): string {
  return `https://data.sec.gov/submissions/CIK${cik}.json`;
}

export interface SubmissionsResponse {
  cik?: string | number;
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  entityType?: string;
  sicDescription?: string;
  fiscalYearEnd?: string;
  addresses?: { business?: { stateOrCountry?: string }; mailing?: { stateOrCountry?: string } };
  filings?: {
    recent?: Record<string, unknown[]>;
    /** Older filings live in separate paged files we do not fetch by default. */
    files?: Array<{ name: string; filingCount: number }>;
  };
}

export interface Filing {
  accession: string;
  form: string;
  filingDate: string;
  /**
   * When EDGAR ACCEPTED the filing — the moment it became publicly observable.
   *
   * `filingDate` is a bare date, and for months the desk recorded only that,
   * which made every same-day timing question unanswerable and looked like a
   * property of the SOURCE. It is not: this field sits on the same row of
   * `filings.recent` and was simply never read. Verified against a live payload
   * 2026-09-07 before the change was made.
   *
   * Null where the payload omits it, and callers must not synthesise one —
   * a made-up time is worse than no time for the only question this answers.
   */
  acceptanceDateTime: string | null;
  reportDate: string | null;
  primaryDocument: string | null;
  primaryDocDescription: string | null;
  /** 8-K / 6-K item codes, when present. */
  items: string | null;
}

export interface IssuerProfile {
  cik: string;
  name: string | null;
  tickers: string[];
  exchanges: string[];
  entityType: string | null;
  country: string | null;
  /** Null when the filing history does not establish it. */
  foreignIssuer: boolean | null;
  filings: Filing[];
}

function column(recent: Record<string, unknown[]>, key: string): unknown[] {
  const value = recent[key];
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function parseSubmissions(response: SubmissionsResponse, cik: string): IssuerProfile {
  const recent = response.filings?.recent ?? {};

  const accessions = column(recent, 'accessionNumber');
  const forms = column(recent, 'form');
  const filingDates = column(recent, 'filingDate');
  const acceptances = column(recent, 'acceptanceDateTime');
  const reportDates = column(recent, 'reportDate');
  const primaryDocuments = column(recent, 'primaryDocument');
  const descriptions = column(recent, 'primaryDocDescription');
  const items = column(recent, 'items');

  const filings: Filing[] = [];
  for (let i = 0; i < accessions.length; i += 1) {
    const accession = text(accessions[i]);
    const form = text(forms[i]);
    const filingDate = text(filingDates[i]);
    if (!accession || !form || !filingDate) continue;

    filings.push({
      accession,
      form: normaliseForm(form),
      filingDate,
      acceptanceDateTime: text(acceptances[i]),
      reportDate: text(reportDates[i]),
      primaryDocument: text(primaryDocuments[i]),
      primaryDocDescription: text(descriptions[i]),
      items: text(items[i]),
    });
  }

  return {
    cik,
    name: text(response.name),
    tickers: (response.tickers ?? []).map((t) => String(t).toUpperCase()),
    exchanges: (response.exchanges ?? []).map((e) => String(e)),
    entityType: text(response.entityType),
    country: text(response.addresses?.business?.stateOrCountry),
    foreignIssuer: inferForeignIssuer(filings.map((filing) => filing.form)),
    filings,
  };
}

export type OmissionReason = 'BEYOND_FAMILY_CAP' | 'OUTSIDE_LOOKBACK';

export interface OmittedFiling {
  accession: string;
  form: string;
  filingDate: string;
  reason: OmissionReason;
}

export interface FamilyCoverage {
  family: FormFamily;
  policy: FamilyPolicy;
  /** Every filing of this family in the submissions metadata. */
  availableTotal: number;
  /** Those inside the family's operative window. */
  withinLookback: number;
  selected: Filing[];
  omitted: OmittedFiling[];
}

export interface SelectionManifest {
  selected: Filing[];
  families: FamilyCoverage[];
  familiesPresent: FormFamily[];
  familiesAbsent: FormFamily[];
  totalRelevant: number;
  totalSelected: number;
  totalOmitted: number;
}

const ALL_FAMILIES = Object.keys(FAMILY_POLICIES) as FormFamily[];

function isoMonthsBefore(months: number, from: Date): string {
  const date = new Date(from);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Chooses which filings are worth retrieving, family by family.
 *
 * Selecting from one flat "most recent N relevant" list lets whichever form an
 * issuer files most often crowd out everything else: a company issuing 8-Ks
 * weekly buries its own shelf registration on date alone, even though the shelf
 * is what governs how many shares can appear tomorrow. So each family gets its
 * own operative window and its own cap, and a family is never starved by the
 * volume of another.
 *
 * Network use stays bounded by the sum of the per-family caps, and every
 * omission is recorded with a reason rather than disappearing into a count.
 */
export function selectFilingsByFamily(
  filings: readonly Filing[],
  options: { asOf?: Date } = {},
): SelectionManifest {
  const asOf = options.asOf ?? new Date();

  const byFamily = new Map<FormFamily, Filing[]>();
  let totalRelevant = 0;

  for (const filing of filings) {
    const family = formFamily(filing.form);
    if (!family) continue;
    totalRelevant += 1;
    const bucket = byFamily.get(family);
    if (bucket) bucket.push(filing);
    else byFamily.set(family, [filing]);
  }

  const families: FamilyCoverage[] = [];
  const selected: Filing[] = [];

  for (const family of ALL_FAMILIES) {
    const available = byFamily.get(family) ?? [];
    if (available.length === 0) continue;

    const policy = FAMILY_POLICIES[family];
    const cutoff = isoMonthsBefore(policy.lookbackMonths, asOf);

    const omitted: OmittedFiling[] = [];
    const inWindow: Filing[] = [];

    for (const filing of available) {
      if (filing.filingDate < cutoff) {
        omitted.push({
          accession: filing.accession,
          form: filing.form,
          filingDate: filing.filingDate,
          reason: 'OUTSIDE_LOOKBACK',
        });
      } else {
        inWindow.push(filing);
      }
    }

    // Most significant form first, then newest, so the representative document
    // of each family is the one retrieved.
    inWindow.sort((a, b) => {
      const priorityA = formSpec(a.form)?.priority ?? 99;
      const priorityB = formSpec(b.form)?.priority ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.filingDate.localeCompare(a.filingDate);
    });

    const take = inWindow.slice(0, policy.maxFetch);
    for (const filing of inWindow.slice(policy.maxFetch)) {
      omitted.push({
        accession: filing.accession,
        form: filing.form,
        filingDate: filing.filingDate,
        reason: 'BEYOND_FAMILY_CAP',
      });
    }

    selected.push(...take);
    families.push({
      family,
      policy,
      availableTotal: available.length,
      withinLookback: inWindow.length,
      selected: take,
      omitted,
    });
  }

  const familiesPresent = families.map((coverage) => coverage.family);

  return {
    selected,
    families,
    familiesPresent,
    familiesAbsent: ALL_FAMILIES.filter((family) => !familiesPresent.includes(family)),
    totalRelevant,
    totalSelected: selected.length,
    totalOmitted: families.reduce((sum, coverage) => sum + coverage.omitted.length, 0),
  };
}

/** Accession with the dashes stripped, which is what Archives paths use. */
export function accessionPathSegment(accession: string): string {
  return accession.replace(/-/g, '');
}

/** Canonical URL of a filing's primary document. */
export function filingDocumentUrl(cik: string, filing: Filing): string | null {
  if (!filing.primaryDocument) return null;
  return [
    'https://www.sec.gov/Archives/edgar/data',
    cikPathSegment(cik),
    accessionPathSegment(filing.accession),
    filing.primaryDocument,
  ].join('/');
}

/** Human-facing filing index, used when no primary document is named. */
export function filingIndexUrl(cik: string, filing: Filing): string {
  return [
    'https://www.sec.gov/Archives/edgar/data',
    cikPathSegment(cik),
    accessionPathSegment(filing.accession),
    `${filing.accession}-index.htm`,
  ].join('/');
}
