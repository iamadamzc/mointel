import { describe, expect, it } from 'vitest';

import { PRIORITY_RULE, priorityBasis, priorityGrade, type PriorityInput } from '@/lib/research/priorityGrade';

/**
 * Rule set rubric-2026-10-05, approved by him as drafted. Every threshold below is a product choice he approved;
 * the boundary tests pin the line, they do not argue for it.
 */

/** A row with five readable, STRONG criteria: structure GREEN, catalyst STRONG, volume 50x, spread 0.5 percent on $9M. */
const STRONG_ROW: PriorityInput = {
  hasDossier: true,
  cycle: 'GREEN_FRESH_FRONTSIDE',
  catalyst: 'STRONG',
  structure: 'CLEAN',
  rvol: 50,
  spreadPct: 0.5,
  volume: 3_000_000,
  price: 3,
  floatBound: 4_000_000,
};
const row = (overrides: Partial<PriorityInput> = {}): PriorityInput => ({ ...STRONG_ROW, ...overrides });

describe('the five readings', () => {
  it('reads the cycle', () => {
    expect(priorityBasis(row({ cycle: 'GREEN_FRESH_FRONTSIDE' })).structure).toBe('STRONG');
    expect(priorityBasis(row({ cycle: 'YELLOW_FRONTSIDE_WARNING' })).structure).toBe('LIMITED');
    expect(priorityBasis(row({ cycle: 'RED_BACKSIDE' })).structure).toBe('RISK');
    expect(priorityBasis(row({ cycle: 'UNKNOWN' })).structure).toBe('UNKNOWN');
    expect(priorityBasis(row({ cycle: null })).structure).toBe('NOT_YET');
  });

  it('reads the catalyst KIND only', () => {
    expect(priorityBasis(row({ catalyst: 'STRONG' })).catalyst).toBe('STRONG');
    expect(priorityBasis(row({ catalyst: 'LEGITIMATE_POSITIVE' })).catalyst).toBe('STRONG');
    expect(priorityBasis(row({ catalyst: 'MODERATE_MIXED_SECONDARY' })).catalyst).toBe('LIMITED');
    expect(priorityBasis(row({ catalyst: 'NONE' })).catalyst).toBe('LIMITED');
    expect(priorityBasis(row({ catalyst: 'WEAK_NEGATIVE_DILUTIVE' })).catalyst).toBe('RISK');
    expect(priorityBasis(row({ catalyst: 'UNKNOWN' })).catalyst).toBe('UNKNOWN');
    expect(priorityBasis(row({ catalyst: null })).catalyst).toBe('NOT_YET');
  });

  it('puts the volume lines at 10x (strong at the line) and 2x (risk under it)', () => {
    expect(priorityBasis(row({ rvol: 10 })).volume).toBe('STRONG');
    expect(priorityBasis(row({ rvol: 9.99 })).volume).toBe('LIMITED');
    expect(priorityBasis(row({ rvol: 2 })).volume).toBe('LIMITED');
    expect(priorityBasis(row({ rvol: 1.99 })).volume).toBe('RISK');
    expect(priorityBasis(row({ rvol: null })).volume).toBe('UNKNOWN');
  });

  it('puts the spread lines at 1 percent (strong at it) and 5 percent (risk over it)', () => {
    // $5M day: volume 1.25M at $4.
    const day = { volume: 1_250_000, price: 4 };
    expect(priorityBasis(row({ ...day, spreadPct: 1 })).liquidity).toBe('STRONG');
    expect(priorityBasis(row({ ...day, spreadPct: 1.01 })).liquidity).toBe('LIMITED');
    expect(priorityBasis(row({ ...day, spreadPct: 5 })).liquidity).toBe('LIMITED');
    expect(priorityBasis(row({ ...day, spreadPct: 5.01 })).liquidity).toBe('RISK');
  });

  it('puts the dollar-volume lines at $5M (strong at it) and $0.5M (risk under it)', () => {
    expect(priorityBasis(row({ spreadPct: 0.5, volume: 5_000_000, price: 1 })).liquidity).toBe('STRONG');
    expect(priorityBasis(row({ spreadPct: 0.5, volume: 4_999_999, price: 1 })).liquidity).toBe('LIMITED');
    expect(priorityBasis(row({ spreadPct: 0.5, volume: 500_000, price: 1 })).liquidity).toBe('LIMITED');
    expect(priorityBasis(row({ spreadPct: 0.5, volume: 499_999, price: 1 })).liquidity).toBe('RISK');
  });

  it('reads liquidity UNKNOWN when any input is missing, never a default', () => {
    expect(priorityBasis(row({ spreadPct: null })).liquidity).toBe('UNKNOWN');
    expect(priorityBasis(row({ volume: null })).liquidity).toBe('UNKNOWN');
    expect(priorityBasis(row({ price: null })).liquidity).toBe('UNKNOWN');
  });

  it('reads supply from the structure label, with CLEAN strong only on a float bound at or under 10M', () => {
    expect(priorityBasis(row({ structure: 'DIRTY_FLOAT' })).supply).toBe('RISK');
    expect(priorityBasis(row({ structure: 'CAUTION' })).supply).toBe('LIMITED');
    expect(priorityBasis(row({ structure: 'UNKNOWN' })).supply).toBe('UNKNOWN');
    expect(priorityBasis(row({ structure: null })).supply).toBe('NOT_YET');
    expect(priorityBasis(row({ structure: 'CLEAN', floatBound: 10_000_000 })).supply).toBe('STRONG');
    expect(priorityBasis(row({ structure: 'CLEAN', floatBound: 10_000_001 })).supply).toBe('LIMITED');
    expect(priorityBasis(row({ structure: 'CLEAN', floatBound: null })).supply).toBe('LIMITED');
    expect(priorityBasis(row({ structure: 'CLEAN', floatBound: undefined })).supply).toBe('LIMITED');
  });
});

