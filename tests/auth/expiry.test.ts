import { describe, expect, it, vi } from 'vitest';

import {
  CALENDAR_DAYS,
  calendarDayOf,
  capLog,
  marketDayBefore,
  marketMonthsFor,
  sessionExpiry,
  marketDaysOrFallback,
  sessionDatesCalendar,
  withDeadline,
  type MarketDays,
} from '@/lib/auth/expiry';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

/*
 * His ruling is a boundary, not a duration: "a session should persist all day
 * until the close of after hours." So what these tests pin is that every
 * session created on one ET day ends at the same instant, and that the instant
 * is 20:00 ET -- which is a different number of UTC hours depending on the time
 * of year.
 */
describe('the after-hours boundary', () => {
  it('expires at 20:00 EDT in summer, which is 00:00Z the next day', () => {
    const expiry = sessionExpiry(new Date('2026-09-10T08:00:00.000Z'), CALENDAR_DAYS); // 04:00 ET
    expect(expiry.etDate).toBe('2026-09-10');
    expect(expiry.expiresAt.toISOString()).toBe('2026-09-11T00:00:00.000Z');
  });

  /*
   * THE SAME WALL-CLOCK TIME, FIVE HOURS OFF UTC INSTEAD OF FOUR. An expiry
   * computed as a fixed offset would be an hour wrong for four months of the
   * year, and wrong in the direction of ending a session early.
   */
  it('expires at 20:00 EST in winter, which is 01:00Z the next day', () => {
    const expiry = sessionExpiry(new Date('2026-01-15T09:00:00.000Z'), CALENDAR_DAYS); // 04:00 ET
    expect(expiry.etDate).toBe('2026-01-15');
    expect(expiry.expiresAt.toISOString()).toBe('2026-01-16T01:00:00.000Z');
  });

  it('gives a late sign-in the remainder of the day and nothing more', () => {
    const early = sessionExpiry(new Date('2026-09-10T08:00:00.000Z'), CALENDAR_DAYS); // 04:00 ET
    const late = sessionExpiry(new Date('2026-09-10T23:00:00.000Z'), CALENDAR_DAYS); // 19:00 ET

    expect(late.expiresAt.toISOString()).toBe(early.expiresAt.toISOString());
    expect(late.etDate).toBe(early.etDate);
  });
});

