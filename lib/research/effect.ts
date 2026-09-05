/**
 * Which side of the book an event brings, and on what basis.
 *
 * `catalystType` says the CHARACTER of a move and `catalystGrade` its QUALITY;
 * neither says WHAT HAPPENED. Dilution appears only as a low grade, so an
 * offering and a stale press release reach the same bucket by different routes.
 * This asks the question he actually asks: WHICH SIDE OF THE BOOK IS ABOUT TO
 * GET HEAVIER.
 *
 * The property that makes it a differentiator rather than a taxonomy is that
 * THE SAME DOCUMENT TYPE LANDS ON OPPOSITE SIDES — an 8-K announcing an
 * acquisition is demand, an 8-K announcing an offering is supply. Everyone else
 * classifies by document or by news-versus-no-news.
 *
 * TESTED AGAINST 83 ACCEPTED CATALYSTS before it was built. The residue was
 * ZERO, which is a WARNING rather than a result: two signed axes with a `NONE`
 * value can absorb anything, and a taxonomy that classifies everything on the
 * first pass usually has buckets too vague to be wrong.
 *
 * SO THE DISCRIMINATING CONSTRAINT IS NOT THE AXES. IT IS THE MANDATORY BASIS.
 * If a side can be set without evidence, the axes are decorative and the model
 * will fill them the way it fills everything else.
 *
 * ── WHAT THIS DELIBERATELY CANNOT DO ──────────────────────────────────────
 *
 * IT CANNOT SAY HOW MUCH. `POSITIVE` on a 526,314-share offering and on a
 * change of control transferring 95.7% of the company are the same value. The
 * magnitude lives in `SupplyPair` and its bound, and nothing joins them yet.
 * That is a known ceiling on v1 and the next piece of work, recorded here
 * rather than in a register because it is read where the type is read.
 *
 * A RENAME HAS NO PLACE IN IT, DELIBERATELY. SGRX cost a live name when a
 * ticker change made the desk deaf to it — but that is a fact about the DESK'S
 * ABILITY TO OBSERVE, not about the book, and it belongs to the capture layer.
 * Where a rename follows a pivot, classify the PIVOT. The next person to read
 * this will propose adding it; this paragraph is the answer.
 */

/**
 * `UNDETERMINED` is a fourth value and not a flag beside the axes.
 *
 * With a boolean, a governance item with genuinely no book effect and an item
 * whose evidence cannot say WOULD BOTH READ `NONE` — and every consumer
 * switching on the side gets a false answer for the second unless it remembers
 * to read a separate field. One constant for a fault and an absence is the
 * whole bug in miniature; the type has to make the wrong read impossible rather
 * than make the right one available.
 *
 * It is per-axis because the combination is real: a stock-for-stock acquisition
 * of undisclosed size is supply POSITIVE observed AND demand UNDETERMINED. One
 * flag cannot say that.
 */
export type Side = 'POSITIVE' | 'NEGATIVE' | 'NONE' | 'UNDETERMINED';

/**
 * The closed rule list. An unlisted name is a validation failure for that axis.
 *
 * Adding a rule is a DESK DECISION, not a prompt edit: a new rule arrives with
 * its direction and with whether it has a number behind it.
 */
export type EffectRule =
  /** A reverse split creates the price and authorised-share headroom to raise. */
  | 'REVERSE_SPLIT_UNCOUNTED'
  | 'REVERSE_SPLIT_1ST'
  | 'REVERSE_SPLIT_REPEAT'
  /** A 12b-25 or an audit failure signals the NEED to raise, not the headroom. */
  | 'FILING_FAILURE'
  /** Regained listing compliance removes a delisting risk, so holders can hold. */
  | 'COMPLIANCE_RESTORED'
  /** Consideration paid in stock: the demand event IS the supply event. */
  | 'STOCK_CONSIDERATION';

