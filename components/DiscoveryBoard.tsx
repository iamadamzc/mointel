'use client';

import { useState } from 'react';

import { ColumnResizeHandle } from '@/components/ColumnResizeHandle';
import { DEFAULT_WIDTHS, type DiscoveryColumnKey } from '@/lib/dashboard/columnWidths';
import { useColumnWidths, type ColumnHandle } from '@/lib/hooks/useColumnWidths';
import { StatusBadge, type Tone } from '@/components/StatusBadge';
import { ActivitySparkline } from '@/components/ActivitySparkline';
import { NowSparkline } from '@/components/NowSparkline';
import type { UniverseWarning } from '@/lib/dashboard/universe';
import {
  ChangeMarker,
  HaltBadge,
  PriceMoveCell,
  RiskCell,
  RvolCell,
  TickerCell,
  WhyCell,
} from '@/components/DecisionCells';
import { sessionMoveSortLabel } from '@/lib/dashboard/sessionMove';
import { nowCellTitle, nowColumnCopy, nowReadingOf, type NowCapture } from '@/lib/dashboard/nowReading';
/*
 * ALIASED because this file EXPORTS a component called `DiscoveryBoard`, and
 * the type of the same name is a different thing. Without the alias `tsc`
 * reads the component where the union was meant.
 */
import type { DiscoveryBoard as BoardKind, SessionPhase } from '@/lib/market/types';
import { rowKeyboardProps } from '@/components/tableKeyboard';
import type { DeskRow } from '@/lib/dashboard/merge';
import { resolveConclusions } from '@/lib/dashboard/deskRead';
import {
  PRIOR_HIGH_ONLY_TITLE,
  cycleBadge,
  formatHighPair,
  highReading,
  startedLabel,
} from '@/lib/dashboard/cycle';
import { COLUMN_TITLE, priceColumnTitle, rankingQuantity } from '@/lib/dashboard/columnTitles';
import { resolveRisk } from '@/lib/dashboard/risk';
import { resolveWhy, whySpoken } from '@/lib/dashboard/why';
import {
  DISCOVERY_DEFAULT_SORT,
  discoveryMissingCount,
  baselineLabel,
  movingCaption,
  movingNote,
  visibleWithMovers,
  retentionNote,
  sortDiscoveryRows,
  type DiscoverySortKey,
  type DiscoverySortState,
} from '@/lib/dashboard/view';
import type { DiscoveryState } from '@/lib/market/types';
import { formatCount, formatMultiple } from '@/lib/format';
import { FloatCell } from '@/components/FloatCell';
import { companyLine } from '@/lib/dashboard/companyLine';
import { FLOAT_LEGEND } from '@/lib/dashboard/floatBound';
import { SETUP_GRADE_LEGEND } from '@/lib/dashboard/setupGrade';

const VIEW_SIZES = [12, 25, 50] as const;
type ViewSize = (typeof VIEW_SIZES)[number];

/**
 * The sortable keys, in the order a trader reaches for them.
 *
 * `changePct` carries no fixed label here: it is resolved per session by
 * `baselineLabel`, which lives in `lib/dashboard/view` because the column
 * header needs the same word and the two had drifted apart.
 */
interface SortEntry {
  key: DiscoverySortKey;
  label: string;
  title: string;
  /**
   * Set when sorting by this key should also make its figure the HEADLINE.
   *
   * ON THE ENTRY FOR THE SAME REASON `resolve` IS. A `sort.key ===
   * 'sessionMove'` in the component body is a per-key special case, which
   * `sessionMoveSort.test.ts` forbids by reading this file's source -- and it
   * caught exactly that here. The rule is older than the test: the sort
   * control once read `Gap` while the header over the same number read `Move`,
   * because two if-chains had to be kept in step by hand.
   */
  leads?: 'MOVE';
  /**
   * What the column MEASURES, in units, for the line that announces the sort.
   *
   * `NOW` reads as "recent" and says nothing about trades, volume or dollars —
   * he asked "what's it sorting" for exactly that reason. The units belong
   * somewhere always visible while that sort is active, and the column header
   * has no room for them.
   */
  metric?: string;
  /**
   * Which HEADER this key sorts, so the marked column is read off the table
   * rather than from a chain of `sort.key === ...` tests in the markup.
   *
   * Three keys share the price column, and `sessionMoveSort.test.ts` forbids a
   * per-key special case in this component by reading its source — it caught
   * exactly that here, for the second time. The rule predates the test: two
   * if-chains over the same keys are how the sort control once read `Gap`
   * while the header above the same number read `Move`.
   */
  column: 'rank' | 'rvol' | 'price' | 'now' | 'float' | 'ticker';
  /**
   * Set when the quantity's NAME depends on the session, so the button, the
   * active marker and the tooltip resolve it from one place.
   *
   * `changePct` used to be special-cased in two spots -- once for the button and
   * once for the active label -- and adding a second phase-dependent key would
   * have made that two if-chains to keep in step. That is the shape that let the
   * sort control read `Gap` while the header above the same number read `Move`.
   * A resolver on the entry cannot drift from itself.
   *
   * The static `label` stays as the value a resolver-less entry uses; for a
   * resolved entry it is never read, so it is left as the family's neutral word
   * rather than a second spelling of a phase label.
   */
  resolve?: (phase: SessionPhase | null) => { label: string; title: string };
  /**
   * Resolved on the BOARD rather than the phase, for the one quantity that
   * changes identity at the bell.
   *
   * Separate from `resolve` instead of widening it, because the two answer
   * different questions and the board is not derivable from the phase without
   * reading a proxy. Preferred when present.
   */
  resolveByBoard?: (board: BoardKind) => { label: string; title: string };
}

