/**
 * The assessment schedule, including the awkward parts: early closes, the
 * Friday recap, and what a desk that was switched off should and should not
 * pretend to have observed.
 */

import { describe, expect, it } from 'vitest';

import {
  buildSchedule,
  dueAssessments,
  nextAssessment,
  slotKey,
  type AssessmentType,
} from '@/lib/desk/schedule';
import { etWallClockToUtc } from '@/lib/market/session';

const MONDAY = '2026-08-17';

function scheduleFor(tradingDate = MONDAY, closeMinutes?: number, nextTradingDate?: string) {
  return buildSchedule({ tradingDate, closeMinutes, nextTradingDate });
}

function at(clock: string, tradingDate = MONDAY): Date {
  const [hour, minute] = clock.split(':').map(Number);
  return etWallClockToUtc(tradingDate, hour, minute);
}

function typesAt(clock: string): AssessmentType[] {
  return scheduleFor()
    .filter((item) => item.clock === clock)
    .map((item) => item.type);
}

describe('the standard schedule (requirements 17–26)', () => {
  it('places every historical spreadsheet checkpoint', () => {
    expect(typesAt('22:00')).toEqual(['NEXT_DAY_RECAP']);
    expect(typesAt('06:10')).toEqual(['STRUCTURAL_REFRESH']);
    expect(typesAt('06:25')).toEqual(['PREMARKET_0625']);
    expect(typesAt('06:45')).toEqual(['PREMARKET_0645']);
    expect(typesAt('07:00')).toEqual(['PREMARKET_0700']);
    expect(typesAt('09:25')).toEqual(['OPEN_SPIKE_ASSESSMENT']);
    expect(typesAt('16:00')).toEqual(['RTH_CLOSE']);
  });

  it('places the after-hours close at 20:05, high value, in the post-market phase (v28)', () => {
    expect(typesAt('20:05')).toEqual(['AFTER_HOURS_CLOSE']);
    const item = scheduleFor().find((entry) => entry.type === 'AFTER_HOURS_CLOSE');
    expect(item?.highValue).toBe(true);
    expect(item?.sessionPhase).toBe('POST_MARKET');
  });

  it('runs every 30 minutes from 10:00 to 15:30 and no further', () => {
    const intervals = scheduleFor()
      .filter((item) => item.type === 'RTH_INTERVAL')
      .map((item) => item.clock);

    expect(intervals).toEqual([
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
    ]);
  });

  it('does not schedule a redundant 09:30 assessment', () => {
    // 09:25 is the pre-open checkpoint; a second one five minutes later would
    // record the same state twice under two names.
    expect(typesAt('09:30')).toEqual([]);
  });

  it('stops at the exchange’s actual close on an early-close day', () => {
    const early = scheduleFor(MONDAY, 13 * 60);
    const intervals = early
      .filter((item) => item.type === 'RTH_INTERVAL')
      .map((item) => item.clock);

    expect(intervals).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00', '12:30']);
    expect(early.find((item) => item.type === 'RTH_CLOSE')?.clock).toBe('13:00');
    // And the interval that would have collided with the close is not doubled.
    expect(early.filter((item) => item.clock === '13:00')).toHaveLength(1);
  });

  it('carries the next trading date on the recap, from the calendar', () => {
    // Friday's 22:00 recap prepares Monday, not Saturday.
    const friday = buildSchedule({
      tradingDate: '2026-08-21',
      nextTradingDate: '2026-08-24',
    });
    const recap = friday.find((item) => item.type === 'NEXT_DAY_RECAP');

    expect(recap?.targetTradingDate).toBe('2026-08-24');
    expect(recap?.tradingDate).toBe('2026-08-21');
  });

  it('labels the close assessment as belonging to the regular session', () => {
    const close = scheduleFor().find((item) => item.type === 'RTH_CLOSE');
    expect(close?.sessionPhase).toBe('RTH');
  });
});

