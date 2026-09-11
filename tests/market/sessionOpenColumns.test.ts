/**
 * Session-open columns: the migration, and the NULL rule on the read.
 *
 * THE WRITE SIDE IS NOT TESTED HERE AND DOES NOT NEED TO BE. `TickerSessionRow`
 * requires all nine, so a `toRow` that fails to supply them does not compile —
 * which is how the omission was actually caught while building this. That is
 * the same argument that made `jobId` required rather than optional: the
 * compiler reaches a place no test in this suite does.
 *
 * What the compiler CANNOT catch is the read collapsing "never asked" into
 * "asked and found nothing", so that is what these pin. Rows are inserted with
 * raw SQL rather than through the writer, deliberately: these are assertions
 * about how a stored row is interpreted, and routing them through the writer
 * would test the writer's defaults instead.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { readDemandStates } from '@/lib/market/store/repo';

const files: string[] = [];
const DATE = '2026-09-10';

function store(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-opens-')), 'market.db');
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

/** Inserts the minimum a row needs, plus whatever opens the case is about. */
function insert(db: MarketDatabase, symbol: string, opens: Record<string, unknown> = {}) {
  const columns = ['symbol', 'trading_date', 'price', 'rvol_rank', 'feed', 'updated_at', ...Object.keys(opens)];
  const values = [symbol, DATE, 4.15, 1, 'sip', '2026-09-10T12:00:00.000Z', ...Object.values(opens)];
  db.prepare(
    `INSERT INTO ticker_session (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
  ).run(...values);
}

const read = (db: MarketDatabase, symbol: string) =>
  readDemandStates(db, DATE, { limit: 20 }).find((s) => s.ticker === symbol);

describe('a row that was never asked is not a row that found nothing', () => {
  it('reads all-null opens as undefined, never as a populated set of nulls', () => {
    /*
     * `sessionOpens` is optional on DemandState precisely so this read can say
     * "not measured". An empty set renders as three sessions that have not
     * traded — a confident claim about something nobody looked at, and the
     * same failure as a NULL activity read as UNKNOWN.
     */
    const db = store();
    insert(db, 'NOOPENS');

    expect(read(db, 'NOOPENS')?.sessionOpens).toBeUndefined();
  });

  it('keeps a partial set, because a session that has not opened yet IS a measurement', () => {
    // At 09:00 the regular session genuinely has no open. Premarket populated
    // with regular null is real; only ALL nine null is the absent case.
    const db = store();
    insert(db, 'PARTIAL', {
      pm_open_price: 3.9,
      pm_open_at: '2026-09-10T08:00:00.000Z',
      pm_open_trades: 12,
    });

    const state = read(db, 'PARTIAL');
    expect(state?.sessionOpens).toBeDefined();
    expect(state?.sessionOpens?.premarket.price).toBe(3.9);
    expect(state?.sessionOpens?.regular.price).toBeNull();
  });
});

describe('the trade count is the honesty flag on a thin anchor', () => {
  it('keeps a null count null rather than defaulting it to zero', () => {
    /*
     * A bar with no reported trade count is not a bar with one trade. He asked
     * for the first print WITH its count so an open resting on 3 trades stays
     * distinguishable from one resting on 400 — a zero default erases exactly
     * that, and the price would still look authoritative beside it.
     */
    const db = store();
    insert(db, 'THIN', {
      pm_open_price: 3.9,
      pm_open_at: '2026-09-10T08:00:00.000Z',
      pm_open_trades: null,
    });

    const state = read(db, 'THIN');
    expect(state?.sessionOpens?.premarket.price).toBe(3.9);
    expect(state?.sessionOpens?.premarket.tradeCount).toBeNull();
    expect(state?.sessionOpens?.premarket.tradeCount).not.toBe(0);
  });

  it('round-trips the anchoring minute so a reader can see WHICH print it was', () => {
    const db = store();
    insert(db, 'ANCHOR', {
      rth_open_price: 4.01,
      rth_open_at: '2026-09-10T13:30:00.000Z',
      rth_open_trades: 402,
    });

    const open = read(db, 'ANCHOR')?.sessionOpens?.regular;
    expect(open?.price).toBe(4.01);
    expect(open?.at).toBe('2026-09-10T13:30:00.000Z');
    expect(open?.tradeCount).toBe(402);
  });
});

describe('the migration reaches a store that already exists', () => {
  it('adds all nine to a ticker_session built without them', () => {
    /*
     * THE ONE THAT COULD FAIL IN PRODUCTION AND NOWHERE ELSE. A store already
     * reporting the current schema version short-circuits, so ADDED_COLUMNS
     * never runs and a column declared only in CREATE TABLE reaches every
     * fresh store — every test store — and no existing one. This builds that
     * exact case rather than asserting a declaration.
     */
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-opens-mig-')), 'market.db');
    files.push(file);

    const stub = openDatabase(file);
    stub.exec('DROP TABLE ticker_session');
    stub.exec(`CREATE TABLE ticker_session (
      symbol TEXT NOT NULL, trading_date TEXT NOT NULL, price REAL,
      rvol_rank INTEGER, ah_rank INTEGER, updated_at TEXT NOT NULL,
      PRIMARY KEY (symbol, trading_date)
    )`);
    stub.pragma('user_version = 25');
    stub.close();

    const reopened = openDatabase(file);
    const columns = (
      reopened.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
    ).map((c) => c.name);

    for (const column of [
      'pm_open_price', 'pm_open_at', 'pm_open_trades',
      'rth_open_price', 'rth_open_at', 'rth_open_trades',
      'ah_open_price', 'ah_open_at', 'ah_open_trades',
    ]) {
      expect(columns, `${column} never reached an existing store`).toContain(column);
    }
    reopened.close();
  });
});

describe('the three state columns, schema 27', () => {
  /*
   * THE CASE THE COLUMNS EXIST FOR, and the one the store could not express
   * before. A name that has not traded in premarket has a null price -- and a
   * null price alone cannot say whether the session had not begun or ran with
   * nothing printed. Measured on production: ~20% of the names at the top of a
   * gap-sorted board in premarket are in exactly this state.
   */
  it('keeps a session open with a state but no price, rather than dropping the set', () => {
    const db = store();
    insert(db, 'NOPRINT', {
      pm_open_state: 'NO_PRINT',
      rth_open_state: 'NOT_STARTED',
      ah_open_state: 'NOT_STARTED',
    });

    const opens = read(db, 'NOPRINT')?.sessionOpens;

    expect(opens).toBeDefined();
    expect(opens?.premarket.state).toBe('NO_PRINT');
    expect(opens?.premarket.price).toBeNull();
    expect(opens?.regular.state).toBe('NOT_STARTED');

    db.close();
  });

  it('round-trips a state beside a real open', () => {
    const db = store();
    insert(db, 'TRADED', {
      pm_open_state: 'OPEN',
      pm_open_price: 3.9,
      pm_open_at: '2026-09-10T08:31:00.000Z',
      pm_open_trades: 14,
    });

    const open = read(db, 'TRADED')?.sessionOpens?.premarket;

    expect(open?.state).toBe('OPEN');
    expect(open?.price).toBe(3.9);
    expect(open?.tradeCount).toBe(14);

    db.close();
  });

  /*
   * Rows written before this migration carry values and no state. UNKNOWN is a
   * member of the type rather than an optional field exactly so those rows keep
   * an honest answer instead of being described by a guess.
   */
  it('falls back to UNKNOWN for a pre-27 row that has a price but no state', () => {
    const db = store();
    insert(db, 'LEGACY', { pm_open_price: 2.5, pm_open_at: '2026-09-10T08:30:00.000Z' });

    const open = read(db, 'LEGACY')?.sessionOpens?.premarket;

    expect(open?.price).toBe(2.5);
    expect(open?.state).toBe('UNKNOWN');

    db.close();
  });

  /* A row with neither values nor states is still the never-asked case. */
  it('still reads a row with no opens and no states as undefined', () => {
    const db = store();
    insert(db, 'EMPTY');
    expect(read(db, 'EMPTY')?.sessionOpens).toBeUndefined();
    db.close();
  });

  /*
   * The migration half. A column added to CREATE TABLE but not to ADDED_COLUMNS
   * reaches every fresh store and no existing one -- which is the failure that
   * would look like "works on my machine" forever.
   */
  it('adds the three columns to a store that predates them', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-open-state-')), 'market.db');
    files.push(file);

    const older = openDatabase(file);
    for (const column of ['pm_open_state', 'rth_open_state', 'ah_open_state']) {
      older.exec(`ALTER TABLE ticker_session DROP COLUMN ${column}`);
    }
    older.pragma('user_version = 26');
    older.close();

    const upgraded = openDatabase(file);
    const names = (
      upgraded.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
    ).map((c) => c.name);

    expect(names).toContain('pm_open_state');
    expect(names).toContain('rth_open_state');
    expect(names).toContain('ah_open_state');

    upgraded.close();
  });
});
