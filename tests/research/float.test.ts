import { describe, expect, it } from 'vitest';

import {
  assessFloat,
  FILED_SHARES_CURRENT_DAYS,
  UNIT_MISMATCH_RATIO,
  type FiledShareCount,
  type FloatClaim,
} from '@/lib/research/float';

/**
 * What the desk may say about a float it did not compute.
 *
 * Phase C does not produce a float and is not meant to. It produces a filed
 * share count and a verdict, and the verdict is the deliverable — the whole
 * value over a vendor is being able to say "I cannot verify this one" instead
 * of relaying a number with no rules behind it.
 *
 * The two cases item 14 names as hardest, `ENRDW` and `YJ`, are here as their
 * own tests. Both would pass a naive implementation.
 */

const NOW = new Date('2026-08-21T12:00:00Z');

function filed(over: Partial<FiledShareCount> = {}): FiledShareCount {
  return {
    shares: 10_000_000,
    asOf: '2026-08-11',
    concept: 'dei:EntityCommonStockSharesOutstanding',
    sourceId: 1,
    ...over,
  };
}

function claim(over: Partial<FloatClaim> = {}): FloatClaim {
  return {
    ticker: 'ACME',
    issuerName: 'Acme Corporation Common Stock',
    claimedFloat: 4_000_000,
    basis: 'SHEET_VENDOR',
    filed: filed(),
    asOf: NOW,
    ...over,
  };
}

/** N days before the judgement date, as a cover-page date. */
function agedDays(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

describe('a float that checks out', () => {
  it('is consistent when it sits inside a current filed count', () => {
    const result = assessFloat(claim());

    expect(result.verdict).toBe('CONSISTENT');
    expect(result.ratio).toBeCloseTo(0.4);
    expect(result.denominatorAgeDays).toBe(10);
  });

  it('carries the denominator age even when nothing is wrong', () => {
    // The age is the reader's only way to judge how much the verdict is worth.
    // A CONSISTENT against a 3,000-day-old count is not the same statement as
    // a CONSISTENT against last week's.
    expect(assessFloat(claim()).denominatorAgeDays).not.toBeNull();
  });
});

describe('float above shares outstanding', () => {
  it('is impossible when the count is current', () => {
    const result = assessFloat(claim({ claimedFloat: 12_000_000 }));

    expect(result.verdict).toBe('IMPOSSIBLE');
  });

  it('is only CANNOT_VERIFY when the count is old', () => {
    /*
     * The qualifier that stops the rule inverting the signal. A company that
     * has issued shares since its last filing LEGITIMATELY has a float
     * exceeding the filed count, so on a stale denominator this is evidence of
     * dilution rather than of a broken float -- and the error would run the
     * wrong way, firing hardest on the names that dilute hardest.
     */
    const result = assessFloat({
      ...claim({ claimedFloat: 12_000_000 }),
      filed: filed({ asOf: agedDays(400) }),
    });

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.denominatorAgeDays).toBe(400);
  });

  it('switches verdict exactly at the measured boundary', () => {
    const inside = assessFloat({
      ...claim({ claimedFloat: 12_000_000 }),
      filed: filed({ asOf: agedDays(FILED_SHARES_CURRENT_DAYS) }),
    });
    const outside = assessFloat({
      ...claim({ claimedFloat: 12_000_000 }),
      filed: filed({ asOf: agedDays(FILED_SHARES_CURRENT_DAYS + 1) }),
    });

    expect(inside.verdict).toBe('IMPOSSIBLE');
    expect(outside.verdict).toBe('CANNOT_VERIFY');
  });
});

describe('the unit test, which is not gated on age', () => {
  it('refuses a float that is a fraction of a percent of shares', () => {
    const result = assessFloat(claim({ claimedFloat: 100_000 }));

    expect(result.verdict).toBe('UNIT_MISMATCH');
    expect(result.ratio).toBeCloseTo(0.01);
  });

  it('fires on a stale denominator too, unlike the impossibility test', () => {
    /*
     * Deliberately asymmetric with the rule above, and the asymmetry is the
     * point. An old count UNDERSTATES today's shares, which makes the ratio
     * LARGER. Staleness can therefore hide a unit mismatch but can never
     * manufacture one, so gating this on age would only lose true positives.
     */
    const result = assessFloat({
      ...claim({ claimedFloat: 100_000 }),
      filed: filed({ asOf: agedDays(2_790) }),
    });

    expect(result.verdict).toBe('UNIT_MISMATCH');
  });

  it('lets a genuinely small float through just above the threshold', () => {
    const justAbove = 10_000_000 * (UNIT_MISMATCH_RATIO + 0.001);

    expect(assessFloat(claim({ claimedFloat: justAbove })).verdict).toBe('CONSISTENT');
  });
});

