/**
 * Outcome derivation: what the tape did, from raw minute bars.
 *
 * Two deliberate choices, both from `docs/DATA-ARCHIVE.md`.
 *
 * **Raw, never adjusted.** Reverse splits are endemic in this universe and
 * restate adjusted history retroactively, so an adjusted series cannot be
 * compared with the desk's as-seen record of what it believed at the time. The
 * existing `daily_bars` table is split-adjusted and is not a substitute.
 *
 * **Facts, not scores.** Nothing here decides whether a call was good, whether
 * a name qualified for a tier, or whether a setup occurred. Those are read-time
 * views, so a retuned threshold re-scores the history instead of losing it.
 *
 * What minute bars CANNOT do is score a trade. With a $0.15-$0.25 stop and a
 * hold measured in seconds, a one-minute candle on an active small cap is
 * routinely wider than the stop and the target combined, so it cannot say which
 * came first. Everything below is day-grain context; entry quality is tier C
 * work at 10-second grain and is not attempted here.
 */

import {
  AFTER_HOURS_END_MIN,
  PREMARKET_START_MIN,
  RTH_END_MIN,
  RTH_START_MIN,
  etDateString,
  etMinutesOfDay,
} from '../market/session';

/**
 * The cycle fields this archive keeps, flattened from `CycleArc`.
 *
 * A subset deliberately: `recentRvol` is an array and `baseClose`/`cycleHigh`
 * are on the adjusted basis, so storing them beside as-seen prices in the same
 * row would invite exactly the basis confusion this archive keeps catching.
 * What is kept is the shape — where in the move this session sits.
 */
export interface ResolvedCycle {
  phase: string;
  startDate: string | null;
  sessionsInCycle: number | null;
  sessionsSinceHigh: number | null;
  advancePct: number | null;
  retracementPct: number | null;
}

/** The shape Alpaca returns for a bar; re-declared so this module stays pure. */
export interface RawMinuteBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n?: number;
  vw?: number;
}

export interface SymbolOutcome {
  symbol: string;
  tradingDate: string;
  referenceClose: number | null;
  referenceBasis: string | null;
  /** The as-seen prior close, kept even when the adjusted one is the baseline. */
  rawPriorClose: number | null;
  /**
   * Sessions between the most recent split and this date. Null means none found
   * in `splitLookbackSessions` sessions — never "never split".
   */
  splitSessionsAgo: number | null;
  /** How many sessions were searched. Without it a null is unreadable. */
  splitLookbackSessions: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  timeOfHigh: string | null;
  maxGainPct: number | null;
  timeOfMaxGain: string | null;
  volume: number | null;
  dollarVolume: number | null;
  premarketHigh: number | null;
  premarketHighAt: string | null;
  rthOpen: number | null;
  rthHigh: number | null;
  rthLow: number | null;
  /**
   * Close of the last regular-session MINUTE BAR, which EXCLUDES the closing
   * auction. On a thin small cap the cross can move the print several percent,
   * so this is the last continuous-trading price, not the official close. Use
   * `officialClose` when the official number is what is wanted.
   */
  rthClose: number | null;
  /** The session's official close, from the daily bar. Auction included. */
  officialClose: number | null;
  /** The session's official volume, from the daily bar. */
  officialVolume: number | null;
  gainOpen30Pct: number | null;
  gainTo1100Pct: number | null;
  gainToClosePct: number | null;
  nextOpen: number | null;
  nextHigh: number | null;
  /** Null means NOT CAPTURED. Bars cannot see halts; never read it as zero. */
  haltCount: number | null;
  /** Null means NOT CAPTURED, as above. */
  luldEventCount: number | null;
  /**
   * Deterministic cycle phase as of this trading date, from daily bars.
   * Null when no daily series was available to compute it.
   */
  cyclePhase: string | null;
  cycleStartDate: string | null;
  cycleSessionsIn: number | null;
  cycleSessionsSinceHigh: number | null;
  cycleAdvancePct: number | null;
  cycleRetracementPct: number | null;
  minuteBarCount: number;
  adjustmentBasis: string;
  source: string;
  asOf: string;
}

