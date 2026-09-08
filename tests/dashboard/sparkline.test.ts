import { describe, expect, it } from 'vitest';

import { DEFAULT_ACTIVITY_CONFIG } from '@/lib/market/activity';
import {
  SPARK_FULL_SCALE,
  directionTone,
  pricePointsView,
  sparklineLagLabel,
  sparklineSpanLabel,
  sparklineView,
} from '@/lib/dashboard/sparkline';

/*
 * NOT MEASURED against MEASURED-AND-SILENT.
 *
 * `repo.ts` maps a NULL column to `undefined` rather than `[]` precisely so
 * these stay distinguishable. A DEAD row's window IS all zeros and that is a
 * real reading; an absent window means nothing was observed. Drawing both as a
 * flat line would state "no trading" where the truth is "not looked at".
 *
 * Both sides asserted, because a check that only exercises one cannot tell you
 * the predicate is right.
 */
describe('the two kinds of nothing', () => {
  it('returns null when the window was never measured', () => {
    expect(sparklineView(undefined)).toBeNull();
    expect(sparklineView(null)).toBeNull();
    expect(sparklineView([])).toBeNull();
  });

  it('returns a real view for a measured silence', () => {
    const view = sparklineView([0, 0, 0, 0, 0]);
    expect(view).not.toBeNull();
    expect(view!.silent).toBe(true);
    expect(view!.peak).toBe(0);
    expect(view!.heights).toEqual([0, 0, 0, 0, 0]);
  });

  it('does not call a quiet-but-alive name silent', () => {
    const view = sparklineView([0, 2, 0, 1, 0])!;
    expect(view.silent).toBe(false);
    expect(view.peak).toBe(2);
  });
});

/*
 * Full height is the ACTIVE LINE, not this row's own peak.
 *
 * Per-row normalisation was the obvious choice and it erases the comparison he
 * is actually making: scanning down a column of 25 rows. A dead name and a
 * raging one would both fill their box.
 */
describe('the scale is shared across rows', () => {
  it('scales against the active line rather than the row peak', () => {
    const quiet = sparklineView([10, 10, 10, 10, 10])!;
    const busy = sparklineView([300, 300, 300, 300, 300])!;

    // Same shape, wildly different magnitude — and the heights must say so.
    expect(quiet.heights[0]).toBeCloseTo(10 / SPARK_FULL_SCALE, 6);
    expect(busy.heights[0]).toBe(1);
    expect(quiet.heights[0]).toBeLessThan(busy.heights[0]);
  });

  it('takes the scale from the trader\'s own threshold rather than a constant', () => {
    expect(SPARK_FULL_SCALE).toBe(DEFAULT_ACTIVITY_CONFIG.activeTradesPerMinute);
  });

  it('clamps above the active line rather than overflowing the box', () => {
    expect(sparklineView([3000, 0, 0, 0, 0])!.heights[0]).toBe(1);
  });
});

/*
 * The span, because a sparkline reads as "now" unless it says otherwise, and
 * this one ends two minutes ago — the most recent minute is excluded as
 * unsettled. He holds for seconds, so the lag is not a detail.
 */