/** Why an axis could not be determined. Never blank — that is the same collapse. */
export type UndeterminedReason =
  /** The event is confirmed and the evidence does not carry its content. */
  | 'CONTENT_NOT_IN_EVIDENCE'
  /** That side was not searched. SEC-only coverage is blind to a press release. */
  | 'NOT_SEARCHED'
  /** The model named a rule that is not on the list. */
  | 'UNRECOGNISED_RULE'
  /** The named rule does not license the side it was attached to. */
  | 'RULE_DIRECTION_MISMATCH';

export type EffectBasis =
  | { kind: 'OBSERVED'; sourceIds: number[] }
  | { kind: 'INFERRED'; rule: EffectRule; sourceIds: number[] }
  | { kind: 'UNDETERMINED'; reason: UndeterminedReason };

/** When created supply can actually reach the book. Reachability and a long fuse
 * are ONE question, not two: a 12b-25's supply pressure is real and months away;
 * a priced offering's is here. */
export type TimeToEffect = 'NOW' | 'DAYS' | 'WEEKS' | 'UNKNOWN';

export interface CatalystEffect {
  /** + buyers arrive · − buyers leave · none · undetermined */
  bringsDemand: Side;
  bringsSupply: Side;
  /** Required for every side that is not `NONE`, including `UNDETERMINED`. */
  demandBasis: EffectBasis | null;
  supplyBasis: EffectBasis | null;
  /**
   * The move is CAPPED, which is not a side.
   *
   * A cash merger at a fixed price does not bring buyers — IT ENDS PRICE
   * DISCOVERY. The stock walks to the deal price and stops, and for a momentum
   * trader that is the strongest possible avoid, so a demand-positive verdict
   * would be actively dangerous.
   *
   * It has a TAPE observable as well as a filing one — realised volatility
   * collapses — so the classification can be checked without trusting the
   * classifier.
   */
  priceCapped: { at: number | null; source: 'ANNOUNCED_TERMS' } | null;
  timeToEffect: TimeToEffect;
}

/** What each rule licenses, and whether anything has been measured for it. */
interface RuleSpec {
  demand: Side | null;
  supply: Side | null;
  /** Null where the rule is believed rather than measured. */
  measured: string | null;
}

/**
 * TWO OF THESE HAVE NO NUMBER AND MUST RENDER AS RULES RATHER THAN FINDINGS.
 *
 * That is the difference being sold: a vendor prints N/A, and this desk prints
 * the reasoning and its basis. A rule with `measured: null` is a belief the desk
 * holds, and saying so is the product.
 */
export const EFFECT_RULES: Record<EffectRule, RuleSpec> = {
  // The census has not run, so no count is known for THIS name. `_1ST` would
  // assert a count nobody has measured, and a repeat offender labelled "first"
  // is the precise error on the precise names he asked about.
  REVERSE_SPLIT_UNCOUNTED: { demand: null, supply: 'POSITIVE', measured: null },
  REVERSE_SPLIT_1ST: {
    demand: null,
    supply: 'POSITIVE',
    measured: '1.65x against base rate, z~2.2, on a MENTION proxy rather than a confirmed split',
  },
  REVERSE_SPLIT_REPEAT: {
    demand: null,
    supply: 'POSITIVE',
    measured: '1.65x on the first-split proxy; the repeat effect is UNMEASURED',
  },
  // A reverse split creates the HEADROOM to raise; a filing failure signals the
  // NEED to. Same direction, opposite mechanism.
  FILING_FAILURE: { demand: 'NEGATIVE', supply: 'POSITIVE', measured: null },
  // Frequently the PRECONDITION for the raise rather than an alternative to it,
  // so it belongs in the both-sides family more often than it looks.
  COMPLIANCE_RESTORED: { demand: 'POSITIVE', supply: null, measured: null },
  STOCK_CONSIDERATION: {
    demand: null,
    supply: 'POSITIVE',
    measured: 'observed from the stated terms rather than inferred',
  },
};

const SIDES = new Set<Side>(['POSITIVE', 'NEGATIVE', 'NONE', 'UNDETERMINED']);

function undetermined(reason: UndeterminedReason): {
  side: Side;
  basis: EffectBasis;
} {
  return { side: 'UNDETERMINED', basis: { kind: 'UNDETERMINED', reason } };
}

