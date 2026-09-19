import { describe, expect, it } from 'vitest';

import {
  CYCLE_START_MOVE_PCT,
  CYCLE_START_RVOL,
  dailyRvol,
  isCycleStart,
  resolveCycle,
  resolveCycleHistory,
  todayQualifiesAsCycleStart,
  todaySoFarFromBars,
  type CycleArc,
  type CycleBar,
  type TodayMinuteBar,
  type TodaySoFar,
} from '@/lib/market/cycle';

/** Quiet sessions to sit a move on top of. */
function base(count: number, close = 1.3, volume = 1_000_000): CycleBar[] {
  return Array.from({ length: count }, (_, i) => ({
    tradingDate: `2026-06-${String(i + 1).padStart(2, '0')}`,
    high: close * 1.02,
    low: close * 0.98,
    close,
    volume,
  }));
}

function bar(tradingDate: string, close: number, high: number, volume: number): CycleBar {
  return { tradingDate, high, low: close * 0.9, close, volume };
}

function arc(result: ReturnType<typeof resolveCycle>): CycleArc {
  if (result.phase === 'NO_CYCLE') throw new Error('expected a cycle');
  return result as CycleArc;
}

describe('cycle start rule', () => {
  it('needs BOTH the move and the volume, not either', () => {
    const big = [...base(25), bar('2026-07-01', 1.3 * 1.5, 2.0, 30_000_000)];
    expect(isCycleStart(big, big.length - 1)).toBe(true);

    // 50% move, ordinary volume.
    const quiet = [...base(25), bar('2026-07-01', 1.3 * 1.5, 2.0, 1_000_000)];
    expect(isCycleStart(quiet, quiet.length - 1)).toBe(false);

    // 20x volume, 5% move.
    const dull = [...base(25), bar('2026-07-01', 1.3 * 1.05, 1.4, 20_000_000)];
    expect(isCycleStart(dull, dull.length - 1)).toBe(false);
  });

  it('measures relative volume against a median, so one huge day cannot hide the next move', () => {
    const bars = [...base(25)];
    bars.push(bar('2026-07-01', 9.0, 12.0, 67_000_000)); // the 602% day
    for (let i = 0; i < 5; i += 1) bars.push(bar(`2026-07-${10 + i}`, 2.2, 2.5, 3_000_000));

    // A mean baseline would be dragged up by the 67M day and suppress this.
    const rvol = dailyRvol(bars, bars.length - 1);
    expect(rvol).not.toBeNull();
    expect(rvol!).toBeGreaterThan(2);
  });
});

/**
 * STAK, 24 July 2026, from the production daily bars.
 *
 * The case the multi-day framing exists for: it closed +11% on 29 July, which
 * any single-session measure reads as strength, while sitting 80% below a cycle
 * high set five sessions earlier.
 */
describe('STAK', () => {
  const bars: CycleBar[] = [
    ...base(22),
    bar('2026-07-21', 1.44, 1.65, 865_000),
    bar('2026-07-22', 1.31, 1.48, 1_608_000),
    bar('2026-07-23', 1.32, 1.4296, 1_162_000),
    bar('2026-07-24', 9.27, 12.0, 67_078_000),
    bar('2026-07-27', 2.52, 5.36, 13_514_000),
    bar('2026-07-28', 2.19, 2.57, 4_942_000),
    bar('2026-07-29', 2.43, 2.7766, 8_259_000),
  ];

  it('finds the start day and the cycle high', () => {
    const result = arc(resolveCycle(bars));
    expect(result.startDate).toBe('2026-07-24');
    expect(result.cycleHigh).toBe(12.0);
    expect(result.cycleHighDate).toBe('2026-07-24');
  });

  it('calls the green day BACKSIDE, because the peak was five sessions ago', () => {
    const result = arc(resolveCycle(bars));
    // Closed +11% on the session, and none of that matters.
    expect(result.latestClose).toBe(2.43);
    expect(result.sessionsSinceHigh).toBe(3);
    expect(Math.round(result.givebackPct * 100)).toBe(80);
    expect(result.phase).toBe('BACKSIDE');
  });

  it('reads DAY_ONE on the day itself', () => {
    const result = arc(resolveCycle(bars.slice(0, -3)));
    expect(result.phase).toBe('DAY_ONE');
    expect(result.sessionsSinceHigh).toBe(0);
  });
});

