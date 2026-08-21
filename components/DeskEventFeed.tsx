'use client';

import { useMemo, useState } from 'react';

import { prioritizeEvents, relevantEvents, type EventUniverse } from '@/lib/dashboard/events';
import type { DeskEvent } from '@/lib/market/types';
import { formatEtTimestamp } from '@/lib/format';

const TYPE_TONE: Record<string, string> = {
  NEW_HOD: 'text-pos',
  HALT: 'text-neg',
  RESUME: 'text-accent',
  RVOL_RANK_ENTRY: 'text-accent',
  AH_RANK_ENTRY: 'text-accent',
  DISCOVERY_QUALIFIED: 'text-ink-2',
  CATALYST_SOURCE_CHANGE: 'text-accent',
  DESK_ASSESSMENT: 'text-ink-2',
};

const TYPE_LABEL: Record<string, string> = {
  NEW_HOD: 'NEW HOD',
  HALT: 'HALT',
  RESUME: 'RESUME',
  RVOL_RANK_ENTRY: 'RVOL RANK ENTRY',
  AH_RANK_ENTRY: 'AH RANK ENTRY',
  DISCOVERY_QUALIFIED: 'DISCOVERY',
  CATALYST_SOURCE_CHANGE: 'SOURCE CHANGE',
  DESK_ASSESSMENT: 'ASSESSMENT',
};

/**
 * Deterministic desk events only: every line here corresponds to an observed
 * market state transition, never to an inference or a recommendation.
 *
 * The default view is filtered by materiality rather than by recency alone. A
 * new session high on a name the desk is working is worth a line; the same
 * event on an unrelated symbol is not worth pushing that line off the screen,
 * and a dozen of them at once is how the feed became unreadable. Nothing is
 * discarded — "all" is one click away and the store is untouched.
 */
export function DeskEventFeed({
  events,
  universe,
  onSelect,
}: {
  events: DeskEvent[];
  universe: EventUniverse;
  onSelect: (ticker: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(() => prioritizeEvents(events, universe), [events, universe]);
  const material = useMemo(() => relevantEvents(ranked), [ranked]);
  const visible = showAll ? ranked : material;
  const hidden = ranked.length - material.length;

  return (
    <section className="border-b border-line bg-desk px-4 py-2">
      <div className="mb-1.5 flex items-baseline gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          Desk Events
        </h2>
        <span className="num text-[11px] text-ink-3">{visible.length}</span>

        <div className="ml-auto flex items-center gap-2">
          {hidden > 0 && !showAll ? (
            <span className="num text-[10px] text-ink-3">{hidden} background</span>
          ) : null}
          <div className="flex overflow-hidden rounded-sm border border-line-2">
            {(
              [
                { key: false, label: 'Relevant' },
                { key: true, label: 'All' },
              ] as const
            ).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setShowAll(option.key)}
                className={`border-r border-line-2 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors last:border-r-0 ${
                  option.key === showAll
                    ? 'bg-accent/15 text-accent'
                    : 'bg-panel-2 text-ink-3 hover:bg-panel-3 hover:text-ink-2'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-[11px] text-ink-3">
          {ranked.length === 0
            ? 'No deterministic events yet this session.'
            : 'No events for the names currently in view.'}
        </p>
      ) : (
        <ul className="max-h-[108px] space-y-0.5 overflow-y-auto">
          {visible.map((item) => (
            <li key={item.event.id}>
              <button
                type="button"
                onClick={() => onSelect(item.event.symbol)}
                className="flex w-full items-baseline gap-2 rounded-sm px-1 py-0.5 text-left hover:bg-panel-2"
              >
                <span className="num shrink-0 text-[11px] text-ink-3">
                  {formatEtTimestamp(item.event.ts) ?? '—'}
                </span>
                <span
                  className={`w-[72px] shrink-0 text-[12px] font-bold ${
                    item.relevance === 'BACKGROUND' ? 'text-ink-3' : 'text-ink'
                  }`}
                >
                  {item.event.symbol}
                </span>
                <span
                  className={`w-[130px] shrink-0 text-[10px] font-semibold tracking-wide uppercase ${
                    item.relevance === 'BACKGROUND'
                      ? 'text-ink-3'
                      : (TYPE_TONE[item.event.type] ?? 'text-ink-2')
                  }`}
                >
                  {TYPE_LABEL[item.event.type] ?? item.event.type}
                </span>
                <span
                  title={item.event.message}
                  className={`truncate text-[11px] ${
                    item.relevance === 'BACKGROUND' ? 'text-ink-3' : 'text-ink-2'
                  }`}
                >
                  {item.event.message}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