/**
 * Validates one axis, degrading rather than discarding.
 *
 * REJECT THE FIELD, NOT THE CATALYST. A quality filter that drops what it
 * cannot parse thereby FAVOURS unparseable input — this desk has shipped that
 * version before. An unrecognised rule drops the axis to UNDETERMINED with the
 * reason recorded, and the rest of the dossier survives.
 */
function validateAxis(
  side: unknown,
  basis: unknown,
  axis: 'demand' | 'supply',
): { side: Side; basis: EffectBasis | null } {
  if (typeof side !== 'string' || !SIDES.has(side as Side)) {
    return undetermined('UNRECOGNISED_RULE');
  }
  const typed = side as Side;

  // `NONE` is the one side that needs no basis: nothing was claimed.
  if (typed === 'NONE') return { side: 'NONE', basis: null };

  const record = basis as Partial<EffectBasis> | null | undefined;
  if (!record || typeof record !== 'object') return undetermined('CONTENT_NOT_IN_EVIDENCE');

  if (record.kind === 'UNDETERMINED') {
    // A blank reason is the same collapse one level down.
    const reason = (record as { reason?: unknown }).reason;
    return typeof reason === 'string'
      ? { side: 'UNDETERMINED', basis: { kind: 'UNDETERMINED', reason: reason as UndeterminedReason } }
      : undetermined('CONTENT_NOT_IN_EVIDENCE');
  }

  if (record.kind === 'OBSERVED') {
    const ids = (record as { sourceIds?: unknown }).sourceIds;
    // A claim with no source id is a claim the model could only assert.
    if (!Array.isArray(ids) || ids.length === 0) return undetermined('CONTENT_NOT_IN_EVIDENCE');
    return { side: typed, basis: { kind: 'OBSERVED', sourceIds: ids as number[] } };
  }

  if (record.kind === 'INFERRED') {
    const rule = (record as { rule?: unknown }).rule;
    const spec = typeof rule === 'string' ? EFFECT_RULES[rule as EffectRule] : undefined;
    if (!spec) return undetermined('UNRECOGNISED_RULE');

    // The rule must license the side it was attached to, or the list does no
    // work: a split rule cannot justify a demand verdict.
    const licensed = axis === 'demand' ? spec.demand : spec.supply;
    if (licensed !== typed) return undetermined('RULE_DIRECTION_MISMATCH');

    const ids = (record as { sourceIds?: unknown }).sourceIds;
    return {
      side: typed,
      basis: {
        kind: 'INFERRED',
        rule: rule as EffectRule,
        sourceIds: Array.isArray(ids) ? (ids as number[]) : [],
      },
    };
  }

  return undetermined('CONTENT_NOT_IN_EVIDENCE');
}

/** Whether a side was reasoned to rather than seen — what must not render as a finding. */
export function isInferred(basis: EffectBasis | null): boolean {
  return basis?.kind === 'INFERRED';
}

/** The measurement behind an inferred side, or null where the desk is believing. */
export function measurementFor(basis: EffectBasis | null): string | null {
  return basis?.kind === 'INFERRED' ? EFFECT_RULES[basis.rule].measured : null;
}

export function validateCatalystEffect(raw: unknown): CatalystEffect {
  const input = (raw ?? {}) as Partial<Record<keyof CatalystEffect, unknown>>;

  const demand = validateAxis(input.bringsDemand, input.demandBasis, 'demand');
  const supply = validateAxis(input.bringsSupply, input.supplyBasis, 'supply');

  const cap = input.priceCapped as CatalystEffect['priceCapped'];
  const time = input.timeToEffect;

  return {
    bringsDemand: demand.side,
    demandBasis: demand.basis,
    bringsSupply: supply.side,
    supplyBasis: supply.basis,
    priceCapped:
      cap && typeof cap === 'object' && cap.source === 'ANNOUNCED_TERMS'
        ? { at: typeof cap.at === 'number' ? cap.at : null, source: 'ANNOUNCED_TERMS' }
        : null,
    timeToEffect:
      time === 'NOW' || time === 'DAYS' || time === 'WEEKS' ? time : 'UNKNOWN',
  };
}
