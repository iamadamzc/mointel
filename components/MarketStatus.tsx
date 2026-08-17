'use client';

import { StatusBadge, type Tone } from '@/components/StatusBadge';
import type { DiscoveryState, MarketFeedHealth } from '@/lib/market/types';
import { secondsSince } from '@/lib/format';

interface MarketStatusProps {
  health: MarketFeedHealth;
  discovery: DiscoveryState;
  now: number;
  mounted: boolean;
}

interface Presentation {
  label: string;
  tone: Tone;
  detail: string;
}

/**
 * Market feed health, deliberately independent from the research indicator.
 * One generic "LIVE" light that masks which source is stale would be worse than
 * no light at all.
 */
function present(health: MarketFeedHealth): Presentation {
  if (health.offline || health.mode === 'OFFLINE') {
    return {
      label: 'Market: worker offline',
      tone: 'dim',
      detail: health.lastError ?? 'Start it with npm run market:alpaca',
    };
  }

  if (health.mode === 'SIMULATOR') {
    return { label: 'Market: SIMULATOR', tone: 'warn', detail: 'Simulated data — not a market feed' };
  }

  if (health.mode === 'TEST') {
    return { label: 'Market: TEST STREAM', tone: 'warn', detail: 'Alpaca FAKEPACA diagnostics feed' };
  }

  const feed = health.feed.toUpperCase();

  if (health.sipEntitlement === 'DENIED') {
    return {
      label: `Market: ${feed} not entitled`,
      tone: 'neg',
      detail: health.lastError ?? 'Account lacks the required market-data subscription',
    };
  }

  switch (health.connectionState) {
    case 'STREAMING':
      return {
        label: `Market: Alpaca ${feed} — ${health.stale ? 'STALE' : 'LIVE'}`,
        tone: health.stale ? 'warn' : 'pos',
        detail: health.stale ? 'Worker heartbeat is late' : 'Streaming',
      };
    case 'AUTHENTICATED':
      return { label: `Market: Alpaca ${feed} — authenticated`, tone: 'accent', detail: 'Subscribing' };
    case 'CONNECTED':
    case 'CONNECTING':
      return { label: `Market: Alpaca ${feed} — connecting`, tone: 'accent', detail: 'Handshake in progress' };
    case 'DEGRADED':
      return { label: `Market: Alpaca ${feed} — degraded`, tone: 'warn', detail: health.lastError ?? '' };
    case 'ERROR':
      return { label: `Market: Alpaca ${feed} — error`, tone: 'neg', detail: health.lastError ?? '' };
    default:
      return {
        label: `Market: Alpaca ${feed} — disconnected`,
        tone: 'neg',
        detail: health.lastError ?? 'Reconnecting',
      };
  }
}

export function MarketStatus({ health, discovery, now, mounted }: MarketStatusProps) {
  const presentation = present(health);
  const messageAge = mounted ? secondsSince(health.lastMessageAt, now) : null;
  const live = presentation.tone === 'pos';

  return (
    <div className="flex items-center gap-2.5">
      <span
        title={presentation.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          presentation.tone === 'pos'
            ? 'border-pos/35 bg-pos/12 text-pos'
            : presentation.tone === 'warn'
              ? 'border-warn/35 bg-warn/12 text-warn'
              : presentation.tone === 'neg'
                ? 'border-neg/35 bg-neg/12 text-neg'
                : presentation.tone === 'accent'
                  ? 'border-accent/35 bg-accent/12 text-accent'
                  : 'border-line bg-panel-2 text-ink-3'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            presentation.tone === 'pos'
              ? 'bg-pos'
              : presentation.tone === 'warn'
                ? 'bg-warn'
                : presentation.tone === 'neg'
                  ? 'bg-neg'
                  : 'bg-ink-3'
          } ${live && !health.stale ? 'live-dot' : ''}`}
        />
        {presentation.label}
      </span>

      <div className="hidden text-[11px] text-ink-3 lg:block">
        <span className="text-ink-2">{discovery.sessionPhase.replace('_', ' ')}</span>
        {messageAge !== null ? <span className="num"> · msg {messageAge}s</span> : null}
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
