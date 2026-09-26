import { beforeEach, describe, expect, it } from 'vitest';

import { DemandEngine, type EngineEvent } from '@/lib/market/engine';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';

const TRADING_DATE = '2026-08-14';

/** 09:31 ET on the trading date, expressed in UTC. */
function ts(minutesAfter930 = 0, seconds = 0): string {
  const base = Date.UTC(2026, 7, 14, 13, 30, 0); // 09:30 ET (EDT = UTC-4)
  return new Date(base + minutesAfter930 * 60_000 + seconds * 1000).toISOString();
}

function baseline(symbol: string, averageVolume: number | null, sessionCount = 20): RvolBaseline {
  return {
    symbol,
    baselineDate: TRADING_DATE,
    previousClose: 4,
    previousCloseDate: '2026-08-13',
    averageVolume,
    sessionCount,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T08:00:00.000Z',
  };
}

function bar(
  symbol: string,
  at: string,
  values: { o?: number; h?: number; l?: number; c: number; v: number; n?: number },
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
      open: values.o ?? close,
      high: values.h ?? close,
      low: values.l ?? close,
      close,
      volume: values.v,
      // Null unless a test is exercising activity: "not reported" and "no
      // trades" are different, and the engine must not read one as the other.
      tradeCount: values.n ?? null,
      vwap: null,
      source: kind === 'bar' ? 'live-bar' : 'live-updated-bar',
      receivedAt: at,
    },
  };
}

function trade(symbol: string, at: string, price: number): MarketObservation {
  return { symbol, kind: 'trade', ts: at, receivedAt: at, feed: 'sip', price, size: 100 };
}

function status(symbol: string, at: string, code: string, message: string): MarketObservation {
  return {
    symbol,
    kind: 'status',
    ts: at,
    receivedAt: at,
    feed: 'sip',
    statusCode: code,
    statusMessage: message,
  };
}

let clock = Date.UTC(2026, 7, 14, 13, 31, 0);

function createEngine(options: Partial<ConstructorParameters<typeof DemandEngine>[0]> = {}) {
  return new DemandEngine({
    tradingDate: TRADING_DATE,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
    now: () => clock,
    ...options,
  });
}

beforeEach(() => {
  clock = Date.UTC(2026, 7, 14, 13, 31, 0);
});

describe('cumulative minute-bar volume (requirements 3, 4)', () => {
  it('accumulates minute volume across bars', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');

    engine.ingest(bar('ABCD', ts(1), { c: 2, v: 10_000 }));
    engine.ingest(bar('ABCD', ts(2), { c: 2.1, v: 15_000 }));
    engine.ingest(bar('ABCD', ts(3), { c: 2.2, v: 5_000 }));

    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(30_000);
  });

  it('replaces a corrected minute instead of double counting it', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');

    engine.ingest(bar('ABCD', ts(1), { c: 2, v: 10_000 }));
    engine.ingest(bar('ABCD', ts(2), { c: 2.1, v: 15_000 }));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(25_000);

    // The exchange corrects minute 2 upward.
    engine.ingest(bar('ABCD', ts(2), { c: 2.1, v: 40_000 }, 'updatedBar'));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(50_000);

    // And downward.
    engine.ingest(bar('ABCD', ts(2), { c: 2.1, v: 1_000 }, 'updatedBar'));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(11_000);
  });

  it('ignores bars outside the session window so overnight prints never leak in', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');

    // 22:00 ET the previous evening: rejected, and volume stays unknown rather
    // than being invented as zero.
    engine.ingest(bar('ABCD', '2026-08-14T02:00:00.000Z', { c: 2, v: 999_999 }));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBeNull();

    engine.ingest(bar('ABCD', ts(1), { c: 2, v: 1_000 }));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(1_000);
  });
});

describe('startup mid-session reconstruction (requirement 29)', () => {
  it('starts from the reconstructed base rather than zero', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));

    engine.seedSession('ABCD', {
      volumeBase: 4_000_000,
      volumeBaseThrough: ts(30),
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
      sessionHigh: 6.4,
      sessionLow: 3.9,
      price: 6.2,
      priceAt: ts(30),
      priceSource: 'sip-snapshot',
      previousClose: 4,
      previousCloseSource: 'alpaca-daily-bar',
    });

    const seeded = engine.getDemandState('ABCD');
    expect(seeded?.cumulativeVolume).toBe(4_000_000);
    expect(seeded?.rvol).toBe(4);
    expect(seeded?.sessionHigh).toBe(6.4);
    expect(seeded?.percentChange).toBeCloseTo(55, 5);

    // Live bars after the reconstruction point add on top of the base.
    engine.ingest(bar('ABCD', ts(31), { c: 6.3, v: 250_000 }));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(4_250_000);

    // A bar already covered by the base is not counted twice.
    engine.ingest(bar('ABCD', ts(29), { c: 6.1, v: 900_000 }));
    expect(engine.getDemandState('ABCD')?.cumulativeVolume).toBe(4_250_000);
  });
});

