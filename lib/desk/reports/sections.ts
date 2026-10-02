/**
 * Report section headings, COMPUTED from stored research, never model text
 * (reports v6 fix (a)). The model-written headings were text the checker never
 * saw (`check.ts` `draftLines`), and three names sat under false ones (LGHL #588
 * "No clear catalyst" while FRESH_FOUND; GOW and CMCT #591 "Fresh and material
 * news" while SECONDARY_STALE). His ruling "b" hid them until this ships.
 *
 * Words are Marketing's, the grouping and order Research's
 * (`docs/Design/report-b-spec.md`): grouped by the as-of catalyst status, fresh
 * first. Design renders each as "LABEL · count" and an empty group as nothing.
 *
 * Applied AFTER the checker's strikes, to the surviving lines: the checker reads
 * the draft as written, so its line ids never move.
 */

import type { ReportSection } from './contract';
import type { ReportResearch } from './research';

/** In display order. A name with no research at the checkpoint is NOT YET RESEARCHED. */
export const SECTION_ORDER = [
  { key: 'FRESH_FOUND', label: 'FRESH NEWS' },
  { key: 'CONFLICTING', label: 'MIXED SIGNALS' },
  { key: 'SECONDARY_STALE', label: 'OLDER NEWS' },
  { key: 'NONE_FOUND', label: 'NO CATALYST FOUND' },
  { key: 'UNKNOWN', label: 'UNCLEAR' },
  { key: 'NOT_RESEARCHED', label: 'NOT YET RESEARCHED' },
] as const;

export function sectionKey(research: ReportResearch | null | undefined): string {
  if (!research) return 'NOT_RESEARCHED';
  const status = research.catalyst.status;
  return SECTION_ORDER.some((s) => s.key === status) ? status : 'UNKNOWN';
}

/**
 * The surviving lines regrouped under computed headings. Within a group, lines
 * keep their written order. A line with no ticker belongs to no name, so it
 * goes in a final group with an EMPTY heading, which the surface renders with
 * no label. Empty groups are dropped.
 */
export function computedSections(
  sections: readonly ReportSection[],
  research: ReadonlyMap<string, ReportResearch>,
): ReportSection[] {
  const lines = sections.flatMap((section) => section.lines);
  const out: ReportSection[] = [];
  for (const { key, label } of SECTION_ORDER) {
    const group = lines.filter((line) => line.ticker !== null && sectionKey(research.get(line.ticker)) === key);
    if (group.length > 0) out.push({ heading: label, lines: group });
  }
  const loose = lines.filter((line) => line.ticker === null);
  if (loose.length > 0) out.push({ heading: '', lines: loose });
  return out;
}
