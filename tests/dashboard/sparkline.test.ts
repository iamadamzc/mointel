import { describe, expect, it } from 'vitest';

import { DEFAULT_ACTIVITY_CONFIG } from '@/lib/market/activity';
import { SPARK_FULL_SCALE, sparklineSpanLabel, sparklineView } from '@/lib/dashboard/sparkline';

/*
 * NOT MEASURED against MEASURED-AND-SILENT.
 *
 * `repo.ts` maps a NULL column to `undefined` rather than `[]` precisely so
 * these stay distinguishable. A DEAD row's window IS all zeros and that is a
 * real reading; an absent window means nothing was observed. Drawing both as a
 * flat line would state "no trading" where the truth is "not looked at".
 *
 * Both sides asserted, because a check that only exercises one cannot tell you
 * the predicate is right.
 */
describe('the two kinds of nothing', () => {
  it('returns null when the window was never measured', () => {
    expect(sparklineView(undefined)).toBeNull();
    expect(sparklineView(null)).toBeNull();
    expect(sparklineView([])).toBeNull();
  });

  it('returns a real view for a measured silence', () => {
    const view = sparklineView([0, 0, 0, 0, 0]);
    expect(view).not.toBeNull();
    expect(view!.silent).toBe(true);
    expect(view!.peak).toBe(0);
    expect(view!.heights).toEqual([0, 0, 0, 0, 0]);
  });

  it('does not call a quiet-but-alive name silent', () => {
    const view = sparklineView([0, 2, 0, 1, 0])!;
    expect(view.silent).toBe(false);
    expect(view.peak).toBe(2);
  });
});

/*
 * Full height is the ACTIVE LINE, not this row's own peak.
 *
 * Per-row normalisation was the obvious choice and it erases the comparison he
 * is actually making: scanning down a column of 25 rows. A dead name and a
 * raging one would both fill their box.
 */
describe('the scale is shared across rows', () => {
  it('scales against the active line rather than the row peak', () => {
    const quiet = sparklineView([10, 10, 10, 10, 10])!;
    const busy = sparklineView([300, 300, 300, 300, 300])!;

    // Same shape, wildly different magnitude — and the heights must say so.
    expect(quiet.heights[0]).toBeCloseTo(10 / SPARK_FULL_SCALE, 6);
    expect(busy.heights[0]).toBe(1);
    expect(quiet.heights[0]).toBeLessThan(busy.heights[0]);
  });

  it('takes the scale from the trader\'s own threshold rather than a constant', () => {
    expect(SPARK_FULL_SCALE).toBe(DEFAULT_ACTIVITY_CONFIG.activeTradesPerMinute);
  });

  it('clamps above the active line rather than overflowing the box', () => {
    expect(sparklineView([3000, 0, 0, 0, 0])!.heights[0]).toBe(1);
  });
});

/*
 * The span, because a sparkline reads as "now" unless it says otherwise, and
 * this one ends two minutes ago — the most recent minute is excluded as
 * unsettled. He holds for seconds, so the lag is not a detail.
 */
describe('the window says what it covers', () => {
  it('states the span and the lag', () => {
    expect(sparklineSpanLabel()).toBe('5 minutes ending 2 min ago');
  });

  it('derives both from the engine config rather than restating them', () => {
    const { settleMinutes, deadMinutes, reviveMinutes } = DEFAULT_ACTIVITY_CONFIG;
    const span = Math.max(deadMinutes, reviveMinutes);
    expect(sparklineSpanLabel()).toBe(`${span} minutes ending ${settleMinutes + 1} min ago`);
  });

  it('puts the span and the raw numbers in the hover', () => {
    const view = sparklineView([1, 2, 3])!;
    expect(view.title).toContain('5 minutes ending 2 min ago');
    expect(view.title).toContain('1, 2, 3');
    expect(view.title).toContain(String(SPARK_FULL_SCALE));
  });
});

/*
 * Description, never a verdict. The moment it grades a name it claims
 * prediction and inherits a bar this has not cleared.
 */
describe('it describes and does not grade', () => {
  it('carries no verdict vocabulary in the hover', () => {
    const view = sparklineView([500, 400, 300, 10, 0])!;
    expect(view.title).not.toMatch(/strong|weak|good|bad|buy|worth|best|active now|dying/i);
  });

  it('exposes no tone, score or rank', () => {
    const view = sparklineView([500, 400, 300, 10, 0])!;
    expect(Object.keys(view).sort()).toEqual(['heights', 'peak', 'silent', 'title', 'values']);
  });
});

describe('defensive shapes', () => {
  it('treats a negative or non-finite count as zero rather than inverting a bar', () => {
    const view = sparklineView([-5, Number.NaN, 10])!;
    expect(view.values).toEqual([0, 0, 10]);
    expect(view.heights[0]).toBe(0);
  });
});
