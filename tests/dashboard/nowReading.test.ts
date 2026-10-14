/**
 * The near-live `Now` column, from the rules in `docs/Design/near-live-now-spec.md`
 * ("The build plan"), not from the code.
 *
 * His rulings, 2026-09-29: build it (01:38:17Z); "the last minute in 10 sec
 * increments" in the same pattern (02:30:43Z); "i want the trade counts, dots
 * and direction color" (02:32:20Z).
 *
 * Every state here is checked on BOTH sides: the case that should speak and
 * the case that should stay silent.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DiscoveryBoard } from '@/components/DiscoveryBoard';
import { NowSparkline } from '@/components/NowSparkline';
import { mergeDesk, type DeskRow } from '@/lib/dashboard/merge';
import {
  NOW_FULL_SCALE,
  nowCellTitle,
  nowColumnCopy,
  nowReadingOf,
  nowSparklineView,
  resolveNowCapture,
  resolveNowReading,
  type NowCapture,
  type NowReading,
} from '@/lib/dashboard/nowReading';
import { sparklineLagLabel } from '@/lib/dashboard/sparkline';
import {
  discoveryMissingCount,
  discoveryValueFor,
  sortDiscoveryRows,
} from '@/lib/dashboard/view';
import { emptyAfterHours } from '@/lib/market/afterHours';
import { NOW_STALE_MS, type NowBucket } from '@/lib/market/nowBuckets';
import type { MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';

const END = Date.parse('2026-09-30T11:30:00.000Z');

/** Six consecutive 10 s slots ending at END, oldest first. */
function slots(trades: Array<number | null>, prices: Array<number | null> = trades.map(() => null)): NowBucket[] {
  return trades.map((count, i) => ({
    bucketEnd: new Date(END - (trades.length - 1 - i) * 10_000).toISOString(),
    trades: count,
    price: prices[i] ?? null,
  }));
}

/* ------------------------------------------------------------------------- *
 * THE CAPTURE STATE: two server timestamps, never the browser clock
 * ------------------------------------------------------------------------- */

describe('the capture state', () => {
  const at = (ms: number) => new Date(ms).toISOString();

  it('is UNWIRED when the capture cannot answer, so the board keeps its minute cell', () => {
    expect(resolveNowCapture(undefined, at(END))).toBe('UNWIRED');
    expect(resolveNowCapture(null, at(END))).toBe('UNWIRED');
  });

  it('is LIVE up to and including the stale threshold, and NOT_LIVE one millisecond past it', () => {
    expect(resolveNowCapture(at(END), at(END))).toBe('LIVE');
    expect(resolveNowCapture(at(END - NOW_STALE_MS), at(END))).toBe('LIVE');
    expect(resolveNowCapture(at(END - NOW_STALE_MS - 1), at(END))).toBe('NOT_LIVE');
  });

  it('is judged on the SERVER clocks: a snapshot fetched in the past is not stale because time passed here', () => {
    // If the browser clock were read, a 2020 fetch would be years stale.
    const past = Date.parse('2020-01-02T15:00:00.000Z');
    expect(resolveNowCapture(at(past - 5_000), at(past))).toBe('LIVE');
  });

  it('refuses to call an undatable answer live', () => {
    expect(resolveNowCapture('not a time', at(END))).toBe('NOT_LIVE');
    expect(resolveNowCapture(at(END), 'not a time')).toBe('NOT_LIVE');
  });
});

/* ------------------------------------------------------------------------- *
 * ONE READING PER ROW
 * ------------------------------------------------------------------------- */