describe('resolveCycle', () => {
  it('takes the most recent qualifying start, not the first', () => {
    const bars: CycleBar[] = [
      ...base(22),
      bar('2026-06-30', 4.0, 4.4, 20_000_000), // June move
      bar('2026-07-01', 3.0, 4.0, 6_000_000),
      ...Array.from({ length: 20 }, (_, i) => bar(`2026-07-${10 + i}`, 3.0, 3.1, 900_000)),
      bar('2026-08-10', 6.0, 7.0, 40_000_000), // August move
      bar('2026-08-11', 5.8, 6.2, 9_000_000),
    ];
    const result = arc(resolveCycle(bars));
    // Measuring August's giveback against June's high is the FIEE error a level up.
    expect(result.startDate).toBe('2026-08-10');
    expect(result.cycleHigh).toBe(7.0);
  });

  it('reports no cycle rather than falling back to a window high', () => {
    const result = resolveCycle(base(40));
    expect(result.phase).toBe('NO_CYCLE');
    expect(result).not.toHaveProperty('cycleHigh');
  });

  it('separates a recent pullback from a broken move', () => {
    const start = [...base(22), bar('2026-07-01', 2.6, 2.8, 30_000_000)];
    const shallow = arc(resolveCycle([...start, bar('2026-07-02', 2.5, 2.7, 8_000_000)]));
    expect(shallow.phase).toBe('PULLBACK');

    const deep = arc(resolveCycle([...start, bar('2026-07-02', 1.2, 2.7, 8_000_000)]));
    expect(deep.phase).toBe('BACKSIDE');
  });

  it('is deterministic, which is the entire point', () => {
    const bars = [...base(22), bar('2026-07-01', 2.6, 2.8, 30_000_000)];
    const runs = Array.from({ length: 25 }, () => JSON.stringify(resolveCycle(bars)));
    expect(new Set(runs).size).toBe(1);
  });

  it('exposes the desk rule as constants rather than burying it', () => {
    expect(CYCLE_START_MOVE_PCT).toBe(0.2);
    expect(CYCLE_START_RVOL).toBe(5);
  });
});

/**
 * What ends a cycle, and what a cycle is measured against.
 *
 * Both corrections came from the trader. The first is that "gave back half"
 * means half of the MOVE, not half of the high — a distinction that decides
 * whether the rule fires at all on ordinary movers. The second is that a name
 * which ran a month ago and has gone quiet is not on the backside of anything.
 */
describe('retracement and reset', () => {
  it('measures the move, not the distance below the high', () => {
    // Based at 1.00, ran to 1.20, now 1.09: just past half the move.
    const bars: CycleBar[] = [
      ...base(22, 1.0),
      bar('2026-07-01', 1.2, 1.2, 30_000_000),
      bar('2026-07-02', 1.09, 1.19, 9_000_000),
    ];
    const result = arc(resolveCycle(bars));

    expect(result.retracementPct).toBeGreaterThan(0.5);
    expect(result.phase).toBe('BACKSIDE');
    // The old rule compared 9% below the high against a 50% threshold and would
    // have called this a healthy pullback. It only ever fired on huge movers.
    expect(result.givebackPct).toBeLessThan(0.15);
  });

  it('calls a same-session collapse BACKSIDE on day one', () => {
    // AIXC: 0.7102 -> 3.14 intraday, closed 1.32. 75% of the move surrendered
    // while the cycle high is still that same session.
    const bars: CycleBar[] = [
      ...base(22, 0.7102, 400_000),
      bar('2026-08-18', 1.32, 3.14, 60_000_000),
    ];
    const result = arc(resolveCycle(bars));
    expect(result.sessionsSinceHigh).toBe(0);
    expect(Math.round(result.retracementPct * 100)).toBe(75);
    expect(result.phase).toBe('BACKSIDE');
  });

  it('moves to SHADOW when volume returns to normal', () => {
    const ran: CycleBar[] = [
      ...base(22, 1.3),
      bar('2026-07-01', 3.0, 3.4, 40_000_000),
      bar('2026-07-02', 1.6, 2.4, 12_000_000),
    ];
    expect(arc(resolveCycle(ran)).phase).toBe('BACKSIDE');

    // Same broken move, but nobody is trading it any more.
    const quiet: CycleBar[] = [
      ...ran,
      bar('2026-07-06', 1.5, 1.6, 900_000),
      bar('2026-07-07', 1.5, 1.6, 800_000),
      bar('2026-07-08', 1.5, 1.6, 700_000),
    ];
    const result = arc(resolveCycle(quiet));
    expect(result.phase).toBe('SHADOW');
    // The high still matters; that is the point of keeping the cycle at all.
    expect(result.cycleHigh).toBe(3.4);
  });

  it('does not call a two-day-old move quiet', () => {
    // A cycle cannot have gone quiet for three sessions when it is two old.
    const bars: CycleBar[] = [
      ...base(22, 1.3),
      bar('2026-07-01', 3.0, 3.4, 40_000_000),
      bar('2026-07-02', 1.5, 2.4, 500_000),
    ];
    expect(arc(resolveCycle(bars)).phase).toBe('BACKSIDE');
  });

  it('lets a fresh qualifying day start a new cycle out of the shadow', () => {
    const bars: CycleBar[] = [
      ...base(22, 1.3),
      bar('2026-07-01', 3.0, 3.4, 40_000_000),
      bar('2026-07-02', 1.6, 2.4, 12_000_000),
      ...Array.from({ length: 4 }, (_, i) => bar(`2026-07-${10 + i}`, 1.5, 1.6, 700_000)),
    ];
    expect(arc(resolveCycle(bars)).phase).toBe('SHADOW');

    const reignited = [...bars, bar('2026-07-27', 2.4, 2.6, 30_000_000)];
    const result = arc(resolveCycle(reignited));
    expect(result.phase).toBe('DAY_ONE');
    expect(result.startDate).toBe('2026-07-27');
    // The July high is behind us and must not be this cycle's high.
    expect(result.cycleHigh).toBe(2.6);
  });
});

