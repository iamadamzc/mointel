import { describe, expect, it } from 'vitest';

import { buildStructureSummary } from '@/lib/dashboard/deskRead';
import { drawerFloatLine } from '@/lib/dashboard/drawerFloat';
import {
  FILED_COUNT_RULE,
  FILED_COUNT_WORDS,
  compactCount,
  floatCellView,
  floatSortValue,
  normalizeFloatBound,
  type FloatBound,
  type FloatBoundReason,
} from '@/lib/dashboard/floatBound';
import type { FloatCountChecks } from '@/lib/research/floatRead';

/*
 * FLOAT FIX 1: the filed count on a refused row (his "3, yes", 2026-10-13T09:39:59.808Z; his ruling
 * 2026-10-13T09:57:22.409Z; Integration 39th; Commercial reads 89 to 89e). Research's `countChecks` (ba6afbba).
 */

const refused = (reason: FloatBoundReason | null, checks: FloatCountChecks | undefined, over: Partial<FloatBound> = {}): FloatBound => ({
  state: 'CANNOT_VERIFY',
  reason,
  bound: null,
  countAsOf: '2026-09-22',
  countFiled: '2026-09-25',
  subtractedHolders: 0,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: [],
  countShares: 12_345_678,
  countForm: '10-Q',
  insiders: [],
  ...(checks ? { countChecks: checks } : {}),
  ...over,
});

const PASSED: FloatCountChecks = { split: 'NONE', age: 'WITHIN' };

describe('the gate ADMITS a qualifying row (a gate that refuses everyone looks like a correctly empty one)', () => {
  for (const reason of ['ISSUANCE_FLAGGED', 'ISSUANCE_FILED', 'ISSUANCE_NOT_CHECKED', 'UNREGISTERED_SALE_NOT_CHECKABLE', 'FILINGS_NOT_REREAD'] as const) {
    it(`${reason} with split NONE and age WITHIN prints the count with the caveat icon`, () => {
      const view = floatCellView(refused(reason, PASSED));
      expect(view.kind).toBe('filedCount');
      expect(view.face).toBe(`12.3M ${FILED_COUNT_WORDS.unit}`);
      expect(view.icon?.kind).toBe('caveat');
    });
  }
});

describe('his ruling: the count prints with the WARNING icon when a check failed or did not run', () => {
  const cases: Array<[string, FloatBoundReason, FloatCountChecks, string]> = [
    ['split FOUND', 'SPLIT_SINCE_COUNT', { split: 'FOUND', age: 'WITHIN' }, FILED_COUNT_WORDS.preSplit],
    ['split UNPROVEN', 'SPLIT_SINCE_COUNT', { split: 'UNPROVEN', age: 'WITHIN' }, FILED_COUNT_WORDS.preSplit],
    ['split NOT_RUN', 'FILINGS_NOT_REREAD', { split: 'NOT_RUN', age: 'NOT_RUN' }, FILED_COUNT_WORDS.splitNotChecked],
    ['age TOO_OLD', 'COUNT_TOO_OLD', { split: 'NONE', age: 'TOO_OLD' }, FILED_COUNT_WORDS.tooOld('Sep 22, 2026', 90)],
  ];
  for (const [name, reason, checks, words] of cases) {
    it(`${name}: number, warning icon, the case said plainly in the hover and the accessible name`, () => {
      const view = floatCellView(refused(reason, checks));
      expect(view.kind).toBe('filedCount');
      expect(view.icon?.kind).toBe('warning');
      expect(view.icon?.title).toContain(words);
      expect(view.ariaLabel).toContain(words);
    });
  }

  it('an ABSENT countChecks is the warning with the no-record words (his: "there may have been a split, needs verification")', () => {
    const view = floatCellView(refused('ISSUANCE_FLAGGED', undefined));
    expect(view.icon?.kind).toBe('warning');
    expect(view.icon?.title).toContain(FILED_COUNT_WORDS.noRecord);
    expect(view.icon?.title).toContain('There may have been a split, needs verification.');
    expect(view.icon?.title).not.toMatch(/has not checked/i);
  });

  it('a MALFORMED countChecks reads as absent (no record)', () => {
    const raw = { ...refused('ISSUANCE_FLAGGED', undefined), countChecks: { split: 'MAYBE', age: 'WITHIN' } };
    expect(normalizeFloatBound(raw)?.countChecks).toBeUndefined();
    expect(floatCellView(raw as unknown as FloatBound).icon?.title).toContain(FILED_COUNT_WORDS.noRecord);
  });

  it('the caveat hover carries no warning line', () => {
    const title = floatCellView(refused('ISSUANCE_FLAGGED', PASSED)).icon?.title ?? '';
    for (const w of [FILED_COUNT_WORDS.preSplit, FILED_COUNT_WORDS.splitNotChecked, FILED_COUNT_WORDS.noRecord]) expect(title).not.toContain(w);
  });
});

