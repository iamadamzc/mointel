import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { readFloatBound, readLatestFloatBound, writeFloatBound } from '@/lib/market/store/floatBoundRepo';
import { floatCellFor, type FloatBoundRow, type StoredHolding } from '@/lib/research/floatJob';

const files: string[] = [];
function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-float-')), 'market.db');
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

const holdings: StoredHolding[] = [
  { ownerCik: '111', ownerName: 'A', shares: 1_000_000, asOf: '2026-07-14', accessions: ['x'], split: 'NONE' },
  { ownerCik: '333', ownerName: 'B', shares: 200_000, asOf: '2026-06-01', accessions: ['y'], split: 'FOUND' },
];

function row(asOfDate: string, overrides: Partial<FloatBoundRow> = {}): FloatBoundRow {
  const count = { kind: 'COUNT' as const, shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' };
  return {
    symbol: 'ACME',
    asOfDate,
    cik: '555',
    count,
    holdings,
    splitSinceCount: 'NONE',
    analysisVersionId: 42,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: floatCellFor({ cik: '555', count, holdings, splitSinceCount: 'NONE', ledger: [], asOfDate }),
    computedAt: `${asOfDate}T23:00:00.000Z`,
    ...overrides,
  };
}

describe('research_float_bounds', () => {
  it('round-trips a PRODUCED row, its count, every holding with its proof, and the subtracted total', () => {
    const store = db();
    const written = row('2026-09-28');
    writeFloatBound(store, written);
    expect(readFloatBound(store, 'ACME', '2026-09-28')).toEqual(written);
  });

  it('round-trips a refusal with its reason and no bound, and a count that is not a COUNT', () => {
    const store = db();
    const refused = row('2026-09-28', { cik: null, count: { kind: 'NO_FILED_COUNT' }, holdings: [], splitSinceCount: 'UNPROVEN', cell: { state: 'UNKNOWN', reason: 'NO_CIK' } });
    writeFloatBound(store, refused);
    expect(readFloatBound(store, 'ACME', '2026-09-28')).toEqual(refused);
  });

  it('replaces a same-day row, and reads the newest row on or before a date, never after it', () => {
    const store = db();
    writeFloatBound(store, row('2026-09-25'));
    writeFloatBound(store, row('2026-09-28', { analysisVersionId: 1 }));
    writeFloatBound(store, row('2026-09-28', { analysisVersionId: 2 }));
    writeFloatBound(store, row('2026-09-30'));
    expect(readFloatBound(store, 'ACME', '2026-09-28')?.analysisVersionId).toBe(2);
    expect(readLatestFloatBound(store, 'ACME', '2026-09-29')?.asOfDate).toBe('2026-09-28');
    expect(readLatestFloatBound(store, 'ACME', '2026-09-24')).toBeNull();
    expect(readFloatBound(store, 'ACME', '2026-09-29')).toBeNull();
  });
});
