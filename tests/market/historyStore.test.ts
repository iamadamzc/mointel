import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { upsertMinuteBars } from '@/lib/market/store/repo';
import {
  openHistoryStore,
  readLadderBars,
  readResistanceLevels,
  writeResistanceLevels,
  registerHistorySymbols,
  resolveHistoryDbPath,
  updateSymbolState,
  upsertDailyHistoryBars,
  upsertFifteenMinBars,
  type DailyHistoryBar,
  type FifteenMinBar,
} from '@/lib/market/store/historyStore';
import { rollupFifteenMinute, rollupSymbol, type RollupMinute } from '@/lib/market/historyRollup';
import { toFifteenMin } from '@/lib/research/historyStoreJob';

/**
 * The history store (resistance-levels spec section 3): keying, the 15m
 * rollup, and the mixed-basis refusal. Each guard test names the mutant it
 * kills; the mutants were run by hand against this file.
 */

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-store-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()!;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

function minute(ts: string, over: Partial<RollupMinute> = {}): RollupMinute {
  return { ts, open: 1, high: 1, low: 1, close: 1, volume: 100, tradeCount: 1, vwap: 1, ...over };
}

/** Fifteen consecutive minutes from `startIso`, with a per-minute override. */
function fifteen(startIso: string, over: (index: number) => Partial<RollupMinute> = () => ({})) {
  const start = Date.parse(startIso);
  return Array.from({ length: 15 }, (_, index) =>
    minute(new Date(start + index * 60_000).toISOString(), over(index)),
  );
}

describe('15m rollup math', () => {
  // Kills: M1 (rollup keyed by bucket END), and any change to open/high/low/close/sum/vwap.
  it('rolls a full bucket: first open, max high, min low, last close, sums, volume-weighted vwap', () => {
    const minutes = fifteen('2026-09-25T18:45:00.000Z', (i) => ({
      open: 2 + i / 100,
      high: i === 7 ? 2.5 : 2.2,
      low: i === 3 ? 1.9 : 2.0,
      close: 2.1 + i / 100,
      volume: i === 0 ? 300 : 100,
      tradeCount: 2,
      vwap: i === 0 ? 2.0 : 2.2,
    }));
    const [bucket, ...rest] = rollupFifteenMinute(minutes, Date.parse('2026-09-25T19:00:00.000Z'));
    expect(rest).toEqual([]);
    expect(bucket!.bucketStart).toBe('2026-09-25T18:45:00.000Z');
    expect(bucket!.open).toBe(2);
    expect(bucket!.high).toBe(2.5);
    expect(bucket!.low).toBe(1.9);
    expect(bucket!.close).toBeCloseTo(2.24);
    expect(bucket!.volume).toBe(300 + 14 * 100);
    expect(bucket!.tradeCount).toBe(30);
    // (2.0 x 300 + 2.2 x 1400) / 1700
    expect(bucket!.vwap).toBeCloseTo((2.0 * 300 + 2.2 * 1400) / 1700, 10);
    expect(bucket!.partial).toBe(false);
  });

  // Kills: M3 (partial threshold weakened: `distinct < 14`).
  it('marks a bucket missing one minute as partial, and a full one as not', () => {
    const full = fifteen('2026-09-25T18:45:00.000Z');
    const gapped = fifteen('2026-09-25T19:00:00.000Z').filter((_, index) => index !== 9);
    const buckets = rollupFifteenMinute([...full, ...gapped], Date.parse('2026-09-25T19:15:00.000Z'));
    expect(buckets.map((bucket) => [bucket.bucketStart, bucket.minutes, bucket.partial])).toEqual([
      ['2026-09-25T18:45:00.000Z', 15, false],
      ['2026-09-25T19:00:00.000Z', 14, true],
    ]);
  });

  // Kills: M4 (the completed-only guard removed).
  it('emits completed buckets only: end <= now, never the one still filling', () => {
    const minutes = [
      ...fifteen('2026-09-25T18:45:00.000Z'),
      ...fifteen('2026-09-25T19:00:00.000Z').slice(0, 5),
    ];
    // 19:05: the 19:00 bucket has five minutes and is still filling.
    const at1905 = rollupFifteenMinute(minutes, Date.parse('2026-09-25T19:05:00.000Z'));
    expect(at1905.map((bucket) => bucket.bucketStart)).toEqual(['2026-09-25T18:45:00.000Z']);
    // Exactly at the end, a bucket is complete.
    const at1900 = rollupFifteenMinute(minutes.slice(0, 15), Date.parse('2026-09-25T19:00:00.000Z'));
    expect(at1900).toHaveLength(1);
  });

  // Kills: M5 (the 04:00-20:00 ET session filter removed).
  it('keeps 04:00-20:00 ET only (EDT: 08:00Z to 00:00Z)', () => {
    const minutes = [
      minute('2026-09-25T07:45:00.000Z'), // 03:45 ET, before the session
      minute('2026-09-25T08:00:00.000Z'), // 04:00 ET
      minute('2026-09-25T23:45:00.000Z'), // 19:45 ET
      minute('2026-09-26T00:00:00.000Z'), // 20:00 ET, after it
    ];
    const buckets = rollupFifteenMinute(minutes, Date.parse('2026-09-26T01:00:00.000Z'));
    expect(buckets.map((bucket) => bucket.bucketStart)).toEqual([
      '2026-09-25T08:00:00.000Z',
      '2026-09-25T23:45:00.000Z',
    ]);
  });
});

