import { describe, expect, it } from 'vitest';

import { cycleDetail } from '@/lib/dashboard/cycle';
import { resolveCycle } from '@/lib/market/cycle';

/*
 * `advancePct` is a FRACTION (a 53% move is 0.53), the same unit `retracementPct`
 * has. The cycle tooltip printed it as a percent without scaling, so a +53% move
 * read "up 0.5%". The test fixtures used 20 and 50 (percent-shaped), which is why
 * nothing caught it: this one runs the real resolver.
 */
const day = (i: number, o: number, h: number, l: number, c: number, v = 1_000_000) => ({
  tradingDate: `2026-08-${String(10 + i).padStart(2, '0')}`,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: v,
});

describe('the cycle tooltip states the advance in the right unit', () => {
  const bars = [
    day(0, 3, 3.1, 2.9, 3),
    day(1, 3, 3.1, 2.9, 3),
    day(2, 3, 3.1, 2.9, 3),
    day(3, 3, 3.1, 2.9, 3),
    day(4, 3, 3.1, 2.9, 3),
    day(5, 3.1, 4.6, 3.0, 4.4, 20_000_000),
    day(6, 4.4, 4.5, 4.0, 4.1, 10_000_000),
  ];

  it('prints a 53% move as 53.3%, not 0.5%', () => {
    const current = resolveCycle(bars as never);
    expect(current.phase).not.toBe('NO_CYCLE');
    const text = cycleDetail(current) ?? '';
    expect(text).toContain('up 53.3% from 3.00');
    expect(text).not.toContain('up 0.5%');
  });

  it('prints the retracement in the same unit, so the two percentages agree in kind', () => {
    expect(cycleDetail(resolveCycle(bars as never)) ?? '').toContain('31.3% of the move given back');
  });
});
