/**
 * A5 (his "everything tonight." 2026-10-14T02:09:54.695Z; Integration 40th): the MCP tools and the review
 * diagnostics merge WITHOUT the Sheet. Every tool still answers a market-tracked ticker from the desk's own
 * data in the same shape, every Sheet-fed field is null, and neither module reads the dashboard payload.
 *
 * Real empty store and the real getMarketSnapshot, with one tracked ticker added to its demand and ranking.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { DemandState, MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';

const T = 'TRKD';

function demand(ticker: string): DemandState {
  return {
    ticker,
    tradingDate: '2026-10-13',
    price: 6.22,
    priceSource: 'sip-trade',
    priceAt: '2026-10-13T13:31:00.000Z',
    barClose: 6.2,
    barAt: '2026-10-13T13:31:00.000Z',
    previousClose: 4.92,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 4.92,
    referenceRthCloseDate: '2026-10-10',
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
    baselineCalculatedAt: '2026-10-13T08:00:00.000Z',
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
    freshness: { lastEventAt: '2026-10-13T13:31:00.000Z', ageSeconds: 2, stale: false },
    updatedAt: '2026-10-13T13:31:02.000Z',
  } as DemandState;
}

vi.mock('@/lib/market/readModel', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/market/readModel')>();
  return {
    ...real,
    getMarketSnapshot: (...args: Parameters<typeof real.getMarketSnapshot>): MarketSnapshot => {
      const snap = real.getMarketSnapshot(...args);
      const d = demand(T);
      return {
        ...snap,
        demand: { ...(snap.demand ?? {}), [T]: d },
        discovery: { ...snap.discovery, ranked: [d, ...(snap.discovery.ranked ?? [])] },
      } as MarketSnapshot;
    },
  };
});

let directory: string;
beforeAll(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-nosheet-'));
  process.env.MARKET_DB_PATH = path.join(directory, 'market.db');
});
afterAll(() => {
  delete process.env.MARKET_DB_PATH;
});

async function tool(name: string, args: Record<string, unknown> = {}) {
  const { TOOLS_BY_NAME } = await import('@/lib/mcp/tools');
  const found = TOOLS_BY_NAME.get(name);
  if (!found) throw new Error(`no tool ${name}`);
  return (await found.handler(args)) as Record<string, unknown>;
}

describe('the MCP tools without the Sheet', () => {
  it('neither the tools nor diagnostics read the dashboard payload', () => {
    for (const file of ['lib/mcp/tools.ts', 'lib/review/diagnostics.ts']) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source, file).not.toContain('getDashboardState');
      expect(source, file).toContain('mergeDesk(null, snapshot)');
    }
  });

  it('get_desk_status keeps its keys; the sheet block is all null', async () => {
    const out = await tool('get_desk_status');
    for (const key of ['nowEt', 'tradingDate', 'sessionPhase', 'board', 'market', 'research', 'assessments', 'sheet']) {
      expect(out, key).toHaveProperty(key);
    }
    expect(out.sheet).toEqual({ provider: null, fetchedAt: null, stale: null, cacheAgeSeconds: null, rows: null, error: null });
  });

  it('get_discovery answers the tracked ticker from the market, sheet null', async () => {
    const out = await tool('get_discovery', { limit: 5 });
    const row = (out.rows as Array<Record<string, unknown>>).find((r) => r.ticker === T);
    expect(row).toBeDefined();
    for (const key of ['telemetry', 'cycleLevels', 'levelMap', 'displayedFloat', 'displayedFloatTurnover', 'intelligenceState', 'provenance', 'deskRead', 'sheet']) {
      expect(row, key).toHaveProperty(key);
    }
    const telemetry = row!.telemetry as Record<string, unknown>;
    expect(telemetry.price).toBe(6.22);
    expect(telemetry.source).toBe('ALPACA');
    expect(row!.sheet).toBeNull();
    expect(row!.displayedFloat).toBeNull();
  });

  it('get_ticker answers the tracked ticker; every Sheet-fed field is null, the field set unchanged', async () => {
    const out = await tool('get_ticker', { ticker: T });
    expect(out.found).toBe(true);
    for (const key of ['deskRead', 'structure', 'telemetry', 'levelMap', 'cycleLevels', 'displayedFloat', 'displayedFloatSource', 'displayedFloatTurnover', 'intelligenceState', 'provenance', 'comparison', 'sheet', 'supplyLedger', 'intelligence', 'riskInTheEvidence', 'researchStatus']) {
      expect(out, key).toHaveProperty(key);
    }
    expect(out.sheet).toBeNull();
    expect(out.supplyLedger).toBeNull();
    expect(out.displayedFloat).toBeNull();
    expect(out.displayedFloatSource).toBeNull();
    expect(out.researchStatus).toBe('NO_RESEARCH_RECORD');
    expect((out.telemetry as Record<string, unknown>).price).toBe(6.22);
  });

  it('an untracked ticker answers found:false, and the detail no longer mentions the sheet', async () => {
    const out = await tool('get_ticker', { ticker: 'NOTRK' });
    expect(out.found).toBe(false);
    expect(String(out.detail)).not.toMatch(/sheet/i);
  });

  it('get_recent_events answers', async () => {
    const out = await tool('get_recent_events');
    expect(out).toHaveProperty('events');
  });

  it('review diagnostics keeps its keys; the sheet block is all null and no SHEET error is reported', async () => {
    const { buildDiagnostics } = await import('@/lib/review/diagnostics');
    const d = await buildDiagnostics();
    expect(Object.keys(d)).toEqual([
      'generatedAt', 'deployment', 'market', 'research', 'assessments', 'sheet',
      'database', 'resources', 'intelligence', 'consistency', 'recentErrors',
    ]);
    expect(d.sheet).toEqual({
      provider: null, fetchedAt: null, fetchedAtEt: null, cacheAgeSeconds: null, stale: null,
      sourceUpdatedAt: null, sourceTitle: null, rows: null, researchRecords: null, warnings: [], error: null,
    });
    expect(d.recentErrors.filter((entry) => entry.component === 'SHEET')).toEqual([]);
  });
});
