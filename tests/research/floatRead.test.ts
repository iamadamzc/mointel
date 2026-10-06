import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { writeFloatBound } from '@/lib/market/store/floatBoundRepo';
import { floatCellFor, type FloatBoundRow, type StoredHolding } from '@/lib/research/floatJob';
import { floatCellAt, readFloatBoundsAt, toFloatBound } from '@/lib/research/floatRead';
import type { SpanBar } from '@/lib/research/splitProof';
import type { SupplyBlock } from '@/lib/research/types';

/**
 * The reader (contract 9b): a reused row is recomputed at D, and reuse can only move it toward "Cannot verify".
 * Row read on 2026-09-25 (a Friday), count dated 2026-08-01, one subtracted insider.
 */

const READ = '2026-09-25';
const COUNT = { kind: 'COUNT' as const, shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' };
const holdings: StoredHolding[] = [
  { ownerCik: '111', ownerName: 'A', shares: 400_000, asOf: '2026-07-14', accessions: ['x'], split: 'NONE', classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }] },
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
    analysisVersionId: 42,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: floatCellFor({ cik: '555', count: COUNT, holdings, splitSinceCount: 'NONE', ledger: [], asOfDate: READ }),
    computedAt: `${READ}T23:00:00.000Z`,
    ...overrides,
  };
}
const flat = (to: string): SpanBar[] => [
  { date: '2026-07-31', close: 10, factor: 1 },
  { date: to, close: 10, factor: 1 },
];

describe('floatCellAt', () => {
  it('reuses a row read within 4 days and recomputes it at D', () => {
    expect(floatCellAt(row(), '2026-09-29', [], flat('2026-09-29'))).toMatchObject({ state: 'PRODUCED', bound: 9_600_000 });
  });

  it('refuses a row read more than 4 days before D: FILINGS_NOT_REREAD, never NOT_YET', () => {
    expect(floatCellAt(row(), '2026-09-30', [], flat('2026-09-30'))).toEqual({ state: 'CANNOT_VERIFY', reason: 'FILINGS_NOT_REREAD' });
  });

  it('is NOT_YET (null) only when no row exists', () => {
    expect(floatCellAt(null, '2026-09-29', [], [])).toBeNull();
  });

  it('refuses at D on an announced split the row fetched ahead, though the bars read one basis', () => {
    expect(floatCellAt(row({ announcedSplits: ['2026-09-28'] }), '2026-09-29', [], flat('2026-09-29'))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect(floatCellAt(row({ announcedSplits: null }), '2026-09-29', [], flat('2026-09-29'))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
  });

  it('refuses at D on a flag in the CURRENT ledger, and on a count that aged past 90 days by D', () => {
    const ledger = [{ type: 'ATM', status: 'KNOWN_ACTIVE' }] as unknown as SupplyBlock[];
    expect(floatCellAt(row(), '2026-09-29', ledger, flat('2026-09-29'))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' });
    const old = { ...COUNT, asOf: '2026-06-30' };
    // Read 09-25 (87 days old then); at 09-29 the count is 91 days old.
    expect(floatCellAt(row({ count: old }), '2026-09-29', [], [{ date: '2026-06-30', close: 10, factor: 1 }, { date: '2026-09-29', close: 10, factor: 1 }])).toEqual({ state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' });
  });
});

describe('toFloatBound (the payload Design builds from)', () => {
  it('carries the bound, the count dates and the read date when PRODUCED; null bound and a reason otherwise', () => {
    const r = row();
    expect(toFloatBound(r, floatCellAt(r, '2026-09-29', [], flat('2026-09-29'))!)).toEqual({
      state: 'PRODUCED', reason: null, bound: 9_600_000, countAsOf: '2026-08-01', countFiled: '2026-08-10', subtractedHolders: 1, filingsReadOn: READ,
    });
    expect(toFloatBound(r, { state: 'CANNOT_VERIFY', reason: 'FILINGS_NOT_REREAD' })).toEqual({
      state: 'CANNOT_VERIFY', reason: 'FILINGS_NOT_REREAD', bound: null, countAsOf: '2026-08-01', countFiled: '2026-08-10', subtractedHolders: 0, filingsReadOn: READ,
    });
  });
});

const files: string[] = [];
function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-floatread-')), 'market.db');
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

describe('readFloatBoundsAt', () => {
  it('returns null for a symbol with no row, and every symbol null on a store without the table', () => {
    const store = db();
    writeFloatBound(store, row({ count: { kind: 'NO_FILED_COUNT' }, holdings: [], cell: { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' } }));
    const read = readFloatBoundsAt(store, ['ACME', 'NONE'], '2026-09-26');
    expect(read.NONE).toBeNull();
    expect(read.ACME).toMatchObject({ state: 'UNKNOWN', reason: 'NO_FILED_COUNT', filingsReadOn: READ });
    store.exec('DROP TABLE research_float_bounds');
    expect(readFloatBoundsAt(store, ['ACME'], '2026-09-26')).toEqual({ ACME: null });
  });
});