describe('the row reading', () => {
  const minuteWindow = [310, 280, 420, 390, 612];

  it('is today\'s minute cell before the capture answers, even if buckets are present', () => {
    expect(resolveNowReading({ activityWindow: minuteWindow, nowBuckets: slots([1, 2, 3, 4, 5, 6]) }, 'UNWIRED')).toEqual({
      kind: 'MINUTE',
      count: 612,
    });
  });

  it('is today\'s minute cell when the field is ABSENT under a live capture (an older payload)', () => {
    expect(resolveNowReading({ activityWindow: minuteWindow }, 'LIVE')).toEqual({ kind: 'MINUTE', count: 612 });
  });

  it('prints nothing on any row when the capture is not live', () => {
    expect(resolveNowReading({ activityWindow: minuteWindow, nowBuckets: slots([1, 2, 3, 4, 5, 6]) }, 'NOT_LIVE')).toEqual({
      kind: 'NOT_LIVE',
    });
  });

  it('is the NEWEST slot, counted, under a live capture', () => {
    const buckets = slots([4, 9, 12, 30, 51, 44]);
    expect(resolveNowReading({ activityWindow: minuteWindow, nowBuckets: buckets }, 'LIVE')).toEqual({
      kind: 'LIVE',
      count: 44,
      buckets,
    });
  });

  it('reads a measured ZERO as a live zero, never as a fallback', () => {
    const reading = resolveNowReading({ activityWindow: minuteWindow, nowBuckets: slots([0, 0, 0, 0, 0, 0]) }, 'LIVE');
    expect(reading).toMatchObject({ kind: 'LIVE', count: 0 });
  });

  it('is LIVE for a name that joined mid-minute: newest measured, older slots gaps', () => {
    const reading = resolveNowReading({ nowBuckets: slots([null, null, null, 3, 8, 11]) }, 'LIVE');
    expect(reading).toMatchObject({ kind: 'LIVE', count: 11 });
  });

  it('FALLS BACK when the newest slot is unmeasured, even though older slots were', () => {
    // A name that lost its feed: printing the newest MEASURED slot would put
    // a number from 30 s ago under a head that says the last ten.
    const reading = resolveNowReading({ activityWindow: minuteWindow, nowBuckets: slots([5, 6, 7, null, null, null]) }, 'LIVE');
    expect(reading).toEqual({ kind: 'FALLBACK', count: 612 });
  });

  it('FALLS BACK when this name has no measured slot at all (field null)', () => {
    expect(resolveNowReading({ activityWindow: minuteWindow, nowBuckets: null }, 'LIVE')).toEqual({
      kind: 'FALLBACK',
      count: 612,
    });
    // ...and the fallback never invents a minute that was not counted.
    expect(resolveNowReading({ nowBuckets: null }, 'LIVE')).toEqual({ kind: 'FALLBACK', count: null });
  });

  it('gives a row built elsewhere, with no reading, today\'s minute cell', () => {
    const bare = { ticker: 'HOWL', demand: { activityWindow: minuteWindow } } as unknown as DeskRow;
    expect(nowReadingOf(bare)).toEqual({ kind: 'MINUTE', count: 612 });
  });
});

/* ------------------------------------------------------------------------- *
 * THE SORT: tiered in both directions, and it reads the same reading
 * ------------------------------------------------------------------------- */

function rowWith(ticker: string, now: NowReading, rank: number): DeskRow {
  return {
    ticker,
    demand: { activityWindow: [999] },
    telemetry: { rvolRank: rank },
    now,
  } as unknown as DeskRow;
}

describe('the Now sort', () => {
  const live = (n: number): NowReading => ({ kind: 'LIVE', count: n, buckets: slots([n]) });
  const board = 'DAILY_RVOL' as const;

  it('orders on the reading, not on the minute array beside it', () => {
    expect(discoveryValueFor(rowWith('A', live(7), 1), 'now', board)).toBe(7);
    expect(discoveryValueFor(rowWith('B', { kind: 'NOT_LIVE' }, 1), 'now', board)).toBeNull();
  });

  const rows = [
    rowWith('FALL_BIG', { kind: 'FALLBACK', count: 900 }, 1),
    rowWith('LIVE_LOW', live(3), 2),
    rowWith('NONE', { kind: 'FALLBACK', count: null }, 3),
    rowWith('LIVE_HIGH', live(40), 4),
    rowWith('FALL_LOW', { kind: 'FALLBACK', count: 12 }, 5),
    rowWith('LIVE_ZERO', live(0), 6),
  ];

  it('puts every live row above every minute-grain row, descending', () => {
    // FALL_BIG's 900/min is ~6x a 10 s figure for the same activity; untiered
    // it would top the board on grain alone.
    expect(sortDiscoveryRows(rows, { key: 'now', direction: 'desc' }, board).map((r) => r.ticker)).toEqual([
      'LIVE_HIGH',
      'LIVE_LOW',
      'LIVE_ZERO',
      'FALL_BIG',
      'FALL_LOW',
      'NONE',
    ]);
  });

  it('keeps the tiers in the same order ascending, with no-number rows still last', () => {
    expect(sortDiscoveryRows(rows, { key: 'now', direction: 'asc' }, board).map((r) => r.ticker)).toEqual([
      'LIVE_ZERO',
      'LIVE_LOW',
      'LIVE_HIGH',
      'FALL_LOW',
      'FALL_BIG',
      'NONE',
    ]);
  });

  it('does not tier any other sort key', () => {
    // Rank order is the ranks, whatever the Now readings say.
    expect(sortDiscoveryRows(rows, { key: 'rank', direction: 'asc' }, board).map((r) => r.ticker)).toEqual([
      'FALL_BIG',
      'LIVE_LOW',
      'NONE',
      'LIVE_HIGH',
      'FALL_LOW',
      'LIVE_ZERO',
    ]);
  });

  it('places nothing when the capture is not live, and says every row is unmeasured', () => {
    const dark = rows.map((row) => ({ ...row, now: { kind: 'NOT_LIVE' } as NowReading }));
    expect(discoveryMissingCount(dark, 'now', board)).toBe(dark.length);
    // With nothing to place, the board's own ranking holds.
    expect(sortDiscoveryRows(dark, { key: 'now', direction: 'desc' }, board).map((r) => r.ticker)).toEqual(
      ['FALL_BIG', 'LIVE_LOW', 'NONE', 'LIVE_HIGH', 'FALL_LOW', 'LIVE_ZERO'],
    );
  });
});

