/**
 * Outcome derivation from raw minute bars.
 *
 * The bars are hand-built rather than fetched, because what is being tested is
 * the session model — which minute belongs to premarket, which to the 09:30-10:00
 * window, what an early close does — and a recorded fixture would only assert
 * that Alpaca returned what it returned that day.
 */

import { describe, expect, it } from 'vitest';

import { deriveFollowThrough, deriveOutcome, type RawMinuteBar } from '@/lib/archive/outcomes';
import { etWallClockToUtc } from '@/lib/market/session';

const DATE = '2026-08-18';

function bar(
  hour: number,
  minute: number,
  values: { o?: number; h?: number; l?: number; c?: number; v?: number; vw?: number },
  date = DATE,
): RawMinuteBar {
  const close = values.c ?? values.o ?? 1;
  return {
    t: etWallClockToUtc(date, hour, minute).toISOString(),
    o: values.o ?? close,
    h: values.h ?? close,
    l: values.l ?? close,
    c: close,
    v: values.v ?? 1000,
    vw: values.vw,
  };
}

describe('deriveOutcome', () => {
  it('separates premarket, the opening 30 minutes, and the rest of RTH', () => {
    const outcome = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 2,
      referenceBasis: 'PRIOR_RTH_CLOSE',
      bars: [
        bar(4, 30, { o: 2.1, h: 2.4, l: 2.0, c: 2.3, v: 500 }),
        bar(8, 15, { o: 2.3, h: 3.0, l: 2.3, c: 2.9, v: 800 }),
        bar(9, 30, { o: 3.0, h: 3.6, l: 2.95, c: 3.5, v: 5000 }),
        bar(9, 59, { o: 3.5, h: 3.8, l: 3.4, c: 3.7, v: 4000 }),
        bar(10, 45, { o: 3.7, h: 4.2, l: 3.6, c: 4.0, v: 3000 }),
        bar(13, 0, { o: 4.0, h: 4.5, l: 3.2, c: 3.4, v: 2000 }),
        bar(17, 0, { o: 3.4, h: 5.0, l: 3.3, c: 4.8, v: 700 }),
      ],
    });

    expect(outcome.minuteBarCount).toBe(7);
    // The after-hours print is the session high; the session window runs to 20:00.
    expect(outcome.sessionHigh).toBe(5);
    expect(outcome.sessionLow).toBe(2);
    expect(outcome.maxGainPct).toBeCloseTo(150, 6);
    expect(outcome.timeOfMaxGain).toBe(outcome.timeOfHigh);

    expect(outcome.premarketHigh).toBe(3);
    expect(outcome.premarketHighAt).toBe(bar(8, 15, {}).t);

    expect(outcome.rthOpen).toBe(3);
    expect(outcome.rthHigh).toBe(4.5);
    expect(outcome.rthLow).toBe(2.95);
    expect(outcome.rthClose).toBe(3.4);

    // 09:30-10:00 only: 3.8, not the 10:45 bar's 4.2.
    expect(outcome.gainOpen30Pct).toBeCloseTo(90, 6);
    // Through 11:00: picks up 4.2 but not the 13:00 bar's 4.5.
    expect(outcome.gainTo1100Pct).toBeCloseTo(110, 6);
    expect(outcome.gainToClosePct).toBeCloseTo(70, 6);

    expect(outcome.volume).toBe(16000);
    expect(outcome.adjustmentBasis).toBe('raw');
  });

  it('drops bars outside the 04:00-20:00 window and outside the trading date', () => {
    const outcome = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 1,
      bars: [
        bar(3, 30, { c: 9, h: 9, v: 100 }),
        bar(10, 0, { c: 2, h: 2, l: 2, v: 100 }),
        bar(20, 30, { c: 8, h: 8, v: 100 }),
        bar(10, 0, { c: 7, h: 7, v: 100 }, '2026-08-19'),
      ],
    });

    expect(outcome.minuteBarCount).toBe(1);
    expect(outcome.sessionHigh).toBe(2);
    expect(outcome.volume).toBe(100);
  });

  it('honours an early close: 13:05 is after hours on a 13:00 day', () => {
    const bars = [
      bar(12, 30, { o: 1, h: 1.5, l: 1, c: 1.4, v: 100 }),
      bar(13, 5, { o: 1.4, h: 9, l: 1.4, c: 8, v: 100 }),
    ];

    const early = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 1,
      closeMinutes: 13 * 60,
      bars,
    });
    expect(early.rthHigh).toBe(1.5);
    expect(early.rthClose).toBe(1.4);
    // The session high still counts it — the tape is the tape.
    expect(early.sessionHigh).toBe(9);

    const normal = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 1,
      bars,
    });
    expect(normal.rthHigh).toBe(9);
    expect(normal.rthClose).toBe(8);
  });

  it('returns a row with no facts, rather than nothing, when there are no bars', () => {
    const outcome = deriveOutcome({ symbol: 'DEAD', tradingDate: DATE, bars: [] });

    expect(outcome.minuteBarCount).toBe(0);
    expect(outcome.sessionHigh).toBeNull();
    expect(outcome.volume).toBeNull();
    // Halts are not derivable from bars. Null must mean "not captured", never
    // "none happened", or a later analysis will count zero halts everywhere.
    expect(outcome.haltCount).toBeNull();
    expect(outcome.luldEventCount).toBeNull();
  });

  it('leaves every percentage null when there is no reference close', () => {
    const outcome = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      bars: [bar(10, 0, { o: 1, h: 2, l: 1, c: 1.5 })],
    });

    expect(outcome.sessionHigh).toBe(2);
    expect(outcome.maxGainPct).toBeNull();
    expect(outcome.timeOfMaxGain).toBeNull();
    expect(outcome.gainToClosePct).toBeNull();
  });

  it('prefers the bar VWAP for dollar volume and falls back to the typical price', () => {
    const withVwap = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      bars: [bar(10, 0, { o: 1, h: 3, l: 1, c: 2, v: 100, vw: 2.5 })],
    });
    expect(withVwap.dollarVolume).toBeCloseTo(250, 6);

    const withoutVwap = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      bars: [bar(10, 0, { o: 1, h: 3, l: 1, c: 2, v: 100 })],
    });
    expect(withoutVwap.dollarVolume).toBeCloseTo(200, 6);
  });
});

