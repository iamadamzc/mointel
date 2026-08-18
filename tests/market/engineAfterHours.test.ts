/**
 * The session boundary, end to end through the demand engine.
 *
 * These are the tests that pin the behaviour the desk was actually wrong
 * about: at 16:30 it ranked the stocks that had accumulated the most abnormal
 * volume during the whole 04:00–16:00 day, which answers a question nobody is
 * asking after the bell.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';

const TRADING_DATE = '2026-08-14';

/** ET wall-clock on the trading date, as UTC (EDT = UTC-4). */
function at(hour: number, minute = 0): string {
  return new Date(Date.UTC(2026, 7, 14, hour + 4, minute, 0)).toISOString();
}

function baseline(symbol: string, averageVolume: number | null): RvolBaseline {
  return {
    symbol,
    baselineDate: TRADING_DATE,
    previousClose: 4,
    previousCloseDate: '2026-08-13',
    averageVolume,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T08:00:00.000Z',
  };
}

function bar(
  symbol: string,
  ts: string,
  values: { h?: number; l?: number; c: number; v: number },
): MarketObservation {
  return {
    symbol,
    kind: 'bar',
    ts,
    receivedAt: ts,
    feed: 'sip',
    price: values.c,
    bar: {
      symbol,
      ts,
      open: values.c,
      high: values.h ?? values.c,
      low: values.l ?? values.c,
      close: values.c,
      volume: values.v,
      tradeCount: null,
      vwap: null,
      source: 'live-bar',
      receivedAt: ts,
    },
  };
}

let clock = Date.parse(at(9, 31));

function createEngine(options: Partial<ConstructorParameters<typeof DemandEngine>[0]> = {}) {
  return new DemandEngine({
    tradingDate: TRADING_DATE,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
    now: () => clock,
    ...options,
  });
}

/** A desk that ran through the whole day and watched the bell. */
function engineThroughTheClose(
  symbols: Array<{ symbol: string; average: number; rthVolume: number; close: number }>,
) {
  const engine = createEngine();
  engine.setBaselines(
    new Map(symbols.map((entry) => [entry.symbol, baseline(entry.symbol, entry.average)])),
  );

  for (const entry of symbols) {
    engine.track(entry.symbol);
    engine.ingest(bar(entry.symbol, at(10, 0), { c: entry.close, v: entry.rthVolume }));
  }

  clock = Date.parse(at(16, 0));
  engine.setRthClosed(true, { observed: true });
  for (const entry of symbols) {
    engine.setTodayRthClose(entry.symbol, {
      close: entry.close,
      date: TRADING_DATE,
      source: 'alpaca-daily-bar-rth-close',
    });
  }

  return engine;
}

beforeEach(() => {
  clock = Date.parse(at(9, 31));
});

describe('Daily RVOL stays the premarket and RTH ranking (requirements 1, 2)', () => {
  it('ranks on Daily RVOL before the bell and does not reset at 09:30', () => {
    const engine = createEngine();
    engine.setBaselines(
      new Map([
        ['PREMKT', baseline('PREMKT', 1_000_000)],
        ['QUIET', baseline('QUIET', 1_000_000)],
      ]),
    );
    engine.track('PREMKT');
    engine.track('QUIET');

    // Premarket participation.
    engine.ingest(bar('PREMKT', at(7, 0), { c: 3, v: 800_000 }));
    engine.ingest(bar('QUIET', at(7, 0), { c: 3, v: 10_000 }));
    engine.recompute();

    expect(engine.getDemandState('PREMKT')?.rvolRank).toBe(1);
    expect(engine.getDemandState('PREMKT')?.rvol).toBeCloseTo(0.8, 10);

    // The regular session adds to it; nothing is cleared at 09:30.
    engine.ingest(bar('PREMKT', at(10, 0), { c: 3.4, v: 400_000 }));
    engine.recompute();

    expect(engine.getDemandState('PREMKT')?.cumulativeVolume).toBe(1_200_000);
    expect(engine.getDemandState('PREMKT')?.rvol).toBeCloseTo(1.2, 10);
    // And no after-hours state exists before the bell.
    expect(engine.getDemandState('PREMKT')?.afterHours.coverage).toBe('NONE');
    expect(engine.getDemandState('PREMKT')?.afterHours.volume).toBeNull();
    expect(engine.getDemandState('PREMKT')?.rthFinal).toBeNull();
  });
});

