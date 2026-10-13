import { describe, expect, it } from 'vitest';

import {
  FLOAT_DETAILS_WORDS,
  FILED_COUNT_WORDS,
  STATED_COUNT_WORDS,
  articleFor,
  floatCellView,
  laterFilingsLine,
  normalizeFloatBound,
  type FloatBound,
} from '@/lib/dashboard/floatBound';
import { countSourceOf, type FloatCountSource } from '@/lib/research/floatRead';

/*
 * L7: a share count a later filing states (his "yes to all three", 2026-10-13T21:36:56.972Z; Marketing caf7523f;
 * Commercial 99, 101, 101a). Research's row field statedCount, projected as countSource (Research: "Design adds it").
 */

const SOURCE = (over: Partial<FloatCountSource> = {}): FloatCountSource => ({ stated: false, read: 0, unread: 0, capped: 0, conflictAsOf: null, ...over });

const produced = (form: string, source: FloatCountSource | undefined): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 12_301_000,
  countAsOf: '2026-09-01',
  countFiled: '2026-09-05',
  subtractedHolders: 1,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: [],
  countShares: 14_000_000,
  countForm: form,
  insiders: [],
  countChecks: { split: 'NONE', age: 'WITHIN' },
  ...(source ? { countSource: source } : {}),
});

const refusedFiled = (form: string, source: FloatCountSource | undefined): FloatBound => ({
  ...produced(form, source),
  state: 'CANNOT_VERIFY',
  reason: 'ISSUANCE_FLAGGED',
  bound: null,
});

const countRow = (b: FloatBound) =>
  floatCellView(b, { dateShown: '2026-10-06' }).details.rows.find((r) => r.label === FLOAT_DETAILS_WORDS.countLabel)?.text;

describe('case 1 and 2: a stated count says which filing states it', () => {
  it('the bound panel count row', () => {
    expect(countRow(produced('S-1', SOURCE({ stated: true, read: 2 })))).toBe(
      '14,000,000 shares, as stated in an S-1 filed Sep 5, 2026, as of Sep 1, 2026.',
    );
  });
  it('a proxy reads the same, its form named (case 2)', () => {
    expect(countRow(produced('DEF 14A', SOURCE({ stated: true, read: 1 })))).toBe(
      '14,000,000 shares, as stated in a DEF 14A filed Sep 5, 2026, as of Sep 1, 2026.',
    );
  });
  it('the filed-count face: headline and first hover sentence', () => {
    const v = floatCellView(refusedFiled('8-K', SOURCE({ stated: true, read: 3 })));
    expect(v.kind).toBe('filedCount');
    expect(v.details.rows[0]!.text).toBe(STATED_COUNT_WORDS.headline('14,000,000', '8-K', 'Sep 5, 2026', 'Sep 1, 2026'));
    expect(v.details.rows[0]!.text).toContain('as stated in an 8-K filed Sep 5, 2026, as of Sep 1, 2026.');
    expect(v.icon?.title.startsWith(STATED_COUNT_WORDS.what('8-K', 'Sep 5, 2026', 'Sep 1, 2026'))).toBe(true);
  });
});

describe('a cover count keeps today\'s words', () => {
  for (const source of [undefined, SOURCE({ stated: false, read: 0 })]) {
    it(`countSource ${source ? 'with nothing stated' : 'absent'}`, () => {
      expect(countRow(produced('10-Q', source))).toBe('14,000,000 shares as of Sep 1, 2026, from a 10-Q filed Sep 5, 2026.');
      const v = floatCellView(refusedFiled('10-Q', source));
      expect(v.icon?.title.startsWith(FILED_COUNT_WORDS.what('Sep 1, 2026'))).toBe(true);
      expect(v.details.rows[0]!.text).not.toContain('as stated in');
    });
  }
});

