import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { writeFloatBound } from '@/lib/market/store/floatBoundRepo';
import { computeFloatBound, floatCellFor, ledgerOfDossier, type FloatBoundRow, type FloatJobDeps, type StoredHolding, type SubmissionsRecent } from '@/lib/research/floatJob';
import { countChecksAt, floatCellAt, ledgerAt, readFloatBoundsAt, toFloatBound } from '@/lib/research/floatRead';
import { NO_ANALYSIS, floatCell, type FloatCellInput, type FloatLedger, type OwnerHolding } from '@/lib/research/insiderBound';
import type { SpanBar } from '@/lib/research/splitProof';
import type { ResearchAnalysisVersion, SupplyBlock } from '@/lib/research/types';

/**
 * L8, his "(b)" (choice 2 of docs/research/float-options/float-tool-sizing-2026-10-09.md): a name with NO desk research
 * gets the bound, marked `filingsOnly`, with every check on the filings still run. Commercial's condition 1: only a
 * SUCCESSFUL read that found no analysis (`NO_ANALYSIS`) may do so; null, or a ledger that is not usable, is "could not
 * tell" and keeps CANNOT_VERIFY / ISSUANCE_NOT_CHECKED. Every case below is a pair: the refusal, and its control.
 */

const block = (type: SupplyBlock['type'], status: SupplyBlock['status']): SupplyBlock => ({
  type,
  amountShares: null,
  dollarCapacity: null,
  sourceFiling: null,
  registrationStatus: null,
  effectiveDate: null,
  terms: null,
  holderRestrictions: null,
  status,
  eligibilityAssessment: null,
  evidenceSourceIds: [1],
  confidence: 'MEDIUM',
});

const holding = (ownerCik: string, shares: number): OwnerHolding => ({ ownerCik, ownerName: null, shares, asOf: '2026-05-01', accessions: ['x'] });

function input(overrides: Partial<FloatCellInput> = {}): FloatCellInput {
  return {
    cik: '1234',
    // The NXL arithmetic of insiderBound.test.ts: 22,036,402 filed, 617,347 insider shares, bound 21,419,055.
    count: { shares: 22_036_402, asOf: '2026-08-10' },
    spreadAcrossFilings: false,
    checkpointDate: '2026-09-01',
    maxAgeDays: 45,
    holdings: [holding('9', 617_347)],
    holdingSplit: new Map([['9', 'NONE']]),
    splitSinceCount: 'NONE',
    ledger: NO_ANALYSIS,
    issuanceRule: 'KNOWN_ACTIVE',
    ...overrides,
  };
}

const NXL = { state: 'PRODUCED', bound: 21_419_055, subtracted: 617_347, holdings: [holding('9', 617_347)], refused: [] };