describe('the window says what it covers', () => {
  it('states the span and the lag', () => {
    expect(sparklineSpanLabel()).toBe('5 minutes ending 2 min ago');
  });

  it('derives both from the engine config rather than restating them', () => {
    /*
     * REWRITTEN. The previous version read the live config and asserted the
     * result against it, which passes just as well for a hardcoded string --
     * the test and the code shared the only values that could have told them
     * apart. Caught while fixing the sibling label one function away, and
     * mutation-verified rather than reasoned about.
     *
     * `deadMinutes` and `reviveMinutes` are varied INDEPENDENTLY because the
     * span is a `max()` of the two: holding one fixed cannot show that the
     * larger wins, and the shipped values (5 and 2) never exercise the branch
     * where the second is bigger.
     */
    const at = (over: Partial<typeof DEFAULT_ACTIVITY_CONFIG>) =>
      sparklineSpanLabel({ ...DEFAULT_ACTIVITY_CONFIG, ...over });

    expect(at({ settleMinutes: 4 })).toBe('5 minutes ending 5 min ago');
    expect(at({ deadMinutes: 9 })).toBe('9 minutes ending 2 min ago');
    expect(at({ reviveMinutes: 11 })).toBe('11 minutes ending 2 min ago');
    expect(at({ deadMinutes: 3, reviveMinutes: 7 })).toBe('7 minutes ending 2 min ago');
  });

  it('puts the span and the raw numbers in the hover', () => {
    const view = sparklineView([1, 2, 3])!;
    expect(view.title).toContain('5 minutes ending 2 min ago');
    expect(view.title).toContain('1, 2, 3');
    expect(view.title).toContain(String(SPARK_FULL_SCALE));
  });
});

/*
 * Description, never a verdict. The moment it grades a name it claims
 * prediction and inherits a bar this has not cleared.
 */
describe('the header states the lag, not only the tooltip', () => {
  /*
   * He found the two-minute offset by HOVERING and asked about it. The audit's
   * §10 rules out a fact that lives only in a `title`, and this column was on
   * the wrong side of a rule already enforced on the Move control.
   */
  it('names how far behind now the newest slot sits', () => {
    expect(sparklineLagLabel()).toBe('−2m');
  });

  /*
   * THE POINT OF THE TEST, and the reason it is not just an equality: the label
   * is DERIVED. Tune `settleMinutes` and the header must move with it, or the
   * column silently goes back to claiming a currency it does not have.
   */
  it('follows settleMinutes rather than restating a literal', () => {
    /*
     * THE CONFIG IS INJECTED, and that is the whole test. Asserting against
     * DEFAULT_ACTIVITY_CONFIG passes just as well for a hardcoded '−2m',
     * because settleMinutes IS 1 -- a test that cannot fail when the code is
     * replaced by a literal is not testing the derivation. Four vacuous tests
     * on this desk were caught by mutation rather than by reading, so this one
     * varies the input instead.
     */
    expect(sparklineLagLabel({ ...DEFAULT_ACTIVITY_CONFIG, settleMinutes: 4 })).toBe('−5m');
    expect(sparklineLagLabel({ ...DEFAULT_ACTIVITY_CONFIG, settleMinutes: 0 })).toBe('−1m');
  });

  /*
   * The two labels answer different questions and must not collapse into one:
   * the header carries the OFFSET, the tooltip carries the SPAN.
   */
  it('is not the span label', () => {
    expect(sparklineLagLabel()).not.toBe(sparklineSpanLabel());
    expect(sparklineSpanLabel()).toContain('ending 2 min ago');
  });
});

describe('it describes and does not grade', () => {
  it('carries no verdict vocabulary in the hover', () => {
    const view = sparklineView([500, 400, 300, 10, 0])!;
    expect(view.title).not.toMatch(/strong|weak|good|bad|buy|worth|best|active now|dying/i);
  });

  it('exposes no tone, score or rank', () => {
    const view = sparklineView([500, 400, 300, 10, 0])!;
    expect(Object.keys(view).sort()).toEqual(['heights', 'peak', 'silent', 'title', 'values']);
  });
});

describe('defensive shapes', () => {
  it('treats a negative or non-finite count as zero rather than inverting a bar', () => {
    const view = sparklineView([-5, Number.NaN, 10])!;
    expect(view.values).toEqual([0, 0, 10]);
    expect(view.heights[0]).toBe(0);
  });
});

/*
 * THE PRICE SERIES — points at traded minutes, never a line.
 *
 * A line asserts continuity between its points. At 8% coverage a dashed one is
 * still 92% non-data wearing the shape of data, because the eye follows the
 * stroke rather than its texture.
 */
