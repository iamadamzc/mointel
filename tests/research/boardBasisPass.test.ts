import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertDailyBars, type NewDailyBar } from '@/lib/research/history';
import type { DeepHistoryResult } from '@/lib/research/historyFetch';
import {
  boardTickers,
  isRateLimited,
  maybeStartBoardBasisPass,
  runBoardBasisPass,
} from '@/lib/research/boardBasisPass';

/**
 * The board basis pass (ruled 2026-10-08): board names outside the research
 * queue never reach the job path's basisFetchDue, and their levels and blue
 * sky still render. These pin which names the pass sees, that it fetches only
 * the due ones, that the outcome is read from the store, and that a rate
 * limit stops the pass.
 */

const files: string[] = [];

function db(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'board-basis-')), 'market.db');
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

let nextId = 1;
function checkpoint(store: MarketDatabase, tradingDate: string, status: string, tickers: string[]): void {
  const id = nextId++;
  store
    .prepare(
      `INSERT INTO desk_assessments
         (id, trading_date, assessment_type, scheduled_for, started_at, session_phase, status)
       VALUES (?, ?, ?, ?, ?, 'PREMARKET', ?)`,
    )
    .run(id, tradingDate, `T${id}`, `${tradingDate}T12:00:00.000Z`, `${tradingDate}T12:00:00.000Z`, status);
  const insert = store.prepare(
    'INSERT INTO desk_assessment_tickers (assessment_id, ticker, assessment_rank) VALUES (?, ?, ?)',
  );
  tickers.forEach((ticker, index) => insert.run(id, ticker, index + 1));
}

function bar(over: Partial<NewDailyBar> & { symbol: string; tradingDate: string }): NewDailyBar {
  return {
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

const NOW = new Date('2026-08-25T14:00:00Z'); // Tue 10:00 ET; last settled Mon 08-24

/** A deep fetch that writes a factor through `through`, as ensureDeepHistory would. */
function fakeFetch(through: string | null, calls: string[]) {
  return async (store: MarketDatabase, ticker: string): Promise<DeepHistoryResult> => {
    calls.push(ticker);
    upsertDailyBars(store, [
      bar({
        symbol: ticker,
        tradingDate: through ?? '2026-08-19',
        splitFactor: through ? 1 : null,
        source: 'alpaca-daily-deep',
        fetchedAt: NOW.toISOString(),
      }),
    ]);
    return { fetched: true, sessions: 1, from: '2016-08-25', splitEvents: [], detail: '1 session(s)' };
  };
}

describe('boardTickers', () => {
  it('reads the latest session board from COMPLETE checkpoints only', () => {
    const store = db();
    checkpoint(store, '2026-08-21', 'COMPLETE', ['OLD']);
    checkpoint(store, '2026-08-24', 'COMPLETE', ['MOBX', 'NCT']);
    checkpoint(store, '2026-08-24', 'COMPLETE', ['NCT', 'AAPG']);
    checkpoint(store, '2026-08-24', 'FAILED', ['GHOST']);

    expect(boardTickers(store, 1)).toEqual(['AAPG', 'MOBX', 'NCT']);
    expect(boardTickers(store, 2)).toEqual(['AAPG', 'MOBX', 'NCT', 'OLD']);
  });
});

describe('runBoardBasisPass', () => {
  it('fetches a stale and an unestablished board name, and skips a fresh one', async () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ symbol: 'NCT', tradingDate: '2026-08-19', splitFactor: 1, source: 'alpaca-daily-deep' }),
      bar({ symbol: 'NCT', tradingDate: '2026-08-24' }),
      bar({ symbol: 'FRSH', tradingDate: '2026-08-24', splitFactor: 1, source: 'alpaca-daily-deep' }),
    ]);
    const calls: string[] = [];
    const lines: string[] = [];

    const tally = await runBoardBasisPass(store, ['FRSH', 'MOBX', 'NCT'], {
      fetch: fakeFetch('2026-08-24', calls),
      log: (line) => lines.push(line),
      now: () => NOW,
      sleep: async () => {},
    });

    expect(calls).toEqual(['MOBX', 'NCT']);
    expect(tally).toEqual({
      candidates: 3,
      due: 2,
      established: 2,
      underivable: 0,
      failed: 0,
      rateLimited: false,
    });
    expect(lines.some((line) => line.includes('NCT') && line.includes('split basis stale'))).toBe(true);
  });

  it('reports a fetch that derived no factor as underivable, from the store', async () => {
    const store = db();
    const calls: string[] = [];
    const tally = await runBoardBasisPass(store, ['BARE'], {
      fetch: fakeFetch(null, calls),
      log: () => {},
      now: () => NOW,
      sleep: async () => {},
    });
    expect(calls).toEqual(['BARE']);
    expect(tally.established).toBe(0);
    expect(tally.underivable).toBe(1);
  });

  it('stops the pass on the first rate-limited fetch', async () => {
    const store = db();
    const calls: string[] = [];
    const limited = async (_store: MarketDatabase, ticker: string): Promise<DeepHistoryResult> => {
      calls.push(ticker);
      return { fetched: false, sessions: 0, from: null, splitEvents: [], detail: 'Alpaca 429 Too Many Requests' };
    };
    const tally = await runBoardBasisPass(store, ['AAA', 'BBB', 'CCC'], {
      fetch: limited,
      log: () => {},
      now: () => NOW,
      sleep: async () => {},
    });
    expect(calls).toEqual(['AAA']);
    expect(tally.rateLimited).toBe(true);
    expect(tally.failed).toBe(1);
  });

  it('tells a rate limit from another failure', () => {
    const base = { fetched: false, sessions: 0, from: null, splitEvents: [] };
    expect(isRateLimited({ ...base, detail: 'HTTP 429' })).toBe(true);
    expect(isRateLimited({ ...base, detail: 'no bars returned' })).toBe(false);
    expect(isRateLimited({ ...base, fetched: true, detail: '429 session(s) from 2025-01-02' })).toBe(false);
  });
});

describe('maybeStartBoardBasisPass', () => {
  it('is on by default and off with BOARD_BASIS_PASS=off', () => {
    const lines: string[] = [];
    const timers: Array<() => void> = [];
    const options = {
      db: db(),
      fetch: fakeFetch('2026-08-24', []),
      log: (line: string) => lines.push(line),
      setTimer: (run: () => void) => (timers.push(run), timers.length),
      clearTimer: () => {},
    };

    expect(maybeStartBoardBasisPass({ BOARD_BASIS_PASS: 'off' }, options)).toBeNull();
    expect(timers).toHaveLength(0);

    const handle = maybeStartBoardBasisPass({}, options);
    expect(handle).not.toBeNull();
    expect(timers).toHaveLength(1);
    handle!.stop();
  });
});
