/**
 * The filter groups' labels and options, in ONE place: the FilterBar draws its
 * chips from here and the filter banner names the active filters from here, so
 * the banner can never call a filter something the chip does not.
 *
 * "Catalyst grade" (was "Grade", Integration 31st on Marketing's word): the group
 * filters the Why cell's catalyst letter (`why.grade`, `gradeLetter` in
 * `lib/dashboard/why.ts`), not the setup grade, and the banner would otherwise
 * print "Grade: A" beside "Setup grade: A". C also holds names with no catalyst
 * (`gradeLetter` folds NONE into C), so the C chip and banner item carry
 * Marketing's title (Commercial 17, `filter-banner-words-2026-10-06.md` v2).
 */

import { SETUP_GRADE_FILTERS } from '@/lib/dashboard/setupGrade';
import type { CatalystFilter, CycleFilter, FilterState, GradeFilter, SetupGradeFilter, StructureFilter } from '@/lib/dashboard/view';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

export const FILTER_GROUP_LABEL = {
  setupGrade: 'Setup grade',
  cycle: 'Cycle',
  structure: 'Structure',
  catalyst: 'Freshness',
  grade: 'Catalyst grade',
  search: 'Search',
} as const;

export const CATALYST_GRADE_C_TITLE = "C includes names with no company event in the desk's evidence.";

export const SETUP_GRADE_OPTIONS: FilterOption<SetupGradeFilter>[] = SETUP_GRADE_FILTERS.map((option) => ({
  value: option.value,
  label: option.label.replace(/^Setup grade /, ''),
}));

export const CYCLE_OPTIONS: FilterOption<CycleFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DAY_1', label: 'Day 1', title: 'The move began today' },
  { value: 'FRONTSIDE', label: 'Frontside', title: 'Still making the cycle high' },
  { value: 'OFF_HIGH', label: 'Off high', title: 'Off the high, less than half the move given back' },
  { value: 'BACKSIDE', label: 'Backside', title: 'Half the move or more given back, still in play' },
];

export const STRUCTURE_OPTIONS: FilterOption<StructureFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DIRTY', label: 'Dirty', title: 'Dirty Float' },
  { value: 'UNKNOWN', label: 'Unknown', title: 'Unknown Structure' },
  { value: 'OTHER', label: 'Other', title: 'Neither Dirty Float nor Unknown Structure' },
];

/*
 * HIS WORD IS "OLD", THE STORED VALUE IS STILL `STALE` (he defined the bands on
 * 2026-09-24: fresh today, recent yesterday, old beyond that).
 */
export const FRESHNESS_OPTIONS: FilterOption<CatalystFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'FRESH', label: 'Fresh', title: 'The catalyst is from today' },
  { value: 'RECENT', label: 'Recent', title: 'The catalyst is from yesterday' },
  { value: 'STALE', label: 'Old', title: 'The catalyst is from before yesterday' },
];

export const CATALYST_GRADE_OPTIONS: FilterOption<GradeFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C', title: CATALYST_GRADE_C_TITLE },
];

/** One active filter as the banner names it: "Freshness: Fresh", with the chip's title when it has one that qualifies the value. */
export interface ActiveFilter {
  text: string;
  title: string | null;
}

function item<T extends string>(group: string, options: FilterOption<T>[], value: T, withTitle = false): ActiveFilter | null {
  if (value === 'ALL') return null;
  const option = options.find((o) => o.value === value);
  // A value the chips do not offer is still named, never dropped: it is filtering the board.
  return { text: `${group}: ${option?.label ?? String(value)}`, title: withTitle ? (option?.title ?? null) : null };
}

/** The active filters in the FilterBar's order. An "All" group and an empty search are not listed. */
export function activeFilters(filters: FilterState): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  const search = filters.search.trim().toUpperCase();
  // The box renders upper case and the filter compares upper case (view.ts), so the banner prints what he sees.
  if (search) out.push({ text: `${FILTER_GROUP_LABEL.search}: ${search}`, title: null });
  const parts = [
    item(FILTER_GROUP_LABEL.setupGrade, SETUP_GRADE_OPTIONS, filters.setupGrade),
    item(FILTER_GROUP_LABEL.cycle, CYCLE_OPTIONS, filters.cycle),
    item(FILTER_GROUP_LABEL.structure, STRUCTURE_OPTIONS, filters.structure),
    item(FILTER_GROUP_LABEL.catalyst, FRESHNESS_OPTIONS, filters.catalyst),
    // Only the catalyst grade's C carries a title on the banner (Commercial 17: C also holds no-catalyst names).
    item(FILTER_GROUP_LABEL.grade, CATALYST_GRADE_OPTIONS, filters.grade, true),
  ];
  for (const part of parts) if (part) out.push(part);
  return out;
}
