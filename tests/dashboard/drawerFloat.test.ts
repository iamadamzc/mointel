/**
 * The drawer's float line follows the board cell's verdict (Integration 36th, on Commercial read 49 finding
 * (a)). WORX on 2026-10-08: the cell refused the count (449,860 shares issued since it) while the drawer
 * printed "Float is at most 89,789 shares outstanding". Where the wired cell refuses, the drawer prints the
 * cell's own refusal sentence and no ceiling.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { drawerFloatLine } from '@/lib/dashboard/drawerFloat';
import type { FloatBound } from '@/lib/dashboard/floatBound';
import type { SupplyPair } from '@/lib/research/supply';

// WORX-shaped: 89,789 shares outstanding as of 2026-08-14, under the low-float ceiling, so the drawer's own
// reading is PROVEN ("Float is at most 89,789 shares outstanding").
const worxPair = {
  sharesOutstanding: 89_789,
  sharesOutstandingAsOf: '2026-08-14',
  denominatorFactor: 1,
  concept: 'dei:EntityCommonStockSharesOutstanding',
  sourceId: 1,
  basis: 'REPORTED',
  floorShares: 449_860,
  floorRatio: 5.01,
  floorBlocks: 2,
} as unknown as SupplyPair;

const refused = (state: 'UNKNOWN' | 'CANNOT_VERIFY', reason: string): FloatBound =>
  ({
    state,
    reason,
    bound: null,
    countAsOf: '2026-08-14',
    countFiled: null,
    subtractedHolders: 0,
    filingsReadOn: '2026-10-08',
    holdingsFiledOn: [],
    countShares: null,
    countForm: null,
    insiders: [],
  }) as unknown as FloatBound;

describe('the drawer float line', () => {
  it("control: unwired, the drawer's own ceiling as before", () => {
    const line = drawerFloatLine(worxPair, null, false);
    expect(line?.sentence).toBe('Float is at most 89,789 shares outstanding');
    expect(line?.refusedByCell).toBe(false);
  });

  it('WORX: the cell refuses for an issuance since the count, so no ceiling, the cell sentence instead', () => {
    for (const reason of ['ISSUANCE_FLAGGED', 'ISSUANCE_FILED']) {
      const line = drawerFloatLine(worxPair, refused('CANNOT_VERIFY', reason), true);
      expect(line).toMatchObject({ sentence: 'Cannot verify: shares may have been issued since the filed count.', refusedByCell: true, tone: 'dim', detail: null });
      expect(line?.sentence).not.toMatch(/at most|89,789/);
    }
  });

  it('every other refusal prints its own passed sentence, never a ceiling', () => {
    expect(drawerFloatLine(worxPair, refused('UNKNOWN', 'NO_FILED_COUNT'), true)?.sentence).toBe('No filed share count.');
    expect(drawerFloatLine(worxPair, refused('CANNOT_VERIFY', 'COUNT_TOO_OLD'), true)?.sentence).toMatch(/^Cannot verify: the latest filed share count is from/);
    expect(drawerFloatLine(worxPair, refused('CANNOT_VERIFY', 'SPLIT_SINCE_COUNT'), true)?.sentence).toMatch(/share split/);
  });

  it('a produced cell, or "Not computed", leaves the drawer line unchanged', () => {
    const produced = { ...refused('CANNOT_VERIFY', 'X'), state: 'PRODUCED', reason: null, bound: 80_000, countShares: 89_789, countForm: '10-Q', countFiled: '2026-08-14' } as unknown as FloatBound;
    expect(drawerFloatLine(worxPair, produced, true)?.refusedByCell).toBe(false);
    expect(drawerFloatLine(worxPair, null, true)?.sentence).toBe('Float is at most 89,789 shares outstanding');
  });

  it('no share-count pair: no line at all, whatever the cell says', () => {
    expect(drawerFloatLine(null, refused('CANNOT_VERIFY', 'ISSUANCE_FLAGGED'), true)).toBeNull();
  });

  it('the drawer and its caller are wired to it', () => {
    const drawer = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');
    const ticker = readFileSync('components/TickerDrawer.tsx', 'utf8');
    expect(drawer).toContain('drawerFloatLine(structure.supplyPair, floatBound, floatBoundWired)');
    expect(drawer).not.toContain('floatBoundReading(structure.supplyPair)');
    expect(ticker).toContain('floatBound={row.floatBound}');
    expect(ticker).toContain('floatBoundWired={row.floatBoundWired}');
  });
});
