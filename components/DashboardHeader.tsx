'use client';

import { DataFreshness } from '@/components/DataFreshness';
import { DeskAssessmentStatus } from '@/components/DeskAssessmentStatus';
import { MarketStatus } from '@/components/MarketStatus';
import { ResearchEngineStatus } from '@/components/ResearchEngineStatus';
import type { AssessmentPanel } from '@/lib/desk/view';
import type { DataSourceMeta } from '@/lib/data/types';
import type { MarketHealthView } from '@/lib/market/health';
import type { ResearchHealthView } from '@/lib/research/health';
import type { DiscoveryState, MarketFeedHealth } from '@/lib/market/types';
import { formatEtClock, formatEtDate } from '@/lib/format';

interface DashboardHeaderProps {
  meta: DataSourceMeta;
  marketHealth: MarketFeedHealth;
  /** Combined connection + freshness verdict from the market snapshot. */
  healthView: MarketHealthView;
  /** Automatic-research engine health. Independent of Sheet freshness. */
  researchHealth: ResearchHealthView;
  /** Session headline plus the last and next scheduled checkpoints. */
  assessments: AssessmentPanel;
  discovery: DiscoveryState;
  now: number;
  mounted: boolean;
  refreshing: boolean;
  transportError: string | null;
  onRefresh: () => void;
}

export function DashboardHeader({
  meta,
  marketHealth,
  healthView,
  researchHealth,
  assessments,
  discovery,
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

        {/* What the desk is looking at, in words. The board's own numbers
            cannot say that the session changed underneath them. */}
        <DeskAssessmentStatus panel={assessments} mounted={mounted} />

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Four independent lights: the market feed, the automatic research
              engine, the assessment scheduler, and the Google Sheet. One
              generic status would hide which of them is actually down — a
              current Sheet was reading as reassurance while the research
              engine was stopped, and neither of them says whether the
              scheduled checkpoints are still being taken. */}
          <MarketStatus
            health={marketHealth}
            marketHealth={healthView}
            discovery={discovery}
            mounted={mounted}
          />
          <ResearchEngineStatus health={researchHealth} mounted={mounted} />
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
          {transportError ? `Research API unreachable: ${transportError}` : meta.error}
        </div>
      ) : null}

      {marketHealth.mode === 'SIMULATOR' ? (
        <div className="border-t border-warn/30 bg-warn/12 px-4 py-1 text-[11px] font-semibold tracking-wide text-warn uppercase">
          Simulator mode — market values on this screen are synthetic and must not be traded
        </div>
      ) : null}

      {marketHealth.mode === 'TEST' ? (
        <div className="border-t border-warn/30 bg-warn/12 px-4 py-1 text-[11px] font-semibold tracking-wide text-warn uppercase">
          Alpaca test stream (FAKEPACA) — diagnostics only, not market data
        </div>
      ) : null}
    </header>
  );
}
