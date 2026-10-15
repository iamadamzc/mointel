import { describe, expect, it } from 'vitest';

import { buildDeskRow, mergeDesk } from '@/lib/dashboard/merge';
import { priorCloseLabel, resolveWhy } from '@/lib/dashboard/why';
import type { AutoIntelligence } from '@/lib/research/view';
import type { MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';

/**
 * THE CONSUMER HALF OF THE PRIOR-CLOSE FRESH BOUNDARY.
 *
 * Research built the producer (`MarketSnapshot.catalystFreshFrom`, `7a0ad0c`)
 * and measured the band arithmetic first-hand through the shipped
 * `resolveCatalystFreshness`. What is UNPROVEN by that measurement, and is
 * this seat's entire risk, is the ROUTE: a field can be computed, correct, on
 * the payload and still never reach the reader. That has happened on this desk
 * — the activity columns were written, populated and climbing in production
 * while the key was absent from `/api/market` entirely.
 *
 * So these assert the wiring and the two tripwires, not the bands. The bands
 * are `tests/dashboard/filters.test.ts` and `tests/research/`.
 *
 * FIXED INSTANTS, NEVER `Date.now()`. Every date here is September 2026, so
 * ET is EDT (UTC−4) throughout and nothing straddles the 11-01 transition.
 */

/** Friday 2026-09-25, 09:00 ET. */
const NOW = Date.parse('2026-09-25T13:00:00.000Z');

/**
 * The prior session's close: Thursday 2026-09-24 at 16:00 ET.
 *
 * The shape `catalystFreshFromUtc` returns — `tests/research/catalystFreshFrom.test.ts`
 * pins `2026-09-24 -> 2026-09-23T20:00:00.000Z`, one session back at 20:00Z.
 */
const BOUNDARY = '2026-09-24T20:00:00.000Z';

function rowWithEvent(eventTimestamp: string | null, catalystFreshFrom: string | null = null) {
  const intel = {
    ticker: 'HOWL',
    state: 'ACCEPTED',
    generatedAt: '2026-09-25T12:00:00.000Z',
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

  return buildDeskRow('HOWL', null, intel, { catalystFreshFrom });
}

describe('the boundary reaches the reader, which is the half a band measurement cannot prove', () => {
  it('promotes a release clocked AFTER the prior close, and only with the boundary', () => {
    /*
     * 16:30 ET Thursday. On the day bands alone this is yesterday, so RECENT;
     * against the prior session's close it is news the market has not traded
     * on yet, so FRESH. Research's live population moved six rows and XOS at
     * 20:30Z is this exact shape.
     *
     * BOTH ARMS, because one of them is the control: the same row with no
     * boundary must still read RECENT, or this asserts nothing about the
     * boundary at all.
     */
    const at = '2026-09-24T20:30:00.000Z';

    expect(resolveWhy(rowWithEvent(at, BOUNDARY), NOW).freshness).toBe('FRESH');
    expect(resolveWhy(rowWithEvent(at, null), NOW).freshness).toBe('RECENT');
  });

  it('leaves a release clocked BEFORE the prior close alone', () => {
    // 15:45 ET Thursday — inside the session the market already traded.
    const at = '2026-09-24T19:45:00.000Z';

    expect(resolveWhy(rowWithEvent(at, BOUNDARY), NOW).freshness).toBe('RECENT');
    expect(resolveWhy(rowWithEvent(at, null), NOW).freshness).toBe('RECENT');
  });

  it('cannot promote a BARE date, which is 77% of what is stored', () => {
    /*
     * Research's tripwire, as an assertion: after wiring, a row going FRESH
     * on a bare date is a defect and not the feature. A date states no time of
     * day, so "did it fall after 16:00" is unanswerable — and answering it
     * anyway is how a refinement turns into an invention.
     */
    expect(resolveWhy(rowWithEvent('2026-09-24', BOUNDARY), NOW).freshness).toBe('RECENT');
    expect(resolveWhy(rowWithEvent('2026-09-23', BOUNDARY), NOW).freshness).toBe('STALE');
  });

  it('never moves a row the other way, on any age', () => {
    /*
     * The other half of the tripwire. `resolveCatalystFreshness` returns FRESH
     * early or falls through to the bands it always used, so a demotion is
     * impossible by construction — this asserts the construction has not been
     * lost rather than hoping it holds.
     */
    const rank = { FRESH: 3, RECENT: 2, STALE: 1, UNKNOWN: 0 } as const;

    for (const at of [
      '2026-09-25T12:30:00.000Z',
      '2026-09-24T20:30:00.000Z',
      '2026-09-24T19:45:00.000Z',
      '2026-09-23T14:00:00.000Z',
      '2026-08-01T14:00:00.000Z',
      '2026-09-24',
      null,
    ]) {
      const withBoundary = resolveWhy(rowWithEvent(at, BOUNDARY), NOW).freshness!;
      const without = resolveWhy(rowWithEvent(at, null), NOW).freshness!;
      expect(rank[withBoundary]).toBeGreaterThanOrEqual(rank[without]);
    }
  });
});

describe('the merge carries the boundary to every row', () => {
  function snapshot(catalystFreshFrom: string | null): MarketSnapshot {
    /*
     * A REAL `DemandState`, not a four-field stand-in. The thin one threw
     * inside `selectSessionVwap` and then inside `buildTelemetry` — the merge
     * reaches further into this object than the test cares about, and a
     * fixture that cannot survive the code path tests the fixture.
     */
    const demand = {
      ticker: 'HOWL',
      tradingDate: '2026-09-25',
      price: 3.2,
      priceSource: 'sip-trade',
      priceAt: '2026-09-25T13:00:00.000Z',
      previousClose: 2.85,
      percentChange: 12.3,
      cumulativeVolume: 1_000_000,
      vwap: emptySessionVwapSet(),
      rvol: 3.1,
      rvolRank: 1,
      rvolConfidence: 'OK',
      quote: {
        bid: 3.18,
        bidSize: 3,
        ask: 3.22,
        askSize: 4,
        spread: 0.04,
        spreadPct: 1.25,
        at: null,
        invalid: false,
      },
      luld: { lower: null, upper: null, at: null },
      haltState: 'TRADING',
      haltRaw: null,
      haltAt: null,
      highRes: true,
      top12EnteredAt: null,
      qualified: null,
      latched: false,
      rthFinal: null,
      afterHours: emptyAfterHours(),
      freshness: { lastEventAt: '2026-09-25T13:00:00.000Z', ageSeconds: 2, stale: false },
      updatedAt: '2026-09-25T13:00:02.000Z',
    } as unknown as MarketSnapshot['demand'][string];

    return {
      discovery: {
        tradingDate: '2026-09-25',
        sessionPhase: 'PREMARKET',
        ranked: [demand],
      },
      demand: { HOWL: demand },
      intelligence: {},
      blueSky: {},
      events: [],
      catalystFreshFrom,
      fetchedAt: '2026-09-25T13:00:00.000Z',
    } as unknown as MarketSnapshot;
  }

  /** One sheet row, so the merge's FIRST loop has something to build. */
  it('puts it on every row (one loop since the Sheet rows left, A5 rest)', () => {
    const merged = mergeDesk(snapshot(BOUNDARY));

    expect(merged.discovery.map((row) => row.ticker)).toEqual(['HOWL']);
    expect(merged.rows.size).toBe(1);

    for (const row of merged.rows.values()) {
      expect(row.catalystFreshFrom).toBe(BOUNDARY);
    }
  });

  it('is null when the snapshot does not carry one, which is the day bands', () => {
    /*
     * The control this whole field needs: absent must mean BANDS, and it is
     * what an offline market, a degraded snapshot and every existing fixture
     * produce. A null here is a rule, not a failure.
     */
    const merged = mergeDesk(snapshot(null));

    expect(merged.discovery[0]!.catalystFreshFrom).toBeNull();
  });

  it('reads the field off the SNAPSHOT, not off the discovery projection', () => {
    /*
     * `sessionPhase` and `tradingDate` beside it in the same context object
     * both come from `market.discovery`; this one does not. Every instinct
     * points at the wrong object, so the assertion names it: a boundary set on
     * `discovery` and nowhere else must NOT be picked up.
     */
    const wrong = snapshot(null) as unknown as { discovery: Record<string, unknown> };
    wrong.discovery.catalystFreshFrom = BOUNDARY;

    const merged = mergeDesk(wrong as unknown as MarketSnapshot);

    expect(merged.discovery[0]!.catalystFreshFrom).toBeNull();
  });
});

/* ------------------------------------------------------------------------- *
 * A PROMOTED ROW SHOWS WHAT MADE IT GREEN
 * ------------------------------------------------------------------------- */

/**
 * His ruling, 2026-09-25, option (a): on a row the prior close promoted,
 * replace the age with the reason.
 *
 * The defect is a PAIRING and not a wrong value. `3d` is correct and so is the
 * green; they are computed from different quantities and only disagree once the
 * boundary reaches across a weekend — which is why a Friday cannot show it and
 * a Monday premarket can.
 */
describe('a row promoted by the prior close states the reason, not the age', () => {
  /** Monday 2026-09-28, 08:00 ET. Prior session close: Friday 16:00 ET. */
  const MON = Date.parse('2026-09-28T12:00:00.000Z');
  const FRI_CLOSE = '2026-09-25T20:00:00.000Z';

  it('replaces `3d` with the session that made it fresh', () => {
    /*
     * The case nobody could see on the day it was found. Both arms, because
     * the bands-only arm is the control: without it this asserts nothing about
     * the boundary having done the promoting.
     */
    const at = '2026-09-25T21:18:05.000Z'; // Fri 17:18 ET, after the close

    const promoted = resolveWhy(rowWithEvent(at, FRI_CLOSE), MON);
    expect(promoted.freshness).toBe('FRESH');
    expect(promoted.age).toBe('since Fri close');
    expect(promoted.ageIsPriorClose).toBe(true);

    const unpromoted = resolveWhy(rowWithEvent(at, null), MON);
    expect(unpromoted.freshness).toBe('STALE');
    expect(unpromoted.age).toBe('3d');
    expect(unpromoted.ageIsPriorClose).toBe(false);
  });

  it('names the weekday off the boundary, so it is not a constant', () => {
    /*
     * A fixed word would be right four days in five. Thursday's close on a
     * Friday board, Friday's close on a Monday board, and a holiday moves it
     * again — so the label is read from the instant the desk banded on.
     */
    const friBoard = resolveWhy(
      rowWithEvent('2026-09-24T21:18:05.000Z', '2026-09-24T20:00:00.000Z'),
      Date.parse('2026-09-25T13:00:00.000Z'),
    );
    expect(friBoard.age).toBe('since Thu close');
  });

  it('LEAVES THE AGE ALONE on a row the day bands already called fresh', () => {
    /*
     * The control that decides whether the predicate is right rather than
     * merely firing. Today's news is FRESH either way, so the boundary did not
     * promote it and the age must survive — a check that only exercises the
     * firing case cannot tell you the condition is correct.
     */
    const today = resolveWhy(rowWithEvent('2026-09-28T11:30:00.000Z', FRI_CLOSE), MON);
    expect(today.freshness).toBe('FRESH');
    expect(today.age).toBe('30m');
    expect(today.ageIsPriorClose).toBe(false);
  });

  it('LEAVES THE AGE ALONE on a row that was never promoted', () => {
    // Friday 15:00 ET — before the close, so it stays STALE and keeps `3d`.
    const before = resolveWhy(rowWithEvent('2026-09-25T19:00:00.000Z', FRI_CLOSE), MON);
    expect(before.freshness).toBe('STALE');
    expect(before.age).toBe('3d');
    expect(before.ageIsPriorClose).toBe(false);
  });

  it('keeps the exact instant reachable and says WHY in the title', () => {
    /*
     * The age moved to the hover; it was not deleted. `eventAt` is the title on
     * that element, and the grade's title now carries the reason — otherwise
     * the row says `since Fri close` in green and the reader cannot tell
     * whether that is one day or four.
     */
    const promoted = resolveWhy(rowWithEvent('2026-09-25T21:18:05.000Z', FRI_CLOSE), MON);
    // Integration 41st: with no cited EXACT/INFERRED source at that instant the hover is the date only (the shared
    // rule); a sourced clock is kept (tests/dashboard/eventClock.test.ts).
    expect(promoted.eventAt).toBe('Sep 25, time not stated');
    expect(promoted.title).toContain("prior session's close");
    expect(promoted.title).toContain('since Fri close');

    const plain = resolveWhy(rowWithEvent('2026-09-25T19:00:00.000Z', FRI_CLOSE), MON);
    expect(plain.title).not.toContain("prior session's close");
  });

  it('keeps the age when the boundary is not a usable date', () => {
    /*
     * RENAMED AFTER A MUTANT SURVIVED, because the first name claimed more
     * than the test reaches. This does NOT exercise `priorCloseLabel`'s own
     * guard: an unusable boundary cannot promote in the first place
     * (`resolveCatalystFreshness` refuses it and falls to the bands), so the
     * label function is never called and removing its `Number.isFinite` check
     * left this green. What it actually proves is the composition — a broken
     * boundary produces a normal STALE row and never a guessed weekday.
     *
     * The guard itself is covered directly below.
     */
    const broken = resolveWhy(rowWithEvent('2026-09-25T21:18:05.000Z', 'not-a-date'), MON);
    expect(broken.freshness).toBe('STALE');
    expect(broken.age).toBe('3d');
    expect(broken.ageIsPriorClose).toBe(false);
  });
});

describe('priorCloseLabel, reached directly because the composition hides it', () => {
  it('names the boundary weekday in ET', () => {
    // 20:00Z is 16:00 ET, and the weekday must be read there and not in UTC.
    expect(priorCloseLabel('2026-09-25T20:00:00.000Z')).toBe('since Fri close');
    expect(priorCloseLabel('2026-09-24T20:00:00.000Z')).toBe('since Thu close');
  });

  it('crosses midnight UTC without moving the ET day', () => {
    /*
     * The one arithmetic this label can get wrong. 2026-09-26T01:00Z is still
     * FRIDAY evening in New York; a UTC read would call it Saturday and print
     * a session that does not exist.
     */
    expect(priorCloseLabel('2026-09-26T01:00:00.000Z')).toBe('since Fri close');
  });

  it('returns NULL rather than a guess on anything unparseable', () => {
    // Null is what lets the caller keep the elapsed age instead of inventing
    // a weekday. `new Date(NaN)` would make `Intl.format` throw outright.
    for (const bad of ['not-a-date', '', null, undefined]) {
      expect(priorCloseLabel(bad)).toBeNull();
    }
  });
});
