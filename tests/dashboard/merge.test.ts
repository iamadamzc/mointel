import { describe, expect, it } from 'vitest';

import { dedupeSheetRows, buildDeskRow, mergeDesk, resolveDisplayPrice } from '@/lib/dashboard/merge';
import { normalizeSheetRows } from '@/lib/data/rows';
import { MockProvider } from '@/lib/data/providers/mock';
import type { DashboardState } from '@/lib/data/types';
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

async function mockDashboard(): Promise<DashboardState> {
  const payload = await new MockProvider().load();
  return {
    ...payload,
    meta: { ...payload.meta, stale: false, cacheAgeMs: 0 },
  };
}

describe('displayed float turnover in the merge (requirements 19, 20)', () => {
  it('uses the RESEARCH float when it is numeric', () => {
    const rows = normalizeSheetRows(
      [['A — PRIMARY', 'ABCD', 'United States', '🟢 FRESH / FRONTSIDE', '$5.00']],
      [['2026-08-14', 'ABCD', 'United States', 'Test Co', '$5.00', '', '', '', '1,920,000']],
    );

    const row = buildDeskRow('ABCD', rows.tickers[0]!, rows.research.ABCD!, demand('ABCD'));

    expect(row.displayedFloat).toBe(1_920_000);
    expect(row.displayedFloatSource).toBe('RESEARCH');
    expect(row.displayedFloatTurnover).toBe(2);
  });

  it('does not calculate turnover when the float reads UNKNOWN or DIRTY FLOAT', () => {
    for (const floatCell of ['UNKNOWN', 'DIRTY FLOAT', '', 'Unknown']) {
      const rows = normalizeSheetRows(
        [['A — PRIMARY', 'ABCD', 'US', '🟢 FRESH / FRONTSIDE', '$5.00', '', '', '', floatCell]],
        [['2026-08-14', 'ABCD', 'US', 'Test Co', '$5.00', '', '', '', floatCell]],
      );

      const row = buildDeskRow('ABCD', rows.tickers[0]!, rows.research.ABCD!, demand('ABCD'));
      expect(row.displayedFloat).toBeNull();
      expect(row.displayedFloatTurnover).toBeNull();
    }
  });

  it('does not calculate turnover without live volume', () => {
    const rows = normalizeSheetRows(
      [['A — PRIMARY', 'ABCD', 'US', '🟢 FRESH / FRONTSIDE', '$5.00', '', '', '', '2,000,000']],
      [],
    );
    const row = buildDeskRow('ABCD', rows.tickers[0]!, null, null);
    expect(row.displayedFloatTurnover).toBeNull();
  });
});

describe('demand detected vs structural analysis available', () => {
  it('marks a discovery-only ticker as not analyzed', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([demand('NEWNAME')]));

    const row = merged.rows.get('NEWNAME')!;
    expect(row.demandDetected).toBe(true);
    expect(row.analysisAvailable).toBe(false);
    expect(row.research).toBeNull();
    expect(row.researchRecord).toBeNull();
    // No fabricated structure classification of any kind.
    expect(row.displayedFloat).toBeNull();
  });

  it('marks a sheet ticker with no market data as analyzed but not detected', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([]));

    const row = merged.rows.get('VNTX')!;
    expect(row.analysisAvailable).toBe(true);
    expect(row.demandDetected).toBe(false);
    expect(row.demand).toBeNull();
  });

  it('joins both when a sheet ticker is also discovered', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([demand('VNTX')]));

    const row = merged.rows.get('VNTX')!;
    expect(row.analysisAvailable).toBe(true);
    expect(row.demandDetected).toBe(true);
    expect(row.research?.ticker).toBe('VNTX');
    expect(row.demand?.rvolRank).toBe(1);
  });
});

