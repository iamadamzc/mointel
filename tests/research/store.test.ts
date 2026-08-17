import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import {
  claimStoreForMode,
  openDatabase,
  schemaBackupDirectory,
  SCHEMA_VERSION,
} from '@/lib/market/store/db';
import { insertDeskEvents } from '@/lib/market/store/repo';
import {
  claimQueuedJobs,
  completeJob,
  countJobsByStatus,
  deactivateSources,
  enqueueResearchJob,
  insertResearchSources,
  readAnalysisHistory,
  readCurrentAnalyses,
  readCurrentAnalysis,
  readIssuer,
  readKnownAccessions,
  readLatestJobForTicker,
  readOrphanedJobs,
  readRecycledContent,
  readSources,
  requeueJobForRetry,
  researchTablesPresent,
  saveAnalysisVersion,
  upsertIssuer,
} from '@/lib/market/store/researchRepo';
import type { IssuerRecord, NewResearchSource, ResearchDossier } from '@/lib/research/types';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-research-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

const DATE = '2026-08-17';

function source(overrides: Partial<NewResearchSource> = {}): NewResearchSource {
  return {
    ticker: 'SLE',
    sourceType: 'SEC_FILING',
    title: 'Current report',
    url: 'https://www.sec.gov/Archives/edgar/data/1/0001-8-k.htm',
    publishedAt: '2026-08-17T11:00:00Z',
    fetchedAt: '2026-08-17T11:05:00Z',
    accession: '0001234567-26-000001',
    secForm: '8-K',
    authority: 'SEC',
    contentHash: 'hash-a',
    documentFingerprint: 'doc-a',
    excerpt: 'The company announced a partnership.',
    metadata: {},
    active: true,
    ...overrides,
  };
}

function dossier(ticker = 'SLE'): ResearchDossier {
  return {
    ticker,
    companyName: 'Sample Corp',
    cik: '0001234567',
    country: null,
    foreignIssuer: null,
    catalyst: {
      catalystStatus: 'FRESH_FOUND',
      catalystType: 'NEWS_DRIVEN',
      catalystGrade: 'STRONG',
      summary: 'Partnership announced',
      eventTimestamp: '2026-08-17T11:00:00Z',
      freshness: 'FRESH',
      whyTradersMayCare: 'First revenue agreement',
      plausiblyExplainsMove: true,
      confidence: 'HIGH',
      evidenceSourceIds: [1],
    },
    structure: {
      sharesOutstanding: 10_000_000,
      sharesOutstandingDate: '2026-06-30',
      displayedFloat: null,
      displayedFloatSource: null,
      floatConfidence: 'UNKNOWN',
      structureClassification: 'CAUTION',
      supplyLedger: [],
      structuralWarnings: [],
      reverseSplitHistory: [],
      knownRegistrationStatus: null,
      summary: null,
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
    },
    cycle: {
      cycleClassification: 'GREEN_FRESH_FRONTSIDE',
      reasoning: null,
      currentCycleHigh: null,
      currentCycleHighConfidence: 'UNKNOWN',
      historicalResistance: null,
      formerRunnerStatus: null,
      recentMajorRuns: [],
      confidence: 'LOW',
      evidenceSourceIds: [1],
    },
  };
}