describe('the close freezes RTH and starts after-hours at zero (requirements 3, 4, 5)', () => {
  it('freezes the regular session and zeroes the evening', () => {
    const engine = engineThroughTheClose([
      { symbol: 'BIGDAY', average: 1_000_000, rthVolume: 5_000_000, close: 4 },
    ]);
    engine.recompute();

    const state = engine.getDemandState('BIGDAY');

    // Frozen: what the bell saw.
    expect(state?.rthFinal?.volume).toBe(5_000_000);
    expect(state?.rthFinal?.rvol).toBeCloseTo(5, 10);
    expect(state?.rthFinal?.close).toBe(4);
    expect(state?.rthFinal?.frozenAt).not.toBeNull();

    // Zeroed: the evening has not traded yet, and that is a known zero.
    expect(state?.afterHours.volume).toBe(0);
    expect(state?.afterHours.participation).toBe(0);
    expect(state?.afterHours.coverage).toBe('COMPLETE');
    expect(state?.afterHours.high).toBeNull();
    expect(state?.afterHours.low).toBeNull();
  });

  it('never lets regular-session volume leak into after-hours volume', () => {
    const engine = engineThroughTheClose([
      { symbol: 'LEAK', average: 1_000_000, rthVolume: 9_000_000, close: 4 },
    ]);

    engine.ingest(bar('LEAK', at(16, 5), { c: 4.4, v: 250_000 }));
    engine.ingest(bar('LEAK', at(17, 30), { c: 4.6, v: 150_000 }));
    engine.recompute();

    const state = engine.getDemandState('LEAK');

    expect(state?.afterHours.volume).toBe(400_000);
    // The day keeps accumulating; the evening is measured separately from it.
    expect(state?.cumulativeVolume).toBe(9_400_000);
    expect(state?.afterHours.participation).toBeCloseTo(0.4, 10);
    expect(state?.rvol).toBeCloseTo(9.4, 10);
  });

  it('measures AH % against today’s close and resets AH high/low at the bell', () => {
    const engine = engineThroughTheClose([
      { symbol: 'MOVER', average: 1_000_000, rthVolume: 1_000_000, close: 4 },
    ]);

    // The regular session ranged 3.00–5.00; the evening starts with no range.
    engine.ingest(bar('MOVER', at(16, 10), { h: 4.8, l: 4.1, c: 4.6, v: 100_000 }));
    engine.recompute();

    const state = engine.getDemandState('MOVER');
    expect(state?.afterHours.percentChange).toBeCloseTo(15, 10);
    expect(state?.afterHours.referenceClose).toBe(4);
    expect(state?.afterHours.high).toBe(4.8);
    expect(state?.afterHours.low).toBe(4.1);
    // Percent change on the row switches reference at the same moment.
    expect(state?.referenceRthCloseBasis).toBe('CURRENT_SESSION');
  });
});

