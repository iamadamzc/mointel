/**
 * MORNING CHECK (contract row 22, the Sheet's "Confirmation"): the evening
 * recap compared with the latest morning checkpoint, read from Research's
 * `morningReadOf` frame (`MarketSnapshot.morningRead`), never recomputed here.
 *
 * WHICH ABSENCE IS WHICH, Integration 30th's six rows (amending the 29th's
 * d21e4ba0 for Commercial 15): (1) `morningAt` null: "No morning check yet",
 * "No morning checkpoint has completed for this date."; (2) `morningAt` set and
 * `eveningAt` null: "Unknown", no detail, for every morning-checkpoint name (a
 * recap that did not complete is a fault, not a name new this morning); (3) on
 * the morning checkpoint and in `byTicker`: its state; (4) on the morning
 * checkpoint, not in `byTicker`: not on the evening recap, HIDDEN (Marketing v3:
 * "a name new this morning is not unconfirmed"); (5) NOT on the morning
 * checkpoint and IN `eveningTickers`: "No morning check yet", "This name was not
 * among the names the {morning ET} checkpoint read.", and "Evening recap:
 * {evening ET}." alone; (6) on neither: HIDDEN. Evening membership is read from
 * `eveningTickers` only, never inferred (Commercial 15). The field absent (not
 * wired) prints the face alone; an unreadable read is a fault and reads Unknown.
 *
 * No internal state or reason prints: UNKNOWN never says why (GRADE_NOT_STORED,
 * NOT_GRADED and VERSION_UNREADABLE are engine constants). The word "confirmed"
 * prints nowhere. A stored setup grade goes through the one mapping (AVOID
 * shows as D).
 *
 * Words: Marketing v3 (`docs/marketing/warning-shot-confirmation-words-2026-10-06.md`
 * at 6fed4658, Commercial-passed); the catalyst values NONE, CONFLICTING and NONE_FOUND per
 * Marketing (pm-catalyst-words at 7109a3b1, Commercial 11b), everything else through the
 * board's `humanise`; the row-5 detail and "Evening recap" line Marketing 580583cf, Commercial 15.
 */

import { longDate } from '@/lib/dashboard/floatBound';
import { humanise } from '@/lib/dashboard/language';
import { checkpointTimeET } from '@/lib/dashboard/setupGrade';
import type { Confirmation, ConfirmationPart } from '@/lib/desk/morningRead';
import type { MorningReadPayload } from '@/lib/market/types';

export const MORNING_CHECK_WORDS = {
  label: 'Morning check',
  labelHover: (evening: string) =>
    `Compares the ${evening} recap with the latest morning checkpoint: catalyst grade, catalyst status, catalyst event date and setup grade. Nothing else is compared.`,
  labelHoverNoTimes:
    'Compares the evening recap with the latest morning checkpoint: catalyst grade, catalyst status, catalyst event date and setup grade. Nothing else is compared.',
  compared: (evening: string, morning: string) => `Compared: ${evening} and ${morning}.`,
  unchangedFace: (evening: string) => `Catalyst and setup grade unchanged since ${evening}`,
  unchangedDetail: (evening: string) =>
    `The desk re-read this name's research after the evening checkpoint. Catalyst grade, catalyst status, event date and setup grade are the same as at ${evening}.`,
  revisedFace: (evening: string) => `Revised since ${evening}`,
  notRereadFace: (evening: string) => `Not re-read since ${evening}`,
  notRereadDetail:
    "The desk has not re-read this name's catalyst since the evening checkpoint. The setup grade is the same.",
  notYetFace: 'No morning check yet',
  notYetDetail: 'No morning checkpoint has completed for this date.',
  notOnMorningDetail: (morning: string) => `This name was not among the names the ${morning} checkpoint read.`,
  eveningOnly: (evening: string) => `Evening recap: ${evening}.`,
  unknown: 'Unknown',
  notStated: 'not stated',
  part: {
    CATALYST_GRADE: 'Catalyst grade',
    CATALYST_STATUS: 'Catalyst status',
    EVENT_DATE: 'Catalyst event date',
    PRIORITY_GRADE: 'Setup grade',
  } satisfies Record<ConfirmationPart, string>,
} as const;

/** Catalyst values Marketing worded for these lines; everything else is the board's own phrase. */
const CATALYST_WORD: Record<string, string> = {
  NONE: "no company event in the desk's evidence",
  CONFLICTING: 'conflicting evidence',
  NONE_FOUND: 'no catalyst found in our sources',
};

export type MorningCheckState = 'HIDDEN' | 'NOT_YET' | 'UNKNOWN' | 'UNCHANGED' | 'REVISED' | 'NOT_REREAD';

