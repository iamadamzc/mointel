/**
 * Session VWAP — deterministic, session-scoped, and honest about coverage.
 *
 * A trader reads VWAP as "what the average participant paid in THIS session",
 * so the three sessions are accumulated separately and never merged. Premarket
 * VWAP is 04:00–09:30, regular-hours VWAP is 09:30 to the exchange's close for
 * that date, after-hours VWAP runs from that close to 20:00. A bar belongs to
 * exactly one of them, decided by its own timestamp rather than by whatever
 * session happens to be current when it is read.
 *
 * Two rules keep the number trustworthy:
 *
 * 1. **Nothing is carried across a boundary.** At 09:30 the regular bucket
 *    starts empty. A desk that showed the premarket average as "VWAP" at 10:15
 *    would be quoting the wrong session with the right word.
 * 2. **Coverage is reported, not assumed.** The engine can be seeded from a
 *    daily-bar snapshot, which carries volume but not the per-minute notional
 *    behind it. A VWAP computed over only the minutes that arrived afterwards
 *    is a partial answer, and says so, rather than presenting itself as the
 *    session average.
 *
 * There is no interpretation here. Whether price is "holding" or "losing" VWAP
 * is a judgement over time; this module answers only where price is now.
 */

import {
  AFTER_HOURS_END_MIN,
  PREMARKET_START_MIN,
  RTH_END_MIN,
  RTH_START_MIN,
  etDateString,
  etMinutesOfDay,
  etWallClockToUtc,
} from './session';
import type { SessionPhase } from './types';

export type VwapSession = 'PREMARKET' | 'RTH' | 'AFTER_HOURS';

/**
 * How much of the session's volume the VWAP was actually computed over.
 *
 * COMPLETE    — every minute of the session so far is inside the calculation.
 * PARTIAL     — real minutes were observed, but part of the session's volume
 *               arrived as a reconstructed total with no per-minute notional.
 * UNAVAILABLE — no usable minute data for this session.
 */
export type VwapCoverage = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';

/** Trader-facing name. The session is always stated, never implied. */
export const VWAP_LABEL: Record<VwapSession, string> = {
  PREMARKET: 'PM VWAP',
  RTH: 'RTH VWAP',
  AFTER_HOURS: 'AH VWAP',
};

export interface SessionVwap {
  session: VwapSession;
  /** 'PM VWAP' | 'RTH VWAP' | 'AH VWAP'. */
  label: string;
  /** Null whenever coverage is UNAVAILABLE. Never zero as a stand-in. */
  vwap: number | null;
  /** Volume the VWAP was computed over. Not the session's total volume. */
  volume: number | null;
  coverage: VwapCoverage;
}

/** All three sessions of one trading date, held side by side. */
export interface SessionVwapSet {
  premarket: SessionVwap;
  regular: SessionVwap;
  afterHours: SessionVwap;
}

export function emptySessionVwap(session: VwapSession): SessionVwap {
  return {
    session,
    label: VWAP_LABEL[session],
    vwap: null,
    volume: null,
    coverage: 'UNAVAILABLE',
  };
}

export function emptySessionVwapSet(): SessionVwapSet {
  return {
    premarket: emptySessionVwap('PREMARKET'),
    regular: emptySessionVwap('RTH'),
    afterHours: emptySessionVwap('AFTER_HOURS'),
  };
}

/** Keys on the accumulator, in the same order as the sessions themselves. */
export const VWAP_SESSION_KEY: Record<VwapSession, keyof SessionVwapSet> = {
  PREMARKET: 'premarket',
  RTH: 'regular',
  AFTER_HOURS: 'afterHours',
};

/**
 * The notional traded inside one minute bar.
 *
 * The provider's own bar VWAP is used when it exists, because it is computed
 * from every print in the minute rather than from four of them. The typical
 * price is the standard fallback, and is still deterministic — it is arithmetic
 * on the bar, not an estimate of anything.
 */
export function barNotional(bar: {
  volume: number;
  vwap?: number | null;
  high: number;
  low: number;
  close: number;
}): number {
  if (!Number.isFinite(bar.volume) || bar.volume <= 0) return 0;
  if (typeof bar.vwap === 'number' && Number.isFinite(bar.vwap) && bar.vwap > 0) {
    return bar.vwap * bar.volume;
  }
  const typical = (bar.high + bar.low + bar.close) / 3;
  if (!Number.isFinite(typical) || typical <= 0) return 0;
  return typical * bar.volume;
}

