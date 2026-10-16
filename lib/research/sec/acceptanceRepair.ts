/**
 * THE REPAIR OF STORED SEC ACCEPTANCE TIMES (his "a" to question 1, Integration chat uuid 2c3c548c, 2026-10-16:
 * a superseding version per affected name, with the fingerprint update; Research's repair-options.md, adf1c0b5).
 * His "a" approves the approach. A WRITE needs his separate go after the box's dry run gives the real counts.
 *
 * WHAT IS WRONG. Until f8cc457b the collector stored EDGAR's submissions-JSON acceptanceDateTime, which is off by
 * 4-5 h for a share of filings (858 of 10,446 rows in the PC copies; docs/research/sec-acceptance/). The filing's own
 * index header is right; `acceptance.ts` reads it.
 *
 * WHAT THIS CHANGES, and why each part:
 * 1. Each timed SEC source row (SEC_FILING EXACT, SEC_EXHIBIT INFERRED) whose stored instant differs from its header
 *    takes the header instant.
 * 2. A name whose CURRENT catalyst stamp was copied from such a row (equal to its stored, wrong instant) gets ONE
 *    superseding version with the stamp repaired (saveAnalysisVersion: history kept, the pointer moves). Repairing
 *    the rows alone would leave that stamp matching nothing: its clock lost, and a date read from the wrong UTC day
 *    (AIXI's false 10-02).
 * 3. THE NO-PAID-CALL CONDITION. The evidence fingerprint hashes every source's publishedAt, and the pipeline skips the
 *    model only when the current version's stored fingerprint equals it (interpret/pipeline.ts:170-194). So where the
 *    stored fingerprint equaled the evidence BEFORE the repair, it is set to the evidence AFTER it: on the new version,
 *    or in place on the current one when no stamp changes. Retry-state rows holding the before value move with it,
 *    so a FAILED block does not clear (research/retry.ts:113). Where the stored fingerprint already differed (evidence
 *    arrived since), it is LEFT: a re-analysis was due anyway, and the repair must not hide that.
 * Unavoidable either way: "new source evidence on file" shows once per affected name at the next checkpoint
 * (worker/desk-assessments.ts recomputes the fingerprint from the source rows).
 */
import type { MarketDatabase } from '../../market/store/db';
import { readAnalysisVersionsByIds, readCurrentAnalysis, readSources, saveAnalysisVersion } from '../../market/store/researchRepo';
import { computeEvidenceFingerprint } from '../fingerprint';
import type { ResearchSource } from '../types';

export interface SourceFix { id: number; ticker: string; accession: string; old: string; next: string }
export interface VersionFix {
  ticker: string;
  currentId: number;
  oldStamp: string | null;
  newStamp: string;
  oldFingerprint: string;
  /** The new version's fingerprint: the evidence after the repair, or the old stored value when it was already stale. */
  newFingerprint: string;
}
export interface FingerprintFix { ticker: string; versionId: number; old: string; next: string }
export interface RetryFix { ticker: string; tradingDate: string; old: string; next: string }
export interface RepairPlan {
  sources: SourceFix[];
  versions: VersionFix[];
  fingerprints: FingerprintFix[];
  retry: RetryFix[];
  /** Names whose stored fingerprint already differed from their evidence: left, a re-analysis was due anyway. */
  alreadyStale: string[];
  /** Timed rows checked, and how many had no header instant (left as stored). */
  checked: number;
  noHeader: number;
}

const ms = (value: string | null | undefined) => (value ? Date.parse(value) : Number.NaN);

/**
 * The plan, read only. `acceptance` gives an accession's header instant (acceptance.ts, or a cache of its reads), or
 * null when unknown; a row with no header instant is left as stored.
 */
