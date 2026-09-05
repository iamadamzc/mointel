import { describe, expect, it } from 'vitest';

import {
  EFFECT_RULES,
  isInferred,
  measurementFor,
  validateCatalystEffect,
  type CatalystEffect,
} from '@/lib/research/effect';

/**
 * Which side of the book an event brings.
 *
 * The residue against 83 accepted catalysts was ZERO, which is a warning rather
 * than a result: two signed axes with a `NONE` value absorb anything. **The
 * discriminating constraint is the mandatory basis, not the axes** — so these
 * pin the basis rules far harder than they pin the classification.
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

describe('UNDETERMINED is a side, not a flag beside the sides', () => {
  it('keeps an undetermined axis distinct from a genuinely empty one', () => {
    /*
     * The deciding case. A governance item — a General Counsel replaced — has
     * NO book effect, and a results release whose numbers are not in evidence
     * has an UNKNOWABLE one. With a boolean both read `NONE`, and every
     * consumer switching on the side gets a false answer for the second.
     */
    const governance = effect({ bringsSupply: 'NONE' });
    const unreadable = effect({
      bringsSupply: 'UNDETERMINED',
      supplyBasis: { kind: 'UNDETERMINED', reason: 'CONTENT_NOT_IN_EVIDENCE' },
    });

    expect(governance.bringsSupply).toBe('NONE');
    expect(unreadable.bringsSupply).toBe('UNDETERMINED');
    expect(governance.bringsSupply).not.toBe(unreadable.bringsSupply);
  });

  it('lets ONE axis be undetermined while the other is known', () => {
    /*
     * A stock-for-stock acquisition of undisclosed size: supply POSITIVE
     * observed, demand UNDETERMINED. Real, and a single flag cannot say it —
     * which is why the value is per-axis.
     */
    const result = effect({
      bringsSupply: 'POSITIVE',
      supplyBasis: { kind: 'OBSERVED', sourceIds: [11] },
      bringsDemand: 'UNDETERMINED',
      demandBasis: { kind: 'UNDETERMINED', reason: 'CONTENT_NOT_IN_EVIDENCE' },
    });

    expect(result.bringsSupply).toBe('POSITIVE');
    expect(result.bringsDemand).toBe('UNDETERMINED');
  });

  it('carries the reason, because a blank one is the same collapse a level down', () => {
    const missing = effect({ bringsDemand: 'UNDETERMINED', demandBasis: { kind: 'UNDETERMINED' } });
    expect(missing.demandBasis).toEqual({
      kind: 'UNDETERMINED',
      reason: 'CONTENT_NOT_IN_EVIDENCE',
    });
  });

  it('has a reason for a side that was never searched', () => {
    // The SEC-only case: no supply event in the filings, demand news not looked
    // for. Directional, not incomplete.
    const result = effect({
      bringsDemand: 'UNDETERMINED',
      demandBasis: { kind: 'UNDETERMINED', reason: 'NOT_SEARCHED' },
    });
    expect(result.demandBasis).toEqual({ kind: 'UNDETERMINED', reason: 'NOT_SEARCHED' });
  });
});

describe('the basis is the discriminator, so it is mandatory', () => {
  it('refuses a claimed side with no basis at all', () => {
    // If a side can be set on a hunch the axes are decorative.
    const result = effect({ bringsSupply: 'POSITIVE', supplyBasis: null });
    expect(result.bringsSupply).toBe('UNDETERMINED');
  });

  it('refuses an OBSERVED basis citing nothing', () => {
    // A claim with no source id is a claim the model could only assert.
    const result = effect({
      bringsSupply: 'POSITIVE',
      supplyBasis: { kind: 'OBSERVED', sourceIds: [] },
    });
    expect(result.bringsSupply).toBe('UNDETERMINED');
  });

  it('allows NONE with no basis, because nothing was claimed', () => {
    expect(effect({ bringsDemand: 'NONE', demandBasis: null }).bringsDemand).toBe('NONE');
  });
});

