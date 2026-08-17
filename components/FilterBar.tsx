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
  resultCount: number;
  totalCount: number;
  isActive: boolean;
}

interface OptionGroupProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; title?: string }>;
  onSelect: (value: T) => void;
}

function OptionGroup<T extends string>({ label, value, options, onSelect }: OptionGroupProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        {label}
      </span>
      <div className="flex overflow-hidden rounded-sm border border-line-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.title}
              onClick={() => onSelect(option.value)}
              className={`border-r border-line-2 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
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

export function FilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
  totalCount,
  isActive,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-panel px-4 py-2">
      <div className="relative">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search ticker"
          spellCheck={false}
          autoComplete="off"
          className="w-40 rounded-sm border border-line-2 bg-panel-2 px-2 py-1 text-[12px] font-semibold tracking-wide text-ink uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-3 placeholder:normal-case focus:border-accent/60 focus:outline-none"
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

      <div className="ml-auto flex items-center gap-3">
        <span className="num text-[11px] text-ink-3">
          {resultCount} / {totalCount}
        </span>
        {isActive ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-sm border border-line-2 bg-panel-2 px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase hover:border-accent/50 hover:text-ink"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
