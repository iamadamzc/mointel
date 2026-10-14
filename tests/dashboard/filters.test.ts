import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { boardCounts } from '@/lib/dashboard/boardCounts';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { relativeAge, resolveWhy } from '@/lib/dashboard/why';
import { DEFAULT_FILTERS, rowMatchesFilters, type FilterState } from '@/lib/dashboard/view';
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
/**
 * An event on the ET calendar day `days` ago, anchored at midday.
 *
 * NOT AN HOUR OFFSET, AND THE BANDS ARE WHY. He defined freshness as calendar
 * bands on the ET date — FRESH today, RECENT yesterday — so a fixture saying
 * "two hours ago" lands on the previous ET day whenever the suite runs between
 * midnight and 02:00 ET, and the same assertion flips. Anchoring at 16:00Z is
 * midday in both EDT and EST, so no fixture can straddle a boundary.
 */
function etDaysAgo(days: number): string {
  const et = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  /*
   * A BARE DATE, WHICH IS ALSO WHAT 77% OF STORED EVENT TIMESTAMPS ARE.
   *
   * A first pass returned an instant at 16:00Z — midday in both EDT and EST,
   * chosen so no fixture could straddle an ET day boundary. It straddled a
   * different one: before noon ET that instant is in the FUTURE, and a future
   * event is correctly UNKNOWN rather than FRESH. Six tests passed at the hour
   * I wrote them and failed at 14:42Z the same day.
   *
   * A bare date has no clock to be ahead of. It cannot be future-dated by the
   * time of day the suite happens to run at, and it exercises the shape most
   * of the real data has.
   */
  return new Date(Date.parse(`${et}T12:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** The ET calendar day each band lives on. */
const DAYS_FOR: Record<CatalystFreshness, number | null> = {
  FRESH: 0,
  RECENT: 1,
  STALE: 30,
  // No timestamp at all: the derivation cannot place it, so it is UNKNOWN.
  UNKNOWN: null,
};

function intelligence(freshness: CatalystFreshness, grade: string): AutoIntelligence {
  const days = DAYS_FOR[freshness];
  const eventTimestamp = days === null ? null : etDaysAgo(days);
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
  return buildDeskRow('HOWL', null, intelligence(freshness, grade));
}

/** Formerly a watchlist row with a Sheet row behind it; since the A5 rest every row is built the same way. */
function sheetRow(freshness: CatalystFreshness, grade = 'STRONG') {
  return buildDeskRow('HOWL', null, intelligence(freshness, grade));
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
    /*
     * `rank` IS THE ONE SORT WITH NO COLUMN, AND THAT IS HIS RULING RATHER
     * THAN AN OVERSIGHT (2026-09-25): the rank COLUMN is gone and the
     * ordering stays available as a chip. It is deliberately still a sort --
     * after the bell it is the only route to AH-participation order, because
     * `discoveryValueFor` is board-aware on `rank` and not on `rvol`.
     *
     * Listed by name rather than filtered by a rule, so adding a second
     * column-less sort has to come back through this test.
     */
    const noColumnOfItsOwn = new Set(['rank']);
    for (const column of new Set(entries.map((e) => e.column))) {
      if (noColumnOfItsOwn.has(column)) continue;
      expect(source).toContain(`activeColumn === '${column}'`);
    }
    // And the exception is real: no header claims to be the rank column.
    expect(source).not.toMatch(/<Th[^>]*activeColumn === 'rank'/);
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

  it('never reads the dossier freshness field at all', () => {
    /*
     * THIS ASSERTED "EXACTLY ONE" AND THE ANSWER IS NOW ZERO, which is the
     * seam having done its job and then been made redundant by his ruling.
     * The one read existed so Research's derived reader could replace it in a
     * single edit. His calendar bands went further: the model is out of the
     * freshness judgement entirely, so the stored word is not consulted.
     *
     * Zero is the stronger claim and the one worth pinning — a regression that
     * reintroduced the model's word anywhere would fail here.
     */
    expect(reads).toBe(0);
  });

  it('serves the colour, the verdict and the tooltip from ONE derived value', () => {
    // Still one local, still every consumer taking it — what changed is where
    // it comes from, not how many places read it.
    for (const consumer of ['FRESHNESS_TONE[freshness]', "freshness === 'STALE'"]) {
      expect(source).toContain(consumer);
    }
    /*
     * MATCHED, NOT PINNED, AND THE DIFFERENCE COST A RED GATE. This read
     * `toContain('whyTitle(grade, freshness)')` and broke when `whyTitle`
     * gained a third argument for the prior-close reason — a change that adds
     * an argument, not a second freshness source, so the rule this test exists
     * for was never violated. **An assertion on exact call text fails on
     * shape; the rule here is about the VALUE being passed.**
     */
    expect(source).toMatch(/whyTitle\(grade, freshness[,)]/);
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
  function aged(
    days: number | null,
    claimed: CatalystFreshness,
    explainsMove: boolean | null = true,
    status = 'FRESH_FOUND',
  ) {
    const at = days === null ? null : etDaysAgo(days);
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
            catalystStatus: status,
            freshness: claimed,
            confidence: 'HIGH',
            summary: 'Something happened.',
            whyTradersMayCare: null,
            eventTimestamp: at,
            plausiblyExplainsMove: explainsMove,
            unknowns: [],
            citations: [],
          },
          structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
          cycle: { cycleClassification: 'UNKNOWN' },
        },
      },
    } as unknown as AutoIntelligence;
    return buildDeskRow('HOWL', null, intel);
  }

  it('no longer renders green, and no longer passes the chip', () => {
    const row = aged(28, 'FRESH');

    expect(resolveWhy(row).freshness).toBe('STALE');
    expect(resolveWhy(row).tone).not.toBe('pos');
    expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(false);
  });

  it('demotes a DISPROVEN fresh claim to STALE, and says so on the row', () => {
    /*
     * HIS RULING, 2026-09-24, REVERSING THE EARLIER ONE (`fadfe17`). An
     * earlier assertion here expected RECENT, on the reasoning that the age
     * disproves FRESH and proves nothing about STALE. He chose STALE, and the
     * reason is the consequence rather than the taxonomy: STALE is what puts
     * `no fresh news` on the row, which is the mark he said was missing.
     *
     * So the visible effect is asserted here, not just the word — it is the
     * thing the ruling actually bought, on roughly 39 rows.
     */
    const row = aged(28, 'FRESH', false);

    expect(resolveWhy(row).freshness).toBe('STALE');
    // `OLD_CATALYST`, not `NO_FRESH_CATALYST`: a catalyst EXISTS here and it
    // is old, which is a different fact from the desk finding none.
    expect(resolveWhy(row).code).toBe('OLD_CATALYST');
  });

  it('says NO CATALYST FOUND only when the desk actually found none', () => {
    /*
     * The other half of the split. One badge used to fire for both, so the row
     * could not tell "nothing happened" from "something did, a while ago" —
     * and those argue differently about whether to look further.
     */
    const found = aged(28, 'FRESH', false);
    const none = aged(28, 'FRESH', false, 'NONE_FOUND');

    expect(resolveWhy(found).code).toBe('OLD_CATALYST');
    expect(resolveWhy(none).code).toBe('NO_FRESH_CATALYST');
  });

  it('withholds that badge when the analysis says the catalyst DOES explain the move', () => {
    /*
     * STALE alone does not put `no fresh news` on a row — `noFresh` also
     * requires `plausiblyExplainsMove !== true`. I stated that qualification
     * to him when giving the ~39-row figure, and a first pass at the test
     * above missed it: the fixture claimed the catalyst explained the move, so
     * the badge never fired and the assertion failed for the right reason.
     *
     * It is the honest behaviour. A month-old catalyst the desk believes is
     * still driving the move is old, but "no fresh news" would be the wrong
     * sentence about it.
     */
    const row = aged(28, 'FRESH', true);

    expect(resolveWhy(row).freshness).toBe('STALE');
    expect(resolveWhy(row).code).toBe('GRADED');
  });

  it('ignores what the model claimed, because the bands are calendar arithmetic', () => {
    /*
     * SUPERSEDED TWICE IN TWO DAYS, AND THE ASSERTION IS REMOVED RATHER THAN
     * RELAXED. This asserted that a model `RECENT` survived the demotion, which
     * was true under the 36-hour contract. He then defined freshness as age
     * bands on the ET calendar — FRESH today, RECENT yesterday, older is not
     * either — which takes the model out of the judgement altogether.
     *
     * So the model's word no longer changes the answer for ANY claim, and that
     * is what is asserted: same age, three different claims, one verdict.
     */
    for (const claimed of ['FRESH', 'RECENT', 'STALE'] as const) {
      expect(resolveWhy(aged(28, claimed)).freshness).toBe('STALE');
    }
  });

  it('still calls a genuinely recent catalyst FRESH', () => {
    // The control. Without it the fix could have demoted everything, which
    // would empty the chip and look like it was working.
    const row = aged(0, 'FRESH');

    expect(resolveWhy(row).freshness).toBe('FRESH');
    expect(rowMatchesFilters(row, filters({ catalyst: 'FRESH' }))).toBe(true);
  });

  it('is UNKNOWN with no timestamp, rather than taking the claim on trust', () => {
    // 19 of the 52 unsupported claims had no timestamp at all.
    expect(resolveWhy(aged(null, 'FRESH')).freshness).toBe('UNKNOWN');
    expect(rowMatchesFilters(aged(null, 'FRESH'), filters({ catalyst: 'FRESH' }))).toBe(false);
  });
});

describe('a setup grade filter hides non-matching rows, Discovery included', () => {
  /*
   * His ruling, 2026-09-23: "a filter should filter". The grade is the desk's
   * own stored reading, so a name with no grade at the checkpoint (the dash)
   * matches no letter and not "Not graded" either. Selecting A means "the names
   * the desk read as A", and a name with no reading is not one of them.
   */
  const stored = (grade: 'A' | 'B' | 'C' | 'AVOID' | 'UNKNOWN' | 'NOT_YET') => ({
    grade,
    basis: { structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'STRONG', supply: 'UNKNOWN' } as const,
    rule: 'rubric-2026-10-05',
    checkpointCompletedAt: '2026-10-05T19:42:00.000Z',
  });
  const graded = (row: ReturnType<typeof discoveryRow>, grade: Parameters<typeof stored>[0]) => ({
    ...row,
    setupGrade: stored(grade),
  });

  it('keeps a row whose stored grade matches, on either board population', () => {
    expect(rowMatchesFilters(graded(discoveryRow('FRESH'), 'A'), filters({ setupGrade: 'A' }))).toBe(true);
    expect(rowMatchesFilters(graded(sheetRow('FRESH'), 'B'), filters({ setupGrade: 'B' }))).toBe(true);
  });

  it('hides a row whose grade does not match', () => {
    expect(rowMatchesFilters(graded(discoveryRow('FRESH'), 'A'), filters({ setupGrade: 'C' }))).toBe(false);
  });

  it('D selects stored AVOID, and Not graded selects stored UNKNOWN only', () => {
    expect(rowMatchesFilters(graded(discoveryRow('FRESH'), 'AVOID'), filters({ setupGrade: 'D' }))).toBe(true);
    expect(rowMatchesFilters(graded(discoveryRow('FRESH'), 'UNKNOWN'), filters({ setupGrade: 'NOT_GRADED' }))).toBe(true);
    expect(rowMatchesFilters(graded(discoveryRow('FRESH'), 'NOT_YET'), filters({ setupGrade: 'NOT_GRADED' }))).toBe(false);
  });

  it('hides a row with NO grade (the dash) under every selected grade', () => {
    const row = discoveryRow('FRESH');
    expect(row.setupGrade).toBeNull();
    for (const selected of ['A', 'B', 'C', 'D', 'NOT_GRADED'] as const) {
      expect(rowMatchesFilters(row, filters({ setupGrade: selected })), selected).toBe(false);
    }
  });

  it('leaves every row alone when no grade is selected', () => {
    // The control: without it, a predicate that excluded ungraded rows
    // unconditionally would pass the tests above and empty the board.
    expect(rowMatchesFilters(discoveryRow('FRESH'), filters({ setupGrade: 'ALL' }))).toBe(true);
    expect(rowMatchesFilters(sheetRow('STALE'), filters({ setupGrade: 'ALL' }))).toBe(true);
  });
});

describe('one predicate, so the two tables cannot disagree', () => {
  it('is the only filter function the shell imports', () => {
    /*
     * `applyFilters` filtered structure on the SHEET field while
     * `rowMatchesFilters` filters it on the risk cell, and the Discovery fix
     * layered them rather than replacing — so the watchlist showed the
     * INTERSECTION of two definitions and a row could be visible above and
     * hidden below. Nobody would read that as a bug; it looks like the filter
     * being stricter in one place.
     */
    // Comments stripped on BOTH files: the comments that explain the deletion
    // name the deleted function, and a first pass counted them as survivors.
    // That is the same trap this suite already hit once, in the seam guard.
    const strip = (text: string) =>
      text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const shell = strip(readFileSync(join(process.cwd(), 'components/DashboardShell.tsx'), 'utf8'));
    expect(shell).toContain('rowMatchesFilters');
    expect(shell).not.toContain('applyFilters');

    const view = strip(readFileSync(join(process.cwd(), 'lib/dashboard/view.ts'), 'utf8'));
    expect(view).not.toContain('applyFilters');
  });
});

describe('the bands themselves, on the ET calendar', () => {
  /*
   * His definition, 2026-09-24: FRESH is today, RECENT is yesterday, older is
   * neither. Asserted through `resolveWhy` rather than against the research
   * function directly, because what matters here is that the BOARD lands in
   * the right band — the colour, the chip and the badge all read this.
   */
  function onDay(days: number) {
    return resolveWhy(discoveryRowOn(days));
  }

  function discoveryRowOn(days: number) {
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
            // Deliberately the WRONG claim on every row: the bands are
            // arithmetic now and the model's word must not move the answer.
            freshness: 'FRESH',
            confidence: 'HIGH',
            summary: 'Something happened.',
            whyTradersMayCare: null,
            eventTimestamp: etDaysAgo(days),
            plausiblyExplainsMove: false,
            unknowns: [],
            citations: [],
          },
          structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
          cycle: { cycleClassification: 'UNKNOWN' },
        },
      },
    } as unknown as AutoIntelligence;
    return buildDeskRow('HOWL', null, intel);
  }

  it('is FRESH today and RECENT yesterday', () => {
    expect(onDay(0).freshness).toBe('FRESH');
    expect(onDay(1).freshness).toBe('RECENT');
  });

  it('is neither from the day before that onwards', () => {
    // The boundary, asserted on both sides so an off-by-one moves a test.
    expect(onDay(2).freshness).not.toBe('FRESH');
    expect(onDay(2).freshness).not.toBe('RECENT');
  });

  it('greens only the FRESH band, so the chip and the colour still agree', () => {
    expect(onDay(0).tone).toBe('pos');
    expect(onDay(1).tone).not.toBe('pos');
    expect(rowMatchesFilters(discoveryRowOn(0), filters({ catalyst: 'FRESH' }))).toBe(true);
    expect(rowMatchesFilters(discoveryRowOn(1), filters({ catalyst: 'FRESH' }))).toBe(false);
  });
});

describe('the age and the band cannot disagree about which day it was', () => {
  /*
   * Research's ship-blocker, found before the batch went out. `relativeAge`
   * read `Date.parse` on every timestamp, and 77% of stored event timestamps
   * carry no time of day — a bare date is stored at noon UTC so it lands on
   * the right ET day, and reading that back as an instant invents a clock.
   *
   * His bands turned that from a quiet inaccuracy into a visible contradiction:
   * a yesterday bare date derives RECENT while the age beside it rendered
   * `2d`, which reads OLD. On the majority of rows, the moment the bands ship.
   */
  it('renders a DAY count for a bare date, never an hour', () => {
    // `16h` on a date-only source is precision from a storage convention.
    expect(relativeAge(etDaysAgo(1), Date.now())).toBe('1d');
    expect(relativeAge(etDaysAgo(3), Date.now())).toBe('3d');
    expect(relativeAge(etDaysAgo(1), Date.now())).not.toMatch(/h$/);
  });

  it('says today rather than 0d, because nobody says zero days', () => {
    expect(relativeAge(etDaysAgo(0), Date.now())).toBe('today');
  });

  it('agrees with the band on the same row, which is the whole point', () => {
    const table = [
      { days: 0, age: 'today', band: 'FRESH' },
      { days: 1, age: '1d', band: 'RECENT' },
      { days: 2, age: '2d', band: 'STALE' },
    ] as const;

    for (const row of table) {
      expect(relativeAge(etDaysAgo(row.days), Date.now())).toBe(row.age);
      expect(resolveWhy(discoveryRowOnDay(row.days)).freshness).toBe(row.band);
    }
  });

  it('still offers hours where a real clock exists', () => {
    // The control. A fix that dropped hour precision everywhere would pass the
    // three tests above and lose the one thing an exact timestamp is for.
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(relativeAge(twoHoursAgo, Date.now())).toBe('2h');
  });

  function discoveryRowOnDay(days: number) {
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
            freshness: 'FRESH',
            confidence: 'HIGH',
            summary: 'Something happened.',
            whyTradersMayCare: null,
            eventTimestamp: etDaysAgo(days),
            plausiblyExplainsMove: false,
            unknowns: [],
            citations: [],
          },
          structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
          cycle: { cycleClassification: 'UNKNOWN' },
        },
      },
    } as unknown as AutoIntelligence;
    return buildDeskRow('HOWL', null, intel);
  }
});

describe('the accent marks the active ordering, and only that', () => {
  /*
   * He read a correctly sorted board as "random" TWICE — once on NOW, once on
   * PM MOVE, where the values ran 30.5, 8.3, 7.0, 4.2 down the page while RANK
   * read 8, 13, 26, 38 beside them.
   *
   * The cause was a colour, not a missing marker. Accent is already this
   * desk's mark for the active ordering — it lights the sort chip — and RANK
   * wore it unconditionally, so the leftmost and most saturated column
   * announced an order the rows were not in. A caret and a header note
   * competed with that colour instead of removing it, which is why the first
   * pass did not land.
   */
  const source = readFileSync(join(process.cwd(), 'components/DiscoveryBoard.tsx'), 'utf8');
  const cells = readFileSync(join(process.cwd(), 'components/DecisionCells.tsx'), 'utf8');

  it('has no rank cell left to wear the wrong accent', () => {
    /*
     * THIS ASSERTED THE FIX; HIS RULING REMOVED THE DEFECT INSTEAD.
     *
     * The original: accent is the desk's mark for the active ordering, and
     * RANK wore it unconditionally, so under any other sort the leftmost and
     * most saturated column announced an order the rows were not in. He read
     * a correctly sorted board as "random" twice. The repair made the accent
     * conditional.
     *
     * On 2026-09-25 he removed the rank column outright. **A column that does
     * not exist cannot wear an accent it has not earned** -- the desk's own
     * preference for making a defect impossible rather than handled, arriving
     * from the product side rather than the code side. So the assertion moves
     * from "the condition is correct" to "there is nothing to condition".
     */
    expect(source).not.toContain("activeColumn === 'rank' ? 'text-accent'");
    expect(source).not.toMatch(/\{rank \?\? '—'\}/);
    // The ordering itself survives as a sort, which is the half he kept.
    expect(source).toMatch(/key: 'rank', label: 'Rank'/);
  });

  it('marks the sorted figure on its LABEL, never on the percentage', () => {
    /*
     * The percentage's colour carries DIRECTION — green up, red down. Putting
     * "this is the sort" on it too would be two meanings on one colour, which
     * is the defect this board keeps producing. The label carries nothing
     * else, so it is free to say where the order came from.
     */
    expect(cells).toContain("sorted ? 'font-semibold text-accent' : 'text-ink-3'");
    const pct = cells.match(/\{formatSignedPercent\(value\)\}/);
    expect(pct).not.toBeNull();
    // The percentage keeps its direction tone and gains nothing conditional.
    expect(cells).toContain('${changeTone}');
  });

  it('routes the mark through the sort table, not a per-key test', () => {
    // Same rule the rest of this component obeys, and the same guard that has
    // caught me twice: no `sort.key === ...` in the markup.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/sort\.key === '(sessionMove|changePct|now|rvol)'/);
    expect(code).toContain('activeColumn');
  });
});

describe('the counts strip counts what the click keeps, over the whole board', () => {
  const named = (row: ReturnType<typeof discoveryRow>, ticker: string) => ({ ...row, ticker });

  it('fresh catalyst counts FRESH rows, not strong ones: a stale A does not count, a fresh C does', () => {
    // The defect fixed: the chip's number was the count of A-graded Sheet rows
    // while its label and click were FRESH.
    const rows = [
      named(discoveryRow('STALE', 'STRONG'), 'AAA'),
      named(discoveryRow('FRESH', 'WEAK'), 'BBB'),
      named(discoveryRow('FRESH', 'STRONG'), 'CCC'),
    ];
    const counts = boardCounts(rows, () => null);
    expect(counts.freshCatalyst).toBe(2);
    expect(counts.freshCatalyst).toBe(rows.filter((r) => rowMatchesFilters(r, filters({ catalyst: 'FRESH' }))).length);
  });

  it('counts the cycle phases from the lookup the click uses', () => {
    const rows = ['AAA', 'BBB', 'CCC', 'DDD'].map((t) => named(discoveryRow('FRESH'), t));
    const phase = { AAA: 'BACKSIDE', BBB: 'BACKSIDE', CCC: 'DAY_ONE', DDD: null } as const;
    const counts = boardCounts(rows, (t) => phase[t as keyof typeof phase]);
    expect(counts.backside).toBe(2);
    expect(counts.dayOne).toBe(1);
    expect(counts.frontside).toBe(0);
  });

  it('onBoard is the number of rows, and an empty board counts zero everywhere', () => {
    const rows = [named(discoveryRow('FRESH'), 'AAA'), named(discoveryRow('STALE'), 'BBB')];
    expect(boardCounts(rows, () => null).onBoard).toBe(2);
    expect(boardCounts([], () => null)).toEqual({
      onBoard: 0,
      dayOne: 0,
      frontside: 0,
      backside: 0,
      dirtyFloat: 0,
      freshCatalyst: 0,
    });
  });
});
