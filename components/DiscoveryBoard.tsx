'use client';

import { useState } from 'react';

import { StatusBadge, changeTone, type Tone } from '@/components/StatusBadge';
import { FocusToggle } from '@/components/FocusToggle';
import { CompactLevels } from '@/components/LevelLadder';
import type { DeskRow } from '@/lib/dashboard/merge';
import { resolveConclusions, type DeskConclusion } from '@/lib/dashboard/deskRead';
import { retentionNote } from '@/lib/dashboard/view';
import type { DiscoveryState } from '@/lib/market/types';
import {
  formatCount,
  formatMultiple,
  formatPrice,
  formatRankChange,
  formatSignedPercent,
} from '@/lib/format';

const VIEW_SIZES = [12, 25, 50] as const;
type ViewSize = (typeof VIEW_SIZES)[number];

interface DiscoveryBoardProps {
  discovery: DiscoveryState;
  rows: DeskRow[];
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  marketOffline: boolean;
  isFocused: (ticker: string) => boolean;
  onToggleFocus: (ticker: string) => void;
}

export function DiscoveryBoard({
  discovery,
  rows,
  onSelect,
  selectedTicker,
  marketOffline,
  isFocused,
  onToggleFocus,
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
                <Th className="w-[104px]">Ticker</Th>
                <Th className="w-[80px]" align="right">Price</Th>
                <Th className="w-[74px]" align="right">%</Th>
                <Th className="w-[84px]" align="right">Daily RVOL</Th>
                <Th className="w-[58px]" align="right">Δ Rank</Th>
                <Th className="w-[86px]" align="right">Volume</Th>
                <Th className="w-[86px]" align="right">Float</Th>
                <Th className="w-[84px]" align="right">Float Turn</Th>
                <Th className="w-[210px]">Levels</Th>
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
                  focused={isFocused(row.ticker)}
                  onToggleFocus={onToggleFocus}
                  priceMin={discovery.priceMin}
                  priceMax={discovery.priceMax}
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
  focused,
  onToggleFocus,
  priceMin,
  priceMax,
}: {
  row: DeskRow;
  selected: boolean;
  onSelect: (ticker: string) => void;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  priceMin: number;
  priceMax: number;
}) {
  const demand = row.demand;
  // One projection for every surface: whatever the Focus strip shows for this
  // ticker, this row shows the same numbers from the same object.
  const t = row.telemetry;
  // And the same three conclusions the drawer resolves.
  const conclusions = resolveConclusions(row);
  const retention = retentionNote({
    latched: demand?.latched ?? false,
    price: t.price,
    priceMin,
    priceMax,
  });

  return (
    <tr
      onClick={() => onSelect(row.ticker)}
      className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-panel-2 ${
        selected ? 'bg-accent/10' : 'bg-panel/40'
      }`}
    >
      <td className="num px-2 py-1.5 align-middle font-semibold text-accent">
        {t.rvolRank ?? '—'}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <div className="flex items-center gap-1">
          {/* Pinning is a display choice; it changes nothing about this row. */}
          <FocusToggle ticker={row.ticker} focused={focused} onToggle={onToggleFocus} />
          <span className="text-[14px] font-bold tracking-tight text-ink">{row.ticker}</span>
          {/* Only shown when the retention is actually doing something. */}
          {retention ? (
            <span
              title={`Qualified at $${demand?.qualified?.price.toFixed(2) ?? '—'} inside the $${priceMin}–$${priceMax} discovery band and kept for the session after leaving it`}
              className="text-[9px] font-semibold tracking-wide whitespace-nowrap text-accent uppercase"
            >
              {retention}
            </span>
          ) : null}
          {t.stale ? (
            <span
              title={`No market event for ${t.ageSeconds ?? '—'}s — this is the last live print, not a current one`}
              className="text-[9px] font-semibold tracking-wide text-warn uppercase"
            >
              stale
            </span>
          ) : null}
        </div>
      </td>

      <td className="num px-2 py-1.5 text-right align-middle font-semibold text-ink">
        {formatPrice(t.price)}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle font-semibold ${changeTone(
          t.percentChange,
        )}`}
      >
        {formatSignedPercent(t.percentChange)}
      </td>

      <td
        className="num px-2 py-1.5 text-right align-middle font-semibold text-ink"
        title={
          t.rvolConfidence === 'LOW'
            ? `Reduced sample: ${demand?.baselineSessions ?? 0} eligible sessions`
            : demand?.baselineSessions
              ? `${demand.baselineSessions}-session baseline, split-adjusted`
              : 'No baseline'
        }
      >
        <span className={t.rvolConfidence === 'LOW' ? 'text-warn' : undefined}>
          {formatMultiple(t.rvol)}
        </span>
        {t.rvolConfidence === 'LOW' ? (
          <span className="ml-1 text-[9px] font-semibold text-warn uppercase">low</span>
        ) : null}
      </td>

      <td
        className={`num px-2 py-1.5 text-right align-middle ${
          (t.rvolRankChange ?? 0) > 0
            ? 'text-pos'
            : (t.rvolRankChange ?? 0) < 0
              ? 'text-neg'
              : 'text-ink-3'
        }`}
      >
        {formatRankChange(t.rvolRankChange)}
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2">
        {formatCount(t.volume)}
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

      {/* Nearest levels either side of price, so the board answers "what is
          above me" without opening the drawer. Width is clamped so a long level
          list cannot push the structure and halt columns off the screen — the
          drawer holds the full ladder. */}
      <td className="max-w-[230px] px-2 py-1.5 align-middle">
        <CompactLevels map={row.levelMap} />
      </td>

      <td className="px-2 py-1.5 align-middle">
        <Conclusion row={row} value={conclusions.cycle} width="max-w-[160px]" />
      </td>

      <td className="px-2 py-1.5 align-middle">
        <Conclusion row={row} value={conclusions.catalyst} width="max-w-[132px]" />
      </td>

      <td className="px-2 py-1.5 align-middle">
        <Conclusion row={row} value={conclusions.structure} width="max-w-[128px]" />
      </td>

      <td className="num px-2 py-1.5 text-right align-middle text-ink-2" title="Level 1 NBBO spread — not depth">
        {t.spreadPct !== null ? `${t.spreadPct.toFixed(2)}%` : '—'}
      </td>

      <td className="px-2 py-1.5 align-middle">
        <HaltBadge state={t.haltState} raw={t.haltRaw} />
      </td>
    </tr>
  );
}

