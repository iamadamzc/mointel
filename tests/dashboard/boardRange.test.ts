import { describe, expect, it } from 'vitest';

import {
  formatRangeEnd,
  parseRangeInput,
  rangeLabel,
  rangeQuery,
  sameRange,
} from '@/lib/dashboard/boardRange';

const BOUNDS = { min: 0.25, max: 50 };

describe('parseRangeInput', () => {
  it('accepts a range inside the bounds, with or without a dollar sign', () => {
    expect(parseRangeInput('0.5', '$10', BOUNDS)).toEqual({ ok: true, range: { min: 0.5, max: 10 } });
  });

  it('clamps each end into the bounds, as the server would, so the control never shows a value the server changed', () => {
    expect(parseRangeInput('0.01', '80', BOUNDS)).toEqual({ ok: true, range: { min: 0.25, max: 50 } });
  });

  it('refuses an empty, non-numeric or inverted range with a reason, rather than sending it', () => {
    expect(parseRangeInput('', '10', BOUNDS).ok).toBe(false);
    expect(parseRangeInput('abc', '10', BOUNDS).ok).toBe(false);
    const inverted = parseRangeInput('12', '4', BOUNDS);
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) expect(inverted.reason).toMatch(/below the high end/);
    // Equal after clamping is also empty.
    expect(parseRangeInput('60', '70', BOUNDS).ok).toBe(false);
  });
});

describe('labels', () => {
  it('prints cents only where there are cents', () => {
    expect(formatRangeEnd(1)).toBe('$1');
    expect(formatRangeEnd(0.25)).toBe('$0.25');
    expect(formatRangeEnd(12.5)).toBe('$12.50');
    expect(rangeLabel({ min: 1, max: 20 })).toBe('$1–$20');
  });

  it('sameRange needs both ranges', () => {
    expect(sameRange({ min: 1, max: 20 }, { min: 1, max: 20 })).toBe(true);
    expect(sameRange({ min: 1, max: 20 }, { min: 1, max: 25 })).toBe(false);
    expect(sameRange(null, { min: 1, max: 20 })).toBe(false);
  });
});

describe('rangeQuery', () => {
  it('asks for nothing when the viewer has not chosen, so the server default applies', () => {
    expect(rangeQuery(null)).toBe('');
    expect(rangeQuery({ min: 0.5, max: 10 })).toBe('min=0.5&max=10');
  });
});
