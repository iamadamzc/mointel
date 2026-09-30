/**
 * The supply pair, shaped for reading.
 *
 * `computeSupplyPair` produces a floor and a filed maximum over one share
 * count. This module decides what a surface may SAY about them, and every rule
 * below exists because the honest statement is narrower than the obvious one.
 *
 * **The denominator is SHARES OUTSTANDING, never float.** That is the whole
 * design of the underlying bound: float can never exceed shares outstanding, so
 * dividing established supply by the share count can only UNDERSTATE the true
 * supply-to-float ratio. Saying "of float" would convert a guaranteed lower
 * bound into a false point estimate, and the copy here never does.
 *
 * It also keeps this reading visibly distinct from the Sheet's prose
 * "Overhang / Float", which is a different quantity rather than a competing
 * estimate of the same one. Two numbers that look alike and are not is worse
 * than either alone.
 */

import { formatShares } from '@/lib/dashboard/risk';
import {
  LOW_FLOAT_CEILING,
  assessFloatBound,
  type FloatBoundVerdict,
  type FloatClaimAssessment,
} from '@/lib/research/float';
import type { SupplyExclusionReason, SupplyPair } from '@/lib/research/supply';

/** Ratio at or above which supply covers every share in existence. */
export const SETTLES_AT = 1;

export interface SupplyReading {
  /**
   * Proven-live supply as a share of the count, or the absence of any.
   *
   * **Null floor renders as "no live supply proven" and NEVER as 0%.** Three
   * quarters of rows with a pair have no comparable established block, and
   * "at least 0%" is an absence wearing a number's clothes — indistinguishable
   * from a name whose supply was measured and found to be nothing.
   */
  floor: string;
  /** True only when a floor was actually established. Drives tone, not copy. */
  floorProven: boolean;
  /**
   * At or above 1.0 the question is settled without a float ever being known:
   * supply equals or exceeds every share in existence, so it necessarily
   * equals or exceeds the float.
   */
  settles: boolean;
  /** The filed maximum, or null when no comparable block carried a count. */
  filedMax: string | null;
  /** The shared denominator, stated once and dated where the date is known. */
  denominator: string;
  /**
   * What neither number could use, counted rather than hidden.
   *
   * The trader's own decision. A bound whose exclusions are invisible cannot be
   * audited — a reader has no way to tell a thin ledger from a heavily filtered
   * one, and the two argue for opposite conclusions.
   */
  exclusions: string | null;
  /**
   * What floor and total each mean, authored by the computation.
   *
   * Identical on every row, so it goes to the hover rather than taking
   * permanent space — the same rule the header chrome was audited against. A
   * constant is worth HAVING and not worth SHOWING.
   */
  method: string;
}

const EXCLUSION_LABEL: Record<SupplyExclusionReason, string> = {
  NO_SHARE_COUNT: 'no share count',
  BASIS_UNVERIFIABLE: 'unverifiable split basis',
  BASIS_DIFFERS: 'a different split basis',
};

/** One decimal below 10x, none above — a 4300% bound needs no tenths. */
function ratioPct(ratio: number): string {
  const pct = ratio * 100;
  return pct >= 1000 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}

function shares(count: number): string {
  return count.toLocaleString();
}

/**
 * WHICH quantity a filed concept bounds, named only when it is LOOSER.
 *
 * Silence means the ordinary quantity, and an unrecorded concept says "shares"
 * without claiming which. One implementation because two renders naming the
 * same basis differently is how a bound and a verdict come to disagree about
 * what they are standing on.
 */
