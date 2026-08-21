import { describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import type { MarketObservation } from '@/lib/market/types';
import {
  barNotional,
  computeVwap,
  selectSessionVwap,
  vwapDistance,
  vwapSessionForPhase,
  vwapSessionForTs,
} from '@/lib/market/vwap';

const TRADING_DATE = '2026-08-14'; // a Friday, EDT (UTC−4)

/** An ET wall-clock time on the trading date, as a UTC ISO string. */
function et(hour: number, minute: number, date = TRADING_DATE): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + 4, minute, 0)).toISOString();
}

function bar(
  symbol: string,
  at: string,
  values: { c: number; v: number; vw?: number | null; h?: number; l?: number },
  kind: 'bar' | 'updatedBar' = 'bar',
): MarketObservation {
  const close = values.c;
  return {
    symbol,
    kind,
    ts: at,
    receivedAt: at,
    feed: 'sip',
    price: close,
    bar: {
      symbol,
      ts: at,
      open: close,
      high: values.h ?? close,
      low: values.l ?? close,
      close,
      volume: values.v,
      tradeCount: null,
      vwap: values.vw === undefined ? close : values.vw,
      source: kind === 'bar' ? 'live-bar' : 'live-updated-bar',
      receivedAt: at,
    },
  };
}

function engine(options: { closeMinutes?: number; tradingDate?: string } = {}) {
  const demand = new DemandEngine({
    tradingDate: options.tradingDate ?? TRADING_DATE,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
    rthCloseMinutes: options.closeMinutes,
    now: () => Date.parse(et(11, 0)),
  });
  demand.track('AAAA');
  return demand;
}

describe('barNotional', () => {
  it("uses the provider's own bar VWAP when it exists", () => {
    expect(barNotional({ volume: 1_000, vwap: 5.25, high: 9, low: 1, close: 5 })).toBe(5_250);
  });

  it('falls back to the typical price when the bar carries no VWAP', () => {
    expect(barNotional({ volume: 300, vwap: null, high: 6, low: 3, close: 3 })).toBe(1_200);
  });

  it('contributes nothing for a zero-volume minute', () => {
    expect(barNotional({ volume: 0, vwap: 5, high: 5, low: 5, close: 5 })).toBe(0);
  });
});

describe('computeVwap', () => {
  it('is null rather than zero when no volume has traded', () => {
    expect(computeVwap(0, 0)).toBeNull();
  });

  it('divides notional by volume', () => {
    expect(computeVwap(10_500, 2_000)).toBe(5.25);
  });
});

describe('vwapSessionForTs', () => {
  it('places 04:00 and 09:29 in premarket', () => {
    expect(vwapSessionForTs(et(4, 0), TRADING_DATE)).toBe('PREMARKET');
    expect(vwapSessionForTs(et(9, 29), TRADING_DATE)).toBe('PREMARKET');
  });

  it('places 09:30 through 15:59 in the regular session', () => {
    expect(vwapSessionForTs(et(9, 30), TRADING_DATE)).toBe('RTH');
    expect(vwapSessionForTs(et(15, 59), TRADING_DATE)).toBe('RTH');
  });

  it('places 16:00 through 19:59 in after-hours', () => {
    expect(vwapSessionForTs(et(16, 0), TRADING_DATE)).toBe('AFTER_HOURS');
    expect(vwapSessionForTs(et(19, 59), TRADING_DATE)).toBe('AFTER_HOURS');
  });

  it('moves the regular/after-hours boundary on an early close', () => {
    const earlyClose = 13 * 60;
    expect(vwapSessionForTs(et(12, 59), TRADING_DATE, earlyClose)).toBe('RTH');
    expect(vwapSessionForTs(et(13, 0), TRADING_DATE, earlyClose)).toBe('AFTER_HOURS');
  });

  it('has no session before 04:00, after 20:00, or on another date', () => {
    expect(vwapSessionForTs(et(3, 59), TRADING_DATE)).toBeNull();
    expect(vwapSessionForTs(et(20, 0), TRADING_DATE)).toBeNull();
    expect(vwapSessionForTs(et(10, 0, '2026-08-13'), TRADING_DATE)).toBeNull();
  });
});

