import { describe, expect, it } from 'vitest';

import { noDenominatorNote, supplyReading } from '@/lib/dashboard/supply';
import type { SupplyPair } from '@/lib/research/supply';

const pair = (over: Partial<SupplyPair> = {}): SupplyPair => ({
  sharesOutstanding: 10_000_000,
  sharesOutstandingAsOf: '2026-06-30',
  denominatorFactor: 1,
  floorShares: 2_500_000,
  floorRatio: 0.25,
  floorBlocks: 2,
  totalShares: 4_000_000,
  totalRatio: 0.4,
  totalBlocks: 3,
  excluded: [],
  excludedBlocks: 0,
  note: '',
  ...over,
});

/*
 * The rule the whole bound rests on.
 *
 * Float can never exceed shares outstanding, so dividing established supply by
 * the SHARE COUNT can only understate the true supply-to-float ratio. Saying
 * "of float" would turn a guaranteed lower bound into a false point estimate.
 */
describe('the denominator is never called float', () => {
  it('says shares outstanding, not float', () => {
    const read = supplyReading(pair())!;
    expect(read.floor).toContain('shares outstanding');
    expect(read.floor).not.toMatch(/\bfloat\b/i);
    expect(read.denominator).not.toMatch(/\bfloat\b/i);
  });

  it('never says float anywhere in the reading, on any shape', () => {
    for (const p of [pair(), pair({ floorRatio: null, floorShares: null }), pair({ floorRatio: 1.4 })]) {
      const read = supplyReading(p)!;
      const all = [read.floor, read.filedMax, read.denominator, read.exclusions].join(' ');
      expect(all).not.toMatch(/\bfloat\b/i);
    }
  });
});

/*
 * The trader's own decision. "At least 0%" is an absence wearing a number's
 * clothes — a reader cannot tell it from a name whose supply was measured and
 * found to be nothing.
 */
describe('a null floor is an absence, not a zero', () => {
  it('says no live supply proven', () => {
    const read = supplyReading(pair({ floorShares: null, floorRatio: null, floorBlocks: 0 }))!;
    expect(read.floor).toBe('no live supply proven');
    expect(read.floorProven).toBe(false);
  });

  it('never renders a zero percent floor', () => {
    const read = supplyReading(pair({ floorShares: null, floorRatio: null, floorBlocks: 0 }))!;
    expect(read.floor).not.toMatch(/0(\.0)?%/);
    expect(read.floor).not.toMatch(/at least/i);
  });

  /*
   * A null floor does not suppress the filed maximum. They are independent
   * questions: nothing PROVEN live is compatible with a great deal FILED.
   */
  it('still reports the filed maximum when nothing is proven live', () => {
    const read = supplyReading(pair({ floorShares: null, floorRatio: null, floorBlocks: 0 }))!;
    expect(read.filedMax).toContain('up to 40.0%');
  });
});

/*
 * At or above 1.0 the question settles WITHOUT a float ever being known: supply
 * equals or exceeds every share in existence, so it necessarily equals or
 * exceeds the float. That is the one case this bound answers outright.
 */
describe('the settling case', () => {
  it('marks a bound at or above every share outstanding', () => {
    const read = supplyReading(pair({ floorShares: 14_000_000, floorRatio: 1.4 }))!;
    expect(read.settles).toBe(true);
    expect(read.floor).toContain('exceeds every share outstanding');
  });

  it('does not settle just below', () => {
    expect(supplyReading(pair({ floorRatio: 0.99 }))!.settles).toBe(false);
  });

  it('sits exactly on the line rather than near it', () => {
    expect(supplyReading(pair({ floorShares: 10_000_000, floorRatio: 1 }))!.settles).toBe(true);
  });
});

describe('exclusions are counted, never hidden', () => {
  it('names what was dropped and how much', () => {
    const read = supplyReading(
      pair({
        excluded: [
          { reason: 'NO_SHARE_COUNT', blockTypes: ['SHELF_CAPACITY'], count: 2 },
          { reason: 'BASIS_DIFFERS', blockTypes: ['WARRANTS'], count: 1 },
        ],
        excludedBlocks: 3,
      }),
    )!;
    expect(read.exclusions).toBe('2 blocks with no share count, 1 block with a different split basis');
  });

  /*
   * Silence means nothing was dropped — a distinct statement from "we are not
   * saying". An empty string would read as the second.
   */
  it('says nothing when nothing was excluded', () => {
    expect(supplyReading(pair())!.exclusions).toBeNull();
  });
});

describe('the shared denominator', () => {
  it('states the count once, with its as-of date', () => {
    expect(supplyReading(pair())!.denominator).toBe('10,000,000 shares outstanding as of 2026-06-30');
  });

  it('omits a date it does not have rather than inventing one', () => {
    const read = supplyReading(pair({ sharesOutstandingAsOf: null }))!;
    expect(read.denominator).toBe('10,000,000 shares outstanding');
    expect(read.denominator).not.toContain('as of');
  });
});

/*
 * The absent pair has exactly ONE cause -- computeSupplyPair returns null only
 * when the filed share count is missing. So the note names the missing
 * DENOMINATOR, never missing knowledge: the blocks are researched and already
 * render as a ledger.
 */
describe('the no-denominator note', () => {
  it('explains the missing ratio when blocks exist', () => {
    expect(noDenominatorNote(3)).toBe(
      'No filed share count, so this supply cannot be expressed as a ratio.',
    );
  });

  it('says nothing when there are no blocks either', () => {
    // No ledger means no unanswered question for a reader to have.
    expect(noDenominatorNote(0)).toBeNull();
  });

  it('does not claim the supply is unknown', () => {
    expect(noDenominatorNote(3)).not.toMatch(/unknown|not researched|no supply/i);
  });
});

describe('absence of a pair', () => {
  it('returns null rather than an empty reading', () => {
    expect(supplyReading(null)).toBeNull();
    expect(supplyReading(undefined)).toBeNull();
  });
});
