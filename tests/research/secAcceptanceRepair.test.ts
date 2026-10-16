import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { insertResearchSources, readCurrentAnalysis, readLatestAnalysesAsOf, readSources, saveAnalysisVersion } from '@/lib/market/store/researchRepo';
import { eventWhen } from '@/lib/research/eventWhen';
import { computeEvidenceFingerprint } from '@/lib/research/fingerprint';
import { applyAcceptanceRepair, planAcceptanceRepair, undoAcceptanceRepair } from '@/lib/research/sec/acceptanceRepair';
import type { NewResearchSource, ResearchDossier } from '@/lib/research/types';

/*
 * The SEC acceptance repair (his "a" to question 1, Integration chat uuid 2c3c548c): source rows take the header
 * instant; a name whose current stamp was copied from an off row gets one superseding version with the stamp repaired;
 * the stored fingerprint follows the evidence so the pipeline makes NO paid call (interpret/pipeline.ts:170-194:
 * the model runs only when the current version's fingerprint differs from computeEvidenceFingerprint(readSources)).
 */

const dirs: string[] = [];
const dbs: MarketDatabase[] = [];
afterEach(() => {
  for (const db of dbs.splice(0)) db.close();
  for (const d of dirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* Windows */ }
  }
});
function temporaryDb(): MarketDatabase {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-repair-'));
  dirs.push(d);
  const db = openDatabase(path.join(d, 'market.db'));
  dbs.push(db);
  return db;
}

const TRUE_AT = '2026-10-01T20:31:13.000Z'; // AIXI's 6-K: 16:31:13 ET on 10-01 (its index header)
const WRONG_AT = '2026-10-02T00:31:13.000Z'; // what the submissions JSON gave: 4 h late
const ACCESSION = '0001213900-26-105555';
const header = (accession: string) => (accession === ACCESSION ? TRUE_AT : null);

function source(ticker: string, publishedAt: string, accession: string | null, type: 'SEC_FILING' | 'NEWS_FEED' = 'SEC_FILING'): NewResearchSource {
  return {
    ticker, sourceType: type, title: `${type} ${ticker}`, url: `https://www.sec.gov/Archives/edgar/data/1/${(accession ?? 'x').replace(/-/g, '')}/d.htm`,
    publishedAt, publishedPrecision: 'EXACT', fetchedAt: '2026-10-02T10:00:00.000Z', accession, secForm: '6-K', authority: 'SEC',
    contentHash: `h-${ticker}-${type}`, documentFingerprint: `f-${ticker}-${type}`, excerpt: null, metadata: {}, active: true,
  } as NewResearchSource;
}
const dossier = (ticker: string, eventTimestamp: string | null, ids: number[]) =>
  ({ ticker, catalyst: { eventTimestamp, evidenceSourceIds: ids, catalystStatus: 'FRESH_FOUND', summary: 'A 6-K.' } }) as unknown as ResearchDossier;

/** One name with one SEC filing stored at the WRONG instant, and a current version whose fingerprint is current. */
function seed(db: MarketDatabase, ticker: string, stamp: string | null) {
  const ids = insertResearchSources(db, [source(ticker, WRONG_AT, ACCESSION)]);
  const fp = computeEvidenceFingerprint(readSources(db, ticker));
  const version = saveAnalysisVersion(db, { ticker, generatedAt: '2026-10-02T14:00:00.000Z', evidenceFingerprint: fp, model: 'm', dossier: dossier(ticker, stamp, ids), sourceIds: ids });
  return { ids, fp, version };
}
const noPaidCall = (db: MarketDatabase, ticker: string) => readCurrentAnalysis(db, ticker)!.evidenceFingerprint === computeEvidenceFingerprint(readSources(db, ticker));

