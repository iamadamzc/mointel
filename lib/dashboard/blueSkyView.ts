/**
 * The blue-sky line's hover: why the deep ceiling is not the level.
 *
 * Design's pick (a) + (b), 2026-10-02, built by Research in `blueSky.ts`: a
 * ceiling behind a known share consolidation is never the level. The level is
 * the highest high on today's share basis, or none.
 *
 * NO DOLLAR FIGURE (Marketing, 2026-10-02). The deep high exists only on
 * today's share basis: $855,795.60 for GNPX is a 2018 high rescaled by a
 * 44,000-to-1 cumulative consolidation, a price the stock never traded at, and
 * a trader reads any dollar figure as a price the name reached. So the hover
 * gives the DATE and the CUMULATIVE consolidation, which is the honest reason
 * the high is not compared (and says plainly the name reverse-split heavily).
 * Marketing's preferred form, the price as actually traded, waits on Research
 * exposing it as a computed field; nothing here derives it.
 */

import type { BlueSkyThreshold } from '@/lib/market/blueSky';

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
  if (!Number.isFinite(deep.splitFactor)) return null;
  const ratio = ratioText(deep.splitFactor);
  const behind = ratio ? `before share consolidations totaling ${ratio}` : 'before a change in the share basis';
  return `Highest stored high is from ${deep.date}, ${behind}, so it is not compared with today's price. Reference only.`;
}
