import { describe, expect, it } from 'vitest';

import {
  clusterMarks,
  computeResistanceLevels,
  FIFTEEN_MIN_MS,
  FIVE_MIN_MS,
  rollUp,
  twelveMonthsBefore,
  walkLadder,
  type LevelsDailyBar,
  type LevelsInput,
  type LevelsMinuteBar,
  type Mark,
} from '@/lib/market/levels';

/*
 * The pure computation, on hand-made bars. 2026-09-29 is EDT, so 04:00 ET is
 * 08:00Z and 20:00 ET is 00:00Z the next day.
 */
const TODAY = '2026-09-29';
const ms = (iso: string) => Date.parse(iso);

function bar(tradingDate: string, ts: string, high: number, close = high, open = close): LevelsMinuteBar {
  return { tradingDate, ts, open, high, close };
}

function daily(tradingDate: string, high: number, splitFactor: number | null = 1, close = high): LevelsDailyBar {
  return { tradingDate, high, close, splitFactor };
}

function input(partial: Partial<LevelsInput>): LevelsInput {
  return {
    symbol: 'TEST',
    t: ms(`${TODAY}T16:00:00.000Z`),
    tradingDate: TODAY,
    todayBars: [],
    priorBars: [],
    dailyBars: [],
    ...partial,
  };
}

/** Today's 1m bars, one per 5m bucket from 14:00Z, with the given highs, then a last bar setting L. */
function todayLadder(highs: number[], last: number): LevelsMinuteBar[] {
  const bars = highs.map((high, i) =>
    bar(TODAY, new Date(ms(`${TODAY}T14:00:00.000Z`) + i * FIVE_MIN_MS).toISOString(), high),
  );
  bars.push(bar(TODAY, new Date(ms(`${TODAY}T14:00:00.000Z`) + highs.length * FIVE_MIN_MS).toISOString(), last));
  return bars;
}

describe('rollup keying (spec section 3)', () => {
  it('keys each candle by its bucket START in UTC, floor(ts / bucket) * bucket', () => {
    const bars = [
      bar(TODAY, `${TODAY}T14:30:00.000Z`, 1.0),
      bar(TODAY, `${TODAY}T14:34:00.000Z`, 1.2, 1.1),
      bar(TODAY, `${TODAY}T14:35:00.000Z`, 1.05),
      bar(TODAY, `${TODAY}T14:44:00.000Z`, 1.3),
      bar(TODAY, `${TODAY}T14:45:00.000Z`, 0.9),
    ];
    const t = ms(`${TODAY}T15:00:00.000Z`);

    const five = rollUp(bars, FIVE_MIN_MS, t);
    expect(five.map((c) => new Date(c.start).toISOString())).toEqual([
      `${TODAY}T14:30:00.000Z`,
      `${TODAY}T14:35:00.000Z`,
      `${TODAY}T14:40:00.000Z`,
      `${TODAY}T14:45:00.000Z`,
    ]);
    expect(five[0]).toMatchObject({ high: 1.2, close: 1.1, end: ms(`${TODAY}T14:35:00.000Z`) });

    const fifteen = rollUp(bars, FIFTEEN_MIN_MS, t);
    // 14:44 belongs to the bucket STARTING 14:30, not to the one ending 14:45.
    expect(fifteen.map((c) => [new Date(c.start).toISOString(), c.high])).toEqual([
      [`${TODAY}T14:30:00.000Z`, 1.3],
      [`${TODAY}T14:45:00.000Z`, 0.9],
    ]);
  });

  it('keeps completed buckets only: a bucket whose end is after t is still forming', () => {
    const bars = [bar(TODAY, `${TODAY}T14:30:00.000Z`, 1), bar(TODAY, `${TODAY}T14:35:00.000Z`, 2)];
    expect(rollUp(bars, FIVE_MIN_MS, ms(`${TODAY}T14:39:59.999Z`))).toHaveLength(1);
    expect(rollUp(bars, FIVE_MIN_MS, ms(`${TODAY}T14:40:00.000Z`))).toHaveLength(2);
    expect(rollUp(bars, FIVE_MIN_MS, ms(`${TODAY}T14:34:59.999Z`))).toHaveLength(0);
  });

  it('drops bars outside the 04:00-20:00 ET session', () => {
    const bars = [
      bar(TODAY, `${TODAY}T07:59:00.000Z`, 9), // 03:59 ET
      bar(TODAY, `${TODAY}T08:00:00.000Z`, 1), // 04:00 ET
      bar(TODAY, `${TODAY}T23:59:00.000Z`, 2), // 19:59 ET
      bar(TODAY, '2026-09-30T00:00:00.000Z', 9), // 20:00 ET
    ];
    const candles = rollUp(bars, FIVE_MIN_MS, ms('2026-09-30T02:00:00.000Z'));
    expect(candles.map((c) => c.high)).toEqual([1, 2]);
  });
});

