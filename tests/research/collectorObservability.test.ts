import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, SCHEMA_VERSION, type MarketDatabase } from '@/lib/market/store/db';
import {
  enqueueResearchJob,
  recordCollectorReport,
  readRecentCollectorReports,
} from '@/lib/market/store/researchRepo';

/**
 * Proving a resolution happened, without an SSH session.
 *
 * Everything the collector decided lived in one journald line. When the box
 * became unreachable, the single question worth asking after a source-collection
 * repair — did it actually resolve, what did it cost, did the evidence move —
 * had no answer from the desk's own reads.
 */

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-obs-'));
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

function job(ticker: string): number {
  return enqueueResearchJob(db, {
    ticker,
    tradingDate: '2026-08-18',
    priority: 1,
    reason: 'top 12',
    queuedAt: '2026-08-18T14:00:00.000Z',
  }) as number;
}

const RESOLVED = {
  discoveryMode: 'RESOLVER',
  companySourceDetail: 'located newsroom index',
  companyFetchDetail: 'read 3 items via FEED',
  networkRequests: 1,
  resolutionProbes: { candidatesReturned: 3, candidatesProbed: 3, candidatesFetched: 2 },
  companySourceUrl: 'https://www.einride.tech/press',
  companySourceShape: 'INDEX',
  modelCalls: 1,
  sourcesAdded: 2,
  fingerprintChanged: true,
  state: 'RECENT_SOURCE_LOCATED',
};

describe('the collector report stored on a job', () => {
  it('carries the schema that holds it', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(17);
  });

  it('answers what ran, what it cost and whether evidence moved', () => {
    recordCollectorReport(db, job('ENRD'), RESOLVED);

    const [report] = readRecentCollectorReports(db, 10);
    expect(report.ticker).toBe('ENRD');
    expect(report.discoveryMode).toBe('RESOLVER');
    expect(report.companySourceUrl).toBe('https://www.einride.tech/press');
    expect(report.companySourceShape).toBe('INDEX');
    expect(report.modelCalls).toBe(1);
    expect(report.sourcesAdded).toBe(2);
    expect(report.fingerprintChanged).toBe(true);
  });

  it('records a pass that spent nothing just as plainly', () => {
    recordCollectorReport(db, job('XOS'), {
      ...RESOLVED,
      discoveryMode: null,
      companySourceDetail: 'reused stored negative result',
      companyFetchDetail: 'read 3 items via FEED',
      networkRequests: 1,
      resolutionProbes: { candidatesReturned: 3, candidatesProbed: 3, candidatesFetched: 2 },
      companySourceUrl: null,
      companySourceShape: null,
      modelCalls: 0,
      sourcesAdded: 0,
      fingerprintChanged: false,
    });

    const [report] = readRecentCollectorReports(db, 10);
    expect(report.modelCalls).toBe(0);
    expect(report.fingerprintChanged).toBe(false);
    expect(report.discoveryMode).toBeNull();
  });

  it('returns the newest first', () => {
    recordCollectorReport(db, job('AAA'), RESOLVED);
    recordCollectorReport(db, job('BBB'), RESOLVED);

    expect(readRecentCollectorReports(db, 10).map((r) => r.ticker)).toEqual(['BBB', 'AAA']);
  });

  it('ignores jobs that never reached the collector', () => {
    job('QUIET');
    expect(readRecentCollectorReports(db, 10)).toHaveLength(0);
  });

  it('survives a malformed row rather than failing the whole read', () => {
    const id = job('BAD');
    db.prepare('UPDATE research_jobs SET collector_report = ? WHERE id = ?').run('{not json', id);
    recordCollectorReport(db, job('GOOD'), RESOLVED);

    // A diagnostics page is not worth losing over one unparseable row.
    expect(readRecentCollectorReports(db, 10).map((r) => r.ticker)).toEqual(['GOOD']);
  });
});
