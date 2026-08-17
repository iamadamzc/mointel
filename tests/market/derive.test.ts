import { describe, expect, it } from 'vitest';

import {
  computeDisplayedFloatTurnover,
  computePercentChange,
  computeQuoteState,
  isNewerObservation,
} from '@/lib/market/derive';

describe('percent change (requirement 5)', () => {
  it('uses (price - previousClose) / previousClose * 100', () => {
    expect(computePercentChange(6.22, 5)).toBeCloseTo(24.4, 5);
    expect(computePercentChange(0.88, 0.95)).toBeCloseTo(-7.368421, 5);
  });

  it('returns null when either side is unknown or the close is not positive', () => {
    expect(computePercentChange(null, 5)).toBeNull();
    expect(computePercentChange(5, null)).toBeNull();
    expect(computePercentChange(5, 0)).toBeNull();
    expect(computePercentChange(5, -1)).toBeNull();
    expect(computePercentChange(Number.NaN, 5)).toBeNull();
  });
});

describe('Level 1 quote spread (requirements 22, 23)', () => {
  it('computes spread and spread percent from the midpoint', () => {
    const quote = computeQuoteState({ bid: 2.48, bidSize: 3, ask: 2.52, askSize: 5, at: 'now' });
    expect(quote.spread).toBeCloseTo(0.04, 10);
    expect(quote.spreadPct).toBeCloseTo(1.6, 5);
    expect(quote.invalid).toBe(false);
    expect(quote.bidSize).toBe(3);
    expect(quote.askSize).toBe(5);
  });

  it('marks a crossed quote invalid and refuses to publish a negative spread', () => {
    const quote = computeQuoteState({ bid: 3.1, bidSize: 1, ask: 2.9, askSize: 1, at: 'now' });
    expect(quote.spread).toBeNull();
    expect(quote.spreadPct).toBeNull();
    expect(quote.invalid).toBe(true);
  });

  it('handles missing, zero and negative sides safely', () => {
    const missing = computeQuoteState({ bid: null, bidSize: null, ask: null, askSize: null, at: null });
    expect(missing.spread).toBeNull();
    expect(missing.invalid).toBe(false);

    const oneSided = computeQuoteState({ bid: 2.5, bidSize: 1, ask: null, askSize: null, at: 'now' });
    expect(oneSided.spread).toBeNull();
    expect(oneSided.invalid).toBe(true);

    const zeroed = computeQuoteState({ bid: 0, bidSize: 0, ask: 0, askSize: 0, at: 'now' });
    expect(zeroed.bid).toBeNull();
    expect(zeroed.ask).toBeNull();
    expect(zeroed.spread).toBeNull();
  });
});

describe('displayed float turnover (requirements 19, 20)', () => {
  it('is cumulative session volume divided by the displayed float', () => {
    expect(computeDisplayedFloatTurnover(3_840_000, 1_920_000)).toBe(2);
    expect(computeDisplayedFloatTurnover(500_000, 4_000_000)).toBe(0.125);
  });

  it('is not calculated when the float is unknown, zero or invalid', () => {
    expect(computeDisplayedFloatTurnover(3_840_000, null)).toBeNull();
    expect(computeDisplayedFloatTurnover(3_840_000, undefined)).toBeNull();
    expect(computeDisplayedFloatTurnover(3_840_000, 0)).toBeNull();
    expect(computeDisplayedFloatTurnover(3_840_000, -100)).toBeNull();
    expect(computeDisplayedFloatTurnover(3_840_000, Number.NaN)).toBeNull();
    expect(computeDisplayedFloatTurnover(null, 1_920_000)).toBeNull();
  });
});

describe('observation ordering guard (requirement 24)', () => {
  it('accepts newer or equal timestamps and rejects older ones', () => {
    expect(isNewerObservation(null, '2026-08-14T13:31:00Z')).toBe(true);
    expect(isNewerObservation('2026-08-14T13:31:00Z', '2026-08-14T13:32:00Z')).toBe(true);
    expect(isNewerObservation('2026-08-14T13:31:00Z', '2026-08-14T13:31:00Z')).toBe(true);
    expect(isNewerObservation('2026-08-14T13:31:00Z', '2026-08-14T13:30:00Z')).toBe(false);
    expect(isNewerObservation('2026-08-14T13:31:00Z', null)).toBe(false);
    expect(isNewerObservation('2026-08-14T13:31:00Z', 'not-a-date')).toBe(false);
  });
});