describe('the setup grade on a desk row', () => {
  const GRADE = {
    grade: 'AVOID' as const,
    basis: { structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'RISK', supply: 'UNKNOWN' } as const,
    rule: 'rubric-2026-10-05',
    checkpointCompletedAt: '2026-10-05T19:42:00.000Z',
  };

  it('passes the stored grade through untouched, for a sheet name and a discovery-only name', async () => {
    const dashboard = await mockDashboard();
    const market = snapshot([demand('NEWNAME'), demand('VNTX')]);
    market.setupGrades = { NEWNAME: { ...GRADE }, VNTX: { ...GRADE, grade: 'B' } };
    const merged = mergeDesk(dashboard, market);

    expect(merged.rows.get('NEWNAME')!.setupGrade).toEqual(GRADE);
    expect(merged.rows.get('VNTX')!.setupGrade?.grade).toBe('B');
  });

  it('reads absent, null and a snapshot without the field as no grade (NOT_YET), never as a grade', async () => {
    const dashboard = await mockDashboard();
    const market = snapshot([demand('NEWNAME'), demand('VNTX')]);
    market.setupGrades = { VNTX: null };
    const withField = mergeDesk(dashboard, market);
    expect(withField.rows.get('NEWNAME')!.setupGrade).toBeNull();
    expect(withField.rows.get('VNTX')!.setupGrade).toBeNull();

    const without = mergeDesk(dashboard, snapshot([demand('NEWNAME')]));
    expect(without.rows.get('NEWNAME')!.setupGrade).toBeNull();
    expect(mergeDesk(dashboard, null).rows.get('VNTX')!.setupGrade).toBeNull();
  });

  it('tells a map that is not wired from a name with no grade: two states, not one', async () => {
    const dashboard = await mockDashboard();
    // No setupGrades on the snapshot at all: the grade is NOT WIRED.
    const notWired = mergeDesk(dashboard, snapshot([demand('NEWNAME')]));
    expect(notWired.rows.get('NEWNAME')!.setupGradeWired).toBe(false);
    expect(mergeDesk(dashboard, null).rows.get('VNTX')!.setupGradeWired).toBe(false);

    // A null map (a reader that sends null) is also not wired, never "wired and empty".
    const nullMap = snapshot([demand('NEWNAME')]);
    (nullMap as unknown as { setupGrades: null }).setupGrades = null;
    expect(mergeDesk(dashboard, nullMap).rows.get('NEWNAME')!.setupGradeWired).toBe(false);

    // An EMPTY map is wired: every name in it is simply without a grade.
    const wired = snapshot([demand('NEWNAME')]);
    wired.setupGrades = {};
    const merged = mergeDesk(dashboard, wired);
    expect(merged.rows.get('NEWNAME')!.setupGradeWired).toBe(true);
    expect(merged.rows.get('NEWNAME')!.setupGrade).toBeNull();
    expect(merged.rows.get('VNTX')!.setupGradeWired).toBe(true);
  });
});

describe('Alpaca state cannot overwrite research classification (requirement 21)', () => {
  it('leaves DIRTY FLOAT intact regardless of live turnover', async () => {
    const dashboard = await mockDashboard();
    const before = dashboard.tickers.find((ticker) => ticker.ticker === 'QBTL')!;
    expect(before.structure.state).toBe('DIRTY_FLOAT');

    const merged = mergeDesk(
      dashboard,
      snapshot([demand('QBTL', { cumulativeVolume: 500_000_000, rvol: 240 })]),
    );

    const row = merged.rows.get('QBTL')!;
    expect(row.research?.structure.state).toBe('DIRTY_FLOAT');
    expect(row.research?.structure.badges).toEqual(['DIRTY FLOAT']);
    expect(row.researchRecord?.floatQualityState).toBe('DIRTY_FLOAT');
    // The demand side carries no structure fields at all.
    expect(Object.keys(row.demand ?? {})).not.toContain('structure');
  });

  it('never promotes an unclassified structure to CLEAN because of market activity', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([demand('KAVU', { rvol: 99 })]));
    const row = merged.rows.get('KAVU')!;
    expect(row.research?.structure.state).toBe('UNKNOWN_STRUCTURE');
  });
});

describe('sheet-only operation without the market worker (requirement 32)', () => {
  it('produces a complete watchlist when there is no market snapshot at all', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, null);

    expect(merged.watchlist).toHaveLength(dashboard.tickers.length);
    expect(merged.discovery).toHaveLength(0);
    for (const row of merged.watchlist) {
      expect(row.demand).toBeNull();
      expect(row.demandDetected).toBe(false);
      expect(row.analysisAvailable).toBe(true);
    }

    const price = resolveDisplayPrice(merged.rows.get('VNTX')!);
    expect(price.source).toBe('SHEET');
    expect(price.price).toBeGreaterThan(0);
  });

  it('prefers live Alpaca values when they exist, and labels the source', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([demand('VNTX', { price: 9.99 })]));

    const price = resolveDisplayPrice(merged.rows.get('VNTX')!);
    expect(price.source).toBe('ALPACA');
    expect(price.price).toBe(9.99);
  });
});