describe('YJ, which fails on both axes at once', () => {
  it('is refused on the ratio alone, without being gated on ADR_ADS', () => {
    /*
     * Item 14's designated worst case: oldest-five staleness AND an ADR the
     * classification records as ordinary. Gating the unit test on ADR_ADS
     * would have missed it, so the test stands on the ratio.
     */
    const result = assessFloat({
      ...claim({ ticker: 'YJ', issuerName: 'Yunji Inc American Depositary Shares' }),
      claimedFloat: 60_000,
      filed: filed({ shares: 21_000_000, asOf: agedDays(2_790) }),
    });

    expect(result.verdict).toBe('UNIT_MISMATCH');
    expect(result.denominatorAgeDays).toBe(2_790);
  });
});

describe('ENRDW, which must not inherit ENRD', () => {
  it('is refused as a derivative before any arithmetic runs', () => {
    /*
     * The float here is ENRD's verbatim and it is internally consistent, so
     * every numeric test passes. Only the question of what the symbol IS
     * catches it -- which is why the derivative check runs first.
     */
    const result = assessFloat(
      claim({ ticker: 'ENRDW', issuerName: 'Enerdyne Inc - Warrants' }),
    );

    expect(result.verdict).toBe('DERIVATIVE_SYMBOL');
    expect(result.ratio).toBeNull();
  });

  it('would have passed on the symbol alone, which is why the name is required', () => {
    /*
     * classifySecurity reads DOTTED suffixes. Nasdaq's fifth-letter convention
     * has no dot, so ENRDW is UNKNOWN on the symbol alone -- and this same
     * claim would otherwise read CONSISTENT. Refusing an unestablished class is
     * what keeps a wiring bug from silently becoming a wrong float.
     */
    const result = assessFloat(claim({ ticker: 'ENRDW', issuerName: null }));

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.detail).toContain('security class not established');
  });

  it('refuses a preferred series too, since the rule is about inheritance', () => {
    // Found running the module over the real universe: TY.PR and C.PRR
    // classify as PREFERRED, not WARRANT, and were passing. A preferred series
    // has its own share count; the common float is not its float.
    expect(
      assessFloat(
        claim({ ticker: 'TY.PR', issuerName: 'Tri-Continental Corporation $2.50 Cumulative Preferred' }),
      ).verdict,
    ).toBe('DERIVATIVE_SYMBOL');
  });

  it('leaves a real LP common unit alone, which a looser rule would not', () => {
    /*
     * The reason the derivative test keys off the classifier rather than
     * searching the name for "unit": 24 short-symbol names in `universe` are
     * ordinary LP common units and trusts. They trade normally and their float
     * is real, so refusing them would be a false positive on the majority of
     * what a contains-rule catches.
     */
    expect(
      assessFloat(
        claim({ ticker: 'PAA', issuerName: 'Plains All American Pipeline, L.P. Common Units representing Limited Partner Interests' }),
      ).verdict,
    ).toBe('CONSISTENT');
  });

  it('refuses units and rights on the same grounds', () => {
    expect(
      assessFloat(claim({ ticker: 'ACMEU', issuerName: 'Acme Acquisition Corp - Units' })).verdict,
    ).toBe('DERIVATIVE_SYMBOL');
    expect(
      assessFloat(claim({ ticker: 'ACMER', issuerName: 'Acme Corp Rights' })).verdict,
    ).toBe('DERIVATIVE_SYMBOL');
  });
});

describe('when there is nothing to check against', () => {
  it('says so rather than passing the float through', () => {
    const result = assessFloat(claim({ filed: null }));

    expect(result.verdict).toBe('NO_FILED_COUNT');
    expect(result.ratio).toBeNull();
  });

  it('reports the filed count as an upper bound when the desk holds no float', () => {
    // Useful on its own: shares outstanding bounds float from above, since
    // every insider share is inside it. But it is not a verified float and the
    // verdict must not imply one.
    const result = assessFloat(claim({ claimedFloat: null }));

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.detail).toContain('10000000');
  });

  it('refuses a filed count whose date cannot be parsed', () => {
    const result = assessFloat({
      ...claim({ claimedFloat: 12_000_000 }),
      filed: filed({ asOf: 'not a date' }),
    });

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.denominatorAgeDays).toBeNull();
  });
});
