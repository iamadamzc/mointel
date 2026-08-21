'use client';

import type { MarketSummary as MarketSummaryData } from '@/lib/data/types';
import type { CycleFilter, FilterState, StructureFilter } from '@/lib/dashboard/view';

interface MarketSummaryProps {
  summary: MarketSummaryData;
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
  summary,
  visibleCount,
  filtered,
  filters,
  onChange,
  children,
}: MarketSummaryProps) {
  const segments: Segment[] = [
    {
      key: 'tracked',
      label: 'tracked',
      value: summary.namesTracked,
      tone: 'text-ink',
      hint: 'Researched names the desk is carrying today',
    },
    {
      key: 'fresh',
      label: 'fresh',
      value: summary.freshFrontside,
      tone: 'text-pos',
      hint: 'Cycle reads FRESH / FRONTSIDE',
      apply: (current) => ({ ...current, cycle: toggle(current.cycle, 'FRESH') as CycleFilter }),
      active: (current) => current.cycle === 'FRESH',
    },
    {
      key: 'warning',
      label: 'warning',
      value: summary.frontsideWarning,
      tone: 'text-warn',
      hint: 'Cycle reads FRONTSIDE — WARNING',
      apply: (current) => ({
        ...current,
        cycle: toggle(current.cycle, 'WARNING') as CycleFilter,
      }),
      active: (current) => current.cycle === 'WARNING',
    },
    {
      key: 'backside',
      label: 'backside',
      value: summary.backside,
      tone: 'text-neg',
      hint: 'Cycle reads BACKSIDE',
      apply: (current) => ({
        ...current,
        cycle: toggle(current.cycle, 'BACKSIDE') as CycleFilter,
      }),
      active: (current) => current.cycle === 'BACKSIDE',
    },
    {
      key: 'dirty',
      label: 'dirty float',
      value: summary.dirtyFloat,
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
      value: summary.strongCatalysts,
      tone: 'text-pos',
      hint: 'Catalyst graded A',
      apply: (current) => ({ ...current, catalyst: current.catalyst === 'A' ? 'ALL' : 'A' }),
      active: (current) => current.catalyst === 'A',
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
            title={`${segment.hint}. Click to filter the researched list.`}
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
