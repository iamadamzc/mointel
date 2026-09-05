import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_ACTIVITY_CONFIG, buildPriceWindow, minuteSlot, windowSlots } from '@/lib/market/activity';
import { SCHEMA_VERSION, openDatabase } from '@/lib/market/store/db';
import { readDemandStates, upsertTickerSessions } from '@/lib/market/store/repo';

/**
 * Minute closes beside the activity window.
 *
 * The line answers "going up", which the shipped sparkline does not — it shows
 * trades per minute and nothing about direction. Two constraints decide its
 * shape and both were measured rather than chosen, so these pin them rather
 * than the happy path.
 */

const files: string[] = [];
const DATE = '2026-09-04';
const NOW = Date.parse('2026-09-04T14:30:00.000Z');

function store() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'price-window-')), 'market.db');
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

const SLOTS = windowSlots(NOW, DEFAULT_ACTIVITY_CONFIG);

describe('the two series cover the same minutes, structurally', () => {
  it('builds over the slots the verdict was judged on', () => {
    /*
     * `windowSlots` is exported for exactly this: a second series that built
     * its own window would agree by coincidence, and the price line's honesty
     * is a property of the PAIR.
     */
    const closes = new Map(SLOTS.map((slot, i) => [slot, 10 + i]));
    const window = buildPriceWindow(closes, SLOTS);

    expect(window?.closes).toHaveLength(SLOTS.length);
    expect(window?.startsAt).toBe(0);
    expect(window?.covered).toBe(SLOTS.length);
  });
});

describe('it starts at the first traded minute, never at the window edge', () => {
  it('trims a leading hole and says where it starts', () => {
    /*
     * 36-42% of top-12 rows begin with a hole. A line drawn from the edge shows
     * FLAT-THEN-RISING where the truth is ABSENT-THEN-RISING — on precisely the
     * setup he hunts, a name that sits silent and then moves.
     *
     * 36-42% is from `data/market.db`, the LOCAL desk rather than production,
     * pending a re-take. This assertion does not rest on the rate — it pins
     * that a leading hole is trimmed, which holds at any of them.
     */
    const closes = new Map([[SLOTS[2]!, 4.2], [SLOTS[3]!, 4.9]]);
    const window = buildPriceWindow(closes, SLOTS);

    expect(window?.startsAt).toBe(2);
    expect(window?.closes[0]).toBe(4.2);
    expect(window?.closes[0]).not.toBeNull();
  });

  it('is null when nothing traded in the window at all', () => {
    // Not an empty array: nothing observed is absent, and an empty series would
    // render as a drawn line with no points rather than as no line.
    expect(buildPriceWindow(new Map(), SLOTS)).toBeNull();
  });
});

describe('a hole is an absence, not a carried price', () => {
  it('leaves an untraded interior minute null rather than repeating the last close', () => {
    /*
     * The distinction the two series cannot share. The activity window's zeros
     * are OBSERVATIONS — that minute genuinely had zero trades. These holes are
     * ABSENCES — there is no price, because nothing traded. Carrying the last
     * close forward draws a flat segment that reads as a held price.
     */
    const closes = new Map([[SLOTS[0]!, 3.0], [SLOTS[2]!, 3.4]]);
    const window = buildPriceWindow(closes, SLOTS);

    expect(window?.closes[1]).toBeNull();
    expect(window?.closes[1]).not.toBe(3.0);
  });

  it('counts only real prices in covered', () => {
    const closes = new Map([[SLOTS[0]!, 3.0], [SLOTS[2]!, 3.4]]);
    const window = buildPriceWindow(closes, SLOTS);

    expect(window?.covered).toBe(2);
    expect(window!.covered).toBeLessThan(window!.closes.length);
  });
});

/** Every column the writer names, defaulted, so a fixture cannot drift from it. */
const NOT_NULL = {
  volume_base: 0,
  pm_vwap_coverage: 'NONE',
  rth_vwap_coverage: 'NONE',
  ah_vwap_coverage: 'NONE',
  rvol_confidence: 'OK',
  quote_invalid: 0,
  halt_state: 'TRADING',
  high_res: 0,
  latched: 0,
  ah_coverage: 'NONE',
  ah_latched: 0,
};

/**
 * Built from the OPEN store's own columns rather than a hardcoded list, so a
 * schema change cannot leave this fixture quietly describing a different table.
 */
function row(db: ReturnType<typeof store>, over: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    symbol: 'ACME',
    trading_date: DATE,
    feed: 'sip',
    updated_at: '2026-09-04T14:30:00Z',
  };
  const columns = (
    db.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
  ).map((c) => c.name);
  for (const column of columns) if (!(column in base)) base[column] = null;
  Object.assign(base, NOT_NULL, { rvol: 10, rvol_rank: 1, activity: 'ACTIVE' }, over);
  return base as never;
}