/* ------------------------------------------------------------------------- *
 * THE MERGE RESOLVES IT ONCE
 * ------------------------------------------------------------------------- */

function snapshot(options: {
  asOf?: string | null;
  fetchedAt: string;
  nowBuckets?: NowBucket[] | null;
}): MarketSnapshot {
  const demand = {
    ticker: 'HOWL',
    tradingDate: '2026-09-30',
    price: 3.2,
    priceSource: 'sip-trade',
    priceAt: '2026-09-30T11:30:00.000Z',
    previousClose: 2.85,
    percentChange: 12.3,
    cumulativeVolume: 1_000_000,
    vwap: emptySessionVwapSet(),
    rvol: 3.1,
    rvolRank: 1,
    rvolConfidence: 'OK',
    quote: { bid: 3.18, bidSize: 3, ask: 3.22, askSize: 4, spread: 0.04, spreadPct: 1.25, at: null, invalid: false },
    luld: { lower: null, upper: null, at: null },
    haltState: 'TRADING',
    haltRaw: null,
    haltAt: null,
    highRes: true,
    top12EnteredAt: null,
    qualified: null,
    latched: false,
    rthFinal: null,
    afterHours: emptyAfterHours(),
    freshness: { lastEventAt: '2026-09-30T11:30:00.000Z', ageSeconds: 2, stale: false },
    updatedAt: '2026-09-30T11:30:02.000Z',
    activityWindow: [300, 320, 340, 360, 480],
    ...(options.nowBuckets === undefined ? {} : { nowBuckets: options.nowBuckets }),
  } as unknown as MarketSnapshot['demand'][string];

  return {
    health: {
      tradeCapture: {
        state: 'RECORDING',
        detail: null,
        bucketsWritten: 10,
        bucketsDiscarded: 0,
        ...(options.asOf === undefined ? {} : { asOf: options.asOf }),
      },
    },
    discovery: { tradingDate: '2026-09-30', sessionPhase: 'PREMARKET', board: 'DAILY_RVOL', ranked: [demand] },
    demand: { HOWL: demand },
    intelligence: {},
    blueSky: {},
    events: [],
    catalystFreshFrom: null,
    fetchedAt: options.fetchedAt,
  } as unknown as MarketSnapshot;
}

