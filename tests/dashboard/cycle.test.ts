import { describe, expect, it } from 'vitest';

import {
  CYCLE_PHASE_LABEL,
  countCyclePhases,
  cycleDetail,
  formatHighPair,
  formatTradingDate,
  highReading,
  cyclePhaseOf,
  cyclePhaseTone,
  resolveComputedCycle,
} from '@/lib/dashboard/cycle';
import type { DeskRow } from '@/lib/dashboard/merge';
import type { CycleArc, CycleHistory } from '@/lib/market/cycle';

function arc(overrides: Partial<CycleArc> = {}): CycleArc {
  return {
    phase: 'BACKSIDE',
    startDate: '2026-08-10',
    baseClose: 1.0,
    cycleHigh: 1.2,
    cycleHighDate: '2026-08-12',
    sessionsSinceHigh: 9,
    sessionsInCycle: 11,
    givebackPct: 0.0833,
    retracementPct: 0.5,
    recentRvol: [2.1, 1.4],
    advancePct: 20,
    latestDate: '2026-08-21',
    latestClose: 1.1,
    ...overrides,
  };
}

function history(current: CycleHistory['current']): CycleHistory {
  return {
    current,
    priorCycles: [],
    formerRunnerStatus: 'NONE',
    todayStart: 'UNVERIFIABLE',
    largestPriorAdvancePct: null,
    asOfTradingDate: '2026-08-21',
  };
}

const row = (h: CycleHistory | null): DeskRow =>
  ({ intelligence: { analysis: { dossier: { computedCycle: h } } } }) as unknown as DeskRow;

describe('cycle labels', () => {
  it('names every phase in the trader’s words, with no engine names left', () => {
    expect(CYCLE_PHASE_LABEL).toEqual({
      DAY_ONE: 'DAY 1',
      FRONTSIDE: 'FRONTSIDE',
      PULLBACK: 'OFF HIGH',
      BACKSIDE: 'BACKSIDE',
      SHADOW: 'PRIOR RUN',
      NO_CYCLE: 'NO RUN',
    });
  });

  /*
   * The collision that forced the rename. In this trader's playbook a pullback
   * is the micro pullback on rising volume that triggers an entry; as a cycle
   * phase it is a multi-session position in the arc. The same word would say
   * "buy" on one surface and "context" on another.
   */
  it('never shows the word PULLBACK, which means an entry trigger to this trader', () => {
    expect(Object.values(CYCLE_PHASE_LABEL).join(' ')).not.toMatch(/PULLBACK/i);
  });

  it('colours only the phases a trader acts against', () => {
    expect(cyclePhaseTone('DAY_ONE')).toBe('pos');
    expect(cyclePhaseTone('FRONTSIDE')).toBe('pos');
    expect(cyclePhaseTone('PULLBACK')).toBe('warn');
    expect(cyclePhaseTone('BACKSIDE')).toBe('neg');
    // Absences of a live move, not warnings — colouring them spends the row's
    // one saturated element on nothing happening.
    expect(cyclePhaseTone('SHADOW')).toBe('dim');
    expect(cyclePhaseTone('NO_CYCLE')).toBe('dim');
  });
});

