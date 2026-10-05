/**
 * The blue-sky line's hover: the deep ceiling, as it traded.
 *
 * Design's pick (a) + (b), 2026-10-02, built by Research in `blueSky.ts`: a
 * ceiling behind a known share consolidation is never the level. The level is
 * the highest high on today's share basis, or none.
 *
 * AS TRADED, NEVER RESCALED (Integration's order, Marketing's locked words,
 * 2026-10-02). The stored deep high is on today's share basis: $855,795.60 for
 * GNPX, a 2018 high times a 44,000-to-1 cumulative consolidation, a price the
 * stock never traded at. The factor is adjusted / raw (`lib/market/splits.ts`),
 * so high / factor recovers the price as it traded ($19.45). The factor is
 * measured from closes, so the recovery carries rounding: "about". The words
 * say "as it traded on {date}" and "Not comparable to today's price", because
 * every other number on the ladder is on today's basis.
 */

import type { BlueSkyThreshold } from '@/lib/market/blueSky';

/** Cents with separators from $1, four places below (the board's sub-dollar precision). */
function dollars(value: number): string {
  const digits = value < 1 ? 4 : 2;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** "44,000-to-1" when the factor is within 1% of a whole ratio above 1; null otherwise. */
function ratioText(factor: number): string | null {
  if (!(factor > 1)) return null;
  const whole = Math.round(factor);
  if (Math.abs(factor - whole) / whole > 0.01) return null;
  return `${whole.toLocaleString('en-US')}-to-1`;
}

/** Null unless a deep ceiling sits behind a known change of share basis (factor known and not 1). */
export function deepCeilingTitle(threshold: Pick<BlueSkyThreshold, 'deepCeiling'>): string | null {
  const deep = threshold.deepCeiling;
  if (!deep || deep.splitFactor === null || deep.splitFactor === 1) return null;
  if (!(deep.splitFactor > 0) || !Number.isFinite(deep.splitFactor) || !Number.isFinite(deep.price)) return null;
  const traded = deep.price / deep.splitFactor;
  const ratio = ratioText(deep.splitFactor);
  const behind = ratio ? `before share consolidations totaling ${ratio}` : 'before a change in the share basis';
  return (
    `Highest stored high: about ${dollars(traded)} as it traded on ${deep.date}, ${behind}. ` +
    `Not comparable to today's price. Reference only.`
  );
}
