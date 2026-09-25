import { describe, expect, it } from 'vitest';

import { normalizeSheetRows } from '@/lib/data/rows';
import { buildDeskRow, mergeDesk } from '@/lib/dashboard/merge';
import { resolveWhy } from '@/lib/dashboard/why';
import type { AutoIntelligence } from '@/lib/research/view';
import type { MarketSnapshot } from '@/lib/market/types';
import type { DashboardState } from '@/lib/data/types';
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

  return buildDeskRow('HOWL', null, null, null, intel, null, { catalystFreshFrom });
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
  function dashboardWith(ticker: string): DashboardState {
    const rows = normalizeSheetRows(
      [['A - PRIMARY', ticker, 'United States', 'FRESH / FRONTSIDE', '$5.00']],
      [],
    );
    return {
      tickers: rows.tickers,
      research: rows.research,
      meta: { fetchedAt: '2026-09-25T13:00:00.000Z' },
    } as unknown as DashboardState;
  }

  it('puts it on discovery rows and on watchlist rows alike', () => {
    /*
     * BOTH LOOPS. `mergeDesk` builds rows twice — once over the sheet and once
     * over the demand map for names the sheet does not carry — and a context
     * key added to one of them leaves half the board on the day bands while
     * the other half is refined. That is the colour-disagrees-with-the-words
     * defect arriving by a new route.
     *
     * THE POPULATION IS THE ASSERTION, and the first pass got it wrong: it ran
     * with an empty sheet, so only the demand loop executed. The test was
     * named "both loops" and could not have failed on one of them. `SUGP` is
     * on the sheet and not in the demand map; `HOWL` is in the demand map and
     * not on the sheet, so each loop owns exactly one row.
     */
    const merged = mergeDesk(dashboardWith('SUGP'), snapshot(BOUNDARY));

    expect(merged.watchlist.map((row) => row.ticker)).toEqual(['SUGP']);
    expect(merged.discovery.map((row) => row.ticker)).toEqual(['HOWL']);
    expect(merged.rows.size).toBe(2);

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
    const merged = mergeDesk(dashboardWith('SUGP'), snapshot(null));

    expect(merged.discovery[0]!.catalystFreshFrom).toBeNull();
    expect(merged.watchlist[0]!.catalystFreshFrom).toBeNull();
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

    const merged = mergeDesk(dashboardWith('SUGP'), wrong as unknown as MarketSnapshot);

    expect(merged.discovery[0]!.catalystFreshFrom).toBeNull();
    expect(merged.watchlist[0]!.catalystFreshFrom).toBeNull();
  });
});
