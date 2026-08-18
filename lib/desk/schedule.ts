/**
 * The desk assessment schedule.
 *
 * These checkpoints are not new. They are the reassessment times the trader
 * already worked to in the spreadsheet, moved out of habit and into the
 * application so they happen whether or not anyone remembers them:
 *
 *   22:00  NEXT_DAY_RECAP          the completed after-hours session plus
 *                                  everything published since, and what it
 *                                  means for the next trading day
 *   06:10  STRUCTURAL_REFRESH      filings, offerings, dilution, structure
 *   06:25  PREMARKET_0625          first formal premarket market assessment
 *   06:45  PREMARKET_0645          momentum reassessment
 *   07:00  PREMARKET_0700          late movers
 *   09:25  OPEN_SPIKE_ASSESSMENT   final pre-open state (EXPERIMENTAL ordering)
 *   10:00–15:30 every 30 minutes   RTH_INTERVAL
 *   close  RTH_CLOSE               freeze the regular session, start AH
 *
 * Everything is expressed in ET wall-clock minutes and resolved to instants
 * against the market calendar, so an early close moves the last interval and
 * the close assessment with it rather than firing at a time the exchange was
 * shut.
 *
 * Between checkpoints the desk does not go quiet: market data, Discovery ranks,
 * levels, events and research all keep running. An assessment is a persisted
 * answer to "what does the desk believe matters right now, and what changed
 * since the last checkpoint" — not a polling interval.
 */

import {
  etWallClockToUtc,
  NEXT_DAY_PREP_MIN,
  RTH_END_MIN,
  sessionPhaseForMinutes,
} from '../market/session';
import type { SessionPhase } from '../market/types';

export type AssessmentType =
  | 'NEXT_DAY_RECAP'
  | 'STRUCTURAL_REFRESH'
  | 'PREMARKET_0625'
  | 'PREMARKET_0645'
  | 'PREMARKET_0700'
  | 'OPEN_SPIKE_ASSESSMENT'
  | 'RTH_INTERVAL'
  | 'RTH_CLOSE';

export interface ScheduledAssessment {
  type: AssessmentType;
  /** The session this assessment describes. */
  tradingDate: string;
  /** The session it PREPARES, when that is a different one. */
  targetTradingDate: string | null;
  /** ET minutes since midnight. */
  minutes: number;
  /** 'HH:MM' ET, the trader-facing name of the checkpoint. */
  clock: string;
  label: string;
  scheduledFor: string;
  sessionPhase: SessionPhase;
  /**
   * How long a missed run is still worth doing, as an ISO instant.
   *
   * Past this, a catch-up would be recording the present under a label that
   * claims the past. A 06:25 premarket scan caught up at 09:00 is not a 06:25
   * scan; the 06:45 one that already ran supersedes it.
   */
  relevantUntil: string;
  /**
   * High-value checkpoints get caught up after a missed window; the repeated
   * 30-minute RTH ones deliberately do not accumulate. See dueAssessments.
   */
  highValue: boolean;
}

export const RECAP_MIN = NEXT_DAY_PREP_MIN; // 22:00
export const STRUCTURAL_REFRESH_MIN = 6 * 60 + 10;
export const PREMARKET_SCAN_MINS = [6 * 60 + 25, 6 * 60 + 45, 7 * 60] as const;
export const OPEN_SPIKE_MIN = 9 * 60 + 25;
export const RTH_INTERVAL_START_MIN = 10 * 60;
export const RTH_INTERVAL_STEP_MIN = 30;

/**
 * How long after its scheduled time each checkpoint may still be caught up.
 *
 * Chosen from what supersedes what, not from a single arbitrary grace period:
 * the 06:25 scan is superseded by the 06:45 one twenty minutes later, while a
 * missed structural refresh is still the only structural pass before the open.
 */
const CATCH_UP_WINDOW_MINUTES: Record<AssessmentType, number> = {
  // Until 04:00, when the next session's premarket begins.
  NEXT_DAY_RECAP: 6 * 60,
  // Until 09:25: nothing else reassesses structure before the open.
  STRUCTURAL_REFRESH: 3 * 60 + 15,
  PREMARKET_0625: 20,
  PREMARKET_0645: 15,
  // Nothing else until 09:25, so a 07:40 start still deserves a premarket scan.
  PREMARKET_0700: 60,
  // Strictly a pre-open state. After the open there is no pre-open to record.
  OPEN_SPIKE_ASSESSMENT: 10,
  // Superseded by the next slot; missed ones do not queue up.
  RTH_INTERVAL: RTH_INTERVAL_STEP_MIN,
  // Until extended trading ends and the recap takes over.
  RTH_CLOSE: 4 * 60,
};

const LABEL: Record<AssessmentType, string> = {
  NEXT_DAY_RECAP: '22:00 recap',
  STRUCTURAL_REFRESH: 'Structural refresh',
  PREMARKET_0625: 'First market scan',
  PREMARKET_0645: 'Premarket reassessment',
  PREMARKET_0700: 'Late-mover scan',
  OPEN_SPIKE_ASSESSMENT: 'Open spike assessment',
  RTH_INTERVAL: 'RTH reassessment',
  RTH_CLOSE: 'RTH close',
};

export function assessmentLabel(type: AssessmentType): string {
  return LABEL[type];
}

function clockOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function entry(options: {
  type: AssessmentType;
  tradingDate: string;
  minutes: number;
  closeMinutes: number;
  targetTradingDate?: string | null;
}): ScheduledAssessment {
  const { type, tradingDate, minutes, closeMinutes } = options;
  const scheduledFor = etWallClockToUtc(tradingDate, 0, minutes);
  const relevantUntil = new Date(
    scheduledFor.getTime() + CATCH_UP_WINDOW_MINUTES[type] * 60_000,
  );

  return {
    type,
    tradingDate,
    targetTradingDate: options.targetTradingDate ?? null,
    minutes,
    clock: clockOf(minutes),
    label: LABEL[type],
    scheduledFor: scheduledFor.toISOString(),
    // The RTH close belongs to the session that is ending, not to the evening
    // that starts one second later.
    sessionPhase:
      type === 'RTH_CLOSE' ? 'RTH' : sessionPhaseForMinutes(minutes, closeMinutes),
    relevantUntil: relevantUntil.toISOString(),
    highValue: type !== 'RTH_INTERVAL',
  };
}

export interface BuildScheduleOptions {
  tradingDate: string;
  /** The exchange's regular close in ET minutes; 16:00 on a normal session. */
  closeMinutes?: number;
  /** The next scheduled session, for the recap's target date. */
  nextTradingDate?: string | null;
}

/**
 * The full day's checkpoints, in time order.
 *
 * There is deliberately no 09:30 assessment: 09:25 is the pre-open checkpoint,
 * and a second one five minutes later would record the same state twice under
 * two names.
 */
export function buildSchedule(options: BuildScheduleOptions): ScheduledAssessment[] {
  const { tradingDate } = options;
  const closeMinutes = options.closeMinutes ?? RTH_END_MIN;

  const make = (type: AssessmentType, minutes: number, target?: string | null) =>
    entry({ type, tradingDate, minutes, closeMinutes, targetTradingDate: target });

  const schedule: ScheduledAssessment[] = [
    make('STRUCTURAL_REFRESH', STRUCTURAL_REFRESH_MIN),
    make('PREMARKET_0625', PREMARKET_SCAN_MINS[0]),
    make('PREMARKET_0645', PREMARKET_SCAN_MINS[1]),
    make('PREMARKET_0700', PREMARKET_SCAN_MINS[2]),
    make('OPEN_SPIKE_ASSESSMENT', OPEN_SPIKE_MIN),
  ];

  // Every half hour from 10:00, stopping before the actual close. On an early
  // close the last interval is whatever slot still fits inside the session.
  for (
    let minutes = RTH_INTERVAL_START_MIN;
    minutes < closeMinutes;
    minutes += RTH_INTERVAL_STEP_MIN
  ) {
    schedule.push(make('RTH_INTERVAL', minutes));
  }

  schedule.push(make('RTH_CLOSE', closeMinutes));
  schedule.push(make('NEXT_DAY_RECAP', RECAP_MIN, options.nextTradingDate ?? null));

  return schedule.sort((a, b) => a.minutes - b.minutes);
}

export interface DueAssessment {
  scheduled: ScheduledAssessment;
  /** True when this is running after its scheduled time. */
  generatedLate: boolean;
  lateBySeconds: number;
  /**
   * Scheduled slots of the same type that were skipped entirely.
   *
   * Recorded rather than manufactured. A desk that was off from 10:00 to 14:00
   * did not observe eleven checkpoints, and inventing eleven snapshots out of
   * 14:00 data would be fabricating a history that never happened.
   */
  missed: ScheduledAssessment[];
}

/**
 * What should run now.
 *
 * The rule is the same for every type: a checkpoint is due when its time has
 * passed, it has not already been recorded, and it is still within its
 * catch-up window. Anything older than that is reported as missed and not
 * generated, because the value of a snapshot is that it recorded a moment.
 */
export function dueAssessments(options: {
  schedule: readonly ScheduledAssessment[];
  now: Date;
  /** `${type}@${scheduledFor}` for every assessment already on file. */
  completed: ReadonlySet<string>;
  /** Grace after the scheduled instant before a run counts as late. */
  lateAfterSeconds?: number;
}): DueAssessment[] {
  const nowMs = options.now.getTime();
  const lateAfter = (options.lateAfterSeconds ?? 90) * 1000;

  const outstanding = options.schedule.filter(
    (item) =>
      Date.parse(item.scheduledFor) <= nowMs && !options.completed.has(slotKey(item)),
  );

  const due: DueAssessment[] = [];
  const missedByType = new Map<AssessmentType, ScheduledAssessment[]>();

  for (const item of outstanding) {
    if (nowMs > Date.parse(item.relevantUntil)) {
      const list = missedByType.get(item.type) ?? [];
      list.push(item);
      missedByType.set(item.type, list);
      continue;
    }

    const lateBy = nowMs - Date.parse(item.scheduledFor);
    due.push({
      scheduled: item,
      generatedLate: lateBy > lateAfter,
      lateBySeconds: Math.round(lateBy / 1000),
      missed: [],
    });
  }

  /*
   * Missed slots attach to the run that follows them.
   *
   * A desk that comes back at 14:05 performs ONE current assessment and
   * carries the record of the intervals it was absent for, so the gap is
   * visible in the history instead of being silently closed.
   */
  for (const item of due) {
    item.missed = (missedByType.get(item.scheduled.type) ?? []).filter(
      (missed) => Date.parse(missed.scheduledFor) < Date.parse(item.scheduled.scheduledFor),
    );
  }

  return due.sort((a, b) => a.scheduled.minutes - b.scheduled.minutes);
}

/** Stable identity of one scheduled slot. Matches the store's unique index. */
export function slotKey(item: Pick<ScheduledAssessment, 'type' | 'scheduledFor'>): string {
  return `${item.type}@${item.scheduledFor}`;
}

/** The next checkpoint after `now`, for the header's "next" line. */
export function nextAssessment(
  schedule: readonly ScheduledAssessment[],
  now: Date,
): ScheduledAssessment | null {
  const nowMs = now.getTime();
  return schedule.find((item) => Date.parse(item.scheduledFor) > nowMs) ?? null;
}
