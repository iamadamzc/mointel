import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getMarketSnapshot, resetMorningReadCache } from '@/lib/market/readModel';
import { claimAssessmentSlot, completeAssessment } from '@/lib/market/store/assessmentRepo';
import { openDatabase, setMeta } from '@/lib/market/store/db';

/*
 * THE WIRING: the drawer's Morning check reads `MarketSnapshot.morningRead`, so the
 * snapshot itself must carry it. The tests beside `readMorningRead` call that
 * function directly; a snapshot that dropped the field passed all of them (mutant M2,
 * Integration's ruling). This reads it through `getMarketSnapshot` on a real store.
 */

const FRIDAY = '2026-09-25';
const MONDAY = '2026-09-28';
const RECAP_AT = '2026-09-26T02:00:05.000Z';
const MORNING_AT = '2026-09-28T11:00:10.000Z';
const files: string[] = [];
const savedDbPath = process.env.MARKET_DB_PATH;

afterEach(() => {
  process.env.MARKET_DB_PATH = savedDbPath;
  resetMorningReadCache();
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function checkpoint(
  file: string,
  over: { tradingDate: string; type: string; at: string; target: string | null; phase: string; board: string },
) {
  const db = openDatabase(file);
  setMeta(db, 'trading_date', MONDAY);
  setMeta(db, 'discovery_summary', JSON.stringify({ priceMin: 1, priceMax: 20, isTradingDay: true }));
  const id = claimAssessmentSlot(db, {
    tradingDate: over.tradingDate,
    targetTradingDate: over.target,
    assessmentType: over.type,
    scheduledFor: over.at,
    startedAt: over.at,
    generatedLate: false,
    sessionPhase: over.phase,
    board: over.board,
    rankingDefinition: 'test',
  });
  completeAssessment(db, id!, {
    completedAt: over.at,
    status: 'COMPLETE',
    tickerCount: 0,
    modelCalls: 0,
    runtimeMs: 1,
    marketFingerprint: null,
    researchFingerprint: null,
    notes: '',
    metadata: {},
  });
  db.close();
}

describe('the market snapshot carries the morning read', () => {
  it('a store with an evening recap and a 07:00 checkpoint for the date sends their frame on the snapshot', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-morningwire-')), 'market.db');
    files.push(file);
    checkpoint(file, { tradingDate: FRIDAY, type: 'NEXT_DAY_RECAP', at: RECAP_AT, target: MONDAY, phase: 'NEXT_DAY_PREP', board: 'AFTER_HOURS' });
    checkpoint(file, { tradingDate: MONDAY, type: 'PREMARKET_0700', at: MORNING_AT, target: null, phase: 'PREMARKET', board: 'PREMARKET' });
    process.env.MARKET_DB_PATH = file;
    resetMorningReadCache();

    const read = getMarketSnapshot({}).morningRead;
    expect(read).toBeDefined();
    expect(read && 'unreadable' in read).toBe(false);
    expect(read).toMatchObject({ morningAt: MORNING_AT, eveningAt: RECAP_AT, morningTickers: [], eveningTickers: [], byTicker: {} });
  });
});
