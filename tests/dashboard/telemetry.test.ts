import { describe, expect, it } from 'vitest';

import { buildDeskRead } from '@/lib/dashboard/deskRead';
import { buildDeskRow, mergeDesk, resolveDisplayPrice } from '@/lib/dashboard/merge';
import { buildTelemetry } from '@/lib/dashboard/telemetry';
import { selectFocusRows } from '@/lib/dashboard/view';
import { normalizeSheetRows } from '@/lib/data/rows';
import { MockProvider } from '../fixtures/mockSheet';
import type { DashboardState } from '@/lib/data/types';
import type { DemandState, MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';
import { emptyAssessmentPanel } from '@/lib/desk/view';

function demand(ticker: string, overrides: Partial<DemandState> = {}): DemandState {
  return {
    ticker,
    tradingDate: '2026-08-17',
    price: 5.7,
    priceSource: 'sip-trade',
    priceAt: '2026-08-17T15:40:00.000Z',
    barClose: 5.69,
    barAt: '2026-08-17T15:40:00.000Z',
    previousClose: 5.0,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 5.0,
    referenceRthCloseDate: '2026-08-14',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 14.1,
    cumulativeVolume: 2_145_321,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 6.69,
    sessionLow: 5.32,
    vwap: emptySessionVwapSet(),
    rvol: 2.02,
    rvolRank: 88,
    previousRvolRank: 92,
    rvolRankChange: 4,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 1_060_000,
    baselineCalculatedAt: '2026-08-17T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: {
      bid: 5.68,
      bidSize: 2,
      ask: 5.72,
      askSize: 3,
      spread: 0.04,
      spreadPct: 0.7,
      at: null,
      invalid: false,
    },
    luld: { lower: 5.1, upper: 6.3, at: null },
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
    freshness: { lastEventAt: '2026-08-17T15:40:00.000Z', ageSeconds: 3, stale: false },
    updatedAt: '2026-08-17T15:40:02.000Z',
    ...overrides,
  };
}

/** A TODAY row carrying premarket values, as the live sheet does. */
function sheetRow(ticker: string) {
  const row: string[] = new Array(27).fill('');
  row[0] = 'A — PRIMARY';
  row[1] = ticker;
  row[2] = 'United States';
  row[3] = '🟢 FRESH / FRONTSIDE';
  row[4] = '$5.00';
  row[8] = '12,000,000';
  row[9] = 'A — STRONG/FRESH';
  row[10] = 'Friday earnings beat with raised guidance.';
  row[15] = 'CAUTION — active ATM';
  row[16] = '$6.22/$6.50 resistance; $5.00 support';
  row[19] = '$5.80';
  row[20] = '16.0%';
  row[21] = '1,100,000';
  return normalizeSheetRows([row], []).tickers[0]!;
}