describe('after the close has already passed', () => {
  /*
   * Between 20:00 ET and midnight, today's boundary is behind us. Computing it
   * anyway would issue an already-expired session: signing in and being signed
   * out in the same instant, with the sign-in appearing to have worked.
   */
  it('rolls to the next day rather than issuing a dead session', () => {
    const now = new Date('2026-09-11T01:00:00.000Z'); // 21:00 ET on the 10th
    const expiry = sessionExpiry(now, CALENDAR_DAYS);

    expect(expiry.etDate).toBe('2026-09-11');
    expect(expiry.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(expiry.expiresAt.toISOString()).toBe('2026-09-12T00:00:00.000Z');
  });

  it('never returns an expiry in the past, at any hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const now = new Date(Date.UTC(2026, 8, 10, hour, 30));
      expect(sessionExpiry(now, CALENDAR_DAYS).expiresAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  /*
   * The roll steps the DATE STRING rather than adding 24 hours to an instant,
   * because a day is not always 24 hours in a zone that observes DST. This is
   * the month boundary; the DST days are the other half of that argument.
   */
  it('rolls across a month boundary', () => {
    const expiry = sessionExpiry(new Date('2026-10-01T02:00:00.000Z'), CALENDAR_DAYS); // 22:00 ET, 30 Sep
    expect(expiry.etDate).toBe('2026-10-01');
  });
});

describe('the calendar-day rule (the fallback when the calendar cannot be read)', () => {
  /*
   * CALENDAR_DAYS is the rule before the fold, kept as the sign-in fallback
   * (Integration's ruling, 2026-10-17): a Saturday session ends Saturday 20:00.
   */
  it('treats a Saturday like any other calendar day', () => {
    const saturday = new Date('2026-09-12T14:00:00.000Z'); // 10:00 ET, a Saturday
    const expiry = sessionExpiry(saturday, CALENDAR_DAYS);

    expect(expiry.etDate).toBe('2026-09-12');
    expect(expiry.expiresAt.toISOString()).toBe('2026-09-13T00:00:00.000Z');
  });
});

describe('the billing property', () => {
  /*
   * "Each day the product is used is charged" only counts if every session on
   * one day agrees on which day it was. Two sign-ins ten hours apart must carry
   * the same et_date and the same expiry.
   */
  it('gives every session created on one ET day the same date and boundary', () => {
    const morning = sessionExpiry(new Date('2026-09-10T08:30:00.000Z'), CALENDAR_DAYS); // 04:30 ET
    const afternoon = sessionExpiry(new Date('2026-09-10T18:45:00.000Z'), CALENDAR_DAYS); // 14:45 ET

    expect(morning.etDate).toBe(afternoon.etDate);
    expect(morning.expiresAt.toISOString()).toBe(afternoon.expiresAt.toISOString());
  });
});

/*
 * THE FOLD. His ruling, 2026-10-17: the time after the close "is a benefit to the
 * following day ... and that would include a non market day." A sign-in belongs
 * to the next market day and runs to its 20:00 ET.
 */
describe('the paid day is the next market day', () => {
  const at = (iso: string) => sessionExpiry(new Date(iso), MARKET_DAYS);

  it('a weekday before 20:00 ET is its own day', () => {
    expect(at('2026-10-20T14:00:00.000Z').etDate).toBe('2026-10-20'); // Tue 10:00 ET
  });

  it('Friday after 20:00, Saturday, and Sunday all belong to Monday, ending Mon 20:00 ET', () => {
    for (const iso of [
      '2026-10-24T01:00:00.000Z', // Fri 21:00 ET
      '2026-10-24T18:00:00.000Z', // Sat 14:00 ET
      '2026-10-25T14:00:00.000Z', // Sun 10:00 ET
      '2026-10-26T01:00:00.000Z', // Sun 21:00 ET
    ]) {
      const expiry = at(iso);
      expect(expiry.etDate, iso).toBe('2026-10-26');
      expect(expiry.expiresAt.toISOString(), iso).toBe('2026-10-27T00:00:00.000Z');
    }
  });

  it('Friday before 20:00 is still Friday', () => {
    expect(at('2026-10-23T23:59:00.000Z').etDate).toBe('2026-10-23'); // Fri 19:59 ET
  });

  it('a holiday belongs to the next market day: Thanksgiving folds into Friday', () => {
    expect(at('2026-11-26T02:00:00.000Z').etDate).toBe('2026-11-27'); // Wed 21:00 ET
    expect(at('2026-11-26T17:00:00.000Z').etDate).toBe('2026-11-27'); // Thu 12:00 ET
  });

  it('a long weekend across a month and a DST change ends on the market day in its own offset', () => {
    // Sat 2026-10-31 (EDT) folds into Mon 2026-11-02, after the change to EST.
    const expiry = at('2026-10-31T16:00:00.000Z');
    expect(expiry.etDate).toBe('2026-11-02');
    expect(expiry.expiresAt.toISOString()).toBe('2026-11-03T01:00:00.000Z');
  });

  it('New Year: Thu 2026-12-31 after 20:00 runs to Mon 2027-01-04', () => {
    expect(at('2027-01-01T02:00:00.000Z').etDate).toBe('2027-01-04');
  });

  it('never returns an expiry in the past, at any hour of any day of a week', () => {
    for (let hour = 0; hour < 24 * 7; hour += 1) {
      const now = new Date(Date.UTC(2026, 9, 19, hour, 30));
      expect(sessionExpiry(now, MARKET_DAYS).expiresAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('every sign-in from Fri 20:00 to Mon 20:00 gets the same date and boundary', () => {
    const first = at('2026-10-24T00:01:00.000Z'); // Fri 20:01 ET
    const last = at('2026-10-26T23:59:00.000Z'); // Mon 19:59 ET
    expect(first).toEqual(last);
  });

  it('the day before Monday is Friday', () => {
    expect(marketDayBefore('2026-10-26', MARKET_DAYS)).toBe('2026-10-23');
    expect(marketDayBefore('2026-11-27', MARKET_DAYS)).toBe('2026-11-25');
  });
});

describe('the calendar at sign-in', () => {
  const NOW = new Date('2026-10-24T18:00:00.000Z'); // Sat 14:00 ET

  it('asks for the month before, the month and the month after', () => {
    expect(marketMonthsFor(NOW)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(marketMonthsFor(new Date('2027-01-01T02:00:00.000Z'))).toEqual(['2026-12', '2027-01', '2027-02']);
  });

  // Every weekday from 2026-09-01 to 2026-11-30 (MARKET_DAYS), as the market worker caches it.
  const sessionsThrough = (last: string) => {
    const out: string[] = [];
    for (let d = new Date('2026-09-01T12:00:00Z'); d.toISOString().slice(0, 10) <= last; d = new Date(d.getTime() + 86_400_000)) {
      const day = d.toISOString().slice(0, 10);
      if (MARKET_DAYS(day)) out.push(day);
    }
    return out;
  };
  const never = () => new Promise<MarketDays>(() => {});

  it('uses the cached calendar when it covers the paid day, with no network call', async () => {
    const lines: string[] = [];
    const load = vi.fn(async () => MARKET_DAYS);
    const days = await marketDaysOrFallback(NOW, { cached: () => sessionDatesCalendar(sessionsThrough('2026-11-30')), load }, (l) => lines.push(l));
    expect(sessionExpiry(NOW, days).etDate).toBe('2026-10-26');
    expect(load).not.toHaveBeenCalled();
    expect(lines).toEqual([]);
  });

  /*
   * Integration's ruling: the cache can be stale with no marker, so it answers
   * only if it holds a session STRICTLY after the date needed. Ending ON Monday
   * is not proof that it reaches past Monday.
   */
  it('falls through to the network when the cache ends on the paid day itself, and says why', async () => {
    const lines: string[] = [];
    const load = vi.fn(async () => MARKET_DAYS);
    const days = await marketDaysOrFallback(NOW, { cached: () => sessionDatesCalendar(sessionsThrough('2026-10-26')), load }, (l) => lines.push(l));
    expect(load).toHaveBeenCalledTimes(1);
    expect(sessionExpiry(NOW, days).etDate).toBe('2026-10-26');
    expect(lines).toEqual([
      '[paid day] cached calendar not used (the cached calendar (2026-09-01 to 2026-10-26) does not cover 2026-10-26): network calendar used',
    ]);
  });

  it('falls through when there is no cached calendar', async () => {
    const load = vi.fn(async () => MARKET_DAYS);
    expect(await marketDaysOrFallback(NOW, { cached: () => null, load }, () => {})).toBe(MARKET_DAYS);
    expect(load).toHaveBeenCalledTimes(1);
  });

  /*
   * Integration's ruling: calendar unreadable at sign-in -> the calendar day,
   * logged with the cause. The sign-in is never refused for it.
   */
  it('falls back to the calendar day, and logs each cause, when both fail', async () => {
    const lines: string[] = [];
    const days = await marketDaysOrFallback(
      NOW,
      {
        cached: () => sessionDatesCalendar(sessionsThrough('2026-10-20')),
        load: async () => {
          throw new Error('alpaca 503');
        },
      },
      (l) => lines.push(l),
    );
    expect(sessionExpiry(NOW, days).etDate).toBe('2026-10-24');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/calendar unreadable \(the cached calendar .* does not cover 2026-10-24; alpaca 503\)/);
  });

  it('falls back when there is no calendar at all', async () => {
    const lines: string[] = [];
    const days = await marketDaysOrFallback(NOW, { load: null }, (l) => lines.push(l));
    expect(days).toBe(CALENDAR_DAYS);
    expect(lines).toHaveLength(1);
  });

  it('falls back when the calendar loads but has no market day near this sign-in', async () => {
    const lines: string[] = [];
    const empty: MarketDays = () => false;
    const days = await marketDaysOrFallback(NOW, { load: async () => empty }, (l) => lines.push(l));
    expect(days).toBe(CALENDAR_DAYS);
    expect(lines).toHaveLength(1);
  });

  /*
   * Ops's blocker: the Alpaca client has no timeout, so a stalled calendar must
   * not hold a sign-in. A load that never answers falls back at the deadline.
   */
  it('falls back at the deadline when the network calendar never answers', async () => {
    const lines: string[] = [];
    const started = Date.now();
    const days = await marketDaysOrFallback(NOW, { load: never }, (l) => lines.push(l), 50);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(days).toBe(CALENDAR_DAYS);
    expect(lines).toEqual([
      '[paid day] market calendar unreadable (market calendar: no answer in 50 ms): falling back to the calendar day',
    ]);
  });

  it('a network calendar that answers inside the deadline is used, and nothing is logged', async () => {
    const lines: string[] = [];
    const quick = () => new Promise<MarketDays>((resolve) => setTimeout(() => resolve(MARKET_DAYS), 10));
    expect(await marketDaysOrFallback(NOW, { load: quick }, (l) => lines.push(l), 500)).toBe(MARKET_DAYS);
    expect(lines).toEqual([]);
  });

  it('the cached calendar answers only strictly inside its own range', () => {
    const cal = sessionDatesCalendar(['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-26']);
    expect(cal('2026-10-20')).toBe(true);
    expect(cal('2026-10-21')).toBe(false);
    expect(() => cal('2026-10-19')).toThrow(/does not cover/);
    expect(() => cal('2026-10-26')).toThrow(/does not cover/);
    expect(() => cal('2026-10-27')).toThrow(/does not cover/);
    expect(() => sessionDatesCalendar([])('2026-10-20')).toThrow(/empty/);
  });

  /*
   * Ops, 2026-10-17: the fallback line must not repeat once per desk poll.
   */
  it('capLog writes each distinct line at most once per window', () => {
    let now = 0;
    const lines: string[] = [];
    const log = capLog((l) => lines.push(l), 3_600_000, () => now);
    log('a');
    log('a');
    now = 3_599_999;
    log('a');
    log('b');
    now = 3_600_000;
    log('a');
    expect(lines).toEqual(['a', 'b', 'a']);
  });

  it('the default paid-day log is capped: the same fallback twice writes one line', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const sources = { load: async (): Promise<MarketDays> => { throw new Error('cap probe'); } };
      await marketDaysOrFallback(NOW, sources);
      await marketDaysOrFallback(NOW, sources);
      expect(spy.mock.calls.filter((c) => String(c[0]).includes('cap probe'))).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('capLog remembers a bounded number of lines and never holds back a new one', () => {
    const lines: string[] = [];
    const log = capLog((l) => lines.push(l), 3_600_000, () => 0, 2);
    for (const l of ['a', 'b', 'c', 'c', 'a']) log(l);
    // 'c' pushed 'a' out of the memory of two, so 'a' is written again; the repeat of 'c' is not.
    expect(lines).toEqual(['a', 'b', 'c', 'a']);
  });

  it('withDeadline rejects at the deadline and passes an early answer through', async () => {
    await expect(withDeadline(never(), 20, 'x')).rejects.toThrow('x: no answer in 20 ms');
    await expect(withDeadline(Promise.resolve(7), 20, 'x')).resolves.toBe(7);
  });

  it('the calendar day itself rolls at 20:00 ET', () => {
    expect(calendarDayOf(new Date('2026-10-24T23:59:00.000Z'))).toBe('2026-10-24');
    expect(calendarDayOf(new Date('2026-10-25T00:00:00.000Z'))).toBe('2026-10-25');
  });
});
