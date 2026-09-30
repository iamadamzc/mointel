/**
 * The research a report may use for one name, AS OF ITS CHECKPOINT.
 *
 * A checkpoint row stores `analysis_version_id`, the dossier that was current
 * at capture (`data-map-2026-09-30.md`, "the as-of hook"). A report built
 * later reads THAT version, so its company, catalyst and structure lines say
 * what the checkpoint saw, and the checker can re-read the same row.
 *
 * WHAT THE SHAPE REFUSES, so no writer can be handed it:
 * - THE FLOAT NUMBER. His ruling 2026-09-30T04:11:25Z: verdict only, no
 *   number. `displayedFloat` is not carried; `floatConfidence` is.
 * - AN UNDATED SHARE COUNT. Commercial §9 (21301d7): shares outstanding may
 *   print only with its date, and never as float. No date, no count.
 * - A SOURCE THE CATALYST DID NOT CITE. Only `catalyst.evidenceSourceIds`.
 * - AN EM DASH. His rule, 10:43:39Z; the data map puts none in the fact
 *   sheet. Stored model text and third-party titles carry them, so every
 *   string is passed through the board's own `withoutEmDash`.
 *
 * Pure over what the caller read: the version, and the sources by id.
 */

import { withoutEmDash } from '../../dashboard/prose';
import { countryName } from '../../research/sec/stateCountry';
import type {
  CatalystGrade,
  CatalystStatus,
  CatalystType,
  Confidence,
  ResearchAnalysisVersion,
  ResearchSource,
  StructureClassification,
  SupplyBlockStatus,
  SupplyBlockType,
} from '../../research/types';
import type { TimePrecision } from '../../research/time';

export interface ReportResearch {
  /** The stored version this was read from: the checker re-reads the same one. */
  analysisVersionId: number;
  generatedAt: string;
  company: {
    name: string | null;
    /** Decoded from EDGAR's code; country only. Null when unknown. */
    country: string | null;
    /** The dossier's `businessDescription`; null on dossiers before schema v2. */
    business: string | null;
  };
  catalyst: {
    grade: CatalystGrade;
    type: CatalystType;
    status: CatalystStatus;
    confidence: Confidence;
    summary: string | null;
    eventTimestamp: string | null;
    whyTradersMayCare: string | null;
    plausiblyExplainsMove: boolean | null;
    unknowns: string[];
    sources: Array<{
      id: number;
      title: string | null;
      publishedAt: string | null;
      precision: TimePrecision;
    }>;
  };
  structure: {
    classification: StructureClassification;
    floatConfidence: Confidence;
    /** Null unless BOTH the count and its date are stored. */
    sharesOutstanding: { count: number; asOf: string } | null;
    supply: Array<{
      type: SupplyBlockType;
      status: SupplyBlockStatus;
      effectiveDate: string | null;
      amountShares: number | null;
      /**
       * The filing the block rests on ("F-3", "Form 10-Q filed 2026-08-14"), as
       * the dossier states it. Run 1 (70da3eb): without it the checker struck
       * three true lines naming the form, because it was never shown the form.
       */
      sourceFiling: string | null;
      registrationStatus: string | null;
      /** A dollar shelf or ATM size ("$6,530,000 of ATM capacity"). Run 3 (141ee34) failed on its absence. */
      dollarCapacity: number | null;
      terms: string | null;
      holderRestrictions: string | null;
      eligibilityAssessment: string | null;
      confidence: Confidence;
      /*
       * AUDITED against SupplyBlock, field by field (run 4): every field is
       * carried EXCEPT evidenceSourceIds, which are internal source ids no
       * printed line can cite; the block's catalyst-side sources are carried
       * in catalyst.sources.
       */
    }>;
  };
}

function clean(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  const trimmed = withoutEmDash(text).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function reportResearch(
  version: ResearchAnalysisVersion,
  sourcesById: ReadonlyMap<number, ResearchSource>,
): ReportResearch {
  const { dossier } = version;
  const { catalyst, structure } = dossier;
  const shares =
    structure.sharesOutstanding !== null && structure.sharesOutstandingDate
      ? { count: structure.sharesOutstanding, asOf: structure.sharesOutstandingDate }
      : null;

  return {
    analysisVersionId: version.id,
    generatedAt: version.generatedAt,
    company: {
      name: clean(dossier.companyName),
      country: countryName(dossier.country),
      business: clean(dossier.businessDescription),
    },
    catalyst: {
      grade: catalyst.catalystGrade,
      type: catalyst.catalystType,
      status: catalyst.catalystStatus,
      confidence: catalyst.confidence,
      summary: clean(catalyst.summary),
      eventTimestamp: catalyst.eventTimestamp,
      whyTradersMayCare: clean(catalyst.whyTradersMayCare),
      plausiblyExplainsMove: catalyst.plausiblyExplainsMove,
      unknowns: catalyst.unknowns.map(clean).filter((item): item is string => item !== null),
      sources: [...new Set(catalyst.evidenceSourceIds)]
        .map((id) => sourcesById.get(id))
        .filter((source): source is ResearchSource => source !== undefined)
        .map((source) => ({
          id: source.id,
          title: clean(source.title),
          publishedAt: source.publishedAt,
          precision: source.publishedPrecision,
        })),
    },
    structure: {
      classification: structure.structureClassification,
      floatConfidence: structure.floatConfidence,
      sharesOutstanding: shares,
      supply: structure.supplyLedger.map((block) => ({
        type: block.type,
        status: block.status,
        effectiveDate: block.effectiveDate,
        amountShares: block.amountShares,
        sourceFiling: clean(block.sourceFiling),
        registrationStatus: clean(block.registrationStatus),
        dollarCapacity: block.dollarCapacity,
        terms: clean(block.terms),
        holderRestrictions: clean(block.holderRestrictions),
        eligibilityAssessment: clean(block.eligibilityAssessment),
        confidence: block.confidence,
      })),
    },
  };
}
