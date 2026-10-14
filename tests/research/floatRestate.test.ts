import { describe, expect, it } from 'vitest';

import { floatCellFor, type FloatBoundRow, type StoredHolding } from '@/lib/research/floatJob';
import { countChecksAt, floatCellAt, toFloatBound } from '@/lib/research/floatRead';
import { NO_ANALYSIS, type FloatLedger } from '@/lib/research/insiderBound';
import type { SpanBar } from '@/lib/research/splitProof';
import type { AnnouncedAction } from '@/lib/research/splitRestate';

/*
 * L6 integration (floatRestate.ts; plan 0719a53b steps 3 to 6): a count filed before a LISTED 1-for-10 reverse split is
 * restated instead of refused, its holdings with it, by the job and the reader alike, and the payload Design reads adds
 * up (Commercial read 114 (1)). Every refusal keeps today's CANNOT_VERIFY / SPLIT_SINCE_COUNT.
 */

const READ = '2026-09-25';
const EX = '2026-09-03';
const COUNT = { kind: 'COUNT' as const, shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' };
const REVERSE: AnnouncedAction = { group: 'reverse_splits', exDate: EX, oldRate: 10, newRate: 1 };

const holder = (over: Partial<StoredHolding> = {}): StoredHolding => ({
  ownerCik: '111',
  ownerName: 'A',
  shares: 400_000,
  asOf: '2026-07-14',
  accessions: ['x'],
  filingDates: ['2026-07-20', '2026-09-02'],
  split: 'NONE',
  classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }],
  ...over,
});

