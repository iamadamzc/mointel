'use client';

import {
  PriorityBadge,
  StatusBadge,
  StructureBadge,
  changeTone,
  cycleTone,
  sessionTone,
} from '@/components/StatusBadge';
import type { DeskRow } from '@/lib/dashboard/merge';
import type { SortKey, SortState } from '@/lib/dashboard/view';
import type { MomentumTicker } from '@/lib/data/types';
import { formatMultiple, formatPrice, formatSignedPercent, truncate } from '@/lib/format';

interface MomentumTableProps {
  tickers: MomentumTicker[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  changedTickers: Set<string>;
  /** Merged demand state, keyed by ticker. Empty when no market worker is running. */
  deskRows: Map<string, DeskRow>;
}

interface ColumnDefinition {
  key: string;
  label: string;
  sortKey?: SortKey;
  className: string;
  align?: 'right';
}

const COLUMNS: ColumnDefinition[] = [
  { key: 'priority', label: 'Pri', sortKey: 'priority', className: 'w-[64px]' },
  { key: 'ticker', label: 'Ticker', sortKey: 'ticker', className: 'w-[92px]' },
  { key: 'price', label: 'Price', sortKey: 'price', className: 'w-[84px]', align: 'right' },
  { key: 'changePct', label: '%', sortKey: 'changePct', className: 'w-[76px]', align: 'right' },
  { key: 'session', label: 'Sess', className: 'w-[54px]' },
  { key: 'live', label: 'Live', className: 'w-[80px]', align: 'right' },
  { key: 'livePct', label: 'Live %', className: 'w-[74px]', align: 'right' },
  { key: 'rvol', label: 'RVOL', className: 'w-[92px]', align: 'right' },
  { key: 'cycle', label: 'Cycle', className: 'w-[186px]' },
  { key: 'volume', label: 'Volume', sortKey: 'volume', className: 'w-[96px]', align: 'right' },
  { key: 'float', label: 'Float', sortKey: 'float', className: 'w-[108px]', align: 'right' },
  { key: 'catalyst', label: 'Catalyst', className: 'w-[150px]' },
  { key: 'structure', label: 'Structure', className: 'w-[150px]' },
  { key: 'levels', label: 'Key Levels', className: 'min-w-[190px]' },
  { key: 'warning', label: 'Warning', className: 'min-w-[230px]' },
  { key: 'confirmation', label: 'Confirmation', className: 'min-w-[170px]' },
  { key: 'updated', label: 'Updated', className: 'w-[150px]' },
];

export function MomentumTable({
  tickers,
  sort,
  onSortChange,
  onSelect,
  selectedTicker,
  changedTickers,
  deskRows,
}: MomentumTableProps) {
  return (
    <section className="flex flex-col">
      <div className="flex items-baseline gap-2 px-4 py-2">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          Watchlist
        </h2>
        <span className="num text-[11px] text-ink-3">{tickers.length}</span>
      </div>

      {/* Horizontal scroll only: the page owns vertical scrolling now that the
          discovery board and event feed share it. */}
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-panel-2">
              {COLUMNS.map((column) => {
                const isSorted = column.sortKey && sort.key === column.sortKey;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={`border-b border-line-2 px-2 py-1.5 text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${isSorted ? 'text-accent' : 'text-ink-3'} ${column.className}`}
                  >
                    {column.sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.sortKey as SortKey)}
                        className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      >
                        {column.label}
                        <span className="num text-[9px]">
                          {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {tickers.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-[12px] text-ink-3">
                  No names match the current filters.
                </td>
              </tr>
            ) : (
              tickers.map((ticker) => (
                <TableRow
                  key={ticker.ticker}
                  ticker={ticker}
                  deskRow={deskRows.get(ticker.ticker) ?? null}
                  selected={selectedTicker === ticker.ticker}
                  changed={changedTickers.has(ticker.ticker)}
                  onSelect={onSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableRow({
  ticker,
  deskRow,
  selected,
  changed,
  onSelect,
}: {
  ticker: MomentumTicker;
  deskRow: DeskRow | null;
  selected: boolean;
  changed: boolean;
  onSelect: (ticker: string) => void;
}) {
  const structureText = ticker.structure.raw || ticker.structure.floatRaw;
  const demand = deskRow?.demand ?? null;

  return (
    <tr
      onClick={() => onSelect(ticker.ticker)}
      className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-panel-2 ${
        selected ? 'bg-accent/10' : 'bg-panel/40'
      } ${changed ? 'row-changed' : ''}`}
    >
      <td className="px-2 py-1.5 align-middle">
        <PriorityBadge
          bucket={ticker.priority.bucket}
          raw={ticker.priority.raw}
          isRevised={ticker.priority.isRevised}
        />
      </td>

      <td className="px-2 py-1.5 align-middle">
        <span className="text-[14px] font-bold tracking-tight text-ink">{ticker.ticker}</span>
      </td>

      <td className="num px-2 py-1.5 text-right align-middle font-semibold text-ink">
        {ticker.price.display}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle font-semibold ${changeTone(ticker.changePct.value)}`}
      >
        {ticker.changePct.display}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <StatusBadge
          label={ticker.price.session === 'NONE' ? '—' : ticker.price.session}
          tone={sessionTone(ticker.price.session)}
          title={`Displayed values come from the ${ticker.price.session} session`}
        />
      </td>

      <td
        className="num px-2 py-1.5 text-right align-middle font-semibold text-ink"
        title={
          demand
            ? `Alpaca ${demand.priceSource ?? 'feed'} at ${demand.priceAt ?? 'unknown time'}`
            : 'No live market data for this ticker'
        }
      >
        {demand ? formatPrice(demand.price) : <span className="text-ink-3">—</span>}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle font-semibold ${changeTone(
          demand?.percentChange ?? null,
        )}`}
      >
        {demand ? formatSignedPercent(demand.percentChange) : <span className="text-ink-3">—</span>}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2">
        {demand?.rvol !== null && demand?.rvol !== undefined ? (
          <span className={demand.rvolConfidence === 'LOW' ? 'text-warn' : 'text-ink'}>
            {formatMultiple(demand.rvol)}
            {demand.rvolRank !== null ? (
              <span className="ml-1 text-[10px] text-accent">#{demand.rvolRank}</span>
            ) : null}
          </span>
        ) : (
          '—'
        )}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <StatusBadge
          label={ticker.cycle.display}
          tone={cycleTone(ticker.cycle.state)}
          title={ticker.cycle.raw}
          className="max-w-[178px]"
        />
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2" title={ticker.volume.raw}>
        {ticker.volume.display}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2" title={ticker.float.raw}>
        {ticker.float.display}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <span
          className={`text-[11px] font-semibold ${
            ticker.catalyst.gradeBucket === 'A'
              ? 'text-pos'
              : ticker.catalyst.gradeBucket === 'C'
                ? 'text-warn'
                : 'text-ink-2'
          }`}
          title={ticker.catalyst.latest || ticker.catalyst.gradeRaw}
        >
          {ticker.catalyst.gradeRaw || '—'}
        </span>
      </td>

      <td className="px-2 py-1.5 align-middle">
        <StructureBadge state={ticker.structure.state} raw={structureText} />
      </td>

      <td className="num px-2 py-1.5 align-middle text-[11px] text-ink-2" title={ticker.keyLevels}>
        {ticker.keyLevels ? truncate(ticker.keyLevels, 44) : '—'}
      </td>

      <td className="px-2 py-1.5 align-middle text-[11px] text-warn/90" title={ticker.warning.current}>
        {ticker.warning.current ? truncate(ticker.warning.current, 76) : '—'}
      </td>

      <td className="px-2 py-1.5 align-middle text-[11px] text-ink-2" title={ticker.confirmation}>
        {ticker.confirmation ? truncate(ticker.confirmation, 48) : '—'}
      </td>

      <td className="num px-2 py-1.5 align-middle text-[11px] text-ink-3" title={ticker.updatedLabel}>
        {ticker.updatedLabel ? truncate(ticker.updatedLabel, 24) : '—'}
      </td>
    </tr>
  );
}
