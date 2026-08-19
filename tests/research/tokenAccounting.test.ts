import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  enqueueResearchJob,
  readDailyTokenReport,
  recordCollectorReport,
  recordModelUsage,
} from '@/lib/market/store/researchRepo';

/**
 * What the day cost, and how much of it bought nothing.
 *
 * A call count alone hid the shape of the 18 August problem: 179 recovery calls
 * read exactly like the five that added a source. Spend is therefore attributed
 * to a stage and a purpose, and joined to whether the job it paid for actually
 * moved any evidence.
 */

const DATE = '2026-08-18';

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-tokens-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  db.close();
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows keeps the handle; the OS temp root is swept anyway. */
  }
});

function job(ticker: string, outcome: { sourcesAdded: number; fingerprintChanged: boolean }) {
  const id = enqueueResearchJob(db, {
    ticker,
    tradingDate: DATE,
    priority: 1,
    reason: 'resolver recovery',
    queuedAt: '2026-08-18T21:00:00.000Z',
  }) as number;
  recordCollectorReport(db, id, {
    discoveryMode: 'RECOVERY',
    companySourceDetail: 'recovery: no durable company source located',
    companySourceUrl: null,
    companySourceShape: null,
    modelCalls: 1,
    state: 'COVERAGE_INCOMPLETE',
    ...outcome,
  });
  return id;
}

function spend(jobId: number, stage: string, trigger: string, input: number | null) {
  recordModelUsage(db, {
    tradingDate: DATE,
    at: '2026-08-18T21:00:05.000Z',
    jobId,
    ticker: 'T',
    model: 'gpt-5.6-luna',
    stage,
    trigger,
    inputTokens: input,
    cachedInputTokens: input === null ? null : 100,
    outputTokens: input === null ? null : 50,
  });
}

describe('the daily token report', () => {
  it('separates spend that added a source from spend that did not', () => {
    const useful = job('XOS', { sourcesAdded: 1, fingerprintChanged: true });
    const wasted = job('AAA', { sourcesAdded: 0, fingerprintChanged: false });
    spend(useful, 'DISCOVERY', 'RESOLVER_RECOVERY', 1_000);
    spend(wasted, 'DISCOVERY', 'RESOLVER_RECOVERY', 4_000);

    const report = readDailyTokenReport(db, DATE);

    expect(report.total.calls).toBe(2);
    expect(report.total.inputTokens).toBe(5_000);
    // The number that matters: what was spent learning nothing.
    expect(report.wasted.calls).toBe(1);
    expect(report.wasted.inputTokens).toBe(4_000);
  });

  it('groups by stage, trigger and model', () => {
    const id = job('XOS', { sourcesAdded: 1, fingerprintChanged: true });
    spend(id, 'RESOLVER', 'RESOLVER_RECOVERY', 800);
    spend(id, 'INTERPRETATION', 'ENTERED_TOP_N', 9_000);

    const report = readDailyTokenReport(db, DATE);

    expect(report.byStage.map((r) => r.key).sort()).toEqual(['INTERPRETATION', 'RESOLVER']);
    expect(report.byTrigger.map((r) => r.key).sort()).toEqual([
      'ENTERED_TOP_N',
      'RESOLVER_RECOVERY',
    ]);
    expect(report.byModel[0].key).toBe('gpt-5.6-luna');
  });

  it('splits by whether the fingerprint moved', () => {
    spend(job('A', { sourcesAdded: 1, fingerprintChanged: true }), 'DISCOVERY', 'none', 100);
    spend(job('B', { sourcesAdded: 0, fingerprintChanged: false }), 'DISCOVERY', 'none', 200);

    const byFp = Object.fromEntries(
      readDailyTokenReport(db, DATE).byFingerprint.map((r) => [r.key, r.inputTokens]),
    );

    expect(byFp.changed).toBe(100);
    expect(byFp.unchanged).toBe(200);
  });

  it('marks missing counts unavailable rather than calling them zero', () => {
    // A provider that returns no usage must not read as a free call.
    spend(job('C', { sourcesAdded: 0, fingerprintChanged: false }), 'DISCOVERY', 'none', null);

    const report = readDailyTokenReport(db, DATE);

    expect(report.total.calls).toBe(1);
    expect(report.total.unavailableCalls).toBe(1);
    expect(report.total.inputTokens).toBe(0);
  });

  it('reports an empty day without inventing numbers', () => {
    const report = readDailyTokenReport(db, DATE);
    expect(report.total.calls).toBe(0);
    expect(report.wasted.calls).toBe(0);
  });
});
