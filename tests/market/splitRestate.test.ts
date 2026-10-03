import { describe, expect, it, vi } from 'vitest';

import { AlpacaRestClient, type AlpacaDailyBar } from '@/lib/market/alpaca/rest';
import type { AlpacaCredentials } from '@/lib/market/credentials';
import { DemandEngine } from '@/lib/market/engine';
import {
  buildSplitBaselines,
  firstPrintBasis,
  restateBars,
  SPLIT_OLD_BASIS_SOURCE,
  SPLIT_RESTATED_SOURCE,
  type SplitAction,
  type SplitDataClient,
} from '@/lib/market/splitRestate';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';

/*
 * The split-day prior close (Research, docs/research/split-day-previous-close,
 * 2026-10-03). WCT took a 1-for-5 effective 2026-09-08 and its baseline carried
 * the pre-split close, so the desk would have shown about +408% from the first
 * premarket print. Fixtures use that shape: raw closes near $1.60 before the
 * split, prints near $8.21 after it.
 */

const TRADING_DATE = '2026-09-08';

function dailyBar(date: string, close: number, volume: number): AlpacaDailyBar {
  return { t: `${date}T04:00:00Z`, o: close, h: close, l: close, c: close, v: volume };
}

const WCT_TODAY: SplitAction = { symbol: 'WCT', exDate: TRADING_DATE, oldRate: 5, newRate: 1 };

/**
 * A fake client that answers differently by adjustment: 'split' bars are
 * ALREADY on the new basis (Alpaca current, NIVF's case). An implementation
 * that read them instead of 'raw' would adjust twice, and these tests see it.
 */
function fakeClient(options: {
  raw: Record<string, AlpacaDailyBar[]>;
  adjusted?: Record<string, AlpacaDailyBar[]>;
  windowSplits?: SplitAction[];
}) {
  const barCalls: Array<{ symbols: string[]; adjustment: string | undefined }> = [];
  const splitCalls: Array<{ symbols?: string[]; start: string; end: string }> = [];
  const client: SplitDataClient = {
    async getBars(symbols, params) {
      barCalls.push({ symbols, adjustment: params.adjustment });
      const source = params.adjustment === 'raw' ? options.raw : (options.adjusted ?? options.raw);
      return new Map(symbols.filter((symbol) => source[symbol]).map((symbol) => [symbol, source[symbol]!]));
    },
    async getSplits(params) {
      splitCalls.push(params);
      return (options.windowSplits ?? []).filter((split) => !params.symbols || params.symbols.includes(split.symbol));
    },
  };
  return { client, barCalls, splitCalls };
}

function input(client: SplitDataClient, todaySplits: Map<string, SplitAction>) {
  return {
    client,
    todaySplits,
    tradingDate: TRADING_DATE,
    start: '2026-07-10',
    end: '2026-09-07',
    targetSessions: 20,
    feed: 'sip' as const,
    calculatedAt: '2026-09-08T07:40:00.000Z',
  };
}

describe('restateBars', () => {
  const bars = [
    { date: '2026-08-10', close: 0.5, volume: 3_000_000 },
    { date: '2026-08-20', close: 1.5, volume: 600_000 },
    { date: '2026-09-04', close: 1.6, volume: 500_000 },
  ];

  it('restates every bar before an ex-date onto today\'s basis, prices up and volume down', () => {
    expect(restateBars(bars, [WCT_TODAY], TRADING_DATE)).toEqual([
      { date: '2026-08-10', close: 2.5, volume: 600_000 },
      { date: '2026-08-20', close: 7.5, volume: 120_000 },
      { date: '2026-09-04', close: 8, volume: 100_000 },
    ]);
  });

  it('applies EVERY split in the window cumulatively, not only today\'s', () => {
    const earlier: SplitAction = { symbol: 'WCT', exDate: '2026-08-15', oldRate: 3, newRate: 1 };
    const out = restateBars(bars, [earlier, WCT_TODAY], TRADING_DATE);
    // Before the 1-for-3: 3 x 5 = 15. Between the two: 5.
    expect(out[0]!.close).toBeCloseTo(7.5, 10);
    expect(out[0]!.volume).toBeCloseTo(200_000, 6);
    expect(out[1]!.close).toBeCloseTo(7.5, 10);
    expect(out[2]!.close).toBeCloseTo(8, 10);
  });

  it('halves prices and doubles volume for a 2-for-1 forward split', () => {
    const forward: SplitAction = { symbol: 'ABC', exDate: TRADING_DATE, oldRate: 1, newRate: 2 };
    expect(restateBars([{ date: '2026-09-04', close: 100, volume: 1_000 }], [forward], TRADING_DATE)).toEqual([
      { date: '2026-09-04', close: 50, volume: 2_000 },
    ]);
  });

  it('ignores a split that takes effect after the trading date', () => {
    const later: SplitAction = { ...WCT_TODAY, exDate: '2026-09-15' };
    expect(restateBars(bars, [later], TRADING_DATE)).toEqual(bars);
  });
});

