import { describe, expect, it } from 'vitest';

import { tradesLastMinute } from '@/lib/dashboard/sparkline';
import { discoveryValueFor, discoveryMissingCount } from '@/lib/dashboard/view';
import type { DeskRow } from '@/lib/dashboard/merge';

/**
 * Two of his observations from the live board, 2026-09-22.
 *
 * 1. The headline percentage must be the one the board is ordered by. On the
 *    live board QNME's headline read +50.1% while its premarket move was
 *    -5.9%, and HUBC's read -19.7% against +0.2% — OPPOSITE SIGNS on the
 *    number a trader scans first. The render half is in `PriceMoveCell`; what
 *    is assertable here is the sort key it follows.
 *
 * 2. "Which names are trading heaviest right now" — a question neither RANK
 *    nor RVOL answers, because `rvolRank` is assigned by sorting on `rvol`
 *    (`lib/market/rvol.ts:138`), so they are one ordering. Verified on the
 *    live payload: 50 of 50 rows, identical order.
 */

function row(over: { activityWindow?: number[] } = {}): DeskRow {
  return { ticker: 'HOWL', demand: { activityWindow: over.activityWindow } } as unknown as DeskRow;
}

describe('trades in the most recent settled minute', () => {
  it('reads the tail of the verdict own array', () => {
    // `resolveActivity` decides DEAD on the last `deadMinutes` slots and ACTIVE
    // on the last `reviveMinutes`. Taking the number from the same end is what
    // stops the figure and the ACTIVE/DEAD badge drifting apart.
    expect(tradesLastMinute(row({ activityWindow: [930, 522, 437, 512, 438] }).demand)).toBe(438);
  });

  it('is ZERO for a counted silent minute', () => {
    // A real reading, and one of the more informative things the board can say.
    expect(tradesLastMinute(row({ activityWindow: [0, 0, 0, 0, 0] }).demand)).toBe(0);
  });

  it('is NULL when nothing was measured, which is a different fact', () => {
    /*
     * The distinction the whole function exists for. An absent window means
     * the row was never observed; returning 0 would sort an unobserved name
     * into the middle of the dead ones and print a confident "0 trades" over a
     * minute nobody counted.
     */
    expect(tradesLastMinute(row().demand)).toBeNull();
    expect(tradesLastMinute(row({ activityWindow: [] }).demand)).toBeNull();
    expect(tradesLastMinute(null)).toBeNull();
  });

  it('never returns zero for an absence, on any input shape', () => {
    for (const demand of [null, undefined, {}, { activityWindow: [] }]) {
      expect(tradesLastMinute(demand as never)).not.toBe(0);
    }
  });
});

describe('the Now sort orders by it, and counts what it cannot place', () => {
  const board = 'DAILY_RVOL' as const;

  it('sorts on the same number the cell renders', () => {
    const busy = row({ activityWindow: [1, 1, 1, 1, 2979] });
    expect(discoveryValueFor(busy, 'now', board)).toBe(tradesLastMinute(busy.demand));
    expect(discoveryValueFor(busy, 'now', board)).toBe(2979);
  });

  it('separates a silent name from an unmeasured one', () => {
    expect(discoveryValueFor(row({ activityWindow: [0, 0] }), 'now', board)).toBe(0);
    expect(discoveryValueFor(row(), 'now', board)).toBeNull();
  });

  it('counts only the unmeasured rows as unplaceable, never the silent ones', () => {
    /*
     * The word on screen is "not measured", so the set it counts has to be
     * exactly the rows nobody counted. A silent name sorts last on its own
     * merits and is not missing from the ordering.
     */
    const rows = [
      row({ activityWindow: [0, 0, 0] }),
      row({ activityWindow: [5, 900] }),
      row(),
      row(),
    ];
    expect(discoveryMissingCount(rows, 'now', board)).toBe(2);
  });
});
