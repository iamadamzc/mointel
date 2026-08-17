'use client';

import { DataFreshness } from '@/components/DataFreshness';
import type { DataSourceMeta } from '@/lib/data/types';
import { formatEtClock, formatEtDate } from '@/lib/format';

interface DashboardHeaderProps {
  meta: DataSourceMeta;
  now: number;
  mounted: boolean;
  refreshing: boolean;
  transportError: string | null;
  onRefresh: () => void;
}

export function DashboardHeader({
  meta,
  now,
  mounted,
  refreshing,
  transportError,
  onRefresh,
}: DashboardHeaderProps) {
  const clock = mounted ? formatEtClock(new Date(now)) : '--:--:--';
  const date = mounted ? formatEtDate(new Date(now)) : '';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[13px] leading-none font-semibold tracking-[0.14em] text-ink uppercase">
            Momentum Intelligence
          </h1>
          <span className="text-[13px] leading-none font-medium tracking-[0.14em] text-accent uppercase">
            Trading Desk
          </span>
        </div>

        <div className="flex items-baseline gap-2 border-l border-line pl-5">
          <span className="num text-[15px] leading-none font-semibold text-ink">{clock}</span>
          <span className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">ET</span>
          <span className="hidden text-[11px] text-ink-3 md:inline">{date}</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DataFreshness meta={meta} now={now} mounted={mounted} transportError={transportError} />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-sm border border-line-2 bg-panel-2 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase transition-colors hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {meta.error || transportError ? (
        <div className="border-t border-neg/25 bg-neg/8 px-4 py-1 text-[11px] text-neg">
          {transportError ? `Dashboard API unreachable: ${transportError}` : meta.error}
        </div>
      ) : null}
    </header>
  );
}
