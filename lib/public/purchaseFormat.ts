/**
 * The purchase pages' filled values, in the forms the word files name:
 * {endTime} and {trialEnd} "8:00pm ET on Friday, October 17"; a date "November 17, 2026".
 * Every value is computed from an instant or an ET date on the server; the page never
 * does calendar arithmetic of its own.
 */

import type { Purchase } from '@/lib/billing/config';

/** URL slugs for the four purchases, so a query string never carries an internal key. */
export const PLAN_SLUGS: Record<Purchase, string> = {
  daily: 'daily',
  monthly: 'monthly',
  six_month: 'six-months',
  annual: 'annual',
};

export const PURCHASE_ORDER: Purchase[] = ['daily', 'monthly', 'six_month', 'annual'];

export function purchaseFromSlug(slug: string | null | undefined): Purchase | null {
  return PURCHASE_ORDER.find((p) => PLAN_SLUGS[p] === slug) ?? null;
}

const ET = 'America/New_York';

/** "8:00pm ET on Friday, October 17" */
export function etEndTime(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const ampm = get('dayPeriod').toLowerCase();
  return `${get('hour')}:${get('minute')}${ampm} ET on ${get('weekday')}, ${get('month')} ${get('day')}`;
}

/** "November 17, 2026", from an ET calendar date "2026-11-17". */
export function longEtDate(etDate: string): string {
  const [y, m, d] = etDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The ET calendar date of an instant, "2026-10-17". */
export function etDateOf(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant,
  );
}

const PERIOD_MONTHS: Record<Exclude<Purchase, 'daily'>, number> = { monthly: 1, six_month: 6, annual: 12 };

/**
 * The renewal date a plan bought on `etDate` shows before paying: the same day of the
 * month, one period later (his "3, a": a month runs from the purchase day, the 17th to
 * the 17th). A day the later month lacks (the 31st) falls to that month's last day.
 */
export function renewalEtDate(etDate: string, plan: Exclude<Purchase, 'daily'>): string {
  const [y, m, d] = etDate.split('-').map(Number);
  const target = m - 1 + PERIOD_MONTHS[plan];
  const year = y + Math.floor(target / 12);
  const month = target % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