/**
 * Which session a timestamp belongs to, on a specific trading date.
 *
 * Returns null for anything outside 04:00–20:00 ET or on another date, so an
 * overnight bar can never be folded into a session it did not happen in.
 */
export function vwapSessionForTs(
  ts: string,
  tradingDate: string,
  closeMinutes: number = RTH_END_MIN,
): VwapSession | null {
  const ms = Date.parse(ts);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  if (etDateString(date) !== tradingDate) return null;

  const minutes = etMinutesOfDay(date);
  if (minutes < PREMARKET_START_MIN) return null;
  if (minutes < RTH_START_MIN) return 'PREMARKET';
  if (minutes < closeMinutes) return 'RTH';
  if (minutes < AFTER_HOURS_END_MIN) return 'AFTER_HOURS';
  return null;
}

/**
 * The instant a session's VWAP window opens, in UTC milliseconds.
 *
 * MEMOIZED by its whole input (session, trading date, close minutes): the engine asks for it per ticker per
 * flush, and each answer costs Intl date formatting (etWallClockToUtc -> etOffsetMs -> etFields), a measured
 * share of the 1 s flush on the SIP thread (Ops flush profile, 2026-10-10). The answer is a constant for a
 * given input, so the cache cannot change a result. Bounded: cleared when it grows past a few days' keys.
 */
export function vwapSessionStartMs(
  session: VwapSession,
  tradingDate: string,
  closeMinutes: number = RTH_END_MIN,
): number {
  const key = `${session}|${tradingDate}|${closeMinutes}`;
  const hit = sessionStartMemo.get(key);
  if (hit !== undefined) return hit;
  const value = computeVwapSessionStartMs(session, tradingDate, closeMinutes);
  if (sessionStartMemo.size >= SESSION_START_MEMO_MAX) sessionStartMemo.clear();
  sessionStartMemo.set(key, value);
  return value;
}

const SESSION_START_MEMO_MAX = 64;
const sessionStartMemo = new Map<string, number>();

function computeVwapSessionStartMs(session: VwapSession, tradingDate: string, closeMinutes: number): number {
  switch (session) {
    case 'PREMARKET':
      return etWallClockToUtc(tradingDate, 4, 0).getTime();
    case 'RTH':
      return etWallClockToUtc(tradingDate, 9, 30).getTime();
    case 'AFTER_HOURS':
      return etWallClockToUtc(
        tradingDate,
        Math.floor(closeMinutes / 60),
        closeMinutes % 60,
      ).getTime();
  }
}

/**
 * The session whose VWAP the desk should be reading right now.
 *
 * POST_MARKET keeps the after-hours number, frozen — the evening is over and
 * its average is the last true one. NEXT_DAY_PREP and CLOSED also resolve to
 * after-hours, which by then belongs to a trading date the engine has already
 * rolled past and therefore reads as unavailable. That is the correct answer:
 * there is no current session average at 02:00.
 */
export function vwapSessionForPhase(phase: SessionPhase): VwapSession {
  if (phase === 'PREMARKET') return 'PREMARKET';
  if (phase === 'RTH') return 'RTH';
  return 'AFTER_HOURS';
}

export function selectSessionVwap(set: SessionVwapSet, phase: SessionPhase): SessionVwap {
  return set[VWAP_SESSION_KEY[vwapSessionForPhase(phase)]];
}

/** Mean price over the accumulated notional. Null rather than zero when empty. */
export function computeVwap(notional: number, volume: number): number | null {
  if (!Number.isFinite(notional) || !Number.isFinite(volume)) return null;
  if (volume <= 0) return null;
  const vwap = notional / volume;
  return Number.isFinite(vwap) && vwap > 0 ? vwap : null;
}

export interface VwapDistance {
  /** price − vwap, in dollars. Signed. */
  absolute: number;
  /** (price − vwap) ÷ vwap × 100. Signed. */
  percent: number;
}

/**
 * How far the current price sits from the session average.
 *
 * A single observation of distance and nothing more. It does not claim the
 * stock is holding, reclaiming or losing VWAP — those are statements about a
 * sequence, and this function only ever sees one point.
 */
export function vwapDistance(
  price: number | null | undefined,
  vwap: number | null | undefined,
): VwapDistance | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  if (typeof vwap !== 'number' || !Number.isFinite(vwap) || vwap <= 0) return null;
  const absolute = price - vwap;
  return { absolute, percent: (absolute / vwap) * 100 };
}

