'use client';

import { useCallback, useMemo, useState } from 'react';

import { AssessmentSelector, AssessmentSnapshotBoard } from '@/components/AssessmentHistory';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DeskEventFeed } from '@/components/DeskEventFeed';
import { DiscoveryBoard } from '@/components/DiscoveryBoard';
import { FilterBar } from '@/components/FilterBar';
import { MarketSummary } from '@/components/MarketSummary';
import { MomentumTable } from '@/components/MomentumTable';
import { FocusStrip } from '@/components/FocusStrip';
import { TickerDrawer } from '@/components/TickerDrawer';
import { dedupeSheetRows, mergeDesk } from '@/lib/dashboard/merge';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  applyFilters,
  isFilterActive,
  selectFocusRows,
  sortTickers,
  type FilterState,
  type SortKey,
  type SortState,
} from '@/lib/dashboard/view';
import { buildSummary } from '@/lib/data/rows';
import type { DashboardState } from '@/lib/data/types';
import type { MarketHealthView } from '@/lib/market/health';
import { emptyAssessmentPanel, type AssessmentPanel } from '@/lib/desk/view';
import type { ResearchHealthView } from '@/lib/research/health';
import type { DiscoveryState, MarketFeedHealth } from '@/lib/market/types';
import { useClock } from '@/lib/hooks/useClock';
import { useDashboard } from '@/lib/hooks/useDashboard';
import { useFocus } from '@/lib/hooks/useFocus';
import { useMarket } from '@/lib/hooks/useMarket';

/** Numeric columns are most useful largest-first on the first click. */
const DEFAULT_DIRECTIONS: Record<SortKey, 'asc' | 'desc'> = {
  priority: 'asc',
  ticker: 'asc',
  price: 'desc',
  changePct: 'desc',
  volume: 'desc',
  float: 'desc',
};

const OFFLINE_HEALTH: MarketFeedHealth = {
  mode: 'OFFLINE',
  feed: 'sip',
  connectionState: 'DISCONNECTED',
  sipEntitlement: 'UNKNOWN',
  lastMessageAt: null,
  lastBarAt: null,
  lastTradeAt: null,
  lastQuoteAt: null,
  lastStatusAt: null,
  reconnectCount: 0,
  lastError: null,
  lastErrorAt: null,
  subscriptions: { bars: 'none', updatedBars: 'none', statuses: 'none', trades: 0, quotes: 0, lulds: 0 },
  highResCount: 0,
  universeMode: 'SHEET_ONLY',
  workerStartedAt: null,
  heartbeatAt: null,
  stale: true,
  offline: true,
  backfill: null,
      rejectedSymbols: [],
      rthCloseCapture: null,
};

/** Shown before the first market payload arrives; never claims LIVE. */
const OFFLINE_HEALTH_VIEW: MarketHealthView = {
  state: 'OFFLINE',
  connection: 'OFFLINE',
  freshness: 'UNKNOWN',
  label: 'Market: worker offline',
  detail: 'No market payload has been received yet',
  tone: 'neg',
  messageAgeSeconds: null,
  heartbeatAgeSeconds: null,
  live: false,
  thresholds: { freshSeconds: 90, staleSeconds: 240 },
};

/** Until the first payload lands, the engine is unknown — reported as offline. */
const OFFLINE_RESEARCH: ResearchHealthView = {
  state: 'OFFLINE',
  label: 'Research: engine offline',
  detail: 'No market payload has been received yet',
  tone: 'neg',
  queuedJobs: 0,
  activeJobs: [],
  activeCount: 0,
  lastCompletedTicker: null,
  lastCompletedAt: null,
  heartbeatAgeSeconds: null,
  running: false,
};

/** Until the first payload lands, the scheduler is unknown — reported as offline. */
const OFFLINE_ASSESSMENTS: AssessmentPanel = emptyAssessmentPanel(
  'No market payload has been received yet',
);

