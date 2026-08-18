/**
 * Which Discovery board is active, and what it is called.
 *
 * Deliberately its own module with no server-only imports: the read model, the
 * research worker and the assessment worker must all agree on this, and a
 * disagreement is exactly the bug where the dashboard shows the after-hours
 * board while the research engine is still queueing the day's leaders.
 */

import {
  closeMinutesFromClock,
  resolveSessionPhase,
  RTH_END_MIN,
} from './session';
import type { DiscoveryBoard, SessionPhase } from './types';

export interface BoardDescriptor {
  board: DiscoveryBoard;
  /** Trader-facing name of the ranking, e.g. 'AH Participation'. */
  rankingLabel: string;
  /** The column this board ranks on in ticker_session. */
  rankColumn: 'rvol_rank' | 'ah_rank';
  /** Section title the Discovery board should carry. */
  title: string;
}

/**
 * AFTER_HOURS and POST_MARKET both rank on after-hours participation.
 *
 * Between 20:00 and 22:00 the numbers stop moving, but they are still the
 * evening's numbers. Reverting to a full-day leaderboard at 20:00 would throw
 * away the session the desk just watched, two hours before anything summarised
 * it.
 */
export function boardForPhase(phase: SessionPhase): BoardDescriptor {
  if (phase === 'AFTER_HOURS' || phase === 'POST_MARKET') {
    return {
      board: 'AFTER_HOURS',
      rankingLabel: 'AH Participation',
      rankColumn: 'ah_rank',
      title: 'After-Hours Discovery',
    };
  }

  return {
    board: 'DAILY_RVOL',
    rankingLabel: 'Daily RVOL',
    rankColumn: 'rvol_rank',
    title: 'Discovery',
  };
}

/** What the worker persists about the session, minus anything derivable. */
export interface StoredSessionFacts {
  isTradingDay?: boolean;
  rthClose?: string;
  rthCloseMinutes?: number;
}

/**
 * Resolves phase and board from the clock plus the calendar facts only the
 * market worker can know. Used by every process that is not the market worker.
 */
export function resolveActiveBoard(options: {
  now: Date;
  tradingDate: string | null;
  facts: StoredSessionFacts;
}): { phase: SessionPhase; closeMinutes: number } & BoardDescriptor {
  const { now, tradingDate, facts } = options;
  const closeMinutes =
    facts.rthCloseMinutes ??
    (facts.rthClose ? closeMinutesFromClock(facts.rthClose) : RTH_END_MIN);

  const phase = resolveSessionPhase({
    now,
    tradingDate: tradingDate || null,
    isTradingDay: facts.isTradingDay ?? Boolean(tradingDate),
    closeMinutes,
  });

  return { phase, closeMinutes, ...boardForPhase(phase) };
}
