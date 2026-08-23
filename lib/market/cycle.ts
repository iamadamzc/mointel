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
 */
export const SHADOW_RVOL = 2;
export const SHADOW_SESSIONS = 3;

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
  /** Sessions from the cycle high to the latest bar. Zero means today. */
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
