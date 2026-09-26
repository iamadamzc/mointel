import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/* ------------------------------------------------------------------------- *
 * THE HEAD NAMES THE QUANTITY
 * ------------------------------------------------------------------------- */

/**
 * He asked twice what this column was sorting. The head said `Now` over `−1m`
 * — two statements of WHEN and none of WHAT — and the units lived only in the
 * sort caption, which is on screen only while that sort is already active.
 *
 * Source-asserted because `SORT_KEYS` is private to the component. The
 * comment strip is not optional here: four separate claims on this desk have
 * been a comment read as code, and one of them was a comment its own author
 * had written.
 */
describe('the trades column head states what, not when', () => {
  function head(): string {
    const src = readFileSync(join(process.cwd(), 'components/DiscoveryBoard.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const open = src.indexOf("activeColumn === 'now'");
    expect(open).toBeGreaterThan(-1);
    const close = src.indexOf('</Th>', open);
    expect(close).toBeGreaterThan(open);
    return src.slice(open, close);
  }

  it('takes the word from the sort entry rather than typing a second one', () => {
    /*
     * The `Gap`/`Move` drift was two hand-written words for one quantity, on
     * the control and on the head above the same number. Removing the literal
     * makes the drift impossible rather than forbidden.
     */
    expect(head()).toContain('resolveSortEntry(nowEntry');
  });

  it('keeps HIS word, and the quantity lives in the hover', () => {
    /*
     * THIS ASSERTED THE OPPOSITE AND HE OVERRULED IT, so the test records the
     * ruling rather than being deleted. I argued `TRADES`: the head named a
     * TIME where every other head names a QUANTITY. He directed column
     * tooltips, which answers the half a header cannot, and kept `Now` —
     * because he sorts by this column for its LIVE ordering, so the word names
     * what he is looking for.
     *
     * **The measurement then made his word the more accurate one.** `Now` is
     * a slight overclaim today at the last settled minute, and the rolling-60s
     * field makes it exact. The rename would have discarded the word that
     * becomes true.
     *
     * So what is asserted is the COMPOSITION he ruled: his word on the head,
     * the quantity in the hover, neither carrying the other's job.
     */
    const src = readFileSync(join(process.cwd(), 'components/DiscoveryBoard.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/key: 'now',\s*label: 'Now',/);
    // The head is bare; the hover is where the unit is stated.
    expect(src).toMatch(/title:\s+'Trades in the most recent settled minute/);
  });

  it('keeps the lag on the head, which is the part hover may not carry', () => {
    /* §10 rules out hover-only content; the offset changes how the bars read. */
    expect(head()).toContain('sparklineLagLabel()');
  });
});

/* ------------------------------------------------------------------------- *
 * THE COLUMN AND ITS SORT MOVE TOGETHER
 * ------------------------------------------------------------------------- */

/**
 * After the bell the board ranks on after-hours participation, so the column
 * that shows the ranking quantity shows participation and must ORDER by it.
 *
 * A column that displays one number and sorts on another is the defect this
 * board has produced twice: he read a correctly sorted board as "random" both
 * times, because the visible figures did not descend.
 */
describe('the ranking column sorts on what it displays, in both sessions', () => {
  function rowWith(rvol: number, participation: number | null): DeskRow {
    return {
      ticker: 'HOWL',
      telemetry: { rvol },
      demand: { afterHours: { participation } },
    } as unknown as DeskRow;
  }

  it('orders by Daily RVOL on the day board', () => {
    expect(discoveryValueFor(rowWith(12, 99), 'rvol', 'DAILY_RVOL')).toBe(12);
  });

  it('orders by PARTICIPATION on the evening board, not the stale RVOL', () => {
    /*
     * Both arms, because the day arm is the control: if this returned
     * participation everywhere the assertion would pass while the day board
     * silently reordered.
     */
    expect(discoveryValueFor(rowWith(12, 99), 'rvol', 'AFTER_HOURS')).toBe(99);
    expect(discoveryValueFor(rowWith(12, 99), 'rvol', 'DAILY_RVOL')).toBe(12);
  });

  it('is NULL rather than the daytime number when participation is unknown', () => {
    /*
     * The safe direction. Falling back to Daily RVOL would order the evening
     * board by a number that stopped moving at 16:00 while the header said
     * PART — silently, and looking correct.
     */
    expect(discoveryValueFor(rowWith(12, null), 'rvol', 'AFTER_HOURS')).toBeNull();
  });
});
