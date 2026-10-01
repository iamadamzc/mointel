/**
 * How many stored dossiers carry an inline citation token, by form and by field,
 * measured with the SAME pattern the strip uses (`citations.ts`), so the count
 * and the fix cannot disagree about what a token is.
 *
 * Pure over (version rows, the current-version ids); `scripts/citation-census.ts`
 * reads the rows read-only.
 */

import { withoutCitations } from './citations';

export const CITATION_FORMS = {
  /** "[Source 115982]", "[Sources 4512, 4513]" */
  SOURCE: /\[sources?\s*\d/i,
  /** "[96174, 96176, 119985]", "[4473,4498]" */
  LIST: /\[\d+(?:\s*,\s*\d+)+\]/,
  /** "[115982]" */
  SINGLE: /\[\d{5,}\]/,
} as const;

export type CitationForm = keyof typeof CITATION_FORMS;

export interface CensusCounts {
  versions: number;
  /** Versions with at least one string the strip changes. */
  affected: number;
  byForm: Record<CitationForm, number>;
  /** Top-level dossier field (e.g. "catalyst", "businessDescription") to affected versions. */
  byField: Record<string, number>;
}

function emptyCounts(): CensusCounts {
  return { versions: 0, affected: 0, byForm: { SOURCE: 0, LIST: 0, SINGLE: 0 }, byField: {} };
}

/** The strings in a JSON value that the strip would change, with their top-level field. */
function changedStrings(value: unknown, field: string, out: Array<{ field: string; text: string }>): void {
  if (typeof value === 'string') {
    if (withoutCitations(value) !== value) out.push({ field, text: value });
  } else if (Array.isArray(value)) {
    for (const item of value) changedStrings(item, field, out);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) changedStrings(item, field || key, out);
  }
}

export function citationCensus(
  rows: Iterable<{ id: number; dossier: string }>,
  currentIds: ReadonlySet<number>,
): { all: CensusCounts; current: CensusCounts; unreadable: number } {
  const all = emptyCounts();
  const current = emptyCounts();
  let unreadable = 0;
  for (const row of rows) {
    let dossier: unknown;
    try {
      dossier = JSON.parse(row.dossier);
    } catch {
      unreadable += 1;
      continue;
    }
    const changed: Array<{ field: string; text: string }> = [];
    changedStrings(dossier, '', changed);
    for (const counts of currentIds.has(row.id) ? [all, current] : [all]) {
      counts.versions += 1;
      if (changed.length === 0) continue;
      counts.affected += 1;
      for (const form of Object.keys(CITATION_FORMS) as CitationForm[]) {
        if (changed.some((c) => CITATION_FORMS[form].test(c.text))) counts.byForm[form] += 1;
      }
      for (const field of new Set(changed.map((c) => c.field))) {
        counts.byField[field] = (counts.byField[field] ?? 0) + 1;
      }
    }
  }
  return { all, current, unreadable };
}
