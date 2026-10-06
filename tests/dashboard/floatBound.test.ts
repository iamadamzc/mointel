import { describe, expect, it } from 'vitest';

import {
  FLOAT_LEGEND,
  floatCellView,
  floatSortValue,
  longDate,
  shortDate,
  type FloatBound,
} from '@/lib/dashboard/floatBound';
import type { FloatCellReason } from '@/lib/research/insiderBound';

const produced = (over: Partial<FloatBound> = {}): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 12_301_000,
  countAsOf: '2026-09-22',
  holdingDates: ['2026-09-18', '2026-08-30'],
  ...over,
});
const refused = (state: 'UNKNOWN' | 'CANNOT_VERIFY', reason: FloatCellReason, over: Partial<FloatBound> = {}): FloatBound => ({
  state,
  reason,
  bound: null,
  countAsOf: null,
  holdingDates: [],
  ...over,
});

const EM_DASH = String.fromCharCode(0x2014);
const REASONS: FloatCellReason[] = [
  'NO_FILED_COUNT',
  'NO_CIK',
  'COUNT_SPLIT_ACROSS_FILINGS',
  'COUNT_TOO_OLD',
  'ISSUANCE_FLAGGED',
  'ISSUANCE_NOT_CHECKED',
  'SPLIT_SINCE_COUNT',
  'BOUND_OUT_OF_RANGE',
];

describe('the bound face', () => {
  it('prints the compact number, rounded UP, with the filed count date beside it as m/d', () => {
    const v = floatCellView(produced());
    expect(v.kind).toBe('bound');
    // 12,301,000 is 12.4M, not 12.3M: the cell says "at most".
    expect(v.face).toBe(String.fromCharCode(0x2264) + ' 12.4M');
    expect(v.date).toBe('9/22');
  });

  it('carries the date in the accessible name, as Marketing worded it', () => {
    expect(floatCellView(produced()).ariaLabel).toBe(
      'no more than 12.4M shares, computed from SEC filings as of Sep 22, 2026, when the filings line up',
    );
  });

  it('the popover states the condition and the 90-day rule from the checkpoint', () => {
    const text = floatCellView(produced()).paragraphs.join(' ');
    expect(text).toContain('The float is no more than 12.4M shares when the filings line up.');
    expect(text).toContain("Computed from the company's filed share count as of Sep 22, 2026, less insider holdings filed on Sep 18, 2026, Aug 30, 2026.");
    expect(text).toContain('a filed count dated Sep 22, 2026, at most 90 days before the checkpoint');
  });

  it('never prints a bare number: a produced state with no usable date or number reads Cannot verify', () => {
    for (const bad of [produced({ countAsOf: null }), produced({ bound: null }), produced({ bound: 0 })]) {
      const v = floatCellView(bad);
      expect(v.kind).toBe('cannotVerify');
      expect(v.date).toBeNull();
    }
  });
});

describe('the other three faces, one string per stored cause', () => {
  it('Unknown has three causes, each its own words', () => {
    expect(floatCellView(refused('UNKNOWN', 'NO_FILED_COUNT')).paragraphs).toEqual(['No filed share count.']);
    expect(floatCellView(refused('UNKNOWN', 'NO_CIK')).paragraphs[0]).toContain('could not match this name to an SEC filer');
    expect(floatCellView(refused('UNKNOWN', 'COUNT_SPLIT_ACROSS_FILINGS')).paragraphs[0]).toContain('split across several filings');
    expect(floatCellView(refused('UNKNOWN', 'NO_FILED_COUNT')).face).toBe('Unknown');
  });

  it('Cannot verify has five causes, and a too-old count names its date', () => {
    const old = floatCellView(refused('CANNOT_VERIFY', 'COUNT_TOO_OLD', { countAsOf: '2026-05-01' }));
    expect(old.face).toBe('Cannot verify');
    expect(old.paragraphs[0]).toBe('Cannot verify: the latest filed share count is from May 1, 2026, too old to rely on.');
    const seen = new Set(
      (['COUNT_TOO_OLD', 'ISSUANCE_FLAGGED', 'SPLIT_SINCE_COUNT', 'ISSUANCE_NOT_CHECKED', 'BOUND_OUT_OF_RANGE'] as const).map(
        (r) => floatCellView(refused('CANNOT_VERIFY', r, { countAsOf: '2026-05-01' })).paragraphs[0],
      ),
    );
    expect(seen.size).toBe(5);
  });

  it('Not computed is a state of its own, never printed as Unknown', () => {
    for (const none of [null, undefined, { ...refused('UNKNOWN', 'NO_CIK'), state: 'NOT_YET' as const }]) {
      const v = floatCellView(none);
      expect(v.face).toBe('Not computed');
      expect(v.ariaLabel).toBe('float not computed for this name');
      expect(v.paragraphs).toEqual(['The desk has not computed a float for this name.']);
    }
  });

  it('every stored cause has words, and none shares a face or a string with a different cause', () => {
    const strings = REASONS.map((r) =>
      floatCellView(refused(r.startsWith('NO_') || r === 'COUNT_SPLIT_ACROSS_FILINGS' ? 'UNKNOWN' : 'CANNOT_VERIFY', r, { countAsOf: '2026-05-01' })).paragraphs[0],
    );
    expect(new Set(strings).size).toBe(REASONS.length);
    for (const s of strings) expect(s).not.toBe('Cannot verify.');
  });
});

describe('no claim beyond the sources, no dashes, no result language', () => {
  it('every string a reader can see is free of em dashes and of validated, verified-number or populated claims', () => {
    const all: string[] = [FLOAT_LEGEND];
    for (const v of [
      floatCellView(produced()),
      floatCellView(null),
      ...REASONS.map((r) => floatCellView(refused(r.startsWith('NO_') ? 'UNKNOWN' : 'CANNOT_VERIFY', r, { countAsOf: '2026-05-01' }))),
    ]) {
      all.push(v.face, v.ariaLabel, ...v.paragraphs);
    }
    for (const s of all) {
      expect(s.includes(EM_DASH), s).toBe(false);
      expect(s, s).not.toMatch(/validated|verified number|fully populated/i);
    }
  });

  it('the legend is the approved sentence set, verbatim', () => {
    expect(FLOAT_LEGEND).toBe(
      "Float: computed from SEC filings. An upper bound when the filings line up. The date is the filed share count's.",
    );
  });
});

describe('dates and the sort value', () => {
  it('formats m/d and the long date from a plain date string, with no timezone shift', () => {
    expect(shortDate('2026-01-05')).toBe('1/5');
    expect(longDate('2026-12-31')).toBe('Dec 31, 2026');
    expect(shortDate(null)).toBeNull();
    expect(shortDate('not a date')).toBeNull();
    expect(longDate('2026-13-01')).toBeNull();
  });

  it('sorts by the bound only where PRODUCED; refused and absent floats have no number', () => {
    expect(floatSortValue(produced())).toBe(12_301_000);
    expect(floatSortValue(refused('CANNOT_VERIFY', 'COUNT_TOO_OLD'))).toBeNull();
    expect(floatSortValue(null)).toBeNull();
    expect(floatSortValue(produced({ bound: -5 }))).toBeNull();
  });
});
