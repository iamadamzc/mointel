import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import {
  DISCOVERY_DEFAULT_SORT,
  discoveryMissingCount,
  sortDiscoveryRows,
} from '@/lib/dashboard/view';

/**
 * The sort reads six fields and nothing else, so the fixture supplies those.
 * A full DeskRow here would be forty lines of irrelevant state per case and
 * would hide which field each assertion actually depends on.
 */
function row(
  ticker: string,
  fields: {
    rvolRank?: number | null;
    rvol?: number | null;
    percentChange?: number | null;
    price?: number | null;
    float?: number | null;
  },
): DeskRow {
  return {
    ticker,
    displayedFloat: fields.float ?? null,
    telemetry: {
      ticker,
      rvolRank: fields.rvolRank ?? null,
      rvol: fields.rvol ?? null,
      percentChange: fields.percentChange ?? null,
      price: fields.price ?? null,
    },
  } as unknown as DeskRow;
}

const tickers = (rows: DeskRow[]) => rows.map((r) => r.ticker);

describe('discovery sort', () => {
  it('defaults to the board’s own ranking', () => {
    expect(DISCOVERY_DEFAULT_SORT).toEqual({ key: 'rank', direction: 'asc' });

    const rows = [row('CCC', { rvolRank: 3 }), row('AAA', { rvolRank: 1 }), row('BBB', { rvolRank: 2 })];
    expect(tickers(sortDiscoveryRows(rows, DISCOVERY_DEFAULT_SORT))).toEqual(['AAA', 'BBB', 'CCC']);
  });

  it('sorts floats ascending with the tightest first', () => {
    const rows = [
      row('BIG', { float: 40_000_000, rvolRank: 1 }),
      row('TINY', { float: 700_000, rvolRank: 2 }),
      row('MID', { float: 9_000_000, rvolRank: 3 }),
    ];
    const sorted = sortDiscoveryRows(rows, { key: 'float', direction: 'asc' });
    expect(tickers(sorted)).toEqual(['TINY', 'MID', 'BIG']);
  });

  /*
   * The one that matters. A name with no float on file is not "the smallest
   * float", and flipping direction must not promote absence to the top of the
   * list — a trader sorting float ascending to find tight names would read the
   * first row as the tightest name on the board.
   */
  it('keeps rows with no value last in BOTH directions', () => {
    const rows = [
      row('NOFLOAT', { float: null, rvolRank: 1 }),
      row('TINY', { float: 700_000, rvolRank: 2 }),
      row('BIG', { float: 40_000_000, rvolRank: 3 }),
    ];

    expect(tickers(sortDiscoveryRows(rows, { key: 'float', direction: 'asc' }))).toEqual([
      'TINY',
      'BIG',
      'NOFLOAT',
    ]);
    expect(tickers(sortDiscoveryRows(rows, { key: 'float', direction: 'desc' }))).toEqual([
      'BIG',
      'TINY',
      'NOFLOAT',
    ]);
  });

  it('counts the rows a sort cannot place, so absence is stated not implied', () => {
    const rows = [
      row('A', { float: null, percentChange: 12 }),
      row('B', { float: 700_000, percentChange: null }),
      row('C', { float: null, percentChange: 4 }),
    ];

    expect(discoveryMissingCount(rows, 'float')).toBe(2);
    expect(discoveryMissingCount(rows, 'changePct')).toBe(1);
    // Rank is the board's own order; there is nothing to declare missing.
    expect(discoveryMissingCount(rows, 'rank')).toBe(0);
  });

  it('breaks ties on rank then ticker, so the order does not shuffle between polls', () => {
    const rows = [
      row('ZZZ', { price: 5, rvolRank: 9 }),
      row('AAA', { price: 5, rvolRank: 2 }),
      row('MMM', { price: 5, rvolRank: 2 }),
    ];
    const first = tickers(sortDiscoveryRows(rows, { key: 'price', direction: 'desc' }));
    const second = tickers(sortDiscoveryRows([...rows].reverse(), { key: 'price', direction: 'desc' }));

    expect(first).toEqual(['AAA', 'MMM', 'ZZZ']);
    expect(second).toEqual(first);
  });

  it('does not mutate the caller’s array', () => {
    const rows = [row('B', { rvol: 1 }), row('A', { rvol: 9 })];
    sortDiscoveryRows(rows, { key: 'rvol', direction: 'desc' });
    expect(tickers(rows)).toEqual(['B', 'A']);
  });

  it('sorts the move by the session-aware percent change already on telemetry', () => {
    const rows = [
      row('FLAT', { percentChange: 2.1, rvolRank: 1 }),
      row('GAPPER', { percentChange: 64.8, rvolRank: 2 }),
      row('DOWN', { percentChange: -8.4, rvolRank: 3 }),
    ];
    expect(tickers(sortDiscoveryRows(rows, { key: 'changePct', direction: 'desc' }))).toEqual([
      'GAPPER',
      'FLAT',
      'DOWN',
    ]);
  });
});
