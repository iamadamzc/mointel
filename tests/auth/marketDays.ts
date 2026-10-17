/**
 * A fixed market calendar for tests: weekdays, minus the NYSE full-day closures
 * of 2026 and 2027 (nyse.com holidays page). Throws outside those years, as the
 * real loaded calendar throws for a month it never fetched.
 */
import type { MarketDays } from '@/lib/auth/expiry';

const CLOSED = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19',
  '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18',
  '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);

export const MARKET_DAYS: MarketDays = (etDate) => {
  const year = Number(etDate.slice(0, 4));
  if (year < 2026 || year > 2027) throw new Error(`test calendar has no ${etDate}`);
  const dow = new Date(`${etDate}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6 && !CLOSED.has(etDate);
};
