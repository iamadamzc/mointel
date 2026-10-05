import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { latestEarlierCheckpoint, type AssessmentSummary } from '@/lib/desk/view';
import { getMarketSnapshot } from '@/lib/market/readModel';
import { claimAssessmentSlot, completeAssessment } from '@/lib/market/store/assessmentRepo';
import { openDatabase, setMeta } from '@/lib/market/store/db';

/*
 * THE 22:00 RECAP IS FILED UNDER THE DAY IT CLOSES OUT, and the desk's trading
 * date rolls at 22:00 and over every weekend. So the panel's `today` (read for
 * the rolled date) is empty in the only window the recap is worth opening.
 * `carried` is that recap, read across dates; the main area opens on it
 * (his ruling 2026-10-05, "B"), so this must not come back empty.
 */

const FRIDAY = '2026-09-25';
const MONDAY = '2026-09-28';
const files: string[] = [];
const savedDbPath = process.env.MARKET_DB_PATH;

afterEach(() => {
  process.env.MARKET_DB_PATH = savedDbPath;
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function temporaryPath() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-carried-')), 'market.db');
  files.push(file);
  return file;
}

function recap(file: string, over: { tradingDate: string; type: string; scheduledFor: string; target: string | null }) {
  const db = openDatabase(file);
  setMeta(db, 'trading_date', MONDAY);
  setMeta(db, 'discovery_summary', JSON.stringify({ priceMin: 1, priceMax: 20, isTradingDay: true }));
  const id = claimAssessmentSlot(db, {
    tradingDate: over.tradingDate,
    targetTradingDate: over.target,
    assessmentType: over.type,
    scheduledFor: over.scheduledFor,
    startedAt: over.scheduledFor,
    generatedLate: false,
    sessionPhase: 'NEXT_DAY_PREP',
    board: 'AFTER_HOURS',
    rankingDefinition: 'test',
  });
  completeAssessment(db, id!, {
    completedAt: over.scheduledFor,
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
  return id!;
}

describe('the carried checkpoint, across the 22:00 roll', () => {
  it('Friday night\'s 22:00 recap is reachable on the rolled Monday date, which has no checkpoint of its own', () => {
    const file = temporaryPath();
    const id = recap(file, {
      tradingDate: FRIDAY,
      type: 'NEXT_DAY_RECAP',
      scheduledFor: '2026-09-26T02:00:00.000Z',
      target: MONDAY,
    });
    process.env.MARKET_DB_PATH = file;

    const panel = getMarketSnapshot({}).assessments;
    expect(panel.tradingDate).toBe(MONDAY);
    // CONTROL: the list for the rolled date really is empty, so a read that only
    // looked at `today` could not have found the recap.
    expect(panel.today).toEqual([]);
    expect(panel.carried?.id).toBe(id);
    expect(panel.carried?.tradingDate).toBe(FRIDAY);
    expect(panel.carried?.targetTradingDate).toBe(MONDAY);
  });

  it('is null when there is no earlier checkpoint at all', () => {
    const file = temporaryPath();
    const db = openDatabase(file);
    setMeta(db, 'trading_date', MONDAY);
    setMeta(db, 'discovery_summary', JSON.stringify({ priceMin: 1, priceMax: 20, isTradingDay: true }));
    db.close();
    process.env.MARKET_DB_PATH = file;
    expect(getMarketSnapshot({}).assessments.carried ?? null).toBeNull();
  });

  it('is not read when the rolled date has its own checkpoints', () => {
    const file = temporaryPath();
    recap(file, { tradingDate: FRIDAY, type: 'NEXT_DAY_RECAP', scheduledFor: '2026-09-26T02:00:00.000Z', target: MONDAY });
    recap(file, { tradingDate: MONDAY, type: 'PREMARKET_0625', scheduledFor: '2026-09-28T10:25:00.000Z', target: null });
    process.env.MARKET_DB_PATH = file;
    const panel = getMarketSnapshot({}).assessments;
    expect(panel.today).toHaveLength(1);
    expect(panel.carried ?? null).toBeNull();
  });
});

describe('latestEarlierCheckpoint', () => {
  const summary = (id: number, tradingDate: string): AssessmentSummary =>
    ({ id, tradingDate }) as unknown as AssessmentSummary;

  it('takes the newest checkpoint from another date and skips the rolled date\'s own', () => {
    const recent = [summary(9, MONDAY), summary(8, FRIDAY), summary(7, FRIDAY)];
    expect(latestEarlierCheckpoint(recent, MONDAY)?.id).toBe(8);
  });

  it('is null for an empty list or one holding only the given date', () => {
    expect(latestEarlierCheckpoint([], MONDAY)).toBeNull();
    expect(latestEarlierCheckpoint([summary(1, MONDAY)], MONDAY)).toBeNull();
  });
});