function row(over: Partial<FloatBoundRow> = {}): FloatBoundRow {
  const holdings = over.holdings ?? [holder()];
  return {
    symbol: 'ACME',
    asOfDate: READ,
    cik: '555',
    count: COUNT,
    holdings,
    splitSinceCount: 'FOUND',
    announcedSplits: [EX],
    announcedActions: [REVERSE],
    issuanceFilings: [],
    statedCount: null,
    analysisVersionId: 42,
    issuanceRule: 'KNOWN_OR_POSSIBLY_ACTIVE',
    maxAgeDays: 90,
    cell: { state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' },
    computedAt: `${READ}T23:00:00.000Z`,
    ...over,
  };
}

/** Bars that cannot vouch for the span (a null factor mid-span): R1 UNPROVEN, so a listed split restates with the triangle. */
const unproven = (to: string): SpanBar[] => [
  { date: '2026-07-31', close: 10, factor: 1 },
  { date: EX, close: 100, factor: null },
  { date: to, close: 100, factor: 1 },
];
/** Bars that read one basis across the span: R1 NONE, which disagrees with a listed split. */
const flat = (to: string): SpanBar[] => [
  { date: '2026-07-31', close: 10, factor: 1 },
  { date: to, close: 10, factor: 1 },
];

const payload = (r: FloatBoundRow, d: string, bars: SpanBar[], ledger: FloatLedger = []) =>
  toFloatBound(r, floatCellAt(r, d, ledger, bars)!, countChecksAt(r, d, bars));

describe('L6: a count filed before a listed split is restated', () => {
  it('Commercial read 114 (1): the restated count less the RESTATED insiders is the bound; the holding as filed would not reconcile (control)', () => {
    const b = payload(row(), READ, unproven(READ));
    expect(b.state).toBe('PRODUCED');
    expect(b.restated).toEqual({ splits: [{ exDate: EX, oldRate: 10, newRate: 1 }], factor: 0.1, restatedShares: 1_000_000, provenByBars: false });
    // The filed count stays as filed; h0 1,000,000 and hD 400,000 restate to 100,000 and 40,000, S1 takes the smaller.
    expect(b.countShares).toBe(10_000_000);
    expect(b.insiders.map((i) => i.shares)).toEqual([40_000]);
    const insiders = b.insiders.reduce((n, i) => n + i.shares, 0);
    expect(b.restated!.restatedShares - insiders).toBe(b.bound);
    expect(b.bound).toBe(960_000);
    // Control: the same figures with the holding left as filed (400,000) do not add up.
    expect(b.restated!.restatedShares - 400_000).not.toBe(b.bound);
  });

  it('a row stored before L6 (no listed actions) and a failed fetch (null) keep today\'s refusal', () => {
    const old = row();
    delete (old as Partial<FloatBoundRow>).announcedActions;
    expect(floatCellAt(old, READ, [], unproven(READ))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect(floatCellAt(row({ announcedActions: null }), READ, [], unproven(READ))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    // Control: the same row with its actions restates.
    expect(floatCellAt(row(), READ, [], unproven(READ))).toMatchObject({ state: 'PRODUCED', bound: 960_000 });
  });

  it('a listed split the bars read as no change is a disagreement: today\'s refusal stands', () => {
    expect(floatCellAt(row(), READ, [], flat(READ))).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
  });

  it('the job and the reader decide alike, at the read date and at a later D inside the reuse span', () => {
    const r = row();
    for (const d of [READ, '2026-09-28']) {
      const job = floatCellFor({
        cik: r.cik, count: r.count, holdings: r.holdings, splitSinceCount: 'FOUND', ledger: [], asOfDate: d, issuanceFiled: false,
        restate: { actions: r.announcedActions, countSpanBars: unproven(d) },
      });
      expect(floatCellAt(r, d, [], unproven(d))).toEqual(job);
      expect(job).toMatchObject({ state: 'PRODUCED', restated: { factor: 0.1 } });
    }
  });

  it('a bound with no split since the count carries no restated field (today\'s payload, unchanged)', () => {
    const plain = row({ splitSinceCount: 'NONE', announcedSplits: [], announcedActions: [] });
    const b = payload(plain, READ, flat(READ));
    expect(b.state).toBe('PRODUCED');
    expect('restated' in b).toBe(false);
    expect(b.bound).toBe(9_600_000);
  });

  it('restated and filings-only together (read 114 (2), the research side): both marks reach the payload', () => {
    const b = payload(row(), READ, unproven(READ), NO_ANALYSIS);
    expect(b).toMatchObject({ state: 'PRODUCED', filingsOnly: true, restated: { factor: 0.1 } });
  });
});

describe('L6: holdings under a restated count (plan step 4, read 110)', () => {
  const bound = (holdings: StoredHolding[], actions: AnnouncedAction[] = [REVERSE]) =>
    floatCellAt(row({ holdings, announcedActions: actions }), READ, [], unproven(READ));

  it('read 110 (2): a stock dividend between the holding and the count refuses that holding (not subtracted); control without it', () => {
    const dividend: AnnouncedAction = { group: 'stock_dividends', exDate: '2026-07-20', oldRate: 1, newRate: 1.05 };
    expect(bound([holder()], [dividend, REVERSE])).toMatchObject({ state: 'PRODUCED', bound: 1_000_000, refused: [{ ownerCik: '111' }] });
    expect(bound([holder()])).toMatchObject({ state: 'PRODUCED', bound: 960_000, refused: [] });
  });

  it('read 110 (1): a holding FILED on or after the ex-date it predates is refused; filed before, it is subtracted (control)', () => {
    expect(bound([holder({ filingDates: ['2026-07-20', '2026-09-05'] })])).toMatchObject({ bound: 1_000_000, refused: [{ ownerCik: '111' }] });
    expect(bound([holder()])).toMatchObject({ bound: 960_000, refused: [] });
  });

  it('an hD dated after the split is already in the new units: only splits after its own date restate it', () => {
    const after = holder({ classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 30_000, hDAsOf: '2026-09-10' }] });
    // h0 100,000 after the split; hD 30,000 unchanged; S1 subtracts the smaller.
    expect(bound([after])).toMatchObject({ state: 'PRODUCED', bound: 970_000 });
  });

  it('a holding refused today stays refused; the smallest title is chosen after restating', () => {
    expect(bound([holder({ split: 'FOUND' })])).toMatchObject({ bound: 1_000_000, refused: [{ ownerCik: '111' }] });
    const twoTitles = holder({
      classes: [
        { title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 1_000_000, hDAsOf: '2026-07-14' },
        // Filed in the new units after the split: 50,000 post-split is smaller than 100,000 restated, so it is chosen.
        { title: 'common stock, par', h0: 900_000, h0AsOf: '2026-07-14', hD: 50_000, hDAsOf: '2026-09-10' },
      ],
    });
    expect(bound([twoTitles])).toMatchObject({ bound: 950_000 });
  });
});
