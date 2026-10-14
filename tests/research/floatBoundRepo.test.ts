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
  { ownerCik: '111', ownerName: 'A', shares: 400_000, asOf: '2026-07-14', accessions: ['x', 'z'], filingDates: ['2026-07-16', '2026-09-01'], split: 'NONE', classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }] },
  { ownerCik: '333', ownerName: 'B', shares: 200_000, asOf: '2026-06-01', accessions: ['y'], filingDates: ['2026-06-03'], split: 'FOUND', classes: [{ title: 'common stock', h0: 200_000, h0AsOf: '2026-06-01', hD: 200_000, hDAsOf: '2026-06-01' }] },
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
    announcedSplits: ['2026-01-05'],
    issuanceFilings: [{ form: '424B5', filingDate: '2026-09-30', accession: 'p', items: '' }],
    // Fix 2 piece 2: the stated-count read round-trips whole (here it found nothing newer than the cover).
    statedCount: { found: null, read: 2, unread: 1, capped: 0, conflict: null, cover: { shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' } },
    analysisVersionId: 42,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: floatCellFor({ cik: '555', count, holdings, splitSinceCount: 'NONE', ledger: [], asOfDate, issuanceFiled: false }),
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
    const refused = row('2026-09-28', { cik: null, count: { kind: 'NO_FILED_COUNT' }, holdings: [], splitSinceCount: 'UNPROVEN', announcedSplits: null, cell: { state: 'UNKNOWN', reason: 'NO_CIK' } });
    writeFloatBound(store, refused);
    expect(readFloatBound(store, 'ACME', '2026-09-28')).toEqual(refused);
  });

  it('keeps announcedActions three ways apart: an old row (SQL NULL), a failed fetch (the text null), a list with a rateless row', () => {
    const store = db();
    const raw = (date: string) =>
      (store.prepare('SELECT announced_actions_json AS j FROM research_float_bounds WHERE symbol = ? AND as_of_date = ?').get('ACME', date) as { j: string | null }).j;

    // An old row, stored before L6: no field; read back without it, so it restates nothing.
    const old = row('2026-09-25');
    writeFloatBound(store, old);
    expect(raw('2026-09-25')).toBeNull();
    const oldBack = readFloatBound(store, 'ACME', '2026-09-25')!;
    expect(oldBack).toEqual(old);
    expect('announcedActions' in oldBack).toBe(false);

    // The fetch failed: stored as the JSON text 'null', read back as null (not undefined).
    writeFloatBound(store, row('2026-09-28', { announcedActions: null }));
    expect(raw('2026-09-28')).toBe('null');
    expect(readFloatBound(store, 'ACME', '2026-09-28')!.announcedActions).toBeNull();

    // Fetched: the list round-trips whole, the rateless stock dividend included; [] stays [].
    const listed = row('2026-09-30', {
      announcedActions: [
        { group: 'reverse_splits', exDate: '2026-09-15', oldRate: 10, newRate: 1 },
        { group: 'stock_dividends', exDate: '2026-09-20', oldRate: null, newRate: null },
      ],
    });
    writeFloatBound(store, listed);
    expect(readFloatBound(store, 'ACME', '2026-09-30')).toEqual(listed);
    writeFloatBound(store, row('2026-10-01', { announcedActions: [] }));
    expect(raw('2026-10-01')).toBe('[]');
    expect(readFloatBound(store, 'ACME', '2026-10-01')!.announcedActions).toEqual([]);
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