const ELEVEN_HUNDRED_MIN = 11 * 60;
const OPEN_THIRTY_MIN = 10 * 60;

export interface DeriveOutcomeInput {
  symbol: string;
  tradingDate: string;
  bars: readonly RawMinuteBar[];
  referenceClose?: number | null;
  referenceBasis?: string | null;
  /** Regular-session close in minutes since ET midnight; 16:00 on a full day. */
  closeMinutes?: number;
  rawPriorClose?: number | null;
  splitSessionsAgo?: number | null;
  splitLookbackSessions?: number | null;
  /** Cycle as of this date, resolved by the caller from split-adjusted bars. */
  cycle?: ResolvedCycle | null;
  adjustmentBasis?: string;
  source?: string;
  asOf?: string;
  /** The session's own raw daily bar, when one was fetched. */
  dailyBar?: { c: number; v: number } | null;
}

/**
 * One symbol-day of market facts.
 *
 * Bars are filtered to the ET calendar date and the 04:00-20:00 product session
 * window. Anything outside is dropped rather than trusted: a request window is
 * a request, and Sunday-night prints must never land in Monday's totals.
 */
export function deriveOutcome(input: DeriveOutcomeInput): SymbolOutcome {
  const closeMinutes = input.closeMinutes ?? RTH_END_MIN;
  const reference =
    input.referenceClose !== null && input.referenceClose !== undefined && input.referenceClose > 0
      ? input.referenceClose
      : null;

  const inSession = input.bars.filter((bar) => {
    const at = new Date(bar.t);
    if (Number.isNaN(at.getTime())) return false;
    if (etDateString(at) !== input.tradingDate) return false;
    const minute = etMinutesOfDay(at);
    return minute >= PREMARKET_START_MIN && minute < AFTER_HOURS_END_MIN;
  });

  const outcome: SymbolOutcome = {
    symbol: input.symbol,
    tradingDate: input.tradingDate,
    referenceClose: reference,
    referenceBasis: input.referenceBasis ?? null,
    rawPriorClose: input.rawPriorClose ?? null,
    splitSessionsAgo: input.splitSessionsAgo ?? null,
    splitLookbackSessions: input.splitLookbackSessions ?? null,
    sessionHigh: null,
    sessionLow: null,
    timeOfHigh: null,
    maxGainPct: null,
    timeOfMaxGain: null,
    volume: null,
    dollarVolume: null,
    premarketHigh: null,
    premarketHighAt: null,
    rthOpen: null,
    rthHigh: null,
    rthLow: null,
    rthClose: null,
    officialClose: input.dailyBar?.c ?? null,
    officialVolume: input.dailyBar?.v ?? null,
    gainOpen30Pct: null,
    gainTo1100Pct: null,
    gainToClosePct: null,
    nextOpen: null,
    nextHigh: null,
    haltCount: null,
    luldEventCount: null,
    cyclePhase: input.cycle?.phase ?? null,
    cycleStartDate: input.cycle?.startDate ?? null,
    cycleSessionsIn: input.cycle?.sessionsInCycle ?? null,
    cycleSessionsSinceHigh: input.cycle?.sessionsSinceHigh ?? null,
    cycleAdvancePct: input.cycle?.advancePct ?? null,
    cycleRetracementPct: input.cycle?.retracementPct ?? null,
    minuteBarCount: inSession.length,
    adjustmentBasis: input.adjustmentBasis ?? 'raw',
    source: input.source ?? 'alpaca-minute-bar',
    asOf: input.asOf ?? new Date().toISOString(),
  };

  if (inSession.length === 0) return outcome;

  let volume = 0;
  let dollarVolume = 0;
  let sessionHigh = Number.NEGATIVE_INFINITY;
  let sessionLow = Number.POSITIVE_INFINITY;
  let timeOfHigh: string | null = null;
  let premarketHigh = Number.NEGATIVE_INFINITY;
  let premarketHighAt: string | null = null;
  let rthHigh = Number.NEGATIVE_INFINITY;
  let rthLow = Number.POSITIVE_INFINITY;
  let openThirtyHigh = Number.NEGATIVE_INFINITY;
  let toElevenHigh = Number.NEGATIVE_INFINITY;
  let rthOpen: number | null = null;
  let rthClose: number | null = null;

  for (const bar of inSession) {
    const minute = etMinutesOfDay(new Date(bar.t));

    volume += bar.v;
    // vw is the bar's own volume-weighted price when the provider sends one;
    // the typical price is the standard fallback and is close enough for a
    // day-grain dollar-volume figure.
    const price = typeof bar.vw === 'number' && bar.vw > 0 ? bar.vw : (bar.h + bar.l + bar.c) / 3;
    dollarVolume += price * bar.v;

    if (bar.h > sessionHigh) {
      sessionHigh = bar.h;
      timeOfHigh = bar.t;
    }
    if (bar.l < sessionLow) sessionLow = bar.l;

    if (minute < RTH_START_MIN) {
      if (bar.h > premarketHigh) {
        premarketHigh = bar.h;
        premarketHighAt = bar.t;
      }
      continue;
    }

    if (minute < closeMinutes) {
      if (rthOpen === null) rthOpen = bar.o;
      rthClose = bar.c;
      if (bar.h > rthHigh) rthHigh = bar.h;
      if (bar.l < rthLow) rthLow = bar.l;
      if (minute < OPEN_THIRTY_MIN && bar.h > openThirtyHigh) openThirtyHigh = bar.h;
      if (minute < ELEVEN_HUNDRED_MIN && bar.h > toElevenHigh) toElevenHigh = bar.h;
    }
  }

  outcome.volume = volume;
  outcome.dollarVolume = dollarVolume;
  outcome.sessionHigh = finite(sessionHigh);
  outcome.sessionLow = finite(sessionLow);
  outcome.timeOfHigh = timeOfHigh;
  outcome.premarketHigh = finite(premarketHigh);
  outcome.premarketHighAt = premarketHighAt;
  outcome.rthOpen = rthOpen;
  outcome.rthHigh = finite(rthHigh);
  outcome.rthLow = finite(rthLow);
  outcome.rthClose = rthClose;

  outcome.maxGainPct = pctChange(outcome.sessionHigh, reference);
  // With a fixed reference the maximum gain occurs at the session high, so this
  // is the same instant by construction. It is stored because the spec names
  // both and because a future variable reference would separate them.
  outcome.timeOfMaxGain = outcome.maxGainPct === null ? null : timeOfHigh;

  outcome.gainOpen30Pct = pctChange(finite(openThirtyHigh), reference);
  outcome.gainTo1100Pct = pctChange(finite(toElevenHigh), reference);
  // Measured against the OFFICIAL close where one is known: "how did the day
  // finish" means the number the market printed, not the last continuous tick.
  outcome.gainToClosePct = pctChange(outcome.officialClose ?? rthClose, reference);

  return outcome;
}

