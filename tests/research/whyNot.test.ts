import { describe, expect, it } from 'vitest';

import { validateCatalystEffect, type CatalystEffect } from '@/lib/research/effect';
import { whyNot, orderObjections, type Coverage, type Objection } from '@/lib/research/whyNot';

/**
 * The Why Not Report's verdict.
 *
 * The deciding property is not that objections are found — the taxonomy already
 * does that. It is that **A NAME NOBODY LOOKED AT NEVER READS LIKE A NAME THAT
 * CAME BACK CLEAN**. So these pin the third verdict far harder than the first.
 */

const effect = (over: Partial<Record<keyof CatalystEffect, unknown>> = {}) =>
  validateCatalystEffect({
    bringsDemand: 'NONE',
    bringsSupply: 'NONE',
    demandBasis: null,
    supplyBasis: null,
    priceCapped: null,
    timeToEffect: 'UNKNOWN',
    ...over,
  });

const covered: Coverage = { sourceCount: 12, nonSecSourceCount: 4, newestSourceAt: '2026-09-04' };
const deaf: Coverage = { sourceCount: 0, nonSecSourceCount: 0, newestSourceAt: null };

describe('the third verdict is the opposite of the second, not a weaker one', () => {
  it('separates a name that came back clean from a name nobody looked at', () => {
    /*
     * THE WHOLE PRODUCT, IN ONE ASSERTION. Both names produced no objection.
     * One was searched; the other has no sources at all. Collapsed into a
     * boolean they are both "no reason not to" — and for the second that reads
     * as *there is nothing wrong with this stock*, which nobody established.
     */
    const looked = whyNot(effect(), covered);
    const blind = whyNot(effect(), deaf);

    expect(looked.kind).toBe('NO_OBJECTION_FOUND');
    expect(blind.kind).toBe('NOTHING_COLLECTED');
    expect(looked.kind).not.toBe(blind.kind);
  });

  it('refuses to clear a name whose side was never searched, even with sources', () => {
    /*
     * The SEC-only case, and it is the common one: filings collected, no
     * newswire, so a demand event could not have been seen. Sources exist, the
     * count looks healthy, AND THE NAME HAS NOT BEEN CLEARED.
     */
    const result = whyNot(
      effect({
        bringsDemand: 'UNDETERMINED',
        demandBasis: { kind: 'UNDETERMINED', reason: 'NOT_SEARCHED' },
      }),
      covered,
    );

    expect(result.kind).toBe('NOTHING_COLLECTED');
    if (result.kind === 'NOTHING_COLLECTED') {
      expect(result.reasons).toContain('SIDE_NOT_SEARCHED');
      // And the coverage travels with it, so the reader can see it was not zero.
      expect(result.coverage.sourceCount).toBe(12);
    }
  });

  it('carries how hard it looked, because that is what it can honestly say', () => {
    const result = whyNot(effect(), covered);
    expect(result.kind === 'NO_OBJECTION_FOUND' && result.coverage.nonSecSourceCount).toBe(4);
  });

  it('never returns anything that reads as approval', () => {
    // There is no CLEAR, no PASS and no OK. A reader cannot obtain one by
    // negation either: the second verdict is a statement about the SEARCH.
    const kinds = [whyNot(effect(), covered).kind, whyNot(effect(), deaf).kind];
    for (const kind of kinds) {
      expect(kind).not.toMatch(/CLEAR|PASS|OK|GOOD|APPROV/i);
    }
  });
});

