import { describe, expect, it } from 'vitest';

import { compactBound } from '@/lib/research/compactBound';

/**
 * The float face: at most 7 characters including the "≤ " prefix (Design's 86 px measurement), three significant
 * digits, and ROUNDED UP so the "at most" claim is never understated.
 */

const SIZE: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/** What the face claims, in shares. */
function claimed(face: string): number {
  const body = face.replace('≤ ', '');
  const suffix = body.slice(-1);
  return SIZE[suffix] ? Number(body.slice(0, -1)) * SIZE[suffix]! : Number(body);
}

describe('compactBound', () => {
  it('formats the examples Design named', () => {
    expect(compactBound(12_300_000)).toBe('≤ 12.3M');
    expect(compactBound(123_000_000)).toBe('≤ 123M');
    expect(compactBound(1_230_000_000)).toBe('≤ 1.23B');
  });

  it('ROUNDS UP, never to nearest: a bound is "at most"', () => {
    expect(compactBound(12_301_000)).toBe('≤ 12.4M');
    expect(compactBound(12_349_999)).toBe('≤ 12.4M');
    expect(compactBound(1_000_001)).toBe('≤ 1.01M');
    expect(compactBound(123_000_001)).toBe('≤ 124M');
  });

  it('shows a number under 1,000 whole', () => {
    expect(compactBound(842)).toBe('≤ 842');
    expect(compactBound(999)).toBe('≤ 999');
    expect(compactBound(841.2)).toBe('≤ 842');
  });

  it('carries into the next unit when rounding up reaches 1000', () => {
    expect(compactBound(1000)).toBe('≤ 1.00K');
    expect(compactBound(999_001)).toBe('≤ 1.00M');
    expect(compactBound(999_500_000)).toBe('≤ 1.00B');
  });

  it('puts the decimal places at 10 and 100: three significant digits', () => {
    expect(compactBound(9_990_000)).toBe('≤ 9.99M');
    expect(compactBound(10_000_000)).toBe('≤ 10.0M');
    expect(compactBound(99_900_000)).toBe('≤ 99.9M');
    expect(compactBound(100_000_000)).toBe('≤ 100M');
  });

  it('keeps three digits when rounding up reaches the next order (the sweep found 99.91B -> "100.0B")', () => {
    expect(compactBound(99_910_861_694)).toBe('≤ 100B');
    expect(compactBound(9_999_999)).toBe('≤ 10.0M');
    expect(compactBound(99_950_001)).toBe('≤ 100M');
  });

  it('rejects a bound that is not above zero or not finite', () => {
    expect(() => compactBound(0)).toThrow(RangeError);
    expect(() => compactBound(-5)).toThrow(RangeError);
    expect(() => compactBound(Number.NaN)).toThrow(RangeError);
    expect(() => compactBound(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('is never longer than 7 characters and never understates, over a sweep from 1 to 999 trillion', () => {
    let seed = 12345;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 20000; i += 1) {
      const shares = Math.max(1, Math.round(10 ** (next() * 15)));
      const face = compactBound(shares);
      expect(face.length, `${shares} -> ${face}`).toBeLessThanOrEqual(7);
      expect(claimed(face), `${shares} -> ${face}`).toBeGreaterThanOrEqual(shares);
      // and never overstates by more than the three-digit step (1 percent at the smallest scaled value)
      expect(claimed(face) / shares, `${shares} -> ${face}`).toBeLessThanOrEqual(1.0101);
    }
  });
});
