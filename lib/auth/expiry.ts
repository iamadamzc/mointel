/**
 * When a session ends.
 *
 * His ruling, 2026-09-10, verbatim: "eventually pricing will be based on login.
 * each day the product is used is charged. so a session should persist all day
 * until the close of after hours."
 *
 * THAT IS A BOUNDARY, NOT A DURATION. Sign in at 04:00 ET and get sixteen
 * hours; sign in at 19:00 and get one. Every session created in the same paid
 * day ends at the same instant, which is what makes "a day of use" a thing that
 * can be counted rather than inferred.
 *
 * THE DAY IS THE NEXT MARKET DAY. His ruling, 2026-10-17: "weekends will contain
 * the premarket report, so there is a value to what is delivered in the time
 * after AH, which is a benefit to the following day. this is why a day starts
 * in the time after AH, and that would include a non market day." So a sign-in
 * after Friday's 20:00 ET belongs to Monday and runs to 20:00 ET Monday; a
 * sign-in after the 20:00 before a holiday belongs to the next market day.
 *
 * NO SECOND DEFINITION OF 20:00 ET. `sessionEndUtc` already exists in
 * lib/market/session.ts, is DST-aware without a date library, and is what the
 * market engine itself uses for the after-hours boundary. A separate
 * calculation here would be a second source of truth for the one number this
 * desk has repeatedly got wrong -- four clock failures in four days, every one
 * of them a zone or an offset assumed rather than read.
 */

import { etDateString, sessionEndUtc } from '@/lib/market/session';

export interface SessionExpiry {
  /** The paid day the session belongs to: an ET date, a market day unless the calendar was unreadable. */
  etDate: string;
  /** The instant it stops being valid: 20:00 ET on that date. */
  expiresAt: Date;
}

/**
 * Is this ET date a market day? Synchronous, over months already loaded
 * (lib/billing/calendar.ts loadTradingDays); asking about a month that was not
 * loaded throws.
 */
export type MarketDays = (etDate: string) => boolean;

/**
 * THE CALENDAR-DAY RULE, as a MarketDays: every date counts as a market day, so
 * a session ends at 20:00 ET on its own calendar day, weekend or not (the rule
 * before the fold). Used ONLY when the market calendar cannot be read at sign-in
 * (Integration's ruling, 2026-10-17: "calendar unreadable at sign-in -> today's
 * calendar-day behaviour"): the session is shorter and nothing is charged for a
 * closed day, because the charge pass refuses to charge a date it cannot confirm
 * is a market day. It fails short and free, never into a wrong charge.
 */
export const CALENDAR_DAYS: MarketDays = () => true;

/** The ET calendar date after `etDate`, stepped on the date string, not by 24 h. */
export function nextEtDate(etDate: string): string {
  return stepEtDate(etDate, 1);
}

/** The ET calendar date before `etDate`, stepped on the date string, not by 24 h. */
export function previousEtDate(etDate: string): string {
  return stepEtDate(etDate, -1);
}

/*
 * Built by stepping the DATE STRING rather than adding 24 hours to an instant: a
 * day is not always 24 hours in a zone that observes DST, and the two answers
 * differ twice a year -- on exactly the days a wrong one would be hardest to
 * reproduce.
 */
