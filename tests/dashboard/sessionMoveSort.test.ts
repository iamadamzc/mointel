/**
 * SORTING BY THE WITHIN-SESSION MOVE.
 *
 * His instruction: *"i want in session move as a sortable option."*
 *
 * THIS IS A NEW QUANTITY, NOT A RESTORED WORD. `Move` was removed from the sort
 * control at `97e893d` because it was a SECOND WORD FOR `Gap` -- both meant the
 * change from the prior session's close, and the control and the header had
 * drifted into naming one number two ways. What this sorts is measured from THIS
 * session's own opening print: a different denominator, so a different noun. The
 * rename's own logic applied, not reversed.
 *
 *     ACROSS sessions   PM Gap  · RTH Gap  · AH Gap  · Gap      changePct
 *     WITHIN a session  PM Move · RTH Move · AH Move · Move     sessionMove
 *
 * AND A SORT KEY IS NOT A LABEL. `DiscoveryBoard` sorts and THEN slices, so the
 * key does not merely order the rows -- it decides WHICH ROWS ARE ON SCREEN.
 * Every other consequence of a bad anchor so far has been a mislabelled row;
 * under this sort it is membership of his top-N.
 */
import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import { sessionMoveSortLabel } from '@/lib/dashboard/sessionMove';
import {
  baselineLabel,
  discoveryMissingCount,
  discoveryValueFor,
  sortDiscoveryRows,
} from '@/lib/dashboard/view';
import type { SessionPhase } from '@/lib/market/types';

function row(ticker: string, move: number | null, state = 'OPEN'): DeskRow {
  return {
    ticker,
    displayedFloat: null,
    demand: null,
    telemetry: {
      ticker,
      rvolRank: 1,
      sessionMove: move === null && state === 'ABSENT' ? null : { move, state, label: 'PM Move' },
    },
  } as unknown as DeskRow;
}

describe('sorting by the within-session move', () => {
  it('reads the reading the cell renders, not a second computation', () => {
    expect(discoveryValueFor(row('AAA', 43.6), 'sessionMove', 'DAILY_RVOL')).toBe(43.6);
  });

  it('carries the sign, because a fader and a runner are opposite trades', () => {
    expect(discoveryValueFor(row('AAA', -12.4), 'sessionMove', 'DAILY_RVOL')).toBe(-12.4);
  });

  it('is null for a name that has not traded this session, never zero', () => {
    /*
     * `NO_PRINT` is a measurement: this name is not trading in a live session.
     * Its within-session move does not EXIST. A zero would file it among names
     * that traded and went nowhere, in the middle of the board, which is the
     * flat-line defect deciding screen membership instead of a label.
     */
    expect(discoveryValueFor(row('AAA', null, 'NO_PRINT'), 'sessionMove', 'DAILY_RVOL')).toBeNull();
  });

  it('is null when there is no reading at all', () => {
    expect(discoveryValueFor(row('AAA', null, 'ABSENT'), 'sessionMove', 'DAILY_RVOL')).toBeNull();
  });

  it('sorts absent rows last in BOTH directions', () => {
    /*
     * Flipping direction must not promote absence to the top. Under a sort that
     * also slices, that is not a cosmetic slip -- it would fill his visible
     * board with names that have no number.
     */
    const rows = [row('AAA', 5), row('BBB', null, 'NO_PRINT'), row('CCC', 40)];

    const desc = sortDiscoveryRows(rows, { key: 'sessionMove', direction: 'desc' }, 'DAILY_RVOL');
    expect(desc.map((r) => r.ticker)).toEqual(['CCC', 'AAA', 'BBB']);

    const asc = sortDiscoveryRows(rows, { key: 'sessionMove', direction: 'asc' }, 'DAILY_RVOL');
    expect(asc.map((r) => r.ticker)).toEqual(['AAA', 'CCC', 'BBB']);
  });

  it('counts the rows it cannot place, so the board can say so', () => {
    const rows = [row('AAA', 5), row('BBB', null, 'NO_PRINT'), row('CCC', null, 'ABSENT')];
    expect(discoveryMissingCount(rows, 'sessionMove', 'DAILY_RVOL')).toBe(2);
  });
});

/* ------------------------------------------------------------------------- *
 * THE TWO FAMILIES MUST NOT MEET
 * ------------------------------------------------------------------------- */