describe('buildSplitBaselines', () => {
  it('WCT 2026-09-08: the prior close is restated five times, the old basis kept for a revert', async () => {
    const raw = { WCT: [dailyBar('2026-09-03', 1.55, 400_000), dailyBar('2026-09-04', 1.6, 500_000)] };
    const { client, barCalls } = fakeClient({ raw });

    const built = await buildSplitBaselines(input(client, new Map([['WCT', WCT_TODAY]])));
    const wct = built.get('WCT')!;

    expect(wct.restated.previousClose).toBeCloseTo(8, 10);
    expect(wct.restated.previousCloseDate).toBe('2026-09-04');
    expect(wct.restated.averageVolume).toBeCloseTo(90_000, 6);
    expect(wct.restated.dataSource).toBe(SPLIT_RESTATED_SOURCE);
    expect(wct.oldBasis.previousClose).toBeCloseTo(1.6, 10);
    expect(wct.oldBasis.dataSource).toBe(SPLIT_OLD_BASIS_SOURCE);
    expect(barCalls).toEqual([{ symbols: ['WCT'], adjustment: 'raw' }]);
  });

  it('NIVF control: an adjusted series that is already current is never adjusted again', async () => {
    const nivfToday: SplitAction = { symbol: 'NIVF', exDate: TRADING_DATE, oldRate: 3, newRate: 1 };
    const { client } = fakeClient({
      raw: { NIVF: [dailyBar('2026-09-04', 0.2, 900_000)] },
      // What Alpaca's 'split' series says once it has applied the 1-for-3.
      adjusted: { NIVF: [dailyBar('2026-09-04', 0.6, 300_000)] },
    });

    const built = await buildSplitBaselines(input(client, new Map([['NIVF', nivfToday]])));
    // 0.2 x 3, not 0.6 x 3.
    expect(built.get('NIVF')!.restated.previousClose).toBeCloseTo(0.6, 10);
  });

  it('reads the window\'s earlier splits and restates through both', async () => {
    const earlier: SplitAction = { symbol: 'WCT', exDate: '2026-08-15', oldRate: 3, newRate: 1 };
    const raw = { WCT: [dailyBar('2026-08-10', 0.5, 3_000_000), dailyBar('2026-09-04', 1.6, 500_000)] };
    const { client, splitCalls } = fakeClient({ raw, windowSplits: [earlier, WCT_TODAY] });

    const built = await buildSplitBaselines(input(client, new Map([['WCT', WCT_TODAY]])));
    const wct = built.get('WCT')!;

    // 3,000,000 / 15 and 500,000 / 5, averaged.
    expect(wct.restated.averageVolume).toBeCloseTo(150_000, 6);
    // The old basis still carries the earlier split: it is today's split alone that is undone.
    expect(wct.oldBasis.averageVolume).toBeCloseTo((1_000_000 + 500_000) / 2, 6);
    expect(splitCalls).toEqual([{ symbols: ['WCT'], start: '2026-07-10', end: TRADING_DATE }]);
  });

  it('builds nothing on an ordinary day, and asks Alpaca for nothing', async () => {
    const { client, barCalls, splitCalls } = fakeClient({ raw: {} });
    expect((await buildSplitBaselines(input(client, new Map()))).size).toBe(0);
    expect(barCalls).toHaveLength(0);
    expect(splitCalls).toHaveLength(0);
  });

  it('leaves a symbol with no raw bars alone rather than guessing', async () => {
    const { client } = fakeClient({ raw: {} });
    expect((await buildSplitBaselines(input(client, new Map([['WCT', WCT_TODAY]])))).size).toBe(0);
  });
});

describe('firstPrintBasis', () => {
  it('keeps the restatement when the first print is on the new basis', () => {
    expect(firstPrintBasis(8.21, 8, 1.6)).toBe('RESTATED');
  });

  it('keeps it for a genuine big move on the new basis', () => {
    expect(firstPrintBasis(16, 8, 1.6)).toBe('RESTATED');
  });

  it('drops it when the first print sits on the old basis: the listed split did not happen', () => {
    expect(firstPrintBasis(1.7, 8, 1.6)).toBe('OLD_BASIS');
  });

  it('only within 25% of the old close: a +31% print on the old basis is not recognised', () => {
    expect(firstPrintBasis(2.1, 8, 1.6)).toBe('RESTATED');
  });

  it('treats a forward split the same way', () => {
    expect(firstPrintBasis(101, 50, 100)).toBe('OLD_BASIS');
    expect(firstPrintBasis(51, 50, 100)).toBe('RESTATED');
  });
});

/* -------------------------------------------------------------- engine */

function baseline(previousClose: number, dataSource: string): RvolBaseline {
  return {
    symbol: 'WCT',
    baselineDate: TRADING_DATE,
    previousClose,
    previousCloseDate: '2026-09-04',
    averageVolume: 100_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource,
    feed: 'sip',
    adjustment: 'raw',
    calculatedAt: '2026-09-08T07:40:00.000Z',
  };
}

/** 09:31 ET on 2026-09-08 (EDT, UTC-4). */
const AT = '2026-09-08T13:31:00.000Z';

