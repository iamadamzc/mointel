/**
 * What the dashboard endpoint actually sends.
 *
 * The payload carried every RESEARCH record the sheet held — 128 dossiers to
 * render six rows — on a four-second poll. These fix the two properties that
 * keep it small: the map is scoped to what the page can display, and an
 * unchanged payload answers 304 rather than sending itself again.
 */

import { describe, expect, it } from 'vitest';

import { scopeResearch } from '@/lib/data';
import { computeEtag, dashboardResponseParts, etagMatches } from '@/lib/data/etag';
import type { DashboardState } from '@/lib/data/types';

/*
 * The Sheet row parsers that built these fixtures were deleted (A5), and in
 * production `tickers` is always [] and `research` always {}. `scopeResearch`
 * and the etag still run on every poll, so they keep their tests, on plain
 * stand-in objects cast to the payload's types.
 */
function tickerRow(ticker: string): DashboardState['tickers'][number] {
  return { ticker } as unknown as DashboardState['tickers'][number];
}

/**
 * A record with enough prose in it to weigh what a real one weighed.
 * The point of scoping is bytes, so the fixture has to carry some.
 */
function record(ticker: string): never {
  return {
    ticker,
    company: `${ticker} Holdings Corporation`,
    catalystDetails:
      'Company announced a distribution agreement covering three states, effective immediately, with no revenue guidance attached to the release.',
    cycleReasoning:
      'The advance began on the release and has held the opening range, but the daily history shows two prior expansions of similar size that gave most of it back.',
  } as never;
}

function state(visible: string[], stored: string[]): DashboardState {
  const research: DashboardState['research'] = {};
  for (const ticker of stored) research[ticker] = record(ticker);

  return {
    tickers: visible.map(tickerRow),
    research,
    summary: {
      namesTracked: visible.length,
      freshFrontside: 0,
      frontsideWarning: visible.length,
      backside: 0,
      dirtyFloat: 0,
      strongCatalysts: 0,
    },
    meta: {
      provider: 'none',
      fetchedAt: '2026-08-21T04:00:00.000Z',
      sourceUpdatedAt: null,
      error: null,
      sourceTitle: 'Trading Desk',
      warnings: [],
      stale: false,
      cacheAgeMs: 0,
    },
  };
}

describe('scopeResearch', () => {
  it('keeps the records for rows on the page and drops the rest', () => {
    const scoped = scopeResearch(state(['AAAA', 'BBBB'], ['AAAA', 'BBBB', 'CCCC', 'DDDD']));

    expect(Object.keys(scoped.research).sort()).toEqual(['AAAA', 'BBBB']);
  });

  it('keeps a dossier the drawer has open even when it is not a row', () => {
    const scoped = scopeResearch(state(['AAAA'], ['AAAA', 'ZZZZ']), ['zzzz']);

    expect(Object.keys(scoped.research).sort()).toEqual(['AAAA', 'ZZZZ']);
  });

  it('asks for a record that does not exist without inventing one', () => {
    const scoped = scopeResearch(state(['AAAA'], ['AAAA']), ['NOPE']);

    expect(Object.keys(scoped.research)).toEqual(['AAAA']);
  });

  it('changes nothing else about the payload', () => {
    const original = state(['AAAA'], ['AAAA', 'BBBB']);
    const scoped = scopeResearch(original);

    expect(scoped.tickers).toBe(original.tickers);
    expect(scoped.summary).toBe(original.summary);
    expect(scoped.meta).toBe(original.meta);
  });

  it('is materially smaller than the unscoped payload', () => {
    const stored = Array.from({ length: 40 }, (_, index) => `T${String(index).padStart(3, '0')}`);
    const full = state(stored.slice(0, 4), stored);

    const before = JSON.stringify(full).length;
    const after = JSON.stringify(scopeResearch(full)).length;

    expect(after).toBeLessThan(before / 2);
  });
});

describe('dashboardResponseParts', () => {
  it('does not change its tag just because the server answered a moment later', () => {
    /*
     * The defect this exists to prevent: hashing the raw body meant `fetchedAt`
     * and `cacheAgeMs` — which advance on every single request — produced a new
     * tag every four seconds, so the conditional request never once succeeded
     * and the endpoint sent the whole payload forever.
     */
    const first = state(['AAAA'], ['AAAA']);
    const later = state(['AAAA'], ['AAAA']);
    later.meta = { ...later.meta, fetchedAt: '2026-08-21T04:00:12.000Z', cacheAgeMs: 12_000 };

    expect(dashboardResponseParts(later).etag).toBe(dashboardResponseParts(first).etag);
  });

  it('does change its tag when the desk state changes', () => {
    const before = dashboardResponseParts(state(['AAAA'], ['AAAA']));
    const after = dashboardResponseParts(state(['AAAA', 'BBBB'], ['AAAA', 'BBBB']));

    expect(after.etag).not.toBe(before.etag);
  });

  it('changes its tag when the sheet goes stale, which is real news', () => {
    const fresh = state(['AAAA'], ['AAAA']);
    const stale = state(['AAAA'], ['AAAA']);
    stale.meta = { ...stale.meta, stale: true, error: 'Sheet read failed' };

    expect(dashboardResponseParts(stale).etag).not.toBe(dashboardResponseParts(fresh).etag);
  });

  it('carries the freshness a 304 has no body to carry', () => {
    const parts = dashboardResponseParts(state(['AAAA'], ['AAAA']));
    expect(parts.fetchedAt).toBe('2026-08-21T04:00:00.000Z');
    expect(parts.cacheAgeMs).toBe(0);
  });
});

describe('etag', () => {
  it('is stable for identical bytes and different for changed ones', () => {
    const a = computeEtag('{"a":1}');
    expect(computeEtag('{"a":1}')).toBe(a);
    expect(computeEtag('{"a":2}')).not.toBe(a);
  });

  it('matches the tag the client sends back', () => {
    const etag = computeEtag('{"a":1}');
    expect(etagMatches(etag, etag)).toBe(true);
  });

  it('matches inside a list and through a weak validator', () => {
    const etag = computeEtag('{"a":1}');
    expect(etagMatches(`"other", ${etag}`, etag)).toBe(true);
    expect(etagMatches(`W/${etag}`, etag)).toBe(true);
  });

  it('does not match a stale tag or an absent header', () => {
    const etag = computeEtag('{"a":1}');
    expect(etagMatches(computeEtag('{"a":2}'), etag)).toBe(false);
    expect(etagMatches(null, etag)).toBe(false);
  });
});
