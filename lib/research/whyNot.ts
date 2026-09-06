/**
 * THE WHY NOT REPORT — his name for it, and the verdict type is the whole of it.
 *
 * *"Research for the avoid. success comes more in what you dont trade than what
 * you do. or rather, failure comes in overtrading."*
 *
 * Everything that produces an objection already exists: `effect.ts` carries the
 * axes and `priceCapped`, the supply pair carries magnitude, the float bound
 * carries the low-float pillar. **This file adds one thing — the verdict — and
 * an ordering rule over what is already there.**
 *
 * ── THE THIRD VERDICT IS NOT A WEAKER SECOND. IT IS THE OPPOSITE OF IT ───
 *
 * `NO_OBJECTION_FOUND` says the desk looked and found nothing.
 * `NOTHING_COLLECTED` says the desk is DEAF on this name.
 *
 * A reader who treats them alike gets a false answer for the second, and the
 * false answer is *there is nothing wrong with this stock*. THAT IS THIS DESK'S
 * OLDEST FAILURE — one value for a fault and an absence — POINTED AT HIS MONEY.
 * So they are separate members of a union rather than a flag beside a boolean:
 * the type has to make the wrong read impossible, not make the right one
 * available.
 *
 * ── THE ABSENCE OF A REASON NOT TO IS NOT A REASON TO ────────────────────
 *
 * **NOTHING HERE EVER RETURNS APPROVAL, INCLUDING BY IMPLICATION.** A clean
 * setup is not this report's output and cannot be derived from it by negation:
 * an objection needs ONE confirmed fact, and "no objection" needs to have
 * LOOKED EVERYWHERE. At 62% of names carrying no non-SEC source those are not
 * the same claim with the sign flipped — the avoid is achievable at today's
 * coverage and a clean verdict is destroyed by it.
 *
 * What the report can honestly say about a name it found nothing against is
 * HOW HARD IT LOOKED, which is why `NO_OBJECTION_FOUND` carries its coverage
 * and is useless without it.
 *
 * ── SEVERITY IS DERIVED FROM TWO FIELDS THAT ALREADY EXIST ───────────────
 *
 * Almost every small-cap has something structural, so a report that objects to
 * everything is ignored exactly like a marker that fires every morning. The
 * split is NOT severity-in-general: it is whether the fact BEARS ON THE TRADE
 * HE IS ABOUT TO MAKE, and he holds for seconds.
 *
 *   `timeToEffect`  NOW acts on the price he is about to pay. WEEKS does not.
 *   `basis.kind`    OBSERVED is a fact. INFERRED is a rule the desk holds.
 *
 * A cash merger caps his upside BY CONTRACT, now. A shelf registered in 2024 is
 * a fact about the company and not about his next sixty seconds. NEITHER AXIS
 * IS INVENTED HERE and no new scale is introduced.
 */

import {
  isInferred,
  measurementFor,
  type CatalystEffect,
  type EffectBasis,
} from './effect';

/**
 * Whether the fact reaches the trade in front of him, derived from
 * `timeToEffect` alone. `UNKNOWN` stays UNDETERMINED rather than defaulting to
 * either side: a horizon nobody established is not a horizon of weeks.
 */
export type Bearing = 'ON_THIS_TRADE' | 'ON_THE_COMPANY' | 'UNDETERMINED';

/** Why the desk has nothing, kept distinct because the fixes differ. */
export type DeafReason =
  /** No source was ever collected for this name. */
  | 'NO_SOURCES'
  /** Sources exist and the side he needs was never searched. */
  | 'SIDE_NOT_SEARCHED'
  /** The event is confirmed and the evidence does not carry its content. */
  | 'CONTENT_NOT_IN_EVIDENCE'
  /** The classifier returned something unusable, so the axis says nothing. */
  | 'UNUSABLE_CLASSIFICATION';

/** What the desk actually reached, so "we looked" is a measurement not a claim. */
export interface Coverage {
  /** Every active source row for the name. */
  sourceCount: number;
  /**
   * Non-SEC sources specifically.
   *
   * SEC-only coverage is BLIND TO A PRESS RELEASE, and demand events are
   * overwhelmingly press releases. A name with 40 filings and no newswire has
   * been half-looked-at, and the number says which half.
   */
  nonSecSourceCount: number;
  /** Newest source date, ISO, or null. Old coverage is not coverage. */
  newestSourceAt: string | null;
}

export interface Objection {
  /** Which side of the book gets heavier, or that discovery has ended. */
  axis: 'SUPPLY' | 'DEMAND' | 'PRICE_CAPPED';
  basis: EffectBasis | null;
  bearing: Bearing;
  /**
   * True where the desk BELIEVES the rule rather than having measured it.
   *
   * `EFFECT_RULES` records `measured: null` for two of its rules. Those must
   * render as reasoning rather than as findings — printing a belief in the same
   * type as an observation is how a vendor's N/A becomes a number.
   */
  believed: boolean;
  /** The measurement behind an inferred objection, or null where none exists. */
  measurement: string | null;
}

