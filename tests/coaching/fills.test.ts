/**
 * Fills store, parser and round-trip reconstruction.
 *
 * Three of these tests exist because of defects found while building this, not
 * because the shape looked risky in advance:
 *
 * - Cancelled orders duplicated on every re-import, because they carry no fill
 *   time and no fill price and SQLite treats NULLs in a composite PRIMARY KEY
 *   as distinct. "Idempotent" was a claim in a comment until it was a test.
 * - One sell fill that closes several lots is one exit leg, not three.
 * - The path guard is the only thing standing between personal financial
 *   records and the working tree, so it is asserted rather than trusted.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildRoundTrips, type FillRow } from '../../lib/coaching/fills/roundtrips';
import { assertSafeFillsPath, fillKey, openFillsStore } from '../../lib/coaching/fills/store';
import { parseWebullExport, parseWebullTime } from '../../lib/coaching/fills/webull';

const HEADER =
  'Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time';

const CANCELLED =
  'CID Holdco Inc,DAIC,Sell,Cancelled,0,185,@2.2000000000,,DAY,08/24/2026 11:36:33 EDT,';

function fill(symbol: string, side: 'Buy' | 'Sell', time: string, qty: number, price: number): FillRow {
  return { symbol, side, filledTime: `2026-08-24T${time}`, qty, price };
}

describe('parseWebullExport', () => {
  it('reads a filled order, stripping the @ from the limit price', () => {
    const line =
      'CID Holdco Inc,DAIC,Buy,Filled,155,155,@2.4700000000,2.4700000000,DAY,' +
      '08/24/2026 12:55:48 EDT,08/24/2026 12:55:48 EDT';
    const { rows } = parseWebullExport(`${HEADER}\n${line}`);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: 'DAIC',
      side: 'Buy',
      status: 'Filled',
      qty: 155,
      price: 2.47,
      limitPrice: 2.47,
      placedTime: '2026-08-24T12:55:48',
      filledTime: '2026-08-24T12:55:48',
      tz: 'EDT',
      tradingDate: '2026-08-24',
    });
  });

  it('keeps a cancelled order, dated by when it was placed', () => {
    const { rows } = parseWebullExport(`${HEADER}\n${CANCELLED}`);

    expect(rows[0].status).toBe('Cancelled');
    expect(rows[0].filledTime).toBeNull();
    expect(rows[0].price).toBeNull();
    expect(rows[0].tradingDate).toBe('2026-08-24');
  });

  it('handles a quoted company name containing a comma', () => {
    const line =
      '"Acme, Inc.",ACME,Buy,Filled,10,10,@1.0000000000,1.0000000000,DAY,' +
      '08/24/2026 09:30:00 EDT,08/24/2026 09:30:00 EDT';
    const { rows } = parseWebullExport(`${HEADER}\n${line}`);

    expect(rows[0].name).toBe('Acme, Inc.');
    expect(rows[0].symbol).toBe('ACME');
  });

  it('numbers otherwise-identical rows so a repeat fill is not collapsed', () => {
    const { rows } = parseWebullExport(`${HEADER}\n${CANCELLED}\n${CANCELLED}`);
    expect(rows.map((row) => row.seq)).toEqual([0, 1]);
  });

  it('rejects an export whose columns it does not recognise', () => {
    expect(() => parseWebullExport('Foo,Bar\n1,2')).toThrow(/Unrecognised Webull export/);
  });
});

describe('parseWebullTime', () => {
  it('keeps the zone label rather than converting', () => {
    expect(parseWebullTime('08/24/2026 12:56:25 EDT')).toEqual({
      local: '2026-08-24T12:56:25',
      tz: 'EDT',
    });
  });

  it('returns null for the empty fill time on a cancelled order', () => {
    expect(parseWebullTime('')).toBeNull();
    expect(parseWebullTime(undefined)).toBeNull();
  });
});

describe('buildRoundTrips', () => {
  it('pairs one buy and one sell into a trip with the realised loss per share', () => {
    const trips = buildRoundTrips([
      fill('OLOX', 'Buy', '04:10:45', 20, 3.02),
      fill('OLOX', 'Sell', '04:11:03', 20, 2.84),
    ]);

    expect(trips).toHaveLength(1);
    expect(trips[0].holdSeconds).toBe(18);
    expect(trips[0].pnl).toBeCloseTo(-3.6, 6);
    expect(trips[0].pnlPerShare).toBeCloseTo(-0.18, 6);
    expect(trips[0].direction).toBe('LONG');
  });

  it('folds scaling in and out into one flat-to-flat trip', () => {
    const trips = buildRoundTrips([
      fill('SUGP', 'Buy', '06:00:00', 100, 2.0),
      fill('SUGP', 'Buy', '06:00:10', 100, 2.2),
      fill('SUGP', 'Sell', '06:00:20', 100, 2.3),
      fill('SUGP', 'Sell', '06:00:30', 100, 2.4),
    ]);

    expect(trips).toHaveLength(1);
    expect(trips[0].qty).toBe(200);
    expect(trips[0].entryVwap).toBeCloseTo(2.1, 6);
    expect(trips[0].pnl).toBeCloseTo(50, 6);
    expect(trips[0].entryLegs).toBe(2);
    expect(trips[0].exitLegs).toBe(2);
  });

  it('counts one sell that closes several lots as a single exit leg', () => {
    const trips = buildRoundTrips([
      fill('BTCT', 'Buy', '07:42:38', 50, 1.4),
      fill('BTCT', 'Buy', '07:42:40', 50, 1.5),
      fill('BTCT', 'Sell', '07:42:48', 100, 1.6),
    ]);

    expect(trips[0].exitLegs).toBe(1);
    expect(trips[0].pnl).toBeCloseTo(15, 6);
  });

  it('reconstructs a short', () => {
    const trips = buildRoundTrips([
      fill('PMI', 'Sell', '04:38:29', 40, 5.0),
      fill('PMI', 'Buy', '04:39:12', 40, 4.8),
    ]);

    expect(trips[0].direction).toBe('SHORT');
    expect(trips[0].pnl).toBeCloseTo(8, 6);
  });

  it('leaves a position that never closed open rather than inventing a fill', () => {
    const trips = buildRoundTrips([
      fill('XPON', 'Buy', '15:59:00', 40, 7.0),
      fill('XPON', 'Sell', '15:59:30', 10, 7.5),
    ]);

    expect(trips).toHaveLength(1);
    expect(trips[0].closedAt).toBeNull();
    expect(trips[0].holdSeconds).toBeNull();
    expect(trips[0].pnl).toBeCloseTo(5, 6);
  });

  it('keeps symbols apart and orders trips by when they opened', () => {
    const trips = buildRoundTrips([
      fill('BBB', 'Buy', '05:00:00', 10, 2.0),
      fill('AAA', 'Buy', '04:00:00', 10, 1.0),
      fill('AAA', 'Sell', '04:00:30', 10, 1.1),
      fill('BBB', 'Sell', '05:00:30', 10, 2.1),
    ]);

    expect(trips.map((trip) => trip.symbol)).toEqual(['AAA', 'BBB']);
  });
});

describe('assertSafeFillsPath', () => {
  it('refuses a path inside the working tree', () => {
    expect(() => assertSafeFillsPath(path.join(process.cwd(), 'data', 'fills.db'))).toThrow(
      /inside the working tree/,
    );
  });

  it('refuses a OneDrive-synced path', () => {
    expect(() => assertSafeFillsPath('C:\\Users\\someone\\OneDrive\\Desktop\\fills.db')).toThrow(
      /OneDrive/,
    );
  });

  it('allows a path outside both', () => {
    expect(() => assertSafeFillsPath(path.join(os.tmpdir(), 'fills.db'))).not.toThrow();
  });
});

describe('fills store', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-fills-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('gives a cancelled order a stable key despite its empty fields', () => {
    const cancelled = {
      symbol: 'DAIC',
      side: 'Sell',
      placedTime: '2026-08-24T11:36:33',
      filledTime: null,
      qty: 0,
      price: null,
      seq: 0,
    };

    expect(fillKey(cancelled)).toBe(fillKey({ ...cancelled }));
    expect(fillKey(cancelled)).not.toBe(fillKey({ ...cancelled, seq: 1 }));
  });

  it('is idempotent across re-imports, cancelled orders included', () => {
    const db = openFillsStore(path.join(dir, 'fills.db'));
    const { rows } = parseWebullExport(`${HEADER}\n${CANCELLED}`);
    const insert = db.prepare(
      `INSERT OR IGNORE INTO fills
         (fill_key, symbol, side, placed_time, filled_time, qty, price, seq, name, status,
          total_qty, limit_price, time_in_force, tz, trading_date, source, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const run = (): number => {
      let inserted = 0;
      for (const row of rows) {
        inserted += insert.run(
          fillKey(row),
          row.symbol,
          row.side,
          row.placedTime,
          row.filledTime,
          row.qty,
          row.price,
          row.seq,
          row.name,
          row.status,
          row.totalQty,
          row.limitPrice,
          row.timeInForce,
          row.tz,
          row.tradingDate,
          'test',
          '2026-08-24T00:00:00Z',
        ).changes;
      }
      return inserted;
    };

    expect(run()).toBe(1);
    expect(run()).toBe(0);
    expect(run()).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM fills').get() as { n: number }).n).toBe(1);

    db.close();
  });
});
