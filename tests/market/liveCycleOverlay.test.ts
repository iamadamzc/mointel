import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { overlayLiveCycle } from '@/lib/market/readModel';
import { upsertDailyBars } from '@/lib/research/history';
import type { ResearchAnalysisVersion } from '@/lib/research/types';

const files: string[] = [];
function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-overlay-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function seedRun(db: ReturnType<typeof temporaryDb>, symbol = 'ACME') {
  const bars = Array.from({ length: 24 }, (_, i) => ({
    symbol,
    tradingDate: `2026-06-${String(i + 1).padStart(2, '0')}`,
    open: 1.3, high: 1.32, low: 1.28, close: 1.3, volume: 1_000_000,
    tradeCount: null, vwap: null, adjustment: 'split', splitFactor: null,
    source: 'test', fetchedAt: '2026-07-01T00:00:00Z',
  }));
  bars.push({
    symbol, tradingDate: '2026-07-01', open: 1.3, high: 3.4, low: 1.3, close: 3.0,
    volume: 40_000_000, tradeCount: null, vwap: null, adjustment: 'split',
    splitFactor: null, source: 'test', fetchedAt: '2026-07-02T00:00:00Z',
  });
  upsertDailyBars(db, bars);
}

function analysis(dossier: unknown): ResearchAnalysisVersion {
  return { id: 1, ticker: 'ACME', generatedAt: '2026-07-01T12:00:00Z', dossier } as ResearchAnalysisVersion;
}

/**
 * The live overlay.
 *
 * A cycle moves with price every session; filings do not. Storing it on a
 * dossier put a price-derived value behind an evidence-change gate, so a name
 * whose filings had not moved kept a stale cycle and a name analysed before the
 * field existed never got one.
 */
describe('overlayLiveCycle', () => {
  it('gives a cycle to a dossier that has none', () => {
    const db = temporaryDb();
    seedRun(db);
    // The shape of every dossier stored before computedCycle existed.
    const result = overlayLiveCycle(db, analysis({ ticker: 'ACME', catalyst: {}, structure: {}, cycle: {} }));
    expect(result?.dossier?.computedCycle?.current.phase).toBe('DAY_ONE');
  });

  it('replaces a stale stored cycle rather than deferring to it', () => {
    const db = temporaryDb();
    seedRun(db);
    const stale = { ticker: 'ACME', catalyst: {}, structure: {}, cycle: {}, computedCycle: { current: { phase: 'NO_CYCLE' } } };
    const result = overlayLiveCycle(db, analysis(stale));
    expect(result?.dossier?.computedCycle?.current.phase).toBe('DAY_ONE');
  });

  it('DOES NOT MUTATE the stored analysis, which is what preserves as-of', () => {
    const db = temporaryDb();
    seedRun(db);
    // The stored value is asOf-bounded at pipeline.ts:363 so a replay or an
    // archived assessment can resolve a cycle against the bars that existed at
    // the time. If the overlay wrote through, that boundary would be gone and a
    // historical reader would silently learn how the move turned out.
    const stored = { ticker: 'ACME', catalyst: {}, structure: {}, cycle: {}, computedCycle: null };
    const input = analysis(stored);
    overlayLiveCycle(db, input);

    expect(stored.computedCycle).toBeNull();
    expect(input.dossier).toBe(stored);
  });

  it('leaves an absent cycle absent rather than guessing', () => {
    const db = temporaryDb();
    // No bars at all.
    const result = overlayLiveCycle(db, analysis({ ticker: 'ACME', catalyst: {}, structure: {}, cycle: {} }));
    expect(result?.dossier?.computedCycle ?? null).toBeNull();
  });

  it('passes a null analysis straight through', () => {
    expect(overlayLiveCycle(temporaryDb(), null)).toBeNull();
  });
});

/**
 * The intraday verdict reaching the read path — the QCLS fix.
 *
 * QCLS read `BACKSIDE $5.49` in red while up 270%, off a run that topped four
 * months earlier. The supersession rule existed and could not see today.
 *
 * The frame is ALL THREE SESSIONS on his 2026-09-18 ruling, so the day-wide
 * high is `max(session_high, ah_high)`: `session_high` is premarket+RTH and
 * `ah_high` is the evening.
 */
