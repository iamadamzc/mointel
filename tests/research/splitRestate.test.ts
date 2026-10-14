import { describe, expect, it } from 'vitest';

import { restateCount, restateSpan, type AnnouncedAction, type SpanRestatement } from '@/lib/research/splitRestate';
import type { SpanBar } from '@/lib/research/splitProof';

/**
 * L6 steps 2 and 3. Plan: docs/research/float-options/split-restate-build-plan-2026-10-14.md (0719a53b); rules R1 to
 * R4 from Commercial's read 98, the 1 percent agreement from read 104. Every refusal sits beside its unrefused control.
 * Mutants and predicted kill counts: docs/research/float-options/l6-restate-mutants.md.
 */

const FROM = '2026-06-30'; // the count's as-of date
const D = '2026-10-14'; // the checkpoint; 9 months before it is 2026-01-14

function act(exDate: string, oldRate: number | null, newRate: number | null, group = 'reverse_splits'): AnnouncedAction {
  return { group, exDate, oldRate, newRate };
}

function span(actions: readonly AnnouncedAction[], extra: { from?: string; filed?: string | null; d?: string } = {}): SpanRestatement {
  return restateSpan(actions, { from: extra.from ?? FROM, to: D, filed: extra.filed, d: extra.d ?? D });
}

/** A 1-for-10 reverse split as Alpaca lists it: old 10, new 1 (price side). */
const REVERSE_1_FOR_10 = act('2026-08-03', 10, 1);
/** A 2-for-1 forward split: old 1, new 2. */
const FORWARD_2_FOR_1 = act('2026-09-01', 1, 2, 'forward_splits');

