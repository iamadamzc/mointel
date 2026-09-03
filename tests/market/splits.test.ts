import { describe, expect, it } from 'vitest';

import {
  deriveSplitFactors,
  splitFactorAt,
  splitsBetween,
  type SplitEvent,
} from '@/lib/market/splits';

/**
 * Splits recovered from price data alone.
 *
 * The numbers in the first test are BTCT's real ones, probed on 2026-08-24.
 * They matter because the whole deep-history design rests on this working: a
 * ten-year split-adjusted ceiling is $14,249.94 on a bar that traded four
 * shares, and the factor is what tells a reader that number sits behind two
 * consolidations rather than being a level anyone might defend.
 */

/** Builds the two close series a real fetch returns, from a factor schedule. */
function series(schedule: Array<{ date: string; raw: number; factor: number }>) {
  const adjusted = new Map<string, number>();
  const raw = new Map<string, number>();
  for (const row of schedule) {
    raw.set(row.date, row.raw);
    adjusted.set(row.date, row.raw * row.factor);
  }
  return { adjusted, raw };
}

/** N sessions on one basis, dates ascending from a counter. */
function level(from: number, count: number, raw: number, factor: number) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-01-${String(from + i).padStart(2, '0')}`,
    raw,
    factor,
  }));
}

describe('deriveSplitFactors', () => {
  it("recovers BTCT's two reverse splits and reconciles them", () => {
    /*
     * Probed: factor 600 before 2022-05-06, 20 after; 20 before 2023-08-24, 1
     * after. So 1-for-30 then 1-for-20, and 30 x 20 = 600 is the whole history.
     */
    const schedule = [
      ...level(1, 5, 1.5, 600),
      ...level(6, 5, 45, 20),
      ...level(11, 5, 900, 1),
    ];
    const { events, factors } = deriveSplitFactors(...Object.values(series(schedule)) as [Map<string, number>, Map<string, number>]);

    expect(events).toHaveLength(2);
    expect(events[0]!.ratio).toBeCloseTo(30);
    expect(events[1]!.ratio).toBeCloseTo(20);
    // The reconciliation that proves the chain rather than the steps.
    expect(events[0]!.factorBefore).toBeCloseTo(events[0]!.ratio * events[1]!.ratio);
    expect(factors.get('2026-01-15')).toBeCloseTo(1);
  });

  it('finds nothing in a series that never split', () => {
    const { adjusted, raw } = series(level(1, 20, 3.25, 1));

    expect(deriveSplitFactors(adjusted, raw).events).toEqual([]);
  });

  it('ignores a one-session rounding artefact', () => {
    /*
     * The reason a bare tolerance is not enough. Alpaca reports raw closes to
     * four decimals, so a stock near a cent carries several percent of implied
     * error in a single bar -- far more than any tolerance below a real split.
     * A split changes the basis permanently; rounding changes it for one bar.
     *
     * The first version of this test was VACUOUS: the artefact I built deviated
     * 4.8% against a 5% tolerance, so it never reached the confirmation logic
     * it exists to exercise, and the comment claiming otherwise was wrong.
     * The deviation is asserted below rather than assumed.
     */
    const { adjusted, raw } = series([...level(1, 6, 0.01, 10), ...level(7, 8, 0.01, 10)]);
    adjusted.set('2026-01-07', 0.012);

    const deviation = Math.abs(0.012 / 0.01 / 10 - 1);
    expect(deviation).toBeGreaterThan(0.05);

    expect(deriveSplitFactors(adjusted, raw).events).toEqual([]);
  });

  it('believes the same magnitude of move when it PERSISTS', () => {
    // The other half, and without it the test above passes for a rule that
    // simply never fires. Same 20% step, held instead of reverted.
    const { adjusted, raw } = series([...level(1, 6, 0.01, 10), ...level(7, 8, 0.01, 12)]);

    const events = deriveSplitFactors(adjusted, raw).events;

    expect(events).toHaveLength(1);
    expect(events[0]!.tradingDate).toBe('2026-01-07');
  });

  it('believes a step that holds, even one session before the series ends', () => {
    // A split on the last few sessions is real and unconfirmable. Reporting it
    // is the safe direction: missing it would leave two bases looking alike.
    const schedule = [...level(1, 10, 2, 5), ...level(11, 1, 10, 1)];
    const { adjusted, raw } = series(schedule);

    expect(deriveSplitFactors(adjusted, raw).events).toHaveLength(1);
  });

  it('skips dates present in only one series rather than guessing', () => {
    const { adjusted, raw } = series(level(1, 5, 2, 4));
    adjusted.set('2026-01-09', 99);

    const { factors } = deriveSplitFactors(adjusted, raw);

    expect(factors.has('2026-01-09')).toBe(false);
  });

  it('skips a zero raw close rather than dividing by it', () => {
    const { adjusted, raw } = series(level(1, 5, 2, 4));
    raw.set('2026-01-03', 0);

    const { factors } = deriveSplitFactors(adjusted, raw);

    expect(factors.has('2026-01-03')).toBe(false);
    expect(factors.size).toBe(4);
  });

  it('returns an empty derivation rather than throwing on no overlap', () => {
    expect(deriveSplitFactors(new Map(), new Map())).toEqual({ factors: new Map(), events: [] });
  });
});

describe('splitFactorAt', () => {
  const factors = new Map([
    ['2026-01-05', 20],
    ['2026-01-10', 1],
  ]);

  it('reads an exact session', () => {
    expect(splitFactorAt(factors, '2026-01-05')).toBe(20);
  });

  it('falls back to the last session on that basis', () => {
    // A factor is a property of the BASIS, not of the bar: a date with no bar
    // sits on whatever basis the last traded session did.
    expect(splitFactorAt(factors, '2026-01-07')).toBe(20);
  });

  it('is null before the series begins, rather than assuming 1', () => {
    // Assuming 1 would silently claim "no adjustment pending" about a period
    // the data cannot speak for, which is the opposite of what it means.
    expect(splitFactorAt(factors, '2025-12-31')).toBeNull();
  });
});

describe('splitsBetween', () => {
  const events: SplitEvent[] = [
    { tradingDate: '2022-05-06', ratio: 30, factorBefore: 600, factorAfter: 20 },
    { tradingDate: '2023-08-24', ratio: 20, factorBefore: 20, factorAfter: 1 },
  ];

  it('names what stands between a ceiling and today', () => {
    // BTCT's real shape: a 2020 ceiling sits behind both consolidations.
    expect(splitsBetween(events, '2020-03-31', '2026-08-24')).toHaveLength(2);
  });

  it('excludes a split on the ceiling date itself, which is already its basis', () => {
    expect(splitsBetween(events, '2023-08-24', '2026-08-24')).toHaveLength(0);
  });
});

describe('events cannot exist without a basis — the SVRN claim, asserted', () => {
  /*
   * Added 2026-09-03. On the live desk SVRN logged "(no split basis
   * established)" while reporting FOUR split events, and Ops asked whether the
   * deep fetch was running and buying less than it appeared to.
   *
   * The answer was that the log prints the fetch's PRECONDITION, and it rested
   * on a structural claim about this function: `events` are derived FROM
   * `factors`, so a symbol reporting splits has a populated series by
   * construction. That claim was defended by READING the code and telling
   * another thread to trust the reading.
   *
   * This desk's own rule is that a claim of the form "X already handles this"
   * is a claim about code, and the cheapest test of it is to write the
   * assertion and watch it go red. So it is written here rather than left as
   * an argument, because the argument is load-bearing for a verification that
   * has already been reported as passing.
   */

  it('populates a factor for every usable session whenever it reports an event', () => {
    // SVRN's shape, reduced: four consolidations across a long history.
    const schedule = [
      ...level(1, 4, 0.5, 240),
      ...level(5, 4, 0.5, 24),
      ...level(9, 4, 0.5, 8),
      ...level(13, 4, 0.5, 2),
      ...level(17, 4, 0.5, 1),
    ];
    const { adjusted, raw } = series(schedule);

    const { factors, events } = deriveSplitFactors(adjusted, raw);

    expect(events).toHaveLength(4);
    // The claim itself: every session carries a factor, none left null.
    expect(factors.size).toBe(schedule.length);
    for (const row of schedule) {
      expect(factors.get(row.date)).toBeCloseTo(row.factor);
    }
  });

  it('populates the same full series when it reports NO events', () => {
    /*
     * The other half, and the one that makes CURR and KRSP unremarkable:
     * factors are set per date independently of events, so a symbol that never
     * split still establishes a basis. ZERO EVENTS IS NOT ZERO BASIS — the
     * inference the log line invited.
     */
    const schedule = level(1, 12, 3.25, 1);
    const { adjusted, raw } = series(schedule);

    const { factors, events } = deriveSplitFactors(adjusted, raw);

    expect(events).toHaveLength(0);
    expect(factors.size).toBe(12);
  });

  it('establishes nothing when no session has a usable raw close', () => {
    /*
     * The genuinely underivable case, which is why the worker asks the STORE
     * what was established rather than inferring it from a successful fetch.
     * Bars come back, and nothing is learned.
     *
     * AND THIS IS WHAT MAKES THE TWO ABOVE NON-VACUOUS. They assert
     * `factors.size` equals the session count; that only means something if an
     * empty map is reachable, and here it is. This file has shipped a vacuous
     * test before — the rounding-artefact one that never reached the
     * confirmation logic — so the demonstration belongs beside the tests it
     * protects rather than in a commit message.
     */
    const adjusted = new Map([
      ['2026-01-01', 4],
      ['2026-01-02', 4],
    ]);
    const raw = new Map([
      ['2026-01-01', 0],
      ['2026-01-02', 0],
    ]);

    const { factors, events } = deriveSplitFactors(adjusted, raw);

    expect(factors.size).toBe(0);
    expect(events).toHaveLength(0);
  });
});
