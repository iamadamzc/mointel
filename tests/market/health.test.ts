import { describe, expect, it } from 'vitest';

import { classifyFreshness, projectMarketHealth } from '@/lib/market/health';
import type { MarketFeedHealth } from '@/lib/market/types';

const NOW = Date.parse('2026-08-17T15:40:00.000Z');

const THRESHOLDS = { freshSeconds: 90, staleSeconds: 240, heartbeatStaleMs: 15_000 };

function secondsAgo(seconds: number): string {
  return new Date(NOW - seconds * 1000).toISOString();
}

function health(overrides: Partial<MarketFeedHealth> = {}): MarketFeedHealth {
  return {
    mode: 'LIVE',
    feed: 'sip',
    connectionState: 'STREAMING',
    sipEntitlement: 'VERIFIED',
    rejectedSymbols: [],
    rthCloseCapture: null,
    lastMessageAt: secondsAgo(2),
    lastBarAt: null,
    lastTradeAt: null,
    lastQuoteAt: null,
    lastStatusAt: null,
    reconnectCount: 0,
    lastError: null,
    lastErrorAt: null,
    subscriptions: { bars: '*', updatedBars: '*', statuses: '*', trades: 0, quotes: 0, lulds: 0 },
    highResCount: 12,
    universeMode: 'FULL',
    workerStartedAt: null,
    heartbeatAt: secondsAgo(1),
    stale: false,
    offline: false,
    backfill: null,
    ...overrides,
  };
}

function project(overrides: Partial<MarketFeedHealth> = {}, phase: 'RTH' | 'CLOSED' = 'RTH') {
  return projectMarketHealth({
    health: health(overrides),
    sessionPhase: phase,
    now: NOW,
    thresholds: THRESHOLDS,
  });
}

/**
 * The defect these cover: the badge read LIVE whenever the socket was
 * STREAMING, so the live desk showed green beside `msg 227s` during RTH.
 * Connection state and data freshness are now separate facts, and LIVE needs
 * both.
 */
describe('market health', () => {
  it('is LIVE only when the socket is up and data is arriving', () => {
    const view = project();

    expect(view.state).toBe('LIVE');
    expect(view.connection).toBe('STREAMING');
    expect(view.freshness).toBe('FRESH');
    expect(view.live).toBe(true);
    expect(view.tone).toBe('pos');
  });

  it('tolerates a short lull rather than crying outage', () => {
    // 55s is inside the whole-market cadence we expect.
    const view = project({ lastMessageAt: secondsAgo(55) });

    expect(view.freshness).toBe('FRESH');
    expect(view.state).toBe('LIVE');
  });

  it('refuses to call a connected socket LIVE with four-minute-old data', () => {
    // The exact reading from the live desk.
    const view = project({ lastMessageAt: secondsAgo(227) });

    expect(view.connection).toBe('STREAMING');
    expect(view.freshness).toBe('DEGRADED');
    expect(view.state).toBe('DEGRADED');
    expect(view.live).toBe(false);
    expect(view.tone).toBe('warn');
    expect(view.label).not.toContain('LIVE');
  });

  it('escalates to STALE past the second threshold', () => {
    const view = project({ lastMessageAt: secondsAgo(600) });

    expect(view.freshness).toBe('STALE');
    expect(view.state).toBe('STALE');
    expect(view.label).toContain('DATA STALE');
    expect(view.live).toBe(false);
  });

  it('reports offline when the worker is not running', () => {
    const view = project({ offline: true, mode: 'OFFLINE' });

    expect(view.state).toBe('OFFLINE');
    expect(view.connection).toBe('OFFLINE');
    expect(view.tone).toBe('neg');
    expect(view.live).toBe(false);
  });

  it('reports offline when the socket is down, whatever the last message said', () => {
    const view = project({ connectionState: 'DISCONNECTED', lastMessageAt: secondsAgo(1) });

    expect(view.state).toBe('OFFLINE');
    expect(view.live).toBe(false);
  });

  it('degrades when the worker heartbeat lapses even with fresh market data', () => {
    const view = project({ heartbeatAt: secondsAgo(60) });

    expect(view.state).toBe('DEGRADED');
    expect(view.live).toBe(false);
  });

  it('expects no data outside the session window', () => {
    // Overnight silence is not a fault, and reporting one would teach the desk
    // to ignore this indicator by the time it matters.
    const view = project({ lastMessageAt: secondsAgo(40_000) }, 'CLOSED');

    expect(view.freshness).toBe('NOT_EXPECTED');
    expect(view.state).toBe('IDLE');
    expect(view.tone).toBe('dim');
  });

  it('never claims LIVE for simulated data', () => {
    const view = project({ mode: 'SIMULATOR', feed: 'simulator' });

    expect(view.state).toBe('SIMULATED');
    expect(view.live).toBe(false);
  });
});

describe('feed freshness is a market-level fact', () => {
  it('is judged on the whole-market stream, not on one ticker', () => {
    /*
     * An illiquid name can go a whole session without a print. That says
     * nothing about the SIP connection, so per-ticker quiet is reported on the
     * ticker and never on the feed.
     */
    const view = project({ lastMessageAt: secondsAgo(3) });
    expect(view.freshness).toBe('FRESH');
    expect(view.messageAgeSeconds).toBe(3);
  });

  it('classifies purely on age and session, with configurable thresholds', () => {
    const args = { sessionPhase: 'RTH' as const, freshSeconds: 10, staleSeconds: 20 };

    expect(classifyFreshness({ ...args, messageAgeSeconds: 9 })).toBe('FRESH');
    expect(classifyFreshness({ ...args, messageAgeSeconds: 10 })).toBe('DEGRADED');
    expect(classifyFreshness({ ...args, messageAgeSeconds: 19 })).toBe('DEGRADED');
    expect(classifyFreshness({ ...args, messageAgeSeconds: 20 })).toBe('STALE');
    // Connected through a session with nothing ever received is not a lull.
    expect(classifyFreshness({ ...args, messageAgeSeconds: null })).toBe('STALE');
  });
});
