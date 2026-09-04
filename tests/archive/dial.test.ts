/**
 * The dial's candidates, and the decisions that stop one flattering a session.
 *
 * These pin design choices the pre-registration fixed in advance, not
 * arithmetic. Most of them exist because the failure mode for a state indicator
 * is that it always looks plausible — so each guard is a way the measure can
 * read WRONG, which is the only thing that makes it falsifiable.
 */

import { describe, expect, it } from 'vitest';

import {
  breadth,
  criticalR,
  dispersion,
  partial,
  pearson,
  roundTripRatio,
  sessionsNeeded,
  shapeOf,
  topByGap,
  type NameShape,
} from '@/lib/archive/dial';

function shape(over: Partial<NameShape> = {}): NameShape {
  return { symbol: 'AAAA', excursion: 0.1, net: 0.1, gap: 0.5, ...over };
}

describe('shapeOf', () => {
  it('refuses a name with no reference close rather than dividing by it', () => {
    expect(shapeOf({ symbol: 'A', open: 1, high: 2, close: 1.5, referenceClose: 0 })).toBeNull();
  });

  it('separates what a name reached from what it kept', () => {
    const s = shapeOf({ symbol: 'A', open: 1, high: 2, close: 1.2, referenceClose: 0.5 });
    expect(s?.excursion).toBeCloseTo(1.0, 6);
    expect(s?.net).toBeCloseTo(0.2, 6);
    expect(s?.gap).toBeCloseTo(1.4, 6);
  });
});

describe('topByGap', () => {
  it('ranks on the gap he can see, and takes the largest', () => {
    const xs = [shape({ symbol: 'L', gap: 0.1 }), shape({ symbol: 'H', gap: 0.9 })];
    expect(topByGap(xs, 1).map((x) => x.symbol)).toEqual(['H']);
  });
});

describe('roundTripRatio', () => {
  it('reads ~0 when names keep what they made and ~1 when they give it all back', () => {
    const held = [shape({ excursion: 0.5, net: 0.5 }), shape({ excursion: 0.3, net: 0.3 })];
    expect(roundTripRatio(held)).toBeCloseTo(0, 6);

    const faded = [shape({ excursion: 0.5, net: 0 }), shape({ excursion: 0.3, net: 0 })];
    expect(roundTripRatio(faded)).toBeCloseTo(1, 6);
  });

  it('floors a negative net rather than subtracting it', () => {
    /*
     * A name closing below its open kept NONE of its excursion -- it did not
     * keep a negative amount. Letting it go negative pushes the aggregate above
     * 1 and the measure reads as "more than everything given back", which is not
     * a state, it is an artefact.
     */
    const collapsed = [shape({ excursion: 0.5, net: -2 })];
    expect(roundTripRatio(collapsed)).toBe(1);
    expect(roundTripRatio(collapsed) as number).toBeLessThanOrEqual(1);
  });

  it('returns null when nothing moved, never zero', () => {
    // Zero would read as a perfectly trending session. No observation and a calm
    // session must not share a value.
    expect(roundTripRatio([shape({ excursion: 0, net: 0 })])).toBeNull();
  });
});

describe('breadth', () => {
  it('excludes a name that never moved rather than counting it as holding', () => {
    // Otherwise a dead session reads as broad, which is the exact inversion.
    const xs = [shape({ excursion: 0, net: 0 }), shape({ excursion: 0.4, net: 0.4 })];
    expect(breadth(xs)).toBe(1);
    expect(breadth([shape({ excursion: 0, net: 0 })])).toBeNull();
  });

  it('needs half the move kept, not any gain at all', () => {
    const xs = [shape({ excursion: 1, net: 0.49 }), shape({ excursion: 1, net: 0.5 })];
    expect(breadth(xs)).toBe(0.5);
  });
});

describe('dispersion', () => {
  it('cannot tell a choppy session from a trending one, which is why it is third', () => {
    /*
     * THE REASON FOR THE REGISTERED ORDER. Both sets have identical dispersion;
     * one kept everything and one gave it all back. Dispersion measures how
     * DIFFERENTLY names behaved, his complaint is how DURABLY -- and round-trip
     * separates these two while dispersion cannot.
     */
    const trending = [shape({ excursion: 0.2, net: 0.2 }), shape({ excursion: 0.4, net: 0.4 })];
    const choppy = [shape({ excursion: 1.0, net: 0.2 }), shape({ excursion: 1.4, net: 0.4 })];
    expect(dispersion(trending)).toBeCloseTo(dispersion(choppy) as number, 12);
    expect(roundTripRatio(trending)).not.toBeCloseTo(roundTripRatio(choppy) as number, 2);
  });
});

describe('partial correlation', () => {
  it('strips a shared trend that would otherwise manufacture a relationship', () => {
    /*
     * The control the pre-registration made mandatory. x and y here are both
     * pure functions of z and have NOTHING to do with each other -- raw
     * correlation is a perfect 1, and the partial sees through it.
     *
     * Movers decline across the window while the board grows, so this is not
     * hypothetical: any state variable that trends gets this for free.
     */
    const z = [0, 1, 2, 3, 4, 5];
    const x = z.map((v) => 2 * v);
    const y = z.map((v) => 5 - v);
    expect(Math.abs(pearson(x, y) as number)).toBeCloseTo(1, 6);
    expect(partial(x, y, z)).toBeNull();
  });

  it('leaves a genuine relationship standing', () => {
    const z = [0, 1, 2, 3, 4, 5, 6, 7];
    const x = [1, 3, 2, 5, 4, 7, 6, 8];
    const y = [2, 6, 4, 9, 8, 13, 12, 15];
    expect(Math.abs(partial(x, y, z) as number)).toBeGreaterThan(0.8);
  });
});

describe('the power floor', () => {
  it('states the bar this study could not clear', () => {
    expect(criticalR(13)).toBeCloseTo(0.553, 3);
  });

  it('gets harder to clear as the sample shrinks', () => {
    expect(criticalR(13) as number).toBeGreaterThan(criticalR(30) as number);
  });

  it('turns an undetectable result into a sample size, which is the null deliverable', () => {
    // A null that says how many sessions would settle it is an answer; one that
    // says "no relationship" from 13 points is a claim the data cannot support.
    expect(sessionsNeeded(0.544)).toBeLessThan(20);
    expect(sessionsNeeded(0.356) as number).toBeGreaterThan(25);
  });
});