describe('stale observations cannot overwrite newer state (requirement 24)', () => {
  it('keeps the newest trade price and quote', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');

    engine.ingest(trade('ABCD', ts(10), 5.5));
    engine.ingest(trade('ABCD', ts(5), 2.2));
    expect(engine.getDemandState('ABCD')?.price).toBe(5.5);

    engine.ingest({
      symbol: 'ABCD',
      kind: 'quote',
      ts: ts(10),
      receivedAt: ts(10),
      feed: 'sip',
      bid: 5.4,
      bidSize: 2,
      ask: 5.6,
      askSize: 3,
    });
    engine.ingest({
      symbol: 'ABCD',
      kind: 'quote',
      ts: ts(4),
      receivedAt: ts(4),
      feed: 'sip',
      bid: 1,
      bidSize: 1,
      ask: 9,
      askSize: 1,
    });

    expect(engine.getDemandState('ABCD')?.quote.bid).toBe(5.4);
    expect(engine.getDemandState('ABCD')?.quote.ask).toBe(5.6);
  });
});

describe('NEW_HOD events (requirement 25)', () => {
  it('does not fire on the first established high, fires once per genuine new high', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');

    engine.ingest(bar('ABCD', ts(1), { c: 5, h: 5, l: 4.9, v: 10_000 }));
    expect(hodEvents(engine.recompute().events)).toHaveLength(0);

    engine.ingest(bar('ABCD', ts(2), { c: 5.4, h: 5.5, l: 5, v: 10_000 }));
    const first = hodEvents(engine.recompute().events);
    expect(first).toHaveLength(1);
    expect(first[0]!.payload.high).toBe(5.5);

    // Same high again: no repeat.
    engine.ingest(bar('ABCD', ts(3), { c: 5.2, h: 5.5, l: 5, v: 10_000 }));
    expect(hodEvents(engine.recompute().events)).toHaveLength(0);

    // Higher high inside the cooldown window: suppressed.
    engine.ingest(bar('ABCD', ts(4), { c: 5.6, h: 5.7, l: 5, v: 10_000 }));
    expect(hodEvents(engine.recompute().events)).toHaveLength(0);

    // Once the cooldown passes, the newest high is reported once.
    clock += 61_000;
    engine.ingest(bar('ABCD', ts(5), { c: 5.9, h: 6, l: 5.5, v: 10_000 }));
    const second = hodEvents(engine.recompute().events);
    expect(second).toHaveLength(1);
    expect(second[0]!.payload.high).toBe(6);
    expect(second[0]!.dedupeKey).not.toBe(first[0]!.dedupeKey);
  });

  it('does not fire for a high reconstructed at startup', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.seedSession('ABCD', {
      volumeBase: 1_000_000,
      volumeBaseThrough: ts(30),
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
      sessionHigh: 12,
      sessionLow: 4,
      price: 11,
      priceAt: ts(30),
    });

    expect(hodEvents(engine.recompute().events)).toHaveLength(0);
  });

  it('does not replay backfilled minute-bar highs as new highs after a restart', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));

    // Snapshot seeds an RTH-only high, then the minute backfill reveals a
    // higher extended-hours print. That is history, not a fresh HOD.
    engine.seedSession('ABCD', {
      volumeBase: 0,
      volumeBaseThrough: null,
      volumeBaseSource: 'alpaca-snapshot-daily-bar',
      sessionHigh: 5.37,
      sessionLow: 4.9,
    });
    engine.ingest(bar('ABCD', ts(1), { c: 7.2, h: 7.21, l: 5, v: 500_000 }));
    engine.markBackfillComplete();

    expect(hodEvents(engine.recompute().events)).toHaveLength(0);
    expect(engine.getDemandState('ABCD')?.sessionHigh).toBe(7.21);

    // A genuinely new high after the backfill still reports.
    engine.ingest(bar('ABCD', ts(2), { c: 7.5, h: 7.55, l: 7.2, v: 10_000 }));
    expect(hodEvents(engine.recompute().events)).toHaveLength(1);
  });
});

