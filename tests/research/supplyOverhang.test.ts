import { describe, expect, it } from 'vitest';

import { FILED_SHARES_CURRENT_DAYS } from '@/lib/research/float';
import { assessSupplyOverhang, type SupplyPair } from '@/lib/research/supply';

/**
 * The one route to pillar five the desk owns.
 *
 * `displayedFloat` is null on effectively every dossier and the float that
 * reaches the board comes from the ChatGPT task's Sheet — a vendor number
 * measured arithmetically impossible on one name in six. This is the answer
 * that needs no float at all: proven-live supply over shares outstanding, where
 * the denominator is an upper bound on the float, so a ratio at or above one
 * proves supply >= float on filings alone.
 *
 * Every test here is about the directions it must NOT move.
 */

const ASOF = '2026-09-09';

const pair = (over: Partial<SupplyPair> = {}): SupplyPair => ({
  sharesOutstanding: 1_000_000,
  sharesOutstandingAsOf: '2026-09-01',
  denominatorFactor: 1,
  concept: 'dei:EntityCommonStockSharesOutstanding',
  sourceId: 42,
  basis: 'FILED_SHARES_OUTSTANDING',
  floorShares: 2_000_000,
  floorRatio: 2,
  floorBlocks: 1,
  totalShares: 2_000_000,
  totalRatio: 2,
  totalBlocks: 1,
  excluded: [],
  excludedBlocks: 0,
  note: '',
  ...over,
});

describe('it proves supply >= float without ever knowing a float', () => {
  it('is conclusive when the floor reaches the whole share count', () => {
    /*
     * The whole product of this function. Shares outstanding bounds the float
     * from above, so supply at or above the share count is necessarily at or
     * above the float. No vendor, no estimate, no Sheet.
     */
    expect(assessSupplyOverhang(pair(), ASOF).verdict).toBe('PROVEN_AT_OR_ABOVE_FLOAT');
  });

  it('refuses to prove anything from an EXACT identity, because that is a copy', () => {
    /*
     * BUILT THE OTHER WAY FIRST, ON SOUND ARITHMETIC, AND THE DATA REVERSED IT.
     * At exactly 1.0 supply equals the float's upper bound, so supply >= float
     * genuinely holds — but replaying the rule over 325 stored dossiers, four
     * of the seven that would have fired were exact identities: 28,750,000 on
     * 28,750,000, 64,098,483 on 64,098,483, and two more. A resale of precisely
     * every outstanding share, to the share, four times independently, is not
     * the ordinary explanation for that.
     *
     * Strict `>` leaves exactly the three sol independently confirmed.
     */
    const exact = assessSupplyOverhang(pair({ floorShares: 1_000_000, floorRatio: 1 }), ASOF);
    expect(exact.verdict).toBe('EQUALS_SHARE_COUNT');
    expect(exact.verdict).not.toBe('PROVEN_AT_OR_ABOVE_FLOAT');
  });

  it('still proves it one share above the count', () => {
    // The boundary is identity, not magnitude: a single share of genuine
    // excess is a different fact from two numbers being the same number.
    const over = assessSupplyOverhang(
      pair({ floorShares: 1_000_001, floorRatio: 1.000001 }),
      ASOF,
    );
    expect(over.verdict).toBe('PROVEN_AT_OR_ABOVE_FLOAT');
  });

  it('tests identity on the counts, not on a divided ratio', () => {
    // Two close-but-distinct counts must not be collapsed by rounding.
    const close = assessSupplyOverhang(
      pair({ floorShares: 3_000_000_001, sharesOutstanding: 3_000_000_000, floorRatio: 1 }),
      ASOF,
    );
    expect(close.verdict).toBe('PROVEN_AT_OR_ABOVE_FLOAT');
  });

  it('carries the number, the date, the basis and the citation with the verdict', () => {
    // A verdict this strong must not be renderable without what proves it.
    const result = assessSupplyOverhang(pair(), ASOF);
    expect(result.floorShares).toBe(2_000_000);
    expect(result.sharesOutstanding).toBe(1_000_000);
    expect(result.sharesOutstandingAsOf).toBe('2026-09-01');
    expect(result.concept).toBe('dei:EntityCommonStockSharesOutstanding');
    expect(result.sourceId).toBe(42);
    expect(result.basis).toBe('FILED_SHARES_OUTSTANDING');
  });
});