describe('threshold edges', () => {
  it('accepts a move of exactly 20%, which binary floating point calls 19.999%', () => {
    // (1.2 - 1.0) / 1.0 === 0.19999999999999996
    const bars = [...base(22, 1.0), bar('2026-07-01', 1.2, 1.2, 30_000_000)];
    expect(isCycleStart(bars, bars.length - 1)).toBe(true);
  });

  it('still rejects a move just under the rule', () => {
    const bars = [...base(22, 1.0), bar('2026-07-01', 1.19, 1.2, 30_000_000)];
    expect(isCycleStart(bars, bars.length - 1)).toBe(false);
  });
});

describe('shadow lifetime', () => {
  function ranThenQuiet(quietSessions: number): CycleBar[] {
    const bars: CycleBar[] = [
      ...base(22, 1.3),
      bar('2026-07-01', 3.0, 3.4, 40_000_000),
      bar('2026-07-02', 1.6, 2.4, 12_000_000),
    ];
    for (let i = 0; i < quietSessions; i += 1) {
      bars.push(bar(`q${i}`, 1.5, 1.6, 700_000));
    }
    return bars;
  }

  it('keeps the shadow while the old move still predicts the next one', () => {
    // Inside ten sessions of the high, re-ignition runs well above baseline.
    expect(arc(resolveCycle(ranThenQuiet(5))).phase).toBe('SHADOW');
  });

  it('expires the cycle once the shadow stops carrying information', () => {
    // Past ten sessions the rate is back to baseline; a stale arc would invite
    // a giveback measured against a high that no longer matters.
    expect(resolveCycle(ranThenQuiet(15)).phase).toBe('NO_CYCLE');
  });

  it('does not expire a cycle that is still being traded', () => {
    const bars = [...ranThenQuiet(0)];
    for (let i = 0; i < 6; i += 1) bars.push(bar(`h${i}`, 1.5, 1.6, 9_000_000));
    // Still heavily traded, so it never enters the shadow to expire from.
    expect(arc(resolveCycle(bars)).phase).toBe('BACKSIDE');
  });

  it('treats sustained volume as the new normal', () => {
    // Relative volume is relative. A name that trades nine million shares every
    // session for a month is not unusually active any more, it has re-based —
    // and the cycle ends, because nothing is elevated. Worth pinning because it
    // is easy to read as a bug: the volume never fell.
    const bars = [...ranThenQuiet(0)];
    for (let i = 0; i < 25; i += 1) bars.push(bar(`h${i}`, 1.5, 1.6, 9_000_000));
    expect(resolveCycle(bars).phase).toBe('NO_CYCLE');
  });
});

/**
 * Prior runs, from the same detector.
 *
 * The interpreter was also asked for formerRunnerStatus and recentMajorRuns
 * from an evidence bundle containing no price history. It returned a different
 * answer across five identical draws for 43% of versions, almost all of them
 * flipping between a classification and UNKNOWN. A prior run is a fact about
 * bars.
 */
