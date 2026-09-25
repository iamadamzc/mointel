/**
 * The instant a catalyst has to be newer than to count as FRESH.
 *
 * HIS RULING, 2026-09-24: FRESH means the PRIOR SESSION'S CLOSE to now --
 * yesterday's after-hours and this morning's premarket, which is the span a
 * morning gap originates in. `resolveCatalystFreshness` implements the band and
 * takes the boundary as an argument; this module is the only thing that
 * computes it.
 *
 * WHY THE PRODUCER COMPUTES IT RATHER THAN THE CONSUMER. The band is read in
 * the BROWSER: `resolveWhy` runs inside `'use client'` components, where there
 * is no store and no exchange calendar. So the server puts the answer on the
 * payload once per snapshot, the same producer-supplies-the-answer shape as
 * `DiscoveryQualification.observed` (`f3375af`). Absent means the day bands,
 * which is exactly his date-only rule and is safe rather than merely tolerable.
 *
 * THE PRIOR SESSION, NOT LITERALLY YESTERDAY. On a Monday it is Friday, and a
 * holiday moves it again; Good Friday and the Christmas and Independence Day
 * observances all put four calendar days between two consecutive sessions.
 * `previousTradingDate` reads the exchange calendar, which is the one source
 * here that does not move when the desk does.
 *
 * AND THE PRIOR SESSION'S OWN CLOSE, NOT 16:00. `afterHoursStartUtc` defaults
 * to 16:00 so that existing callers keep their meaning, and on the day after an
 * early close that default is three hours late -- 3 July closes at 13:00. The
 * error runs in the safe direction (a 14:00 release lands outside the window
 * and falls back to RECENT rather than being promoted), but the desk already
 * reads the per-day close from the calendar for the CURRENT date in
 * `getMarketSnapshot`, and one concept computed two ways in one payload is how
 * the two drift apart.
 */

import { calendarDays, previousTradingDate } from '../desk/checkpointDates';
import { afterHoursStartUtc, closeMinutesFromClock } from '../market/session';
import type { MarketDatabase } from '../market/store/db';

/**
 * A stale calendar hands back a plausible date, so this asks a different
 * question.
 *
 * `previousTradingDate` filters to days before the date and takes the newest.
 * A calendar that stopped refreshing three weeks ago therefore returns a date
 * three weeks ago rather than null, and that failure runs in the DANGEROUS
 * direction: an ancient boundary makes ancient catalysts FRESH.
 * `resolveCatalystFreshness` refuses a boundary more than five days old for
 * exactly that reason, but the producer should not rely on the consumer's
 * guard.
 *
 * The test is NOT the size of the gap to the previous session. A gap is how a
 * stale calendar usually shows itself, not what is actually required -- and an
 * unscheduled closure (a national day of mourning; two days for Hurricane
 * Sandy) produces the same gap with a calendar that is perfectly current, where
 * the wide window would be CORRECT. What is required is that the calendar still
 * covers the date being asked about. The worker refreshes it across -120/+14
 * days, so a current calendar always holds a day at or after today, and one
 * that has stopped never will.
 */
function calendarCoversDate(db: MarketDatabase, tradingDate: string): boolean {
  return calendarDays(db).some((day) => day.date >= tradingDate);
}

/**
 * The prior session's close for `tradingDate`, as an ISO instant, or null.
 *
 * Null whenever the answer would be a guess: no trading date, no calendar, a
 * calendar that no longer reaches this date, or no session before it. Every one
 * of those leaves the consumer on the day bands.
 */
export function catalystFreshFromUtc(db: MarketDatabase, tradingDate: string): string | null {
  if (!tradingDate) return null;
  if (!calendarCoversDate(db, tradingDate)) return null;

  const previous = previousTradingDate(db, tradingDate);
  if (!previous) return null;

  const close = calendarDays(db).find((day) => day.date === previous)?.close ?? null;
  return afterHoursStartUtc(previous, closeMinutesFromClock(close)).toISOString();
}
