/**
 * Escalation to the higher-capability tier.
 *
 * The governing rule: cost responds to complexity, not to excitement. A rank-1
 * name with a 300% move and one clean 8-K is a simple interpretation problem
 * and gets the default tier. A quiet name with four overlapping financing
 * instruments is a hard one and may not.
 *
 * So none of the conditions below reference rank, RVOL or price change.
 */

import type { ResearchEvidenceBundle } from './bundle';
import type { Violation } from './guardrails';
import type { ResearchDossier } from '../types';

export type EscalationReason =
  | 'VALIDATION_FAILED_AFTER_REPAIR'
  | 'EVIDENCE_CONFLICT'
  | 'ELIGIBILITY_CONTRADICTION'
  | 'SUPPLY_RECONCILIATION_INCONSISTENT';

export interface EscalationDecision {
  escalate: boolean;
  reason: EscalationReason | null;
  detail: string;
}

const NO_ESCALATION: EscalationDecision = {
  escalate: false,
  reason: null,
  detail: 'no escalation criteria met',
};

/** Language indicating the evidence itself disagrees, not merely that it is thin. */
const CONFLICT_LANGUAGE = /\b(conflict|contradict|inconsisten|disagree|irreconcil|discrepan)/i;

function mentionsConflict(values: Array<string | null | undefined>): boolean {
  return values.some((value) => (value ? CONFLICT_LANGUAGE.test(value) : false));
}

export interface EscalationInput {
  dossier: ResearchDossier | null;
  bundle: ResearchEvidenceBundle;
  violationsAfterRepair: readonly Violation[];
  repairAttempted: boolean;
}

export function shouldEscalate(input: EscalationInput): EscalationDecision {
  const { dossier, bundle, violationsAfterRepair, repairAttempted } = input;

  // 1. A repair was attempted and validation still rejects the output.
  if (repairAttempted && violationsAfterRepair.some((item) => item.severity === 'REJECT')) {
    return {
      escalate: true,
      reason: 'VALIDATION_FAILED_AFTER_REPAIR',
      detail: `${violationsAfterRepair.filter((v) => v.severity === 'REJECT').length} rejection(s) survived one repair`,
    };
  }

  if (!dossier) return NO_ESCALATION;

  /*
   * A complicated capital structure is not an ambiguous one.
   *
   * Warrants plus a shelf plus an equity line is an ordinary small-cap balance
   * sheet, and the default tier reads it correctly. Escalating on instrument
   * COUNT spent the expensive model on arithmetic that was never in doubt. What
   * warrants a second opinion is evidence that disagrees with itself.
   */

  // 2. The same source set supports contradictory eligibility for one
  //    instrument type — the evidence cannot all be right.
  const byType = new Map<string, Set<string>>();
  for (const block of dossier.structure.supplyLedger) {
    const statuses = byType.get(block.type) ?? new Set<string>();
    statuses.add(block.status);
    byType.set(block.type, statuses);
  }
  for (const [type, statuses] of byType) {
    if (statuses.has('KNOWN_ACTIVE') && statuses.has('NOT_YET_ACTIVE')) {
      return {
        escalate: true,
        reason: 'ELIGIBILITY_CONTRADICTION',
        detail: `${type} is reported both KNOWN_ACTIVE and NOT_YET_ACTIVE`,
      };
    }
  }

  // 3. The interpreter itself reports the evidence as conflicting, or says the
  //    catalyst evidence conflicts. Confidence being LOW is not enough on its
  //    own: LOW usually means evidence is absent, and a stronger model cannot
  //    invent what was never collected.
  const conflictReported =
    dossier.catalyst.catalystStatus === 'CONFLICTING' ||
    mentionsConflict([
      dossier.structure.summary,
      ...dossier.structure.unknowns,
      ...dossier.structure.structuralWarnings,
      ...dossier.catalyst.unknowns,
    ]);

  if (conflictReported && !bundle.coverage.incomplete) {
    return {
      escalate: true,
      reason: 'EVIDENCE_CONFLICT',
      detail: 'the interpreter reported conflicting evidence under complete coverage',
    };
  }

  // 4. Supply arithmetic contradicts itself: known active supply exceeds the
  //    share count it is supposedly drawn from.
  const knownActive = dossier.structure.supplyLedger
    .filter((block) => block.status === 'KNOWN_ACTIVE' && block.amountShares !== null)
    .reduce((sum, block) => sum + (block.amountShares ?? 0), 0);
  if (
    dossier.structure.sharesOutstanding !== null &&
    knownActive > dossier.structure.sharesOutstanding
  ) {
    return {
      escalate: true,
      reason: 'SUPPLY_RECONCILIATION_INCONSISTENT',
      detail: `known active supply ${knownActive} exceeds shares outstanding ${dossier.structure.sharesOutstanding}`,
    };
  }

  // The fifth criterion, a structural dispute with the Sheet's prior analysis,
  // went with the Sheet (A5): there is no prior analysis left to dispute.
  return NO_ESCALATION;
}
