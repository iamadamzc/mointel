import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import {
  DISCOVERY_DEFAULT_SORT,
  discoveryMissingCount,
  moveLabel,
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

/*
 * The Move label.
 *
 * Shipped once with the session wording in a `title` attribute and nowhere
 * else, which made it reachable only by hover — the audit's §10 rules that out,
 * and it reached production. These assert the visible text differs by session,
 * which is the property a tooltip-only implementation cannot satisfy.
 */
describe('move label', () => {
  it('names what the change is measured from, per session, in visible text', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.promises.readFile('components/DiscoveryBoard.tsx', 'utf8'),
    );

    // Visible button text, not a title: the label lives on the returned object
    // and is rendered as {resolved.label}.
    expect(source).toContain('{resolved.label}');

    // The old defect: a single-string moveLabel consumed only by `title=`.
    expect(source).not.toMatch(/title=\{\s*entry\.key === 'changePct' \? moveLabel/);

    /*
     * THE PER-SESSION WORDS ARE NO LONGER ASSERTED BY REGEX HERE.
     *
     * This test used to match the switch cases inside this component. That
     * pinned the words to a FILE rather than to a BEHAVIOUR, and it failed the
     * moment the function moved somewhere better -- a test reporting a
     * relocation as a defect. `moveLabel` is exported now and the words are
     * asserted by CALLING it, below, including the two phases that must share
     * one label. What stays here is the only part genuinely about this
     * component: that the label reaches VISIBLE TEXT rather than a tooltip.
     */
  });
});

/* ------------------------------------------------------------------------- *
 * THE WORD ABOVE THE PERCENT
 *
 * He questioned a live row -- "it says up 19%, please verify, math not mathing
 * for me" -- and BOTH numbers on it were correct. `+18.1%` is measured against
 * YESTERDAY'S CLOSE; the `+0.0%` directly beneath it is against TODAY'S PM
 * VWAP. Two percentages, two denominators, and the row named neither, so read
 * down at speed they contradict each other.
 *
 * The second line already names its own reference (`PM VWAP`). The first did
 * not -- and the desk already had the right word, on the sort button one
 * control away, while the column header over the same number said `Move`.
 * ------------------------------------------------------------------------- */
describe('the move label names what the percent is measured against', () => {
  it('calls the premarket move a Gap, which is the denominator in one word', () => {
    expect(moveLabel('PREMARKET').label).toBe('Gap');
    expect(moveLabel('PREMARKET').title).toContain('prior session close');
  });

  it('changes the word when the reference changes, which is why it is not a constant', () => {
    expect(moveLabel('RTH').label).toBe('Move');
    expect(moveLabel('AFTER_HOURS').label).toBe('AH move');
    expect(moveLabel('POST_MARKET').label).toBe('AH move');
    // Four phases, THREE distinct words -- AH and POST_MARKET share a reference
    // and must not drift apart into two labels for one denominator.
    expect(moveLabel('AFTER_HOURS')).toEqual(moveLabel('POST_MARKET'));
  });

  it('falls back to a reference it can actually defend when the phase is unknown', () => {
    // Not `Gap`: an unknown phase must not assert the PRIOR close specifically.
    expect(moveLabel(null).label).toBe('Move');
    expect(moveLabel(null).title).toContain('most recent session close');
  });

  /*
   * THE REGRESSION ITSELF, and it is a source assertion because this suite has
   * no renderer. The header held a hand-typed "Move" while the sort control
   * computed `Gap` from the same phase. Two words for one quantity, already
   * drifted on his live board.
   */
  it('is the single source for both the header and the sort control', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('components/DiscoveryBoard.tsx', 'utf8');
    expect(source).not.toContain('Price · Move · VWAP');
    expect(source).toContain('Price · {move.label} · VWAP');
    expect(source).not.toMatch(/^function moveLabel\(/m);
  });
});
