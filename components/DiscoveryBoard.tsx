'use client';

import { useState } from 'react';

import { StatusBadge, type Tone } from '@/components/StatusBadge';
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
import type { DeskRow } from '@/lib/dashboard/merge';
import { resolveConclusions } from '@/lib/dashboard/deskRead';
import { resolveRisk } from '@/lib/dashboard/risk';
import { resolveWhy } from '@/lib/dashboard/why';
import {
  DISCOVERY_DEFAULT_SORT,
  discoveryMissingCount,
  retentionNote,
  sortDiscoveryRows,
  type DiscoverySortKey,
  type DiscoverySortState,
} from '@/lib/dashboard/view';
import type { DiscoveryState } from '@/lib/market/types';
import { formatCount, formatMultiple, formatRankChange } from '@/lib/format';

const VIEW_SIZES = [12, 25, 50] as const;
type ViewSize = (typeof VIEW_SIZES)[number];

/**
 * The sortable keys, in the order a trader reaches for them.
 *
 * `Move` is the session's own percent change — measured against the prior
 * session's close during premarket and RTH, and against today's close after
 * the bell. One field, and its label changes with the session rather than its
 * meaning changing silently underneath a fixed one.
 */
const SORT_KEYS: ReadonlyArray<{ key: DiscoverySortKey; label: string; title: string }> = [
  { key: 'rank', label: 'Rank', title: "The board's own ranking for this session" },
  { key: 'rvol', label: 'RVOL', title: 'Relative volume' },
  { key: 'changePct', label: 'Move', title: 'Percent change for the current session phase' },
  { key: 'price', label: 'Price', title: 'Last price' },
  { key: 'float', label: 'Float', title: 'Displayed float. Not known for every name.' },
];

/** Premarket and RTH measure from the prior close; after the bell, from today's. */
function moveLabel(phase: DiscoveryState['sessionPhase']): string {
  switch (phase) {
    case 'PREMARKET':
      return 'Move vs prior close';
    case 'RTH':
      return 'Move today';
    case 'AFTER_HOURS':
    case 'POST_MARKET':
      return 'Move since close';
    default:
      return 'Move';
  }
}

interface DiscoveryBoardProps {
  discovery: DiscoveryState;
  rows: DeskRow[];
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  marketOffline: boolean;
  isFocused: (ticker: string) => boolean;
  onToggleFocus: (ticker: string) => void;
  changedTickers: Set<string>;
}

/**
 * The primary decision surface.
 *
 * Seven fields and a change marker, and nothing else: Rank, Ticker,
 * Price/Move/VWAP, RVOL, Why, Risk, Cycle. The board used to carry fifteen
 * columns totalling 1,504px against a 1,022px viewport, which put the fields
 * that decide whether to look further off the right-hand edge — and took the
 * ticker with them when you scrolled to reach them.
 *
 * Levels are not here. They belong to the drawer's ladder, in full, rather than
 * as a clipped list competing with Why and Risk for the width those two need.
 * Spread is not here either: this desk is not replacing Level 2.
 */
