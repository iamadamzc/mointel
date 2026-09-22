import { describe, expect, it } from 'vitest';

import { cycleBadge, highReading, resolveComputedCycle } from '@/lib/dashboard/cycle';
import type { CycleResult } from '@/lib/market/cycle';

/**
 * ONE cycle badge for the whole desk, with its tooltip from the same decision.
 *
 * Found on the live board, 2026-09-22 premarket: of the four tickers appearing
 * on both Discovery and Researched Names, THREE showed different cycle
 * verdicts at the same moment — GRML `OFF HIGH $12.10 → $10.49` against
 * `DAY 1`, QNME and TOPS `OFF HIGH` against `BACKSIDE`.
 *
 * Neither surface was stale. Both read the same `computedCycle`, through
 * different readings: Discovery applied `highReading`'s live override and the
 * researched table rendered the settled phase. So these tests assert the two
 * properties that make that impossible to repeat — one decision produces label,
 * tone AND title, and the phase is never silently dropped when the override
 * takes the word.
 */

function arc(over: Partial<Extract<CycleResult, { phase: string }>> = {}): CycleResult {
  return {
    phase: 'BACKSIDE',
    startDate: '2026-09-01',
    baseClose: 1,
    cycleHigh: 1.5,
    cycleHighDate: '2026-09-10',
    sessionsSinceHigh: 3,
    sessionsInCycle: 8,
    givebackPct: 0.4,
    retracementPct: 0.4,
    recentRvol: 5,
    advancePct: 50,
    latestDate: '2026-09-19',
    latestClose: 1.1,
    ...over,
  } as CycleResult;
}

/**
 * The live override, as the live board actually produced it.
 *
 * IT ONLY FIRES WHEN TODAY BEAT THE SETTLED HIGH — `highReading` returns a
 * label-less pair otherwise, and the phase keeps the word. A first pass at
 * these fixtures used a session high EQUAL to the cycle high and produced no
 * override at all, which is the trigger being misread rather than the rule.
 *
 * So the three live rows that exposed this were names whose session high had
 * already passed the settled run's high, with price back under it: today had
 * superseded the arc the other table was still naming.
 */
function offHigh(current: CycleResult) {
  return highReading(current, 'NOT_QUALIFIED', 1.6, 1.46, 0.001);
}

describe('the override takes the word and never buries the phase', () => {
  it('reproduces QNME: OFF HIGH on top, BACKSIDE inside the tooltip', () => {
    const current = arc({ phase: 'BACKSIDE' });
    const badge = cycleBadge(offHigh(current), current, resolveComputedCycle({ current } as never))!;

    expect(badge.label).toBe('OFF HIGH');
    // The word the other table used to show as its entire badge is still
    // reachable, which is what stops the two surfaces disagreeing quietly.
    expect(badge.title).toContain('BACKSIDE');
    expect(badge.title).toContain('more than one spread below');
  });

  it('reproduces GRML: OFF HIGH over DAY 1, the pair that argued both ways', () => {
    const current = arc({ phase: 'DAY_ONE', sessionsSinceHigh: 0, sessionsInCycle: 1 });
    const badge = cycleBadge(offHigh(current), current, resolveComputedCycle({ current } as never))!;

    expect(badge.label).toBe('OFF HIGH');
    expect(badge.title).toContain('DAY 1');
    expect(badge.title).toContain('First session of this advance');
  });
});

describe('the tooltip explains the label above it, not a different quantity', () => {
  it('gives the LIVE meaning when the live override produced the word', () => {
    const current = arc({ phase: 'PULLBACK' });
    const badge = cycleBadge(offHigh(current), current, resolveComputedCycle({ current } as never))!;

    // `PULLBACK` also renders as `OFF HIGH`, from a different quantity. The
    // title has to say which one is on screen, or the two are unreadable apart.
    expect(badge.title).toMatch(/^Price is more than one spread below/);
  });

  it('gives the LIVE meaning for NEW HIGH too', () => {
    const current = arc({ phase: 'PULLBACK' });
    const badge = cycleBadge(
      // Today beat the settled high AND price is at it, within the spread.
      highReading(current, 'NOT_QUALIFIED', 1.6, 1.6, 0.01),
      current,
      resolveComputedCycle({ current } as never),
    )!;

    expect(badge.label).toBe('NEW HIGH');
    expect(badge.title).toMatch(/^Price is within one spread/);
  });

  it('explains every phase word, from what the classifier tests', () => {
    const phases = ['DAY_ONE', 'FRONTSIDE', 'PULLBACK', 'BACKSIDE', 'SHADOW'] as const;
    for (const phase of phases) {
      const current = arc({ phase });
      const badge = cycleBadge(null, current, resolveComputedCycle({ current } as never))!;

      expect(badge.title.length).toBeGreaterThan(badge.label.length);
      expect(badge.title).toContain(badge.label);
      // He asked that every term on the board explain itself; an empty or
      // label-echoing title is the state this exists to prevent.
      expect(badge.title).not.toBe(badge.label);
    }
  });
});

describe('what it declines to render', () => {
  it('is null with nothing to say, rather than an empty badge', () => {
    expect(cycleBadge(null, null, null)).toBeNull();
  });

  it('is null when only a reading with no word exists', () => {
    // A pair with no label carries prices, not a verdict. Without a phase there
    // is no word to show, and inventing one is what the override guards against.
    const current = arc();
    const pair = highReading(current, 'NOT_QUALIFIED', 1.6, 1.46, undefined);
    expect(pair?.kind).toBe('PAIR');
    expect(cycleBadge(pair, current, null)).toBeNull();
  });
});