describe('restateSpan (step 2)', () => {
  it('reads NONE_LISTED for an empty list', () => {
    expect(span([])).toEqual({ kind: 'NONE_LISTED' });
  });

  it('ignores actions outside (from, to], of any group; control: the same split inside restates', () => {
    const outside = [act('2026-06-29', 10, 1), act('2026-10-15', 10, 1), act('2026-06-01', null, null, 'stock_dividends'), act('2026-10-20', null, null, 'spin_offs')];
    expect(span(outside)).toEqual({ kind: 'NONE_LISTED' });
    expect(span([...outside, act('2026-07-15', 10, 1)])).toEqual({ kind: 'RESTATE', factor: 0.1, splits: [{ exDate: '2026-07-15', oldRate: 10, newRate: 1 }] });
  });

  it('R4 orientation: a 1-for-10 reverse gives factor 0.1, a 2-for-1 forward gives factor 2 (shares side)', () => {
    expect(span([REVERSE_1_FOR_10])).toEqual({ kind: 'RESTATE', factor: 0.1, splits: [{ exDate: '2026-08-03', oldRate: 10, newRate: 1 }] });
    expect(span([FORWARD_2_FOR_1])).toEqual({ kind: 'RESTATE', factor: 2, splits: [{ exDate: '2026-09-01', oldRate: 1, newRate: 2 }] });
  });

  it('composes two splits as a product, listed oldest first whatever the input order', () => {
    const result = span([FORWARD_2_FOR_1, REVERSE_1_FOR_10]);
    expect(result.kind).toBe('RESTATE');
    if (result.kind !== 'RESTATE') return;
    expect(result.factor).toBeCloseTo(0.2, 12);
    expect(result.splits.map((s) => s.exDate)).toEqual(['2026-08-03', '2026-09-01']);
  });

  it('counts an ex-date ON `to` as inside the span', () => {
    expect(span([act(D, 10, 1)])).toEqual({ kind: 'RESTATE', factor: 0.1, splits: [{ exDate: D, oldRate: 10, newRate: 1 }] });
  });

  it('refuses an ex-date ON `from` (EX_DATE_ON_FROM); control: the day after restates', () => {
    expect(span([act(FROM, 10, 1)])).toEqual({ kind: 'REFUSE', why: 'EX_DATE_ON_FROM' });
    expect(span([act('2026-07-01', 10, 1)]).kind).toBe('RESTATE');
  });

  it('refuses a non-split action ON `from` too (the figure\'s units are unknown); control: before `from` is ignored', () => {
    expect(span([act(FROM, null, null, 'stock_dividends'), REVERSE_1_FOR_10])).toEqual({ kind: 'REFUSE', why: 'EX_DATE_ON_FROM' });
    expect(span([act('2026-06-29', null, null, 'stock_dividends'), REVERSE_1_FOR_10]).kind).toBe('RESTATE');
  });

  it('R2: a stock dividend in the span refuses (NON_SPLIT_ACTION); control: one outside the span does not', () => {
    expect(span([act('2026-07-20', null, null, 'stock_dividends'), REVERSE_1_FOR_10])).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
    expect(span([act('2026-10-15', null, null, 'stock_dividends'), REVERSE_1_FOR_10]).kind).toBe('RESTATE');
  });

  it('R2: a non-split action alone in the span refuses, never reads NONE_LISTED', () => {
    expect(span([act('2026-07-20', 1, 1.05, 'stock_dividends')])).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
  });

  it('R2: every other Alpaca group refuses (unit split, mergers, spin-off), and a singular group name is not a split', () => {
    for (const group of ['unit_splits', 'stock_mergers', 'stock_and_cash_mergers', 'spin_offs', 'reverse_split', 'forward_split']) {
      expect(span([act('2026-07-20', 10, 1, group)])).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
    }
    expect(span([act('2026-07-20', 10, 1, 'reverse_splits')]).kind).toBe('RESTATE');
    expect(span([act('2026-07-20', 1, 10, 'forward_splits')]).kind).toBe('RESTATE');
  });

  it('refuses a split without both rates (RATELESS_SPLIT); control: with both rates it restates', () => {
    expect(span([act('2026-08-03', null, 1)])).toEqual({ kind: 'REFUSE', why: 'RATELESS_SPLIT' });
    expect(span([act('2026-08-03', 10, null)])).toEqual({ kind: 'REFUSE', why: 'RATELESS_SPLIT' });
    expect(span([act('2026-08-03', 10, 0)])).toEqual({ kind: 'REFUSE', why: 'RATELESS_SPLIT' });
    expect(span([act('2026-08-03', 10, 1)]).kind).toBe('RESTATE');
  });

  it('the 9-month cutoff: ex-date ON the cutoff restates, the day before refuses (OLDER_THAN_CUTOFF)', () => {
    const from = '2025-12-31';
    expect(span([act('2026-01-14', 10, 1)], { from })).toEqual({ kind: 'RESTATE', factor: 0.1, splits: [{ exDate: '2026-01-14', oldRate: 10, newRate: 1 }] });
    expect(span([act('2026-01-13', 10, 1)], { from })).toEqual({ kind: 'REFUSE', why: 'OLDER_THAN_CUTOFF' });
  });

  it('the cutoff clamps to the month end (2026-11-30 minus 9 months is 2026-02-28)', () => {
    const from = '2026-01-31';
    expect(span([act('2026-02-28', 10, 1)], { from, d: '2026-11-30' }).kind).toBe('RESTATE');
    expect(span([act('2026-02-27', 10, 1)], { from, d: '2026-11-30' })).toEqual({ kind: 'REFUSE', why: 'OLDER_THAN_CUTOFF' });
  });

  it('a malformed `d` admits no split (OLDER_THAN_CUTOFF); control: the well-formed date restates', () => {
    expect(span([REVERSE_1_FOR_10], { d: '14/10/2026' })).toEqual({ kind: 'REFUSE', why: 'OLDER_THAN_CUTOFF' });
    expect(span([REVERSE_1_FOR_10], { d: D }).kind).toBe('RESTATE');
  });

  it('R3: a figure FILED on or after the ex-date refuses (FILED_AFTER_EX_DATE); control: filed before it, or no filing date, restates', () => {
    expect(span([REVERSE_1_FOR_10], { filed: '2026-08-15' })).toEqual({ kind: 'REFUSE', why: 'FILED_AFTER_EX_DATE' });
    expect(span([REVERSE_1_FOR_10], { filed: '2026-08-03' })).toEqual({ kind: 'REFUSE', why: 'FILED_AFTER_EX_DATE' });
    expect(span([REVERSE_1_FOR_10], { filed: '2026-08-02' }).kind).toBe('RESTATE');
    expect(span([REVERSE_1_FOR_10], { filed: null }).kind).toBe('RESTATE');
    expect(span([REVERSE_1_FOR_10]).kind).toBe('RESTATE');
  });

  it('refusal precedence is fixed and independent of list order', () => {
    const nonSplit = act('2026-07-20', null, null, 'stock_dividends');
    const onFrom = act(FROM, 10, 1);
    const rateless = act('2026-07-25', null, null);
    const older = act('2026-01-10', 10, 1);
    const filedAfter = act('2026-08-03', 10, 1);
    const options = { from: '2025-12-31', filed: '2026-08-10' };
    // `older` is in the span only with from 2025-12-31; `onFrom` must then sit on that from.
    const onThatFrom = act('2025-12-31', 10, 1);
    const all = [filedAfter, older, rateless, onThatFrom, nonSplit];
    expect(span(all, options)).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
    expect(span([...all].reverse(), options)).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
    expect(span([filedAfter, older, rateless, onThatFrom], options)).toEqual({ kind: 'REFUSE', why: 'EX_DATE_ON_FROM' });
    expect(span([filedAfter, older, rateless], options)).toEqual({ kind: 'REFUSE', why: 'RATELESS_SPLIT' });
    expect(span([filedAfter, older], options)).toEqual({ kind: 'REFUSE', why: 'OLDER_THAN_CUTOFF' });
    expect(span([filedAfter], options)).toEqual({ kind: 'REFUSE', why: 'FILED_AFTER_EX_DATE' });
    expect(span([onFrom]).kind).toBe('REFUSE');
  });
});

