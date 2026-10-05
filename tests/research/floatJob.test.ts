import { describe, expect, it } from 'vitest';

import {
  FLOAT_MAX_AGE_DAYS,
  computeFloatBound,
  floatCellFor,
  section16Filings,
  type FloatJobDeps,
  type StoredHolding,
  type SubmissionsRecent,
} from '@/lib/research/floatJob';
import type { SpanBar } from '@/lib/research/splitProof';
import type { SupplyBlock } from '@/lib/research/types';

/**
 * The float job is the validated pipeline (validate.ts collect) in lib. The rule this exists to get right: a holding
 * dated AFTER the count is never subtracted (owner 222 below); a holding across a split is refused (333); a holding
 * dated ON the count's date is subtracted, because R0, not R1, decides the holding span (555).
 */

const AS_OF = '2026-09-28';
const COUNT_END = '2026-08-01';

const owner = (cik: string) => `<reportingOwner><reportingOwnerId><rptOwnerCik>${cik}</rptOwnerCik><rptOwnerName>OWNER ${cik}</rptOwnerName></reportingOwnerId></reportingOwner>`;
const form4 = (cik: string, date: string, after: number) =>
  `<ownershipDocument><periodOfReport>${date}</periodOfReport>${owner(cik)}` +
  `<nonDerivativeTransaction><securityTitle><value>Common Stock</value></securityTitle><transactionDate><value>${date}</value></transactionDate>` +
  `<postTransactionAmounts><sharesOwnedFollowingTransaction><value>${after}</value></sharesOwnedFollowingTransaction></postTransactionAmounts>` +
  `<ownershipNature><directOrIndirectOwnership><value>D</value></directOrIndirectOwnership></ownershipNature></nonDerivativeTransaction></ownershipDocument>`;

const filings = [
  { accession: '0000-26-000001', form: '4', filingDate: '2026-07-15', doc: 'xslF345X05/a.xml', xml: form4('111', '2026-07-14', 1_000_000) },
  { accession: '0000-26-000002', form: '4', filingDate: '2026-08-20', doc: 'b.xml', xml: form4('222', '2026-08-18', 500_000) },
  { accession: '0000-26-000003', form: '4', filingDate: '2026-08-05', doc: 'c.xml', xml: form4('333', '2026-06-01', 200_000) },
  { accession: '0000-26-000004', form: '4', filingDate: '2026-08-03', doc: 'd.xml', xml: form4('555', COUNT_END, 300_000) },
  { accession: '0000-26-000005', form: '4', filingDate: '2026-08-04', doc: 'e.xml', xml: null },
  { accession: '0000-26-000006', form: '10-Q', filingDate: '2026-08-10', doc: 'q.htm', xml: null },
];

const submissions: SubmissionsRecent = {
  filings: {
    recent: {
      accessionNumber: filings.map((f) => f.accession),
      form: filings.map((f) => f.form),
      filingDate: filings.map((f) => f.filingDate),
      primaryDocument: filings.map((f) => f.doc),
    },
  },
};

const companyFacts = {
  facts: {
    dei: {
      EntityCommonStockSharesOutstanding: {
        units: {
          shares: [
            { end: COUNT_END, val: 10_000_000, filed: '2026-08-10', accn: '0000-26-000099', form: '10-Q' },
            { end: '2026-09-30', val: 99_000_000, filed: '2026-10-01', accn: 'later', form: '10-Q' },
          ],
        },
      },
    },
  },
};

const flat = (from: string, to: string): SpanBar[] => [
  { date: from, close: 10, factor: 1 },
  { date: to, close: 10, factor: 1 },
];

function deps(overrides: Partial<FloatJobDeps> = {}): FloatJobDeps & { urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    getJson: async <T,>(url: string) => {
      urls.push(url);
      if (url === 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000555.json') return companyFacts as T;
      if (url === 'https://data.sec.gov/submissions/CIK0000000555.json') return submissions as T;
      throw new Error(`unexpected ${url}`);
    },
    getText: async (url: string) => {
      urls.push(url);
      const hit = filings.find((f) => url === `https://www.sec.gov/Archives/edgar/data/555/${f.accession.replace(/-/g, '')}/${f.doc.replace(/^xsl[^/]*\//, '')}`);
      if (!hit?.xml) throw new Error('404');
      return hit.xml;
    },
    // A 2-for-1 factor step only in owner 333's span (2026-06-01 to the count).
    spanBars: (_symbol, from, to) =>
      from === '2026-06-01' ? [{ date: '2026-05-29', close: 10, factor: 2 }, { date: to, close: 10, factor: 1 }] : from === to ? [{ date: from, close: 10, factor: 1 }] : flat(from, to),
    now: () => '2026-09-28T23:00:00.000Z',
    ...overrides,
  };
}

