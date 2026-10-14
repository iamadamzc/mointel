import { describe, expect, it } from 'vitest';

import {
  FLOAT_DETAILS_WORDS,
  FILINGS_ONLY_WORDS,
  MARKED_BOUND_DATE_ON_FACE,
  RESTATED_WORDS,
  floatCellView,
  floatSortValue,
  normalizeFloatBound,
  type FloatBound,
} from '@/lib/dashboard/floatBound';
import type { Restatement } from '@/lib/research/floatRestate';

/*
 * L6 (a): a bound restated across listed splits (Research's final fields, 2026-10-14; Commercial reads 98, 104,
 * 108; Marketing a65caa91 and 14a0b60a; Integration 40th's rulings (1) to (5)).
 */

const produced = (restated: Restatement | undefined): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 12_301_000,
  countAsOf: '2026-07-31',
  countFiled: '2026-08-05',
  subtractedHolders: 1,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: [],
  countShares: 140_000_000,
  countForm: '10-Q',
  insiders: [],
  countChecks: { split: 'NONE', age: 'WITHIN' },
  ...(restated ? { restated } : {}),
});

const one = (provenByBars = false): Restatement => ({
  splits: [{ exDate: '2026-09-03', newRate: 1, oldRate: 10 }],
  factor: 0.1,
  restatedShares: 14_000_000,
  provenByBars,
});

describe('the hover, verbatim', () => {
  it('one split (Marketing a65caa91)', () => {
    expect(RESTATED_WORDS.hover('Jul 31, 2026', one().splits)).toBe('Filed share count as of Jul 31, 2026, restated for a 1-for-10 split on Sep 3, 2026, as announced. The split list can miss a split.');
  });
  it('two splits (the approved plural)', () => {
    expect(
      RESTATED_WORDS.hover('Jul 31, 2026', [
        { exDate: '2026-03-03', newRate: 1, oldRate: 10 },
        { exDate: '2026-06-09', newRate: 1, oldRate: 5 },
      ]),
    ).toBe('Filed share count as of Jul 31, 2026, restated for a 1-for-10 split on Mar 3, 2026 and a 1-for-5 split on Jun 9, 2026, as announced. The split list can miss a split.');
  });
  it('three splits (Marketing 14a0b60a (B))', () => {
    expect(
      RESTATED_WORDS.hover('Jul 31, 2026', [
        { exDate: '2026-02-01', newRate: 1, oldRate: 4 },
        { exDate: '2026-04-01', newRate: 1, oldRate: 10 },
        { exDate: '2026-06-01', newRate: 8, oldRate: 1 },
      ]),
    ).toBe(
      'Filed share count as of Jul 31, 2026, restated for a 1-for-4 split on Feb 1, 2026, a 1-for-10 split on Apr 1, 2026 and an 8-for-1 split on Jun 1, 2026, as announced. The split list can miss a split.',
    );
  });
  it('the article follows how the ratio is said (Marketing 14a0b60a (C))', () => {
    const r = (n: number, o: number) => RESTATED_WORDS.hover('Jul 31, 2026', [{ exDate: '2026-09-03', newRate: n, oldRate: o }]);
    expect(r(8, 1)).toContain('an 8-for-1 split');
    expect(r(11, 1)).toContain('an 11-for-1 split');
    expect(r(18, 1)).toContain('an 18-for-1 split');
    expect(r(3, 2)).toContain('a 3-for-2 split');
    expect(r(1, 10)).toContain('a 1-for-10 split');
  });
});

describe('the face', () => {
  it('a restated bound keeps its number and gains the triangle; the date leaves the face (point 5 (a))', () => {
    expect(MARKED_BOUND_DATE_ON_FACE).toBe(false);
    const v = floatCellView(produced(one()), { dateShown: '2026-10-06' });
    expect(v.kind).toBe('bound');
    expect(v.face).toBe(floatCellView(produced(undefined), { dateShown: '2026-10-06' }).face);
    expect(v.date).toBeNull();
    expect(v.icon?.kind).toBe('warning');
    // The hover's opening carries the count's date (v9).
    expect(v.icon?.title).toBe(RESTATED_WORDS.hover('Jul 31, 2026', one().splits));
    expect(v.ariaLabel).toContain('; restated for a 1-for-10 split on Sep 3, 2026, as announced; the split list can miss a split');
    expect(v.ariaLabel).not.toContain('.;');
  });

  it('proven by the bars: no triangle, the date stays on the face', () => {
    const v = floatCellView(produced(one(true)));
    expect(v.icon).toBeNull();
    expect(v.date).toBe('7/31');
  });

  it('an unrestated bound is unchanged', () => {
    const v = floatCellView(produced(undefined));
    expect(v.icon).toBeNull();
    expect(v.date).toBe('7/31');
  });

  it('the sort still uses the bound', () => {
    expect(floatSortValue(produced(one()))).toBe(12_301_000);
  });
});