describe('the left-and-up ladder', () => {
  const candles = (highs: number[]) => highs.map((high) => ({ high }));

  it('starts at the newest candle with high >= L, then takes each earlier higher top', () => {
    // Oldest to newest. Newest 2.0 is below L; 3.5 starts the ladder.
    const marks = walkLadder(candles([5, 3, 4, 2.5, 3.5, 2]), 2.2);
    expect(marks.map((c) => c.high)).toEqual([3.5, 4, 5]);
  });

  it('keeps only marks strictly above L (a first mark AT L starts the ladder but is not kept)', () => {
    expect(walkLadder(candles([5, 3, 4, 2.5, 3.5, 2]), 3.5).map((c) => c.high)).toEqual([4, 5]);
  });

  it('a lower top to the left of a higher one is not a mark within one window', () => {
    expect(walkLadder(candles([3, 4, 2]), 1).map((c) => c.high)).toEqual([2, 4]);
    expect(walkLadder(candles([1, 1.5]), 2)).toEqual([]);
  });

  it('an earlier top EQUAL to the last mark is not a new mark (strictly greater)', () => {
    expect(walkLadder(candles([3, 3, 2, 3]), 1).map((c) => c.high)).toEqual([3]);
  });

  it('runs one ladder PER WINDOW, so a higher recent top does not hide an older lower one', () => {
    // Today's 5m top 3.0 is above yesterday's 15m top 2.6; both are kept.
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([3.0], 2.0),
        priorBars: [bar('2026-09-28', '2026-09-28T14:00:00.000Z', 2.6, 2.1)],
      }),
    )!;
    expect(row.price).toBe(2.0);
    expect(row.levels.map((l) => [l.price, l.timeframes])).toEqual([
      [2.6, ['15m']],
      [3.0, ['5m']],
    ]);
  });

  it('takes L as the latest 1m close whose bar has ENDED by t', () => {
    const bars = [
      bar(TODAY, `${TODAY}T14:37:00.000Z`, 1.1, 1.05),
      bar(TODAY, `${TODAY}T14:38:00.000Z`, 1.2, 1.15),
    ];
    const at = (iso: string) => computeResistanceLevels(input({ todayBars: bars, t: ms(iso) }))!.price;
    expect(at(`${TODAY}T14:38:59.000Z`)).toBe(1.05);
    expect(at(`${TODAY}T14:39:00.000Z`)).toBe(1.15);
  });

  it('stamps computedAt with the 5m close at or before t', () => {
    const row = computeResistanceLevels(input({ todayBars: todayLadder([2], 1), t: ms(`${TODAY}T16:03:10.000Z`) }))!;
    expect(row.computedAt).toBe(`${TODAY}T16:00:00.000Z`);
    expect(row.tradingDate).toBe(TODAY);
  });
});

