/**
 * Is this paid day a trading day? The market calendar, never a weekday test:
 * holidays are the case a weekday test gets wrong (Ops, 2026-09-28, citing the
 * preflight checkpoint arm's 2026-09-26 mistake).
 *
 * One calendar fetch per month, cached. A failed fetch THROWS rather than
 * answering: runChargePass then leaves the row PENDING, so an Alpaca outage
 * neither charges a holiday nor writes off a trading day.
 */

import { marketMonthsFor } from '@/lib/auth/expiry';

export interface CalendarDay {
  date: string;
}

/** Every month a paid-day question about these instants can touch, sorted. */
export function marketMonthsForAll(...instants: Date[]): string[] {
  return [...new Set(instants.flatMap((instant) => marketMonthsFor(instant)))].sort();
}

/**
 * A synchronous calendar for the given months, for the pure trial clock. Asking
 * about a date outside them THROWS: answering "not a market day" for a month we
 * never fetched would quietly stretch a trial.
 */
export async function loadTradingDays(
  fetchMonth: (start: string, end: string) => Promise<CalendarDay[]>,
  months: string[],
): Promise<(etDate: string) => boolean> {
  const loaded = new Map<string, Set<string>>();
  for (const month of months) {
    const [year, mon] = month.split('-').map(Number);
    const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    const days = await fetchMonth(`${month}-01`, `${month}-${String(last).padStart(2, '0')}`);
    loaded.set(month, new Set(days.map((day) => day.date)));
  }
  return (etDate: string) => {
    const days = loaded.get(etDate.slice(0, 7));
    if (!days) throw new Error(`calendar month ${etDate.slice(0, 7)} was not loaded`);
    return days.has(etDate);
  };
}

export function tradingDayChecker(fetchMonth: (start: string, end: string) => Promise<CalendarDay[]>) {
  const months = new Map<string, Set<string>>();
  return async function isTradingDay(etDate: string): Promise<boolean> {
    const month = etDate.slice(0, 7);
    let days = months.get(month);
    if (!days) {
      const [year, mon] = month.split('-').map(Number);
      const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
      const fetched = await fetchMonth(`${month}-01`, `${month}-${String(last).padStart(2, '0')}`);
      days = new Set(fetched.map((day) => day.date));
      months.set(month, days);
    }
    return days.has(etDate);
  };
}

/**
 * loadTradingDays with a per-month cache, for the web tier, where every sign-in
 * and every billing read needs a few months of the calendar. A month is fetched
 * again after `ttlMs`, so a closure the exchange announces late (as it did for
 * 2025-01-09) is picked up within the day. A failed fetch throws and caches
 * nothing.
 */
export function cachedTradingDays(
  fetchMonth: (start: string, end: string) => Promise<CalendarDay[]>,
  ttlMs = 6 * 60 * 60 * 1000,
  clock: () => number = Date.now,
): (months: string[]) => Promise<(etDate: string) => boolean> {
  const cache = new Map<string, { days: CalendarDay[]; at: number }>();
  const cachedFetch = async (start: string, end: string): Promise<CalendarDay[]> => {
    const month = start.slice(0, 7);
    const hit = cache.get(month);
    if (hit && clock() - hit.at < ttlMs) return hit.days;
    const days = await fetchMonth(start, end);
    cache.set(month, { days, at: clock() });
    return days;
  };
  return (months) => loadTradingDays(cachedFetch, months);
}
