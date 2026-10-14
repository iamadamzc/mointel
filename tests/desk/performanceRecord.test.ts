import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentTickers,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import { openDatabase, SCHEMA_VERSION, type MarketDatabase } from '@/lib/market/store/db';
import { writeFloatBound } from '@/lib/market/store/floatBoundRepo';
import { computeCallOutcome, type CallRow } from '@/lib/desk/performance/outcomes';
import { maybeRunCallOutcomes, readCallsFor, runCallOutcomes, storedOutcomeDates } from '@/lib/desk/performance/job';
import { floatAtCapture } from '@/lib/research/floatCapture';
import { floatCellFor, type FloatBoundRow, type StoredHolding } from '@/lib/research/floatJob';
import { readFloatBoundsAt } from '@/lib/research/floatRead';
import { upsertDailyBars, type NewDailyBar } from '@/lib/research/history';
import type { ResearchAnalysisVersion, SupplyBlock } from '@/lib/research/types';

/**
 * The performance record (design note docs/research/performance-record/design-note-2026-10-06.md as amended at
 * f544af1a). Pins the schema, A8's freeze, the pre-registered controls (ii)-(iv) of section 6.2 and A6, A1's official
 * close with no fallback, the refusals, and the labels copied from the frozen row (A3, A8).
 */

const files: string[] = [];
function temporaryPath(): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'perf-record-')), 'market.db');
  files.push(file);
  return file;
}
afterEach(() => {
  for (const file of files.splice(0)) {
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* the OS will clean up */
    }
  }
});

let slot = 0;
function checkpoint(
  db: MarketDatabase,
  type: string,
  tradingDate: string,
  completedAt: string,
  target: string | null = null,
  status: 'COMPLETE' | 'FAILED' = 'COMPLETE',
): number {
  slot += 1;
  const id = claimAssessmentSlot(db, {
    tradingDate,
    targetTradingDate: target,
    assessmentType: type,
    scheduledFor: `${tradingDate}T${String(slot % 24).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}:00.000Z`,
    startedAt: completedAt,
    generatedLate: false,
    sessionPhase: 'PREMARKET',
    board: 'DAILY_RVOL',
    rankingDefinition: 'Daily RVOL',
  }) as number;
  completeAssessment(db, id, {
    completedAt,
    status,
    tickerCount: 1,
    modelCalls: 0,
    runtimeMs: 1,
    marketFingerprint: null,
    researchFingerprint: null,
    notes: '',
    metadata: {},
  } as Parameters<typeof completeAssessment>[2]);
  return id;
}

function ticker(overrides: Partial<AssessmentTickerRecord> = {}): AssessmentTickerRecord {
  return {
    ticker: 'ACME',
    assessmentRank: 1,
    liveSessionRank: 1,
    price: 2,
    percentChange: 50,
    rvol: 12,
    rvolRank: 1,
    ahPercentChange: null,
    ahVolume: null,
    ahParticipation: null,
    ahRank: null,
    volume: 5_000_000,
    spreadPct: 0.5,
    sessionHigh: 2.2,
    sessionLow: 1.5,
    referenceClose: 2,
    referenceBasis: 'CURRENT_SESSION',
    priceAt: null,
    cycle: 'GREEN_FRESH_FRONTSIDE',
    catalyst: 'STRONG',
    structure: 'CLEAN',
    intelligenceStatus: 'AUTO',
    intelligenceSource: 'AUTO',
    analysisVersionId: 7,
    evidenceFingerprint: 'e',
    cycleFingerprint: 'c',
    levelSummary: null,
    haltState: 'TRADING',
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
    ...overrides,
  };
}