export function planAcceptanceRepair(db: MarketDatabase, acceptance: (accession: string) => string | null): RepairPlan {
  const plan: RepairPlan = { sources: [], versions: [], fingerprints: [], retry: [], alreadyStale: [], checked: 0, noHeader: 0 };
  const rows = db
    .prepare(
      `SELECT id, ticker, accession, published_at FROM research_sources
        WHERE source_type IN ('SEC_FILING', 'SEC_EXHIBIT') AND published_precision IN ('EXACT', 'INFERRED')
          AND accession IS NOT NULL AND published_at LIKE '%T%'`,
    )
    .all() as Array<{ id: number; ticker: string; accession: string; published_at: string }>;
  for (const row of rows) {
    plan.checked += 1;
    const header = acceptance(row.accession);
    if (!header) { plan.noHeader += 1; continue; }
    if (ms(header) !== ms(row.published_at)) plan.sources.push({ id: row.id, ticker: row.ticker, accession: row.accession, old: row.published_at, next: header });
  }

  const byTicker = new Map<string, SourceFix[]>();
  for (const fix of plan.sources) byTicker.set(fix.ticker, [...(byTicker.get(fix.ticker) ?? []), fix]);
  const retryRows = db.prepare('SELECT trading_date, evidence_fingerprint FROM research_retry_state WHERE ticker = ? AND evidence_fingerprint = ?');

  for (const [ticker, fixes] of byTicker) {
    const fixById = new Map(fixes.map((fix) => [fix.id, fix]));
    const before = readSources(db, ticker);
    const after: ResearchSource[] = before.map((s) => (fixById.has(s.id) ? { ...s, publishedAt: fixById.get(s.id)!.next } : s));
    const fpBefore = computeEvidenceFingerprint(before);
    const fpAfter = computeEvidenceFingerprint(after);

    for (const r of retryRows.all(ticker, fpBefore) as Array<{ trading_date: string; evidence_fingerprint: string }>) {
      plan.retry.push({ ticker, tradingDate: r.trading_date, old: fpBefore, next: fpAfter });
    }

    const current = readCurrentAnalysis(db, ticker);
    if (!current) continue;
    const stale = current.evidenceFingerprint !== fpBefore;
    if (stale) plan.alreadyStale.push(ticker);
    const stamp = current.dossier.catalyst?.eventTimestamp ?? null;
    const cited = new Set(current.dossier.catalyst?.evidenceSourceIds ?? []);
    // A stamp copied from an off source: equal, to the second, to that cited row's stored (wrong) instant.
    const copiedFrom = stamp ? fixes.find((fix) => cited.has(fix.id) && ms(fix.old) === ms(stamp)) : undefined;
    if (copiedFrom) {
      plan.versions.push({
        ticker, currentId: current.id, oldStamp: stamp, newStamp: copiedFrom.next,
        oldFingerprint: current.evidenceFingerprint, newFingerprint: stale ? current.evidenceFingerprint : fpAfter,
      });
    } else if (!stale && fpAfter !== current.evidenceFingerprint) {
      plan.fingerprints.push({ ticker, versionId: current.id, old: current.evidenceFingerprint, next: fpAfter });
    }
  }
  return plan;
}

/** What `undoAcceptanceRepair` needs to put everything back. Written BEFORE the write, by the caller. */
export interface RepairUndo {
  sources: Array<{ id: number; publishedAt: string }>;
  pointers: Array<{ ticker: string; previousVersionId: number; newVersionId: number | null }>;
  fingerprints: Array<{ versionId: number; evidenceFingerprint: string }>;
  retry: Array<{ ticker: string; tradingDate: string; evidenceFingerprint: string }>;
}

export function undoFor(plan: RepairPlan): RepairUndo {
  return {
    sources: plan.sources.map((fix) => ({ id: fix.id, publishedAt: fix.old })),
    pointers: plan.versions.map((fix) => ({ ticker: fix.ticker, previousVersionId: fix.currentId, newVersionId: null })),
    fingerprints: plan.fingerprints.map((fix) => ({ versionId: fix.versionId, evidenceFingerprint: fix.old })),
    retry: plan.retry.map((fix) => ({ ticker: fix.ticker, tradingDate: fix.tradingDate, evidenceFingerprint: fix.old })),
  };
}

