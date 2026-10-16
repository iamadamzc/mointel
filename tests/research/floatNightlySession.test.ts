import { describe, expect, it } from 'vitest';

import { sessionDateCheck } from '@/lib/research/floatNightly';

/*
 * The nightly skips a non-trading date (his "a", Integration chat uuid 2c3c548c, 2026-10-16) before the timer is
 * turned on, reading the desk's own exchange calendar (checkpointDates.ts calendarDays): a half-day IS a session, and
 * a calendar that does not cover the date says nothing, so the run goes ahead.
 */

// The exchange calendar's shape: sessions only, a half-day with its early close.
const CALENDAR = [
  { date: '2026-10-15' },
  { date: '2026-10-16' },
  { date: '2026-10-19' },
  { date: '2026-11-25' },
  { date: '2026-11-27', close: '13:00' },
  { date: '2026-11-30' },
];

describe('sessionDateCheck', () => {
  it('a weekday on the calendar is a session', () => {
    expect(sessionDateCheck(CALENDAR, '2026-10-16')).toBe('SESSION');
  });

  it('a Saturday and a Sunday inside the calendar are not sessions', () => {
    expect(sessionDateCheck(CALENDAR, '2026-10-17')).toBe('NOT_SESSION');
    expect(sessionDateCheck(CALENDAR, '2026-10-18')).toBe('NOT_SESSION');
  });

  it('a market holiday (Thanksgiving, Thursday 2026-11-26) is not a session; the half-day after it is', () => {
    expect(sessionDateCheck(CALENDAR, '2026-11-26')).toBe('NOT_SESSION');
    expect(sessionDateCheck(CALENDAR, '2026-11-27')).toBe('SESSION');
  });

  it('a calendar that does not cover the date says nothing: empty, stale, or starting after it', () => {
    expect(sessionDateCheck([], '2026-10-17')).toBe('UNKNOWN');
    expect(sessionDateCheck(CALENDAR, '2026-12-05')).toBe('UNKNOWN'); // a Saturday past the cached range
    expect(sessionDateCheck(CALENDAR, '2026-10-10')).toBe('UNKNOWN'); // a Saturday before it
  });
});
