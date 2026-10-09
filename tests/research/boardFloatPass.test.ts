import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { saveAnalysisVersion } from '@/lib/market/store/researchRepo';
import type { ResearchDossier } from '@/lib/research/types';
import {
  boardFloatCandidates,
  countingSec,
  maybeStartBoardFloatPass,
  runBoardFloatPass,
} from '@/lib/research/boardFloatPass';

/**
 * The board float pass (his "yes", Integration chat 2026-10-09T01:13:13.078Z): board names that have research but no
 * current float row get one, so the Float cell stops reading "Not computed" for a researched name. These pin which
 * names it takes, that it tries each once per date, that it stops on the first failure, and that it counts SEC requests.
 */

const files: string[] = [];

function db(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'board-float-')), 'market.db');
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
  const insert = store.prepare('INSERT INTO desk_assessment_tickers (assessment_id, ticker, assessment_rank) VALUES (?, ?, ?)');
  tickers.forEach((ticker, index) => insert.run(id, ticker, index + 1));
}

function research(store: MarketDatabase, ticker: string): void {
  saveAnalysisVersion(store, {
    ticker,
    generatedAt: '2026-10-05T12:00:00.000Z',
    evidenceFingerprint: `fp-${ticker}`,
    model: 'test',
    dossier: { cik: '0000000001', structure: { supplyLedger: [] } } as unknown as ResearchDossier,
    sourceIds: [],
    metadata: {},
  });
}

function floatRow(store: MarketDatabase, symbol: string, asOfDate: string): void {
  store
    .prepare(
      `INSERT INTO research_float_bounds
         (symbol, as_of_date, count_kind, holdings_json, split_since_count, issuance_filings_json, issuance_rule,
          max_age_days, state, reason, computed_at)
       VALUES (?, ?, 'NO_FILED_COUNT', '[]', 'UNPROVEN', '[]', 'KNOWN_OR_POSSIBLY_ACTIVE', 90, 'UNKNOWN', 'NO_FILED_COUNT', ?)`,
    )
    .run(symbol, asOfDate, `${asOfDate}T10:00:00.000Z`);
}

/** A float job that stores a row for `date`, as runFloatJob does, unless the ticker is in `fail`. */
function fakeRun(store: MarketDatabase, calls: string[], fail: string[] = []) {
  return async (ticker: string, date: string): Promise<void> => {
    calls.push(ticker);
    if (!fail.includes(ticker)) floatRow(store, ticker, date);
  };
}

const noSleep = async () => {};

describe('boardFloatCandidates', () => {
  it('takes the latest COMPLETE session\'s board names WITH research and no float row within the reuse span', () => {
    const store = db();
    checkpoint(store, '2026-10-07', 'COMPLETE', ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']);
    checkpoint(store, '2026-10-07', 'FAILED', ['FFF']);
    checkpoint(store, '2026-10-06', 'COMPLETE', ['GGG']);
    for (const t of ['AAA', 'BBB', 'CCC', 'EEE', 'FFF', 'GGG']) research(store, t);
    floatRow(store, 'BBB', '2026-10-07'); // current: today
    floatRow(store, 'CCC', '2026-10-03'); // 4 days old: still inside the reuse span
    floatRow(store, 'EEE', '2026-10-02'); // 5 days old: reads FILINGS_NOT_REREAD, so due again
    // DDD has no research (no CIK): out. FFF is only on a FAILED checkpoint, GGG only on an older session: out.
    expect(boardFloatCandidates(store)).toEqual({ tradingDate: '2026-10-07', tickers: ['AAA', 'EEE'] });
  });

  it('an empty board gives no date and no names', () => {
    expect(boardFloatCandidates(db())).toEqual({ tradingDate: null, tickers: [] });
  });
});

describe('runBoardFloatPass', () => {
  it('runs the float job for each candidate at the board date, and reads the outcome from the store', async () => {
    const store = db();
    checkpoint(store, '2026-10-07', 'COMPLETE', ['AAA', 'BBB']);
    research(store, 'AAA');
    research(store, 'BBB');
    const calls: string[] = [];
    const tally = await runBoardFloatPass(store, new Set(), { run: fakeRun(store, calls), log: () => {}, sleep: noSleep });
    expect(calls).toEqual(['AAA', 'BBB']);
    expect(tally).toMatchObject({ tradingDate: '2026-10-07', candidates: 2, stored: 2, failed: 0, stopped: false });
  });

  it('tries a name once per date: a second pass the same day skips names already tried, stored or not', async () => {
    const store = db();
    checkpoint(store, '2026-10-07', 'COMPLETE', ['AAA']);
    research(store, 'AAA');
    const tried = new Set<string>();
    const calls: string[] = [];
    await runBoardFloatPass(store, tried, { run: fakeRun(store, calls, ['AAA']), log: () => {}, sleep: noSleep });
    await runBoardFloatPass(store, tried, { run: fakeRun(store, calls, ['AAA']), log: () => {}, sleep: noSleep });
    expect(calls).toEqual(['AAA']);
  });

  it('stops on the first name that stores no row (an SEC or Alpaca failure), leaving the rest for the next day', async () => {
    const store = db();
    checkpoint(store, '2026-10-07', 'COMPLETE', ['AAA', 'BBB', 'CCC']);
    for (const t of ['AAA', 'BBB', 'CCC']) research(store, t);
    const calls: string[] = [];
    const tally = await runBoardFloatPass(store, new Set(), { run: fakeRun(store, calls, ['BBB']), log: () => {}, sleep: noSleep });
    expect(calls).toEqual(['AAA', 'BBB']);
    expect(tally).toMatchObject({ stored: 1, failed: 1, stopped: true });
  });

  it('paces the names', async () => {
    const store = db();
    checkpoint(store, '2026-10-07', 'COMPLETE', ['AAA', 'BBB', 'CCC']);
    for (const t of ['AAA', 'BBB', 'CCC']) research(store, t);
    const slept: number[] = [];
    await runBoardFloatPass(store, new Set(), { run: fakeRun(store, []), log: () => {}, sleep: async (ms) => void slept.push(ms), paceMs: 500 });
    expect(slept).toEqual([500, 500]);
  });
});

describe('countingSec', () => {
  it('counts every SEC request it passes through', async () => {
    const counter = { requests: 0 };
    const sec = countingSec({ get: async () => ({ body: 'x' }), getJson: async () => ({ data: {} }) } as never, counter);
    await sec.get('a');
    await sec.getJson('b');
    await sec.getJson('c');
    expect(counter.requests).toBe(3);
  });
});

describe('maybeStartBoardFloatPass', () => {
  it('BOARD_FLOAT_PASS=off disables it', () => {
    const lines: string[] = [];
    const handle = maybeStartBoardFloatPass({ BOARD_FLOAT_PASS: 'off' }, { db: db(), run: async () => {}, log: (l) => lines.push(l) });
    expect(handle).toBeNull();
    expect(lines.join('\n')).toContain('BOARD_FLOAT_PASS=off');
  });
});