describe('still the word, no number', () => {
  it('BOUND_OUT_OF_RANGE (the count itself is suspect)', () => {
    expect(floatCellView(refused('BOUND_OUT_OF_RANGE', PASSED)).face).toBe('Cannot verify');
  });
  it('a count dated after the board date', () => {
    expect(floatCellView(refused('ISSUANCE_FLAGGED', { split: 'NONE', age: 'AFTER_DATE' })).face).toBe('Cannot verify');
  });
  it('no filed count', () => {
    expect(floatCellView(refused('ISSUANCE_FLAGGED', PASSED, { countShares: null })).face).toBe('Cannot verify');
  });
  it('no count date', () => {
    expect(floatCellView(refused('ISSUANCE_FLAGGED', PASSED, { countAsOf: null })).face).toBe('Cannot verify');
  });
  it('the no-reason fault', () => {
    expect(floatCellView(refused(null, PASSED)).face).toBe('Cannot verify');
  });
  it('every no-number face carries no icon (the word alone, Commercial 89c)', () => {
    expect(floatCellView(refused('BOUND_OUT_OF_RANGE', PASSED)).icon).toBeNull();
  });
});

describe('never a TMI Float', () => {
  const view = floatCellView(refused('ISSUANCE_FLAGGED', PASSED));
  it('no "at most" mark and the unit on the face', () => {
    expect(view.face).not.toContain(String.fromCharCode(0x2264));
    expect(view.face.endsWith(` ${FILED_COUNT_WORDS.unit}`)).toBe(true);
  });
  it('the face fits: at most 9 characters (the measured "12.4M o/s" + icon is 70.4 of 86 px)', () => {
    for (const n of [999, 1_234, 999_600, 12_345_678, 123_456_789, 1_234_567_890]) {
      expect(`${compactCount(n)} ${FILED_COUNT_WORDS.unit}`.length).toBeLessThanOrEqual(9);
    }
  });
  it('the sort ignores it: bounds only', () => {
    expect(floatSortValue(refused('ISSUANCE_FLAGGED', PASSED))).toBeNull();
  });
  it('the panel opens with its own headline, not the TMI Float headline', () => {
    expect(view.details.rows[0]!.text).toContain('could not verify a TMI Float');
    expect(view.details.rows[0]!.text).not.toContain('no more than');
  });
  it('issuance reasons say the true count may be higher', () => {
    expect(view.icon?.title).toContain(FILED_COUNT_WORDS.mayBeHigher);
  });
});

describe('compactCount rounds to nearest at three significant digits', () => {
  it.each([
    [842, '842'],
    [12_345_678, '12.3M'],
    [12_351_000, '12.4M'],
    [999_600, '1.00M'],
    [1_200_000_000, '1.20B'],
  ])('%d -> %s', (n, text) => expect(compactCount(n)).toBe(text));
});

describe('other surfaces follow the cell', () => {
  it('the drawer keeps the reason line, never its own "at most" (Commercial (b))', () => {
    // drawerFloat.test.ts's WORX pair: on its own the drawer reads "Float is at most 89,789 shares outstanding".
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
    expect(drawerFloatLine(pair, null, false)?.sentence).toMatch(/at most/i);
    const line = drawerFloatLine(pair, refused('ISSUANCE_FLAGGED', PASSED, { countShares: 89_789, countAsOf: '2026-08-14' }), true);
    expect(line?.refusedByCell).toBe(true);
    expect(line?.sentence).not.toMatch(/at most/i);
  });

  it('the Desk Read prints the same face and icon', () => {
    const row = {
      floatBoundWired: true,
      floatBound: refused('COUNT_TOO_OLD', { split: 'NONE', age: 'TOO_OLD' }),
      intelligence: { analysis: { dossier: { structure: { structureClassification: 'UNKNOWN', floatConfidence: null, supplyLedger: [], structuralWarnings: [] } } } },
    } as never;
    const summary = buildStructureSummary(row);
    expect(summary?.float.kind).toBe('filedCount');
    expect(summary?.float.icon?.kind).toBe('warning');
  });

  it('the rule table is the one place a ruling changes', () => {
    expect(FILED_COUNT_RULE.noNumberReasons.has('BOUND_OUT_OF_RANGE')).toBe(true);
    expect(FILED_COUNT_RULE.noNumberAges.has('AFTER_DATE')).toBe(true);
  });
});