describe('vwapSessionForPhase', () => {
  it('reads the session the desk is actually in', () => {
    expect(vwapSessionForPhase('PREMARKET')).toBe('PREMARKET');
    expect(vwapSessionForPhase('RTH')).toBe('RTH');
    expect(vwapSessionForPhase('AFTER_HOURS')).toBe('AFTER_HOURS');
  });

  it('keeps the evening average through post-market rather than reaching back to RTH', () => {
    expect(vwapSessionForPhase('POST_MARKET')).toBe('AFTER_HOURS');
    expect(vwapSessionForPhase('NEXT_DAY_PREP')).toBe('AFTER_HOURS');
  });
});

describe('vwapDistance', () => {
  it('reports absolute and percentage distance, signed', () => {
    expect(vwapDistance(5.18, 4.87)).toEqual({
      absolute: expect.closeTo(0.31, 6),
      percent: expect.closeTo(6.366, 2),
    });
    expect(vwapDistance(4.5, 5)?.absolute).toBeCloseTo(-0.5, 6);
    expect(vwapDistance(4.5, 5)?.percent).toBeCloseTo(-10, 6);
  });

  it('has no answer without both a price and a VWAP', () => {
    expect(vwapDistance(null, 5)).toBeNull();
    expect(vwapDistance(5, null)).toBeNull();
    expect(vwapDistance(5, 0)).toBeNull();
  });
});

