import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { readAfterHoursTotals } from '@/lib/desk/reports/totals';

function store() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE universe (symbol TEXT PRIMARY KEY, discovery_eligible INTEGER NOT NULL DEFAULT 1, tradable INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE ticker_session (
      symbol TEXT, trading_date TEXT, price REAL, ah_participation REAL, ah_percent_change REAL,
      latched INTEGER DEFAULT 0, qualified_price REAL
    );
  `);
  const session = db.prepare(
    'INSERT INTO ticker_session (symbol, trading_date, price, ah_participation, ah_percent_change, latched, qualified_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const universe = db.prepare('INSERT INTO universe (symbol, discovery_eligible) VALUES (?, ?)');
  universe.run('UPA', 1);
  universe.run('DNB', 1);
  universe.run('STALE', 1);
  universe.run('ETF', 0); // an ETF: never on the board
  // NOREG is absent from universe: the engine never ranks it, so it is NOT counted (Integration 37th, 2026-10-10;
  // it was counted until then).
  session.run('UPA', '2026-09-24', 5, 0.4, 3.2, 0, null);
  session.run('DNB', '2026-09-24', 20, 0.1, -1.5, 0, null); // the bound, inclusive
  session.run('NOREG', '2026-09-24', 1, 0, 0, 0, null); // no after-hours trade, flat
  session.run('STALE', '2026-09-24', 9, 0, 2.5, 0, null); // no after-hours trade, a stale change: counted, never up
  session.run('ETF', '2026-09-24', 8, 0.9, 2.0, 0, null);
  session.run('RAN', '2026-09-24', 25, 0.5, 4.0, 1, 4); // latched in range, now above: NOT counted
  session.run('NUL', '2026-09-24', null, 0.5, 1.0, 0, null);
  session.run('UPA', '2026-09-23', 5, 0.4, 3.2, 0, null); // another date
  return db;
}

describe('the after-hours totals behind the premarket overall sentence', () => {
  it('counts the board-eligible names priced in range at capture, with no latch', () => {
    expect(readAfterHoursTotals(store(), '2026-09-24', { min: 1, max: 20 })).toEqual({
      // UPA DNB STALE; not NOREG (no universe row), ETF (ineligible), RAN (priced out), NUL (no price).
      eligible: 3,
      traded: 2,
      up: 1,
      down: 1,
    });
  });

  it('is all zeros for a date with no rows, never a null', () => {
    expect(readAfterHoursTotals(store(), '2026-01-01', { min: 1, max: 20 })).toEqual({
      eligible: 0,
      traded: 0,
      up: 0,
      down: 0,
    });
  });
});