export type WhyNotVerdict =
  | {
      kind: 'OBJECTION';
      objections: Objection[];
      /**
       * An axis that could not be determined, alongside a found objection.
       *
       * Real and common — supply POSITIVE observed with demand UNDETERMINED —
       * and it means the picture is PARTIAL. An objection does not license
       * silence about the rest.
       */
      unresolved: DeafReason[];
    }
  | { kind: 'NO_OBJECTION_FOUND'; coverage: Coverage }
  | { kind: 'NOTHING_COLLECTED'; reasons: DeafReason[]; coverage: Coverage };

function bearingFor(effect: CatalystEffect): Bearing {
  switch (effect.timeToEffect) {
    case 'NOW':
      return 'ON_THIS_TRADE';
    case 'DAYS':
    case 'WEEKS':
      return 'ON_THE_COMPANY';
    default:
      return 'UNDETERMINED';
  }
}

/** An undetermined axis is a hole in the evidence, mapped to what would fix it. */
function deafReasonFor(basis: EffectBasis | null): DeafReason | null {
  if (!basis || basis.kind !== 'UNDETERMINED') return null;
  switch (basis.reason) {
    case 'NOT_SEARCHED':
      return 'SIDE_NOT_SEARCHED';
    case 'CONTENT_NOT_IN_EVIDENCE':
      return 'CONTENT_NOT_IN_EVIDENCE';
    default:
      // UNRECOGNISED_RULE and RULE_DIRECTION_MISMATCH are classifier failures
      // rather than coverage failures, and neither is "we looked and found
      // nothing" — the axis simply says nothing usable.
      return 'UNUSABLE_CLASSIFICATION';
  }
}

function objectionFrom(
  axis: 'SUPPLY' | 'DEMAND',
  basis: EffectBasis | null,
  effect: CatalystEffect,
): Objection {
  return {
    axis,
    basis,
    bearing: bearingFor(effect),
    believed: isInferred(basis) && measurementFor(basis) === null,
    measurement: measurementFor(basis),
  };
}

/**
 * The one ordering rule, and it is the product.
 *
 * `ON_THIS_TRADE` before `ON_THE_COMPANY` before `UNDETERMINED`; within a
 * bearing, an observed fact before a rule the desk believes. A cash merger at a
 * fixed price outranks everything because it ends price discovery outright.
 */
const BEARING_ORDER: Record<Bearing, number> = {
  ON_THIS_TRADE: 0,
  ON_THE_COMPANY: 1,
  UNDETERMINED: 2,
};

export function orderObjections(objections: Objection[]): Objection[] {
  return [...objections].sort((a, b) => {
    if (a.axis === 'PRICE_CAPPED' && b.axis !== 'PRICE_CAPPED') return -1;
    if (b.axis === 'PRICE_CAPPED' && a.axis !== 'PRICE_CAPPED') return 1;
    const bearing = BEARING_ORDER[a.bearing] - BEARING_ORDER[b.bearing];
    if (bearing !== 0) return bearing;
    return Number(a.believed) - Number(b.believed);
  });
}

/**
 * The verdict.
 *
 * ORDER MATTERS AND IS NOT ARBITRARY: an objection found is reported even on
 * partial evidence, because a confirmed fact does not become less true when
 * something else is unknown. Only when NOTHING was found does the completeness
 * of the search decide between the second and third verdicts — and there,
 * ANY undetermined axis forces the third.
 *
 * A NAME WITH AN UNSEARCHED SIDE HAS NOT BEEN CLEARED. `NO_OBJECTION_FOUND`
 * requires both axes to have said something, which is the whole difference
 * between "we looked" and "we ran".
 */
export function whyNot(effect: CatalystEffect, coverage: Coverage): WhyNotVerdict {
  const objections: Objection[] = [];

  if (effect.priceCapped) {
    objections.push({
      axis: 'PRICE_CAPPED',
      basis: null,
      // A cash price in announced terms binds now, by contract, whatever the
      // catalyst's own horizon says.
      bearing: 'ON_THIS_TRADE',
      believed: false,
      measurement: null,
    });
  }
  if (effect.bringsSupply === 'POSITIVE') {
    objections.push(objectionFrom('SUPPLY', effect.supplyBasis, effect));
  }
  if (effect.bringsDemand === 'NEGATIVE') {
    objections.push(objectionFrom('DEMAND', effect.demandBasis, effect));
  }

  const unresolved = [deafReasonFor(effect.supplyBasis), deafReasonFor(effect.demandBasis)].filter(
    (reason): reason is DeafReason => reason !== null,
  );

  if (objections.length > 0) {
    return { kind: 'OBJECTION', objections: orderObjections(objections), unresolved };
  }

  if (coverage.sourceCount === 0) {
    return { kind: 'NOTHING_COLLECTED', reasons: ['NO_SOURCES'], coverage };
  }
  if (unresolved.length > 0) {
    return { kind: 'NOTHING_COLLECTED', reasons: unresolved, coverage };
  }

  return { kind: 'NO_OBJECTION_FOUND', coverage };
}