export function DiscoveryBoard({
  discovery,
  rows,
  onSelect,
  selectedTicker,
  marketOffline,
  isFocused,
  onToggleFocus,
  changedTickers,
}: DiscoveryBoardProps) {
  const [size, setSize] = useState<ViewSize>(12);
  const [sort, setSort] = useState<DiscoverySortState>(DISCOVERY_DEFAULT_SORT);

  /*
   * Sort the whole tracked set, then take the top N.
   *
   * The other order — rank first, then sort those twelve — answers a question
   * nobody asked: "of the twelve busiest, which is priciest". Sorting first
   * means Top 25 by float really is the twenty-five tightest floats on the
   * board, which is what the control appears to promise.
   */
  const sorted = sortDiscoveryRows(rows, sort);
  const visible = sorted.slice(0, size);
  const sortActive = sort.key !== DISCOVERY_DEFAULT_SORT.key;
  const missing = discoveryMissingCount(rows, sort.key);
  const showFloat = sort.key === 'float';

  function changeSort(key: DiscoverySortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : // Rank reads best ascending — #1 first. Everything else a trader
          // sorts by, they want the largest of first.
          { key, direction: key === 'rank' ? 'asc' : 'desc' },
    );
  }

  /*
   * The board changes with the session, and says so.
   *
   * At 16:30 the columns and the title both have to make it obvious that this
   * is post-close activity. A board that still reads DISCOVERY / Daily RVOL
   * after the bell implies the ranking means something it no longer means.
   */
  const afterHours = discovery.board === 'AFTER_HOURS';
  const frozen = discovery.sessionPhase === 'POST_MARKET';

  return (
    <section className="border-b border-line bg-desk px-4 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
          {afterHours ? 'After-Hours Discovery' : 'Discovery'}
        </h2>
        <span className="text-[11px] text-ink-3">
          {afterHours
            ? `AH participation rank · $${discovery.priceMin}–$${discovery.priceMax}`
            : `Daily RVOL rank · $${discovery.priceMin}–$${discovery.priceMax}`}
        </span>

        {frozen ? (
          <span
            className="text-[10px] font-semibold tracking-wide text-warn uppercase"
            title="Extended trading ended at 20:00 ET. These are the session's final after-hours numbers; they are no longer moving."
          >
            frozen 20:00
          </span>
        ) : null}

        {sortActive ? (
          <span
            className="text-[10px] font-semibold tracking-wide text-accent uppercase"
            title={`The board's own order for this session is ${discovery.rankingLabel}. You are overriding it. Choose Rank to return.`}
          >
            sorted by {SORT_KEYS.find((entry) => entry.key === sort.key)?.label.toLowerCase()}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <span className="num text-[11px] text-ink-3">
            {discovery.eligibleCount.toLocaleString()} eligible ·{' '}
            {discovery.trackedCount.toLocaleString()} tracked
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink-3">Sort</span>
            <div className="flex overflow-hidden rounded-sm border border-line-2">
              {SORT_KEYS.map((entry) => {
                const active = entry.key === sort.key;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-pressed={active}
                    title={
                      entry.key === 'changePct' ? moveLabel(discovery.sessionPhase) : entry.title
                    }
                    onClick={() => changeSort(entry.key)}
                    className={`min-h-[24px] border-r border-line-2 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
                      active
                        ? 'bg-accent/15 text-accent'
                        : 'bg-panel-2 text-ink-3 hover:bg-panel-3 hover:text-ink-2'
                    }`}
                  >
                    {entry.label}
                    {active ? (
                      <span aria-hidden className="ml-1">
                        {sort.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {missing > 0 ? (
              // The count is what stops a sort over a partly-absent column from
              // showing a clean top of list that is really "the ones we know
              // about". Absence is stated, never implied by position.
              <span
                className="num text-[11px] text-warn"
                title={`${missing} of ${rows.length} rows have no value for this sort and are listed last, in both directions.`}
              >
                {missing} unknown
              </span>
            ) : null}
          </div>
          <div className="flex overflow-hidden rounded-sm border border-line-2">
            {VIEW_SIZES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === size}
                onClick={() => setSize(option)}
                className={`min-h-[24px] border-r border-line-2 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
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
        <p className="rounded-sm border border-dashed border-line-2 bg-panel px-3 py-4 text-[12px] text-ink-2">
          {marketOffline
            ? // No shell command here. The desk is one supervised process and a
              // second market worker silently displaces the live SIP connection,
              // so telling a trader to start one is worse than telling them
              // nothing.
              'Market feed is not running. Discovery cannot populate until it reconnects.'
            : discovery.sessionPhase === 'CLOSED' || discovery.sessionPhase === 'NEXT_DAY_PREP'
              ? `No session in progress. Discovery populates from 04:00 ET on ${discovery.tradingDate || 'the next session'}.`
              : afterHours
                ? 'Nothing has traded enough since the close to rank on after-hours participation yet.'
                : 'No names currently qualify for the discovery universe.'}
        </p>
      ) : (
        <table className="w-full table-fixed border-collapse border-t border-line">
          <caption className="sr-only">
            {afterHours ? 'After-hours discovery' : 'Discovery'} board, ranked by{' '}
            {discovery.rankingLabel}. Use the arrow keys to move between rows and Enter to open a
            ticker.
          </caption>
          <thead className="sticky top-0 z-10 bg-panel-2">
            <tr>
              <Th className="w-[24px]" srOnly>
                Changed
              </Th>
              <Th className="w-[44px]" align="right">
                Rank
              </Th>
              <Th className="w-[112px]">Ticker</Th>
              <Th className="w-[172px]">Price · Move · VWAP</Th>
              <Th className="w-[68px]" align="right">
                RVOL
              </Th>
              {showFloat ? (
                <Th className="w-[84px]" align="right">
                  Float
                </Th>
              ) : null}
              <Th>Why</Th>
              <Th>Risk</Th>
              <Th className="w-[152px]">Cycle</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <DiscoveryRow
                key={row.ticker}
                row={row}
                selected={selectedTicker === row.ticker}
                changed={changedTickers.has(row.ticker)}
                onSelect={onSelect}
                focused={isFocused(row.ticker)}
                onToggleFocus={onToggleFocus}
                priceMin={discovery.priceMin}
                priceMax={discovery.priceMax}
                afterHours={afterHours}
                showFloat={showFloat}
              />
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-1.5 text-[11px] text-ink-3">
        {afterHours ? (
          <>
            AH Participation = volume since the {discovery.rthClose} ET close ÷ average volume over
            the previous 20 eligible full sessions. It is deliberately not Daily RVOL: the
            numerator is one evening, not a trading day. High rank means abnormal after-hours
            participation worth investigating — not a trade, a catalyst, or a clean structure.
          </>
        ) : (
          <>
            Daily RVOL = cumulative session volume ÷ average volume over the previous 20 eligible
            full sessions. High rank means abnormal participation worth investigating — not a
            trade, a catalyst, or a clean structure.
          </>
        )}
      </p>
    </section>
  );
}

function Th({
  children,
  className = '',
  align,
  srOnly = false,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'right';
  srOnly?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-line-2 bg-panel-2 px-2 py-1 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

function DiscoveryRow({
  row,
  selected,
  changed,
  onSelect,
  focused,
  onToggleFocus,
  priceMin,
  priceMax,
  afterHours,
  showFloat,
}: {
  row: DeskRow;
  selected: boolean;
  changed: boolean;
  onSelect: (ticker: string) => void;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  priceMin: number;
  priceMax: number;
  afterHours: boolean;
  showFloat: boolean;
}) {
  const demand = row.demand;
  // One projection for every surface: whatever the Focus strip shows for this
  // ticker, this row shows the same numbers from the same object.
  const t = row.telemetry;
  const conclusions = resolveConclusions(row);
  const risk = resolveRisk(row);
  const why = resolveWhy(row);
  const ah = demand?.afterHours ?? null;
  const retention = retentionNote({
    latched: (afterHours ? ah?.latched : demand?.latched) ?? false,
    price: t.price,
    priceMin,
    priceMax,
  });

  /*
   * One saturated colour per row, by precedence.
   *
   * A halt outranks a backside cycle, which outranks a blue-sky crossing. The
   * board previously coloured every one of them at once, which is how six rows
   * produced a wall of amber and red in which nothing stood out.
   */
  const halted = t.haltState === 'HALTED' || t.haltState === 'RESUMING';
  const backside = conclusions.cycle.tone === 'neg';

  const rank = (afterHours ? (ah?.rank ?? null) : t.rvolRank) ?? null;
  const rankChange = afterHours ? (ah?.rankChange ?? null) : t.rvolRankChange;

  return (
    <tr
      {...rowKeyboardProps(
        `${row.ticker}, rank ${rank ?? 'unranked'}. ${why.grade} catalyst. ${risk.label}. Open dossier.`,
        () => onSelect(row.ticker),
      )}
      onClick={() => onSelect(row.ticker)}
      className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-panel-2 focus-visible:bg-panel-2 ${
        selected ? 'bg-accent/10' : 'bg-panel/40'
      } ${changed ? 'row-changed' : ''}`}
    >
      <td className="px-1 py-1 text-center align-middle">
        <ChangeMarker changed={changed} />
      </td>

      <td className="num px-2 py-1 text-right align-middle">
        <span className="text-[13px] font-semibold text-accent">{rank ?? '—'}</span>
        {rankChange ? (
          <span
            className={`ml-1 text-[10px] ${rankChange > 0 ? 'text-pos' : 'text-neg'}`}
            title="Rank movement since the previous ranking pass"
          >
            {formatRankChange(rankChange)}
          </span>
        ) : null}
      </td>

      <td className="px-2 py-1 align-middle">
        <TickerCell
          ticker={row.ticker}
          focused={focused}
          onToggleFocus={onToggleFocus}
          stale={t.stale}
          ageSeconds={t.ageSeconds}
          retention={retention}
        />
        {afterHours ? (
          // One line: a wrapped second line here made every row in the evening
          // board taller than the same row during the day.
          <span
            className="num block truncate text-[10px] whitespace-nowrap text-ink-3"
            title={`${formatCount(ah?.volume ?? null)} traded since the close · ${formatMultiple(
              ah?.participation ?? null,
            )} of a normal full day's volume`}
          >
            {formatCount(ah?.volume ?? null)} · {formatMultiple(ah?.participation ?? null)}
          </span>
        ) : null}
      </td>

      <td className="px-2 py-1 align-middle">
        <PriceMoveCell
          telemetry={t}
          blueSky={row.blueSky}
          suppressBlueSky={halted || backside}
        />
      </td>

      <td className="px-2 py-1 text-right align-middle">
        <RvolCell telemetry={t} />
      </td>

      {showFloat ? (
        // Present only while the board is sorted by float. A sort whose column
        // is not on screen leaves the trader unable to see why the order is
        // what it is; a permanent column would spend width the eight-field
        // board does not have.
        <td className="num px-2 py-1 text-right align-middle">
          {row.displayedFloat === null ? (
            <span className="text-[11px] text-warn" title="No float on file for this name.">
              unknown
            </span>
          ) : (
            <span className="text-[12px] text-ink">{formatCount(row.displayedFloat)}</span>
          )}
        </td>
      ) : null}

      <td className="px-2 py-1 align-middle">
        <WhyCell why={why} />
      </td>

      <td className="px-2 py-1 align-middle">
        <RiskCell risk={risk} />
      </td>

      <td className="px-2 py-1 align-middle">
        <span className="flex flex-col items-start gap-0.5">
          <StatusBadge
            label={conclusions.cycle.label}
            tone={conclusions.cycle.tone as Tone}
            title={conclusions.cycle.title ?? conclusions.cycle.label}
            className="max-w-full"
          />
          <HaltBadge state={t.haltState} raw={t.haltRaw} />
        </span>
      </td>
    </tr>
  );
}
