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
 * Words: the qualifiers are Marketing's. "(date only)" is the phrase the sources
 * list already uses; the rest are in one place below.
 */

import { etTimestamp, relativeAge } from '@/lib/dashboard/why';
import { formatEtDay } from '@/lib/format';
import type { EvidenceLink } from '@/lib/research/view';

export type EventTimeKind = 'EXACT' | 'DATE_ONLY' | 'INFERRED' | 'NONE';

export interface EventTimeView {
  kind: EventTimeKind;
  text: string;
}

export const EVENT_TIME_WORDS = {
  none: 'unknown',
  dateOnly: '(date only)',
  inferred: '(time inferred)',
} as const;

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
    return { kind: 'NONE', text: EVENT_TIME_WORDS.none };
  }
  const wanted = new Set(citedIds ?? []);
  const match = evidence.find(
    (link) => wanted.has(link.id) && link.publishedAt !== null && sameInstant(link.publishedAt, eventTimestamp),
  );
  const precision = match?.publishedPrecision;

  if (precision === 'EXACT') {
    const stamp = etTimestamp(eventTimestamp);
    if (!stamp) return { kind: 'NONE', text: EVENT_TIME_WORDS.none };
    const age = relativeAge(eventTimestamp, nowMs);
    return { kind: 'EXACT', text: age ? `${stamp} · ${age} ago` : stamp };
  }
  if (precision === 'INFERRED') {
    const stamp = etTimestamp(eventTimestamp);
    if (stamp) return { kind: 'INFERRED', text: `${stamp} ${EVENT_TIME_WORDS.inferred}` };
  }
  const day = formatEtDay(eventTimestamp);
  return day
    ? { kind: 'DATE_ONLY', text: `${day} ${EVENT_TIME_WORDS.dateOnly}` }
    : { kind: 'NONE', text: EVENT_TIME_WORDS.none };
}

export interface CatalystSource {
  link: EvidenceLink;
  /** ET calendar day of the source, or null. */
  day: string | null;
  dateOnly: boolean;
}

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
    out.push({ link, day: formatEtDay(link.publishedAt), dateOnly: link.publishedPrecision === 'DATE_ONLY' });
  }
  return out;
}
