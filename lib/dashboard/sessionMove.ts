/**
 * The move WITHIN the current session, measured from that session's own open.
 *
 * His ruling, in his words: *"where it is now vs session open. use Move."* And
 * the open is *"first print with the trade count"* — a POINT, not an average.
 * He killed the VWAP variant himself and was right: a VWAP is a mean over a
 * window, so a name that moved 10% inside its first minute would read about 5%
 * before anything had happened.
 *
 * THIS IS THE OTHER FAMILY FROM `baselineLabel`, AND THE TWO MUST NOT MIX:
 *
 *     ACROSS sessions, from the last relevant close   PM Gap  · RTH Gap  · AH Gap
 *     WITHIN this session, from its own first print   PM Move · RTH Move · AH Move
 *
 * Two nouns, three prefixes each, and the prefix does the work. `Gain` stays
 * free: on this desk it already means an excursion to a HIGH, and the mover
 * definition rests on it.
 */

import { DEFAULT_ACTIVITY_CONFIG, deadLineFor } from '@/lib/market/activity';
import type { SessionPhase } from '@/lib/market/types';
import {
  anchorThickness,
  VWAP_SESSION_KEY,
  vwapSessionForPhase,
  type AnchorThickness,
  type SessionOpenSet,
  type SessionOpenState,
  type VwapSession,
} from '@/lib/market/vwap';

/**
 * How much to trust the anchor this move is measured from.
 *
 * TWO BANDS AND A NON-BAND, which is his ruling — *"leave it binary."* THICK or
 * THIN, no middle. `UNKNOWN` is NOT a third band: it is the ABSENCE of the
 * measurement the bands are made of. `tradeCount` is nullable independently of
 * `price` on purpose — a bar with no trade count is unreported, a minute with no
 * trades has no bar at all, and neither is "one trade".
 *
 * So `UNKNOWN` must never be drawn as THIN. That would assert something about
 * the market from a gap in the feed, which is the same error as `NULL meaning
 * NOT MEASURED` being rendered as a zero-filled window.
 *
 * THE DEFINITION LIVES IN `vwap.ts`; this alias exists so the field name on the
 * reading still reads as what it is for. *An earlier version of this comment
 * said "three states, not two" — written for a classifier this file no longer
 * owns, and against a ruling that had already made the bands binary.*
 */
export type AnchorTrust = AnchorThickness;

export interface SessionMoveReading {
  /** `PM Move` / `RTH Move` / `AH Move`. Never contains `Gap`. */
  label: string;
  /**
   * WHICH KIND OF ABSENCE, when there is one.
   *
   * This used to return `null` for a session that had not begun AND for one
   * running with nothing traded, so the most informative state on the board --
   * *this name is not trading in a live session* -- rendered as nothing. That
   * is the flat-line defect, one field over: two causes, one null, and it said
   * neither.
   */
  state: SessionOpenState;
  /** Signed percent against the opening print. Null unless `state` is OPEN. */
  move: number | null;
  /** The opening print itself. Null unless `state` is OPEN. */
  openPrice: number | null;
  /** Minute the anchor came from — WHICH print, not just that there was one. */
  at: string | null;
  trust: AnchorTrust;
  /** Trades in the anchoring minute. Null is a fact, not a zero. */
  tradeCount: number | null;
}

const MOVE_LABEL: Record<VwapSession, string> = {
  PREMARKET: 'PM Move',
  RTH: 'RTH Move',
  AFTER_HOURS: 'AH Move',
};

/**
 * The within-session word for a phase.
 *
 * Derived from the same phase mapping the VWAP labels use, rather than a second
 * copy of it — two hand-typed words for one quantity is precisely how the
 * column header and the sort control drifted apart earlier today.
 *
 * There is no unknown-phase arm here, and that is deliberate: outside a session
 * there is no within-session move to name. `sessionMoveReading` returns null in
 * that case and nothing renders, so the label is never asked for.
 */
export function sessionMoveLabel(phase: SessionPhase): string {
  return MOVE_LABEL[vwapSessionForPhase(phase)];
}

/**
 * The same word, plus a title, for a control that is ALWAYS on screen.
 *
 * `sessionMoveLabel` deliberately has no unknown-phase arm: outside a session
 * there is no within-session move to name, and nothing renders. THE SORT BUTTON
 * IS DIFFERENT -- it sits in the control row at 02:00 on a Sunday like every
 * other button, so it needs a word even when `sessionMoveReading` would return
 * null for every row.
 *
 * `Move` bare is that neutral, and it mirrors `baselineLabel`'s bare `Gap`. The
 * two families stay apart at every phase AND at the neutral:
 *
 *     ACROSS sessions   PM Gap  · RTH Gap  · AH Gap  · Gap
 *     WITHIN a session   PM Move · RTH Move · AH Move · Move
 *
 * DERIVED FROM `MOVE_LABEL`, not typed again. The header, the cell and now the
 * sort control are three readers of one quantity, and the last time two of them
 * were typed separately he asked why a row said 19% twice with two meanings.
 */
