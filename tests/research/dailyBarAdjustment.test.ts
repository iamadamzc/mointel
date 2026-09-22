import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  dailyBarAdjustment,
  dailyBarBasis,
  upsertDailyBars,
  type NewDailyBar,
} from '@/lib/research/history';

/**
 * The guard that could not fire.
 *
 * `dailyBarAdjustment` returns null when a symbol's rows mix adjustment bases,
 * so nothing derives a ceiling or a prior high from a series that is half
 * restated. It compared `SELECT DISTINCT adjustment` — the LABEL. Every row of
 * the production-shaped store is labelled `'split'`, all 75 symbols, so the
 * distinctness test returned one value unconditionally.
 *
 * The case it missed is same-label drift: "split-adjusted as of August" and
 * "split-adjusted as of September" are different bases under one word, because
 * a reverse split between the two fetches restates one and not the other. 13 of
 * those 75 symbols hold rows from two fetch dates. Integration-tmi found the
 * guard; the vintage is in `fetched_at`, which the original did not read.
 */

function bar(over: Partial<NewDailyBar> & { tradingDate: string; fetchedAt: string }): NewDailyBar {
  return {
    symbol: 'ACME',
    open: 1,
    high: 2,
    low: 1,
    close: 2,
    volume: 1_000,
    tradeCount: 10,
    vwap: 1.5,
    adjustment: 'split',
    splitFactor: null,
    source: 'test',
    ...over,
  };
}

const files: string[] = [];
function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-adj-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* the temp dir outlives the test run on Windows; harmless */
    }
  }
});

describe('dailyBarAdjustment', () => {
  it('reports the basis when every row is one label from one fetch', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-18T20:23:08.496Z' }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z' }),
    ]);
    expect(dailyBarAdjustment(store, 'ACME')).toBe('split');
  });

  it('REFUSES when one label spans two fetch dates, which the label alone cannot see', () => {
    // The 13-of-75 case. A reverse split between these two fetches restates the
    // first row and not the second, and `adjustment` reads 'split' on both.
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-17T20:10:00.000Z' }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z' }),
    ]);
    expect(dailyBarAdjustment(store, 'ACME')).toBeNull();
  });

  it('still refuses on genuinely different labels', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-18T20:00:00.000Z' }),
      bar({
        tradingDate: '2026-08-18',
        fetchedAt: '2026-08-18T20:00:00.000Z',
        adjustment: 'raw',
      }),
    ]);
    expect(dailyBarAdjustment(store, 'ACME')).toBeNull();
  });

  it('returns null with no rows, rather than a basis nobody stored', () => {
    expect(dailyBarAdjustment(db(), 'ACME')).toBeNull();
  });

  it('accepts many rows from ONE fetch date across different times of day', () => {
    // The 62 single-vintage symbols must not be refused: a fetch spanning
    // seconds is one basis, and over-refusing here would turn the guard into
    // the opposite failure.
    const store = db();
    upsertDailyBars(
      store,
      Array.from({ length: 30 }, (_, i) =>
        bar({
          tradingDate: `2026-07-${String(i + 1).padStart(2, '0')}`,
          fetchedAt: `2026-08-18T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
        }),
      ),
    );
    expect(dailyBarAdjustment(store, 'ACME')).toBe('split');
  });
});

/*
 * THE VINTAGE TEST OVER-REFUSED, AND THE FACTOR IS WHAT ANSWERS IT.
 *
 * Two fetch dates are only a hazard if a split actually landed between them.
 * Refusing every symbol holding two told the trader his history was "not
 * split-adjusted" when every row of it was -- 68 of 256 symbols (27%) in the
 * 2026-08-23 production snapshot, measured 2026-09-22.
 *
 * `split_factor` is the cumulative adjustment still to apply at a date, so it
 * is NON-INCREASING as the date advances. A rise means two rows were adjusted
 * on different bases, which is the defect itself rather than a proxy for it.
 */
describe('dailyBarBasis', () => {
  it('VOUCHES two fetch dates when the factors show no split fell between them', () => {
    // The 27% case. Factors descend with date -- one basis, fetched twice.
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-17T20:10:00.000Z', splitFactor: 5 }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z', splitFactor: 1 }),
    ]);

    expect(dailyBarBasis(store, 'ACME')).toEqual({
      adjustment: 'split',
      vouched: true,
      reason: null,
    });
    expect(dailyBarAdjustment(store, 'ACME')).toBe('split');
  });

  it('REFUSES when a factor RISES with the date, which is the stale-vintage signature', () => {
    /*
     * The older row was written before a 1-for-5 and never restated, so it
     * carries 1 where its newer neighbour carries 5. Its stored PRICE is stale
     * by the same five, and a ceiling drawn from it would be wrong by a factor
     * the label cannot show.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-17T20:10:00.000Z', splitFactor: 1 }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z', splitFactor: 5 }),
    ]);

    expect(dailyBarBasis(store, 'ACME').reason).toBe('BASIS_CONFLICT');
    expect(dailyBarAdjustment(store, 'ACME')).toBeNull();
  });

  it('will not vouch from a PARTIAL basis, which would speak for rows nothing examined', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-17T20:10:00.000Z', splitFactor: 5 }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z', splitFactor: null }),
    ]);

    expect(dailyBarBasis(store, 'ACME').reason).toBe('UNRECONCILED_VINTAGES');
    expect(dailyBarAdjustment(store, 'ACME')).toBeNull();
  });

  it('needs no factors at all when there is only one vintage to reconcile', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-18T20:23:08.496Z' }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z' }),
    ]);

    expect(dailyBarBasis(store, 'ACME')).toEqual({
      adjustment: 'split',
      vouched: true,
      reason: null,
    });
  });

  it('separates genuinely mixed labels from an unreconciled vintage', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-18T20:00:00.000Z' }),
      bar({
        tradingDate: '2026-08-18',
        fetchedAt: '2026-08-18T20:00:00.000Z',
        adjustment: 'raw',
      }),
    ]);

    expect(dailyBarBasis(store, 'ACME').reason).toBe('MIXED_LABELS');
  });

  it('reports NO_ROWS rather than a basis nobody stored', () => {
    expect(dailyBarBasis(db(), 'ACME').reason).toBe('NO_ROWS');
  });

  it('falls back to the vintage refusal on a store with no split_factor column', () => {
    /*
     * `readModel` opens the board's store `{ readonly: true, skipSchema: true }`
     * and a read-only open skips migrations, so the column is genuinely absent
     * on a store no read-write process has opened since. A throw here is caught
     * upstream as "no daily history is retained", which would downgrade an
     * UNVERIFIED ceiling to UNAVAILABLE -- a worse answer than the one this
     * replaced, produced by a schema version rather than by the data.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-17', fetchedAt: '2026-08-17T20:10:00.000Z' }),
      bar({ tradingDate: '2026-08-18', fetchedAt: '2026-08-18T20:23:08.497Z' }),
    ]);
    store.exec('ALTER TABLE daily_bars DROP COLUMN split_factor');

    expect(dailyBarBasis(store, 'ACME').reason).toBe('UNRECONCILED_VINTAGES');
    expect(dailyBarAdjustment(store, 'ACME')).toBeNull();
  });
});
