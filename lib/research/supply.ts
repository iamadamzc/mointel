/**
 * Two supply numbers over one share count, and the blocks neither could use.
 *
 * The floor answers "how much supply is PROVEN live" and the total answers
 * "how much has been FILED at most". The gap between them is the unproven
 * supply, made numeric — which is the point: a massive block that cannot be
 * shown to be active lands in the total instead of vanishing, and the reader
 * can see the desk's uncertainty as a width rather than as an absence.
 *
 * Derived here rather than judged by the model, and computed after validation
 * for the same reason `computedCycle` is: the ledger it reads has already been
 * corrected, and the bars it needs are not in the evidence bundle.
 *
 * WHAT THIS REFUSES TO DO, and it is the whole reason the file exists.
 *
 * A block's share count is stated on the basis of the filing that stated it.
 * Shares outstanding is stated on the basis of its own period end. Dividing one
 * by the other compares two different quantities whenever a split sits between
 * them, and the error is silent in exactly the range where it matters most.
 * Measured on the 08-23 production snapshot, across the 55 tickers a pair would
 * render for:
 *
 *     total ratio band   rows   carrying a reverse split
 *     <50%                21          28.6%
 *     100-200%            11          45.5%
 *     >500%                7          71.4%
 *
 * GNLN reads 169,106% because a 424B3 from 2025-04-29 states 1,169,711,239
 * shares against 694,544 outstanding today, behind a 1-for-8 in April 2026 and
 * a 10-Q referring to "reverse stock splits" it never enumerates. A magnitude
 * threshold would catch that one and miss the 100-200% band entirely, where
 * nearly half the rows carry a split and the number still looks plausible.
 *
 * So the test is basis, not size: a block counts only when its basis is KNOWN
 * to match the denominator's. Unknown is not yes — the same three-state rule
 * `blueSky.ts` uses for a deep ceiling, for the same reason.
 */

import { splitFactorAt } from '../market/splits';
import type { DailyBar } from './history';
import type { SupplyBlock } from './types';

/** Why a block could not be counted. Never a judgement about the issuer. */
export type SupplyExclusionReason =
  /** No share count at all — a dollar shelf is capacity, not shares. */
  | 'NO_SHARE_COUNT'
  /** A share count with no date, or a date no price history reaches. */
  | 'BASIS_UNVERIFIABLE'
  /** A share count on a different split basis from the denominator. */
  | 'BASIS_DIFFERS';

export interface SupplyExclusion {
  reason: SupplyExclusionReason;
  /** Block types affected, so the flag can say WHAT it dropped. */
  blockTypes: string[];
  count: number;
}

export interface SupplyPair {
  /** The denominator, and an upper bound on the float. */
  sharesOutstanding: number;
  /** Period end the denominator refers to. */
  sharesOutstandingAsOf: string | null;
  /** Cumulative split factor at that date; null when unestablished. */
  denominatorFactor: number | null;

  /**
   * Proven-live supply, or null when none is proven.
   *
   * NULL AND NOT ZERO, deliberately. Three quarters of rows that render a pair
   * have no comparable KNOWN_ACTIVE block, and "at least 0%" is an absence
   * wearing a number's clothes — a reader cannot tell it from a name whose
   * supply was measured and found to be nothing.
   */
  floorShares: number | null;
  floorRatio: number | null;
  floorBlocks: number;

  /** Every comparable block with a share count, whatever its activity status. */
  totalShares: number | null;
  totalRatio: number | null;
  totalBlocks: number;

  /** What neither number could use, by reason. Empty when nothing was dropped. */
  excluded: SupplyExclusion[];
  /** Convenience for a surface: total blocks behind `excluded`. */
  excludedBlocks: number;

  note: string;
}

/** Activity statuses that count as proven live for the floor. */
const PROVEN_ACTIVE = 'KNOWN_ACTIVE';

/**
 * Cumulative split factors by trading date, from bars the caller already read.
 *
 * Bars carry the factor per session because `daily_bars.adjustment` is written
 * as the literal 'split' on every row and can never report a change of basis.
 */
export function splitFactorsFrom(bars: readonly DailyBar[]): Map<string, number> {
  const factors = new Map<string, number>();
  for (const bar of bars) {
    if (typeof bar.splitFactor === 'number' && Number.isFinite(bar.splitFactor)) {
      factors.set(bar.tradingDate, bar.splitFactor);
    }
  }
  return factors;
}

