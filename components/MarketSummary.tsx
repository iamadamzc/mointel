'use client';

import type { BoardCounts } from '@/lib/dashboard/boardCounts';
import type { CycleFilter, FilterState, StructureFilter } from '@/lib/dashboard/view';

interface MarketSummaryProps {
  /**
   * Each number is the rows on the main board its chip keeps when clicked,
   * counted over the whole board (`lib/dashboard/boardCounts.ts`).
   */
  counts: BoardCounts;
  /** Number of names currently visible after filtering. */
  visibleCount: number;
  filtered: boolean;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /** The filter controls, rendered on the same line as the counts. */
  children?: React.ReactNode;
}

interface Segment {
  key: string;
  label: string;
  value: number;
  tone: string;
  hint: string;
  /** Applying this segment as a filter, when it maps to one. */
  apply?: (filters: FilterState) => FilterState;
  active?: (filters: FilterState) => boolean;
}

/**
 * The session in one line.
 *
 * This replaces six tiles in a full-width band roughly 78px tall: six numbers
 * that could not be clicked, five of which were literal string matches on a
 * spreadsheet cell, and a seventh tile that appeared when a filter was applied
 * and shoved the other six sideways. The same counts now sit on one 26px row,
 * each one is the filter it describes, and the filtered count has a reserved
 * slot so nothing reflows when it appears.
 */
export function MarketSummary({
  counts,
  visibleCount,
  filtered,
  filters,
  onChange,
  children,
}: MarketSummaryProps) {
  const segments: Segment[] = [
    {
      key: 'tracked',
      label: 'ranked',
      value: counts.onBoard,
      tone: 'text-ink',
      // The board shows the top 12, 25 or 50 of this list; the number is the
      // whole ranked list, so it is not worded as "on the board". Not "right now":
      // the strip also sits over a frozen checkpoint (Marketing, 73cdc4bc). This
      // segment has no click, so its hint is shown whole and ends in a full stop.
      hint: 'Names in the ranking at the time shown. The board shows the top 12, 25 or 50 of them.',
    },
    /*
     * EVERY NUMBER HERE IS WHAT ITS CLICK KEEPS. They are computed by running
     * the click's own predicate over the whole board, so a count and the filter
     * it describes cannot read different populations or different meanings.
     */
    {
      key: 'day-one',
      label: 'day 1',
      value: counts.dayOne,
      tone: 'text-pos',
      hint: 'The move began today',
      apply: (current) => ({ ...current, cycle: toggle(current.cycle, 'DAY_1') as CycleFilter }),
      active: (current) => current.cycle === 'DAY_1',
    },
    {
      key: 'frontside',
      label: 'frontside',
      value: counts.frontside,
      tone: 'text-pos',
      hint: 'Still making the cycle high',
      apply: (current) => ({
        ...current,
        cycle: toggle(current.cycle, 'FRONTSIDE') as CycleFilter,
      }),
      active: (current) => current.cycle === 'FRONTSIDE',
    },
    {
      key: 'backside',
      label: 'backside',
      value: counts.backside,
      tone: 'text-neg',
      hint: 'Half the move or more given back, still in play',
      apply: (current) => ({
        ...current,
        cycle: toggle(current.cycle, 'BACKSIDE') as CycleFilter,
      }),
      active: (current) => current.cycle === 'BACKSIDE',
    },
    {
      key: 'dirty',
      label: 'dirty float',
      value: counts.dirtyFloat,
      tone: 'text-neg',
      hint: 'Structure or float reads DIRTY FLOAT',
      apply: (current) => ({
        ...current,
        structure: toggle(current.structure, 'DIRTY') as StructureFilter,
      }),
      active: (current) => current.structure === 'DIRTY',
    },
    {
      key: 'catalyst',
      label: 'fresh catalyst',
      value: counts.freshCatalyst,
      tone: 'text-pos',
      /*
       * THE HINT SAID `Catalyst graded A` AND THE CHIP SAID `fresh catalyst`.
       *
       * Those are different quantities: the grade is how STRONG a catalyst is
       * and freshness is a separate field, so an A-graded stale catalyst
       * passed this filter and a genuinely fresh B did not. The predicate now
       * matches the word — and matches the COLOUR in the Why column, which is
       * what he reads green as.
       */
      hint: 'The desk found a catalyst and it is FRESH: the green rows in Why',
      apply: (current) => ({ ...current, catalyst: current.catalyst === 'FRESH' ? 'ALL' : 'FRESH' }),
      active: (current) => current.catalyst === 'FRESH',
    },
  ];

  return (
    <div className="flex min-h-[26px] items-center gap-x-1 overflow-x-auto border-b border-line bg-panel px-4 py-1">
      {segments.map((segment) => {
        const active = segment.active?.(filters) ?? false;
        const content = (
          <>
            <span className={`num text-[13px] font-semibold ${segment.tone}`}>{segment.value}</span>
            <span className="text-[11px] text-ink-3">{segment.label}</span>
          </>
        );

        if (!segment.apply) {
          return (
            <span
              key={segment.key}
              title={segment.hint}
              className="inline-flex shrink-0 items-baseline gap-1 rounded-sm px-1.5 py-0.5"
            >
              {content}
            </span>
          );
        }

        return (
          <button
            key={segment.key}
            type="button"
            aria-pressed={active}
            title={`${segment.hint}. Click to show only these names.`}
            onClick={() => onChange(segment.apply!(filters))}
            className={`inline-flex min-h-[24px] shrink-0 items-baseline gap-1 rounded-sm px-1.5 py-0.5 transition-colors hover:bg-panel-3 ${
              active ? 'bg-accent/15 ring-1 ring-accent/40' : ''
            }`}
          >
            {content}
          </button>
        );
      })}

      {children}

      {/* Reserved, so applying a filter never reflows the row. */}
      <span className="ml-auto inline-flex min-w-[132px] shrink-0 items-baseline justify-end gap-1 pl-3">
        {filtered ? (
          <>
            <span className="num text-[13px] font-semibold text-accent">{visibleCount}</span>
            <span className="text-[11px] text-accent">matching filter</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

function toggle(current: string, value: string): string {
  return current === value ? 'ALL' : value;
}