describe('cycle history', () => {
  function twoRuns(): CycleBar[] {
    return [
      ...base(22, 1.0),
      bar('2026-06-25', 4.0, 4.2, 40_000_000), // +300%
      ...Array.from({ length: 14 }, (_, i) => bar(`g${i}`, 1.1, 1.2, 800_000)),
      bar('2026-08-10', 1.6, 1.7, 25_000_000), // +45%
      bar('2026-08-11', 1.62, 1.68, 6_000_000),
    ];
  }

  it('bounds each cycle high by the next start, not by the end of the series', () => {
    const history = resolveCycleHistory(twoRuns());
    expect(history.priorCycles).toHaveLength(1);
    // Without the bound the June cycle would swallow August's bars and report
    // one huge advance instead of two real ones.
    expect(history.priorCycles[0].cycleHigh).toBe(4.2);
    expect(Math.round(history.priorCycles[0].advancePct * 100)).toBe(320);
  });

  it('calls a past triple a superrunner and a smaller run a runner', () => {
    expect(resolveCycleHistory(twoRuns()).formerRunnerStatus).toBe('FORMER_SUPERRUNNER');

    const modest: CycleBar[] = [
      ...base(22, 1.0),
      bar('2026-06-25', 1.5, 1.6, 40_000_000), // +60%
      ...Array.from({ length: 14 }, (_, i) => bar(`g${i}`, 1.1, 1.2, 800_000)),
      bar('2026-08-10', 1.6, 1.7, 25_000_000),
    ];
    expect(resolveCycleHistory(modest).formerRunnerStatus).toBe('FORMER_RUNNER');
  });

  it('counts a run that is over even when it is the current cycle', () => {
    // MYSZ read NONE while sitting deep on the backside of a move it had just
    // made: its only run WAS the live cycle, so there were no prior ones.
    const broken: CycleBar[] = [
      ...base(22, 1.0),
      bar('2026-08-10', 4.0, 4.5, 40_000_000),
      bar('2026-08-11', 1.2, 2.0, 12_000_000),
    ];
    const history = resolveCycleHistory(broken);
    expect(history.current.phase).toBe('BACKSIDE');
    expect(history.priorCycles).toHaveLength(0);
    expect(history.formerRunnerStatus).toBe('FORMER_SUPERRUNNER');
  });

  it('does not count a move that is still going up', () => {
    const live: CycleBar[] = [...base(22, 1.0), bar('2026-08-10', 4.0, 4.5, 40_000_000)];
    const history = resolveCycleHistory(live);
    expect(history.current.phase).toBe('DAY_ONE');
    // A present move is not a past one.
    expect(history.formerRunnerStatus).toBe('NONE');
  });

  it('reports the largest advance so a surface need not accept the cut', () => {
    const history = resolveCycleHistory(twoRuns());
    expect(history.largestPriorAdvancePct).toBeCloseTo(3.2, 1);
  });

  it('says NONE when there is no history rather than guessing', () => {
    expect(resolveCycleHistory(base(40)).formerRunnerStatus).toBe('NONE');
    expect(resolveCycleHistory(base(40)).priorCycles).toEqual([]);
  });
});

/**
 * When the cycle was computed, which is the field that makes the rest readable.
 *
 * `readDailyBars` hides a bar written before its own session ended, which is
 * right -- a running high and a part-day volume are worse than being one
 * session behind. But until this field existed, nothing downstream could tell
 * the difference between a cycle resolved to Friday and one resolved to
 * Thursday, and the two look identical on a board.
 *
 * It stopped being hypothetical on 2026-08-24. Eight jobs queued at Friday
 * 22:00 ET were never claimed, so those symbols were never re-analysed,
 * `ensureDailyHistory` never ran for them, their partial Friday bar never
 * healed, and the filter hid it. ADXN, LSTA and ZKH each held 101 bars, 100
 * finished, newest finished 2026-08-20 while the tape had 2026-08-21 -- and all
 * three were on the trader's board carrying a Thursday phase.
 */
describe('the as-of date on a cycle', () => {
  const bar = (tradingDate: string, close: number, volume = 1_000_000) => ({
    tradingDate, open: close, high: close, low: close, close, volume,
  });

  it('reports the newest session it actually used', () => {
    const bars = [bar('2026-08-19', 1), bar('2026-08-20', 1.02), bar('2026-08-21', 1.03)];

    expect(resolveCycleHistory(bars).asOfTradingDate).toBe('2026-08-21');
  });

  it('is a session behind when the newest bar was withheld', () => {
    /*
     * The ADXN/LSTA/ZKH shape. The caller passes what readDailyBars gave it,
     * which excludes the unfinished Friday bar -- so the phase is computed on
     * complete data that is one day old, and this is the only field that says
     * so. It is a DATE rather than a stale flag because the desk's tolerance
     * differs by hour: one session behind at 07:00 premarket is not the same
     * statement as one session behind at 16:00.
     */
    const withFriday = [bar('2026-08-19', 1), bar('2026-08-20', 1.02), bar('2026-08-21', 1.03)];
    const withoutFriday = withFriday.slice(0, 2);

    expect(resolveCycleHistory(withoutFriday).asOfTradingDate).toBe('2026-08-20');
    // And the rest of the shape gives no hint on its own -- same phase, same
    // former-runner status, different day. That is the whole problem.
    expect(resolveCycleHistory(withoutFriday).current.phase).toBe(
      resolveCycleHistory(withFriday).current.phase,
    );
  });

  it('is null rather than invented on an empty series', () => {
    expect(resolveCycleHistory([]).asOfTradingDate).toBeNull();
  });
});

