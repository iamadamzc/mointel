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
  VWAP_SESSION_KEY,
  vwapSessionForPhase,
  type SessionOpen,
  type SessionOpenSet,
  type SessionOpenState,
  type VwapSession,
} from '@/lib/market/vwap';

/**
 * How much to trust the anchor this move is measured from.
 *
 * THREE STATES, NOT TWO, and the third is the one that costs something to get
 * wrong. `tradeCount` is nullable INDEPENDENTLY of `price` on purpose — a bar
 * with no trade count is unreported, and a minute with no trades has no bar at
 * all. Neither is "one trade", and a zero default would erase exactly the
 * honesty he asked for.
 *
 * `UNKNOWN` must therefore render as its own state and never as silence,
 * because silence is what a SOLID anchor also looks like. That is the same rule
 * as `NULL means NOT MEASURED, never []` on the activity window — and the same
 * defect, one column over, as a zero-fill certifying a measurement that never
 * happened.
 */
export type AnchorTrust = 'SOLID' | 'THIN' | 'UNKNOWN';

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
 * How thin an anchoring minute has to be before the surface says so.
 *
 * THE DEAD LINE, NOT A NEW NUMBER. `deadRatio` already defines the point below
 * which this desk does not consider a minute active — 30/min at his 300 and
 * 10x. Inventing a second threshold would put two definitions of "thin" in one
 * product, and the desk has paid for that shape repeatedly.
 *
 * Derived from the config so tuning the engine moves it, rather than leaving a
 * typed constant behind to go quietly wrong.
 */
export function thinAnchorLine(config = DEFAULT_ACTIVITY_CONFIG): number {
  return deadLineFor(config);
}

function trustOf(open: SessionOpen, config = DEFAULT_ACTIVITY_CONFIG): AnchorTrust {
  if (open.tradeCount === null || !Number.isFinite(open.tradeCount)) return 'UNKNOWN';
  return open.tradeCount <= thinAnchorLine(config) ? 'THIN' : 'SOLID';
}

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
    trust: trustOf(open, config),
    tradeCount: open.tradeCount,
  };
}
