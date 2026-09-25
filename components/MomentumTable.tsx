'use client';

import { useState } from 'react';

import { PriorityBadge, StatusBadge, type Tone } from '@/components/StatusBadge';
import {
  ChangeMarker,
  HaltBadge,
  PriceMoveCell,
  RiskCell,
  RvolCell,
  TickerCell,
  WhyCell,
} from '@/components/DecisionCells';
import { rowKeyboardProps } from '@/components/tableKeyboard';
import { buildDeskRow, type DeskRow } from '@/lib/dashboard/merge';
import { resolveConclusions } from '@/lib/dashboard/deskRead';
import {
  PRIOR_HIGH_ONLY_TITLE,
  cycleBadge,
  formatHighPair,
  highReading,
  startedLabel,
} from '@/lib/dashboard/cycle';
import { resolveRisk } from '@/lib/dashboard/risk';
import { resolveWhy } from '@/lib/dashboard/why';
import { COLUMN_TITLE, priceColumnTitle } from '@/lib/dashboard/columnTitles';
import { baselineLabel } from '@/lib/dashboard/view';
import type { SessionPhase } from '@/lib/market/types';
import type { SortKey, SortState } from '@/lib/dashboard/view';
import type { MomentumTicker } from '@/lib/data/types';

interface MomentumTableProps {
  tickers: MomentumTicker[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  changedTickers: Set<string>;
  /** Merged desk state, keyed by ticker. Empty when no market worker is running. */
  deskRows: Map<string, DeskRow>;
  isFocused: (ticker: string) => boolean;
  onToggleFocus: (ticker: string) => void;
  /** Opened by default when Discovery has nothing to show. */
  defaultOpen?: boolean;
  /** Names the baseline the move is measured from, so both lists say one word. */
  sessionPhase?: SessionPhase | null;
}

interface ColumnDefinition {
  key: string;
  label: string;
  sortKey?: SortKey;
  className: string;
  align?: 'right';
  srOnly?: boolean;
  /**
   * The hover, from `columnTitles` and never typed here.
   *
   * THIS FILE ALREADY PROMISED "a trader reading both lists reads one
   * grammar", and it has broken that promise once with a hand-typed header
   * word. A hand-typed EXPLANATION would break it the same way and more
   * quietly, because two tooltips saying different things about one column is
   * not visible on the screen at all -- you would have to hover both.
   */
  title?: string;
}

/*
 * The same seven fields as Discovery, adapted to what a researched row knows.
 *
 * Rank becomes desk Priority — Discovery's rank is a live cross-sectional
 * measure and a sheet row does not have one. Everything else is identical, so a
 * trader reading both lists reads one grammar. The columns this replaces —
 * Volume, Float, Key Levels, Warning prose, Confirmation, Updated — are either
 * in the drawer or, in Confirmation's case, gone: it was `—` on every row and
 * reserved 170px of a table that had none to spare.
 */
/*
 * A FUNCTION OF THE SESSION, NOT A CONSTANT, AND THE REASON IS FOUR LINES UP.
 *
 * This file already promised that "a trader reading both lists reads one
 * grammar". A hand-typed `Price · Move · VWAP` here while Discovery derived its
 * own word broke exactly that promise the moment the other table started saying
 * `PM Gap` -- two words for one quantity, on one screen, live. The literal was
 * the second copy and the first one's regression guard only read the other
 * file, so the guard matched a FILE where the invariant was about a SURFACE.
 */
function columnsFor(phase: SessionPhase | null): ColumnDefinition[] {
  return [
  { key: 'changed', label: 'Changed', className: 'w-[24px]', srOnly: true },
  { key: 'priority', label: 'Pri', sortKey: 'priority', className: 'w-[62px]' },
  { key: 'ticker', label: 'Ticker', sortKey: 'ticker', className: 'w-[112px]' },
  {
    key: 'price',
    label: `Price · ${baselineLabel(phase).label} · VWAP`,
    sortKey: 'price',
    className: 'w-[172px]',
    title: priceColumnTitle(phase),
  },
  { key: 'rvol', label: 'RVOL', className: 'w-[68px]', align: 'right', title: COLUMN_TITLE.rvol },
  { key: 'why', label: 'Why', className: '', title: COLUMN_TITLE.why },
  { key: 'risk', label: 'Risk', className: '', title: COLUMN_TITLE.risk },
  { key: 'cycle', label: 'Cycle', className: 'w-[152px]', title: COLUMN_TITLE.cycle },
  ];
}

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
  defaultOpen = false,
  sessionPhase = null,
}: MomentumTableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const columns = columnsFor(sessionPhase);

  return (
    <section className="flex flex-col border-t border-line">
      {/*
       * Subordinate to Discovery while there is a live board to be subordinate
       * to. Outside a session there is no Discovery, and this becomes the only
       * useful list on the page — so the shell opens it rather than leaving a
       * trader with a screen of controls above a table they must click to see.
       */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-[28px] items-baseline gap-2 px-4 py-1.5 text-left hover:bg-panel-2"
      >
        <span className="num w-3 text-[11px] text-ink-3">{open ? '▾' : '▸'}</span>
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          Researched Names
        </h2>
        <span className="num text-[11px] text-ink-3">{tickers.length}</span>
        <span className="text-[11px] text-ink-3">
          what the desk has studied · Discovery above is what the market is doing now
        </span>
      </button>

      {!open ? null : (
        <table className="w-full table-fixed border-collapse border-t border-line">
          <caption className="sr-only">
            Researched names. Use the arrow keys to move between rows and Enter to open a ticker.
          </caption>
          <thead className="sticky top-0 z-10 bg-panel-2">
            <tr>
              {columns.map((column) => {
                const isSorted = column.sortKey && sort.key === column.sortKey;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    title={column.title}
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={`border-b border-line-2 bg-panel-2 px-2 py-1 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${isSorted ? 'text-accent' : 'text-ink-3'} ${column.className}`}
                  >
                    {column.srOnly ? (
                      <span className="sr-only">{column.label}</span>
                    ) : column.sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.sortKey as SortKey)}
                        className="inline-flex min-h-[24px] items-center gap-1 uppercase hover:text-ink"
                      >
                        {column.label}
                        <span className="num text-[10px]">
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
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-[12px] text-ink-2"
                >
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
                  phase={sessionPhase}
                />
              ))
            )}
          </tbody>
        </table>
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
  phase,
}: {
  ticker: MomentumTicker;
  deskRow: DeskRow | null;
  selected: boolean;
  changed: boolean;
  onSelect: (ticker: string) => void;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  /**
   * Names the baseline on the headline figure.
   *
   * THIS TABLE ALWAYS LEADS WITH THE GAP, because its sort keys do not include
   * `sessionMove` -- there is no Move ordering here to follow. The label is
   * still mandatory: one desk, one grammar, and a reader moving between the
   * two tables should not have to remember that only one of them names its
   * number.
   */
  phase: SessionPhase | null;
}) {
  /*
   * A row always has a DeskRow to read from. When the market worker is not
   * running there is no merged row for this ticker, so one is built from the
   * sheet alone rather than letting the cells fall back to their own opinions.
   */
  const row = deskRow ?? buildDeskRow(ticker.ticker, ticker, null, null);
  const t = row.telemetry;
  const risk = resolveRisk(row);
  const why = resolveWhy(row);

  /*
   * The cycle comes from the same resolved conclusion every other surface uses.
   *
   * This cell read `ticker.cycle` — the Sheet's classification — straight off
   * the sheet row, which is why it kept rendering FRONTSIDE — WARNING after the
   * cutover moved every other surface onto the computed phase. A table showing
   * one vocabulary while the filter above it shows another is worse than either.
   */
  const conclusions = resolveConclusions(row);

  /*
   * THE SAME CYCLE BADGE DISCOVERY RENDERS, FROM THE SAME FUNCTION.
   *
   * The comment above records this cell drifting once already. It drifted a
   * second time: Discovery took `highReading`'s live override and this table
   * did not, so on 2026-09-22 three of the four tickers present on BOTH tables
   * showed different cycle verdicts at the same moment -- GRML `OFF HIGH
   * $12.10 -> $10.49` here against `DAY 1`, QNME and TOPS `OFF HIGH` against
   * `BACKSIDE`. Same object, two readings, nothing stale to notice.
   *
   * Twice fixed by hand is the argument for not fixing it by hand again, so
   * both tables now call `cycleBadge` and have nothing left to disagree about.
   */
  const cycle = row.intelligence?.analysis?.dossier?.computedCycle ?? null;
  const high = highReading(
    cycle?.current ?? null,
    cycle?.todayStart ?? null,
    t.sessionHigh,
    t.price,
    t.spread,
  );
  const priorOnly = high?.kind === 'PRIOR_ONLY';
  const badge = cycleBadge(
    high,
    cycle?.current ?? null,
    conclusions.cycle,
    cycle?.todayStart,
    startedLabel({
      qualifiedAt: row.demand?.qualified?.at,
      qualifiedRvol: row.demand?.qualified?.rvol,
      // Undefined until the producer answers it; undefined keeps the hour off.
      observed: row.demand?.qualified?.observed,
    }),
  );

  const halted = t.haltState === 'HALTED' || t.haltState === 'RESUMING';
  const backside = conclusions.cycle.tone === 'neg';

  return (
    <tr
      {...rowKeyboardProps(
        `${ticker.ticker}, priority ${ticker.priority.raw || 'unset'}. ${why.grade} catalyst. ${risk.label}. Open dossier.`,
        () => onSelect(ticker.ticker),
      )}
      onClick={() => onSelect(ticker.ticker)}
      className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-panel-2 focus-visible:bg-panel-2 ${
        selected ? 'bg-accent/10' : 'bg-panel/40'
      } ${changed ? 'row-changed' : ''}`}
    >
      <td className="px-1 py-1 text-center align-middle">
        <ChangeMarker changed={changed} />
      </td>

      <td className="px-2 py-1 align-middle">
        <PriorityBadge
          bucket={ticker.priority.bucket}
          raw={ticker.priority.raw}
          isRevised={ticker.priority.isRevised}
        />
      </td>

      <td className="px-2 py-1 align-middle">
        <TickerCell
          ticker={ticker.ticker}
          focused={focused}
          onToggleFocus={onToggleFocus}
          stale={t.stale}
          ageSeconds={t.ageSeconds}
        />
        {/* Research status is material and is never hidden behind the Risk chip
            alone: a conflict between the outside research and the desk research
            changes how the row should be read. */}
        <span
          className={`block text-[10px] tracking-wide uppercase ${
            row.intelligenceState.status === 'CONFLICT' ? 'text-warn' : 'text-ink-3'
          }`}
          title={row.intelligenceState.detail}
        >
          {row.intelligenceState.label.toLowerCase()}
        </span>
      </td>

      <td className="px-2 py-1 align-middle">
        <PriceMoveCell
          telemetry={t}
          blueSky={row.blueSky}
          suppressBlueSky={halted || backside}
          phase={phase}
        />
      </td>

      <td className="px-2 py-1 text-right align-middle">
        <RvolCell telemetry={t} />
      </td>

      <td className="px-2 py-1 align-middle">
        <WhyCell why={why} />
      </td>

      <td className="px-2 py-1 align-middle">
        <RiskCell risk={risk} />
      </td>

      <td className="px-2 py-1 align-middle">
        <span className="flex flex-col items-start gap-0.5">
          {priorOnly || !badge ? null : (
            <StatusBadge
              label={badge.label}
              tone={badge.tone as Tone}
              title={badge.title}
              className="max-w-full"
            />
          )}
          {/* The price pair, on the same terms as Discovery: two prices rather
              than a percentage, and no arrow on the prior-high arm because the
              arrow is itself the claim the desk has just declined to make. */}
          {high ? (
            <span
              className="num text-[10px] leading-none font-semibold text-ink-3"
              title={
                priorOnly
                  ? PRIOR_HIGH_ONLY_TITLE
                  : undefined
              }
            >
              {formatHighPair(high)}
            </span>
          ) : null}
          <HaltBadge state={t.haltState} raw={t.haltRaw} />
        </span>
      </td>
    </tr>
  );
}
