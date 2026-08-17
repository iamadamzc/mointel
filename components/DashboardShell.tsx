'use client';

import { useCallback, useMemo, useState } from 'react';

import { DashboardHeader } from '@/components/DashboardHeader';
import { DeskEventFeed } from '@/components/DeskEventFeed';
import { DiscoveryBoard } from '@/components/DiscoveryBoard';
import { FilterBar } from '@/components/FilterBar';
import { MarketSummary } from '@/components/MarketSummary';
import { MomentumTable } from '@/components/MomentumTable';
import { PrimaryFocus } from '@/components/PrimaryFocus';
import { TickerDrawer } from '@/components/TickerDrawer';
import { mergeDesk } from '@/lib/dashboard/merge';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  applyFilters,
  isFilterActive,
  selectPrimaryFocus,
  sortTickers,
  type FilterState,
  type SortKey,
  type SortState,
} from '@/lib/dashboard/view';
import type { DashboardState } from '@/lib/data/types';
import type { DiscoveryState, MarketFeedHealth } from '@/lib/market/types';
import { useClock } from '@/lib/hooks/useClock';
import { useDashboard } from '@/lib/hooks/useDashboard';
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
};

const OFFLINE_DISCOVERY: DiscoveryState = {
  tradingDate: '',
  sessionPhase: 'CLOSED',
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

  const sheetSymbols = useMemo(
    () => (data?.tickers ?? []).map((ticker) => ticker.ticker),
    [data],
  );
  const market = useMarket(sheetSymbols);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const { now, mounted } = useClock();

  const tickers = useMemo(() => data?.tickers ?? [], [data]);

  const merged = useMemo(() => mergeDesk(data, market.snapshot), [data, market.snapshot]);

  const filtered = useMemo(() => applyFilters(tickers, filters), [tickers, filters]);
  const sorted = useMemo(() => sortTickers(filtered, sort), [filtered, sort]);
  const primary = useMemo(() => selectPrimaryFocus(filtered), [filtered]);

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
  const discovery = market.snapshot?.discovery ?? OFFLINE_DISCOVERY;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-desk">
      <DashboardHeader
        meta={data.meta}
        marketHealth={health}
        discovery={discovery}
        now={now}
        mounted={mounted}
        refreshing={feed.refreshing}
        transportError={feed.transportError}
        onRefresh={feed.refresh}
      />

      <MarketSummary
        summary={data.summary}
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

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <DiscoveryBoard
          discovery={discovery}
          rows={merged.discovery}
          onSelect={setSelectedTicker}
          selectedTicker={selectedTicker}
          marketOffline={health.offline}
        />

        {market.snapshot && market.snapshot.events.length > 0 ? (
          <DeskEventFeed events={market.snapshot.events} onSelect={setSelectedTicker} />
        ) : null}

        <PrimaryFocus
          tickers={primary}
          changedTickers={feed.changedTickers}
          onSelect={setSelectedTicker}
        />

        <MomentumTable
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
        onClose={() => setSelectedTicker(null)}
      />
    </div>
  );
}