describe('clustering (single linkage, W = 0.5% x L)', () => {
  const mark = (price: number, end: string, timeframe: Mark['timeframe']): Mark => ({
    price,
    end: ms(end),
    timeframe,
    beyondHorizon: false,
  });

  it('chains neighbours within W and places the level at the middle of the chain', () => {
    const levels = clusterMarks(
      [
        mark(1.009, '2026-09-28T15:00:00.000Z', '15m'),
        mark(1.0, `${TODAY}T15:05:00.000Z`, '5m'),
        mark(1.03, '2026-08-01T00:00:00.000Z', 'daily'),
        mark(1.004, '2026-08-02T00:00:00.000Z', 'daily'),
      ],
      0.005,
    );
    expect(levels).toHaveLength(2);
    expect(levels[0]).toEqual({
      price: (1.0 + 1.009) / 2,
      low: 1.0,
      high: 1.009,
      timeframes: ['daily', '15m', '5m'],
      tops: 3,
      newestTopEnd: `${TODAY}T15:05:00.000Z`,
      oldestTopEnd: '2026-08-02T00:00:00.000Z',
    });
    expect(levels[1]).toMatchObject({ price: 1.03, low: 1.03, high: 1.03, tops: 1, timeframes: ['daily'] });
  });

  it('splits a chain when one gap exceeds W', () => {
    const levels = clusterMarks(
      [mark(1.0, `${TODAY}T15:00:00.000Z`, '5m'), mark(1.0051, `${TODAY}T15:00:00.000Z`, '5m')],
      0.005,
    );
    expect(levels.map((l) => l.price)).toEqual([1.0, 1.0051]);
  });

  it('uses W = 0.5% of L in the full computation, and returns every level ascending', () => {
    // L = 2.0, so W = 0.01: 2.50 and 2.51 merge, 2.53 does not.
    const row = computeResistanceLevels(input({ todayBars: todayLadder([2.53, 2.51, 2.5], 2.0) }))!;
    expect(row.levels.map((l) => [Number(l.price.toFixed(4)), l.tops])).toEqual([
      [2.505, 2],
      [2.53, 1],
    ]);
  });
});

describe('absent vs empty (spec section 2, section 6 item 4)', () => {
  it('ABSENT: nothing to take L from returns no row at all', () => {
    expect(computeResistanceLevels(input({}))).toBeNull();
    expect(computeResistanceLevels(input({ dailyBars: [daily('2026-09-01', 5)] }))).toBeNull();
  });

  it('EMPTY: a computed name with nothing above has levels [] and aboveAllStored', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([1.5, 1.8], 2.0),
        priorBars: [bar('2026-09-28', '2026-09-28T14:00:00.000Z', 1.9, 1.7)],
        dailyBars: [daily('2026-09-01', 1.95), daily('2020-01-02', 1.99)],
      }),
    );
    expect(row).not.toBeNull();
    expect(row!.levels).toEqual([]);
    expect(row!.aboveAllStored).toBe(true);
    expect(row!.basisBreak).toBeUndefined();
  });

  it('a row with levels does not carry aboveAllStored', () => {
    const row = computeResistanceLevels(input({ todayBars: todayLadder([3], 2) }))!;
    expect(row.levels).toHaveLength(1);
    expect('aboveAllStored' in row).toBe(false);
  });
});

describe('basisBreak (spec section 6): refuse, never mix', () => {
  const prior = (closes: Array<[string, number]>, high = 10) =>
    closes.map(([date, close]) => bar(date, `${date}T14:00:00.000Z`, high, close));

  it('trigger 1: split_factor changes inside the 15m window, so only today 5m is walked', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([3], 2),
        priorBars: prior([
          ['2026-09-25', 2.1],
          ['2026-09-28', 2.2],
        ]),
        dailyBars: [daily('2026-09-25', 10, 2), daily('2026-09-28', 10, 1), daily('2026-09-01', 8, 2)],
      }),
    )!;
    expect(row.basisBreak).toBe(true);
    expect(row.levels.map((l) => [l.price, l.timeframes])).toEqual([[3, ['5m']]]);
    expect(row.horizon.fifteenMinFrom).toBeNull();
    expect(row.horizon.dailyFrom).toBeNull();
  });

  it('trigger 2: consecutive stored session closes at a ratio >= 3 or <= 1/3', () => {
    const run = (closes: Array<[string, number]>) =>
      computeResistanceLevels(input({ todayBars: todayLadder([], 2), priorBars: prior(closes) }))!;

    const up = run([
      ['2026-09-24', 1.0],
      ['2026-09-25', 3.0],
    ]);
    expect(up.basisBreak).toBe(true);
    expect(up.levels).toEqual([]);
    // "At any depth" was not examined, so an empty basis-break row is not aboveAllStored.
    expect(up.aboveAllStored).toBeUndefined();

    expect(
      run([
        ['2026-09-24', 3.0],
        ['2026-09-25', 1.0],
      ]).basisBreak,
    ).toBe(true);

    const control = run([
      ['2026-09-24', 1.0],
      ['2026-09-25', 2.9],
      ['2026-09-28', 1.0],
    ]);
    expect(control.basisBreak).toBeUndefined();
    expect(control.levels.map((l) => [l.price, l.timeframes])).toEqual([[10, ['15m']]]);
  });

  it('null factors in the window and a factor change OLDER than it do not break', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([], 2),
        priorBars: prior([
          ['2026-09-25', 2.1],
          ['2026-09-28', 2.2],
        ]),
        dailyBars: [daily('2026-09-25', 10, null), daily('2026-09-28', 10, 1), daily('2026-07-01', 8, 8)],
      }),
    )!;
    expect(row.basisBreak).toBeUndefined();
  });
});