describe('overlayLiveCycle todayStart', () => {
  const TODAY = '2026-07-02';

  function seedToday(
    db: ReturnType<typeof temporaryDb>,
    over: {
      sessionHigh?: number | null;
      ahHigh?: number | null;
      volume?: number | null;
      bars?: Array<{ ts: string; high: number; close: number }>;
    } = {},
  ) {
    db.prepare(
      `INSERT INTO ticker_session
         (symbol, trading_date, feed, updated_at, session_high, ah_high, cumulative_volume)
       VALUES (?, ?, 'sip', '2026-07-02T21:00:00Z', ?, ?, ?)`,
    ).run(
      'ACME',
      TODAY,
      over.sessionHigh === undefined ? 5.0 : over.sessionHigh,
      over.ahHigh === undefined ? null : over.ahHigh,
      over.volume === undefined ? 60_000_000 : over.volume,
    );
    const bars = over.bars ?? [{ ts: `${TODAY}T13:00:00.000Z`, high: 5.0, close: 4.9 }];
    const stmt = db.prepare(
      `INSERT INTO minute_bars
         (symbol, trading_date, ts, open, high, low, close, volume, source, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'test', '2026-07-02T21:00:00Z')`,
    );
    for (const b of bars) {
      stmt.run('ACME', TODAY, b.ts, b.close, b.high, b.close, b.close, 1_000);
    }
  }

  const dossier = () => analysis({ ticker: 'ACME', catalyst: {}, structure: {}, cycle: {} });

  it('is UNVERIFIABLE when no tradingDate is given, so a replay cannot acquire a live reading', () => {
    const db = temporaryDb();
    seedRun(db);
    seedToday(db);
    const out = overlayLiveCycle(db, dossier());
    expect((out!.dossier as any).computedCycle.todayStart).toBe('UNVERIFIABLE');
  });

  it('QUALIFIES a day that has moved on volume against the settled series', () => {
    const db = temporaryDb();
    seedRun(db);
    seedToday(db);
    const out = overlayLiveCycle(db, dossier(), TODAY);
    expect((out!.dossier as any).computedCycle.todayStart).toBe('QUALIFIED');
  });

  it('uses ah_high as the CEILING when our own bars missed the evening print', () => {
    /*
     * His all-sessions ruling, and the case where it bites. The verdict's high
     * comes from the stored minute bars; `session_high`/`ah_high` are the
     * AUDITOR. So `ah_high` only changes an answer when the stored bars do NOT
     * contain the evening high -- which is exactly the restart hole measured on
     * 2026-09-18.
     *
     * Bars stop at 3.05 against a 3.00 prior close: a 1.7% move, far under the
     * 20% gate. `ah_high` 5.00 is a 66.7% move, over it. The interval straddles
     * the threshold, so the honest answer is UNVERIFIABLE -- and with
     * `session_high` alone as the ceiling it would read NOT_QUALIFIED, a claim.
     */
    const db = temporaryDb();
    seedRun(db);
    seedToday(db, {
      sessionHigh: 3.05,
      ahHigh: 5.0,
      bars: [{ ts: `${TODAY}T13:00:00.000Z`, high: 3.05, close: 3.0 }],
    });
    const out = overlayLiveCycle(db, dossier(), TODAY);
    expect((out!.dossier as any).computedCycle.todayStart).toBe('UNVERIFIABLE');
  });

  it('would read NOT_QUALIFIED on the same bars without the evening ceiling', () => {
    // The control for the test above: same bars, no ah_high, so nothing tells
    // the rule its high is incomplete and it answers on what it has.
    const db = temporaryDb();
    seedRun(db);
    seedToday(db, {
      sessionHigh: 3.05,
      ahHigh: null,
      bars: [{ ts: `${TODAY}T13:00:00.000Z`, high: 3.05, close: 3.0 }],
    });
    const out = overlayLiveCycle(db, dossier(), TODAY);
    expect((out!.dossier as any).computedCycle.todayStart).toBe('NOT_QUALIFIED');
  });

  it('does NOT qualify a day on ordinary volume', () => {
    const db = temporaryDb();
    seedRun(db);
    seedToday(db, { volume: 1_200_000 });
    const out = overlayLiveCycle(db, dossier(), TODAY);
    expect((out!.dossier as any).computedCycle.todayStart).toBe('NOT_QUALIFIED');
  });

  it('stays UNVERIFIABLE when there is no session row for today', () => {
    const db = temporaryDb();
    seedRun(db);
    const out = overlayLiveCycle(db, dossier(), TODAY);
    expect((out!.dossier as any).computedCycle.todayStart).toBe('UNVERIFIABLE');
  });
});
