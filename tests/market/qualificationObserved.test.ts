import { describe, expect, it } from 'vitest';

import { DemandEngine, REPLAYED_VOLUME_BASE_SOURCE } from '@/lib/market/engine';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';

/*
 * `qualifiedAt` LATCHES WHEN THE DESK FIRST SEES A NAME, NOT WHEN IT MOVED.
 *
 * After a 05:30 restart a name that broke at 04:10 is stamped 05:30, so an hour
 * rendered off that timestamp is a market claim manufactured from a process
 * fact. `observed` is the engine's own answer to "was the open of the session
 * this latch fell in actually covered", and Design degrades the badge from
 * `STARTED 5AM` to `STARTED TODAY` when it is false.
 */
const TRADING_DATE = '2026-08-14';
/** 04:00 ET, the premarket open, in UTC. The window is EDT. */
const PREMARKET_OPEN = Date.UTC(2026, 7, 14, 8, 0, 0);
const at = (minsAfterOpen: number) => PREMARKET_OPEN + minsAfterOpen * 60_000;

function baseline(symbol: string): RvolBaseline {
  return { symbol, baselineDate: TRADING_DATE, previousClose: 4, previousCloseDate: '2026-08-13',
    averageVolume: 1_000_000, sessionCount: 20, targetSessions: 20, sessionDates: [],
    dataSource: 'test', feed: 'sip', adjustment: 'split', calculatedAt: '2026-08-14T07:00:00.000Z' };
}
function bar(symbol: string, ts: number, close: number): MarketObservation {
  const iso = new Date(ts).toISOString();
  return { symbol, kind: 'bar', ts: iso, receivedAt: iso, feed: 'sip', price: close,
    bar: { symbol, ts: iso, open: close, high: close, low: close, close,
           volume: 50_000, tradeCount: 20, vwap: close } } as MarketObservation;
}
/** Runs a session whose latch falls at 05:30 ET, with the desk starting when told. */
function qualifyAt(observingSince: number, replayed = false) {
  const clock = at(90); // 05:30 ET
  const engine = new DemandEngine({
    tradingDate: TRADING_DATE, feed: 'sip', discoveryRank: 12, internalRank: 50,
    priceMin: 1, priceMax: 20, baselineSessions: 20,
    now: () => clock, observingSince,
  });
  engine.setBaselines(new Map([['ABCD', baseline('ABCD')]]));
  engine.track('ABCD');
  if (replayed) {
    engine.seedSession('ABCD', {
      volumeBase: 500_000, volumeBaseThrough: null,
      volumeBaseSource: REPLAYED_VOLUME_BASE_SOURCE, sessionHigh: 5, sessionLow: 4,
    });
  }
  engine.ingest(bar('ABCD', clock, 5));
  engine.recompute();
  return engine.getDemandState('ABCD')?.qualified ?? null;
}

describe('DiscoveryQualification.observed', () => {
  it('is TRUE when the desk was watching from the session open', () => {
    const q = qualifyAt(PREMARKET_OPEN - 60_000); // running a minute before 04:00
    expect(q?.at).toBeTruthy();
    expect(q?.observed).toBe(true);
  });

  it('is FALSE after a restart that missed the open, which is the whole point', () => {
    /*
     * Started 05:29, latched 05:30. The name may have broken at 04:10 and this
     * process cannot know: its bars before startup were never seen. `STARTED
     * 5AM` off this timestamp would be an hour invented by a deploy.
     */
    const q = qualifyAt(at(89));
    expect(q?.at).toBeTruthy();
    expect(q?.observed).toBe(false);
  });

  it('is FALSE when the latch time resolves to no session at all', () => {
    /*
     * 20:30 ET is past the after-hours close, so `vwapSessionForTs` returns
     * null and there is no session open to have covered. Unable to vouch is not
     * the same as vouching, so the arm returns false rather than true.
     *
     * Written because a mutation flipping that arm to `true` killed no test --
     * the guard was correct and unexercised, which is how it would survive an
     * edit later.
     */
    const clock = Date.UTC(2026, 7, 15, 0, 30, 0); // 20:30 ET on the trading date
    const engine = new DemandEngine({
      tradingDate: TRADING_DATE, feed: 'sip', discoveryRank: 12, internalRank: 50,
      priceMin: 1, priceMax: 20, baselineSessions: 20,
      now: () => clock, observingSince: PREMARKET_OPEN - 60_000,
    });
    engine.setBaselines(new Map([['ABCD', baseline('ABCD')]]));
    engine.track('ABCD');
    engine.seedSession('ABCD', {
      volumeBase: 500_000, volumeBaseThrough: null,
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
      price: 5, priceAt: new Date(clock).toISOString(),
    });
    engine.recompute();
    const q = engine.getDemandState('ABCD')?.qualified ?? null;

    expect(q?.at).toBeTruthy();
    // The desk WAS watching from the open, so this is not the restart case --
    // it is the unresolvable-session case, and it still must not vouch.
    expect(q?.observed).toBe(false);
  });

  it('is TRUE again once the bootstrap replay has rebuilt the symbol from stored bars', () => {
    // A late start whose base came from replay HAS the session's own tape, so
    // the open is covered after all -- `anchorObservable`'s second arm.
    const q = qualifyAt(at(89), true);
    expect(q?.observed).toBe(true);
  });
});
