import { describe, expect, it } from 'vitest';

import { sessionExpiry } from '@/lib/auth/expiry';

/*
 * His ruling is a boundary, not a duration: "a session should persist all day
 * until the close of after hours." So what these tests pin is that every
 * session created on one ET day ends at the same instant, and that the instant
 * is 20:00 ET -- which is a different number of UTC hours depending on the time
 * of year.
 */
describe('the after-hours boundary', () => {
  it('expires at 20:00 EDT in summer, which is 00:00Z the next day', () => {
    const expiry = sessionExpiry(new Date('2026-09-10T08:00:00.000Z')); // 04:00 ET
    expect(expiry.etDate).toBe('2026-09-10');
    expect(expiry.expiresAt.toISOString()).toBe('2026-09-11T00:00:00.000Z');
  });

  /*
   * THE SAME WALL-CLOCK TIME, FIVE HOURS OFF UTC INSTEAD OF FOUR. An expiry
   * computed as a fixed offset would be an hour wrong for four months of the
   * year, and wrong in the direction of ending a session early.
   */
  it('expires at 20:00 EST in winter, which is 01:00Z the next day', () => {
    const expiry = sessionExpiry(new Date('2026-01-15T09:00:00.000Z')); // 04:00 ET
    expect(expiry.etDate).toBe('2026-01-15');
    expect(expiry.expiresAt.toISOString()).toBe('2026-01-16T01:00:00.000Z');
  });

  it('gives a late sign-in the remainder of the day and nothing more', () => {
    const early = sessionExpiry(new Date('2026-09-10T08:00:00.000Z')); // 04:00 ET
    const late = sessionExpiry(new Date('2026-09-10T23:00:00.000Z')); // 19:00 ET

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
    const expiry = sessionExpiry(now);

    expect(expiry.etDate).toBe('2026-09-11');
    expect(expiry.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(expiry.expiresAt.toISOString()).toBe('2026-09-12T00:00:00.000Z');
  });

  it('never returns an expiry in the past, at any hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const now = new Date(Date.UTC(2026, 8, 10, hour, 30));
      expect(sessionExpiry(now).expiresAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  /*
   * The roll steps the DATE STRING rather than adding 24 hours to an instant,
   * because a day is not always 24 hours in a zone that observes DST. This is
   * the month boundary; the DST days are the other half of that argument.
   */
  it('rolls across a month boundary', () => {
    const expiry = sessionExpiry(new Date('2026-10-01T02:00:00.000Z')); // 22:00 ET, 30 Sep
    expect(expiry.etDate).toBe('2026-10-01');
  });
});

describe('days the market does not open', () => {
  /*
   * One rule every day, with no branch on whether the market opened. A branch
   * is the thing that gets the edge case wrong, and whether a Saturday is a
   * charged day is a pricing question rather than a technical one.
   */
  it('treats a Saturday like any other calendar day', () => {
    const saturday = new Date('2026-09-12T14:00:00.000Z'); // 10:00 ET, a Saturday
    const expiry = sessionExpiry(saturday);

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
    const morning = sessionExpiry(new Date('2026-09-10T08:30:00.000Z')); // 04:30 ET
    const afternoon = sessionExpiry(new Date('2026-09-10T18:45:00.000Z')); // 14:45 ET

    expect(morning.etDate).toBe(afternoon.etDate);
    expect(morning.expiresAt.toISOString()).toBe(afternoon.expiresAt.toISOString());
  });
});