describe('halt and resume transitions (requirements 26, 27)', () => {
  it('emits HALT on entering and RESUME on leaving the halted state, once each', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');

    expect(engine.ingest(status('ABCD', ts(1), 'T', 'Trading Resumption'))).toHaveLength(0);

    const halted = engine.ingest(status('ABCD', ts(2), 'H', 'Trading Halt'));
    expect(halted).toHaveLength(1);
    expect(halted[0]!.type).toBe('HALT');
    expect(engine.getDemandState('ABCD')?.haltState).toBe('HALTED');

    // Repeated halt status is not a transition.
    expect(engine.ingest(status('ABCD', ts(3), 'H', 'Trading Halt'))).toHaveLength(0);

    const resumed = engine.ingest(status('ABCD', ts(4), 'T', 'Trading Resumption'));
    expect(resumed).toHaveLength(1);
    expect(resumed[0]!.type).toBe('RESUME');
    expect(engine.getDemandState('ABCD')?.haltState).toBe('TRADING');

    expect(engine.ingest(status('ABCD', ts(5), 'T', 'Trading Resumption'))).toHaveLength(0);
  });

  it('preserves the raw exchange status alongside the normalized state', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['ABCD', baseline('ABCD', 1_000_000)]]));
    engine.track('ABCD');
    engine.ingest(status('ABCD', ts(2), 'H', 'Trading Halt'));

    const state = engine.getDemandState('ABCD');
    expect(state?.haltRaw).toContain('H');
    expect(state?.haltRaw).toContain('Trading Halt');
  });

  it('ignores status messages for symbols it is not tracking', () => {
    const engine = createEngine();
    expect(engine.ingest(status('NOTTRACKED', ts(1), 'H', 'Trading Halt'))).toHaveLength(0);
    expect(engine.isTracked('NOTTRACKED')).toBe(false);
  });
});

