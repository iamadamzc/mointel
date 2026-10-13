import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { floatCellView, floatSortValue, normalizeFloatBound } from '@/lib/dashboard/floatBound';
import { readFloatBounds, resetFloatBoundsCache } from '@/lib/market/readModel';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { writeFloatBound } from '@/lib/market/store/floatBoundRepo';
import { floatCellFor, type FloatBoundRow, type StoredHolding } from '@/lib/research/floatJob';
import { CHECKS_NOT_RUN, toFloatBound } from '@/lib/research/floatRead';

/*
 * The float wiring (Integration 31st): Research's real FloatBound, built by its own
 * toFloatBound and read back through its own reader, reaches the cell; a malformed
 * entry never throws and reads "Cannot verify"; an absent one reads "Not computed",
 * the common case on the first day. Fixture after Research's floatRead.test.ts.
 */

const LE = String.fromCharCode(0x2264);
const READ = '2026-09-25';
const COUNT = { kind: 'COUNT' as const, shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' };
const holdings: StoredHolding[] = [
  {
    ownerCik: '111',
    ownerName: 'A',
    shares: 400_000,
    asOf: '2026-07-14',
    accessions: ['x'],
    filingDates: ['2026-07-20', '2026-09-02'],
    split: 'NONE',
    classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }],
  },
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
    analysisVersionId: 42,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: floatCellFor({ cik: '555', count: COUNT, holdings, splitSinceCount: 'NONE', ledger: [], asOfDate: READ, issuanceFiled: false }),
    computedAt: `${READ}T23:00:00.000Z`,
    ...overrides,
  };
}

