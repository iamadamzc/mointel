import { describe, expect, it } from 'vitest';

import { prioritizeEvents, relevantEvents, type EventUniverse } from '@/lib/dashboard/events';
import type { DeskEvent, DeskEventType } from '@/lib/market/types';

let nextId = 1;

function event(
  symbol: string,
  type: DeskEventType,
  ts = '2026-08-17T15:40:00.000Z',
): DeskEvent {
  return {
    id: nextId++,
    tradingDate: '2026-08-17',
    ts,
    type,
    symbol,
    message: `${type} ${symbol}`,
    payload: {},
    dedupeKey: `${symbol}:${type}:${ts}`,
  };
}

const universe: EventUniverse = {
  primary: new Set(['FIEE']),
  topRanked: new Set(['UCL', 'IVF']),
  tracked: new Set(['FIEE', 'UCL', 'IVF', 'JFU']),
};

describe('desk event prioritisation', () => {
  it('puts a Top-12 name ahead of an unrelated symbol', () => {
    const ranked = prioritizeEvents(
      [event('ZZZZ', 'NEW_HOD'), event('UCL', 'NEW_HOD')],
      universe,
    );

    expect(ranked[0].event.symbol).toBe('UCL');
    expect(ranked[0].relevance).toBe('TOP_RANKED');
    expect(ranked[1].relevance).toBe('BACKGROUND');
  });

  it('leads with the primary name', () => {
    const ranked = prioritizeEvents(
      [event('UCL', 'NEW_HOD'), event('FIEE', 'NEW_HOD')],
      universe,
    );

    expect(ranked[0].event.symbol).toBe('FIEE');
    expect(ranked[0].relevance).toBe('PRIMARY');
  });

  it('keeps an unrelated NEW HOD out of the default feed', () => {
    // The failure this fixes: a dozen simultaneous NEW HOD lines for names
    // nobody is watching, burying the events that mattered.
    const ranked = prioritizeEvents(
      [
        event('ZZZZ', 'NEW_HOD'),
        event('YYYY', 'NEW_HOD'),
        event('XXXX', 'NEW_HOD'),
        event('IVF', 'RVOL_RANK_ENTRY'),
      ],
      universe,
    );

    const visible = relevantEvents(ranked);
    expect(visible.map((item) => item.event.symbol)).toEqual(['IVF']);

    // Nothing is discarded: the full list is still there to switch to.
    expect(ranked).toHaveLength(4);
  });

  it('never hides a halt, wherever it happens', () => {
    const ranked = prioritizeEvents([event('ZZZZ', 'HALT')], universe);

    expect(ranked[0].relevance).toBe('BACKGROUND');
    expect(ranked[0].relevant).toBe(true);
    expect(relevantEvents(ranked)).toHaveLength(1);
  });

  it('ranks a halt above a session high for the same name', () => {
    const ranked = prioritizeEvents(
      [event('FIEE', 'NEW_HOD'), event('FIEE', 'HALT')],
      universe,
    );

    expect(ranked.map((item) => item.event.type)).toEqual(['HALT', 'NEW_HOD']);
  });

  it('surfaces a catalyst source change for a tracked name', () => {
    const ranked = prioritizeEvents(
      [event('JFU', 'CATALYST_SOURCE_CHANGE'), event('JFU', 'NEW_HOD')],
      universe,
    );

    expect(ranked[0].event.type).toBe('CATALYST_SOURCE_CHANGE');
    expect(ranked[0].relevance).toBe('TRACKED');
  });

  it('breaks ties on time, newest first', () => {
    const ranked = prioritizeEvents(
      [
        event('UCL', 'NEW_HOD', '2026-08-17T15:00:00.000Z'),
        event('IVF', 'NEW_HOD', '2026-08-17T15:30:00.000Z'),
      ],
      universe,
    );

    expect(ranked.map((item) => item.event.symbol)).toEqual(['IVF', 'UCL']);
  });

  it('changes no event content', () => {
    const source = event('UCL', 'NEW_HOD');
    const ranked = prioritizeEvents([source], universe);
    expect(ranked[0].event).toBe(source);
  });
});
