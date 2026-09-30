/**
 * Market health: connection and data freshness, kept apart.
 *
 * The badge used to read LIVE whenever the WebSocket was in STREAMING state.
 * That is a statement about a socket, not about market data, and the live desk
 * showed a green LIVE badge beside `msg 227s` during RTH — four minutes without
 * a single whole-market message, reported as healthy.
 *
 * So two independent facts are resolved here and only then combined:
 *
 *   CONNECTION  is the socket up?
 *   FRESHNESS   is data actually arriving, at the cadence we expect?
 *
 * LIVE requires both. A healthy socket with old data is DEGRADED, then STALE —
 * amber, not green, and never silently green.
 *
 * Freshness is measured on the WHOLE-MARKET stream. One illiquid ticker with no
 * prints says nothing about the feed, and per-ticker quiet is reported
 * separately on each ticker's own freshness field.
 */

import { isMarketDataExpected } from './session';
import type { MarketFeedHealth, SessionPhase } from './types';

export type ConnectionHealth =
  | 'STREAMING'
  | 'CONNECTING'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'OFFLINE';

/**
 * `NOT_EXPECTED` is the honest reading outside session hours: no data is
 * arriving, and nothing is wrong. Reporting STALE overnight would train the
 * desk to ignore the indicator by the time it matters.
 */
export type DataFreshness = 'FRESH' | 'DEGRADED' | 'STALE' | 'NOT_EXPECTED' | 'UNKNOWN';

export type MarketHealthState =
  | 'LIVE'
  | 'DEGRADED'
  | 'STALE'
  | 'CONNECTING'
  | 'IDLE'
  | 'OFFLINE'
  | 'SIMULATED';

export type HealthTone = 'pos' | 'warn' | 'neg' | 'accent' | 'dim';

export interface MarketHealthView {
  state: MarketHealthState;
  connection: ConnectionHealth;
  freshness: DataFreshness;
  /** Badge text, e.g. "Market: Alpaca SIP — LIVE". */
  label: string;
  /** Hover text explaining what the state actually rests on. */
  detail: string;
  tone: HealthTone;
  /** Age of the newest whole-market message, seconds. Null when none seen. */
  messageAgeSeconds: number | null;
  /** Age of the worker's own heartbeat, seconds. */
  heartbeatAgeSeconds: number | null;
  /** True only when the socket is up AND data is arriving on time. */
  live: boolean;
  thresholds: { freshSeconds: number; staleSeconds: number };
}

export interface HealthThresholds {
  freshSeconds: number;
  staleSeconds: number;
  /** Worker heartbeat age, ms, beyond which the worker itself is suspect. */
  heartbeatStaleMs: number;
}

function ageSeconds(at: string | null, now: number): number | null {
  if (!at) return null;
  const parsed = Date.parse(at);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now - parsed) / 1000));
}

function connectionOf(health: MarketFeedHealth): ConnectionHealth {
  if (health.offline || health.mode === 'OFFLINE') return 'OFFLINE';

  switch (health.connectionState) {
    case 'STREAMING':
      return 'STREAMING';
    case 'AUTHENTICATED':
    case 'CONNECTED':
    case 'CONNECTING':
      return 'CONNECTING';
    case 'DEGRADED':
      return 'DEGRADED';
    case 'ERROR':
      return 'ERROR';
    default:
      return 'DISCONNECTED';
  }
}

/**
 * Classifies whole-market data flow.
 *
 * Outside the session window nothing is expected, so nothing is wrong. Inside
 * it, silence is graded rather than treated as binary: a short lull is normal,
 * a long one is not.
 */
export function classifyFreshness(options: {
  messageAgeSeconds: number | null;
  sessionPhase: SessionPhase;
  freshSeconds: number;
  staleSeconds: number;
}): DataFreshness {
  /*
   * Nothing is expected once SIP extended trading ends at 20:00, even though
   * the socket stays connected and the desk stays busy. A green LIVE badge at
   * 20:30 says new prints are arriving, which is false — and the research
   * engine being active is a different fact, reported separately.
   */
  if (!isMarketDataExpected(options.sessionPhase)) return 'NOT_EXPECTED';

  const age = options.messageAgeSeconds;
  // Connected during a session and nothing has ever arrived: not a lull.
  if (age === null) return 'STALE';

  if (age < options.freshSeconds) return 'FRESH';
  if (age < options.staleSeconds) return 'DEGRADED';
  return 'STALE';
}

const FEED_LABEL: Record<string, string> = {
  sip: 'Alpaca SIP',
  iex: 'Alpaca IEX',
  simulator: 'SIMULATOR',
  test: 'TEST STREAM',
};

