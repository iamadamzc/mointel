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

import type { ResearchDossier } from '@/lib/research/types';
import type { AutoIntelligence } from '@/lib/research/view';

export type IntelligenceStatus =
  | 'NOT_ANALYZED'
  | 'ANALYSIS_PENDING'
  | 'PARTLY_ANALYZED'
  | 'ANALYZED'
  | 'FAILED';

export type StatusTone = 'pos' | 'warn' | 'neg' | 'accent' | 'neutral' | 'dim';

export interface IntelligenceState {
  status: IntelligenceStatus;
  label: string;
  tone: StatusTone;
  /** Hover text saying what is and is not established. */
  detail: string;
  /** An accepted automatic dossier exists. */
  hasAuto: boolean;
  /** True when the automatic dossier reached all three core conclusions. */
  autoComplete: boolean;
  /** Core fields the automatic layer could not establish. */
  missingAutoFields: string[];
  /** Deterministic collection recorded gaps in its own coverage. */
  coverageIncomplete: boolean;
}

/*
 * THE DESK'S OWN STATES ONLY (Sheet switch-off step 3a, Integration 36th; words Marketing 1950a73f /
 * 644a67e0, Commercial read 60). The Sheet's states (SHEET, SHEET + AUTO, CONFLICT) and their sentences are
 * gone, and "AUTO" was named against "SHEET", so the analysed states say what they are: ANALYZED and PARTLY
 * ANALYZED. The status VALUES changed with the words, so the old words leave every surface that prints the
 * state (the drawer badge, the API and MCP payloads, the review diagnostics), per read 60 condition (a).
 */
export const INTELLIGENCE_LABEL: Record<IntelligenceStatus, string> = {
  NOT_ANALYZED: 'NOT YET ANALYZED',
  ANALYSIS_PENDING: 'ANALYSIS PENDING',
  PARTLY_ANALYZED: 'PARTLY ANALYZED',
  ANALYZED: 'ANALYZED',
  FAILED: 'ANALYSIS FAILED',
};

const TONE: Record<IntelligenceStatus, StatusTone> = {
  NOT_ANALYZED: 'dim',
  ANALYSIS_PENDING: 'dim',
  PARTLY_ANALYZED: 'neutral',
  ANALYZED: 'neutral',
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
  intelligence: AutoIntelligence | null;
}

export function resolveIntelligenceState(input: IntelligenceInput): IntelligenceState {
  const { intelligence } = input;

  const dossier = intelligence?.analysis?.dossier ?? null;
  const hasAuto = dossier !== null;
  const coverageIncomplete = intelligence?.coverageIncomplete === true;
  const missingAutoFields = dossier ? missingCoreFields(dossier) : [];
  const autoComplete = hasAuto && missingAutoFields.length === 0 && !coverageIncomplete;

  const base = {
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

  if (hasAuto) {
    if (autoComplete) {
      return build('ANALYZED', 'Accepted desk dossier with all core conclusions established');
    }
    // Some accepted intelligence exists. Saying "not yet analyzed" here would
    // discard work that is already on screen a few lines below.
    return build(
      'PARTLY_ANALYZED',
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
