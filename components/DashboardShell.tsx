'use client';

import { useCallback, useMemo, useState } from 'react';

import { DashboardHeader } from '@/components/DashboardHeader';
import { FilterBar } from '@/components/FilterBar';
import { MarketSummary } from '@/components/MarketSummary';
import { MomentumTable } from '@/components/MomentumTable';
import { PrimaryFocus } from '@/components/PrimaryFocus';
import { TickerDrawer } from '@/components/TickerDrawer';
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
import { useClock } from '@/lib/hooks/useClock';
import { useDashboard } from '@/lib/hooks/useDashboard';

/** Numeric columns are most useful largest-first on the first click. */
const DEFAULT_DIRECTIONS: Record<SortKey, 'asc' | 'desc'> = {
  priority: 'asc',
  ticker: 'asc',
  price: 'desc',
  changePct: 'desc',
  volume: 'desc',
  float: 'desc',
};

export function DashboardShell({ initialState }: { initialState: DashboardState | null }) {
  const feed = useDashboard();
  const data = feed.data ?? initialState;

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const { now, mounted } = useClock();

  const tickers = useMemo(() => data?.tickers ?? [], [data]);

  const filtered = useMemo(() => applyFilters(tickers, filters), [tickers, filters]);
  const sorted = useMemo(() => sortTickers(filtered, sort), [filtered, sort]);
  const primary = useMemo(() => selectPrimaryFocus(filtered), [filtered]);

  const selected = useMemo(
    () => tickers.find((ticker) => ticker.ticker === selectedTicker) ?? null,
    [tickers, selectedTicker],
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-desk">
      <DashboardHeader
        meta={data.meta}
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
        ticker={selected}
        research={selected ? data.research[selected.ticker] : undefined}
        onClose={() => setSelectedTicker(null)}
      />
    </div>
  );
}
