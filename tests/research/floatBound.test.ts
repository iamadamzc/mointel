import { describe, expect, it } from 'vitest';

import { LOW_FLOAT_CEILING, assessFloatBound } from '@/lib/research/float';

/**
 * The float bound: shares outstanding, split-adjusted to today, against the
 * ceiling pillar 5 is about.
 *
 * Float cannot exceed shares outstanding, so a share count under the ceiling
 * PROVES the pillar whoever holds the rest. That is the whole argument, and it
 * is conclusive in ONE DIRECTION only — a count above the ceiling proves
 * nothing, because the float may still be tiny.
 *
 * The supply pair deliberately does NOT divide by the split factor: it uses the
 * factor as a comparability guard, because for a RATIO the factor cancels on
 * both sides. A bound has nothing to cancel against — "under ten million" is a
 * question about an absolute number on TODAY's basis.
 */

describe('ZOOZ — the falsification case, and everything else is void until it passes', () => {
  /*
   * 162.00M reported as of 2025-12-31 against a 1-for-20 reverse split
   * effective 2026-06-01. The cumulative factor at that date is 20, and
   * 162.00 / 20.00 = 8.10M — which is exactly what the model read
   * independently off a later cover page. Two routes agreeing, not a
   * derivation to be trusted.
   */
  it('adjusts 162.00M at factor 20.00 to 8.10M', () => {
    const bound = assessFloatBound({
      reportedShares: 162_000_000,
      asOf: '2025-12-31',
      factor: 20,
      concept: 'dei:EntityCommonStockSharesOutstanding',
      sourceId: 1,
    });

    expect(bound.adjustedShares).toBeCloseTo(8_100_000, 0);
    expect(bound.verdict).toBe('PROVEN');
  });

  it('NEVER returns 3,240M, which is the inverted factor by name', () => {
    /*
     * An inverted factor MANUFACTURES PROOF, which is why this is asserted
     * against by value rather than left to the arithmetic. Multiplying gives
     * 3.24B and merely refuses ZOOZ — but on a FORWARD-split name the same
     * inversion understates the count and produces a false PROVEN, in the
     * direction that puts him in a trade.
     */
    const bound = assessFloatBound({
      reportedShares: 162_000_000,
      asOf: '2025-12-31',
      factor: 20,
      concept: null,
      sourceId: null,
    });

    expect(bound.adjustedShares).not.toBe(3_240_000_000);
    expect(bound.adjustedShares!).toBeLessThan(162_000_000);
  });

  it('a forward split raises the count, which is where an inversion would lie', () => {
    /*
     * A 2-for-1 forward split has a cumulative factor BELOW 1 at dates before
     * it, so a stale count is LOWER than today's. Dividing raises it — and an
     * unadjusted 6M would have read PROVEN when the truth is 12M.
     */
    const bound = assessFloatBound({
      reportedShares: 6_000_000,
      asOf: '2025-06-30',
      factor: 0.5,
      concept: null,
      sourceId: null,
    });

    expect(bound.adjustedShares).toBe(12_000_000);
    expect(bound.verdict).toBe('NOT_PROVEN');
  });
});

describe('three populations, never a number and a null', () => {
  it('proves the pillar under the ceiling', () => {
    const bound = assessFloatBound({
      reportedShares: 1_480_000,
      asOf: '2025-12-31',
      factor: 1,
      concept: 'dei:EntityCommonStockSharesOutstanding',
      sourceId: 7,
    });
    expect(bound.verdict).toBe('PROVEN');
    expect(bound.adjustedShares).toBe(1_480_000);
  });

  it('says NOT PROVEN rather than disproving anything', () => {
    // The one-sidedness. A large share count says nothing about the float.
    const bound = assessFloatBound({
      reportedShares: 73_580_000,
      asOf: '2023-09-30',
      factor: 1,
      concept: null,
      sourceId: null,
    });
    expect(bound.verdict).toBe('NOT_PROVEN');
  });

  it('refuses when the basis cannot be established', () => {
    /*
     * A count dated before our price history begins. `factorWithinCoverage`
     * returns null rather than extrapolating, and the bound must carry that
     * through as its own state — not as a null adjusted number wearing a
     * verdict.
     */
    const bound = assessFloatBound({
      reportedShares: 4_330_000,
      asOf: '2018-03-31',
      factor: null,
      concept: null,
      sourceId: null,
    });
    expect(bound.verdict).toBe('BASIS_UNVERIFIABLE');
    expect(bound.adjustedShares).toBeNull();
  });

  it('refuses a zero share count instead of proving the pillar with it', () => {
    /*
     * HQ carries `sharesOutstanding: 0.00M` in the store, and zero satisfies
     * "at most ten million" more completely than any real number could. A
     * failed read wearing the most emphatic passing answer in the set.
     */
    const bound = assessFloatBound({
      reportedShares: 0,
      asOf: '2025-12-31',
      factor: 1,
      concept: null,
      sourceId: null,
    });
    expect(bound.verdict).toBe('BASIS_UNVERIFIABLE');
    expect(bound.adjustedShares).toBeNull();
  });

  it('treats the ceiling itself as proven', () => {
    // Exactly at the line is not above it, and float <= shares outstanding
    // holds with equality.
    expect(
      assessFloatBound({
        reportedShares: LOW_FLOAT_CEILING,
        asOf: '2026-01-01',
        factor: 1,
        concept: null,
        sourceId: null,
      }).verdict,
    ).toBe('PROVEN');
  });
});

describe('the concept is a basis, and a looser one has to say so', () => {
  it('flags shares ISSUED as a looser bound than shares outstanding', () => {
    /*
     * Issued includes treasury stock, so float <= outstanding <= issued. The
     * bound stays VALID — the safe direction — but it is a weaker claim wearing
     * the same words, on a card that says PROVEN. Three of 211 company-facts
     * rows report this concept.
     */
    const bound = assessFloatBound({
      reportedShares: 5_000_000,
      asOf: '2026-01-31',
      factor: 1,
      concept: 'us-gaap:CommonStockSharesIssued',
      sourceId: 3,
    });
    expect(bound.verdict).toBe('PROVEN');
    expect(bound.looser).toBe(true);
  });

  it('does not flag the two concepts that mean shares outstanding', () => {
    for (const concept of [
      'dei:EntityCommonStockSharesOutstanding',
      'us-gaap:CommonStockSharesOutstanding',
    ]) {
      expect(
        assessFloatBound({
          reportedShares: 5_000_000,
          asOf: '2026-01-31',
          factor: 1,
          concept,
          sourceId: 4,
        }).looser,
      ).toBe(false);
    }
  });

  it('does not claim looseness it cannot establish', () => {
    // An unrecorded concept is not evidence that the quantity is the tight one.
    // Absent must not render as reassurance, so it is UNKNOWN rather than false.
    const bound = assessFloatBound({
      reportedShares: 5_000_000,
      asOf: '2026-01-31',
      factor: 1,
      concept: null,
      sourceId: null,
    });
    expect(bound.looser).toBeNull();
  });
});
