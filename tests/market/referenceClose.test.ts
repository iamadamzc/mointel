import { describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import { computePercentChange, resolveReferenceRthClose } from '@/lib/market/derive';
import { hasRthClosed, rthCloseUtc } from '@/lib/market/session';
import type { MarketObservation, RvolBaseline, RthCloseReading } from '@/lib/market/types';

const FRIDAY = '2026-08-14';
const MONDAY = '2026-08-17';

const fridayClose: RthCloseReading = {
  close: 5.0,
  date: FRIDAY,
  source: 'alpaca-daily-bar-rth-close',
};
const thursdayClose: RthCloseReading = {
  close: 4.92,
  date: '2026-08-13',
  source: 'alpaca-daily-bar-rth-close',
};

describe('reference RTH close selection', () => {
  it('uses the PRIOR session close during premarket', () => {
    // Monday 07:00 ET — Monday has no close of its own yet.
    const reference = resolveReferenceRthClose(fridayClose, null, false);
    expect(reference).toEqual({
      close: 5.0,
      date: FRIDAY,
      source: 'alpaca-daily-bar-rth-close',
      basis: 'PRIOR_SESSION',
    });
  });

  it('uses the PRIOR session close during regular hours', () => {
    const reference = resolveReferenceRthClose(fridayClose, null, false);
    expect(reference?.basis).toBe('PRIOR_SESSION');
    expect(reference?.close).toBe(5.0);
  });

  it('uses the CURRENT session close after hours', () => {
    // Friday 18:00 ET — the reference is Friday's own close, not Thursday's.
    const reference = resolveReferenceRthClose(thursdayClose, fridayClose, true);
    expect(reference).toEqual({
      close: 5.0,
      date: FRIDAY,
      source: 'alpaca-daily-bar-rth-close',
      basis: 'CURRENT_SESSION',
    });
  });

  it('falls back to the prior session when today’s close has not been captured yet', () => {
    const reference = resolveReferenceRthClose(thursdayClose, null, true);
    expect(reference?.basis).toBe('PRIOR_SESSION');
    expect(reference?.close).toBe(4.92);
  });

  it('returns null when no usable reference exists, so percent change stays unknown', () => {
    expect(resolveReferenceRthClose(null, null, false)).toBeNull();
    expect(resolveReferenceRthClose({ close: 0, date: FRIDAY, source: null }, null, false)).toBeNull();
    expect(
      resolveReferenceRthClose({ close: null, date: FRIDAY, source: null }, null, true),
    ).toBeNull();
    expect(computePercentChange(6.22, null)).toBeNull();
  });
});

describe('the 16:00 ET session boundary', () => {
  it('flips exactly at the closing bell', () => {
    const closeInstant = rthCloseUtc(FRIDAY);
    expect(closeInstant.toISOString()).toBe('2026-08-14T20:00:00.000Z');

    const oneSecondBefore = new Date(closeInstant.getTime() - 1000);
    const atTheBell = new Date(closeInstant.getTime());

    expect(hasRthClosed(oneSecondBefore, FRIDAY)).toBe(false);
    expect(hasRthClosed(atTheBell, FRIDAY)).toBe(true);

    expect(resolveReferenceRthClose(thursdayClose, fridayClose, hasRthClosed(oneSecondBefore, FRIDAY))?.basis).toBe(
      'PRIOR_SESSION',
    );
    expect(resolveReferenceRthClose(thursdayClose, fridayClose, hasRthClosed(atTheBell, FRIDAY))?.basis).toBe(
      'CURRENT_SESSION',
    );
  });

  it('handles the winter offset too', () => {
    // EST: 16:00 ET is 21:00 UTC.
    expect(rthCloseUtc('2026-01-14').toISOString()).toBe('2026-01-14T21:00:00.000Z');
  });

  it('a Monday premarket instant is before Monday’s close', () => {
    // Monday 07:00 ET = 11:00 UTC.
    expect(hasRthClosed(new Date('2026-08-17T11:00:00Z'), MONDAY)).toBe(false);
  });
});

function baseline(symbol: string, previousClose: number, previousCloseDate: string): RvolBaseline {
  return {
    symbol,
    baselineDate: FRIDAY,
    previousClose,
    previousCloseDate,
    averageVolume: 1_000_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T08:00:00.000Z',
  };
}

function bar(symbol: string, ts: string, close: number, volume: number): MarketObservation {
  return {
    symbol,
    kind: 'bar',
    ts,
    receivedAt: ts,
    feed: 'sip',
    price: close,
    bar: {
      symbol,
      ts,
      open: close,
      high: close,
      low: close,
      close,
      volume,
      tradeCount: null,
      vwap: null,
      source: 'live-bar',
      receivedAt: ts,
    },
  };
}

function engineFor(tradingDate: string) {
  return new DemandEngine({
    tradingDate,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
  });
}

describe('engine percent change across the session (FIEE-shaped case)', () => {
  it('Monday premarket compares against Friday’s RTH close', () => {
    const engine = engineFor(MONDAY);
    engine.setBaselines(new Map([['FIEE', baseline('FIEE', 5.0, FRIDAY)]]));
    engine.track('FIEE');
    engine.setRthClosed(false);

    // Monday 07:00 ET premarket print at 6.22.
    engine.ingest(bar('FIEE', '2026-08-17T11:00:00.000Z', 6.22, 10_000));

    const state = engine.getDemandState('FIEE')!;
    expect(state.referenceRthClose).toBe(5.0);
    expect(state.referenceRthCloseDate).toBe(FRIDAY);
    expect(state.referenceRthCloseBasis).toBe('PRIOR_SESSION');
    expect(state.percentChange).toBeCloseTo(24.4, 5);
  });

  it('Friday after hours compares against Friday’s own RTH close, not Thursday’s', () => {
    const engine = engineFor(FRIDAY);
    engine.setBaselines(new Map([['FIEE', baseline('FIEE', 4.92, '2026-08-13')]]));
    engine.track('FIEE');

    // Before the bell: the reference is Thursday.
    engine.ingest(bar('FIEE', '2026-08-14T19:00:00.000Z', 5.1, 10_000));
    expect(engine.getDemandState('FIEE')!.referenceRthCloseBasis).toBe('PRIOR_SESSION');
    expect(engine.getDemandState('FIEE')!.referenceRthClose).toBe(4.92);

    // The bell rings and today's official close is captured.
    engine.setRthClosed(true);
    engine.setTodayRthClose('FIEE', {
      close: 5.0,
      date: FRIDAY,
      source: 'alpaca-daily-bar-rth-close',
    });

    // 18:00 ET after-hours print.
    engine.ingest(bar('FIEE', '2026-08-14T22:00:00.000Z', 6.22, 5_000_000));

    const state = engine.getDemandState('FIEE')!;
    expect(state.referenceRthClose).toBe(5.0);
    expect(state.referenceRthCloseDate).toBe(FRIDAY);
    expect(state.referenceRthCloseBasis).toBe('CURRENT_SESSION');
    expect(state.referenceRthCloseSource).toBe('alpaca-daily-bar-rth-close');
    // 6.22 vs Friday's 5.00 close = the desk's 24.4%, not 26.4% vs Thursday.
    expect(state.percentChange).toBeCloseTo(24.4, 5);
    // The prior session close is still retained for audit.
    expect(state.previousClose).toBe(4.92);
  });

  it('intraday RTH compares against the prior session close', () => {
    const engine = engineFor(FRIDAY);
    engine.setBaselines(new Map([['NWTG', baseline('NWTG', 1.32, '2026-08-13')]]));
    engine.track('NWTG');
    engine.setRthClosed(false);

    // 11:00 ET.
    engine.ingest(bar('NWTG', '2026-08-14T15:00:00.000Z', 1.5, 100_000));

    const state = engine.getDemandState('NWTG')!;
    expect(state.referenceRthCloseBasis).toBe('PRIOR_SESSION');
    expect(state.referenceRthClose).toBe(1.32);
    expect(state.percentChange).toBeCloseTo(13.636, 3);
  });

  it('reports unknown percent change when there is no reference close at all', () => {
    const engine = engineFor(FRIDAY);
    engine.setBaselines(new Map([['NEWCO', baseline('NEWCO', Number.NaN, '2026-08-13')]]));
    engine.track('NEWCO');

    engine.ingest(bar('NEWCO', '2026-08-14T15:00:00.000Z', 8, 100_000));

    const state = engine.getDemandState('NEWCO')!;
    expect(state.referenceRthClose).toBeNull();
    expect(state.percentChange).toBeNull();
  });

  it('switching the reference recomputes every tracked ticker', () => {
    const engine = engineFor(FRIDAY);
    engine.setBaselines(
      new Map([
        ['AAA', baseline('AAA', 2, '2026-08-13')],
        ['BBB', baseline('BBB', 4, '2026-08-13')],
      ]),
    );
    engine.track('AAA');
    engine.track('BBB');
    engine.ingest(bar('AAA', '2026-08-14T15:00:00.000Z', 3, 10_000));
    engine.ingest(bar('BBB', '2026-08-14T15:00:00.000Z', 5, 10_000));

    expect(engine.getDemandState('AAA')!.percentChange).toBeCloseTo(50, 5);

    engine.setRthClosed(true);
    engine.setTodayRthClose('AAA', { close: 3, date: FRIDAY, source: 'alpaca-daily-bar-rth-close' });

    expect(engine.getDemandState('AAA')!.percentChange).toBeCloseTo(0, 5);
    // BBB has no today close yet, so it stays on the prior session.
    expect(engine.getDemandState('BBB')!.referenceRthCloseBasis).toBe('PRIOR_SESSION');
    expect(engine.symbolsMissingTodayRthClose()).toEqual(['BBB']);
  });
});
