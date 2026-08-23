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
  /** Off the high, but the high is recent and the move is not broken. */
  | 'PULLBACK'
  /** Past the peak by days, or most of the move given back. */
  | 'BACKSIDE'
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
  /** (cycleHigh - latestClose) / cycleHigh. */
  givebackPct: number;
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

/** True when this session begins a move by the desk's rule. */
export function isCycleStart(bars: readonly CycleBar[], index: number): boolean {
  if (index < 1) return false;
  const move = closeChangePct(bars, index);
  const rvol = dailyRvol(bars, index);
  if (move === null || rvol === null) return false;
  return move >= CYCLE_START_MOVE_PCT && rvol >= CYCLE_START_RVOL;
}

export interface CycleOptions {
  /** Giveback at or beyond which the move reads as broken. */
  backsideGivebackPct?: number;
  /** Sessions past the high at or beyond which the move reads as broken. */
  backsideSessionsSinceHigh?: number;
}

const DEFAULT_BACKSIDE_GIVEBACK = 0.5;
const DEFAULT_BACKSIDE_SESSIONS = 3;

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
  const advancePct = baseClose > 0 ? (cycleHigh - baseClose) / baseClose : 0;

  const backsideGiveback = options.backsideGivebackPct ?? DEFAULT_BACKSIDE_GIVEBACK;
  const backsideSessions = options.backsideSessionsSinceHigh ?? DEFAULT_BACKSIDE_SESSIONS;

  let phase: CyclePhase;
  if (givebackPct >= backsideGiveback || sessionsSinceHigh >= backsideSessions) {
    /*
     * Checked first, deliberately. A green session deep on the backside is a
     * bounce inside a broken move, and reading it as strength is the trap the
     * multi-day framing exists to avoid: STAK closed +11% on 29 July while 80%
     * below a cycle high set five sessions earlier.
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
    advancePct,
    latestDate: latest.tradingDate,
    latestClose: latest.close,
  };
}