/**
 * The first print of a session, and how thin that print was.
 *
 * The origin for a within-session Move. He ruled it: the FIRST PRINT, one rule
 * for all three sessions, with the anchoring minute's trade count travelling
 * beside it.
 *
 * A VWAP was proposed for this and refused, and the reason is worth keeping.
 * A VWAP is an average over a window; an origin is a point. A name that moves
 * 10% inside its first minute has its VWAP in the middle of that, so the Move
 * would read about 5% before anything had happened -- a bias of half the first
 * minute's range, welded into the reference. And it would not even buy the
 * robustness it was proposed for: with a single odd-lot print, the
 * volume-weighted average of one print is that print.
 *
 * So the thin-anchor risk is EXPOSED rather than smoothed. A premarket open
 * anchored on three trades and one anchored on four hundred are different
 * facts, and the count says which. That is the same choice as PARTIAL coverage
 * on the session averages and UNKNOWN confidence on a float: the desk states
 * the weakness instead of substituting a steadier-looking number.
 */
/**
 * Why there is no open, when there is none.
 *
 * `price: null` had two causes and said neither. Design found it at the surface:
 * a Move reading returned null for a session that HAS NOT BEGUN and for one that
 * has begun and seen no print, so the most informative state -- **this session is
 * running and the name has not traded in it** -- rendered as nothing.
 *
 * The sibling type already had the answer. `SessionVwap` carries
 * `coverage: 'UNAVAILABLE' | 'PARTIAL' | 'COMPLETE'` for exactly this reason,
 * and `SessionOpen` shipped without an equivalent. **The three-state rule
 * applies to `price`, not only to `tradeCount`.**
 */
export type SessionOpenState =
  /** `now` is before this session begins. Nothing could have traded yet. */
  | 'NOT_STARTED'
  /** The session has begun or finished and no print arrived. A measurement. */
  | 'NO_PRINT'
  /** A first print exists and `price` carries it. */
  | 'OPEN'
  /**
   * The producer could not tell NOT_STARTED from NO_PRINT.
   *
   * THIS IS NOT A PLACEHOLDER, it is the honest answer from a reader with no
   * clock. `sessionOpensFromRow` rebuilds opens from nine stored columns and
   * none of them is a state; deriving one would need the after-hours boundary,
   * which moves on an early-close day and is an injected option
   * (`rthCloseMinutes`) rather than anything a trading date implies. A store
   * read that guessed 16:00 would be right most days and silently wrong on the
   * days the desk trades a half session.
   *
   * The sibling field shows the fix: `coverage` is not derived at read time
   * either, it is COMPUTED BY THE ENGINE AND STORED (`pm_vwap_coverage` and
   * its two siblings). The opens shipped with nine columns and needed twelve.
   * Until the missing three exist, a row can prove OPEN from a non-null price
   * and must say UNKNOWN for the rest.
   *
   * A surface may render UNKNOWN as nothing. The difference from the defect
   * Design found is that this nothing is COUNTABLE.
   */
  | 'UNKNOWN';

/**
 * The state an open is in, from a price and a clock.
 *
 * ONE RULE, TWO CALLERS. Any producer holding a clock answers this the same
 * way, and answers it against `vwapSessionStartMs` -- the boundary the VWAP
 * coverage flag already uses -- so two fields on one row cannot disagree about
 * when a session started.
 *
 * `at` is deliberately not consulted: a price that arrived without a minute is
 * still a print, and the open is the price.
 */
export function sessionOpenStateFor(
  session: VwapSession,
  price: number | null,
  asOfMs: number,
  tradingDate: string,
  closeMinutes?: number,
): SessionOpenState {
  if (price !== null) return 'OPEN';
  return asOfMs < vwapSessionStartMs(session, tradingDate, closeMinutes)
    ? 'NOT_STARTED'
    : 'NO_PRINT';
}

/**
 * Whether the minute an open was anchored on is worth measuring from.
 *
 * He asked for this binary -- thick or thin, no middle band -- because it is
 * read at a glance at 07:30 and a third label costs more than it says.
 *
 * THE THRESHOLD IS THE DEAD LINE, NOT THE ACTIVE LINE, and picking the wrong
 * one of his two numbers was the first thing I got wrong here. The active
 * ~300/min answers *is this name running*; measured against real anchors it
 * marks 84% of board rows thin and 98.6% of the whole universe, which is a flag
 * that fires on almost everything and therefore says nothing. The dead line --
 * `active / deadRatio`, his 10x -- answers *is this a real trading minute*,
 * which is the question actually being asked of an anchor. A minute at or below
 * it would not count as living anywhere else on this desk, so a percentage
 * measured from it should not look as confident as one measured from a real one.
 *
 * Both numbers are his and neither was invented here; `deadLineFor` derives it,
 * so moving the 300 moves this with it.
 */
