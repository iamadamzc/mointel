import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  LIVE_START_LABEL,
  PRIOR_HIGH_ONLY_TITLE,
  cycleBadge,
  highReading,
  resolveComputedCycle,
  startedLabel,
} from '@/lib/dashboard/cycle';
import type { CycleResult } from '@/lib/market/cycle';

/**
 * ONE cycle badge for the whole desk, with its tooltip from the same decision.
 *
 * Found on the live board, 2026-09-22 premarket: of the four tickers appearing
 * on both Discovery and Researched Names, THREE showed different cycle
 * verdicts at the same moment — GRML `OFF HIGH $12.10 → $10.49` against
 * `DAY 1`, QNME and TOPS `OFF HIGH` against `BACKSIDE`.
 *
 * Neither surface was stale. Both read the same `computedCycle`, through
 * different readings: Discovery applied `highReading`'s live override and the
 * researched table rendered the settled phase. So these tests assert the two
 * properties that make that impossible to repeat — one decision produces label,
 * tone AND title, and the phase is never silently dropped when the override
 * takes the word.
 */

function arc(over: Partial<Extract<CycleResult, { phase: string }>> = {}): CycleResult {
  return {
    phase: 'BACKSIDE',
    startDate: '2026-09-01',
    baseClose: 1,
    cycleHigh: 1.5,
    cycleHighDate: '2026-09-10',
    sessionsSinceHigh: 3,
    sessionsInCycle: 8,
    givebackPct: 0.4,
    retracementPct: 0.4,
    recentRvol: 5,
    advancePct: 50,
    latestDate: '2026-09-19',
    latestClose: 1.1,
    ...over,
  } as CycleResult;
}

/**
 * The live override, as the live board actually produced it.
 *
 * IT ONLY FIRES WHEN TODAY BEAT THE SETTLED HIGH — `highReading` returns a
 * label-less pair otherwise, and the phase keeps the word. A first pass at
 * these fixtures used a session high EQUAL to the cycle high and produced no
 * override at all, which is the trigger being misread rather than the rule.
 *
 * So the three live rows that exposed this were names whose session high had
 * already passed the settled run's high, with price back under it: today had
 * superseded the arc the other table was still naming.
 */
function offHigh(current: CycleResult) {
  return highReading(current, 'NOT_QUALIFIED', 1.6, 1.46, 0.001);
}

describe('the override takes the word and never buries the phase', () => {
  it('reproduces QNME: OFF HIGH on top, BACKSIDE inside the tooltip', () => {
    const current = arc({ phase: 'BACKSIDE' });
    const badge = cycleBadge(offHigh(current), current, resolveComputedCycle({ current } as never))!;

    expect(badge.label).toBe('OFF HIGH');
    // The word the other table used to show as its entire badge is still
    // reachable, which is what stops the two surfaces disagreeing quietly.
    expect(badge.title).toContain('BACKSIDE');
    expect(badge.title).toContain('more than one spread below');
  });

  it('reproduces GRML: OFF HIGH over DAY 1, the pair that argued both ways', () => {
    const current = arc({ phase: 'DAY_ONE', sessionsSinceHigh: 0, sessionsInCycle: 1 });
    const badge = cycleBadge(offHigh(current), current, resolveComputedCycle({ current } as never))!;

    expect(badge.label).toBe('OFF HIGH');
    expect(badge.title).toContain('DAY 1');
    expect(badge.title).toContain('First session of this advance');
  });
});

describe('the tooltip explains the label above it, not a different quantity', () => {
  it('gives the LIVE meaning when the live override produced the word', () => {
    const current = arc({ phase: 'PULLBACK' });
    const badge = cycleBadge(offHigh(current), current, resolveComputedCycle({ current } as never))!;

    // `PULLBACK` also renders as `OFF HIGH`, from a different quantity. The
    // title has to say which one is on screen, or the two are unreadable apart.
    expect(badge.title).toMatch(/^Price is more than one spread below/);
  });

  it('gives the LIVE meaning for NEW HIGH too', () => {
    const current = arc({ phase: 'PULLBACK' });
    const badge = cycleBadge(
      // Today beat the settled high AND price is at it, within the spread.
      highReading(current, 'NOT_QUALIFIED', 1.6, 1.6, 0.01),
      current,
      resolveComputedCycle({ current } as never),
    )!;

    expect(badge.label).toBe('NEW HIGH');
    expect(badge.title).toMatch(/^Price is within one spread/);
  });

  it('explains every phase word, from what the classifier tests', () => {
    const phases = ['DAY_ONE', 'FRONTSIDE', 'PULLBACK', 'BACKSIDE', 'SHADOW'] as const;
    for (const phase of phases) {
      const current = arc({ phase });
      const badge = cycleBadge(null, current, resolveComputedCycle({ current } as never))!;

      expect(badge.title.length).toBeGreaterThan(badge.label.length);
      expect(badge.title).toContain(badge.label);
      // He asked that every term on the board explain itself; an empty or
      // label-echoing title is the state this exists to prevent.
      expect(badge.title).not.toBe(badge.label);
    }
  });
});