/*
 * SIX BUTTONS, MEASURED RATHER THAN EYEBALLED.
 *
 * `baselineLabel` warns that its word sits "in a five-button row ... that has to
 * survive the 1,024px floor", and this adds a sixth. TWO of the six labels now
 * vary with the phase and BOTH peak in the SAME one -- `RTH Gap` beside
 * `RTH Move` -- which is not an edge case, it is the session he trades. Measured
 * at PM or off-session it would look fine and still be widest at 09:30.
 *
 * Measured in Geist 600 at 11px with `tracking-wide`, the real font:
 *
 *     PREMARKET    330.4px      RTH  339.2px      AH  328.1px      neutral  289.5px
 *     with the `Sort` label and the unplaceable chip:  RTH 395.3px
 *     the five-button row it replaces, at RTH:          265.0px
 *
 * So the sixth button costs 74.2px and the worst case is 395.3 of 1,024. AND THE
 * PARENT WRAPS (`flex flex-wrap`, line ~200), so the failure mode was never
 * clipping or a horizontal scrollbar -- it is one earlier line break. The
 * `overflow-hidden` on the group below would only bite if the group alone
 * exceeded the line, and it does not.
 *
 * The method is `DecisionCells.tsx:120-127`, which measured this font at this
 * floor to one decimal and caught a 12.8px overflow that eye-balling passed.
 */
const SORT_KEYS: ReadonlyArray<SortEntry> = [
  { key: 'rank', label: 'Rank', title: "The board's own ranking for this session", column: 'rank' },
  {
    key: 'rvol',
    label: 'RVOL',
    title: 'Relative volume',
    metric: 'session volume against a 20-session baseline',
    /* The head, the chip and the hover all take the board's own quantity. */
    resolveByBoard: rankingQuantity,
    column: 'rvol',
  },
  { key: 'changePct', label: 'Gap', title: '', resolve: baselineLabel, column: 'price' },
  {
    key: 'sessionMove',
    label: 'Move',
    title: '',
    resolve: sessionMoveSortLabel,
    leads: 'MOVE',
    column: 'price',
  },
  /*
   * `Now`, AND IT IS HIS WORD KEPT ON PURPOSE AFTER I ARGUED FOR `TRADES`.
   *
   * The rename argued two things: that the head did not say WHAT the column
   * was, and that it named a TIME where every other head names a QUANTITY. He
   * then directed tooltips on the column names, which answers the first — the
   * hover below carries the quantity and the contrast with RVOL — and ruled
   * `Now` back. **His reason is the one I did not weigh: he sorts by this
   * column because it self-sorts live, so the word names what he is looking
   * for rather than what is stored.**
   *
   * AND THE MEASUREMENT MADE HIS WORD THE MORE ACCURATE ONE, NOT THE MORE
   * FORGIVING. `Now` is currently a slight overclaim — the figure is the last
   * SETTLED minute, 60-120s behind — and the rolling-60s field specified in
   * `design.md` makes it literally true. `TRADES` would have been correct and
   * would have thrown away the word that becomes exact.
   *
   * THE COMMENT SITS OUTSIDE THE BRACE DELIBERATELY. `filters.test.ts:252`
   * enumerates the keys with `/\{\s*key:\s*'(\w+)'/`, so a comment between the
   * brace and `key` drops this entry out of the set that test compares -- and
   * it fails as "no column declared for a sort key", which points at the
   * wiring rather than at the formatting.
   */
  {
    key: 'now',
    label: 'Now',
    title:
      'Trades in the most recent settled minute. Which names are trading heaviest right now, which is a different question from RVOL: that is a ratio against a twenty-session baseline and can stay high on a name that has stopped trading.',
    /* Reads after the label: "sorted by now · trades in the last settled minute". */
    metric: 'trades in the last settled minute',
    column: 'now',
  },
  { key: 'price', label: 'Price', title: 'Last price', column: 'price' },
  { key: 'float', label: 'Float', title: 'Displayed float. Not known for every name.', column: 'float' },
  {
    key: 'setupGrade',
    // Marketing, grade-sort-chip-words-2026-10-06.md (02ec44ab). The last sentence is Commercial's to keep or cut.
    label: 'Setup grade',
    title:
      'Sorted by setup grade: A first, then B, C, D, Not graded. Names showing a dash are last. The grade is the desk\'s reading, not a recommendation.',
    metric: 'setup grade, A first',
    column: 'ticker',
  },
];

/**
 * What the rows a sort cannot place ARE, per key.
 *
 * `unknown` is the honest default: a null float, price or RVOL is the desk
 * admitting it cannot say. IT IS WRONG FOR `sessionMove`, and wrong in the
 * direction this desk keeps paying for.
 *
 * That key's unplaceable set MIXES TWO THINGS. A `NO_PRINT` row is a
 * MEASUREMENT -- this name has not traded this session, which is one of the more
 * informative states on the board -- and a row with no reading at all is a
 * genuine absence. Calling the first "unknown" collapses a measurement into an
 * absence, which is the defect the `state` field on the reading exists to
 * prevent.
 *
 * So the word has to be true of BOTH WITHOUT ASSERTING WHICH: neither has a
 * within-session move to sort on. The distinction still renders where it belongs
 * -- on the row, where `SessionMoveLine` prints `not traded` for `NO_PRINT` and
 * nothing for an absence.
 */
const MISSING_NOUN: Partial<Record<DiscoverySortKey, string>> = {
  sessionMove: 'no move',
  /*
   * NOT 'no trades'. An absent window means the minute was never counted, and
   * a name trading zero times IS counted and sorts as zero. The word has to be
   * true of the unmeasured rows only, which is what this set contains.
   */
  now: 'not measured',
};

