/**
 * Strict output schema for the automatic dossier.
 *
 * The interpreter is constrained to this shape by the provider rather than
 * asked politely for JSON, and the result is still validated in software
 * afterwards. Prompt compliance is not a guarantee, so it is never treated as
 * one — see guardrails.ts.
 *
 * Versioned deliberately: interpretation behaviour must not change silently.
 * Bump AUTOMATIC_DOSSIER_SCHEMA_VERSION when the shape changes and
 * INTERPRETER_PROMPT_VERSION when the instructions change.
 */

import { catalystGradeSchemaDescription } from './catalystGrades';
import { EVIDENCE_RISK_RULE } from './evidenceRisk';

// 2: `businessDescription` added (his ruling 2026-09-30T10:42:25Z).
// 3: `evidenceRisk` added (contract row 20; his ruling 2026-10-06T00:22:29.450Z, "yes, build both").
export const AUTOMATIC_DOSSIER_SCHEMA_VERSION = 3;
// 2: catalyst grades defined (his ruling 2026-09-29T14:46:55Z, `catalystGrades.ts`).
// 3: the business line, and no em dash in any text written (his rulings
//    2026-09-30T10:42:25Z and 10:43:39Z). The grade text is unchanged from 2.
// 4: the evidence risk rule (`evidenceRisk.ts`), with schema 3, in one change.
export const INTERPRETER_PROMPT_VERSION = 4;

const CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;