export function sessionMoveSortLabel(phase: SessionPhase | null): {
  label: string;
  title: string;
} {
  /*
   * `CLOSED` AND `NEXT_DAY_PREP` FALL TO THE NEUTRAL, AND THIS COST HIM A WRONG
   * WORD ON A LIVE BOARD.
   *
   * `vwapSessionForPhase` ends `return 'AFTER_HOURS'` -- a catch-all, correct
   * for picking WHICH VWAP ACCUMULATOR to read, wrong for naming a session on
   * screen. Routing through it printed `AH MOVE` on the sort control at 02:23 ET
   * with `sessionPhase: NEXT_DAY_PREP`, hours after after-hours ended, beside a
   * `GAP` button that had correctly fallen to its own neutral.
   *
   * Two words for the same phase, on one screen, from the two families that were
   * built to mirror each other -- and found by clicking the board rather than by
   * any test, because every test asserted the phases a session actually has.
   *
   * `baselineLabel` already handles these two explicitly and says why: they are
   * the overnight and weekend states and they are NOT RARE. This switches on the
   * phase for the same reason rather than deriving through a mapping whose
   * default arm answers a different question.
   */
  if (phase === null || phase === 'CLOSED' || phase === 'NEXT_DAY_PREP') {
    return {
      label: 'Move',
      title: 'Change within the current session, from its own opening print',
    };
  }
  const session = vwapSessionForPhase(phase);
  return {
    label: MOVE_LABEL[session],
    title: MOVE_TITLE[session],
  };
}

const MOVE_TITLE: Record<VwapSession, string> = {
  PREMARKET: "Change since this premarket session's first print",
  RTH: "Change since the regular session's opening print",
  AFTER_HOURS: "Change since the after-hours session's first print",
};

/*
 * THE CLASSIFIER LIVES IN `vwap.ts` AND THIS FILE NO LONGER HAS ONE.
 *
 * There were briefly two: mine said SOLID/THIN/UNKNOWN, Research's says
 * THICK/THIN/UNKNOWN, and both cut at the dead line — the same boundary under
 * two vocabularies, which is one word typed in two places and exactly how the
 * column header and the sort control drifted apart. Deleted mine.
 *
 * The dead line is still passed rather than hardcoded: `deadLineFor(config)`,
 * so retuning his 300 moves the anchor line with it. `anchorThickness` takes
 * the number rather than reading the config itself, which keeps the threshold
 * one caller's decision instead of a second place that knows about 300.
 */

/**
 * The reading for the session the desk is actually in, or null.
 *
 * NULL RATHER THAN A LABEL WITH NOTHING BEHIND IT. Outside a session — and at
 * 02:00, where the phase resolves to an after-hours set the engine has already
 * rolled past — there is no open, and a cell reading `AH Move —` looks like a
 * broken number where showing nothing reads as what it is. That is the same
 * choice `resolveVwap` makes one field over.
 *
 * The move is recomputed here from the live price rather than read from the
 * stored `move`: the stored one is a snapshot of a comparison that keeps
 * moving, and a surface showing a frozen comparison beside a live price is the
 * two-clocks defect. It is not stored for exactly this reason.
 */
export function sessionMoveReading(
  opens: SessionOpenSet | null | undefined,
  phase: SessionPhase | null | undefined,
  price: number | null,
  config = DEFAULT_ACTIVITY_CONFIG,
): SessionMoveReading | null {
  if (!opens || !phase) return null;
  if (price === null || !Number.isFinite(price)) return null;

  const open = opens[VWAP_SESSION_KEY[vwapSessionForPhase(phase)]];
  if (!open) return null;

  const traded =
    open.price !== null && Number.isFinite(open.price) && open.price > 0 && open.state === 'OPEN';

  if (!traded) {
    /*
     * A READING WITHOUT A NUMBER, so the surface can tell the absences apart.
     * `NO_PRINT` is a measurement and belongs on screen; `UNKNOWN` is the
     * store admitting it cannot say and must NOT be drawn as `NO_PRINT` --
     * that would put "not trading in a live session" on a name where nobody
     * looked, which is the same error in the other direction.
     */
    return {
      label: sessionMoveLabel(phase),
      state: open.state,
      move: null,
      openPrice: null,
      at: open.at,
      trust: 'UNKNOWN',
      tradeCount: open.tradeCount,
    };
  }

  const openPrice = open.price as number;
  return {
    label: sessionMoveLabel(phase),
    state: 'OPEN',
    move: ((price - openPrice) / openPrice) * 100,
    openPrice,
    at: open.at,
    trust: anchorThickness(open.tradeCount, deadLineFor(config)),
    tradeCount: open.tradeCount,
  };
}