describe('duplicate TODAY rows', () => {
  /**
   * The live sheet carries a ticker twice: a populated research row and a later
   * placeholder. Keying by ticker in sheet order let the placeholder win, which
   * erased a completed human analysis and made a researched name read as
   * unanalyzed on the board.
   */
  function row(ticker: string, classified: boolean, sourceRow: number) {
    return {
      ticker,
      sourceRow,
      cycle: {
        raw: '',
        display: '',
        state: classified ? ('FRONTSIDE_WARNING' as const) : ('UNCLASSIFIED' as const),
      },
      structure: {
        raw: '',
        floatRaw: '',
        state: classified ? ('DIRTY_FLOAT' as const) : ('UNCLASSIFIED' as const),
        badges: [],
      },
      catalyst: {
        gradeRaw: '',
        gradeBucket: classified ? ('A' as const) : ('UNCLASSIFIED' as const),
        latest: '',
        original: '',
        latestTime: '',
        originalTime: '',
        hasPremarketUpdate: false,
      },
      priority: {
        raw: '',
        bucket: classified ? ('A' as const) : ('UNCLASSIFIED' as const),
        isRevised: false,
      },
    } as unknown as Parameters<typeof dedupeSheetRows>[0][number];
  }

  it('keeps the row that actually states conclusions', () => {
    const kept = dedupeSheetRows([row('IVF', true, 4), row('IVF', false, 17)]);
    expect(kept).toHaveLength(1);
    expect(kept[0].sourceRow).toBe(4);
    expect(kept[0].structure.state).toBe('DIRTY_FLOAT');
  });

  it('keeps the populated row regardless of sheet order', () => {
    const kept = dedupeSheetRows([row('IVF', false, 17), row('IVF', true, 4)]);
    expect(kept[0].structure.state).toBe('DIRTY_FLOAT');
  });

  it('leaves distinct tickers untouched and preserves order', () => {
    const kept = dedupeSheetRows([row('AAA', true, 1), row('BBB', true, 2)]);
    expect(kept.map((r) => r.ticker)).toEqual(['AAA', 'BBB']);
  });

  it('does not read the Sheet priority, so the payload can drop it', () => {
    // The Sheet's priority leaves the served payload (the desk's setup grade
    // replaces it); a row without the field must dedupe exactly as before.
    const strip = (r: ReturnType<typeof row>) => {
      const copy = { ...r } as Record<string, unknown>;
      delete copy.priority;
      return copy as unknown as typeof r;
    };
    const kept = dedupeSheetRows([strip(row('IVF', false, 17)), strip(row('IVF', true, 4))]);
    expect(kept).toHaveLength(1);
    expect(kept[0].sourceRow).toBe(4);
  });
});

describe('the regular-session high is not printed from the 04:00-16:00 high (Integration 30th)', () => {
  const types = (row: ReturnType<typeof buildDeskRow>) =>
    new Set([...row.levelMap.above, ...row.levelMap.below].flatMap((zone) => zone.members.map((m) => m.type)));
  const rthFinal = { close: 6.1, high: 7.25, low: 5.5, volume: 3_000_000, rvol: 3, rvolRank: 1, frozenAt: null };

  it('after hours: rthFinal.high present gives no RTH_HIGH level; the session high and the after-hours high stay', () => {
    const afterHours = { ...emptyAfterHours(), high: 6.9 };
    const row = buildDeskRow('ACME', null, null, demand('ACME', { price: 6.22, sessionHigh: 6.48, rthFinal, afterHours }), null, null, {
      sessionPhase: 'AFTER_HOURS',
    });
    const seen = types(row);
    expect(seen.has('RTH_HIGH')).toBe(false);
    expect(seen.has('HOD')).toBe(true);
    expect(seen.has('AH_HIGH')).toBe(true);
    expect(JSON.stringify(row.levelMap)).not.toContain('regular-session high');
  });

  it('premarket: no RTH_HIGH either, and the premarket high stays', () => {
    const row = buildDeskRow('ACME', null, null, demand('ACME', { price: 6.22, sessionHigh: 6.48, rthFinal }), null, null, {
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
      null,
      null,
      demand('ACME', { price: 6.22, sessionHigh: 6.48, sessionLow: 5.9 }),
    );

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
      null,
      null,
      demand('ACME', { price: 6.22, sessionHigh: 7.4, sessionLow: 5.1 }),
    );

    const above = row.levelMap.above.map((z) => z.distanceAbs ?? 0);
    const below = row.levelMap.below.map((z) => z.distanceAbs ?? 0);
    expect([...above].sort((a, b) => a - b)).toEqual(above);
    expect([...below].sort((a, b) => a - b)).toEqual(below);
  });

  it('degrades to an empty map rather than throwing when nothing is known', () => {
    const row = buildDeskRow('NONE', null, null, null);
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
  };

  it('an absent or null map is not wired, an object (even empty) is wired, and a missing name is Not computed', async () => {
    const dashboard = await mockDashboard();
    const rowFor = (floatBounds: unknown) => {
      const market = snapshot([demand('NEWNAME')]);
      (market as unknown as { floatBounds: unknown }).floatBounds = floatBounds;
      return mergeDesk(dashboard, market).rows.get('NEWNAME')!;
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