/** One ticker_session row for the outcome date. `official` writes the recap's official-close condition. */
function session(
  db: MarketDatabase,
  date: string,
  values: { previousClose?: number | null; high?: number | null; low?: number | null; official?: number | null; basis?: string; rthFinalClose?: number | null },
  symbol = 'ACME',
): void {
  db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, previous_close, rth_final_high, rth_final_low, rth_final_close,
       reference_rth_close, reference_rth_close_basis, reference_rth_close_date, feed, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sip', ?)`,
  ).run(
    symbol,
    date,
    values.previousClose ?? 2,
    values.high === undefined ? 3 : values.high,
    values.low === undefined ? 1.9 : values.low,
    values.rthFinalClose ?? null,
    values.official === undefined ? 2.5 : values.official,
    values.basis ?? 'CURRENT_SESSION',
    date,
    `${date}T21:00:00.000Z`,
  );
}

function bar(db: MarketDatabase, date: string, ts: string, high: number, open = high, symbol = 'ACME'): void {
  db.prepare(
    `INSERT INTO minute_bars (symbol, trading_date, ts, open, high, low, close, volume, source, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 100, 'test', ?)`,
  ).run(symbol, date, ts, open, high, Math.min(open, high), high, ts);
}

const call = (db: MarketDatabase, assessmentId: number): CallRow => {
  const rows = readCallsFor(db, '2026-10-06').concat(readCallsFor(db, '2026-11-04'), readCallsFor(db, '2026-10-07'));
  return rows.find((r) => r.assessmentId === assessmentId)!;
};

const AFTER = new Date('2026-10-07T03:00:00Z'); // 23:00 ET on 10-06: the outcome session is over

