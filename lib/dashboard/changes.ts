/**
 * What changed on a ticker, in the language of the stock.
 *
 * §9 item 12 asks for the checkpoint's change classes to be "human-worded;
 * never print the enum". Most of that sentence already existed and was not on
 * screen: `detectChanges` writes `changedFields` AND a `changeSummary` in the
 * same pass, and `AssessmentHistory` renders the enums as the cell's text
 * while the sentence sits in a `title` — the one arrangement the audit's own
 * acceptance criteria forbid twice over ("no `SCREAMING_SNAKE` token in the
 * trader-facing UI", "no content reachable only by hover").
 *
 * So this module is small on purpose. It is not a second change detector and
 * must never become one: it decides what a surface may SAY about a change the
 * assessment already recorded, and every number in the sentence comes from the
 * checkpoint that observed it.
 *
 * THE FALLBACK IS THE POINT, NOT THE DECORATION. Two classes push a field with
 * no note — `ANALYSIS_UPDATED` always, `INTELLIGENCE_STATUS` whenever neither
 * side is a conflict — so a row can carry "something changed" with nothing to
 * say about it. Rows already in the store carry that hole permanently, and no
 * fix to the writer reaches them. A per-class sentence closes it at the read
 * side, for history as well as for today.
 */

/**
 * One sentence per change class, in the trader's language.
 *
 * GENERIC BY DESIGN: these carry no numbers, because a number here would be
 * one this module invented rather than one the checkpoint measured. Where the
 * checkpoint wrote a specific note that note wins, and this is what speaks
 * when it did not.
 *
 * Every class `detectChanges` can push must appear here, and a test asserts
 * that against the detector's own source rather than against a list somebody
 * remembered to update — so a new class fails a test instead of printing its
 * own name to a trader.
 */
export const CHANGE_SENTENCE: Record<string, string> = {
  ENTERED_TOP_N: 'entered the board',
  LEFT_TOP_N: 'left the board',
  NEW_TO_ASSESSMENT: 'first appearance today',
  RANK_IMPROVED: 'moved up the board',
  RANK_DETERIORATED: 'moved down the board',
  PRICE_EXPANSION: 'extended',
  PRICE_RETRACEMENT: 'gave back',
  NEW_HOD: 'new high of day',
  MAJOR_GIVEBACK: 'came off its high',
  SUPPORT_LOST: 'lost support',
  HALT_STATE: 'halt state changed',
  CATALYST_CHANGED: 'catalyst changed',
  STRUCTURE_CHANGED: 'share structure changed',
  CYCLE_CHANGED: 'cycle changed',
  NEW_EVIDENCE: 'new source evidence on file',
  /*
   * Named as a RE-READ rather than as a finding.
   *
   * A new analysis version means the desk looked again; it does not mean the
   * conclusion moved. When it did move, `CATALYST_CHANGED`, `STRUCTURE_CHANGED`
   * or `CYCLE_CHANGED` is pushed beside it and says so in its own words.
   */
  ANALYSIS_UPDATED: 'the desk re-read this name',
  INTELLIGENCE_STATUS: 'research status changed',
};

export interface ChangeReading {
  ticker: string;
  /** What changed, as he would say it. Never an enum, never empty. */
  sentence: string;
  /**
   * The classes behind the sentence.
   *
   * Carried for filtering and for a later tone decision, and deliberately NOT
   * as text a surface could fall back to printing.
   */
  fields: readonly string[];
}

/** Strips the `TICKER: ` the checkpoint writes into its own summary. */
function withoutTicker(summary: string, ticker: string): string {
  const prefix = `${ticker}: `;
  const body = summary.startsWith(prefix) ? summary.slice(prefix.length) : summary;
  return body.replace(/\.$/, '').trim();
}

/**
 * The change on one checkpoint row, or null when nothing changed.
 *
 * `changedFields` is the control and the summary is the text: an empty field
 * list means no change was detected, and that is different from a change the
 * desk could not word. The first returns null; the second returns a sentence
 * built from the classes. Reading the summary alone would collapse the two.
 */
export function changeReading(row: {
  ticker: string;
  changedFields: readonly string[];
  changeSummary: string;
}): ChangeReading | null {
  if (row.changedFields.length === 0) return null;

  const written = withoutTicker(row.changeSummary ?? '', row.ticker);
  if (written) return { ticker: row.ticker, sentence: written, fields: row.changedFields };

  /*
   * No note was written, so the classes speak.
   *
   * An unmapped class contributes NOTHING rather than its own name: the rule
   * is that no enum reaches the trader, and a class nobody has worded yet is a
   * gap in this file rather than something to leak onto the board. It cannot
   * pass silently — the suite asserts this map against the detector's source —
   * and if every class on a row were unmapped the row says the one true thing
   * left, which is that it changed.
   */
  const worded = row.changedFields
    .map((field) => CHANGE_SENTENCE[field])
    .filter((sentence): sentence is string => Boolean(sentence));

  return {
    ticker: row.ticker,
    sentence: worded.length > 0 ? worded.join('; ') : 'changed since the last checkpoint',
    fields: row.changedFields,
  };
}