describe('mergeDesk resolves the capture once, from the snapshot', () => {
  const fetchedAt = new Date(END).toISOString();

  it('gives the row a LIVE reading when asOf is fresh against fetchedAt', () => {
    const merged = mergeDesk(snapshot({ asOf: new Date(END - 4_000).toISOString(), fetchedAt, nowBuckets: slots([1, 2, 3, 4, 5, 17]) }));
    expect(merged.nowCapture).toBe('LIVE');
    expect(merged.discovery[0].now).toMatchObject({ kind: 'LIVE', count: 17 });
  });

  it('blanks the row when asOf is stale against fetchedAt', () => {
    const merged = mergeDesk(snapshot({ asOf: new Date(END - 60_000).toISOString(), fetchedAt, nowBuckets: slots([1, 2, 3, 4, 5, 17]) }));
    expect(merged.nowCapture).toBe('NOT_LIVE');
    expect(merged.discovery[0].now).toEqual({ kind: 'NOT_LIVE' });
  });

  it('keeps the minute cell when the worker wrote no asOf (before the restart)', () => {
    const merged = mergeDesk(snapshot({ fetchedAt }));
    expect(merged.nowCapture).toBe('UNWIRED');
    expect(merged.discovery[0].now).toEqual({ kind: 'MINUTE', count: 480 });
  });

  it('is UNWIRED with no market snapshot at all', () => {
    expect(mergeDesk(null).nowCapture).toBe('UNWIRED');
  });
});

/* ------------------------------------------------------------------------- *
 * THE MARK: six bars, dots, one colour
 * ------------------------------------------------------------------------- */

describe('the six-slot sparkline', () => {
  it('scales to the active line per ten seconds, derived from the minute line', () => {
    expect(NOW_FULL_SCALE).toBe(50);
    const view = nowSparklineView(slots([0, 25, 50, 100, null, 5]));
    expect(view.bars.map((bar) => bar.height)).toEqual([0, 0.5, 1, 1, null, 0.1]);
  });

  it('draws an unmeasured slot as a GAP and a measured zero as a floor', () => {
    const html = renderToStaticMarkup(createElement(NowSparkline, { buckets: slots([0, null, 10, 10, 10, 10]) }));
    expect((html.match(/data-gap/g) ?? []).length).toBe(1);
    // The zero still draws: a 1px bar.
    expect(html).toContain('height:1px');
  });

  it('draws no gap when every slot is measured', () => {
    const html = renderToStaticMarkup(createElement(NowSparkline, { buckets: slots([0, 0, 0, 0, 0, 0]) }));
    expect(html).not.toContain('data-gap');
  });

  it('puts dots on the row\'s own price range, and none where no trade printed', () => {
    const view = nowSparklineView(slots([1, 1, 1, 1, 1, 1], [2.0, null, 2.5, 3.0, null, 2.0]));
    expect(view.dots.map((dot) => dot.y)).toEqual([0, null, 0.5, 1, null, 0]);
    const flat = nowSparklineView(slots([1, 1], [4.1, 4.1]));
    expect(flat.dots.map((dot) => dot.y)).toEqual([0.5, 0.5]);
  });

  it('is silent only when every MEASURED slot is zero and one slot is measured', () => {
    expect(nowSparklineView(slots([0, null, 0, 0, 0, 0])).silent).toBe(true);
    expect(nowSparklineView(slots([0, 0, 0, 0, 0, 1])).silent).toBe(false);
    expect(nowSparklineView(slots([null, null])).silent).toBe(false);
  });

  it('colours the row by direction over the six prices against the spread', () => {
    const up = renderToStaticMarkup(
      createElement(NowSparkline, { buckets: slots([5, 5, 5, 5, 5, 5], [2.0, 2.1, 2.2, 2.3, 2.4, 2.5]), spreadPct: 1 }),
    );
    expect(up).toContain('bg-pos');
    const inside = renderToStaticMarkup(
      createElement(NowSparkline, { buckets: slots([5, 5, 5, 5, 5, 5], [2.0, 2.0, 2.0, 2.0, 2.0, 2.01]), spreadPct: 1 }),
    );
    expect(inside).toContain('bg-warn');
    const noBand = renderToStaticMarkup(
      createElement(NowSparkline, { buckets: slots([5, 5, 5, 5, 5, 5], [2.0, 2.1, 2.2, 2.3, 2.4, 2.5]) }),
    );
    expect(noBand).not.toMatch(/bg-(pos|neg|warn)/);
  });
});

/* ------------------------------------------------------------------------- *
 * THE WORDS: head, hover and caption follow the capture state
 * ------------------------------------------------------------------------- */