describe('what is due (requirement 27)', () => {
  const schedule = scheduleFor();

  it('fires a checkpoint once and never again', () => {
    const now = at('10:00');
    const first = dueAssessments({ schedule, now, completed: new Set() });
    const tenOClock = first.find((item) => item.scheduled.clock === '10:00');
    expect(tenOClock).toBeDefined();
    expect(tenOClock?.generatedLate).toBe(false);

    // Once recorded, a restart at the same instant produces nothing.
    const completed = new Set(first.map((item) => slotKey(item.scheduled)));
    const second = dueAssessments({ schedule, now, completed });
    expect(second).toHaveLength(0);
  });

  it('marks a catch-up run as generated late rather than pretending it was on time', () => {
    const due = dueAssessments({ schedule, now: at('10:07'), completed: new Set() });
    const tenOClock = due.find((item) => item.scheduled.clock === '10:00');

    expect(tenOClock?.generatedLate).toBe(true);
    expect(tenOClock?.lateBySeconds).toBe(7 * 60);
    // The scheduled time it claims is still 10:00; only the run was late.
    expect(tenOClock?.scheduled.scheduledFor).toBe(at('10:00').toISOString());
  });

  it('catches up a missed high-value checkpoint while it is still relevant', () => {
    // Desk starts at 06:15: the 06:10 structural refresh is still the only
    // structural pass before the open, so it runs.
    const due = dueAssessments({ schedule, now: at('06:15'), completed: new Set() });
    const structural = due.find((item) => item.scheduled.type === 'STRUCTURAL_REFRESH');

    expect(structural).toBeDefined();
    expect(structural?.generatedLate).toBe(true);
  });

  it('does not resurrect a checkpoint that a later one has superseded', () => {
    // At 07:05 the 06:25 scan is long superseded by 06:45 and 07:00.
    const due = dueAssessments({ schedule, now: at('07:05'), completed: new Set() });
    const types = due.map((item) => item.scheduled.type);

    expect(types).not.toContain('PREMARKET_0625');
    expect(types).toContain('PREMARKET_0700');
  });

  it('never manufactures a backlog of 30-minute snapshots (requirement 31)', () => {
    /*
     * Offline from before 10:00 until 14:05. Eight interval slots passed. The
     * desk performs ONE current assessment and RECORDS the gap; generating
     * eight snapshots out of 14:05 data would be inventing a history that
     * never happened.
     */
    const due = dueAssessments({ schedule, now: at('14:05'), completed: new Set() });
    const intervals = due.filter((item) => item.scheduled.type === 'RTH_INTERVAL');

    expect(intervals).toHaveLength(1);
    expect(intervals[0].scheduled.clock).toBe('14:00');
    expect(intervals[0].generatedLate).toBe(true);
    expect(intervals[0].missed.map((item) => item.clock)).toEqual([
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
    ]);
  });

  it('does not run a checkpoint whose time has not come', () => {
    const due = dueAssessments({ schedule, now: at('09:00'), completed: new Set() });
    expect(due.map((item) => item.scheduled.type)).not.toContain('OPEN_SPIKE_ASSESSMENT');
  });
});

describe('the next checkpoint', () => {
  it('is the next one after now', () => {
    const schedule = scheduleFor();
    expect(nextAssessment(schedule, at('12:17'))?.clock).toBe('12:30');
    expect(nextAssessment(schedule, at('06:18'))?.clock).toBe('06:25');
    // The after-hours session's own close comes first (v28), then the recap.
    expect(nextAssessment(schedule, at('17:15'))?.clock).toBe('20:05');
    expect(nextAssessment(schedule, at('20:30'))?.clock).toBe('22:00');
    expect(nextAssessment(schedule, at('23:00'))).toBeNull();
  });
});

/**
 * The session a recap's work is FOR.
 *
 * The research worker claims for exactly one date — `MAX(trading_date)` from
 * `ticker_session` — and that value only ever moves forward. A job not claimed
 * before the roll is unreachable permanently, with no error and no sweep.
 *
 * The 22:00 recap queued for the session it summarises, at the end of it, so
 * every job it made raced the roll. Measured on 2026-08-17: ids 41–48 queued
 * together, claimed in pairs at concurrency 2, and 47/48 were next when the
 * door shut. `NEXT_DAY_RECAP` is the only checkpoint that carries a target, and
 * queueing for tomorrow is what its name already means.
 */
describe('the recap target date', () => {
  const schedule = (nextTradingDate: string | null) =>
    buildSchedule({ tradingDate: '2026-08-21', nextTradingDate });

  it('is the only checkpoint that carries one', () => {
    /*
     * Load-bearing. The enqueue reads `targetTradingDate ?? tradingDate`, so if
     * any other checkpoint gained a target its jobs would silently move session
     * too — and a premarket scan queueing for tomorrow is a different bug from
     * the one being fixed.
     */
    const withTarget = schedule('2026-08-24').filter((item) => item.targetTradingDate !== null);

    expect(withTarget.map((item) => item.type)).toEqual(['NEXT_DAY_RECAP']);
  });

  it('skips a weekend, because it comes from the trading calendar', () => {
    // 2026-08-21 is a Friday. Tomorrow-arithmetic would target Saturday, and a
    // Saturday never becomes MAX(trading_date) — so the jobs would strand
    // exactly as they do now while the fix LOOKED correct.
    const recap = schedule('2026-08-24').find((item) => item.type === 'NEXT_DAY_RECAP');

    expect(recap?.targetTradingDate).toBe('2026-08-24');
  });

  it('is null past the end of the cached calendar, rather than guessed', () => {
    const recap = schedule(null).find((item) => item.type === 'NEXT_DAY_RECAP');

    expect(recap?.targetTradingDate).toBeNull();
  });
});