describe('what it declines to render', () => {
  it('is null with nothing to say, rather than an empty badge', () => {
    expect(cycleBadge(null, null, null)).toBeNull();
  });

  it('is null when only a reading with no word exists', () => {
    // A pair with no label carries prices, not a verdict. Without a phase there
    // is no word to show, and inventing one is what the override guards against.
    const current = arc();
    const pair = highReading(current, 'NOT_QUALIFIED', 1.6, 1.46, undefined);
    expect(pair?.kind).toBe('PAIR');
    expect(cycleBadge(pair, current, null)).toBeNull();
  });
});

describe('the prior-high disclosure, after the frame was ruled whole', () => {
  it('states the ruled frame and does not assert the unresolved exclusion', () => {
    /*
     * He ruled premarket in on 2026-09-22, so the frame is 04:00–20:00 while
     * the stored daily high is narrower. TWO MEASUREMENTS OF THAT COLUMN
     * DISAGREE — 04:00–16:00 on one, 09:30–16:00 on another — so after-hours
     * is certainly excluded and premarket only possibly. The sentence has to
     * survive either being right.
     */
    expect(PRIOR_HIGH_ONLY_TITLE).toContain('04:00');
    expect(PRIOR_HIGH_ONLY_TITLE).toContain('exclude after-hours');
    expect(PRIOR_HIGH_ONLY_TITLE).toMatch(/may exclude premarket/);
    // The old sentence ended the exclusion at after-hours as a settled fact.
    expect(PRIOR_HIGH_ONLY_TITLE).not.toMatch(/exclude after-hours\./);
  });

  it('reports the error as a BOUND, because it can only move one way', () => {
    // A high measured over fewer hours can only be lower than the true one.
    // "may be wrong" is discounted in both directions; a bound cannot be.
    expect(PRIOR_HIGH_ONLY_TITLE).toContain('can only be understated');
  });

  it('is one string on the board, not a literal typed into the component', () => {
    const files = ['components/DiscoveryBoard.tsx'].map((file) =>
      readFileSync(join(process.cwd(), file), 'utf8'),
    );
    for (const source of files) {
      expect(source).toContain('PRIOR_HIGH_ONLY_TITLE');
      // The literal living in the component is how the badges drifted.
      expect(source).not.toContain('The prior high is shown because');
    }
  });
});

