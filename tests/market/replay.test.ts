/**
 * The restart-amnesia fix.
 *
 * The headline test is the last one: after a replay, the session open anchors
 * on the FIRST bar of the session rather than on whatever arrived after the
 * process came back. That is the defect measured on 2026-09-11 -- 540 of 668
 * anchors later than the name's own first bar, worst offset 3,119 seconds, and
 * AENT reading -18.72% on a name that was up 64.67%.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import { replaySession } from '@/lib/market/replay';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertMinuteBars } from '@/lib/market/store/repo';
import type { MarketMinuteBar, MarketObservation, RvolBaseline } from '@/lib/market/types';

function baseline(symbol: string): RvolBaseline {
  return {
    symbol,
    baselineDate: DATE,
    previousClose: 1,
    previousCloseDate: '2026-09-10',
    averageVolume: 100000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test',
    feed: 'sip',
    adjustment: 'raw',
    calculatedAt: `${DATE}T00:00:00.000Z`,
  };
}

const DATE = '2026-09-11';
const files: string[] = [];

function store(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-replay-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (files.length) {
    const file = files.pop();
    try {
      if (file) fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

function bar(symbol: string, minute: string, open: number, close = open): MarketMinuteBar {
  return {
    symbol,
    ts: `${DATE}T${minute}:00.000Z`,
    open,
    high: Math.max(open, close),
    low: Math.min(open, close),
    close,
    volume: 1000,
    tradeCount: 5,
    vwap: (open + close) / 2,
    source: 'live-bar',
    receivedAt: `${DATE}T${minute}:59.000Z`,
  };
}

/** Records what the engine would have been given, without being one. */
function recorder() {
  const seen: MarketObservation[] = [];
  return { seen, ingest: (o: MarketObservation) => { seen.push(o); return []; } };
}

describe('what the replay feeds the engine', () => {
  it('replays every stored bar for the date, and nothing from another date', () => {
    const db = store();
    upsertMinuteBars(db, DATE, [bar('AAA', '08:00', 1), bar('AAA', '08:01', 2)]);
    upsertMinuteBars(db, '2026-09-10', [bar('AAA', '08:00', 9)]);

    const target = recorder();
    const result = replaySession(db, target, DATE);

    expect(result.bars).toBe(2);
    expect(result.symbols).toBe(1);
    expect(target.seen).toHaveLength(2);
    expect(target.seen.every((o) => o.ts.startsWith(DATE))).toBe(true);

    db.close();
  });

  /*
   * VWAP and the open anchor accumulate per symbol in time order. Cross-symbol
   * interleaving is irrelevant to both, but a symbol's own bars arriving out of
   * order would anchor on the wrong minute -- which is the defect, reintroduced
   * by the fix.
   */
  it('delivers each symbol its own bars in ascending time order', () => {
    const db = store();
    upsertMinuteBars(db, DATE, [
      bar('BBB', '08:02', 3),
      bar('AAA', '08:01', 2),
      bar('BBB', '08:00', 1),
      bar('AAA', '08:00', 1),
    ]);

    const target = recorder();
    replaySession(db, target, DATE);

    for (const symbol of ['AAA', 'BBB']) {
      const times = target.seen.filter((o) => o.symbol === symbol).map((o) => o.ts);
      expect(times).toEqual([...times].sort());
    }

    db.close();
  });

  /*
   * A restart at 14:00 must not re-announce every NEW_HOD since 04:00 to a
   * trader who watched them arrive the first time.
   */
  it('discards the events the replayed bars raise', () => {
    const db = store();
    upsertMinuteBars(db, DATE, [bar('AAA', '08:00', 1), bar('AAA', '08:01', 5)]);

    let emitted = 0;
    const result = replaySession(
      db,
      { ingest: () => { emitted += 1; return ['NEW_HOD']; } },
      DATE,
    );

    expect(result.bars).toBe(2);
    expect(emitted).toBe(2); // ingest was called
    // and nothing was returned to a caller that could publish it
    expect(Object.keys(result)).toEqual(['bars', 'symbols', 'elapsedMs']);

    db.close();
  });

  /*
   * Stamping the replay with `now` would report every bar of the session as
   * having arrived at startup, which permanently poisons the arrival-latency
   * reading that separates originals from corrections.
   */
  it('preserves each bar stored receivedAt rather than stamping now', () => {
    const db = store();
    upsertMinuteBars(db, DATE, [bar('AAA', '08:00', 1)]);

    const target = recorder();
    replaySession(db, target, DATE);

    expect(target.seen[0].receivedAt).toBe(`${DATE}T08:00:59.000Z`);

    db.close();
  });

  it('is a no-op on a date with no bars', () => {
    const db = store();
    const target = recorder();
    const result = replaySession(db, target, DATE);

    expect(result.bars).toBe(0);
    expect(result.symbols).toBe(0);
    expect(target.seen).toHaveLength(0);

    db.close();
  });
});

describe('the anchor, against a real engine', () => {
  /*
   * THE TEST THIS MODULE EXISTS FOR.
   *
   * An engine that starts mid-session with no replay anchors on the first bar
   * it happens to see. With the replay, it anchors on the session's real first
   * bar -- which is what the trader is shown a percentage against.
   */
  it('anchors on the first bar of the session, not the first bar after the restart', () => {
    const db = store();
    const bars = [
      bar('AAA', '08:00', 1.0, 1.0),
      bar('AAA', '08:30', 1.5, 1.5),
      bar('AAA', '09:00', 2.0, 2.0),
    ];
    upsertMinuteBars(db, DATE, bars);

    const engineOptions = {
      tradingDate: DATE,
      feed: 'sip' as const,
      discoveryRank: 12,
      internalRank: 50,
      priceMin: 0.1,
      priceMax: 20,
      baselineSessions: 20,
      now: () => Date.parse(`${DATE}T09:05:00.000Z`),
    };

    // The amnesiac case: a restart at 09:00 sees only the 09:00 bar.
    const amnesiac = new DemandEngine(engineOptions);
    amnesiac.setBaselines(new Map([['AAA', baseline('AAA')]]));
    amnesiac.track('AAA');
    amnesiac.ingest({
      symbol: 'AAA', kind: 'bar', ts: bars[2].ts, receivedAt: bars[2].receivedAt,
      feed: 'sip', bar: bars[2],
    });

    // The replayed case: the same engine, fed the stored session first.
    const replayed = new DemandEngine(engineOptions);
    replayed.setBaselines(new Map([['AAA', baseline('AAA')]]));
    replayed.track('AAA');
    const result = replaySession(db, replayed, DATE);

    expect(result.bars).toBe(3);

    const anchorOf = (e: DemandEngine) => e.getDemandState('AAA')?.sessionOpens?.premarket;

    /*
     * The anchor converges regardless of arrival order -- the engine keeps the
     * earliest ts. What ordering protects is the last-write-wins fields, so the
     * current price is asserted separately and deliberately.
     */
    expect(replayed.getDemandState('AAA')?.price).toBe(2.0);

    expect(anchorOf(amnesiac)?.price).toBe(2.0);
    expect(anchorOf(replayed)?.price).toBe(1.0);
    expect(anchorOf(replayed)?.at).toBe(bars[0].ts);

    db.close();
  });
});