describe('cycle detail', () => {
  /*
   * The number that must never be the distance below the high. A name based at
   * 1.00 that ran to 1.20 has given back half its MOVE at 1.10, where the
   * below-high figure reads a reassuring 8.3% — on exactly the names that have
   * broken.
   */
  it('reports retracement of the move, not distance below the high', () => {
    const detail = cycleDetail(arc());
    expect(detail).toContain('50.0% of the move given back');
    expect(detail).not.toContain('8.3');
  });

  /*
   * It said "high is today", and the latest bar is NEVER today.
   *
   * `ensureDailyHistory` writes no bar until 20:00 ET and `readDailyBars`
   * defaults to EXCLUDE, so during the premarket window he trades this rendered
   * a claim about YESTERDAY containing the word today. Not stale — false.
   */
  it('never calls the latest settled session "today"', () => {
    expect(cycleDetail(arc({ sessionsSinceHigh: 0 }))).not.toContain('today');
    expect(cycleDetail(arc({ sessionsSinceHigh: 0 }))).toContain('high is the latest session');
    expect(cycleDetail(arc({ sessionsSinceHigh: 1 }))).toContain('1 session since');
  });

  /*
   * The as-of. Every number in this string is settled-only, so without a date
   * the whole reading claims a present tense it does not have.
   */
  it('dates the reading, so it cannot claim to be current', () => {
    expect(cycleDetail(arc())).toContain('through 2026-08-21 close');
  });

  /*
   * A clause that is true in one window and false in another is the failure
   * this desk keeps finding. After 20:00 ET today IS the latest session, so
   * "today not included" would flip. A bare date holds in every window.
   */
  it('states what is true rather than what is excluded', () => {
    const detail = cycleDetail(arc()) ?? '';
    expect(detail).not.toMatch(/not included|excludes today|as of yesterday/i);
  });

  it('omits a giveback that has not happened', () => {
    expect(cycleDetail(arc({ retracementPct: 0 }))).not.toContain('given back');
  });

  it('has nothing to say when there is no cycle', () => {
    expect(cycleDetail({ phase: 'NO_CYCLE' })).toBeNull();
  });
});

describe('resolveComputedCycle', () => {
  it('carries provenance outside the Sheet/Auto axis and never a counterparty', () => {
    const conclusion = resolveComputedCycle(history(arc()));
    expect(conclusion).not.toBeNull();
    expect(conclusion?.provenance).toBe('COMPUTED');
    // Arithmetic has nothing to disagree with. A cycle conflict is a fiction.
    expect(conclusion?.otherLabel).toBeNull();
    expect(conclusion?.label).toBe('BACKSIDE');
  });

  /*
   * Deliberately null rather than falling back to the model's classification.
   * That field is being deleted; reading it here would keep it alive past its
   * own removal, and the caller shows the field unresolved instead.
   */
  it('returns null with no computed history, rather than any fallback', () => {
    expect(resolveComputedCycle(null)).toBeNull();
    expect(resolveComputedCycle(undefined)).toBeNull();
  });
});

describe('phase counting', () => {
  it('counts from the computed phase, which is what the filter reads', () => {
    const counts = countCyclePhases([
      row(history(arc({ phase: 'DAY_ONE' }))),
      row(history(arc({ phase: 'DAY_ONE' }))),
      row(history(arc({ phase: 'BACKSIDE' }))),
      row(history({ phase: 'NO_CYCLE' })),
      row(null),
    ]);

    expect(counts.DAY_ONE).toBe(2);
    expect(counts.BACKSIDE).toBe(1);
    expect(counts.NO_CYCLE).toBe(1);
    // A row with no computed cycle is in no phase; it is not silently a zero
    // bucket's member.
    expect(counts.FRONTSIDE).toBe(0);
  });

  it('resolves a row with no dossier to no phase rather than throwing', () => {
    expect(cyclePhaseOf(undefined)).toBeNull();
    expect(cyclePhaseOf({} as DeskRow)).toBeNull();
  });
});

/*
 * Every cycle surface reads the resolved conclusion.
 *
 * The cutover switched `resolveConclusions` and the surfaces that call it, and
 * three that read the Sheet's `ticker.cycle` directly survived it — the
 * researched table's cycle cell, its backside colour precedence, and the
 * drawer's header badge. They kept rendering FRONTSIDE — WARNING on the live
 * desk while the filter above them offered DAY 1 and OFF HIGH.
 *
 * This asserts against source because the failure is structural: a component
 * reaching past the shared projection to the sheet row. Caught by looking at
 * production, not by the 1,261 tests that were green at the time.
 */
