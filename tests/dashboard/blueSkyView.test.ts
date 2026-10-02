import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { deepCeilingTitle } from '@/lib/dashboard/blueSkyView';

/*
 * The deep ceiling appears only in the blue-sky line's hover, and never as a
 * dollar figure: it exists only on today's share basis, a price the stock never
 * traded at (Marketing, 2026-10-02). The hover gives its date and the
 * cumulative consolidation. Written from that rule.
 */

const EM_DASH = String.fromCharCode(0x2014);
const deep = (splitFactor: number | null, price = 855795.6, date = '2018-04-30') => ({
  deepCeiling: { price, date, splitFactor },
});

describe('the deep ceiling in the hover', () => {
  it('gives the date and the cumulative consolidation, and why it is not compared', () => {
    expect(deepCeilingTitle(deep(44000))).toBe(
      "Highest stored high is from 2018-04-30, before share consolidations totaling 44,000-to-1, so it is not compared with today's price. Reference only.",
    );
  });

  it('never prints the rescaled price, or any dollar figure', () => {
    for (const factor of [44000, 600, 7.5, 0.5]) {
      const title = deepCeilingTitle(deep(factor)) ?? '';
      expect(title).not.toMatch(/\$/);
      expect(title).not.toContain('855');
    }
  });

  it('names a ratio only when the factor is a whole consolidation', () => {
    expect(deepCeilingTitle(deep(600.2))).toContain('totaling 600-to-1');
    expect(deepCeilingTitle(deep(7.5))).toContain('before a change in the share basis');
    expect(deepCeilingTitle(deep(0.5))).toContain('before a change in the share basis');
  });

  it('says nothing when there is no consolidation to explain, or the factor is unknown', () => {
    expect(deepCeilingTitle({ deepCeiling: null })).toBeNull();
    expect(deepCeilingTitle(deep(1))).toBeNull();
    expect(deepCeilingTitle(deep(null))).toBeNull();
  });

  it('carries no em dash', () => {
    for (const factor of [44000, 7.5]) expect(deepCeilingTitle(deep(factor))?.includes(EM_DASH)).toBe(false);
  });

  it('is what the blue-sky line hovers', () => {
    expect(readFileSync('components/LevelLadder.tsx', 'utf8')).toContain('title={deepCeilingTitle(state.threshold) ?? undefined}');
  });
});
