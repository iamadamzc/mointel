import { describe, expect, it } from 'vitest';

import { FILED_SHARES_CURRENT_DAYS, assessFloatAgainstFiled } from '@/lib/research/float';

/**
 * A BORROWED float against the desk's OWN filed count.
 *
 * Four states, the trader's: REFUTED, CONSISTENT, CONSISTENT (stale),
 * CANNOT VERIFY. The rules they encode, which is what these tests assert
 * rather than the branches that implement them:
 *
 * 1. The filed count is a BOUND and the vendor number is a CLAIM. A claim
 *    above the bound is impossible; a claim under it is merely not
 *    contradicted. Nothing here treats them as two estimates of one quantity.
 * 2. A stale count CONFIRMS and never REFUTES — but only after the split
 *    factor has moved it onto today's basis. What is left of the staleness is
 *    issuance, which only ever grows the count.
 * 3. Without a factor the comparison is not cautious, it is VACUOUS: a
 *    reverse-split name inflates its old count until every float fits under
 *    it. That is CANNOT VERIFY, never a pass.
 *
 * `ONE_YEAR` is used for the stale cases rather than a value just past the
 * threshold, so a change to `FILED_SHARES_CURRENT_DAYS` cannot silently turn a
 * stale case fresh. The boundary itself is asserted separately, off the
 * constant.
 */

const TODAY = '2026-09-22';
const FRESH = '2026-09-01'; // 21 days
const ONE_YEAR = '2025-09-22';

/** Shares outstanding. The tight concept; a looser one is tested by name. */
const OUTSTANDING = 'dei:EntityCommonStockSharesOutstanding';

function claim(over: Partial<Parameters<typeof assessFloatAgainstFiled>[0]> = {}) {
  return assessFloatAgainstFiled({
    claimedFloat: 5_530_000,
    reportedShares: 12_400_000,
    sharesAsOf: FRESH,
    factor: 1,
    concept: OUTSTANDING,
    sourceId: 91,
    onDate: TODAY,
    ...over,
  });
}

describe('the claim sits under a current filed count', () => {
  it('is CONSISTENT, and carries the bound that decided it', () => {
    const result = claim()!;

    expect(result.verdict).toBe('CONSISTENT');
    expect(result.filedSharesToday).toBe(12_400_000);
    expect(result.asOf).toBe(FRESH);
    expect(result.reason).toBeNull();
  });

  it('echoes the claim it judged, so a render cannot pair it with another number', () => {
    expect(claim({ claimedFloat: 900_000 })!.claimedFloat).toBe(900_000);
  });

  it('is CONSISTENT at exactly the filed count — a float may equal the shares', () => {
    expect(claim({ claimedFloat: 12_400_000 })!.verdict).toBe('CONSISTENT');
  });
});

describe('the claim exceeds a current filed count', () => {
  it('is REFUTED — a float cannot exceed the shares that exist', () => {
    const result = claim({ claimedFloat: 20_000_000 })!;

    expect(result.verdict).toBe('REFUTED');
    expect(result.filedSharesToday).toBe(12_400_000);
  });

  it('refutes against a LOOSER concept too, and says the concept was looser', () => {
    // float <= outstanding <= issued, so exceeding an ISSUED count is still
    // impossible. The claim is weaker in the confirming direction only.
    const result = claim({
      claimedFloat: 20_000_000,
      concept: 'us-gaap:CommonStockSharesIssued',
    })!;

    expect(result.verdict).toBe('REFUTED');
    expect(result.looser).toBe(true);
  });
});

