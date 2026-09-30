'use client';

import { feedFailureLine, type FeedFailure } from '@/lib/dashboard/feedFailure';
import { StatusBadge } from '@/components/StatusBadge';
import type { DataSourceMeta } from '@/lib/data/types';
import { formatEtTimestamp, secondsSince } from '@/lib/format';

interface DataFreshnessProps {
  meta: DataSourceMeta;
  /** Millisecond clock supplied by the parent so every element ticks together. */
  now: number;
  /** False during server render, when no wall clock is available. */
  mounted: boolean;
  failure: FeedFailure | null;
}

export function DataFreshness({ meta, now, mounted, failure }: DataFreshnessProps) {
  const isMock = meta.provider === 'mock';
  const syncedAt = formatEtTimestamp(meta.fetchedAt) ?? '—';
  const age = mounted ? secondsSince(meta.fetchedAt, now) : null;
  const line = failure ? feedFailureLine(failure, 'Research') : null;
  const degraded = meta.stale || Boolean(failure);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isMock ? (
          <StatusBadge
            label="Research: Mock Data"
            tone="warn"
            title="No Google credentials configured. Showing the built-in mock dataset."
          />
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
              degraded ? 'border-neg/35 bg-neg/12 text-neg' : 'border-pos/35 bg-pos/12 text-pos'
            }`}
            title={
              degraded
                ? (line?.text ?? meta.error ?? 'Sheet read failed; showing last good data')
                : 'Google Sheet research is current'
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${degraded ? 'bg-neg' : 'bg-pos'} ${degraded ? '' : 'live-dot'}`}
            />
            {/*
             * Words only when degraded — the same rule as the market light, and
             * this component is the reason the trader still saw a constant.
             *
             * The header audit changed MarketStatus and ResearchEngineStatus
             * and never enumerated what else was in the header. "Research:
             * Google Sheet — Current" is a third indicator that survived it,
             * and it is a pure constant in the healthy case: the provider does
             * not change, and "current" is the state it holds all day.
             *
             * Stale keeps its words, and its colour and hover are unchanged in
             * both states.
             */}
            {degraded ? 'Research: Google Sheet · Stale' : null}
          </span>
        )}
      </div>

      <div className="hidden text-[11px] text-ink-3 xl:block">
        <span className="text-ink-2">Sheet sync</span>{' '}
        <span className="num text-ink">{syncedAt}</span>
        {age !== null ? <span className="num text-ink-3"> · {age}s</span> : null}
      </div>
    </div>
  );
}
