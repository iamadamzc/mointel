import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { enqueueResearchJob, upsertIssuer, readJobsForDate } from '@/lib/market/store/researchRepo';
import { queueResolverRecovery, needsResolverRecovery } from '@/lib/research/recovery';
import { EMPTY_COMPANY_SOURCES } from '@/lib/research/types';

/**
 * The sweep that reaches issuers the board has stopped ranking.
 *
 * The collector's staleness check is enough for a name still being collected.
 * It does nothing for a name that spiked at the open, was researched against
 * the old resolver, and faded by mid-morning — that ticker holds a stale
 * dossier and is never collected again. This sweep is the only thing that
 * reaches it, so these tests fix its boundaries: today's researched names only,
 * capped per cycle, and never twice.
 */

const DATE = '2026-08-18';
const NOW = new Date('2026-08-18T14:30:00.000Z');

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-recovery-'));
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

function researched(ticker: string, queuedAt: string) {
  enqueueResearchJob(db, {
    ticker,
    tradingDate: DATE,
    priority: 10,
    reason: 'top 12',
    queuedAt,
  });
  db.prepare(`UPDATE research_jobs SET status = 'COMPLETE' WHERE ticker = ?`).run(ticker);
}

function issuer(ticker: string, sources: Record<string, unknown>) {
  upsertIssuer(db, {
    ticker,
    companyName: ticker,
    cik: null,
    exchange: null,
    country: null,
    foreignIssuer: null,
    cikConfidence: 'NONE',
    mappingSource: null,
    irUrl: null,
    lastVerifiedAt: null,
    companySources: { ...EMPTY_COMPANY_SOURCES, ...sources },
  } as never);
}

const STALE = { lastDiscoveryAt: '2026-08-18T11:00:00.000Z', resolverVersion: null };
const CURRENT = { lastDiscoveryAt: '2026-08-18T11:00:00.000Z', resolverVersion: 1 };

function sweep(limit = 2, attempted?: Set<string>) {
  return queueResolverRecovery(db, {
    tradingDate: DATE,
    resolverVersion: 1,
    now: NOW,
    limit,
    attempted,
  });
}

describe('which issuers need resolver recovery', () => {
  it('strands an issuer resolved by a superseded resolver', () => {
    expect(needsResolverRecovery({ ...EMPTY_COMPANY_SOURCES, ...STALE }, 1)).toBe(true);
  });

  it('leaves a never-attempted issuer alone', () => {
    // Not stranded: ordinary discovery reaches it without a recovery slot.
    expect(
      needsResolverRecovery({ ...EMPTY_COMPANY_SOURCES, lastDiscoveryAt: null }, 1),
    ).toBe(false);
  });

  it('leaves an issuer already stamped by the current resolver alone', () => {
    expect(needsResolverRecovery({ ...EMPTY_COMPANY_SOURCES, ...CURRENT }, 1)).toBe(false);
  });
});

describe('the bounded recovery sweep', () => {
  it('queues a faded ticker the board no longer ranks', () => {
    // ENRD's shape: researched at 07:00 against the old resolver, then gone.
    researched('ENRD', '2026-08-18T11:00:06.000Z');
    issuer('ENRD', STALE);

    const decisions = sweep();

    expect(decisions.map((d) => d.ticker)).toEqual(['ENRD']);
    expect(decisions[0].queued).toBe(true);
    expect(readJobsForDate(db, DATE).filter((j) => j.reason === 'resolver recovery')).toHaveLength(1);
  });

  it('records no trigger, so recovery cannot buy an urgent model call', () => {
    researched('ENRD', '2026-08-18T11:00:06.000Z');
    issuer('ENRD', STALE);

    sweep();

    const job = readJobsForDate(db, DATE).find((j) => j.reason === 'resolver recovery');
    expect(job?.trigger ?? null).toBeNull();
  });

  it('ignores an issuer never researched today', () => {
    // Present in the registry and stale, but not part of today's population.
    issuer('ZZZZ', STALE);

    expect(sweep()).toHaveLength(0);
  });

  it('ignores an issuer the current resolver already stamped', () => {
    researched('XOS', '2026-08-18T13:25:00.000Z');
    issuer('XOS', CURRENT);

    expect(sweep()).toHaveLength(0);
  });

  it('caps the number of jobs per sweep', () => {
    for (const [ticker, at] of [
      ['AAA', '2026-08-18T12:00:00.000Z'],
      ['BBB', '2026-08-18T12:10:00.000Z'],
      ['CCC', '2026-08-18T12:20:00.000Z'],
    ] as Array<[string, string]>) {
      researched(ticker, at);
      issuer(ticker, STALE);
    }

    expect(sweep(2)).toHaveLength(2);
  });

  it('corrects the most recently researched name first', () => {
    researched('OLD', '2026-08-18T12:00:00.000Z');
    issuer('OLD', STALE);
    researched('NEW', '2026-08-18T13:40:00.000Z');
    issuer('NEW', STALE);

    expect(sweep(1).map((d) => d.ticker)).toEqual(['NEW']);
  });

  it('does not give the same ticker a second recovery slot', () => {
    researched('ENRD', '2026-08-18T11:00:06.000Z');
    issuer('ENRD', STALE);

    const attempted = new Set<string>();
    expect(sweep(2, attempted)).toHaveLength(1);
    // The registry stamp has not landed yet; the in-process guard holds.
    expect(sweep(2, attempted)).toHaveLength(0);
  });

  it('creates no duplicate while the recovery job is still live', () => {
    researched('ENRD', '2026-08-18T11:00:06.000Z');
    issuer('ENRD', STALE);

    sweep(2, new Set());
    // A fresh process would try again; job deduplication must still hold.
    const second = sweep(2, new Set());

    expect(second[0]?.queued ?? false).toBe(false);
    expect(readJobsForDate(db, DATE).filter((j) => j.reason === 'resolver recovery')).toHaveLength(1);
  });
});