function quantityWord(looser: boolean | null): string {
  return looser === true ? 'shares issued' : looser === false ? 'shares outstanding' : 'shares';
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function supplyReading(pair: SupplyPair | null | undefined): SupplyReading | null {
  if (!pair) return null;

  const settles = pair.floorRatio !== null && pair.floorRatio >= SETTLES_AT;

  const floor =
    pair.floorRatio === null || pair.floorShares === null
      ? 'no live supply proven'
      : settles
        ? // Worth its own sentence: this is the case that needs no float at all.
          `${shares(pair.floorShares)} proven live, exceeding every share outstanding (${ratioPct(pair.floorRatio)})`
        : `at least ${ratioPct(pair.floorRatio)} of shares outstanding: ${shares(pair.floorShares)} proven live across ${plural(pair.floorBlocks, 'block')}`;

  const filedMax =
    pair.totalRatio === null || pair.totalShares === null
      ? null
      : `up to ${ratioPct(pair.totalRatio)} if every filed block is live: ${shares(pair.totalShares)} across ${plural(pair.totalBlocks, 'block')}`;

  const denominator = `${shares(pair.sharesOutstanding)} shares outstanding${
    pair.sharesOutstandingAsOf ? ` as of ${pair.sharesOutstandingAsOf}` : ''
  }`;

  const exclusions =
    pair.excluded.length === 0
      ? null
      : pair.excluded
          .map((entry) => `${plural(entry.count, 'block')} with ${EXCLUSION_LABEL[entry.reason]}`)
          .join(', ');

  return {
    floor,
    floorProven: pair.floorRatio !== null,
    settles,
    filedMax,
    denominator,
    exclusions,
    method: pair.note,
  };
}

/**
 * Why no pair exists — the case that covers five rows in six.
 *
 * `computeSupplyPair` returns null on exactly ONE condition: no filed share
 * count. So this names the absent DENOMINATOR rather than absent knowledge. The
 * blocks themselves are researched and already render as a ledger; what is
 * missing is the ability to divide them, which is the same hole as float.
 *
 * Returns null when there is nothing to explain — no ledger either, so no
 * unanswered question for a reader to have.
 */
export function noDenominatorNote(ledgerBlocks: number): string | null {
  if (ledgerBlocks === 0) return null;
  return 'No filed share count, so this supply cannot be expressed as a ratio.';
}

export interface FloatBoundReading {
  verdict: FloatBoundVerdict;
  /** The claim, in the words he reads. Never a bare number. */
  sentence: string;
  /** Why the bound could not be stated, when it could not. */
  detail: string | null;
  tone: 'pos' | 'dim';
}

/**
 * The float bound as a sentence, including WHICH quantity was bounded.
 *
 * "At most 8.1M shares ISSUED" is a different claim from "at most 8.1M shares
 * OUTSTANDING" and he can tell them apart — issued includes treasury stock, so
 * it bounds a looser quantity. `float <= outstanding <= issued` still holds, so
 * the bound stays valid; it is a weaker claim wearing the same words, on a card
 * that says PROVEN. A schema field he never sees cannot help him.
 *
 * BASIS_UNVERIFIABLE is not an error state. It is the sentence he asked for —
 * a number, a date, a reason, and the boundary of our own knowledge — where a
 * vendor writes N/A.
 */
export function floatBoundReading(
  pair: SupplyPair | null | undefined,
  coverageStart?: string | null,
): FloatBoundReading | null {
  if (!pair) return null;

  const bound = assessFloatBound({
    reportedShares: pair.sharesOutstanding,
    asOf: pair.sharesOutstandingAsOf,
    factor: pair.denominatorFactor,
    concept: pair.concept,
    sourceId: pair.sourceId,
  });

  const quantity = quantityWord(bound.looser);

  if (bound.verdict === 'BASIS_UNVERIFIABLE') {
    const dated = pair.sharesOutstandingAsOf ? ` dated ${pair.sharesOutstandingAsOf}` : '';
    const since = coverageStart ? `; our price history begins ${coverageStart}` : '';
    return {
      verdict: bound.verdict,
      sentence: `Float bound unverifiable: ${shares(pair.sharesOutstanding)} ${quantity}${dated}`,
      detail:
        `${since ? since.slice(2) : 'The share count predates our price history'}` +
        ', so we cannot certify no split occurred in between.',
      tone: 'dim',
    };
  }

  const at = shares(bound.adjustedShares!);
  const asOf = pair.sharesOutstandingAsOf ? ` as of ${pair.sharesOutstandingAsOf}` : '';
  const adjusted = pair.denominatorFactor !== 1 ? ', split-adjusted' : '';

  return {
    verdict: bound.verdict,
    sentence:
      bound.verdict === 'PROVEN'
        ? `Float is at most ${at} ${quantity}${adjusted}`
        : `Float not bounded under ${shares(LOW_FLOAT_CEILING)} — ${at} ${quantity}${adjusted}`,
    detail:
      bound.verdict === 'PROVEN'
        ? `Float cannot exceed the share count${asOf}, whoever holds the rest.`
        : `A share count above the ceiling does not mean the float is large; it means this cannot settle it.`,
    tone: bound.verdict === 'PROVEN' ? 'pos' : 'dim',
  };
}

export interface FloatClaimReading {
  verdict: FloatClaimAssessment['verdict'];
  /** The ONE number on this line: the claim, as the desk received it. */
  float: string;
  /** The verdict, in his four words. */
  label: string;
  /** The bound, cited INSIDE the verdict. Never a second number beside it. */
  reason: string;
  /**
   * Colour only where the desk is contradicting a number he might trade on.
   *
   * CONSISTENT is the absence of a contradiction, not a finding — it says the
   * vendor's float is not impossible, and nothing about whether the float is
   * small. Rendering it green would make "we could not disprove this" look
   * like the positive structural reading, on the one pillar where a float
   * wrongly small is what puts him IN a trade.
   */
  tone: 'neg' | 'dim';
}

/**
 * A borrowed float and the desk's own filed count, as ONE line.
 *
 * THE SHAPE IS THE ARGUMENT. The vendor's float is a CLAIM; the filed count is
 * a BOUND it has to sit under. Two adjacent numbers of equal weight would
 * assert parity and invite averaging them — the one operation that means
 * nothing on this pair — so the bound appears only INSIDE the verdict, as the
 * reason the verdict was reached.
 *
 * The claim's SOURCE is deliberately not on this line. Every element a
 * decision needs is visible — the number, the verdict, the count and its date
 * — and provenance is the thing a reader consults afterwards, which is the
 * same test the supply method was put behind a hover by.
 */
export function floatClaimReading(
  check: FloatClaimAssessment | null | undefined,
): FloatClaimReading | null {
  if (!check) return null;

  const float = formatShares(check.claimedFloat);

  if (check.verdict === 'CANNOT_VERIFY' || check.filedSharesToday === null) {
    return {
      verdict: 'CANNOT_VERIFY',
      float,
      label: 'CANNOT VERIFY',
      reason: check.reason ?? 'the desk has nothing to check this against',
      tone: 'dim',
    };
  }

  const quantity = quantityWord(check.looser);
  const filed = `${formatShares(check.filedSharesToday)} ${quantity}`;
  const asOf = check.asOf ? ` filed ${check.asOf}` : '';
  // Named only when the count was actually moved, so the ordinary case reads
  // as a plain comparison rather than as an adjustment someone should check.
  const adjusted = check.splitAdjusted ? ', split-adjusted' : '';

  if (check.verdict === 'REFUTED') {
    return {
      verdict: check.verdict,
      float,
      label: 'REFUTED',
      reason: `above ${filed}${asOf}${adjusted}. A float cannot exceed the shares that exist`,
      tone: 'neg',
    };
  }

  if (check.verdict === 'CONSISTENT_STALE') {
    return {
      verdict: check.verdict,
      float,
      label: 'CONSISTENT (stale)',
      /*
       * The date is the point, so it is stated rather than the age alone.
       *
       * And the one-way sentence is carried on the line rather than left to a
       * hover: "an older count can confirm and never refute" is what stops a
       * reader discounting this the way an ordinary uncertainty is discounted.
       */
      reason: `under ${filed}${asOf}${adjusted}. An older count can confirm a float and can never refute one`,
      tone: 'dim',
    };
  }

  return {
    verdict: 'CONSISTENT',
    float,
    label: 'CONSISTENT',
    reason: `under ${filed}${asOf}${adjusted}`,
    tone: 'dim',
  };
}
