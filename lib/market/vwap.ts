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

/** The instant a session's VWAP window opens, in UTC milliseconds. */
export function vwapSessionStartMs(
  session: VwapSession,
  tradingDate: string,
  closeMinutes: number = RTH_END_MIN,
): number {
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
export interface SessionOpen {
  session: VwapSession;
  label: string;
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
    price: null,
    at: null,
    tradeCount: null,
    move: null,
  };
}

export function emptySessionOpenSet(): SessionOpenSet {
  return {
    premarket: emptySessionOpen('PREMARKET'),
    regular: emptySessionOpen('RTH'),
    afterHours: emptySessionOpen('AFTER_HOURS'),
  };
}
