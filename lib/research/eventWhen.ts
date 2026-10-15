/**
 * THE CATALYST EVENT'S DATE AND CLOCK, ONE RULE FOR EVERY READER (moved from lib/desk/reports/traced.ts, unchanged,
 * 2026-10-15, Integration 41st's ruling): the report writer, the report checker and the board's catalyst time (the
 * Why hover, the OLD headline day, the dossier row) all read it here, so they cannot disagree. Client-safe: it imports
 * only the ET clock helpers. traced.ts re-exports every name, so existing imports are unchanged.
 */

import { etClock } from '../market/session';
import { eventEtDate, type TimePrecision } from './time';

/**
 * A stored date or instant as its ET calendar date and, when it carries one,
 * its ET wall clock (HH:MM). Stored dossier dates are MODEL-WRITTEN: bare dates,
 * ISO instants, ET wall clocks like "2026-08-19 20:00:00 ET" (whose date and
 * clock are ALREADY Eastern), and free text. Anything unparseable is null, never
 * a throw: 100 distinct unparseable values in 2,495 prod versions made the ET
 * formatter throw, which failed two of four 09-24 reports. The date comes from
 * `eventEtDate`, the reader catalyst freshness already uses.
 */
export function etDayAndClock(raw: string | null | undefined): { date: string | null; clock: string | null } {
  if (!raw) return { date: null, clock: null };
  const trimmed = raw.trim();
  const date = eventEtDate(trimmed);
  const wall = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?\s*ET$/i.exec(trimmed);
  if (wall) return { date, clock: `${wall[2]}:${wall[3]}` };
  // A clock with NO zone ("2026-09-11T16:00:00", stored for EGG) is a time in an
  // unknown zone: its date is taken as written and it has no clock. Date.parse
  // would read it as the machine's local time, which differs by host.
  const naive = /^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.exec(trimmed);
  if (naive) return { date: naive[1]!, clock: null };
  if (!/\dT?\d{2}:\d{2}/.test(trimmed) || /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { date, clock: null };
  const ms = Date.parse(trimmed);
  return { date, clock: Number.isFinite(ms) ? etClock(new Date(ms)).slice(0, 5) : null };
}

/**
 * A DATE-ONLY value as the calendar date it was STORED as, never shifted by a
 * time zone (reports v6 fix (b)): "2026-03-27T00:00:00Z" is March 27, not the
 * March 26 an ET conversion makes of a midnight-UTC value (HIT), and a date-only
 * source's noon placeholder (`lib/research/time.ts`) is its own UTC date. A
 * value with no leading ISO date falls back to `etDayAndClock`.
 */
export function calendarDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return match ? match[1]! : etDayAndClock(raw).date;
}

export interface WhenSource {
  publishedAt: string | null;
  precision: TimePrecision | string;
}

/** A cited source's date and clock: an EXACT or INFERRED instant is read in ET; anything else is a calendar date with no clock. */
export function sourceWhen(source: WhenSource): { date: string | null; clock: string | null } {
  if (!source.publishedAt) return { date: null, clock: null };
  if (source.precision === 'EXACT') return etDayAndClock(source.publishedAt);
  if (source.precision === 'INFERRED') return { date: etDayAndClock(source.publishedAt).date, clock: null };
  return { date: calendarDate(source.publishedAt), clock: null };
}

/**
 * The catalyst event's date and clock (reports v6 fix (c)). The model writes
 * `eventTimestamp` with no precision, so its clock is trusted ONLY when a cited
 * EXACT or INFERRED source carries that same instant: DKI's 12:00:00Z is genuine
 * (source 120192 is EXACT), CMCT's identical value is a date-only placeholder
 * (source 118584 is DATE_ONLY). Otherwise the event is a calendar date with no
 * clock. The rule follows source precision, never "noon means date-only".
 */
export function eventWhen(catalyst: { eventTimestamp: string | null; sources: readonly WhenSource[] }): {
  date: string | null;
  clock: string | null;
} {
  const raw = catalyst.eventTimestamp;
  if (!raw) return { date: null, clock: null };
  const at = Date.parse(raw);
  const exact =
    Number.isFinite(at) &&
    catalyst.sources.some(
      (s) => (s.precision === 'EXACT' || s.precision === 'INFERRED') && s.publishedAt !== null && Date.parse(s.publishedAt) === at,
    );
  return exact ? etDayAndClock(raw) : { date: calendarDate(raw), clock: null };
}

/**
 * eventWhen, plus WHICH cited precision carried the clock (EXACT or INFERRED; null when the event is a date only), so
 * a reader that words an inferred time differently can (the board's "time inferred"). Same decision as eventWhen.
 */
export function eventWhenDetail(catalyst: { eventTimestamp: string | null; sources: readonly WhenSource[] }): {
  date: string | null;
  clock: string | null;
  precision: 'EXACT' | 'INFERRED' | null;
} {
  const when = eventWhen(catalyst);
  if (when.clock === null || !catalyst.eventTimestamp) return { ...when, precision: null };
  const at = Date.parse(catalyst.eventTimestamp);
  const exact = catalyst.sources.some((s) => s.precision === 'EXACT' && s.publishedAt !== null && Date.parse(s.publishedAt) === at);
  return { ...when, precision: exact ? 'EXACT' : 'INFERRED' };
}