function trade(price: number, at = AT): MarketObservation {
  return { symbol: 'WCT', kind: 'trade', ts: at, receivedAt: at, feed: 'sip', price, size: 100 };
}

function engineWith(attached: RvolBaseline) {
  const engine = new DemandEngine({
    tradingDate: TRADING_DATE,
    feed: 'sip',
    discoveryRank: 12,
    internalRank: 50,
    priceMin: 1,
    priceMax: 20,
    baselineSessions: 20,
    now: () => Date.parse(AT),
  });
  engine.setBaselines(new Map([['WCT', attached]]));
  engine.track('WCT');
  return engine;
}

const RESTATED = baseline(8, SPLIT_RESTATED_SOURCE);
const OLD = baseline(1.6, SPLIT_OLD_BASIS_SOURCE);
const CHECK = { restatedClose: 8, oldClose: 1.6, oldBasis: OLD, split: WCT_TODAY };

describe('engine: a restated baseline and the first-print check', () => {
  it('a restatement replaces a prior close that already came from a daily bar; an ordinary baseline does not', () => {
    const replaced = engineWith(OLD);
    replaced.setBaseline('WCT', RESTATED, { replaceClose: true });
    expect(replaced.getDemandState('WCT')?.previousClose).toBe(8);

    const kept = engineWith(OLD);
    kept.setBaseline('WCT', RESTATED);
    expect(kept.getDemandState('WCT')?.previousClose).toBe(1.6);
  });

  it('WCT 2026-09-08: the day reads about +2.6%, not +413%', () => {
    const engine = engineWith(OLD);
    engine.setBaseline('WCT', RESTATED, { replaceClose: true });
    engine.armSplitBasisCheck('WCT', CHECK);
    engine.ingest(trade(8.21));

    expect(engine.getDemandState('WCT')?.percentChange).toBeCloseTo(2.625, 6);
    expect(engine.drainSplitVerdicts().map((verdict) => verdict.verdict)).toEqual(['RESTATED']);
  });

  it('a listed split that does not happen: the first print reverts to the old close, and says so', () => {
    const engine = engineWith(OLD);
    engine.setBaseline('WCT', RESTATED, { replaceClose: true });
    engine.armSplitBasisCheck('WCT', CHECK);
    engine.ingest(trade(1.65));

    const state = engine.getDemandState('WCT');
    expect(state?.previousClose).toBe(1.6);
    expect(state?.percentChange).toBeCloseTo(3.125, 6);
    const [verdict] = engine.drainSplitVerdicts();
    expect(verdict).toMatchObject({ symbol: 'WCT', verdict: 'OLD_BASIS', price: 1.65, oldBasis: OLD });
  });

  it('decides once: a later print back near the old close does not revert a confirmed restatement', () => {
    const engine = engineWith(OLD);
    engine.setBaseline('WCT', RESTATED, { replaceClose: true });
    engine.armSplitBasisCheck('WCT', CHECK);
    engine.ingest(trade(8.21));
    engine.ingest(trade(1.7, '2026-09-08T13:32:00.000Z'));

    expect(engine.getDemandState('WCT')?.previousClose).toBe(8);
    expect(engine.drainSplitVerdicts()).toHaveLength(1);
  });
});

/* ---------------------------------------------------------------- REST */

const credentials: AlpacaCredentials = {
  keyId: 'AKTESTKEYID0000000',
  secret: 'super-secret-value-that-must-never-be-logged-0000',
  feed: 'sip',
  origin: 'test',
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('AlpacaRestClient.getSplits', () => {
  it('reads reverse and forward splits, follows pages, and drops rows without usable rates', async () => {
    const calls: string[] = [];
    const pages = [
      {
        corporate_actions: {
          reverse_splits: [
            { symbol: 'wct', ex_date: '2026-09-08', old_rate: 5, new_rate: 1 },
            { symbol: 'BAD', ex_date: '2026-09-08', old_rate: 0, new_rate: 1 },
          ],
        },
        next_page_token: 'p2',
      },
      {
        corporate_actions: { forward_splits: [{ symbol: 'DXJ', ex_date: '2026-09-08', old_rate: 1, new_rate: 3 }] },
        next_page_token: null,
      },
    ];
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calls.push(String(url));
      return jsonResponse(pages[calls.length - 1]);
    }) as unknown as typeof fetch;

    const client = new AlpacaRestClient(credentials, { fetchImpl, batchSize: 200 });
    const splits = await client.getSplits({ start: TRADING_DATE, end: TRADING_DATE });

    expect(splits).toEqual([
      { symbol: 'WCT', exDate: '2026-09-08', oldRate: 5, newRate: 1 },
      { symbol: 'DXJ', exDate: '2026-09-08', oldRate: 1, newRate: 3 },
    ]);
    const first = new URL(calls[0]!);
    expect(first.pathname).toBe('/v1/corporate-actions');
    expect(first.searchParams.get('types')).toBe('reverse_split,forward_split');
    expect(first.searchParams.get('symbols')).toBeNull();
    expect(new URL(calls[1]!).searchParams.get('page_token')).toBe('p2');
    for (const url of calls) expect(url).not.toContain(credentials.secret);
  });
});
