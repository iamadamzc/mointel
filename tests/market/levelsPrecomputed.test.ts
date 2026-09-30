import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ResistanceLevels } from '@/lib/market/levels';
import {
  appendRequested,
  levelsDirectory,
  MAX_REQUESTED,
  pruneLevelsDates,
  readLevelsRow,
  readRequested,
  writeLevelsRow,
} from '@/lib/market/levelsFiles';
import { BOARD_MAX_RANK, refreshBoardLevels } from '@/lib/market/levelsRefresh';
import { computeBoardLevels } from '@/lib/market/levelsStore';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { readBoardRankedSymbols, upsertMinuteBars } from '@/lib/market/store/repo';

/*
 * The precomputed levels store (JSON files), the batch compute and the
 * worker-side refresh, on a real SQLite store in a temp directory.
 * 2026-09-29 is EDT: 12:00 ET is 16:00Z.
 */
const TODAY = '2026-09-29';
const NOW = Date.parse(`${TODAY}T16:02:30.000Z`);

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-files-'));
});
afterEach(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function row(symbol: string, tradingDate = TODAY, levels: ResistanceLevels['levels'] = []): ResistanceLevels {
  return {
    symbol,
    tradingDate,
    computedAt: `${tradingDate}T16:00:00.000Z`,
    price: 1,
    levels,
    aboveAllStored: levels.length === 0 ? true : undefined,
    horizon: { fiveMinFrom: null, fifteenMinFrom: null, dailyFrom: null },
  } as ResistanceLevels;
}

describe('levels file store', () => {
  it('writes a row atomically under its trading date and reads it back', () => {
    const target = writeLevelsRow(dir, row('ABCD'));
    expect(target).toBe(path.join(dir, TODAY, 'ABCD.json'));
    expect(fs.readdirSync(path.join(dir, TODAY))).toEqual(['ABCD.json']); // no temp file left
    expect(readLevelsRow(dir, TODAY, 'ABCD')).toEqual(JSON.parse(JSON.stringify(row('ABCD'))));

    writeLevelsRow(dir, { ...row('ABCD'), price: 2 });
    expect(readLevelsRow(dir, TODAY, 'ABCD')!.price).toBe(2);
    expect(fs.readdirSync(path.join(dir, TODAY))).toEqual(['ABCD.json']);
  });

  it('reads null for an unwritten row, another date, a torn file or an unsafe symbol', () => {
    writeLevelsRow(dir, row('ABCD'));
    expect(readLevelsRow(dir, TODAY, 'WXYZ')).toBeNull();
    expect(readLevelsRow(dir, '2026-09-28', 'ABCD')).toBeNull();
    fs.writeFileSync(path.join(dir, TODAY, 'TORN.json'), '{"symbol":"TO');
    expect(readLevelsRow(dir, TODAY, 'TORN')).toBeNull();
    expect(readLevelsRow(dir, TODAY, '../ABCD')).toBeNull();
    expect(() => writeLevelsRow(dir, row('A/B'))).toThrow();
  });

  it('appends a requested symbol once, and stops at the ceiling', () => {
    expect(appendRequested(dir, TODAY, 'ABCD')).toBe(true);
    expect(appendRequested(dir, TODAY, 'ABCD')).toBe(false);
    expect(appendRequested(dir, TODAY, 'EFGH')).toBe(true);
    expect(readRequested(dir, TODAY)).toEqual(['ABCD', 'EFGH']);
    expect(readRequested(dir, '2026-09-28')).toEqual([]);

    for (let i = 0; i < MAX_REQUESTED; i += 1) appendRequested(dir, TODAY, `S${i}`);
    expect(readRequested(dir, TODAY)).toHaveLength(MAX_REQUESTED);
  });

  it('keeps the current and the previous trading date only', () => {
    for (const date of ['2026-09-24', '2026-09-25', '2026-09-28', TODAY]) writeLevelsRow(dir, row('ABCD', date));
    expect(pruneLevelsDates(dir, TODAY)).toEqual(['2026-09-24', '2026-09-25']);
    expect(fs.readdirSync(dir).sort()).toEqual(['2026-09-28', TODAY]);
  });

  it('LEVELS_DIR names the directory; the default sits beside the store', () => {
    const db = path.join(dir, 'data', 'market.db');
    expect(levelsDirectory(db, {})).toBe(path.join(dir, 'data', 'levels'));
    expect(levelsDirectory(db, { LEVELS_DIR: path.join(dir, 'x') })).toBe(path.join(dir, 'x'));
  });
});

function minute(symbol: string, ts: string, high: number, close = high) {
  return { symbol, ts, open: close, high, low: close, close, volume: 100, tradeCount: 1, vwap: close, source: 'live-bar', receivedAt: ts };
}

function rank(db: MarketDatabase, symbol: string, rvolRank: number | null, ahRank: number | null = null) {
  db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, rvol_rank, ah_rank, feed, updated_at)
     VALUES (?, ?, ?, ?, 'sip', ?)`,
  ).run(symbol, TODAY, rvolRank, ahRank, `${TODAY}T16:00:00.000Z`);
}

function seed(): MarketDatabase {
  const db = openDatabase(path.join(dir, 'market.db'));
  upsertMinuteBars(db, TODAY, [
    minute('AAA', `${TODAY}T15:40:00.000Z`, 2.6, 2.4),
    minute('AAA', `${TODAY}T15:55:00.000Z`, 2.3, 2.0),
    minute('BBB', `${TODAY}T15:50:00.000Z`, 50, 50),
    minute('REQ', `${TODAY}T15:50:00.000Z`, 7, 6),
  ]);
  rank(db, 'AAA', 1);
  rank(db, 'BBB', BOARD_MAX_RANK);
  rank(db, 'OUT', BOARD_MAX_RANK + 1);
  rank(db, 'EVE', null, 3); // the evening board only
  return db;
}

describe('batch compute and the worker refresh', () => {
  it('reads the ranked names on either board at rank <= 90', () => {
    const db = seed();
    expect(readBoardRankedSymbols(db, TODAY, BOARD_MAX_RANK)).toEqual(['AAA', 'BBB', 'EVE']);
    db.close();
  });

  it('computeBoardLevels reads each name once, in one pass, and times each', () => {
    const db = seed();
    const minuteReads: string[] = [];
    const prepare = db.prepare.bind(db);
    db.prepare = ((sql: string) => {
      if (/FROM minute_bars/.test(sql)) minuteReads.push(sql);
      return prepare(sql);
    }) as typeof db.prepare;

    const { rows, timings } = computeBoardLevels(db, Date.parse(`${TODAY}T16:00:00.000Z`), ['AAA', 'BBB', 'AAA', 'NONE']);
    expect([...rows.keys()]).toEqual(['AAA', 'BBB', 'NONE']);
    expect(minuteReads).toHaveLength(3);
    expect(timings.map((x) => x.symbol)).toEqual(['AAA', 'BBB', 'NONE']);
    expect(rows.get('AAA')!.levels.map((l) => l.price)).toEqual([2.3, 2.6]);
    expect(rows.get('BBB')).toMatchObject({ levels: [], aboveAllStored: true });
    expect(rows.get('NONE')).toBeNull();
    db.close();
  });

  it('refreshBoardLevels writes the board plus requested names at the latest 5m close', () => {
    const db = seed();
    const levels = path.join(dir, 'levels');
    appendRequested(levels, TODAY, 'REQ');
    writeLevelsRow(levels, row('OLD', '2026-09-24'));
    writeLevelsRow(levels, row('PRV', '2026-09-28'));

    const summary = refreshBoardLevels(db, levels, NOW);
    expect(summary.tradingDate).toBe(TODAY);
    expect(summary.computedAt).toBe(`${TODAY}T16:00:00.000Z`);
    expect(summary.symbols).toEqual(['AAA', 'BBB', 'EVE', 'REQ']);
    expect(summary.written).toBe(3);
    expect(summary.absent).toEqual(['EVE']);
    expect(summary.prunedDates).toEqual(['2026-09-24']);

    expect(readLevelsRow(levels, TODAY, 'AAA')!.computedAt).toBe(`${TODAY}T16:00:00.000Z`);
    expect(readLevelsRow(levels, TODAY, 'REQ')!.price).toBe(6);
    expect(readLevelsRow(levels, TODAY, 'OUT')).toBeNull();
    expect(readLevelsRow(levels, TODAY, 'EVE')).toBeNull();
    db.close();
  });
});