describe('an objection is reported on partial evidence, and says it is partial', () => {
  it('reports a found objection while naming the axis it could not resolve', () => {
    /*
     * A confirmed fact does not become less true because something else is
     * unknown — but an objection does not license silence about the rest, so
     * the unresolved axis travels with it.
     */
    const result = whyNot(
      effect({
        bringsSupply: 'POSITIVE',
        supplyBasis: { kind: 'OBSERVED', sourceIds: [11] },
        bringsDemand: 'UNDETERMINED',
        demandBasis: { kind: 'UNDETERMINED', reason: 'NOT_SEARCHED' },
      }),
      covered,
    );

    expect(result.kind).toBe('OBJECTION');
    if (result.kind === 'OBJECTION') {
      expect(result.objections).toHaveLength(1);
      expect(result.unresolved).toContain('SIDE_NOT_SEARCHED');
    }
  });

  it('marks a rule the desk believes rather than has measured', () => {
    /*
     * `FILING_FAILURE` carries `measured: null`. It must not render in the same
     * shape as an observed fact — printing a belief beside a measurement is how
     * a vendor's N/A becomes a number.
     */
    const result = whyNot(
      effect({
        bringsSupply: 'POSITIVE',
        supplyBasis: { kind: 'INFERRED', rule: 'FILING_FAILURE', sourceIds: [6] },
      }),
      covered,
    );

    expect(result.kind === 'OBJECTION' && result.objections[0]?.believed).toBe(true);
    expect(result.kind === 'OBJECTION' && result.objections[0]?.measurement).toBeNull();
  });

  it('carries the measurement where one exists, so it cannot travel without it', () => {
    const result = whyNot(
      effect({
        bringsSupply: 'POSITIVE',
        supplyBasis: { kind: 'INFERRED', rule: 'REVERSE_SPLIT_1ST', sourceIds: [5] },
      }),
      covered,
    );

    expect(result.kind === 'OBJECTION' && result.objections[0]?.believed).toBe(false);
    expect(result.kind === 'OBJECTION' && result.objections[0]?.measurement).toContain('1.65x');
  });
});

describe('severity is derived from timeToEffect, not from a scale someone picked', () => {
  it('separates what reaches this trade from what describes the company', () => {
    /*
     * He holds for seconds. A priced offering arriving NOW touches the price he
     * is about to pay; a shelf whose supply is weeks away does not, and a
     * report that ranks them alike is ignored like a marker that fires every
     * morning.
     */
    const now = whyNot(
      effect({
        bringsSupply: 'POSITIVE',
        supplyBasis: { kind: 'OBSERVED', sourceIds: [1] },
        timeToEffect: 'NOW',
      }),
      covered,
    );
    const later = whyNot(
      effect({
        bringsSupply: 'POSITIVE',
        supplyBasis: { kind: 'OBSERVED', sourceIds: [1] },
        timeToEffect: 'WEEKS',
      }),
      covered,
    );

    expect(now.kind === 'OBJECTION' && now.objections[0]?.bearing).toBe('ON_THIS_TRADE');
    expect(later.kind === 'OBJECTION' && later.objections[0]?.bearing).toBe('ON_THE_COMPANY');
  });

  it('leaves an unknown horizon UNDETERMINED rather than defaulting to either side', () => {
    // A horizon nobody established is not a horizon of weeks, and it is not
    // now. Defaulting either way is an absence borrowing a value.
    const result = whyNot(
      effect({ bringsSupply: 'POSITIVE', supplyBasis: { kind: 'OBSERVED', sourceIds: [1] } }),
      covered,
    );
    expect(result.kind === 'OBJECTION' && result.objections[0]?.bearing).toBe('UNDETERMINED');
  });
});

describe('the cap outranks everything, because it ends price discovery', () => {
  it('reports an announced cash price as the first objection', () => {
    const result = whyNot(
      effect({
        priceCapped: { at: 7.4, source: 'ANNOUNCED_TERMS' },
        bringsSupply: 'POSITIVE',
        supplyBasis: { kind: 'OBSERVED', sourceIds: [2] },
        timeToEffect: 'NOW',
      }),
      covered,
    );

    expect(result.kind === 'OBJECTION' && result.objections[0]?.axis).toBe('PRICE_CAPPED');
  });

  it('orders an observed fact ahead of a rule the desk believes', () => {
    const believed: Objection = {
      axis: 'SUPPLY',
      basis: null,
      bearing: 'ON_THIS_TRADE',
      believed: true,
      measurement: null,
    };
    const observed: Objection = { ...believed, believed: false };

    expect(orderObjections([believed, observed])[0]).toBe(observed);
  });
});