describe('schema v30', () => {
  it('upgrades a v29-shaped store: the outcomes table and the two float columns appear', () => {
    const file = temporaryPath();
    const fresh = openDatabase(file);
    fresh.exec('DROP TABLE desk_call_outcomes');
    for (const column of ['float_state', 'float_reason']) {
      fresh.exec(`ALTER TABLE desk_assessment_tickers DROP COLUMN ${column}`);
    }
    fresh.pragma('user_version = 29');
    fresh.close();

    const db = openDatabase(file);
    expect(SCHEMA_VERSION).toBe(30);
    expect(db.pragma('user_version', { simple: true })).toBe(30);
    const columns = (table: string) =>
      (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
    expect(columns('desk_assessment_tickers')).toEqual(expect.arrayContaining(['float_state', 'float_reason']));
    expect(columns('desk_call_outcomes')).toEqual(expect.arrayContaining(['close_pct', 'close_state', 'priority_grade', 'float_state']));
    db.close();
  });
});

describe('the float frozen at capture (A8)', () => {
  const READ = '2026-09-25';
  const D = '2026-09-29';
  const COUNT = { kind: 'COUNT' as const, shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' };
  const holdings: StoredHolding[] = [];
  const floatRow = (over: Partial<FloatBoundRow> = {}): FloatBoundRow => ({
    symbol: 'ACME',
    asOfDate: READ,
    cik: '555',
    count: COUNT,
    holdings,
    splitSinceCount: 'NONE',
    announcedSplits: [],
    issuanceFilings: [],
    statedCount: null,
    analysisVersionId: 7,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: floatCellFor({ cik: '555', count: COUNT, holdings, splitSinceCount: 'NONE', ledger: [], asOfDate: READ, issuanceFiled: false }),
    computedAt: `${READ}T23:00:00.000Z`,
    ...over,
  });
  /** A current analysis carrying `ledger` (only the field the float reads). */
  const analysed = (ledger: SupplyBlock[] | null = []): ResearchAnalysisVersion =>
    ({ dossier: { structure: { supplyLedger: ledger } } }) as unknown as ResearchAnalysisVersion;
  const dailyBar = (date: string): NewDailyBar =>
    ({
      symbol: 'ACME',
      tradingDate: date,
      open: 10,
      high: 10,
      low: 10,
      close: 10,
      volume: 1,
      tradeCount: null,
      vwap: null,
      adjustment: 'split',
      splitFactor: 1,
      source: 'alpaca-daily-deep',
      fetchedAt: `${D}T23:00:00.000Z`,
    }) as NewDailyBar;

  it('stores the cell the checkpoint saw; a later upsert of the row leaves the stored state unchanged', () => {
    const db = openDatabase(temporaryPath());
    upsertDailyBars(db, [dailyBar('2026-07-31'), dailyBar(D)]);
    // The row as the checkpoint sees it: an announced split ahead refuses the number.
    writeFloatBound(db, floatRow({ announcedSplits: ['2026-09-28'] }));
    const captured = floatAtCapture(db, 'ACME', D, analysed());
    expect(captured).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });

    const id = checkpoint(db, 'PREMARKET_0700', D, `${D}T11:00:30.000Z`);
    insertAssessmentTickers(db, id, [ticker({ floatState: captured.state, floatReason: captured.reason })]);

    // A later job run rewrites the same (symbol, as_of_date) row; a fresh read now gives a different cell...
    writeFloatBound(db, floatRow({ announcedSplits: [], computedAt: `${D}T15:00:00.000Z` }));
    expect(floatAtCapture(db, 'ACME', D, analysed()).state).toBe('PRODUCED');

    // ...and the checkpoint row still holds what the checkpoint saw.
    const stored = db
      .prepare('SELECT float_state, float_reason FROM desk_assessment_tickers WHERE assessment_id = ?')
      .get(id) as { float_state: string; float_reason: string | null };
    expect(stored).toEqual({ float_state: 'CANNOT_VERIFY', float_reason: 'SPLIT_SINCE_COUNT' });
  });

  it('is NOT_YET when no float row exists on or before the checkpoint date', () => {
    const db = openDatabase(temporaryPath());
    expect(floatAtCapture(db, 'NONE', D, analysed())).toEqual({ state: 'NOT_YET', reason: null });
  });

  /*
   * L8: the record freezes what the BOARD shows. A name with no analysis, on a store whose research tables were read,
   * is the board's filings-only bound; it was frozen as ISSUANCE_NOT_CHECKED while the worker passed a null ledger.
   */
  it('a name with no analysis freezes as the board shows it: PRODUCED (filings only), not ISSUANCE_NOT_CHECKED', () => {
    const db = openDatabase(temporaryPath());
    upsertDailyBars(db, [dailyBar('2026-07-31'), dailyBar(D)]);
    writeFloatBound(db, floatRow());
    expect(readFloatBoundsAt(db, ['ACME'], D).ACME).toMatchObject({ state: 'PRODUCED', filingsOnly: true });
    expect(floatAtCapture(db, 'ACME', D, undefined)).toEqual({ state: 'PRODUCED', reason: null });
  });

  it('could not tell stays could not tell: no research tables, or an analysis with no ledger, is ISSUANCE_NOT_CHECKED', () => {
    const db = openDatabase(temporaryPath());
    upsertDailyBars(db, [dailyBar('2026-07-31'), dailyBar(D)]);
    writeFloatBound(db, floatRow());
    expect(floatAtCapture(db, 'ACME', D, analysed(null))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    db.exec('DROP TABLE research_jobs');
    expect(readFloatBoundsAt(db, ['ACME'], D).ACME).toMatchObject({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
    expect(floatAtCapture(db, 'ACME', D, undefined)).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
  });

  it('the capture worker passes the analysis itself (a SOURCE assertion: no test drives worker/desk-assessments.ts)', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../worker/desk-assessments.ts'), 'utf8');
    expect(source).toMatch(/floatAtCapture\(db, row\.symbol, scheduled\.tradingDate, analysis \?\? undefined\)/);
  });
});

describe('outcomes', () => {
  it('measures a recap call against its next session, with the official close as a price after the call (A2)', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker()]);
    session(db, '2026-10-06', { previousClose: 2, high: 3, low: 1.9, official: 2.5 });
    bar(db, '2026-10-06', '2026-10-06T11:30:00.000Z', 2.8); // 07:30 ET
    bar(db, '2026-10-06', '2026-10-06T13:45:00.000Z', 2.9, 2.6); // 09:45 ET, the regular-session high

    const out = computeCallOutcome(db, call(db, id), AFTER)!;
    expect(out.session.state).toBe('PRODUCED');
    expect(out.high0400Close).toEqual({ value: 0.5, state: 'PRODUCED', reason: null });
    expect(out.highAfterCall.value).toBeCloseTo(0.45, 10); // max(2.9 minute high, 2.5 close) vs 2
    expect(out.high0700To1000.value).toBeCloseTo(0.45, 10);
    expect(out.close.value).toBeCloseTo(0.25, 10);
    expect(out.retention.value).toBeCloseTo(0.5 / 0.9, 10);
    expect(out.giveback.value).toBeCloseTo(0.4 / 2.9, 10);
    expect(out.spikeFade).toEqual({ value: true, state: 'PRODUCED', reason: null }); // high before 10:00, close 2.5 < open 2.6
  });

  it('control (ii): a 09:25 call never counts the 04:00 high that printed before it', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', '2026-10-06', '2026-10-06T13:25:20.000Z');
    insertAssessmentTickers(db, id, [ticker({ referenceClose: 2, referenceBasis: 'PRIOR_SESSION' })]);
    session(db, '2026-10-06', { previousClose: 2, high: 4, low: 1.9, official: 2.5 });
    bar(db, '2026-10-06', '2026-10-06T08:10:00.000Z', 4); // 04:10 ET, before the call
    bar(db, '2026-10-06', '2026-10-06T12:00:00.000Z', 3.5); // 08:00 ET: inside 07:00-10:00 but before the 09:25 call
    bar(db, '2026-10-06', '2026-10-06T14:00:00.000Z', 2.7); // 10:00 ET, after

    const out = computeCallOutcome(db, call(db, id), AFTER)!;
    expect(out.high0400Close).toEqual({ value: null, state: 'UNKNOWN', reason: 'WINDOW_STARTS_BEFORE_CALL' });
    expect(out.highAfterCall.value).toBeCloseTo(0.35, 10);
    expect(out.highAfterCall.value!).toBeLessThan((4 - 2) / 2);
    // The 09:25 call's 07:00-10:00 window starts at its own minute: the 04:10 print is outside it, 10:00 is the end.
    expect(out.high0700To1000).toEqual({ value: null, state: 'UNKNOWN', reason: 'NO_BARS_IN_WINDOW' });
  });

  it('A2: the high after the call is at least the official close when the close is above every minute high', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker()]);
    session(db, '2026-10-06', { previousClose: 2, high: 3, low: 1.9, official: 2.5 });
    bar(db, '2026-10-06', '2026-10-06T14:00:00.000Z', 2.3, 2.3);

    const out = computeCallOutcome(db, call(db, id), AFTER)!;
    expect(out.highAfterCall.value).toBeCloseTo(0.25, 10);
    expect(out.giveback.value).toBeCloseTo(0, 10);
  });

  it('control (iii): before the official close every outcome is NOT_YET, never UNKNOWN (A6)', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'PREMARKET_0700', '2026-10-06', '2026-10-06T11:00:30.000Z');
    insertAssessmentTickers(db, id, [ticker({ referenceBasis: 'PRIOR_SESSION' })]);
    // At 15:59 ET the session row exists with live highs but no official close yet.
    session(db, '2026-10-06', { previousClose: 2, high: 3, low: 1.9, official: null, basis: 'PRIOR_SESSION' });
    bar(db, '2026-10-06', '2026-10-06T14:00:00.000Z', 2.9);

    const out = computeCallOutcome(db, call(db, id), new Date('2026-10-06T19:59:00Z'))!;
    const states = [out.session, out.high0400Close, out.highAfterCall, out.high0700To1000, out.close, out.retention, out.giveback, out.spikeFade].map(
      (o) => o.state,
    );
    expect(new Set(states)).toEqual(new Set(['NOT_YET']));
    expect(out.bestRankAfter.state).toBe('NOT_YET');
  });

  it('control (iii) on stored data: at 15:59 ET everything is NOT_YET even though the store already holds the close', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'PREMARKET_0700', '2026-10-06', '2026-10-06T11:00:30.000Z');
    insertAssessmentTickers(db, id, [ticker({ referenceBasis: 'PRIOR_SESSION' })]);
    session(db, '2026-10-06', { previousClose: 2, high: 3, low: 1.9, official: 2.5 });
    bar(db, '2026-10-06', '2026-10-06T19:58:00.000Z', 2.9); // 15:58 ET

    const out = computeCallOutcome(db, call(db, id), new Date('2026-10-06T19:59:00Z'))!;
    const states = [out.session, out.high0400Close, out.highAfterCall, out.high0700To1000, out.close, out.retention, out.giveback, out.spikeFade].map(
      (o) => o.state,
    );
    expect(new Set(states)).toEqual(new Set(['NOT_YET']));
  });

  it('counts only checkpoints completed by its own clock for the best rank after the call', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'PREMARKET_0700', '2026-10-06', '2026-10-06T11:00:30.000Z');
    insertAssessmentTickers(db, id, [ticker({ referenceBasis: 'PRIOR_SESSION' })]);
    session(db, '2026-10-06', { previousClose: 2, high: 3, low: 1.9, official: 2.5 });
    const early = checkpoint(db, 'RTH_INTERVAL', '2026-10-06', '2026-10-06T14:00:30.000Z');
    insertAssessmentTickers(db, early, [ticker({ assessmentRank: 3 })]);
    const late = checkpoint(db, 'AFTER_HOURS_CLOSE', '2026-10-06', '2026-10-06T22:00:30.000Z'); // 18:00 ET
    insertAssessmentTickers(db, late, [ticker({ assessmentRank: 1 })]);

    // 17:00 ET: after the close, before the later checkpoint.
    expect(computeCallOutcome(db, call(db, id), new Date('2026-10-06T21:00:00Z'))!.bestRankAfter).toEqual({ value: 3, state: 'PRODUCED' });
    expect(computeCallOutcome(db, call(db, id), AFTER)!.bestRankAfter).toEqual({ value: 1, state: 'PRODUCED' });
  });

  it('refuses a session that jumped past the split ratio when no official close can confirm it', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker()]);
    // Prior close 2, the whole session above 3.6 (1.8 x): a reverse split, unconfirmed without a close.
    session(db, '2026-10-06', { previousClose: 2, high: 8, low: 3.8, official: null, basis: 'PRIOR_SESSION' });
    bar(db, '2026-10-06', '2026-10-06T14:00:00.000Z', 8);

    const out = computeCallOutcome(db, call(db, id), AFTER)!;
    expect(out.session).toEqual({ value: null, state: 'UNKNOWN', reason: 'SPLIT_UNCHECKED' });
    expect(out.high0400Close.reason).toBe('SPLIT_UNCHECKED');
    expect(out.highAfterCall.reason).toBe('SPLIT_UNCHECKED');
  });

  it('control (iv): the 07:00 ET boundary follows the date (EST after 2026-11-01)', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-11-03', '2026-11-04T03:00:10.000Z', '2026-11-04');
    insertAssessmentTickers(db, id, [ticker()]);
    session(db, '2026-11-04', { previousClose: 2, high: 9, low: 1.9, official: 2.5 });
    bar(db, '2026-11-04', '2026-11-04T11:59:00.000Z', 9); // 06:59 EST: outside
    bar(db, '2026-11-04', '2026-11-04T12:00:00.000Z', 2.4); // 07:00 EST: inside

    const out = computeCallOutcome(db, call(db, id), new Date('2026-11-05T04:00:00Z'))!;
    expect(out.high0700To1000.value).toBeCloseTo(0.2, 10);
  });

  it('A1: no official close means UNKNOWN NO_OFFICIAL_CLOSE, never the bell capture; the 04:00 high still counts', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker()]);
    session(db, '2026-10-06', { previousClose: 2, high: 3, low: 1.9, official: 2.4, basis: 'PRIOR_SESSION', rthFinalClose: 2.7 });
    bar(db, '2026-10-06', '2026-10-06T14:00:00.000Z', 2.9);

    const out = computeCallOutcome(db, call(db, id), AFTER)!;
    expect(out.close).toEqual({ value: null, state: 'UNKNOWN', reason: 'NO_OFFICIAL_CLOSE' });
    expect(out.retention.reason).toBe('NO_OFFICIAL_CLOSE');
    expect(out.giveback.reason).toBe('NO_OFFICIAL_CLOSE');
    expect(out.high0400Close.state).toBe('PRODUCED');
    expect(out.highAfterCall.value).toBeCloseTo(0.45, 10); // minute high alone without a close
  });

  it('refuses a session whose prior close is off the call basis by more than 2 percent', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker({ referenceClose: 2 })]);
    session(db, '2026-10-06', { previousClose: 2.1 });

    const out = computeCallOutcome(db, call(db, id), AFTER)!;
    expect(out.session).toEqual({ value: null, state: 'UNKNOWN', reason: 'BASIS_MISMATCH' });
    expect(out.close.reason).toBe('BASIS_MISMATCH');
  });

  it('refuses a call with no session row, and a session without minute bars reads BARS_PRUNED', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker(), ticker({ ticker: 'BARE' })]);
    session(db, '2026-10-06', {}, 'BARE');

    const rows = readCallsFor(db, '2026-10-06');
    const none = computeCallOutcome(db, rows.find((r) => r.ticker === 'ACME')!, AFTER)!;
    expect(none.session.reason).toBe('NO_SESSION_ROW');
    const bare = computeCallOutcome(db, rows.find((r) => r.ticker === 'BARE')!, AFTER)!;
    expect(bare.highAfterCall.reason).toBe('BARS_PRUNED');
    expect(bare.close.state).toBe('PRODUCED');
  });

  it('copies the labels from the frozen row: UNGRADED and FLOAT_NOT_FROZEN when absent, never back-filled', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker({ floatState: 'PRODUCED', floatReason: null }), ticker({ ticker: 'OLD' })]);
    db.prepare(`UPDATE desk_assessment_tickers SET priority_grade = NULL, float_state = NULL WHERE ticker = 'OLD'`).run();

    const rows = readCallsFor(db, '2026-10-06');
    const fresh = computeCallOutcome(db, rows.find((r) => r.ticker === 'ACME')!, AFTER)!;
    const old = computeCallOutcome(db, rows.find((r) => r.ticker === 'OLD')!, AFTER)!;
    expect(fresh.grade).toBe('A');
    expect(fresh.floatState).toBe('PRODUCED');
    expect(old.grade).toBe('UNGRADED');
    expect(old.floatState).toBe('FLOAT_NOT_FROZEN');
  });

  it('reads the best rank after the call from later COMPLETE checkpoints of the outcome session, else NOT_RANKED', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker(), ticker({ ticker: 'QUIET' })]);
    session(db, '2026-10-06', {});
    session(db, '2026-10-06', {}, 'QUIET');
    const later = checkpoint(db, 'PREMARKET_0625', '2026-10-06', '2026-10-06T10:25:30.000Z');
    insertAssessmentTickers(db, later, [ticker({ assessmentRank: 3 })]);
    const failed = checkpoint(db, 'PREMARKET_0645', '2026-10-06', '2026-10-06T10:45:30.000Z', null, 'FAILED');
    insertAssessmentTickers(db, failed, [ticker({ assessmentRank: 1 }), ticker({ ticker: 'QUIET', assessmentRank: 2 })]);

    const rows = readCallsFor(db, '2026-10-06');
    expect(computeCallOutcome(db, rows.find((r) => r.ticker === 'ACME')!, AFTER)!.bestRankAfter).toEqual({ value: 3, state: 'PRODUCED' });
    expect(computeCallOutcome(db, rows.find((r) => r.ticker === 'QUIET')!, AFTER)!.bestRankAfter).toEqual({ value: null, state: 'NOT_RANKED' });
  });
});

