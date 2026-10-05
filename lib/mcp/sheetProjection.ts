import { setupGradeView, type SetupGrade, type SetupGradeLetter } from '../dashboard/setupGrade';

/*
 * WHAT THE MCP TOOLS SAY ABOUT PRIORITY, after the Setup grade (2026-10-05).
 *
 * His ruling 22:04:14.942Z (transcript 1b01d57c), "yes, keep building the badge
 * as approved": the desk shows its OWN Setup grade and stops showing the
 * Sheet's Current/Original Priority. The MCP tools are a second road to the same
 * reader, so they follow, in the same words the badge uses. Assigned to Web by
 * Integration (27th).
 *
 * The Sheet's priority is not stripped here: it no longer exists on
 * MomentumTicker at all (lib/data/types.ts), so `sheet: row.research` cannot
 * carry it.
 */

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