describe('keying: a fetched bucket and a rolled-up bucket for the same start are one row', () => {
  function stores() {
    const dir = tempDir();
    const marketPath = path.join(dir, 'market.db');
    const market = openDatabase(marketPath);
    const history = openHistoryStore(resolveHistoryDbPath({} as NodeJS.ProcessEnv, marketPath));
    return { market, history, marketPath };
  }

  function seedMinutes(market: ReturnType<typeof openDatabase>, startIso: string, count: number) {
    const start = Date.parse(startIso);
    upsertMinuteBars(
      market,
      '2026-09-25',
      Array.from({ length: count }, (_, index) => ({
        symbol: 'ACME',
        ts: new Date(start + index * 60_000).toISOString(),
        open: 5,
        high: index % 15 === 4 ? 5.4 : 5.1,
        low: 4.9,
        close: 5,
        volume: 1000,
        tradeCount: 10,
        vwap: 5,
        source: 'live-bar',
        receivedAt: new Date(start + (index + 1) * 60_000).toISOString(),
      })),
    );
  }

  // Kills: M1 (rollup keyed by END) and M2 (fetched bar keyed by END). Spec section 4 item 4.
  // Also kills M6 (a rollup row overwriting Alpaca's row for the same bucket).
  it('the rollup lands on the fetched row, not beside it, and does not overwrite it', () => {
    const { market, history } = stores();
    registerHistorySymbols(history, ['ACME'], '2026-09-25T18:00:00.000Z');
    updateSymbolState(history, 'ACME', {
      rollupFloor: '2026-09-25T18:00:00.000Z',
      rollupThrough: '2026-09-25T18:00:00.000Z',
    });

    // Alpaca labels a 15Min bar by its START: 18:45Z is the 14:45-15:00 ET candle.
    upsertFifteenMinBars(history, [
      toFifteenMin(
        'ACME',
        { t: '2026-09-25T18:45:00Z', o: 5, h: 5.5, l: 4.9, c: 5, v: 20000, n: 200, vw: 5.1 },
        '2026-09-25',
        '2026-09-25T20:00:00.000Z',
      ),
    ]);
    seedMinutes(market, '2026-09-25T18:45:00.000Z', 30);

    const result = rollupSymbol(market, history, 'ACME', new Date('2026-09-25T19:20:00.000Z'), 0);
    expect(result.skipped).toBeUndefined();

    const rows = history
      .prepare('SELECT bucket_start, source, high FROM bars_15m WHERE symbol = ? ORDER BY bucket_start')
      .all('ACME') as Array<{ bucket_start: string; source: string; high: number }>;
    expect(rows).toEqual([
      { bucket_start: '2026-09-25T18:45:00.000Z', source: 'alpaca', high: 5.5 },
      { bucket_start: '2026-09-25T19:00:00.000Z', source: 'rollup', high: 5.4 },
    ]);
  });

  // Kills: M1 and M2 from the other direction: a fetch after a rollup replaces it in place.
  it('a fetched bar for a rolled-up start replaces that row', () => {
    const { history } = stores();
    const rolled = rollupFifteenMinute(
      fifteen('2026-09-25T18:45:00.000Z'),
      Date.parse('2026-09-25T19:00:00.000Z'),
    ).map(
      (bucket): FifteenMinBar => ({
        symbol: 'ACME',
        ...bucket,
        source: 'rollup',
        basisAsOf: '2026-09-25',
        fetchedAt: '2026-09-25T19:01:00.000Z',
      }),
    );
    upsertFifteenMinBars(history, rolled);
    upsertFifteenMinBars(history, [
      toFifteenMin(
        'ACME',
        { t: '2026-09-25T18:45:00Z', o: 1, h: 1.2, l: 1, c: 1, v: 1500, n: 15, vw: 1 },
        '2026-09-25',
        '2026-09-25T20:00:00.000Z',
      ),
    ]);
    const rows = history.prepare('SELECT bucket_start, source FROM bars_15m').all();
    expect(rows).toEqual([{ bucket_start: '2026-09-25T18:45:00.000Z', source: 'alpaca' }]);
  });
});

