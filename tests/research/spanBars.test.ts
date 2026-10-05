import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { readSpanBars, upsertDailyBars, type NewDailyBar } from '@/lib/research/history';

/** The span a float split proof reads: from the last bar on or before `from` through `to`, nulls kept. */

const files: string[] = [];
function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-span-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

function bar(tradingDate: string, splitFactor: number | null, symbol = 'ACME'): NewDailyBar {
  return {
    symbol,
    tradingDate,
    open: 1,
    high: 2,
    low: 1,
    close: 2,
    volume: 1_000,
    tradeCount: 10,
    vwap: 1.5,
    adjustment: 'split',
    splitFactor,
    source: 'test',
    fetchedAt: `${tradingDate}T23:59:00.000Z`,
  };
}

describe('readSpanBars', () => {
  it('starts at the last bar ON OR BEFORE `from` (a weekend count date reaches back to Friday) and ends at `to`', () => {
    const store = db();
    upsertDailyBars(store, [bar('2026-08-06', 1), bar('2026-08-07', 1), bar('2026-08-10', 1), bar('2026-08-11', null), bar('2026-08-12', 1)]);
    expect(readSpanBars(store, 'ACME', '2026-08-09', '2026-08-11')).toEqual([
      { date: '2026-08-07', close: 2, factor: 1 },
      { date: '2026-08-10', close: 2, factor: 1 },
      { date: '2026-08-11', close: 2, factor: null },
    ]);
    expect(readSpanBars(store, 'ACME', '2026-08-10', '2026-08-11').map((b) => b.date)).toEqual(['2026-08-10', '2026-08-11']);
  });

  it('is empty when no bar reaches back to `from`, and never reads another symbol', () => {
    const store = db();
    upsertDailyBars(store, [bar('2026-08-01', 1, 'OTHR'), bar('2026-08-10', 1)]);
    expect(readSpanBars(store, 'ACME', '2026-08-05', '2026-08-11')).toEqual([]);
  });
});