describe('the price series', () => {
  const win = (startsAt: number, closes: (number | null)[]) => ({
    startsAt,
    closes,
    covered: closes.filter((c) => c !== null).length,
  });

  it('places points at the slots that traded, aligned to the activity window', () => {
    const v = pricePointsView(win(2, [4, null, 5]), 5)!;
    expect(v.points.map((p) => p.slot)).toEqual([2, 3, 4]);
    expect(v.points[1].y).toBeNull();
  });

  /*
   * The first-traded-minute rule, made STRUCTURAL. No trade, no point -- so
   * there is no line to begin at the window edge. 36-42% of top-12 rows open
   * with a hole, and drawing from the edge would show flat-then-rising where
   * the truth is absent-then-rising.
   *
   * 36-42% is from `data/market.db`, the LOCAL desk rather than production,
   * pending a re-take. The RULE does not rest on it -- absent-then-rising is
   * not flat-then-rising at any rate.
   */
  it('never emits a point before the first traded minute', () => {
    const v = pricePointsView(win(3, [7, 8]), 5)!;
    expect(Math.min(...v.points.map((p) => p.slot))).toBe(3);
  });

  /*
   * Scaled to the row's OWN range, unlike the activity bars. Trades per minute
   * means the same thing on every row; $2 and $40 names share no price axis, so
   * shape is the only honest content.
   */
  it('scales to the row and seats a flat series mid-height', () => {
    const rising = pricePointsView(win(0, [1, 2, 3]), 3)!;
    expect(rising.points[0].y).toBe(0);
    expect(rising.points[2].y).toBe(1);

    // Flat must not collapse to the floor, which would read as a low.
    const flat = pricePointsView(win(0, [5, 5, 5]), 3)!;
    expect(flat.points.every((p) => p.y === 0.5)).toBe(true);
  });

  /*
   * Null rather than a drawn-but-empty axis. After a market restart the column
   * is legitimately absent while the engine rebuilds its minute maps -- amnesia,
   * not a reading -- and an empty axis would say "nothing traded".
   */
  it('returns null when there is nothing measured', () => {
    expect(pricePointsView(null, 5)).toBeNull();
    expect(pricePointsView(undefined, 5)).toBeNull();
    expect(pricePointsView(win(0, []), 5)).toBeNull();
    expect(pricePointsView(win(0, [null, null]), 5)).toBeNull();
  });

  it('carries the coverage as a fact rather than gating on it', () => {
    const v = pricePointsView(win(0, [1, null, null, 2]), 4)!;
    expect(v.covered).toBe(2);
    expect(v.title).toContain('2 of 4 minutes traded');
  });
});

/*
 * NO THRESHOLD AND NO GRADIENT. Coverage is a fidelity measure recruited to
 * answer a relevance question, and on the rows that matter the two run
 * opposite: TGL at 3% barely traded, AIXC at 8% traded 29,379 times. Opacity
 * by coverage is the same error made continuous and harder to notice.
 */
describe('sparsity is rendered, never gated', () => {
  const read = () =>
    import('node:fs').then((fs) =>
      fs.promises.readFile('components/ActivitySparkline.tsx', 'utf8'),
    );

  it('draws a sparse row at the same strength as a dense one', async () => {
    const source = await read();
    const at = source.indexOf('prices.points.map');
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at, at + 700);
    // No coverage-derived opacity, and no suppression by count.
    expect(block).not.toMatch(/opacity|covered\s*[<>]|covered\s*\?/);
  });

  it('emits discrete marks rather than a path', async () => {
    const source = await read();
    expect(source).not.toMatch(/<svg|polyline|<path/i);
  });
});

/*
 * COLOUR ENCODES DIRECTION, NEVER VOLUME. Red and green already mean down and
 * up on this surface, so volume-in-colour would render a high-volume decline
 * GREEN -- the strongest bearish reading wearing the bullish colour.
 */
