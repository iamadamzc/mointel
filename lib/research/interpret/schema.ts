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

export const AUTOMATIC_DOSSIER_SCHEMA_VERSION = 1;
export const INTERPRETER_PROMPT_VERSION = 1;

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
  freshness: { type: 'string', enum: ['FRESH', 'RECENT', 'STALE', 'UNKNOWN'] },
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

export const AUTOMATIC_DOSSIER_SCHEMA = required({
  ticker: { type: 'string' },
  companyName: nullableString,
  cik: nullableString,
  country: nullableString,
  foreignIssuer: { type: ['boolean', 'null'] },
  catalyst: CATALYST,
  structure: STRUCTURE,
  cycle: CYCLE,
}) as Record<string, unknown>;
