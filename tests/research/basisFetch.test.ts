import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { basisFetchDue, deepHistoryDue } from '@/lib/research/historyFetch';
import { readSplitFactors, upsertDailyBars, type NewDailyBar } from '@/lib/research/history';

/**
 * The basis trigger, and the two store facts it stands on.
 *
 * `ensureDeepHistory` itself is not unit-testable — it builds its own client
 * and credentials — so, as with the blue-sky trigger, the gate is where the
 * behaviour that decides COST is pinned. What is different here is WHAT gates:
 * a basis is due once for any researched ticker, with rank and price playing
 * no part. That decoupling is the trader-approved change (2026-08-27), so it
 * gets its own assertion against the blue-sky gate rather than being implied.
 *
 * The predicate is the FACTOR, not the deep-source marker, because the marker
 * does not survive: a shallow refresh overwrites `source` on every row it
 * touches, while `split_factor` is COALESCEd. Both halves are pinned below —
 * if the upsert ever stops preserving factors, the trigger starts refetching
 * every symbol every day, and the test that catches that is this one.
 */

const files: string[] = [];

function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'basis-fetch-')), 'market.db');
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

function bar(over: Partial<NewDailyBar> & { tradingDate: string }): NewDailyBar {
  return {
    symbol: 'ACME',
    open: 9,
    high: 10,
    low: 8,
    close: 9.5,
    volume: 1_000_000,
    tradeCount: null,
    vwap: null,
    adjustment: 'split',
    splitFactor: null,
    source: 'alpaca-daily-bar',
    fetchedAt: '2026-08-20T23:00:00Z',
    ...over,
  } as NewDailyBar;
}

describe('basisFetchDue', () => {
  it('fires for a researched name the blue-sky gate would never touch', () => {
    /*
     * The decoupling itself, as one assertion. No ticker_session row at all —
     * the blue-sky gate answers "not due" before it ever reaches a price —
     * while the basis gate fires, because being researched is the only
     * qualification a basis needs.
     */
    const store = db();
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19' })]);

    expect(deepHistoryDue(store, 'ACME', '2026-08-24').due).toBe(false);

    const decision = basisFetchDue(store, 'ACME');
    expect(decision.due).toBe(true);
    expect(decision.reason).toBe('no split basis established');
  });

  it('fires for a name with no stored bars at all', () => {
    expect(basisFetchDue(db(), 'ACME').due).toBe(true);
  });

  it('does not fire once a factor is established', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: 2, source: 'alpaca-daily-deep' }),
    ]);

    const decision = basisFetchDue(store, 'ACME');
    expect(decision.due).toBe(false);
    expect(decision.reason).toContain('split basis established');
  });

  it('stays established through a shallow refresh of the same row', () => {
    /*
     * The store fact the predicate stands on. The shallow path rewrites the
     * trailing window daily with splitFactor null and its own source string;
     * COALESCE keeps the factor, and the factor — not the overwritten source
     * marker — is what this gate reads. A young listing sits ENTIRELY inside
     * the shallow window, so a source-based predicate would re-arm there
     * forever.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: 2, source: 'alpaca-daily-deep' }),
    ]);
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: null, source: 'alpaca-daily-bar' }),
    ]);

    expect(basisFetchDue(store, 'ACME').due).toBe(false);
    expect(readSplitFactors(store, 'ACME').get('2026-08-19')).toBe(2);
  });

  it('caps an underivable symbol at one fetch per day', () => {
    /*
     * A deep pass that derived no factors (no usable raw closes) leaves the
     * gate's question unanswered; without this cap it would re-ask on every
     * job the symbol gets. The deep pass's own marker bounds it to one fetch a
     * day, and the next day it is due again.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-19',
        splitFactor: null,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-24T14:00:00Z',
      }),
    ]);

    const sameDay = basisFetchDue(store, 'ACME', new Date('2026-08-24T18:00:00Z'));
    expect(sameDay.due).toBe(false);
    expect(sameDay.reason).toContain('already fetched today');

    expect(basisFetchDue(store, 'ACME', new Date('2026-08-25T14:00:00Z')).due).toBe(true);
  });
});

describe('readSplitFactors', () => {
  it('reads the full stored depth, not the cycle window', () => {
    /*
     * The reason the pipeline reads THIS and not the 90-bar cycle window:
     * filing dates routinely sit beyond it — 122 of 239 dated supply blocks on
     * the 08-23 snapshot — and a clipped series returns null for exactly the
     * operands the basis fetch exists to make comparable.
     */
    const store = db();
    const rows: NewDailyBar[] = [];
    const start = Date.parse('2025-01-01T00:00:00Z');
    for (let i = 0; i < 120; i += 1) {
      const tradingDate = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      rows.push(bar({ tradingDate, splitFactor: i < 10 ? 8 : 1, source: 'alpaca-daily-deep' }));
    }
    upsertDailyBars(store, rows);

    const factors = readSplitFactors(store, 'ACME');
    expect(factors.size).toBe(120);
    expect(factors.get('2025-01-01')).toBe(8);
    expect(factors.get('2025-04-30')).toBe(1);
  });

  it('bounds by asOf and skips rows with no established factor', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-18', splitFactor: 1 }),
      bar({ tradingDate: '2026-08-19', splitFactor: null }),
      bar({ tradingDate: '2026-08-21', splitFactor: 1 }),
    ]);

    const bounded = readSplitFactors(store, 'ACME', '2026-08-20');
    expect([...bounded.keys()]).toEqual(['2026-08-18']);

    const unbounded = readSplitFactors(store, 'ACME');
    expect([...unbounded.keys()]).toEqual(['2026-08-18', '2026-08-21']);
  });
});
