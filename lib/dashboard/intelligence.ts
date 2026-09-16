/**
 * One intelligence status per ticker, for every surface that shows one.
 *
 * The drawer header used to decide for itself: no sheet row meant "NOT YET
 * ANALYZED", regardless of what the automatic layer had already produced. So
 * APUS carried an accepted AUTO catalyst grade and an accepted AUTO structure
 * classification in its Desk Read while its own header called it unanalyzed.
 *
 * The states below are trader-facing. They are derived from the existing job
 * lifecycle and the existing Sheet/AUTO comparison — no new research semantics
 * are introduced here, and nothing infers a status independently.
 */

import type { MomentumTicker } from '@/lib/data/types';
import type { SheetAutoComparison } from '@/lib/research/merge/sheetAuto';
import type { ResearchDossier } from '@/lib/research/types';
import type { AutoIntelligence } from '@/lib/research/view';

export type IntelligenceStatus =
  | 'NOT_ANALYZED'
  | 'ANALYSIS_PENDING'
  | 'PARTIAL_AUTO'
  | 'AUTO'
  | 'SHEET'
  | 'SHEET_AUTO'
  | 'CONFLICT'
  | 'FAILED';

export type StatusTone = 'pos' | 'warn' | 'neg' | 'accent' | 'neutral' | 'dim';

export interface IntelligenceState {
  status: IntelligenceStatus;
  label: string;
  tone: StatusTone;
  /** Hover text saying what is and is not established. */
  detail: string;
  hasSheet: boolean;
  /** An accepted automatic dossier exists. */
  hasAuto: boolean;
  /** True when the automatic dossier reached all three core conclusions. */
  autoComplete: boolean;
  /** Core fields the automatic layer could not establish. */
  missingAutoFields: string[];
  /** Deterministic collection recorded gaps in its own coverage. */
  coverageIncomplete: boolean;
}

/**
 * THE TWO READS ARE NOT INDEPENDENT, AND THE BADGE USED TO IMPLY THEY WERE.
 *
 * `research-interpret.ts:166` passes the Sheet's prior human analysis into the
 * interpreter unless `omitSheetPrior` is set, and `config.ts:182` leaves that
 * OFF by default. The config says it plainly: *"the automatic catalyst grade is
 * not independent of it."*
 *
 * SO THE EVIDENTIAL WEIGHTS RUN THE OPPOSITE WAY TO THE DESIGN'S ASSUMPTION.
 * Agreement may be the model restating a conclusion it was shown; disagreement
 * happened DESPITE being shown it. `SHEET + AUTO` reads as two sources adding
 * up, and that is the case the dependency weakens.
 *
 * `normally` rather than a per-row fact, and that is not a hedge: the setting is
 * WRITTEN TO THE RUN LOG (`research-interpret.ts:143`) and NOT STORED ON THE
 * DOSSIER, so a row cannot say which way it was produced. Saying "may have been"
 * where the record is silent is the honest form.
 *
 * NOT restating the magnitude, which is unmeasured. The mechanism is stated and
 * he weighs it; `RESEARCH_OMIT_SHEET_PRIOR=1` is the control arm that would
 * measure it and it has never been run.
 */
/*
 * ON BOTH ARMS OF `SHEET_AUTO`, INCLUDING THE INCOMPLETE ONE.
 *
 * The incomplete arm makes no agreement claim in its text -- it reports a
 * coverage gap. But the BADGE WORD is `SHEET + AUTO` either way, and the word is
 * what implies two sources adding up. Disclosing only on the arm whose sentence
 * happens to mention agreement would leave the implication standing wherever the
 * reader took it from the badge rather than the tooltip, which on a board he
 * scans is most of the time.
 */
const DEPENDENCE_NOTE =
  'The desk read is normally produced with the outside one in evidence.';

export const INTELLIGENCE_LABEL: Record<IntelligenceStatus, string> = {
  NOT_ANALYZED: 'NOT YET ANALYZED',
  ANALYSIS_PENDING: 'ANALYSIS PENDING',
  PARTIAL_AUTO: 'PARTIAL AUTO',
  AUTO: 'AUTO',
  SHEET: 'SHEET',
  SHEET_AUTO: 'SHEET + AUTO',
  CONFLICT: 'CONFLICT',
  FAILED: 'ANALYSIS FAILED',
};

const TONE: Record<IntelligenceStatus, StatusTone> = {
  NOT_ANALYZED: 'dim',
  ANALYSIS_PENDING: 'dim',
  PARTIAL_AUTO: 'neutral',
  AUTO: 'neutral',
  SHEET: 'neutral',
  SHEET_AUTO: 'neutral',
  CONFLICT: 'warn',
  FAILED: 'neg',
};

/**
 * The three conclusions a usable dossier is expected to reach.
 *
 * Any of them landing on UNKNOWN makes the dossier partial rather than absent —
 * which is the distinction the drawer header was missing.
 */
