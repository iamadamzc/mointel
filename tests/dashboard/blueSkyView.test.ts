import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { deepCeilingTitle } from '@/lib/dashboard/blueSkyView';

/*
 * The deep ceiling is shown only in the blue-sky line's hover, and only beside
 * its factor (Design's pick, 2026-10-02). Written from that rule.
 */

const EM_DASH = String.fromCharCode(0x2014);

describe('the deep ceiling, beside its factor', () => {
  it('states the number, its date and its factor, and calls it reference', () => {
    expect(deepCeilingTitle({ deepCeiling: { price: 855795.6, date: '2018-04-30', splitFactor: 44000 } })).toBe(
      "Highest stored high, from before one or more share consolidations: $855,795.60 on 2018-04-30, on today's share basis (cumulative split factor 44,000). Reference only, not a level.",
    );
  });

  it('says nothing when there is no consolidation to explain, or the factor is unknown', () => {
    expect(deepCeilingTitle({ deepCeiling: null })).toBeNull();
    expect(deepCeilingTitle({ deepCeiling: { price: 9.99, date: '2026-09-01', splitFactor: 1 } })).toBeNull();
    expect(deepCeilingTitle({ deepCeiling: { price: 9.99, date: '2026-09-01', splitFactor: null } })).toBeNull();
  });

  it('prints a sub-dollar ceiling to four decimals and carries no em dash', () => {
    const title = deepCeilingTitle({ deepCeiling: { price: 0.4321, date: '2020-01-02', splitFactor: 600 } });
    expect(title).toContain('$0.4321');
    expect(title?.includes(EM_DASH)).toBe(false);
  });

  it('is what the blue-sky line hovers', () => {
    expect(readFileSync('components/LevelLadder.tsx', 'utf8')).toContain('title={deepCeilingTitle(state.threshold) ?? undefined}');
  });
});
