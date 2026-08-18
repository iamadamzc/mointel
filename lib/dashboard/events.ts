/**
 * Trader-facing event prioritisation.
 *
 * The store records every deterministic transition it observes, and it should
 * keep doing that — an event log that drops facts is not an audit trail. But
 * the visible feed is a different question: a dozen simultaneous NEW HOD lines
 * for names nobody at this desk is watching bury the halt, the rank entry and
 * the catalyst change that actually mattered.
 *
 * So this is a view layer. It reorders and labels; it never deletes, and it
 * never changes what an event means. "All events" remains one click away.
 */

import type { DeskEvent, DeskEventType } from '@/lib/market/types';

/** How close an event's symbol is to what the desk is currently working. */
export type EventRelevance = 'PRIMARY' | 'TOP_RANKED' | 'TRACKED' | 'BACKGROUND';

export interface RankedEvent {
  event: DeskEvent;
  relevance: EventRelevance;
  /** Lower sorts first. */
  priority: number;
  /** Whether the default feed shows this line. */
  relevant: boolean;
}

/**
 * Type weight.
 *
 * A halt and a structural source change are material wherever they happen. A
 * new session high is only material for a name already in view: it is the most
 * common event in the store and the least selective on its own.
 */
const TYPE_WEIGHT: Record<DeskEventType, number> = {
  HALT: 0,
  RESUME: 0,
  // A completed checkpoint is the desk's own timeline; it sorts with the
  // material events rather than competing with per-ticker noise.
  DESK_ASSESSMENT: 0,
  CATALYST_SOURCE_CHANGE: 1,
  RVOL_RANK_ENTRY: 2,
  AH_RANK_ENTRY: 2,
  DISCOVERY_QUALIFIED: 3,
  NEW_HOD: 4,
};

/**
 * Event types that carry their own materiality.
 *
 * A halt on a name outside the current universe is still a halt, and hiding it
 * behind a relevance filter would be the wrong kind of tidy.
 */
const ALWAYS_RELEVANT: ReadonlySet<DeskEventType> = new Set<DeskEventType>([
  'HALT',
  'RESUME',
  'CATALYST_SOURCE_CHANGE',
  // Not attached to a ticker in the current universe at all: it describes the
  // desk itself, and the desk is always in view.
  'DESK_ASSESSMENT',
]);

const RELEVANCE_WEIGHT: Record<EventRelevance, number> = {
  PRIMARY: 0,
  TOP_RANKED: 1,
  TRACKED: 2,
  BACKGROUND: 4,
};

export interface EventUniverse {
  /** Names the desk has flagged as primary/active. */
  primary: ReadonlySet<string>;
  /** Names currently inside the discovery rank threshold. */
  topRanked: ReadonlySet<string>;
  /** Names the desk tracks or has analyzed. */
  tracked: ReadonlySet<string>;
}

function relevanceFor(symbol: string, universe: EventUniverse): EventRelevance {
  if (universe.primary.has(symbol)) return 'PRIMARY';
  if (universe.topRanked.has(symbol)) return 'TOP_RANKED';
  if (universe.tracked.has(symbol)) return 'TRACKED';
  return 'BACKGROUND';
}

/**
 * Ranks events for display, most material first.
 *
 * Ties break on time, newest first, so a run of same-priority lines still reads
 * as a feed.
 */
export function prioritizeEvents(
  events: readonly DeskEvent[],
  universe: EventUniverse,
): RankedEvent[] {
  const ranked = events.map((event) => {
    const relevance = relevanceFor(event.symbol, universe);
    const typeWeight = TYPE_WEIGHT[event.type] ?? 5;

    return {
      event,
      relevance,
      priority: RELEVANCE_WEIGHT[relevance] * 10 + typeWeight,
      relevant: relevance !== 'BACKGROUND' || ALWAYS_RELEVANT.has(event.type),
    };
  });

  return ranked.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return Date.parse(b.event.ts) - Date.parse(a.event.ts);
  });
}

/** The default feed: material events only, in priority order. */
export function relevantEvents(ranked: readonly RankedEvent[]): RankedEvent[] {
  return ranked.filter((item) => item.relevant);
}