describe('the column copy', () => {
  it('keeps the minute lag and the entry\'s own copy before the capture answers', () => {
    expect(nowColumnCopy('UNWIRED')).toEqual({ sub: sparklineLagLabel() });
  });

  it('says last 10s while live and not live when stopped, on the head itself', () => {
    expect(nowColumnCopy('LIVE').sub).toBe('last 10s');
    expect(nowColumnCopy('NOT_LIVE').sub).toBe('not live');
    for (const capture of ['LIVE', 'NOT_LIVE'] as const) {
      expect(nowColumnCopy(capture).title).toBeTruthy();
      expect(nowColumnCopy(capture).metric).toBeTruthy();
    }
  });

  it('says on every cell which grain its number is in', () => {
    expect(nowCellTitle({ kind: 'LIVE', count: 44, buckets: [] })).toMatch(/10 seconds/);
    expect(nowCellTitle({ kind: 'FALLBACK', count: 612 })).toMatch(/settled minute/);
    expect(nowCellTitle({ kind: 'FALLBACK', count: 612 })).toMatch(/No live 10-second count/);
    expect(nowCellTitle({ kind: 'MINUTE', count: 612 })).toMatch(/settled minute/);
    expect(nowCellTitle({ kind: 'MINUTE', count: 612 })).not.toMatch(/10-second|10 seconds/);
  });
});

/* ------------------------------------------------------------------------- *
 * RENDERED: the board, in each state
 * ------------------------------------------------------------------------- */

function renderBoard(merged: ReturnType<typeof mergeDesk>, capture: NowCapture): string {
  return renderToStaticMarkup(
    createElement(DiscoveryBoard, {
      discovery: {
        tradingDate: '2026-09-30',
        sessionPhase: 'PREMARKET',
        board: 'DAILY_RVOL',
        priceMin: 1,
        priceMax: 20,
        rankedCount: merged.discovery.length,
        eligibleCount: merged.discovery.length,
        trackedCount: merged.discovery.length,
        rankingLabel: 'Daily RVOL',
        rthClose: null,
      } as never,
      rows: merged.discovery,
      onSelect: () => {},
      selectedTicker: null,
      marketOffline: false,
      universe: null,
      isFocused: () => false,
      onToggleFocus: () => {},
      changedTickers: new Set<string>(),
      nowCapture: capture,
    }),
  );
}

describe('the board, rendered', () => {
  const fetchedAt = new Date(END).toISOString();

  it('LIVE: the head says last 10s, the cell prints the newest 10 s count and six slots', () => {
    const merged = mergeDesk(snapshot({ asOf: fetchedAt, fetchedAt, nowBuckets: slots([1, 2, 3, 4, 5, 17]) }));
    const html = renderBoard(merged, merged.nowCapture);
    expect(html).toContain('last 10s');
    expect(html).toContain('17 trades in the most recent completed 10 seconds.');
    expect(html).toContain('trades per 10 seconds over the last minute');
    expect(html).not.toContain('/min<');
    // Neither the head nor the sort control keeps the settled-minute hover.
    expect(html).not.toContain('Trades in the most recent settled minute. Which names');
    expect(html).toContain('title="Trades in the most recent completed 10 seconds; the bars');
  });

  it('FALLBACK: the cell prints the minute figure with its unit, and keeps its minute bars', () => {
    const merged = mergeDesk(snapshot({ asOf: fetchedAt, fetchedAt, nowBuckets: null }));
    const html = renderBoard(merged, merged.nowCapture);
    expect(html).toContain('last 10s');
    expect(html).toMatch(/480<span class="text-\[9px\]">\/min<\/span>/);
    expect(html).toContain('trades per minute over the');
  });

  it('NOT_LIVE: the head says not live and the cell prints no number and no bars', () => {
    const merged = mergeDesk(snapshot({ asOf: new Date(END - 60_000).toISOString(), fetchedAt, nowBuckets: slots([1, 2, 3, 4, 5, 17]) }));
    const html = renderBoard(merged, merged.nowCapture);
    expect(html).toContain('not live');
    expect(html).not.toContain('>17<');
    expect(html).not.toContain('>480<');
    expect(html).not.toMatch(/Activity: /);
  });

  it('UNWIRED: the board is exactly the minute column it was', () => {
    const merged = mergeDesk(snapshot({ fetchedAt }));
    const html = renderBoard(merged, merged.nowCapture);
    expect(html).toContain(sparklineLagLabel());
    expect(html).not.toContain('last 10s');
    expect(html).toContain('480 trades in the most recent settled minute.');
    expect(html).not.toContain('/min<');
    expect(html).toContain('Trades in the most recent settled minute. Which names');
  });
});
