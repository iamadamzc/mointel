import { describe, expect, it } from 'vitest';

import { computeSupplyPair } from '@/lib/research/supply';
import type { DailyBar } from '@/lib/research/history';
import type { SupplyBlock } from '@/lib/research/types';

/**
 * Bars carrying only what the basis check reads.
 *
 * `splitFactor` is the cumulative factor still to apply from that session
 * forward, so 1 is today's basis and 8 is a session sitting behind a 1-for-8.
 */
function bars(entries: Array<[date: string, splitFactor: number | null]>): DailyBar[] {
  return entries.map(([tradingDate, splitFactor]) => ({
    tradingDate,
    open: null,
    high: null,
    low: null,
    close: null,
    volume: null,
    splitFactor,
    sessionComplete: true,
  }));
}

function block(overrides: Partial<SupplyBlock> = {}): SupplyBlock {
  return {
    type: 'REGISTERED_RESALE',
    amountShares: 1_000_000,
    dollarCapacity: null,
    sourceFiling: 'S-3',
    registrationStatus: null,
    effectiveDate: '2026-06-01',
    terms: null,
    holderRestrictions: null,
    status: 'KNOWN_ACTIVE',
    eligibilityAssessment: null,
    evidenceSourceIds: [1],
    confidence: 'MEDIUM',
    ...overrides,
  } as SupplyBlock;
}

/** Every session on today's basis. */
const FLAT = bars([
  ['2025-04-29', 1],
  ['2026-06-01', 1],
  ['2026-06-30', 1],
]);

const PAIR_DEFAULTS = {
  sharesOutstanding: 10_000_000,
  sharesOutstandingAsOf: '2026-06-30',
};