/** A usable positive share count, or null. */
function shareCount(block: SupplyBlock): number | null {
  const shares = block.amountShares;
  if (typeof shares !== 'number' || !Number.isFinite(shares) || shares <= 0) return null;
  return shares;
}

/**
 * The date a block's share count is stated on.
 *
 * `effectiveDate` is the structured field; `sourceFiling` is free text a model
 * wrote and is deliberately NOT parsed for a date here. Guessing a basis from
 * prose is how a wrong basis would enter looking like a verified one, and an
 * unverifiable block has somewhere honest to go.
 */
function basisDate(block: SupplyBlock): string | null {
  const date = block.effectiveDate;
  if (typeof date !== 'string') return null;
  const trimmed = date.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function addExclusion(
  into: Map<SupplyExclusionReason, { types: Set<string>; count: number }>,
  reason: SupplyExclusionReason,
  block: SupplyBlock,
) {
  const entry = into.get(reason) ?? { types: new Set<string>(), count: 0 };
  entry.count += 1;
  entry.types.add(String(block.type));
  into.set(reason, entry);
}

/**
 * The floor/total pair for one ticker.
 *
 * Null when there is no denominator — 61% of researched names, which is the
 * binding constraint on coverage and not something more filings would fix.
 */
export function computeSupplyPair(options: {
  ledger: readonly SupplyBlock[];
  sharesOutstanding: number;
  sharesOutstandingAsOf: string | null;
  bars: readonly DailyBar[];
}): SupplyPair | null {
  const { ledger, sharesOutstanding, sharesOutstandingAsOf } = options;
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;

  const factors = splitFactorsFrom(options.bars);
  const denominatorFactor =
    sharesOutstandingAsOf === null ? null : splitFactorAt(factors, sharesOutstandingAsOf.slice(0, 10));

  const exclusions = new Map<SupplyExclusionReason, { types: Set<string>; count: number }>();
  let floorShares = 0;
  let floorBlocks = 0;
  let totalShares = 0;
  let totalBlocks = 0;

  for (const block of ledger) {
    const shares = shareCount(block);
    if (shares === null) {
      addExclusion(exclusions, 'NO_SHARE_COUNT', block);
      continue;
    }

    const date = basisDate(block);
    const blockFactor = date === null ? null : splitFactorAt(factors, date);

    /*
     * Both sides must be established. A known block factor against an unknown
     * denominator factor is still two numbers that might not be comparable,
     * and treating the unknown side as agreement is the failure this whole
     * check exists to prevent.
     */
    if (blockFactor === null || denominatorFactor === null) {
      addExclusion(exclusions, 'BASIS_UNVERIFIABLE', block);
      continue;
    }

    /*
     * Compared to the DENOMINATOR's basis rather than to today's.
     *
     * The ratio only needs its two operands to agree with each other. A name
     * whose share count and whose filings all predate a split is internally
     * consistent, and refusing it would drop a correct number.
     */
    if (blockFactor !== denominatorFactor) {
      addExclusion(exclusions, 'BASIS_DIFFERS', block);
      continue;
    }

    totalShares += shares;
    totalBlocks += 1;
    if (block.status === PROVEN_ACTIVE) {
      floorShares += shares;
      floorBlocks += 1;
    }
  }

  const excluded: SupplyExclusion[] = [...exclusions.entries()].map(([reason, entry]) => ({
    reason,
    blockTypes: [...entry.types].sort(),
    count: entry.count,
  }));

  return {
    sharesOutstanding,
    sharesOutstandingAsOf,
    denominatorFactor,
    floorShares: floorBlocks > 0 ? floorShares : null,
    floorRatio: floorBlocks > 0 ? floorShares / sharesOutstanding : null,
    floorBlocks,
    totalShares: totalBlocks > 0 ? totalShares : null,
    totalRatio: totalBlocks > 0 ? totalShares / sharesOutstanding : null,
    totalBlocks,
    excluded,
    excludedBlocks: excluded.reduce((sum, item) => sum + item.count, 0),
    note:
      'floor counts only proven-live supply; total counts every filed block on ' +
      'the same split basis as the share count; excluded blocks are in neither',
  };
}
