'use client';

import type { DeskEvent } from '@/lib/market/types';
import { formatEtTimestamp } from '@/lib/format';

const TYPE_TONE: Record<string, string> = {
  NEW_HOD: 'text-pos',
  HALT: 'text-neg',
  RESUME: 'text-accent',
  RVOL_RANK_ENTRY: 'text-accent',
  DISCOVERY_QUALIFIED: 'text-ink-2',
};

const TYPE_LABEL: Record<string, string> = {
  NEW_HOD: 'NEW HOD',
  HALT: 'HALT',
  RESUME: 'RESUME',
  RVOL_RANK_ENTRY: 'RVOL RANK ENTRY',
  DISCOVERY_QUALIFIED: 'DISCOVERY',
};

/**
 * Deterministic desk events only: every line here corresponds to an observed
 * market state transition, never to an inference or a recommendation.
 */
export function DeskEventFeed({
  events,
  onSelect,
}: {
  events: DeskEvent[];
  onSelect: (ticker: string) => void;
}) {
  return (
    <section className="border-b border-line bg-desk px-4 py-2">
      <div className="mb-1.5 flex items-baseline gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          Desk Events
        </h2>
        <span className="num text-[11px] text-ink-3">{events.length}</span>
      </div>

      {events.length === 0 ? (
        <p className="text-[11px] text-ink-3">
          No deterministic events yet this session.
        </p>
      ) : (
        <ul className="max-h-[132px] space-y-0.5 overflow-y-auto">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event.symbol)}
                className="flex w-full items-baseline gap-2 rounded-sm px-1 py-0.5 text-left hover:bg-panel-2"
              >
                <span className="num shrink-0 text-[11px] text-ink-3">
                  {formatEtTimestamp(event.ts) ?? '—'}
                </span>
                <span className="w-[72px] shrink-0 text-[12px] font-bold text-ink">
                  {event.symbol}
                </span>
                <span
                  className={`w-[130px] shrink-0 text-[10px] font-semibold tracking-wide uppercase ${
                    TYPE_TONE[event.type] ?? 'text-ink-2'
                  }`}
                >
                  {TYPE_LABEL[event.type] ?? event.type}
                </span>
                <span className="truncate text-[11px] text-ink-2">{event.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
