import { describe, expect, it } from 'vitest';

import { UNIT_MISMATCH_RATIO, assessSheetPair } from '@/lib/research/float';

/**
 * A float judged against a share count written in the SAME cell.
 *
 * `assessFloat` gates both of its arithmetic tests behind a freshness check,
 * because a filed count can be too LOW (shares issued since) or too HIGH (a
 * reverse split its cover page predates) and nothing can tell which. Two
 * numbers one author wrote at one instant have no gap to be stale across, so
 * the gate is satisfied BY CONSTRUCTION and both tests become sound.
 *
 * That is why this is a separate function rather than a `FiledShareCount` with
 * an invented `asOf`: the date is not merely unavailable, it is not part of
 * the claim.
 */

describe('the verdicts a same-instant pair can support', () => {
  it('calls a fraction-of-a-percent ratio a unit error', () => {
    // INLF on the live board: 6,109 against ~1.05M is 0.58%.
    const result = assessSheetPair({ float: 6_109, sharesFromSameCell: 1_050_000 });
    expect(result?.verdict).toBe('UNIT_MISMATCH');
    expect(result?.ratio).toBeLessThan(UNIT_MISMATCH_RATIO);
  });

  it('calls a float above its own share count IMPOSSIBLE', () => {
    /*
     * The verdict that would have been lost by treating the freshness gate as
     * applying here. Against a FILED count this is unsafe — a company that
     * issued shares since filing legitimately exceeds it — but against a count
     * written in the same breath there is no such escape.
     */
    const result = assessSheetPair({ float: 900_000, sharesFromSameCell: 785_655 });
    expect(result?.verdict).toBe('IMPOSSIBLE');
  });

  it('accepts an ordinary pair', () => {
    // AKAN: 537,665 of 785,655 is 68%.
    const result = assessSheetPair({ float: 537_665, sharesFromSameCell: 785_655 });
    expect(result?.verdict).toBe('CONSISTENT');
    expect(result?.ratio).toBeCloseTo(0.684, 2);
  });

  it('treats the boundary as consistent rather than a mismatch', () => {
    // Exactly at the line is not below it; the threshold is where a unit error
    // starts, and an arbitrary tie must not manufacture a verdict.
    const result = assessSheetPair({ float: 20_000, sharesFromSameCell: 1_000_000 });
    expect(result?.ratio).toBe(UNIT_MISMATCH_RATIO);
    expect(result?.verdict).toBe('CONSISTENT');
  });
});

describe('what it refuses to judge', () => {
  it('returns null when either half is missing or non-positive', () => {
    // Absence is not a verdict. A pair with one number is not a pair.
    expect(assessSheetPair({ float: 0, sharesFromSameCell: 1_000 })).toBeNull();
    expect(assessSheetPair({ float: 1_000, sharesFromSameCell: 0 })).toBeNull();
    expect(assessSheetPair({ float: Number.NaN, sharesFromSameCell: 1_000 })).toBeNull();
  });
});

describe('the threshold is shared, not restated', () => {
  it('uses assessFloat’s own constant', () => {
    /*
     * Called rather than copied, so the two cannot drift into disagreeing about
     * what a unit error looks like — the failure this desk keeps recording when
     * one number is written down twice.
     */
    const justUnder = assessSheetPair({
      float: UNIT_MISMATCH_RATIO * 1_000_000 - 1,
      sharesFromSameCell: 1_000_000,
    });
    expect(justUnder?.verdict).toBe('UNIT_MISMATCH');
  });
});