/**
 * The write, in ONE transaction. Every UPDATE is guarded by the value the plan read, so a row that moved since the
 * dry run is left (and counted). Returns the undo record with the new version ids filled in.
 */
export function applyAcceptanceRepair(db: MarketDatabase, plan: RepairPlan, now: string): { undo: RepairUndo; skipped: number } {
  const undo = undoFor(plan);
  let skipped = 0;
  db.transaction(() => {
    const source = db.prepare('UPDATE research_sources SET published_at = ? WHERE id = ? AND published_at = ?');
    for (const fix of plan.sources) if (source.run(fix.next, fix.id, fix.old).changes === 0) skipped += 1;

    for (const [i, fix] of plan.versions.entries()) {
      const current = readCurrentAnalysis(db, fix.ticker);
      if (!current || current.id !== fix.currentId) { skipped += 1; continue; }
      const saved = saveAnalysisVersion(db, {
        ticker: fix.ticker,
        generatedAt: now,
        evidenceFingerprint: fix.newFingerprint,
        model: current.model,
        dossier: { ...current.dossier, catalyst: { ...current.dossier.catalyst, eventTimestamp: fix.newStamp } },
        sourceIds: current.sourceIds,
        metadata: { ...current.metadata, repair: 'sec-acceptance-2026-10', repairedFrom: current.id, oldEventTimestamp: fix.oldStamp },
      });
      undo.pointers[i]!.newVersionId = saved.id;
    }

    const fingerprint = db.prepare('UPDATE research_analysis_versions SET evidence_fingerprint = ? WHERE id = ? AND evidence_fingerprint = ?');
    for (const fix of plan.fingerprints) if (fingerprint.run(fix.next, fix.versionId, fix.old).changes === 0) skipped += 1;

    const retry = db.prepare('UPDATE research_retry_state SET evidence_fingerprint = ? WHERE ticker = ? AND trading_date = ? AND evidence_fingerprint = ?');
    for (const fix of plan.retry) if (retry.run(fix.next, fix.ticker, fix.tradingDate, fix.old).changes === 0) skipped += 1;
  })();
  return { undo, skipped };
}

/**
 * Puts back every value the undo record holds. A repaired name gets ANOTHER superseding version carrying its previous
 * version's content, rather than a pointer moved back: readers that take the newest version by generated_at (the
 * EVENING update, readLatestAnalysesAsOf) would otherwise keep reading the repair. History stays append-only.
 */
export function undoAcceptanceRepair(db: MarketDatabase, undo: RepairUndo, now: string): void {
  db.transaction(() => {
    const source = db.prepare('UPDATE research_sources SET published_at = ? WHERE id = ?');
    for (const s of undo.sources) source.run(s.publishedAt, s.id);
    for (const p of undo.pointers) {
      const current = readCurrentAnalysis(db, p.ticker);
      if (p.newVersionId === null || !current || current.id !== p.newVersionId) continue;
      const previous = readAnalysisVersionsByIds(db, [p.previousVersionId]).get(p.previousVersionId);
      if (!previous) continue;
      saveAnalysisVersion(db, {
        ticker: p.ticker,
        generatedAt: now,
        evidenceFingerprint: previous.evidenceFingerprint,
        model: previous.model,
        dossier: previous.dossier,
        sourceIds: previous.sourceIds,
        metadata: { ...previous.metadata, repairUndone: 'sec-acceptance-2026-10', restoredFrom: previous.id },
      });
    }
    const fingerprint = db.prepare('UPDATE research_analysis_versions SET evidence_fingerprint = ? WHERE id = ?');
    for (const f of undo.fingerprints) fingerprint.run(f.evidenceFingerprint, f.versionId);
    const retry = db.prepare('UPDATE research_retry_state SET evidence_fingerprint = ? WHERE ticker = ? AND trading_date = ?');
    for (const r of undo.retry) retry.run(r.evidenceFingerprint, r.ticker, r.tradingDate);
  })();
}