/** Every property is required; optionality is expressed as a nullable type. */
function required(properties: Record<string, unknown>) {
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

const stringArray = { type: 'array', items: { type: 'string' } };
const idArray = { type: 'array', items: { type: 'integer' } };
const nullableNumber = { type: ['number', 'null'] };
const nullableString = { type: ['string', 'null'] };

const SUPPLY_BLOCK = required({
  type: {
    type: 'string',
    enum: [
      'REGISTERED_RESALE',
      'ATM',
      'PIPE',
      'WARRANTS',
      'CONVERTIBLES',
      'EQUITY_PURCHASE_AGREEMENT',
      'ACQUISITION_SHARES',
      'RECENT_OFFERING',
      'SHELF_CAPACITY',
      'PREFERRED_CONVERSION',
      'OTHER_ISSUED_SHARES',
    ],
  },
  // Null unless a share count is actually stated. A dollar shelf is capacity,
  // and converting it to shares without pricing terms is fabrication.
  amountShares: nullableNumber,
  dollarCapacity: nullableNumber,
  sourceFiling: nullableString,
  registrationStatus: nullableString,
  effectiveDate: nullableString,
  terms: nullableString,
  holderRestrictions: nullableString,
  status: {
    type: 'string',
    enum: ['KNOWN_ACTIVE', 'POSSIBLY_ACTIVE', 'NOT_YET_ACTIVE', 'UNKNOWN'],
  },
  eligibilityAssessment: nullableString,
  evidenceSourceIds: idArray,
  confidence: { type: 'string', enum: CONFIDENCE },
});

const CATALYST = required({
  catalystStatus: {
    type: 'string',
    enum: ['FRESH_FOUND', 'SECONDARY_STALE', 'NONE_FOUND', 'CONFLICTING', 'UNKNOWN'],
  },
  catalystType: {
    type: 'string',
    enum: ['NEWS_DRIVEN', 'FLOW_DOMINANT', 'SECONDARY_STALE', 'NONE_IDENTIFIED', 'UNKNOWN'],
  },
  catalystGrade: {
    type: 'string',
    // The same text the prompt carries (`catalystGrades.ts`), so the model is
    // told what each grade means in both places it looks, and they agree.
    description: catalystGradeSchemaDescription(),
    enum: [
      'STRONG',
      'LEGITIMATE_POSITIVE',
      'MODERATE_MIXED_SECONDARY',
      'WEAK_NEGATIVE_DILUTIVE',
      'NONE',
      'UNKNOWN',
    ],
  },
  summary: nullableString,
  eventTimestamp: nullableString,
  /*
   * `freshness` IS NOT ASKED FOR. His ruling, 2026-09-24.
   *
   * It used to be declared here with NO description, and the prompt never
   * defined its boundaries either -- so the model was answering a temporal
   * question with no threshold given, and nothing checked the answer against
   * the event date the desk already holds. A catalyst stamped `28d` rendered
   * green; 52 of 325 analyses claimed FRESH on something the date refuted or
   * could not support.
   *
   * It is arithmetic now, from `eventTimestamp` alone: `resolveCatalystFreshness`
   * computes it on the read path and `validateDossier` writes it, so asking the
   * model would buy a value that is overwritten before anyone sees it -- while
   * still costing tokens on every call and leaving a field a later reader could
   * mistake for authoritative. `eventTimestamp` below is the real input, and it
   * is a fact the model extracts rather than a judgement it makes.
   */
  whyTradersMayCare: nullableString,
  plausiblyExplainsMove: { type: ['boolean', 'null'] },
  confidence: { type: 'string', enum: CONFIDENCE },
  evidenceSourceIds: idArray,
  unknowns: stringArray,
});

const STRUCTURE = required({
  sharesOutstanding: nullableNumber,
  sharesOutstandingDate: nullableString,
  // Only a sourced float figure ever lands here. Shares outstanding and market
  // cap are different quantities and may never be substituted.
  displayedFloat: nullableNumber,
  displayedFloatDate: nullableString,
  displayedFloatSource: nullableString,
  floatConfidence: { type: 'string', enum: CONFIDENCE },
  structureClassification: {
    type: 'string',
    enum: ['CLEAN', 'CAUTION', 'DIRTY_FLOAT', 'UNKNOWN'],
  },
  supplyLedger: { type: 'array', items: SUPPLY_BLOCK },
  structuralWarnings: stringArray,
  reverseSplitHistory: stringArray,
  knownRegistrationStatus: nullableString,
  summary: nullableString,
  confidence: { type: 'string', enum: CONFIDENCE },
  evidenceSourceIds: idArray,
  unknowns: stringArray,
});

const CYCLE = required({
  cycleClassification: {
    type: 'string',
    enum: ['GREEN_FRESH_FRONTSIDE', 'YELLOW_FRONTSIDE_WARNING', 'RED_BACKSIDE', 'UNKNOWN'],
  },
  reasoning: nullableString,
  // Null unless a current-cycle boundary is genuinely established. A 52-week
  // high is historicalResistance, never this.
  currentCycleHigh: nullableNumber,
  currentCycleHighConfidence: { type: 'string', enum: CONFIDENCE },
  currentGivebackPct: nullableNumber,
  historicalResistance: nullableNumber,
  formerRunnerStatus: {
    type: 'string',
    enum: ['NONE', 'FORMER_RUNNER', 'FORMER_SUPERRUNNER', 'UNKNOWN'],
  },
  recentMajorRuns: stringArray,
  cycleWarnings: stringArray,
  confidence: { type: 'string', enum: CONFIDENCE },
  evidenceSourceIds: idArray,
  unknowns: stringArray,
});

// Under a NEUTRAL key: the model reads the key as well as the rule, and "warning" pulls toward what could happen.
const EVIDENCE_RISK = required({
  text: { type: ['string', 'null'], description: EVIDENCE_RISK_RULE },
  evidenceSourceIds: idArray,
});

export const AUTOMATIC_DOSSIER_SCHEMA = required({
  ticker: { type: 'string' },
  companyName: nullableString,
  cik: nullableString,
  country: nullableString,
  foreignIssuer: { type: ['boolean', 'null'] },
  businessDescription: {
    type: ['string', 'null'],
    description:
      'What the company does, in one plain sentence, from sicDescription and the filings in the bundle. Null when the bundle does not say.',
  },
  evidenceRisk: EVIDENCE_RISK,
  catalyst: CATALYST,
  structure: STRUCTURE,
  cycle: CYCLE,
}) as Record<string, unknown>;