const OFFLINE_DISCOVERY: DiscoveryState = {
  tradingDate: '',
  sessionPhase: 'CLOSED',
  board: 'DAILY_RVOL',
  rankingLabel: 'Daily RVOL',
  afterHoursStart: null,
  rthClose: '16:00',
  earlyClose: false,
  universeMode: 'SHEET_ONLY',
  eligibleCount: 0,
  rankedCount: 0,
  baselineCount: 0,
  trackedCount: 0,
  discoveryRank: 12,
  internalRank: 50,
  priceMin: 1,
  priceMax: 20,
  ranked: [],
  calculatedAt: null,
};

export function DashboardShell({ initialState }: { initialState: DashboardState | null }) {
  const feed = useDashboard();
  const data = feed.data ?? initialState;

  const focus = useFocus();

  /*
   * Focused tickers are requested alongside the sheet names.
   *
   * Without this a pinned name that falls out of the tracked population would
   * lose its live telemetry, and a Focus card is supposed to survive exactly
   * that — a name sliding from #3 to #80 is when a trader most wants it in
   * front of them.
   */
  const sheetSymbols = useMemo(
    () => [
      ...new Set([...(data?.tickers ?? []).map((ticker) => ticker.ticker), ...focus.tickers]),
    ],
    [data, focus.tickers],
  );
  const market = useMarket(sheetSymbols);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  /**
   * Which assessment the Discovery area is showing. Null is LIVE, and LIVE is
   * the default — the history is for review, not for trading from.
   */
  const [selectedAssessment, setSelectedAssessment] = useState<number | null>(null);
  const { now, mounted } = useClock();

  /*
   * Collapsed to one row per ticker before anything filters or sorts it.
   *
   * The TODAY sheet legitimately carries a name twice — a researched row and a
   * later placeholder — and `mergeDesk` already collapses that internally. The
   * shell was still handing the raw list to the filters, so the watchlist
   * rendered the same ticker twice under the same React key, and a duplicated
   * A-priority name would have produced two identical Primary cards.
   */
  const tickers = useMemo(() => dedupeSheetRows(data?.tickers ?? []), [data]);

  /*
   * Recounted over the collapsed list.
   *
   * The provider counts sheet ROWS, so the strip read "27 names tracked" above
   * a watchlist of 16 names. A metric labelled Names Tracked has to count
   * names, and every classification count under it has to agree.
   */
  const summary = useMemo(() => buildSummary(tickers), [tickers]);

  const merged = useMemo(() => mergeDesk(data, market.snapshot), [data, market.snapshot]);

  /*
   * One telemetry lookup, shared by every list on the page.
   *
   * The watchlist shows live price and change, so it must also SORT on them —
   * ordering a table by numbers it is not displaying is its own small lie.
   */
  const telemetry = useCallback(
    (ticker: string) => merged.rows.get(ticker)?.telemetry ?? null,
    [merged],
  );

  const filtered = useMemo(() => applyFilters(tickers, filters), [tickers, filters]);
  const sorted = useMemo(
    () => sortTickers(filtered, sort, telemetry),
    [filtered, sort, telemetry],
  );
  // The user's list, resolved to rows. Never recomputed from priority.
  const focusRows = useMemo(
    () => selectFocusRows(focus.tickers, merged.rows),
    [focus.tickers, merged],
  );

  /**
   * Who the event feed considers relevant.
   *
   * Primary names, whatever is currently inside the discovery rank threshold,
   * and everything the desk otherwise tracks. Events outside all three are kept
   * and reachable, just not allowed to dominate the default feed.
   */
  const eventUniverse = useMemo(() => {
    const rank = market.snapshot?.discovery.discoveryRank ?? 12;
    return {
      // Focused names are, by definition, the ones this trader is watching.
      primary: new Set(focus.tickers),
      topRanked: new Set(merged.discovery.slice(0, rank).map((row) => row.ticker)),
      tracked: new Set(merged.rows.keys()),
    };
  }, [focus.tickers, merged, market.snapshot]);

  const selectedRow = useMemo(
    () => (selectedTicker ? (merged.rows.get(selectedTicker) ?? null) : null),
    [merged, selectedTicker],
  );

  const handleSortChange = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DEFAULT_DIRECTIONS[key] },
    );
  }, []);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-desk">
        <p className="text-[12px] tracking-[0.14em] text-ink-3 uppercase">
          {feed.transportError ? `Dashboard unavailable: ${feed.transportError}` : 'Loading desk…'}
        </p>
      </div>
    );
  }

  const health = market.snapshot?.health ?? OFFLINE_HEALTH;
  const healthView = market.snapshot?.marketHealth ?? OFFLINE_HEALTH_VIEW;
  const researchHealth = market.snapshot?.researchHealth ?? OFFLINE_RESEARCH;
  const discovery = market.snapshot?.discovery ?? OFFLINE_DISCOVERY;
  const assessments = market.snapshot?.assessments ?? OFFLINE_ASSESSMENTS;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-desk">
      <DashboardHeader
        meta={data.meta}
        marketHealth={health}
        healthView={healthView}
        researchHealth={researchHealth}
        assessments={assessments}
        discovery={discovery}
        now={now}
        mounted={mounted}
        refreshing={feed.refreshing}
        transportError={feed.transportError}
        onRefresh={feed.refresh}
      />

      <MarketSummary
        summary={summary}
        visibleCount={filtered.length}
        filtered={isFilterActive(filters)}
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        resultCount={filtered.length}
        totalCount={tickers.length}
        isActive={isFilterActive(filters)}
      />

      {/*
        * Hierarchy: the compact Primary strip, then Discovery as the dominant
        * surface, then a contextual event rail, then the analyzed watchlist as
        * clearly secondary material. Discovery used to sit above a tall Primary
        * card that spent most of a screen on one name.
        */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <FocusStrip
          rows={focusRows}
          changedTickers={feed.changedTickers}
          onSelect={setSelectedTicker}
          onToggleFocus={focus.toggle}
          limit={focus.limit}
          message={focus.message}
          onDismissMessage={focus.dismissMessage}
        />

        {/* The checkpoint selector sits with Discovery because that is what it
            replaces: choosing a past assessment swaps the live board for the
            frozen one, rather than showing both and inviting a comparison
            between numbers captured hours apart. */}
        <div className="flex items-center justify-end border-b border-line bg-desk px-4 pt-2">
          <AssessmentSelector
            panel={assessments}
            selectedId={selectedAssessment}
            onSelect={setSelectedAssessment}
          />
        </div>

        {selectedAssessment === null ? (
          <DiscoveryBoard
            discovery={discovery}
            rows={merged.discovery}
            onSelect={setSelectedTicker}
            selectedTicker={selectedTicker}
            marketOffline={health.offline}
            isFocused={focus.isFocused}
            onToggleFocus={focus.toggle}
          />
        ) : (
          <AssessmentSnapshotBoard key={selectedAssessment} id={selectedAssessment} />
        )}

        {market.snapshot && market.snapshot.events.length > 0 ? (
          <DeskEventFeed
            events={market.snapshot.events}
            universe={eventUniverse}
            onSelect={setSelectedTicker}
          />
        ) : null}

        <MomentumTable
          isFocused={focus.isFocused}
          onToggleFocus={focus.toggle}
          tickers={sorted}
          sort={sort}
          onSortChange={handleSortChange}
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
          changedTickers={feed.changedTickers}
          deskRows={merged.rows}
        />

        {data.meta.warnings.length > 0 ? (
          <footer className="border-t border-line bg-panel px-4 py-2">
            <details className="text-[11px] text-ink-3">
              <summary className="cursor-pointer text-[10px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
                Normalization notices ({data.meta.warnings.length})
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {data.meta.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          </footer>
        ) : null}
      </main>

      <TickerDrawer
        row={selectedRow}
        research={selectedTicker ? data.research[selectedTicker] : undefined}
        focused={selectedTicker ? focus.isFocused(selectedTicker) : false}
        onToggleFocus={focus.toggle}
        onClose={() => setSelectedTicker(null)}
      />
    </div>
  );
}
