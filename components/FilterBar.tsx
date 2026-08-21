'use client';

import type {
  CatalystFilter,
  CycleFilter,
  FilterState,
  PriorityFilter,
  StructureFilter,
} from '@/lib/dashboard/view';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  isActive: boolean;
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

export function FilterBar({ filters, onChange, onReset, isActive }: FilterBarProps) {
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

      <OptionGroup<PriorityFilter>
        label="Priority"
        value={filters.priority}
        onSelect={(priority) => onChange({ ...filters, priority })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
        ]}
      />

      <OptionGroup<CycleFilter>
        label="Cycle"
        value={filters.cycle}
        onSelect={(cycle) => onChange({ ...filters, cycle })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'FRESH', label: 'Fresh', title: 'Fresh / Frontside' },
          { value: 'WARNING', label: 'Warning', title: 'Frontside — Warning' },
          { value: 'BACKSIDE', label: 'Backside' },
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

      <OptionGroup<CatalystFilter>
        label="Catalyst"
        value={filters.catalyst}
        onSelect={(catalyst) => onChange({ ...filters, catalyst })}
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
