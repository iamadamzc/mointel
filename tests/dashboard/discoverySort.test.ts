import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import {
  DISCOVERY_DEFAULT_SORT,
  discoveryMissingCount,
  baselineLabel,
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
    /** After-hours rank, which is what the AH board orders on. */
    ahRank?: number | null;
  },
): DeskRow {
  return {
    ticker,
    // The desk's TMI Float (Sheet switch-off 3c): a PRODUCED bound sorts; the Sheet's float no longer does.
    floatBoundWired: true,
    floatBound: fields.float == null ? null : { state: 'PRODUCED', bound: fields.float },
    demand: fields.ahRank === undefined ? null : { afterHours: { rank: fields.ahRank } },
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
    expect(tickers(sortDiscoveryRows(rows, DISCOVERY_DEFAULT_SORT, 'DAILY_RVOL'))).toEqual(['AAA', 'BBB', 'CCC']);
  });

  it('sorts floats ascending with the tightest first', () => {
    const rows = [
      row('BIG', { float: 40_000_000, rvolRank: 1 }),
      row('TINY', { float: 700_000, rvolRank: 2 }),
      row('MID', { float: 9_000_000, rvolRank: 3 }),
    ];
    const sorted = sortDiscoveryRows(rows, { key: 'float', direction: 'asc' }, 'DAILY_RVOL');
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

    expect(tickers(sortDiscoveryRows(rows, { key: 'float', direction: 'asc' }, 'DAILY_RVOL'))).toEqual([
      'TINY',
      'BIG',
      'NOFLOAT',
    ]);
    expect(tickers(sortDiscoveryRows(rows, { key: 'float', direction: 'desc' }, 'DAILY_RVOL'))).toEqual([
      'BIG',
      'TINY',
      'NOFLOAT',
    ]);
  });

  it('counts the rows a sort cannot place, so absence is stated not implied', () => {
    /*
     * THE RANKS ARE ON THE FIXTURE NOW, AND THEY HAVE TO BE.
     *
     * This case used to omit them and still assert 0 missing ranks -- which
     * passed only because `discoveryMissingCount` short-circuited `rank` to 0
     * before looking. Removing that shortcut exposed the assertion as green for
     * the wrong reason: it claimed "rank is never missing" using rows where
     * every rank WAS missing. A Discovery row always carries `rvol_rank`
     * (`WHERE rvol_rank IS NOT NULL`), so the fixture now says so.
     */
    const rows = [
      row('A', { rvolRank: 1, float: null, percentChange: 12 }),
      row('B', { rvolRank: 2, float: 700_000, percentChange: null }),
      row('C', { rvolRank: 3, float: null, percentChange: 4 }),
    ];

    expect(discoveryMissingCount(rows, 'float', 'DAILY_RVOL')).toBe(2);
    expect(discoveryMissingCount(rows, 'changePct', 'DAILY_RVOL')).toBe(1);
    // Every Discovery row is ranked by construction, so nothing is missing --
    // and this now checks that rather than assuming it.
    expect(discoveryMissingCount(rows, 'rank', 'DAILY_RVOL')).toBe(0);
  });

  it('breaks ties on rank then ticker, so the order does not shuffle between polls', () => {
    const rows = [
      row('ZZZ', { price: 5, rvolRank: 9 }),
      row('AAA', { price: 5, rvolRank: 2 }),
      row('MMM', { price: 5, rvolRank: 2 }),
    ];
    const first = tickers(sortDiscoveryRows(rows, { key: 'price', direction: 'desc' }, 'DAILY_RVOL'));
    const second = tickers(sortDiscoveryRows([...rows].reverse(), { key: 'price', direction: 'desc' }, 'DAILY_RVOL'));

    expect(first).toEqual(['AAA', 'MMM', 'ZZZ']);
    expect(second).toEqual(first);
  });

  it('does not mutate the caller’s array', () => {
    const rows = [row('B', { rvol: 1 }), row('A', { rvol: 9 })];
    sortDiscoveryRows(rows, { key: 'rvol', direction: 'desc' }, 'DAILY_RVOL');
    expect(tickers(rows)).toEqual(['B', 'A']);
  });

  it('sorts the move by the session-aware percent change already on telemetry', () => {
    const rows = [
      row('FLAT', { percentChange: 2.1, rvolRank: 1 }),
      row('GAPPER', { percentChange: 64.8, rvolRank: 2 }),
      row('DOWN', { percentChange: -8.4, rvolRank: 3 }),
    ];
    expect(tickers(sortDiscoveryRows(rows, { key: 'changePct', direction: 'desc' }, 'DAILY_RVOL'))).toEqual([
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

    // The old defect: a single-string label consumed only by `title=`.
    expect(source).not.toMatch(/title=\{\s*entry\.key === 'changePct' \? moveLabel/);

    /*
     * THE PER-SESSION WORDS ARE NO LONGER ASSERTED BY REGEX HERE.
     *
     * This test used to match the switch cases inside this component. That
     * pinned the words to a FILE rather than to a BEHAVIOUR, and it failed the
     * moment the function moved somewhere better -- a test reporting a
     * relocation as a defect. `baselineLabel` is exported now and the words are
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
    expect(baselineLabel('PREMARKET').label).toBe('PM Gap');
    expect(baselineLabel('PREMARKET').title).toContain('prior session close');
  });

  it('changes the word when the reference changes, which is why it is not a constant', () => {
    expect(baselineLabel('RTH').label).toBe('RTH Gap');
    expect(baselineLabel('AFTER_HOURS').label).toBe('AH Gap');
    expect(baselineLabel('POST_MARKET').label).toBe('AH Gap');
    // Four phases, THREE distinct words -- AH and POST_MARKET share a reference
    // and must not drift apart into two labels for one denominator.
    expect(baselineLabel('AFTER_HOURS')).toEqual(baselineLabel('POST_MARKET'));
  });

  it('names a baseline it can defend when the phase does not determine one', () => {
    /*
     * `CLOSED` and `NEXT_DAY_PREP` land here and are NOT rare -- overnight and
     * weekends. And they do not share a baseline: before the trading date rolls
     * the reference is today's close, after it rolls it is the prior one. So
     * this arm must not claim a session, and must not use `Move`, which is now
     * reserved for the within-session number that does not exist yet.
     */
    for (const phase of [null, 'CLOSED', 'NEXT_DAY_PREP'] as const) {
      expect(baselineLabel(phase).label).toBe('Gap');
      expect(baselineLabel(phase).title).toContain('most recent session close');
    }
  });

  /*
   * `Move` IS RESERVED AND MUST NOT APPEAR. He approved `Day` for RTH exactly
   * so the within-session number can own the word `Move` from the day it ships,
   * with no fortnight where it meant something else and nothing recording the
   * turn.
   */
  it('never returns the reserved word', () => {
    const phases = [null, 'CLOSED', 'PREMARKET', 'RTH', 'AFTER_HOURS', 'POST_MARKET', 'NEXT_DAY_PREP'] as const;
    /*
     * CONTAINMENT, NOT IDENTITY. `not.toBe('Move')` passed `AH move` -- a word
     * reserved as a MEANING is inherited by any label containing it, at scan
     * speed, whatever the test matched. This was blocked while `AH move`
     * shipped; his rename to `AH Gap` removed the last string that would fail
     * it, so the guard and the rename ride together.
     */
    for (const phase of phases) {
      // CASE-INSENSITIVE, and that is not fussiness: `'AH move'.includes('Move')`
      // is FALSE, so the containment guard still passed the exact string it
      // exists to reject. Identity -> containment fixed one half and left the
      // other. Mutation found it; reading it twice did not.
      expect(baselineLabel(phase).label.toLowerCase()).not.toContain('move');
    }
  });

  /*
   * THE REGRESSION ITSELF, and it is a source assertion because this suite has
   * no renderer. The header held a hand-typed "Move" while the sort control
   * computed `Gap` from the same phase. Two words for one quantity, already
   * drifted on his live board.
   */
  it('is the single source for every surface that names the baseline', async () => {
    /*
     * EVERY COMPONENT, NOT ONE FILE. This read only `DiscoveryBoard.tsx` and
     * passed while `MomentumTable.tsx` carried a second, hand-typed
     * `Price · Move · VWAP`. So when Discovery started deriving `PM Gap`, the
     * two lists said different words for one quantity on one screen -- and the
     * guard was green, because it matched a FILE where the invariant is about a
     * SURFACE. `MomentumTable` states that invariant itself: "a trader reading
     * both lists reads one grammar."
     */
    const fs = await import('node:fs');
    const dir = 'components';
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(5);

    /*
     * COMMENTS STRIPPED FIRST, AND THIS GUARD TRIPPED ON ITS OWN PROSE BEFORE
     * THEY WERE. The fix in `MomentumTable` explains the defect it fixes, and
     * quoting the literal made the file look like an offender while the code
     * was clean. A source-scanning guard that does not strip comments is
     * testing prose -- which is the same confusion, one level up, as the reader
     * this whole family of defects is about.
     */
    const code = (f: string) =>
      fs
        .readFileSync(`${dir}/${f}`, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

    const offenders = files.filter((f) =>
      /Price · (Move|Gap|Day|AH move|AH Gap|PM Gap|RTH Gap) · VWAP/.test(code(f)),
    );
    expect(offenders).toEqual([]);

    const board = fs.readFileSync(`${dir}/DiscoveryBoard.tsx`, 'utf8');
    expect(board).toContain('Price · {move.label} · VWAP');
    expect(board).not.toMatch(/^function moveLabel\(/m);
  });
});

/* ------------------------------------------------------------------------- *
 * THE BOARD OWNS THE RANK
 *
 * The rank CELL already picked `afterHours.rank` after the bell while the SORT
 * read the daily rank on every board. So the server ordered the AH board by AH
 * rank, the client re-sorted it by DAILY rank, and the column printed AH ranks
 * out of sequence -- a board whose title claims one ordering while it displays
 * another. He reported the symptom without knowing it was one: "it's not been
 * clear what it was."
 * ------------------------------------------------------------------------- */
describe('the rank sort follows the board, not the day', () => {
  const rows = [
    row('AAA', { rvolRank: 1, ahRank: 3 }),
    row('BBB', { rvolRank: 2, ahRank: 1 }),
    row('CCC', { rvolRank: 3, ahRank: 2 }),
  ];

  it('orders the Discovery board by the daily rank', () => {
    expect(tickers(sortDiscoveryRows(rows, DISCOVERY_DEFAULT_SORT, 'DAILY_RVOL'))).toEqual([
      'AAA',
      'BBB',
      'CCC',
    ]);
  });

  /*
   * THE REGRESSION. The fixture is built so the two orders CANNOT coincide:
   * daily 1,2,3 maps to AH 3,1,2. Before the fix this returned the daily order
   * on the AH board, which is the defect, and a fixture where the two agreed
   * would have passed either way.
   */
  it('orders the after-hours board by the after-hours rank', () => {
    expect(tickers(sortDiscoveryRows(rows, DISCOVERY_DEFAULT_SORT, 'AFTER_HOURS'))).toEqual([
      'BBB',
      'CCC',
      'AAA',
    ]);
  });

  it('counts a missing rank against the board being shown', () => {
    const partial = [row('AAA', { rvolRank: 1, ahRank: 1 }), row('BBB', { rvolRank: 2 })];
    // BBB has a daily rank and no AH rank: nothing missing by day, one by evening.
    expect(discoveryMissingCount(partial, 'rank', 'DAILY_RVOL')).toBe(0);
    expect(discoveryMissingCount(partial, 'rank', 'AFTER_HOURS')).toBe(1);
  });

  /*
   * The tie-break reads the same board. Falling back to the daily rank here
   * would reintroduce the defect one layer down, where it shows only on ties
   * and is far harder to see -- so the fixture ties the sorted field on purpose.
   */
  it('breaks ties on the board’s own rank, not the daily one', () => {
    const tied = [
      row('AAA', { rvol: 5, rvolRank: 1, ahRank: 3 }),
      row('BBB', { rvol: 5, rvolRank: 2, ahRank: 1 }),
    ];
    expect(tickers(sortDiscoveryRows(tied, { key: 'rvol', direction: 'desc' }, 'AFTER_HOURS'))).toEqual([
      'BBB',
      'AAA',
    ]);
  });
});
