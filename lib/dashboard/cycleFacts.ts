/**
 * THE COMPUTED CYCLE, AS PLAIN FACTS (contract row 14): the cycle high with its
 * date, how far the last close is below it, and the earlier runs, all measured
 * from daily bars (`lib/market/cycle.ts`), not judged by a model. Shown beside
 * the model's own cycle block under their own labels. The "Former runner" label
 * is NOT touched here: it keeps its present computed meaning (his ruling
 * 2026-10-06T00:38:58Z).
 *
 * UNITS: `advancePct` and `givebackPct` are FRACTIONS (0.53 is 53%), scaled here
 * in one place; the cycle tooltip once printed one unscaled.
 *
 * THE LIST AND THE NUMBER CANNOT DISAGREE: `resolveCycleHistory` counts the
 * CURRENT cycle toward its largest advance when it is over (BACKSIDE or SHADOW)
 * but lists completed cycles only, so when the current run counts it is the
 * list's first line; otherwise the list is the completed runs alone, and the
 * empty sentence appears only when the list really is empty.
 *
 * AS-OF IS A DATE, NEVER "TODAY": the bars are settled sessions (the latest is
 * not today before 20:00 ET and is today after it), so every figure carries the
 * date of the last bar it was computed from.
 *
 * Words: Marketing's (drawer-rows-words-2026-10-05.md at a9c33f0e,
 * drawer-rows-18-13-24-words-2026-10-06.md at 0e1e90e7). None is owed.
 */

import { CYCLE_PHASE_LABEL, cycleDetail } from '@/lib/dashboard/cycle';
import { longDate } from '@/lib/dashboard/floatBound';
import { formatPrice } from '@/lib/format';
import { CYCLE_START_MOVE_PCT, CYCLE_START_RVOL, type CycleArc, type CycleHistory } from '@/lib/market/cycle';

export const CYCLE_WORDS = {
  noEarlierRun: 'No earlier run in the history we hold.',
  /** A dossier with no computed history (fewer than two daily bars): Marketing's "unknown" string. */
  noHistory: 'Cannot tell: not enough daily history.',
  /** Bars were read and no run has started in them. */
  noRun: 'No current run in the history we hold.',
  /** The computed phase and its arithmetic (row 13). */
  phaseLabel: 'Phase',
  phaseHover:
    "The desk's reading of where the current run stands, computed from daily bars. It describes the move so far and is not a forecast.",
  measureLabel: 'How it is measured',
  /**
   * The prefix for the current run when it counts toward the largest advance (BACKSIDE or SHADOW).
   * Not "over": those are the desk's classifications, and "high was N sessions ago" shows the rest.
   */
  currentPrefix: 'Current run: ',
  /** A run whose start and high are the same stored day; states the two dates, no market fact (Commercial 10, abfe773a). */
  oneDayRun: 'start and high on the same day',
  /** Hover on the current-run line; true of BACKSIDE and SHADOW (a SHADOW run need not have given anything back). */
  currentHover:
    "Listed because the desk's cycle reading has this run ended: it gave back a large share of its advance, or trading in it went quiet.",
} as const;

export type CycleFactsState = 'PRODUCED' | 'UNKNOWN' | 'NOT_YET';

export interface CycleFacts {
  state: CycleFactsState;
  /** The state's own sentence when there is no current run to describe. */
  message: string | null;
  /** The computed phase, in the board's own cycle words (row 13). */
  phase: string | null;
  /** The arithmetic behind the phase, the line the cycle badge hover carries (row 13). */
  measure: string | null;
  cycleHigh: { text: string; hover: string } | null;
  flush: { text: string } | null;
  /** `currentHover` is the first line's own hover, set only when that line is the current run. */
  runs: { lines: string[]; empty: string | null; hover: string; currentHover: string | null };
}

const sessions = (n: number) => `${n} session${n === 1 ? '' : 's'}`;
const pct0 = (fraction: number) => `${(fraction * 100).toFixed(0)}%`;

function runLine(start: string, high: string, advanceFraction: number, sessionsAgo: number): string {
  const when = sessionsAgo === 0 ? 'high was the latest session' : `high was ${sessions(sessionsAgo)} ago`;
  // A one-day run (start and high stored as the same day) collapses to one date (Commercial 10, abfe773a).
  const span =
    start === high
      ? `${longDate(start) ?? start}, ${CYCLE_WORDS.oneDayRun}`
      : `${longDate(start) ?? start} to ${longDate(high) ?? high}`;
  return `${span}: up ${pct0(advanceFraction)} from the base close to the high, ${when}`;
}

const RUNS_HOVER = `A run starts on a day the stock rose at least ${CYCLE_START_MOVE_PCT * 100}% on at least ${CYCLE_START_RVOL} times its usual volume.`;

export function cycleFacts(history: CycleHistory | null | undefined): CycleFacts {
  const emptyRuns = { lines: [], empty: CYCLE_WORDS.noEarlierRun, hover: RUNS_HOVER, currentHover: null };
  if (!history) {
    return { state: 'NOT_YET', message: CYCLE_WORDS.noHistory, phase: null, measure: null, cycleHigh: null, flush: null, runs: emptyRuns };
  }

  const prior = history.priorCycles.map((cycle) => runLine(cycle.startDate, cycle.highDate, cycle.advancePct, cycle.sessionsAgo));

  if (history.current.phase === 'NO_CYCLE') {
    return {
      state: 'UNKNOWN',
      message: CYCLE_WORDS.noRun,
      phase: null,
      measure: null,
      cycleHigh: null,
      flush: null,
      runs: { lines: prior, empty: prior.length === 0 ? CYCLE_WORDS.noEarlierRun : null, hover: RUNS_HOVER, currentHover: null },
    };
  }

  const arc: CycleArc = history.current;
  const asOf = longDate(arc.latestDate) ?? arc.latestDate;
  // The current run is listed first only when it counts toward the largest advance (it is over).
  const countsCurrent = arc.phase === 'BACKSIDE' || arc.phase === 'SHADOW';
  const lines = countsCurrent
    ? [CYCLE_WORDS.currentPrefix + runLine(arc.startDate, arc.cycleHighDate, arc.advancePct, arc.sessionsSinceHigh), ...prior]
    : prior;

  return {
    state: 'PRODUCED',
    message: null,
    phase: CYCLE_PHASE_LABEL[arc.phase],
    measure: cycleDetail(arc),
    cycleHigh: {
      text: `$${formatPrice(arc.cycleHigh)}, ${longDate(arc.cycleHighDate) ?? arc.cycleHighDate}`,
      // The last sentence of Marketing's hover ("Today's trading is not included") is held out:
      // it is false after 20:00 ET, when the latest settled bar is today's. Asked of Marketing.
      hover: `Highest price since the current run began, from daily bars through ${asOf}'s close.`,
    },
    flush: { text: `${(arc.givebackPct * 100).toFixed(1)}% below the cycle high, at ${asOf}'s close` },
    runs: {
      lines,
      empty: lines.length === 0 ? CYCLE_WORDS.noEarlierRun : null,
      hover: RUNS_HOVER,
      currentHover: countsCurrent ? CYCLE_WORDS.currentHover : null,
    },
  };
}
