/**
 * Blue sky — a price state, computed only from data that can carry the claim.
 *
 * "Blue sky" means there is no prior price memory above here: no trapped
 * holders waiting to get out even, no shelf where the last advance died. That
 * is a strong claim, and a wrong one is expensive, so this module verifies the
 * threshold before it will let anything be called blue sky.
 *
 * What the desk actually has is `daily_bars`: split-adjusted daily bars fetched
 * from Alpaca for researched tickers, retained roughly 90 trading sessions. So
 * the ceiling here is precisely "the highest prior-session high in the retained
 * split-adjusted window", and it is never described as an all-time high or a
 * 52-week high, because it is neither.
 *
 * Four things can make that ceiling a lie, and each has a guard:
 *
 * 1. **No history at all.** Reported as unavailable rather than as open sky.
 * 2. **A window too shallow to mean anything.** A name with nine sessions on
 *    file is trivially at its highest; that is a fact about the cache, not
 *    about the stock. Below MIN_SESSIONS the level is unverified.
 * 3. **A bad print.** One erroneous high sets a ceiling nothing ever traded at.
 *    A ceiling session whose high towers over its own close is rejected.
 * 4. **An isolated legacy spike.** A single day that no other session came near
 *    is not a shelf of supply. The ceiling must be corroborated by other
 *    sessions before it is trusted.
 *
 * Unadjusted prices are refused outright: after a 1-for-5 reverse split, a raw
 * pre-split high is off by a factor of five and would place blue sky where
 * nobody has ever traded.
 */

import type { DailyBar } from '../research/history';

export type BlueSkyStatus =
  | 'IN_BLUE_SKY'
  | 'BLUE_SKY_ABOVE'
  | 'NOT_BLUE_SKY'
  | 'UNVERIFIED'
  | 'UNAVAILABLE';

/** Sessions of daily history below which no ceiling is trustworthy. */
export const MIN_SESSIONS = 40;

/**
 * How far a ceiling session's high may exceed its own close.
 *
 * A genuine blow-off closes somewhere near its range. A print that spikes 60%
 * above the close of the same session and leaves nothing behind is far more
 * likely to be bad data than a level anybody is trading against.
 */
export const MAX_SPIKE_RATIO = 1.6;

/** Other sessions that must have reached NEAR_CEILING of the high. */
export const MIN_CORROBORATING_SESSIONS = 2;
export const NEAR_CEILING = 0.9;

/**
 * Within this much of the ceiling, the useful framing is "blue sky above $X" —
 * the level is in play. Further below it, the useful framing is that there is
 * overhead supply between here and there.
 */
export const IN_PLAY_PCT = 25;

export interface BlueSkyThreshold {
  /** True only when every guard above passed. */
  verified: boolean;
  /** Highest prior-session high in the retained window. */
  price: number | null;
  date: string | null;
  sessionsObserved: number;
  windowFrom: string | null;
  windowTo: string | null;
  adjustment: string | null;
  /** Plain-language reason the level could not be verified. Null when it was. */
  unverifiedReason: string | null;
}

export interface BlueSkyState {
  status: BlueSkyStatus;
  /** The one trader-facing line for this state. */
  label: string;
  threshold: BlueSkyThreshold;
  /** (price − ceiling) ÷ ceiling × 100. Null without both. */
  distancePct: number | null;
}

export const UNAVAILABLE_THRESHOLD: BlueSkyThreshold = {
  verified: false,
  price: null,
  date: null,
  sessionsObserved: 0,
  windowFrom: null,
  windowTo: null,
  adjustment: null,
  unverifiedReason: 'No daily history is retained for this ticker.',
};

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Derives the ceiling from retained daily bars.
 *
 * `tradingDate` is excluded: overhead supply means levels established BEFORE
 * now, and today's own high is the move being assessed, not a ceiling over it.
 */
