import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * How old the event must be for a stored freshness to still decide.
 *
 * SINCE `f224f3d` THE STORED WORD NO LONGER DECIDES ON ITS OWN. `resolveWhy`
 * derives freshness: inside the 36-hour window the answer is FRESH whatever
 * the model said, and only PAST it does the model's RECENT/STALE call stand.
 *
 * These fixtures used a fixed timestamp hours old AND a stored `STALE`, which
 * was a coherent world before the derivation and is a contradiction after it —
 * two tests failed for exactly that reason. So the age is now chosen to put
 * each stored word in the world where it actually governs, relative to the
 * real clock rather than to a date written into the file.
 */
const AGE_FOR: Record<CatalystFreshness, number | null> = {
  FRESH: 2,
  RECENT: 24 * 30,
  STALE: 24 * 30,
  // No timestamp at all: the derivation cannot place it, so it is UNKNOWN.
  UNKNOWN: null,
};

function intelligence(freshness: CatalystFreshness, grade: string): AutoIntelligence {
  const hours = AGE_FOR[freshness];
  const eventTimestamp =
    hours === null ? null : new Date(Date.now() - hours * 3600_000).toISOString();
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
          eventTimestamp,
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

describe('the active sort is readable from the board, not only the toolbar', () => {
  /*
   * He sorted by NOW and reported "no obvious sort". It WAS sorting — the rows
   * were in perfect NOW order — but the RANK column showed 3, 2, 21, 8, 5,
   * because rank is the board's own ordering and not the row position. A
   * `sorted by now` badge already sat in the toolbar and lost to the numbers.
   *
   * These read the component's source because the marker is JSX: what is
   * assertable is that every sort key declares which column it marks, and that
   * every declared column is actually wired to a header.
   */
  const source = readFileSync(join(process.cwd(), 'components/DiscoveryBoard.tsx'), 'utf8');
  /*
   * The window has to clear the LONGEST entry, and a first pass at 320
   * characters silently missed `now` — whose title and metric sit between its
   * key and its column. The entry list came back without the one key this
   * change is about, and the coverage check below would have passed over it.
   */
  const entries = [...source.matchAll(/key:\s*'(\w+)'[\s\S]{0,900}?column:\s*'(\w+)'/g)].map(
    (m) => ({ key: m[1]!, column: m[2]! }),
  );

  it('found the sort entries, so the checks below are not vacuously empty', () => {
    expect(entries.length).toBeGreaterThanOrEqual(7);
    expect(entries.map((e) => e.key)).toContain('now');
    expect(entries.find((e) => e.key === 'now')?.column).toBe('now');
  });

  it('declares a column for every sort key', () => {
    // A key with no column silently marks nothing, which is the state he
    // reported: an ordering with no visible sign of itself.
    const keys = [...source.matchAll(/\{\s*key:\s*'(\w+)'/g)].map((m) => m[1]!);
    expect(new Set(entries.map((e) => e.key))).toEqual(new Set(keys));
  });

  it('wires every declared column to a header marker', () => {
    for (const column of new Set(entries.map((e) => e.column))) {
      expect(source).toContain(`activeColumn === '${column}'`);
    }
  });

  it('names the units for NOW, which reads as recency and not as a quantity', () => {
    // "-1m" says when, never what. He asked "what's it sorting" for that reason.
    expect(source).toContain('trades in the last settled minute');
  });
});

describe('freshness has ONE read, which is the seam Research replaces', () => {
  /*
   * `resolveCatalystFreshness` is being written to derive freshness at read
   * time (FRESH within 36h, otherwise the model's own RECENT/STALE, UNKNOWN
   * with no timestamp) so stored dossiers are corrected as they are rendered.
   *
   * The risk in that handoff is not the derivation, it is the SWAP: four
   * places read `catalyst.freshness` independently — the colour, the NO FRESH
   * CATALYST verdict, the returned field and the tooltip — and a swap that
   * misses one leaves the colour disagreeing with the words beside it. This
   * asserts there is exactly one read to change.
   */
  const source = readFileSync(join(process.cwd(), 'lib/dashboard/why.ts'), 'utf8');
  /*
   * COMMENTS STRIPPED BEFORE COUNTING, because the first pass counted the
   * comment that EXPLAINS the seam and reported two reads. This thread has
   * read a comment as code more than once; a source-reading test is the place
   * it is most likely to happen and the least likely to be noticed.
   */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const reads = [...code.matchAll(/catalyst\??\.freshness/g)].length;

  it('reads the dossier field exactly once', () => {
    expect(reads).toBe(1);
  });

  it('serves the colour, the verdict, the field and the tooltip from that read', () => {
    // Each consumer takes the local, so none can be left behind on a swap.
    for (const consumer of ['FRESHNESS_TONE[freshness]', "freshness === 'STALE'", 'whyTitle(grade, freshness)']) {
      expect(source).toContain(consumer);
    }
  });

  it('keeps the filter on the same reading, so it inherits the fix', () => {
    // `rowMatchesFilters` asks `resolveWhy`, not the dossier — so when the
    // derived reader lands, the fresh-catalyst chip moves with the colour and
    // needs no separate change.
    const view = readFileSync(join(process.cwd(), 'lib/dashboard/view.ts'), 'utf8');
    expect(view).toContain('why.freshness');
    expect(view).not.toMatch(/dossier[\s\S]{0,40}freshness/);
  });
});

describe('the 28-day catalyst that rendered green', () => {
  /*
   * The defect he saw, at the render seam rather than in the derivation.
   * `why.ts` computed the age arithmetically three lines above the colour and
   * still took the colour from the model's word — so a catalyst stamped `28d`
   * came out FRESH and green. Research measured the scale on the 2026-08-23
   * snapshot: 52 of 325 analyses claimed FRESH unsupported, 16%.
   */
  function aged(hours: number | null, claimed: CatalystFreshness) {
    const at = hours === null ? null : new Date(Date.now() - hours * 3600_000).toISOString();
    const intel = {
      ticker: 'HOWL',
      state: 'ACCEPTED',
      generatedAt: new Date().toISOString(),
      coverageIncomplete: false,
      analysis: {
        dossier: {
          ticker: 'HOWL',
          catalyst: {
            catalystGrade: 'STRONG',
            catalystStatus: 'FRESH_FOUND',
            freshness: claimed,
            confidence: 'HIGH',
            summary: 'Something happened.',
            whyTradersMayCare: null,
            eventTimestamp: at,
            plausiblyExplainsMove: true,
            unknowns: [],
            citations: [],
          },
          structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
          cycle: { cycleClassification: 'UNKNOWN' },
        },
      },
    } as unknown as AutoIntelligence;
    return buildDeskRow('HOWL', null, null, null, intel);
  }

  it('no longer renders green, and no longer passes the chip', () => {
    const row = aged(28 * 24, 'FRESH');

    expect(resolveWhy(row).freshness).toBe('RECENT');
    expect(resolveWhy(row).tone).not.toBe('pos');
    expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(false);
  });

  it('demotes to RECENT and not to STALE, which the age cannot prove', () => {
    // His ruling, 2026-09-23: past the window the model keeps the call. The
    // age disproves FRESH and says nothing about STALE, so inventing the
    // stronger verdict would be the same overreach pointed the other way.
    expect(resolveWhy(aged(28 * 24, 'FRESH')).freshness).toBe('RECENT');
    expect(resolveWhy(aged(28 * 24, 'STALE')).freshness).toBe('STALE');
  });

  it('still calls a genuinely recent catalyst FRESH', () => {
    // The control. Without it the fix could have demoted everything, which
    // would empty the chip and look like it was working.
    const row = aged(2, 'FRESH');

    expect(resolveWhy(row).freshness).toBe('FRESH');
    expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(true);
  });

  it('is UNKNOWN with no timestamp, rather than taking the claim on trust', () => {
    // 19 of the 52 unsupported claims had no timestamp at all.
    expect(resolveWhy(aged(null, 'FRESH')).freshness).toBe('UNKNOWN');
    expect(rowMatchesFilters(aged(null, 'FRESH'), filters({ catalyst: 'FRESH' }))).toBe(false);
  });
});
