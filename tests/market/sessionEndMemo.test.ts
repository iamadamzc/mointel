import { describe, expect, it } from 'vitest';

import { etWallClockToUtc, sessionEndUtc } from '@/lib/market/session';

/*
 * sessionEndUtc is memoized per trading date (2026-09-29): profiled at ~60% of
 * a /api/market build. Integration's two required properties, plus agreement
 * with the unmemoized function across both DST changes.
 */

describe('sessionEndUtc memo', () => {
  it('A HIT RETURNS A FRESH DATE: mutating one result cannot move the next', () => {
    const first = sessionEndUtc('2026-09-28');
    first.setUTCHours(0, 0, 0, 0);
    const second = sessionEndUtc('2026-09-28');
    expect(second).not.toBe(first);
    expect(second.toISOString()).toBe('2026-09-29T00:00:00.000Z'); // 20:00 EDT
  });

  it('two different dates never collide', () => {
    const a = sessionEndUtc('2026-09-28');
    const b = sessionEndUtc('2026-09-29');
    expect(b.getTime() - a.getTime()).toBe(24 * 60 * 60 * 1000);
    // And a repeat of the first still gives the first, not the last cached.
    expect(sessionEndUtc('2026-09-28').getTime()).toBe(a.getTime());
  });

  it('agrees with the unmemoized conversion on both sides of each DST change', () => {
    for (const date of ['2026-03-06', '2026-03-09', '2026-10-30', '2026-11-02']) {
      expect(sessionEndUtc(date).getTime()).toBe(etWallClockToUtc(date, 20, 0).getTime());
      // Asked twice: the hit must equal the miss.
      expect(sessionEndUtc(date).getTime()).toBe(etWallClockToUtc(date, 20, 0).getTime());
    }
    // EST vs EDT: 20:00 ET is 01:00Z in winter and 00:00Z in summer.
    expect(sessionEndUtc('2026-03-06').toISOString()).toBe('2026-03-07T01:00:00.000Z');
    expect(sessionEndUtc('2026-03-09').toISOString()).toBe('2026-03-10T00:00:00.000Z');
  });
});
