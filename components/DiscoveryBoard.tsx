'use client';

import { useState } from 'react';

import {
  StatusBadge,
  StructureBadge,
  changeTone,
  cycleTone,
} from '@/components/StatusBadge';
import type { DeskRow } from '@/lib/dashboard/merge';
import type { DiscoveryState } from '@/lib/market/types';
import {
  formatCount,
  formatMultiple,
  formatPrice,
  formatRankChange,
  formatSignedPercent,
  truncate,
} from '@/lib/format';

const VIEW_SIZES = [12, 25, 50] as const;
type ViewSize = (typeof VIEW_SIZES)[number];

interface DiscoveryBoardProps {
  discovery: DiscoveryState;
  rows: DeskRow[];
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  marketOffline: boolean;
}

export function DiscoveryBoard({
  discovery,
  rows,
  onSelect,
  selectedTicker,
  marketOffline,
}: DiscoveryBoardProps) {
  const [size, setSize] = useState<ViewSize>(12);
  const visible = rows.slice(0, size);

  return (
    <section className="border-b border-line bg-desk px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
          Discovery
        </h2>
        <span className="text-[10px] text-ink-3">
          cross-sectional Daily RVOL rank · ${discovery.priceMin}–${discovery.priceMax} discovery
          range
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="num text-[10px] text-ink-3">
            {discovery.eligibleCount.toLocaleString()} eligible ·{' '}
            {discovery.baselineCount.toLocaleString()} baselines ·{' '}
            {discovery.trackedCount.toLocaleString()} tracked
          </span>
          <div className="flex overflow-hidden rounded-sm border border-line-2">
            {VIEW_SIZES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                className={`border-r border-line-2 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
                  option === size
                    ? 'bg-accent/15 text-accent'
                    : 'bg-panel-2 text-ink-3 hover:bg-panel-3 hover:text-ink-2'
                }`}
              >
                Top {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 bg-panel px-3 py-4 text-[12px] text-ink-3">
          {marketOffline
            ? 'Market worker is not running. Start it with `npm run market:alpaca` to populate discovery.'
            : discovery.sessionPhase === 'CLOSED'
              ? `No session in progress. Discovery populates from 04:00 ET on ${discovery.tradingDate || 'the next session'}.`
              : 'No names currently qualify for the discovery universe.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line-2">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-panel-2">
                <Th className="w-[46px]">Rank</Th>
                <Th className="w-[92px]">Ticker</Th>
                <Th className="w-[80px]" align="right">Price</Th>
                <Th className="w-[74px]" align="right">%</Th>
                <Th className="w-[84px]" align="right">Daily RVOL</Th>
                <Th className="w-[58px]" align="right">Δ Rank</Th>
                <Th className="w-[86px]" align="right">Volume</Th>
                <Th className="w-[86px]" align="right">Float</Th>
                <Th className="w-[84px]" align="right">Float Turn</Th>
                <Th className="w-[168px]">Cycle</Th>
                <Th className="w-[140px]">Catalyst</Th>
                <Th className="w-[136px]">Structure</Th>
                <Th className="w-[76px]" align="right">Spread</Th>
                <Th className="w-[72px]">Halt</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <DiscoveryRow
                  key={row.ticker}
                  row={row}
                  selected={selectedTicker === row.ticker}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-1.5 text-[10px] text-ink-3">
        Daily RVOL = cumulative session volume ÷ average volume over the previous{' '}
        {discovery.internalRank > 0 ? '20' : '20'} eligible full sessions. High rank means abnormal
        participation worth investigating — not a trade, a catalyst, or a clean structure.
      </p>
    </section>
  );
}

function Th({
  children,
  className = '',
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'right';
}) {
  return (
    <th
      scope="col"
      className={`border-b border-line-2 px-2 py-1.5 text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

function DiscoveryRow({
  row,
  selected,
  onSelect,
}: {
  row: DeskRow;
  selected: boolean;
  onSelect: (ticker: string) => void;
}) {
  const demand = row.demand;
  const research = row.research;

  return (
    <tr
      onClick={() => onSelect(row.ticker)}
      className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-panel-2 ${
        selected ? 'bg-accent/10' : 'bg-panel/40'
      }`}
    >
      <td className="num px-2 py-1.5 align-middle font-semibold text-accent">
        {demand?.rvolRank ?? '—'}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-bold tracking-tight text-ink">{row.ticker}</span>
          {demand?.latched ? (
            <span
              title={`Qualified at $${demand.qualified?.price.toFixed(2) ?? '—'} and latched for the session`}
              className="text-[9px] font-semibold tracking-wide text-accent uppercase"
            >
              latch
            </span>
          ) : null}
        </div>
      </td>

      <td className="num px-2 py-1.5 text-right align-middle font-semibold text-ink">
        {formatPrice(demand?.price)}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle font-semibold ${changeTone(
          demand?.percentChange ?? null,
        )}`}
      >
        {formatSignedPercent(demand?.percentChange)}
      </td>

      <td
        className="num px-2 py-1.5 text-right align-middle font-semibold text-ink"
        title={
          demand?.rvolConfidence === 'LOW'
            ? `Reduced sample: ${demand.baselineSessions ?? 0} eligible sessions`
            : demand?.baselineSessions
              ? `${demand.baselineSessions}-session baseline, split-adjusted`
              : 'No baseline'
        }
      >
        <span className={demand?.rvolConfidence === 'LOW' ? 'text-warn' : undefined}>
          {formatMultiple(demand?.rvol)}
        </span>
        {demand?.rvolConfidence === 'LOW' ? (
          <span className="ml-1 text-[9px] font-semibold text-warn uppercase">low</span>
        ) : null}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle ${
          (demand?.rvolRankChange ?? 0) > 0
            ? 'text-pos'
            : (demand?.rvolRankChange ?? 0) < 0
              ? 'text-neg'
              : 'text-ink-3'
        }`}
      >
        {formatRankChange(demand?.rvolRankChange)}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2">
        {formatCount(demand?.cumulativeVolume)}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2">
        {row.displayedFloat !== null ? formatCount(row.displayedFloat) : '—'}
      </td>

      <td
        className="num px-2 py-1.5 text-right align-middle text-ink-2"
        title={
          row.displayedFloatTurnover === null
            ? 'Displayed float unknown or invalid — turnover not calculated'
            : `Cumulative volume ÷ displayed float (${row.displayedFloatSource}). Not effective float turnover.`
        }
      >
        {formatMultiple(row.displayedFloatTurnover)}
      </td>

      <td className="px-2 py-1.5 align-middle">
        {research ? (
          <StatusBadge
            label={research.cycle.display}
            tone={cycleTone(research.cycle.state)}
            title={research.cycle.raw}
            className="max-w-[160px]"
          />
        ) : (
          <NotAnalyzed />
        )}
      </td>

      <td className="px-2 py-1.5 align-middle">
        {research ? (
          <span
            className={`text-[11px] font-semibold ${
              research.catalyst.gradeBucket === 'A'
                ? 'text-pos'
                : research.catalyst.gradeBucket === 'C'
                  ? 'text-warn'
                  : 'text-ink-2'
            }`}
            title={research.catalyst.latest}
          >
            {truncate(research.catalyst.gradeRaw || '—', 20)}
          </span>
        ) : (
          <NotAnalyzed />
        )}
      </td>

      <td className="px-2 py-1.5 align-middle">
        {research ? (
          <StructureBadge
            state={research.structure.state}
            raw={research.structure.raw || research.structure.floatRaw}
          />
        ) : (
          <NotAnalyzed />
        )}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2" title="Level 1 NBBO spread — not depth">
        {demand?.quote.spreadPct !== null && demand?.quote.spreadPct !== undefined
          ? `${demand.quote.spreadPct.toFixed(2)}%`
          : '—'}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <HaltBadge state={demand?.haltState ?? 'UNKNOWN'} raw={demand?.haltRaw ?? null} />
      </td>
    </tr>
  );
}

function NotAnalyzed() {
  return (
    <span
      title="This name was discovered by the market feed. The research desk has not analyzed it."
      className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase"
    >
      Not yet analyzed
    </span>
  );
}

export function HaltBadge({ state, raw }: { state: string; raw: string | null }) {
  if (state === 'HALTED') return <StatusBadge label="Halted" tone="neg" title={raw ?? 'Halted'} />;
  if (state === 'RESUMING') return <StatusBadge label="Resuming" tone="warn" title={raw ?? 'Resuming'} />;
  if (state === 'TRADING') return <StatusBadge label="Trading" tone="pos" title={raw ?? 'Trading'} />;
  return <span className="text-[10px] text-ink-3">—</span>;
}
