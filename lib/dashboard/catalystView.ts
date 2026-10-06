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

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });

/** "Aug 17": the ET calendar day of an instant, or null when it cannot be read. */
export function monthDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : MONTH_DAY.format(at);
}

function sameInstant(a: string, b: string): boolean {
  const x = Date.parse(a);
  const y = Date.parse(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
}

export function eventTimeView(
  eventTimestamp: string | null | undefined,
  citedIds: readonly number[] | null | undefined,
  evidence: readonly EvidenceLink[],
  nowMs: number,
): EventTimeView {
  if (!eventTimestamp || !Number.isFinite(Date.parse(eventTimestamp))) {
    return { kind: 'NONE', text: EVENT_TIME_WORDS.none, hover: null };
  }
  const wanted = new Set(citedIds ?? []);
  const match = evidence.find(
    (link) => wanted.has(link.id) && link.publishedAt !== null && sameInstant(link.publishedAt, eventTimestamp),
  );
  const precision = match?.publishedPrecision;

  if (precision === 'EXACT') {
    const stamp = etTimestamp(eventTimestamp);
    if (!stamp) return { kind: 'NONE', text: EVENT_TIME_WORDS.none, hover: null };
    const age = relativeAge(eventTimestamp, nowMs);
    return { kind: 'EXACT', text: age ? `${stamp} · ${age} ago` : stamp, hover: null };
  }
  if (precision === 'INFERRED') {
    const stamp = etTimestamp(eventTimestamp);
    if (stamp) {
      return { kind: 'INFERRED', text: `${stamp}, ${EVENT_TIME_WORDS.inferred}`, hover: EVENT_TIME_WORDS.inferredHover };
    }
  }
  const day = monthDay(eventTimestamp);
  return day
    ? { kind: 'DATE_ONLY', text: `${day}, ${EVENT_TIME_WORDS.dateOnly}`, hover: null }
    : { kind: 'NONE', text: EVENT_TIME_WORDS.none, hover: null };
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
    out.push({ link, day: monthDay(link.publishedAt), dateOnly: link.publishedPrecision === 'DATE_ONLY' });
  }
  return out;
}
