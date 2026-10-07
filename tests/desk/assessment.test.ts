/**
 * Deterministic change detection between checkpoints (requirements 34–40).
 *
 * Every fact here is derived by comparison, not written by a model. That is
 * what makes a checkpoint every thirty minutes affordable, and what stops the
 * desk generating a plausible narrative about a stock that did nothing.
 */

import { describe, expect, it } from 'vitest';

import {
  commentary,
  cycleFingerprint,
  detectChanges,
  encodeLevels,
  marketFingerprint,
  supportCandidatesBelow,
} from '@/lib/desk/assessment';
import type { AssessmentTickerRecord } from '@/lib/market/store/assessmentRepo';

function record(overrides: Partial<AssessmentTickerRecord> = {}): AssessmentTickerRecord {
  return {
    ticker: 'IVF',
    assessmentRank: 7,
    liveSessionRank: 7,
    price: 4,
    percentChange: 20,
    rvol: 12,
    rvolRank: 7,
    ahPercentChange: null,
    ahVolume: null,
    ahParticipation: null,
    ahRank: null,
    volume: 1_000_000,
    spreadPct: 0.5,
    sessionHigh: 4.2,
    sessionLow: 3.1,
    referenceClose: 3.33,
    referenceBasis: 'CURRENT_SESSION',
    priceAt: '2026-08-17T21:00:00.000Z',
    cycle: 'GREEN_FRESH_FRONTSIDE',
    catalyst: 'LEGITIMATE_POSITIVE',
    structure: 'CLEAN',
    intelligenceStatus: 'AUTO',
    intelligenceSource: 'AUTO',
    analysisVersionId: 11,
    evidenceFingerprint: 'evidence-a',
    cycleFingerprint: 'cycle-a',
    levelSummary: encodeLevels({ support: 3.5, resistance: 5, label: '3.50 / 5.00' }),
    haltState: 'TRADING',
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
    ...overrides,
  };
}

const options = { discoveryRank: 12, boardLabel: 'discovery' };

describe('rank changes', () => {
  it('detects entry into the Top N', () => {
    const change = detectChanges({
      current: record({ assessmentRank: 3 }),
      previous: record({ assessmentRank: 20 }),
      ...options,
    });

    expect(change.changedFields).toContain('ENTERED_TOP_N');
    expect(change.summary).toContain('entered Top 12');
  });

  it('detects leaving the Top N', () => {
    const change = detectChanges({
      current: record({ assessmentRank: 40 }),
      previous: record({ assessmentRank: 4 }),
      ...options,
    });

    expect(change.changedFields).toContain('LEFT_TOP_N');
  });

  it('reports a material rank move and ignores a trivial one', () => {
    const material = detectChanges({
      current: record({ assessmentRank: 3 }),
      previous: record({ assessmentRank: 7 }),
      ...options,
    });
    expect(material.changedFields).toContain('RANK_IMPROVED');
    expect(material.summary).toContain('#7 → #3');

    const trivial = detectChanges({
      current: record({ assessmentRank: 6 }),
      previous: record({ assessmentRank: 7 }),
      ...options,
    });
    expect(trivial.changedFields).not.toContain('RANK_IMPROVED');
  });

  it('treats a first appearance as an entry, not as an absence of change', () => {
    const change = detectChanges({
      current: record({ assessmentRank: 5 }),
      previous: null,
      ...options,
    });

    expect(change.changedFields).toContain('ENTERED_TOP_N');
  });

  it('does not request a cycle re-look for a name with no previous checkpoint', () => {
    /*
     * On the day's first assessment that is EVERY name on the board. The
     * research engine already reconciles the live Top N continuously, so
     * asking here would enqueue the whole board once a day for nothing.
     */
    const change = detectChanges({
      current: record({ assessmentRank: 1 }),
      previous: null,
      ...options,
    });

    expect(change.cycleReassessmentNeeded).toBe(false);
  });
});

