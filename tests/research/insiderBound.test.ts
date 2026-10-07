import { describe, expect, it } from 'vitest';

import {
  floatCell,
  holdingsAsOf,
  holdingsAtBoth,
  issuanceFlagged,
  parseSection16,
  type FloatCellInput,
  type OwnerFiling,
  type OwnerHolding,
  type Section16Parse,
} from '@/lib/research/insiderBound';
import type { SupplyBlock } from '@/lib/research/types';

/**
 * The insider-only bound. Contract: docs/research/float-contract/contract-2026-10-05.md.
 * Validation pre-registration: docs/research/float-contract/validation-prereg-2026-10-05.md.
 *
 * The case the 10-name harness could not show: a holding DATED AFTER the count's date.
 * Subtracting it removes shares the count does not contain, and the bound goes too LOW.
 */

const ok = (p: Section16Parse) => {
  if (!p.ok) throw new Error(`fixture did not parse: ${p.reason}`);
  return p;
};

function form(options: { owners?: number; period?: string; body: string }): string {
  const owner = '<reportingOwner><reportingOwnerId><rptOwnerCik>0001234567</rptOwnerCik><rptOwnerName>A DIRECTOR</rptOwnerName></reportingOwnerId></reportingOwner>';
  return `<ownershipDocument><periodOfReport>${options.period ?? '2026-08-01'}</periodOfReport>${owner.repeat(options.owners ?? 1)}${options.body}</ownershipDocument>`;
}

const tx = (title: string, date: string, after: number, own = 'D') =>
  `<nonDerivativeTransaction><securityTitle><value>${title}</value></securityTitle><transactionDate><value>${date}</value></transactionDate>` +
  `<postTransactionAmounts><sharesOwnedFollowingTransaction><value>${after}</value></sharesOwnedFollowingTransaction></postTransactionAmounts>` +
  `<ownershipNature><directOrIndirectOwnership><value>${own}</value></directOrIndirectOwnership></ownershipNature></nonDerivativeTransaction>`;

const hold = (title: string, after: number) =>
  `<nonDerivativeHolding><securityTitle><value>${title}</value></securityTitle>` +
  `<postTransactionAmounts><sharesOwnedFollowingTransaction><value>${after}</value></sharesOwnedFollowingTransaction></postTransactionAmounts>` +
  `<ownershipNature><directOrIndirectOwnership><value>D</value></directOrIndirectOwnership></ownershipNature></nonDerivativeHolding>`;

describe('parseSection16', () => {
  it('stands a transaction row at its transactionDate and a holding row at the report period', () => {
    const parsed = ok(parseSection16(form({ period: '2026-08-20', body: tx('Common Stock', '2026-08-10', 500) + hold('Common Stock', 900) })));
    expect(parsed.rows).toEqual([
      { asOf: '2026-08-10', title: 'common stock', shares: 500 },
      { asOf: '2026-08-20', title: 'common stock', shares: 900 },
    ]);
  });

  it('does not attribute a joint filing', () => {
    const parsed = parseSection16(form({ owners: 2, body: tx('Common Stock', '2026-08-10', 500) }));
    expect(parsed.ok).toBe(false);
  });

  it('keeps direct rows only, and common or ordinary titles only', () => {
    const parsed = ok(
      parseSection16(
        form({ body: tx('Common Stock', '2026-08-10', 500, 'I') + tx('Series A Preferred', '2026-08-10', 70) + tx('Ordinary Shares', '2026-08-11', 40) }),
      ),
    );
    expect(parsed.rows).toEqual([{ asOf: '2026-08-11', title: 'ordinary shares', shares: 40 }]);
  });
});

function filing(accession: string, filingDate: string, xml: string): OwnerFiling {
  return { accession, filingDate, parse: ok(parseSection16(xml)) };
}

