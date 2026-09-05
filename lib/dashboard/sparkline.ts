/**
 * The activity sparkline: what this name is doing NOW, beside the number that
 * cannot say.
 *
 * RVOL is cumulative and never decays within a session, so at 10:00 a name that
 * ran at 07:15 and died still carries a large figure. This is the correction to
 * that, which is why it renders next to it.
 *
 * The input is `demand.activityWindow` — the SAME array the ACTIVE/DEAD verdict
 * was computed from, persisted by the engine rather than recomputed here. A
 * second measurement taken for the surface could drift from the verdict; this
 * one cannot, structurally.
 */

import { DEFAULT_ACTIVITY_CONFIG } from '@/lib/market/activity';

/**
 * Full height means "at the active line", not "the busiest bar in this row".
 *
 * **Per-row normalisation was the obvious choice and it is wrong.** Scaling each
 * sparkline to its own peak makes a dead name and a raging one both fill their
 * box, so the one comparison he is actually making — scanning DOWN a column of
 * 25 rows — would be against shape alone with magnitude erased. A board of
 * identical-looking charts carrying different magnitudes is the seam a reader
 * cannot see.
 *
 * Imported rather than restated, so the scale moves with the threshold he chose.
 */
export const SPARK_FULL_SCALE = DEFAULT_ACTIVITY_CONFIG.activeTradesPerMinute;

export interface SparklineView {
  /** Raw trades per minute, oldest first. */
  values: number[];
  /** Heights in 0..1, clamped. 1 means at or above the active line. */
  heights: number[];
  /** Busiest minute in the window. */
  peak: number;
  /**
   * Measured and silent — every minute at zero.
   *
   * A real reading, and distinct from not-measured. It renders as a flat line
   * because a flat line is TRUE here.
   */
  silent: boolean;
  /** The span and the numbers, for the hover. */
  title: string;
}

/**
 * The window's span, stated because a sparkline reads as "now" unless it says
 * otherwise.
 *
 * `resolveActivity` judges minute slots t−6 … t−2: `span = max(deadMinutes,
 * reviveMinutes)` back from `settleMinutes`. The most recent minute is excluded
 * deliberately, because a minute still filling undercounts. He holds for
 * seconds, so the lag is not a detail.
 */
export function sparklineSpanLabel(): string {
  const { settleMinutes, deadMinutes, reviveMinutes } = DEFAULT_ACTIVITY_CONFIG;
  const span = Math.max(deadMinutes, reviveMinutes);
  return `${span} minutes ending ${settleMinutes + 1} min ago`;
}

/**
 * Null when the window was never measured — NEVER an empty or zeroed view.
 *
 * `repo.ts` maps a NULL column to `undefined` rather than `[]` for exactly this
 * reason: an empty array drawn as a flat line would say "no trading" where the
 * truth is "not looked at", and a flat line is the most confident-looking null
 * there is. The caller must render the absence, not a chart.
 */
export function sparklineView(window: number[] | undefined | null): SparklineView | null {
  if (!window || window.length === 0) return null;

  const values = window.map((n) => (Number.isFinite(n) && n > 0 ? n : 0));
  const peak = Math.max(...values);
  const heights = values.map((n) => Math.min(1, n / SPARK_FULL_SCALE));

  return {
    values,
    heights,
    peak,
    silent: peak === 0,
    title:
      `Trades per minute over the ${sparklineSpanLabel()}: ${values.join(', ')}. ` +
      `Full height is ${SPARK_FULL_SCALE}/min, the active line.`,
  };
}

/**
 * The price series, as POINTS at traded minutes — never a line.
 *
 * **A line asserts continuity between its points.** At 8% coverage a dashed or
 * dimmed line is still 92% non-data wearing the shape of data, and the eye
 * follows the stroke rather than its texture. Discrete marks assert only the
 * minutes that traded, which is all the desk observed.
 *
 * **And the stronger objection, which is about TRUTH rather than proportion: a
 * line would draw "not observed" identically to "traded and unchanged".** It
 * interpolates across a hole, so a stroke between two traded minutes asserts
 * prices that were never observed — and the two states it flattens are exactly
 * the ones a trader needs apart. With points, a missing minute is a GAP and a
 * flat minute is a MARK LEVEL WITH ITS NEIGHBOUR.
 *
 * This rests on the slots being wall-clock: `activity.ts:261` maps a missing
 * slot to zero rather than omitting it, so a hole OCCUPIES its position and the
 * even spacing is the truth rather than a claim. If that ever changes, this
 * series is indexed by sequence and every argument here collapses.
 *
 * That also makes the first-traded-minute rule STRUCTURAL rather than enforced:
 * no trade, no point, so there is no line to begin at the window edge. Drawing
 * from the edge would show flat-then-rising where the truth is
 * absent-then-rising — on exactly the setup he hunts.
 *
 * **The rate is quoted as 36-42% of top-12 rows opening with a hole. That
 * figure is from `data/market.db`, the LOCAL desk, last written 2026-08-20, and
 * is to be re-taken on production.** The constraint does not depend on it:
 * absent-then-rising is not flat-then-rising at 36% or at 6%, and the structural
 * form above rests on there being no line at all rather than on how often the
 * hole occurs. **Do not quote the rate as measured on the desk he trades.**
 *
 * **No threshold and no gradient.** Coverage is a FIDELITY measure and it was
 * being recruited to answer a RELEVANCE question; on the rows that matter the
 * two run opposite. A cut at 40% would have dimmed a name trading 2,099 times
 * per covered minute, and opacity-by-coverage is the same error made continuous
 * and harder to notice, because no rule declares itself. Sparsity is rendered
 * per point, never as a property of the series.
 */
export interface PricePointsView {
  /** One entry per slot of the FULL activity window, so the two series align. */
  points: Array<{ slot: number; y: number | null }>;
  /** Real prices in the series. Derived upstream, never stored. */
  covered: number;
  /** Minutes the window spans, traded or not. */
  span: number;
  title: string;
}

/**
 * Null when there is no price window at all — NEVER an empty series.
 *
 * A drawn-but-empty axis would say "nothing traded" where the truth is "not
 * measured", and after a market restart the column is legitimately absent while
 * the engine rebuilds its minute maps. That is amnesia, not a reading.
 */
export function pricePointsView(
  price: { startsAt: number; closes: (number | null)[]; covered: number } | undefined | null,
  activityLength: number,
): PricePointsView | null {
  if (!price || price.closes.length === 0) return null;

  const real = price.closes.filter((c): c is number => c !== null && Number.isFinite(c));
  if (real.length === 0) return null;

  const lo = Math.min(...real);
  const hi = Math.max(...real);
  const range = hi - lo;

  /*
   * Scaled to the row's OWN range, unlike the activity bars.
   *
   * The opposite decision from `SPARK_FULL_SCALE`, and deliberately: activity is
   * comparable across rows because trades per minute means the same thing on
   * every one, whereas $2 and $40 names share no price axis. Here shape is the
   * only honest content, so the scale is local — and a flat series sits at
   * mid-height rather than collapsing to a floor that would read as a low.
   */
  const points = price.closes.map((close, i) => ({
    slot: price.startsAt + i,
    y: close === null ? null : range === 0 ? 0.5 : (close - lo) / range,
  }));

  const span = Math.max(activityLength, price.startsAt + price.closes.length);

  return {
    points,
    covered: price.covered,
    span,
    title:
      `Minute closes, ${price.covered} of ${price.closes.length} minutes traded. ` +
      `Range ${lo.toFixed(2)}-${hi.toFixed(2)}. Points mark minutes that traded; gaps did not.`,
  };
}
