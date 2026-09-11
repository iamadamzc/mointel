import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SCHEMA_VERSION, openDatabase } from '@/lib/market/store/db';
import { readDemandStates, upsertTickerSessions } from '@/lib/market/store/repo';

/**
 * The trades-per-minute window, persisted.
 *
 * It was computed on every evaluation, used to decide ACTIVE/DEAD, documented
 * "for display", and then discarded — so the surface that needed it had
 * nothing, and the only alternative was re-reading minute_bars at render.
 *
 * The property that matters is not that a number arrives. It is that the SAME
 * array the verdict was computed from is the one shown, so a sparkline cannot
 * disagree with the graveyard. These tests pin the distinctions that make that
 * safe rather than the happy path, which would pass on a column storing
 * anything at all.
 */

const files: string[] = [];
const DATE = '2026-09-04';

function store() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'activity-window-')), 'market.db');
  files.push(file);
  return { db: openDatabase(file), file };
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

/** Every column the writer names, defaulted, so a fixture cannot drift from it. */
const COLUMNS = [
  'price', 'price_source', 'price_at', 'bar_close', 'bar_at', 'previous_close',
  'previous_close_source', 'reference_rth_close', 'reference_rth_close_date',
  'reference_rth_close_source', 'reference_rth_close_basis', 'percent_change',
  'volume_base', 'volume_base_through', 'volume_base_source', 'cumulative_volume',
  'volume_source', 'session_high', 'session_low', 'pm_vwap', 'pm_vwap_volume',
  'pm_vwap_coverage', 'rth_vwap', 'rth_vwap_volume', 'rth_vwap_coverage', 'ah_vwap',
  'ah_vwap_volume', 'ah_vwap_coverage', 'rvol', 'rvol_rank', 'previous_rvol_rank',
  'rvol_rank_change', 'rvol_confidence', 'baseline_sessions', 'baseline_average',
  'baseline_calculated_at', 'baseline_adjustment', 'bid', 'bid_size', 'ask', 'ask_size',
  'quote_at', 'spread', 'spread_pct', 'quote_invalid', 'luld_lower', 'luld_upper',
  'luld_at', 'halt_state', 'halt_raw', 'halt_at', 'high_res', 'top12_entered_at',
  'qualified_at', 'qualified_price', 'qualified_rvol', 'qualified_rank', 'latched',
  'ah_volume', 'ah_participation', 'ah_percent_change', 'ah_reference_close', 'ah_high',
  'ah_low', 'ah_rank', 'ah_previous_rank', 'ah_rank_change', 'ah_coverage',
  'ah_entered_topn_at', 'ah_entered_rank', 'ah_qualified_at', 'ah_qualification_price',
  'ah_latched', 'rth_final_close', 'rth_final_high', 'rth_final_low', 'rth_final_volume',
  'rth_final_rvol', 'rth_final_rank', 'rth_final_frozen_at', 'activity', 'dead_since',
  'dead_at_rank', 'dead_at_peak_trades', 'dead_at_price', 'death_count', 'activity_config',
  'activity_window', 'price_window', 'last_event_at',
  'pm_open_state', 'rth_open_state', 'ah_open_state',
  'pm_open_price', 'pm_open_at', 'pm_open_trades',
  'rth_open_price', 'rth_open_at', 'rth_open_trades',
  'ah_open_price', 'ah_open_at', 'ah_open_trades',
] as const;

function row(over: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    symbol: 'ACME',
    trading_date: DATE,
    feed: 'sip',
    updated_at: '2026-09-04T14:00:00Z',
  };
  for (const column of COLUMNS) base[column] = null;
  // The NOT NULL set, supplied explicitly so a schema change surfaces here as a
  // constraint error rather than as a silently different fixture.
  Object.assign(base, {
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
  });
  return { ...base, rvol: 10, rvol_rank: 1, activity: 'ACTIVE', ...over } as never;
}

function read(db: ReturnType<typeof store>['db'], symbol = 'ACME') {
  return readDemandStates(db, DATE, { limit: 20 }).find((s) => s.ticker === symbol);
}