describe('holdingsAsOf: the holding must stand at or before the count date', () => {
  const COUNT_DATE = '2026-08-10';
  const WINDOW = '2024-08-10';

  it('does NOT use a holding dated after the count; it falls back to the last one before', () => {
    const rows = holdingsAsOf(
      [
        filing('0001', '2026-05-02', form({ body: tx('Common Stock', '2026-05-01', 600_000) })),
        filing('0002', '2026-09-03', form({ body: tx('Common Stock', '2026-09-01', 900_000) })),
      ],
      COUNT_DATE,
      WINDOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.shares).toBe(600_000);
    expect(rows[0]!.asOf).toBe('2026-05-01');
  });

  it('leaves an owner out when every row is after the count', () => {
    const rows = holdingsAsOf([filing('0002', '2026-09-03', form({ body: tx('Common Stock', '2026-09-01', 900_000) }))], COUNT_DATE, WINDOW);
    expect(rows).toEqual([]);
  });

  it('accepts a LATE-filed Form 4 whose transaction stands before the count', () => {
    const rows = holdingsAsOf(
      [
        filing('0001', '2026-05-02', form({ body: tx('Common Stock', '2026-05-01', 600_000) })),
        filing('0003', '2026-08-25', form({ body: tx('Common Stock', '2026-08-05', 650_000) })),
      ],
      COUNT_DATE,
      WINDOW,
    );
    expect(rows[0]!.shares).toBe(650_000);
  });

  it('sums classes, each at its own latest eligible row across filings', () => {
    const rows = holdingsAsOf(
      [
        filing('0001', '2026-05-02', form({ body: tx('Class A Common Stock', '2026-05-01', 100) })),
        filing('0002', '2026-06-02', form({ body: tx('Class B Common Stock', '2026-06-01', 40) })),
      ],
      COUNT_DATE,
      WINDOW,
    );
    expect(rows[0]!.shares).toBe(140);
    expect(rows[0]!.accessions).toEqual(['0001', '0002']);
  });

  it('carries the FILED date of each chosen row, never its as-of date, and only the filings of the chosen rows', () => {
    const rows = holdingsAsOf(
      [
        filing('0001', '2026-05-02', form({ body: tx('Common Stock', '2026-05-01', 600_000) })),
        filing('0003', '2026-08-25', form({ body: tx('Common Stock', '2026-08-05', 650_000) })),
      ],
      COUNT_DATE,
      WINDOW,
    );
    expect(rows[0]!.asOf).toBe('2026-08-05');
    expect(rows[0]!.filingDates).toEqual(['2026-08-25']);
  });

  it('drops rows older than the filing window', () => {
    const rows = holdingsAsOf([filing('0001', '2023-05-02', form({ body: tx('Common Stock', '2023-05-01', 600_000) }))], COUNT_DATE, WINDOW);
    expect(rows).toEqual([]);
  });

  it('breaks a same-day tie to the later filing', () => {
    const rows = holdingsAsOf(
      [
        filing('0001', '2026-05-02', form({ body: tx('Common Stock', '2026-05-01', 100) })),
        filing('0002', '2026-05-03', form({ body: tx('Common Stock', '2026-05-01', 120) })),
      ],
      COUNT_DATE,
      WINDOW,
    );
    expect(rows[0]!.shares).toBe(120);
  });
});

const block = (type: SupplyBlock['type'], status: SupplyBlock['status'], effectiveDate: string | null = null): SupplyBlock => ({
  type,
  amountShares: null,
  dollarCapacity: null,
  sourceFiling: null,
  registrationStatus: null,
  effectiveDate,
  terms: null,
  holderRestrictions: null,
  status,
  eligibilityAssessment: null,
  evidenceSourceIds: [1],
  confidence: 'MEDIUM',
});

describe('issuanceFlagged', () => {
  it('flags the share-creating types when KNOWN_ACTIVE', () => {
    for (const type of ['ATM', 'EQUITY_PURCHASE_AGREEMENT', 'WARRANTS', 'CONVERTIBLES', 'PREFERRED_CONVERSION', 'RECENT_OFFERING', 'PIPE', 'ACQUISITION_SHARES', 'OTHER_ISSUED_SHARES'] as const) {
      expect(issuanceFlagged([block(type, 'KNOWN_ACTIVE')], 'KNOWN_ACTIVE')).toBe(true);
    }
  });

  it('does not flag resale registration or shelf capacity, which create no shares', () => {
    expect(issuanceFlagged([block('REGISTERED_RESALE', 'KNOWN_ACTIVE'), block('SHELF_CAPACITY', 'KNOWN_ACTIVE')], 'KNOWN_OR_POSSIBLY_ACTIVE')).toBe(false);
  });

  it('flags POSSIBLY_ACTIVE only under the wider rule', () => {
    const ledger = [block('WARRANTS', 'POSSIBLY_ACTIVE')];
    expect(issuanceFlagged(ledger, 'KNOWN_ACTIVE')).toBe(false);
    expect(issuanceFlagged(ledger, 'KNOWN_OR_POSSIBLY_ACTIVE')).toBe(true);
  });

  it('never clears a closed-issuance block by its effectiveDate (effectiveness is not issuance)', () => {
    expect(issuanceFlagged([block('RECENT_OFFERING', 'KNOWN_ACTIVE', '2019-01-01')], 'KNOWN_ACTIVE')).toBe(true);
  });

  it('ignores NOT_YET_ACTIVE and UNKNOWN', () => {
    expect(issuanceFlagged([block('ATM', 'NOT_YET_ACTIVE'), block('ATM', 'UNKNOWN')], 'KNOWN_OR_POSSIBLY_ACTIVE')).toBe(false);
  });
});

