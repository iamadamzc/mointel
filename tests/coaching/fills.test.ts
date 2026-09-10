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

import Database from 'better-sqlite3';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  greenStopCheck,
  redStopCheck,
  winRitualCheck,
} from '../../lib/coaching/fills/checks';
import {
  assertCovers,
  classify,
  describe as describeCoverage,
  gaps,
  readCoverage,
} from '../../lib/coaching/fills/coverage';
import { buildRoundTrips, type FillRow } from '../../lib/coaching/fills/roundtrips';
import type { RoundTrip } from '../../lib/coaching/fills/roundtrips';
import {
  assertSafeFillsPath,
  fillKey,
  getPersonalRules,
  openFillsStore,
  setPersonalRule,
} from '../../lib/coaching/fills/store';
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

function trip(overrides: Partial<RoundTrip>): RoundTrip {
  return {
    symbol: 'TEST',
    direction: 'LONG',
    openedAt: '2026-08-25T06:00:00',
    closedAt: '2026-08-25T06:00:30',
    holdSeconds: 30,
    qty: 100,
    entryVwap: 2,
    exitVwap: 2.1,
    exitQty: 100,
    pnl: 10,
    pnlPerShare: 0.1,
    entryLegs: 1,
    exitLegs: 1,
    ...overrides,
  };
}

