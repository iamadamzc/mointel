/**
 * The revival detector, and the defect it was rebuilt to prevent.
 *
 * The first version of this analysis iterated stored bars and could not see a
 * minute with no trades — the exact quantity it existed to measure. These pin
 * the grid and the persistence rule so that cannot come back.
 */

import { describe, expect, it } from 'vitest';

import {
  buildGrid,
  deadLineFor,
  findEpisodes,
  summarise,
  type RevivalThresholds,
} from '@/lib/archive/revival';

const T: RevivalThresholds = { active: 300, deadRatio: 10, persistence: 5 };

/** A dense series from a compact spec: [value, repeat] pairs. */
function series(...runs: [number, number][]): number[] {
  return runs.flatMap(([v, n]) => Array.from({ length: n }, () => v));
}

describe('buildGrid', () => {
  it('treats a minute with no bar as ZERO, not as missing', () => {
    /*
     * The defect that shipped in the pilot. Alpaca emits no bar for a silent
     * minute, so a detector reading only stored bars sees the next traded
     * minute as immediately adjacent -- NTWO read 278 dead minutes as one.
     * Silence is an observation, not a gap.
     */
    const sparse = new Map([
      [0, 500],
      [9, 400],
    ]);
    expect(buildGrid(sparse, 10)).toEqual([500, 0, 0, 0, 0, 0, 0, 0, 0, 400]);
  });

  it('a fully silent session is nine zeroes, not an empty series', () => {
    expect(buildGrid(new Map(), 9)).toEqual(Array(9).fill(0));
  });
});

describe('the derived dead line', () => {
  it('derives dead from active and the ratio, never from a separate number', () => {
    /*
     * The 10x is the TRADER'S, from his own description: ~5,000 shares on a
     * 10-second candle dropping below ~500. Two separately configured numbers
     * drift until they no longer express that ratio and nothing anywhere
     * notices, so the ratio is structural rather than conventional.
     *
     * Pinned rather than bounded, on Research's reasoning about reviveMinutes:
     * a bound lets a value drift silently, and anyone changing this should have
     * to see the trader's number and decide to overrule it.
     */
    expect(deadLineFor({ active: 300, deadRatio: 10, persistence: 5 })).toBe(30);
    expect(deadLineFor({ active: 150, deadRatio: 10, persistence: 5 })).toBe(15);
  });

  it('moves the dead line with the active level, keeping the ratio intact', () => {
    /*
     * The property a separate `dead` field would silently lose: raise the
     * active level and the dead line rises with it, so the SAME series is read
     * differently. The first draft of this test used peaks of 500 against an
     * active level of 600, so the name never went active at all and the test
     * passed for the wrong reason -- right outcome, wrong mechanism.
     */
    const grid = series([700, 2], [40, 6], [700, 2]);

    // active 300 -> dead line 30. A 40-trade minute is NOT dead: no episode.
    expect(findEpisodes(grid, { active: 300, deadRatio: 10, persistence: 5 })).toEqual([]);

    // active 600 -> dead line 60. The same 40 IS dead, and the name revives.
    const stricter = findEpisodes(grid, { active: 600, deadRatio: 10, persistence: 5 });
    expect(stricter).toEqual([{ deadMinutes: 6, revived: true, startIndex: 2 }]);
  });
});

describe('findEpisodes', () => {
  it('needs the death to persist before it counts', () => {
    // Four quiet minutes then back to life: not a death at persistence 5.
    const brief = series([500, 3], [0, 4], [500, 3]);
    expect(findEpisodes(brief, T)).toEqual([]);

    const sustained = series([500, 3], [0, 5], [500, 3]);
    expect(findEpisodes(sustained, T)).toHaveLength(1);
  });

  it('resets the run when activity flickers back above the dead line', () => {
    /*
     * A name bouncing between quiet and moderate has not stayed quiet. Without
     * this reset, four dead minutes plus a moderate one plus four more would
     * confirm a death that never happened -- which is how the pilot's
     * one-minute rule produced nineteen episodes for NTWO in a session.
     */
    const flickering = series([500, 2], [0, 4], [100, 1], [0, 4], [500, 2]);
    expect(findEpisodes(flickering, T)).toEqual([]);
  });

  it('counts dead minutes from the start of the run, not from confirmation', () => {
    // Eight quiet minutes then revival: the death lasted 8, not 3.
    const e = findEpisodes(series([500, 2], [0, 8], [500, 2]), T);
    expect(e).toHaveLength(1);
    expect(e[0].deadMinutes).toBe(8);
    expect(e[0].revived).toBe(true);
    expect(e[0].startIndex).toBe(2);
  });

  it('records a death that never revives, rather than dropping it', () => {
    // The unrevived episodes are the ones his prior is about. Dropping them
    // would leave a denominator of survivors only, and a 100% revival rate.
    const e = findEpisodes(series([500, 2], [0, 20]), T);
    expect(e).toEqual([{ deadMinutes: 20, revived: false, startIndex: 2 }]);
  });

  it('needs an active bar first: a session that never lives cannot die', () => {
    expect(findEpisodes(series([10, 60]), T)).toEqual([]);
  });

  it('finds several episodes in one session', () => {
    const two = series([500, 2], [0, 6], [500, 2], [0, 7], [500, 1]);
    const e = findEpisodes(two, T);
    expect(e.map((x) => [x.deadMinutes, x.revived])).toEqual([
      [6, true],
      [7, true],
    ]);
  });
});

describe('summarise', () => {
  it('reports the rate over ALL episodes and durations over revived ones only', () => {
    const s = summarise([
      [{ deadMinutes: 5, revived: true, startIndex: 0 }],
      [{ deadMinutes: 90, revived: false, startIndex: 0 }],
      [],
    ]);
    expect(s.episodes).toBe(2);
    expect(s.revived).toBe(1);
    expect(s.ratePct).toBe(50);
    // The 90-minute unrevived death must not enter the duration statistic --
    // "how long until it came back" is undefined for one that did not.
    expect(s.medianDeadMinutes).toBe(5);
    expect(s.symbolDays).toBe(2);
  });

  it('returns nulls rather than zero when there is nothing to summarise', () => {
    const s = summarise([[], []]);
    expect(s.ratePct).toBeNull();
    expect(s.medianDeadMinutes).toBeNull();
  });
});
