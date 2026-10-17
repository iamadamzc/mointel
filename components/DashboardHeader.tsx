'use client';

import { BrandMark } from '@/components/BrandMark';
import { feedFailureLine, type FeedFailure } from '@/lib/dashboard/feedFailure';
import { DataFreshness } from '@/components/DataFreshness';
import { DeskAssessmentStatus } from '@/components/DeskAssessmentStatus';
import { MarketStatus } from '@/components/MarketStatus';
import { ResearchEngineStatus } from '@/components/ResearchEngineStatus';
import { TrialChip } from '@/components/BillingScreens';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  /** Null until the first market payload arrives. */
  discovery: DiscoveryState | null;
  now: number;
  mounted: boolean;
  refreshing: boolean;
  failure: FeedFailure | null;
  onRefresh: () => void;
  /** The free trial's end (desk billing); null outside a trial. */
  trialChip?: string | null;
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
  failure,
  onRefresh,
  trialChip = null,
}: DashboardHeaderProps) {
  const clock = mounted ? formatEtClock(new Date(now)) : '--:--:--';
  const date = mounted ? formatEtDate(new Date(now)) : '';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
      {/*
       * One row, tighter. The header, the summary and the filter bar together
       * used 199px of a 551px viewport — 36% of the desk permanently occupied
       * by chrome, leaving 352px for the board itself.
       */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5">
        {/*
          * THE COMPACT LOCKUP, his choice 2026-09-29 ("the compact lockup"):
          * the site header's composition (`app/page.tsx`) -- the mark, a
          * diminutive "The", the name, "Trading Desk" in the accent -- at this
          * header's own 13px, so the row keeps its height. The brand was made
          * 2026-09-18 for the site and sign-in and never reached the desk.
          * The mark's geometry has one source, `BrandMark`.
          */}
        <div className="flex items-center gap-2">
          <BrandMark size={18} className="text-accent" />
          <h1 className="flex items-baseline gap-2 text-[13px] leading-none uppercase">
            <span className="text-[9px] font-semibold tracking-[0.34em] text-ink-3">The</span>
            <span className="font-semibold tracking-[0.14em] text-ink">Momentum Intelligence</span>
            <span className="font-medium tracking-[0.14em] text-accent">Trading Desk</span>
          </h1>
        </div>

        <div className="flex items-baseline gap-2 border-l border-line pl-4">
          <span className="num text-[15px] leading-none font-semibold text-ink">{clock}</span>
          <span className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">ET</span>
          <span className="hidden text-[11px] text-ink-3 md:inline">{date}</span>
        </div>

        {/* What the desk is looking at, in words. The board's own numbers
            cannot say that the session changed underneath them. */}
        <DeskAssessmentStatus panel={assessments} mounted={mounted} />

        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
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
          <TrialChip text={trialChip} />
          <ResearchEngineStatus health={researchHealth} mounted={mounted} />
          <DataFreshness meta={meta} now={now} mounted={mounted} failure={failure} />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="min-h-[24px] rounded-sm border border-line-2 bg-panel-2 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase transition-colors hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? 'Syncing…' : 'Refresh'}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {meta.error || failure ? (
        <div className="border-t border-neg/25 bg-neg/8 px-4 py-1 text-[11px] text-neg">
          {failure ? feedFailureLine(failure, 'Research').text : meta.error}
        </div>
      ) : null}

      {marketHealth.mode === 'SIMULATOR' ? (
        <div className="border-t border-warn/30 bg-warn/12 px-4 py-1 text-[11px] font-semibold tracking-wide text-warn uppercase">
          Simulator mode: market values on this screen are synthetic and must not be traded
        </div>
      ) : null}

      {marketHealth.mode === 'TEST' ? (
        <div className="border-t border-warn/30 bg-warn/12 px-4 py-1 text-[11px] font-semibold tracking-wide text-warn uppercase">
          Alpaca test stream (FAKEPACA): diagnostics only, not market data
        </div>
      ) : null}
    </header>
  );
}