describe('personal session rules', () => {
  const day: RoundTrip[] = [
    trip({ openedAt: '2026-08-25T06:00:00', closedAt: '2026-08-25T06:00:30', pnl: 60 }),
    trip({ openedAt: '2026-08-25T06:01:00', closedAt: '2026-08-25T06:01:20', pnl: 50 }),
    trip({ openedAt: '2026-08-25T06:10:00', closedAt: '2026-08-25T06:10:40', pnl: -40 }),
    trip({ openedAt: '2026-08-25T06:12:00', closedAt: '2026-08-25T06:12:30', pnl: -90 }),
    trip({ openedAt: '2026-08-25T06:20:00', closedAt: '2026-08-25T06:20:30', pnl: -30 }),
  ];
  // cumulative: +60, +110, +70, -20, -50

  it('greenStopCheck finds the first touch and what came after', () => {
    const g = greenStopCheck(day, 100);
    expect(g.firstHitTrade).toBe(2);
    expect(g.pnlAtHit).toBeCloseTo(110, 6);
    expect(g.tradesAfter).toBe(3);
    expect(g.pnlAfter).toBeCloseTo(-160, 6);
  });

  it('greenStopCheck reports a line that was never touched', () => {
    const g = greenStopCheck(day, 500);
    expect(g.firstHitTrade).toBeNull();
    expect(g.tradesAfter).toBe(0);
  });

  it('redStopCheck triggers when net P&L reaches -threshold, not on single-loss size', () => {
    const r = redStopCheck(day, 45);
    expect(r.firstHitTrade).toBe(5);
    expect(r.pnlAtHit).toBeCloseTo(-50, 6);
    expect(r.tradesAfter).toBe(0);
  });

  it('winRitualCheck flags a re-entry inside the hands-off window', () => {
    const w = winRitualCheck(day, 25, 300);
    // Trade 1 (+60) -> trade 2 opens 30s later: break. Trade 2 (+50) -> trade 3
    // opens 8m40s later: clean.
    expect(w.winners).toBe(2);
    expect(w.breaks).toHaveLength(1);
    expect(w.breaks[0].gapSeconds).toBe(30);
    expect(w.pnlOfNextTrades).toBeCloseTo(50, 6);
  });

  it('winRitualCheck counts a qualifying winner that ends the day', () => {
    const w = winRitualCheck([trip({ pnl: 60 })], 25, 300);
    expect(w.winners).toBe(1);
    expect(w.breaks).toHaveLength(0);
  });

  it('stores, reads and clears the numbers in the database', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-rules-'));
    const db = openFillsStore(path.join(dir, 'fills.db'));
    try {
      expect(getPersonalRules(db)).toEqual({ greenStop: null, redStop: null, winRitual: null });

      setPersonalRule(db, 'greenStop', 100);
      setPersonalRule(db, 'winRitual', 25);
      expect(getPersonalRules(db)).toEqual({ greenStop: 100, redStop: null, winRitual: 25 });

      setPersonalRule(db, 'greenStop', null);
      expect(getPersonalRules(db).greenStop).toBeNull();

      expect(() => setPersonalRule(db, 'redStop', -5)).toThrow(/positive/);
      expect(() => setPersonalRule(db, 'redStop', Number.NaN)).toThrow(/positive/);
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads a hand-edited meta row of garbage back as "not set"', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-rules-'));
    const db = openFillsStore(path.join(dir, 'fills.db'));
    try {
      const put = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
      put.run('rule_green_stop', '');
      put.run('rule_red_stop', '-50');
      put.run('rule_win_ritual', 'lots');
      expect(getPersonalRules(db)).toEqual({ greenStop: null, redStop: null, winRitual: null });
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('walks equity in realization order when positions overlap across symbols', () => {
    // AAAA is carried at a loss while BBBB scalps a win inside it. Realized
    // equity is +100 at 06:06, then 0 at 06:30 -- it is never negative, and
    // the green line IS touched. A walk in entry order gets both wrong.
    const overlapping = [
      trip({ symbol: 'AAAA', openedAt: '2026-08-25T06:00:00', closedAt: '2026-08-25T06:30:00', pnl: -100 }),
      trip({ symbol: 'BBBB', openedAt: '2026-08-25T06:05:00', closedAt: '2026-08-25T06:06:00', pnl: 100 }),
    ];
    const red = redStopCheck(overlapping, 50);
    expect(red.firstHitTrade).toBeNull();
    const green = greenStopCheck(overlapping, 100);
    expect(green.firstHitTrade).toBe(1);
    expect(green.firstHitAt).toBe('2026-08-25T06:06:00');
    expect(green.pnlAtHit).toBeCloseTo(100, 6);
    expect(green.tradesAfter).toBe(1);
    expect(green.pnlAfter).toBeCloseTo(-100, 6);
  });

  it('reports the first touch of the line, not a later one', () => {
    const twice = [
      trip({ openedAt: '2026-08-25T06:00:00', closedAt: '2026-08-25T06:00:30', pnl: 110 }),
      trip({ openedAt: '2026-08-25T06:01:00', closedAt: '2026-08-25T06:01:30', pnl: -50 }),
      trip({ openedAt: '2026-08-25T06:02:00', closedAt: '2026-08-25T06:02:30', pnl: 60 }),
    ];
    const g = greenStopCheck(twice, 100);
    expect(g.firstHitTrade).toBe(1);
    expect(g.pnlAtHit).toBeCloseTo(110, 6);
  });

  it('win ritual: a position opened BEFORE the winner closed is concurrent, not a break', () => {
    // BBBB opened while the AAAA winner was still running (would be a negative
    // gap); CCCC, opened 60s after the close, is the real break.
    const overlapped = [
      trip({ symbol: 'AAAA', openedAt: '2026-08-25T06:00:00', closedAt: '2026-08-25T06:10:00', pnl: 60 }),
      trip({ symbol: 'BBBB', openedAt: '2026-08-25T06:05:00', closedAt: '2026-08-25T06:05:30', pnl: -10 }),
      trip({ symbol: 'CCCC', openedAt: '2026-08-25T06:11:00', closedAt: '2026-08-25T06:11:30', pnl: -5 }),
    ];
    const w = winRitualCheck(overlapped, 25, 300);
    expect(w.breaks).toHaveLength(1);
    expect(w.breaks[0].next.symbol).toBe('CCCC');
    expect(w.breaks[0].gapSeconds).toBe(60);
  });

  it('win ritual: a re-entry still open at report time is a break, not invisible', () => {
    const withOpen = [
      trip({ symbol: 'AAAA', openedAt: '2026-08-25T06:00:00', closedAt: '2026-08-25T06:00:30', pnl: 60 }),
      trip({ symbol: 'BBBB', openedAt: '2026-08-25T06:00:45', closedAt: null, holdSeconds: null, pnl: 0, exitQty: 0, exitVwap: null }),
    ];
    const w = winRitualCheck(withOpen, 25, 300);
    expect(w.winners).toBe(1);
    expect(w.breaks).toHaveLength(1);
    expect(w.breaks[0].gapSeconds).toBe(15);
  });

  it('win ritual boundaries: gap equal to the window is clean, a winner exactly at threshold counts', () => {
    const exact = [
      trip({ openedAt: '2026-08-25T06:00:00', closedAt: '2026-08-25T06:00:30', pnl: 25 }),
      trip({ openedAt: '2026-08-25T06:05:30', closedAt: '2026-08-25T06:06:00', pnl: -5 }),
    ];
    const w = winRitualCheck(exact, 25, 300);
    expect(w.winners).toBe(1);
    expect(w.breaks).toHaveLength(0);
  });

  it('all three checks stay quiet on an empty day', () => {
    expect(greenStopCheck([], 100).firstHitTrade).toBeNull();
    expect(redStopCheck([], 100).firstHitTrade).toBeNull();
    const w = winRitualCheck([], 25, 300);
    expect(w.winners).toBe(0);
    expect(w.breaks).toHaveLength(0);
  });
});



describe('coverage windows', () => {
  let dir: string;

  function makeExtract(name: string, dates: string[], asOf?: string): string {
    const file = path.join(dir, name);
    const db = new Database(file);
    db.exec('CREATE TABLE desk_assessments (id INTEGER PRIMARY KEY, trading_date TEXT)');
    db.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)');
    const ins = db.prepare('INSERT INTO desk_assessments (trading_date) VALUES (?)');
    for (const d of dates) ins.run(d);
    if (asOf) db.prepare('INSERT INTO meta (key,value) VALUES (?,?)').run('extract_as_of', asOf);
    db.close();
    return file;
  }

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-cov-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('prefers a recorded as-of over the newest trading date', () => {
    const file = makeExtract('a.db', ['2026-09-01', '2026-09-02'], '2026-09-10T08:00:00Z');
    const c = readCoverage(file);
    expect(c.asOf).toBe('2026-09-10T08:00:00Z');
    expect(c.basis).toBe('extract_as_of');
    expect(c.firstDate).toBe('2026-09-01');
    expect(c.lastDate).toBe('2026-09-02');
  });

  it('falls back to the newest trading date and marks the basis as weaker', () => {
    const file = makeExtract('b.db', ['2026-09-01', '2026-09-02']);
    const c = readCoverage(file);
    expect(c.basis).toBe('max_trading_date');
    expect(c.asOf).toBe('2026-09-02');
    expect(describeCoverage(c)).toMatch(/as-of UNKNOWN/);
  });

  it('separates "after the window" from "a real hole inside it"', () => {
    const file = makeExtract('c.db', ['2026-09-01', '2026-09-03']);
    const v = classify(readCoverage(file), ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-09']);
    expect(v.covered).toEqual(['2026-09-01']);
    expect(v.before).toEqual(['2026-08-31']);
    expect(v.missing).toEqual(['2026-09-02']);
    expect(v.beyond).toEqual(['2026-09-09']);
  });

  it('THE 09-07 FAILURE: refuses a session the extract stops before', () => {
    // assessments-prod-2026-09-02.db asked about 2026-09-03. The query returned
    // zero and the zero was read as a fact about the desk.
    const file = makeExtract('prod-2026-09-02.db', ['2026-09-01', '2026-09-02']);
    const c = readCoverage(file);
    expect(() => assertCovers(c, ['2026-09-03'])).toThrow(/Refusing the join/);
    expect(() => assertCovers(c, ['2026-09-03'])).toThrow(/AFTER the extract ends/);
    expect(() => assertCovers(c, ['2026-09-03'])).toThrow(/not a finding/);
  });

  it('stays silent when every requested date is inside the window', () => {
    const file = makeExtract('d.db', ['2026-09-01', '2026-09-02']);
    expect(() => assertCovers(readCoverage(file), ['2026-09-01', '2026-09-02'])).not.toThrow();
  });

  it('gaps() reports only holes inside the window, never the ends', () => {
    const file = makeExtract('e.db', ['2026-09-01', '2026-09-03']);
    const c = readCoverage(file);
    expect(gaps(c, ['2026-08-28', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'])).toEqual([
      '2026-09-02',
    ]);
  });

  it('refuses a store that has no date table rather than reporting empty coverage', () => {
    const file = path.join(dir, 'wrong.db');
    const db = new Database(file);
    db.exec('CREATE TABLE something_else (x INTEGER)');
    db.close();
    expect(() => readCoverage(file)).toThrow(/no desk_assessments table/);
  });
});