/**
 * The intraday supersession test — the sibling of `isCycleStart`.
 *
 * QCLS read `BACKSIDE $5.49` in red while up 270%; the $5.49 was a run that
 * topped on 2026-05-14. The module already says a qualifying start day
 * supersedes — the detector just cannot see today, because `daily_bars` is
 * settled-only.
 */
describe('todayQualifiesAsCycleStart', () => {
  const settled = base(25, 1.0, 1_000_000);

  const today = (over: Partial<TodaySoFar> = {}): TodaySoFar => ({
    high: 1.5,
    volume: 10_000_000,
    highBarClose: 1.45,
    highCeiling: null,
    ...over,
  });

  it('qualifies a day that has moved on volume', () => {
    // +50% on the high against a 1.00 settled close, 10x the median volume.
    expect(todayQualifiesAsCycleStart(settled, today())).toBe('QUALIFIED');
  });

  it('refuses a big move on ordinary volume', () => {
    expect(todayQualifiesAsCycleStart(settled, today({ volume: 2_000_000 }))).toBe(
      'NOT_QUALIFIED',
    );
  });

  it('refuses heavy volume without the move', () => {
    expect(
      todayQualifiesAsCycleStart(settled, today({ high: 1.05, highBarClose: 1.04 })),
    ).toBe('NOT_QUALIFIED');
  });

  /*
   * MONOTONE, WHICH IS WHY NO LATCH IS STORED. The high only rises and
   * cumulative volume only rises, so a qualification cannot be withdrawn by a
   * retracement. A guard on `percent_change` would lose it -- that field moves
   * both ways at one-second granularity and would restore the wrong badge
   * mid-session on the name that just ran.
   */
  it('stays qualified after the move is given back', () => {
    // The high is 1.50 and the day is now worth far less; the high does not fall.
    const faded = todayQualifiesAsCycleStart(settled, today({ high: 1.5 }));
    expect(faded).toBe('QUALIFIED');
  });

  it('is strictly more permissive than its settled parent', () => {
    /*
     * A day that spiked +30% and closed +5% qualifies here and NOT once settled.
     * That is the settled rule losing a spike-and-fade day -- the shape he
     * trades -- rather than this one being provisional.
     */
    const spikeAndFade = { high: 1.3, volume: 10_000_000, highBarClose: 1.28, highCeiling: null };
    expect(todayQualifiesAsCycleStart(settled, spikeAndFade)).toBe('QUALIFIED');

    const asSettled: CycleBar[] = [
      ...settled,
      { tradingDate: '2026-07-01', high: 1.3, low: 1.0, close: 1.05, volume: 10_000_000 },
    ];
    expect(isCycleStart(asSettled, asSettled.length - 1)).toBe(false);
  });

  it('refuses a high that towers over the minute that set it', () => {
    /*
     * One erroneous tick IS the high where it would never be the close. The
     * ratio is `blueSky`'s calibrated 1.6, and the denominator is the close of
     * the minute that made the high -- not the live price, which would reject a
     * genuine fade.
     */
    expect(
      todayQualifiesAsCycleStart(settled, today({ high: 5.0, highBarClose: 1.0 })),
    ).toBe('UNVERIFIABLE');
  });

  it('admits a real one-minute blow-off that closed near its range', () => {
    expect(
      todayQualifiesAsCycleStart(settled, today({ high: 1.5, highBarClose: 1.1 })),
    ).toBe('QUALIFIED');
  });

  it('cannot run on a seeded high, because a seed carries no bar', () => {
    // The companion close is structurally absent after a restart reseed, so the
    // guard declines rather than running on mismatched inputs.
    expect(todayQualifiesAsCycleStart(settled, today({ highBarClose: null }))).toBe(
      'UNVERIFIABLE',
    );
  });

  it('is unverifiable without a settled close to measure from', () => {
    expect(todayQualifiesAsCycleStart([], today())).toBe('UNVERIFIABLE');
  });

  it('separates an untraded day from a disqualified one', () => {
    // No high yet is "cannot say", not "did not qualify".
    expect(todayQualifiesAsCycleStart(settled, today({ high: null }))).toBe('UNVERIFIABLE');
    // A measured zero volume with a real high is a verdict.
    expect(todayQualifiesAsCycleStart(settled, today({ volume: 0 }))).toBe('NOT_QUALIFIED');
  });
});

