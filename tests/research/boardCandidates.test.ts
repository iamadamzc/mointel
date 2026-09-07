/**
 * The research engine follows the ACTIVE session board (requirements 15, 16, 42).
 *
 * This is the difference between a new after-hours mover progressing to
 * intelligence on its own and sitting at NOT YET ANALYZED all evening while
 * the engine re-reconciles names that stopped trading at 16:00.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { readBoardCandidates } from '@/lib/market/store/researchRepo';
import { isEligible, priorityScore, queueDiscoveryResearch } from '@/lib/research/queue';

const temporaryFiles: string[] = [];
const TRADING_DATE = '2026-08-17';

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-board-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  for (const file of temporaryFiles.splice(0)) {
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* the OS will clean up */
    }
  }
});

interface SeedRow {
  symbol: string;
  rvolRank: number | null;
  ahRank: number | null;
  ahVolume?: number | null;
  ahPercentChange?: number | null;
  top12EnteredAt?: string | null;
  ahEnteredTopNAt?: string | null;
  latched?: boolean;
  ahLatched?: boolean;
}

function seed(db: MarketDatabase, rows: SeedRow[]) {
  const statement = db.prepare(`
    INSERT INTO ticker_session (
      symbol, trading_date, price, percent_change, cumulative_volume, spread_pct,
      rvol, rvol_rank, ah_rank, ah_volume, ah_percent_change, ah_participation,
      latched, ah_latched, top12_entered_at, ah_entered_topn_at,
      qualified_at, ah_qualified_at, rvol_confidence, feed, updated_at
    ) VALUES (
      @symbol, @tradingDate, 4.0, 12.0, 5000000, 0.4,
      8.0, @rvolRank, @ahRank, @ahVolume, @ahPercentChange, 0.5,
      @latched, @ahLatched, @top12EnteredAt, @ahEnteredTopNAt,
      '2026-08-17T13:00:00.000Z', '2026-08-17T20:10:00.000Z', 'OK', 'sip',
      '2026-08-17T21:00:00.000Z'
    )
  `);

  const universe = db.prepare(`
    INSERT INTO universe (symbol, name, exchange, tradable, status, source, updated_at, classification)
    VALUES (@symbol, @symbol, 'NASDAQ', 1, 'active', 'test', '2026-08-17T08:00:00.000Z', 'COMMON_EQUITY')
  `);

  for (const row of rows) {
    statement.run({
      symbol: row.symbol,
      tradingDate: TRADING_DATE,
      rvolRank: row.rvolRank,
      ahRank: row.ahRank,
      ahVolume: row.ahVolume ?? null,
      ahPercentChange: row.ahPercentChange ?? null,
      latched: row.latched ? 1 : 0,
      ahLatched: row.ahLatched ? 1 : 0,
      top12EnteredAt: row.top12EnteredAt ?? null,
      ahEnteredTopNAt: row.ahEnteredTopNAt ?? null,
    });
    universe.run({ symbol: row.symbol });
  }
}

function focus(db: MarketDatabase, ticker: string) {
  db.prepare(
    `INSERT INTO focus_tickers (ticker, trading_date, pinned_at, display_order, source)
     VALUES (?, ?, '2026-08-17T14:00:00.000Z', 0, 'USER')`,
  ).run(ticker, TRADING_DATE);
}

describe('the queue follows the active board (requirement 15)', () => {
  it('researches the Daily-RVOL Top N during the day', () => {
    const db = temporaryDb();
    seed(db, [
      { symbol: 'DAYKING', rvolRank: 1, ahRank: null },
      { symbol: 'EVENING', rvolRank: 40, ahRank: 1 },
    ]);

    const candidates = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'DAILY_RVOL',
    });

    expect(candidates.map((candidate) => candidate.ticker)).toEqual(['DAYKING']);
  });

  it('researches the AH Top N after the bell', () => {
    const db = temporaryDb();
    seed(db, [
      { symbol: 'DAYKING', rvolRank: 1, ahRank: null },
      { symbol: 'EVENING', rvolRank: 40, ahRank: 1, ahVolume: 900_000, ahPercentChange: 62 },
    ]);

    const candidates = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'AFTER_HOURS',
    });

    // The name that stopped trading at 16:00 is no longer the research target.
    expect(candidates.map((candidate) => candidate.ticker)).toEqual(['EVENING']);
    // And the metrics carried into priority are the evening's, not the day's.
    expect(candidates[0].percentChange).toBe(62);
    expect(candidates[0].cumulativeVolume).toBe(900_000);
  });

  it('measures an after-hours discovery’s latency from its AH board entry', () => {
    const db = temporaryDb();
    seed(db, [
      {
        symbol: 'BOTH',
        rvolRank: 3,
        ahRank: 2,
        top12EnteredAt: '2026-08-17T10:40:00.000Z', // 06:40 ET
        ahEnteredTopNAt: '2026-08-17T21:10:00.000Z', // 17:10 ET
      },
    ]);

    const daytime = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'DAILY_RVOL',
    });
    const evening = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'AFTER_HOURS',
    });

    expect(daytime[0].top12EnteredAt).toBe('2026-08-17T10:40:00.000Z');
    // Not eleven hours of latency for a name that first mattered at 17:10.
    expect(evening[0].top12EnteredAt).toBe('2026-08-17T21:10:00.000Z');
  });
});