describe('DCOY: a run that started today, with no settled arc behind it', () => {
  /*
   * The desk computed `todayStart = QUALIFIED` — it KNEW a run had started —
   * and rendered NO RUN. A composition defect: `highReading`'s `NO_CYCLE`
   * guard was correct on its own and ran thirty lines before the supersession
   * branch, which was correct on its own, so that branch was dead for exactly
   * the population it was written for. A name whose whole run is today has no
   * settled cycle BY CONSTRUCTION — `classifyCycle` reads settled bars and
   * today is not one.
   */
  const noArc = { phase: 'NO_CYCLE' } as CycleResult;
  const history = (todayStart: string) =>
    ({ current: noArc, todayStart, priorCycles: [], formerRunnerStatus: 'NONE' }) as never;

  it('measures against today own high, the only high there is', () => {
    const reading = highReading(noArc, 'QUALIFIED', 1.6, 1.46, 0.001)!;

    expect(reading).not.toBeNull();
    expect(reading.kind).toBe('PAIR');
    // The reference is today's high — there is no prior high, and inventing
    // one from a run that does not exist is what the guard rightly prevented.
    expect(reading.kind === 'PAIR' && reading.high).toBe(1.6);
    expect(reading.kind === 'PAIR' && reading.label).toBe('OFF HIGH');
  });

  it('says NEW HIGH on the same arm when price is at today high', () => {
    // The arm has to make the whole verdict, not just stop returning null.
    const reading = highReading(noArc, 'QUALIFIED', 1.6, 1.6, 0.01)!;
    expect(reading.kind === 'PAIR' && reading.label).toBe('NEW HIGH');
    expect(reading.kind === 'PAIR' && reading.high).toBe(1.6);
  });

  it('gives prices but no verdict when there is no spread to band it', () => {
    // Same rule the settled path obeys: no spread means no word, and the
    // prices still render because they are observations needing no band.
    const reading = highReading(noArc, 'QUALIFIED', 1.6, 1.46, null)!;
    expect(reading.kind === 'PAIR' && reading.label).toBeNull();
    expect(reading.kind === 'PAIR' && reading.high).toBe(1.6);
  });

  it('says STARTED TODAY rather than NO RUN', () => {
    const badge = cycleBadge(
      highReading(noArc, 'QUALIFIED', 1.6, 1.46, 0.001),
      noArc,
      resolveComputedCycle(history('QUALIFIED')),
      'QUALIFIED',
    )!;

    expect(resolveComputedCycle(history('QUALIFIED'))!.label).toBe(LIVE_START_LABEL);
    expect(badge.title).not.toContain('No qualifying advance on record');
    expect(badge.title).toContain('STARTED TODAY');
  });

  it('names the looser basis, so a live start is not read as a settled DAY 1', () => {
    const badge = cycleBadge(null, noArc, resolveComputedCycle(history('QUALIFIED')), 'QUALIFIED')!;

    expect(badge.label).toBe('STARTED TODAY');
    expect(badge.label).not.toBe('DAY 1');
    // The settled test measures the CLOSE; this one measured the HIGH.
    expect(badge.title).toMatch(/HIGH/);
    expect(badge.title).toMatch(/CLOSE/);
  });

  it('still says NO RUN when today has NOT qualified', () => {
    /*
     * The control. Without this the fix could have turned every arc-less name
     * into a started-today name, which is the same defect pointed the other
     * way and would have looked like a success on the one row being checked.
     */
    expect(resolveComputedCycle(history('NOT_QUALIFIED'))!.label).toBe('NO RUN');
    expect(highReading(noArc, 'NOT_QUALIFIED', 1.6, 1.46, 0.001)).toBeNull();
    expect(highReading(noArc, 'UNVERIFIABLE', 1.6, 1.46, 0.001)).toBeNull();
  });
});

describe('the tooltip does not call a live reading a settled one', () => {
  const noArc = { phase: 'NO_CYCLE' } as CycleResult;

  it('omits the settled prefix when the reading IS the live one', () => {
    /*
     * "Settled reading: STARTED TODAY" is a contradiction — that label exists
     * precisely because there is no settled reading. Caught by looking at the
     * rendered string on production, not by a test: every assertion here
     * checked the sentence's CONTENT and none checked its composition.
     */
    const badge = cycleBadge(
      highReading(noArc, 'QUALIFIED', 1.6, 1.46, 0.001),
      noArc,
      resolveComputedCycle({ current: noArc, todayStart: 'QUALIFIED' } as never),
      'QUALIFIED',
    )!;

    expect(badge.title).toContain('STARTED TODAY');
    expect(badge.title).not.toContain('Settled reading');
  });

  it('keeps the settled prefix where there IS a settled phase behind the word', () => {
    // The file's own fixture, rather than a second literal that can drift from
    // it -- and the one that would not type-check as a `CycleResult` anyway.
    const settled = arc({ phase: 'BACKSIDE' });
    const badge = cycleBadge(
      highReading(settled, 'NOT_QUALIFIED', 1.6, 1.46, 0.001),
      settled,
      resolveComputedCycle({ current: settled, todayStart: 'NOT_QUALIFIED' } as never),
      'NOT_QUALIFIED',
    )!;

    expect(badge.title).toContain('Settled reading: BACKSIDE');
  });
});

