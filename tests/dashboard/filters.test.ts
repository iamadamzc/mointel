import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import { resolveWhy } from '@/lib/dashboard/why';
import { DEFAULT_FILTERS, rowMatchesFilters, type FilterState } from '@/lib/dashboard/view';
import { normalizeSheetRows } from '@/lib/data/rows';
import type { AutoIntelligence } from '@/lib/research/view';
import type { CatalystFreshness } from '@/lib/research/types';

/**
 * The filtering mechanism, which had NO TESTS AT ALL.
 *
 * He reported it on 2026-09-23: the `fresh catalyst` chip lit, the count
 * reading 3, and the board still showing names that say NO FRESH CATALYST
 * FOUND. Three defects were behind it, and the reason a change to the filter
 * type, its semantics and both call sites broke nothing in the suite is that
 * the suite never asked the filters a question. The only mention of
 * `applyFilters` in `tests/` was inside a comment.
 *
 * What these assert, in the order the defects were found:
 *
 * 1. A DESK ROW can be filtered. The old predicate took sheet tickers, so
 *    Discovery — which mostly has no sheet row — could not be filtered at all
 *    and never was.
 * 2. Freshness and grade are DIFFERENT AXES. The chip said "fresh catalyst"
 *    and filtered the grade bucket, so an A-graded stale catalyst passed and a
 *    fresh B did not.
 * 3. Every predicate reads the reading the CELL renders, so a filter cannot
 *    select a population the visible text contradicts.
 */

function intelligence(freshness: CatalystFreshness, grade: string): AutoIntelligence {
  return {
    ticker: 'HOWL',
    state: 'ACCEPTED',
    generatedAt: '2026-09-23T11:00:00.000Z',
    coverageIncomplete: false,
    analysis: {
      dossier: {
        ticker: 'HOWL',
        catalyst: {
          catalystGrade: grade,
          catalystStatus: 'FRESH_FOUND',
          freshness,
          confidence: 'HIGH',
          summary: 'Something happened.',
          whyTradersMayCare: null,
          eventTimestamp: '2026-09-23T09:00:00.000Z',
          plausiblyExplainsMove: true,
          unknowns: [],
          citations: [],
        },
        structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
        cycle: { cycleClassification: 'UNKNOWN' },
      },
    },
  } as unknown as AutoIntelligence;
}

/** A DISCOVERY row: dossier only, no sheet row — the population never filtered. */
function discoveryRow(freshness: CatalystFreshness, grade = 'STRONG') {
  return buildDeskRow('HOWL', null, null, null, intelligence(freshness, grade));
}

/** A watchlist row: the same name with a sheet row behind it. */
function sheetRow(freshness: CatalystFreshness, grade = 'STRONG') {
  const cells: string[] = new Array(27).fill('');
  cells[0] = 'A - PRIMARY';
  cells[1] = 'HOWL';
  const ticker = normalizeSheetRows([cells], []).tickers[0]!;
  return buildDeskRow('HOWL', ticker, null, null, intelligence(freshness, grade));
}

const filters = (over: Partial<FilterState> = {}): FilterState => ({ ...DEFAULT_FILTERS, ...over });

describe('a Discovery row can be filtered at all', () => {
  it('matches everything when no filter is set', () => {
    expect(rowMatchesFilters(discoveryRow('FRESH'), filters())).toBe(true);
  });

  it('is INCLUDED by the freshness filter without any sheet row', () => {
    /*
     * The defect this replaces would have gone the other way: wiring the old
     * sheet-field predicate to Discovery would have dropped every Discovery
     * name the moment a chip was lit, which looks exactly like a filter
     * working. So this asserts inclusion, not just that filtering happens.
     */
    expect(rowMatchesFilters(discoveryRow('FRESH'), filters({ catalyst: 'FRESH' }))).toBe(true);
  });

  it('is EXCLUDED when its catalyst is not fresh', () => {
    // His words for what should happen: non-green falls off the screen.
    expect(rowMatchesFilters(discoveryRow('STALE'), filters({ catalyst: 'FRESH' }))).toBe(false);
    expect(rowMatchesFilters(discoveryRow('RECENT'), filters({ catalyst: 'FRESH' }))).toBe(false);
    expect(rowMatchesFilters(discoveryRow('UNKNOWN'), filters({ catalyst: 'FRESH' }))).toBe(false);
  });

  it('treats a watchlist row identically, so the two tables cannot diverge', () => {
    for (const freshness of ['FRESH', 'STALE'] as const) {
      expect(rowMatchesFilters(sheetRow(freshness), filters({ catalyst: 'FRESH' }))).toBe(
        rowMatchesFilters(discoveryRow(freshness), filters({ catalyst: 'FRESH' })),
      );
    }
  });
});

describe('freshness and grade are different axes', () => {
  it('passes a FRESH catalyst the desk grades only B', () => {
    // The old predicate filtered the grade bucket under the word "fresh", so
    // this row — genuinely fresh — was hidden by the fresh-catalyst chip.
    const row = discoveryRow('FRESH', 'MODERATE_MIXED_SECONDARY');

    expect(resolveWhy(row).grade).toBe('B');
    expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(true);
  });

  it('rejects an A-graded catalyst that is STALE', () => {
    // And the mirror: strong but stale used to pass the "fresh" chip.
    const row = discoveryRow('STALE', 'STRONG');

    expect(resolveWhy(row).grade).toBe('A');
    expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(false);
  });

  it('filters grade on its own control, independently of freshness', () => {
    const freshB = discoveryRow('FRESH', 'MODERATE_MIXED_SECONDARY');

    expect(rowMatchesFilters(freshB, filters({ grade: 'A' }))).toBe(false);
    expect(rowMatchesFilters(freshB, filters({ grade: 'B' }))).toBe(true);
  });

  it('applies both when both are set', () => {
    const freshB = discoveryRow('FRESH', 'MODERATE_MIXED_SECONDARY');
    expect(rowMatchesFilters(freshB, filters({ catalyst: 'FRESH', grade: 'A' }))).toBe(false);
    expect(rowMatchesFilters(freshB, filters({ catalyst: 'FRESH', grade: 'B' }))).toBe(true);
  });
});

describe('the predicate reads what the cell renders', () => {
  it('selects exactly the rows whose Why cell is green', () => {
    /*
     * The structural claim, asserted rather than asserted ABOUT: green is
     * `tone === 'pos'`, and the freshness filter must select that set and no
     * other. If the two ever diverge, this fails rather than a trader
     * noticing a filter that keeps non-green rows on screen.
     */
    for (const freshness of ['FRESH', 'RECENT', 'STALE', 'UNKNOWN'] as const) {
      const row = discoveryRow(freshness);
      const green = resolveWhy(row).tone === 'pos';
      expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(green);
    }
  });

  it('matches the ticker search without regard to the other axes', () => {
    expect(rowMatchesFilters(discoveryRow('STALE'), filters({ search: 'HOW' }))).toBe(true);
    expect(rowMatchesFilters(discoveryRow('FRESH'), filters({ search: 'ZZZ' }))).toBe(false);
  });
});