/**
 * The provisional bar's BUILDER, which is where the reseed defect would enter.
 *
 * The rule can check that its inputs are finite. It cannot check that the bars
 * it was handed cover the day, and it cannot see that a high and a close came
 * from two differently-rebuilt sources.
 */
describe('todaySoFarFromBars', () => {
  const bar = (high: number, close: number): TodayMinuteBar => ({ high, close });

  it("takes the close of the bar that SET the high, not the latest close", () => {
    const bars = [bar(1.2, 1.15), bar(1.9, 1.8), bar(1.4, 1.1)];
    expect(todaySoFarFromBars(bars, 1.9, 5_000_000)).toEqual({
      high: 1.9,
      highBarClose: 1.8,
      highCeiling: null,
      volume: 5_000_000,
    });
  });

  it('carries session_high as a CEILING rather than refusing on the gap', () => {
    // First version refused here. That refused 75% of the top 12 on 2026-08-18,
    // because the top of the board is names that ran before we tracked them.
    expect(todaySoFarFromBars([bar(1.4, 1.35)], 1.9, 5_000_000)).toEqual({
      high: 1.4,
      highBarClose: 1.35,
      highCeiling: 1.9,
      volume: 5_000_000,
    });
  });

  it('leaves the ceiling null when the bars already account for the high', () => {
    expect(todaySoFarFromBars([bar(1.9, 1.8)], 1.9, 1)?.highCeiling).toBeNull();
  });

  it('accepts when session_high is BELOW the bars, which never happened in the frame', () => {
    // Measured zero times in 6,889 rows, but it is the safe direction: the pair
    // is still self-consistent, so there is nothing to refuse.
    expect(todaySoFarFromBars([bar(1.9, 1.8)], 1.5, 1)?.high).toBe(1.9);
  });

  it('refuses a null session_high even with bars present', () => {
    expect(todaySoFarFromBars([bar(1.9, 1.8)], null, 5_000_000)).toBeNull();
  });

  it('keeps the highest close among tied highs', () => {
    // A level two minutes reached is corroborated, so do not hand the guard the
    // reading most likely to call it a bad print.
    const bars = [bar(1.9, 1.2), bar(1.9, 1.85)];
    expect(todaySoFarFromBars(bars, 1.9, 1)?.highBarClose).toBe(1.85);
  });

  it('skips bars missing either half of the pair', () => {
    const bars = [{ high: 2.5, close: null }, bar(1.9, 1.8), { high: null, close: 1.0 }];
    expect(todaySoFarFromBars(bars, 1.9, 1)).toEqual({
      high: 1.9,
      highBarClose: 1.8,
      highCeiling: null,
      volume: 1,
    });
  });

  it('returns null with no usable bars', () => {
    expect(todaySoFarFromBars([], 1.9, 1)).toBeNull();
  });

  it('passes a null volume through for the rule to refuse on', () => {
    expect(todaySoFarFromBars([bar(1.9, 1.8)], 1.9, null)).toEqual({
      high: 1.9,
      highBarClose: 1.8,
      highCeiling: null,
      volume: null,
    });
    expect(
      todayQualifiesAsCycleStart(base(25, 1.0, 1_000_000), {
        high: 1.9,
        highBarClose: 1.8,
        volume: null,
        highCeiling: null,
      }),
    ).toBe('UNVERIFIABLE');
  });

  it('feeds a real bad print through to UNVERIFIABLE end to end', () => {
    // One minute spikes to 3.00 and closes at 1.00: high/close is 3.0.
    const built = todaySoFarFromBars([bar(1.2, 1.15), bar(3.0, 1.0)], 3.0, 50_000_000);
    expect(built).not.toBeNull();
    expect(todayQualifiesAsCycleStart(base(25, 1.0, 1_000_000), built!)).toBe('UNVERIFIABLE');
  });

  it('lets a genuine fade through, which the live price would have rejected', () => {
    // QCLS: high 1.76, and the setting minute closed 1.70 even though the day
    // later faded to 0.90. Dividing by the live price gave 1.96 and lost it.
    const built = todaySoFarFromBars([bar(1.76, 1.7), bar(1.1, 0.9)], 1.76, 50_000_000);
    expect(todayQualifiesAsCycleStart(base(25, 1.0, 1_000_000), built!)).toBe('QUALIFIED');
  });
});

/**
 * The interval test — a gap only matters if it straddles the threshold.
 *
 * The first version of the coverage audit refused on ANY gap above float noise,
 * which put a 0.14% discrepancy between two sources in the same bucket as a 66%
 * missed run and refused 75% of the top 12 on a measured date.
 */
