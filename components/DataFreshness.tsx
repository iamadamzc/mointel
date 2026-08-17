'use client';

import { StatusBadge } from '@/components/StatusBadge';
import type { DataSourceMeta } from '@/lib/data/types';
import { formatEtTimestamp, secondsSince } from '@/lib/format';

interface DataFreshnessProps {
  meta: DataSourceMeta;
  /** Millisecond clock supplied by the parent so every element ticks together. */
  now: number;
  /** False during server render, when no wall clock is available. */
  mounted: boolean;
  transportError: string | null;
}

export function DataFreshness({ meta, now, mounted, transportError }: DataFreshnessProps) {
  const isMock = meta.provider === 'mock';
  const syncedAt = formatEtTimestamp(meta.fetchedAt) ?? '—';
  const age = mounted ? secondsSince(meta.fetchedAt, now) : null;
  const degraded = meta.stale || Boolean(transportError);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isMock ? (
          <StatusBadge label="Mock Data" tone="warn" title="No Google credentials configured — showing built-in mock dataset" />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-pos/35 bg-pos/12 px-1.5 py-px text-[10px] font-semibold tracking-wide text-pos uppercase">
            <span className={`h-1.5 w-1.5 rounded-full bg-pos ${degraded ? '' : 'live-dot'}`} />
            Live / Sheet Data
          </span>
        )}
        {degraded ? (
          <StatusBadge
            label="Stale Data"
            tone="neg"
            title={transportError ?? meta.error ?? 'Upstream read failed; showing last good data'}
          />
        ) : null}
      </div>

      <div className="hidden text-[11px] text-ink-3 sm:block">
        <span className="text-ink-2">Last sync</span>{' '}
        <span className="num text-ink">{syncedAt}</span>
        {age !== null ? <span className="num text-ink-3"> · {age}s ago</span> : null}
      </div>
    </div>
  );
}
