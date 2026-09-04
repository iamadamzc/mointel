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
