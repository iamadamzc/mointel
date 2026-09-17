/**
 * Where a stock sits in its current momentum cycle, computed rather than judged.
 *
 * This exists because the interpreter could not answer it. Across 325 stored
 * dossiers the model established a `currentCycleHigh` in 12% of cases and left
 * it null in the rest — correctly, since the rules forbid guessing and nothing
 * in an evidence bundle says where a move began. The cycle LABEL was produced
 * anyway, without the number it depends on, and re-running identical evidence
 * five times returned a different cycle classification 46% of the time,
 * including 17 versions that flipped between backside and frontside.
 *
 * A cycle position is arithmetic over daily bars. It does not need a language
 * model and should never have had one.
 *
 * WHAT THIS IS NOT. The FIEE defect was taking the highest number in a long
 * window and calling it the cycle high, which is why `summariseDailyHistory`
 * deliberately refuses to compute one. The difference here is that the high is
 * bounded below by a start day the desk's own rule identifies, so an old run
 * high from three months ago cannot reach it. A window with no qualifying start
 * day yields no cycle rather than a fallback.
 */

/** The desk's rule for a day that begins a move: 20%+ on 5x relative volume. */
/*
 * The bad-print ratio, from the module that already calibrated it rather than a
 * second copy. `blueSky` imports nothing from here, so this is not a cycle.
 */
import { MAX_SPIKE_RATIO } from './blueSky';

export const CYCLE_START_MOVE_PCT = 0.2;
export const CYCLE_START_RVOL = 5;
/** Sessions of prior volume the relative-volume baseline is taken from. */
export const RVOL_BASELINE_SESSIONS = 20;

/**
 * Fraction of the MOVE given back before it reads as broken.
 *
 * Of the move, not below the high, and the difference is not cosmetic. A stock
 * that based at 1.00 and ran to 1.20 has given back half its move at 1.10;
 * measuring 50% below the HIGH would put the threshold at 0.60, far under where
 * it started, so a rule written that way fires only on enormous movers and
 * silently never fires on ordinary ones.
 */
export const BACKSIDE_RETRACEMENT = 0.5;

/**
 * Relative volume at or below which a name is no longer in play, and the
 * consecutive sessions of it that end a cycle.
 *
 * 2x is the desk's own eligibility floor. Volume returning to normal is what
 * resets the dial: a move is over when nobody is trading it any more, not when
 * some number of days have passed.
 *
 * Three sessions is measured, not assumed. Chance a cycle still makes a NEW
 * high within five sessions, after N consecutive quiet ones:
 *
 *   1 quiet session   5.9%
 *   2                 5.1%
 *   3                 3.7%
 *   4                 3.9%
 *   5                 3.9%
 *
 * One or two quiet sessions still leave a real chance the move comes back. By
 * three it has fallen by a third and the curve flattens — four and five buy
 * nothing. The elbow is the threshold.
 */
export const SHADOW_RVOL = 2;
export const SHADOW_SESSIONS = 3;

/**
 * Sessions past the cycle high after which the shadow stops meaning anything.
 *
 * Measured rather than chosen. Across 24,114 symbol-sessions of production
 * daily bars, the chance a NEW cycle begins on a given session, by distance
 * from the previous cycle high:
 *
 *   1-5 sessions    9.60%     7.3x baseline
 *   6-10            3.34%     2.6x
 *   11-20           1.48%     1.1x
 *   21-40           1.76%     1.3x
 *   baseline        1.31%
 *
 * A name that has just run is seven times likelier to run again inside a week,
 * and that is gone by roughly ten sessions. Past this the arc is stale, so the
 * cycle expires rather than lingering. An old high that still matters as
 * resistance is a different quantity and belongs in historicalResistance.
 *
 * Caveat carried deliberately: this measures RE-IGNITION, not whether the old
 * high caps price, and the population is names the desk researched, so the
 * baseline is among movers rather than among all stocks.
 */
export const SHADOW_LIFETIME_SESSIONS = 10;