describe('no surface renders the Sheet cycle directly', () => {
  it('has no component reading ticker.cycle for display', async () => {
    const { promises: fs } = await import('node:fs');
    const files = [
      'components/TickerDrawer.tsx',
      'components/DiscoveryBoard.tsx',
    ];

    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      // `ticker.cycle.display` / `.state` are the Sheet's classification
      // presented AS the desk's cycle. A labelled source field — the drawer's
      // "Cycle (sheet)" — is a different thing and stays.
      expect(source, `${file} renders the sheet cycle`).not.toMatch(
        /ticker\.cycle\.(display|state)/,
      );
    }
  });

  it('no longer exports a tone map for the Sheet cycle states', async () => {
    const { promises: fs } = await import('node:fs');
    const source = await fs.readFile('components/StatusBadge.tsx', 'utf8');
    expect(source).not.toContain('export function cycleTone');
  });
});

/*
 * A count and the filter it labels must read one population.
 *
 * The summary's cycle segments counted every merged row — Discovery and the
 * researched watchlist together — while applyFilters runs only over the
 * sheet-derived watchlist. On a live premarket board that read "10 backside"
 * and returned four rows; the other six were Discovery names the filter never
 * touches. Found by clicking the segment on production, not by any test.
 *
 * This is the same defect the segments were moved off summary.freshFrontside to
 * avoid, reintroduced by the change that fixed it.
 */