describe('discovery rank entry events (requirements 14, 15)', () => {
  function seedBoard(engine: DemandEngine, count: number) {
    const baselines = new Map<string, RvolBaseline>();
    for (let index = 0; index < count; index += 1) {
      const symbol = `SY${String(index).padStart(2, '0')}`;
      baselines.set(symbol, baseline(symbol, 1_000_000));
    }
    engine.setBaselines(baselines);
    for (const symbol of baselines.keys()) engine.track(symbol);

    // Descending volume so SY00 ranks 1 and SY19 ranks 20.
    let index = 0;
    for (const symbol of baselines.keys()) {
      engine.ingest(bar(symbol, ts(1), { c: 5, v: 5_000_000 - index * 100_000 }));
      index += 1;
    }
  }

  it('fires exactly one RVOL_RANK_ENTRY when a ticker enters the Top 12', () => {
    const engine = createEngine();
    seedBoard(engine, 20);

    const first = engine.recompute();
    const entries = first.events.filter((event) => event.type === 'RVOL_RANK_ENTRY');
    expect(entries).toHaveLength(12);
    expect(entries.map((event) => event.symbol)).toContain('SY00');

    // Steady state: no repeats while the ticker stays inside.
    engine.ingest(bar('SY00', ts(2), { c: 5, v: 10_000 }));
    const second = engine.recompute();
    expect(second.events.filter((event) => event.type === 'RVOL_RANK_ENTRY')).toHaveLength(0);
  });

  it('stamps Top-N entry once, separately from qualification', () => {
    const engine = createEngine();
    seedBoard(engine, 20);
    engine.recompute();

    const inside = engine.getDemandState('SY00');
    const outside = engine.getDemandState('SY19');

    expect(inside?.top12EnteredAt).not.toBeNull();
    // Rank 20 never crossed the threshold, so it carries no entry stamp even
    // though it qualified into the tracked population.
    expect(outside?.top12EnteredAt).toBeNull();
    expect(outside?.qualified).not.toBeNull();

    // qualifiedAt marks entry at ANY rank and is retained, not replaced.
    expect(inside?.qualified).not.toBeNull();
  });

  it('does not rewrite the entry stamp when a ticker re-enters', () => {
    const engine = createEngine();
    seedBoard(engine, 20);
    engine.recompute();

    const original = engine.getDemandState('SY00')?.top12EnteredAt;
    expect(original).not.toBeNull();

    // Push SY00 out of the threshold, then bring it back.
    for (let index = 1; index < 20; index += 1) {
      engine.ingest(bar(`SY${String(index).padStart(2, '0')}`, ts(2), { c: 5, v: 90_000_000 }));
    }
    engine.recompute();
    expect(engine.getDemandState('SY00')?.rvolRank).toBeGreaterThan(12);

    clock += 6 * 60_000;
    engine.ingest(bar('SY00', ts(3), { c: 5, v: 900_000_000 }));
    engine.recompute();

    // Latency is measured from the FIRST crossing; re-entry must not restart it.
    expect(engine.getDemandState('SY00')?.top12EnteredAt).toBe(original);
  });

  it('stamps entry even when the cooldown suppresses the event', () => {
    /*
     * The cooldown exists to limit desk-event volume on rapid re-entry.
     * Measurement must not inherit a rule written for notification volume, so
     * the stamp is set independently of whether an event fires.
     */
    const engine = createEngine();
    seedBoard(engine, 20);
    engine.recompute();

    // SY19 has never been inside, so its first crossing stamps and fires.
    engine.ingest(bar('SY19', ts(2), { c: 5, v: 50_000_000 }));
    const promoted = engine.recompute();
    expect(
      promoted.events.filter((e) => e.type === 'RVOL_RANK_ENTRY' && e.symbol === 'SY19'),
    ).toHaveLength(1);
    const stamped = engine.getDemandState('SY19')?.top12EnteredAt;
    expect(stamped).not.toBeNull();

    // Force it out and straight back in: the event is suppressed by cooldown
    // while the original stamp is preserved untouched.
    for (let index = 0; index < 19; index += 1) {
      engine.ingest(bar(`SY${String(index).padStart(2, '0')}`, ts(3), { c: 5, v: 90_000_000 }));
    }
    engine.recompute();
    engine.ingest(bar('SY19', ts(4), { c: 5, v: 900_000_000 }));
    const quick = engine.recompute();

    expect(
      quick.events.filter((e) => e.type === 'RVOL_RANK_ENTRY' && e.symbol === 'SY19'),
    ).toHaveLength(0);
    expect(engine.getDemandState('SY19')?.top12EnteredAt).toBe(stamped);
  });

  it('suppresses re-entry inside the cooldown and allows it afterwards', () => {
    const engine = createEngine();
    seedBoard(engine, 20);
    engine.recompute();

    // Push SY19 (rank 20) to the top.
    engine.ingest(bar('SY19', ts(2), { c: 5, v: 50_000_000 }));
    const promoted = engine.recompute();
    expect(promoted.events.filter((event) => event.type === 'RVOL_RANK_ENTRY')).toHaveLength(1);

    // Drop it back out by lifting everyone else.
    for (let index = 0; index < 19; index += 1) {
      engine.ingest(bar(`SY${String(index).padStart(2, '0')}`, ts(3), { c: 5, v: 90_000_000 }));
    }
    const demoted = engine.recompute();
    expect(demoted.events.filter((event) => event.type === 'RVOL_RANK_ENTRY')).toHaveLength(0);
    expect(engine.getDemandState('SY19')?.rvolRank).toBeGreaterThan(12);

    // Immediate re-entry: suppressed, because it never really left.
    engine.ingest(bar('SY19', ts(4), { c: 5, v: 900_000_000 }));
    const quickReentry = engine.recompute();
    expect(
      quickReentry.events.filter(
        (event) => event.type === 'RVOL_RANK_ENTRY' && event.symbol === 'SY19',
      ),
    ).toHaveLength(0);

    // Leave again, wait past the cooldown, then re-enter: reported.
    for (let index = 0; index < 19; index += 1) {
      engine.ingest(bar(`SY${String(index).padStart(2, '0')}`, ts(5), { c: 5, v: 9_000_000_000 }));
    }
    engine.recompute();
    clock += 6 * 60_000;
    engine.ingest(bar('SY19', ts(6), { c: 5, v: 90_000_000_000 }));
    const lateReentry = engine.recompute();
    expect(
      lateReentry.events.filter(
        (event) => event.type === 'RVOL_RANK_ENTRY' && event.symbol === 'SY19',
      ),
    ).toHaveLength(1);
  });
});

