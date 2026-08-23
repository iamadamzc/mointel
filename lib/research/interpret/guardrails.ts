/**
 * Deterministic validation of interpreter output.
 *
 * The schema constrains shape; this constrains meaning. Every rule here exists
 * because the mistake it catches is one a fluent model makes convincingly:
 * calling shares outstanding a float, turning a dollar shelf into a share
 * count, reading an effective registration as evidence of selling, or promoting
 * a 52-week high into the current cycle.
 *
 * Violations are returned as explicit, quotable errors so a repair attempt can
 * be told exactly what was wrong rather than asked to try again.
 */

import type { ResearchEvidenceBundle } from './bundle';
import type {
  Confidence,
  ResearchDossier,
  StructureClassification,
  SupplyBand,
  SupplyBlock,
  SupplyBound,
} from '../types';

/**
 * Below this the established supply cannot move the name and must not veto
 * CLEAN.
 *
 * The one number in this file not derived from evidence. The bands around it
 * come from the observed spread of block sizes; this cut point is a judgement,
 * named so it is visible and tunable rather than buried in a comparison.
 */
const NEGLIGIBLE_SUPPLY_RATIO = 0.01;

function supplyBandFor(ratio: number): SupplyBand {
  if (ratio >= 1) return 'EXCEEDS_SHARE_COUNT';
  if (ratio >= 0.5) return 'SEVERE';
  if (ratio >= 0.1) return 'HEAVY';
  if (ratio >= NEGLIGIBLE_SUPPLY_RATIO) return 'PRESENT';
  return 'NEGLIGIBLE';
}

export type ViolationSeverity = 'REJECT' | 'DOWNGRADE';

export interface Violation {
  rule: string;
  severity: ViolationSeverity;
  message: string;
  path: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
  /** Output with downgrade-severity problems corrected in place. */
  dossier: ResearchDossier;
}

function violation(
  rule: string,
  severity: ViolationSeverity,
  path: string,
  message: string,
): Violation {
  return { rule, severity, path, message };
}

/** Terms in an excerpt that can support a stated float figure. */
const FLOAT_TERMS = /\bfloat\b/i;
/** Language that would mean shares are actually being sold, not merely sellable. */
const ACTIVE_SELLING_TERMS =
  /\b(sold|sales of|has sold|were sold|disposed|selling under|drawn down|utilized)\b/i;

function excerptFor(bundle: ResearchEvidenceBundle, ids: number[]): string {
  return bundle.sources
    .filter((source) => ids.includes(source.id))
    .map((source) => `${source.title ?? ''} ${source.excerpt ?? ''}`)
    .join('\n');
}

function downgradeConfidence(current: Confidence): Confidence {
  if (current === 'HIGH') return 'MEDIUM';
  if (current === 'MEDIUM') return 'LOW';
  return 'LOW';
}

/**
 * Validates one supply block.
 *
 * The recurring error is treating capacity as issuance: a shelf registers the
 * ability to sell up to a dollar amount, which says nothing about how many
 * shares exist or whether any were sold.
 */
function validateSupplyBlock(
  block: SupplyBlock,
  index: number,
  bundle: ResearchEvidenceBundle,
  violations: Violation[],
): SupplyBlock {
  const path = `structure.supplyLedger[${index}]`;
  const corrected: SupplyBlock = { ...block };

  if (block.evidenceSourceIds.length === 0) {
    violations.push(
      violation(
        'SUPPLY_BLOCK_REQUIRES_SOURCE',
        'REJECT',
        path,
        `Supply block "${block.type}" cites no evidence source id.`,
      ),
    );
  }

  // A dollar capacity with a share count and no terms is a converted shelf.
  if (
    block.dollarCapacity !== null &&
    block.amountShares !== null &&
    !block.terms &&
    block.type === 'SHELF_CAPACITY'
  ) {
    violations.push(
      violation(
        'DOLLAR_SHELF_IS_NOT_SHARES',
        'DOWNGRADE',
        `${path}.amountShares`,
        `Shelf capacity of ${block.dollarCapacity} was converted to ${block.amountShares} shares with no pricing or conversion terms. A dollar shelf is capacity, not a share count.`,
      ),
    );
    corrected.amountShares = null;
  }

  const excerpt = excerptFor(bundle, block.evidenceSourceIds);

  // Effectiveness and eligibility are not selling. Only KNOWN_ACTIVE asserts
  // supply is live, so it needs language that actually says so.
  if (block.status === 'KNOWN_ACTIVE' && !ACTIVE_SELLING_TERMS.test(excerpt)) {
    if (block.type === 'REGISTERED_RESALE' || block.type === 'SHELF_CAPACITY') {
      violations.push(
        violation(
          'REGISTRATION_IS_NOT_SELLING',
          'DOWNGRADE',
          `${path}.status`,
          `Block "${block.type}" is marked KNOWN_ACTIVE, but the cited evidence shows registration or effectiveness rather than actual sales. Registered resale and an effective registration establish the ability to sell, not that selling occurred.`,
        ),
      );
      corrected.status = 'POSSIBLY_ACTIVE';
    }
  }

  // Warrants need exercise/registration context before counting as live supply.
  if (
    block.type === 'WARRANTS' &&
    block.status === 'KNOWN_ACTIVE' &&
    !block.terms &&
    !block.registrationStatus
  ) {
    violations.push(
      violation(
        'WARRANTS_REQUIRE_ELIGIBILITY',
        'DOWNGRADE',
        `${path}.status`,
        'Warrants are marked KNOWN_ACTIVE with no exercise terms or registration status. Warrant supply depends on exercise price, registration and eligibility.',
      ),
    );
    corrected.status = 'POSSIBLY_ACTIVE';
  }

  return corrected;
}