describe('a stale count confirms and never refutes', () => {
  it('is CONSISTENT_STALE when the claim sits under it', () => {
    const result = claim({ sharesAsOf: ONE_YEAR })!;

    expect(result.verdict).toBe('CONSISTENT_STALE');
    expect(result.asOf).toBe(ONE_YEAR);
    expect(result.denominatorAgeDays).toBe(365);
  });

  it('is CANNOT_VERIFY — not REFUTED — when the claim exceeds it', () => {
    const result = claim({ claimedFloat: 20_000_000, sharesAsOf: ONE_YEAR })!;

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.reason).toMatch(/issued since/);
  });

  it('turns stale one day past the measured currency window', () => {
    // Asserted off the constant rather than off 45, so the window may be
    // re-measured without this test pinning the old value.
    const day = 86_400_000;
    const fresh = new Date(Date.parse(`${TODAY}T00:00:00Z`) - FILED_SHARES_CURRENT_DAYS * day);
    const stale = new Date(fresh.getTime() - day);

    expect(claim({ sharesAsOf: fresh.toISOString().slice(0, 10) })!.verdict).toBe('CONSISTENT');
    expect(claim({ sharesAsOf: stale.toISOString().slice(0, 10) })!.verdict).toBe(
      'CONSISTENT_STALE',
    );
  });
});

describe('the split factor is what makes a stale count usable', () => {
  /*
   * The case the whole design turns on. 162M filed before a 1-for-20 reverse
   * split is 8.1M today. A claimed float of 9M:
   *   - against the ADJUSTED count is above it, so nothing is confirmed;
   *   - against the RAW count is 5.6% of it, and confirms trivially.
   * The unadjusted answer is the reassuring one, and it is wrong.
   */
  it('confirms against the adjusted count, not the count as filed', () => {
    const result = claim({
      claimedFloat: 9_000_000,
      reportedShares: 162_000_000,
      sharesAsOf: ONE_YEAR,
      factor: 20,
    })!;

    expect(result.filedSharesToday).toBe(8_100_000);
    expect(result.splitAdjusted).toBe(true);
    expect(result.verdict).not.toBe('CONSISTENT_STALE');
    expect(result.verdict).toBe('CANNOT_VERIFY');
  });

  it('is CANNOT_VERIFY with no factor, rather than a comparison that cannot fail', () => {
    const result = claim({
      claimedFloat: 9_000_000,
      reportedShares: 162_000_000,
      sharesAsOf: ONE_YEAR,
      factor: null,
    })!;

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.filedSharesToday).toBeNull();
    expect(result.reason).toMatch(/split/);
  });

  it('reports splitAdjusted false at factor 1, so the copy can stay silent', () => {
    expect(claim()!.splitAdjusted).toBe(false);
  });
});

describe('what it declines to judge', () => {
  it('returns null with no claim — the bound speaks alone, and this says nothing', () => {
    expect(claim({ claimedFloat: null })).toBeNull();
    expect(claim({ claimedFloat: 0 })).toBeNull();
  });

  it('is CANNOT_VERIFY with no filed count at all', () => {
    const result = claim({ reportedShares: null })!;

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.filedSharesToday).toBeNull();
    expect(result.reason).toMatch(/no filed share count/);
  });

  it('refuses a filed count of zero, and says WHICH thing is missing', () => {
    /*
     * Zero satisfies "the claim exceeds it" more completely than any real
     * number, so a failed read would otherwise arrive as a confident REFUTED.
     *
     * The verdict alone does not test this function: `assessFloatBound`
     * refuses zero too, so the verdict is right either way and an assertion on
     * it passes with the guard here deleted. What only this guard can get
     * right is the REASON — zero is an absent count, not an unverifiable split
     * basis, and the two send a reader to different places.
     */
    const result = claim({ reportedShares: 0 })!;

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.reason).toMatch(/no filed share count/);
    expect(result.reason).not.toMatch(/split/);
  });

  it('is CANNOT_VERIFY with no session date, rather than assuming the count is fresh', () => {
    const result = claim({ onDate: null })!;

    expect(result.verdict).toBe('CANNOT_VERIFY');
    expect(result.denominatorAgeDays).toBeNull();
    expect(result.reason).toMatch(/session date/);
  });

  it('is CANNOT_VERIFY on an unusable filing date', () => {
    expect(claim({ sharesAsOf: 'not a date' })!.verdict).toBe('CANNOT_VERIFY');
  });

  it('never reports a concept it was not given as shares outstanding', () => {
    expect(claim({ concept: null })!.looser).toBeNull();
  });
});
