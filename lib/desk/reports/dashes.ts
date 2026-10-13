/**
 * Dashes are REPLACED, not struck. His rule (2026-09-30T10:43:39Z): "no em dashes in any writing. hard rule." His ruling
 * (Research chat 39e1d5a3, uuid 71876cfd, 2026-10-13T01:34:30.470Z, "1 yes"): the em dash is replaced mechanically
 * instead of striking the line; Integration (2026-10-13): a spaced hyphen used as a dash the same way. Commercial read
 * 82: replace "by punctuation that keeps the clause", and measure the lines that change (`ReportDiagnostics.dashes`).
 *
 * The replacement runs on the draft BEFORE the check, so the checker reads the words that are published.
 * - between two figures ("$1 - $20", "2025 - 2026") the dash is a range: " to ";
 * - after punctuation that already ends the clause (",", ";", ":", ".") it adds none: one space;
 * - at the start or the end of a line it goes;
 * - otherwise a comma: "the company said - in a filing - that" reads "the company said, in a filing, that".
 * A hyphen inside a word ("non-binding") or a minus sign ("-5%") has no space on both sides and is never touched.
 */

import type { ReportDraft } from './writer';

/** Built from the code point: an editor or a generator can turn a written escape into the character itself. */
const EM = String.fromCharCode(0x2014);
/**
 * The entity forms as a REGEX literal, as check.ts keeps them: `tests/research/noEmDash.test.ts` decodes entities in
 * every string literal of Research's code (a string can carry HTML rendered later), and this is a matcher, not writing.
 */
const EM_ENTITIES = /&mdash;|&#8212;|&#x2014;/;
const DASH = new RegExp(String.raw`\s*(?:` + EM + '|' + EM_ENTITIES.source + String.raw`)\s*|\s+-\s+`, 'gi');

const FIGURE_END = /[\d%]$/;
const FIGURE_START = /^[$\d]/;
const CLAUSE_END = /[,;:.]$/;

export function replaceDashes(text: string): string {
  return text.replace(DASH, (match, offset: number, whole: string) => {
    const before = whole.slice(0, offset);
    const after = whole.slice(offset + match.length);
    if (before.trim() === '' || after.trim() === '') return '';
    if (FIGURE_END.test(before) && FIGURE_START.test(after)) return ' to ';
    if (CLAUSE_END.test(before)) return ' ';
    return ', ';
  });
}

/** Each draft line the replacement changed, with the writer's own words, for diagnostics. */
export interface DashReplacement {
  /** The line's id in the draft (`check.ts` LineId): 'H', 'O' for the narrative, `S1L2` for a section line. */
  id: string;
  /** The line as the writer wrote it, before the replacement. */
  before: string;
}

/** The draft with every line's dashes replaced, and the lines that changed (ids as `draftLines` numbers them). */
export function replaceDraftDashes(draft: ReportDraft): { draft: ReportDraft; replaced: DashReplacement[] } {
  const replaced: DashReplacement[] = [];
  const swap = (id: string, text: string) => {
    const next = replaceDashes(text);
    if (next !== text) replaced.push({ id, before: text });
    return next;
  };
  return {
    draft: {
      ...draft,
      headline: swap('H', draft.headline),
      ...(typeof draft.overall === 'string' ? { overall: swap('O', draft.overall) } : {}),
      sections: draft.sections.map((section, s) => ({
        ...section,
        lines: section.lines.map((line, l) => ({ ...line, text: swap(`S${s + 1}L${l + 1}`, line.text) })),
      })),
    },
    replaced,
  };
}