/**
 * The setup grade's count has its own words (Marketing, 02ec44ab): it counts the
 * dash rows only, so "no grade" would be false (Not graded also has no letter),
 * and it names the checkpoint, since research missing at one may exist at another.
 */
const SETUP_GRADE_MISSING = {
  text: (n: number) => `${n} showing a dash at this checkpoint`,
  hover:
    'Names with a dash in the Setup grade column: no grade was recorded for them at this checkpoint. Names marked Not graded are not counted here.',
} as const;

/** One reader for every place a sort key's name appears. */
function resolveSortEntry(
  entry: SortEntry,
  phase: SessionPhase | null,
  board: BoardKind,
): { label: string; title: string } {
  if (entry.resolveByBoard) return entry.resolveByBoard(board);
  return entry.resolve ? entry.resolve(phase) : entry;
}

interface DiscoveryBoardProps {
  /** Null until the first market payload arrives — not a fabricated state. */
  discovery: DiscoveryState | null;
  rows: DeskRow[];
  /**
   * The whole board BEFORE the filters (`merged.discovery`), for the moving caption's count only:
   * "{N} names on the board are marked moving" counts the board, not the filter matches (Commercial 18).
   * Absent: `rows`.
   */
  boardRows?: readonly DeskRow[];
  onSelect: (ticker: string) => void;
  selectedTicker: string | null;
  marketOffline: boolean;
  /** Null when the universe is fresh, or when saying so would fire daily. */
  universe: UniverseWarning | null;
  isFocused: (ticker: string) => boolean;
  onToggleFocus: (ticker: string) => void;
  changedTickers: Set<string>;
  /** The `Now` column's 10 s capture state, resolved once in `mergeDesk`. */
  nowCapture: NowCapture;
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
  universe,
  isFocused,
  onToggleFocus,
  changedTickers,
  nowCapture,
  boardRows,
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
  /*
   * The board is passed, not assumed. `discoveryValueFor`'s `rank` case used to
   * read the DAILY rank on every board, so after the bell the server's AH
   * ordering was silently replaced by a Daily RVOL ordering while the rank cell
   * kept printing AH ranks.
   */
  const sortBoard = discovery?.board ?? 'DAILY_RVOL';
  const sorted = sortDiscoveryRows(rows, sort, sortBoard);
  // Top N, then the moving rows below it (his ruling 2026-10-06T14:41:43Z).
  const { rows: visible, extra: moversPast } = visibleWithMovers(sorted, size);
  const sortActive = sort.key !== DISCOVERY_DEFAULT_SORT.key;
  const missing = discoveryMissingCount(rows, sort.key, sortBoard);
  // Read off the entry like every other per-key fact in this component.
  // ALWAYS ON once the float is wired (his ruling 2026-10-05: "always show it, it's key");
  // until then the column appears only while the board is sorted by float, as before.
  const floatWired = rows.some((row) => row.floatBoundWired);
  const showFloat = floatWired || SORT_KEYS.find((entry) => entry.key === sort.key)?.column === 'float';
  // Resolved once: the button, the active marker and the tooltip must never
  // disagree about what the percent change is measured from.
  // Null phase falls to the neutral label rather than guessing a session.
  const phase = discovery?.sessionPhase ?? null;
  /*
   * THE BOARD, NOT THE PHASE, and null falls to the day board -- which is what
   * `afterHours` below already does, so the two cannot disagree about which
   * board is showing before the first payload lands.
   */
  const board: BoardKind = discovery?.board ?? 'DAILY_RVOL';
  // The grade chip exists only once the grade is wired (the board's rows say so).
  const gradeWired = rows.some((row) => row.setupGradeWired);
  const move = baselineLabel(phase);
  /* The head over the trades column and the control that sorts it, one source. */
  const nowEntry = SORT_KEYS.find((entry) => entry.key === 'now');
  const activeEntry = SORT_KEYS.find((entry) => entry.key === sort.key);
  const activeLabel = activeEntry ? resolveSortEntry(activeEntry, phase, board).label : 'rank';
  /*
   * The headline percentage follows the sort -- his ruling, 2026-09-22 -- and
   * the decision is READ OFF THE ACTIVE ENTRY rather than tested against a key
   * name here. Same single-source rule the labels already obey.
   */
  const lead = activeEntry?.leads ?? 'GAP';
  /*
   * The `Now` head, hover and caption follow the capture state: `last 10s`,
   * `not live`, or the settled minute's own copy before the capture answers.
   */
  const nowCopy = nowColumnCopy(nowCapture);
  const activeMetric = sortActive
    ? ((activeEntry?.key === 'now' ? nowCopy.metric : undefined) ?? activeEntry?.metric)
    : undefined;
  const activeColumn = activeEntry?.column;

  /*
   * RESIZABLE COLUMNS, DISCOVERY ONLY. His ruling, 2026-09-29T02:41:45Z:
   * *"2 yes discovery only"* -- drag any column edge, remembered in this
   * browser. The order here is the order of the <col>s and the headers below,
   * and the width model (`lib/dashboard/columnWidths.ts`) holds every guardrail:
   * never narrower than the sorted header, never a horizontal scroll, Why and
   * Risk take the rest.
   */
  const columns: DiscoveryColumnKey[] = [
    'mark',
    'ticker',
    'price',
    'rvol',
    'now',
    ...(showFloat ? (['float'] as const) : []),
    'why',
    'risk',
    'cycle',
  ];
  const {
    attachBox,
    widths: columnWidths,
    measureHead,
    handle: columnHandle,
    customised: widthsCustomised,
    resetAll: resetWidths,
  } = useColumnWidths(columns);
  /* The head's accessible name; the head itself reads the same entry inline. */
  const nowLabel = nowEntry ? resolveSortEntry(nowEntry, phase, board).label : 'Now';

