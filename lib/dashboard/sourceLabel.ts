/**
 * ONE LABEL FOR EVERY SOURCE THE DRAWER LISTS (Integration 36th; rules: docs/Design/source-labels-draft-2026-10-09.md
 * at 68c6ebc1; words: Marketing docs/marketing/source-title-words-2026-10-09.md at 488b3baa; Commercial reads 50
 * and 51 passed). On WORX on 2026-10-08 the drawer printed raw evidence ids as link text, four links reading
 * "8-K, CURRENT REPORT" with no date, and "EX-99.1: 8-K 2026-10-05T21:08:55.000Z".
 *
 * - The date is the ET calendar date of `publishedAt` (Commercial read 51, required): "Oct 5", with the year
 *   when it is not the reader's current ET year ("Oct 5, 2025"). No date, no date part. Never a clock.
 * - An exhibit: "{exhibitType} to {parentForm}" (the stored title's own form, read 50), built from fields so
 *   rows stored with the old "EX-99.1: 8-K {ISO}" title read the same as new ones.
 * - An SEC filing: "{form}", then the filing's own description in lower case only when it says more than
 *   the form. "Says more" is a closed list held as data (read 51): a miss costs a redundant label, never a
 *   false one.
 * - Anything else: its title as today.
 * - Within one list: one entry per URL; a second DIFFERENT source whose label is identical gets " (2)", a
 *   third " (3)", so a reader is never told there is one filing where there are two.
 * Never printed: an id, an accession number, an ISO time, "null", an empty title.
 */

import type { EvidenceLink } from '@/lib/research/view';

import { humanise } from './language';

/** EDGAR descriptions that only restate the form (Marketing answer 1, read 51). Compared without case. */
export const GENERIC_DESCRIPTIONS: readonly string[] = [
  'CURRENT REPORT',
  'QUARTERLY REPORT',
  'ANNUAL REPORT',
  'REGISTRATION STATEMENT',
  'PROSPECTUS',
  'PROSPECTUS SUPPLEMENT',
  'FOREIGN PRIVATE ISSUER REPORT',
];

/** The separator between labels in the supply ledger, after " · sources " (Marketing answer 4). */
export const SOURCE_LABEL_SEPARATOR = '; ';

const ET_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function etParts(at: number): { year: string; monthDay: string } | null {
  if (!Number.isFinite(at)) return null;
  const parts = ET_PARTS.formatToParts(new Date(at));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return year && month && day ? { year, monthDay: `${month} ${day}` } : null;
}

/** "Oct 5" in the reader's ET year, "Oct 5, 2025" otherwise; null when there is no readable date. */
export function sourceLabelDate(publishedAt: string | null | undefined, nowMs: number): string | null {
  if (!publishedAt) return null;
  const at = etParts(Date.parse(publishedAt));
  if (!at) return null;
  const now = etParts(nowMs);
  return now && now.year === at.year ? at.monthDay : `${at.monthDay}, ${at.year}`;
}

const EXHIBIT_TITLE = /^\s*(EX-[0-9A-Za-z.]+)/i;

function clean(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text === '' || text.toLowerCase() === 'null' ? null : text;
}

function exhibitOf(link: EvidenceLink): string | null {
  const declared = clean(link.exhibitType);
  if (declared) return declared;
  const fromTitle = clean(link.title)?.match(EXHIBIT_TITLE);
  return fromTitle ? fromTitle[1].toUpperCase() : null;
}

function describes(description: string, form: string): boolean {
  const said = description.toUpperCase();
  return said !== form.toUpperCase() && !GENERIC_DESCRIPTIONS.includes(said);
}

/** The label's body, after the date. */
export function sourceLabelBody(link: EvidenceLink): string {
  const form = clean(link.secForm);
  const exhibit = exhibitOf(link);
  if (exhibit) return form ? `${exhibit} to ${form}` : exhibit;
  const title = clean(link.title);
  if (form) return title && describes(title, form) ? `${form}, ${title.toLowerCase()}` : form;
  return title ?? humanise(link.sourceType);
}

/** One source's label: "{date}, {body}", or the body alone when there is no date. */
export function sourceLabel(link: EvidenceLink, nowMs: number): string {
  const date = sourceLabelDate(link.publishedAt, nowMs);
  const body = sourceLabelBody(link);
  return date ? `${date}, ${body}` : body;
}

export interface LabelledSource {
  link: EvidenceLink;
  label: string;
}

/** One list's labels: one entry per URL, in order; identical labels on different sources numbered from the second. */
export function sourceLabels(links: readonly EvidenceLink[], nowMs: number): LabelledSource[] {
  const urls = new Set<string>();
  const counts = new Map<string, number>();
  const out: LabelledSource[] = [];
  for (const link of links) {
    if (urls.has(link.url)) continue;
    urls.add(link.url);
    const label = sourceLabel(link, nowMs);
    const n = (counts.get(label) ?? 0) + 1;
    counts.set(label, n);
    out.push({ link, label: n === 1 ? label : `${label} (${n})` });
  }
  return out;
}
