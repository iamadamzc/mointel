/**
 * The one trader-facing market projection.
 *
 * Every surface that shows a price — Primary, Discovery, the watchlist, the
 * drawer, the Desk Read — reads this and nothing else. Letting each component
 * pick its own source is how the desk ended up showing $5.80 / +16.0% / PM on
 * the Primary card while the drawer showed the live SIP print of $5.70 / +14.1%
 * for the same ticker at the same moment.
 *
 * The rule it encodes:
 *
 *   Live market data owns market telemetry — price, change, volume, session
 *   extremes, RVOL, spread, quote, LULD, halt state.
 *
 *   The sheet owns slow-changing research — catalyst, structure, float, cycle,
 *   warnings, research levels. None of that appears here.
 *
 * Aged live data still wins over a sheet snapshot: the sheet value is older
 * still. It is marked stale rather than quietly swapped, so nothing on screen
 * pretends to be current when it is not.
 */

import type { MomentumTicker } from '@/lib/data/types';
import type { DemandState, HaltState, RvolConfidence } from '@/lib/market/types';

export type TelemetrySource = 'ALPACA' | 'SHEET' | 'NONE';

export interface MarketTelemetry {
  ticker: string;
  price: number | null;
  percentChange: number | null;
  volume: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;

  rvol: number | null;
  rvolRank: number | null;
  rvolRankChange: number | null;
  rvolConfidence: RvolConfidence;

  bid: number | null;
  ask: number | null;
  spread: number | null;
  spreadPct: number | null;

  luldLower: number | null;
  luldUpper: number | null;

  haltState: HaltState;
  haltRaw: string | null;

  source: TelemetrySource;
  /** "SIP" / "BAR" for live data, or the sheet session the value came from. */
  sourceLabel: string;
  /** True when live data exists but the ticker has gone quiet. */
  stale: boolean;
  ageSeconds: number | null;
  observedAt: string | null;
}

export interface TelemetryInput {
  ticker: string;
  demand: DemandState | null;
  /** TODAY-sheet row, used only when no live price exists at all. */
  sheet: MomentumTicker | null;
}

function liveLabel(demand: DemandState): string {
  if (demand.priceSource === 'sip-trade') return 'SIP';
  if (demand.priceSource === 'sip-bar' || demand.priceSource === 'sip-historical-bar') return 'BAR';
  if (demand.priceSource === 'sip-snapshot') return 'SNAP';
  return demand.feed.toUpperCase();
}

export function buildTelemetry(input: TelemetryInput): MarketTelemetry {
  const { demand, sheet } = input;

  // Live data with an actual price is the only thing that can be current.
  if (demand !== null && demand.price !== null) {
    return {
      ticker: input.ticker,
      price: demand.price,
      percentChange: demand.percentChange,
      volume: demand.cumulativeVolume,
      sessionHigh: demand.sessionHigh,
      sessionLow: demand.sessionLow,
      rvol: demand.rvol,
      rvolRank: demand.rvolRank,
      rvolRankChange: demand.rvolRankChange,
      rvolConfidence: demand.rvolConfidence,
      bid: demand.quote.bid,
      ask: demand.quote.ask,
      spread: demand.quote.spread,
      spreadPct: demand.quote.spreadPct,
      luldLower: demand.luld.lower,
      luldUpper: demand.luld.upper,
      haltState: demand.haltState,
      haltRaw: demand.haltRaw,
      source: 'ALPACA',
      sourceLabel: liveLabel(demand),
      stale: demand.freshness.stale,
      ageSeconds: demand.freshness.ageSeconds,
      observedAt: demand.priceAt,
    };
  }

  /*
   * No live price. The sheet carries a price, a change and a volume, and
   * nothing else here — RVOL, spread and halt state are live-only facts, and
   * inventing them from a research row would be worse than showing nothing.
   */
  if (sheet) {
    return {
      ticker: input.ticker,
      price: sheet.price.value,
      percentChange: sheet.changePct.value,
      volume: sheet.volume.value,
      sessionHigh: null,
      sessionLow: null,
      rvol: demand?.rvol ?? null,
      rvolRank: demand?.rvolRank ?? null,
      rvolRankChange: demand?.rvolRankChange ?? null,
      rvolConfidence: demand?.rvolConfidence ?? 'UNKNOWN',
      bid: null,
      ask: null,
      spread: null,
      spreadPct: null,
      luldLower: null,
      luldUpper: null,
      haltState: demand?.haltState ?? 'UNKNOWN',
      haltRaw: demand?.haltRaw ?? null,
      source: 'SHEET',
      sourceLabel: sheet.price.session === 'NONE' ? '—' : sheet.price.session,
      // A sheet value is not "stale" in the live-feed sense; it is simply a
      // research snapshot, and its session label already says which one.
      stale: false,
      ageSeconds: null,
      observedAt: null,
    };
  }

  return {
    ticker: input.ticker,
    price: null,
    percentChange: null,
    volume: null,
    sessionHigh: null,
    sessionLow: null,
    rvol: null,
    rvolRank: null,
    rvolRankChange: null,
    rvolConfidence: 'UNKNOWN',
    bid: null,
    ask: null,
    spread: null,
    spreadPct: null,
    luldLower: null,
    luldUpper: null,
    haltState: 'UNKNOWN',
    haltRaw: null,
    source: 'NONE',
    sourceLabel: '—',
    stale: false,
    ageSeconds: null,
    observedAt: null,
  };
}
