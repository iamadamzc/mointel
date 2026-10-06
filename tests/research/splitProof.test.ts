import { describe, expect, it } from 'vitest';

import { splitProofFromBars, type SpanBar } from '@/lib/research/splitProof';

/**
 * Rule R1. Registration: docs/research/float-contract/split-proof-r1-registration-2026-10-05.md.
 * The planted control is the 2.0 step on the one unfactored bar: it must never read NONE.
 */

const CHECKPOINT = '2026-09-28';

function span(lastClose: number, options: { lastFactor?: number | null; lastDate?: string; factors?: Array<number | null> } = {}): SpanBar[] {
  const factors = options.factors ?? [1, 1, 1, 1];
  const dates = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
  const bars: SpanBar[] = factors.map((factor, i) => ({ date: dates[i] ?? `2026-09-2${i}`, close: 10 + i * 0.1, factor }));
  bars.push({ date: options.lastDate ?? CHECKPOINT, close: lastClose, factor: options.lastFactor === undefined ? null : options.lastFactor });
  return bars;
}

describe('splitProofFromBars (R1)', () => {
  it('reads NONE when every bar is factored on one basis (the known-clean admit)', () => {
    expect(splitProofFromBars(span(10.4, { lastFactor: 1 }), CHECKPOINT)).toBe('NONE');
  });

  it('allows ONE unfactored bar, the checkpoint day, when its step is small', () => {
    expect(splitProofFromBars(span(10.6), CHECKPOINT)).toBe('NONE');
  });

  it('never reads NONE for a 2-for-1 step on that unfactored bar (the planted control)', () => {
    expect(splitProofFromBars(span(5.3), CHECKPOINT)).toBe('UNPROVEN');
    expect(splitProofFromBars(span(21), CHECKPOINT)).toBe('UNPROVEN');
  });

  it('refuses an unfactored final bar that is not the checkpoint day', () => {
    expect(splitProofFromBars(span(10.6, { lastDate: '2026-09-27' }), CHECKPOINT)).toBe('UNPROVEN');
  });

  it('refuses a null anywhere else in the span', () => {
    expect(splitProofFromBars(span(10.6, { factors: [1, null, 1, 1] }), CHECKPOINT)).toBe('UNPROVEN');
  });

  it('reads FOUND when the factors themselves step', () => {
    expect(splitProofFromBars(span(10.4, { lastFactor: 1, factors: [2, 2, 1, 1] }), CHECKPOINT)).toBe('FOUND');
  });

  it('reads UNPROVEN with fewer than two bars', () => {
    expect(splitProofFromBars([], CHECKPOINT)).toBe('UNPROVEN');
    expect(splitProofFromBars([{ date: CHECKPOINT, close: 10, factor: null }], CHECKPOINT)).toBe('UNPROVEN');
  });

  it('refuses an unfactored final bar whose close, or the one before it, is missing or zero', () => {
    const bars = span(0);
    expect(splitProofFromBars(bars, CHECKPOINT)).toBe('UNPROVEN');
    const noPrior = span(10.6);
    noPrior[noPrior.length - 2] = { ...noPrior[noPrior.length - 2]!, close: null };
    expect(splitProofFromBars(noPrior, CHECKPOINT)).toBe('UNPROVEN');
  });

  it('puts the guard at exactly 1.25: UNPROVEN at the line, NONE just under', () => {
    const prior = 10.3; // the bar before the final one in span()
    expect(splitProofFromBars(span(prior * 1.25), CHECKPOINT)).toBe('UNPROVEN');
    expect(splitProofFromBars(span(prior * 1.24), CHECKPOINT)).toBe('NONE');
  });

  it('puts the factor line at exactly 1.25: FOUND at the line, NONE just under', () => {
    expect(splitProofFromBars(span(10.4, { lastFactor: 1, factors: [1.25, 1, 1, 1] }), CHECKPOINT)).toBe('FOUND');
    expect(splitProofFromBars(span(10.4, { lastFactor: 1, factors: [1.24, 1, 1, 1] }), CHECKPOINT)).toBe('NONE');
  });

  it('refuses a non-positive factor', () => {
    expect(splitProofFromBars(span(10.4, { lastFactor: 1, factors: [0, 1, 1, 1] }), CHECKPOINT)).toBe('UNPROVEN');
  });
});
