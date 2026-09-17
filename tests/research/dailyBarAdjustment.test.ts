import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { dailyBarAdjustment, upsertDailyBars, type NewDailyBar } from '@/lib/research/history';

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
