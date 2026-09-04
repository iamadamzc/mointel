'use client';

import { StatusBadge } from '@/components/StatusBadge';
import type { MarketHealthView } from '@/lib/market/health';
import type { DiscoveryState, MarketFeedHealth } from '@/lib/market/types';

interface MarketStatusProps {
  health: MarketFeedHealth;
  /** Connection and freshness, already combined server-side. */
  marketHealth: MarketHealthView;
  discovery: DiscoveryState;
  mounted: boolean;
}

const TONE_CLASS: Record<MarketHealthView['tone'], string> = {
  pos: 'border-pos/35 bg-pos/12 text-pos',
  warn: 'border-warn/35 bg-warn/12 text-warn',
  neg: 'border-neg/35 bg-neg/12 text-neg',
  accent: 'border-accent/35 bg-accent/12 text-accent',
  dim: 'border-line bg-panel-2 text-ink-3',
};

const DOT_CLASS: Record<MarketHealthView['tone'], string> = {
  pos: 'bg-pos',
  warn: 'bg-warn',
  neg: 'bg-neg',
  accent: 'bg-accent',
  dim: 'bg-ink-3',
};

/**
 * Session phases, in trader language.
 *
 * A label map rather than a string transform. The transform was
 * `sessionPhase.replace('_', ' ')`, which replaces the first underscore only,
 * so the header read `NEXT DAY_PREP` in every screenshot ever taken of it.
 */
const SESSION_PHASE_LABEL: Record<DiscoveryState['sessionPhase'], string> = {
  CLOSED: 'Closed',
  PREMARKET: 'Premarket',
  RTH: 'Regular hours',
  AFTER_HOURS: 'After hours',
  POST_MARKET: 'Post-market',
  NEXT_DAY_PREP: 'Next-day prep',
};

function ageDetail(
  age: number | null,
  thresholds: MarketHealthView['thresholds'],
): string | undefined {
  if (age === null) return undefined;
  return `Newest whole-market message ${age}s ago. Fresh under ${thresholds.freshSeconds}s, stale beyond ${thresholds.staleSeconds}s.`;
}

/**
 * Market feed health, deliberately independent from the research indicator.
 *
 * The verdict is not computed here. This renders a projection that already
 * combined socket state with whole-market data freshness, because a component
 * that decides for itself is how the desk ended up showing a green LIVE badge
 * next to a message age of 227 seconds.
 */
export function MarketStatus({ health, marketHealth, discovery, mounted }: MarketStatusProps) {
  const age = marketHealth.messageAgeSeconds;

  return (
    <div className="flex items-center gap-2.5">
      {/*
       * The words appear only when the light is NOT in its normal state.
       *
       * Healthy, this said "Market: Alpaca SIP" every second of every session —
       * a constant dressed as a status line, holding permanent space in the one
       * row that is always on screen. The feed never changes; an observable
       * that cannot vary is not a measurement.
       *
       * Everything that CAN vary keeps its words: worker offline, not entitled,
       * disconnected, connecting, stale, simulated. Those are the states he
       * would act on, and they are exactly the ones the constant was crowding.
       * The feed name moves to the hover, where it is available and costs
       * nothing.
       */}
      <span
        title={marketHealth.label + ' — ' + marketHealth.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          TONE_CLASS[marketHealth.tone]
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[marketHealth.tone]} ${
            marketHealth.live ? 'live-dot' : ''
          }`}
        />
        {marketHealth.state === 'LIVE' ? null : marketHealth.label}
      </span>

      {/*
       * The session, in words a trader uses.
       *
       * What used to sit here — `msg 227s`, `hi-res 6`, `reconnects 3`, and a
       * phase label reading `NEXT DAY_PREP` because only the first underscore
       * was replaced — is engine bookkeeping. It belongs to the diagnostics
       * page, and it was crowding out the one scheduling fact the trader
       * actually uses, which now sits beside it.
       *
       * Data age is not deleted, only demoted: when the feed is not fresh the
       * badge beside this is already carrying that verdict in its own colour,
       * and the exact second count is on hover.
       */}
      <div className="text-[11px] text-ink-2">
        <span title={ageDetail(mounted ? age : null, marketHealth.thresholds)}>
          {SESSION_PHASE_LABEL[discovery.sessionPhase] ?? discovery.sessionPhase}
        </span>
      </div>

      {discovery.universeMode !== 'FULL' && health.mode !== 'OFFLINE' ? (
        <StatusBadge
          label={universeLabel(discovery.universeMode)}
          tone="warn"
          title="The discovery universe is not the full asset list; coverage is reduced."
        />
      ) : null}
    </div>
  );
}

function universeLabel(mode: DiscoveryState['universeMode']): string {
  switch (mode) {
    case 'DEGRADED_ASSETS':
      return 'Universe: degraded';
    case 'DEGRADED_NO_WILDCARD':
      return 'Universe: no wildcard';
    case 'SHEET_ONLY':
      return 'Universe: sheet only';
    case 'SIMULATED':
      return 'Universe: simulated';
    default:
      return 'Universe: full';
  }
}
