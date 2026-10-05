/**
 * THE OFF-HOURS MAIN AREA (his ruling 2026-10-05, "B").
 *
 * When the live board has nothing to rank because no session is in progress
 * (CLOSED over weekends and holidays, NEXT_DAY_PREP from 22:00 to 04:00 ET), the
 * main area opens on the newest checkpoint's frozen board instead of an empty
 * one, and the session briefing leads the page. It is NOT the 20:00 to 22:00
 * window: POST_MARKET still has a live (frozen-at-20:00) after-hours board and
 * no new briefing exists before the 22:00 recap.
 *
 * Pure, so each rule is a test rather than a thing to remember in the shell.
 */

import type { AssessmentPanel, AssessmentSummary } from '@/lib/desk/view';
import type { SessionPhase } from '@/lib/market/types';

/** What the viewer chose in the View selector. AUTO is nobody having chosen. */
export type ViewChoice = 'AUTO' | 'LIVE' | number;

/** No session in progress AND the live board has no rows. */
export function isOffHoursEmpty(phase: SessionPhase | null | undefined, liveRowCount: number): boolean {
  return (phase === 'CLOSED' || phase === 'NEXT_DAY_PREP') && liveRowCount === 0;
}

/** The checkpoint the off-hours main area opens on: today's newest, else the carried one. */
export function recapToOpen(panel: Pick<AssessmentPanel, 'today' | 'carried'>): AssessmentSummary | null {
  return panel.today.length > 0 ? panel.today[panel.today.length - 1] : (panel.carried ?? null);
}

/** The selector's checkpoints: today's, or the carried one when today has none. */
export function selectorOptions(panel: Pick<AssessmentPanel, 'today' | 'carried'>): AssessmentSummary[] {
  if (panel.today.length > 0) return panel.today;
  return panel.carried ? [panel.carried] : [];
}

/**
 * Which checkpoint the main area shows: a number, or null for the live board.
 * An explicit choice always wins; AUTO opens on the recap only off-hours, and
 * returns to the live board by itself when the session starts.
 */
export function effectiveView(choice: ViewChoice, offHours: boolean, recap: AssessmentSummary | null): number | null {
  if (choice === 'LIVE') return null;
  if (choice !== 'AUTO') return choice;
  return offHours && recap ? recap.id : null;
}
