import { setupGradeView, type SetupGrade, type SetupGradeLetter } from '../dashboard/setupGrade';
import type { MomentumTicker } from '../data/types';

/*
 * WHAT THE MCP TOOLS SAY ABOUT PRIORITY, after the Setup grade (2026-10-05).
 *
 * His ruling 22:04:14.942Z (transcript 1b01d57c), "yes, keep building the badge
 * as approved": the desk shows its OWN Setup grade and stops showing the
 * Sheet's Current/Original Priority. The MCP tools are a second road to the same
 * reader, so they follow: the Sheet's `priority` (A/B/C/AVOID, stored text) is
 * no longer emitted, and the desk's grade is, in the same words the badge uses.
 * Assigned to Web by Integration (27th).
 */

export type SheetWithoutPriority = Omit<MomentumTicker, 'priority'>;

/** The Sheet row as the tools emit it: everything except its priority. */
export function sheetWithoutPriority(research: MomentumTicker | null): SheetWithoutPriority | null {
  if (!research) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { priority, ...rest } = research;
  return rest;
}

export interface SetupGradeForTools {
  /** The stored grade and per-criterion basis, untouched; null when the desk has none yet. */
  stored: SetupGrade | null;
  /** What the badge shows: a letter, "Not graded", or the empty-value glyph. */
  label: string;
  letter: SetupGradeLetter | null;
  /** The badge's own tooltip sentence, so the tools and the screen say the same thing. */
  tooltip: string;
}

/**
 * The desk's Setup grade for one name, as the tools emit it. The display comes
 * from `setupGradeView`, Design's one mapping (AVOID is shown as D there and
 * nowhere else); this never maps a grade by hand.
 */
export function setupGradeForTools(grade: SetupGrade | null | undefined, nowIso: string): SetupGradeForTools {
  const view = setupGradeView(grade, nowIso);
  return {
    stored: grade ?? null,
    label: view.label,
    letter: view.letter,
    tooltip: view.tooltip,
  };
}