describe('price-range qualification and session latch (requirements 16, 17, 18)', () => {
  it('latches a ticker that qualifies inside the discovery range', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['RUN', baseline('RUN', 1_000_000)]]));
    engine.track('RUN');

    engine.ingest(bar('RUN', ts(1), { c: 6.5, v: 3_000_000 }));
    const result = engine.recompute();

    const state = engine.getDemandState('RUN');
    expect(state?.latched).toBe(true);
    expect(state?.qualified?.price).toBe(6.5);
    expect(state?.qualified?.rank).toBe(1);
    expect(state?.qualified?.rvol).toBe(3);
    expect(result.events.some((event) => event.type === 'DISCOVERY_QUALIFIED')).toBe(true);
  });

  it('keeps a super-runner ranked after it trades above the discovery maximum', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['RUN', baseline('RUN', 1_000_000)]]));
    engine.track('RUN');

    engine.ingest(bar('RUN', ts(1), { c: 6.5, v: 3_000_000 }));
    engine.recompute();

    // The move carries it well above $20.
    engine.ingest(bar('RUN', ts(20), { c: 41.75, v: 8_000_000 }));
    const result = engine.recompute();

    const state = engine.getDemandState('RUN');
    expect(state?.price).toBe(41.75);
    expect(state?.rvolRank).toBe(1);
    expect(state?.latched).toBe(true);
    expect(state?.qualified?.price).toBe(6.5);
    expect(result.eligibleCount).toBe(1);
  });

  it('does not qualify a ticker that never traded inside the range', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['HIGH', baseline('HIGH', 1_000_000)]]));
    engine.track('HIGH');

    engine.ingest(bar('HIGH', ts(1), { c: 240, v: 9_000_000 }));
    const result = engine.recompute();

    expect(engine.getDemandState('HIGH')?.latched).toBe(false);
    expect(engine.getDemandState('HIGH')?.rvolRank).toBeNull();
    expect(result.eligibleCount).toBe(0);
  });

  it('clears the latch on a session reset', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['RUN', baseline('RUN', 1_000_000)]]));
    engine.track('RUN');
    engine.ingest(bar('RUN', ts(1), { c: 6.5, v: 3_000_000 }));
    engine.recompute();
    expect(engine.getDemandState('RUN')?.latched).toBe(true);

    engine.resetSession('2026-08-17');

    expect(engine.getDemandState('RUN')).toBeNull();
    expect(engine.trackedCount).toBe(0);
    expect(engine.tradingDate).toBe('2026-08-17');
  });
});

describe('unknown baselines produce unknown RVOL (requirement 11)', () => {
  it('tracks the ticker but leaves RVOL and rank null', () => {
    const engine = createEngine();
    engine.setBaselines(new Map([['NOBASE', baseline('NOBASE', null, 0)]]));
    engine.track('NOBASE');

    engine.ingest(bar('NOBASE', ts(1), { c: 5, v: 4_000_000 }));
    const result = engine.recompute();

    const state = engine.getDemandState('NOBASE');
    expect(state?.cumulativeVolume).toBe(4_000_000);
    expect(state?.rvol).toBeNull();
    expect(state?.rvolRank).toBeNull();
    expect(state?.rvolConfidence).toBe('UNKNOWN');
    expect(result.eligibleCount).toBe(0);
  });
});

describe('ranked discovery is restricted to operating-company equity', () => {
  it('keeps a preferred series out of the ranking while still tracking it', () => {
    const engine = createEngine({
      // Mirrors the classification layer: PSA.PRM is a preferred series.
      isDiscoveryEligible: (symbol) => symbol !== 'PSA.PRM',
    });

    engine.setBaselines(
      new Map([
        ['PSA.PRM', baseline('PSA.PRM', 100_000)],
        ['FIEE', baseline('FIEE', 1_000_000)],
      ]),
    );
    engine.track('PSA.PRM');
    engine.track('FIEE');

    // The preferred has the far higher RVOL and would otherwise rank first.
    engine.ingest(bar('PSA.PRM', ts(1), { c: 15.67, v: 4_000_000 }));
    engine.ingest(bar('FIEE', ts(1), { c: 6.22, v: 2_000_000 }));

    const result = engine.recompute();

    expect(engine.getDemandState('PSA.PRM')?.rvolRank).toBeNull();
    expect(engine.getDemandState('FIEE')?.rvolRank).toBe(1);
    expect(result.eligibleCount).toBe(1);

    // Still tracked, with its market state intact — just not ranked.
    const preferred = engine.getDemandState('PSA.PRM');
    expect(preferred).not.toBeNull();
    expect(preferred?.cumulativeVolume).toBe(4_000_000);
    expect(preferred?.rvol).toBeCloseTo(40, 5);
  });

  it('ranks everything when no classification evidence is available', () => {
    const engine = createEngine();
    engine.setBaselines(
      new Map([
        ['PSA.PRM', baseline('PSA.PRM', 100_000)],
        ['FIEE', baseline('FIEE', 1_000_000)],
      ]),
    );
    engine.track('PSA.PRM');
    engine.track('FIEE');
    engine.ingest(bar('PSA.PRM', ts(1), { c: 15.67, v: 4_000_000 }));
    engine.ingest(bar('FIEE', ts(1), { c: 6.22, v: 2_000_000 }));

    expect(engine.recompute().eligibleCount).toBe(2);
  });

  it('does not emit discovery events for an ineligible instrument', () => {
    const engine = createEngine({ isDiscoveryEligible: (symbol) => symbol !== 'ABCD.WS' });
    engine.setBaselines(new Map([['ABCD.WS', baseline('ABCD.WS', 100_000)]]));
    engine.track('ABCD.WS');
    engine.ingest(bar('ABCD.WS', ts(1), { c: 2, v: 5_000_000 }));

    const result = engine.recompute();
    expect(result.events).toHaveLength(0);
    expect(engine.getDemandState('ABCD.WS')?.latched).toBe(false);
  });
});

