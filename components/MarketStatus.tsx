'use client';

import { StatusBadge } from '@/components/StatusBadge';
import { chipText } from '@/lib/dashboard/feedBanner';
import { useFeedBanner } from '@/lib/hooks/useFeedBanner';
import type { MarketHealthView } from '@/lib/market/health';
import { isMarketDataExpected } from '@/lib/market/session';
import type { DiscoveryState, MarketFeedHealth } from '@/lib/market/types';

interface MarketStatusProps {
  health: MarketFeedHealth;
  /** Connection and freshness, already combined server-side. */
  marketHealth: MarketHealthView;
  /** Null until the first market payload arrives — not a fabricated state. */
  discovery: DiscoveryState | null;
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
  /*
   * WHILE THE BOARD IS NOT UPDATING the chip must not keep the last payload's
   * verdict: it would go on reading LIVE, with a pulsing dot, over numbers the
   * page can no longer vouch for. It takes the banner's cause in Marketing's
   * words, names no feed, and reverts on the render the banner clears.
   */
  const banner = useFeedBanner();
  const tone: MarketHealthView['tone'] = banner ? 'warn' : marketHealth.tone;

  /*
   * What this hour SHOULD produce. Inside the session window a feed is expected
   * to be LIVE; outside it, IDLE is the correct and uninteresting answer.
   */
  /*
   * Null when nothing has loaded, and then there IS no nominal state.
   *
   * Suppression means "this light is in the state this hour should produce".
   * With no session known, no hour is known either, so nothing may be
   * suppressed — the label renders, and it says "not loaded" because the health
   * view is its own placeholder. Guessing a nominal here would silence a light
   * on the strength of a phase nobody observed.
   */
  const nominalState = discovery
    ? isMarketDataExpected(discovery.sessionPhase)
      ? 'LIVE'
      : 'IDLE'
    : null;

  return (
    <div className="flex items-center gap-2.5">
      {/*
       * The words appear only when the light is NOT in its normal state — and
       * NORMAL IS RELATIVE TO THE CLOCK.
       *
       * The first version of this suppressed one literal, `state === 'LIVE'`,
       * which made every other state abnormal by definition. So at 02:04 ET the
       * header read "MARKET: ALPACA SIP — CLOSED": the desk announcing, in a
       * permanent row, that the market is shut in the middle of the night. That
       * is the most normal a market can be.
       *
       * It was also a DUPLICATE. The session phase renders immediately to the
       * right of this badge and already says "Closed" — the header stated it
       * twice, and the audit that was supposed to reclaim space added a second
       * copy of a word already on screen.
       *
       * `isMarketDataExpected` is the engine's own definition of whether prints
       * are due, imported rather than restated as a phase list, so this cannot
       * drift from the rule the rest of the desk uses.
       *
       * Everything that CAN vary keeps its words, and now they mean something:
       * CLOSED during premarket is a real failure and speaks, where before it
       * was indistinguishable from closed at 2am. Offline, not entitled,
       * disconnected, connecting, stale, degraded and simulated are abnormal at
       * every hour and are unaffected.
       */}
      <span
        title={banner ? banner.text : marketHealth.label + ' · ' + marketHealth.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          TONE_CLASS[tone]
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]} ${
            marketHealth.live && !banner ? 'live-dot' : ''
          }`}
        />
        {banner ? chipText(banner) : marketHealth.state === nominalState ? null : marketHealth.label}
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
          {discovery
            ? (SESSION_PHASE_LABEL[discovery.sessionPhase] ?? discovery.sessionPhase)
            : /* Not "Closed". The phase is unobserved, and CLOSED is a claim. */
              'Session not loaded'}
        </span>
      </div>

      {discovery && discovery.universeMode !== 'FULL' && health.mode !== 'OFFLINE' ? (
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
      // Sheet switch-off 3e: the header no longer names the Sheet. This state is a degraded universe, and
      // reads as one, in the words the other degraded state already uses.
      return 'Universe: degraded';
    case 'SIMULATED':
      return 'Universe: simulated';
    default:
      return 'Universe: full';
  }
}