const dossier = (ledger: SupplyBlock[] = []) => ({ analysisVersionId: 42, ledger });

describe('computeFloatBound', () => {
  it('subtracts only holdings dated on or before the count, on one basis, and reads the count filed by the as-of date', async () => {
    const row = await computeFloatBound({ symbol: 'ACME', cik: '0000555', asOfDate: AS_OF, dossier: dossier() }, deps());
    expect(row.count).toMatchObject({ kind: 'COUNT', shares: 10_000_000, asOf: COUNT_END });
    expect(row.holdings.map((h) => [h.ownerCik, h.split])).toEqual([
      ['111', 'NONE'],
      ['333', 'FOUND'],
      ['555', 'NONE'],
    ]);
    expect(row.cell).toMatchObject({ state: 'PRODUCED', bound: 8_700_000, subtracted: 1_300_000 });
    expect(row.splitSinceCount).toBe('NONE');
    expect(row).toMatchObject({ cik: '555', analysisVersionId: 42, issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE', maxAgeDays: 90 });
  });

  it('writes no row when companyfacts cannot be fetched: a failed fetch is not "no filed count"', async () => {
    const failing = deps({ getJson: async () => Promise.reject(new Error('503')) });
    await expect(computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() }, failing)).rejects.toThrow('503');
  });

  it('reads NO_CIK and fetches nothing when the dossier carries no SEC identifier', async () => {
    const d = deps();
    const row = await computeFloatBound({ symbol: 'ACME', cik: null, asOfDate: AS_OF, dossier: dossier() }, d);
    expect(row.cell).toEqual({ state: 'UNKNOWN', reason: 'NO_CIK' });
    expect(d.urls).toEqual([]);
  });

  it('reads ISSUANCE_NOT_CHECKED with no dossier, and still stores the fetched inputs', async () => {
    const row = await computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: null }, deps());
    expect(row.cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    expect(row.holdings).toHaveLength(3);
    expect(row.analysisVersionId).toBeNull();
  });
});

describe('floatCellFor: the job constants', () => {
  const count = (asOf: string) => ({ kind: 'COUNT' as const, shares: 1_000_000, asOf, filed: asOf, accession: 'a', form: '10-Q' });
  const base = { cik: '1', holdings: [] as StoredHolding[], splitSinceCount: 'NONE' as const, ledger: [] as SupplyBlock[], asOfDate: AS_OF };

  it('allows a count exactly 90 days old and refuses 91 (his ruling)', () => {
    expect(FLOAT_MAX_AGE_DAYS).toBe(90);
    expect(floatCellFor({ ...base, count: count('2026-06-30') }).state).toBe('PRODUCED');
    expect(floatCellFor({ ...base, count: count('2026-06-29') })).toEqual({ state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' });
  });

  it('refuses on a POSSIBLY_ACTIVE warrant block (the contract rule, not KNOWN_ACTIVE alone)', () => {
    const ledger = [{ type: 'WARRANTS', status: 'POSSIBLY_ACTIVE' }] as unknown as SupplyBlock[];
    expect(floatCellFor({ ...base, count: count('2026-08-01'), ledger })).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' });
  });
});

describe('section16Filings', () => {
  it('keeps Forms 3, 4, 5 and amendments filed inside the window only', () => {
    const data: SubmissionsRecent = {
      filings: {
        recent: {
          accessionNumber: ['a', 'b', 'c', 'd', 'e', 'f'],
          form: ['4', '4/A', 'SC 13G', '10-Q', '4', '4'],
          filingDate: ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2024-01-01', '2026-10-01'],
          primaryDocument: ['a.xml', 'b.xml', 'c.xml', 'd.htm', 'e.xml', 'f.xml'],
        },
      },
    };
    expect(section16Filings(data, '2024-09-28', AS_OF).map((f) => f.accession)).toEqual(['a', 'b']);
  });
});