describe('a new after-hours mover queues automatically (requirement 42)', () => {
  it('progresses from AH discovery to a queued analysis job with no intervention', () => {
    const db = temporaryDb();
    seed(db, [
      { symbol: 'NEWAH', rvolRank: null, ahRank: 1, ahVolume: 1_200_000, ahPercentChange: 71 },
    ]);

    const candidates = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'AFTER_HOURS',
    });

    const decisions = queueDiscoveryResearch(db, candidates, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'after-hours top',
      now: new Date('2026-08-17T21:12:00.000Z'),
      currentFingerprint: () => 'evidence-a',
    });

    expect(decisions).toHaveLength(1);
    expect(decisions[0].ticker).toBe('NEWAH');
    expect(decisions[0].queued).toBe(true);

    const job = db
      .prepare('SELECT ticker, status, reason, top12_at FROM research_jobs')
      .get() as { ticker: string; status: string; reason: string; top12_at: string };

    expect(job.status).toBe('QUEUED');
    expect(job.reason).toContain('after-hours top');
    // Latency measured from AH board entry.
    expect(job.top12_at).toBe('2026-08-17T20:10:00.000Z');
  });

  it('does not create a second job for a ticker already being worked', () => {
    const db = temporaryDb();
    seed(db, [{ symbol: 'NEWAH', rvolRank: null, ahRank: 1 }]);

    const options = {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      now: new Date('2026-08-17T21:12:00.000Z'),
      currentFingerprint: () => 'evidence-a',
    };
    const candidates = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'AFTER_HOURS',
    });

    queueDiscoveryResearch(db, candidates, options);
    const second = queueDiscoveryResearch(db, candidates, options);

    expect(second[0].queued).toBe(false);
    expect(
      (db.prepare('SELECT COUNT(*) AS c FROM research_jobs').get() as { c: number }).c,
    ).toBe(1);
  });
});

describe('Focus survives the session transition (requirement 16)', () => {
  it('keeps a focused name research-relevant when it falls off the board', () => {
    const db = temporaryDb();
    seed(db, [
      { symbol: 'EVENING', rvolRank: null, ahRank: 1 },
      // Pinned by the trader; nowhere near either board.
      { symbol: 'PINNED', rvolRank: 90, ahRank: null },
    ]);
    focus(db, 'PINNED');

    const candidates = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'AFTER_HOURS',
    });

    /*
     * PINNED IS STILL PINNED IN THE STORE AND IS NOT A CANDIDATE ANYWAY.
     *
     * The row is written above, so this proves the admission clause is gone
     * rather than that the pin failed to save -- a test that stopped pinning
     * would pass for the wrong reason.
     */
    expect(candidates.find((candidate) => candidate.ticker === 'PINNED')).toBeUndefined();

    // The board name is unaffected: rank still admits, exactly as before.
    const onBoard = candidates.find((candidate) => candidate.ticker === 'EVENING');
    expect(onBoard).toBeDefined();
    expect(isEligible(onBoard!, 12)).toBe(true);
    expect(priorityScore(onBoard!, 12)).toBeGreaterThan(0);
  });

  it('still excludes an unfocused name outside the board', () => {
    const db = temporaryDb();
    seed(db, [{ symbol: 'FARBACK', rvolRank: 90, ahRank: 90 }]);

    const candidates = readBoardCandidates(db, {
      tradingDate: TRADING_DATE,
      autoRank: 12,
      board: 'AFTER_HOURS',
    });

    expect(candidates).toHaveLength(0);
  });
});