describe('floatCell with no analysis found (L8)', () => {
  it('ADMITS: no analysis found and clean filings is PRODUCED with filingsOnly true and the same bound arithmetic', () => {
    expect(floatCell(input())).toEqual({ ...NXL, filingsOnly: true });
  });

  it('a ledger present and clean is PRODUCED with NO filingsOnly field (every existing PRODUCED cell unchanged)', () => {
    const cell = floatCell(input({ ledger: [] }));
    expect(cell).toEqual(NXL);
    expect('filingsOnly' in cell).toBe(false);
  });

  it('could not tell (null) stays ISSUANCE_NOT_CHECKED; its control, a successful read that found none, is filingsOnly', () => {
    expect(floatCell(input({ ledger: null }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    expect(floatCell(input({ ledger: NO_ANALYSIS }))).toMatchObject({ state: 'PRODUCED', filingsOnly: true });
  });

  it('an unusable ledger (missing, not an array, a block that is not an object) stays ISSUANCE_NOT_CHECKED, never filingsOnly', () => {
    for (const bad of [undefined, {}, 'NONE', 0, [null], [1]]) {
      expect(floatCell(input({ ledger: bad as unknown as FloatLedger })), JSON.stringify(bad) ?? 'undefined').toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    }
    expect(floatCell(input({ ledger: [block('REGISTERED_RESALE', 'KNOWN_ACTIVE')] })).state).toBe('PRODUCED');
  });

  it('a ledger that flags issuance still gives ISSUANCE_FLAGGED (unchanged); its control, an unflagged block, is produced', () => {
    expect(floatCell(input({ ledger: [block('ATM', 'KNOWN_ACTIVE')] }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' });
    expect(floatCell(input({ ledger: [block('ATM', 'NOT_YET_ACTIVE')] }))).toEqual(NXL);
  });

  it('no analysis with a filed issuance still refuses ISSUANCE_FILED', () => {
    expect(floatCell(input({ issuanceFiled: true }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FILED' });
    expect(floatCell(input({ issuanceFiled: false }))).toEqual({ ...NXL, filingsOnly: true });
  });

  it('no analysis with a count from a foreign annual report still refuses UNREGISTERED_SALE_NOT_CHECKABLE', () => {
    expect(floatCell(input({ count: { shares: 22_036_402, asOf: '2026-08-10', form: '20-F' } }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' });
    expect(floatCell(input({ count: { shares: 22_036_402, asOf: '2026-08-10', form: '10-Q' } }))).toEqual({ ...NXL, filingsOnly: true });
  });

  it('no analysis with a split since the count, found or unproven, still refuses SPLIT_SINCE_COUNT', () => {
    expect(floatCell(input({ splitSinceCount: 'FOUND' }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect(floatCell(input({ splitSinceCount: 'UNPROVEN' }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect(floatCell(input({ splitSinceCount: 'NONE' })).state).toBe('PRODUCED');
  });

  it('no analysis with an old count still refuses COUNT_TOO_OLD, 45 days inclusive', () => {
    // 2026-08-10 to 2026-09-24 is exactly 45 days.
    expect(floatCell(input({ checkpointDate: '2026-09-24' }))).toMatchObject({ state: 'PRODUCED', filingsOnly: true });
    expect(floatCell(input({ checkpointDate: '2026-09-25' }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' });
  });

  it('no analysis still fails the range check: insiders at or above the count, or a count dated after the checkpoint', () => {
    expect(floatCell(input({ holdings: [holding('9', 22_036_402)] }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'BOUND_OUT_OF_RANGE' });
    expect(floatCell(input({ count: { shares: 1000, asOf: '2026-12-01' } }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'BOUND_OUT_OF_RANGE' });
  });

  it('no analysis keeps every UNKNOWN reason', () => {
    expect(floatCell(input({ cik: null }))).toEqual({ state: 'UNKNOWN', reason: 'NO_CIK' });
    expect(floatCell(input({ companyFactsNotAvailable: true }))).toEqual({ state: 'UNKNOWN', reason: 'COMPANY_FACTS_NOT_AVAILABLE' });
    expect(floatCell(input({ spreadAcrossFilings: true }))).toEqual({ state: 'UNKNOWN', reason: 'COUNT_SPLIT_ACROSS_FILINGS' });
    expect(floatCell(input({ count: null }))).toEqual({ state: 'UNKNOWN', reason: 'NO_FILED_COUNT' });
  });
});

/* -------------------------------------------------------------- the job */

const AS_OF = '2026-09-28';
const COUNT_END = '2026-08-01';

/** One filed count, no Section 16 filings, no issuance filing, flat bars: the clean case through the whole job. */
function jobDeps(): FloatJobDeps {
  const facts = { facts: { dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: COUNT_END, val: 10_000_000, filed: '2026-08-10', accn: 'acc', form: '10-Q' }] } } } } };
  // An 8-K without item 3.02, filed before the count, so the listing reaches the count's date (rule I-D) and holds nothing else.
  const submissions: SubmissionsRecent = { filings: { recent: { accessionNumber: ['k'], form: ['8-K'], filingDate: ['2026-07-01'], primaryDocument: ['k.htm'], items: ['8.01'] } } };
  return {
    getJson: async <T,>(url: string) => {
      if (url === 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000555.json') return facts as T;
      if (url === 'https://data.sec.gov/submissions/CIK0000000555.json') return submissions as T;
      throw new Error(`unexpected ${url}`);
    },
    getText: async () => {
      throw new Error('404');
    },
    spanBars: (_symbol, from, to) => [
      { date: from, close: 10, factor: 1 },
      { date: to, close: 10, factor: 1 },
    ],
    announcedSplits: async () => [],
    now: () => `${AS_OF}T23:00:00.000Z`,
  };
}

describe('computeFloatBound and floatCellFor (the job)', () => {
  const job = (dossier: Parameters<typeof computeFloatBound>[0]['dossier']) => computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: AS_OF, dossier }, jobDeps());

  it('a successful read that found no analysis stores PRODUCED with filingsOnly and no dossier id', async () => {
    const row = await job(NO_ANALYSIS);
    expect(row.cell).toEqual({ state: 'PRODUCED', bound: 10_000_000, subtracted: 0, holdings: [], refused: [], filingsOnly: true });
    expect(row.analysisVersionId).toBeNull();
  });

  it('controls: could not tell (null) stores ISSUANCE_NOT_CHECKED; a clean dossier stores PRODUCED without filingsOnly', async () => {
    expect((await job(null)).cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    const researched = await job({ analysisVersionId: 42, ledger: [] });
    expect(researched.cell).toEqual({ state: 'PRODUCED', bound: 10_000_000, subtracted: 0, holdings: [], refused: [] });
    expect(researched.analysisVersionId).toBe(42);
  });

  it('a dossier whose ledger is missing is could-not-tell, never no-analysis', async () => {
    expect((await job({ analysisVersionId: 42, ledger: undefined as unknown as SupplyBlock[] })).cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
  });

  it('ledgerOfDossier passes the sentinel through and maps a missing dossier or ledger to null', () => {
    expect(ledgerOfDossier(NO_ANALYSIS)).toBe(NO_ANALYSIS);
    expect(ledgerOfDossier(null)).toBeNull();
    const ledger = [block('ATM', 'KNOWN_ACTIVE')];
    expect(ledgerOfDossier({ analysisVersionId: 1, ledger })).toBe(ledger);
    expect(ledgerOfDossier({ analysisVersionId: 1, ledger: undefined as unknown as SupplyBlock[] })).toBeNull();
  });
});

/* ------------------------------------------------------------- the reader */

const READ = '2026-09-25';
const D = '2026-09-29';
const COUNT = { kind: 'COUNT' as const, shares: 10_000_000, asOf: COUNT_END, filed: '2026-08-10', accession: 'acc', form: '10-Q' };
const holdings: StoredHolding[] = [
  { ownerCik: '111', ownerName: 'A', shares: 400_000, asOf: '2026-07-14', accessions: ['x'], filingDates: ['2026-07-20', '2026-09-02'], split: 'NONE', classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }] },
];
function row(overrides: Partial<FloatBoundRow> = {}): FloatBoundRow {
  return {
    symbol: 'ACME',
    asOfDate: READ,
    cik: '555',
    count: COUNT,
    holdings,
    splitSinceCount: 'NONE',
    announcedSplits: [],
    issuanceFilings: [],
    statedCount: null,
    analysisVersionId: null,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: floatCellFor({ cik: '555', count: COUNT, holdings, splitSinceCount: 'NONE', ledger: NO_ANALYSIS, asOfDate: READ, issuanceFiled: false }),
    computedAt: `${READ}T23:00:00.000Z`,
    ...overrides,
  };
}
const flat = (to: string): SpanBar[] => [
  { date: '2026-07-31', close: 10, factor: 1 },
  { date: to, close: 10, factor: 1 },
];

describe('floatCellAt (the reader at a later D)', () => {
  it('the reader at a later D and the job agree: the same filingsOnly cell, and the same refusal for could-not-tell', () => {
    const job = (ledger: FloatLedger) => floatCellFor({ cik: '555', count: COUNT, holdings, splitSinceCount: 'NONE', ledger, asOfDate: D, issuanceFiled: false });
    const filingsOnly = { state: 'PRODUCED', bound: 9_600_000, subtracted: 400_000, holdings, refused: [], filingsOnly: true };
    expect(floatCellAt(row(), D, NO_ANALYSIS, flat(D))).toEqual(filingsOnly);
    expect(job(NO_ANALYSIS)).toEqual(filingsOnly);
    expect(floatCellAt(row(), D, null, flat(D))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    expect(job(null)).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
  });

  it('every gate still re-runs at D with no analysis: a filing in [count, D], a split announced since, a row not re-read', () => {
    const placement = [{ form: '8-K', filingDate: '2026-09-28', accession: 'p', items: '3.02' }];
    expect(floatCellAt(row({ issuanceFilings: placement }), D, NO_ANALYSIS, flat(D))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FILED' });
    expect(floatCellAt(row({ issuanceFilings: placement }), '2026-09-27', NO_ANALYSIS, flat('2026-09-27'))).toMatchObject({ state: 'PRODUCED', filingsOnly: true });
    expect(floatCellAt(row({ announcedSplits: ['2026-09-28'] }), D, NO_ANALYSIS, flat(D))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect(floatCellAt(row(), '2026-09-30', NO_ANALYSIS, flat('2026-09-30'))).toEqual({ state: 'CANNOT_VERIFY', reason: 'FILINGS_NOT_REREAD' });
  });

  it('a name researched by D loses filingsOnly at the next read: the current ledger decides', () => {
    const cell = floatCellAt(row(), D, [], flat(D))!;
    expect(cell).toMatchObject({ state: 'PRODUCED', bound: 9_600_000 });
    expect('filingsOnly' in cell).toBe(false);
    expect(floatCellAt(row(), D, [block('WARRANTS', 'POSSIBLY_ACTIVE')], flat(D))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' });
  });
});

describe('ledgerAt (the reader: what the current-dossier read says)', () => {
  const version = (supplyLedger: unknown) => ({ dossier: { structure: { supplyLedger } } }) as unknown as ResearchAnalysisVersion;

  it('NO_ANALYSIS only when the research tables were read and hold no current analysis; null when they could not be read', () => {
    expect(ledgerAt(true, undefined)).toBe(NO_ANALYSIS);
    expect(ledgerAt(false, undefined)).toBeNull();
  });

  it("a found dossier gives its ledger; one with no ledger is null (could not tell), never NO_ANALYSIS", () => {
    const ledger = [block('ATM', 'KNOWN_ACTIVE')];
    expect(ledgerAt(true, version(ledger))).toBe(ledger);
    expect(ledgerAt(true, version(undefined))).toBeNull();
    expect(ledgerAt(true, version(null))).toBeNull();
  });
});

describe('toFloatBound (the payload Design keys on)', () => {
  it('carries filingsOnly: true only on a filingsOnly PRODUCED cell; never on a researched PRODUCED cell or a refused one', () => {
    const r = row();
    const checks = countChecksAt(r, D, flat(D));
    const marked = toFloatBound(r, floatCellAt(r, D, NO_ANALYSIS, flat(D))!, checks);
    const researched = toFloatBound(r, floatCellAt(r, D, [], flat(D))!, checks);
    const refused = toFloatBound(r, floatCellAt(r, D, null, flat(D))!, checks);
    expect(marked.filingsOnly).toBe(true);
    // Everything else in the payload is the researched bound's, unchanged.
    expect(marked).toEqual({ ...researched, filingsOnly: true });
    expect(marked).toMatchObject({ state: 'PRODUCED', bound: 9_600_000, reason: null });
    expect('filingsOnly' in researched).toBe(false);
    expect(refused).toMatchObject({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED', bound: null });
    expect('filingsOnly' in refused).toBe(false);
  });
});

/* ------------------------------------------------- readFloatBoundsAt (store) */

const files: string[] = [];
function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-filingsonly-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

describe('readFloatBoundsAt: the live board reads the ledger as the store answers', () => {
  it('research tables present and no analysis: the ledger check is passed and the next check decides; tables absent: ISSUANCE_NOT_CHECKED', () => {
    const store = db();
    writeFloatBound(store, row());
    // No bars are stored, so the split since the count is UNPROVEN: reaching SPLIT_SINCE_COUNT proves the ledger read as
    // NO_ANALYSIS (null would have stopped at ISSUANCE_NOT_CHECKED, one check earlier).
    expect(readFloatBoundsAt(store, ['ACME'], '2026-09-26').ACME).toMatchObject({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    // A store without the research tables answers "none" without reading anything: could not tell.
    store.exec('DROP TABLE research_jobs');
    expect(readFloatBoundsAt(store, ['ACME'], '2026-09-26').ACME).toMatchObject({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    store.close();
  });
});