describe('research schema', () => {
  it('creates the research tables', () => {
    expect(researchTablesPresent(temporaryDb())).toBe(true);
  });

  it('adds the research tables to a store created before they existed', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-v2-')), 'market.db');
    temporaryFiles.push(file);

    // Stand in for a v2 store: market tables present, research tables absent.
    const old = openDatabase(file);
    old.exec(`
      DROP TABLE research_dossiers;
      DROP TABLE research_analysis_versions;
      DROP TABLE research_sources;
      DROP TABLE research_jobs;
      DROP TABLE issuer_registry;
      DROP TABLE research_health;
    `);
    expect(researchTablesPresent(old)).toBe(false);
    old.close();

    // Reopening migrates in place; the expensive RVOL baselines are untouched.
    const migrated = openDatabase(file);
    expect(researchTablesPresent(migrated)).toBe(true);
    expect(migrated.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
  });

  it('backs the store up before upgrading it, exactly once', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-backup-'));
    const file = path.join(directory, 'market.db');
    temporaryFiles.push(file);

    // Stand in for a populated v2 store.
    const old = openDatabase(file);
    old.exec(`
      DROP TABLE research_dossiers;
      DROP TABLE research_analysis_versions;
      DROP TABLE research_sources;
      DROP TABLE research_jobs;
      DROP TABLE issuer_registry;
      DROP TABLE research_health;
    `);
    insertDeskEvents(old, [
      {
        tradingDate: DATE,
        ts: '2026-08-17T11:00:00Z',
        type: 'NEW_HOD',
        symbol: 'SLE',
        message: 'new high',
        payload: {},
        dedupeKey: 'sle-hod-1',
      },
    ]);
    old.pragma('user_version = 2');
    old.close();

    const backups: Array<{ path: string; fromVersion: number; toVersion: number }> = [];
    openDatabase(file, { onSchemaBackup: (info) => backups.push(info) }).close();

    expect(backups).toHaveLength(1);
    expect(backups[0].fromVersion).toBe(2);
    expect(backups[0].toVersion).toBe(SCHEMA_VERSION);
    expect(fs.existsSync(backups[0].path)).toBe(true);
    expect(backups[0].path.startsWith(schemaBackupDirectory(file))).toBe(true);

    // The snapshot must hold the pre-upgrade state, not an empty shell.
    const snapshot = new Database(backups[0].path, { readonly: true });
    const events = snapshot.prepare('SELECT COUNT(*) AS n FROM desk_events').get() as { n: number };
    expect(events.n).toBe(1);
    expect(snapshot.pragma('user_version', { simple: true })).toBe(2);
    snapshot.close();

    // An already-current store is left alone: normal startups must not
    // accumulate a copy of the database every time the worker restarts.
    const second: unknown[] = [];
    openDatabase(file, { onSchemaBackup: (info) => second.push(info) }).close();
    expect(second).toHaveLength(0);
    expect(fs.readdirSync(schemaBackupDirectory(file))).toHaveLength(1);
  });

  it('does not back up a brand-new database', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-fresh-')), 'market.db');
    temporaryFiles.push(file);

    const backups: unknown[] = [];
    openDatabase(file, { onSchemaBackup: (info) => backups.push(info) }).close();

    // Nothing to lose, so nothing is written.
    expect(backups).toHaveLength(0);
    expect(fs.existsSync(schemaBackupDirectory(file))).toBe(false);
  });

  it('degrades to empty rather than throwing when the tables are absent', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-bare-')), 'market.db');
    temporaryFiles.push(file);
    const db = openDatabase(file);
    db.exec('DROP TABLE research_jobs; DROP TABLE research_sources;');

    // The dashboard opens the store read-only with skipSchema, so it can meet a
    // database that predates these tables. A page render must not crash.
    expect(readSources(db, 'SLE')).toEqual([]);
    expect(readCurrentAnalysis(db, 'SLE')).toBeNull();
    expect(readIssuer(db, 'SLE')).toBeNull();
    expect(countJobsByStatus(db, DATE)).toEqual({});
    expect(readKnownAccessions(db, 'SLE').size).toBe(0);
  });

  it('keeps collected evidence when the store changes market mode', () => {
    const db = temporaryDb();
    upsertIssuer(db, issuer());
    insertResearchSources(db, [source()]);
    saveAnalysisVersion(db, {
      ticker: 'SLE',
      generatedAt: '2026-08-17T12:00:00Z',
      evidenceFingerprint: 'fp-1',
      model: 'test-model',
      dossier: dossier(),
      sourceIds: [1],
    });
    enqueueResearchJob(db, {
      ticker: 'SLE',
      tradingDate: DATE,
      priority: 10,
      reason: 'top-12',
      queuedAt: '2026-08-17T11:00:00Z',
    });

    claimStoreForMode(db, 'SIMULATOR');

    // Filings and what they say are public facts a simulator cannot invalidate.
    expect(readSources(db, 'SLE')).toHaveLength(1);
    expect(readIssuer(db, 'SLE')?.cik).toBe('0001234567');
    expect(readCurrentAnalysis(db, 'SLE')).not.toBeNull();
    // Jobs are bound to a session, so they go with it.
    expect(readJobsCount(db)).toBe(0);
  });
});