describe('deriveFollowThrough', () => {
  it('takes the regular-session open, not the first premarket print', () => {
    const next = '2026-08-19';
    const follow = deriveFollowThrough(next, [
      bar(6, 0, { o: 5, h: 6, l: 5, c: 5.5 }, next),
      bar(9, 30, { o: 4, h: 4.5, l: 3.9, c: 4.2 }, next),
      bar(11, 0, { o: 4.2, h: 7, l: 4.1, c: 6.8 }, next),
    ]);

    expect(follow.nextOpen).toBe(4);
    expect(follow.nextHigh).toBe(7);
  });

  it('is null when the next session has not happened', () => {
    expect(deriveFollowThrough('2026-08-19', [])).toEqual({ nextOpen: null, nextHigh: null });
  });
});

describe('official close', () => {
  it('prefers the daily bar over the last minute bar for the day figure', () => {
    // The last regular-session minute bar excludes the closing auction. On a
    // thin small cap the cross routinely prints several percent away from the
    // last continuous tick, so "how did the day finish" has to come from the
    // daily bar. Both are stored; only one is the official close.
    const outcome = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 10,
      bars: [bar(15, 59, { o: 11, h: 11, l: 11, c: 11, v: 500 })],
      dailyBar: { c: 12, v: 900 },
    });

    expect(outcome.rthClose).toBe(11);
    expect(outcome.officialClose).toBe(12);
    expect(outcome.officialVolume).toBe(900);
    expect(outcome.gainToClosePct).toBeCloseTo(20, 6);
  });

  it('falls back to the minute close when no daily bar was fetched', () => {
    const outcome = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 10,
      bars: [bar(15, 59, { o: 11, h: 11, l: 11, c: 11, v: 500 })],
    });

    expect(outcome.officialClose).toBeNull();
    expect(outcome.gainToClosePct).toBeCloseTo(10, 6);
  });
});