/**
 * One resolved conclusion, plus where it came from.
 *
 * The board used to build these itself from whichever source it found first,
 * so a dimension the analysis left open could read UNKNOWN here and NOT
 * ANALYZED in the drawer for the same ticker at the same moment.
 */
function Conclusion({
  row,
  value,
  width,
}: {
  row: DeskRow;
  value: DeskConclusion;
  width: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <StatusBadge
        label={value.label}
        tone={value.tone as Tone}
        title={value.title ?? value.label}
        className={width}
      />
      {/* No source reached this field, so the label already says what the
          status mark would — printing both read as a contradiction. */}
      {value.provenance === 'NONE' ? null : <ProvenanceMark row={row} />}
    </span>
  );
}

/**
 * Source marker.
 *
 * Quiet by default — where intelligence came from matters less than what it
 * says. CONFLICT is the exception and is coloured, because a genuine
 * disagreement between the human review and the automatic layer is itself the
 * finding. It reads the shared status so the board and the drawer cannot
 * describe the same ticker differently.
 */
function ProvenanceMark({ row }: { row: DeskRow }) {
  const state = row.intelligenceState;
  if (state.status === 'NOT_ANALYZED') return null;

  const conflict = state.status === 'CONFLICT';
  const label = conflict
    ? 'conflict'
    : state.status === 'PARTIAL_AUTO'
      ? 'auto·partial'
      : state.label.toLowerCase();

  return (
    <span
      className={`text-[9px] uppercase tracking-wider ${conflict ? 'text-warn' : 'text-ink-3'}`}
      title={state.detail}
    >
      {label}
    </span>
  );
}

export function HaltBadge({ state, raw }: { state: string; raw: string | null }) {
  if (state === 'HALTED') return <StatusBadge label="Halted" tone="neg" title={raw ?? 'Halted'} />;
  if (state === 'RESUMING') return <StatusBadge label="Resuming" tone="warn" title={raw ?? 'Resuming'} />;
  if (state === 'TRADING') return <StatusBadge label="Trading" tone="pos" title={raw ?? 'Trading'} />;
  return <span className="text-[10px] text-ink-3">—</span>;
}