describe('price and level changes', () => {
  it('detects a new session high', () => {
    const change = detectChanges({
      current: record({ sessionHigh: 5.1, price: 5 }),
      previous: record({ sessionHigh: 4.2 }),
      ...options,
    });

    expect(change.changedFields).toContain('NEW_HOD');
  });

  it('detects a major move between checkpoints', () => {
    const change = detectChanges({
      current: record({ price: 5.6 }),
      previous: record({ price: 4 }),
      ...options,
    });

    expect(change.changedFields).toContain('PRICE_EXPANSION');
    expect(change.summary).toContain('+40.0% since prior assessment');
  });

  it('detects support being lost, using the level recorded at the last checkpoint', () => {
    const change = detectChanges({
      current: record({ price: 3.2 }),
      previous: record({
        price: 4,
        levelSummary: encodeLevels({ support: 3.5, resistance: 5, label: '' }),
      }),
      ...options,
    });

    expect(change.changedFields).toContain('SUPPORT_LOST');
    expect(change.summary).toContain('lost $3.50 support');
  });

  it('does not re-report a support that was already lost', () => {
    const change = detectChanges({
      current: record({ price: 3.1 }),
      previous: record({
        price: 3.2,
        levelSummary: encodeLevels({ support: 3.5, resistance: 5, label: '' }),
      }),
      ...options,
    });

    expect(change.changedFields).not.toContain('SUPPORT_LOST');
  });

  it('detects a halt and a resume', () => {
    const halted = detectChanges({
      current: record({ haltState: 'HALTED' }),
      previous: record({ haltState: 'TRADING' }),
      ...options,
    });
    expect(halted.changedFields).toContain('HALT_STATE');

    const resumed = detectChanges({
      current: record({ haltState: 'TRADING' }),
      previous: record({ haltState: 'HALTED' }),
      ...options,
    });
    expect(resumed.changedFields).toContain('HALT_STATE');
  });
});

describe('research changes', () => {
  it('detects a catalyst change', () => {
    const change = detectChanges({
      current: record({ catalyst: 'WEAK_NEGATIVE_DILUTIVE' }),
      previous: record({ catalyst: 'LEGITIMATE_POSITIVE' }),
      ...options,
    });

    expect(change.changedFields).toContain('CATALYST_CHANGED');
  });

  it('detects a structure change, including a Dirty Float determination', () => {
    const change = detectChanges({
      current: record({ structure: 'DIRTY_FLOAT' }),
      previous: record({ structure: 'CLEAN' }),
      ...options,
    });

    expect(change.changedFields).toContain('STRUCTURE_CHANGED');
    expect(change.summary).toContain('structure CLEAN → DIRTY_FLOAT');
  });

  it('detects new source evidence without reading a single document', () => {
    const change = detectChanges({
      current: record({ evidenceFingerprint: 'evidence-b' }),
      previous: record({ evidenceFingerprint: 'evidence-a' }),
      ...options,
    });

    expect(change.changedFields).toContain('NEW_EVIDENCE');
  });

  it('detects a research conflict appearing and being resolved', () => {
    const appeared = detectChanges({
      current: record({ intelligenceStatus: 'CONFLICT' }),
      previous: record({ intelligenceStatus: 'AUTO' }),
      ...options,
    });
    expect(appeared.summary).toContain('research conflict appeared');

    const resolved = detectChanges({
      current: record({ intelligenceStatus: 'AUTO' }),
      previous: record({ intelligenceStatus: 'CONFLICT' }),
      ...options,
    });
    expect(resolved.summary).toContain('research conflict resolved');
  });
});