export function resolveBlueSkyThreshold(
  bars: readonly DailyBar[],
  options: { tradingDate: string; adjustment?: string | null },
): BlueSkyThreshold {
  const adjustment = options.adjustment ?? null;

  const prior = bars.filter(
    (bar) =>
      bar.tradingDate < options.tradingDate &&
      typeof bar.close === 'number' &&
      bar.close > 0 &&
      typeof bar.high === 'number' &&
      bar.high > 0,
  );

  if (prior.length === 0) return { ...UNAVAILABLE_THRESHOLD };

  const windowFrom = prior[0]!.tradingDate;
  const windowTo = prior[prior.length - 1]!.tradingDate;

  let ceiling = prior[0]!;
  for (const bar of prior) {
    if ((bar.high as number) > (ceiling.high as number)) ceiling = bar;
  }

  const price = ceiling.high as number;
  const base: BlueSkyThreshold = {
    verified: false,
    price,
    date: ceiling.tradingDate,
    sessionsObserved: prior.length,
    windowFrom,
    windowTo,
    adjustment,
    unverifiedReason: null,
  };

  if (adjustment !== 'split') {
    return {
      ...base,
      unverifiedReason:
        'The retained history is not split-adjusted, so a pre-split high cannot be compared with today.',
    };
  }

  if (prior.length < MIN_SESSIONS) {
    return {
      ...base,
      unverifiedReason: `Only ${prior.length} prior session(s) are retained; at least ${MIN_SESSIONS} are needed before a ceiling means anything.`,
    };
  }

  const ceilingClose = ceiling.close as number;
  if (price / ceilingClose > MAX_SPIKE_RATIO) {
    return {
      ...base,
      unverifiedReason: `The ${money(price)} high on ${ceiling.tradingDate} is far above that session's own close and reads as a bad print rather than a traded level.`,
    };
  }

  const corroborating = prior.filter(
    (bar) => bar !== ceiling && (bar.high as number) >= price * NEAR_CEILING,
  ).length;

  if (corroborating < MIN_CORROBORATING_SESSIONS) {
    return {
      ...base,
      unverifiedReason: `The ${money(price)} high on ${ceiling.tradingDate} is an isolated spike — no other retained session came within ${Math.round((1 - NEAR_CEILING) * 100)}% of it.`,
    };
  }

  return { ...base, verified: true };
}

/**
 * Places the current price against a verified ceiling.
 *
 * Nothing is called blue sky unless the threshold verified. An unverified or
 * missing level produces a state that says so, which is the honest answer and
 * the one that keeps a fabricated breakout off the board.
 */
export function resolveBlueSky(
  threshold: BlueSkyThreshold,
  price: number | null | undefined,
): BlueSkyState {
  if (threshold.price === null && threshold.unverifiedReason === UNAVAILABLE_THRESHOLD.unverifiedReason) {
    return {
      status: 'UNAVAILABLE',
      label: 'BLUE-SKY DATA UNAVAILABLE',
      threshold,
      distancePct: null,
    };
  }

  if (!threshold.verified || threshold.price === null) {
    return {
      status: 'UNVERIFIED',
      label: 'BLUE-SKY LEVEL UNVERIFIED',
      threshold,
      distancePct: null,
    };
  }

  const ceiling = threshold.price;
  const usablePrice = typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null;

  if (usablePrice === null) {
    return {
      status: 'BLUE_SKY_ABOVE',
      label: `BLUE SKY ABOVE ${money(ceiling)}`,
      threshold,
      distancePct: null,
    };
  }

  const distancePct = ((usablePrice - ceiling) / ceiling) * 100;

  if (usablePrice > ceiling) {
    return {
      status: 'IN_BLUE_SKY',
      label: `IN VERIFIED BLUE SKY — PRIOR CEILING ${money(ceiling)}`,
      threshold,
      distancePct,
    };
  }

  if (distancePct >= -IN_PLAY_PCT) {
    return {
      status: 'BLUE_SKY_ABOVE',
      label: `BLUE SKY ABOVE ${money(ceiling)}`,
      threshold,
      distancePct,
    };
  }

  return {
    status: 'NOT_BLUE_SKY',
    label: `NOT BLUE SKY — OVERHEAD AT ${money(ceiling)}`,
    threshold,
    distancePct,
  };
}

/** How the retained window should be described wherever the level is shown. */
export function describeBlueSkyWindow(threshold: BlueSkyThreshold): string | null {
  if (threshold.sessionsObserved === 0 || !threshold.windowFrom || !threshold.windowTo) return null;
  return `Highest prior-session high across ${threshold.sessionsObserved} split-adjusted sessions, ${threshold.windowFrom} to ${threshold.windowTo}. Not an all-time or 52-week high.`;
}