describe('the grade, rules in order', () => {
  it('rule 0: no dossier is NOT_YET, even when market data reads, and the basis still shows what was readable', () => {
    const result = priorityGrade(row({ hasDossier: false, cycle: null, catalyst: null, structure: null }));
    expect(result.grade).toBe('NOT_YET');
    expect(result.basis).toEqual({ structure: 'NOT_YET', catalyst: 'NOT_YET', volume: 'STRONG', liquidity: 'STRONG', supply: 'NOT_YET' });
    expect(result.rule).toBe(PRIORITY_RULE);
  });

  it('rule 1: fewer than three readable criteria is UNKNOWN, three is gradable', () => {
    // dossier present, cycle and structure unknown: readable = catalyst, volume, liquidity = 3.
    expect(priorityGrade(row({ cycle: 'UNKNOWN', structure: 'UNKNOWN' })).grade).toBe('B');
    // two readable: catalyst unknown too.
    expect(priorityGrade(row({ cycle: 'UNKNOWN', structure: 'UNKNOWN', catalyst: 'UNKNOWN' })).grade).toBe('UNKNOWN');
  });

  it('rule 2: a liquidity risk or a supply risk is AVOID, and it beats a backside', () => {
    expect(priorityGrade(row({ spreadPct: 8 })).grade).toBe('AVOID');
    expect(priorityGrade(row({ structure: 'DIRTY_FLOAT' })).grade).toBe('AVOID');
    expect(priorityGrade(row({ spreadPct: 8, cycle: 'RED_BACKSIDE' })).grade).toBe('AVOID');
  });

  it('rule 3: a backside with no liquidity or supply risk is C', () => {
    expect(priorityGrade(row({ cycle: 'RED_BACKSIDE' })).grade).toBe('C');
  });

  it('rule 4: A needs all five readable and structure, catalyst, volume and liquidity STRONG', () => {
    expect(priorityGrade(row()).grade).toBe('A');
    expect(priorityGrade(row({ cycle: 'YELLOW_FRONTSIDE_WARNING' })).grade).toBe('B');
    expect(priorityGrade(row({ catalyst: 'MODERATE_MIXED_SECONDARY' })).grade).toBe('B');
    expect(priorityGrade(row({ rvol: 5 })).grade).toBe('B');
    expect(priorityGrade(row({ volume: 1_000_000 })).grade).toBe('B'); // $3M day: liquidity LIMITED
  });

  it('rule 4 needs all FIVE readable: four strong plus an unreadable supply is B', () => {
    expect(priorityGrade(row({ structure: 'UNKNOWN' })).grade).toBe('B');
  });

  it('rule 5: a catalyst risk or a volume risk alone is B (meaningful limitations), not AVOID', () => {
    expect(priorityGrade(row({ catalyst: 'WEAK_NEGATIVE_DILUTIVE' })).grade).toBe('B');
    expect(priorityGrade(row({ rvol: 1 })).grade).toBe('B');
  });

  it('stores the rule version with every result', () => {
    expect(priorityGrade(row()).rule).toBe('rubric-2026-10-05');
  });
});