const BAR_DATES = ['2026-06-30', '2026-07-31', '2026-08-03', '2026-09-01', '2026-09-30', D];

/** Bars oldest first from the count's date through D, one per factor given. */
function bars(factors: ReadonlyArray<number | null>): SpanBar[] {
  return factors.map((factor, i) => ({ date: BAR_DATES[i] ?? D, close: 1, factor }));
}

describe('restateCount (step 3)', () => {
  const reverse = span([REVERSE_1_FOR_10]); // factor 0.1, price step 10
  const forward = span([FORWARD_2_FOR_1]); // factor 2, price step 0.5

  it('nothing listed and bars NONE is today\'s path (AS_TODAY)', () => {
    expect(restateCount({ kind: 'NONE_LISTED' }, 'NONE', bars([1, 1, 1]))).toEqual({ kind: 'AS_TODAY' });
  });

  it('R1: nothing listed with bars UNPROVEN or FOUND refuses (an empty list is not NONE); control: bars NONE', () => {
    expect(restateCount({ kind: 'NONE_LISTED' }, 'UNPROVEN', bars([1, null, 1]))).toEqual({ kind: 'REFUSE', why: 'EMPTY_LIST_BARS_NOT_NONE' });
    expect(restateCount({ kind: 'NONE_LISTED' }, 'FOUND', bars([10, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'EMPTY_LIST_BARS_NOT_NONE' });
    expect(restateCount({ kind: 'NONE_LISTED' }, 'NONE', bars([1, 1, 1]))).toEqual({ kind: 'AS_TODAY' });
  });

  it('a listed refusal keeps its reason whatever the bars say; control: the same span without it restates', () => {
    const refused = span([act('2026-07-20', null, null, 'stock_dividends'), REVERSE_1_FOR_10]);
    expect(restateCount(refused, 'FOUND', bars([10, 10, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
    expect(restateCount(refused, 'UNPROVEN', bars([10, null, 1]))).toEqual({ kind: 'REFUSE', why: 'NON_SPLIT_ACTION' });
    expect(restateCount(reverse, 'FOUND', bars([10, 10, 1, 1])).kind).toBe('RESTATE');
  });

  it('listed splits with bars UNPROVEN restate, not proven by the bars (the triangle stays)', () => {
    expect(restateCount(reverse, 'UNPROVEN', bars([10, null, 1]))).toEqual({
      kind: 'RESTATE',
      factor: 0.1,
      splits: [{ exDate: '2026-08-03', oldRate: 10, newRate: 1 }],
      provenByBars: false,
    });
  });

  it('listed splits with bars NONE refuse (BARS_DISAGREE); control: bars FOUND at the listed step', () => {
    expect(restateCount(reverse, 'NONE', bars([1, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
    expect(restateCount(reverse, 'FOUND', bars([10, 10, 1, 1]))).toEqual({
      kind: 'RESTATE',
      factor: 0.1,
      splits: [{ exDate: '2026-08-03', oldRate: 10, newRate: 1 }],
      provenByBars: true,
    });
  });

  it('listed splits with bars NONE refuse even when the step would agree (a 6-for-5 moves the factor by 1.2, under the 1.25 line)', () => {
    const small = span([act('2026-08-03', 5, 6, 'forward_splits')]); // price step 5/6
    expect(restateCount(small, 'NONE', bars([5 / 6, 5 / 6, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
    expect(restateCount(small, 'FOUND', bars([5 / 6, 5 / 6, 1, 1]))).toMatchObject({ kind: 'RESTATE', provenByBars: true });
  });

  it('the 1 percent agreement: 0.9 percent either side is proven, 1.1 percent either side refuses', () => {
    expect(restateCount(reverse, 'FOUND', bars([10.09, 10.09, 1, 1]))).toMatchObject({ kind: 'RESTATE', provenByBars: true });
    expect(restateCount(reverse, 'FOUND', bars([9.91, 9.91, 1, 1]))).toMatchObject({ kind: 'RESTATE', provenByBars: true });
    expect(restateCount(reverse, 'FOUND', bars([10.11, 10.11, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
    expect(restateCount(reverse, 'FOUND', bars([9.89, 9.89, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
  });

  it('R4 on the real YAAS row: listed old 5 new 1, bar step 5.0008, is proven', () => {
    const yaas = span([act('2026-07-30', 5, 1)], { from: '2026-06-30' });
    expect(restateCount(yaas, 'FOUND', bars([5.0008, 5.0008, 1, 1]))).toMatchObject({ kind: 'RESTATE', factor: 0.2, provenByBars: true });
  });

  it('orientation, PRICE side (the one chosen): reverse 1-for-10 bars 10 then 1, forward 2-for-1 bars 0.5 then 1, both proven', () => {
    expect(restateCount(reverse, 'FOUND', bars([10, 10, 1, 1]))).toMatchObject({ kind: 'RESTATE', provenByBars: true });
    expect(restateCount(forward, 'FOUND', bars([0.5, 0.5, 0.5, 1, 1]))).toMatchObject({ kind: 'RESTATE', factor: 2, provenByBars: true });
  });

  it('orientation, SHARES side (the one rejected): reverse bars 1 then 10 (step 0.1), forward bars 2 then 1 (step 2), both refuse', () => {
    expect(restateCount(reverse, 'FOUND', bars([1, 1, 10, 10]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
    expect(restateCount(forward, 'FOUND', bars([2, 2, 2, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
  });

  it('reads the step to the last NON-NULL factor (the unfactored checkpoint session)', () => {
    expect(restateCount(reverse, 'FOUND', bars([10, 10, 1, 1, 1, null]))).toMatchObject({ kind: 'RESTATE', provenByBars: true });
  });

  it('two splits proven by one composed bar step (1-for-10 then 2-for-1: shares 0.2, price 5)', () => {
    const both = span([FORWARD_2_FOR_1, REVERSE_1_FOR_10]);
    expect(restateCount(both, 'FOUND', bars([5, 5, 0.5, 1, 1]))).toMatchObject({ kind: 'RESTATE', provenByBars: true });
    expect(restateCount(both, 'FOUND', bars([10, 10, 1, 1, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
  });

  it('bars FOUND with a step that cannot be read refuse (BARS_DISAGREE)', () => {
    expect(restateCount(reverse, 'FOUND', [])).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
    expect(restateCount(reverse, 'FOUND', bars([null, 10, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
    expect(restateCount(reverse, 'FOUND', bars([0, 10, 1]))).toEqual({ kind: 'REFUSE', why: 'BARS_DISAGREE' });
  });
});
