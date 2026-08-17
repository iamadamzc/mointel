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
      <span
        title={marketHealth.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          TONE_CLASS[marketHealth.tone]
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[marketHealth.tone]} ${
            marketHealth.live ? 'live-dot' : ''
          }`}
        />
        {marketHealth.label}
      </span>

      <div className="hidden text-[11px] text-ink-3 lg:block">
        <span className="text-ink-2">{discovery.sessionPhase.replace('_', ' ')}</span>
        {mounted && age !== null ? (
          <span
            className={`num ${
              // The number carries the same verdict as the badge beside it.
              marketHealth.freshness === 'FRESH' || marketHealth.freshness === 'NOT_EXPECTED'
                ? ''
                : 'text-warn'
            }`}
            title={`Newest whole-market message. Fresh under ${marketHealth.thresholds.freshSeconds}s, stale beyond ${marketHealth.thresholds.staleSeconds}s.`}
          >
            {' '}
            msg {age}s
          </span>
        ) : null}
        {health.highResCount > 0 ? <span className="num"> · hi-res {health.highResCount}</span> : null}
        {health.reconnectCount > 0 ? (
          <span className="num text-warn"> · reconnects {health.reconnectCount}</span>
        ) : null}
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