describe('planAcceptanceRepair and applyAcceptanceRepair', () => {
  it('THE FALSE-DATE TRAP: a stamp copied from the off row gets a superseding version with the true instant; no paid call', () => {
    const db = temporaryDb();
    const { version } = seed(db, 'AAA', WRONG_AT);
    // Repairing the row alone would leave the stamp at 00:31Z, matching nothing: read as a date only, 10-02, false.
    expect(eventWhen({ eventTimestamp: WRONG_AT, sources: [{ publishedAt: TRUE_AT, precision: 'EXACT' }] }).date).toBe('2026-10-02');
    const plan = planAcceptanceRepair(db, header);
    expect(plan.sources).toEqual([expect.objectContaining({ ticker: 'AAA', old: WRONG_AT, next: TRUE_AT })]);
    expect(plan.versions).toEqual([expect.objectContaining({ ticker: 'AAA', currentId: version.id, oldStamp: WRONG_AT, newStamp: TRUE_AT })]);
    expect(plan.fingerprints).toEqual([]);
    applyAcceptanceRepair(db, plan, '2026-10-16T23:30:00.000Z');
    const current = readCurrentAnalysis(db, 'AAA')!;
    expect(current.id).not.toBe(version.id);
    expect(current.supersedesId).toBe(version.id);
    expect(current.dossier.catalyst.eventTimestamp).toBe(TRUE_AT);
    expect(readSources(db, 'AAA')[0]!.publishedAt).toBe(TRUE_AT);
    // The date and clock every reader takes: 10-01, 16:31 ET, true.
    expect(eventWhen({ eventTimestamp: current.dossier.catalyst.eventTimestamp, sources: [{ publishedAt: TRUE_AT, precision: 'EXACT' }] })).toEqual({ date: '2026-10-01', clock: '16:31' });
    // The no-paid-call condition, exactly the pipeline's.
    expect(noPaidCall(db, 'AAA')).toBe(true);
  });

  it("AIXI'S SHAPE: the stamp was right and the row wrong; no new version, the fingerprint moves in place, the clock is now vouched", () => {
    const db = temporaryDb();
    const { version } = seed(db, 'AIXI', TRUE_AT);
    const plan = planAcceptanceRepair(db, header);
    expect(plan.versions).toEqual([]);
    expect(plan.fingerprints).toEqual([expect.objectContaining({ ticker: 'AIXI', versionId: version.id })]);
    applyAcceptanceRepair(db, plan, '2026-10-16T23:30:00.000Z');
    expect(readCurrentAnalysis(db, 'AIXI')!.id).toBe(version.id);
    expect(eventWhen({ eventTimestamp: TRUE_AT, sources: [{ publishedAt: readSources(db, 'AIXI')[0]!.publishedAt, precision: 'EXACT' }] }).clock).toBe('16:31');
    expect(noPaidCall(db, 'AIXI')).toBe(true);
  });

  it('a name whose stored fingerprint already differed (new evidence arrived) is LEFT due its re-analysis', () => {
    const db = temporaryDb();
    seed(db, 'BBB', TRUE_AT);
    insertResearchSources(db, [source('BBB', '2026-10-03T12:00:00.000Z', null, 'NEWS_FEED')]); // arrived after the analysis
    const plan = planAcceptanceRepair(db, header);
    expect(plan.alreadyStale).toEqual(['BBB']);
    expect(plan.fingerprints).toEqual([]);
    applyAcceptanceRepair(db, plan, '2026-10-16T23:30:00.000Z');
    expect(noPaidCall(db, 'BBB')).toBe(false); // due before the repair, still due: not hidden
  });

  it('a retry-state row on the pre-repair evidence moves with it; one on other evidence does not', () => {
    const db = temporaryDb();
    const { fp } = seed(db, 'CCC', TRUE_AT);
    const insert = db.prepare(
      `INSERT INTO research_retry_state (ticker, trading_date, evidence_fingerprint, attempts, first_failed_at, last_failed_at) VALUES (?, ?, ?, 3, 'x', 'x')`,
    );
    insert.run('CCC', '2026-10-02', fp);
    insert.run('CCC', '2026-10-01', 'other');
    const plan = planAcceptanceRepair(db, header);
    expect(plan.retry).toEqual([expect.objectContaining({ ticker: 'CCC', tradingDate: '2026-10-02', old: fp })]);
    applyAcceptanceRepair(db, plan, '2026-10-16T23:30:00.000Z');
    const rows = db.prepare('SELECT trading_date, evidence_fingerprint FROM research_retry_state WHERE ticker = ? ORDER BY trading_date').all('CCC') as Array<{ evidence_fingerprint: string }>;
    expect(rows.map((r) => r.evidence_fingerprint)).toEqual(['other', computeEvidenceFingerprint(readSources(db, 'CCC'))]);
  });

  it('the dry run writes nothing; a row with no header instant is left as stored', () => {
    const db = temporaryDb();
    seed(db, 'DDD', WRONG_AT);
    const plan = planAcceptanceRepair(db, () => null);
    expect([plan.sources.length, plan.noHeader]).toEqual([0, 1]);
    planAcceptanceRepair(db, header);
    expect(readSources(db, 'DDD')[0]!.publishedAt).toBe(WRONG_AT);
  });

  it('undo puts the rows back and appends a version restoring the previous content, so the newest by time agrees', () => {
    const db = temporaryDb();
    const { version } = seed(db, 'EEE', WRONG_AT);
    const { undo } = applyAcceptanceRepair(db, planAcceptanceRepair(db, header), '2026-10-16T23:30:00.000Z');
    undoAcceptanceRepair(db, undo, '2026-10-16T23:40:00.000Z');
    expect(readSources(db, 'EEE')[0]!.publishedAt).toBe(WRONG_AT);
    const current = readCurrentAnalysis(db, 'EEE')!;
    expect(current.dossier.catalyst.eventTimestamp).toBe(WRONG_AT);
    expect(current.evidenceFingerprint).toBe(version.evidenceFingerprint);
    expect(readLatestAnalysesAsOf(db, ['EEE'], '2026-10-17T00:00:00.000Z').get('EEE')!.id).toBe(current.id);
  });
});
