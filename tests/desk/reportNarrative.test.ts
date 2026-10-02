import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { insertAssessmentRanges } from '@/lib/market/store/assessmentRepo';
import { narrativeFacts, readFrozenBreadth, readRecapCounts } from '@/lib/desk/reports/narrative';
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
  rthVol?: number | null;
  eligible?: 0 | 1;
};
function seed(db: MarketDatabase, rows: Row[]) {
  const ts = db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, feed, updated_at, price, previous_close, cumulative_volume, rth_final_close, rth_final_high, rth_final_volume)
     VALUES (@symbol, @date, 'sip', '2026-09-23T20:00:00Z', @price, @prev, @vol, @close, @high, @rthVol)`,
  );
  const uni = db.prepare(
    `INSERT INTO universe (symbol, source, updated_at, discovery_eligible) VALUES (?, 'test', '2026-09-23T00:00:00Z', ?)`,
  );
  for (const r of rows) {
    ts.run({ date: DATE, price: null, prev: null, vol: null, close: null, high: null, rthVol: null, ...r });
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