describe('basisBreak: a split taking effect TODAY (section 3 tripwire)', () => {
  /** Today's bars from 13:30Z, one per 5m bucket: [open, high] pairs, then the last bar sets L. */
  const todayOpens = (pairs: Array<[number, number]>, last: number, lastOpen = last) => {
    const bars = pairs.map(([open, high], i) =>
      bar(TODAY, new Date(ms(`${TODAY}T13:30:00.000Z`) + i * FIVE_MIN_MS).toISOString(), high, high, open),
    );
    const lastTs = new Date(ms(`${TODAY}T13:30:00.000Z`) + pairs.length * FIVE_MIN_MS).toISOString();
    bars.push(bar(TODAY, lastTs, Math.max(last, lastOpen), last, lastOpen));
    return bars;
  };
  const priorSession = (date: string, high: number, close: number) =>
    bar(date, `${date}T19:00:00.000Z`, high, close);

  it('a 1-for-10 reverse split today (open 10x the prior close) sets basisBreak and walks only 5m', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayOpens([[10, 11]], 10.2),
        // Pre-split raw 1.5 is 15 on today's basis; walked, it would be a wrong level.
        priorBars: [priorSession('2026-09-28', 15, 1.0)],
        dailyBars: [daily('2026-09-01', 20, 1)],
      }),
    )!;
    expect(row.basisBreak).toBe(true);
    expect(row.levels.map((l) => [l.price, l.timeframes])).toEqual([[11, ['5m']]]);
    expect(row.horizon.fifteenMinFrom).toBeNull();
    expect(row.horizon.dailyFrom).toBeNull();
  });

  it('a +250% gap with NO split (ratio 3.5) also sets it: the tripwire accepted false positive', () => {
    const row = computeResistanceLevels(
      input({ todayBars: todayOpens([[3.5, 3.6]], 3.4), priorBars: [priorSession('2026-09-28', 5, 1.0)] }),
    )!;
    expect(row.basisBreak).toBe(true);
  });

  it('a +150% gap (ratio 2.5) does not; the FIRST open and the MOST RECENT prior close are the ones compared', () => {
    const row = computeResistanceLevels(
      input({
        // Later bars open at 3.6: only the first open counts.
        todayBars: todayOpens(
          [
            [2.5, 2.6],
            [3.6, 3.7],
          ],
          2.4,
          3.6,
        ),
        // An older session closed at 0.5 (2.5 / 0.5 = 5): only the latest close counts.
        priorBars: [priorSession('2026-09-25', 4.5, 0.5), priorSession('2026-09-28', 4, 1.0)],
      }),
    )!;
    expect(row.basisBreak).toBeUndefined();
    expect(row.levels.some((l) => l.timeframes.includes('15m'))).toBe(true);
  });

  it('the boundaries: exactly 3 and exactly 1/3 set it, as does a drop to 0.3', () => {
    const run = (open: number, priorClose: number) =>
      computeResistanceLevels(
        input({ todayBars: todayOpens([[open, open]], open), priorBars: [priorSession('2026-09-28', 50, priorClose)] }),
      )!.basisBreak;
    expect(run(3, 1)).toBe(true);
    expect(run(1, 3)).toBe(true);
    expect(run(0.3, 1)).toBe(true);
    expect(run(2.99, 1)).toBeUndefined();
  });

  it('a split_factor on the most recent daily row that differs from the 15m window dates sets it', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayOpens([[2, 2.1]], 2),
        priorBars: [priorSession('2026-09-25', 5, 2.0), priorSession('2026-09-28', 5, 2.0)],
        dailyBars: [daily('2026-09-25', 5, 1), daily('2026-09-28', 5, 1), daily(TODAY, 5, 10)],
      }),
    )!;
    expect(row.basisBreak).toBe(true);
  });
});