export interface CycleBar {
  tradingDate: string;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export type CyclePhase =
  /** The start day is the latest session: the move is happening now. */
  | 'DAY_ONE'
  /** Still making the cycle high, more than one session in. */
  | 'FRONTSIDE'
  /** Off the high, but less than half the move given back. */
  | 'PULLBACK'
  /** Half the move or more given back, while the name is still in play. */
  | 'BACKSIDE'
  /**
   * The move is over — volume has returned to normal — but its high is still
   * overhead.
   *
   * A name that ran a month ago and has since gone quiet is not on the backside
   * of anything; nothing is actively unwinding. Calling it BACKSIDE forever
   * overstates what is happening and buries the thing that does still matter,
   * which is that the old high is resistance. A fresh catalyst starts a new
   * cycle from here on its own, because a qualifying start day supersedes.
   */
  | 'SHADOW'
  /** No qualifying start day in the window. An absence, not a judgement. */
  | 'NO_CYCLE';

export interface CycleArc {
  phase: CyclePhase;
  /** Session the move began, by CYCLE_START_MOVE_PCT and CYCLE_START_RVOL. */
  startDate: string;
  /** The close it launched from — the prior session's close. */
  baseClose: number;
  /** Highest high at or after the start. This is the current-cycle high. */
  cycleHigh: number;
  cycleHighDate: string;
  /**
   * Sessions from the cycle high to the latest bar in the set.
   *
   * ZERO MEANS THE LATEST SETTLED SESSION — **not today**, and the difference
   * is the whole premarket.
   *
   * ~~Zero means today.~~ That wording shipped a falsehood. The bar set never
   * contains the live session: `ensureDailyHistory` stores nothing newer than
   * `lastSettledTradingDate` (20:00 ET) and `readDailyBars` defaults to
   * excluding unfinished bars, so during premarket the latest bar is
   * YESTERDAY. A reader took the comment at its word and rendered *"high is
   * today"*, which printed a claim about yesterday with the word today in it.
   *
   * **It was true only after 20:00 ET**, when the latest settled session IS
   * today — true in one window and false in the window he trades, which is
   * this desk's named-event-rather-than-condition failure arriving in a
   * docstring. **State the condition (`settled`), never the moment
   * (`today`).**
   */
  sessionsSinceHigh: number;
  /** Sessions from the start day to the latest bar, inclusive. */
  sessionsInCycle: number;
  /** (cycleHigh - latestClose) / cycleHigh. How far below the high. */
  givebackPct: number;
  /**
   * Fraction of the move surrendered: 0 at the high, 1 back at the base, above
   * 1 below where it started. This, not givebackPct, decides the phase.
   */
  retracementPct: number;
  /** Relative volume over the most recent sessions, newest first. */
  recentRvol: Array<number | null>;
  /** Move from the base close to the cycle high. */
  advancePct: number;
  latestDate: string;
  latestClose: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Relative volume against a trailing MEDIAN, not a mean.
 *
 * A mean over a window containing one 67-million-share day is dominated by it,
 * which would suppress the relative volume of every session afterwards and hide
 * the start of the next move.
 */
export function dailyRvol(bars: readonly CycleBar[], index: number): number | null {
  const prior: number[] = [];
  for (let i = index - 1; i >= 0 && prior.length < RVOL_BASELINE_SESSIONS; i -= 1) {
    const volume = bars[i].volume;
    if (typeof volume === 'number' && Number.isFinite(volume) && volume > 0) prior.push(volume);
  }
  const baseline = median(prior);
  const volume = bars[index].volume;
  if (baseline === null || baseline <= 0) return null;
  if (typeof volume !== 'number' || !Number.isFinite(volume)) return null;
  return volume / baseline;
}

/** Session-over-session close change, or null when either close is missing. */
export function closeChangePct(bars: readonly CycleBar[], index: number): number | null {
  const prior = bars[index - 1]?.close;
  const close = bars[index]?.close;
  if (typeof prior !== 'number' || typeof close !== 'number' || prior <= 0) return null;
  return (close - prior) / prior;
}

/**
 * Tolerance on the threshold comparisons.
 *
 * A move from 1.00 to 1.20 is twenty percent, and in binary floating point it
 * is 0.19999999999999996, so a bare `>=` rejects the exact case the rule is
 * written around. The epsilon is far below any real price move and exists only
 * to stop representation error deciding a threshold.
 */
const THRESHOLD_EPSILON = 1e-9;

/** True when this session begins a move by the desk's rule. */
export function isCycleStart(bars: readonly CycleBar[], index: number): boolean {
  if (index < 1) return false;
  const move = closeChangePct(bars, index);
  const rvol = dailyRvol(bars, index);
  if (move === null || rvol === null) return false;
  return (
    move >= CYCLE_START_MOVE_PCT - THRESHOLD_EPSILON &&
    rvol >= CYCLE_START_RVOL - THRESHOLD_EPSILON
  );
}

export interface CycleOptions {
  /** Fraction of the move given back before it reads as broken. */
  backsideRetracement?: number;
  /** Relative volume at or below which the name is out of play. */
  shadowRvol?: number;
  /** Consecutive quiet sessions that end a cycle. */
  shadowSessions?: number;
  /** Sessions past the high after which the cycle expires entirely. */
  shadowLifetimeSessions?: number;
}

export type CycleResult = CycleArc | { phase: 'NO_CYCLE' };

/**
 * Resolves the current cycle from daily bars, oldest first.
 *
 * The start is the MOST RECENT qualifying day, not the first. A stock that ran
 * in June and again in August is in its August cycle, and measuring the second
 * move against June's high would repeat the FIEE error one level up.
 */
export function resolveCycle(
  bars: readonly CycleBar[],
  options: CycleOptions = {},
): CycleResult {
  if (bars.length < 2) return { phase: 'NO_CYCLE' };

  let startIndex = -1;
  for (let i = bars.length - 1; i >= 1; i -= 1) {
    if (isCycleStart(bars, i)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex < 0) return { phase: 'NO_CYCLE' };

  const baseClose = bars[startIndex - 1].close;
  const latest = bars[bars.length - 1];
  if (typeof baseClose !== 'number' || typeof latest.close !== 'number') {
    return { phase: 'NO_CYCLE' };
  }

  let cycleHigh = -Infinity;
  let cycleHighIndex = startIndex;
  for (let i = startIndex; i < bars.length; i += 1) {
    const high = bars[i].high;
    if (typeof high === 'number' && Number.isFinite(high) && high > cycleHigh) {
      cycleHigh = high;
      cycleHighIndex = i;
    }
  }
  if (!Number.isFinite(cycleHigh) || cycleHigh <= 0) return { phase: 'NO_CYCLE' };

  const sessionsSinceHigh = bars.length - 1 - cycleHighIndex;
  const sessionsInCycle = bars.length - startIndex;
  const givebackPct = (cycleHigh - latest.close) / cycleHigh;
  const advance = cycleHigh - baseClose;
  /*
   * Guarded because a cycle can start and close below its own base, leaving no
   * move to retrace. Treated as fully surrendered, which is what it is.
   */
  const retracementPct = advance > 0 ? (cycleHigh - latest.close) / advance : 1;
  const advancePct = baseClose > 0 ? advance / baseClose : 0;

  const backsideRetracement = options.backsideRetracement ?? BACKSIDE_RETRACEMENT;
  const shadowRvol = options.shadowRvol ?? SHADOW_RVOL;
  const shadowSessions = options.shadowSessions ?? SHADOW_SESSIONS;
  const shadowLifetime = options.shadowLifetimeSessions ?? SHADOW_LIFETIME_SESSIONS;

  const recentRvol: Array<number | null> = [];
  for (let i = bars.length - 1; i >= 0 && recentRvol.length < shadowSessions; i -= 1) {
    recentRvol.push(dailyRvol(bars, i));
  }

  /*
   * The cycle is over when nobody is trading it any more.
   *
   * Requires a full window of quiet sessions AND that they all sit inside the
   * cycle — a move two days old cannot have gone quiet for three. A single
   * missing volume reading does not end a cycle either, since an absent bar is
   * not evidence of calm.
   */
  const wentQuiet =
    recentRvol.length === shadowSessions &&
    sessionsInCycle > shadowSessions &&
    recentRvol.every((rvol) => rvol !== null && rvol <= shadowRvol);

  /*
   * A stale arc is worse than no arc: it invites a giveback measured against a
   * high that stopped mattering weeks ago.
   */
  if (wentQuiet && sessionsSinceHigh > shadowLifetime) return { phase: 'NO_CYCLE' };

  let phase: CyclePhase;
  if (wentQuiet) {
    /*
     * Checked before BACKSIDE. A name that ran a month ago and has since gone
     * quiet is not on the backside of anything; nothing is unwinding. Leaving
     * it BACKSIDE forever overstates the present and buries what still matters,
     * which is the old high sitting overhead.
     */
    phase = 'SHADOW';
  } else if (retracementPct >= backsideRetracement) {
    /*
     * Before the at-the-high tests, so a same-session collapse is caught: AIXC
     * ran from 0.7102 to 3.14 and closed 1.32 on its start day, surrendering
     * 75% of its move while the high was still that same session.
     */
    phase = 'BACKSIDE';
  } else if (sessionsSinceHigh === 0) {
    phase = sessionsInCycle === 1 ? 'DAY_ONE' : 'FRONTSIDE';
  } else {
    phase = 'PULLBACK';
  }

  return {
    phase,
    startDate: bars[startIndex].tradingDate,
    baseClose,
    cycleHigh,
    cycleHighDate: bars[cycleHighIndex].tradingDate,
    sessionsSinceHigh,
    sessionsInCycle,
    givebackPct,
    retracementPct,
    recentRvol,
    advancePct,
    latestDate: latest.tradingDate,
    latestClose: latest.close,
  };
}

/**
 * Advance at which a past move counts as exceptional rather than ordinary.
 *
 * Measured over 319 cycles detected in production daily bars. Every one of them
 * already cleared 20% on 5x volume, so "runner" is the whole population and the
 * question is only where the tail begins:
 *
 *   median   71%      75th  121%
 *   90th    229%      95th  342%      max 1036%
 *
 * A triple puts a move in the top 12%, and sits just under the 90th percentile
 * rather than on a cliff — the distribution has no natural break, so this is a
 * percentile choice and should be read as one. `largestPriorAdvancePct` is
 * reported alongside so a surface never has to depend on the cut.
 */
export const SUPERRUNNER_ADVANCE = 2.0;

export type FormerRunnerStatus = 'NONE' | 'FORMER_RUNNER' | 'FORMER_SUPERRUNNER';

export interface PriorCycle {
  startDate: string;
  highDate: string;
  cycleHigh: number;
  /** Base close to cycle high. */
  advancePct: number;
  /** Sessions from that cycle's high to the latest bar. */
  sessionsAgo: number;
}

export interface CycleHistory {
  current: CycleResult;
  /** Completed cycles before the current one, most recent first. */
  priorCycles: PriorCycle[];
  formerRunnerStatus: FormerRunnerStatus;
  /** Largest prior advance, so a consumer can band it differently. */
  largestPriorAdvancePct: number | null;
  /**
   * The newest session this was computed from. Null only for an empty series.
   *
   * Every other field describes a shape; this one says WHEN. Without it a cycle
   * resolved to Thursday is indistinguishable from one resolved to Friday, and
   * that stopped being hypothetical the moment `readDailyBars` began hiding
   * unfinished bars: a symbol whose Friday bar is partial silently reports a
   * Thursday phase. On 2026-08-24, ADXN, LSTA and ZKH were on the board in
   * exactly that state — 101 bars each, 100 finished, latest finished
   * 2026-08-20 while the tape had 2026-08-21.
   *
   * Hiding the partial bar is still right; computing on a running high and a
   * part-day volume is worse than being one session behind. What was missing is
   * that nothing downstream could TELL. This is the tell, and it is a date
   * rather than a flag so a consumer can decide for itself what counts as
   * stale — the desk's staleness question is different at 07:00 than at 16:00.
   */
  asOfTradingDate: string | null;
}

/** Indices of every session that begins a move, oldest first. */
export function findCycleStarts(bars: readonly CycleBar[]): number[] {
  const starts: number[] = [];
  for (let i = 1; i < bars.length; i += 1) if (isCycleStart(bars, i)) starts.push(i);
  return starts;
}

/**
 * The current cycle plus every completed one behind it.
 *
 * Replaces `formerRunnerStatus` and `recentMajorRuns`, which the interpreter was
 * also being asked to judge from an evidence bundle that does not contain price
 * history. A prior run is a fact about bars; the same detector that finds the
 * current cycle finds the earlier ones for free.
 */
export function resolveCycleHistory(
  bars: readonly CycleBar[],
  options: CycleOptions = {},
): CycleHistory {
  const current = resolveCycle(bars, options);
  const starts = findCycleStarts(bars);

  /*
   * A cycle's high is bounded by the NEXT start, not by the end of the series.
   * Without that bound an early cycle would absorb every later run's high and
   * report one enormous advance instead of several real ones.
   */
  const priorCycles: PriorCycle[] = [];
  for (let k = 0; k < starts.length; k += 1) {
    const from = starts[k];
    const to = (k + 1 < starts.length ? starts[k + 1] : bars.length) - 1;
    // The last cycle is the current one and is reported by resolveCycle.
    if (k === starts.length - 1) break;

    const baseClose = bars[from - 1]?.close;
    if (typeof baseClose !== 'number' || baseClose <= 0) continue;

    let high = -Infinity;
    let highIndex = from;
    for (let i = from; i <= to; i += 1) {
      const value = bars[i].high;
      if (typeof value === 'number' && Number.isFinite(value) && value > high) {
        high = value;
        highIndex = i;
      }
    }
    if (!Number.isFinite(high)) continue;

    priorCycles.push({
      startDate: bars[from].tradingDate,
      highDate: bars[highIndex].tradingDate,
      cycleHigh: high,
      advancePct: (high - baseClose) / baseClose,
      sessionsAgo: bars.length - 1 - highIndex,
    });
  }
  priorCycles.reverse();

  /*
   * A run that is over counts, even when it is the CURRENT cycle.
   *
   * Restricting this to completed cycles read MYSZ as NONE while it sat deep on
   * the backside of a move it had just made — its only run was the live cycle,
   * so there were no "prior" ones. Whether a stock has had a big move behind it
   * does not depend on the bookkeeping boundary. A cycle still going up is
   * excluded, because that is a present move, not a past one.
   */
  const advances = priorCycles.map((cycle) => cycle.advancePct);
  if (current.phase === 'BACKSIDE' || current.phase === 'SHADOW') {
    advances.push((current as CycleArc).advancePct);
  }

  const largest = advances.reduce<number | null>(
    (best, advance) => (best === null || advance > best ? advance : best),
    null,
  );

  let formerRunnerStatus: FormerRunnerStatus = 'NONE';
  if (largest !== null) {
    formerRunnerStatus =
      largest >= SUPERRUNNER_ADVANCE ? 'FORMER_SUPERRUNNER' : 'FORMER_RUNNER';
  }

  return {
    current,
    priorCycles,
    formerRunnerStatus,
    largestPriorAdvancePct: largest,
    asOfTradingDate: bars.length > 0 ? bars[bars.length - 1].tradingDate : null,
  };
}

/**
 * Today's session so far, for the intraday supersession test.
 *
 * `high` is the DAY-WIDE session high and must never be a per-session one.
 * `sessionHighs` is not seeded (`vwap.ts`, and the note there), so a per-session
 * value is silently understated after a mid-session restart; and the question
 * being asked is day-level anyway, because `closeChangePct` compares a day close
 * to the prior day's.
 *
 * `highBarClose` is the close of the bar that SET `high`, captured in the same
 * moment rather than looked up later. Two numbers from one bar cannot be fed
 * differently-rebuilt values by an asymmetric reseed, and the pair is
 * structurally absent for a SEEDED high -- a seed carries a number, not a bar --
 * which is how the bad-print guard declines to run rather than running on
 * mismatched inputs.
 */
export interface TodaySoFar {
  high: number | null;
  volume: number | null;
  highBarClose: number | null;
}

/**
 * Whether today has begun a new cycle, judged intraday.
 *
 * QUALIFIED supersedes every earlier cycle, which is the module's own rule at
 * the `SHADOW` docstring: *a qualifying start day supersedes*. The detector
 * cannot see today because `daily_bars` is settled-only, so an old run's high
 * reaches a name that has already left it -- QCLS reading BACKSIDE $5.49 from
 * 2026-05-14 while up 270%.
 *
 * A SIBLING RULE, NOT `isCycleStart`. Same thresholds, and the move is measured
 * on the HIGH rather than the close, because intraday there is no close yet and
 * "has this day qualified" is properly asked of what the day has ACHIEVED. That
 * makes it strictly more permissive than its settled parent -- a day that spikes
 * +30% and closes +5% qualifies here and not once settled -- so a badge can read
 * day-one during the session and revert overnight. That is the SETTLED rule
 * losing a spike-and-fade day, not this one being provisional.
 *
 * MONOTONE, hence no stored latch: the high only rises and cumulative volume
 * only rises, so a qualification cannot be withdrawn by a retracement. The
 * `percent_change` field would NOT give this -- it moves both ways at 1s -- and
 * a guard built on it would restore the wrong badge mid-session on the name that
 * just ran.
 */
/** One stored minute of today: a high, and the close of THAT SAME minute. */
export interface TodayMinuteBar {
  high: number | null;
  close: number | null;
}

/*
 * Float noise only. Prices here are 1--20, so this is ~2e-5 of a cent, while a
 * genuine seeding gap is cents. The two cannot be confused at this width.
 */
const HIGH_COVERAGE_EPSILON = 1e-6;

/**
 * Builds today's provisional bar from stored minute bars, or refuses.
 *
 * WHY THE PAIR COMES FROM ONE SOURCE AND NOT FROM THE CHEAPEST SOURCE EACH.
 * `ticker_session.session_high` is the more complete high -- it is seeded from
 * `dailyBar.h` and so covers trading from before this process was streaming.
 * There is no companion close stored anywhere for it, so pairing it with a close
 * derived from `minute_bars` would feed the bad-print guard two numbers rebuilt
 * from different sources with different completeness. That is the asymmetric
 * reseed, and it is the defect that disables a guard on exactly the population
 * the guard exists to protect. So the high and its close are taken from the SAME
 * stored minute, and `session_high` is demoted to an auditor of that choice.
 *
 * THE AUDIT IS THE PART THE RULE CANNOT DO ITSELF. `todayQualifiesAsCycleStart`
 * can see that its inputs are finite; it cannot see that the bars it was handed
 * fail to cover the day. When `session_high` sits above every stored bar high,
 * the day's real high happened somewhere we have no minute for, so the pair is
 * self-consistent and about a shorter day -- which would read as NOT_QUALIFIED,
 * a claim, rather than as "cannot tell". Refusing hands the caller UNVERIFIABLE.
 *
 * Measured on 2026-08-18, 6,889 paired rows: 6,451 agree exactly, 438 (6.4%)
 * have `session_high` above every stored bar, and ZERO have it below. The stored
 * bars are a lower bound on the row in that window and never the reverse, so
 * this test only ever fires in the safe direction. One date, and the frame
 * matters: `session_high` is premarket+RTH, and comparing it against a bar max
 * that included after-hours produced 355 spurious disagreements until the
 * windows were matched.
 */
export function todaySoFarFromBars(
  minuteBars: readonly TodayMinuteBar[],
  sessionHigh: number | null,
  cumulativeVolume: number | null,
): TodaySoFar | null {
  let high: number | null = null;
  let highBarClose: number | null = null;

  for (const bar of minuteBars) {
    if (typeof bar.high !== 'number' || !Number.isFinite(bar.high)) continue;
    if (typeof bar.close !== 'number' || !Number.isFinite(bar.close)) continue;
    if (high === null || bar.high > high) {
      high = bar.high;
      highBarClose = bar.close;
      continue;
    }
    /*
     * A TIE IS CORROBORATION AND NOT A BAD PRINT. A bogus tick is one minute
     * reaching a level nothing else reached; two minutes reaching the same high
     * is a level the market actually traded at. So among tied maxima keep the
     * HIGHEST close, which is the reading least likely to trip the guard -- the
     * conservative choice here is the permissive one.
     */
    if (bar.high === high && highBarClose !== null && bar.close > highBarClose) {
      highBarClose = bar.close;
    }
  }

  if (high === null || highBarClose === null || high <= 0) return null;

  /*
   * A null `session_high` alongside bars that exist is itself the unknown case:
   * premarket restarts seed it null, and nothing distinguishes that from a name
   * that never printed -- except that a name which never printed has no bars.
   */
  if (typeof sessionHigh !== 'number' || !Number.isFinite(sessionHigh)) return null;
  if (sessionHigh > high * (1 + HIGH_COVERAGE_EPSILON)) return null;

  return { high, volume: cumulativeVolume, highBarClose };
}

export type TodayStartVerdict = 'QUALIFIED' | 'NOT_QUALIFIED' | 'UNVERIFIABLE';

export function todayQualifiesAsCycleStart(
  bars: readonly CycleBar[],
  today: TodaySoFar,
): TodayStartVerdict {
  const priorClose = bars[bars.length - 1]?.close;
  if (typeof priorClose !== 'number' || !Number.isFinite(priorClose) || priorClose <= 0) {
    return 'UNVERIFIABLE';
  }
  if (typeof today.high !== 'number' || !Number.isFinite(today.high) || today.high <= 0) {
    return 'UNVERIFIABLE';
  }
  if (typeof today.volume !== 'number' || !Number.isFinite(today.volume) || today.volume < 0) {
    return 'UNVERIFIABLE';
  }

  /*
   * THE BAD-PRINT GUARD, and it runs BEFORE the thresholds rather than after.
   *
   * A high is the extreme, so one erroneous tick IS the high where it would
   * never be the close. `blueSky.ts` already met this and calibrated the ratio:
   * a genuine blow-off closes somewhere near its range. Its own test divides by
   * the session's FINAL close, which does not exist yet -- and using the live
   * price instead rejects a real fade (QCLS at 1.76 over 0.90 is 1.96), which is
   * the case this whole fix exists to surface. So the denominator is the close
   * of the minute that set the high: a bad tick spikes one minute's high while
   * that same minute's close stays normal, which is the signature exactly.
   */
  if (typeof today.highBarClose !== 'number' || today.highBarClose <= 0) {
    return 'UNVERIFIABLE';
  }
  if (today.high / today.highBarClose > MAX_SPIKE_RATIO) return 'UNVERIFIABLE';

  const priorVolumes: number[] = [];
  for (let i = bars.length - 1; i >= 0 && priorVolumes.length < RVOL_BASELINE_SESSIONS; i -= 1) {
    const volume = bars[i].volume;
    if (typeof volume === 'number' && Number.isFinite(volume) && volume > 0) {
      priorVolumes.push(volume);
    }
  }
  /*
   * THE MODULE'S OWN MEDIAN, not `ticker_session.rvol`.
   *
   * `dailyRvol` divides by the MEDIAN of the prior sessions; the stored `rvol`
   * divides by the MEAN from `rvol_baseline`. `CYCLE_START_RVOL` was calibrated
   * against the median, and passing the other would be two denominators under
   * one threshold.
   */
  const baseline = median(priorVolumes);
  if (baseline === null || baseline <= 0) return 'UNVERIFIABLE';

  const move = (today.high - priorClose) / priorClose;
  const rvol = today.volume / baseline;

  return move >= CYCLE_START_MOVE_PCT - THRESHOLD_EPSILON &&
    rvol >= CYCLE_START_RVOL - THRESHOLD_EPSILON
    ? 'QUALIFIED'
    : 'NOT_QUALIFIED';
}