describe('the sort label', () => {
  const PHASES: Array<SessionPhase | null> = [
    'PREMARKET',
    'RTH',
    'AFTER_HOURS',
    'POST_MARKET',
    'CLOSED',
    null,
  ];

  it('never says Gap, at any phase or at the neutral', () => {
    for (const phase of PHASES) {
      expect(sessionMoveSortLabel(phase).label.toLowerCase()).not.toContain('gap');
    }
  });

  it('and the Gap family never says Move, which is the mirror', () => {
    /*
     * Lower-cased deliberately. An earlier version of this guard used
     * `not.toContain('Move')` and passed `'AH move'` -- caught by mutation
     * rather than by reading.
     */
    for (const phase of PHASES) {
      expect(baselineLabel(phase).label.toLowerCase()).not.toContain('move');
    }
  });

  it('names the session it measures within', () => {
    expect(sessionMoveSortLabel('PREMARKET').label).toBe('PM Move');
    expect(sessionMoveSortLabel('RTH').label).toBe('RTH Move');
    expect(sessionMoveSortLabel('AFTER_HOURS').label).toBe('AH Move');
  });

  it('falls to the family neutral off-session rather than guessing a session', () => {
    // The button is on screen at 02:00 on a Sunday like every other button.
    expect(sessionMoveSortLabel(null).label).toBe('Move');
  });

  it('does not name a session that has ended', () => {
    /*
     * FOUND ON THE LIVE BOARD, NOT HERE. At 02:23 ET with
     * `sessionPhase: NEXT_DAY_PREP` the control read `AH MOVE` beside a `GAP`
     * button that had correctly fallen to its own neutral -- two words for one
     * phase, on one screen, from the two families built to mirror each other.
     *
     * The cause was routing through `vwapSessionForPhase`, whose catch-all
     * `return 'AFTER_HOURS'` is right for choosing an accumulator and wrong for
     * naming a session. Every test here asserted the phases a session actually
     * has, so none of them could see it.
     */
    expect(sessionMoveSortLabel('NEXT_DAY_PREP').label).toBe('Move');
    expect(sessionMoveSortLabel('CLOSED').label).toBe('Move');
  });

  it('mirrors the Gap family at EVERY phase, including the dead ones', () => {
    /*
     * The invariant that actually failed: the two controls sit side by side, so
     * a phase where one names a session and the other does not is a
     * disagreement the reader has to resolve. Asserted as a pair rather than
     * per family, because both were individually defensible.
     */
    for (const phase of PHASES) {
      const gapNamesSession = baselineLabel(phase).label !== 'Gap';
      const moveNamesSession = sessionMoveSortLabel(phase).label !== 'Move';
      expect(moveNamesSession, `phase ${phase}`).toBe(gapNamesSession);
    }
  });

  it('carries a title on every arm, because the denominator is the whole job', () => {
    for (const phase of PHASES) {
      expect(sessionMoveSortLabel(phase).title.length).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------------- *
 * THE OMITTED ROWS ARE NOT "UNKNOWN"
 * ------------------------------------------------------------------------- */

describe('the unplaceable-rows chip', () => {
  it('does not call a not-traded name unknown', async () => {
    /*
     * The chip said `N unknown` for every key. On `float` that is right -- the
     * desk cannot say. On this key the set MIXES a measurement (`NO_PRINT`: this
     * name has not traded) with a genuine absence, and calling the first
     * "unknown" collapses a measurement into an absence -- the defect the
     * reading's `state` field exists to prevent, arriving in the chip that
     * exists to keep the sort honest.
     */
    const fs = await import('node:fs');
    const src = fs
      .readFileSync('components/DiscoveryBoard.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(src).not.toMatch(/\{missing\} unknown/);
    expect(src).toContain("MISSING_NOUN[sort.key] ?? 'unknown'");
    expect(src).toMatch(/sessionMove: 'no move'/);
  });

  it('says the board also slices, because last may mean off screen', async () => {
    /*
     * Sorting then slicing means an unplaceable row is not merely at the bottom
     * -- it can be absent from the rows he reads. The count is the only thing
     * that says so.
     */
    const fs = await import('node:fs');
    const src = fs.readFileSync('components/DiscoveryBoard.tsx', 'utf8');
    expect(src).toContain('may not be on screen at all');
  });
});

/* ------------------------------------------------------------------------- *
 * ONE RESOLVER, NOT TWO IF-CHAINS
 * ------------------------------------------------------------------------- */

describe('the board resolves phase-dependent labels in one place', () => {
  it('has no per-key special case left in the component', async () => {
    /*
     * `changePct` was special-cased twice -- once for the button, once for the
     * active marker. A second phase-dependent key would have made that two
     * chains to keep in step, which is exactly how the control came to read
     * `Gap` while the header above the same number read `Move`.
     */
    const fs = await import('node:fs');
    const src = fs
      .readFileSync('components/DiscoveryBoard.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(src).not.toMatch(/key === 'changePct'/);
    expect(src).not.toMatch(/key === 'sessionMove'/);
    expect(src).toContain('resolveSortEntry');
  });

  it('takes both phase labels from the exported sources, not typed strings', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('components/DiscoveryBoard.tsx', 'utf8');
    expect(src).toContain('resolve: baselineLabel');
    expect(src).toContain('resolve: sessionMoveSortLabel');
  });
});
