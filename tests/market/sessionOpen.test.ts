import { describe, expect, it } from 'vitest';

import { DEFAULT_ACTIVITY_CONFIG, deadLineFor } from '@/lib/market/activity';
import { DemandEngine } from '@/lib/market/engine';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';
import { anchorThickness } from '@/lib/market/vwap';

/**
 * The origin for a within-session Move.
 *
 * He ruled it: the FIRST PRINT of the session, one rule for all three, with the
 * anchoring minute's trade count carried so a thin anchor is legible. A VWAP was
 * proposed and refused — an average cannot be an origin, and with one odd-lot
 * print the volume-weighted average of one print is that print.
 *
 * Almost every test here is about a way the anchor must NOT move.
 */

const TRADING_DATE = '2026-08-14';
/** 09:30 ET is 13:30Z on this date (EDT). */
const BELL = Date.UTC(2026, 7, 14, 13, 30, 0);

function at(minutesFromBell: number): string {
  return new Date(BELL + minutesFromBell * 60_000).toISOString();
}

function bar(
  symbol: string,
  ts: string,
  values: { o: number; c: number; v: number; n?: number | null },
  kind: 'bar' | 'updatedBar' = 'bar',
): MarketObservation {
  return {
    symbol,
    kind,
    ts,
    receivedAt: ts,
    feed: 'sip',
    price: values.c,
    bar: {
      symbol,
      ts,
      open: values.o,
      high: Math.max(values.o, values.c),
      low: Math.min(values.o, values.c),
      close: values.c,
      volume: values.v,
      tradeCount: values.n === undefined ? 100 : values.n,
      vwap: null,
      source: 'live-bar',
      receivedAt: ts,
    },
  };
}

function baseline(symbol: string): RvolBaseline {
  return {
    symbol,
    baselineDate: TRADING_DATE,
    previousClose: 4,
    previousCloseDate: '2026-08-13',
    averageVolume: 1_000_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T00:00:00Z',
  };
}

function engineAt(nowMs: number, rthCloseMinutes?: number) {
  const engine = new DemandEngine({
    tradingDate: TRADING_DATE,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
    rthCloseMinutes,
    now: () => nowMs,
  });
  engine.setBaselines(new Map([['ABCD', baseline('ABCD')]]));
  engine.track('ABCD');
  return engine;
}

function opens(engine: DemandEngine) {
  return engine.getDemandState('ABCD')?.sessionOpens;
}

describe('the anchor is the earliest minute, not the first one delivered', () => {
  it('holds the earliest bar even when a later one arrives first', () => {
    /*
     * THE TRAP THIS EXISTS FOR. Bars arrive out of order — every price field in
     * the engine is guarded by `isNewerObservation` for that reason — so a
     * plain "if nothing stored, store it" anchors on whatever the socket
     * delivered first. Here 09:32 arrives before 09:30 and must lose.
     */
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(2), { o: 6, c: 6.2, v: 20_000 }));
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));

    expect(opens(engine)?.regular.price).toBe(5);
    expect(opens(engine)?.regular.at).toBe(at(0));
  });

  it('does not let a later bar overwrite an anchor already held', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(3), { o: 7, c: 7.5, v: 10_000 }));

    expect(opens(engine)?.regular.price).toBe(5);
  });

  it('lets a CORRECTION to the anchoring minute replace it', () => {
    /*
     * The second trap, and the reason the comparison is `<=` rather than `<`.
     * `updatedBar` revises a minute in place, so a revision of the anchoring
     * minute must move the price. Treating it as "not earlier" would leave a
     * stale origin that no later bar could ever fix.
     */
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(0), { o: 4.6, c: 5.1, v: 60_000 }, 'updatedBar'));

    expect(opens(engine)?.regular.price).toBe(4.6);
    expect(opens(engine)?.regular.at).toBe(at(0));
  });
});

