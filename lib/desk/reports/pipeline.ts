/**
 * A v6 session report, end to end from the store: the one function the
 * runner calls after a checkpoint completes (Ops's assess worker; the model
 * key stays worker-side, `tests/security.test.ts`).
 *
 *   checkpoint -> facts (in range, the board's latch) -> the research each
 *   row saw (analysis_version_id) -> computed paths, tags and narrative
 *   facts, and for the premarket report the after-hours totals -> writer v6
 *   -> checker v6 (rules + model, reading the store again) -> applyStrikes -> a PUBLISHED report or a
 *   MISSED cause, with diagnostics.
 *
 * ONE CHECKPOINT PER REPORT (design.md §3): premarket from the 22:00 recap,
 * into RTH from 09:25, into power hour from 14:30, after-hours from the
 * regular-session close. Never an older checkpoint in place of a missing one.
 *
 * READ-ONLY. Nothing here writes; storing the result is the runner's.
 */

import { etClock, etWallClockToUtc } from '../../market/session';
import {
  readAssessmentTickers,
  readAssessments,
  type AssessmentRecord,
  type AssessmentTickerRecord,
} from '../../market/store/assessmentRepo';
import { readAnalysisVersionsByIds, readSourceIdsForTicker, readSourcesByIds } from '../../market/store/researchRepo';
import type { ResearchAnalysisVersion, ResearchSource } from '../../research/types';
import type { AssessmentType } from '../schedule';
import { applyStrikes, checkReport, type CheckerModel, type Strike } from './check';
import type { MissedCause, ReportKind, ReportPath, SessionReport } from './contract';
import { REPORT_NAME_CAP, reportFacts, type ReportFact } from './facts';
import { catalystFreshFromUtc } from '../../research/freshFrom';
import { narrativeFacts, narrativeFootnotes, type NarrativeFacts } from './narrative';
import { reportPath } from './path';
import { reportResearch, type ReportResearch } from './research';
import { computedSections } from './sections';
import { reportTags, type ReportTags } from './tags';
import { readAfterHoursTotals, type AfterHoursTotals } from './totals';
import type { ReportDraft, ReportModel } from './writer';
import { writeReportV6 } from './writerV6';

type Database = Parameters<typeof readAssessments>[0];

/** Which checkpoint each report reads, and the ET clock that picks it where a type recurs. */
const SOURCE: Record<ReportKind, { type: AssessmentType; at: [number, number] }> = {
  PREMARKET: { type: 'NEXT_DAY_RECAP', at: [22, 0] },
  INTO_RTH: { type: 'OPEN_SPIKE_ASSESSMENT', at: [9, 25] },
  INTO_POWER_HOUR: { type: 'RTH_INTERVAL', at: [14, 30] },
  AFTER_HOURS: { type: 'RTH_CLOSE', at: [16, 0] },
};

/**
 * The moment each report serves, ET: published after it, the report is LATE
 * (it still publishes; the as-of hook keeps a late report honest).
 */
function servesBy(kind: ReportKind, stored: AssessmentRecord): Date {
  switch (kind) {
    case 'PREMARKET':
      return etWallClockToUtc(stored.targetTradingDate ?? stored.tradingDate, 4, 0);
    case 'INTO_RTH':
      return etWallClockToUtc(stored.tradingDate, 9, 30);
    case 'INTO_POWER_HOUR':
      return etWallClockToUtc(stored.tradingDate, 15, 0);
    case 'AFTER_HOURS':
      return etWallClockToUtc(stored.tradingDate, 20, 0);
  }
}

/** The stored checkpoint for this report on this date, or null. RTH_INTERVAL recurs, so its clock picks it. */
export function findCheckpoint(db: Database, kind: ReportKind, tradingDate: string): AssessmentRecord | null {
  const source = SOURCE[kind];
  const clock = `${String(source.at[0]).padStart(2, '0')}:${String(source.at[1]).padStart(2, '0')}`;
  const candidates = readAssessments(db, tradingDate, 200).filter((row) => row.assessmentType === source.type);
  if (source.type !== 'RTH_INTERVAL') return candidates.at(-1) ?? null;
  return candidates.find((row) => etClock(new Date(row.scheduledFor)).slice(0, 5) === clock) ?? null;
}

