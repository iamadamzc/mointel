import { describe, expect, it } from 'vitest';

import { buildStructureSummary } from '@/lib/dashboard/deskRead';
import { drawerFloatLine } from '@/lib/dashboard/drawerFloat';
import {
  FILINGS_ONLY_WORDS,
  MARKED_BOUND_DATE_ON_FACE,
  floatCellView,
  floatSortValue,
  normalizeFloatBound,
  type FloatBound,
} from '@/lib/dashboard/floatBound';

/*
 * L8 piece B: a bound for a name with no desk research (his "approved", 2026-10-14T01:17:42.726Z, Marketing
 * 84d0b9fd FINAL; Commercial read 110a and Research's conditions (3) and (4); Integration's width ruling).
 */

const bound = (filingsOnly: boolean): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 12_301_000,
  countAsOf: '2026-07-31',
  countFiled: '2026-08-05',
  subtractedHolders: 0,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: [],
  countShares: 14_000_000,
  countForm: '10-Q',
  insiders: [],
  countChecks: { split: 'NONE', age: 'WITHIN' },
  ...(filingsOnly ? { filingsOnly: true as const } : {}),
});

describe('the cell', () => {
  it('a filings-only bound keeps its number, gains the circled i, and its date leaves the face', () => {
    expect(MARKED_BOUND_DATE_ON_FACE).toBe(false);
    const v = floatCellView(bound(true), { dateShown: '2026-10-06' });
    expect(v.kind).toBe('bound');
    expect(v.face).toBe(floatCellView(bound(false)).face);
    expect(v.date).toBeNull();
    expect(v.icon).toEqual({ kind: 'caveat', title: FILINGS_ONLY_WORDS.hover('12.4M', 'Jul 31, 2026') });
  });

  it('the hover is the approved text, with the COUNT date (his "count date tonight")', () => {
    expect(floatCellView(bound(true), { dateShown: '2026-10-06' }).icon?.title).toBe(
      'No more than 12.4M shares, from the filed share count as of Jul 31, 2026, not counting warrants, convertible notes or share-sale programs already in place. There may be some, and they need verifying; the true figure may be higher.',
    );
  });

  it('the accessible name carries the caveat in words', () => {
    expect(floatCellView(bound(true)).ariaLabel).toContain(
      '; not counting warrants, convertible notes or share-sale programs already in place; may need verifying; the true figure may be higher',
    );
  });

  it('an ordinary bound is unchanged: no icon, its date on the face', () => {
    const v = floatCellView(bound(false));
    expect(v.icon).toBeNull();
    expect(v.date).toBe('7/31');
    expect(v.ariaLabel).not.toContain('not counting warrants');
  });
});

describe('the panel', () => {
  it('one extra line under the headline', () => {
    const rows = floatCellView(bound(true), { dateShown: '2026-10-06' }).details.rows;
    expect(rows[1]).toEqual({ label: null, text: FILINGS_ONLY_WORDS.panel });
    expect(floatCellView(bound(false)).details.rows.map((r) => r.text)).not.toContain(FILINGS_ONLY_WORDS.panel);
  });
});

describe('every consumer carries the marker (Commercial (3))', () => {
  it('the drawer prints the cell caveat, never its own ceiling, for a filings-only bound', () => {
    const pair = {
      sharesOutstanding: 89_789,
      sharesOutstandingAsOf: '2026-08-14',
      denominatorFactor: 1,
      concept: 'dei:EntityCommonStockSharesOutstanding',
      sourceId: 1,
      basis: 'REPORTED',
      floorShares: 449_860,
      floorRatio: 5.01,
      floorBlocks: 2,
    } as never;
    // Control: an ordinary bound keeps the drawer's own reading.
    expect(drawerFloatLine(pair, bound(false), true)?.refusedByCell).toBe(false);
    const line = drawerFloatLine(pair, bound(true), true);
    expect(line?.refusedByCell).toBe(true);
    expect(line?.sentence).toContain('not counting warrants, convertible notes or share-sale programs already in place');
  });

  it('the Desk Read shows the same face and icon', () => {
    const row = {
      floatBoundWired: true,
      floatBound: bound(true),
      intelligence: { analysis: { dossier: { structure: { structureClassification: 'UNKNOWN', floatConfidence: null, supplyLedger: [], structuralWarnings: [] } } } },
    } as never;
    const s = buildStructureSummary(row);
    expect(s?.float.icon?.kind).toBe('caveat');
    expect(s?.float.ariaLabel).toContain('not counting warrants');
  });
});

describe('shown, not ranked (Commercial (4))', () => {
  it('floatSortValue is null for a filings-only bound and the bound otherwise', () => {
    expect(floatSortValue(bound(true))).toBeNull();
    expect(floatSortValue(bound(false))).toBe(12_301_000);
  });
});

describe('the payload', () => {
  it('only true on a PRODUCED row marks it', () => {
    expect(normalizeFloatBound(bound(true))?.filingsOnly).toBe(true);
    expect(normalizeFloatBound({ ...bound(false), filingsOnly: 'yes' })?.filingsOnly).toBeUndefined();
    expect(normalizeFloatBound({ ...bound(true), state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED', bound: null })?.filingsOnly).toBeUndefined();
  });
});
