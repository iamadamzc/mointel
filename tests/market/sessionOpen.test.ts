import { describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';

/**
 * The origin for a within-session Move.
 *
 * He ruled it: the FIRST PRINT of the session, one rule for all three, with the
 * anchoring minute's trade count carried so a thin anchor is legible. A VWAP was
 * proposed and refused — an average cannot be an origin, and with one odd-lot
 * print the volume-weighted average of one print is that print.
 *
 * Almost every test here is about a way the anchor must NOT move.
 */

const TRADING_DATE = '2026-08-14';
/** 09:30 ET is 13:30Z on this date (EDT). */
const BELL = Date.UTC(2026, 7, 14, 13, 30, 0);

function at(minutesFromBell: number): string {
  return new Date(BELL + minutesFromBell * 60_000).toISOString();
}

function bar(
  symbol: string,
  ts: string,
  values: { o: number; c: number; v: number; n?: number | null },
  kind: 'bar' | 'updatedBar' = 'bar',
): MarketObservation {
  return {
    symbol,
    kind,
    ts,
    receivedAt: ts,
    feed: 'sip',
    price: values.c,
    bar: {
      symbol,
      ts,
      open: values.o,
      high: Math.max(values.o, values.c),
      low: Math.min(values.o, values.c),
      close: values.c,
      volume: values.v,
      tradeCount: values.n === undefined ? 100 : values.n,
      vwap: null,
      source: 'live-bar',
      receivedAt: ts,
    },
  };
}

function baseline(symbol: string): RvolBaseline {
  return {
    symbol,
    baselineDate: TRADING_DATE,
    previousClose: 4,
    previousCloseDate: '2026-08-13',
    averageVolume: 1_000_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T00:00:00Z',
  };
}

function engineAt(nowMs: number) {
  const engine = new DemandEngine({
    tradingDate: TRADING_DATE,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
    now: () => nowMs,
  });
  engine.setBaselines(new Map([['ABCD', baseline('ABCD')]]));
  engine.track('ABCD');
  return engine;
}

function opens(engine: DemandEngine) {
  return engine.getDemandState('ABCD')?.sessionOpens;
}

describe('the anchor is the earliest minute, not the first one delivered', () => {
  it('holds the earliest bar even when a later one arrives first', () => {
    /*
     * THE TRAP THIS EXISTS FOR. Bars arrive out of order — every price field in
     * the engine is guarded by `isNewerObservation` for that reason — so a
     * plain "if nothing stored, store it" anchors on whatever the socket
     * delivered first. Here 09:32 arrives before 09:30 and must lose.
     */
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(2), { o: 6, c: 6.2, v: 20_000 }));
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));

    expect(opens(engine)?.regular.price).toBe(5);
    expect(opens(engine)?.regular.at).toBe(at(0));
  });

  it('does not let a later bar overwrite an anchor already held', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(3), { o: 7, c: 7.5, v: 10_000 }));

    expect(opens(engine)?.regular.price).toBe(5);
  });

  it('lets a CORRECTION to the anchoring minute replace it', () => {
    /*
     * The second trap, and the reason the comparison is `<=` rather than `<`.
     * `updatedBar` revises a minute in place, so a revision of the anchoring
     * minute must move the price. Treating it as "not earlier" would leave a
     * stale origin that no later bar could ever fix.
     */
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(0), { o: 4.6, c: 5.1, v: 60_000 }, 'updatedBar'));

    expect(opens(engine)?.regular.price).toBe(4.6);
    expect(opens(engine)?.regular.at).toBe(at(0));
  });
});

describe('each session owns its own open', () => {
  it('keeps premarket, regular and after-hours anchors apart', () => {
    /*
     * The premarket open must not become the regular open when the bell rings.
     * That is the same failure the session VWAPs exist to avoid — quoting one
     * session's average under another session's name.
     */
    const engine = engineAt(BELL + 8 * 60_000);
    engine.ingest(bar('ABCD', at(-90), { o: 3, c: 3.2, v: 5_000 }));
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));

    const set = opens(engine);
    expect(set?.premarket.price).toBe(3);
    expect(set?.regular.price).toBe(5);
    // Nothing has traded after the bell yet, and that is not a price of zero.
    expect(set?.afterHours.price).toBeNull();
    expect(set?.afterHours.move).toBeNull();
  });

  it('anchors after-hours on its OWN first print, not on the closing price', () => {
    /*
     * ONE RULE MEANS AFTER-HOURS DOES NOT COLLAPSE. An earlier ruling of mine
     * said it would, because it defined the AH open AS the 16:00 close. Under
     * the first-print rule the AH open is the first print AFTER the bell, which
     * is a different print — and the distance between them is itself the
     * after-hours gap.
     */
    const engine = engineAt(BELL + 400 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(395), { o: 8, c: 8.4, v: 30_000 }));

    const set = opens(engine);
    expect(set?.afterHours.price).toBe(8);
    expect(set?.afterHours.price).not.toBe(set?.regular.price);
  });
});

describe('the thin anchor is exposed rather than smoothed', () => {
  it('carries the anchoring minute trade count', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000, n: 3 }));
    expect(opens(engine)?.regular.tradeCount).toBe(3);
  });

  it('leaves an unreported count NULL rather than zero', () => {
    /*
     * A bar with no trade count is unreported; a minute with no trades has no
     * bar at all. Neither of those is "one trade", and zero would read as a
     * measurement.
     */
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000, n: null }));
    expect(opens(engine)?.regular.tradeCount).toBeNull();
  });
});

describe('the Move is derived here, so no surface divides its own numbers', () => {
  it('measures the current price against the session open', () => {
    const engine = engineAt(BELL + 5 * 60_000);
    engine.ingest(bar('ABCD', at(0), { o: 5, c: 5.1, v: 50_000 }));
    engine.ingest(bar('ABCD', at(3), { o: 5.5, c: 6, v: 10_000 }));

    // 6.00 against an open of 5.00.
    expect(opens(engine)?.regular.move).toBeCloseTo(20, 6);
  });

  it('is null before the session has a price to measure from', () => {
    const engine = engineAt(BELL - 200 * 60_000);
    expect(opens(engine)?.regular.move).toBeNull();
    expect(opens(engine)?.regular.price).toBeNull();
  });
});