describe('each session owns its own open', () => {
  it('keeps premarket, regular and after-hours anchors apart', () => {
    /*
     * The premarket open must not become the regular open when the bell rings.
     * That is the same failure the session VWAPs exist to avoid — quoting one
     * session's average under another session's name.
     */
    const engine = engineAt(BELL + 8 * 60_000);
    engine.ingest(bar('ABCD', at(-90), { o: 3, c: 3.2, v: 5_000 }));
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));

    const set = opens(engine);
    expect(set?.premarket.price).toBe(3);
    expect(set?.regular.price).toBe(5);
    // Nothing has traded after the bell yet, and that is not a price of zero.
    expect(set?.afterHours.price).toBeNull();
    expect(set?.afterHours.move).toBeNull();
  });

  it('anchors after-hours on its OWN first print, not on the closing price', () => {
    /*
     * ONE RULE MEANS AFTER-HOURS DOES NOT COLLAPSE. An earlier ruling of mine
     * said it would, because it defined the AH open AS the 16:00 close. Under
     * the first-print rule the AH open is the first print AFTER the bell, which
     * is a different print — and the distance between them is itself the
     * after-hours gap.
     */
    const engine = engineAt(BELL + 400 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(395), { o: 8, c: 8.4, v: 30_000 }));

    const set = opens(engine);
    expect(set?.afterHours.price).toBe(8);
    expect(set?.afterHours.price).not.toBe(set?.regular.price);
  });
});

describe('the thin anchor is exposed rather than smoothed', () => {
  it('carries the anchoring minute trade count', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000, n: 3 }));
    expect(opens(engine)?.regular.tradeCount).toBe(3);
  });

  it('leaves an unreported count NULL rather than zero', () => {
    /*
     * A bar with no trade count is unreported; a minute with no trades has no
     * bar at all. Neither of those is "one trade", and zero would read as a
     * measurement.
     */
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000, n: null }));
    expect(opens(engine)?.regular.tradeCount).toBeNull();
  });
});

describe('the Move is derived here, so no surface divides its own numbers', () => {
  it('measures the current price against the session open', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(3), { o: 5.5, c: 6, v: 10_000 }));

    // 6.00 against an open of 5.00.
    expect(opens(engine)?.regular.move).toBeCloseTo(20, 6);
  });

  it('is null before the session has a price to measure from', () => {
    const engine = engineAt(BELL - 200 * 60_000);
    expect(opens(engine)?.regular.move).toBeNull();
    expect(opens(engine)?.regular.price).toBeNull();
  });
});

/**
 * Why there is no open, when there is none.
 *
 * Design found the defect at the surface: a Move reading returned null both for
 * a session that had not begun and for one that was running with no print, so
 * the more informative of the two -- THIS NAME IS NOT TRADING IN A LIVE SESSION
 * -- rendered as nothing. Both causes produce `price === null`; only a holder of
 * the clock can separate them.
 */
describe('a null open says WHICH null it is', () => {
  it('is NOT_STARTED before the session begins', () => {
    const engine = engineAt(BELL - 60 * 60_000);
    expect(opens(engine)?.regular.state).toBe('NOT_STARTED');
    expect(opens(engine)?.regular.price).toBeNull();
  });

  it('is NO_PRINT once the session is running and nothing has traded', () => {
    const engine = engineAt(BELL + 30 * 60_000);
    expect(opens(engine)?.regular.state).toBe('NO_PRINT');
    expect(opens(engine)?.regular.price).toBeNull();
  });

  it('separates the two states that used to render identically', () => {
    /* THE DEFECT, PINNED. Same null price, different states. */
    const before = opens(engineAt(BELL - 60 * 60_000))?.regular;
    const during = opens(engineAt(BELL + 30 * 60_000))?.regular;

    expect(before?.price).toBeNull();
    expect(during?.price).toBeNull();
    expect(before?.state).not.toBe(during?.state);
  });

  it('is OPEN as soon as a print exists', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    expect(opens(engine)?.regular.state).toBe('OPEN');
  });

  it('calls a FINISHED session with no print NO_PRINT, not a fourth state', () => {
    /*
     * "It ran and never traded" and "it is running and has not traded yet" are
     * the same measurement about the same name, and the phase is on the header
     * already. Premarket is over by the time RTH is 30 minutes old.
     */
    const engine = engineAt(BELL + 30 * 60_000);
    expect(opens(engine)?.premarket.state).toBe('NO_PRINT');
  });

  it('flips exactly at the boundary the VWAP coverage flag uses', () => {
    /* One millisecond either side of 09:30, so the two fields cannot disagree. */
    expect(opens(engineAt(BELL - 1))?.regular.state).toBe('NOT_STARTED');
    expect(opens(engineAt(BELL))?.regular.state).toBe('NO_PRINT');
  });

  it('never emits UNKNOWN, because this side holds the clock', () => {
    /*
     * UNKNOWN exists for `sessionOpensFromRow`, which rebuilds opens from
     * stored columns and has no clock. A compute that emitted it would be
     * declining to answer a question it can answer.
     */
    for (const nowMs of [BELL - 300 * 60_000, BELL, BELL + 30 * 60_000, BELL + 400 * 60_000]) {
      const set = opens(engineAt(nowMs));
      for (const open of [set?.premarket, set?.regular, set?.afterHours]) {
        expect(open?.state).not.toBe('UNKNOWN');
      }
    }
  });

  it('moves the after-hours boundary on an early close', () => {
    /*
     * WHY THE STORE CANNOT DERIVE THIS. 13:30 ET is before after-hours on a
     * normal day and inside it on a half day, and the only thing that
     * distinguishes them is an INJECTED `rthCloseMinutes` -- not the trading
     * date, and nothing a `ticker_session` row carries. A read-side derivation
     * that assumed 16:00 would be right most days and silently wrong on the
     * days the desk trades a half session, which is why a row says UNKNOWN.
     */
    const fourHoursIn = BELL + 4 * 60 * 60_000;
    expect(opens(engineAt(fourHoursIn))?.afterHours.state).toBe('NOT_STARTED');
    expect(opens(engineAt(fourHoursIn, 13 * 60))?.afterHours.state).toBe('NO_PRINT');
  });
});