/**
 * Validates a dossier against the evidence it claims to rest on.
 *
 * Returns a corrected dossier alongside the violations: DOWNGRADE problems are
 * fixed in place because the safe value is always knowable (null, UNKNOWN, a
 * lower confidence), while REJECT problems need the model to try again.
 */
/**
 * Divides established live supply by the reported share count.
 *
 * See `SupplyBound` for why the result is a lower bound and why that is worth
 * more here than an estimated float would be.
 *
 * The denominator is the deterministically parsed count from the bundle, never
 * `structure.sharesOutstanding`. The model's figure is a claim, and a claim
 * that came in too low would inflate the ratio and turn a bound into an
 * over-statement — the one failure this must not have. If collection did not
 * establish a share count, there is no bound to state.
 */
function computeSupplyBound(
  ledger: readonly SupplyBlock[],
  bundle: ResearchEvidenceBundle,
): SupplyBound | null {
  const reported = bundle.reportedSharesOutstanding;
  if (reported === null || reported.shares <= 0) return null;

  const active = ledger.filter((block) => block.status === 'KNOWN_ACTIVE');
  let activeSupplyShares = 0;
  let blocksCounted = 0;
  let blocksWithoutShareCount = 0;

  for (const block of active) {
    const shares = block.amountShares;
    if (typeof shares === 'number' && Number.isFinite(shares) && shares > 0) {
      activeSupplyShares += shares;
      blocksCounted += 1;
    } else {
      // A dollar-only block is capacity, not shares, and converting it is the
      // DOLLAR_SHELF_IS_NOT_SHARES mistake. Counted here only so the bound can
      // say how much it could not see.
      blocksWithoutShareCount += 1;
    }
  }

  if (blocksCounted === 0) return null;

  const ratioLowerBound = activeSupplyShares / reported.shares;

  return {
    activeSupplyShares,
    sharesOutstanding: reported.shares,
    ratioLowerBound,
    band: supplyBandFor(ratioLowerBound),
    exceedsSharesOutstanding: activeSupplyShares >= reported.shares,
    blocksCounted,
    blocksWithoutShareCount,
    note:
      'lower bound: float cannot exceed shares outstanding, and only established ' +
      'share-denominated supply is counted, so the true ratio is at least this',
  };
}

