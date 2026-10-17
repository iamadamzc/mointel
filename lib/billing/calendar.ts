/**
 * Is this paid day a trading day? The market calendar, never a weekday test:
 * holidays are the case a weekday test gets wrong (Ops, 2026-09-28, citing the
 * preflight checkpoint arm's 2026-09-26 mistake).
 *
 * One calendar fetch per month, cached. A failed fetch THROWS rather than
 * answering: runChargePass then leaves the row PENDING, so an Alpaca outage
 * neither charges a holiday nor writes off a trading day.
 */

export interface CalendarDay {
  date: string;
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
