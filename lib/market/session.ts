/**
 * America/New_York session model, DST-aware, with no date library.
 *
 * Product definition (not the exchange's own definition):
 *   PREMARKET     04:00–09:30 ET
 *   RTH           09:30–close (16:00 ET, or the exchange's early close)
 *   AFTER HOURS   close–20:00 ET
 *   POST_MARKET   20:00–22:00 ET   SIP extended trading over, AH state frozen
 *   NEXT_DAY_PREP 22:00–04:00 ET   the recap has run; the desk faces tomorrow
 *
 * The momentum trading date is the ET calendar date. Overnight SIP data is out
 * of scope for this milestone, which is why the session window starts at 04:00
 * rather than at the previous evening — Sunday-night prints must never land in
 * Monday's cumulative volume.
 *
 * POST_MARKET and NEXT_DAY_PREP are deliberately distinct from CLOSED. CLOSED
 * means "not a session at all"; those two mean "the market is done for today
 * and the desk is doing something specific with what it saw". The dashboard has
 * to be able to say which, because "no new SIP prints are expected" and "the
 * research engine is still working" are different facts.
 */

import type { SessionPhase } from './types';

export const MARKET_TIME_ZONE = 'America/New_York';

export const PREMARKET_START_MIN = 4 * 60; // 04:00
export const RTH_START_MIN = 9 * 60 + 30; // 09:30
export const RTH_END_MIN = 16 * 60; // 16:00 on a normal session
export const AFTER_HOURS_END_MIN = 20 * 60; // 20:00
/** The 22:00 ET recap closes the trading date and turns the desk to tomorrow. */
export const NEXT_DAY_PREP_MIN = 22 * 60; // 22:00

/** A normal full session closes at 16:00 ET; anything earlier is a partial day. */
export const FULL_SESSION_CLOSE = '16:00';

/**
 * One trading date's regular-session close, in minutes since ET midnight.
 *
 * Everything after the close — the after-hours window, the AH reference price,
 * the RTH_CLOSE assessment, the last 30-minute RTH checkpoint — hangs off this
 * one number, so an early-close day must never be assumed to be 16:00.
 */
export function closeMinutesFromClock(close: string | null | undefined): number {
  if (!close) return RTH_END_MIN;
  const match = /^(\d{1,2}):(\d{2})$/.exec(close.trim());
  if (!match) return RTH_END_MIN;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isFinite(minutes) || minutes <= RTH_START_MIN || minutes > AFTER_HOURS_END_MIN) {
    return RTH_END_MIN;
  }
  return minutes;
}