describe('high-resolution interest set', () => {
  it('is the union of sheet names, top internal ranks and latched candidates', () => {
    const engine = createEngine({ internalRank: 3 });
    const baselines = new Map<string, RvolBaseline>();
    for (const symbol of ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'SHEET', 'EXPENSIVE']) {
      baselines.set(symbol, baseline(symbol, 1_000_000));
    }
    engine.setBaselines(baselines);
    engine.setPinnedSymbols(['SHEET']);

    for (const [index, symbol] of ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].entries()) {
      engine.track(symbol);
      engine.ingest(bar(symbol, ts(1), { c: 5, v: 5_000_000 - index * 500_000 }));
    }

    // Never inside the discovery price range: not ranked, never latched.
    engine.track('EXPENSIVE');
    engine.ingest(bar('EXPENSIVE', ts(1), { c: 480, v: 9_000_000 }));

    engine.recompute();
    const highRes = engine.highResSymbols();

    // TODAY-sheet name, even though it has no market data yet.
    expect(highRes).toContain('SHEET');
    // Top internal ranks.
    expect(highRes).toContain('AAA');
    expect(highRes).toContain('BBB');
    expect(highRes).toContain('CCC');
    // Latched earlier in the session, now outside the top 3 — still watched.
    expect(highRes).toContain('DDD');
    expect(highRes).toContain('EEE');
    expect(engine.getDemandState('EEE')?.rvolRank).toBeGreaterThan(3);
    // Neither pinned, ranked, nor latched.
    expect(highRes).not.toContain('EXPENSIVE');
  });

  it('drops a DEAD name from the set and keeps the live one', () => {
    /*
     * RANKED AND ALIVE. The set is capped at 250 and rank alone put corpses in
     * it: RVOL is cumulative, so a dead name keeps the rank its morning
     * earned, and a dead name at rank 3 held a trades/quotes slot a live name
     * was waiting for.
     *
     * Both names here are ranked and latched, so BEFORE this change both were
     * selected twice over -- by the rank gate and by the latch. Only activity
     * separates them.
     */
    const engine = createEngine({ internalRank: 50 });
    engine.setBaselines(
      new Map([
        ['LIVE', baseline('LIVE', 1_000_000)],
        ['GONE', baseline('GONE', 1_000_000)],
      ]),
    );
    engine.track('LIVE');
    engine.track('GONE');

    // Both trade early, so both rank and both latch.
    engine.ingest(bar('LIVE', ts(5), { c: 5, v: 5_000_000, n: 900 }));
    engine.ingest(bar('GONE', ts(5), { c: 5, v: 4_000_000, n: 900 }));

    // Advance to 13:50. The judged window is 13:44-13:48 (five minutes, after
    // the one-minute settle), so the 13:35 bars above sit outside it.
    clock = Date.UTC(2026, 7, 14, 13, 50, 0);
    // LIVE keeps trading inside the window; GONE produces no bars at all,
    // which is how death actually arrives -- absent rows, not low counts.
    engine.ingest(bar('LIVE', ts(17), { c: 5, v: 500_000, n: 900 }));
    engine.ingest(bar('LIVE', ts(18), { c: 5, v: 500_000, n: 900 }));
    // Through the NEWEST judged minute, so the fixture covers the window at
    // any settle rather than stopping where a one-minute settle used to end.
    engine.ingest(bar('LIVE', ts(19), { c: 5, v: 500_000, n: 900 }));

    engine.recompute();

    expect(engine.getDemandState('GONE')?.activity).toBe('DEAD');
    expect(engine.getDemandState('LIVE')?.activity).toBe('ACTIVE');

    const highRes = engine.highResSymbols();
    expect(highRes).toContain('LIVE');
    expect(highRes).not.toContain('GONE');

    // The rank is UNTOUCHED -- the graveyard needs the row whole, so only the
    // reader changed. If this ever starts returning null, the fix has drifted
    // into nulling the rank and the graveyard loses its data.
    expect(engine.getDemandState('GONE')?.rvolRank).not.toBeNull();
    expect(engine.getDemandState('GONE')?.latched).toBe(true);
  });

  it('captures rank, peak and PRICE at the death, not at the read', () => {
    /*
     * All three keep moving after a death, so a value read when the graveyard
     * renders is not the value at the death. Price is the one that decides
     * whether the RULE is wrong: deathCount shows the rule firing often, but
     * only "revived AND RAN" shows it firing WRONGLY, and that needs a
     * baseline taken here. percentChange cannot substitute -- it is the
     * session move, so a name that was up before dying and is up now looks
     * identical to one that ran after reviving.
     */
    const engine = createEngine({ internalRank: 50 });
    engine.setBaselines(new Map([['GONE', baseline('GONE', 1_000_000)]]));
    engine.track('GONE');
    engine.ingest(bar('GONE', ts(5), { c: 7.5, v: 4_000_000, n: 1240 }));

    clock = Date.UTC(2026, 7, 14, 13, 50, 0);
    engine.recompute();

    const dead = engine.getDemandState('GONE');
    expect(dead?.activity).toBe('DEAD');
    expect(dead?.deadAtPrice).toBe(7.5);
    expect(dead?.deadAtPeakTrades).toBe(1240);
    expect(dead?.deathCount).toBe(1);

    // The price moves on; the captured one does not follow it.
    engine.ingest(bar('GONE', ts(19), { c: 11.25, v: 100_000, n: 5 }));
    engine.recompute();
    expect(engine.getDemandState('GONE')?.price).toBe(11.25);
    expect(engine.getDemandState('GONE')?.deadAtPrice).toBe(7.5);
  });
});

