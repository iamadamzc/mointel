import { describe, expect, it } from 'vitest';

import { selectFiledCount, type CompanyFactsShares } from '@/lib/research/filedCount';

/** The count the validation used (validate.ts countAsFiledBy): dei cover-page concept, filed by the as-of date. */

type Row = { end: string; val: number; filed: string; accn: string; form: string };
const facts = (rows: Row[]): CompanyFactsShares => ({ facts: { dei: { EntityCommonStockSharesOutstanding: { units: { shares: rows } } } } });
const row = (end: string, filed: string, val: number, accn = `a-${filed}`, form = '10-Q'): Row => ({ end, val, filed, accn, form });

describe('selectFiledCount', () => {
  it('takes the latest period end among rows FILED by the as-of date, never a later filing (look-ahead)', () => {
    const data = facts([row('2026-05-01', '2026-05-10', 100), row('2026-08-01', '2026-08-12', 200), row('2026-11-01', '2026-11-10', 300)]);
    expect(selectFiledCount(data, '2026-09-30')).toEqual({ kind: 'COUNT', shares: 200, asOf: '2026-08-01', filed: '2026-08-12', accession: 'a-2026-08-12', form: '10-Q' });
  });

  it('counts a row filed ON the as-of date', () => {
    expect(selectFiledCount(facts([row('2026-08-01', '2026-08-12', 200)]), '2026-08-12')).toMatchObject({ kind: 'COUNT', shares: 200 });
  });

  it('at the latest end, the latest filed date wins (a restatement of the same period)', () => {
    const data = facts([row('2026-08-01', '2026-08-12', 200), row('2026-08-01', '2026-09-02', 210, 'amend', '10-Q/A')]);
    expect(selectFiledCount(data, '2026-09-30')).toMatchObject({ shares: 210, filed: '2026-09-02', accession: 'amend', form: '10-Q/A' });
  });

  it('sums the classes of ONE filing', () => {
    const data = facts([row('2026-08-01', '2026-08-12', 200, 'one'), row('2026-08-01', '2026-08-12', 50, 'one')]);
    expect(selectFiledCount(data, '2026-09-30')).toMatchObject({ kind: 'COUNT', shares: 250 });
  });

  it('refuses values spread across two filings at the same end and filed date', () => {
    const data = facts([row('2026-08-01', '2026-08-12', 200, 'one'), row('2026-08-01', '2026-08-12', 50, 'two')]);
    expect(selectFiledCount(data, '2026-09-30')).toEqual({ kind: 'COUNT_SPLIT_ACROSS_FILINGS' });
  });

  it('reads NO_FILED_COUNT with no rows, no concept, or only later filings', () => {
    expect(selectFiledCount(facts([]), '2026-09-30')).toEqual({ kind: 'NO_FILED_COUNT' });
    expect(selectFiledCount({}, '2026-09-30')).toEqual({ kind: 'NO_FILED_COUNT' });
    expect(selectFiledCount(facts([row('2026-08-01', '2026-10-01', 200)]), '2026-09-30')).toEqual({ kind: 'NO_FILED_COUNT' });
  });
});