describe('the window round-trips', () => {
  it('returns the same series it was given', () => {
    const { db } = store();
    upsertTickerSessions(db, [row({ activity_window: JSON.stringify([900, 850, 700, 40, 12]) })]);
    expect(read(db)?.activityWindow).toEqual([900, 850, 700, 40, 12]);
  });

  it('keeps a DEAD row zero series, because those zeros are a real measurement', () => {
    /*
     * The distinction the whole column turns on. All-zero is what a name that
     * went silent actually looks like, and it must survive storage — it is the
     * evidence behind the DEAD verdict, not an absence.
     */
    const { db } = store();
    upsertTickerSessions(db, [
      row({ activity: 'DEAD', activity_window: JSON.stringify([0, 0, 0, 0, 0]) }),
    ]);
    expect(read(db)?.activityWindow).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('NOT MEASURED is not silence', () => {
  it('reads NULL as undefined rather than as an empty or zeroed array', () => {
    /*
     * A stored zero-filled array would render as a confident flat line saying
     * "no trading" where the truth is "not looked at" — the most convincing
     * null there is. Absent must stay absent all the way to the surface.
     */
    const { db } = store();
    upsertTickerSessions(db, [row({ activity: 'UNKNOWN', activity_window: null })]);
    const state = read(db);
    expect(state?.activityWindow).toBeUndefined();
    expect(state?.activityWindow).not.toEqual([]);
  });

  it('refuses a malformed or wrong-typed payload instead of passing it on', () => {
    // The column is TEXT and nothing constrains it. A chart handed a string
    // renders something rather than failing, so the refusal belongs here.
    const { db } = store();
    upsertTickerSessions(db, [row({ activity_window: '{"not":"an array"}' })]);
    expect(read(db)?.activityWindow).toBeUndefined();

    upsertTickerSessions(db, [row({ symbol: 'BAD2', activity_window: '[1, "x", 3]' })]);
    expect(read(db, 'BAD2')?.activityWindow).toBeUndefined();
  });
});

describe('a restart must not blank a stored series', () => {
  it('preserves the window when the engine has nothing to report', () => {
    /*
     * After a restart the engine's minute map is empty, so it writes NULL. That
     * is amnesia, not a measurement, and overwriting a real series with it
     * would empty the sparkline for a name that had one.
     */
    const { db } = store();
    upsertTickerSessions(db, [row({ activity_window: JSON.stringify([500, 400, 300, 200, 100]) })]);
    upsertTickerSessions(db, [row({ activity: 'UNKNOWN', activity_window: null })]);
    expect(read(db)?.activityWindow).toEqual([500, 400, 300, 200, 100]);
  });

  it('a real later reading still wins', () => {
    const { db } = store();
    upsertTickerSessions(db, [row({ activity_window: JSON.stringify([500, 400, 300, 200, 100]) })]);
    upsertTickerSessions(db, [row({ activity_window: JSON.stringify([10, 9, 8, 7, 6]) })]);
    expect(read(db)?.activityWindow).toEqual([10, 9, 8, 7, 6]);
  });
});

describe('the column reaches an EXISTING store, not only a fresh one', () => {
  /*
   * The trap this desk now lives with, tested as behaviour rather than as a
   * declaration.
   *
   * Since the 0e guard, a store already reporting the current SCHEMA_VERSION
   * short-circuits and ADDED_COLUMNS never runs. So a column added to the
   * CREATE TABLE alone reaches every FRESH store — which is every test store,
   * built whole from SCHEMA — and never reaches PRODUCTION, which already
   * reports current. It would pass every other test in this file and fail
   * silently on the one machine that matters.
   *
   * So this builds the case that actually breaks: a store WITHOUT the column,
   * reporting a version behind, reopened normally.
   */
  it('is added by migration to a store that predates it', () => {
    /*
     * Built the way the real case arises rather than by dropping a column:
     * a store whose ticker_session already EXISTS without the column, at a
     * version behind. CREATE TABLE IF NOT EXISTS is then a no-op — Ops's own
     * comment at db.ts says exactly this — so ADDED_COLUMNS is the only thing
     * that can put the column there.
     */
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-window-old-'));
    const file = path.join(dir, 'market.db');
    files.push(file);

    const raw = new Database(file);
    // Carries the two columns the schema's INDEXES reference, because index
    // creation runs before ADDED_COLUMNS can supply them. Everything else is
    // deliberately absent -- that is the condition under test.
    raw.exec(
      'CREATE TABLE ticker_session (symbol TEXT NOT NULL, trading_date TEXT NOT NULL, ' +
        'rvol_rank INTEGER, ah_rank INTEGER, PRIMARY KEY (symbol, trading_date))',
    );
    raw.pragma(`user_version = ${SCHEMA_VERSION - 1}`);
    raw.close();

    const reopened = openDatabase(file);
    const columns = (
      reopened.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
    ).map((c) => c.name);

    expect(columns).toContain('activity_window');
    // Guard the guard: if the stub table were silently replaced the assertion
    // above would pass for the wrong reason.
    expect(columns).toContain('activity');
  });
});