describe('the daily window (spec section 6 interim, section 1 far-back extension)', () => {
  it('refuses daily rows with a null split_factor: not walked, dailyFrom null', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([], 2),
        dailyBars: [daily('2026-09-01', 5, null), daily('2026-08-01', 6, null), daily('2024-01-02', 7, null)],
      }),
    )!;
    expect(row.levels).toEqual([]);
    expect(row.horizon.dailyFrom).toBeNull();
  });

  it('walks only the established rows when some are null', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([], 2),
        dailyBars: [daily('2026-09-01', 5, null), daily('2026-08-03', 4, 1)],
      }),
    )!;
    expect(row.levels.map((l) => l.price)).toEqual([4]);
    expect(row.horizon.dailyFrom).toBe('2026-08-03T08:00:00.000Z');
  });

  it('begins where the stored 15m data ends: a daily row inside the 15m span is not walked as daily', () => {
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([], 2),
        priorBars: [bar('2026-09-25', '2026-09-25T14:00:00.000Z', 2.5, 2.1)],
        dailyBars: [daily('2026-09-28', 50), daily('2026-09-25', 40), daily('2026-09-24', 3)],
      }),
    )!;
    expect(row.levels.map((l) => [l.price, l.timeframes])).toEqual([
      [2.5, ['15m']],
      [3, ['daily']],
    ]);
    expect(row.horizon.fifteenMinFrom).toBe('2026-09-25T14:00:00.000Z');
  });

  it('far back: only when the daily window has no mark, takes only the FIRST daily high > L beyond 12 months', () => {
    expect(twelveMonthsBefore(TODAY)).toBe('2025-09-29');
    const row = computeResistanceLevels(
      input({
        todayBars: todayLadder([], 5),
        dailyBars: [
          daily('2026-06-01', 4.5),
          daily('2025-09-29', 4.9), // inside 12 months (the horizon day itself)
          daily('2025-09-26', 4.0), // beyond, below L
          daily('2025-06-02', 7),
          daily('2024-06-03', 9),
        ],
      }),
    )!;
    expect(row.levels).toHaveLength(1);
    expect(row.levels[0]).toMatchObject({ price: 7, timeframes: ['daily'], beyondHorizon: true });
    expect(row.levels[0]!.newestTopEnd).toBe('2025-06-03T00:00:00.000Z'); // 20:00 ET 06-02
    expect(row.horizon.dailyFrom).toBe('2025-06-02T08:00:00.000Z');
    expect(row.aboveAllStored).toBeUndefined();
  });

  it('does not extend when the daily window has a mark', () => {
    const row = computeResistanceLevels(
      input({ todayBars: todayLadder([], 5), dailyBars: [daily('2026-06-01', 6), daily('2024-06-03', 9)] }),
    )!;
    expect(row.levels.map((l) => [l.price, l.beyondHorizon])).toEqual([[6, undefined]]);
    expect(row.horizon.dailyFrom).toBe('2026-06-01T08:00:00.000Z');
  });

  it('aboveAllStored when no stored high at any depth is above L', () => {
    const row = computeResistanceLevels(
      input({ todayBars: todayLadder([], 10), dailyBars: [daily('2026-06-01', 6), daily('2020-06-01', 9)] }),
    )!;
    expect(row.levels).toEqual([]);
    expect(row.aboveAllStored).toBe(true);
    expect(row.horizon.dailyFrom).toBe('2020-06-01T08:00:00.000Z');
  });
});
