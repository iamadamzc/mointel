'use client';

import { useState } from 'react';

import {
  PriorityBadge,
  StatusBadge,
  StructureBadge,
  changeTone,
  cycleTone,
  sessionTone,
} from '@/components/StatusBadge';
import { FocusToggle } from '@/components/FocusToggle';
import type { DeskRow } from '@/lib/dashboard/merge';
import type { SortKey, SortState } from '@/lib/dashboard/view';
import type { MomentumTicker } from '@/lib/data/types';
import {
  formatCount,
  formatMultiple,
  formatPrice,
  formatSignedPercent,
  truncate,
} from '@/lib/format';

interface MomentumTableProps {
  tickers: MomentumTicker[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  changedTickers: Set<string>;
  /** Merged demand state, keyed by ticker. Empty when no market worker is running. */
  deskRows: Map<string, DeskRow>;
  isFocused: (ticker: string) => boolean;
  onToggleFocus: (ticker: string) => void;
}

interface ColumnDefinition {
  key: string;
  label: string;
  sortKey?: SortKey;
  className: string;
  align?: 'right';
}

/*
 * One price column, not two.
 *
 * This table used to show the sheet's price and percentage first and a separate
 * "Live" pair further right, which meant the first number a trader read was the
 * older one. Price and % now carry whatever the shared projection resolved —
 * live when it exists — and the Src column says which it was.
 */
const COLUMNS: ColumnDefinition[] = [
  { key: 'priority', label: 'Pri', sortKey: 'priority', className: 'w-[64px]' },
  { key: 'ticker', label: 'Ticker', sortKey: 'ticker', className: 'w-[104px]' },
  { key: 'price', label: 'Price', sortKey: 'price', className: 'w-[84px]', align: 'right' },
  { key: 'changePct', label: '%', sortKey: 'changePct', className: 'w-[76px]', align: 'right' },
  { key: 'session', label: 'Src', className: 'w-[54px]' },
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
  isFocused,
  onToggleFocus,
}: MomentumTableProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col border-t border-line">
      {/*
       * Deliberately subordinate to Discovery.
       *
       * The two tables overlap heavily by name, and giving them equal weight
       * asked a trader to work out which one to believe. Discovery is what the
       * market is saying right now; this is what the desk has already studied,
       * so it sits below and starts closed.
       */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-baseline gap-2 px-4 py-2 text-left hover:bg-panel-2"
      >
        <span className="num w-3 text-[10px] text-ink-3">{open ? '▾' : '▸'}</span>
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          Analyzed Watchlist
        </h2>
        <span className="num text-[11px] text-ink-3">{tickers.length}</span>
        <span className="text-[10px] text-ink-3">
          names the desk has researched · Discovery above is what the market is doing now
        </span>
      </button>

      {!open ? null : (
      /* Horizontal scroll only: the page owns vertical scrolling now that the
         discovery board and event feed share it. */
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
                  focused={isFocused(ticker.ticker)}
                  onToggleFocus={onToggleFocus}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

function TableRow({
  ticker,
  deskRow,
  selected,
  changed,
  onSelect,
  focused,
  onToggleFocus,
}: {
  ticker: MomentumTicker;
  deskRow: DeskRow | null;
  selected: boolean;
  changed: boolean;
  onSelect: (ticker: string) => void;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
}) {
  const structureText = ticker.structure.raw || ticker.structure.floatRaw;
  const demand = deskRow?.demand ?? null;
  // Same projection as Discovery and the Primary strip; never a second opinion.
  const t = deskRow?.telemetry ?? null;

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
        <span className="flex items-center gap-1">
          <FocusToggle ticker={ticker.ticker} focused={focused} onToggle={onToggleFocus} />
          <span className="text-[14px] font-bold tracking-tight text-ink">{ticker.ticker}</span>
        </span>
      </td>

      <td
        className="num px-2 py-1.5 text-right align-middle font-semibold text-ink"
        title={
          t?.source === 'ALPACA'
            ? `Alpaca ${demand?.priceSource ?? 'feed'} at ${demand?.priceAt ?? 'unknown time'}`
            : `Google Sheet ${ticker.price.session} value — no live market data for this ticker`
        }
      >
        {t ? formatPrice(t.price) : ticker.price.display}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle font-semibold ${changeTone(
          t ? t.percentChange : ticker.changePct.value,
        )}`}
      >
        {t ? formatSignedPercent(t.percentChange) : ticker.changePct.display}
      </td>

      <td className="px-2 py-1.5 align-middle">
        {t?.source === 'ALPACA' ? (
          <StatusBadge
            label={t.stale ? `${t.sourceLabel}·stale` : t.sourceLabel}
            tone={t.stale ? 'warn' : 'accent'}
            title={
              t.stale
                ? `Last live print, ${t.ageSeconds ?? '—'}s old`
                : 'Live Alpaca market data'
            }
          />
        ) : (
          <StatusBadge
            label={ticker.price.session === 'NONE' ? '—' : ticker.price.session}
            tone={sessionTone(ticker.price.session)}
            title={`Google Sheet ${ticker.price.session} value`}
          />
        )}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2">
        {t?.rvol !== null && t?.rvol !== undefined ? (
          <span className={t.rvolConfidence === 'LOW' ? 'text-warn' : 'text-ink'}>
            {formatMultiple(t.rvol)}
            {t.rvolRank !== null ? (
              <span className="ml-1 text-[10px] text-accent">#{t.rvolRank}</span>
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

      <td
        className="num px-2 py-1.5 text-right align-middle text-ink-2"
        title={
          t?.source === 'ALPACA' ? 'Cumulative live session volume' : ticker.volume.raw
        }
      >
        {t?.source === 'ALPACA' ? formatCount(t.volume) : ticker.volume.display}
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