describe('the panel', () => {
  const rows = (b: FloatBound) => floatCellView(b, { dateShown: '2026-10-06' }).details.rows;

  it('the count row stays the FILED count as filed, then the Restated share count row (v8, so the panel adds up)', () => {
    const r = rows(produced(one()));
    const i = r.findIndex((x) => x.label === FLOAT_DETAILS_WORDS.countLabel);
    expect(r[i]!.text).toBe('140,000,000 shares as of Jul 31, 2026, from a 10-Q filed Aug 5, 2026.');
    expect(r[i + 1]).toEqual({ label: 'Restated share count', text: '14,000,000 shares as of Jul 31, 2026, restated for a 1-for-10 split on Sep 3, 2026, as announced.' });
    // Integration 40th: the panel keeps the caveat, its own line right after.
    expect(r[i + 2]).toEqual({ label: null, text: 'The split list can miss a split.' });
    expect(rows(produced(undefined)).map((x) => x.label)).not.toContain('Restated share count');
  });

  it('the insiders total says it is in the same share units, only on a restated bound (v10)', () => {
    const ins = (b: FloatBound) => rows(b).find((x) => x.label === FLOAT_DETAILS_WORDS.insidersLabel)!.text;
    expect(ins(produced(one()))).toContain('0 insiders, 0 shares, in the same share units, as filed through Oct 5, 2026.');
    expect(ins(produced(undefined))).toContain('0 insiders, 0 shares, as filed through Oct 5, 2026.');
  });

  it('"Lined up means" says the split was restated, never "no share split since the count" (Marketing 14a0b60a (A))', () => {
    const lined = (b: FloatBound) => rows(b).find((x) => x.label === FLOAT_DETAILS_WORDS.linedUpLabel)!.text;
    const restated = lined(produced(one()));
    expect(restated).toContain('and any share split since the count restated by its announced ratio. A sale not yet filed, and a split the split list does not contain, cannot be seen.');
    expect(restated).not.toContain('no share split since the count');
    // The replacement must actually land: the restated row differs from the passed row only in its tail.
    const plain = lined(produced(undefined));
    expect(plain).toContain('and no share split since the count. A sale not yet filed cannot be seen.');
    expect(restated.startsWith(plain.slice(0, plain.indexOf(', and no share split')))).toBe(true);
  });
});

describe('L6 with L8 (Commercial 114 (2), Integration ruling): one icon, the triangle wins', () => {
  const both = (provenByBars = false): FloatBound => ({ ...produced(one(provenByBars)), filingsOnly: true });
  const view = (b: FloatBound) => floatCellView(b, { dateShown: '2026-10-06' });
  const l6 = RESTATED_WORDS.hover('Jul 31, 2026', one().splits);
  const l8 = FILINGS_ONLY_WORDS.hover('12.4M', 'Jul 31, 2026');

  it('the controls: L8 alone is the circled i, L6 alone the triangle', () => {
    expect(view({ ...produced(undefined), filingsOnly: true }).icon).toEqual({ kind: 'caveat', title: l8 });
    expect(view(produced(one())).icon).toEqual({ kind: 'warning', title: l6 });
  });

  it('both: the triangle, its hover the L6 sentence then the L8 sentence, the date off the face', () => {
    const v = view(both());
    expect(v.icon).toEqual({ kind: 'warning', title: `${l6} ${l8}` });
    expect(v.date).toBeNull();
    expect(v.face).toBe(view(produced(undefined)).face);
  });

  it('both: the aria carries both additions, L6 first', () => {
    const a = view(both()).ariaLabel;
    const i6 = a.indexOf(RESTATED_WORDS.aria(one().splits));
    const i8 = a.indexOf(FILINGS_ONLY_WORDS.aria);
    expect(i6).toBeGreaterThan(0);
    expect(i8).toBeGreaterThan(i6);
  });

  it('both: the panel prints the L8 line and the L6 rows', () => {
    const rows = view(both()).details.rows;
    expect(rows.map((r) => r.text)).toContain(FILINGS_ONLY_WORDS.panel);
    expect(rows.map((r) => r.text)).toContain(RESTATED_WORDS.mayMiss);
    expect(rows.map((r) => r.label)).toContain(RESTATED_WORDS.countLabel);
  });

  it('a restated bound the bars prove, filings-only: the circled i alone, the L8 sentence alone', () => {
    expect(view(both(true)).icon).toEqual({ kind: 'caveat', title: l8 });
    expect(view(both(true)).date).toBeNull();
  });

  it('both: still shown, not ranked (L8 rule)', () => {
    expect(floatSortValue(both())).toBeNull();
  });
});

describe('the payload', () => {
  it('keeps a valid restated on a PRODUCED row only, and drops a malformed one', () => {
    expect(normalizeFloatBound(produced(one()))?.restated).toEqual(one());
    expect(normalizeFloatBound({ ...produced(one()), state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT', bound: null })?.restated).toBeUndefined();
    expect(normalizeFloatBound({ ...produced(undefined), restated: { ...one(), splits: [] } })?.restated).toBeUndefined();
    expect(normalizeFloatBound({ ...produced(undefined), restated: { ...one(), provenByBars: 'yes' } })?.restated).toBeUndefined();
  });
});