function readJobsCount(db: ReturnType<typeof temporaryDb>): number {
  const counts = countJobsByStatus(db, DATE);
  return Object.values(counts).reduce((total, n) => total + n, 0);
}

function issuer(overrides: Partial<IssuerRecord> = {}): IssuerRecord {
  return {
    ticker: 'SLE',
    companyName: 'Sample Corp',
    cik: '0001234567',
    exchange: 'Nasdaq',
    country: null,
    foreignIssuer: null,
    cikConfidence: 'HIGH',
    mappingSource: 'company_tickers_exchange',
    irUrl: null,
    lastVerifiedAt: '2026-08-17T10:00:00Z',
    ...overrides,
  };
}

describe('research job queue', () => {
  const queued = {
    ticker: 'SLE',
    tradingDate: DATE,
    priority: 10,
    reason: 'entered top 12',
    queuedAt: '2026-08-17T11:00:00Z',
  };

  it('queues a newly discovered ticker', () => {
    const db = temporaryDb();
    expect(enqueueResearchJob(db, queued)).not.toBeNull();
    expect(readLatestJobForTicker(db, 'SLE', DATE)?.status).toBe('QUEUED');
  });

  it('does not create a second live job for the same ticker', () => {
    const db = temporaryDb();
    enqueueResearchJob(db, queued);
    // Repeated discovery, a rank change and a hammered REANALYZE all land here.
    expect(enqueueResearchJob(db, queued)).toBeNull();
    expect(enqueueResearchJob(db, { ...queued, priority: 99 })).toBeNull();
    expect(readJobsCount(db)).toBe(1);
  });

  it('allows requeue once the previous job is finished', () => {
    const db = temporaryDb();
    const id = enqueueResearchJob(db, queued)!;
    completeJob(db, id, { status: 'COMPLETE', completedAt: '2026-08-17T11:30:00Z' });

    // A new filing must be able to trigger fresh analysis.
    expect(enqueueResearchJob(db, { ...queued, reason: 'new 8-K' })).not.toBeNull();
    expect(readJobsCount(db)).toBe(2);
  });

  it('claims jobs by priority but keeps lower-priority names queued', () => {
    const db = temporaryDb();
    enqueueResearchJob(db, { ...queued, ticker: 'GRNQ', priority: 1, reason: 'top 12, thin' });
    enqueueResearchJob(db, { ...queued, ticker: 'CRGO', priority: 50, reason: 'top 12, strong' });
    enqueueResearchJob(db, { ...queued, ticker: 'IVF', priority: 25 });

    const claimed = claimQueuedJobs(db, DATE, 2, '2026-08-17T11:01:00Z');

    expect(claimed.map((job) => job.ticker)).toEqual(['CRGO', 'IVF']);
    expect(claimed.every((job) => job.status === 'COLLECTING')).toBe(true);
    // The thin name is not dropped — it is merely later in line.
    expect(readLatestJobForTicker(db, 'GRNQ', DATE)?.status).toBe('QUEUED');
  });

  it('does not hand the same job to two workers', () => {
    const db = temporaryDb();
    enqueueResearchJob(db, queued);

    const first = claimQueuedJobs(db, DATE, 5, '2026-08-17T11:01:00Z');
    const second = claimQueuedJobs(db, DATE, 5, '2026-08-17T11:01:01Z');

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it('preserves an in-flight job regardless of rank', () => {
    const db = temporaryDb();
    const id = enqueueResearchJob(db, queued)!;
    claimQueuedJobs(db, DATE, 1, '2026-08-17T11:01:00Z');

    // Rank changes are not a reason to destroy useful work; nothing cancels it.
    completeJob(db, id, {
      status: 'COMPLETE',
      completedAt: '2026-08-17T11:40:00Z',
      evidenceFingerprint: 'fp-1',
    });

    const job = readLatestJobForTicker(db, 'SLE', DATE)!;
    expect(job.status).toBe('COMPLETE');
    expect(job.evidenceFingerprint).toBe('fp-1');
  });

  it('recovers jobs orphaned by a worker restart', () => {
    const db = temporaryDb();
    enqueueResearchJob(db, queued);
    claimQueuedJobs(db, DATE, 1, '2026-08-17T11:01:00Z');

    const orphans = readOrphanedJobs(db, DATE);
    expect(orphans.map((job) => job.ticker)).toEqual(['SLE']);

    requeueJobForRetry(db, orphans[0].id, 'worker restarted');
    const job = readLatestJobForTicker(db, 'SLE', DATE)!;
    expect(job.status).toBe('QUEUED');
    expect(job.retryCount).toBe(1);
  });
});

describe('issuer registry', () => {
  it('stores a ticker to CIK mapping with its confidence', () => {
    const db = temporaryDb();
    upsertIssuer(db, issuer());
    const stored = readIssuer(db, 'SLE')!;
    expect(stored.cik).toBe('0001234567');
    expect(stored.cikConfidence).toBe('HIGH');
    expect(stored.mappingSource).toBe('company_tickers_exchange');
  });

  it('leaves foreign issuer status unknown rather than defaulting to false', () => {
    const db = temporaryDb();
    upsertIssuer(db, issuer());
    expect(readIssuer(db, 'SLE')?.foreignIssuer).toBeNull();

    upsertIssuer(db, issuer({ foreignIssuer: true, country: 'L3' }));
    expect(readIssuer(db, 'SLE')?.foreignIssuer).toBe(true);
  });

  it('does not let a later pass erase what an earlier one established', () => {
    const db = temporaryDb();
    upsertIssuer(db, issuer({ irUrl: 'https://example.com/investors' }));
    // A CIK refresh that knows nothing about IR must not wipe the IR URL.
    upsertIssuer(db, issuer({ irUrl: null, cikConfidence: 'MEDIUM' }));

    const stored = readIssuer(db, 'SLE')!;
    expect(stored.irUrl).toBe('https://example.com/investors');
    expect(stored.cikConfidence).toBe('MEDIUM');
  });

  it('returns null for an unmapped ticker instead of inventing one', () => {
    expect(readIssuer(temporaryDb(), 'NOPE')).toBeNull();
  });
});

describe('research sources', () => {
  it('does not duplicate an identical document', () => {
    const db = temporaryDb();
    const first = insertResearchSources(db, [source()]);
    const second = insertResearchSources(db, [source()]);

    expect(readSources(db, 'SLE')).toHaveLength(1);
    // Re-collection returns the same id, so citations stay stable.
    expect(second).toEqual(first);
  });

  it('stores distinct documents separately', () => {
    const db = temporaryDb();
    insertResearchSources(db, [
      source(),
      source({
        contentHash: 'hash-b',
        documentFingerprint: 'doc-b',
        accession: '0001234567-26-000002',
        secForm: '424B5',
      }),
    ]);
    expect(readSources(db, 'SLE')).toHaveLength(2);
  });

  it('keeps two filings that share wording as two documents', () => {
    const db = temporaryDb();
    // Real case: routine cover-page filings are frequently byte-identical, but
    // they are separate legal filings and each accession must survive.
    insertResearchSources(db, [
      source({ accession: 'A-1', documentFingerprint: 'doc-a1', contentHash: 'same-body' }),
      source({ accession: 'A-2', documentFingerprint: 'doc-a2', contentHash: 'same-body' }),
    ]);

    const stored = readSources(db, 'SLE');
    expect(stored).toHaveLength(2);
    expect(stored.map((s) => s.accession).sort()).toEqual(['A-1', 'A-2']);
  });

  it('still reports identical content across different accessions as recycled', () => {
    const db = temporaryDb();
    insertResearchSources(db, [
      source({ accession: 'A-1', documentFingerprint: 'doc-a1', contentHash: 'same-body' }),
      source({ accession: 'A-2', documentFingerprint: 'doc-a2', contentHash: 'same-body' }),
      source({ accession: 'A-3', documentFingerprint: 'doc-a3', contentHash: 'different' }),
    ]);

    const recycled = readRecycledContent(db, 'SLE');
    expect(recycled).toHaveLength(1);
    expect(recycled[0].count).toBe(2);
    expect(recycled[0].accessions.sort()).toEqual(['A-1', 'A-2']);
  });

  it('tracks known accessions for new-filing detection', () => {
    const db = temporaryDb();
    insertResearchSources(db, [source()]);
    const known = readKnownAccessions(db, 'SLE');
    expect(known.has('0001234567-26-000001')).toBe(true);
    expect(known.has('0001234567-26-000009')).toBe(false);
  });

  it('keeps superseded sources as history rather than deleting them', () => {
    const db = temporaryDb();
    const [id] = insertResearchSources(db, [source()]);
    deactivateSources(db, [id]);

    expect(readSources(db, 'SLE', { activeOnly: true })).toHaveLength(0);
    expect(readSources(db, 'SLE')).toHaveLength(1);
  });
});

describe('analysis versions', () => {
  const base = {
    ticker: 'SLE',
    generatedAt: '2026-08-17T12:00:00Z',
    evidenceFingerprint: 'fp-1',
    model: 'test-model',
    sourceIds: [1],
  };

  it('records the current dossier', () => {
    const db = temporaryDb();
    saveAnalysisVersion(db, { ...base, dossier: dossier() });

    const current = readCurrentAnalysis(db, 'SLE')!;
    expect(current.dossier.catalyst.catalystStatus).toBe('FRESH_FOUND');
    expect(current.supersedesId).toBeNull();
  });

  it('supersedes without destroying the previous analysis', () => {
    const db = temporaryDb();
    const first = saveAnalysisVersion(db, { ...base, dossier: dossier() });

    const revised = dossier();
    revised.structure.structureClassification = 'DIRTY_FLOAT';
    const second = saveAnalysisVersion(db, {
      ...base,
      generatedAt: '2026-08-17T13:00:00Z',
      evidenceFingerprint: 'fp-2',
      dossier: revised,
    });

    expect(second.supersedesId).toBe(first.id);
    expect(readCurrentAnalysis(db, 'SLE')!.id).toBe(second.id);
    // The chain must still reconstruct what the conclusion used to be.
    const history = readAnalysisHistory(db, 'SLE');
    expect(history).toHaveLength(2);
    expect(history[1].dossier.structure.structureClassification).toBe('CAUTION');
  });

  it('reads many tickers at once for the dashboard merge', () => {
    const db = temporaryDb();
    saveAnalysisVersion(db, { ...base, dossier: dossier() });
    saveAnalysisVersion(db, { ...base, ticker: 'CRGO', dossier: dossier('CRGO') });

    const found = readCurrentAnalyses(db, ['SLE', 'CRGO', 'ABSENT']);
    expect([...found.keys()].sort()).toEqual(['CRGO', 'SLE']);
  });

  it('returns null for a ticker that has never been analyzed', () => {
    expect(readCurrentAnalysis(temporaryDb(), 'NOPE')).toBeNull();
  });
});