describe('the start HOUR, and the guard that keeps it honest', () => {
  const noArc = { phase: 'NO_CYCLE' } as CycleResult;
  // 09:12Z in September is 05:12 EDT.
  const AT = '2026-09-22T09:12:00Z';

  it('says STARTED 5AM when the desk was watching from the open', () => {
    const started = startedLabel({ qualifiedAt: AT, qualifiedRvol: 8.42, observed: true });

    expect(started.label).toBe('STARTED 5AM');
    // The hour is what he scans; the minute and the reading are the check.
    expect(started.detail).toContain('05:12 ET');
    expect(started.detail).toContain('RVOL 8.4x');
  });

  it('WITHHOLDS the hour when the desk was not watching from the open', () => {
    /*
     * The guard he approved. `at` latches when the desk FIRST SEES a name, so
     * after a 05:30 restart a name that broke at 04:10 is stamped 05:30 —
     * `STARTED 5AM` would be a market claim manufactured from a process fact.
     */
    const started = startedLabel({ qualifiedAt: AT, qualifiedRvol: 8.42, observed: false });

    expect(started.label).toBe(LIVE_START_LABEL);
    expect(started.label).not.toMatch(/\d/);
    // Silent on the badge, explained in the tooltip rather than hidden.
    expect(started.detail).toContain('FIRST SEEN');
  });

  it('withholds it for an UNANSWERED guard too, not only a false one', () => {
    // The field does not exist on the payload yet. Undefined must behave like
    // false — an unfilled guard is not permission.
    expect(startedLabel({ qualifiedAt: AT, qualifiedRvol: 8.42, observed: undefined }).label).toBe(
      LIVE_START_LABEL,
    );
  });

  it('degrades to the word already on the board, never to a blank', () => {
    const none = startedLabel({ qualifiedAt: null, qualifiedRvol: null, observed: true });
    expect(none.label).toBe(LIVE_START_LABEL);
    expect(none.detail.length).toBeGreaterThan(0);
  });

  it('puts the hour on the BADGE and keeps the tooltip agreeing with it', () => {
    const badge = cycleBadge(
      highReading(noArc, 'QUALIFIED', 1.6, 1.46, 0.001),
      noArc,
      resolveComputedCycle({ current: noArc, todayStart: 'QUALIFIED' } as never),
      'QUALIFIED',
      startedLabel({ qualifiedAt: AT, qualifiedRvol: 8.42, observed: true }),
    )!;

    // The override owns the word here, so the hour lives in the tooltip — and
    // it must be the SAME word, not a second way of naming the start.
    expect(badge.title).toContain('STARTED 5AM');
    expect(badge.title).not.toContain('STARTED TODAY');
    expect(badge.title).toContain('05:12 ET');
  });

  it('reads 8AM in November and 9AM in October, off the same UTC clock hour', () => {
    // A conversion constant with an expiry date is a defect with a start date:
    // minus four is EDT, EST is minus five, and DST ends 2026-11-01.
    const oct = startedLabel({ qualifiedAt: '2026-10-30T13:00:00Z', qualifiedRvol: null, observed: true });
    const nov = startedLabel({ qualifiedAt: '2026-11-02T13:00:00Z', qualifiedRvol: null, observed: true });

    expect(oct.label).toBe('STARTED 9AM');
    expect(nov.label).toBe('STARTED 8AM');
  });
});

describe('the hour reaches the badge from the PAYLOAD, not just from the function', () => {
  /*
   * Everything above calls `startedLabel` directly, which proves the wording
   * and proves nothing about whether the value ARRIVES. Design sits at the end
   * of these chains and an addition that never reaches this surface fails
   * SILENTLY — the activity columns were populated and climbing in production
   * for days while the key was absent from the payload entirely.
   *
   * A first pass tried to build a DeskRow and kept hitting telemetry fields
   * the fixture did not carry. That was testing `buildTelemetry`, not the
   * question. The question is whether the PRODUCER writes the field the reader
   * reads, and only the producer's source can answer it.
   */
  const engine = readFileSync(join(process.cwd(), 'lib/market/engine.ts'), 'utf8');

  it('projects observed INSIDE the qualified object the reader reads', () => {
    // `f3375af`. Written from `anchorObservable` with the session resolved
    // from `qualifiedAt` itself rather than from now, which is the detail that
    // makes a late-session qualification answerable at all.
    const qualified = engine.match(/qualified: runtime\.qualifiedAt[\s\S]{0,320}/);
    expect(qualified).not.toBeNull();
    expect(qualified![0]).toContain('observed:');
    expect(qualified![0]).toContain('qualificationObserved');
  });

  it('answers false rather than guessing when there is no qualification', () => {
    const fn = engine.match(/private qualificationObserved[\s\S]{0,420}/);
    expect(fn).not.toBeNull();
    expect(fn![0]).toContain('if (!runtime.qualifiedAt) return false;');
    // The session comes from the qualification instant, not from `now`.
    expect(fn![0]).toContain('runtime.qualifiedAt,');
  });

  it('is still optional on the type, so a payload without it stays silent', () => {
    const types = readFileSync(join(process.cwd(), 'lib/market/types.ts'), 'utf8');
    expect(types).toContain('observed?: boolean;');
  });
});