const holding = (ownerCik: string, shares: number): OwnerHolding => ({ ownerCik, ownerName: null, shares, asOf: '2026-05-01', accessions: ['x'] });

function input(overrides: Partial<FloatCellInput> = {}): FloatCellInput {
  return {
    cik: '1234',
    // NXL in the 10-name run: 22,036,402 filed, 617,347 insider shares, bound 21,419,055.
    count: { shares: 22_036_402, asOf: '2026-08-10' },
    spreadAcrossFilings: false,
    checkpointDate: '2026-09-01',
    maxAgeDays: 45,
    holdings: [holding('9', 617_347)],
    holdingSplit: new Map([['9', 'NONE']]),
    splitSinceCount: 'NONE',
    ledger: [],
    issuanceRule: 'KNOWN_ACTIVE',
    ...overrides,
  };
}

describe('floatCell', () => {
  it('ADMITS the known-clean case (the control): the NXL arithmetic', () => {
    const cell = floatCell(input());
    expect(cell).toMatchObject({ state: 'PRODUCED', bound: 21_419_055, subtracted: 617_347 });
  });

  it('gives each UNKNOWN cause its own reason', () => {
    expect(floatCell(input({ cik: null }))).toEqual({ state: 'UNKNOWN', reason: 'NO_CIK' });
    expect(floatCell(input({ spreadAcrossFilings: true }))).toEqual({ state: 'UNKNOWN', reason: 'COUNT_SPLIT_ACROSS_FILINGS' });
    expect(floatCell(input({ count: null }))).toEqual({ state: 'UNKNOWN', reason: 'NO_FILED_COUNT' });
  });

  it('reads CANNOT_VERIFY, ISSUANCE_NOT_CHECKED, when there is no dossier', () => {
    expect(floatCell(input({ ledger: null }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' });
  });

  it('reads an empty ledger as PRODUCED, and a flagged one as ISSUANCE_FLAGGED', () => {
    expect(floatCell(input({ ledger: [] })).state).toBe('PRODUCED');
    expect(floatCell(input({ ledger: [block('ATM', 'KNOWN_ACTIVE')] }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' });
  });

  it('enforces the maximum age as a state, in whole days, 45 inclusive', () => {
    // 2026-08-10 to 2026-09-24 is exactly 45 days.
    expect(floatCell(input({ checkpointDate: '2026-09-24' })).state).toBe('PRODUCED');
    expect(floatCell(input({ checkpointDate: '2026-09-25' }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' });
  });

  it('refuses a split since the count, found or unproven', () => {
    expect(floatCell(input({ splitSinceCount: 'FOUND' }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect(floatCell(input({ splitSinceCount: 'UNPROVEN' }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
  });

  it('applies the precedence: issuance before split before age', () => {
    const old = { checkpointDate: '2027-01-01', splitSinceCount: 'FOUND' as const };
    expect(floatCell(input({ ...old, ledger: [block('ATM', 'KNOWN_ACTIVE')] }))).toMatchObject({ reason: 'ISSUANCE_FLAGGED' });
    expect(floatCell(input(old))).toMatchObject({ reason: 'SPLIT_SINCE_COUNT' });
  });

  it('refuses a HOLDING across a split without changing the state: not subtracted, bound stays higher', () => {
    const found = floatCell(input({ holdingSplit: new Map([['9', 'FOUND']]) }));
    expect(found).toMatchObject({ state: 'PRODUCED', bound: 22_036_402, subtracted: 0 });
    const unproven = floatCell(input({ holdingSplit: new Map() }));
    expect(unproven).toMatchObject({ state: 'PRODUCED', bound: 22_036_402, refused: [{ ownerCik: '9', why: 'SPLIT_UNPROVEN' }] });
  });

  it('refuses a count from a foreign annual report (UNREGISTERED_SALE_NOT_CHECKABLE); admits a 10-Q, a 10-K or no form', () => {
    const at = (form?: string) => floatCell(input({ count: { shares: 22_036_402, asOf: '2026-08-10', form } }));
    for (const form of ['20-F', '20-F/A', '40-F', '40-F/A']) {
      expect(at(form), form).toEqual({ state: 'CANNOT_VERIFY', reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' });
    }
    for (const form of ['10-Q', '10-K', undefined]) expect(at(form).state, String(form)).toBe('PRODUCED');
  });

  it('places the foreign-count refusal after a filed issuance and before no dossier, a flagged ledger and age', () => {
    const foreign = { count: { shares: 22_036_402, asOf: '2026-08-10', form: '20-F' } };
    expect(floatCell(input({ ...foreign, issuanceFiled: true }))).toMatchObject({ reason: 'ISSUANCE_FILED' });
    expect(floatCell(input({ ...foreign, ledger: null }))).toMatchObject({ reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' });
    expect(floatCell(input({ ...foreign, ledger: [block('ATM', 'KNOWN_ACTIVE')] }))).toMatchObject({ reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' });
    expect(floatCell(input({ ...foreign, checkpointDate: '2027-01-01' }))).toMatchObject({ reason: 'UNREGISTERED_SALE_NOT_CHECKABLE' });
  });

  it('fails its own range check: insiders at or above the count, or a count dated after the checkpoint', () => {
    expect(floatCell(input({ holdings: [holding('9', 22_036_402)] }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'BOUND_OUT_OF_RANGE' });
    expect(floatCell(input({ count: { shares: 1000, asOf: '2026-12-01' } }))).toEqual({ state: 'CANNOT_VERIFY', reason: 'BOUND_OUT_OF_RANGE' });
  });
});

/**
 * Rule S1 (contract section 9a): per owner and class, subtract min(h0, hD). The defect it exists for: an insider who
 * SOLD after the count was subtracted at the larger count-date holding, and the bound went too LOW.
 */
describe('holdingsAtBoth (rule S1)', () => {
  const COUNT = '2026-08-01';
  const D = '2026-09-28';
  const WINDOW = '2024-09-28';
  const row = (asOf: string, shares: number, title = 'common stock') => ({ asOf, title, shares });
  const f = (accession: string, ownerCik: string, rows: Array<{ asOf: string; title: string; shares: number }>): OwnerFiling => ({
    accession,
    filingDate: rows[0]!.asOf,
    parse: { ok: true, ownerCik, ownerName: null, rows },
  });
  const subtracted = (filings: OwnerFiling[]) => Object.fromEntries(holdingsAtBoth(filings, COUNT, D, WINDOW).map((h) => [h.ownerCik, h.shares]));

  it('subtracts what is LEFT after a sale since the count', () => {
    expect(subtracted([f('a', '1', [row('2026-07-01', 1000)]), f('b', '1', [row('2026-08-20', 400)])])).toEqual({ '1': 400 });
  });

  it('subtracts the count-date holding after a purchase or grant since the count', () => {
    expect(subtracted([f('a', '1', [row('2026-07-01', 1000)]), f('b', '1', [row('2026-08-20', 2500)])])).toEqual({ '1': 1000 });
  });

  it('is the count-date holding when nothing later was filed, and ignores a row dated after D', () => {
    expect(subtracted([f('a', '1', [row('2026-07-01', 1000)])])).toEqual({ '1': 1000 });
    expect(subtracted([f('a', '1', [row('2026-07-01', 1000)]), f('b', '1', [row('2026-10-02', 10)])])).toEqual({ '1': 1000 });
  });

  it('subtracts one security filed under two titles ONCE (the KITT 2143744 shape), and the smaller of two unequal titles', () => {
    const kitt = [
      f('a', '1', [row('2026-06-01', 782_829, 'common stock, $0.0001 par value')]),
      f('b', '1', [row('2026-06-01', 782_829, 'common stock')]),
    ];
    expect(subtracted(kitt)).toEqual({ '1': 782_829 });
    const unequal = [f('a', '1', [row('2026-07-01', 900, 'common stock'), row('2026-07-01', 300, 'common stock, par value $0.001')])];
    expect(subtracted(unequal)).toEqual({ '1': 300 });
    const [h] = holdingsAtBoth(unequal, COUNT, D, WINDOW);
    expect(h!.classes.map((c) => c.title)).toEqual(['common stock', 'common stock, par value $0.001']);
    expect(h!.title).toBe('common stock, par value $0.001');
    expect(holdingsAtBoth(kitt, COUNT, D, WINDOW)[0]!.title).toBe('common stock');
  });

  it('leaves a single-title owner as before', () => {
    expect(subtracted([f('a', '1', [row('2026-07-01', 1000)]), f('b', '1', [row('2026-08-20', 400)])])).toEqual({ '1': 400 });
  });

  it('never subtracts an owner whose only rows are after the count', () => {
    expect(subtracted([f('b', '2', [row('2026-08-20', 400)])])).toEqual({});
  });

  it('takes the minimum per CLASS, not on the owner total; then only the smallest title is subtracted', () => {
    const filings = [
      f('a', '1', [row('2026-07-01', 1000, 'common stock'), row('2026-07-01', 500, 'class b common stock')]),
      f('b', '1', [row('2026-08-20', 200, 'common stock'), row('2026-08-20', 1300, 'class b common stock')]),
    ];
    // Owner total went 1,500 to 1,500; per class: min(1000, 200) = 200 and min(500, 1300) = 500. Before 2026-10-07 the
    // two were summed (700); now only the smallest title is subtracted (200), never the sum (S1 result 72bf286c).
    expect(subtracted(filings)).toEqual({ '1': 200 });
    const [h] = holdingsAtBoth(filings, COUNT, D, WINDOW);
    expect(h!.asOf).toBe('2026-07-01');
    expect(h!.filingDates).toEqual(['2026-07-01', '2026-08-20']);
    expect(h!.classes).toEqual([
      { title: 'class b common stock', h0: 500, h0AsOf: '2026-07-01', hD: 1300, hDAsOf: '2026-08-20' },
      { title: 'common stock', h0: 1000, h0AsOf: '2026-07-01', hD: 200, hDAsOf: '2026-08-20' },
    ]);
  });
});

/**
 * Several rows of ONE filing on ONE date (a run of trades): the holding after the day is the last row, and the code
 * takes the SMALLEST, which is never more than it in any order. Before the fix it took the FIRST, which over-subtracted
 * 5 of 81 owners in the validation draws (S1 result 32f5e351, raw f1bef392). Fixtures are those five shapes.
 */
describe('same-day rows in one filing: the smallest, never the first', () => {
  const day = (accession: string, filingDate: string, asOf: string, shares: number[], title = 'common stock'): OwnerFiling => ({
    accession,
    filingDate,
    parse: { ok: true, ownerCik: '1', ownerName: null, rows: shares.map((n) => ({ asOf, title, shares: n })) },
  });
  const at = (filings: OwnerFiling[], cutoff: string) => holdingsAsOf(filings, cutoff, '2024-01-01')[0]!.shares;

  it('takes the smallest on the five measured shapes (KITT, MX twice, TBPH twice)', () => {
    expect(at([day('k', '2026-07-14', '2026-06-01', [815_368, 782_829])], '2026-08-12')).toBe(782_829);
    expect(at([day('m1', '2025-01-03', '2024-12-31', [311_199, 301_950, 293_200])], '2026-07-31')).toBe(293_200);
    expect(at([day('m2', '2025-03-04', '2025-03-01', [73_909, 70_742])], '2026-07-31')).toBe(70_742);
    expect(at([day('t1', '2025-12-01', '2025-11-26', [60_204, 44_703], 'ordinary shares')], '2026-07-31')).toBe(44_703);
    expect(at([day('t2', '2026-06-17', '2026-06-15', [242_442, 239_114, 232_457], 'ordinary shares')], '2026-07-31')).toBe(232_457);
  });

  it('gives the same answer in every row order', () => {
    const orders = [[300, 200, 100], [300, 100, 200], [200, 300, 100], [200, 100, 300], [100, 300, 200], [100, 200, 300]];
    for (const o of orders) expect(at([day('p', '2026-06-02', '2026-06-01', o)], '2026-07-01'), o.join(',')).toBe(100);
  });

  it('carries through S1: TBPH owner 1898490 subtracts 213,476, the holding after its last sale, not 223,461', () => {
    const filings = [
      day('t2', '2026-06-17', '2026-06-15', [242_442, 239_114, 232_457], 'ordinary shares'),
      day('t3', '2026-09-17', '2026-09-15', [223_461, 220_133, 213_476], 'ordinary shares'),
    ];
    expect(holdingsAtBoth(filings, '2026-07-31', '2026-09-23', '2024-09-23')[0]!.shares).toBe(213_476);
  });

  it('leaves rows on different dates, and a same-date tie across filings, as before', () => {
    expect(at([day('a', '2026-06-03', '2026-06-01', [100]), day('b', '2026-06-04', '2026-06-02', [300])], '2026-07-01')).toBe(300);
    expect(at([day('a', '2026-06-02', '2026-06-01', [100]), day('b', '2026-06-03', '2026-06-01', [300])], '2026-07-01')).toBe(300);
  });
});