describe('cost discipline (requirement 40)', () => {
  it('asks for no reassessment when nothing material changed', () => {
    const unchanged = record();
    const change = detectChanges({ current: unchanged, previous: record(), ...options });

    expect(change.changedFields).toHaveLength(0);
    expect(change.summary).toBe('');
    expect(change.cycleReassessmentNeeded).toBe(false);
  });

  it('asks for no reassessment on a material event whose cycle context is unchanged', () => {
    // A halt happened, but the objective picture a cycle call rests on is the
    // same. Both gates must open before anything is enqueued.
    const change = detectChanges({
      current: record({ haltState: 'HALTED', cycleFingerprint: 'cycle-a' }),
      previous: record({ haltState: 'TRADING', cycleFingerprint: 'cycle-a' }),
      ...options,
    });

    expect(change.changedFields).toContain('HALT_STATE');
    expect(change.cycleReassessmentNeeded).toBe(false);
  });

  it('asks for a reassessment when both the event and the context moved', () => {
    const change = detectChanges({
      current: record({ price: 6, sessionHigh: 6.1, cycleFingerprint: 'cycle-b' }),
      previous: record({ price: 4, sessionHigh: 4.2, cycleFingerprint: 'cycle-a' }),
      ...options,
    });

    expect(change.cycleReassessmentNeeded).toBe(true);
  });

  it('does not move the cycle fingerprint on ordinary tape noise', () => {
    const base = {
      sessionHigh: 4.2,
      sessionLow: 3.1,
      haltState: 'TRADING',
      rank: 7,
      participation: 12,
      supportLost: false,
    };

    expect(cycleFingerprint({ ...base, price: 4.11 })).toBe(
      cycleFingerprint({ ...base, price: 4.13 }),
    );
    // A 25% collapse is not noise.
    expect(cycleFingerprint({ ...base, price: 4.11 })).not.toBe(
      cycleFingerprint({ ...base, price: 3.05 }),
    );
  });
});

describe('commentary', () => {
  it('includes only the names that actually changed', () => {
    const lines = commentary([
      record({ ticker: 'IVF', changeSummary: 'IVF: rank #7 → #3; new HOD.' }),
      record({ ticker: 'QUIET', changeSummary: '' }),
      record({ ticker: 'XYZ', changeSummary: 'XYZ: new 424B5.' }),
    ]);

    expect(lines).toEqual(['IVF: rank #7 → #3; new HOD.', 'XYZ: new 424B5.']);
  });

  it('uses no buy or sell language', () => {
    const change = detectChanges({
      current: record({ price: 6, assessmentRank: 2 }),
      previous: record({ price: 4, assessmentRank: 9 }),
      ...options,
    });

    expect(change.summary.toLowerCase()).not.toMatch(/\b(buy|sell|long|short|target|entry)\b/);
  });
});

describe('fingerprints', () => {
  it('are stable for identical state and differ when the market moved', () => {
    expect(marketFingerprint([record()])).toBe(marketFingerprint([record()]));
    expect(marketFingerprint([record()])).not.toBe(marketFingerprint([record({ price: 9 })]));
  });

  it('do not depend on the order records were captured in', () => {
    const a = record({ ticker: 'AAA' });
    const b = record({ ticker: 'BBB' });
    expect(marketFingerprint([a, b])).toBe(marketFingerprint([b, a]));
  });
});

describe('support candidates below price: the official close, not the bell capture', () => {
  // VIVK-shaped: the bell captured 1.95, the official daily-bar close was 1.85.
  const base = { price: 2.1, sessionLow: 1.6, referenceRthClose: 1.85, rthFinalClose: 1.95 };

  it('after the bell, uses the official close and ignores the bell capture', () => {
    const levels = supportCandidatesBelow({ ...base, referenceRthCloseBasis: 'CURRENT_SESSION' });
    expect(levels).toContain(1.85);
    expect(levels).not.toContain(1.95);
    expect(Math.max(...levels)).toBe(1.85);
  });

  it('with no official close captured (prior-session basis), the bell capture still counts', () => {
    const levels = supportCandidatesBelow({ ...base, referenceRthCloseBasis: 'PRIOR_SESSION' });
    expect(levels).toContain(1.95);
  });

  it('drops nulls and anything at or above price', () => {
    const levels = supportCandidatesBelow({
      price: 1.85,
      sessionLow: null,
      referenceRthClose: 1.85,
      rthFinalClose: null,
      referenceRthCloseBasis: 'CURRENT_SESSION',
    });
    expect(levels).toEqual([]);
  });

  it('returns nothing without a price', () => {
    expect(supportCandidatesBelow({ ...base, price: null, referenceRthCloseBasis: 'CURRENT_SESSION' })).toEqual([]);
  });
});
