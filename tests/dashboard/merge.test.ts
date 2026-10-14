import { describe, expect, it } from 'vitest';

import { buildDeskRow, mergeDesk, resolveDisplayPrice } from '@/lib/dashboard/merge';
import type { DemandState, MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';
import { emptyAssessmentPanel } from '@/lib/desk/view';

function demand(ticker: string, overrides: Partial<DemandState> = {}): DemandState {
  return {
    ticker,
    tradingDate: '2026-08-14',
    price: 6.22,
    priceSource: 'sip-trade',
    priceAt: '2026-08-14T13:31:00.000Z',
    barClose: 6.2,
    barAt: '2026-08-14T13:31:00.000Z',
    previousClose: 4.92,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 4.92,
    referenceRthCloseDate: '2026-08-13',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 26.4,
    cumulativeVolume: 3_840_000,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 6.4,
    sessionLow: 4.9,
    vwap: emptySessionVwapSet(),
    rvol: 3.1,
    rvolRank: 1,
    previousRvolRank: 4,
    rvolRankChange: 3,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 1_250_000,
    baselineCalculatedAt: '2026-08-14T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: { bid: 6.2, bidSize: 3, ask: 6.24, askSize: 4, spread: 0.04, spreadPct: 0.64, at: null, invalid: false },
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
    feed: 'sip',
    freshness: { lastEventAt: '2026-08-14T13:31:00.000Z', ageSeconds: 2, stale: false },
    updatedAt: '2026-08-14T13:31:02.000Z',
    ...overrides,
  };
}

function snapshot(demands: DemandState[]): MarketSnapshot {
  return {
    health: {
      mode: 'LIVE',
      feed: 'sip',
      connectionState: 'STREAMING',
      sipEntitlement: 'VERIFIED',
      lastMessageAt: null,
      lastBarAt: null,
      lastTradeAt: null,
      lastQuoteAt: null,
      lastStatusAt: null,
      reconnectCount: 0,
      lastError: null,
      lastErrorAt: null,
      subscriptions: { bars: '*', updatedBars: '*', statuses: '*', trades: 0, quotes: 0, lulds: 0 },
      highResCount: demands.length,
      universeMode: 'FULL',
      workerStartedAt: null,
      heartbeatAt: new Date().toISOString(),
      stale: false,
      offline: false,
      backfill: null,
      rejectedSymbols: [],
      rthCloseCapture: null,
    },
    marketHealth: {
      state: 'LIVE',
      connection: 'STREAMING',
      freshness: 'FRESH',
      label: 'Market: Alpaca SIP — LIVE',
      detail: 'Streaming',
      tone: 'pos',
      messageAgeSeconds: 1,
      heartbeatAgeSeconds: 1,
      live: true,
      thresholds: { freshSeconds: 90, staleSeconds: 240 },
    },
    assessments: emptyAssessmentPanel(),
    researchHealth: {
      state: 'IDLE',
      label: 'Research: idle',
      detail: 'Engine healthy',
      tone: 'pos',
      queuedJobs: 0,
      activeJobs: [],
      activeCount: 0,
      lastCompletedTicker: null,
      lastCompletedAt: null,
      heartbeatAgeSeconds: 2,
      running: true,
    },
    discovery: {
      tradingDate: '2026-08-14',
      sessionPhase: 'RTH',
      board: 'DAILY_RVOL',
      rankingLabel: 'Daily RVOL',
      afterHoursStart: null,
      rthClose: '16:00',
      earlyClose: false,
      universeMode: 'FULL',
      eligibleCount: demands.length,
      rankedCount: demands.length,
      baselineCount: 100,
      trackedCount: demands.length,
      discoveryRank: 12,
      internalRank: 50,
      priceMin: 1,
      priceMax: 20,
      rangeBounds: { min: 1, max: 20 },
      rangeDefault: { min: 1, max: 20 },
      ordinalsOmitted: false,
      ranked: demands,
      calculatedAt: '2026-08-14T13:31:02.000Z',
    },
    demand: Object.fromEntries(demands.map((state) => [state.ticker, state])),
    intelligence: {},
    blueSky: {},
    events: [],
    catalystFreshFrom: null,
    fetchedAt: '2026-08-14T13:31:02.000Z',
  };
}


describe('demand detected vs structural analysis available', () => {
  it('marks a discovery-only ticker as not analyzed', async () => {
    const merged = mergeDesk(snapshot([demand('NEWNAME')]));

    const row = merged.rows.get('NEWNAME')!;
    expect(row.demandDetected).toBe(true);
    expect(row.analysisAvailable).toBe(false);
  });

});

describe('the setup grade on a desk row', () => {
  const GRADE = {
    grade: 'AVOID' as const,
    basis: { structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'RISK', supply: 'UNKNOWN' } as const,
    rule: 'rubric-2026-10-05',
    checkpointCompletedAt: '2026-10-05T19:42:00.000Z',
  };

  it('passes the stored grade through untouched, for every name', async () => {
    const market = snapshot([demand('NEWNAME'), demand('VNTX')]);
    market.setupGrades = { NEWNAME: { ...GRADE }, VNTX: { ...GRADE, grade: 'B' } };
    const merged = mergeDesk(market);

    expect(merged.rows.get('NEWNAME')!.setupGrade).toEqual(GRADE);
    expect(merged.rows.get('VNTX')!.setupGrade?.grade).toBe('B');
  });

  it('reads absent, null and a snapshot without the field as no grade (NOT_YET), never as a grade', async () => {
    const market = snapshot([demand('NEWNAME'), demand('VNTX')]);
    market.setupGrades = { VNTX: null };
    const withField = mergeDesk(market);
    expect(withField.rows.get('NEWNAME')!.setupGrade).toBeNull();
    expect(withField.rows.get('VNTX')!.setupGrade).toBeNull();

    const without = mergeDesk(snapshot([demand('NEWNAME')]));
    expect(without.rows.get('NEWNAME')!.setupGrade).toBeNull();
  });

  it('tells a map that is not wired from a name with no grade: two states, not one', async () => {
    // No setupGrades on the snapshot at all: the grade is NOT WIRED.
    const notWired = mergeDesk(snapshot([demand('NEWNAME')]));
    expect(notWired.rows.get('NEWNAME')!.setupGradeWired).toBe(false);

    // A null map (a reader that sends null) is also not wired, never "wired and empty".
    const nullMap = snapshot([demand('NEWNAME')]);
    (nullMap as unknown as { setupGrades: null }).setupGrades = null;
    expect(mergeDesk(nullMap).rows.get('NEWNAME')!.setupGradeWired).toBe(false);

    // An EMPTY map is wired: every name in it is simply without a grade.
    const wired = snapshot([demand('NEWNAME')]);
    wired.setupGrades = {};
    const merged = mergeDesk(wired);
    expect(merged.rows.get('NEWNAME')!.setupGradeWired).toBe(true);
    expect(merged.rows.get('NEWNAME')!.setupGrade).toBeNull();
  });
});

describe('the display price', () => {
  it('prefers live Alpaca values when they exist, and labels the source', async () => {
    const merged = mergeDesk(snapshot([demand('VNTX', { price: 9.99 })]));

    const price = resolveDisplayPrice(merged.rows.get('VNTX')!);
    expect(price.source).toBe('ALPACA');
    expect(price.price).toBe(9.99);
  });
});

describe('the regular-session high is not printed from the 04:00-16:00 high (Integration 30th)', () => {
  const types = (row: ReturnType<typeof buildDeskRow>) =>
    new Set([...row.levelMap.above, ...row.levelMap.below].flatMap((zone) => zone.members.map((m) => m.type)));
  const rthFinal = { close: 6.1, high: 7.25, low: 5.5, volume: 3_000_000, rvol: 3, rvolRank: 1, frozenAt: null };

  it('after hours: rthFinal.high present gives no RTH_HIGH level; the session high and the after-hours high stay', () => {
    const afterHours = { ...emptyAfterHours(), high: 6.9 };
    const row = buildDeskRow('ACME', demand('ACME', { price: 6.22, sessionHigh: 6.48, rthFinal, afterHours }), null, {
      sessionPhase: 'AFTER_HOURS',
    });
    const seen = types(row);
    expect(seen.has('RTH_HIGH')).toBe(false);
    expect(seen.has('HOD')).toBe(true);
    expect(seen.has('AH_HIGH')).toBe(true);
    expect(JSON.stringify(row.levelMap)).not.toContain('regular-session high');
  });

  it('premarket: no RTH_HIGH either, and the premarket high stays', () => {
    const row = buildDeskRow('ACME', demand('ACME', { price: 6.22, sessionHigh: 6.48, rthFinal }), null, {
      sessionPhase: 'PREMARKET',
    });
    const seen = types(row);
    expect(seen.has('RTH_HIGH')).toBe(false);
    expect(seen.has('PM_HIGH')).toBe(true);
  });
});

describe('level map view model', () => {
  it('reaches the desk row already grouped and measured', () => {
    // The component must receive structured levels, not prose to re-parse.
    const row = buildDeskRow(
      'ACME',
      demand('ACME', { price: 6.22, sessionHigh: 6.48, sessionLow: 5.9 }),);

    expect(row.levelMap.currentPrice).toBe(6.22);
    expect(row.levelMap.empty).toBe(false);

    // Session high above, session low below, both measured from price.
    expect(row.levelMap.above[0].nearestPrice).toBe(6.48);
    expect(row.levelMap.above[0].distanceAbs).toBeCloseTo(0.26, 4);
    expect(row.levelMap.below.some((z) => z.nearestPrice === 5.9)).toBe(true);

    // Derived round numbers are present but never lead over a real level.
    expect(row.levelMap.above[0].dominantType).toBe('HOD');
  });

  it('orders each side nearest-first for the ladder', () => {
    const row = buildDeskRow(
      'ACME',
      demand('ACME', { price: 6.22, sessionHigh: 7.4, sessionLow: 5.1 }),);

    const above = row.levelMap.above.map((z) => z.distanceAbs ?? 0);
    const below = row.levelMap.below.map((z) => z.distanceAbs ?? 0);
    expect([...above].sort((a, b) => a - b)).toEqual(above);
    expect([...below].sort((a, b) => a - b)).toEqual(below);
  });

  it('degrades to an empty map rather than throwing when nothing is known', () => {
    const row = buildDeskRow('NONE', null);
    expect(row.levelMap.empty).toBe(true);
    expect(row.levelMap.currentPrice).toBeNull();
  });
});

describe('the float on a desk row: two absences, as the grade', () => {
  const FLOAT = {
    state: 'PRODUCED' as const,
    reason: null,
    bound: 8_100_000,
    countAsOf: '2026-09-22',
    countFiled: '2026-09-25',
    subtractedHolders: 1,
    filingsReadOn: '2026-10-05',
    holdingsFiledOn: ['2026-09-18'],
    countShares: 9_000_000,
    countForm: '10-Q',
    insiders: [],
  };

  it('an absent or null map is not wired, an object (even empty) is wired, and a missing name is Not computed', async () => {
    const rowFor = (floatBounds: unknown) => {
      const market = snapshot([demand('NEWNAME')]);
      (market as unknown as { floatBounds: unknown }).floatBounds = floatBounds;
      return mergeDesk(market).rows.get('NEWNAME')!;
    };
    expect(rowFor(undefined).floatBoundWired).toBe(false);
    expect(rowFor(null).floatBoundWired).toBe(false);
    const empty = rowFor({});
    expect(empty.floatBoundWired).toBe(true);
    expect(empty.floatBound).toBeNull();
    const sent = rowFor({ NEWNAME: FLOAT });
    expect(sent.floatBoundWired).toBe(true);
    expect(sent.floatBound?.bound).toBe(8_100_000);
  });
});
