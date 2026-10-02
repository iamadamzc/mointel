/**
 * The blue-sky line's hover: the deep ceiling, beside its factor.
 *
 * Design's pick (a) + (b), 2026-10-02, built by Research in `blueSky.ts`
 * (70c534f4): a ceiling behind a known share consolidation is never the
 * level. The level is the highest high on today's share basis, or none. The
 * deep number is kept only for this hover, always with its cumulative split
 * factor beside it, because without the factor it reads as a price a share
 * of today's stock once traded at. It is reference, never the only route to
 * anything a trader needs: the line's own label and sentence say what the
 * level is.
 */

import type { BlueSkyThreshold } from '@/lib/market/blueSky';

function money(value: number): string {
  const digits = value < 1 ? 4 : 2;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Null unless a deep ceiling sits behind a known consolidation (factor known and not 1). */
export function deepCeilingTitle(threshold: Pick<BlueSkyThreshold, 'deepCeiling'>): string | null {
  const deep = threshold.deepCeiling;
  if (!deep || deep.splitFactor === null || deep.splitFactor === 1) return null;
  if (!Number.isFinite(deep.price) || !Number.isFinite(deep.splitFactor)) return null;
  const factor = deep.splitFactor.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return (
    `Highest stored high, from before one or more share consolidations: ${money(deep.price)} on ${deep.date}, ` +
    `on today's share basis (cumulative split factor ${factor}). Reference only, not a level.`
  );
}