function stepEtDate(etDate: string, days: number): string {
  const [year, month, day] = etDate.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/** No exchange closure runs this long; a longer walk means a broken calendar. */
const MAX_CLOSED_RUN = 10;

/** `etDate` itself when it is a market day, else the first market day after it. */
export function marketDayOnOrAfter(etDate: string, isMarketDay: MarketDays): string {
  let day = etDate;
  for (let i = 0; i <= MAX_CLOSED_RUN; i += 1) {
    if (isMarketDay(day)) return day;
    day = nextEtDate(day);
  }
  throw new Error(`no market day within ${MAX_CLOSED_RUN} days after ${etDate}`);
}

/** The last market day strictly before `etDate`. */
export function marketDayBefore(etDate: string, isMarketDay: MarketDays): string {
  let day = previousEtDate(etDate);
  for (let i = 0; i <= MAX_CLOSED_RUN; i += 1) {
    if (isMarketDay(day)) return day;
    day = previousEtDate(day);
  }
  throw new Error(`no market day within ${MAX_CLOSED_RUN} days before ${etDate}`);
}

/**
 * The ET calendar day whose 20:00 is the next one at or after `now`: today
 * before 20:00 ET, tomorrow after it. The paid day before the fold, and still
 * the unit the trial clock counts in (his ruling, 2026-10-17: weekend and
 * holiday hours do not count toward a trial).
 *
 * ROLLS FORWARD WHEN THE BOUNDARY HAS ALREADY PASSED. Between 20:00 ET and
 * midnight, today's close is behind us, and computing it anyway would issue a
 * session that is already expired -- signing in and being signed out in the
 * same instant, with the sign-in appearing to have worked.
 */
export function calendarDayOf(now: Date): string {
  const today = etDateString(now);
  return sessionEndUtc(today).getTime() > now.getTime() ? today : nextEtDate(today);
}

/**
 * The months a sign-in at `now` can need from the calendar: the calendar day's
 * month, the one before (the start of a paid day after a long weekend at a month
 * boundary) and the one after (a closure that runs into the next month).
 */
export function marketMonthsFor(now: Date): string[] {
  const day = calendarDayOf(now);
  return [previousMonth(day), day.slice(0, 7), nextMonth(day)];
}

function previousMonth(etDate: string): string {
  const [year, month] = etDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(etDate: string): string {
  const [year, month] = etDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * The expiry for a session created at `now`: 20:00 ET on the first market day
 * whose 20:00 is still ahead. With CALENDAR_DAYS it is the calendar day.
 */
export function sessionExpiry(now: Date, isMarketDay: MarketDays): SessionExpiry {
  const etDate = marketDayOnOrAfter(calendarDayOf(now), isMarketDay);
  return { etDate, expiresAt: sessionEndUtc(etDate) };
}

/**
 * A calendar from a list of session dates (the exchange calendar the market
 * worker caches in market.db). That list can be stale with no marker, so it
 * answers ONLY strictly inside its own range: a date at or after its last
 * session, or at or before its first, THROWS (Integration's ruling,
 * 2026-10-17: the cache must hold a session strictly after the date asked
 * about, proof that it reaches that far). Between them, a date not listed is
 * closed.
 */
export function sessionDatesCalendar(dates: readonly string[]): MarketDays {
  const set = new Set(dates);
  const sorted = [...set].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return (etDate) => {
    if (!first || etDate <= first || etDate >= last) {
      throw new Error(`the cached calendar (${first ?? 'empty'} to ${last ?? 'empty'}) does not cover ${etDate}`);
    }
    return set.has(etDate);
  };
}

/**
 * How long a sign-in waits for the network calendar. The Alpaca client has no
 * timeout of its own and retries with backoff (Ops's review, 2026-10-17), so
 * without a deadline a stalled calendar would hang every sign-in and the
 * fallback would never fire.
 */
export const CALENDAR_DEADLINE_MS = 3000;

/** `promise`, or a rejection naming `what` once `ms` have passed. The loser keeps running. */
export function withDeadline<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: no answer in ${ms} ms`)), ms);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

/**
 * A logger that writes each distinct line at most once per `windowMs`, per
 * process. marketDaysOrFallback runs on every sign-in and every desk billing
 * read, and the desk polls; without a cap, a market.db with no calendar would
 * log one line per poll (Ops, 2026-10-17). A line that changes (another cause,
 * another date) is a new line and is written at once: the first occurrence of
 * any line is never held back.
 *
 * BOUNDED: the causes carry error messages and dates, so the set of lines is
 * open-ended. At most `maxLines` are remembered; past that, the oldest is
 * forgotten, which can only let a line through again, never hold one back.
 */
export function capLog(
  sink: (line: string) => void,
  windowMs = 60 * 60 * 1000,
  clock: () => number = Date.now,
  maxLines = 64,
): (line: string) => void {
  const last = new Map<string, number>();
  return (line) => {
    const now = clock();
    const at = last.get(line);
    if (at !== undefined && now - at < windowMs) return;
    last.delete(line);
    last.set(line, now);
    while (last.size > maxLines) last.delete(last.keys().next().value as string);
    sink(line);
  };
}

/** The paid-day log, capped: each distinct line at most once an hour per process. */
const PAID_DAY_LOG = capLog((line) => console.error(line));

/** Where the paid day's calendar can come from, tried in this order. */
export interface CalendarSources {
  /** The worker's cached calendar (a local read), or null when there is none. */
  cached?: () => MarketDays | null;
  /** The network calendar for these months. */
  load: ((months: string[]) => Promise<MarketDays>) | null;
}

/** Throws unless this calendar can place `now`'s paid day and the market day before it. */
function placeable(now: Date, isMarketDay: MarketDays): MarketDays {
  const day = marketDayOnOrAfter(calendarDayOf(now), isMarketDay);
  marketDayBefore(day, isMarketDay);
  return isMarketDay;
}

const why = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The market calendar around `now`, for a sign-in and the desk's billing reads.
 * Never throws and never waits past `deadlineMs`:
 * 1. the worker's cached calendar in market.db, when it covers this paid day;
 * 2. else the network calendar, within the deadline;
 * 3. else the calendar-day rule (CALENDAR_DAYS), logged with the cause.
 * A network load that loses the race keeps running and fills its cache for the
 * next caller. Not for Checkout or the webhook, which must never guess a day.
 */
export async function marketDaysOrFallback(
  now: Date,
  sources: CalendarSources,
  log: (line: string) => void = PAID_DAY_LOG,
  deadlineMs: number = CALENDAR_DEADLINE_MS,
): Promise<MarketDays> {
  const causes: string[] = [];
  if (sources.cached) {
    try {
      const cached = sources.cached();
      if (cached) return placeable(now, cached);
      causes.push('no cached calendar');
    } catch (error) {
      causes.push(why(error));
    }
  }
  if (!sources.load) {
    log(`[paid day] no market calendar (${[...causes, 'no network calendar'].join('; ')}): falling back to the calendar day`);
    return CALENDAR_DAYS;
  }
  try {
    const loaded = placeable(now, await withDeadline(sources.load(marketMonthsFor(now)), deadlineMs, 'market calendar'));
    // Seen, so a market worker that stopped refreshing its calendar does not go unnoticed.
    if (causes.length) log(`[paid day] cached calendar not used (${causes.join('; ')}): network calendar used`);
    return loaded;
  } catch (error) {
    causes.push(why(error));
    log(`[paid day] market calendar unreadable (${causes.join('; ')}): falling back to the calendar day`);
    return CALENDAR_DAYS;
  }
}