describe('cases 3 to 5: the one extra line', () => {
  it('case 3: everything read, nothing newer', () => {
    expect(laterFilingsLine(SOURCE({ read: 1 }))).toBe('The desk also read 1 later filing and found no newer dated share count.');
    expect(laterFilingsLine(SOURCE({ read: 4 }))).toBe('The desk also read 4 later filings and found no newer dated share count.');
  });
  it('case 3 is not said when nothing was read, or when a count was found', () => {
    expect(laterFilingsLine(SOURCE({ read: 0 }))).toBeNull();
    expect(laterFilingsLine(SOURCE({ stated: true, read: 2 }))).toBeNull();
  });
  it('case 4: a conflict', () => {
    expect(laterFilingsLine(SOURCE({ read: 3, conflictAsOf: '2026-09-15' }))).toBe(
      'Later filings give different counts as of Sep 15, 2026, so the desk used none of them.',
    );
  });
  it('case 5: not every filing read, whether or not a count was found', () => {
    for (const s of [SOURCE({ read: 2, unread: 1 }), SOURCE({ read: 12, capped: 3 }), SOURCE({ stated: true, read: 1, unread: 2 })]) {
      expect(laterFilingsLine(s)).toBe(STATED_COUNT_WORDS.notAllRead);
    }
  });
  it('the line prints in both panels', () => {
    const s = SOURCE({ read: 2, unread: 1 });
    expect(floatCellView(produced('10-Q', s)).details.rows.map((r) => r.text)).toContain(STATED_COUNT_WORDS.notAllRead);
    expect(floatCellView(refusedFiled('10-Q', s)).details.rows.map((r) => r.text)).toContain(STATED_COUNT_WORDS.notAllRead);
  });
  it('no line without a read', () => {
    expect(laterFilingsLine(undefined)).toBeNull();
  });
});

describe('the article comes from the form (Commercial read 101)', () => {
  it.each([
    ['8-K', 'an'],
    ['S-1', 'an'],
    ['S-3/A', 'an'],
    ['F-1', 'an'],
    ['F-3', 'an'],
    ['424B3', 'a'],
    ['424B5', 'a'],
    ['DEF 14A', 'a'],
    ['PRE 14C', 'a'],
    ['10-Q', 'a'],
    ['10-K', 'a'],
    ['20-F', 'a'],
    ['6-K', 'a'],
  ])('%s -> %s', (form, article) => expect(articleFor(form)).toBe(article));
});

describe('the payload', () => {
  it('normalizeFloatBound keeps a valid countSource and drops a malformed one', () => {
    const ok = normalizeFloatBound(produced('S-1', SOURCE({ stated: true, read: 2 })));
    expect(ok?.countSource).toEqual(SOURCE({ stated: true, read: 2 }));
    const bad = normalizeFloatBound({ ...produced('S-1', undefined), countSource: { stated: 'yes', read: 2, unread: 0, capped: 0, conflictAsOf: null } });
    expect(bad?.countSource).toBeUndefined();
  });

  it('countSourceOf projects the row (Research: stated = found != null; absent with no read)', () => {
    const cover = { shares: 1, asOf: '2026-06-30', filed: '2026-08-10', accession: 'a', form: '10-Q' };
    const row = (statedCount: unknown) => ({ statedCount }) as never;
    expect(countSourceOf(row(null))).toBeUndefined();
    expect(countSourceOf(row({ found: null, read: 3, unread: 0, capped: 0, conflict: null, cover }))).toEqual(SOURCE({ read: 3 }));
    expect(
      countSourceOf(row({ found: { shares: 2, asOf: '2026-09-01', filed: '2026-09-05', accession: 'b', form: '8-K' }, read: 1, unread: 1, capped: 0, conflict: null, cover })),
    ).toEqual(SOURCE({ stated: true, read: 1, unread: 1 }));
    expect(countSourceOf(row({ found: null, read: 2, unread: 0, capped: 0, conflict: { asOf: '2026-09-15', shares: [1, 2] }, cover }))?.conflictAsOf).toBe('2026-09-15');
  });
});
