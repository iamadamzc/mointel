import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CYCLE_WORDS, cycleFacts } from '@/lib/dashboard/cycleFacts';
import type { CycleArc, CycleHistory } from '@/lib/market/cycle';

const EM_DASH = String.fromCharCode(0x2014);

const arc = (over: Partial<CycleArc> = {}): CycleArc => ({
  phase: 'PULLBACK',
  startDate: '2026-08-15',
  baseClose: 3,
  cycleHigh: 4.6,
  cycleHighDate: '2026-08-15',
  sessionsSinceHigh: 1,
  sessionsInCycle: 2,
  givebackPct: 0.1087,
  retracementPct: 0.3125,
  recentRvol: [10, 20, 1],
  advancePct: 0.5333,
  latestDate: '2026-08-16',
  latestClose: 4.1,
  ...over,
});
const history = (current: CycleHistory['current'], prior: CycleHistory['priorCycles'] = []): CycleHistory =>
  ({ current, priorCycles: prior, formerRunnerStatus: 'NONE', todayStart: 'UNVERIFIABLE', largestPriorAdvancePct: null, latestDate: '2026-08-16' }) as unknown as CycleHistory;

describe('the cycle facts, in the right units', () => {
  it('prints the cycle high with its date, and the flush as a share of the HIGH, scaled from a fraction', () => {
    const facts = cycleFacts(history(arc()));
    expect(facts.state).toBe('PRODUCED');
    expect(facts.cycleHigh?.text).toBe('$4.60, Aug 15, 2026');
    expect(facts.flush?.text).toBe("10.9% below the cycle high, at Aug 16, 2026's close");
  });

  it('dates every figure to the last bar it was computed from, and never says "today"', () => {
    const facts = cycleFacts(history(arc()));
    expect(facts.cycleHigh?.hover).toBe("Highest price since the current run began, from daily bars through Aug 16, 2026's close.");
    expect(JSON.stringify(facts)).not.toMatch(/today/i);
  });

  it('prints a prior run with the advance scaled to a percent, and singular sessions', () => {
    const prior = [{ startDate: '2026-06-02', highDate: '2026-06-04', cycleHigh: 9, advancePct: 3.2, sessionsAgo: 1 }];
    const facts = cycleFacts(history(arc(), prior));
    expect(facts.runs.lines).toEqual([
      'Jun 2, 2026 to Jun 4, 2026: up 320% from the base close to the high, high was 1 session ago',
    ]);
    expect(facts.runs.empty).toBeNull();
  });

  it('says "the latest session" when the high is the last bar', () => {
    const prior = [{ startDate: '2026-06-02', highDate: '2026-06-04', cycleHigh: 9, advancePct: 0.5, sessionsAgo: 0 }];
    expect(cycleFacts(history(arc(), prior)).runs.lines[0]).toContain('high was the latest session');
  });

  it('states the rule for a run in the hover, from the same constants the resolver uses', () => {
    expect(cycleFacts(history(arc())).runs.hover).toBe(
      'A run starts on a day the stock rose at least 20% on at least 5 times its usual volume.',
    );
  });
});

describe('the list and the largest advance cannot disagree', () => {
  it('lists the current run first when it is over (BACKSIDE or SHADOW), then the completed runs', () => {
    for (const phase of ['BACKSIDE', 'SHADOW'] as const) {
      const facts = cycleFacts(history(arc({ phase, sessionsSinceHigh: 4 }), []));
      expect(facts.runs.lines).toHaveLength(1);
      expect(facts.runs.lines[0].startsWith(CYCLE_WORDS.currentOverPrefix)).toBe(true);
      expect(facts.runs.lines[0]).toContain('up 53% from the base close to the high, high was 4 sessions ago');
      expect(facts.runs.empty).toBeNull();
    }
  });

  it('does not list a live current run among the earlier ones, and says so when the list is empty', () => {
    for (const phase of ['DAY_ONE', 'FRONTSIDE', 'PULLBACK'] as const) {
      const facts = cycleFacts(history(arc({ phase })));
      expect(facts.runs.lines).toEqual([]);
      expect(facts.runs.empty).toBe('No earlier run in the history we hold.');
    }
  });
});

describe('the three states', () => {
  it('NOT_YET: no computed history at all', () => {
    for (const none of [null, undefined]) {
      const facts = cycleFacts(none);
      expect(facts.state).toBe('NOT_YET');
      expect(facts.message).toBe('Cannot tell: not enough daily history.');
      expect(facts.cycleHigh).toBeNull();
    }
  });

  it('UNKNOWN: bars were read and no run has started in them; earlier runs are still listed', () => {
    const prior = [{ startDate: '2026-06-02', highDate: '2026-06-04', cycleHigh: 9, advancePct: 3.2, sessionsAgo: 40 }];
    const facts = cycleFacts(history({ phase: 'NO_CYCLE' }, prior));
    expect(facts.state).toBe('UNKNOWN');
    expect(facts.message).toBe(CYCLE_WORDS.noRun);
    expect(facts.runs.lines).toHaveLength(1);
    expect(cycleFacts(history({ phase: 'NO_CYCLE' })).runs.empty).toBe('No earlier run in the history we hold.');
  });
});

describe('no em dash in any string a reader can see', () => {
  it('holds for every state', () => {
    const states = [
      cycleFacts(null),
      cycleFacts(history(arc({ phase: 'BACKSIDE' }), [{ startDate: '2026-06-02', highDate: '2026-06-04', cycleHigh: 9, advancePct: 3.2, sessionsAgo: 3 }])),
      cycleFacts(history({ phase: 'NO_CYCLE' })),
    ];
    for (const s of states) expect(JSON.stringify(s).includes(EM_DASH)).toBe(false);
  });
});

describe('the drawer', () => {
  const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');

  it('shows the computed facts under their own labels', () => {
    expect(source).toContain('cycleFacts(intel.analysis?.dossier.computedCycle)');
    for (const label of ['Cycle high', 'Flush from high']) expect(source).toContain(`label="${label}"`);
    expect(source).toContain('<FieldLabel>Prior runs</FieldLabel>');
  });

  it('leaves the "Former runner" row exactly as it was: the model block, one row', () => {
    const rows = source.match(/label="Former runner"/g) ?? [];
    expect(rows).toHaveLength(1);
    expect(source).toContain('<Field label="Former runner" value={humanise(cycle.formerRunnerStatus)} />');
  });
});