describe('live telemetry precedence', () => {
  const sheet = sheetRow('FIEE');

  it('shows the live print, not the premarket sheet snapshot', () => {
    // The exact discrepancy from the live desk: the sheet said $5.80 / +16.0%
    // PM while Alpaca was printing $5.70 / +14.1%.
    const t = buildTelemetry({ ticker: 'FIEE', demand: demand('FIEE'), sheet });

    expect(t.source).toBe('ALPACA');
    expect(t.sourceLabel).toBe('SIP');
    expect(t.price).toBe(5.7);
    expect(t.percentChange).toBe(14.1);
    expect(t.volume).toBe(2_145_321);
  });

  it('carries every live-only market field', () => {
    const t = buildTelemetry({ ticker: 'FIEE', demand: demand('FIEE'), sheet });

    expect(t.sessionHigh).toBe(6.69);
    expect(t.sessionLow).toBe(5.32);
    expect(t.rvol).toBe(2.02);
    expect(t.rvolRank).toBe(88);
    expect(t.spreadPct).toBe(0.7);
    expect(t.bid).toBe(5.68);
    expect(t.ask).toBe(5.72);
    expect(t.luldUpper).toBe(6.3);
    expect(t.haltState).toBe('TRADING');
  });

  it('keeps aged live data in front of the sheet, but marks it', () => {
    // The sheet snapshot is older still, so swapping to it would not be a
    // recovery. What it must never do is look current.
    const t = buildTelemetry({
      ticker: 'FIEE',
      demand: demand('FIEE', {
        freshness: { lastEventAt: '2026-08-17T15:10:00.000Z', ageSeconds: 1800, stale: true },
      }),
      sheet,
    });

    expect(t.source).toBe('ALPACA');
    expect(t.price).toBe(5.7);
    expect(t.stale).toBe(true);
    expect(t.ageSeconds).toBe(1800);
  });

  it('falls back to the sheet only when there is no live price at all', () => {
    const t = buildTelemetry({ ticker: 'FIEE', demand: null, sheet });

    expect(t.source).toBe('SHEET');
    expect(t.price).toBe(5.8);
    expect(t.percentChange).toBe(16);
    expect(t.sourceLabel).toBe('PM');
    expect(t.stale).toBe(false);
  });

  it('never invents live-only fields from a research row', () => {
    const t = buildTelemetry({ ticker: 'FIEE', demand: null, sheet });

    expect(t.rvol).toBeNull();
    expect(t.spreadPct).toBeNull();
    expect(t.sessionHigh).toBeNull();
    expect(t.bid).toBeNull();
    expect(t.haltState).toBe('UNKNOWN');
  });

  it('reports nothing rather than zero when neither source exists', () => {
    const t = buildTelemetry({ ticker: 'NEWNAME', demand: null, sheet: null });

    expect(t.source).toBe('NONE');
    expect(t.price).toBeNull();
    expect(t.percentChange).toBeNull();
    expect(t.volume).toBeNull();
  });

  it('is what the desk row and the display-price helper both read', () => {
    const row = buildDeskRow('FIEE', sheet, null, demand('FIEE'));

    expect(row.telemetry.price).toBe(5.7);
    expect(resolveDisplayPrice(row)).toMatchObject({ price: 5.7, source: 'ALPACA' });
    // The level ladder is centred on the same price the header shows.
    expect(row.levelMap.currentPrice).toBe(5.7);
  });
});

/* ------------------------------------------------- one projection per ticker */

async function mockDashboard(): Promise<DashboardState> {
  const payload = await new MockProvider().load();
  return { ...payload, meta: { ...payload.meta, stale: false, cacheAgeMs: 0 } };
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
      tradingDate: '2026-08-17',
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
      calculatedAt: '2026-08-17T15:40:02.000Z',
    },
    demand: Object.fromEntries(demands.map((state) => [state.ticker, state])),
    intelligence: {},
    blueSky: {},
    events: [],
    catalystFreshFrom: null,
    fetchedAt: '2026-08-17T15:40:02.000Z',
  };
}

describe('every surface reads one projection', () => {
  it('gives Focus and Discovery the identical market telemetry', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([demand('VNTX', { price: 9.99 })]));

    const discoveryRow = merged.discovery.find((row) => row.ticker === 'VNTX')!;
    const focusRow = selectFocusRows(['VNTX'], merged.rows)[0];

    // Same row object, therefore the same numbers by construction — there is no
    // second code path that could resolve a different price.
    expect(focusRow).toBe(discoveryRow);
    expect(focusRow.telemetry.price).toBe(9.99);
    expect(discoveryRow.telemetry.price).toBe(9.99);
    expect(focusRow.telemetry.price).not.toBe(dashboard.tickers[0].price.value);
  });

  it('hands the Desk Read in the drawer the same object again', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, snapshot([demand('VNTX', { price: 9.99 })]));
    const row = merged.rows.get('VNTX')!;

    expect(buildDeskRead(row).telemetry).toBe(row.telemetry);
  });

  it('never puts one ticker on the strip twice', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, null);
    // A duplicated pin is still one card.
    const focus = selectFocusRows(['VNTX', 'VNTX'], merged.rows);

    expect(focus).toHaveLength(1);
  });

  it('still fills Focus from the sheet when the market worker is down', async () => {
    const dashboard = await mockDashboard();
    const merged = mergeDesk(dashboard, null);
    const focus = selectFocusRows(['VNTX'], merged.rows);

    expect(focus.length).toBeGreaterThan(0);
    for (const row of focus) {
      expect(row.telemetry.source).toBe('SHEET');
      expect(row.telemetry.price).toBeGreaterThan(0);
    }
  });
});