describe('the after-hours board is not the day’s board (requirements 10, 11, 12)', () => {
  it('drops a massive RTH leader that does not trade after the close', () => {
    const engine = engineThroughTheClose([
      // 40x a normal day, and then silence.
      { symbol: 'DAYKING', average: 1_000_000, rthVolume: 40_000_000, close: 4 },
      // Ordinary day, busy evening.
      { symbol: 'EVENING', average: 1_000_000, rthVolume: 500_000, close: 4 },
    ]);

    engine.ingest(bar('EVENING', at(16, 20), { c: 5.2, v: 600_000 }));
    engine.recompute();

    const dayKing = engine.getDemandState('DAYKING');
    const evening = engine.getDemandState('EVENING');

    // Daily RVOL still says what it always said.
    expect(dayKing?.rvolRank).toBe(1);
    expect(dayKing?.rvol).toBeCloseTo(40, 10);

    // The after-hours board says something else entirely: the day's leader is
    // not ranked on it at all, and its silence is recorded as a fact rather
    // than as missing data.
    expect(evening?.afterHours.rank).toBe(1);
    expect(dayKing?.afterHours.rank).toBeNull();
    expect(dayKing?.afterHours.volume).toBe(0);
    expect(dayKing?.afterHours.participation).toBe(0);
    expect(dayKing?.afterHours.coverage).toBe('COMPLETE');
  });

  it('lets a name that was irrelevant all day enter the AH Top N immediately', () => {
    const engine = engineThroughTheClose([
      { symbol: 'DAYKING', average: 1_000_000, rthVolume: 40_000_000, close: 4 },
      { symbol: 'NOBODY', average: 200_000, rthVolume: 1_000, close: 3 },
    ]);

    engine.recompute();
    expect(engine.getDemandState('NOBODY')?.afterHours.enteredTopNAt).toBeNull();

    clock = Date.parse(at(17, 0));
    engine.ingest(bar('NOBODY', at(17, 0), { c: 4.5, v: 400_000 }));
    const result = engine.recompute();

    const state = engine.getDemandState('NOBODY');
    expect(state?.afterHours.rank).toBe(1);
    expect(state?.afterHours.participation).toBeCloseTo(2, 10);
    expect(state?.afterHours.enteredTopNAt).toBe(new Date(clock).toISOString());
    expect(state?.afterHours.enteredRank).toBe(1);
    expect(result.events.some((event) => event.type === 'AH_RANK_ENTRY')).toBe(true);
  });

  it('measures AH board entry separately from the daytime entry stamp', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['BOTH', baseline('BOTH', 1_000_000)]]));
    engine.track('BOTH');

    // Enters the daytime Top 12 in the morning.
    clock = Date.parse(at(10, 0));
    engine.ingest(bar('BOTH', at(10, 0), { c: 4, v: 3_000_000 }));
    engine.recompute();
    const daytimeEntry = engine.getDemandState('BOTH')?.top12EnteredAt;
    expect(daytimeEntry).toBe(new Date(Date.parse(at(10, 0))).toISOString());

    // Enters the after-hours board hours later.
    clock = Date.parse(at(16, 0));
    engine.setRthClosed(true, { observed: true });
    engine.setTodayRthClose('BOTH', {
      close: 4,
      date: TRADING_DATE,
      source: 'alpaca-daily-bar-rth-close',
    });
    clock = Date.parse(at(17, 10));
    engine.ingest(bar('BOTH', at(17, 10), { c: 4.4, v: 100_000 }));
    engine.recompute();

    const state = engine.getDemandState('BOTH');
    // The daytime stamp is untouched — the existing metric still means what it
    // meant — and the evening's latency is measured from its own entry.
    expect(state?.top12EnteredAt).toBe(daytimeEntry);
    expect(state?.afterHours.enteredTopNAt).toBe(new Date(Date.parse(at(17, 10))).toISOString());
    expect(state?.afterHours.enteredTopNAt).not.toBe(state?.top12EnteredAt);
  });
});

describe('after-hours retention (requirements 13, 14)', () => {
  it('retains a name that qualified in the band and then ran above $20', () => {
    const engine = engineThroughTheClose([
      { symbol: 'RUNNER', average: 100_000, rthVolume: 50_000, close: 18 },
    ]);

    // Qualifies inside $1–$20 on real after-hours participation.
    clock = Date.parse(at(16, 30));
    engine.ingest(bar('RUNNER', at(16, 30), { c: 19.5, v: 200_000 }));
    engine.recompute();

    const qualified = engine.getDemandState('RUNNER');
    expect(qualified?.afterHours.latched).toBe(true);
    expect(qualified?.afterHours.qualificationPrice).toBe(19.5);
    expect(qualified?.afterHours.rank).toBe(1);

    // Runs through the ceiling; it stays on the board for this AH session.
    clock = Date.parse(at(17, 0));
    engine.ingest(bar('RUNNER', at(17, 0), { c: 26, v: 100_000 }));
    engine.recompute();

    expect(engine.getDemandState('RUNNER')?.afterHours.rank).toBe(1);
  });

  it('keeps AH qualification independent of the daytime latch', () => {
    const engine = engineThroughTheClose([
      // Qualified during the day, silent after the close.
      { symbol: 'DAYONLY', average: 1_000_000, rthVolume: 8_000_000, close: 4 },
    ]);
    engine.recompute();

    const state = engine.getDemandState('DAYONLY');
    // Latched for the DAY — it qualified inside the band on the daytime board.
    expect(state?.latched).toBe(true);
    // And that says nothing at all about the evening.
    expect(state?.afterHours.latched).toBe(false);
    expect(state?.afterHours.qualifiedAt).toBeNull();
    expect(state?.afterHours.rank).toBeNull();

    // Trading after the close is what qualifies it for the evening.
    clock = Date.parse(at(16, 45));
    engine.ingest(bar('DAYONLY', at(16, 45), { c: 4.2, v: 300_000 }));
    engine.recompute();

    expect(engine.getDemandState('DAYONLY')?.afterHours.latched).toBe(true);
  });
});