export type AnchorThickness =
  /** Above the dead line. A real minute to measure from. */
  | 'THICK'
  /** At or below the dead line. One odd lot can produce this. */
  | 'THIN'
  /**
   * The feed reported a bar with no trade count.
   *
   * NOT A THIRD BAND -- he ruled the bands binary and this is not a band, it is
   * the absence of the measurement the bands are made of. Calling an unreported
   * count THIN would assert something about the market from a gap in the feed,
   * which is the same error as a stored NO_PRINT produced by a restart.
   */
  | 'UNKNOWN';

export function anchorThickness(
  tradeCount: number | null | undefined,
  deadLine: number,
): AnchorThickness {
  if (typeof tradeCount !== 'number' || !Number.isFinite(tradeCount)) return 'UNKNOWN';
  return tradeCount > deadLine ? 'THICK' : 'THIN';
}

export interface SessionOpen {
  session: VwapSession;
  label: string;
  /** Why `price` is null, when it is. See `SessionOpenState`. */
  state: SessionOpenState;
  /** The opening print of the session, or null before the session has traded. */
  price: number | null;
  /** Minute the anchor came from, so a reader can see WHICH print it was. */
  at: string | null;
  /**
   * Trades in the anchoring minute. Null when the feed did not report one.
   *
   * NULL AND NOT ZERO: a bar with no trade count is unreported, and a minute
   * with no trades has no bar at all. Neither is "one trade".
   */
  tradeCount: number | null;
  /** Percent change from the open to the current price; null without both. */
  move: number | null;
}

export interface SessionOpenSet {
  premarket: SessionOpen;
  regular: SessionOpen;
  afterHours: SessionOpen;
}

export function emptySessionOpen(session: VwapSession): SessionOpen {
  return {
    session,
    label: VWAP_LABEL[session],
    state: 'NOT_STARTED',
    price: null,
    at: null,
    tradeCount: null,
    move: null,
  };
}

/**
 * One session's own high and low, live.
 *
 * He asked for the competitor's levels and this is the single genuine gap: the
 * desk already stores a WHOLE-DAY `sessionHigh`, an after-hours `ahHigh`, and an
 * `rthFinal` frozen at the bell -- so the premarket high exists only in the
 * archive, computed after the fact, and the regular session's own high is not
 * live anywhere.
 *
 * SAME CLASSIFIER AS THE OPENS, deliberately. `vwapSessionForTs` decides which
 * session a bar belongs to from the bar's own timestamp, so a level and the open
 * it is measured against can never disagree about which session they describe --
 * and an early close is already handled there rather than twice.
 *
 * A LEVEL IS CARRIED, NOT A DISTANCE. Nothing here subtracts from the live
 * price. "Prior high 4.80" is an observation; "price 4.79 -- prior high 4.80" on
 * one row is an entry trigger with the reader doing the arithmetic, and that
 * rendering is a surface rule this compute cannot enforce. Publishing the level
 * is the whole of what was authorised.
 */