describe('the supply pair', () => {
  it('computes both numbers over the same share count', () => {
    const pair = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: FLAT,
      ledger: [
        block({ amountShares: 2_000_000, status: 'KNOWN_ACTIVE' }),
        block({ amountShares: 5_000_000, status: 'POSSIBLY_ACTIVE' }),
      ],
    })!;

    expect(pair.floorShares).toBe(2_000_000);
    expect(pair.floorRatio).toBeCloseTo(0.2);
    // The filed maximum includes the unproven block; that gap IS the finding.
    expect(pair.totalShares).toBe(7_000_000);
    expect(pair.totalRatio).toBeCloseTo(0.7);
    expect(pair.excluded).toEqual([]);
  });

  it('reports NO proven supply as null, never as zero', () => {
    /*
     * 76% of rows that render a pair have no proven-live block. "At least 0%"
     * is an absence wearing a number's clothes — indistinguishable from a name
     * whose supply was measured and found to be nothing.
     */
    const pair = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: FLAT,
      ledger: [block({ amountShares: 5_000_000, status: 'POSSIBLY_ACTIVE' })],
    })!;

    expect(pair.floorShares).toBeNull();
    expect(pair.floorRatio).toBeNull();
    expect(pair.floorBlocks).toBe(0);
    expect(pair.totalRatio).toBeCloseTo(0.5);
  });

  it('excludes a block stated on a different split basis', () => {
    /*
     * GNLN, reduced. A 424B3 from 2025-04-29 states 1,169,711,239 shares
     * against 694,544 outstanding today, behind a 1-for-8. Included, it reads
     * 169,106%; the number is not large, it is on the wrong basis.
     */
    const pair = computeSupplyPair({
      ledger: [
        block({ amountShares: 1_169_711_239, effectiveDate: '2025-04-29', type: 'REGISTERED_RESALE' }),
        block({ amountShares: 100_000, effectiveDate: '2026-06-01' }),
      ],
      sharesOutstanding: 694_544,
      sharesOutstandingAsOf: '2026-06-30',
      bars: bars([
        // Behind the 1-for-8: eight of today's shares per share of that day.
        ['2025-04-29', 8],
        ['2026-06-01', 1],
        ['2026-06-30', 1],
      ]),
    })!;

    expect(pair.totalShares).toBe(100_000);
    expect(pair.excluded).toEqual([
      { reason: 'BASIS_DIFFERS', blockTypes: ['REGISTERED_RESALE'], count: 1 },
    ]);
    // Sanity: including it would have produced this instead.
    expect((1_169_711_239 + 100_000) / 694_544).toBeGreaterThan(1600);
  });

  it('keeps a block whose basis matches a denominator that is itself pre-split', () => {
    /*
     * The ratio only needs its two operands to agree with EACH OTHER. A name
     * whose share count and whose filings all predate a split is internally
     * consistent, and refusing it would drop a correct number.
     */
    const pair = computeSupplyPair({
      ledger: [block({ amountShares: 4_000_000, effectiveDate: '2025-04-29' })],
      sharesOutstanding: 8_000_000,
      sharesOutstandingAsOf: '2025-04-29',
      bars: bars([
        ['2025-04-29', 8],
        ['2026-06-30', 1],
      ]),
    })!;

    expect(pair.denominatorFactor).toBe(8);
    expect(pair.totalRatio).toBeCloseTo(0.5);
    expect(pair.excluded).toEqual([]);
  });

  it('treats an unestablished basis on EITHER side as not comparable', () => {
    // Unknown is not yes. The same three-state rule as blueSky's ceiling.
    const noBlockDate = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: FLAT,
      ledger: [block({ effectiveDate: null })],
    })!;
    expect(noBlockDate.totalShares).toBeNull();
    expect(noBlockDate.excluded[0].reason).toBe('BASIS_UNVERIFIABLE');

    const noDenominatorDate = computeSupplyPair({
      sharesOutstanding: 10_000_000,
      sharesOutstandingAsOf: null,
      bars: FLAT,
      ledger: [block()],
    })!;
    expect(noDenominatorDate.denominatorFactor).toBeNull();
    expect(noDenominatorDate.totalShares).toBeNull();
    expect(noDenominatorDate.excluded[0].reason).toBe('BASIS_UNVERIFIABLE');

    // A bar exists for the date but never had a raw comparison, so no factor
    // was established. Null must not read as 1.
    const noFactor = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: bars([
        ['2026-06-01', null],
        ['2026-06-30', 1],
      ]),
      ledger: [block({ effectiveDate: '2026-06-01' })],
    })!;
    expect(noFactor.excluded[0].reason).toBe('BASIS_UNVERIFIABLE');
  });

  it('excludes a dollar-only block without converting it', () => {
    // A dollar shelf is capacity, not a share count.
    const pair = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: FLAT,
      ledger: [
        block({ amountShares: null, dollarCapacity: 200_000_000, type: 'SHELF_CAPACITY' }),
        block({ amountShares: 1_000_000 }),
      ],
    })!;

    expect(pair.totalShares).toBe(1_000_000);
    expect(pair.excluded).toEqual([
      { reason: 'NO_SHARE_COUNT', blockTypes: ['SHELF_CAPACITY'], count: 1 },
    ]);
  });

  it('says what it dropped, by kind and count', () => {
    /*
     * The flag fires on two thirds of rows already, so its presence carries
     * almost no information. What it EXCLUDED does.
     */
    const pair = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: bars([
        ['2025-04-29', 8],
        ['2026-06-30', 1],
      ]),
      ledger: [
        block({ amountShares: null, type: 'SHELF_CAPACITY' }),
        block({ amountShares: null, type: 'ATM' }),
        block({ amountShares: 500_000, effectiveDate: '2025-04-29', type: 'WARRANTS' }),
        block({ amountShares: 500_000, effectiveDate: null, type: 'RECENT_OFFERING' }),
      ],
    })!;

    expect(pair.excludedBlocks).toBe(4);
    expect(pair.excluded).toEqual([
      { reason: 'NO_SHARE_COUNT', blockTypes: ['ATM', 'SHELF_CAPACITY'], count: 2 },
      { reason: 'BASIS_DIFFERS', blockTypes: ['WARRANTS'], count: 1 },
      { reason: 'BASIS_UNVERIFIABLE', blockTypes: ['RECENT_OFFERING'], count: 1 },
    ]);
    // Nothing survived, so both numbers are absent rather than zero.
    expect(pair.floorRatio).toBeNull();
    expect(pair.totalRatio).toBeNull();
  });

  it('has no pair at all without a denominator', () => {
    // 61% of researched names. The binding constraint, and not a block problem.
    expect(
      computeSupplyPair({
        ledger: [block()],
        sharesOutstanding: 0,
        sharesOutstandingAsOf: '2026-06-30',
        bars: FLAT,
      }),
    ).toBeNull();
  });

  it('does not read a basis date out of the filing prose', () => {
    /*
     * `sourceFiling` is free text a model wrote. Parsing a date from it would
     * let a guessed basis enter looking like a verified one, and the block has
     * somewhere honest to go instead.
     */
    const pair = computeSupplyPair({
      ...PAIR_DEFAULTS,
      bars: FLAT,
      ledger: [block({ effectiveDate: null, sourceFiling: '424B3 filed 2026-06-01; registered' })],
    })!;

    expect(pair.excluded[0].reason).toBe('BASIS_UNVERIFIABLE');
  });
});
