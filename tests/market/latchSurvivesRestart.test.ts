import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { upsertTickerSessions } from '@/lib/market/store/repo';

/**
 * A GUARD THAT ONLY FAILS WHERE IT MAKES NO DIFFERENCE PASSES EVERY TEST
 * ANYONE THINKS TO WRITE.
 *
 * `engine.ts` states the invariant outright: `latched` answers "did this name
 * ever qualify today" and "is never cleared -- correctly, since it is what
 * makes re-entry possible". Nothing in the engine lowers it — one rise, no
 * fall. The store's upsert took `excluded.*` directly, so the FIRST FLUSH
 * AFTER A RESTART, whose runtime has latched nothing yet, wrote NULL and 0
 * over it.
 *
 * It stayed invisible because an in-band name RE-LATCHES on the next flush and
 * loses nothing. An out-of-band name cannot — and out-of-band is the ONLY case
 * the latch exists for. **So the field was destroyed in exactly the population
 * it was built to serve and looked healthy in the other 98%.**
 *
 * Measured on production 2026-09-03, after a 19:04 ET restart: 57 of the 61
 * out-of-band latches gone, all 2,870 in-band ones intact, 0 in-band wiped.
 * 09-02 had no mid-session restart and lost nothing; 09-04's restart was at
 * 03:48 ET before any latch existed, and also lost nothing.
 *
 * The in-band case below passes with or without the fix. It is here to show
 * why the happy path could never have caught this.
 */
const files: string[] = [];
const DATE = '2026-09-03';

function store() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'latch-')), 'market.db');
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

function row(db: ReturnType<typeof store>, over: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    symbol: 'ACME',
    trading_date: DATE,
    feed: 'sip',
    updated_at: '2026-09-03T23:05:00Z',
  };
  const columns = (
    db.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
  ).map((c) => c.name);
  for (const column of columns) if (!(column in base)) base[column] = null;
  Object.assign(base, NOT_NULL, over);
  return base as never;
}

const stored = (db: ReturnType<typeof store>) =>
  db
    .prepare('SELECT price, latched, ah_latched, qualified_at, qualified_rank FROM ticker_session')
    .get() as {
    price: number | null;
    latched: number;
    ah_latched: number;
    qualified_at: string | null;
    qualified_rank: number | null;
  };

/** What the engine wrote when the name qualified, out of band by the close. */
const QUALIFIED = {
  latched: 1,
  qualified_at: '2026-09-03T12:15:00Z',
  qualified_price: 4.5,
  qualified_rvol: 31.2,
  qualified_rank: 3,
  price: 0.82,
};

/** What a restarted engine flushes: nothing latched yet, price still current. */
const AFTER_RESTART = {
  latched: 0,
  qualified_at: null,
  qualified_price: null,
  qualified_rvol: null,
  qualified_rank: null,
  price: 0.79,
};

describe('a latch survives the first flush after a restart', () => {
  it('KEEPS an out-of-band latch, which is the only case that matters', () => {
    const db = store();
    upsertTickerSessions(db, [row(db, QUALIFIED)]);
    upsertTickerSessions(db, [row(db, AFTER_RESTART)]);

    const after = stored(db);
    expect(after.latched).toBe(1);
    expect(after.qualified_at).toBe('2026-09-03T12:15:00Z');
    expect(after.qualified_rank).toBe(3);
    // The live fields still advance — only the write-once ones are held.
    expect(after.price).toBe(0.79);
  });

  it('also keeps an after-hours latch, the same defect in the same statement', () => {
    const db = store();
    upsertTickerSessions(db, [
      row(db, { ah_latched: 1, ah_qualified_at: '2026-09-03T21:10:00Z' }),
    ]);
    upsertTickerSessions(db, [row(db, { ah_latched: 0, ah_qualified_at: null })]);

    expect(stored(db).ah_latched).toBe(1);
  });

  /**
   * MAX, not COALESCE. 0 is not NULL, so COALESCE on `latched` would keep the
   * stored 0 and the real latch could never land — a fix that broke the thing
   * it was protecting.
   */
  it('still lets a latch RISE, which COALESCE would have blocked', () => {
    const db = store();
    upsertTickerSessions(db, [row(db, { latched: 0 })]);
    upsertTickerSessions(db, [row(db, { latched: 1, qualified_at: '2026-09-03T12:15:00Z' })]);

    const after = stored(db);
    expect(after.latched).toBe(1);
    expect(after.qualified_at).toBe('2026-09-03T12:15:00Z');
  });

  /**
   * PASSES WITH OR WITHOUT THE FIX, and that is the point of including it.
   * An in-band name re-latches on the very next flush, so the wipe leaves no
   * trace — 98% of rows look like this, and none of them were evidence the
   * latch worked.
   */
  it('shows why the in-band case could never have caught this', () => {
    const db = store();
    upsertTickerSessions(db, [row(db, { ...QUALIFIED, price: 6.4 })]);
    upsertTickerSessions(db, [row(db, { ...AFTER_RESTART, price: 6.4 })]);
    upsertTickerSessions(db, [
      row(db, { latched: 1, qualified_at: '2026-09-03T12:15:00Z', price: 6.4 }),
    ]);

    expect(stored(db).latched).toBe(1);
  });
});