/*
 * AND THEY ARE NEVER SEEDED, WHICH IS A DIFFERENT EXPOSURE FROM THE DAY-WIDE PAIR.
 *
 * `seedSession` reseeds the day-wide `sessionHigh` from `dailyBar.h`, so after an
 * RTH restart that value CAN survive. These cannot: a daily bar carries ONE high
 * with no session breakdown, so there is nothing to seed them from and they
 * rebuild from post-restart bars alone.
 *
 * NAME THE CONDITION, NOT THE EVENT -- and the event is what the two earlier
 * versions of this table enumerated. What decides the outcome is not WHEN the
 * restart happened. It is **WHICH SESSION MADE THE HIGH**, because a restart
 * rebuilds `sessionHigh` from three sources with three different windows:
 *
 *     seedSession from dailyBar.h            09:30-16:00 + closing cross   ALL symbols
 *     reconstructAfterHours (if rthClosed)   16:00 -> now                  AH-active
 *     focused minute bars                    04:00 -> now                  ~200 symbols
 *
 * `focusCount = max(internalRank * 4, 100)` = **200 names plus pins**
 * (`worker/runtime.ts:916-934`), chosen off `rvolPreview`. **So premarket is
 * recovered for the focused set and for NOBODY ELSE.** A name outside it that
 * made its high before 09:30 is rebuilt from sources that never saw that print,
 * and reads its RTH high instead.
 *
 * MEASURED, 2026-09-18, Ops, after a 21:05Z restart: 1,481 of 7,936 stored rows
 * fell -- GWAV 4.20 to 2.78, MGN 5.61 to 4.21. Of the lost highs, **1,160 printed
 * in PREMARKET**, 229 in after-hours at the reconstruction boundary, 6 in RTH,
 * 64 had no bar at that high. Settled control: 09-17 understated 0 rows, 09-18
 * understated 1,441. `toRow` persists it, so it is written and not a display
 * artefact. **It is a PREMARKET hole.**
 *
 * NOTHING IS LOWERED BY AN OVERWRITE -- THAT CANNOT HAPPEN. `maxOrValue`
 * (`engine.ts:2161`) returns the candidate only when the current value is null,
 * so the seed is monotone. **The loss is the empty accumulator plus an incomplete
 * rebuild**, not a downward write, and *"make the seed refuse to lower" is
 * already true and would be a no-op patch.* The value is not lost and not
 * lowered: it is **rebuilt from sources that never saw the print, which reads as
 * an observation where a null would read as absent.** Ops's sentence.
 *
 * AND `SURVIVES IF ROLLED` WAS TRUE AND STILL WRONG, which is the second time a
 * correction to this line moved the problem sideways. The daily bar rolling is
 * what the condition TESTS -- and a rolled daily bar contains no premarket, so
 * the condition is SATISFIED and the premarket high is gone anyway.
 *
 * ONE BAR, TWO WINDOWS, AND THE JUSTIFICATION SITS WHERE THE TRAP IS.
 * `bootstrapSession`'s own docstring (`worker/runtime.ts:773-775`) says *"Alpaca
 * daily bars carry the full 04:00-20:00 session volume (verified against
 * minute-bar sums)"* -- and that is right, measured independently: only 3 of
 * 2,747 discriminating rows match an RTH-only volume band. **The same bar's HIGH
 * is regular-session only.** So the comment that licenses taking the snapshot is
 * true of the field beside the one that breaks.
 *
 * THE FIX IS A DECISION AND IS UNMADE. Replay the stored minute bars (accurate,
 * and `minute_bars` kept every print), widen the focused set, or refuse to seed
 * a known-incomplete high and say UNKNOWN. `sessionLow` has the mirror defect
 * through `minOrValue` and `dailyBar.l`.
 *
 * So after ANY restart a per-session high is only as complete as this process's
 * own observation of that session, and it will read LOW rather than null -- the
 * post-restart high is a real number about a shorter window. Whoever renders
 * these owns saying so; the anchor's observability answer is the same question.
 *
 * DO NOT USE THESE AS THE CYCLE-START INPUT. Design-tmi caught that trap:
 * `closeChangePct` compares a DAY close to the PRIOR DAY's close, so "has today
 * qualified" is a day-level question and the day-wide high is the correct input
 * as well as the better-surviving one. A latch on a per-session high would look more
 * careful and behave worse.
 *
 * The unwired `lib/market/replay.ts` would repair these and the anchors together,
 * since both rebuild from the same replayed bars.
 */
export interface SessionExtremes {
  session: VwapSession;
  /** 'PM VWAP' | 'RTH VWAP' | 'AH VWAP' -- the session's own name. */
  label: string;
  /** Highest bar high inside this session, or null before it has traded. */
  high: number | null;
  /** Lowest bar low inside this session, or null before it has traded. */
  low: number | null;
}

export interface SessionExtremesSet {
  premarket: SessionExtremes;
  regular: SessionExtremes;
  afterHours: SessionExtremes;
}

export function emptySessionExtremes(session: VwapSession): SessionExtremes {
  return { session, label: VWAP_LABEL[session], high: null, low: null };
}

export function emptySessionExtremesSet(): SessionExtremesSet {
  return {
    premarket: emptySessionExtremes('PREMARKET'),
    regular: emptySessionExtremes('RTH'),
    afterHours: emptySessionExtremes('AFTER_HOURS'),
  };
}

export function emptySessionOpenSet(): SessionOpenSet {
  return {
    premarket: emptySessionOpen('PREMARKET'),
    regular: emptySessionOpen('RTH'),
    afterHours: emptySessionOpen('AFTER_HOURS'),
  };
}