describe('todayQualifiesAsCycleStart under an incomplete high', () => {
  const settled = base(25, 1.0, 1_000_000);
  const at = (high: number, ceiling: number | null, volume = 10_000_000): TodaySoFar => ({
    high,
    volume,
    highBarClose: high * 0.98,
    highCeiling: ceiling,
  });

  it('ignores a gap too small to cross the threshold', () => {
    // NTWO: 11.99 against 11.86, with 132 stored bars from 04:00. Both ends of
    // the interval are far above a 20% move, so the gap cannot change anything.
    expect(todayQualifiesAsCycleStart(settled, at(1.5, 1.52))).toBe('QUALIFIED');
  });

  it('ignores a gap that leaves both ends BELOW the threshold', () => {
    expect(todayQualifiesAsCycleStart(settled, at(1.05, 1.1))).toBe('NOT_QUALIFIED');
  });

  it('refuses only when the gap straddles the threshold', () => {
    // TGL: 4.25 against 2.94 on five bars. Our high says no, the ceiling says
    // yes, and the true high is somewhere between.
    expect(todayQualifiesAsCycleStart(settled, at(1.1, 1.4))).toBe('UNVERIFIABLE');
  });

  it('treats an incomplete high as IRRELEVANT when volume fails', () => {
    // No high can qualify a day on ordinary volume, so a straddling gap is not
    // an unknown here -- the question is already answered.
    expect(todayQualifiesAsCycleStart(settled, at(1.1, 1.4, 2_000_000))).toBe(
      'NOT_QUALIFIED',
    );
  });

  it('is unchanged when no ceiling is known', () => {
    expect(todayQualifiesAsCycleStart(settled, at(1.5, null))).toBe('QUALIFIED');
    expect(todayQualifiesAsCycleStart(settled, at(1.05, null))).toBe('NOT_QUALIFIED');
  });

  it('end to end: a real board row with a sub-1% gap still gets a verdict', () => {
    const built = todaySoFarFromBars(
      [{ high: 11.86, close: 11.7 }, { high: 9.0, close: 8.8 }],
      11.99,
      50_000_000,
    );
    expect(built?.highCeiling).toBe(11.99);
    expect(todayQualifiesAsCycleStart(base(25, 8.0, 1_000_000), built!)).toBe('QUALIFIED');
  });
});

/**
 * The quiet test, after his 2026-09-19 ruling.
 *
 * It required three CONSECUTIVE sessions at or under the shadow threshold. A
 * name that pops once every third session never strings three together, so its
 * cycle never expired — the QCLS shape: RVOL `1.00 1.00 4.44` repeating for
 * eighty-five sessions past the high, with the board still printing BACKSIDE
 * against a four-month-old $5.49.
 *
 * His words: *"that's letting the letter of the rule block the spirit of it."*
 * The intent is that the run ends when the name's TYPICAL day is back to normal,
 * so the test is now a median over a window.
 */
describe('resolveCycle quiet test', () => {
  const day = (n: number) =>
    `2026-${String(Math.floor(n / 28) + 1).padStart(2, '0')}-${String((n % 28) + 1).padStart(2, '0')}`;

  /** 25 quiet sessions, one big run to 5.49, then `after` sessions of decline. */
  function afterRun(after: number, volumeAt: (i: number) => number): CycleBar[] {
    const bars: CycleBar[] = [];
    let n = 0;
    for (let i = 0; i < 25; i += 1) {
      bars.push({ tradingDate: day(n++), high: 1.02, low: 0.98, close: 1.0, volume: 500_000 });
    }
    bars.push({ tradingDate: day(n++), high: 5.49, low: 1.0, close: 4.5, volume: 50_000_000 });
    let price = 4.5;
    for (let i = 0; i < after; i += 1) {
      price *= Math.pow(0.44 / 4.5, 1 / Math.max(after, 1));
      bars.push({
        tradingDate: day(n++),
        high: price * 1.05,
        low: price * 0.95,
        close: price,
        volume: volumeAt(i),
      });
    }
    return bars;
  }

  it('EXPIRES a dead arc that pops every third session', () => {
    // The QCLS shape. Under the consecutive rule this stayed BACKSIDE forever.
    const bars = afterRun(85, (i) => (i % 3 === 0 ? 4_000_000 : 900_000));
    expect(resolveCycle(bars).phase).toBe('NO_CYCLE');
  });

  it('one pop does not keep an otherwise quiet window alive', () => {
    const bars = afterRun(85, (i) => (i === 84 ? 6_000_000 : 900_000));
    expect(resolveCycle(bars).phase).toBe('NO_CYCLE');
  });

  it('keeps a LIVE run live', () => {
    const bars: CycleBar[] = [];
    let n = 0;
    for (let i = 0; i < 25; i += 1) {
      bars.push({ tradingDate: day(n++), high: 1.02, low: 0.98, close: 1.0, volume: 500_000 });
    }
    bars.push({ tradingDate: day(n++), high: 3.0, low: 1.0, close: 2.6, volume: 20_000_000 });
    for (let i = 0; i < 4; i += 1) {
      bars.push({ tradingDate: day(n++), high: 2.9, low: 2.3, close: 2.7, volume: 12_000_000 });
    }
    expect(resolveCycle(bars).phase).not.toBe('NO_CYCLE');
    expect(resolveCycle(bars).phase).not.toBe('SHADOW');
  });

  it('still shows SHADOW rather than nothing inside the lifetime window', () => {
    const bars = afterRun(5, () => 500_000);
    expect(resolveCycle(bars).phase).toBe('SHADOW');
  });

  it('refuses to read absence as calm', () => {
    // Every post-run session has no volume reading at all: nothing is measured,
    // so nothing may be declared quiet.
    const bars = afterRun(85, () => 0).map((bar, i) =>
      i > 25 ? { ...bar, volume: null } : bar,
    );
    expect(resolveCycle(bars).phase).not.toBe('NO_CYCLE');
  });
});

