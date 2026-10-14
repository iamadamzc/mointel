import { describe, expect, it } from 'vitest';

import { FLOAT_DETAILS_WORDS, RESTATED_WORDS, floatCellView } from '@/lib/dashboard/floatBound';
import { BOUND_PREFIX, compactBound } from '@/lib/research/compactBound';
import type { FloatBoundRow, StoredHolding } from '@/lib/research/floatJob';
import { countChecksAt, floatCellAt, toFloatBound } from '@/lib/research/floatRead';
import type { SpanBar } from '@/lib/research/splitProof';
import type { AnnouncedAction } from '@/lib/research/splitRestate';

/*
 * Commercial read 114 (1), on Research's BUILT rows (the L6 job and reader, cd684c06), through the face: the panel's
 * "Restated share count" less its insiders total is the headline bound, rounded up at 3 significant digits. Control:
 * the same panel with the holding as filed does not reconcile. Fixture after tests/research/floatRestate.test.ts.
 */

const READ = '2026-09-25';
const EX = '2026-09-03';
const COUNT = { kind: 'COUNT' as const, shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'acc', form: '10-Q' };
const REVERSE: AnnouncedAction = { group: 'reverse_splits', exDate: EX, oldRate: 10, newRate: 1 };

const holder: StoredHolding = {
  ownerCik: '111',
  ownerName: 'A',
  shares: 400_000,
  asOf: '2026-07-14',
  accessions: ['x'],
  filingDates: ['2026-07-20', '2026-09-02'],
  split: 'NONE',
  classes: [{ title: 'common stock', h0: 1_000_000, h0AsOf: '2026-07-14', hD: 400_000, hDAsOf: '2026-08-30' }],
};

const row: FloatBoundRow = {
  symbol: 'ACME',
  asOfDate: READ,
  cik: '555',
  count: COUNT,
  holdings: [holder],
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
};

/** Bars that cannot vouch for the span: a listed split restates with the triangle. */
const unproven: SpanBar[] = [
  { date: '2026-07-31', close: 10, factor: 1 },
  { date: EX, close: 100, factor: null },
  { date: READ, close: 100, factor: 1 },
];

const built = () => toFloatBound(row, floatCellAt(row, READ, [], unproven)!, countChecksAt(row, READ, unproven));
const sharesIn = (text: string) => Number((text.match(/([\d,]+) shares/) ?? [])[1]?.replace(/,/g, ''));

describe('read 114 (1) on built rows: the panel adds up', () => {
  it('Restated share count less the insiders total is the headline bound (3 significant digits, rounded up)', () => {
    const bound = built();
    expect(bound.restated).toBeDefined();
    const view = floatCellView(bound, { dateShown: READ });
    expect(view.kind).toBe('bound');
    const rows = view.details.rows;
    const restatedRow = rows.find((r) => r.label === RESTATED_WORDS.countLabel)!;
    const insidersRow = rows.find((r) => r.label === FLOAT_DETAILS_WORDS.insidersLabel)!;
    const restated = sharesIn(restatedRow.text);
    const insidersTotal = Number((insidersRow.text.match(/insiders?, ([\d,]+) shares/) ?? [])[1]?.replace(/,/g, ''));
    expect(restated).toBe(1_000_000);
    expect(insidersTotal).toBe(40_000);
    expect(insidersRow.text).toContain('in the same share units');
    const face = compactBound(restated - insidersTotal);
    expect(view.face).toBe(face);
    // Control: the holding as filed (400,000) would put a different number on the face.
    expect(compactBound(restated - 400_000)).not.toBe(view.face);
    expect(view.face.startsWith(BOUND_PREFIX)).toBe(true);
  });
});