/**
 * Next-session follow-through, from the next trading date's bars.
 *
 * Separate from `deriveOutcome` because it needs a session that may not have
 * happened yet: a backfill run on Saturday can fill Friday's outcome fully and
 * must still leave `next_open` null rather than reaching for Monday.
 */
export function deriveFollowThrough(
  nextDate: string,
  bars: readonly RawMinuteBar[],
): { nextOpen: number | null; nextHigh: number | null } {
  let nextOpen: number | null = null;
  let nextHigh = Number.NEGATIVE_INFINITY;

  for (const bar of bars) {
    const at = new Date(bar.t);
    if (Number.isNaN(at.getTime())) continue;
    if (etDateString(at) !== nextDate) continue;
    const minute = etMinutesOfDay(at);
    if (minute < PREMARKET_START_MIN || minute >= AFTER_HOURS_END_MIN) continue;

    // The open that matters to this desk is the regular-session open, not the
    // first premarket print.
    if (nextOpen === null && minute >= RTH_START_MIN) nextOpen = bar.o;
    if (bar.h > nextHigh) nextHigh = bar.h;
  }

  return { nextOpen, nextHigh: finite(nextHigh) };
}

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function pctChange(value: number | null, reference: number | null): number | null {
  if (value === null || reference === null) return null;
  return ((value - reference) / reference) * 100;
}
