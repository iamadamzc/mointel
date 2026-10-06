import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SUPPLY_GROUP_EMPTY, SUPPLY_GROUP_EMPTY_HOVER, SUPPLY_GROUP_LABEL, supplyGroups } from '@/lib/dashboard/supplyGroups';
import type { StructureFindings, SupplyBlock, SupplyBlockType } from '@/lib/research/types';
import type { EvidenceLink } from '@/lib/research/view';

const link = (id: number, secForm: string | null): EvidenceLink => ({
  id,
  title: `T${id}`,
  url: `https://example.test/${id}`,
  authority: 'PRIMARY',
  sourceType: 'SEC_FILING',
  secForm,
  accession: null,
  publishedAt: '2026-08-01T12:00:00.000Z',
  publishedPrecision: 'EXACT',
});

const block = (type: SupplyBlockType, over: Partial<SupplyBlock> = {}): SupplyBlock => ({
  type,
  amountShares: 1_000_000,
  dollarCapacity: null,
  sourceFiling: null,
  registrationStatus: null,
  effectiveDate: null,
  terms: null,
  holderRestrictions: null,
  status: 'KNOWN_ACTIVE',
  eligibilityAssessment: null,
  evidenceSourceIds: [],
  confidence: 'HIGH',
  ...over,
});

const structure = (
  ledger: SupplyBlock[],
  extra: Partial<Pick<StructureFindings, 'knownRegistrationStatus' | 'evidenceSourceIds'>> = {},
) => ({ supplyLedger: ledger, knownRegistrationStatus: null, evidenceSourceIds: [], ...extra });

const group = (groups: ReturnType<typeof supplyGroups>, key: string) => groups.find((g) => g.key === key)!;

describe('the supply ledger, sorted into the Sheet groups', () => {
  const ALL: SupplyBlockType[] = [
    'REGISTERED_RESALE',
    'ATM',
    'PIPE',
    'WARRANTS',
    'CONVERTIBLES',
    'EQUITY_PURCHASE_AGREEMENT',
    'ACQUISITION_SHARES',
    'RECENT_OFFERING',
    'SHELF_CAPACITY',
    'PREFERRED_CONVERSION',
    'OTHER_ISSUED_SHARES',
  ];

  it('puts every block type in exactly one group, and loses none', () => {
    const groups = supplyGroups(structure(ALL.map((type) => block(type))), []);
    const total = groups.reduce((n, g) => n + g.lines.length, 0);
    expect(total).toBe(ALL.length);
    expect(group(groups, 'REGISTRATION').lines).toHaveLength(2);
    expect(group(groups, 'OFFERINGS').lines).toHaveLength(4);
    expect(group(groups, 'WARRANTS').lines).toHaveLength(3);
    expect(group(groups, 'OTHER').lines).toHaveLength(2);
  });

  it('prints a block as its type, status, amount and registration, as the flat ledger did', () => {
    const groups = supplyGroups(structure([block('ATM', { amountShares: 2_500_000, registrationStatus: 'REGISTERED' })]), []);
    expect(group(groups, 'OFFERINGS').lines[0].text).toBe('atm · known active · 2,500,000 shares · registered');
  });

  it('states a dollar capacity as capacity, never as shares', () => {
    const groups = supplyGroups(structure([block('SHELF_CAPACITY', { amountShares: null, dollarCapacity: 50_000_000 })]), []);
    expect(group(groups, 'REGISTRATION').lines[0].text).toContain('$50,000,000 capacity');
    expect(group(groups, 'REGISTRATION').lines[0].text).not.toContain('shares');
  });

  it('puts the known registration status first in the registration group', () => {
    const groups = supplyGroups(
      structure([block('REGISTERED_RESALE')], { knownRegistrationStatus: 'EFFECTIVE' }),
      [],
    );
    expect(group(groups, 'REGISTRATION').lines[0].text).toBe('Known registration status · effective');
    expect(group(groups, 'REGISTRATION').lines).toHaveLength(2);
  });
});

describe('the cited filings, by form', () => {
  const evidence = [link(1, '8-K'), link(2, '6-K/A'), link(3, 'S-3'), link(4, '424B5'), link(5, '10-Q'), link(6, null)];

  it('lists 8-K and 6-K filings, and prospectus-type filings, from every cited source', () => {
    const groups = supplyGroups(
      structure([block('ATM', { evidenceSourceIds: [1, 4] }), block('WARRANTS', { evidenceSourceIds: [2] })], { evidenceSourceIds: [3, 5] }),
      evidence,
    );
    expect(group(groups, 'FILINGS').links.map((l) => l.id).sort()).toEqual([1, 2]);
    expect(group(groups, 'REGISTRATION').links.map((l) => l.id).sort()).toEqual([3, 4]);
  });

  it('lists the structure own sources, in the order cited, skipping ids with no link', () => {
    const groups = supplyGroups(structure([], { evidenceSourceIds: [5, 99, 1] }), evidence);
    expect(group(groups, 'SOURCES').links.map((l) => l.id)).toEqual([5, 1]);
  });

  it('does not list a filing twice when two blocks cite it', () => {
    const groups = supplyGroups(
      structure([block('ATM', { evidenceSourceIds: [1] }), block('PIPE', { evidenceSourceIds: [1] })]),
      evidence,
    );
    expect(group(groups, 'FILINGS').links).toHaveLength(1);
  });
});

describe('an empty group says so', () => {
  it('marks a group with nothing in it empty, for all six, and none when it has a line or a link', () => {
    const none = supplyGroups(structure([]), []);
    expect(none.map((g) => g.empty)).toEqual([true, true, true, true, true, true]);
    expect(none.map((g) => g.label)).toEqual(Object.values(SUPPLY_GROUP_LABEL));
    const some = supplyGroups(structure([block('ATM')]), []);
    expect(group(some, 'OFFERINGS').empty).toBe(false);
    expect(group(some, 'WARRANTS').empty).toBe(true);
  });

  it('prints the empty sentence in the drawer rather than dropping the heading', () => {
    const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');
    expect(source).toContain('SUPPLY_GROUP_EMPTY');
    expect(source).toContain('title={SUPPLY_GROUP_EMPTY_HOVER}');
    expect(source).toContain('supplyGroups(structure, intel.evidence)');
  });

  it("uses Marketing's words (0e1e90e7), and the empty sentence never reads as a finding", () => {
    expect(SUPPLY_GROUP_EMPTY).toBe('Nothing recorded for this group.');
    expect(SUPPLY_GROUP_EMPTY_HOVER).toBe(
      "The desk's research holds nothing here. Either it found none or it did not read for this group; the record does not say which.",
    );
    expect(SUPPLY_GROUP_LABEL.SOURCES).toBe('Filings cited for share structure');
  });
});
