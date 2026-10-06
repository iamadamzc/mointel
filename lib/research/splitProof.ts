/**
 * Has a split fallen between a filed share count's date and the checkpoint? Rule R1, REGISTERED before this
 * file: docs/research/float-contract/split-proof-r1-registration-2026-10-05.md.
 *
 * Pure: the caller reads the stored daily bars. "NONE" is only ever PROVEN, never assumed; a span the bars
 * cannot vouch for is UNPROVEN, which the float cell treats as "Cannot verify" (`SPLIT_SINCE_COUNT`).
 */
import type { SplitProof } from './insiderBound';

/** A split-sized step: the smallest ordinary split (3-for-2) moves a basis by 1.5, so 1.25 cannot be rounding. */
export const SPLIT_JUMP_FACTOR = 1.25;

export interface SpanBar {
  date: string;
  close: number | null;
  /** The cumulative split factor still to apply (`daily_bars.split_factor`); null on a bar written without a raw comparison. */
  factor: number | null;
}

/** `bars`: oldest first, from the last bar on or before the count's as-of date through the checkpoint date. */
export function splitProofFromBars(bars: readonly SpanBar[], checkpointDate: string): SplitProof {
  if (bars.length < 2) return 'UNPROVEN';
  const last = bars.length - 1;
  // The one null that is allowed: the session in progress on the checkpoint date, which has no factor yet.
  const finalUnfactored = bars[last]!.factor === null && bars[last]!.date === checkpointDate;
  for (let i = 0; i < bars.length; i += 1) {
    if (bars[i]!.factor === null && !(i === last && finalUnfactored)) return 'UNPROVEN';
  }
  const factors = bars.map((bar) => bar.factor).filter((factor): factor is number => factor !== null);
  if (factors.length > 0) {
    const lowest = Math.min(...factors);
    if (!(lowest > 0)) return 'UNPROVEN';
    if (Math.max(...factors) / lowest >= SPLIT_JUMP_FACTOR) return 'FOUND';
  }
  if (finalUnfactored) {
    const before = bars[last - 1]!.close;
    const now = bars[last]!.close;
    if (before === null || now === null || !(before > 0) || !(now > 0)) return 'UNPROVEN';
    if (Math.max(before, now) / Math.min(before, now) >= SPLIT_JUMP_FACTOR) return 'UNPROVEN';
  }
  return 'NONE';
}
