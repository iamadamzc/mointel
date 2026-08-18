import { describe, expect, it } from 'vitest';

import {
  computeAhParticipation,
  computeAhPercentChange,
  emptyAfterHours,
  rankByAfterHours,
} from '@/lib/market/afterHours';

describe('AH Participation (requirement 8)', () => {
  it('is after-hours volume over the 20-session average FULL-DAY volume', () => {
    // 400,000 traded after the close against a normal whole day of 1,000,000:
    // this evening alone is 40% of a typical entire session.
    expect(computeAhParticipation(400_000, 1_000_000)).toBeCloseTo(0.4, 10);
    expect(computeAhParticipation(2_500_000, 1_000_000)).toBeCloseTo(2.5, 10);
  });

  it('reports an unknown denominator as unknown, never as zero (requirement 9)', () => {
    expect(computeAhParticipation(400_000, null)).toBeNull();
    expect(computeAhParticipation(400_000, 0)).toBeNull();
    expect(computeAhParticipation(400_000, -5)).toBeNull();
    expect(computeAhParticipation(400_000, Number.NaN)).toBeNull();
  });

  it('reports unknown after-hours volume as unknown', () => {
    expect(computeAhParticipation(null, 1_000_000)).toBeNull();
  });

  it('treats a KNOWN zero as a fact, not as missing data', () => {
    // This is the difference that drops a daytime leader off the evening board.
    expect(computeAhParticipation(0, 1_000_000)).toBe(0);
  });
});

describe('AH percent change (requirement 6)', () => {
  it('measures against the CURRENT day’s regular-session close', () => {
    expect(computeAhPercentChange(11, 10)).toBeCloseTo(10, 10);
    expect(computeAhPercentChange(9, 10)).toBeCloseTo(-10, 10);
  });

  it('stays unknown without a usable close', () => {
    expect(computeAhPercentChange(11, null)).toBeNull();
    expect(computeAhPercentChange(11, 0)).toBeNull();
    expect(computeAhPercentChange(null, 10)).toBeNull();
  });
});

describe('AH ranking (requirement 10)', () => {
  const entry = (
    symbol: string,
    participation: number | null,
    percentChange: number | null = 0,
    volume: number | null = 0,
  ) => ({ symbol, participation, percentChange, volume });

  it('ranks by participation, descending', () => {
    const ranks = rankByAfterHours([
      entry('LOW', 0.1),
      entry('HIGH', 2.4),
      entry('MID', 0.9),
    ]);

    expect(ranks.get('HIGH')?.rank).toBe(1);
    expect(ranks.get('MID')?.rank).toBe(2);
    expect(ranks.get('LOW')?.rank).toBe(3);
  });

  it('is not Daily RVOL rank by construction', () => {
    /*
     * Both names traded the same fraction of a normal day in total, but only
     * one of them did it after the close. A full-day leaderboard would put
     * DAYLEADER first; the after-hours board must not.
     */
    const ranks = rankByAfterHours([
      entry('DAYLEADER', 0.01, 40, 50_000),
      entry('EVENING', 1.8, 12, 900_000),
    ]);

    expect(ranks.get('EVENING')?.rank).toBe(1);
    expect(ranks.get('DAYLEADER')?.rank).toBe(2);
  });

  it('breaks ties on absolute AH move, then AH volume, then symbol', () => {
    const ranks = rankByAfterHours([
      entry('AAA', 1, 2, 100),
      entry('BBB', 1, -30, 100),
      entry('CCC', 1, 2, 900),
    ]);

    // A 30% move down is a bigger move than 2% up; direction does not decide it.
    expect(ranks.get('BBB')?.rank).toBe(1);
    expect(ranks.get('CCC')?.rank).toBe(2);
    expect(ranks.get('AAA')?.rank).toBe(3);
  });

  it('does not rank an unknown participation at all', () => {
    const ranks = rankByAfterHours([entry('KNOWN', 0.5), entry('UNKNOWN', null)]);

    expect(ranks.get('KNOWN')?.rank).toBe(1);
    expect(ranks.has('UNKNOWN')).toBe(false);
  });

  it('reports rank movement against the previous pass', () => {
    const previous = new Map([['MOVER', 9]]);
    const ranks = rankByAfterHours([entry('MOVER', 5)], previous);

    expect(ranks.get('MOVER')).toEqual({ rank: 1, previousRank: 9, rankChange: 8 });
  });
});

describe('empty after-hours state', () => {
  it('is unknown everywhere rather than zero', () => {
    const empty = emptyAfterHours();
    expect(empty.volume).toBeNull();
    expect(empty.participation).toBeNull();
    expect(empty.percentChange).toBeNull();
    expect(empty.coverage).toBe('NONE');
    expect(empty.latched).toBe(false);
  });
});