function hodEvents(events: EngineEvent[]): EngineEvent[] {
  return events.filter((event) => event.type === 'NEW_HOD');
}

/**
 * Ten-second trade capture — his ruling, 2026-09-25.
 *
 * *"im a thousand percent certain a 10s shows you something a minute doesn't.
 * ive seen stocks go up 50 percent and volume quintuple inside 30 seconds."*
 * He overruled a 60-second column offered as a cheaper intermediate — *"I
 * honestly don't understand the purpose of a 60 second column"* — and was right
 * that it is the same measurement arriving sooner rather than a different one.
 *
 * THE DEFECT THESE TESTS EXIST FOR is positional. `ingestTrade` ends with
 * `isNewerObservation(runtime.priceAt, observation.ts)`, which is correct for
 * "latest price wins" and wrong for a count: it drops out-of-order arrivals,
 * which are likeliest when the tape is fastest. A counter below that guard would
 * undercount worst inside the very minutes this capture exists to reveal.
 */
describe('ten-second trade capture', () => {
  function highResEngine() {
    const engine = createEngine({ internalRank: 3 });
    const baselines = new Map<string, RvolBaseline>();
    for (const symbol of ['AAA', 'QUIET']) baselines.set(symbol, baseline(symbol, 1_000_000));
    engine.setBaselines(baselines);
    engine.track('AAA');
    engine.ingest(bar('AAA', ts(1), { c: 5, v: 5_000_000 }));
    engine.recompute();
    return engine;
  }

  function trade(symbol: string, at: string, price: number | null = 5): MarketObservation {
    return { symbol, kind: 'trade', ts: at, feed: 'sip', price, receivedAt: at };
  }

  it('buckets trades by ten seconds of event time', () => {
    const engine = highResEngine();
    expect(engine.highResSymbols()).toContain('AAA');

    engine.ingest(trade('AAA', ts(2, 1)));
    engine.ingest(trade('AAA', ts(2, 4)));
    engine.ingest(trade('AAA', ts(2, 9)));
    engine.ingest(trade('AAA', ts(2, 11)));

    const rows = engine.drainTradeBuckets(Date.parse(ts(3)));
    expect(rows).toHaveLength(2);
    expect(rows[0].trades).toBe(3);
    expect(rows[1].trades).toBe(1);
    // Bucket starts are floored to the grain, not the first trade's time.
    expect(rows[1].bucketTs - rows[0].bucketTs).toBe(10_000);
  });

  it('COUNTS AN OUT-OF-ORDER TRADE, which the price path discards', () => {
    /*
     * The regression this capture was built around. The second trade is OLDER
     * than the first, so `isNewerObservation` returns false and everything below
     * it is skipped -- the price is correctly left alone. The COUNT must still
     * see it.
     */
    const engine = highResEngine();
    engine.ingest(trade('AAA', ts(2, 5), 6));
    engine.ingest(trade('AAA', ts(2, 3), 5.5));

    const rows = engine.drainTradeBuckets(Date.parse(ts(3)));
    expect(rows).toHaveLength(1);
    expect(rows[0].trades).toBe(2);
    // And the out-of-order trade still did not move the price.
    expect(engine.getDemandState('AAA')?.price).toBe(6);
  });

  it('does not count a print with no usable price', () => {
    // A trade with no price is a mapping failure on our side, not activity.
    const engine = highResEngine();
    engine.ingest(trade('AAA', ts(2, 1), null));
    engine.ingest(trade('AAA', ts(2, 2), 0));
    expect(engine.drainTradeBuckets(Date.parse(ts(3)))).toHaveLength(0);
  });

  it('reports NOTHING for a name with no trade subscription, not zeroes', () => {
    /*
     * A name without a trade-level subscription receives no trades at all, so a
     * zero row would assert that it printed nothing in ten seconds -- a
     * different and much louder claim than "nobody was listening".
     */
    const engine = highResEngine();
    engine.track('QUIET');
    expect(engine.highResSymbols()).not.toContain('QUIET');
    engine.ingest(trade('QUIET', ts(2, 1)));
    expect(engine.drainTradeBuckets(Date.parse(ts(3)))).toHaveLength(0);
  });

  it('COUNTS A LATE PRINT into its own bucket instead of reviving it at 1', () => {
    /*
     * The hole Ops found in the store review. The drain used to drop a bucket
     * the moment it settled, so a trade arriving for it moments later -- flush
     * timing against a late print on a fast tape -- recreated the bucket at 1,
     * and a settled minute's activity was emitted as a single trade.
     *
     * `trades.ts` upserts MAX(trades, excluded.trades), which stops a revived 1
     * clobbering a stored N. That is a FLOOR under the defect, not a fix: it
     * bounds the damage to the late prints and cannot recover them. Keeping the
     * bucket in memory for a grace period is what actually counts them.
     */
    const engine = highResEngine();
    engine.ingest(trade('AAA', ts(2, 1)));
    engine.ingest(trade('AAA', ts(2, 3)));

    // Drain well after that bucket settled -- previously it was dropped here.
    const first = engine.drainTradeBuckets(Date.parse(ts(2, 25)));
    expect(first).toHaveLength(1);
    expect(first[0].trades).toBe(2);

    // A late print for the SETTLED bucket.
    engine.ingest(trade('AAA', ts(2, 5)));

    const second = engine.drainTradeBuckets(Date.parse(ts(2, 26)));
    const revived = second.find((r) => r.bucketTs === first[0].bucketTs);
    // Three, not one: the late trade joined its bucket rather than replacing it.
    expect(revived?.trades).toBe(3);
  });

  it('still drops a bucket once it is past the grace, so the map cannot grow forever', () => {
    /*
     * The grace must not become a leak. `af998eb` shipped alone had NO reaper
     * in production -- the only deletion lives in this drain and nothing called
     * it -- so every bucket that ever saw a trade would have stayed for the
     * life of the process. The consumer is wired now; this asserts the drain
     * still reaps.
     */
    const engine = highResEngine();
    engine.ingest(trade('AAA', ts(2, 1)));
    engine.drainTradeBuckets(Date.parse(ts(2, 25)));

    /*
     * The drain EMITS a bucket and then reaps it, so the call that ages a
     * bucket out still returns it once. The call after that is the empty one,
     * and that ordering is deliberate: a bucket must be written before it is
     * forgotten.
     */
    const ages = engine.drainTradeBuckets(Date.parse(ts(4)));
    expect(ages).toHaveLength(1);

    const after = engine.drainTradeBuckets(Date.parse(ts(4, 30)));
    expect(after).toHaveLength(0);
  });

  it('re-emits within the grace, and the filling bucket keeps accumulating', () => {
    /*
     * The store key is (symbol, trading_date, bucket_ts) and the upsert takes
     * MAX, so re-emitting a bucket is idempotent and it settles at its final
     * value. Withholding the newest bucket until it closed would delay the most
     * recent ten seconds, which is the only data this capture exists for.
     *
     * REWRITTEN when the grace landed. It previously asserted that a settled
     * bucket is gone on the next drain, which was the behaviour that let a late
     * print revive it at 1.
     */
    const engine = highResEngine();
    engine.ingest(trade('AAA', ts(2, 1)));
    engine.ingest(trade('AAA', ts(2, 15)));

    const first = engine.drainTradeBuckets(Date.parse(ts(2, 16)));
    expect(first).toHaveLength(2);

    engine.ingest(trade('AAA', ts(2, 17)));
    const second = engine.drainTradeBuckets(Date.parse(ts(2, 18)));

    // Both still present -- the settled one is inside the grace.
    expect(second).toHaveLength(2);
    // And the filling one carries its new total rather than restarting.
    expect(second[1].trades).toBe(2);
  });
});
