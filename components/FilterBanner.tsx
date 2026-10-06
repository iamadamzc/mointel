'use client';

/**
 * The filter banner: drawn only while a filter is on, directly above the
 * Discovery table, in the board's one can't-miss pattern (the warn tint of the
 * "not updating" banner). Every word and count comes from
 * `lib/dashboard/filterBanner.ts`; this file only lays them out. A name in the
 * second line opens its drawer and leaves the filters on; Clear clears them.
 */

import { FILTER_BANNER_WORDS, type FilterBannerView } from '@/lib/dashboard/filterBanner';

export function FilterBanner({
  view,
  onClear,
  onSelect,
}: {
  view: FilterBannerView | null;
  onClear: () => void;
  onSelect: (ticker: string) => void;
}) {
  if (!view) return null;
  return (
    <div role="status" className="mb-2 rounded-sm border border-warn/35 bg-warn/12 px-3 py-1.5 text-[12px] text-warn">
      <p className="m-0 flex flex-wrap items-center gap-x-1.5 font-medium">
        <span>{FILTER_BANNER_WORDS.lead}</span>
        {view.filters.map((filter, index) => (
          <span key={filter.text} title={filter.title ?? undefined}>
            {filter.text}
            {index < view.filters.length - 1 ? ';' : '.'}
          </span>
        ))}
        <span title={view.matchHover} className="font-semibold">
          {view.match}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 min-h-[24px] rounded-sm border border-warn/50 bg-panel-2 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-warn uppercase hover:border-warn hover:text-ink"
        >
          {FILTER_BANNER_WORDS.clear}
        </button>
      </p>
      {view.hidden ? (
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-1.5">
          <span>{FILTER_BANNER_WORDS.hiddenLead}</span>
          {view.hidden.movers.map((mover, index) => (
            <span key={mover.ticker}>
              <button
                type="button"
                title={mover.hover}
                onClick={() => onSelect(mover.ticker)}
                className="min-h-[24px] font-semibold text-warn underline decoration-warn/40 underline-offset-2 hover:text-ink"
              >
                {mover.ticker} {mover.move}
              </button>
              {index < view.hidden!.movers.length - 1 ? ',' : view.hidden!.more ? '' : '.'}
            </span>
          ))}
          {view.hidden.more ? <span>{view.hidden.more}.</span> : null}
        </p>
      ) : null}
    </div>
  );
}
