/**
 * UI projection of automatic research.
 *
 * The dashboard depends on this shape, never on the dossier or the evidence
 * store directly — the same layering rule the market side already follows. It
 * carries conclusions, provenance and links; it never carries a prompt, a model
 * key, or reasoning text.
 */

import type {
  CatalystGrade,
  CycleClassification,
  ResearchAnalysisVersion,
  ResearchJob,
  ResearchSource,
  StructureClassification,
} from './types';

/**
 * What a trader sees while research is in flight.
 *
 * Deliberately coarse: internal states like SOURCES_READY are implementation
 * detail, and showing them invites reading progress as meaning.
 */
export type ResearchDisplayStatus =
  | 'NOT_ANALYZED'
  | 'ANALYSIS_PENDING'
  | 'COLLECTING_SOURCES'
  | 'ANALYZING'
  | 'INTELLIGENCE_AVAILABLE'
  | 'PARTIAL_INTELLIGENCE'
  | 'RESEARCH_CONFLICT'
  | 'ANALYSIS_FAILED';

export const RESEARCH_STATUS_LABEL: Record<ResearchDisplayStatus, string> = {
  NOT_ANALYZED: 'NOT YET ANALYZED',
  ANALYSIS_PENDING: 'ANALYSIS PENDING',
  COLLECTING_SOURCES: 'COLLECTING SOURCES',
  ANALYZING: 'ANALYZING',
  INTELLIGENCE_AVAILABLE: 'INTELLIGENCE AVAILABLE',
  PARTIAL_INTELLIGENCE: 'PARTIAL INTELLIGENCE',
  RESEARCH_CONFLICT: 'RESEARCH CONFLICT',
  ANALYSIS_FAILED: 'ANALYSIS FAILED',
};

/** Existing product language for a catalyst grade. */
export const CATALYST_GRADE_LABEL: Record<CatalystGrade, string> = {
  STRONG: '🔥 STRONG',
  LEGITIMATE_POSITIVE: '🟢 LEGITIMATE POSITIVE',
  MODERATE_MIXED_SECONDARY: '🟡 MODERATE / MIXED / SECONDARY',
  WEAK_NEGATIVE_DILUTIVE: '🔴 WEAK / NEGATIVE / DILUTIVE',
  NONE: 'NONE',
  UNKNOWN: 'UNKNOWN',
};

export const CYCLE_LABEL: Record<CycleClassification, string> = {
  GREEN_FRESH_FRONTSIDE: 'GREEN, FRESH / FRONTSIDE',
  YELLOW_FRONTSIDE_WARNING: 'YELLOW, FRONTSIDE WARNING',
  RED_BACKSIDE: 'RED, BACKSIDE',
  UNKNOWN: 'UNKNOWN',
};

export const STRUCTURE_LABEL: Record<StructureClassification, string> = {
  CLEAN: 'CLEAN',
  CAUTION: 'CAUTION',
  DIRTY_FLOAT: 'DIRTY FLOAT',
  UNKNOWN: 'UNKNOWN',
};

export interface EvidenceLink {
  id: number;
  title: string | null;
  url: string;
  authority: string;
  sourceType: string;
  secForm: string | null;
  accession: string | null;
  publishedAt: string | null;
  publishedPrecision: string;
  /**
   * An SEC exhibit's type as the SEC declares it ("EX-99.1"), from the row's stored
   * `metadata.exhibitType`; null for every other source. With `secForm` (the parent's form)
   * the drawer builds "{exhibit} to {form}" from fields, so rows stored before the
   * timestamp-free title (`exhibitTitle`) label cleanly too (Design's rule 3).
   */
  exhibitType: string | null;
}

export interface AutoIntelligence {
  ticker: string;
  status: ResearchDisplayStatus;
  statusLabel: string;
  /** Null until an analysis has been accepted. */
  analysis: ResearchAnalysisVersion | null;
  /** Where the displayed conclusions come from. */
  provenance: 'AUTO' | 'SHEET' | 'SHEET_AUTO' | 'CONFLICT' | 'NONE';
  generatedAt: string | null;
  model: string | null;
  schemaVersion: number | null;
  analysisVersionId: number | null;
  coverageIncomplete: boolean;
  evidence: EvidenceLink[];
  /**
   * Every research source id stored for this ticker, cited or not, so a citation token
   * the model left for a source it read but did not cite is recognised and removed
   * (`citations.ts`). Server-side only: `readableIntelligence` consumes it and drops it,
   * so it never reaches the payload.
   */
  tickerSourceIds?: number[];
}

/**
 * Maps job lifecycle plus analysis presence onto the trader-facing status.
 *
 * An accepted dossier wins over job state: if intelligence exists it should be
 * shown, even while a later refresh is collecting.
 */
export function resolveDisplayStatus(options: {
  job: ResearchJob | null;
  hasAnalysis: boolean;
  coverageIncomplete: boolean;
  conflict: boolean;
}): ResearchDisplayStatus {
  if (options.hasAnalysis) {
    if (options.conflict) return 'RESEARCH_CONFLICT';
    return options.coverageIncomplete ? 'PARTIAL_INTELLIGENCE' : 'INTELLIGENCE_AVAILABLE';
  }

  switch (options.job?.status) {
    case 'QUEUED':
      return 'ANALYSIS_PENDING';
    case 'COLLECTING':
    case 'SOURCES_READY':
      return 'COLLECTING_SOURCES';
    case 'ANALYZING':
      return 'ANALYZING';
    case 'FAILED':
      return 'ANALYSIS_FAILED';
    case 'PARTIAL':
      return 'PARTIAL_INTELLIGENCE';
    default:
      // No job and no analysis: nothing has been attempted yet.
      return 'NOT_ANALYZED';
  }
}

export function toEvidenceLink(source: ResearchSource): EvidenceLink {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    authority: source.authority,
    sourceType: source.sourceType,
    secForm: source.secForm,
    accession: source.accession,
    publishedAt: source.publishedAt,
    publishedPrecision: source.publishedPrecision,
    exhibitType: storedExhibitType(source),
  };
}

function storedExhibitType(source: ResearchSource): string | null {
  if (source.sourceType !== 'SEC_EXHIBIT') return null;
  const type = source.metadata?.exhibitType;
  return typeof type === 'string' && type.trim() !== '' ? type : null;
}

/** True when the dossier says nothing usable yet. */
export function hasIntelligence(intelligence: AutoIntelligence | null | undefined): boolean {
  return Boolean(intelligence?.analysis);
}
