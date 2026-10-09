import { describe, expect, it } from 'vitest';

import { floatBoundReading, noDenominatorNote, supplyReading } from '@/lib/dashboard/supply';
import type { SupplyPair } from '@/lib/research/supply';

const pair = (over: Partial<SupplyPair> = {}): SupplyPair => ({
  sharesOutstanding: 10_000_000,
  sharesOutstandingAsOf: '2026-06-30',
  denominatorFactor: 1,
  concept: 'dei:EntityCommonStockSharesOutstanding',
  sourceId: 1,
  basis: 'FILED_SHARES_OUTSTANDING' as const,
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
    expect(read.floor).toContain('exceeding every share outstanding');
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

describe('the float bound, as a sentence he reads', () => {
  it('states the ceiling claim when the count proves it', () => {
    const reading = floatBoundReading(pair({ sharesOutstanding: 1_480_000 }));
    expect(reading?.verdict).toBe('PROVEN');
    expect(reading?.sentence).toContain('at most 1,480,000 shares outstanding');
    expect(reading?.tone).toBe('pos');
  });

  it('names shares ISSUED when the bound is looser', () => {
    /*
     * "At most 5,000,000 shares issued" is a different claim from the same
     * number of shares outstanding, because issued includes treasury stock. He
     * can tell them apart; a schema field he never sees cannot help him.
     */
    const reading = floatBoundReading(
      pair({ sharesOutstanding: 5_000_000, concept: 'us-gaap:CommonStockSharesIssued' }),
    );
    expect(reading?.sentence).toContain('shares issued');
    expect(reading?.sentence).not.toContain('shares outstanding');
  });

  it('says only "shares" when no concept was recorded', () => {
    // Absent is not the tight quantity, and must not render as it.
    const reading = floatBoundReading(pair({ sharesOutstanding: 5_000_000, concept: null }));
    expect(reading?.sentence).toContain('shares');
    expect(reading?.sentence).not.toContain('shares outstanding');
    expect(reading?.sentence).not.toContain('shares issued');
  });

  it('does not disprove anything above the ceiling', () => {
    const reading = floatBoundReading(pair({ sharesOutstanding: 73_580_000 }));
    expect(reading?.verdict).toBe('NOT_PROVEN');
    expect(reading?.detail).toContain('does not mean the float is large');
  });

  it('gives the unverifiable case a number, a date and a reason', () => {
    /*
     * The middle population, and the one with no competitor: a vendor writes
     * N/A. This says what we hold, when it is from, and where our knowledge
     * stops.
     */
    const reading = floatBoundReading(
      pair({ sharesOutstanding: 4_330_000, sharesOutstandingAsOf: '2018-03-31', denominatorFactor: null }),
      '2026-04-02',
    );
    expect(reading?.verdict).toBe('BASIS_UNVERIFIABLE');
    expect(reading?.sentence).toContain('4,330,000');
    expect(reading?.sentence).toContain('2018-03-31');
    expect(reading?.detail).toContain('2026-04-02');
    expect(reading?.detail).toContain('cannot certify no split occurred');
  });

  it('renders on a pair with no comparable blocks at all', () => {
    /*
     * The 22-of-23 case. A pair whose floor and total are both null renders a
     * denominator and nothing else — and the bound needs NO blocks, so it
     * speaks exactly where the pair is silent. Repaired by addition.
     */
    const empty = pair({ floorShares: null, floorRatio: null, totalShares: null, totalRatio: null });
    expect(supplyReading(empty)?.filedMax ?? null).toBeNull();
    expect(floatBoundReading(empty)?.verdict).toBe('PROVEN');
  });
});

/*
 * THE RENDER, not the reading. `floatBoundReading` is Research's and tested
 * there; these assert what the card is allowed to do with it.
 */
describe('the card renders the bound without implying a reading it does not have', () => {
  const read = () =>
    import('node:fs').then((fs) =>
      fs.promises.readFile('components/AutomaticIntelligence.tsx', 'utf8'),
    );

  it('renders the bound', async () => {
    const source = await read();
    // Through drawerFloatLine since Integration 36th: the reading, unless the wired board cell refuses.
    expect(source).toContain('drawerFloatLine(structure.supplyPair, floatBound, floatBoundWired)');
    expect(source).toContain('{bound.sentence}');
  });

  /*
   * The bound is a PROOF in one direction only. Under the ceiling it
   * ESTABLISHES the low-float condition; above it, it says nothing — and the
   * render must not colour that silence as a negative.
   *
   * So tone comes from the reading, never from a comparison the card invents.
   */
  it('takes tone from the reading rather than deciding one', async () => {
    const source = await read();
    const at = source.indexOf('{bound.sentence}');
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(Math.max(0, at - 420), at);
    expect(block).toContain("bound.tone === 'pos'");
    // No negative colour anywhere near it: NOT_PROVEN is silence, not bad news.
    expect(block).not.toContain('text-neg');
    expect(block).not.toContain('text-warn');
  });

  /*
   * Above the ratios and shaped unlike them. They do not share an input -- the
   * pair needs an established block, the bound needs only the share count -- so
   * a matched pair of numbers would read the pair's usual silence as a failure
   * of the row.
   */
  it('places the bound before the ratio block', async () => {
    const source = await read();
    const boundAt = source.indexOf('{bound.sentence}');
    const ratiosAt = source.indexOf('Supply against shares outstanding');
    expect(boundAt).toBeGreaterThan(-1);
    expect(ratiosAt).toBeGreaterThan(-1);
    expect(boundAt).toBeLessThan(ratiosAt);
  });
});