describe('unknown after-hours coverage stays unknown', () => {
  it('does not rank a symbol whose after-hours window was never observed', () => {
    // A desk that started at 17:30: it did not watch the bell.
    clock = Date.parse(at(17, 30));
    const engine = createEngine();
    engine.setRthClosed(true, { observed: false });
    engine.setBaselines(new Map([['LATE', baseline('LATE', 1_000_000)]]));
    engine.track('LATE');
    engine.setTodayRthClose('LATE', {
      close: 4,
      date: TRADING_DATE,
      source: 'alpaca-daily-bar-rth-close',
    });
    engine.ingest(bar('LATE', at(17, 40), { c: 4.2, v: 50_000 }));
    engine.recompute();

    const state = engine.getDemandState('LATE');
    expect(state?.afterHours.coverage).toBe('PARTIAL');
    expect(state?.afterHours.volume).toBeNull();
    expect(state?.afterHours.participation).toBeNull();
    expect(state?.afterHours.rank).toBeNull();

    // Reconstructing the missing window makes it rankable, and the live minute
    // that arrived after the seed is still counted exactly once.
    engine.seedAfterHours('LATE', {
      volume: 900_000,
      through: at(17, 35),
      source: 'test-reconstruction',
    });
    engine.recompute();

    const covered = engine.getDemandState('LATE');
    expect(covered?.afterHours.coverage).toBe('COMPLETE');
    expect(covered?.afterHours.volume).toBe(950_000);
    expect(covered?.afterHours.participation).toBeCloseTo(0.95, 10);
    expect(covered?.afterHours.rank).toBe(1);
  });

  it('recovers the regular session’s volume once the evening’s is known', () => {
    clock = Date.parse(at(18, 0));
    const engine = createEngine();
    engine.setRthClosed(true, { observed: false });
    engine.setBaselines(new Map([['REBUILT', baseline('REBUILT', 1_000_000)]]));
    engine.track('REBUILT');

    // A snapshot supplies the whole day in one number, evening included, plus
    // the official close.
    engine.seedSession('REBUILT', {
      volumeBase: 7_000_000,
      volumeBaseThrough: at(18, 0),
      volumeBaseSource: 'test-snapshot',
      todayRthClose: {
        close: 4.5,
        date: TRADING_DATE,
        source: 'alpaca-daily-bar-rth-close',
      },
    });
    engine.seedAfterHours('REBUILT', {
      volume: 2_000_000,
      through: at(18, 0),
      source: 'test-reconstruction',
    });
    engine.recompute();

    const state = engine.getDemandState('REBUILT');
    expect(state?.cumulativeVolume).toBe(7_000_000);
    expect(state?.afterHours.volume).toBe(2_000_000);
    // The bell's volume is the difference, not a guess and not the day total.
    expect(state?.rthFinal?.volume).toBe(5_000_000);
    // The official close IS recoverable, so the day's record carries it.
    expect(state?.rthFinal?.close).toBe(4.5);
    // What genuinely cannot be recovered stays null.
    expect(state?.rthFinal?.high).toBeNull();
  });
});