export interface MorningCheckView {
  state: MorningCheckState;
  /** The label's hover; names the evening time when the frame carries it. */
  labelHover: string;
  face: string;
  /** One sentence under the face, or null (UNKNOWN prints none; REVISED lists `changes`). */
  detail: string | null;
  /** "Compared: 22:00 ET and 07:00 ET." when both checkpoints are known, else null. */
  compared: string | null;
  /** REVISED only: one line per changed part, "Catalyst grade: x to y". */
  changes: string[];
}

function et(iso: string, nowIso: string): string {
  return `${checkpointTimeET(iso, nowIso)} ET`;
}

/** A changed part's value, in display words. A null prints "not stated". */
export function partValue(part: ConfirmationPart, value: string | null): string {
  if (value === null) return MORNING_CHECK_WORDS.notStated;
  if (part === 'PRIORITY_GRADE') return value === 'AVOID' ? 'D' : value;
  if (part === 'EVENT_DATE') return longDate(value) ?? value;
  return CATALYST_WORD[value] ?? humanise(value);
}

function view(
  state: MorningCheckState,
  face: string,
  detail: string | null,
  frame: { eveningAt: string | null; morningAt: string | null },
  nowIso: string,
  changes: string[] = [],
): MorningCheckView {
  const evening = frame.eveningAt ? et(frame.eveningAt, nowIso) : null;
  const morning = frame.morningAt ? et(frame.morningAt, nowIso) : null;
  return {
    state,
    labelHover: evening ? MORNING_CHECK_WORDS.labelHover(evening) : MORNING_CHECK_WORDS.labelHoverNoTimes,
    face,
    detail,
    compared: evening && morning ? MORNING_CHECK_WORDS.compared(evening, morning) : null,
    changes,
  };
}

export function morningCheckView(
  payload: MorningReadPayload | null | undefined,
  ticker: string,
  nowIso: string,
): MorningCheckView {
  const W = MORNING_CHECK_WORDS;
  const none = { eveningAt: null, morningAt: null };
  if (!payload) return view('NOT_YET', W.notYetFace, null, none, nowIso);
  if ('unreadable' in payload) return view('UNKNOWN', W.unknown, null, none, nowIso);

  const frame = { eveningAt: payload.eveningAt, morningAt: payload.morningAt };
  // (1) No morning checkpoint has completed for the date.
  if (payload.morningAt === null) return view('NOT_YET', W.notYetFace, W.notYetDetail, frame, nowIso);
  if (!payload.morningTickers.includes(ticker)) {
    // (5) On the evening recap only; (6) on neither: nothing.
    if (payload.eveningAt === null || !payload.eveningTickers.includes(ticker)) return view('HIDDEN', '', null, frame, nowIso);
    const v = view('NOT_YET', W.notYetFace, W.notOnMorningDetail(et(payload.morningAt, nowIso)), frame, nowIso);
    return { ...v, compared: W.eveningOnly(et(payload.eveningAt, nowIso)) };
  }
  // (2) A morning checkpoint with no completed evening recap.
  if (payload.eveningAt === null) return view('UNKNOWN', W.unknown, null, frame, nowIso);

  const entry = payload.byTicker[ticker];
  if (!entry) return view('HIDDEN', '', null, frame, nowIso);

  const c: Confirmation = entry.confirmation;
  const at = { eveningAt: c.eveningAt ?? payload.eveningAt, morningAt: c.morningAt ?? payload.morningAt };
  const evening = at.eveningAt ? et(at.eveningAt, nowIso) : null;
  switch (c.state) {
    case 'NO_EVENING_CALL':
      return view('HIDDEN', '', null, at, nowIso);
    case 'NOT_YET':
      return view('NOT_YET', W.notYetFace, W.notYetDetail, at, nowIso);
    case 'UNKNOWN':
      return view('UNKNOWN', W.unknown, null, at, nowIso);
  }
  // The three compared states need the evening time in their words; without it they cannot be said truly.
  if (!evening) return view('UNKNOWN', W.unknown, null, at, nowIso);
  if (c.state === 'CONFIRMED') return view('UNCHANGED', W.unchangedFace(evening), W.unchangedDetail(evening), at, nowIso);
  if (c.state === 'NOT_RECHECKED') return view('NOT_REREAD', W.notRereadFace(evening), W.notRereadDetail, at, nowIso);
  const lines = c.changes.map(
    (change) => `${W.part[change.part]}: ${partValue(change.part, change.from)} to ${partValue(change.part, change.to)}`,
  );
  return view('REVISED', W.revisedFace(evening), null, at, nowIso, lines);
}