describe('readLadderBars', () => {
  function seeded(epoch = '2026-09-29') {
    const dir = tempDir();
    const history = openHistoryStore(path.join(dir, 'history.db'));
    registerHistorySymbols(history, ['BIYA'], '2026-09-29T00:00:00.000Z');
    updateSymbolState(history, 'BIYA', {
      dailyBackfilledAt: '2026-09-29T01:00:00.000Z',
      m15BackfilledAt: '2026-09-29T01:00:00.000Z',
      basisEpoch: epoch,
    });
    const bar15 = (bucketStart: string, basisAsOf = '2026-09-29'): FifteenMinBar => ({
      symbol: 'BIYA',
      bucketStart,
      open: 2.4,
      high: 2.5,
      low: 2.3,
      close: 2.4,
      volume: 1000,
      tradeCount: 10,
      vwap: 2.4,
      source: 'alpaca',
      partial: false,
      basisAsOf,
      fetchedAt: '2026-09-29T01:00:00.000Z',
    });
    const day = (date: string, basisAsOf = '2026-09-29'): DailyHistoryBar => ({
      symbol: 'BIYA',
      date,
      open: 2,
      high: 2.6,
      low: 1.9,
      close: 2.1,
      volume: 100000,
      tradeCount: 900,
      vwap: 2.2,
      basisAsOf,
      fetchedAt: '2026-09-29T01:00:00.000Z',
    });
    return { history, bar15, day };
  }

  it('returns the 15m window back 39 calendar days (to 08-21 at 09-29) and daily beyond it', () => {
    const { history, bar15, day } = seeded();
    upsertFifteenMinBars(history, [
      bar15('2026-08-20T19:00:00.000Z'), // 08-20: older than the window
      bar15('2026-08-21T08:00:00.000Z'), // 08-21 04:00 ET: the window's first bucket
      bar15('2026-08-24T18:00:00.000Z'),
      bar15('2026-09-28T19:00:00.000Z'), // the previous session
      bar15('2026-09-29T14:00:00.000Z'), // today: the 5m window's, not this one's
    ]);
    upsertDailyHistoryBars(history, [day('2026-08-19'), day('2026-08-20'), day('2026-08-21')]);

    const bars = readLadderBars(history, 'BIYA', new Date('2026-09-29T21:55:00.000Z'));
    expect(bars.status).toBe('ready');
    expect(bars.fifteenMin.map((bar) => bar.bucketStart)).toEqual([
      '2026-08-21T08:00:00.000Z',
      '2026-08-24T18:00:00.000Z',
      '2026-09-28T19:00:00.000Z',
    ]);
    expect(bars.daily.map((bar) => bar.date)).toEqual(['2026-08-19', '2026-08-20']);
    expect(bars.horizon).toEqual({ fifteenMinFrom: '2026-08-21T08:00:00.000Z', dailyFrom: '2026-08-19' });
  });

  // Kills: M10 (the mixed-basis refusal removed).
  it('refuses a window holding a row stamped before the basis epoch', () => {
    const { history, bar15, day } = seeded('2026-09-29');
    upsertFifteenMinBars(history, [bar15('2026-09-28T19:00:00.000Z')]);
    upsertDailyHistoryBars(history, [day('2026-08-01', '2026-09-10')]);

    const bars = readLadderBars(history, 'BIYA', new Date('2026-09-29T21:55:00.000Z'));
    expect(bars.status).toBe('basis-break');
    expect(bars.basisBreak).toBe(true);
    expect(bars.fifteenMin).toEqual([]);
    expect(bars.daily).toEqual([]);
  });

  it('refuses while a detected split is waiting for its re-fetch', () => {
    const { history, bar15 } = seeded();
    upsertFifteenMinBars(history, [bar15('2026-09-28T19:00:00.000Z')]);
    updateSymbolState(history, 'BIYA', { basisBreakAt: '2026-09-29T20:30:00.000Z', basisBreakDetail: 'x' });
    const bars = readLadderBars(history, 'BIYA', new Date('2026-09-29T21:55:00.000Z'));
    expect(bars.status).toBe('basis-break');
    expect(bars.fifteenMin).toEqual([]);
  });

  it('says not-backfilled for a name the store does not hold yet (absent, not empty)', () => {
    const history = openHistoryStore(path.join(tempDir(), 'history.db'));
    expect(readLadderBars(history, 'NONE', new Date()).status).toBe('not-backfilled');
  });
});

describe('resistance levels rows (spec section 2, served as stored)', () => {
  it('keeps one row per name per date, a newer computation superseding, never an older one', () => {
    const db = openHistoryStore(path.join(tempDir(), 'history.db'));
    const row = (computedAt: string, payload: string) => ({
      symbol: 'ACME',
      tradingDate: '2026-09-30',
      computedAt,
      payload,
    });
    writeResistanceLevels(db, [row('2026-09-30T14:05:00.000Z', '{"v":1}')]);
    writeResistanceLevels(db, [row('2026-09-30T14:10:00.000Z', '{"v":2}')]);
    // A late write of an older computation must not roll the row back.
    writeResistanceLevels(db, [row('2026-09-30T14:00:00.000Z', '{"v":0}')]);
    const read = readResistanceLevels(db, '2026-09-30', ['ACME', 'NONE']);
    expect(read.get('ACME')?.payload).toBe('{"v":2}');
    // Absent, not empty: an uncomputed name has no row.
    expect(read.has('NONE')).toBe(false);
    db.close();
  });
});
