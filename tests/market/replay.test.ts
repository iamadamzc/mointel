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

/*
 * THE ORDER IS THE FIX, SO THE ORDER IS WHAT IS TESTED.
 *
 * `worker/runtime.ts` `bootstrapSession` replays stored bars BEFORE it seeds
 * from the daily-bar snapshot.
 *
 * WHICH OF THESE CATCHES A SWAP *IN THIS FILE* WAS SETTLED BY MUTATION, AND THE
 * PREDICTION WAS WRONG. Swapping replay and seed here kills the premarket-high
 * test and leaves the volume test green — the reverse of what was expected.
 *
 * READ THAT NARROWLY. The swap was of THESE TWO LINES, not of the production
 * call; see the source-order suite at the end of this file for why that
 * distinction cost a guard. The
 * mechanism is `engine.ts:1010`, which discards any bar at or before
 * `volumeBaseThrough`, so a replay after the seed loses those bars' highs
 * outright rather than merely re-counting their volume.
 *
 * The volume assertion is kept anyway: it is the one that would catch the
 * eviction breaking, which is a different defect in the same lines.
 *
 * The defect being fixed, measured on 2026-09-18: after a restart 1,481 rows
 * read low, and 1,160 of those highs had printed before 09:30. The daily bar
 * is regular session only, so premarket was covered by nothing.
 */
describe('replay before the snapshot seed', () => {
  const PREMARKET_HIGH = 4.2;
  const RTH_ONLY_HIGH = 2.78;

  const options = {
    tradingDate: DATE,
    feed: 'sip' as const,
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 0.1,
    priceMax: 20,
    baselineSessions: 20,
    now: () => Date.parse(`${DATE}T15:00:00.000Z`),
  };

  /** Replays a premarket high the daily bar cannot see, then seeds the RTH one. */
  function replayedThenSeeded(symbol: string, withBars: boolean): DemandEngine {
    const db = store();
    if (withBars) {
      upsertMinuteBars(db, DATE, [
        bar(symbol, '08:00', 1.0, PREMARKET_HIGH), // premarket
        bar(symbol, '14:00', 2.0, RTH_ONLY_HIGH), // regular session
      ]);
    }

    const engine = new DemandEngine(options);
    engine.setBaselines(new Map([[symbol, baseline(symbol)]]));
    engine.track(symbol);

    replaySession(db, engine, DATE);
    engine.seedSession(symbol, {
      volumeBase: 500000,
      volumeBaseThrough: `${DATE}T14:00:00.000Z`,
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
      sessionHigh: RTH_ONLY_HIGH,
      sessionLow: 2.0,
    });
    db.close();
    return engine;
  }

  it('keeps the premarket high the daily bar cannot see', () => {
    const state = replayedThenSeeded('GWAV', true).getDemandState('GWAV');
    expect(state?.sessionHigh).toBe(PREMARKET_HIGH);
  });

  it('keeps the premarket low the daily bar cannot see', () => {
    /* The mirror of the high, and free in this fixture: 1.0 against a seeded 2.0. */
    const state = replayedThenSeeded('GWAV', true).getDemandState('GWAV');
    expect(state?.sessionLow).toBe(1.0);
  });

  it('does not double-count the volume the seed base already contains', () => {
    /*
     * Both replayed bars carry 1,000 and both fall at or before
     * `volumeBaseThrough`, so the seed evicts them. 502,000 here would mean the
     * eviction stopped working and every pre-snapshot minute is counted twice.
     */
    const state = replayedThenSeeded('GWAV', true).getDemandState('GWAV');
    expect(state?.cumulativeVolume).toBe(500000);
  });

  it('leaves a name with no stored bars on whatever the seed gives it', () => {
    /* Absent beats plausible: replay invents nothing for an untracked name. */
    const state = replayedThenSeeded('NOBARS', false).getDemandState('NOBARS');
    expect(state?.sessionHigh).toBe(RTH_ONLY_HIGH);
  });
});

/*
 * THE PRODUCTION SEAM, WHICH THE TESTS ABOVE DO NOT REACH.
 *
 * The suite above builds its own replay-then-seed sequence and asserts the
 * composition behaves. That is worth having and it is NOT a guard on the
 * shipped code: Research moved the real call in `worker/runtime.ts` to after
 * the seed loop — the actual defect — and the entire suite stayed green.
 *
 * MY MUTATION HAD SWAPPED THE TEST'S OWN TWO LINES, NOT THE PRODUCTION ONE,
 * and I reported it as having established the ordering. It established that the
 * composition is order-sensitive. Whether `bootstrapSession` composes it in the
 * right order was untested, which is the difference between a guard and a
 * demonstration.
 *
 * These assert on source text because a behavioural test has to construct a
 * `MarketRuntime`, and `tests/desk/minuteBarRecovery.test.ts` exists to forbid
 * exactly that in the place where its store claim can wipe three tables. Source
 * assertions are this repo's idiom for a structural invariant; they are weaker
 * than behaviour and they catch the mutation that actually happened.
 */
describe('bootstrapSession composes replay and seed in the right order', () => {
  const SOURCE = fs.readFileSync(
    path.join(process.cwd(), 'worker', 'runtime.ts'),
    'utf8',
  );

  it('replays before it fetches the snapshots it seeds from', () => {
    /*
     * engine.ts discards any bar at or before `volumeBaseThrough`, so a replay
     * after the seed loses those bars' highs outright. This is the ordering
     * whose reversal reopens the premarket hole.
     */
    const replay = SOURCE.indexOf('replaySession(this.db, this.engine');
    const snapshots = SOURCE.indexOf('await this.rest.getSnapshots');
    expect(replay).toBeGreaterThan(-1);
    expect(snapshots).toBeGreaterThan(-1);
    expect(replay).toBeLessThan(snapshots);
  });

  it('replays even when there is no REST client to seed from', () => {
    /*
     * Replay reads the local store and needs no network. Below the early return
     * for a missing REST client it would be skipped during an Alpaca outage —
     * rebuilding the hole for want of a client it never needed. Found while
     * writing this file, on 2026-09-22.
     */
    const replay = SOURCE.indexOf('replaySession(this.db, this.engine');
    const restGuard = SOURCE.indexOf("no REST client; skipped historical reconstruction");
    expect(restGuard).toBeGreaterThan(-1);
    expect(replay).toBeLessThan(restGuard);
  });
});
