import { describe, expect, it } from 'vitest';

import {
  CYCLE_PHASE_LABEL,
  countCyclePhases,
  cycleDetail,
  cyclePhaseOf,
  cyclePhaseTone,
  resolveComputedCycle,
} from '@/lib/dashboard/cycle';
import type { DeskRow } from '@/lib/dashboard/merge';
import type { CycleArc, CycleHistory } from '@/lib/market/cycle';

function arc(overrides: Partial<CycleArc> = {}): CycleArc {
  return {
    phase: 'BACKSIDE',
    startDate: '2026-08-10',
    baseClose: 1.0,
    cycleHigh: 1.2,
    cycleHighDate: '2026-08-12',
    sessionsSinceHigh: 9,
    sessionsInCycle: 11,
    givebackPct: 0.0833,
    retracementPct: 0.5,
    recentRvol: [2.1, 1.4],
    advancePct: 20,
    latestDate: '2026-08-21',
    latestClose: 1.1,
    ...overrides,
  };
}

function history(current: CycleHistory['current']): CycleHistory {
  return { current, priorCycles: [], formerRunnerStatus: 'NONE', largestPriorAdvancePct: null };
}

const row = (h: CycleHistory | null): DeskRow =>
  ({ intelligence: { analysis: { dossier: { computedCycle: h } } } }) as unknown as DeskRow;

describe('cycle labels', () => {
  it('names every phase in the trader’s words, with no engine names left', () => {
    expect(CYCLE_PHASE_LABEL).toEqual({
      DAY_ONE: 'DAY 1',
      FRONTSIDE: 'FRONTSIDE',
      PULLBACK: 'OFF HIGH',
      BACKSIDE: 'BACKSIDE',
      SHADOW: 'PRIOR RUN',
      NO_CYCLE: 'NO RUN',
    });
  });

  /*
   * The collision that forced the rename. In this trader's playbook a pullback
   * is the micro pullback on rising volume that triggers an entry; as a cycle
   * phase it is a multi-session position in the arc. The same word would say
   * "buy" on one surface and "context" on another.
   */
  it('never shows the word PULLBACK, which means an entry trigger to this trader', () => {
    expect(Object.values(CYCLE_PHASE_LABEL).join(' ')).not.toMatch(/PULLBACK/i);
  });

  it('colours only the phases a trader acts against', () => {
    expect(cyclePhaseTone('DAY_ONE')).toBe('pos');
    expect(cyclePhaseTone('FRONTSIDE')).toBe('pos');
    expect(cyclePhaseTone('PULLBACK')).toBe('warn');
    expect(cyclePhaseTone('BACKSIDE')).toBe('neg');
    // Absences of a live move, not warnings — colouring them spends the row's
    // one saturated element on nothing happening.
    expect(cyclePhaseTone('SHADOW')).toBe('dim');
    expect(cyclePhaseTone('NO_CYCLE')).toBe('dim');
  });
});

describe('cycle detail', () => {
  /*
   * The number that must never be the distance below the high. A name based at
   * 1.00 that ran to 1.20 has given back half its MOVE at 1.10, where the
   * below-high figure reads a reassuring 8.3% — on exactly the names that have
   * broken.
   */
  it('reports retracement of the move, not distance below the high', () => {
    const detail = cycleDetail(arc());
    expect(detail).toContain('50.0% of the move given back');
    expect(detail).not.toContain('8.3');
  });

  it('says the high is today rather than "0 sessions"', () => {
    expect(cycleDetail(arc({ sessionsSinceHigh: 0 }))).toContain('high is today');
    expect(cycleDetail(arc({ sessionsSinceHigh: 1 }))).toContain('1 session since');
  });

  it('omits a giveback that has not happened', () => {
    expect(cycleDetail(arc({ retracementPct: 0 }))).not.toContain('given back');
  });

  it('has nothing to say when there is no cycle', () => {
    expect(cycleDetail({ phase: 'NO_CYCLE' })).toBeNull();
  });
});

describe('resolveComputedCycle', () => {
  it('carries provenance outside the Sheet/Auto axis and never a counterparty', () => {
    const conclusion = resolveComputedCycle(history(arc()));
    expect(conclusion).not.toBeNull();
    expect(conclusion?.provenance).toBe('COMPUTED');
    // Arithmetic has nothing to disagree with. A cycle conflict is a fiction.
    expect(conclusion?.otherLabel).toBeNull();
    expect(conclusion?.label).toBe('BACKSIDE');
  });

  /*
   * Deliberately null rather than falling back to the model's classification.
   * That field is being deleted; reading it here would keep it alive past its
   * own removal, and the caller shows the field unresolved instead.
   */
  it('returns null with no computed history, rather than any fallback', () => {
    expect(resolveComputedCycle(null)).toBeNull();
    expect(resolveComputedCycle(undefined)).toBeNull();
  });
});

describe('phase counting', () => {
  it('counts from the computed phase, which is what the filter reads', () => {
    const counts = countCyclePhases([
      row(history(arc({ phase: 'DAY_ONE' }))),
      row(history(arc({ phase: 'DAY_ONE' }))),
      row(history(arc({ phase: 'BACKSIDE' }))),
      row(history({ phase: 'NO_CYCLE' })),
      row(null),
    ]);

    expect(counts.DAY_ONE).toBe(2);
    expect(counts.BACKSIDE).toBe(1);
    expect(counts.NO_CYCLE).toBe(1);
    // A row with no computed cycle is in no phase; it is not silently a zero
    // bucket's member.
    expect(counts.FRONTSIDE).toBe(0);
  });

  it('resolves a row with no dossier to no phase rather than throwing', () => {
    expect(cyclePhaseOf(undefined)).toBeNull();
    expect(cyclePhaseOf({} as DeskRow)).toBeNull();
  });
});

/*
 * Every cycle surface reads the resolved conclusion.
 *
 * The cutover switched `resolveConclusions` and the surfaces that call it, and
 * three that read the Sheet's `ticker.cycle` directly survived it — the
 * researched table's cycle cell, its backside colour precedence, and the
 * drawer's header badge. They kept rendering FRONTSIDE — WARNING on the live
 * desk while the filter above them offered DAY 1 and OFF HIGH.
 *
 * This asserts against source because the failure is structural: a component
 * reaching past the shared projection to the sheet row. Caught by looking at
 * production, not by the 1,261 tests that were green at the time.
 */
describe('no surface renders the Sheet cycle directly', () => {
  it('has no component reading ticker.cycle for display', async () => {
    const { promises: fs } = await import('node:fs');
    const files = [
      'components/MomentumTable.tsx',
      'components/TickerDrawer.tsx',
      'components/DiscoveryBoard.tsx',
    ];

    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      // `ticker.cycle.display` / `.state` are the Sheet's classification
      // presented AS the desk's cycle. A labelled source field — the drawer's
      // "Cycle (sheet)" — is a different thing and stays.
      expect(source, `${file} renders the sheet cycle`).not.toMatch(
        /ticker\.cycle\.(display|state)/,
      );
    }
  });

  it('no longer exports a tone map for the Sheet cycle states', async () => {
    const { promises: fs } = await import('node:fs');
    const source = await fs.readFile('components/StatusBadge.tsx', 'utf8');
    expect(source).not.toContain('export function cycleTone');
  });
});
