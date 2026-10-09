/**
 * The Priority grade: the desk's reading of five criteria at a checkpoint, computed once and stored with the row.
 * Rule set `rubric-2026-10-05`, approved by him as drafted (docs/research/priority-rubric/rubric-draft-2026-10-05.md;
 * field contract docs/research/sheet-reproduction/field-contract-final-2026-10-05.md). Pure: no I/O, no clock.
 *
 * Every threshold is a product choice he approved; none is a finding. A missing input is UNKNOWN or NOT_YET,
 * never a default. The grade is a reading, not a prediction, and has not been tested against outcomes.
 */

export const PRIORITY_RULE = 'rubric-2026-10-05';

export type Reading = 'STRONG' | 'LIMITED' | 'RISK' | 'UNKNOWN' | 'NOT_YET';
export type PriorityGrade = 'A' | 'B' | 'C' | 'AVOID' | 'UNKNOWN' | 'NOT_YET';

export interface PriorityBasis {
  structure: Reading;
  catalyst: Reading;
  volume: Reading;
  liquidity: Reading;
  supply: Reading;
}

export interface PriorityResult {
  grade: PriorityGrade;
  basis: PriorityBasis;
  rule: typeof PRIORITY_RULE;
}

/** The thresholds, as approved. */
export const PRIORITY_THRESHOLDS = {
  rvolStrong: 10,
  rvolRisk: 2,
  spreadStrongPct: 1,
  spreadRiskPct: 5,
  dollarVolumeStrong: 5_000_000,
  dollarVolumeRisk: 500_000,
  /** A CLEAN structure reads STRONG supply only with a PRODUCED float bound at or under this. */
  lowFloat: 10_000_000,
} as const;

/** What the checkpoint row and its dossier hold. null = the stored value is null. */
export interface PriorityInput {
  /** False when the checkpoint row has no dossier (analysis_version_id null). */
  hasDossier: boolean;
  cycle: string | null;
  catalyst: string | null;
  structure: string | null;
  rvol: number | null;
  spreadPct: number | null;
  volume: number | null;
  price: number | null;
  /** The insider-only float bound when the cell is PRODUCED, else null. Does not exist in production yet. */
  floatBound?: number | null;
}

const T = PRIORITY_THRESHOLDS;

function structureReading(input: PriorityInput): Reading {
  if (input.cycle === null) return 'NOT_YET';
  if (input.cycle === 'RED_BACKSIDE') return 'RISK';
  if (input.cycle === 'GREEN_FRESH_FRONTSIDE') return 'STRONG';
  if (input.cycle === 'YELLOW_FRONTSIDE_WARNING') return 'LIMITED';
  return 'UNKNOWN';
}

function catalystReading(input: PriorityInput): Reading {
  if (input.catalyst === null) return 'NOT_YET';
  if (input.catalyst === 'STRONG' || input.catalyst === 'LEGITIMATE_POSITIVE') return 'STRONG';
  if (input.catalyst === 'MODERATE_MIXED_SECONDARY' || input.catalyst === 'NONE') return 'LIMITED';
  if (input.catalyst === 'WEAK_NEGATIVE_DILUTIVE') return 'RISK';
  return 'UNKNOWN';
}

function volumeReading(input: PriorityInput): Reading {
  if (input.rvol === null) return 'UNKNOWN';
  if (input.rvol >= T.rvolStrong) return 'STRONG';
  if (input.rvol < T.rvolRisk) return 'RISK';
  return 'LIMITED';
}

function liquidityReading(input: PriorityInput): Reading {
  if (input.spreadPct === null || input.volume === null || input.price === null) return 'UNKNOWN';
  const dollars = input.volume * input.price;
  if (input.spreadPct > T.spreadRiskPct || dollars < T.dollarVolumeRisk) return 'RISK';
  return input.spreadPct <= T.spreadStrongPct && dollars >= T.dollarVolumeStrong ? 'STRONG' : 'LIMITED';
}

function supplyReading(input: PriorityInput): Reading {
  if (input.structure === null) return 'NOT_YET';
  if (input.structure === 'DIRTY_FLOAT') return 'RISK';
  if (input.structure === 'CLEAN') {
    const bound = input.floatBound ?? null;
    return bound !== null && bound <= T.lowFloat ? 'STRONG' : 'LIMITED';
  }
  if (input.structure === 'CAUTION') return 'LIMITED';
  return 'UNKNOWN';
}

/** The five readings. Computed for every row, so the tooltip has them even when the grade is NOT_YET. */
export function priorityBasis(input: PriorityInput): PriorityBasis {
  return {
    structure: structureReading(input),
    catalyst: catalystReading(input),
    volume: volumeReading(input),
    liquidity: liquidityReading(input),
    supply: supplyReading(input),
  };
}

export function priorityGrade(input: PriorityInput): PriorityResult {
  const basis = priorityBasis(input);
  const result = (grade: PriorityGrade): PriorityResult => ({ grade, basis, rule: PRIORITY_RULE });
  // Rule 0: no research at this checkpoint. A statement about the research, not the name.
  if (!input.hasDossier) return result('NOT_YET');
  const readings = Object.values(basis);
  const known = readings.filter((reading) => reading !== 'UNKNOWN' && reading !== 'NOT_YET').length;
  // Rule 1: a grade built on fewer than three readable criteria would be a guess.
  if (known < 3) return result('UNKNOWN');
  // Rule 2: the two risks the recap prompt names for AVOID.
  if (basis.liquidity === 'RISK' || basis.supply === 'RISK') return result('AVOID');
  // Rule 3: a backside.
  if (basis.structure === 'RISK') return result('C');
  // Rule 4: all five readable and the four named STRONG.
  if (known === 5 && basis.structure === 'STRONG' && basis.catalyst === 'STRONG' && basis.volume === 'STRONG' && basis.liquidity === 'STRONG') {
    return result('A');
  }
  // Rule 5.
  return result('B');
}