  function changeSort(key: DiscoverySortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : // Rank reads best ascending — #1 first. Everything else a trader
          // sorts by, they want the largest of first.
          { key, direction: key === 'rank' || key === 'setupGrade' ? 'asc' : 'desc' },
    );
  }

  /*
   * The board changes with the session, and says so.
   *
   * At 16:30 the columns and the title both have to make it obvious that this
   * is post-close activity. A board that still reads DISCOVERY / Daily RVOL
   * after the bell implies the ranking means something it no longer means.
   */
  const afterHours = discovery?.board === 'AFTER_HOURS';
  const frozen = discovery?.sessionPhase === 'POST_MARKET';
  // Counted over the rows the board holds (filters applied), not the Top N:
  // the point is to say a mover exists when the cut is hiding it.
  const movers = afterHours ? null : movingCaption(boardRows ?? rows, { size, extra: moversPast });

  return (
    <section className="border-b border-line bg-desk px-4 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
          {afterHours ? 'After-Hours Discovery' : 'Discovery'}
        </h2>
        <span className="text-[11px] text-ink-3">
          {discovery
            ? afterHours
              ? `AH participation rank · $${discovery.priceMin}–$${discovery.priceMax}`
              : `Daily RVOL rank · $${discovery.priceMin}–$${discovery.priceMax}`
            : 'Ranking not loaded'}
          {movers ? (
            <span className="text-accent" title={movers.title}>
              {' '}
              · {movers.text}
            </span>
          ) : null}
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
            title={
              discovery
                ? `The board's own order for this session is ${discovery.rankingLabel}. You are overriding it. Choose Rank to return.`
                : 'You are overriding the board order. Choose Rank to return.'
            }
          >
            sorted by {activeLabel.toLowerCase()}
            {activeMetric ? (
              /*
               * THE UNITS, BESIDE THE SORT RATHER THAN IN A HOVER.
               *
               * He sorted by NOW and asked what it was sorting: the column
               * header has room for `−1m` and not for `trades`, so the
               * quantity was nowhere on screen. It is stated here, where a
               * reader is already looking when they change the order.
               */
              <span className="font-normal tracking-normal normal-case text-ink-3">
                {' '}
                · {activeMetric}
              </span>
            ) : null}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          {/*
            * A COUNT OR NOTHING. It rendered "0 eligible · 0 tracked" from a
            * placeholder — a measurement, stated, from no measurement — and
            * zero is the most confident-looking null there is.
            */}
          <span className="num text-[11px] text-ink-3">
            {discovery
              ? `${discovery.eligibleCount.toLocaleString()} eligible · ${discovery.trackedCount.toLocaleString()} tracked`
              : 'counts not loaded'}
          </span>

          {/*
            * ON THE COUNTS IT INVALIDATES.
            *
            * A stale universe makes those numbers YESTERDAY'S, so the caveat
            * belongs on them rather than in a corner of the chrome — a caveat
            * belongs on the thing it qualifies.
            *
            * Deliberately not folded into the market light: that answers "is
            * the feed working", and here the feed is healthy and delivering
            * correct data about the WRONG SET OF NAMES.
            *
            * Loud on purpose, and the silent states are what pay for it. This
            * fires only on a defect, so it can afford weight a daily signal
            * could not. NO DISMISSAL AND NO TIMER: the failure lasts the whole
            * session, and a marker dismissed at 06:55 is gone by 07:15 when the
            * name he missed is running. It clears when the universe refreshes
            * and on nothing else.
            */}
          {universe ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-sm border border-neg/45 bg-neg/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-neg uppercase"
              title={universe.detail}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-neg" />
              {universe.headline}
              {universe.asOf ? (
                // The as-of, so the claim is CHECKABLE rather than trusted.
                <span className="num font-normal normal-case opacity-90">
                  · universe from {universe.asOf}
                </span>
              ) : null}
            </span>
          ) : null}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink-3">Sort</span>
            <div className="flex overflow-hidden rounded-sm border border-line-2">
              {SORT_KEYS.filter((entry) => entry.key !== 'setupGrade' || gradeWired).map((entry) => {
                const active = entry.key === sort.key;
                const resolved = resolveSortEntry(entry, phase, board);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-pressed={active}
                    // The `Now` hover follows the capture, as its head does.
                    title={(entry.key === 'now' ? nowCopy.title : undefined) ?? resolved.title}
                    onClick={() => changeSort(entry.key)}
                    className={`min-h-[24px] border-r border-line-2 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
                      active
                        ? 'bg-accent/15 text-accent'
                        : 'bg-panel-2 text-ink-3 hover:bg-panel-3 hover:text-ink-2'
                    }`}
                  >
                    {resolved.label}
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
                title={
                  sort.key === 'setupGrade'
                    ? SETUP_GRADE_MISSING.hover
                    : `${missing} of ${rows.length} rows have no value for this sort and are listed last, in both directions. The board shows the first ${size}, so a row listed last may not be on screen at all.`
                }
              >
                {sort.key === 'setupGrade'
                  ? SETUP_GRADE_MISSING.text(missing)
                  : `${missing} ${MISSING_NOUN[sort.key] ?? 'unknown'}`}
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
          {/*
            * Only when there is something to reset. A control that does
            * nothing on the default board is a row of chrome for a no-op.
            */}
          {widthsCustomised ? (
            <button
              type="button"
              onClick={resetWidths}
              title="Put every column back to its default width"
              className="min-h-[24px] rounded-sm border border-line-2 bg-panel-2 px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase transition-colors hover:bg-panel-3 hover:text-ink-2"
            >
              Reset widths
            </button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 bg-panel px-3 py-4 text-[12px] text-ink-2">
          {discovery === null
            ? // FIRST, ahead of every other branch. With no payload the desk has
              // observed nothing, so it may claim nothing — and `marketOffline`
              // below is itself derived from a placeholder in that state, which
              // is how "Market feed is not running" reached a healthy desk.
              'Waiting for the first market payload.'
            : marketOffline
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
        <div ref={attachBox}>
        <table className="w-full table-fixed border-collapse border-t border-line">
          <caption className="sr-only">
            {afterHours ? 'After-hours discovery' : 'Discovery'} board
            {discovery ? `, ranked by ${discovery.rankingLabel}` : ''}. Use the arrow keys to move
            between rows and Enter to open a ticker.
          </caption>
          {/*
            * THE WIDTHS LIVE HERE, NOT ON THE HEADERS. Until the table has been
            * measured once, each column takes today's fixed width and Why and
            * Risk split the rest, so the first paint is the board as it was.
            * (After the caption: a caption must be a table's first child.)
            */}
          <colgroup>
            {columns.map((key) => {
              const width = columnWidths?.[key] ?? DEFAULT_WIDTHS[key];
              return <col key={key} style={width === null ? undefined : { width }} />;
            })}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-panel-2">
            <tr>
              <Th srOnly>Changed</Th>
              {/*
                * THERE IS NO RANK COLUMN. HIS RULING, 2026-09-25: *"I'm making
                * the call to remove the rank column. Allow the user to rank it
                * however they want to with the data sorts provided."*
                *
                * IT DISSOLVES A PROBLEM RATHER THAN ANSWERING IT. The open
                * question was what `Rank` should mean once he narrows the
                * price window -- the engine ranks over everything that
                * qualifies, so a narrowed view would read 1, 4, 7, 12. Every
                * answer available was a compromise; removing the column
                * removes the question, and it removes the defect that came
                * before it too: a leftmost column announcing an order the rows
                * were not in, which he read as "random" twice.
                *
                * THE ORDERING IS NOT LOST, ONLY THE DISPLAY. `rankByRvol`
                * (`rvol.ts:134`) sorts descending on `rvol` with an
                * alphabetical tie-break, so RANK ASCENDING IS RVOL DESCENDING
                * -- the same ordering, still one chip away. **And the `Rank`
                * SORT survives deliberately: after the bell it is the only
                * route to AH-participation order, because `discoveryValueFor`
                * is board-aware on `rank` and NOT on `rvol`.** Removing the
                * chip with the column would have left the evening board with
                * no way back to its own ordering.
                */}
              <Th
                name="Ticker"
                resize={columnHandle('ticker')}
                measureHead={measureHead('ticker')}
                sorted={activeColumn === 'ticker'}
              >
                Ticker
              </Th>
              {/*
                 * `move.label`, NOT a typed "Move".
                 *
                 * The sort control read `Gap` in premarket while this header,
                 * over the same number, read `Move` -- two hand-written words
                 * for one quantity, and they had already drifted apart on his
                 * live board. He questioned a row and both numbers on it were
                 * correct: `+18.1%` against YESTERDAY'S CLOSE, `+0.0%` beneath
                 * it against TODAY'S PM VWAP. Two denominators, and the row
                 * named neither. `Gap` names one of them in the desk's own
                 * word, at zero width -- it is shorter than `Move`.
                 */}
              <Th
                name={`Price, ${move.label}, VWAP`}
                resize={columnHandle('price')}
                measureHead={measureHead('price')}
                sorted={activeColumn === 'price'}
                title={priceColumnTitle(phase)}
              >
                Price · {move.label} · VWAP
              </Th>
              {/*
                * THE RANKING QUANTITY, WHICH IS NOT THE SAME ONE ALL DAY.
                *
                * Read off `rankingQuantity(board)` so the head, the sort chip
                * and the hover cannot say three things. After the bell this
                * is `PART` -- the evening board ranks on after-hours
                * participation, and Daily RVOL is the STALE number then: it
                * stops moving at 16:00 and still carries what the day earned.
                */}
              <Th
                name={rankingQuantity(board).label}
                resize={columnHandle('rvol')}
                measureHead={measureHead('rvol')}
                align="right"
                sorted={activeColumn === 'rvol'}
                title={rankingQuantity(board).title}
              >
                {rankingQuantity(board).label}
              </Th>
              {/*
               * Beside RVOL deliberately: this is the CORRECTION to it.
               *
               * RVOL is cumulative and never decays within a session, so at
               * 10:00 a name that ran at 07:15 and died still carries a large
               * number. Putting the "now" measure anywhere else would leave the
               * two readings to be joined by the trader mid-scan.
               */}
              {/*
               * THE HEAD IS READ OFF `SORT_KEYS`, NOT TYPED HERE.
               *
               * Same repair as `move.label` on the price head: a hand-written
               * word over a column and a second hand-written word on the
               * control that sorts it are two spellings of one quantity, and
               * on this board they have already drifted apart once.
               *
               * MEASURED, NOT SIZED BY ARITHMETIC. Geist 600 at 11px with the
               * head's `0.08em` tracking, uppercased as the cell renders it,
               * on the live board at the 1,024px floor:
               *
               *     NOW  29.5px     NOW ▼  45.3px
               *
               * `px-2` each side costs 16, so the SORTED head needs 61.3px —
               * and `w-[44px]`, which this column carried for its whole life,
               * was 17px short of its own word whenever it was the active
               * sort. **The overflow was invisible because a fixed table cell
               * does not clip: the caret simply leaned into `RVOL`.** 68 leaves
               * 6.7px. The 16px this costs `Why` and `Risk` (183 -> 175) buys
               * a head that fits in the state he looks at it in.
               */}
              <Th
                name={`${nowLabel}, ${nowCopy.sub}`}
                resize={columnHandle('now')}
                measureHead={measureHead('now')}
                align="right"
                sorted={activeColumn === 'now'}
                title={nowCopy.title ?? nowEntry?.title}
              >
                {nowEntry ? resolveSortEntry(nowEntry, phase, board).label : 'Now'}
                {/*
                  * The lag, on the header rather than in the tooltip alone.
                  * The newest slot is two minutes old and he discovered that
                  * by hovering. §10 rules out hover-only, and this column was
                  * on the wrong side of a rule already enforced on the Move
                  * control. The span stays in the title -- this is the offset,
                  * which is the part that changes how the bars are read.
                  */}
                <span className="block text-[9px] font-normal tracking-normal normal-case text-ink-3">
                  {nowCopy.sub}
                </span>
              </Th>
              {showFloat ? (
                <Th
                  name="Float"
                  resize={columnHandle('float')}
                  measureHead={measureHead('float')}
                  align="right"
                  sorted={activeColumn === 'float'}
                  // Wired, the column is the SEC bound, and COLUMN_TITLE.float (the vendor's figure, "actually
                  // available to trade") is false of it: v25's header-or-legend line instead.
                  title={floatWired ? FLOAT_LEGEND : COLUMN_TITLE.float}
                >
                  Float
                </Th>
              ) : null}
              <Th
                name="Why"
                resize={columnHandle('why')}
                measureHead={measureHead('why')}
                title={COLUMN_TITLE.why}
              >
                Why
              </Th>
              <Th
                name="Risk"
                resize={columnHandle('risk')}
                measureHead={measureHead('risk')}
                title={COLUMN_TITLE.risk}
              >
                Risk
              </Th>
              <Th
                name="Cycle"
                resize={columnHandle('cycle')}
                measureHead={measureHead('cycle')}
                title={COLUMN_TITLE.cycle}
              >
                Cycle
              </Th>
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
                priceMin={discovery?.priceMin ?? null}
                priceMax={discovery?.priceMax ?? null}
                afterHours={afterHours}
                showFloat={showFloat}
                phase={discovery?.sessionPhase ?? null}
                dateShown={discovery?.tradingDate ?? null}
                lead={lead}
                activeColumn={activeColumn}
              />
            ))}
          </tbody>
        </table>
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-ink-3">
        {afterHours ? (
          <>
            AH Participation = volume since the {discovery.rthClose} ET close ÷ average volume over
            the previous 20 eligible full sessions. It is deliberately not Daily RVOL: the
            numerator is one evening, not a trading day. High rank means abnormal after-hours
            participation worth investigating. It is not a trade, a catalyst, or a clean structure.
          </>
        ) : (
          <>
            Daily RVOL = cumulative session volume ÷ average volume over the previous 20 eligible
            full sessions. High rank means abnormal participation worth investigating. It is not
            a trade, a catalyst, or a clean structure.
          </>
        )}
      </p>
      {/* The standing legend, once per board, verbatim (Marketing v3, Commercial-passed). */}
      {floatWired ? <p className="mt-1.5 text-[11px] text-ink-3">{FLOAT_LEGEND}</p> : null}
      {rows.some((row) => row.setupGradeWired) ? (
        <p className="mt-1.5 text-[11px] text-ink-3">{SETUP_GRADE_LEGEND}</p>
      ) : null}
    </section>
  );
}

function Th({
  children,
  className = '',
  align,
  srOnly = false,
  sorted = false,
  title,
  name,
  resize,
  measureHead,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'right';
  srOnly?: boolean;
  /** The column the board is ordered by right now. */
  sorted?: boolean;
  title?: string;
  /**
   * The header's name as a reader says it. Given whenever the header carries a
   * resize handle, so the handle's own label is not read as part of the
   * column's name.
   */
  name?: string;
  /** The drag handle, once the table has been measured. */
  resize?: ColumnHandle | null;
  /** Where the sorted-state width of this header is measured. */
  measureHead?: (element: HTMLElement | null) => void;
}) {
  return (
    <th
      scope="col"
      aria-sort={sorted ? 'descending' : undefined}
      aria-label={name}
      title={title}
      /*
       * THE SORTED COLUMN IS MARKED IN THE TABLE, NOT ONLY ABOVE IT.
       *
       * A `sorted by now` badge already sat in the toolbar and he still read
       * the board as unsorted — because the RANK column is the first thing the
       * eye lands on and it was showing 3, 2, 21, 8, 5. The order is in the
       * table, so the marker has to be too.
       */
      className={`group/head relative border-b px-2 py-1 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${
        sorted
          ? 'border-accent/60 bg-accent/10 text-accent'
          : 'border-line-2 bg-panel-2 text-ink-3'
      } ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      {srOnly ? <span className="sr-only">{children}</span> : children}
      {sorted && !srOnly ? <span aria-hidden="true"> ▼</span> : null}
      {measureHead ? (
        /*
         * THE HEADER AS IT RENDERS WHEN SORTED, caret included, laid out off
         * to the side at its natural width. This is what a column may never be
         * dragged narrower than -- the `Now` head once sat 17 px short of its
         * own word in exactly this state -- and it is measured rather than
         * typed because the labels change with the session.
         */
        <span
          ref={measureHead}
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-0 left-0 w-max"
        >
          {children}
          <span> ▼</span>
        </span>
      ) : null}
      {resize ? <ColumnResizeHandle label={(name ?? '').split(',')[0]} {...resize} /> : null}
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
  phase,
  dateShown,
  lead,
  activeColumn,
}: {
  row: DeskRow;
  selected: boolean;
  changed: boolean;
  onSelect: (ticker: string) => void;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  /** Null until the first market payload arrives. */
  priceMin: number | null;
  priceMax: number | null;
  afterHours: boolean;
  showFloat: boolean;
  phase: SessionPhase | null;
  /** The board's own date (YYYY-MM-DD): what the float's 90-day rule is measured from. */
  dateShown: string | null;
  lead: 'GAP' | 'MOVE';
  /** Which column the board is ordered by, so the accent can follow it. */
  activeColumn?: string;
}) {
  const demand = row.demand;
  // One projection for every surface: whatever the Focus strip shows for this
  // ticker, this row shows the same numbers from the same object.
  const t = row.telemetry;
  const conclusions = resolveConclusions(row);

  /*
   * The high the label is measured from, and the live price beside it.
   *
   * `max(cycleHigh, sessionHigh)` makes "now above high" structurally
   * impossible — the contradiction that started this. The label override fires
   * only when today's high actually beat the arc.
   */
  const cycle = row.intelligence?.analysis?.dossier?.computedCycle ?? null;
  const high = highReading(
    cycle?.current ?? null,
    cycle?.todayStart ?? null,
    t.sessionHigh,
    t.price,
    t.spread,
  );
  /*
   * THE VERDICT WORD GOES WHEN THE PAIR DOES, AND IT IS THE HALF THAT MATTERS.
   *
   * `UNVERIFIABLE` means the settled phase's RELEVANCE is unknown, not that
   * today did not start a cycle. Its inputs are intact -- `daily_bars` survives
   * a restart -- so the phase is a correct answer about a run that may be over,
   * and correctness about THEN is what makes it tempting to leave standing.
   * Leaving it standing is how a day-one frontside read BACKSIDE in red at rank
   * three.
   */
  const priorOnly = high?.kind === 'PRIOR_ONLY';
  /*
   * Label, tone and tooltip from ONE decision, shared with the researched
   * table. The two built this badge separately and disagreed on three of four
   * shared tickers on the live board -- see `cycleBadge`.
   */
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
  const risk = resolveRisk(row);
  const why = resolveWhy(row);
  /*
   * THE ROW'S READING, the same object the sort reads (`mergeDesk` resolves it
   * once). `MINUTE` and `FALLBACK` both print the settled minute; the
   * difference is that under a live capture it is muted and says `/min`, so
   * the number always means "the last 10 s" or says that it does not.
   */
  const nowReading = nowReadingOf(row);
  const tradesNow = nowReading.kind === 'NOT_LIVE' ? null : nowReading.count;
  const ah = demand?.afterHours ?? null;
  const retention = retentionNote({
    latched: (afterHours ? ah?.latched : demand?.latched) ?? false,
    price: t.price,
    priceMin,
    priceMax,
  });
  const moving = movingNote(row);

  /*
   * One saturated colour per row, by precedence.
   *
   * A halt outranks a backside cycle, which outranks a blue-sky crossing. The
   * board previously coloured every one of them at once, which is how six rows
   * produced a wall of amber and red in which nothing stood out.
   */
  const halted = t.haltState === 'HALTED' || t.haltState === 'RESUMING';
  const backside = conclusions.cycle.tone === 'neg';

  /*
   * THE ANNOUNCEMENT SAYS WHAT THE ROW SHOWS, AND IT USED TO SAY THE RANK.
   *
   * With the rank column gone, reading "rank 7" to a screen reader would
   * announce a number no sighted user can see -- the two surfaces saying
   * different things about the same row, which is the defect this desk keeps
   * finding in other clothes. RVOL replaces it: it is the quantity the board
   * ranks ON, it is rendered in its own column, and position in the list is
   * already carried by the table itself.
   */
  return (
    <tr
      {...rowKeyboardProps(
        `${row.ticker}${moving ? ', moving' : ''}, ${afterHours ? 'after-hours participation' : 'RVOL'} ${formatMultiple(
          afterHours ? (ah?.participation ?? null) : t.rvol,
        )}. ${whySpoken(why)}. ${risk.label}. Open dossier.`,
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

      <td className="px-2 py-1 align-middle">
        <TickerCell
          ticker={row.ticker}
          focused={focused}
          onToggleFocus={onToggleFocus}
          stale={t.stale}
          ageSeconds={t.ageSeconds}
          retention={retention}
          setupGrade={row.setupGradeWired ? row.setupGrade : undefined}
          setupGradeNoneRecorded={row.setupGradeNoneRecorded}
          companyHint={
            companyLine({
              dossier: row.intelligence?.analysis?.dossier ?? null,
              sheetName: row.researchRecord?.company,
              sheetCountry: row.research?.country,
            }).hint
          }
        />
        {moving ? (
          /*
           * ITS OWN LINE, UNDER THE TICKER. Beside it, "HDSN MOVING" measured
           * 101 px in a 96 px cell at the 1,024 floor and a wide four-letter
           * ticker reached 118, into the price column. A mover row is shorter
           * than a ranked one (no catalyst line), so the line costs no height.
           *
           * NEUTRAL, NOT GREEN: the word says why the row is here; direction is
           * the price cell's job. Plain text, so it never reads as a chip.
           */
          <span
            className="block text-[9px] leading-tight font-semibold tracking-wide whitespace-nowrap text-accent uppercase"
            title={moving.title}
          >
            {moving.label}
          </span>
        ) : null}
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
          phase={phase}
          lead={lead}
          sorted={activeColumn === 'price'}
        />
      </td>

      <td className="px-2 py-1 text-right align-middle">
        <RvolCell telemetry={t} participation={afterHours ? (ah?.participation ?? null) : null} />
      </td>

      <td className="px-1 py-1 text-right align-middle">
        {/*
          * STACKED, NOT WIDENED, AND THE MEASUREMENT IS WHY.
          *
          * Putting the number beside the bars needed 72px against the 36px
          * this column had. Measured on the live board at the 1,024px floor:
          * the table is 982px inside a 1,014px container, so there are 32px of
          * headroom and a side-by-side layout would have spent 36 — four px
          * past the point where §10's "zero horizontal scrolling at the floor"
          * stops being true. It would have looked fine at my own width.
          *
          * The row is 57px and this cell uses 25, so a second line costs
          * nothing that exists. The number goes ABOVE the bars because the
          * number is the answer and the bars are the shape of it.
          */}
        <span className="flex flex-col items-end gap-0.5">
          {/*
            * THE NUMBER THE SHAPE COULD NOT GIVE HIM.
            *
            * The sparkline already showed trades per minute and answered
            * "is it moving"; it cannot answer "which of these two is busier",
            * which is what he asked for. Same array, its last settled slot.
            *
            * NULL RENDERS AS AN EM DASH, NEVER AS 0. An unobserved minute and
            * a minute with no trades are different facts, and 0 is a
            * measurement this row does not have.
            */}
          <span
            className={`num text-[11px] leading-none tabular-nums ${
              nowReading.kind === 'FALLBACK' ? 'text-ink-3' : 'text-ink-2'
            }`}
            title={nowCellTitle(nowReading)}
          >
            {/*
              * THE INTEGER, NOT A COMPACTED ONE. `formatCount` renders 2,979
              * as "3K" and 1,309 as "1K" -- which collapses exactly the
              * comparison this column exists to make. The range is 0 to a few
              * thousand, so the full number costs one character.
              */}
            {tradesNow === null ? '—' : tradesNow.toLocaleString()}
            {/*
              * THE UNIT, ON THE ROW, only where the grain differs from the
              * head's. A minute figure under `last 10s` is ~6x a 10 s figure
              * for the same activity; printed bare it would read as the
              * busiest name on the board.
              */}
            {nowReading.kind === 'FALLBACK' && tradesNow !== null ? (
              <span className="text-[9px]">/min</span>
            ) : null}
          </span>
          {nowReading.kind === 'LIVE' ? (
            <NowSparkline buckets={nowReading.buckets} spreadPct={t.spreadPct} />
          ) : nowReading.kind === 'NOT_LIVE' ? null : (
            <ActivitySparkline
              window={row.demand?.activityWindow}
              price={row.demand?.priceWindow}
              spreadPct={t.spreadPct}
            />
          )}
        </span>
      </td>

      {showFloat ? (
        // Present once the float is wired; before that only while the board is sorted by float. A sort whose column
        // is not on screen leaves the trader unable to see why the order is
        // what it is; a permanent column would spend width the eight-field
        // board does not have.
        <td className="num px-2 py-1 text-right align-middle">
          {row.floatBoundWired ? (
            <FloatCell bound={row.floatBound} dateShown={dateShown} />
          ) : row.displayedFloat === null ? (
            /*
             * Three outcomes, and collapsing any two would lose the finding.
             *
             * A REFUSED float renders as the verdict, never as the number with
             * a mark beside it — `6,109 ⚠` still scans AS 6,109, and the mark
             * is exactly what a scanning eye drops. The digits appear only in
             * the hover, as the evidence FOR the verdict rather than as a
             * reading.
             *
             * A missing float stays "unknown". Rendering a detection as an
             * absence would make the strongest structural finding on the board
             * look identical to never having looked.
             */
            row.floatAssessment && row.floatAssessment.verdict !== 'CONSISTENT' ? (
              <span
                className="text-[11px] font-semibold text-neg"
                title={`Float refused: ${row.floatAssessment.detail}. The number is not used for sorting or turnover.`}
              >
                {row.floatAssessment.verdict === 'IMPOSSIBLE' ? 'impossible' : 'units?'}
              </span>
            ) : (
              <span className="text-[11px] text-warn" title="No float on file for this name.">
                unknown
              </span>
            )
          ) : (
            <span
              className="text-[12px] text-ink"
              title={
                row.floatAssessment
                  ? `Checked against the share count stated beside it: ${row.floatAssessment.detail}.`
                  : 'The Sheet states no share count beside this float, so it is unchecked.'
              }
            >
              {formatCount(row.displayedFloat)}
            </span>
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
          {priorOnly || !badge ? null : (
            <StatusBadge
              label={badge.label}
              tone={badge.tone as Tone}
              title={badge.title}
              className="max-w-full"
            />
          )}
          {/*
            * TWO PRICES, NOT A PERCENTAGE — his ruling: "dont do a percentage,
            * it's deceptive". A ratio hides its denominator; two prices carry
            * theirs, and he does the arithmetic he trades on.
            *
            * ON A SECOND LINE because it does not fit in the chip: measured
            * against the real font, "OFF HIGH · $0.4210 → $0.3890" is 156px
            * against a 122px badge budget, and the badge TRUNCATES rather than
            * pushing — it would have silently cut the prices. Here the budget is
            * the full 136px and the worst realistic case measures 109.5px.
            *
            * COSTS NO ROW HEIGHT: the row is 65px, this cell used 19, and the
            * Risk cell beside it already uses 56.
            */}
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