export function projectMarketHealth(options: {
  health: MarketFeedHealth;
  sessionPhase: SessionPhase;
  now: number;
  thresholds: HealthThresholds;
}): MarketHealthView {
  const { health, sessionPhase, now, thresholds } = options;

  const messageAgeSeconds = ageSeconds(health.lastMessageAt, now);
  const heartbeatAgeSeconds = ageSeconds(health.heartbeatAt, now);
  const connection = connectionOf(health);
  const freshness = classifyFreshness({
    messageAgeSeconds,
    sessionPhase,
    freshSeconds: thresholds.freshSeconds,
    staleSeconds: thresholds.staleSeconds,
  });

  const feed = FEED_LABEL[health.feed] ?? health.feed.toUpperCase();
  const base = {
    connection,
    freshness,
    messageAgeSeconds,
    heartbeatAgeSeconds,
    thresholds: { freshSeconds: thresholds.freshSeconds, staleSeconds: thresholds.staleSeconds },
  };

  if (health.mode === 'SIMULATOR' || health.mode === 'TEST') {
    return {
      ...base,
      state: 'SIMULATED',
      label: `Market: ${feed}`,
      detail: 'Synthetic data: not a market feed and not tradeable',
      tone: 'warn',
      live: false,
    };
  }

  if (connection === 'OFFLINE') {
    return {
      ...base,
      state: 'OFFLINE',
      label: 'Market: worker offline',
      // No command. A second market worker silently displaces production's only
      // SIP connection, so an instruction here is advice to break the feed
      // (audit F-12). State the condition and its consequence.
      detail:
        health.lastError ?? 'The market feed is not connected. Prices and Discovery cannot update until it reconnects.',
      tone: 'neg',
      live: false,
    };
  }

  if (health.sipEntitlement === 'DENIED') {
    return {
      ...base,
      state: 'OFFLINE',
      label: `Market: ${feed} not entitled`,
      detail: health.lastError ?? 'Account lacks the required market-data subscription',
      tone: 'neg',
      live: false,
    };
  }

  if (connection === 'DISCONNECTED' || connection === 'ERROR') {
    return {
      ...base,
      state: 'OFFLINE',
      label: `Market: ${feed} · ${connection === 'ERROR' ? 'error' : 'disconnected'}`,
      detail: health.lastError ?? 'Reconnecting',
      tone: 'neg',
      live: false,
    };
  }

  if (connection === 'CONNECTING') {
    return {
      ...base,
      state: 'CONNECTING',
      label: `Market: ${feed} · connecting`,
      detail: 'Handshake in progress',
      tone: 'accent',
      live: false,
    };
  }

  // Socket is up. From here the data decides.
  const workerLate =
    heartbeatAgeSeconds !== null && heartbeatAgeSeconds * 1000 > thresholds.heartbeatStaleMs;

  if (freshness === 'NOT_EXPECTED') {
    const closedDetail =
      sessionPhase === 'POST_MARKET'
        ? 'Extended trading ended at 20:00 ET; the after-hours state is frozen and no new SIP prints are expected'
        : sessionPhase === 'NEXT_DAY_PREP'
          ? 'Market closed for the day; no SIP prints expected until 04:00 ET'
          : 'Outside the 04:00–20:00 ET session window; no market data expected';

    return {
      ...base,
      state: 'IDLE',
      label: `Market: ${feed} · closed`,
      detail: closedDetail,
      tone: 'dim',
      live: false,
    };
  }

  if (connection === 'DEGRADED' || workerLate) {
    return {
      ...base,
      state: 'DEGRADED',
      label: `Market: ${feed} · degraded`,
      detail: workerLate
        ? `Worker heartbeat is ${heartbeatAgeSeconds}s old`
        : (health.lastError ?? 'Stream reported a degraded state'),
      tone: 'warn',
      live: false,
    };
  }

  if (freshness === 'STALE') {
    return {
      ...base,
      state: 'STALE',
      label: `Market: ${feed} · DATA STALE`,
      detail:
        `Socket is connected but no whole-market message for ${messageAgeSeconds ?? '—'}s ` +
        `(stale beyond ${thresholds.staleSeconds}s). Connection is not freshness.`,
      tone: 'warn',
      live: false,
    };
  }

  if (freshness === 'DEGRADED') {
    return {
      ...base,
      state: 'DEGRADED',
      label: `Market: ${feed} · DATA DEGRADED`,
      detail:
        `Socket is connected but the newest whole-market message is ${messageAgeSeconds ?? '—'}s ` +
        `old (fresh under ${thresholds.freshSeconds}s).`,
      tone: 'warn',
      live: false,
    };
  }

  return {
    ...base,
    state: 'LIVE',
    label: `Market: ${feed} · LIVE`,
    detail: `Streaming; newest whole-market message ${messageAgeSeconds ?? 0}s old`,
    tone: 'pos',
    live: true,
  };
}
