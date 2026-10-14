/**
 * The Summary's length backstop (Integration's ruling on Research's option B, 2026-10-08, after report 23 ran seven
 * sentences: docs/research/reports-v6/report-23-findings-2026-10-08.md). The prompt asks for the length; this keeps it.
 *
 * Applied AFTER the check, to a narrative that passed: it keeps the first N sentences and drops the rest. It never
 * strikes the whole Summary, never rewrites a sentence, and never adds one the checked narrative did not have. Cutting
 * from the end keeps every antecedent ("none of them" points back, never forward), so a kept sentence still reads as
 * checked.
 *
 * The count keep (Commercial read 124, Integration's defect fix, 2026-10-14): writers usually put the count sentence
 * ("Of the 12 names the desk covers, 5 had fresh news in our sources.") last, so the cut dropped it. When it does, the
 * checked count sentence is appended verbatim after the first N, so a recap may publish five and an intraday four.
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

/**
 * The count sentence's fixed shape, anchored at both ends: it opens with the count and ends with no further clause (no
 * comma, semicolon or colon after the fixed words), so a sentence that only mentions the covered names, or joins the
 * count to a move ("MI was up 14 percent after the close, and 5 of the 12 names ..."), is not the count. The shapes:
 *   "Of the 12 names the desk covers, 5 had fresh news in our sources."  (v7 drafts)
 *   "Eight of the 12 names the desk covers had fresh news in our sources."  (v6's shape, digits or a number word)
 *   "None of the names the desk covers had fresh news we could find."  (v6's zero)
 *   "Fresh news was found for 5 of the 12 names the desk covers."  (report 23, live v6)
 * The captured word must be a count (COUNT_WORD), so "Each of the names the desk covers had fresh news ..." is not one.
 */
const COUNT_SENTENCE =
  /^(?:Of the (?:\d+ )?names the desk covers, (\w+) (?:had|has|have) fresh news|(\w+) of (?:the )?(?:\d+ )?names the desk covers (?:had|has|have) fresh news|Fresh news was found for (\w+) of (?:the )?(?:\d+ )?names the desk covers)[^,;:]*$/i;
const COUNT_WORD =
  /^(?:\d+|none|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|all)$/i;

/** True when `sentence` (one sentence, as splitSentences returns it) is the Summary's count of covered names with fresh news. */
export function isCountSentence(sentence: string): boolean {
  const match = COUNT_SENTENCE.exec(sentence);
  if (match === null) return false;
  return COUNT_WORD.test(match[1] ?? match[2] ?? match[3] ?? '');
}

/**
 * The narrative as published: capped by its kind and, when the cut dropped the count sentence, that sentence appended
 * verbatim after the kept ones (Commercial read 124). Nothing is appended when the count is already among the kept
 * sentences, when the narrative has no count sentence, or when nothing was cut. null stays null.
 */
export function capNarrative(kind: ReportKind, narrative: string | null): string | null {
  if (narrative === null) return null;
  const max = isEveningRecap(kind) ? NARRATIVE_MAX_SENTENCES.recap : NARRATIVE_MAX_SENTENCES.intraday;
  const sentences = splitSentences(narrative);
  const kept = capSentences(narrative, max);
  if (sentences.length <= max || sentences.slice(0, max).some(isCountSentence)) return kept;
  // A draft can carry the count sentence more than once (f71c48c2's v7 PREMARKET drafts repeat it after an intraday
  // part): only the FIRST cut one is appended, so the published Summary has at most one count.
  const count = sentences.slice(max).find(isCountSentence);
  return count === undefined ? kept : `${kept} ${count}`;
}