describe('the job', () => {
  it('stores each call once it is final and leaves a final row alone on the next run', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'NEXT_DAY_RECAP', '2026-10-05', '2026-10-06T02:00:10.000Z', '2026-10-06');
    insertAssessmentTickers(db, id, [ticker()]);
    session(db, '2026-10-06', {});
    bar(db, '2026-10-06', '2026-10-06T14:00:00.000Z', 2.9);

    expect(storedOutcomeDates(db)).toEqual(['2026-10-06']);
    const dry = runCallOutcomes(db, '2026-10-06', { now: AFTER, dryRun: true });
    expect(dry).toMatchObject({ calls: 1, final: 1, written: 0 });
    expect((db.prepare('SELECT COUNT(*) AS n FROM desk_call_outcomes').get() as { n: number }).n).toBe(0);

    expect(runCallOutcomes(db, '2026-10-06', { now: AFTER })).toMatchObject({ calls: 1, written: 1, final: 1 });
    const stored = db.prepare('SELECT close_pct, close_state, priority_grade FROM desk_call_outcomes').get() as {
      close_pct: number;
      close_state: string;
      priority_grade: string;
    };
    expect(stored.close_state).toBe('PRODUCED');
    expect(stored.close_pct).toBeCloseTo(0.25, 10);
    expect(stored.priority_grade).toBe('A');

    expect(runCallOutcomes(db, '2026-10-06', { now: AFTER })).toMatchObject({ skippedFinal: 1, written: 0 });
  });

  it('rewrites a NOT_YET row once its session closes', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'PREMARKET_0700', '2026-10-06', '2026-10-06T11:00:30.000Z');
    insertAssessmentTickers(db, id, [ticker({ referenceBasis: 'PRIOR_SESSION' })]);
    session(db, '2026-10-06', { official: null, basis: 'PRIOR_SESSION' });
    expect(runCallOutcomes(db, '2026-10-06', { now: new Date('2026-10-06T19:00:00Z') })).toMatchObject({ pending: 1, written: 1 });
    db.prepare(
      `UPDATE ticker_session SET reference_rth_close = 2.5, reference_rth_close_basis = 'CURRENT_SESSION' WHERE symbol = 'ACME'`,
    ).run();
    expect(runCallOutcomes(db, '2026-10-06', { now: AFTER })).toMatchObject({ skippedFinal: 0, written: 1 });
    expect((db.prepare('SELECT close_state FROM desk_call_outcomes').get() as { close_state: string }).close_state).toBe('PRODUCED');
  });

  it('runs only behind PERFORMANCE_RECORD=on and never throws', () => {
    const db = openDatabase(temporaryPath());
    const lines: string[] = [];
    expect(maybeRunCallOutcomes({}, db, '2026-10-06', (l) => lines.push(l))).toBeNull();
    expect(lines).toEqual([]);
    expect(maybeRunCallOutcomes({ PERFORMANCE_RECORD: 'on' }, db, '2026-10-06', (l) => lines.push(l), AFTER)).toMatchObject({ calls: 0 });
    expect(lines[0]).toContain('[record] outcomes for 2026-10-06: 0 call(s)');
    db.exec('DROP TABLE desk_call_outcomes');
    db.exec('DROP TABLE desk_assessment_tickers');
    expect(maybeRunCallOutcomes({ PERFORMANCE_RECORD: 'on' }, db, '2026-10-06', (l) => lines.push(l), AFTER)).toBeNull();
    expect(lines[1]).toContain('failed');
  });
});