const read = (db: ReturnType<typeof store>) =>
  readDemandStates(db, DATE, { limit: 20 }).find((s) => s.ticker === 'ACME');

describe('it round-trips, and refuses what it cannot trust', () => {
  it('returns the series it was given, and derives covered rather than storing it', () => {
    const db = store();
    upsertTickerSessions(db, [
      row(db, { price_window: JSON.stringify({ startsAt: 2, closes: [4.2, null, 4.9] }) }),
    ]);

    const window = read(db)?.priceWindow;
    expect(window?.startsAt).toBe(2);
    expect(window?.closes).toEqual([4.2, null, 4.9]);
    // Recomputed on read: a stored count that disagreed with its array is the
    // one field nothing could catch, and it decides whether a line is drawn.
    expect(window?.covered).toBe(2);
  });

  it('refuses a series whose first entry is a hole', () => {
    /*
     * It contradicts its own contract — the array is trimmed to the first
     * traded minute, so a leading null means the writer and the reader disagree
     * about what `startsAt` points at. Refused rather than repaired.
     */
    const db = store();
    upsertTickerSessions(db, [
      row(db, { price_window: JSON.stringify({ startsAt: 0, closes: [null, 4.9] }) }),
    ]);
    expect(read(db)?.priceWindow).toBeUndefined();
  });

  it('refuses a malformed or wrong-typed payload instead of passing it on', () => {
    const db = store();
    upsertTickerSessions(db, [
      row(db, { price_window: '[1,2,3]' })]);
    expect(read(db)?.priceWindow).toBeUndefined();

    upsertTickerSessions(db, [
      row(db, { price_window: JSON.stringify({ startsAt: 0, closes: [4.2, 'x'] }) }),
    ]);
    expect(read(db)?.priceWindow).toBeUndefined();

    upsertTickerSessions(db, [
      row(db, { price_window: JSON.stringify({ startsAt: -1, closes: [4.2] }) }),
    ]);
    expect(read(db)?.priceWindow).toBeUndefined();
  });

  it('reads NULL as undefined rather than as an empty line', () => {
    const db = store();
    upsertTickerSessions(db, [
      row(db, { price_window: null })]);
    expect(read(db)?.priceWindow).toBeUndefined();
  });

  it('does not blank a stored series when a restart has nothing to report', () => {
    // After a restart the engine's minute maps are empty, so it writes NULL.
    // That is amnesia, not a measurement.
    const db = store();
    upsertTickerSessions(db, [
      row(db, { price_window: JSON.stringify({ startsAt: 0, closes: [4.2, 4.9] }) }),
    ]);
    upsertTickerSessions(db, [
      row(db, { price_window: null })]);
    expect(read(db)?.priceWindow?.closes).toEqual([4.2, 4.9]);
  });
});

describe('the column reaches an EXISTING store, not only a fresh one', () => {
  it('is added by migration to a store that predates it', () => {
    /*
     * Since the 0e guard, a store already reporting the current SCHEMA_VERSION
     * short-circuits and ADDED_COLUMNS never runs — so a column added to the
     * CREATE TABLE alone reaches every FRESH store and never reaches
     * PRODUCTION. This builds the case that actually breaks.
     */
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'price-window-old-'));
    const file = path.join(dir, 'market.db');
    files.push(file);

    const raw = new Database(file);
    raw.exec(
      'CREATE TABLE ticker_session (symbol TEXT NOT NULL, trading_date TEXT NOT NULL, ' +
        'rvol_rank INTEGER, ah_rank INTEGER, PRIMARY KEY (symbol, trading_date))',
    );
    raw.pragma(`user_version = ${SCHEMA_VERSION - 1}`);
    raw.close();

    const columns = (
      openDatabase(file).prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
    ).map((c) => c.name);

    expect(columns).toContain('price_window');
    // Guard the guard: a silently replaced stub would pass the line above for
    // the wrong reason.
    expect(columns).toContain('activity_window');
  });
});

describe('the slot helper is shared, not restated', () => {
  it('is the same window the activity verdict is judged over', () => {
    // Two copies of "which minutes" is how a pair comes to disagree.
    const span = Math.max(DEFAULT_ACTIVITY_CONFIG.deadMinutes, DEFAULT_ACTIVITY_CONFIG.reviveMinutes);
    expect(SLOTS).toHaveLength(span);
    expect(SLOTS[SLOTS.length - 1]).toBe(
      minuteSlot(NOW - (DEFAULT_ACTIVITY_CONFIG.settleMinutes + 1) * 60_000),
    );
  });
});