export function validateDossier(
  dossier: ResearchDossier,
  bundle: ResearchEvidenceBundle,
): ValidationResult {
  const violations: Violation[] = [];
  const corrected: ResearchDossier = {
    ...dossier,
    catalyst: { ...dossier.catalyst },
    structure: { ...dossier.structure, supplyLedger: [] },
    cycle: { ...dossier.cycle },
  };

  const citable = new Set(bundle.sources.map((source) => source.id));

  /* ------------------------------------------------------------- sources */

  const checkIds = (ids: number[], path: string) => {
    for (const id of ids) {
      if (!citable.has(id)) {
        violations.push(
          violation(
            'SOURCE_ID_MUST_EXIST',
            'REJECT',
            path,
            `Cited source id ${id} is not in the evidence bundle for ${bundle.ticker}. Cite only ids supplied in the bundle.`,
          ),
        );
      }
    }
  };

  checkIds(dossier.catalyst.evidenceSourceIds, 'catalyst.evidenceSourceIds');
  checkIds(dossier.structure.evidenceSourceIds, 'structure.evidenceSourceIds');
  checkIds(dossier.cycle.evidenceSourceIds, 'cycle.evidenceSourceIds');
  for (const [index, block] of dossier.structure.supplyLedger.entries()) {
    checkIds(block.evidenceSourceIds, `structure.supplyLedger[${index}].evidenceSourceIds`);
  }

  /* ------------------------------------------------------------- catalyst */

  const catalyst = corrected.catalyst;

  // A located catalyst is a claim about a document; it must point at one.
  if (
    (catalyst.catalystStatus === 'FRESH_FOUND' || catalyst.catalystStatus === 'SECONDARY_STALE') &&
    catalyst.evidenceSourceIds.length === 0
  ) {
    violations.push(
      violation(
        'CATALYST_REQUIRES_SOURCE',
        'REJECT',
        'catalyst.evidenceSourceIds',
        `catalystStatus is ${catalyst.catalystStatus} but no evidence source id is cited.`,
      ),
    );
  }

  // Finding no news is not evidence of flow. Flow needs affirmative demand.
  if (catalyst.catalystType === 'FLOW_DOMINANT') {
    const rvol = bundle.demand?.dailyRvol ?? null;
    const strongDemand = rvol !== null && rvol >= 5;
    if (!strongDemand || bundle.coverage.incomplete) {
      violations.push(
        violation(
          'FLOW_DOMINANT_REQUIRES_DEMAND',
          'DOWNGRADE',
          'catalyst.catalystType',
          bundle.coverage.incomplete
            ? 'FLOW_DOMINANT was asserted while source coverage is incomplete. Absence of located news is not evidence of flow; prefer UNKNOWN.'
            : 'FLOW_DOMINANT requires strong objective live-demand evidence, which the demand summary does not show.',
        ),
      );
      catalyst.catalystType = 'UNKNOWN';
    }
  }

  // The exact no-catalyst phrase is a conclusion about coverage, not a shrug.
  const saysNoFresh = (catalyst.summary ?? '').includes('NO FRESH CATALYST FOUND');
  if (saysNoFresh && bundle.coverage.incomplete) {
    violations.push(
      violation(
        'NO_FRESH_CATALYST_REQUIRES_COVERAGE',
        'DOWNGRADE',
        'catalyst.summary',
        'The summary states NO FRESH CATALYST FOUND while coverage is incomplete. That phrase asserts an adequate search was performed; use UNKNOWN instead.',
      ),
    );
    catalyst.summary = 'Coverage incomplete — no conclusion drawn about a catalyst.';
    catalyst.catalystStatus = 'UNKNOWN';
    catalyst.confidence = downgradeConfidence(catalyst.confidence);
  }

  if (catalyst.catalystStatus === 'NONE_FOUND' && bundle.coverage.incomplete) {
    violations.push(
      violation(
        'CATALYST_NONE_REQUIRES_COVERAGE',
        'DOWNGRADE',
        'catalyst.catalystStatus',
        'NONE_FOUND asserts an adequate search located nothing, but coverage is incomplete.',
      ),
    );
    catalyst.catalystStatus = 'UNKNOWN';
  }

  /* ------------------------------------------------------------ structure */

  const structure = corrected.structure;

  // Float is a specific sourced quantity. Shares outstanding is a different
  // quantity, and market cap is not a share count at all.
  if (structure.displayedFloat !== null) {
    const excerpt = excerptFor(bundle, structure.evidenceSourceIds);
    const floatStated = FLOAT_TERMS.test(excerpt) || Boolean(structure.displayedFloatSource);

    if (!floatStated) {
      violations.push(
        violation(
          'FLOAT_REQUIRES_SOURCE',
          'DOWNGRADE',
          'structure.displayedFloat',
          'A displayed float was reported but no cited evidence states a float. Shares outstanding is not float and market capitalisation is not float; unknown float must remain unknown.',
        ),
      );
      structure.displayedFloat = null;
      structure.displayedFloatDate = null;
      structure.displayedFloatSource = null;
      structure.floatConfidence = 'UNKNOWN';
    } else if (
      structure.sharesOutstanding !== null &&
      structure.displayedFloat === structure.sharesOutstanding
    ) {
      violations.push(
        violation(
          'SHARES_OUTSTANDING_IS_NOT_FLOAT',
          'DOWNGRADE',
          'structure.displayedFloat',
          'displayedFloat equals sharesOutstanding, which means the share count was reused as a float.',
        ),
      );
      structure.displayedFloat = null;
      structure.displayedFloatDate = null;
      structure.floatConfidence = 'UNKNOWN';
    }
  }

  /*
   * Validated before the classification checks below, not after.
   *
   * `corrected.structure` starts with an empty ledger, so while this ran later
   * every check that read `structure.supplyLedger` saw `[]` — which silently
   * reduced DIRTY_FLOAT_REQUIRES_EVIDENCE from "neither a ledger nor cited
   * evidence" to "no cited evidence". CLEAN now depends on the ledger too, so
   * the order is load-bearing rather than incidental.
   */
  structure.supplyLedger = dossier.structure.supplyLedger.map((block, index) =>
    validateSupplyBlock(block, index, bundle, violations),
  );
  structure.supplyBound = computeSupplyBound(structure.supplyLedger, bundle);

  // Absence of a warning is not evidence of cleanliness.
  if (structure.structureClassification === 'CLEAN') {
    /*
     * Established supply that could not be quantified always vetoes CLEAN —
     * that is the definition of CAUTION. Quantified supply vetoes it unless the
     * bound is NEGLIGIBLE, because a hard "any active block" rule treated
     * 26,768 acquisition shares like 21M registered resale shares and would
     * have kept CLEAN unreachable for a new reason.
     */
    const unquantifiedActiveSupply = structure.supplyLedger.some(
      (block) =>
        block.status === 'KNOWN_ACTIVE' &&
        !(typeof block.amountShares === 'number' && block.amountShares > 0),
    );
    const materialSupply =
      structure.supplyBound !== null &&
      structure.supplyBound !== undefined &&
      structure.supplyBound.band !== 'NEGLIGIBLE';

    const reconciled =
      !bundle.coverage.incomplete &&
      bundle.coverage.hasRegistrationEvidence &&
      bundle.coverage.hasSharesOutstanding &&
      structure.evidenceSourceIds.length > 0 &&
      !unquantifiedActiveSupply &&
      !materialSupply;

    if (!reconciled) {
      violations.push(
        violation(
          'CLEAN_REQUIRES_RECONCILIATION',
          'DOWNGRADE',
          'structure.structureClassification',
          unquantifiedActiveSupply || materialSupply
            ? 'CLEAN was asserted while the ledger carries live supply. Established supply that is unquantified, or quantified above the negligible band, is a reason to reconcile rather than a structure that has been reconciled.'
            : 'CLEAN requires affirmative evidence that the structure was reconciled. Coverage is incomplete or key structural evidence is missing, so the absence of a detected warning does not support CLEAN.',
        ),
      );
      structure.structureClassification = 'UNKNOWN' as StructureClassification;
      structure.confidence = downgradeConfidence(structure.confidence);
    }
  }

  /*
   * CAUTION was the only verdict guarded by nothing, so it was the cheapest
   * answer available and took 64% of the board while CLEAN took none. It means
   * supply was identified and could not be pinned down; with nothing identified
   * at all, the honest answer is UNKNOWN.
   */
  if (
    structure.structureClassification === 'CAUTION' &&
    structure.supplyLedger.length === 0 &&
    structure.structuralWarnings.length === 0
  ) {
    violations.push(
      violation(
        'CAUTION_REQUIRES_IDENTIFIED_SUPPLY',
        'DOWNGRADE',
        'structure.structureClassification',
        'CAUTION was asserted with no supply block and no structural warning. CAUTION means supply was identified but could not be quantified or dated; where nothing was identified the answer is UNKNOWN.',
      ),
    );
    structure.structureClassification = 'UNKNOWN' as StructureClassification;
    structure.confidence = downgradeConfidence(structure.confidence);
  }

  // DIRTY_FLOAT is a strong claim and must rest on identified supply.
  if (structure.structureClassification === 'DIRTY_FLOAT') {
    if (structure.supplyLedger.length === 0 && structure.evidenceSourceIds.length === 0) {
      violations.push(
        violation(
          'DIRTY_FLOAT_REQUIRES_EVIDENCE',
          'REJECT',
          'structure.structureClassification',
          'DIRTY_FLOAT was asserted with neither a supply ledger nor cited evidence.',
        ),
      );
    }
  }

  if (structure.evidenceSourceIds.length === 0 && structure.structureClassification !== 'UNKNOWN') {
    violations.push(
      violation(
        'STRUCTURE_REQUIRES_SOURCE',
        'REJECT',
        'structure.evidenceSourceIds',
        `structureClassification is ${structure.structureClassification} but no evidence source id is cited.`,
      ),
    );
  }

  // Unknown never becomes zero.
  if (structure.sharesOutstanding === 0) {
    violations.push(
      violation(
        'UNKNOWN_IS_NOT_ZERO',
        'DOWNGRADE',
        'structure.sharesOutstanding',
        'A share count of zero is not a real value; unknown must stay null.',
      ),
    );
    structure.sharesOutstanding = null;
  }
  if (structure.displayedFloat === 0) {
    violations.push(
      violation('UNKNOWN_IS_NOT_ZERO', 'DOWNGRADE', 'structure.displayedFloat', 'A float of zero is not a real value; unknown must stay null.'),
    );
    structure.displayedFloat = null;
  }

  /* ---------------------------------------------------------------- cycle */

  const cycle = corrected.cycle;

  // The FIEE defect: a historical high promoted into the current cycle, then
  // used to compute a giveback against a cycle that never existed.
  if (
    cycle.currentCycleHigh !== null &&
    cycle.historicalResistance !== null &&
    cycle.currentCycleHigh === cycle.historicalResistance
  ) {
    violations.push(
      violation(
        'HISTORICAL_HIGH_IS_NOT_CYCLE_HIGH',
        'DOWNGRADE',
        'cycle.currentCycleHigh',
        'currentCycleHigh equals historicalResistance. A 52-week high, an old run high or historical resistance must never populate currentCycleHigh merely because it is the highest known number.',
      ),
    );
    cycle.currentCycleHigh = null;
    cycle.currentCycleHighConfidence = 'UNKNOWN';
    cycle.currentGivebackPct = null;
  }

  if (
    cycle.currentCycleHigh !== null &&
    bundle.history.windowHigh !== null &&
    cycle.currentCycleHigh === bundle.history.windowHigh &&
    cycle.currentCycleHighConfidence === 'UNKNOWN'
  ) {
    violations.push(
      violation(
        'HISTORICAL_HIGH_IS_NOT_CYCLE_HIGH',
        'DOWNGRADE',
        'cycle.currentCycleHigh',
        'currentCycleHigh was taken from the retained historical window without establishing a current-cycle boundary.',
      ),
    );
    cycle.currentCycleHigh = null;
    cycle.currentGivebackPct = null;
  }

  // A giveback is measured from a cycle high; with no high there is nothing to
  // measure from, and a number here would be meaningless precision.
  if (cycle.currentCycleHigh === null && cycle.currentGivebackPct !== null) {
    violations.push(
      violation(
        'GIVEBACK_REQUIRES_CYCLE_HIGH',
        'DOWNGRADE',
        'cycle.currentGivebackPct',
        'currentGivebackPct was reported without a currentCycleHigh to measure against.',
      ),
    );
    cycle.currentGivebackPct = null;
  }

  // Absorption is explicitly out of scope for this phase.
  const absorptionClaim = /\b(absorb|absorbed|absorption|cleaned up|worked through)\b/i;
  if (absorptionClaim.test(cycle.reasoning ?? '') || absorptionClaim.test(structure.summary ?? '')) {
    violations.push(
      violation(
        'NO_ABSORPTION_INFERENCE',
        'DOWNGRADE',
        'cycle.reasoning',
        'Overhang absorption was inferred. High turnover cannot demonstrate that supply was absorbed, and absorption is out of scope.',
      ),
    );
    structure.confidence = downgradeConfidence(structure.confidence);
  }

  if (cycle.cycleClassification !== 'UNKNOWN' && cycle.evidenceSourceIds.length === 0) {
    // Cycle may rest on market data rather than documents, so this is a
    // confidence problem rather than a rejection.
    cycle.confidence = downgradeConfidence(cycle.confidence);
  }

  /* --------------------------------------------------------------- global */

  // Deterministic coverage outranks model self-assessment.
  if (bundle.coverage.incomplete) {
    if (catalyst.confidence === 'HIGH') catalyst.confidence = 'MEDIUM';
    if (structure.confidence === 'HIGH') structure.confidence = 'MEDIUM';
  }

  return {
    ok: violations.every((item) => item.severity !== 'REJECT'),
    violations,
    dossier: corrected,
  };
}

/** Human-readable errors for a repair request. */
export function describeViolations(violations: readonly Violation[]): string {
  return violations
    .map((item, index) => `${index + 1}. [${item.rule}] ${item.path}: ${item.message}`)
    .join('\n');
}
