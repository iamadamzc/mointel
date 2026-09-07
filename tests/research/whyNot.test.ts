import { describe, expect, it } from 'vitest';

import { validateCatalystEffect, type CatalystEffect } from '@/lib/research/effect';
import {
  buildCoverage,
  orderObjections,
  whyNot,
  type Coverage,
  type CoverageSource,
  type Objection,
} from '@/lib/research/whyNot';

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

const covered: Coverage = {
  sourceCount: 12,
  nonSecSourceCount: 4,
  newestPublishedAt: '2026-09-04',
  lastFetchedAt: '2026-09-04T12:00:00Z',
  lookedThisSession: true,
};
const deaf: Coverage = {
  sourceCount: 0,
  nonSecSourceCount: 0,
  newestPublishedAt: null,
  lastFetchedAt: null,
  lookedThisSession: false,
};

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

describe('coverage is scoped to the session, because otherwise the verdict is not', () => {
  const source = (over: Partial<CoverageSource> = {}): CoverageSource => ({
    sourceType: 'SEC_FILING',
    publishedAt: '2026-09-01',
    fetchedAt: '2026-09-04T15:00:00Z',
    ...over,
  });

  it('separates a name looked at today from one carrying an older collection', () => {
    /*
     * `research_sources` has NO TRADING DATE, so a name holds rows from any
     * session's job. Without this the third verdict inherits the exact
     * ambiguity it exists to remove: a name reads freshly covered when nothing
     * looked at it today.
     */
    const today = buildCoverage([source()], '2026-09-04');
    const stale = buildCoverage([source({ fetchedAt: '2026-08-20T15:00:00Z' })], '2026-09-04');

    expect(today.lookedThisSession).toBe(true);
    expect(stale.lookedThisSession).toBe(false);
    // Both still count as coverage. The question is WHEN, not WHETHER.
    expect(stale.sourceCount).toBe(1);
  });

  it('counts the whole session, including the 02:00 ET roll', () => {
    /*
     * WRITTEN THE OTHER WAY ROUND FIRST, AND THIS TEST CORRECTED IT. I claimed
     * a roll-time fetch would land on the previous ET date and be missed;
     * 06:00Z is 02:00 ET on the SAME day, so it counts. The docstring said
     * otherwise until this assertion ran.
     */
    const roll = buildCoverage([source({ fetchedAt: '2026-09-04T06:00:00Z' })], '2026-09-04');
    expect(roll.lookedThisSession).toBe(true);
  });

  it('misses only work running past midnight ET, and that direction is safe', () => {
    /*
     * 00:30 ET on the following day belongs to the session that just ended and
     * is not counted for it. THE ERROR CAN ONLY PUSH A NAME TOWARD
     * NOTHING_COLLECTED, never toward looking cleared — the only safe direction
     * for a verdict about whether anyone looked.
     */
    const after = buildCoverage([source({ fetchedAt: '2026-09-05T04:30:00Z' })], '2026-09-04');
    expect(after.lookedThisSession).toBe(false);
  });

  it('counts non-SEC sources separately, because SEC-only is blind to a release', () => {
    const coverage = buildCoverage(
      [source(), source({ sourceType: 'SEC_EXHIBIT' }), source({ sourceType: 'NEWSWIRE' })],
      '2026-09-04',
    );

    expect(coverage.sourceCount).toBe(3);
    expect(coverage.nonSecSourceCount).toBe(1);
  });

  it('takes the newest publication and the newest fetch independently', () => {
    // Old evidence fetched today, and fresh evidence fetched long ago, are
    // different situations and neither number stands for the other.
    const coverage = buildCoverage(
      [
        source({ publishedAt: '2024-01-05', fetchedAt: '2026-09-04T15:00:00Z' }),
        source({ publishedAt: '2026-09-03', fetchedAt: '2026-08-01T15:00:00Z' }),
      ],
      '2026-09-04',
    );

    expect(coverage.newestPublishedAt).toBe('2026-09-03');
    expect(coverage.lastFetchedAt).toBe('2026-09-04T15:00:00Z');
  });

  it('reports nothing rather than throwing on an empty set', () => {
    const coverage = buildCoverage([], '2026-09-04');
    expect(coverage).toEqual({
      sourceCount: 0,
      nonSecSourceCount: 0,
      newestPublishedAt: null,
      lastFetchedAt: null,
      lookedThisSession: false,
    });
  });
});