describe('direction tone', () => {
  const p = (closes: (number | null)[]) => ({ closes });

  it('reads the sign of the move over the window', () => {
    expect(directionTone(p([4, 5]), 0.1)).toBe('pos');
    expect(directionTone(p([5, 4]), 0.1)).toBe('neg');
  });

  it('ignores holes and reads first to last TRADED minute', () => {
    expect(directionTone(p([4, null, null, 5]), 0.1)).toBe('pos');
  });

  /*
   * FLAT IS THE MOVE INSIDE THE SPREAD -- a move he could not have captured.
   * No invented percentage: the band is the one the instrument already
   * provides, and it is correct per name where one number is wrong for both a
   * $2 and a $40 stock.
   */
  it('calls a move inside the spread flat', () => {
    // 4.00 -> 4.01 is 0.25%, inside a 1% spread.
    expect(directionTone(p([4, 4.01]), 1)).toBe('warn');
  });

  it('calls the same move real when the spread is tighter', () => {
    // Identical move, 0.1% spread: now capturable, so it is direction.
    expect(directionTone(p([4, 4.01]), 0.1)).toBe('pos');
  });

  it('sits on the band rather than near it', () => {
    // Exactly at the spread is not beyond it.
    expect(directionTone(p([100, 101]), 1)).toBe('warn');
    expect(directionTone(p([100, 101.01]), 1)).toBe('pos');
  });

  it('treats a negative spread figure by magnitude', () => {
    expect(directionTone(p([4, 4.01]), -1)).toBe('warn');
  });

  /*
   * NEUTRAL IS NOT YELLOW. Yellow means MEASURED AND FLAT; null means NO PRICE
   * TO JUDGE. One colour serving a fault and an absence is the failure this
   * desk finds most often, and yellow looks like the natural "nothing to
   * report" colour.
   */
  describe('the two absences, both neutral and neither yellow', () => {
    it('has no direction without a price window', () => {
      expect(directionTone(null, 1)).toBeNull();
      expect(directionTone(undefined, 1)).toBeNull();
    });

    it('has no direction with prices but NO SPREAD to judge against', () => {
      // A different absence from the one above -- the desk had prices and no
      // band. Folded into neutral deliberately; not a fifth state today.
      expect(directionTone(p([4, 5]), null)).toBeNull();
      expect(directionTone(p([4, 5]), undefined)).toBeNull();
    });

    it('has no direction from a single point, because one price is not a move', () => {
      expect(directionTone(p([4]), 1)).toBeNull();
      expect(directionTone(p([null, 4, null]), 1)).toBeNull();
    });
  });
});

describe('the mark takes one colour, not one per bar', () => {
  const read = () =>
    import('node:fs').then((fs) =>
      fs.promises.readFile('components/ActivitySparkline.tsx', 'utf8'),
    );

  /*
   * The bars encode ACTIVITY. Colouring them by DIRECTION per bar would put two
   * independent variables on a 3px glyph -- a bivariate encoding at a size that
   * cannot carry one.
   */
  it('resolves one tone outside the bar map', async () => {
    const source = await read();
    const toneAt = source.indexOf('const tone = directionTone(');
    const mapAt = source.indexOf('view.heights.map');
    expect(toneAt).toBeGreaterThan(-1);
    expect(mapAt).toBeGreaterThan(-1);
    expect(toneAt).toBeLessThan(mapAt);
  });

  it('keeps neutral ink for the no-verdict case rather than a warn colour', async () => {
    const source = await read();
    // Sliced FORWARD: the class list follows the map opening, not precedes it.
    const at = source.indexOf('view.heights.map');
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at, at + 1200);
    // The instrument can see. Otherwise the assertions below are vacuous.
    expect(block).toContain('rounded-[1px]');

    expect(block).toContain('bg-ink-2');
    expect(block).toContain("tone === 'warn'");
  });
});
