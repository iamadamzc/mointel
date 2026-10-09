import { describe, expect, it } from 'vitest';

import { FLOAT_DETAILS_WORDS, SHOW_INSIDER_NAMES, floatCellView, type FloatBound } from '@/lib/dashboard/floatBound';

/*
 * His Variant A click-through (2026-10-07T00:51:24.442Z, "A, hedge it"). Words: Marketing 1ee54def,
 * Commercial 23b/23c. Conditions: no per-insider date (the passed row form has none, though Research
 * 1cfc0d14 carries heldAsOf); owner names on the signed-in board only; no name filed: "An insider" on that row.
 */

const EM_DASH = String.fromCharCode(0x2014);
const produced = (over: Partial<FloatBound> = {}): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 12_301_000,
  countAsOf: '2026-09-22',
  countFiled: '2026-09-25',
  subtractedHolders: 2,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: ['2026-08-30', '2026-09-18'],
  countShares: 13_000_000,
  countForm: '10-Q',
  insiders: [
    { ownerCik: '1', ownerName: 'Jane Roe', title: 'common stock', shares: 500_000, heldAsOf: '2026-09-15', filedOn: ['2026-09-18'] },
    { ownerCik: '2', ownerName: 'John Doe', title: 'common stock', shares: 199_000, heldAsOf: '2026-08-28', filedOn: ['2026-08-30'] },
  ],
  ...over,
});
const text = (v: ReturnType<typeof floatCellView>) => v.details.rows.map((r) => `${r.label ?? ''}|${r.text}`).join('\n');

describe('Variant A panel on a bound face', () => {
  it('rows in order: headline with the board date, definition, count, insiders, not subtracted, lined up, read on', () => {
    const v = floatCellView(produced(), { dateShown: '2026-10-06', namesAllowed: true });
    expect(v.details.rows.map((r) => r.label)).toEqual([
      null,
      'Float, taking it as shares outstanding less insider holdings',
      'Filed share count',
      "Less insiders' holdings",
      'Not subtracted',
      'Lined up means',
      null,
    ]);
    expect(v.details.rows[0].text).toBe(
      'TMI Float, shares outstanding less insider holdings: no more than 12.4M shares as of Oct 6, 2026, when the filings line up.',
    );
    expect(v.details.rows[2].text).toBe('13,000,000 shares as of Sep 22, 2026, from a 10-Q filed Sep 25, 2026.');
    expect(v.details.rows[3].text).toMatch(/^2 insiders, 699,000 shares, as filed through Oct 5, 2026\. For each insider/);
    expect(v.details.rows[3].text).toContain('dated on or before Oct 6, 2026');
    expect(v.details.rows[6].text).toBe('Filings read on Oct 5, 2026.');
  });

  it('names insiders, largest first, as the amount subtracted, with NO date, only where names are allowed', () => {
    const on = floatCellView(produced(), { dateShown: '2026-10-06', namesAllowed: true });
    expect(SHOW_INSIDER_NAMES).toBe(true);
    expect(on.details.insiders).toEqual([
      'Jane Roe: 500,000 shares subtracted, held directly.',
      'John Doe: 199,000 shares subtracted, held directly.',
    ]);
    for (const line of on.details.insiders) expect(line).not.toMatch(/\d{4}|dated|filed/);
    expect(floatCellView(produced(), { dateShown: '2026-10-06' }).details.insiders).toEqual([]);
    expect(floatCellView(produced(), { dateShown: '2026-10-06', namesAllowed: false }).details.insiders).toEqual([]);
  });

  it('an insider with no filed name reads "An insider" on that row only; the named rows keep their names', () => {
    for (const missing of [null, '', '  ']) {
      const insiders = produced().insiders.map((i, n) => (n === 1 ? { ...i, ownerName: missing } : i));
      expect(floatCellView(produced({ insiders }), { namesAllowed: true }).details.insiders).toEqual([
        'Jane Roe: 500,000 shares subtracted, held directly.',
        'An insider: 199,000 shares subtracted, held directly.',
      ]);
      // Where names may not print, the fallback does not bring the rows back.
      expect(floatCellView(produced({ insiders }), { namesAllowed: false }).details.insiders).toEqual([]);
    }
  });

  it('leaves out a row whose inputs are missing, never a placeholder', () => {
    const old = floatCellView(produced({ countShares: null, countForm: null }), { dateShown: '2026-10-06' });
    expect(old.details.rows.map((r) => r.label)).not.toContain('Filed share count');
    expect(text(old)).not.toMatch(/null|undefined|NaN/);
  });

  it('never says at least, probably, or available to trade as the bound', () => {
    const all = text(floatCellView(produced(), { dateShown: '2026-10-06', namesAllowed: true }));
    expect(all).not.toMatch(/at least|probably|likely|available to trade/i);
    expect(all).not.toContain(EM_DASH);
  });
});

describe('refused faces and the marker', () => {
  it('a refused face keeps its reason and adds only the definition', () => {
    const v = floatCellView({ ...produced(), state: 'UNKNOWN', reason: 'NO_FILED_COUNT', bound: null, insiders: [] });
    expect(v.details.rows).toEqual([
      { label: null, text: 'No filed share count.' },
      { label: FLOAT_DETAILS_WORDS.definitionLabel, text: FLOAT_DETAILS_WORDS.definition },
    ]);
    expect(floatCellView(null).details.rows[0].text).toBe('The desk has not computed a TMI Float for this name.');
  });

  it('every face ends its accessible name with "; details on click"', () => {
    for (const raw of [produced(), null, { ...produced(), state: 'CANNOT_VERIFY' as const, reason: 'COUNT_TOO_OLD' as const, bound: null }]) {
      expect(floatCellView(raw).ariaLabel.endsWith('; details on click')).toBe(true);
    }
  });
});
