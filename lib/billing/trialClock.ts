/**
 * When a free trial ends. A pure function: the start instant and the market
 * calendar in, the end instant out.
 *
 * His ruling, 2026-10-17 (Commercial's chat): "from session time +48 hours of
 * trading days". Read, and checked by Integration by hand:
 * - the trial is 48 hours, measured from the moment it starts;
 * - an hour counts only inside a paid day (20:00 to 20:00 ET) that ENDS on a
 *   market day. Weekends and exchange holidays never count.
 *
 * Worked examples, both tested:
 * - Start Thu 10:00 ET: Thu 10:00-20:00 (10 h) + Fri's paid day (24 h) = 34 h;
 *   Sat's and Sun's paid days do not count; Mon's paid day opens Sun 20:00 and
 *   14 h later it ends, Mon 10:00 ET.
 * - Start on a Saturday: nothing counts until Sun 20:00; it ends Tue 20:00.
 *
 * The paid day is the session's own (lib/auth/expiry.ts), so the trial clock and
 * the session boundary use one definition of 20:00 ET, DST included. Durations
 * are real elapsed milliseconds, never wall-clock arithmetic.
 */

import { paidDayOf } from '@/lib/billing/store';
import { sessionEndUtc } from '@/lib/market/session';

export const TRIAL_MS = 48 * 60 * 60 * 1000;

/** More paid days than any 48 hours can need, even across a long holiday stretch. */
const MAX_PAID_DAYS = 31;

export function trialEndsAt(
  start: Date,
  isTradingDay: (etDate: string) => boolean,
  lengthMs: number = TRIAL_MS,
): Date {
  let cursor = start.getTime();
  let remaining = lengthMs;
  for (let i = 0; i < MAX_PAID_DAYS; i += 1) {
    const day = paidDayOf(new Date(cursor));
    const dayEnd = sessionEndUtc(day).getTime();
    if (isTradingDay(day)) {
      const span = dayEnd - cursor;
      if (span >= remaining) return new Date(cursor + remaining);
      remaining -= span;
    }
    cursor = dayEnd;
  }
  throw new Error(`no ${lengthMs / 3_600_000} trading hours within ${MAX_PAID_DAYS} paid days of ${start.toISOString()}`);
}

/** The ET months a trial starting at `start` can touch: its own and the next. */
export function trialCalendarMonths(start: Date): string[] {
  const first = paidDayOf(start).slice(0, 7);
  const [year, month] = first.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return [first, `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`];
}