export function missingCoreFields(dossier: ResearchDossier): string[] {
  const missing: string[] = [];
  if (dossier.catalyst.catalystGrade === 'UNKNOWN') missing.push('catalyst');
  if (dossier.structure.structureClassification === 'UNKNOWN') missing.push('structure');
  if (dossier.cycle.cycleClassification === 'UNKNOWN') missing.push('cycle');
  return missing;
}

export interface IntelligenceInput {
  sheet: MomentumTicker | null;
  intelligence: AutoIntelligence | null;
  comparison: SheetAutoComparison | null;
}

/**
 * Whether a disagreement is a real difference of judgement.
 *
 * `compareSheetAndAuto` records every field where the two sides landed
 * differently, including the case where the automatic layer simply had less to
 * work with — which it labels AUTO_INCOMPLETE, "its conclusion is the weaker
 * one". Presenting that as CONFLICT would be exactly the fake disagreement this
 * desk already ruled out: it would fire on most partially-covered names and
 * teach a trader to skip the warning that matters.
 *
 * The comparison itself is untouched; this only decides how loudly to show it.
 */
export function isMaterialConflict(comparison: SheetAutoComparison | null): boolean {
  if (!comparison?.conflict) return false;
  return comparison.comparisons.some(
    (item) => item.agreement === 'DISAGREE' && item.reason !== 'AUTO_INCOMPLETE',
  );
}

/** The fields where both sides had evidence and still disagreed. */
export function materialConflictFields(comparison: SheetAutoComparison | null): Set<string> {
  if (!comparison) return new Set();
  return new Set(
    comparison.comparisons
      .filter((item) => item.agreement === 'DISAGREE' && item.reason !== 'AUTO_INCOMPLETE')
      .map((item) => item.field),
  );
}

/** True when the sheet row actually states a conclusion, not just holds a row. */
function sheetHasConclusion(sheet: MomentumTicker | null): boolean {
  if (!sheet) return false;
  return (
    sheet.cycle.state !== 'UNCLASSIFIED' ||
    sheet.structure.state !== 'UNCLASSIFIED' ||
    sheet.catalyst.gradeBucket !== 'UNCLASSIFIED'
  );
}

export function resolveIntelligenceState(input: IntelligenceInput): IntelligenceState {
  const { sheet, intelligence, comparison } = input;

  const dossier = intelligence?.analysis?.dossier ?? null;
  const hasSheet = sheetHasConclusion(sheet);
  const hasAuto = dossier !== null;
  const coverageIncomplete = intelligence?.coverageIncomplete === true;
  const missingAutoFields = dossier ? missingCoreFields(dossier) : [];
  const autoComplete = hasAuto && missingAutoFields.length === 0 && !coverageIncomplete;

  const base = {
    hasSheet,
    hasAuto,
    autoComplete,
    missingAutoFields,
    coverageIncomplete,
  };

  const build = (status: IntelligenceStatus, detail: string): IntelligenceState => ({
    ...base,
    status,
    label: INTELLIGENCE_LABEL[status],
    tone: TONE[status],
    detail,
  });

  if (isMaterialConflict(comparison)) {
    return build(
      'CONFLICT',
      `The outside research and the desk research disagree (${comparison?.conflictReasons.join(', ')}). Both conclusions are kept. ${DEPENDENCE_NOTE} So this is a disagreement reached despite seeing it.`,
    );
  }

  if (hasSheet && hasAuto) {
    return build(
      'SHEET_AUTO',
      autoComplete
        ? `Outside and desk research both present and not in material disagreement. ${DEPENDENCE_NOTE} So this is not two independent sources agreeing.`
        : `Outside research present; desk research did not establish ${missingAutoFields.join(', ') || 'complete coverage'}. ${DEPENDENCE_NOTE}`,
    );
  }

  if (hasSheet) return build('SHEET', 'Outside research only; no accepted desk dossier');

  if (hasAuto) {
    if (autoComplete) {
      return build('AUTO', 'Accepted desk dossier with all core conclusions established');
    }
    // Some accepted intelligence exists. Saying "not yet analyzed" here would
    // discard work that is already on screen a few lines below.
    return build(
      'PARTIAL_AUTO',
      `Accepted desk research, but ${
        missingAutoFields.length > 0
          ? `${missingAutoFields.join(', ')} could not be established`
          : 'source coverage was incomplete'
      }`,
    );
  }

  // Nothing accepted. The job lifecycle decides between pending, failed and
  // never-attempted; those states already exist and are not redefined here.
  switch (intelligence?.status) {
    case 'ANALYSIS_PENDING':
    case 'COLLECTING_SOURCES':
    case 'ANALYZING':
      return build('ANALYSIS_PENDING', 'Research is underway; nothing accepted yet');
    case 'ANALYSIS_FAILED':
      return build('FAILED', 'Analysis failed and no usable intelligence was accepted');
    default:
      return build(
        'NOT_ANALYZED',
        'Discovered by the market feed. No research has been produced for this name.',
      );
  }
}
