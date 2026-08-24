/**
 * Split events, recovered from price data rather than reported by anyone.
 *
 * Fetch the same window twice — `adjustment: 'raw'` and `adjustment: 'split'` —
 * and the ratio between the two closes on a given date is the cumulative factor
 * still to be applied from that date forward. It is constant between splits and
 * STEPS at each one, so the steps are the split dates and the step sizes are the
 * ratios.
 *
 * Verified against `BTCT` on 2026-08-24: a step at 2022-05-06 from 600 to 20
 * and one at 2023-08-24 from 20 to 1, giving 1-for-30 and 1-for-20; the
 * cumulative factor today is exactly 1 and 30 × 20 = 600 reconciles. No model,
 * no prose, no corporate-actions feed.
 *
 * Why this exists at all: `daily_bars.adjustment` was meant to make "a later
 * change of basis detectable rather than silently mixing adjusted and
 * unadjusted prices", and it is written as the literal `'split'` on every row,
 * so it can never report one. The cumulative factor is the basis stamp that
 * column was supposed to be.
 *
 * And it is what makes a deep ceiling readable. `BTCT`'s all-history
 * split-adjusted high is $14,249.94 on a session that traded four shares; the
 * factor is what lets a reader see that the number sits behind two
 * consolidations rather than treating it as a level someone might defend.
 */

/** A step in the cumulative factor. `ratio` > 1 is a reverse split. */
export interface SplitEvent {
  /** The first session on the NEW basis. */
  tradingDate: string;
  /** Old cumulative factor ÷ new. 30 means a 1-for-30 reverse split. */
  ratio: number;
  factorBefore: number;
  factorAfter: number;
}

export interface SplitDerivation {
  /** Cumulative factor still to apply, per trading date. Empty when underivable. */
  factors: Map<string, number>;
  events: SplitEvent[];
}

/**
 * Relative move in the factor that counts as a candidate step.
 *
 * Well below any real split — the smallest ordinary one, 3-for-2, moves the
 * factor by 33% — and well above the rounding noise in a normal quote. It is
 * only a CANDIDATE threshold because on a sub-cent stock rounding alone can
 * exceed it, which is what `CONFIRM_SESSIONS` is for.
 */
const STEP_TOLERANCE = 0.05;

/**
 * Sessions the new level must hold before a candidate step is believed.
 *
 * A split changes the factor permanently; quote rounding changes it for one
 * bar. Alpaca reports raw closes to four decimals, so a stock at $0.0100 can
 * carry ±5% of implied error in a single session — enough to trip the tolerance
 * on its own. Requiring persistence separates a basis change from a rounding
 * artefact without needing to know the price scale.
 */
const CONFIRM_SESSIONS = 3;

/** Within this, two factors are the same level. */
const SAME_LEVEL = 0.01;

/**
 * Derives the cumulative split factor per session, and the events in it.
 *
 * Both maps are keyed by trading date. Dates present in only one are skipped
 * rather than guessed at, and a zero or missing raw close is skipped for the
 * same reason: a factor derived from a divide-by-zero would be a number where
 * there is no information.
 */
export function deriveSplitFactors(
  adjustedCloses: ReadonlyMap<string, number>,
  rawCloses: ReadonlyMap<string, number>,
): SplitDerivation {
  const factors = new Map<string, number>();
  const dates: string[] = [];

  for (const date of [...adjustedCloses.keys()].sort()) {
    const adjusted = adjustedCloses.get(date);
    const raw = rawCloses.get(date);
    if (typeof adjusted !== 'number' || typeof raw !== 'number') continue;
    if (!Number.isFinite(adjusted) || !Number.isFinite(raw) || raw <= 0) continue;
    factors.set(date, adjusted / raw);
    dates.push(date);
  }

  const events: SplitEvent[] = [];
  if (dates.length === 0) return { factors, events };

  let level = factors.get(dates[0]!)!;

  for (let i = 1; i < dates.length; i += 1) {
    const date = dates[i]!;
    const value = factors.get(date)!;
    if (Math.abs(value / level - 1) <= STEP_TOLERANCE) continue;

    /*
     * Confirmed only if the new level HOLDS. Anything shorter is a quote
     * artefact, and believing one would invent a split — which is worse than
     * missing a real one, because a fabricated basis change would make two
     * genuinely comparable prices look incomparable.
     */
    let held = 0;
    for (let j = i; j < dates.length && held < CONFIRM_SESSIONS; j += 1) {
      if (Math.abs(factors.get(dates[j]!)! / value - 1) > SAME_LEVEL) break;
      held += 1;
    }
    const atSeriesEnd = i + CONFIRM_SESSIONS > dates.length;
    if (held < CONFIRM_SESSIONS && !atSeriesEnd) continue;

    events.push({ tradingDate: date, ratio: level / value, factorBefore: level, factorAfter: value });
    level = value;
  }

  return { factors, events };
}

/**
 * The cumulative factor at a date, from a derived series.
 *
 * Falls back to the nearest EARLIER session, because a factor is a property of
 * the basis rather than of the bar: a date with no bar sits on whatever basis
 * the last traded session did. Null before the series begins, where there is
 * nothing to stand on.
 */
export function splitFactorAt(
  factors: ReadonlyMap<string, number>,
  tradingDate: string,
): number | null {
  const exact = factors.get(tradingDate);
  if (exact !== undefined) return exact;

  let best: number | null = null;
  let bestDate = '';
  for (const [date, factor] of factors) {
    if (date <= tradingDate && date > bestDate) {
      best = factor;
      bestDate = date;
    }
  }
  return best;
}

/**
 * Splits between two dates, newest first. Both ends inclusive of `from`.
 *
 * What a surface needs to say "this level sits behind two consolidations"
 * without refetching anything.
 */
export function splitsBetween(
  events: readonly SplitEvent[],
  from: string,
  to: string,
): SplitEvent[] {
  return events.filter((event) => event.tradingDate > from && event.tradingDate <= to);
}