describe('cycle segment counts match what the filter returns', () => {
  it('counts only rows the filter can act on', () => {
    const watchlist = [row(history(arc({ phase: 'BACKSIDE' }))), row(history(arc({ phase: 'BACKSIDE' })))];
    const discoveryOnly = [
      row(history(arc({ phase: 'BACKSIDE' }))),
      row(history(arc({ phase: 'BACKSIDE' }))),
      row(history(arc({ phase: 'BACKSIDE' }))),
    ];

    // The count must be over the watchlist alone, never the union.
    expect(countCyclePhases(watchlist).BACKSIDE).toBe(2);
    expect(countCyclePhases([...watchlist, ...discoveryOnly]).BACKSIDE).toBe(5);
  });

  it('is counted by the clicks own predicate over the main board, not the whole merged map', async () => {
    const { promises: fs } = await import('node:fs');
    const source = await fs.readFile('components/DashboardShell.tsx', 'utf8');
    // merged.rows is the union of every tracked name; the board the filter acts
    // on is merged.discovery, and the strip counts that through boardCounts.
    expect(source).not.toContain('countCyclePhases(merged.rows.values())');
    expect(source).toMatch(/boardCounts\(\s*merged\.discovery/);
  });
});

/*
 * TWO PRICES, NOT A PERCENTAGE. His ruling: "dont do a percentage - it's
 * deceptive... OFF HIGH - $1.20→ $1.00". A ratio hides its denominator; two
 * prices carry theirs.
 */
describe('the high reading', () => {
  const withHigh = (cycleHigh: number, cycleHighDate = '2026-09-15') =>
    ({ phase: 'PULLBACK', cycleHigh, cycleHighDate }) as unknown as Parameters<
      typeof highReading
    >[0];

  /** Every case below the union is a PAIR; this narrows once instead of everywhere. */
  const pair = (r: ReturnType<typeof highReading>) => {
    if (!r || r.kind !== 'PAIR') throw new Error('expected a PAIR reading, got ' + r?.kind);
    return r;
  };

  /*
   * THE CONTRADICTION IS GONE BY CONSTRUCTION, not by luck. cycleHigh is
   * settled-only, so a gapper could sit above it and render "OFF HIGH · $1.20
   * -> $1.80". Taking max(cycleHigh, sessionHigh) makes now > high impossible.
   */
  it('never reports a price above its own reference high', () => {
    const r = pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.8, 1.8, 0.01));
    expect(r.high).toBe(1.8);
    expect(r.now).toBeLessThanOrEqual(r.high);
  });

  it('keeps the cycle high when today has not beaten it', () => {
    const r = pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.05, 1.0, 0.01));
    expect(r.high).toBe(1.2);
    expect(r.label).toBeNull();
  });

  /*
   * READ LITERALLY: "change to NEW HIGH if the high is new". A name sitting at
   * its OLD cycle high keeps its phase word -- that high is not new, and a
   * broader reading would label names he did not describe.
   */
  it('does not say NEW HIGH for a name at its old cycle high', () => {
    const r = pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.2, 1.2, 0.01));
    expect(r.label).toBeNull();
  });

  /*
   * THE BAND IS NOT OPTIONAL, and not because of a downtick. The reference is a
   * MAXIMUM, so price can never exceed it: equality holds for one print and is
   * false immediately after. Without a band NEW HIGH appears and vanishes on
   * the same tick.
   */
  it('says NEW HIGH within a spread of a high that beat the arc', () => {
    expect(pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.5, 0.01)).label).toBe('NEW HIGH');
    expect(pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.495, 0.01)).label).toBe('NEW HIGH');
  });

  it('says OFF HIGH once it has drifted beyond the spread, measured from the NEW high', () => {
    const r = pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.4, 0.01));
    expect(r.label).toBe('OFF HIGH');
    expect(r.high).toBe(1.5);
  });

  it('sits on the band rather than near it', () => {
    expect(pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.49, 0.01)).label).toBe('NEW HIGH');
    expect(pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.4899, 0.01)).label).toBe('OFF HIGH');
  });

  /*
   * TONE FOLLOWS THE LABEL. Otherwise NEW HIGH renders in the neg colour of the
   * stale BACKSIDE verdict underneath -- a word saying one thing while its
   * colour says the opposite.
   */
  it('carries a tone that matches the word', () => {
    expect(pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.5, 0.01)).tone).toBe('pos');
    expect(pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.4, 0.01)).tone).toBe('warn');
  });

  /*
   * No band means no verdict, not a guess. The prices still render: they are
   * observations and need no band, only the label does.
   */
  it('shows the prices but no override when there is no spread', () => {
    const r = pair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.4, null));
    expect(r.label).toBeNull();
    expect(r.high).toBe(1.5);
    expect(r.now).toBe(1.4);
  });

  /* --------------------------------------------------------------------- *
   * THE THREE VERDICTS RENDER DIFFERENTLY, WHICH IS THE WHOLE FIX
   * --------------------------------------------------------------------- */

  /**
   * QCLS, 2026-09-16, rank 3, up 270% on the day: the badge read
   * `BACKSIDE $5.49 -> $1.35` in red. Both numbers were right and the pairing
   * was not. $5.49 was a prior run's high from settled daily bars; today's move
   * was not in the input at all, because `daily_bars` never contains today.
   *
   * A day-one runner off a crushed base and a genuine backside look identical in
   * settled data, so no rule over that data separates them. The fix is a
   * refusal, not a better verdict.
   */
  it('QUALIFIED: takes today as the reference, not the run that ended', () => {
    // Today's high is BELOW the prior run's, which is the QCLS shape: a new
    // cycle off a low base. `max(cycleHigh, sessionHigh)` would keep 5.49.
    const r = pair(highReading(withHigh(5.49), 'QUALIFIED', 1.76, 1.64, 0.01));
    expect(r.high).toBe(1.76);
    expect(r.now).toBe(1.64);
  });

  it('QUALIFIED: the override then runs against a reference it can be right about', () => {
    expect(pair(highReading(withHigh(5.49), 'QUALIFIED', 1.76, 1.76, 0.01)).label).toBe('NEW HIGH');
    expect(pair(highReading(withHigh(5.49), 'QUALIFIED', 1.76, 1.5, 0.01)).label).toBe('OFF HIGH');
  });

  it('UNVERIFIABLE: no pair, no verdict, and the date is not decoration', () => {
    const r = highReading(withHigh(5.49, '2026-09-15'), 'UNVERIFIABLE', 1.76, 1.64, 0.01)!;
    expect(r.kind).toBe('PRIOR_ONLY');
    if (r.kind !== 'PRIOR_ONLY') throw new Error('unreachable');
    expect(r.high).toBe(5.49);
    expect(r.at).toBe('2026-09-15');
    expect(formatHighPair(r)).toBe('prior high $5.49 · Sep 15');
    expect(formatHighPair(r)).not.toContain('→');
  });

  /*
   * The arm is reached whatever today's high did, because the point is that the
   * desk cannot say WHICH high governs -- not that today was quiet.
   */
  it('UNVERIFIABLE: refuses even when today beat the prior high', () => {
    const r = highReading(withHigh(1.2), 'UNVERIFIABLE', 1.8, 1.8, 0.01)!;
    expect(r.kind).toBe('PRIOR_ONLY');
    if (r.kind !== 'PRIOR_ONLY') throw new Error('unreachable');
    expect(r.high).toBe(1.2);
  });

  /*
   * NOT_QUALIFIED means the settled verdict is ABOUT NOW. UNVERIFIABLE means we
   * do not know what it is about. Collapsing them puts the stale badge back on
   * exactly the rows this exists to protect, which is the defect arriving
   * through its own fix.
   */
  it('NOT_QUALIFIED is not UNVERIFIABLE', () => {
    const settled = highReading(withHigh(5.49), 'NOT_QUALIFIED', 1.76, 1.64, 0.01)!;
    const unknown = highReading(withHigh(5.49), 'UNVERIFIABLE', 1.76, 1.64, 0.01)!;
    expect(settled.kind).toBe('PAIR');
    expect(unknown.kind).toBe('PRIOR_ONLY');
  });

  /*
   * A TRADING DATE IS A CALENDAR DATE. `new Date('2026-09-15')` is UTC midnight
   * and formatting that in ET rolls it to the 14th -- the timezone trap one
   * field over from the one that put a UTC clock on his board.
   */
  it('formats a trading date', () => {
    expect(formatTradingDate('2026-09-15')).toBe('Sep 15');
    expect(formatTradingDate('2026-01-01')).toBe('Jan 1');
    expect(formatTradingDate('2026-12-31')).toBe('Dec 31');
    expect(formatTradingDate(null)).toBeNull();
    expect(formatTradingDate('')).toBeNull();
  });

  it('parses the string rather than constructing a Date, which the case above cannot prove', async () => {
    /*
     * THE BEHAVIOURAL TEST IS VACUOUS WHERE IT RUNS, and mutation is what showed
     * it. Replacing the split with `new Date(date)` killed ZERO tests here:
     * `new Date('2026-09-15')` is UTC midnight, and on a machine at a POSITIVE
     * offset that is still the 15th locally. It rolls back to the 14th only at a
     * negative offset -- which is to say, in ET, which is the only timezone this
     * desk cares about and the one no test here runs in.
     *
     * So the defect is invisible to an assertion on the output, and the guard
     * has to be on the mechanism. A trading date is a calendar date; the moment
     * it becomes an instant it acquires a timezone it never had.
     */
    const fs = await import('node:fs');
    const src = fs
      .readFileSync('lib/dashboard/cycle.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const fn = src.slice(src.indexOf('export function formatTradingDate'));
    const body = fn.slice(0, 500);
    expect(body).toContain("split('-')");
    expect(body).not.toContain('new Date');
    expect(body).not.toContain('Intl.DateTimeFormat');
  });

  it('returns nothing without a cycle or without a price', () => {
    expect(highReading(null, 'NOT_QUALIFIED', 1.5, 1.4, 0.01)).toBeNull();
    expect(highReading({ phase: 'NO_CYCLE' } as never, 'NOT_QUALIFIED', 1.5, 1.4, 0.01)).toBeNull();
    expect(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, null, 0.01)).toBeNull();
  });

  it('formats as he wrote it: dollars, four decimals under $1', () => {
    expect(formatHighPair(highReading(withHigh(1.2), 'NOT_QUALIFIED', 1.5, 1.4, 0.01)!)).toBe('$1.50 → $1.40');
    expect(formatHighPair(highReading(withHigh(0.4), 'NOT_QUALIFIED', 0.421, 0.389, 0.001)!)).toBe('$0.4210 → $0.3890');
  });
});