describe('engine session VWAP', () => {
  it('keeps premarket, regular and after-hours averages apart', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(8, 0), { c: 4, v: 1_000, vw: 4 }));
    demand.ingest(bar('AAAA', et(10, 0), { c: 6, v: 1_000, vw: 6 }));
    demand.ingest(bar('AAAA', et(17, 0), { c: 8, v: 1_000, vw: 8 }));

    const state = demand.getDemandState('AAAA');
    expect(state?.vwap.premarket).toMatchObject({ vwap: 4, volume: 1_000, coverage: 'COMPLETE' });
    expect(state?.vwap.regular).toMatchObject({ vwap: 6, volume: 1_000, coverage: 'COMPLETE' });
    expect(state?.vwap.afterHours).toMatchObject({ vwap: 8, volume: 1_000, coverage: 'COMPLETE' });
  });

  it('labels each reading with the session it belongs to', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(8, 0), { c: 4, v: 100 }));
    const state = demand.getDemandState('AAAA');
    expect(state?.vwap.premarket.label).toBe('PM VWAP');
    expect(state?.vwap.regular.label).toBe('RTH VWAP');
    expect(state?.vwap.afterHours.label).toBe('AH VWAP');
  });

  it('weights by volume across the session', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(10, 0), { c: 5, v: 1_000, vw: 5 }));
    demand.ingest(bar('AAAA', et(10, 1), { c: 6, v: 3_000, vw: 6 }));

    // (5×1000 + 6×3000) / 4000
    expect(demand.getDemandState('AAAA')?.vwap.regular.vwap).toBeCloseTo(5.75, 6);
  });

  it('applies a corrected bar as a delta rather than counting the minute twice', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(10, 0), { c: 5, v: 1_000, vw: 5 }));
    demand.ingest(bar('AAAA', et(10, 0), { c: 5, v: 2_000, vw: 7 }, 'updatedBar'));

    const regular = demand.getDemandState('AAAA')?.vwap.regular;
    expect(regular?.volume).toBe(2_000);
    expect(regular?.vwap).toBeCloseTo(7, 6);
  });

  it('reports UNAVAILABLE — never zero — for a session with no bars', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(10, 0), { c: 5, v: 1_000 }));

    const state = demand.getDemandState('AAAA');
    expect(state?.vwap.premarket.vwap).toBeNull();
    expect(state?.vwap.premarket.coverage).toBe('UNAVAILABLE');
    expect(state?.vwap.afterHours.vwap).toBeNull();
    expect(state?.vwap.afterHours.coverage).toBe('UNAVAILABLE');
  });

  it('ignores bars from another trading date', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(10, 0, '2026-08-13'), { c: 5, v: 5_000 }));
    expect(demand.getDemandState('AAAA')?.vwap.regular.coverage).toBe('UNAVAILABLE');
  });

  it('marks a session PARTIAL when a reconstructed volume base reaches into it', () => {
    const demand = engine();
    // A snapshot seed: the day's volume through 10:00 is known, the notional
    // behind it is not.
    demand.seedSession('AAAA', {
      volumeBase: 900_000,
      volumeBaseThrough: et(10, 0),
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
    });
    demand.ingest(bar('AAAA', et(10, 1), { c: 5, v: 1_000, vw: 5 }));
    demand.ingest(bar('AAAA', et(17, 0), { c: 8, v: 1_000, vw: 8 }));

    const state = demand.getDemandState('AAAA');
    // The regular session started before the base ended, so its average covers
    // only part of the session's volume.
    expect(state?.vwap.regular.coverage).toBe('PARTIAL');
    expect(state?.vwap.regular.vwap).toBeCloseTo(5, 6);
    // After-hours began after the base ended and is unaffected.
    expect(state?.vwap.afterHours.coverage).toBe('COMPLETE');
  });

  it('hands minutes back to the base when a later seed covers them', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(9, 40), { c: 5, v: 1_000, vw: 5 }));
    demand.ingest(bar('AAAA', et(10, 10), { c: 9, v: 1_000, vw: 9 }));

    demand.seedSession('AAAA', {
      volumeBase: 500_000,
      volumeBaseThrough: et(10, 0),
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
    });

    const regular = demand.getDemandState('AAAA')?.vwap.regular;
    // The 09:40 minute is now inside the base; only 10:10 remains averaged.
    expect(regular?.volume).toBe(1_000);
    expect(regular?.vwap).toBeCloseTo(9, 6);
    expect(regular?.coverage).toBe('PARTIAL');
  });

  it('moves the after-hours boundary with an early close', () => {
    const demand = engine({ closeMinutes: 13 * 60 });
    demand.ingest(bar('AAAA', et(12, 30), { c: 5, v: 1_000, vw: 5 }));
    demand.ingest(bar('AAAA', et(13, 30), { c: 8, v: 1_000, vw: 8 }));

    const state = demand.getDemandState('AAAA');
    expect(state?.vwap.regular.vwap).toBeCloseTo(5, 6);
    expect(state?.vwap.afterHours.vwap).toBeCloseTo(8, 6);
  });

  it('clears every session when the trading date rolls', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(10, 0), { c: 5, v: 1_000 }));
    expect(demand.getDemandState('AAAA')?.vwap.regular.coverage).toBe('COMPLETE');

    demand.resetSession('2026-08-17');
    expect(demand.getDemandState('AAAA')).toBeNull();
  });

  it('selects the reading for the phase the desk is in', () => {
    const demand = engine();
    demand.ingest(bar('AAAA', et(8, 0), { c: 4, v: 1_000, vw: 4 }));
    demand.ingest(bar('AAAA', et(10, 0), { c: 6, v: 1_000, vw: 6 }));

    const set = demand.getDemandState('AAAA')!.vwap;
    expect(selectSessionVwap(set, 'PREMARKET').vwap).toBe(4);
    expect(selectSessionVwap(set, 'RTH').vwap).toBe(6);
    // The evening has not happened yet; it is unavailable, not the RTH number.
    expect(selectSessionVwap(set, 'AFTER_HOURS').vwap).toBeNull();
  });
});
