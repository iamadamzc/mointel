import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { deepHistoryDue, DEEP_HISTORY_RANK } from '@/lib/research/historyFetch';
import { upsertDailyBars, type NewDailyBar } from '@/lib/research/history';

/**
 * When a name has earned a full-depth fetch.
 *
 * `ensureDeepHistory` itself is not unit-testable — it builds its own client and
 * credentials, as `ensureDailyHistory` does — so the trigger is where the
 * behaviour that decides COST can actually be pinned. It is also the half that
 * decides correctness: a feature nothing triggers is indistinguishable from one
 * that does not work.
 *
 * The economics it encodes, measured over 2026-08-14..21: top 10 turns over 9.5
 * of 10 every session, but only 2 of 60 top-10 slots sat above their stored
 * ceiling. About 0.4 fetches a morning, which is what makes refetching a whole
 * history per pass affordable.
 */

const DATE = '2026-08-24';
const files: string[] = [];

function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deep-trigger-')), 'market.db');
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

function rank(store: ReturnType<typeof db>, symbol: string, rvolRank: number | null, price: number | null) {
  store
    .prepare(
      `INSERT INTO ticker_session (trading_date, symbol, rvol_rank, price, feed, updated_at)
       VALUES (?, ?, ?, ?, 'test', '2026-08-24T12:00:00Z')
       ON CONFLICT(trading_date, symbol) DO UPDATE SET rvol_rank = excluded.rvol_rank, price = excluded.price`,
    )
    .run(DATE, symbol, rvolRank, price);
}

function bar(over: Partial<NewDailyBar> & { tradingDate: string; high: number }): NewDailyBar {
  return {
    symbol: 'ACME',
    open: over.high * 0.9,
    low: over.high * 0.8,
    close: over.high * 0.95,
    volume: 1_000_000,
    tradeCount: null,
    vwap: null,
    adjustment: 'split',
    splitFactor: null,
    source: 'test',
    fetchedAt: '2026-08-20T23:00:00Z',
    ...over,
  } as NewDailyBar;
}

describe('deepHistoryDue', () => {
  it('fires for a top-10 name above every stored high', () => {
    const store = db();
    rank(store, 'ACME', 3, 12);
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19', high: 10 })]);

    const decision = deepHistoryDue(store, 'ACME', DATE);

    expect(decision.due).toBe(true);
    expect(decision.reason).toContain('above every stored high');
  });

  it('does not fire outside the top 10, however far the price has run', () => {
    const store = db();
    rank(store, 'ACME', DEEP_HISTORY_RANK + 1, 999);
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19', high: 10 })]);

    expect(deepHistoryDue(store, 'ACME', DATE).due).toBe(false);
  });

  it('fires exactly at the rank boundary', () => {
    const store = db();
    rank(store, 'ACME', DEEP_HISTORY_RANK, 12);
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19', high: 10 })]);

    expect(deepHistoryDue(store, 'ACME', DATE).due).toBe(true);
  });

  it('does not fire when a stored high already disproves blue sky', () => {
    /*
     * The gate that makes this cheap, and it is an argument rather than a
     * saving: if any prior session already exceeds today's price, blue sky is
     * false and no additional depth can change that. So the expensive case is
     * exactly the name that looks like a runner, and it is rare.
     */
    const store = db();
    rank(store, 'ACME', 1, 8);
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19', high: 10 })]);

    const decision = deepHistoryDue(store, 'ACME', DATE);

    expect(decision.due).toBe(false);
    expect(decision.reason).toContain('already below a stored high');
  });

  it('treats a stored high EQUAL to the price as disproving', () => {
    // Blue sky means above every prior level, so matching one is not above it.
    const store = db();
    rank(store, 'ACME', 1, 10);
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19', high: 10 })]);

    expect(deepHistoryDue(store, 'ACME', DATE).due).toBe(false);
  });

  it('ignores highs from the current session, which are the move being assessed', () => {
    const store = db();
    rank(store, 'ACME', 1, 12);
    upsertDailyBars(store, [bar({ tradingDate: DATE, high: 50 })]);

    expect(deepHistoryDue(store, 'ACME', DATE).due).toBe(true);
  });

  it('fires for a name with no stored history at all', () => {
    // Nothing to disprove it, so the question is open and worth one call.
    const store = db();
    rank(store, 'ACME', 1, 12);

    const decision = deepHistoryDue(store, 'ACME', DATE);

    expect(decision.due).toBe(true);
    expect(decision.reason).toContain('no stored history');
  });

  it('does not fire twice in a day', () => {
    /*
     * The deep pass refetches its WHOLE window rather than appending -- which is
     * what keeps the fetch and retention windows coupled and the basis
     * consistent -- so repeating it inside a session buys nothing and costs a
     * full history each time.
     */
    const store = db();
    rank(store, 'ACME', 1, 12);
    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-19',
        high: 10,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-24T14:00:00Z',
      }),
    ]);

    const decision = deepHistoryDue(store, 'ACME', DATE, new Date('2026-08-24T18:00:00Z'));

    expect(decision.due).toBe(false);
    expect(decision.reason).toContain('already fetched today');
  });

  it('fires again the next day', () => {
    const store = db();
    rank(store, 'ACME', 1, 12);
    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-19',
        high: 10,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-24T14:00:00Z',
      }),
    ]);

    expect(deepHistoryDue(store, 'ACME', DATE, new Date('2026-08-25T14:00:00Z')).due).toBe(true);
  });

  it('is not fooled by a SHALLOW row written today', () => {
    // Only the deep pass counts as having answered the deep question. The
    // shallow refresh runs constantly and would otherwise suppress it forever.
    const store = db();
    rank(store, 'ACME', 1, 12);
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', high: 10, fetchedAt: '2026-08-24T14:00:00Z' }),
    ]);

    expect(deepHistoryDue(store, 'ACME', DATE, new Date('2026-08-24T18:00:00Z')).due).toBe(true);
  });

  it('does not fire for an unranked name', () => {
    const store = db();
    rank(store, 'ACME', null, 12);

    expect(deepHistoryDue(store, 'ACME', DATE).reason).toBe('not ranked');
  });

  it('does not fire for a name with no session row', () => {
    expect(deepHistoryDue(db(), 'NOPE', DATE).due).toBe(false);
  });
});
