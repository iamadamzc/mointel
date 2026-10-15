/**
 * THE CATALYST'S EVENT TIME AND ITS OWN SOURCES, from the dossier (contract row 12).
 *
 * The contract reads "eventTimestamp (with its precision, never a false clock)"
 * and "cited sources". The catalyst's timestamp has no precision of its own; the
 * precision lives on the SOURCES it cites (`publishedPrecision`). The drawer used
 * to print every event time as an ET clock, which is a false clock whenever the
 * source gave a date only (a date-only page is stored at noon UTC).
 *
 * THE RULE (Integration 28th, 2026-10-05): the clock prints only when a cited
 * source carrying exactly that instant is EXACT; DATE_ONLY prints the date;
 * INFERRED prints the clock marked inferred; with no matching source, or an
 * UNKNOWN precision, it prints the date only. A time the evidence cannot support
 * is never shown as a time.
 *
 * Words: Marketing's (drawer-rows-words-2026-10-05.md), in one place below.
 */

import { etTimestamp, relativeAge } from '@/lib/dashboard/why';
import { eventWhenDetail, sourceWhen } from '@/lib/research/eventWhen';
import type { EvidenceLink } from '@/lib/research/view';

export type EventTimeKind = 'EXACT' | 'DATE_ONLY' | 'INFERRED' | 'NONE';

export interface EventTimeView {
  kind: EventTimeKind;
  text: string;
  /** A hover that says what the qualifier means; only for an inferred time. */
  hover: string | null;
}

export const EVENT_TIME_WORDS = {
  none: 'No event time',
  dateOnly: 'time not stated',
  inferred: 'time inferred',
  inferredHover:
    'The source does not state a time. This time was taken from something next to the event, such as the time the filing was accepted.',
} as const;

const CALENDAR_DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

/** "Sep 17" for a calendar date "2026-09-17", read as written (never shifted by a zone), or null. */
export function calendarDay(date: string | null | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const at = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(at.getTime()) ? null : CALENDAR_DAY.format(at);
}

/** The catalyst's cited sources in the shape the shared rule reads. */
function citedSources(citedIds: readonly number[] | null | undefined, evidence: readonly EvidenceLink[]) {
  const wanted = new Set(citedIds ?? []);
  return evidence.filter((link) => wanted.has(link.id)).map((link) => ({ publishedAt: link.publishedAt, precision: link.publishedPrecision }));
}

/**
 * THE ONE BOARD READING OF THE CATALYST'S EVENT TIME (Integration 41st, 2026-10-15): Research's eventWhen
 * (lib/research/eventWhen.ts), the same rule the report writer and checker use. The clock prints only when a cited
 * EXACT or INFERRED source carries that instant; otherwise the date AS WRITTEN, never converted (a date-only
 * "2026-09-17" or "2026-09-17T00:00:00Z" is Sep 17, not the "Sep 16, 8:00 PM ET" an ET conversion made of it).
 * `date` is the calendar date ("2026-09-17"); `text` is the passed wording. Used by the dossier row, the Why hover
 * and the OLD headline's day.
 */
export interface CatalystEventTime {
  kind: EventTimeKind;
  date: string | null;
  /** The passed wording: an ET stamp, "<stamp>, time inferred", or "<day>, time not stated". */
  text: string | null;
}

export function catalystEventTime(
  eventTimestamp: string | null | undefined,
  citedIds: readonly number[] | null | undefined,
  evidence: readonly EvidenceLink[],
): CatalystEventTime {
  if (!eventTimestamp) return { kind: 'NONE', date: null, text: null };
  const when = eventWhenDetail({ eventTimestamp, sources: citedSources(citedIds, evidence) });
  if (when.clock !== null && when.precision !== null) {
    const stamp = etTimestamp(eventTimestamp);
    if (stamp) {
      return when.precision === 'EXACT'
        ? { kind: 'EXACT', date: when.date, text: stamp }
        : { kind: 'INFERRED', date: when.date, text: `${stamp}, ${EVENT_TIME_WORDS.inferred}` };
    }
  }
  const day = calendarDay(when.date);
  return day ? { kind: 'DATE_ONLY', date: when.date, text: `${day}, ${EVENT_TIME_WORDS.dateOnly}` } : { kind: 'NONE', date: null, text: null };
}

export function eventTimeView(
  eventTimestamp: string | null | undefined,
  citedIds: readonly number[] | null | undefined,
  evidence: readonly EvidenceLink[],
  nowMs: number,
): EventTimeView {
  const time = catalystEventTime(eventTimestamp, citedIds, evidence);
  if (time.kind === 'NONE' || time.text === null) return { kind: 'NONE', text: EVENT_TIME_WORDS.none, hover: null };
  if (time.kind === 'EXACT') {
    const age = relativeAge(eventTimestamp, nowMs);
    return { kind: 'EXACT', text: age ? `${time.text} · ${age} ago` : time.text, hover: null };
  }
  if (time.kind === 'INFERRED') return { kind: 'INFERRED', text: time.text, hover: EVENT_TIME_WORDS.inferredHover };
  return { kind: 'DATE_ONLY', text: time.text, hover: null };
}

export interface CatalystSource {
  link: EvidenceLink;
  /** "Aug 17", the ET calendar day of the source, or null. */
  day: string | null;
  dateOnly: boolean;
}

/** The label over the catalyst's own source list (Marketing). */
export const CATALYST_SOURCES_LABEL = 'Sources the desk read';

/** The sources the catalyst's own conclusion cites, in the order the dossier cites them. */
export function catalystSources(
  citedIds: readonly number[] | null | undefined,
  evidence: readonly EvidenceLink[],
): CatalystSource[] {
  const byId = new Map(evidence.map((link) => [link.id, link]));
  const seen = new Set<number>();
  const out: CatalystSource[] = [];
  for (const id of citedIds ?? []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const link = byId.get(id);
    if (!link) continue;
    // The source's own date by the shared rule: an EXACT/INFERRED instant in ET, anything else as written.
    out.push({ link, day: calendarDay(sourceWhen({ publishedAt: link.publishedAt, precision: link.publishedPrecision }).date), dateOnly: link.publishedPrecision === 'DATE_ONLY' });
  }
  return out;
}
