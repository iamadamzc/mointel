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

import type { FloatBasis } from './float';
import { splitFactorAt } from '../market/splits';
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
   * The XBRL concept the denominator came from, and the source that reported it.
   *
   * Carried HERE rather than in a sibling field, because the bound built on this
   * renders the word PROVEN — and a verdict that strong must carry its number,
   * its date, its BASIS and its CITATION in one object. Two structures means a
   * later render shows the verdict without the basis and nobody notices.
   *
   * The concept is not decoration: `us-gaap:CommonStockSharesIssued` includes
   * treasury stock, so it bounds a LOOSER quantity. `float <= outstanding <=
   * issued` still holds, so the bound stays valid -- but it is a weaker claim
   * wearing the same words.
   */
  concept: string | null;
  sourceId: number | null;
  /**
   * `FILED_SHARES_OUTSTANDING` for every row this code writes.
   *
   * Carried because the day a second basis appears is the day an un-labelled
   * number becomes unrecoverable — R&D's rule, and never retrofitted.
   */
  basis: FloatBasis;

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
 * A factor for `date`, refusing to extrapolate past the series' end.
 *
 * `splitFactorAt` falls back to the nearest EARLIER session, which is right
 * INSIDE the series — a non-trading day sits on the prior session's basis, and
 * the next covered session bounds the gap. Past the end there is no bounding
 * session: a date months after the last covered one would inherit that last
 * factor, and a split in between would make two incomparable operands read as
 * comparable — a wrong answer, not a missing one. Beyond coverage is therefore
 * unverifiable, the same three-state rule as everywhere else in this file.
 */
function factorWithinCoverage(
  factors: ReadonlyMap<string, number>,
  lastCovered: string | null,
  date: string,
): number | null {
  if (lastCovered === null || date > lastCovered) return null;
  return splitFactorAt(factors, date);
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
  /** The XBRL concept the count came from, and the source that reported it. */
  concept?: string | null;
  sourceId?: number | null;
  /**
   * Established split factors by trading date — `readSplitFactors`, full
   * stored depth. Not the cycle window: filing dates routinely sit months to
   * years back, and a factor series clipped to 90 sessions returns null for
   * exactly the operands this check exists to compare.
   */
  factors: ReadonlyMap<string, number>;
}): SupplyPair | null {
  const { ledger, sharesOutstanding, sharesOutstandingAsOf, factors } = options;
  const concept = options.concept ?? null;
  const sourceId = options.sourceId ?? null;
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;

  let lastCovered: string | null = null;
  for (const date of factors.keys()) {
    if (lastCovered === null || date > lastCovered) lastCovered = date;
  }

  const denominatorFactor =
    sharesOutstandingAsOf === null
      ? null
      : factorWithinCoverage(factors, lastCovered, sharesOutstandingAsOf.slice(0, 10));

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
    const blockFactor = date === null ? null : factorWithinCoverage(factors, lastCovered, date);

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
    concept,
    sourceId,
    basis: 'FILED_SHARES_OUTSTANDING',
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