describe('the rule list is closed, and it rejects the FIELD not the catalyst', () => {
  it('degrades an invented rule to UNDETERMINED and says why', () => {
    /*
     * A quality filter that DISCARDS what it cannot parse thereby favours
     * unparseable input — this desk has shipped that version before. The
     * catalyst survives; the axis does not.
     */
    const result = effect({
      bringsSupply: 'POSITIVE',
      supplyBasis: { kind: 'INFERRED', rule: 'VIBES', sourceIds: [3] },
      bringsDemand: 'POSITIVE',
      demandBasis: { kind: 'OBSERVED', sourceIds: [4] },
    });

    expect(result.bringsSupply).toBe('UNDETERMINED');
    expect(result.supplyBasis).toEqual({ kind: 'UNDETERMINED', reason: 'UNRECOGNISED_RULE' });
    // And the rest of the effect is untouched.
    expect(result.bringsDemand).toBe('POSITIVE');
  });

  it('refuses a rule that does not license the side it was attached to', () => {
    // A split rule cannot justify a demand verdict, or the list does no work.
    const result = effect({
      bringsDemand: 'POSITIVE',
      demandBasis: { kind: 'INFERRED', rule: 'REVERSE_SPLIT_1ST', sourceIds: [5] },
    });

    expect(result.bringsDemand).toBe('UNDETERMINED');
    expect(result.demandBasis).toEqual({
      kind: 'UNDETERMINED',
      reason: 'RULE_DIRECTION_MISMATCH',
    });
  });

  it('accepts a rule on the side it does license', () => {
    const result = effect({
      bringsSupply: 'POSITIVE',
      supplyBasis: { kind: 'INFERRED', rule: 'FILING_FAILURE', sourceIds: [6] },
    });
    expect(result.bringsSupply).toBe('POSITIVE');
    expect(isInferred(result.supplyBasis)).toBe(true);
  });
});

describe('a rule without a number must not render as a finding', () => {
  it('reports no measurement for the two that have none', () => {
    for (const rule of ['FILING_FAILURE', 'COMPLIANCE_RESTORED'] as const) {
      expect(EFFECT_RULES[rule].measured, rule).toBeNull();
    }
  });

  it('reports the measurement, and its proxy, for the one that has one', () => {
    const measured = EFFECT_RULES.REVERSE_SPLIT_1ST.measured;
    expect(measured).toContain('1.65x');
    // The proxy is named in the same breath as the number, so the number cannot
    // travel without it.
    expect(measured).toContain('proxy');
  });

  it('surfaces the measurement from a basis, so a renderer need not look it up', () => {
    const result = effect({
      bringsDemand: 'POSITIVE',
      demandBasis: { kind: 'INFERRED', rule: 'COMPLIANCE_RESTORED', sourceIds: [7] },
    });
    expect(measurementFor(result.demandBasis)).toBeNull();
    expect(isInferred(result.demandBasis)).toBe(true);
  });
});

describe('an uncounted split is not a first split', () => {
  it('offers a rule for a count nobody has measured', () => {
    /*
     * `_1ST` asserts a count the census has not taken, so a repeat offender
     * would be labelled "first" — the precise error on the precise names he
     * asked about. Until the census runs, UNCOUNTED is the only one available.
     */
    expect(EFFECT_RULES.REVERSE_SPLIT_UNCOUNTED).toBeDefined();
    expect(EFFECT_RULES.REVERSE_SPLIT_UNCOUNTED.measured).toBeNull();
  });

  it('keeps the counted rules distinct from it and from each other', () => {
    // The count is part of the LABEL rather than a footnote beside it: one
    // split is a compliance problem, three is a business model.
    expect(EFFECT_RULES.REVERSE_SPLIT_1ST).not.toEqual(EFFECT_RULES.REVERSE_SPLIT_UNCOUNTED);
    expect(EFFECT_RULES.REVERSE_SPLIT_REPEAT.measured).toContain('UNMEASURED');
  });
});

describe('a cap is not a side', () => {
  it('records an announced cash price without calling it demand', () => {
    /*
     * A cash merger does not bring buyers — it ENDS PRICE DISCOVERY. The stock
     * walks to the deal price and stops, which for a momentum trader is the
     * strongest possible avoid, so a demand-positive verdict would be
     * dangerous.
     */
    const result = effect({
      bringsDemand: 'NONE',
      priceCapped: { at: 7.4, source: 'ANNOUNCED_TERMS' },
    });

    expect(result.priceCapped).toEqual({ at: 7.4, source: 'ANNOUNCED_TERMS' });
    expect(result.bringsDemand).toBe('NONE');
  });

  it('refuses a cap from any source but the announced terms', () => {
    expect(effect({ priceCapped: { at: 7.4, source: 'GUESS' } }).priceCapped).toBeNull();
  });
});

describe('time to effect defaults to UNKNOWN rather than to soon', () => {
  it('keeps a recognised horizon and refuses an invented one', () => {
    expect(effect({ timeToEffect: 'NOW' }).timeToEffect).toBe('NOW');
    expect(effect({ timeToEffect: 'SOONISH' }).timeToEffect).toBe('UNKNOWN');
  });
});
