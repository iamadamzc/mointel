import { describe, expect, it } from 'vitest';

import {
  FLOAT_LEGEND,
  floatCellView,
  floatSortValue,
  longDate,
  shortDate,
  type FloatBound,
} from '@/lib/dashboard/floatBound';
import type { FloatBoundReason } from '@/lib/dashboard/floatBound';

const produced = (over: Partial<FloatBound> = {}): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 12_301_000,
  countAsOf: '2026-09-22',
  countFiled: '2026-09-25',
  subtractedHolders: 2,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: ['2026-09-18', '2026-08-30'],
  ...over,
});
const refused = (state: 'UNKNOWN' | 'CANNOT_VERIFY', reason: FloatBoundReason, over: Partial<FloatBound> = {}): FloatBound => ({
  state,
  reason,
  bound: null,
  countAsOf: null,
  countFiled: null,
  subtractedHolders: 0,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: [],
  ...over,
});

const EM_DASH = String.fromCharCode(0x2014);
const REASONS: FloatBoundReason[] = [
  'NO_FILED_COUNT',
  'NO_CIK',
  'COUNT_SPLIT_ACROSS_FILINGS',
  'COUNT_TOO_OLD',
  'ISSUANCE_FLAGGED',
  'ISSUANCE_NOT_CHECKED',
  'ISSUANCE_FILED',
  'SPLIT_SINCE_COUNT',
  'BOUND_OUT_OF_RANGE',
  'FILINGS_NOT_REREAD',
];
/** Causes that share another's words by ruling, each with the cause whose words it takes. */
const SHARED_BY_RULING: Partial<Record<FloatBoundReason, FloatBoundReason>> = {
  ISSUANCE_FILED: 'ISSUANCE_FLAGGED', // Commercial 5p, bbfb7a17
};

describe('the bound face', () => {
  it('prints the compact number, rounded UP, with the filed count date beside it as m/d', () => {
    const v = floatCellView(produced());
    expect(v.kind).toBe('bound');
    // 12,301,000 is 12.4M, not 12.3M: the cell says "at most".
    expect(v.face).toBe(String.fromCharCode(0x2264) + ' 12.4M');
    expect(v.date).toBe('9/22');
  });

  it('words the claim as dated to the count, with the sales caveat, per v16', () => {
    const text = floatCellView(produced()).paragraphs.join(' ');
    expect(text).toContain('No more than 12.4M shares as of Sep 22, 2026, when the filings line up.');
    expect(text).toContain('Filings read on Oct 5, 2026.');
    expect(text).toContain('Insider sales after the count date are not reflected.');
  });

  it('measures the 90 days from the date shown on the live board, printed, and from the checkpoint on reports and exports', () => {
    expect(floatCellView(produced(), { dateShown: '2026-10-06' }).paragraphs.join(' ')).toContain(
      'at most 90 days before the date shown (Oct 6, 2026)',
    );
    expect(floatCellView(produced()).paragraphs.join(' ')).toContain('at most 90 days before the checkpoint');
    // A malformed board date must not print a half sentence.
    expect(floatCellView(produced(), { dateShown: 'soon' }).paragraphs.join(' ')).toContain('before the checkpoint');
  });

  it('carries the date in the accessible name, as Marketing worded it', () => {
    expect(floatCellView(produced()).ariaLabel).toBe(
      'no more than 12.4M shares as of Sep 22, 2026, computed from SEC filings, when the filings line up',
    );
  });

  it('the popover states the condition and the 90-day rule from the checkpoint', () => {
    const text = floatCellView(produced()).paragraphs.join(' ');
    expect(text).toContain("Computed from the company's filed share count, less insider holdings filed on Sep 18, 2026, Aug 30, 2026.");
    expect(text).toContain('a filed count dated Sep 22, 2026, at most 90 days before the checkpoint');
  });

  it("names the filings check in the lined-up clause, in Marketing's v20 words (Commercial passed v19)", () => {
    expect(floatCellView(produced()).paragraphs[1]).toBe(
      'Lined up means: a filed count dated Sep 22, 2026, at most 90 days before the checkpoint, no share issuance the desk has flagged, no final prospectus for an offering of shares (SEC form 424B1, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date, no share split since the count, and holdings dated at or before the count. Insider sales after the count date are not reflected.',
    );
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

  it('Cannot verify has six causes; a too-old count names its date and an unread filing names the read date', () => {
    const old = floatCellView(refused('CANNOT_VERIFY', 'COUNT_TOO_OLD', { countAsOf: '2026-05-01' }));
    expect(old.face).toBe('Cannot verify');
    expect(old.paragraphs[0]).toBe('Cannot verify: the latest filed share count is from May 1, 2026, too old to rely on.');
    const seen = new Set(
      (['COUNT_TOO_OLD', 'ISSUANCE_FLAGGED', 'SPLIT_SINCE_COUNT', 'ISSUANCE_NOT_CHECKED', 'BOUND_OUT_OF_RANGE', 'FILINGS_NOT_REREAD'] as const).map(
        (r) => floatCellView(refused('CANNOT_VERIFY', r, { countAsOf: '2026-05-01', filingsReadOn: '2026-09-30' })).paragraphs[0],
      ),
    );
    expect(seen.size).toBe(6);
    expect(floatCellView(refused('CANNOT_VERIFY', 'FILINGS_NOT_REREAD', { filingsReadOn: '2026-09-30' })).paragraphs[0]).toBe(
      "Cannot verify: the desk has not read this company's filings since Sep 30, 2026.",
    );
  });

  it('Not computed is a state of its own, never printed as Unknown', () => {
    for (const none of [null, undefined]) {
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
    expect(new Set(strings).size).toBe(REASONS.length - Object.keys(SHARED_BY_RULING).length);
    for (const s of strings) expect(s).not.toBe('Cannot verify.');
  });

  it('a filed issuance after the count reads the issued-since sentence, not the bare fallback', () => {
    const filed = floatCellView(refused('CANNOT_VERIFY', 'ISSUANCE_FILED', { countAsOf: '2026-05-01' }));
    expect(filed.face).toBe('Cannot verify');
    expect(filed.paragraphs[0]).toBe('Cannot verify: shares may have been issued since the filed count.');
    for (const [r, words] of Object.entries(SHARED_BY_RULING) as [FloatBoundReason, FloatBoundReason][]) {
      expect(floatCellView(refused('CANNOT_VERIFY', r, { countAsOf: '2026-05-01' })).paragraphs[0]).toBe(
        floatCellView(refused('CANNOT_VERIFY', words, { countAsOf: '2026-05-01' })).paragraphs[0],
      );
    }
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
      "Float: computed from SEC filings. An upper bound as of the date shown, when the filings line up. The date is the filed share count's.",
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
