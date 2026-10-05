'use client';

import type {
  CatalystFilter,
  CycleFilter,
  FilterState,
  GradeFilter,
  SetupGradeFilter,
  StructureFilter,
} from '@/lib/dashboard/view';
import { SETUP_GRADE_FILTERS } from '@/lib/dashboard/setupGrade';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  isActive: boolean;
  /** False while the grade is not wired: its filter would hide every row. */
  setupGradeWired: boolean;
}

interface OptionGroupProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; title?: string }>;
  onSelect: (value: T) => void;
}

/**
 * One filter dimension.
 *
 * A radio group, and announced as one. These were eight unrelated buttons with
 * no pressed state, so assistive technology could not say which option was
 * active — and the A/B/C chips measured 21×23px, under the 24px minimum target
 * size.
 */
function OptionGroup<T extends string>({ label, value, options, onSelect }: OptionGroupProps<T>) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        id={`filter-${label.toLowerCase()}`}
        className="text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase"
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`filter-${label.toLowerCase()}`}
        className="flex overflow-hidden rounded-sm border border-line-2"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.title}
              onClick={() => onSelect(option.value)}
              className={`min-h-[24px] min-w-[26px] border-r border-line-2 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'bg-panel-2 text-ink-3 hover:bg-panel-3 hover:text-ink-2'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterBar({ filters, onChange, onReset, isActive, setupGradeWired }: FilterBarProps) {
  return (
    /*
     * An inline group inside the session line, not a band of its own.
     *
     * The counts above and the filters here are one control surface — clicking
     * "3 warning" and pressing the Cycle · Warning chip do the same thing — so
     * they share a row. Two stacked bands spent 74px of a 551px viewport on
     * chrome that reads as one idea.
     */
    <div className="flex shrink-0 items-center gap-x-3 border-l border-line pl-3">
      <div className="relative shrink-0">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search ticker"
          spellCheck={false}
          autoComplete="off"
          className="w-32 rounded-sm border border-line-2 bg-panel-2 px-2 py-1 text-[12px] font-semibold tracking-wide text-ink uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-3 placeholder:normal-case focus:border-accent/60 focus:outline-none"
        />
      </div>

      {setupGradeWired ? (
        <OptionGroup<SetupGradeFilter>
          label="Setup grade"
          value={filters.setupGrade}
          onSelect={(setupGrade) => onChange({ ...filters, setupGrade })}
          options={SETUP_GRADE_FILTERS.map((option) => ({ value: option.value, label: option.label.replace(/^Setup grade /, '') }))}
        />
      ) : null}

      <OptionGroup<CycleFilter>
        label="Cycle"
        value={filters.cycle}
        onSelect={(cycle) => onChange({ ...filters, cycle })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'DAY_1', label: 'Day 1', title: 'The move began today' },
          { value: 'FRONTSIDE', label: 'Frontside', title: 'Still making the cycle high' },
          {
            value: 'OFF_HIGH',
            label: 'Off high',
            title: 'Off the high, less than half the move given back',
          },
          {
            value: 'BACKSIDE',
            label: 'Backside',
            title: 'Half the move or more given back, still in play',
          },
        ]}
      />

      <OptionGroup<StructureFilter>
        label="Structure"
        value={filters.structure}
        onSelect={(structure) => onChange({ ...filters, structure })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'DIRTY', label: 'Dirty' , title: 'Dirty Float' },
          { value: 'UNKNOWN', label: 'Unknown', title: 'Unknown Structure' },
          { value: 'OTHER', label: 'Other', title: 'Neither Dirty Float nor Unknown Structure' },
        ]}
      />

      {/*
        * TWO CONTROLS, BECAUSE THE WHY CELL SHOWS TWO QUANTITIES.
        *
        * One control labelled "Catalyst" carried A/B/C while the summary chip
        * beside it read "fresh catalyst" and set the SAME field — so the two
        * disagreed about what that field meant, and the chip's word lost.
        * The letter in the Why column is the GRADE and its colour is the
        * FRESHNESS; these now match, one control each.
        */}
      <OptionGroup<CatalystFilter>
        label="Freshness"
        value={filters.catalyst}
        onSelect={(catalyst) => onChange({ ...filters, catalyst })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'FRESH', label: 'Fresh', title: 'The catalyst is from today' },
          { value: 'RECENT', label: 'Recent', title: 'The catalyst is from yesterday' },
          /*
           * HIS WORD IS "OLD", THE STORED VALUE IS STILL `STALE`.
           *
           * He defined the bands on 2026-09-24 — fresh today, recent
           * yesterday, old beyond that — and the desk's vocabulary should be
           * his. Renaming the enum is Research's to do and changes a stored
           * contract; renaming the LABEL is this seat's and changes a word. So
           * the word moves now and the value follows if they rename it.
           */
          { value: 'STALE', label: 'Old', title: 'The catalyst is from before yesterday' },
        ]}
      />

      <OptionGroup<GradeFilter>
        label="Grade"
        value={filters.grade}
        onSelect={(grade) => onChange({ ...filters, grade })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
        ]}
      />

      <div className="flex shrink-0 items-center gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={onReset}
            className="min-h-[24px] rounded-sm border border-line-2 bg-panel-2 px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase hover:border-accent/50 hover:text-ink"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
