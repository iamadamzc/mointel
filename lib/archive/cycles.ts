/**
 * Cycle phase per symbol-day, computed rather than asked.
 *
 * `lib/market/cycle.ts` resolves the cycle arithmetically from daily bars, and
 * the model's version of the same classification is being deleted — it was 46%
 * irreproducible across five draws on identical evidence and flipped frontside
 * against backside on 7.2% of versions. Nothing in this archive ever read the
 * model's cycle, so there is no migration to do; there is an opportunity.
 *
 * Unlike every other definitional change this archive has had to absorb — the
 * share count entering the evidence bundle, the Sheet prior, the interpreter's
 * own irreproducibility — this one **reaches backwards**. The inputs are daily
 * bars, daily bars are historical, and the backfill already fetches them. So
 * the whole record can carry one definition from 2026-08-17 rather than a
 * boundary with the model's noise on one side and arithmetic on the other.
 *
 * **Computed on SPLIT-ADJUSTED closes**, which is the one place this archive
 * deliberately departs from as-seen. A cycle arc spans dozens of sessions. A
 * reverse split inside that window leaves the start and the high on different
 * share bases and the advance becomes fiction — the same class of error that
 * made RCON read as a 29,811% gain before `resolveBaseline` existed. Outcomes
 * are raw because they are compared against the desk's as-seen record; a cycle
 * is a shape over time and needs one basis throughout.
 */

import { resolveCycle, type CycleBar } from '../market/cycle';
import type { ResolvedCycle } from './outcomes';

/**
 * Sessions of daily history the cycle wants behind a date.
 *
 * `dailyRvol` needs 20 for its baseline, and cycle-start detection searches
 * backwards for the most recent qualifying day, so it wants runway beyond that
 * or a genuine older start is missed and the name reads `NO_CYCLE`.
 */
export const CYCLE_MIN_SESSIONS = 21;

/**
 * The cycle as it stood at the close of `tradingDate`.
 *
 * The series is truncated at that date before resolving, which is what makes
 * this point-in-time rather than latest-state — the same symbol resolves
 * differently on different days, and a row must carry what was true then.
 * Returns null when there is not enough history to say anything, rather than a
 * `NO_CYCLE` that would be indistinguishable from a measured absence.
 */
export function cycleAsOf(
  series: readonly CycleBar[],
  tradingDate: string,
): ResolvedCycle | null {
  const upTo = series.filter((bar) => bar.tradingDate <= tradingDate);
  if (upTo.length < CYCLE_MIN_SESSIONS) return null;
  if (upTo[upTo.length - 1].tradingDate !== tradingDate) return null;

  const result = resolveCycle(upTo);
  if (result.phase === 'NO_CYCLE') {
    return {
      phase: 'NO_CYCLE',
      startDate: null,
      sessionsInCycle: null,
      sessionsSinceHigh: null,
      advancePct: null,
      retracementPct: null,
    };
  }

  return {
    phase: result.phase,
    startDate: result.startDate,
    sessionsInCycle: result.sessionsInCycle,
    sessionsSinceHigh: result.sessionsSinceHigh,
    advancePct: result.advancePct,
    retracementPct: result.retracementPct,
  };
}