export function isEarlyClose(closeMinutes: number): boolean {
  return closeMinutes < RTH_END_MIN;
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export interface EtFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function etFields(date: Date): EtFields {
  const parts = partsFormatter.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;

  // Some ICU builds render midnight as "24" in hour12:false.
  const hour = Number(lookup.hour) % 24;

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour,
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

/** ET calendar date as YYYY-MM-DD. */
export function etDateString(date: Date): string {
  const { year, month, day } = etFields(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Minutes since ET midnight. */
export function etMinutesOfDay(date: Date): number {
  const { hour, minute } = etFields(date);
  return hour * 60 + minute;
}

export function etClock(date: Date): string {
  const { hour, minute, second } = etFields(date);
  return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** UTC offset of America/New_York at a given instant, in milliseconds (negative). */
export function etOffsetMs(date: Date): number {
  const { year, month, day, hour, minute, second } = etFields(date);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asIfUtc - date.getTime();
}

/**
 * Converts an ET wall-clock time to a UTC instant. Two passes so the result is
 * still correct when the initial guess lands on the other side of a DST change.
 */
export function etWallClockToUtc(dateString: string, hour: number, minute = 0, second = 0): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);

  let offset = etOffsetMs(new Date(naive));
  let utc = naive - offset;
  offset = etOffsetMs(new Date(utc));
  utc = naive - offset;

  return new Date(utc);
}

/** Start of the product session window (04:00 ET) for a trading date. */
export function sessionStartUtc(tradingDate: string): Date {
  return etWallClockToUtc(tradingDate, 4, 0);
}

/**
 * 20:00 ET per trading date, in epoch ms. A PURE function of the date string
 * and the tz database, so the memo cannot go stale.
 *
 * Why it exists: `lib/research/history.ts` asks it once per stored daily bar,
 * and `overlayLiveCycle` reads every stored session for every board name --
 * ~5,000 calls a snapshot over ~100 distinct dates, each two Intl
 * `formatToParts` passes. Profiled 2026-09-29 at ~60% of the whole build.
 *
 * The CACHE HOLDS MS, NOT THE DATE: a Date is mutable, and a shared instance
 * would let one caller's `setHours` move every later caller's session end.
 * Bounded so a long-lived process cannot grow it without limit.
 */
const sessionEndMsByDate = new Map<string, number>();
const SESSION_END_MEMO_MAX = 4096;

/** End of the product session window (20:00 ET) for a trading date. */
export function sessionEndUtc(tradingDate: string): Date {
  let ms = sessionEndMsByDate.get(tradingDate);
  if (ms === undefined) {
    ms = etWallClockToUtc(tradingDate, 20, 0).getTime();
    if (sessionEndMsByDate.size >= SESSION_END_MEMO_MAX) sessionEndMsByDate.clear();
    sessionEndMsByDate.set(tradingDate, ms);
  }
  return new Date(ms);
}

/**
 * The regular-session close for a trading date.
 *
 * `closeMinutes` comes from the exchange calendar. It defaults to 16:00 so
 * every existing caller keeps its meaning, but an early-close day must pass the
 * real close: on 3 July the after-hours session starts at 13:00, and a desk
 * that assumes 16:00 spends three hours calling live after-hours trading "RTH".
 */
export function rthCloseUtc(tradingDate: string, closeMinutes: number = RTH_END_MIN): Date {
  return etWallClockToUtc(tradingDate, 0, closeMinutes);
}

/** Start of the after-hours session: the instant the regular session ended. */
export function afterHoursStartUtc(
  tradingDate: string,
  closeMinutes: number = RTH_END_MIN,
): Date {
  return rthCloseUtc(tradingDate, closeMinutes);
}

/**
 * True once the regular session for `tradingDate` has ended.
 *
 * This is what decides whether the day's own RTH close exists yet: before the
 * close the percent-change reference must still be the PRIOR session.
 */
export function hasRthClosed(
  now: Date,
  tradingDate: string,
  closeMinutes: number = RTH_END_MIN,
): boolean {
  return now.getTime() >= rthCloseUtc(tradingDate, closeMinutes).getTime();
}

export function sessionPhaseForMinutes(
  minutes: number,
  closeMinutes: number = RTH_END_MIN,
): SessionPhase {
  if (minutes >= PREMARKET_START_MIN && minutes < RTH_START_MIN) return 'PREMARKET';
  if (minutes >= RTH_START_MIN && minutes < closeMinutes) return 'RTH';
  if (minutes >= closeMinutes && minutes < AFTER_HOURS_END_MIN) return 'AFTER_HOURS';
  if (minutes >= AFTER_HOURS_END_MIN && minutes < NEXT_DAY_PREP_MIN) return 'POST_MARKET';
  return 'NEXT_DAY_PREP';
}

/**
 * Session phase at an instant. `isTradingDay` comes from the market calendar;
 * without it a weekend would otherwise look like a normal session.
 */
export function sessionPhaseAt(
  date: Date,
  isTradingDay: boolean,
  closeMinutes: number = RTH_END_MIN,
): SessionPhase {
  if (!isTradingDay) return 'CLOSED';
  return sessionPhaseForMinutes(etMinutesOfDay(date), closeMinutes);
}

/** True while SIP prints are still expected for this phase. */
/**
 * SECOND CONSUMER, NAMED: the market worker also uses this to decide whether a
 * missing universe refresh is worth reporting (`universeRollDue`). Widening or
 * narrowing this predicate therefore changes WHEN A STALE UNIVERSE BECOMES
 * VISIBLE, not only what counts as a live session. Check that reader before
 * changing this one.
 */
export function isMarketDataExpected(phase: SessionPhase): boolean {
  return phase === 'PREMARKET' || phase === 'RTH' || phase === 'AFTER_HOURS';
}

/**
 * THE authoritative session phase, for every consumer.
 *
 * The phase is a function of the clock, so it must be evaluated against the
 * current instant every time it is read. It used to be resolved once when the
 * worker started and then re-persisted verbatim on every flush, which meant a
 * desk started in premarket still reported PREMARKET at 11:40 ET — the label
 * described when the worker booted, not what the market was doing.
 *
 * `tradingDate` guards the other direction: when the desk is holding a session
 * that has not arrived yet (overnight, weekend, holiday), today's wall clock
 * must not be read as that session's phase.
 */
export function resolveSessionPhase(options: {
  now: Date;
  /** The session the desk is working, or null to judge the clock alone. */
  tradingDate: string | null;
  isTradingDay: boolean;
  /** The exchange close for `tradingDate`, in minutes since ET midnight. */
  closeMinutes?: number;
}): SessionPhase {
  const { now, tradingDate, isTradingDay } = options;
  const closeMinutes = options.closeMinutes ?? RTH_END_MIN;
  if (!isTradingDay) return 'CLOSED';

  /*
   * The desk is holding a session other than today's.
   *
   * That happens after the 22:00 recap and overnight, when the trading date has
   * already rolled forward to the next session. The clock cannot describe a day
   * that has not started, but the desk is not idle either — it is preparing for
   * that session, which is what NEXT_DAY_PREP says.
   */
  if (tradingDate && tradingDate !== etDateString(now)) {
    const minutes = etMinutesOfDay(now);
    return minutes >= NEXT_DAY_PREP_MIN || minutes < PREMARKET_START_MIN
      ? 'NEXT_DAY_PREP'
      : 'CLOSED';
  }

  return sessionPhaseForMinutes(etMinutesOfDay(now), closeMinutes);
}

/** True while the product session window is open on a trading day. */
export function isSessionOpen(
  date: Date,
  isTradingDay: boolean,
  closeMinutes: number = RTH_END_MIN,
): boolean {
  return isMarketDataExpected(sessionPhaseAt(date, isTradingDay, closeMinutes));
}

/** Truncates a timestamp to its minute, matching how bars are keyed. */
export function minuteKey(date: Date): string {
  const ms = date.getTime();
  return new Date(ms - (ms % 60_000)).toISOString();
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function compareDateStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface TradingSessionResolution {
  /** The ET trading date the desk is currently working. */
  tradingDate: string;
  phase: SessionPhase;
  /** True when `tradingDate` is a session that has not opened yet. */
  pending: boolean;
  isTradingDay: boolean;
}

/**
 * Resolves the trading date the desk should be showing.
 *
 * A trading date now ends at 22:00 ET rather than 20:00. The two hours between
 * the end of SIP extended trading and the 22:00 recap belong to the session
 * that just happened: the desk is still watching filings against it, and the
 * recap that closes it out has not run yet. Rolling forward at 20:00 would
 * throw the day's after-hours state away two hours before anything summarised
 * it. After 22:00 (and overnight, weekends, holidays) the desk rolls forward to
 * the next scheduled session, which starts empty rather than replaying the
 * previous day.
 */
export function resolveTradingSession(
  now: Date,
  isTradingDay: (date: string) => boolean,
  nextTradingDate: (afterDate: string) => string | null,
  closeMinutesFor: (date: string) => number = () => RTH_END_MIN,
): TradingSessionResolution {
  const today = etDateString(now);
  const minutes = etMinutesOfDay(now);

  if (isTradingDay(today) && minutes >= PREMARKET_START_MIN && minutes < NEXT_DAY_PREP_MIN) {
    return {
      tradingDate: today,
      phase: sessionPhaseForMinutes(minutes, closeMinutesFor(today)),
      pending: false,
      isTradingDay: true,
    };
  }

  // Before 04:00 on a trading day the session is still that day, just pending.
  if (isTradingDay(today) && minutes < PREMARKET_START_MIN) {
    return { tradingDate: today, phase: 'NEXT_DAY_PREP', pending: true, isTradingDay: true };
  }

  const next = nextTradingDate(today);
  return {
    tradingDate: next ?? today,
    // After the 22:00 recap on a trading day the desk is explicitly preparing
    // the next session; on a weekend or holiday it is simply closed.
    phase: isTradingDay(today) && minutes >= NEXT_DAY_PREP_MIN ? 'NEXT_DAY_PREP' : 'CLOSED',
    pending: true,
    isTradingDay: next !== null,
  };
}

/**
 * The trading date a long-lived worker should move to, or null to stay put.
 *
 * A process that resolves its trading date once at startup keeps it forever.
 * On 19 August the market worker had been up since the 18th: the feed was
 * healthy and streaming, `flush()` re-read the session phase from the clock
 * every tick — the comment there even says so — but `tradingDate` was carried
 * from startup, so a full premarket of August 19 trades, quotes and 1.1 million
 * minute bars were written against August 18. Ranks, RVOL and cumulative volume
 * all stayed on yesterday's session, and the desk reported CLOSED at 07:25 ET.
 *
 * Kept as a pure decision so the crossing can be tested by moving a clock
 * rather than by running a worker overnight.
 */
export function rolledTradingDate(
  currentTradingDate: string,
  now: Date,
  isTradingDay: (date: string) => boolean,
  nextTradingDate: (afterDate: string) => string | null,
  closeMinutesFor: (date: string) => number = () => RTH_END_MIN,
): string | null {
  const resolution = resolveTradingSession(now, isTradingDay, nextTradingDate, closeMinutesFor);
  return resolution.tradingDate === currentTradingDate ? null : resolution.tradingDate;
}
