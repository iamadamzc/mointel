import { describe, expect, it } from 'vitest';

import { trialEndsAt } from '@/lib/billing/trialClock';
import { PRICING_TRIAL } from '@/lib/public/purchaseCopy';

/**
 * The pricing page's example table is his approved copy (@666038e6), and every end time
 * in it must be what the trial clock actually computes. A week with no market holiday,
 * all in EDT: Mon 2026-10-19 to Fri 10-23 are sessions, then the weekend, then Mon 10-26
 * and Tue 10-27.
 */
const SESSIONS = new Set(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27', '2026-10-28']);
const isTradingDay = (etDate: string) => SESSIONS.has(etDate);
const START_DATE: Record<string, string> = {
  Tuesday: '2026-10-20',
  Wednesday: '2026-10-21',
  Thursday: '2026-10-22',
  Friday: '2026-10-23',
  Saturday: '2026-10-24',
  Sunday: '2026-10-25',
};

/** "Tuesday at 10:00am ET" in EDT (UTC-4) as an instant. */
function startOf(cell: string): Date {
  const [day, rest] = cell.split(' at ');
  const clock = rest.replace(' ET', '');
  const pm = clock.endsWith('pm');
  const [h, m] = clock.slice(0, -2).split(':').map(Number);
  const hour24 = (h % 12) + (pm ? 12 : 0);
  return new Date(`${START_DATE[day]}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-04:00`);
}

/** An instant as the table writes it: "Thursday at 10:00am ET". */
function asCell(at: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.weekday} at ${parts.hour}:${parts.minute}${parts.dayPeriod.toLowerCase()} ET`;
}

describe('the pricing page trial table', () => {
  it('has the seven approved rows', () => {
    expect(PRICING_TRIAL.examples).toHaveLength(7);
  });

  for (const [start, end] of PRICING_TRIAL.examples) {
    it(`${start} ends ${end}, as the trial clock computes`, () => {
      expect(asCell(trialEndsAt(startOf(start), isTradingDay))).toBe(end);
    });
  }

  it('the parser is not vacuous: a wrong end time is caught', () => {
    expect(asCell(trialEndsAt(startOf('Thursday at 10:00am ET'), isTradingDay))).not.toBe('Tuesday at 10:00am ET');
  });
});
