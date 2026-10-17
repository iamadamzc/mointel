import { describe, expect, it } from 'vitest';

import { loadTradingDays } from '@/lib/billing/calendar';
import { calendarDayOf } from '@/lib/auth/expiry';
import { TRIAL_MS, trialCalendarMonths, trialEndsAt } from '@/lib/billing/trialClock';

// NYSE sessions, Oct-Nov 2026 (Thanksgiving Thu Nov 26 closed; Fri Nov 27 open).
const OCT = ['01', '02', '05', '06', '07', '08', '09', '12', '13', '14', '15', '16', '19', '20', '21', '22', '23', '26', '27', '28', '29', '30'];
const NOV = ['02', '03', '04', '05', '06', '09', '10', '11', '12', '13', '16', '17', '18', '19', '20', '23', '24', '25', '27', '30'];
const SESSIONS = new Set([...OCT.map((d) => `2026-10-${d}`), ...NOV.map((d) => `2026-11-${d}`), '2026-12-01']);
const isTradingDay = (etDate: string) => SESSIONS.has(etDate);

describe('the trial clock: 48 hours, counted only inside paid days that end on a market day', () => {
  it('his Thursday example: starts Thu 10:00 ET, ends Mon 10:00 ET', () => {
    // 2026-10-22 is a Thursday; EDT, so 10:00 ET is 14:00Z.
    expect(trialEndsAt(new Date('2026-10-22T14:00:00Z'), isTradingDay).toISOString()).toBe('2026-10-26T14:00:00.000Z');
  });

  it('his Saturday example: nothing counts until Sun 20:00, it ends Tue 20:00 ET', () => {
    const tue20 = '2026-10-28T00:00:00.000Z';
    expect(trialEndsAt(new Date('2026-10-24T16:00:00Z'), isTradingDay).toISOString()).toBe(tue20);
    // Saturday morning, Sunday 19:59 and Friday 20:00 sharp all end at the same instant.
    expect(trialEndsAt(new Date('2026-10-24T13:00:00Z'), isTradingDay).toISOString()).toBe(tue20);
    expect(trialEndsAt(new Date('2026-10-25T23:59:00Z'), isTradingDay).toISOString()).toBe(tue20);
    expect(trialEndsAt(new Date('2026-10-24T00:00:00Z'), isTradingDay).toISOString()).toBe(tue20);
  });

  it('an exchange holiday does not count: Wed before Thanksgiving ends the next Mon 10:00 ET', () => {
    // Wed Nov 25 10:00 EST (15:00Z): 10 h Wed, Thu closed, 24 h Fri, weekend, 14 h into Mon.
    expect(trialEndsAt(new Date('2026-11-25T15:00:00Z'), isTradingDay).toISOString()).toBe('2026-11-30T15:00:00.000Z');
  });

  it('the DST switch week counts real hours: Fri Oct 30 10:00 EDT ends Tue Nov 3 10:00 EST', () => {
    // The 25-hour paid day (Sat 20:00 EDT to Sun 20:00 EST) is a Sunday and never counts.
    // Wall-clock arithmetic would give 14:00Z; real hours give 15:00Z.
    expect(trialEndsAt(new Date('2026-10-30T14:00:00Z'), isTradingDay).toISOString()).toBe('2026-11-03T15:00:00.000Z');
  });

  it('an hour on a non-market paid day never counts (checked step by step, independently)', () => {
    // Paid days turn over on the hour (20:00 ET), so 15-minute steps from a
    // 15-minute-aligned start count exactly. Starts every 7 h 15 min across five
    // weeks land on every hour of every weekday, both sides of the DST change.
    const STEP = 15 * 60_000;
    for (let t = Date.parse('2026-10-01T04:00:00Z'); t < Date.parse('2026-11-05T00:00:00Z'); t += 29 * STEP) {
      const end = trialEndsAt(new Date(t), isTradingDay).getTime();
      let counted = 0;
      for (let m = t; m < end; m += STEP) {
        if (isTradingDay(calendarDayOf(new Date(m)))) counted += STEP;
      }
      expect(counted).toBe(TRIAL_MS);
      // The trial never ends inside a closed day: its last step is a market-day step.
      expect(isTradingDay(calendarDayOf(new Date(end - STEP)))).toBe(true);
    }
  });

  it('knows which calendar months a trial can touch', () => {
    expect(trialCalendarMonths(new Date('2026-10-30T14:00:00Z'))).toEqual(['2026-10', '2026-11']);
    expect(trialCalendarMonths(new Date('2026-12-31T14:00:00Z'))).toEqual(['2026-12', '2027-01']);
  });

  it('the calendar loader refuses a month it never loaded rather than calling it closed', async () => {
    const check = await loadTradingDays(async () => [{ date: '2026-10-22' }], ['2026-10']);
    expect(check('2026-10-22')).toBe(true);
    expect(check('2026-10-24')).toBe(false);
    expect(() => check('2026-11-02')).toThrow(/not loaded/);
  });
});
