/**
 * America/New_York session model, DST-aware, with no date library.
 *
 * Product definition (not the exchange's own definition):
 *   PREMARKET   04:00–09:30 ET
 *   RTH         09:30–16:00 ET
 *   AFTER HOURS 16:00–20:00 ET
 *
 * The momentum trading date is the ET calendar date. Overnight SIP data is out
 * of scope for this milestone, which is why the session window starts at 04:00
 * rather than at the previous evening — Sunday-night prints must never land in
 * Monday's cumulative volume.
 */

import type { SessionPhase } from './types';

export const MARKET_TIME_ZONE = 'America/New_York';

export const PREMARKET_START_MIN = 4 * 60; // 04:00
export const RTH_START_MIN = 9 * 60 + 30; // 09:30
export const RTH_END_MIN = 16 * 60; // 16:00
export const AFTER_HOURS_END_MIN = 20 * 60; // 20:00

/** A normal full session closes at 16:00 ET; anything earlier is a partial day. */
export const FULL_SESSION_CLOSE = '16:00';

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

/** End of the product session window (20:00 ET) for a trading date. */
export function sessionEndUtc(tradingDate: string): Date {
  return etWallClockToUtc(tradingDate, 20, 0);
}

export function sessionPhaseForMinutes(minutes: number): SessionPhase {
  if (minutes >= PREMARKET_START_MIN && minutes < RTH_START_MIN) return 'PREMARKET';
  if (minutes >= RTH_START_MIN && minutes < RTH_END_MIN) return 'RTH';
  if (minutes >= RTH_END_MIN && minutes < AFTER_HOURS_END_MIN) return 'AFTER_HOURS';
  return 'CLOSED';
}

/**
 * Session phase at an instant. `isTradingDay` comes from the market calendar;
 * without it a weekend would otherwise look like a normal session.
 */
export function sessionPhaseAt(date: Date, isTradingDay: boolean): SessionPhase {
  if (!isTradingDay) return 'CLOSED';
  return sessionPhaseForMinutes(etMinutesOfDay(date));
}

/** True while the product session window is open on a trading day. */
export function isSessionOpen(date: Date, isTradingDay: boolean): boolean {
  return sessionPhaseAt(date, isTradingDay) !== 'CLOSED';
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
 * Inside a trading day's 04:00–20:00 window that day is used. Outside it (after
 * 20:00, overnight, weekends, holidays) the desk rolls forward to the next
 * scheduled session, which starts empty rather than replaying the previous day.
 */
export function resolveTradingSession(
  now: Date,
  isTradingDay: (date: string) => boolean,
  nextTradingDate: (afterDate: string) => string | null,
): TradingSessionResolution {
  const today = etDateString(now);
  const minutes = etMinutesOfDay(now);

  if (isTradingDay(today) && minutes >= PREMARKET_START_MIN && minutes < AFTER_HOURS_END_MIN) {
    return {
      tradingDate: today,
      phase: sessionPhaseForMinutes(minutes),
      pending: false,
      isTradingDay: true,
    };
  }

  // Before 04:00 on a trading day the session is still that day, just pending.
  if (isTradingDay(today) && minutes < PREMARKET_START_MIN) {
    return { tradingDate: today, phase: 'CLOSED', pending: true, isTradingDay: true };
  }

  const next = nextTradingDate(today);
  return {
    tradingDate: next ?? today,
    phase: 'CLOSED',
    pending: true,
    isTradingDay: next !== null,
  };
}