interface SessionLatch {
  symbol: string;
  qualified_at: string | null;
  qualified_price: number | null;
  ah_qualified_at: string | null;
  ah_qualification_price: number | null;
  ah_reference_close: number | null;
  ah_high: number | null;
}

function readSessionLatches(db: Database, tradingDate: string, symbols: readonly string[]): Map<string, SessionLatch> {
  const found = new Map<string, SessionLatch>();
  if (symbols.length === 0) return found;
  const placeholders = symbols.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT symbol, qualified_at, qualified_price, ah_qualified_at, ah_qualification_price, ah_reference_close, ah_high
         FROM ticker_session WHERE trading_date = ? AND symbol IN (${placeholders})`,
    )
    .all(tradingDate, ...symbols) as SessionLatch[];
  for (const row of rows) found.set(row.symbol, row);
  return found;
}

/** One name's research as the report reads it: citation tokens out, the ticker's own source ids included. */
export function researchForReport(
  db: Database,
  ticker: string,
  version: ResearchAnalysisVersion,
  sources: ReadonlyMap<number, ResearchSource>,
): ReportResearch {
  return reportResearch(version, sources, new Set(readSourceIdsForTicker(db, ticker)));
}

export interface ReportInputs {
  stored: AssessmentRecord;
  facts: ReportFact[];
  tickers: AssessmentTickerRecord[];
  research: Map<string, ReportResearch>;
  paths: Map<string, ReportPath | null>;
  afterHoursTotals: AfterHoursTotals | null;
  checkpoint: { id: number; type: AssessmentType; completedAt: string };
  /** v6: each covered name's tags, the board's own Why/Risk on its as-of research (`tags.ts`). */
  tags: Map<string, ReportTags>;
  /** v6: the opening narrative's computed facts (`narrative.ts`), shown to writer and checker alike. */
  narrative: NarrativeFacts;
}

/** Everything a v5 report is written and checked from, or the observable reason there is nothing. */
export function readReportInputs(
  db: Database,
  kind: ReportKind,
  tradingDate: string,
  range: { min: number; max: number },
): { ok: true; inputs: ReportInputs } | { ok: false; cause: MissedCause } {
  const source = SOURCE[kind];
  const stored = findCheckpoint(db, kind, tradingDate);
  const scheduledFor = stored?.scheduledFor ?? etWallClockToUtc(tradingDate, source.at[0], source.at[1]).toISOString();
  const tickers = stored ? readAssessmentTickers(db, stored.id) : [];

  // The board's latch: the evening board after the bell (the recap), the day board otherwise.
  const sessions = readSessionLatches(db, tradingDate, tickers.map((row) => row.ticker));
  const evening = kind === 'PREMARKET';
  const latch = new Map(
    [...sessions.values()].map((row) => [
      row.symbol,
      evening
        ? { price: row.ah_qualification_price, at: row.ah_qualified_at }
        : { price: row.qualified_price, at: row.qualified_at },
    ]),
  );

  const built = reportFacts({
    source: { type: source.type, scheduledFor },
    stored,
    tickers,
    range,
    latch,
    limit: REPORT_NAME_CAP,
  });
  if (!built.ok) return { ok: false, cause: built.cause };

  const byTicker = new Map(tickers.map((row) => [row.ticker, row]));
  const versionIds = built.facts
    .map((fact) => byTicker.get(fact.ticker)?.analysisVersionId ?? null)
    .filter((id): id is number => id !== null);
  const versions = readAnalysisVersionsByIds(db, versionIds);
  const sourceIds = [...versions.values()].flatMap((version) => version.dossier.catalyst.evidenceSourceIds);
  const sources = new Map<number, ResearchSource>(readSourcesByIds(db, [...new Set(sourceIds)]).map((s) => [s.id, s]));

  const research = new Map<string, ReportResearch>();
  const paths = new Map<string, ReportPath | null>();
  const tags = new Map<string, ReportTags>();
  /** The narrative's older high (v2 context), as of the checkpoint's dossier. Gated by the basis check in `narrative.ts`. */
  const olderHighs = new Map<string, number | null>();
  const freshFrom = catalystFreshFromUtc(db, tradingDate);
  for (const fact of built.facts) {
    const row = byTicker.get(fact.ticker);
    const version = row?.analysisVersionId != null ? versions.get(row.analysisVersionId) : undefined;
    const tag = reportTags({
      status: row?.intelligenceStatus ?? null,
      dossier: version?.dossier ?? null,
      coverageIncomplete: version?.metadata.coverageIncomplete === true,
      at: built.checkpoint.completedAt,
      catalystFreshFrom: freshFrom,
    });
    tags.set(fact.ticker, tag);
    if (version) {
      olderHighs.set(fact.ticker, version.dossier.cycle?.historicalResistance ?? null);
      const found = researchForReport(db, fact.ticker, version, sources);
      /*
       * ONE freshness verdict, the board's, AS OF THE CHECKPOINT (Design's catch,
       * 2026-10-03: PREMARKET filed COLA under FRESH NEWS while its own tag said
       * OLD, a Sep 11 catalyst on the 10-01 recap). The dossier's FRESH_FOUND was
       * judged when the research ran; the board re-judges it at the checkpoint
       * (why.ts OLD_CATALYST: stale by time and not explaining the move). Where
       * they differ the report takes the board's, ONCE, here, so the section, the
       * narrative's fresh count, the writer's sheet and the checker all agree.
       */
      const staleNow = found.catalyst.status === 'FRESH_FOUND' && tag.why.code === 'OLD_CATALYST';
      research.set(fact.ticker, staleNow ? { ...found, catalyst: { ...found.catalyst, status: 'SECONDARY_STALE' } } : found);
    }
    const session = sessions.get(fact.ticker);
    paths.set(
      fact.ticker,
      reportPath(
        kind,
        {
          price: fact.price,
          priceAt: row?.priceAt ?? null,
          sessionHigh: fact.sessionHigh,
          referenceClose: fact.referenceClose,
          referenceBasis: fact.referenceBasis,
        },
        evening ? { referenceClose: session?.ah_reference_close ?? null, high: session?.ah_high ?? null } : null,
      ),
    );
  }

  return {
    ok: true,
    inputs: {
      stored: stored!,
      facts: built.facts,
      tickers,
      research,
      paths,
      afterHoursTotals: kind === 'PREMARKET' ? readAfterHoursTotals(db, tradingDate, range) : null,
      checkpoint: { id: built.checkpoint.id, type: source.type, completedAt: built.checkpoint.completedAt },
      tags,
      narrative: narrativeFacts(db, {
        kind,
        tradingDate,
        range,
        checkpointId: built.checkpoint.id,
        facts: built.facts,
        research,
        tickers,
        olderHighs,
      }),
    },
  };
}

export interface ReportDiagnostics {
  lines: number;
  strikes: Array<Pick<Strike, 'id' | 'reason' | 'by' | 'detail'>>;
  writerMs: number | null;
  checkerMs: number | null;
}

export type ReportRun =
  | { status: 'PUBLISHED'; report: SessionReport; diagnostics: ReportDiagnostics }
  | { status: 'MISSED'; cause: MissedCause; diagnostics: ReportDiagnostics | null };

/**
 * One slot: write, check, apply. No retry here: a retry is a spend decision
 * and belongs to the runner that owns the slot's timing.
 */
export async function runReport(
  db: Database,
  slot: { kind: ReportKind; rangeId: string; tradingDate: string; range: { min: number; max: number } },
  models: { writer: ReportModel; checker: CheckerModel },
  now: () => Date = () => new Date(),
  /** Harnesses only: sees the unchecked draft. Never changes the run. */
  observe?: { draft?: (draft: ReportDraft) => void },
): Promise<ReportRun> {
  const read = readReportInputs(db, slot.kind, slot.tradingDate, slot.range);
  if (!read.ok) return { status: 'MISSED', cause: read.cause, diagnostics: null };
  const { inputs } = read;

  const writerStart = Date.now();
  const written = await writeReportV6(
    {
      kind: slot.kind,
      range: slot.range,
      checkpoint: inputs.checkpoint,
      facts: inputs.facts,
      research: inputs.research,
      paths: inputs.paths,
      afterHoursTotals: inputs.afterHoursTotals,
      narrative: inputs.narrative,
    },
    models.writer,
    now,
  );
  const writerMs = Date.now() - writerStart;
  if (!written.ok) return { status: 'MISSED', cause: written.cause, diagnostics: { lines: 0, strikes: [], writerMs, checkerMs: null } };

  const draft: ReportDraft = written.draft;
  observe?.draft?.(draft);
  const checkerStart = Date.now();
  const checked = await checkReport(
    {
      kind: slot.kind,
      range: slot.range,
      checkpoint: inputs.checkpoint,
      rows: inputs.facts,
      draft,
      research: inputs.research,
      afterHoursTotals: inputs.afterHoursTotals,
      // v6: present, so the narrative (id O) is traced against its computed facts.
      narrative: inputs.narrative,
    },
    models.checker,
    now,
  );
  const checkerMs = Date.now() - checkerStart;
  if (!checked.ok) return { status: 'MISSED', cause: checked.cause, diagnostics: { lines: 0, strikes: [], writerMs, checkerMs } };

  const diagnostics: ReportDiagnostics = {
    lines: checked.lines,
    strikes: checked.strikes.map(({ id, reason, by, detail }) => ({ id, reason, by, detail })),
    writerMs,
    checkerMs,
  };
  // v6: a struck name keeps its computed card with no prose, so cards = the narrative's covered names.
  const applied = applyStrikes(draft, checked.strikes, now, { keepStruckCards: true });
  if (!applied.ok) return { status: 'MISSED', cause: applied.cause, diagnostics };

  const facts = new Map(inputs.facts.map((fact) => [fact.ticker, fact]));
  const publishedAt = now();
  const report: SessionReport = {
    kind: slot.kind,
    rangeId: slot.rangeId,
    range: { min: slot.range.min, max: slot.range.max },
    tradingDate: inputs.stored.tradingDate,
    targetTradingDate: inputs.stored.targetTradingDate,
    checkpoints: [inputs.checkpoint],
    publishedAt: publishedAt.toISOString(),
    late: publishedAt.getTime() > servesBy(slot.kind, inputs.stored).getTime(),
    headline: null,
    // v6 fix (a): the surviving lines regrouped under COMPUTED headings (`sections.ts`),
    // after the strikes, so the checker's line ids never moved.
    sections: computedSections(
      applied.sections.map((section) => ({
        heading: section.heading,
        lines: section.lines.map((line) => ({
          ticker: line.ticker,
          liveFeed: line.ticker === null ? null : (facts.get(line.ticker)?.liveFeed ?? null),
          text: line.text,
          ...(line.ticker === null
            ? {}
            : {
                company: inputs.research.get(line.ticker)?.company ?? null,
                path: inputs.paths.get(line.ticker) ?? null,
                tags: inputs.tags.get(line.ticker) ?? null,
              }),
        })),
      })),
      inputs.research,
    ),
    watchCount: applied.watchCount,
    // v6: the opening narrative REPLACES overall (contract.ts); the checker read it as id O.
    narrative: applied.overall,
    // Step 4: G and the split count, computed, beside the narrative and independent of its strike.
    narrativeFootnotes: narrativeFootnotes(inputs.narrative),
  };
  return { status: 'PUBLISHED', report, diagnostics };
}
