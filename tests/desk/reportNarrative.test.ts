import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { insertAssessmentRanges, type AssessmentTickerRecord } from '@/lib/market/store/assessmentRepo';
import { narrativeFacts, narrativeFootnotes, readFrozenBreadth, readRecapCounts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';

/*
 * The narrative's facts (pre-registered: docs/research/reports-v6/prereg-narrative-facts.md,
 * with the adopted 16:00-basis amendment). Every number is computed here, never by the model.
 */

const DATE = '2026-09-23';
const RANGE = { min: 1, max: 20 };
const dirs: string[] = [];
const open: MarketDatabase[] = [];
afterEach(() => {
  // Closed here, not only in each test, so a failed assertion cannot leave a locked file behind on Windows.
  while (open.length) {
    const db = open.pop()!;
    if (db.open) db.close();
  }
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function store(): MarketDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-narrative-'));
  dirs.push(dir);
  const db = openDatabase(path.join(dir, 'market.db'));
  open.push(db);
  return db;
}

type Row = {
  symbol: string;
  price?: number | null;
  prev?: number | null;
  vol?: number | null;
  close?: number | null;
  high?: number | null;
  low?: number | null;
  rthVol?: number | null;
  eligible?: 0 | 1;
  /** The bell capture (`rth_final_close`); defaults to `close`. */
  bell?: number | null;
  /** The official close's basis and date; default CURRENT_SESSION on the trading date whenever `close` is set. */
  basis?: string | null;
  refDate?: string | null;
};
/** `close` is the OFFICIAL close (`reference_rth_close`, CURRENT_SESSION, this date) AND, unless `bell` says otherwise, the bell capture. */
function seed(db: MarketDatabase, rows: Row[]) {
  const ts = db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, feed, updated_at, price, previous_close, cumulative_volume, rth_final_close, rth_final_high, rth_final_low, rth_final_volume,
                                 reference_rth_close, reference_rth_close_date, reference_rth_close_source, reference_rth_close_basis)
     VALUES (@symbol, @date, 'sip', '2026-09-23T20:00:00Z', @price, @prev, @vol, @bell, @high, @low, @rthVol,
             @close, @refDate, 'alpaca-daily-bar-rth-close', @basis)`,
  );
  const uni = db.prepare(
    `INSERT INTO universe (symbol, source, updated_at, discovery_eligible) VALUES (?, 'test', '2026-09-23T00:00:00Z', ?)`,
  );
  for (const r of rows) {
    const close = r.close ?? null;
    ts.run({
      date: DATE, price: null, prev: null, vol: null, high: null, low: null, rthVol: null, ...r,
      close,
      bell: r.bell !== undefined ? r.bell : close,
      basis: r.basis !== undefined ? r.basis : close === null ? null : 'CURRENT_SESSION',
      refDate: r.refDate !== undefined ? r.refDate : close === null ? null : DATE,
    });
    if (r.eligible !== undefined) uni.run(r.symbol, r.eligible);
  }
}

describe('readRecapCounts: F1, F6, F7 and G from the 16:00 latched values', () => {
  it('counts one population and keeps every exclusion out of it', () => {
    const db = store();
    seed(db, [
      // a 50% mover that gave it all back (high 1.5x, closed at the prior close)
      { symbol: 'RT', prev: 2, close: 2, high: 3, rthVol: 900, price: 2.1, vol: 1000 },
      // a 50% mover that held
      { symbol: 'HELD', prev: 2, close: 3.2, high: 3.4, rthVol: 900, price: 3.2, vol: 1000 },
      // up, not a mover
      { symbol: 'UP', prev: 5, close: 5.5, high: 5.6, rthVol: 100, price: 5.5, vol: 100 },
      // down
      { symbol: 'DN', prev: 5, close: 4, high: 5.1, rthVol: 100, price: 4, vol: 100 },
      // eligible, did not trade in RTH: counted eligible, not traded
      { symbol: 'IDLE', prev: 5, close: 5, high: null, rthVol: 0, price: 5, vol: 0 },
      // out of range at the 16:00 close
      { symbol: 'DEAR', prev: 20, close: 31, high: 32, rthVol: 900, price: 31, vol: 900 },
      // ineligible on the board
      { symbol: 'ETF', prev: 2, close: 3.2, high: 3.4, rthVol: 900, eligible: 0, price: 3.2, vol: 900 },
      // G: traded, in range, NO 16:00 close
      { symbol: 'GAP', prev: 3, close: null, price: 3.3, vol: 500 },
      // BOUNDARIES: a 45% high is not a 50% mover (pins the 1.5x threshold) ...
      { symbol: 'NEAR', prev: 2, close: 2.5, high: 2.9, rthVol: 100, price: 2.5, vol: 100 },
      // ... and a name with no 16:00 close that never traded is not G (pins "traded")
      { symbol: 'QUIET', prev: 3, close: null, price: 3, vol: 0 },
    ]);
    const r = readRecapCounts(db, DATE, RANGE);
    expect(r.breadth).toEqual({ window: 'REGULAR_SESSION', eligible: 6, traded: 5, up: 3, down: 1 });
    expect([r.movers50, r.gaveBack, r.noClose]).toEqual([2, 1, 1]);
    db.close();
  });
});

describe('readRecapCounts: the CLOSE is the official close, never the bell capture (Path A; Ops 2026-10-07)', () => {
  it('O1: counts read the official close where the bell capture differs', () => {
    const db = store();
    seed(db, [
      // Bell 1.9 (down, gave it all back), official 2.6 (up, held half): the official close counts.
      { symbol: 'OFF', prev: 2, close: 2.6, bell: 1.9, high: 3, rthVol: 900, price: 2.6, vol: 1000 },
      // Bell 5.5 (up), official 4.5 (down).
      { symbol: 'FLIP', prev: 5, close: 4.5, bell: 5.5, high: 5.6, rthVol: 100, price: 4.5, vol: 100 },
    ]);
    const r = readRecapCounts(db, DATE, RANGE);
    expect(r.breadth).toEqual({ window: 'REGULAR_SESSION', eligible: 2, traded: 2, up: 1, down: 1 });
    expect([r.movers50, r.gaveBack, r.keptHalf, r.noClose]).toEqual([1, 0, 1, 0]);
    expect(r.movers.map((m) => [m.symbol, m.close])).toEqual([['OFF', 2.6]]);
    db.close();
  });

  it('O2: no official close for THIS date is the noClose footnote, never a fallback to the bell capture', () => {
    const db = store();
    seed(db, [
      // PRIOR_SESSION: yesterday's close, with a bell capture present.
      { symbol: 'PRI', prev: 2, close: 2.2, bell: 3.1, basis: 'PRIOR_SESSION', high: 3.2, rthVol: 900, price: 3.1, vol: 900 },
      // CURRENT_SESSION but dated another day.
      { symbol: 'OLD', prev: 2, close: 2.2, bell: 3.1, refDate: '2026-09-22', high: 3.2, rthVol: 900, price: 3.1, vol: 900 },
      // No official close at all, a bell capture present.
      { symbol: 'NONE', prev: 2, close: null, bell: 3.1, high: 3.2, rthVol: 900, price: 3.1, vol: 900 },
      // Control: the same row with its official close counts.
      { symbol: 'OK', prev: 2, close: 3.1, high: 3.2, rthVol: 900, price: 3.1, vol: 900 },
    ]);
    const r = readRecapCounts(db, DATE, RANGE);
    expect(r.noClose).toBe(3);
    expect(r.breadth).toEqual({ window: 'REGULAR_SESSION', eligible: 1, traded: 1, up: 1, down: 0 });
    expect(r.movers.map((m) => m.symbol)).toEqual(['OK']);
    db.close();
  });

  it('O3: the range is decided by the official close', () => {
    const db = store();
    seed(db, [
      // Bell inside $1-$20 and UP, official outside: not counted, and not noClose (it has an official close).
      { symbol: 'OUT', prev: 18, close: 21, bell: 19.5, high: 21.5, rthVol: 900, price: 21, vol: 900 },
      // Bell outside, official inside and DOWN: counted. The two move opposite ways, so a bell-based
      // range reads up 1 down 0 and only the official one reads up 0 down 1 (the first O3 was symmetric
      // and could not fail on the bell; mutant C4 found it).
      { symbol: 'IN', prev: 20, close: 19.5, bell: 21, high: 21.5, rthVol: 900, price: 19.5, vol: 900 },
    ]);
    const r = readRecapCounts(db, DATE, RANGE);
    expect(r.breadth).toEqual({ window: 'REGULAR_SESSION', eligible: 1, traded: 1, up: 0, down: 1 });
    expect(r.noClose).toBe(0);
    db.close();
  });
});

describe('readFrozenBreadth: an intraday F1 is the checkpoint own frozen row, window included', () => {
  it('reads its own range key, and is null when the checkpoint froze no row for that range', () => {
    const db = store();
    db.prepare(
      `INSERT INTO desk_assessments (id, trading_date, target_trading_date, assessment_type, scheduled_for, started_at, session_phase, status, board, ranking_definition, market_fingerprint, research_fingerprint, ticker_count, model_calls, runtime_ms, notes, metadata)
       VALUES (7, ?, ?, 'RTH_INTERVAL', ?, ?, 'RTH', 'COMPLETE', 'DAILY_RVOL', 'Daily RVOL', 'm', 'r', 0, 0, 0, '[]', '{}')`,
    ).run(DATE, DATE, `${DATE}T18:30:00.000Z`, `${DATE}T18:30:01.000Z`);
    insertAssessmentRanges(db, 7, [
      {
        rangeKey: '1-20', rangeMin: 1, rangeMax: 20, countWindow: 'SESSION_TO_DATE', countsVersion: 1,
        eligible: 2800, traded: 2700, up: 1500, down: 1100, volumeBaseSeeded: 0,
        topN: 25, topTickers: [], rankingDefinition: 'Daily RVOL',
      },
    ]);
    expect(readFrozenBreadth(db, 7, RANGE)).toEqual({ window: 'SESSION_TO_DATE', eligible: 2800, traded: 2700, up: 1500, down: 1100 });
    expect(readFrozenBreadth(db, 7, { min: 1, max: 15 })).toBeNull();
    db.close();
  });
});

const fact = (ticker: string, assessmentRank: number, percentChange: number | null, referenceBasis = 'PRIOR_SESSION') =>
  ({ ticker, assessmentRank, percentChange, referenceBasis }) as unknown as ReportFact;
const research = (status: string) => ({ catalyst: { status } }) as unknown as ReportResearch;

describe('narrativeFacts', () => {
  it('intraday: the leader is in-range rank 1 with its basis; F3 counts FRESH_FOUND among the covered; no recap facts', () => {
    const db = store();
    const out = narrativeFacts(db, {
      kind: 'INTO_RTH',
      tradingDate: DATE,
      range: RANGE,
      checkpointId: 99,
      facts: [fact('B', 2, 30), fact('A', 1, -12.5, 'CURRENT_SESSION'), fact('C', 3, 4)],
      research: new Map([
        ['A', research('FRESH_FOUND')],
        ['B', research('SECONDARY_STALE')],
        ['C', research('FRESH_FOUND')],
      ]),
    });
    expect(out.leader).toEqual({ ticker: 'A', percentChange: -12.5, basis: 'CURRENT_SESSION' });
    expect(out.fresh).toEqual({ count: 2, covered: 3 });
    expect([out.breadth, out.movers50, out.gaveBack, out.noClose, out.tracking]).toEqual([null, null, null, null, null]);
    db.close();
  });

  it('recap: no leader; F9 tracking = the covered names; F1/F6/F7/G from the 16:00 values', () => {
    const db = store();
    seed(db, [{ symbol: 'RT', prev: 2, close: 2, high: 3, rthVol: 900, price: 2, vol: 900 }]);
    const out = narrativeFacts(db, {
      kind: 'PREMARKET',
      tradingDate: DATE,
      range: RANGE,
      checkpointId: 99,
      facts: [fact('X', 1, 5), fact('Y', 2, 3)],
      research: new Map([['Y', research('FRESH_FOUND')]]),
    });
    expect(out.leader).toBeNull();
    expect(out.tracking).toEqual(['X', 'Y']);
    expect(out.fresh).toEqual({ count: 1, covered: 2 });
    expect(out.breadth?.window).toBe('REGULAR_SESSION');
    expect([out.movers50, out.gaveBack, out.noClose]).toEqual([1, 1, 0]);
    db.close();
  });
});

/* ------------------------------------------------------------------ v2 (narrative-redesign-proposal.md, Build plan step 1) */

function bars(db: MarketDatabase, symbol: string, rows: Array<{ date: string; factor: number | null; fetched?: string }>) {
  const ins = db.prepare(
    `INSERT INTO daily_bars (symbol, trading_date, open, high, low, close, volume, adjustment, split_factor, source, fetched_at)
     VALUES (?, ?, 1, 1, 1, 1, 100, 'split', ?, 'test', ?)`,
  );
  for (const r of rows) ins.run(symbol, r.date, r.factor, r.fetched ?? '2026-09-23T21:00:00Z');
}

describe('readRecapCounts: the split check keeps a false basis jump out of F1, F6 and F7', () => {
  it('leaves out a jump at a standard ratio or with a factor change near the date; keeps a genuine gap and a ratio without a jump', () => {
    const db = store();
    seed(db, [
      // reverse split carried onto the day: whole session ~5x the prior close
      { symbol: 'REV', prev: 0.5, low: 2.4, high: 2.7, close: 2.5, rthVol: 900, price: 2.5, vol: 900 },
      // forward split: whole session under prior / 1.8, R 0.48 within 5% of 1/2
      { symbol: 'FWD', prev: 10, low: 4.6, high: 4.9, close: 4.8, rthVol: 900, price: 4.8, vol: 900 },
      // a genuine gap: jumped, R 2.7 is no standard ratio, no bars
      { symbol: 'GAP', prev: 1, low: 2.3, high: 3, close: 2.7, rthVol: 900, price: 2.7, vol: 900 },
      // R exactly 2, but the session traded back under 1.8x: not a jump
      { symbol: 'NOJUMP', prev: 1, low: 1.5, high: 2.2, close: 2, rthVol: 900, price: 2, vol: 900 },
      // jumped, R 2.7, and the daily bars change factor the day before
      { symbol: 'FACT', prev: 1, low: 2.2, high: 2.9, close: 2.7, rthVol: 900, price: 2.7, vol: 900 },
      // jumped, R 2.7; its bars near the date all carry the SAME factor (its split is weeks later)
      { symbol: 'FACTFAR', prev: 1, low: 2.2, high: 2.9, close: 2.7, rthVol: 900, price: 2.7, vol: 900 },
    ]);
    bars(db, 'FACT', [{ date: '2026-09-22', factor: 4 }, { date: DATE, factor: 1 }]);
    bars(db, 'FACTFAR', [{ date: '2026-09-22', factor: 4 }, { date: DATE, factor: 4 }, { date: '2026-10-15', factor: 1 }]);
    const r = readRecapCounts(db, DATE, RANGE);
    expect(r.splitExcluded).toBe(3);
    expect(r.breadth).toEqual({ window: 'REGULAR_SESSION', eligible: 3, traded: 3, up: 3, down: 0 });
    expect(r.movers.map((m) => m.symbol).sort()).toEqual(['FACTFAR', 'GAP', 'NOJUMP']);
    expect([r.movers50, r.gaveBack]).toEqual([3, 0]);
  });
});

describe('readRecapCounts: F15, peak against close', () => {
  it('retention is (close - prior) / (high - prior); exactly half counts as kept; a close at or under the prior gave it all back', () => {
    const db = store();
    seed(db, [
      { symbol: 'HALF', prev: 2, low: 2.5, high: 4, close: 3, rthVol: 900, price: 3, vol: 900 },
      { symbol: 'UNDER', prev: 2, low: 2.1, high: 4, close: 2.98, rthVol: 900, price: 2.98, vol: 900 },
      { symbol: 'RT', prev: 2, low: 1.9, high: 3, close: 2, rthVol: 900, price: 2, vol: 900 },
      { symbol: 'NEG', prev: 2, low: 1.7, high: 3.2, close: 1.8, rthVol: 900, price: 1.8, vol: 900 },
    ]);
    const r = readRecapCounts(db, DATE, RANGE);
    expect([r.movers50, r.keptHalf, r.gaveBack]).toEqual([4, 1, 2]);
    const half = r.movers.find((m) => m.symbol === 'HALF')!;
    expect([half.highPct, half.closePct, half.retention]).toEqual([100, 50, 0.5]);
    expect(r.movers.find((m) => m.symbol === 'UNDER')!.retention).toBeCloseTo(0.49, 10);
  });
});

const named = (over: Partial<ReportFact> & { ticker: string; assessmentRank: number }) =>
  ({ percentChange: null, referenceBasis: 'CURRENT_SESSION', referenceClose: null, cycle: null, changeSummary: '', ...over }) as unknown as ReportFact;
const dossier = (status: string, summary: string | null, supply: Array<{ type: string; status: string }> = []) =>
  ({ catalyst: { status, summary }, structure: { supply } }) as unknown as ReportResearch;
const levelRow = (ticker: string, support: number, resistance: number) =>
  ({ ticker, levelSummary: JSON.stringify({ support, resistance, label: 'x' }) }) as unknown as AssessmentTickerRecord;

function recapStore(withBars: boolean): MarketDatabase {
  const db = store();
  seed(db, [
    { symbol: 'NXL', prev: 2, low: 2.5, high: 5.13, close: 3.528, rthVol: 900, price: 3.5, vol: 900 },
    { symbol: 'SSM', prev: 2, low: 2.2, high: 4.606, close: 3.938, rthVol: 900, price: 3.9, vol: 900 },
    { symbol: 'NAMM', prev: 2, low: 2, high: 3.234, close: 2.702, rthVol: 900, price: 2.7, vol: 900 },
    // the day's biggest mover, NOT covered: never named
    { symbol: 'BIG', prev: 1, low: 1.1, high: 4, close: 2, rthVol: 900, price: 2, vol: 900 },
    // covered movers below the leaders: one with NO dossier, one whose research could not tell
    { symbol: 'NEW', prev: 2, low: 2.2, high: 3.1, close: 2.6, rthVol: 900, price: 2.6, vol: 900 },
    { symbol: 'UNC', prev: 2, low: 2.1, high: 3.05, close: 2.5, rthVol: 900, price: 2.5, vol: 900 },
  ]);
  if (withBars) bars(db, 'NXL', [{ date: '2026-09-21', factor: 1 }, { date: '2026-09-22', factor: 1 }]);
  return db;
}

function recapInput(olderHigh: number) {
  return {
    kind: 'PREMARKET' as const,
    tradingDate: DATE,
    range: RANGE,
    checkpointId: 611,
    facts: [
      named({ ticker: 'NXL', assessmentRank: 1, percentChange: 70, cycle: 'YELLOW_FRONTSIDE_WARNING' }),
      named({ ticker: 'SSM', assessmentRank: 2, percentChange: 3 }),
      named({ ticker: 'NAMM', assessmentRank: 3, percentChange: -1 }),
      named({ ticker: 'AMOD', assessmentRank: 4, percentChange: 61.5, referenceClose: 1.17, cycle: 'GREEN_FRESH_FRONTSIDE' }),
      // bigger, but on the prior-session basis: not an after-hours move
      named({ ticker: 'PRIOR', assessmentRank: 5, percentChange: 90, referenceBasis: 'PRIOR_SESSION' }),
      named({ ticker: 'NEW', assessmentRank: 6, percentChange: -2 }),
      named({ ticker: 'UNC', assessmentRank: 7, percentChange: -3 }),
    ],
    research: new Map([
      [
        'NXL',
        dossier('FRESH_FOUND', 'a distribution agreement', [
          { type: 'RECENT_OFFERING', status: 'KNOWN_ACTIVE' },
          { type: 'WARRANTS', status: 'POSSIBLY_ACTIVE' },
          { type: 'WARRANTS', status: 'POSSIBLY_ACTIVE' },
          { type: 'ATM', status: 'NOT_YET_ACTIVE' },
        ]),
      ],
      ['SSM', dossier('FRESH_FOUND', 'a 13D')],
      ['NAMM', dossier('SECONDARY_STALE', 'results')],
      ['AMOD', dossier('FRESH_FOUND', 'an MOU')],
      ['UNC', dossier('UNKNOWN', null)],
      // NEW has no dossier: NOT RESEARCHED AT THIS CHECKPOINT, never "no fresh news found"
    ]),
    tickers: [levelRow('NXL', 4.9, 10.98)],
    olderHighs: new Map([['NXL', olderHigh]]),
  };
}

describe('narrativeFacts recap v2: F10, F10b, F12b and the context', () => {
  it('names the covered movers by the day high (top 2), the after-hours gainer not already named, and the first name context', () => {
    const db = recapStore(true);
    const out = narrativeFacts(db, recapInput(19.2));
    expect(out.coveredMovers).toBe(5);
    expect(out.recapLeaders!.map((l) => l.ticker)).toEqual(['NXL', 'SSM']);
    const nxl = out.recapLeaders![0]!;
    expect(nxl.highPct).toBeCloseTo(156.5, 6);
    expect(nxl.closePct).toBeCloseTo(76.4, 6);
    expect(nxl.retention).toBeCloseTo(76.4 / 156.5, 6);
    expect([nxl.status, nxl.summary, nxl.cycle]).toEqual(['FRESH_FOUND', 'a distribution agreement', 'YELLOW_FRONTSIDE_WARNING']);
    expect(out.afterHours).toEqual({
      ticker: 'AMOD',
      percentChange: 61.5,
      referenceClose: 1.17,
      cycle: 'GREEN_FRESH_FRONTSIDE',
      status: 'FRESH_FOUND',
      summary: 'an MOU',
    });
    // F12b in three states: NAMM looked and found none; NEW not researched; UNC could not tell
    expect([out.moversWithoutFresh, out.moversNotResearched, out.moversUnclear]).toEqual([1, 1, 1]);
    expect(out.context).toEqual({
      ticker: 'NXL',
      sessionHigh: 5.13,
      close: 3.528,
      support: 4.9,
      resistance: 10.98,
      olderHigh: 19.2,
      openSupply: [
        { type: 'RECENT_OFFERING', status: 'KNOWN_ACTIVE' },
        { type: 'WARRANTS', status: 'POSSIBLY_ACTIVE' },
      ],
    });
    expect(out.intradayNamed).toBeNull();
  });

  it('drops the older high when the daily-bar basis is not vouched, and when it is not above the session high', () => {
    expect(narrativeFacts(recapStore(false), recapInput(19.2)).context?.olderHigh).toBeNull();
    expect(narrativeFacts(recapStore(true), recapInput(4)).context?.olderHigh).toBeNull();
  });
});

describe('narrativeFacts intraday v2: F10 and F13', () => {
  it('names the leader (in-range rank 1), then the next two covered gainers by move, with allowlisted change notes only', () => {
    const db = store();
    const out = narrativeFacts(db, {
      kind: 'INTO_POWER_HOUR',
      tradingDate: DATE,
      range: RANGE,
      checkpointId: 606,
      facts: [
        named({ ticker: 'A', assessmentRank: 1, percentChange: 12, referenceBasis: 'PRIOR_SESSION', changeSummary: 'A: entered Top 12; new HOD.' }),
        named({ ticker: 'B', assessmentRank: 2, percentChange: 30, referenceBasis: 'PRIOR_SESSION' }),
        named({ ticker: 'C', assessmentRank: 3, percentChange: 50, referenceBasis: 'PRIOR_SESSION' }),
        named({ ticker: 'D', assessmentRank: 4, percentChange: -60, referenceBasis: 'PRIOR_SESSION' }),
        named({ ticker: 'E', assessmentRank: 5, percentChange: 40, referenceBasis: 'PRIOR_SESSION' }),
      ],
      research: new Map([['C', dossier('FRESH_FOUND', 'results')]]),
    });
    expect(out.intradayNamed!.map((n) => n.ticker)).toEqual(['A', 'C', 'E']);
    expect(out.intradayNamed![0]!.changeNotes).toEqual(['printed a new high of day']);
    expect(out.intradayNamed![1]).toMatchObject({ status: 'FRESH_FOUND', summary: 'results', basis: 'PRIOR_SESSION' });
    expect(out.intradayNamed![2]).toMatchObject({ status: null, summary: null });
    expect([out.recapLeaders, out.afterHours, out.context, out.splitExcluded]).toEqual([null, null, null, null]);
  });
});

describe('narrativeFootnotes (build step 4)', () => {
  it('carries G and the split count as computed fields on the recap; null on the intraday kinds; a zero is a zero, a null stays null', () => {
    expect(narrativeFootnotes({ noClose: 3, splitExcluded: 2 })).toEqual({ noClose: 3, splitExcluded: 2 });
    expect(narrativeFootnotes({ noClose: 0, splitExcluded: 0 })).toEqual({ noClose: 0, splitExcluded: 0 });
    expect(narrativeFootnotes({ noClose: null, splitExcluded: null })).toBeNull();
    expect(narrativeFootnotes({ noClose: 1, splitExcluded: null })).toEqual({ noClose: 1, splitExcluded: null });
  });
});