describe('it is monotone toward AVOID and can never clear a name', () => {
  it('says NOT_PROVEN below the bar, which is not the same as clean', () => {
    /*
     * The floor deliberately under-counts — warrants that may never be
     * exercised, dollar shelf capacity and every possible-but-unproven block
     * are excluded, because that is what makes it a guarantee rather than an
     * estimate. So a ratio under one means "not proven from established supply
     * alone" and never "there is no overhang".
     */
    const under = assessSupplyOverhang(pair({ floorShares: 10_000, floorRatio: 0.01 }), ASOF);
    expect(under.verdict).toBe('NOT_PROVEN');
    expect(under.verdict).not.toMatch(/CLEAN|CLEAR|OK|SAFE/);
  });

  it('says NOT_PROVEN when no block is proven live, rather than nothing', () => {
    // `floorRatio` is null and not zero when no KNOWN_ACTIVE block carries a
    // count: an absence must not read as a measured zero.
    const none = assessSupplyOverhang(pair({ floorShares: null, floorRatio: null, floorBlocks: 0 }), ASOF);
    expect(none.verdict).toBe('NOT_PROVEN');
    expect(none.floorRatio).toBeNull();
  });

  it('emits no verdict that could soften a structure classification', () => {
    const verdicts = [
      assessSupplyOverhang(pair(), ASOF).verdict,
      assessSupplyOverhang(pair({ floorRatio: 0.5 }), ASOF).verdict,
      assessSupplyOverhang(null, ASOF).verdict,
    ];
    for (const verdict of verdicts) {
      expect(verdict).not.toMatch(/CLEAN|CLEAR|PASS|GOOD|APPROV/i);
    }
  });
});

describe('the denominator must be current, and unverifiable is not fresh', () => {
  it('withholds the verdict when the share count is too old to bound today', () => {
    /*
     * A stale share count predates a dilution, so it is too LOW, so the ratio
     * is too HIGH — and this verdict fires an avoid. The error would cost him a
     * trade he should have taken, which is the direction that matters here.
     */
    const stale = assessSupplyOverhang(
      pair({ sharesOutstandingAsOf: '2026-01-01' }),
      ASOF,
    );
    expect(stale.verdict).toBe('BASIS_STALE');
    expect(stale.ageDays).toBeGreaterThan(FILED_SHARES_CURRENT_DAYS);
  });

  it('withholds it when the basis has no date at all', () => {
    // Absent is not current. An undated count cannot be shown to bound today.
    const undated = assessSupplyOverhang(pair({ sharesOutstandingAsOf: null }), ASOF);
    expect(undated.verdict).toBe('BASIS_STALE');
    expect(undated.ageDays).toBeNull();
  });

  it('refuses a count dated in the future rather than treating it as fresh', () => {
    const ahead = assessSupplyOverhang(pair({ sharesOutstandingAsOf: '2027-01-01' }), ASOF);
    expect(ahead.verdict).toBe('BASIS_STALE');
  });

  it('does not let staleness manufacture a PROVEN out of a low ratio', () => {
    // Order matters: the ratio is tested first, so a stale basis under the bar
    // stays NOT_PROVEN rather than being promoted into the stale bucket.
    const both = assessSupplyOverhang(
      pair({ floorRatio: 0.2, sharesOutstandingAsOf: '2026-01-01' }),
      ASOF,
    );
    expect(both.verdict).toBe('NOT_PROVEN');
  });
});

describe('no denominator is its own answer', () => {
  it('separates "no share count" from "supply below the bar"', () => {
    /*
     * `computeSupplyPair` returns null for 61% of researched names, which is
     * the binding constraint on coverage. Collapsing that into NOT_PROVEN would
     * report a measurement nobody took.
     */
    const absent = assessSupplyOverhang(null, ASOF);
    expect(absent.verdict).toBe('NO_DENOMINATOR');
    expect(absent.verdict).not.toBe('NOT_PROVEN');
    expect(absent.sharesOutstanding).toBeNull();
  });
});