describe("the cell reads Research's real FloatBound", () => {
  it('a PRODUCED bound from toFloatBound prints the number and the read date in the v25 words (no per-holding dates)', () => {
    const r = row();
    const bound = toFloatBound(r, r.cell, CHECKS_NOT_RUN);
    expect(bound.state).toBe('PRODUCED');
    const v = floatCellView(bound);
    expect(v.kind).toBe('bound');
    expect(v.face.startsWith(LE)).toBe(true);
    expect(v.date).toBe('8/1');
    const text = v.paragraphs.join(' ');
    expect(text).toContain(
      'less insider holdings as filed through Sep 25, 2026, counting any sale dated on or before the checkpoint that was filed by Sep 25, 2026.',
    );
    expect(text).not.toMatch(/Jul 20, 2026|Sep 2, 2026/);
    expect(text).toContain('Filings read on Sep 25, 2026.');
    expect(floatSortValue(bound)).toBe(bound.bound);
  });

  it('a refused bound from toFloatBound reads its own cause', () => {
    const r = row({ count: { kind: 'NO_FILED_COUNT' }, holdings: [], cell: { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' } });
    const v = floatCellView(toFloatBound(r, r.cell, CHECKS_NOT_RUN));
    expect(v.kind).toBe('unknown');
    expect(v.paragraphs).toEqual(['No filed share count.']);
  });
});

describe('guards: absent, malformed, extra fields', () => {
  it('carries the filed count and the insider rows; drops a malformed insider row, never inventing one', () => {
    const b = normalizeFloatBound({
      state: 'PRODUCED',
      bound: 9_600_000,
      countAsOf: '2026-08-01',
      countShares: 10_000_000,
      countForm: '10-Q',
      insiders: [
        { ownerCik: '111', ownerName: 'A', title: 'common stock', shares: 400_000, heldAsOf: '2026-07-14', filedOn: ['2026-07-20', 'Jul 20'] },
        { ownerCik: 222, shares: 1 },
        { ownerCik: '333', shares: 'many' },
        'x',
      ],
    })!;
    expect(b.countShares).toBe(10_000_000);
    expect(b.countForm).toBe('10-Q');
    expect(b.insiders).toEqual([{ ownerCik: '111', ownerName: 'A', title: 'common stock', shares: 400_000, heldAsOf: '2026-07-14', filedOn: ['2026-07-20'] }]);
    const bare = normalizeFloatBound({ state: 'PRODUCED', countShares: 'ten', insiders: 'none' })!;
    expect([bare.countShares, bare.countForm, bare.insiders]).toEqual([null, null, []]);
  });

  it('absent or null is NOT_YET, "Not computed": the day-one common case', () => {
    for (const none of [null, undefined]) {
      expect(normalizeFloatBound(none)).toBeNull();
      expect(floatCellView(none).face).toBe('Not computed');
    }
  });

  it('a malformed entry never throws and reads the generic "Cannot verify", never a number and never "Not computed"', () => {
    const bad: unknown[] = [
      'PRODUCED',
      42,
      [],
      { state: 'NOT_YET' },
      { state: 'PRODUCED', bound: '9600000', countAsOf: 20260801, holdingsFiledOn: 'Jul 20' },
      { state: 'BOGUS', bound: 9_600_000, countAsOf: '2026-08-01' },
    ];
    for (const raw of bad) {
      const v = floatCellView(raw as never);
      expect(v.kind).toBe('cannotVerify');
      expect(v.face).toBe('Cannot verify');
      expect(floatSortValue(raw as never)).toBeNull();
    }
  });

  it('the retired provisional shape (holdingDates, fetchedOn) cannot throw: no dates claimed that the payload lacks', () => {
    const old = { state: 'PRODUCED', reason: null, bound: 9_600_000, countAsOf: '2026-08-01', holdingDates: ['2026-07-20'], fetchedOn: '2026-09-25' };
    const v = floatCellView(old as never);
    // No filingsReadOn: v25's words print the read date, so the cell refuses rather than claim one (bcfd1330's guard).
    expect(v.kind).toBe('cannotVerify');
    expect(v.face).toBe('Cannot verify');
    expect(v.date).toBeNull();
    const text = [v.ariaLabel, ...v.paragraphs, ...v.details.rows.map((r) => r.text)].join(' ');
    expect(text).not.toMatch(/Filings read on|filed through|Sep 25|Jul 20|Aug 1/);
  });

  it('extra fields are ignored', () => {
    const r = row();
    const bound = { ...toFloatBound(r, r.cell, CHECKS_NOT_RUN), surprise: { nested: true } };
    expect(floatCellView(bound as never).kind).toBe('bound');
  });
});

const files: string[] = [];
function store(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-floatwire-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});
beforeEach(() => resetFloatBoundsCache());

describe('the snapshot read (readFloatBounds)', () => {
  it("reads Research's stored row at the board's date: a symbol with a row gets its FloatBound, one without gets null", () => {
    const db = store();
    writeFloatBound(db, row({ count: { kind: 'NO_FILED_COUNT' }, holdings: [], cell: { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' } }));
    const read = readFloatBounds(db, 'a.db', '2026-09-26', ['ACME', 'NONE'], new Date('2026-09-26T14:00:00Z'));
    expect(Object.keys(read).sort()).toEqual(['ACME', 'NONE']);
    expect(read.NONE).toBeNull();
    expect(read.ACME).toMatchObject({ state: 'UNKNOWN', reason: 'NO_FILED_COUNT', filingsReadOn: READ });
  });

  it('a store without the table still sends the map (every symbol null), so the column is wired and reads "Not computed"', () => {
    const db = store();
    db.exec('DROP TABLE IF EXISTS research_float_bounds');
    expect(readFloatBounds(db, 'b.db', '2026-09-26', ['ACME'], new Date())).toEqual({ ACME: null });
  });

  it('a read that throws marks each symbol as a fault that reads "Cannot verify", never null', () => {
    const broken = { prepare: () => { throw new Error('disk I/O error'); } } as unknown as MarketDatabase;
    const read = readFloatBounds(broken, 'c.db', '2026-09-26', ['ACME', 'BETA'], new Date());
    for (const symbol of ['ACME', 'BETA']) {
      expect(read[symbol]).not.toBeNull();
      expect(floatCellView(read[symbol]).face).toBe('Cannot verify');
    }
  });

  it('is read once a minute per store, date and symbol; a new symbol is read on its own', () => {
    let calls = 0;
    const counting = {
      prepare: () => {
        calls += 1;
        throw new Error('no table');
      },
    } as unknown as MarketDatabase;
    const t0 = new Date('2026-09-26T14:00:00Z');
    readFloatBounds(counting, 'd.db', '2026-09-26', ['ACME'], t0);
    const first = calls;
    readFloatBounds(counting, 'd.db', '2026-09-26', ['ACME'], new Date(t0.getTime() + 59_000));
    expect(calls).toBe(first);
    readFloatBounds(counting, 'd.db', '2026-09-26', ['ACME', 'BETA'], new Date(t0.getTime() + 59_500));
    expect(calls).toBe(first * 2);
    readFloatBounds(counting, 'd.db', '2026-09-26', ['ACME', 'BETA'], new Date(t0.getTime() + 60_000));
    expect(calls).toBe(first * 3);
  });

  it('no trading date: every symbol null without touching the store', () => {
    let calls = 0;
    const counting = { prepare: () => { calls += 1; throw new Error('x'); } } as unknown as MarketDatabase;
    expect(readFloatBounds(counting, 'e.db', '', ['ACME'], new Date())).toEqual({ ACME: null });
    expect(calls).toBe(0);
  });
});
