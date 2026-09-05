import { describe, expect, it } from 'vitest';

import { universeWarning } from '@/lib/dashboard/universe';

const h = (over: Record<string, unknown> = {}) =>
  ({ universeFreshness: 'FRESH', universeUpdatedAt: null, universeRollDue: false, ...over }) as never;

/*
 * A board missing names looks IDENTICAL to a quiet morning. The marker is the
 * only thing that can say the absence is not real -- on 2026-09-04 a name moved
 * 53% while the desk ran on the previous day's universe and reported ok.
 */
describe('when the marker speaks', () => {
  it('is silent when the universe is fresh', () => {
    expect(universeWarning(h())).toBeNull();
  });

  it('speaks whenever the universe is stale', () => {
    expect(universeWarning(h({ universeFreshness: 'STALE' }))).not.toBeNull();
    // Stale speaks even before a roll is due: it is a measured fact, not a
    // pending one.
    expect(universeWarning(h({ universeFreshness: 'STALE', universeRollDue: true }))).not.toBeNull();
  });

  /*
   * UNKNOWN IS NOT ONE STATE, and this is the half a flat rule gets wrong.
   *
   * At cold start it is expected. Still UNKNOWN after a roll was due means none
   * was recorded, and he is blind in exactly the way STALE describes. Both
   * directions asserted, because a check that only exercises the firing case
   * cannot tell you the predicate is right.
   */
  it('is silent on UNKNOWN before a roll is due', () => {
    expect(universeWarning(h({ universeFreshness: 'UNKNOWN', universeRollDue: false }))).toBeNull();
  });

  it('speaks on UNKNOWN once a roll is due', () => {
    expect(universeWarning(h({ universeFreshness: 'UNKNOWN', universeRollDue: true }))).not.toBeNull();
  });

  /*
   * An old build cannot report on a field it never had. Absent is not FRESH,
   * but it is silent either way -- claiming staleness from a missing field
   * would fire on every desk that predates it.
   */
  it('is silent when the field is absent entirely', () => {
    expect(universeWarning({} as never)).toBeNull();
    expect(universeWarning(null)).toBeNull();
  });
});

/*
 * The copy names what is MISSING, not that something is wrong. "Universe stale"
 * is engine vocabulary; the fact is that the board may be short a name that
 * gapped.
 */
describe('what it says', () => {
  it('names the consequence rather than the mechanism', () => {
    const w = universeWarning(h({ universeFreshness: 'STALE' }))!;
    expect(w.headline).toBe('Board may be missing names');
    expect(w.headline).not.toMatch(/stale|universe|refresh|roll/i);
  });

  /*
   * A date is checkable against something he already knows; a status word is a
   * claim he must trust. A surface that can be wrong carries what it would be
   * wrong about.
   */
  it('carries the as-of date rather than only a verdict', () => {
    const w = universeWarning(
      h({ universeFreshness: 'STALE', universeUpdatedAt: '2026-09-04T02:00:00.000Z' }),
    )!;
    expect(w.asOf).toBe('2026-09-04');
    expect(w.detail).toContain('2026-09-04');
  });

  it('omits an as-of it does not have rather than inventing one', () => {
    const w = universeWarning(h({ universeFreshness: 'STALE', universeUpdatedAt: null }))!;
    expect(w.asOf).toBeNull();
    expect(w.detail).not.toContain('undefined');
    expect(w.detail).not.toContain('null');
  });

  /*
   * No remedy is offered. Refreshing the universe is an ops action he cannot
   * perform from the board, and a surface that tells him to do something he
   * cannot do is worse than one that tells him what is true.
   */
  it('offers no remedy he cannot perform', () => {
    const w = universeWarning(h({ universeFreshness: 'STALE' }))!;
    expect(w.detail).not.toMatch(/restart|refresh the|run |npm |contact|try again/i);
  });
});

/*
 * The silent states are what PAY for the loud one. A marker firing rarely can
 * afford weight; one firing daily cannot -- and UNKNOWN-before-a-roll would fire
 * every cold start.
 */
describe('the marker cannot be dismissed or timed out', () => {
  const read = () =>
    import('node:fs').then((fs) =>
      fs.promises.readFile('components/DiscoveryBoard.tsx', 'utf8'),
    );

  it('renders on the counts it invalidates', async () => {
    const source = await read();
    const counts = source.indexOf('eligibleCount');
    const marker = source.indexOf('{universe ? (');
    expect(counts).toBeGreaterThan(-1);
    expect(marker).toBeGreaterThan(-1);
    // Adjacent to the numbers a stale universe makes yesterday's.
    expect(marker - counts).toBeLessThan(2200);
  });

  it('has no dismiss control and no timer', async () => {
    const source = await read();
    const at = source.indexOf('{universe ? (');
    const block = source.slice(at, at + 900);
    expect(block).not.toMatch(/onClick|onDismiss|setTimeout|dismiss/i);
  });
});