/**
 * Thick or thin, and he ruled it binary.
 *
 * The threshold is the DEAD line and not the ACTIVE line. Measured against real
 * anchors, a 300-trade cut marks 84% of board rows and 98.6% of the universe as
 * thin -- a flag that fires on almost everything. The dead line asks whether
 * the anchoring minute was a real trading minute, which is the question.
 */
describe('the anchor says whether it is worth measuring from', () => {
  const DEAD = deadLineFor(DEFAULT_ACTIVITY_CONFIG); // 300 / 10 = 30

  it('derives the line from his numbers rather than carrying its own', () => {
    expect(DEAD).toBe(30);
  });

  it('calls a minute above the dead line THICK', () => {
    expect(anchorThickness(31, DEAD)).toBe('THICK');
    expect(anchorThickness(400, DEAD)).toBe('THICK');
  });

  it('calls a minute AT the dead line THIN, not thick', () => {
    // The dead line is the boundary of a minute that does not count as living.
    // At it is not above it.
    expect(anchorThickness(30, DEAD)).toBe('THIN');
  });

  it('calls the one-odd-lot case THIN', () => {
    // p25 of board anchors is 3 trades and p10 is 1. This is the case the flag
    // exists for, not an edge.
    expect(anchorThickness(1, DEAD)).toBe('THIN');
    expect(anchorThickness(3, DEAD)).toBe('THIN');
  });

  it('measures a real zero as THIN rather than refusing to answer', () => {
    // Zero trades in a bar that exists is a measurement. Distinct from null.
    expect(anchorThickness(0, DEAD)).toBe('THIN');
  });

  it('refuses to call an UNREPORTED count thin', () => {
    /*
     * THE ONE THAT MATTERS. A bar with no trade count is a gap in the feed, and
     * "thin" is a claim about the market. Calling null THIN is the same error as
     * a NO_PRINT produced by a restart: a process fact rendered as a market fact.
     */
    expect(anchorThickness(null, DEAD)).toBe('UNKNOWN');
    expect(anchorThickness(undefined, DEAD)).toBe('UNKNOWN');
    expect(anchorThickness(Number.NaN, DEAD)).toBe('UNKNOWN');
  });

  it('moves with the config rather than pinning 30', () => {
    // If he retunes the active line, the anchor line follows. A hardcoded 30
    // would silently keep the old calibration.
    const retuned = deadLineFor({ ...DEFAULT_ACTIVITY_CONFIG, activeTradesPerMinute: 600 });
    expect(retuned).toBe(60);
    expect(anchorThickness(45, retuned)).toBe('THIN');
    expect(anchorThickness(45, DEAD)).toBe('THICK');
  });

  it('reads the thickness of an open the engine actually produced', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000, n: 3 }));
    const open = opens(engine)?.regular;
    expect(open?.state).toBe('OPEN');
    expect(anchorThickness(open?.tradeCount ?? null, DEAD)).toBe('THIN');
  });

  it('leaves an OPEN with an unreported count as UNKNOWN thickness', () => {
    // The open is real -- there is a price -- and its trustworthiness is not
    // known. Two different fields, two different three-state answers.
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000, n: null }));
    const open = opens(engine)?.regular;
    expect(open?.state).toBe('OPEN');
    expect(anchorThickness(open?.tradeCount ?? null, DEAD)).toBe('UNKNOWN');
  });
});
