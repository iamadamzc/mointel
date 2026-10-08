/**
 * The Summary's length backstop (Integration's ruling on Research's option B, 2026-10-08, after report 23 ran seven
 * sentences: docs/research/reports-v6/report-23-findings-2026-10-08.md). The prompt asks for the length; this keeps it.
 *
 * Applied AFTER the check, to a narrative that passed: it keeps the first N sentences and drops the rest. It never
 * strikes the whole Summary, never rewrites a sentence, and never adds one. Cutting from the end keeps every
 * antecedent ("none of them" points back, never forward), so a kept sentence still reads as checked.
 *
 * The splitter errs toward FEWER sentences: an ambiguous full stop ("U.S.", "Inc.", "Oct. 6", "6 a.m. ET") is not a
 * boundary. Its failure mode is a Summary one sentence longer than the cap, never a cut inside a sentence.
 */
import { isEveningRecap, type ReportKind } from './contract';

/** Recap 4 (Marketing's shape, 60d0dc7e), intraday 3 (Integration's ruling, 2026-10-08). */
export const NARRATIVE_MAX_SENTENCES = { recap: 4, intraday: 3 } as const;

/** Words whose trailing full stop never ends a sentence here. Compared case-sensitively, without the stop. */
const ABBREVIATIONS = new Set([
  'Inc', 'Corp', 'Co', 'Ltd', 'Plc', 'LLC', 'Jr', 'Sr', 'No', 'Nos', 'vs', 'St', 'Mr', 'Ms', 'Mrs', 'Dr', 'approx', 'est',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
]);

/** True when the text before `end` (the full stop's index) is an abbreviation or a run of single letters ("U.S", "a.m"). */
function abbreviationBefore(text: string, end: number): boolean {
  const before = text.slice(0, end);
  if (/(?:^|[\s(])(?:[A-Za-z]\.)+[A-Za-z]$/.test(before)) return true;
  const word = /([A-Za-z]+)$/.exec(before);
  return word !== null && ABBREVIATIONS.has(word[1]!);
}

/**
 * The sentences of `text`, each with its own spacing trimmed. A boundary is `.`, `!` or `?` (plus any closing quote or
 * bracket), then whitespace, then a capital, a digit, `$` or an opening quote or bracket. Decimals ("2.83") have no
 * whitespace after the stop and never split.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const boundary = /[.!?]["')\]”’]*\s+(?=["'(\[“‘]?[A-Z0-9$])/g;
  let start = 0;
  for (let match = boundary.exec(text); match !== null; match = boundary.exec(text)) {
    const stop = match.index;
    if (text[stop] === '.' && abbreviationBefore(text, stop)) continue;
    const end = stop + match[0].trimEnd().length;
    const sentence = text.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = match.index + match[0].length;
  }
  const last = text.slice(start).trim();
  if (last) out.push(last);
  return out;
}

/**
 * The first `max` sentences of `text`. Unchanged (the same string) when it has `max` or fewer. Otherwise the original
 * text up to the end of sentence `max`, so the kept words and their spacing are exactly the checked ones.
 */
export function capSentences(text: string, max: number): string {
  const sentences = splitSentences(text);
  if (sentences.length <= max) return text;
  let at = 0;
  for (const sentence of sentences.slice(0, max)) at = text.indexOf(sentence, at) + sentence.length;
  return text.slice(0, at).trim();
}

/** The narrative as published: capped by its kind. null stays null. */
export function capNarrative(kind: ReportKind, narrative: string | null): string | null {
  if (narrative === null) return null;
  return capSentences(narrative, isEveningRecap(kind) ? NARRATIVE_MAX_SENTENCES.recap : NARRATIVE_MAX_SENTENCES.intraday);
}