/**
 * The absolute floor, his pick of $50,000 on 2026-09-19.
 *
 * RVOL certifies a name as busy against its OWN recent history, and a dead
 * stock's own history is dead. Measured: of 4,142 production sessions reading
 * RVOL >= 2, more than half traded under $1M all day and the bottom 5% under
 * $29,809. So a cycle could stay live on tape nobody could trade.
 *
 * These two cases differ ONLY in price, which is what makes the floor the thing
 * under test rather than the volume pattern.
 */
describe('resolveCycle dollar floor', () => {
  const day = (n: number) =>
    `2026-${String(Math.floor(n / 28) + 1).padStart(2, '0')}-${String((n % 28) + 1).padStart(2, '0')}`;

  /** Rising volume — so RVOL stays high and only the floor can end the run. */
  function risingVolume(close: number): CycleBar[] {
    const bars: CycleBar[] = [];
    let n = 0;
    for (let i = 0; i < 25; i += 1) {
      bars.push({ tradingDate: day(n++), high: close * 1.02, low: close * 0.98, close, volume: 50_000 });
    }
    bars.push({ tradingDate: day(n++), high: close * 15, low: close, close: close * 12, volume: 2_000_000 });
    for (let i = 0; i < 12; i += 1) {
      bars.push({
        tradingDate: day(n++),
        high: close * 1.05,
        low: close * 0.95,
        close,
        volume: Math.round(60_000 * Math.pow(1.25, i)),
      });
    }
    return bars;
  }

  it('EXPIRES a name that is busy relative to nothing', () => {
    // $0.02 x ~875k on the last session is about $17,500 of tape.
    const bars = risingVolume(0.02);
    expect(resolveCycle(bars).phase).toBe('NO_CYCLE');
  });

  it('KEEPS the identical volume pattern alive at a tradeable price', () => {
    // Same volumes, same shape, $2.00 instead of $0.02 — about $1.75M of tape.
    const bars = risingVolume(2.0);
    expect(resolveCycle(bars).phase).not.toBe('NO_CYCLE');
    expect(resolveCycle(bars).phase).not.toBe('SHADOW');
  });

  it('cannot end a run that is younger than the shadow window', () => {
    // A name that ran today on thin tape keeps its cycle: the sessionsInCycle
    // guard runs before either quiet measure.
    const bars: CycleBar[] = [];
    let n = 0;
    for (let i = 0; i < 25; i += 1) {
      bars.push({ tradingDate: day(n++), high: 0.0204, low: 0.0196, close: 0.02, volume: 50_000 });
    }
    bars.push({ tradingDate: day(n++), high: 0.30, low: 0.02, close: 0.24, volume: 400_000 });
    expect(resolveCycle(bars).phase).not.toBe('NO_CYCLE');
    expect(resolveCycle(bars).phase).not.toBe('SHADOW');
  });

  it('refuses to read a missing price as cheap tape', () => {
    /*
     * Dollars need a close as well as a volume. Strip the close from all but
     * the newest session, so the window holds too few measured dollar values to
     * form a median — RVOL is high, so nothing may be declared quiet.
     *
     * The latest bar keeps its close deliberately: `resolveCycle` bails on a
     * null latest close for its own reasons, which would pass this test for the
     * wrong reason.
     */
    const bars = risingVolume(0.02);
    const patched = bars.map((bar, i) =>
      i > 25 && i < bars.length - 1 ? { ...bar, close: null } : bar,
    );
    expect(resolveCycle(patched).phase).not.toBe('NO_CYCLE');
  });
});
