import { describe, expect, it } from 'vitest';

import {
  FLOAT_MAX_AGE_DAYS,
  computeFloatBound,
  floatCellFor,
  issuanceFiledIn,
  issuanceFilings,
  listingReaches,
  section16Filings,
  type FloatJobDeps,
  type StoredHolding,
  type SubmissionsRecent,
} from '@/lib/research/floatJob';
import { SecRequestError } from '@/lib/research/sec/client';
import type { SpanBar } from '@/lib/research/splitProof';
import type { SupplyBlock } from '@/lib/research/types';

/**
 * The float job is the validated pipeline (validate.ts collect) in lib, with rule S1. The rules this exists to get right:
 * an owner whose only holding is dated AFTER the count is never subtracted (222); a holding across a split is refused
 * (333); a holding dated ON the count's date is subtracted, because R0, not R1, decides the holding span (555); an
 * owner who SOLD after the count is subtracted at what is left (111, rule S1).
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
  // Owner 111 SOLD after the count: rule S1 subtracts the 400,000 left, not the 1,000,000 held at the count.
  { accession: '0000-26-000007', form: '4', filingDate: '2026-09-02', doc: 'g.xml', xml: form4('111', '2026-08-30', 400_000) },
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
    announcedSplits: async (_symbol, start, end) => {
      urls.push(`splits ${start} ${end}`);
      return [];
    },
    announcedActions: async (_symbol, start, end) => {
      urls.push(`actions ${start} ${end}`);
      return [];
    },
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
    expect(row.cell).toMatchObject({ state: 'PRODUCED', bound: 9_300_000, subtracted: 700_000 });
    expect(row.holdings[0]!.classes).toEqual([{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }]);
    expect(row.splitSinceCount).toBe('NONE');
    expect(row).toMatchObject({ cik: '555', analysisVersionId: 42, issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE', maxAgeDays: 90, announcedSplits: [] });
  });

  it('writes no row when companyfacts cannot be fetched: a failed fetch is not "no filed count"', async () => {
    const failing = deps({ getJson: async () => Promise.reject(new Error('503')) });
    await expect(computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() }, failing)).rejects.toThrow('503');
  });

  /*
   * SEC's 404 on companyfacts is an ANSWER (Integration 36th, 2026-10-09: MTR, CIK 313364, a current filer whose
   * companyfacts returns 404). Stored as UNKNOWN / COMPANY_FACTS_NOT_AVAILABLE, so the name is not retried daily and
   * the board float pass does not stop on it. Any other status still writes no row.
   */
  const COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000555.json';
  const secRefusing = (status: number) => {
    const requested: string[] = [];
    const d = deps({
      getJson: async (url: string) => {
        requested.push(url);
        throw new SecRequestError(`SEC responded ${status}`, status, url);
      },
    });
    return { d, requested };
  };

  it("stores UNKNOWN COMPANY_FACTS_NOT_AVAILABLE on SEC's 404, and reads nothing further", async () => {
    const { d, requested } = secRefusing(404);
    const row = await computeFloatBound({ symbol: 'MTR', cik: '555', asOfDate: AS_OF, dossier: dossier() }, d);
    expect(row.count).toEqual({ kind: 'COMPANY_FACTS_NOT_AVAILABLE' });
    expect(row.cell).toEqual({ state: 'UNKNOWN', reason: 'COMPANY_FACTS_NOT_AVAILABLE' });
    expect(row.holdings).toEqual([]);
    // Only the companyfacts request: no submissions, no Form 4, no split read.
    expect(requested).toEqual([COMPANY_FACTS_URL]);
    expect(d.urls).toEqual([]);
  });

  it('still writes no row on any other SEC status', async () => {
    for (const status of [403, 500]) {
      await expect(
        computeFloatBound({ symbol: 'MTR', cik: '555', asOfDate: AS_OF, dossier: dossier() }, secRefusing(status).d),
      ).rejects.toThrow(`SEC responded ${status}`);
    }
  });

  it('reads the stored COMPANY_FACTS_NOT_AVAILABLE row back as the same cell (the reader re-derives it)', () => {
    const cell = floatCellFor({
      cik: '555',
      count: { kind: 'COMPANY_FACTS_NOT_AVAILABLE' },
      holdings: [],
      splitSinceCount: 'UNPROVEN',
      ledger: [],
      asOfDate: AS_OF,
      issuanceFiled: false,
    });
    expect(cell).toEqual({ state: 'UNKNOWN', reason: 'COMPANY_FACTS_NOT_AVAILABLE' });
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
  const base = { cik: '1', holdings: [] as StoredHolding[], splitSinceCount: 'NONE' as const, ledger: [] as SupplyBlock[], asOfDate: AS_OF, issuanceFiled: false };

  it('allows a count exactly 90 days old and refuses 91 (his ruling)', () => {
    expect(FLOAT_MAX_AGE_DAYS).toBe(90);
    expect(floatCellFor({ ...base, count: count('2026-06-30') }).state).toBe('PRODUCED');
    expect(floatCellFor({ ...base, count: count('2026-06-29') })).toEqual({ state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' });
  });

  it("passes the count's form: a 20-F count refuses as UNREGISTERED_SALE_NOT_CHECKABLE, the same count from a 10-Q is produced", () => {
    expect(floatCellFor({ ...base, count: { ...count('2026-08-01'), form: '20-F' } })).toEqual({ state: 'CANNOT_VERIFY', reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' });
    expect(floatCellFor({ ...base, count: count('2026-08-01') }).state).toBe('PRODUCED');
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

describe('computeFloatBound: rule R-A, announced splits refuse where stale bars cannot', () => {
  const run = (exDates: string[] | Error) =>
    computeFloatBound(
      { symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() },
      deps({ announcedSplits: async () => (exDates instanceof Error ? Promise.reject(exDates) : exDates) }),
    );

  it('fetches once, from the earliest holding date through the reuse span (asOfDate + 4 days)', async () => {
    const d = deps();
    await computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() }, d);
    expect(d.urls.filter((u) => u.startsWith('splits '))).toEqual(['splits 2026-06-01 2026-10-02']);
  });

  it('refuses a holding whose span holds an announced ex-date, though its bars read one basis', async () => {
    const row = await run(['2026-07-20']); // inside owner 111's span (07-14 to the count), not 555's (count date only)
    expect(row.holdings.find((h) => h.ownerCik === '111')!.split).toBe('FOUND');
    expect(row.holdings.find((h) => h.ownerCik === '555')!.split).toBe('NONE');
    expect(row.cell).toMatchObject({ state: 'PRODUCED', bound: 9_700_000 });
  });

  it('reads SPLIT_SINCE_COUNT for an announced ex-date between the count and the checkpoint, the checkpoint day included', async () => {
    expect((await run(['2026-09-28'])).cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
  });

  it('never reads a failed fetch as "no split"', async () => {
    const row = await run(new Error('503'));
    expect(row.announcedSplits).toBeNull();
    expect(row.cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
  });
});

describe('computeFloatBound: L6 step 1, the announced share-changing actions are fetched and stored (R2)', () => {
  const input = { symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() };

  it('fetches once, over the same span as the announced splits (earliest holding through asOfDate + 4 days)', async () => {
    const d = deps();
    const row = await computeFloatBound(input, d);
    expect(d.urls.filter((u) => u.startsWith('actions '))).toEqual(['actions 2026-06-01 2026-10-02']);
    expect(d.urls.filter((u) => u.startsWith('splits '))).toEqual(['splits 2026-06-01 2026-10-02']);
    expect(row.announcedActions).toEqual([]);
  });

  it("stores the dep's list sorted by ex-date, a rateless row kept with null rates, and leaves announcedSplits to its own dep", async () => {
    const dividend = { group: 'stock_dividends', exDate: '2026-09-01', oldRate: null, newRate: null };
    const reverse = { group: 'reverse_splits', exDate: '2026-07-20', oldRate: 10, newRate: 1 };
    const row = await computeFloatBound(input, deps({ announcedActions: async () => [dividend, reverse] }));
    expect(row.announcedActions).toEqual([reverse, dividend]);
    expect(row.announcedSplits).toEqual([]);
  });

  it('stores null when the dep throws, and the row is still written (never "none listed")', async () => {
    const row = await computeFloatBound(input, deps({ announcedActions: async () => Promise.reject(new Error('503')) }));
    expect(row.announcedActions).toBeNull();
    // R-A's own fetch is independent of this one.
    expect(row.announcedSplits).toEqual([]);
  });

  it('fetches nothing without a count, and stores [] as announcedSplits does', async () => {
    const d = deps();
    const row = await computeFloatBound({ ...input, cik: null }, d);
    expect(row.announcedActions).toEqual([]);
    expect(d.urls).toEqual([]);
  });
});

describe('rule I-D: a filed issuance after the count refuses (filed-issuance-registration-2026-10-06.md)', () => {
  const listing = (rows: Array<[string, string, string?]>): SubmissionsRecent => ({
    filings: {
      recent: {
        accessionNumber: rows.map((_, i) => `x${i}`),
        form: rows.map((r) => r[0]),
        filingDate: rows.map((r) => r[1]),
        primaryDocument: rows.map(() => 'x.htm'),
        items: rows.map((r) => r[2] ?? ''),
      },
    },
  });

  it('takes 424B1/2/4/5 and 8-K item 3.02 on or after the count date; not 424B3, registrations, plan shares or other items', () => {
    const data = listing([
      ['424B5', '2026-08-01'],
      ['424B4', '2026-08-20'],
      ['424B1', '2026-09-01'],
      ['8-K', '2026-08-13', '3.02,9.01'],
      ['8-K/A', '2026-08-14', '1.01, 3.02'],
      ['424B5', '2026-07-31'],
      ['424B3', '2026-08-05'],
      ['424B2', '2026-08-05'],
      ['S-3', '2026-08-05'],
      ['S-1', '2026-08-05'],
      ['S-8', '2026-08-05'],
      ['8-K', '2026-08-06', '2.02,9.01'],
    ]);
    expect(issuanceFilings(data, COUNT_END).map((f) => `${f.form} ${f.filingDate}`)).toEqual([
      '424B5 2026-08-01',
      '424B4 2026-08-20',
      '424B1 2026-09-01',
      '8-K 2026-08-13',
      '8-K/A 2026-08-14',
      '424B2 2026-08-05',
    ]);
  });

  it('applies [count, D]: the count date and D refuse; the day before the count and a filing after D do not', () => {
    const one = (date: string) => [{ form: '424B5', filingDate: date, accession: 'a', items: '' }];
    expect(issuanceFiledIn(one(COUNT_END), COUNT_END, AS_OF)).toBe(true);
    expect(issuanceFiledIn(one(AS_OF), COUNT_END, AS_OF)).toBe(true);
    expect(issuanceFiledIn(one('2026-07-31'), COUNT_END, AS_OF)).toBe(false);
    expect(issuanceFiledIn(one('2026-09-29'), COUNT_END, AS_OF)).toBe(false);
  });

  it('refuses as ISSUANCE_FILED ahead of the ledger (a clean, a missing and a flagged dossier) and stores the filing', async () => {
    const r = submissions.filings.recent;
    const withPlacement: SubmissionsRecent = {
      filings: {
        recent: {
          accessionNumber: [...r.accessionNumber, '0001437749-26-027730'],
          form: [...r.form, '8-K'],
          filingDate: [...r.filingDate, '2026-08-13'],
          primaryDocument: [...r.primaryDocument, 'k.htm'],
          items: [...r.form.map(() => ''), '3.02'],
        },
      },
    };
    const d = deps({ getJson: async <T,>(url: string) => (url.includes('companyfacts') ? companyFacts : withPlacement) as T });
    const flagged = [{ type: 'WARRANTS', status: 'KNOWN_ACTIVE' }] as unknown as SupplyBlock[];
    for (const dos of [dossier(), null, dossier(flagged)]) {
      const row = await computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dos }, d);
      expect(row.cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FILED' });
      expect(row.issuanceFilings).toEqual([{ form: '8-K', filingDate: '2026-08-13', accession: '0001437749-26-027730', items: '3.02' }]);
    }
  });

  it('writes no row when the listing does not reach back to the count date ("no hit" is unproven)', async () => {
    const late = listing([['4', '2026-08-02']]);
    const d = deps({ getJson: async <T,>(url: string) => (url.includes('companyfacts') ? companyFacts : late) as T });
    await expect(computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() }, d)).rejects.toThrow('does not reach the count date');
    expect(listingReaches(late, '2026-08-02')).toBe(true);
    expect(listingReaches(listing([]), COUNT_END)).toBe(false);
  });

  it('the base listing (Forms 4 and a 10-Q) has no hit and still produces', async () => {
    const row = await computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier: dossier() }, deps());
    expect(row.issuanceFilings).toEqual([]);
    expect(row.cell.state).toBe('PRODUCED');
  });
});
