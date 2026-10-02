import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { deepCeilingTitle } from '@/lib/dashboard/blueSkyView';

/*
 * The deep ceiling appears only in the blue-sky line's hover, and only AS IT
 * TRADED: the stored high on today's share basis divided by the cumulative
 * factor (adjusted / raw). Never the rescaled number (Integration's order,
 * Marketing's words, 2026-10-02). Written from that rule.
 */

const EM_DASH = String.fromCharCode(0x2014);
const deep = (splitFactor: number | null, price = 855795.6, date = '2018-04-30') => ({
  deepCeiling: { price, date, splitFactor },
});

describe('the deep ceiling in the hover, as it traded', () => {
  it('GNPX: $855,795.60 over 44,000 is about $19.45, marked as traded and not comparable', () => {
    expect(deepCeilingTitle(deep(44000))).toBe(
      "Highest stored high: about $19.45 as it traded on 2018-04-30, before share consolidations totaling 44,000-to-1. Not comparable to today's price. Reference only.",
    );
  });

  it('never prints the rescaled number', () => {
    for (const factor of [44000, 600, 7.5]) expect(deepCeilingTitle(deep(factor))).not.toMatch(/855/);
  });

  it('a factor that is not a whole consolidation still gives the traded price, without a ratio', () => {
    expect(deepCeilingTitle(deep(7.5, 30))).toBe(
      "Highest stored high: about $4.00 as it traded on 2018-04-30, before a change in the share basis. Not comparable to today's price. Reference only.",
    );
    expect(deepCeilingTitle(deep(600.2, 600.2))).toContain('about $1.00 as it traded');
    expect(deepCeilingTitle(deep(600.2, 600.2))).toContain('totaling 600-to-1');
  });

  it('prints a sub-dollar traded price at the board precision, and a large one with separators', () => {
    expect(deepCeilingTitle(deep(600, 120))).toContain('about $0.2000 as it traded');
    expect(deepCeilingTitle(deep(1000, 44_000_000))).toContain('about $44,000.00 as it traded');
  });

  it('says nothing when there is no consolidation, the factor is unknown, or it is not a usable number', () => {
    expect(deepCeilingTitle({ deepCeiling: null })).toBeNull();
    expect(deepCeilingTitle(deep(1))).toBeNull();
    expect(deepCeilingTitle(deep(null))).toBeNull();
    expect(deepCeilingTitle(deep(0))).toBeNull();
    expect(deepCeilingTitle(deep(-2))).toBeNull();
  });

  it('carries no em dash', () => {
    for (const factor of [44000, 7.5]) expect(deepCeilingTitle(deep(factor))?.includes(EM_DASH)).toBe(false);
  });

  it('is what the blue-sky line hovers', () => {
    expect(readFileSync('components/LevelLadder.tsx', 'utf8')).toContain('title={deepCeilingTitle(state.threshold) ?? undefined}');
  });
});
