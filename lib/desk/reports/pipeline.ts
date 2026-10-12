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
import {
  readAnalysisVersionsByIds,
  readLatestAnalysesAsOf,
  readSourceIdsForTicker,
  readSourcesByIds,
} from '../../market/store/researchRepo';
import type { ResearchAnalysisVersion, ResearchSource } from '../../research/types';
import type { AssessmentType } from '../schedule';
import { applyStrikes, checkReport, draftLines, type CheckerModel, type Strike } from './check';
import { isEveningRecap, type MissedCause, type ReportKind, type ReportPath, type SessionReport } from './contract';
import { REPORT_NAME_CAP, reportFacts, type ReportFact } from './facts';
import { catalystFreshFromUtc } from '../../research/freshFrom';
import { narrativeFacts, narrativeFootnotes, type NarrativeFacts } from './narrative';
import { reportPath } from './path';
import { reportResearch, type ReportResearch } from './research';
import { lineInputKey, narrativeInputKey, planRevision, readEveningEdition } from './revision';
import { capNarrative } from './sentences';
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
  EVENING: { type: 'AFTER_HOURS_CLOSE', at: [20, 5] },
};

/**
 * The earliest ET moment a report may be WRITTEN, where it is later than its
 * checkpoint. EVENING waits to 20:20 (Integration's ruling 2026-10-07): written
 * at 20:06 no research version newer than the checkpoint's could exist yet, so
 * the per-line "research updated" note could never fire. Ops's job timing,
 * 09-30 to 10-06: every 20:05-queued job was terminal by 20:10:40 at worst; a
 * write and check took 34-43 s (v5 rows, 10-02 snapshot), inside the 20:30
 * serve-by.
 */
const WRITE_NOT_BEFORE: Partial<Record<ReportKind, [number, number]>> = {
  EVENING: [20, 20],
};

/** When this report's slot may be written, or null when its checkpoint completing is enough. */
export function writeNotBefore(kind: ReportKind, tradingDate: string): Date | null {
  const at = WRITE_NOT_BEFORE[kind];
  return at ? etWallClockToUtc(tradingDate, at[0], at[1]) : null;
}

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
    case 'EVENING':
      // The checkpoint carries no target date (schedule.ts); it serves its own trading date.
      return etWallClockToUtc(stored.tradingDate, 20, 30);
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
  /**
   * Each covered name's research version as the report used it: its id (null
   * when none), and `updatedAt`, set only when EVENING took a version newer by
   * id than the checkpoint's (that version's `generated_at`).
   */
  researchVersions: Map<string, { id: number | null; updatedAt: string | null }>;
}

/**
 * Everything a v5 report is written and checked from, or the observable reason there is nothing.
 *
 * `asOf` is the write moment. EVENING only (Integration's ruling (iii)): a name
 * whose newest research version at `asOf` is newer, BY ID, than the one its
 * checkpoint row captured is written from that newer version, and its line
 * says when. Every other kind, and EVENING without `asOf`, reads the
 * checkpoint's versions only (the as-of hook).
 */
export function readReportInputs(
  db: Database,
  kind: ReportKind,
  tradingDate: string,
  range: { min: number; max: number },
  asOf?: Date,
): { ok: true; inputs: ReportInputs } | { ok: false; cause: MissedCause } {
  const source = SOURCE[kind];
  const stored = findCheckpoint(db, kind, tradingDate);
  const scheduledFor = stored?.scheduledFor ?? etWallClockToUtc(tradingDate, source.at[0], source.at[1]).toISOString();
  const tickers = stored ? readAssessmentTickers(db, stored.id) : [];

  // The board's latch: the evening board after the bell (the recap), the day board otherwise.
  const sessions = readSessionLatches(db, tradingDate, tickers.map((row) => row.ticker));
  const evening = isEveningRecap(kind);
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

  // EVENING's per-line update: the newer version by id, read at the write moment.
  const newer = new Map<string, ResearchAnalysisVersion>();
  if (kind === 'EVENING' && asOf) {
    const latest = readLatestAnalysesAsOf(db, built.facts.map((fact) => fact.ticker), asOf.toISOString());
    for (const fact of built.facts) {
      const captured = byTicker.get(fact.ticker)?.analysisVersionId ?? null;
      const candidate = latest.get(fact.ticker);
      if (candidate && (captured === null || candidate.id > captured)) newer.set(fact.ticker, candidate);
    }
  }

  const sourceIds = [...versions.values(), ...newer.values()].flatMap((version) => version.dossier.catalyst.evidenceSourceIds);
  const sources = new Map<number, ResearchSource>(readSourcesByIds(db, [...new Set(sourceIds)]).map((s) => [s.id, s]));

  const research = new Map<string, ReportResearch>();
  const paths = new Map<string, ReportPath | null>();
  const tags = new Map<string, ReportTags>();
  /** The narrative's older high (v2 context), as of the checkpoint's dossier. Gated by the basis check in `narrative.ts`. */
  const olderHighs = new Map<string, number | null>();
  const researchVersions = new Map<string, { id: number | null; updatedAt: string | null }>();
  const freshFrom = catalystFreshFromUtc(db, tradingDate);
  for (const fact of built.facts) {
    const row = byTicker.get(fact.ticker);
    const updated = newer.get(fact.ticker);
    const version = updated ?? (row?.analysisVersionId != null ? versions.get(row.analysisVersionId) : undefined);
    researchVersions.set(fact.ticker, { id: version?.id ?? null, updatedAt: updated ? updated.generatedAt : null });
    const tag = reportTags({
      // A newer version is an accepted dossier, so the captured job status is not read (intelligence.ts).
      status: row?.intelligenceStatus ?? null,
      dossier: version?.dossier ?? null,
      coverageIncomplete: version?.metadata.coverageIncomplete === true,
      // An updated line is judged at the moment its research was read, the checkpoint's otherwise.
      at: updated && asOf ? asOf.toISOString() : built.checkpoint.completedAt,
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
      afterHoursTotals: evening ? readAfterHoursTotals(db, tradingDate, range) : null,
      checkpoint: { id: built.checkpoint.id, type: source.type, completedAt: built.checkpoint.completedAt },
      tags,
      researchVersions,
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
  /**
   * `text`: the struck line's words as the writer wrote them, so a strike can be
   * read back from the store (the published payload keeps no struck prose).
   * Never shown to users. Null only for an id the draft does not carry.
   */
  strikes: Array<Pick<Strike, 'id' | 'reason' | 'by' | 'detail'> & { text: string | null }>;
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
  const read = readReportInputs(db, slot.kind, slot.tradingDate, slot.range, now());
  if (!read.ok) return { status: 'MISSED', cause: read.cause, diagnostics: null };
  const { inputs } = read;
  const recap = isEveningRecap(slot.kind);

  // Keys of each name's and the narrative's writer inputs, stored on EVENING and PREMARKET rows (never shown).
  const current = new Map<string, { researchVersionId: number | null; inputKey: string }>();
  if (recap) {
    for (const fact of inputs.facts) {
      const researchVersionId = inputs.researchVersions.get(fact.ticker)?.id ?? null;
      const research = inputs.research.get(fact.ticker) ?? null;
      const inputKey = lineInputKey(fact, research, inputs.paths.get(fact.ticker) ?? null, researchVersionId);
      current.set(fact.ticker, { researchVersionId, inputKey });
    }
  }
  const narrativeKey = narrativeInputKey(inputs.narrative);

  // The 10 pm edition (`revision.ts`): with a published 8:30 edition, only the CHANGED names are written and checked.
  const edition = slot.kind === 'PREMARKET' ? readEveningEdition(db, slot.rangeId, slot.tradingDate) : null;
  const plan = edition ? planRevision(edition, inputs.facts, current, narrativeKey) : null;
  const toWrite = plan ? inputs.facts.filter((fact) => !plan.carried.has(fact.ticker)) : inputs.facts;

  let sections: Array<{ heading: string; lines: Array<{ ticker: string | null; text: string }> }>;
  let narrative: string | null;
  let watchCount: number;
  let diagnostics: ReportDiagnostics;
  if (plan && toWrite.length === 0 && !plan.narrativeChanged) {
    // Nothing changed since 8:30: the 8:30 content, with no model call.
    sections = [];
    narrative = plan.edition.narrative ?? null;
    watchCount = 0;
    diagnostics = { lines: 0, strikes: [], writerMs: null, checkerMs: null };
  } else {
    const writerStart = Date.now();
    const written = await writeReportV6(
      {
        kind: slot.kind,
        range: slot.range,
        checkpoint: inputs.checkpoint,
        facts: toWrite,
        research: inputs.research,
        paths: inputs.paths,
        afterHoursTotals: inputs.afterHoursTotals,
        narrative: inputs.narrative,
        ...(plan ? { revision: true } : {}),
      },
      models.writer,
      now,
    );
    const writerMs = Date.now() - writerStart;
    if (!written.ok) return { status: 'MISSED', cause: written.cause, diagnostics: { lines: 0, strikes: [], writerMs, checkerMs: null } };

    // An unchanged narrative keeps its 8:30 words, so the writer's is neither checked nor used.
    const draft: ReportDraft = plan && !plan.narrativeChanged ? { ...written.draft, overall: null } : written.draft;
    observe?.draft?.(draft);
    let strikes: Strike[] = [];
    let checkedLines = 0;
    let checkerMs: number | null = null;
    if (draftLines(draft).length > 0) {
      const checkerStart = Date.now();
      const checked = await checkReport(
        {
          kind: slot.kind,
          range: slot.range,
          checkpoint: inputs.checkpoint,
          // Every row, carried names included: a changed line may name one, and that is no uncovered ticker.
          rows: inputs.facts,
          draft,
          research: inputs.research,
          afterHoursTotals: inputs.afterHoursTotals,
          // v6: present, so the narrative (id O) is traced against its computed facts.
          narrative: inputs.narrative,
          // The 10 pm edition's moment says "revised" only when it revises an 8:30 edition (Commercial read 31).
          revision: plan !== null,
        },
        models.checker,
        now,
      );
      checkerMs = Date.now() - checkerStart;
      if (!checked.ok) return { status: 'MISSED', cause: checked.cause, diagnostics: { lines: 0, strikes: [], writerMs, checkerMs } };
      strikes = checked.strikes;
      checkedLines = checked.lines;
    }

    const struckText = new Map(draftLines(draft).map((line) => [line.id, line.text] as const));
    diagnostics = {
      lines: checkedLines,
      strikes: strikes.map(({ id, reason, by, detail }) => ({ id, reason, by, detail, text: struckText.get(id) ?? null })),
      writerMs,
      checkerMs,
    };
    // v6: a struck name keeps its computed card with no prose, so cards = the narrative's covered names.
    const applied = applyStrikes(draft, strikes, now, {
      keepStruckCards: true,
      linesElsewhere: plan !== null && plan.carried.size > 0,
    });
    if (!applied.ok) return { status: 'MISSED', cause: applied.cause, diagnostics };
    sections = applied.sections;
    // The length backstop (`sentences.ts`): the checked narrative's first N sentences, never a strike of the whole.
    narrative = plan && !plan.narrativeChanged ? (plan.edition.narrative ?? null) : capNarrative(slot.kind, applied.overall);
    watchCount = applied.watchCount;
  }

  if (plan) {
    // One edition: in 22:00 rank order, each unchanged name's 8:30 line VERBATIM, each changed name's new line,
    // then any line with no ticker. Regrouped under computed headings below, as every report is.
    const lines = sections.flatMap((section) => section.lines);
    const rewritten = new Map(lines.filter((line) => line.ticker !== null).map((line) => [line.ticker!, line]));
    const merged = [
      ...inputs.facts.flatMap((fact) => {
        const carried = plan.carried.get(fact.ticker);
        if (carried) return [{ ticker: fact.ticker, text: carried.text }];
        const line = rewritten.get(fact.ticker);
        return line ? [line] : [];
      }),
      ...lines.filter((line) => line.ticker === null),
    ];
    sections = [{ heading: '', lines: merged }];
    watchCount = new Set(merged.map((line) => line.ticker).filter((ticker) => ticker !== null)).size;
  }

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
      sections.map((section) => ({
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
                ...(recap
                  ? {
                      researchVersionId: current.get(line.ticker)?.researchVersionId ?? null,
                      ...(current.has(line.ticker) ? { inputKey: current.get(line.ticker)!.inputKey } : {}),
                    }
                  : {}),
                ...(slot.kind === 'EVENING'
                  ? { researchUpdatedAt: inputs.researchVersions.get(line.ticker)?.updatedAt ?? null }
                  : {}),
              }),
        })),
      })),
      inputs.research,
    ),
    watchCount,
    // v6: the opening narrative REPLACES overall (contract.ts); the checker read it as id O.
    narrative,
    // Step 4: G and the split count, computed, beside the narrative and independent of its strike.
    narrativeFootnotes: narrativeFootnotes(inputs.narrative),
    ...(recap ? { narrativeKey } : {}),
    ...(slot.kind === 'PREMARKET'
      ? {
          revisionOf: plan
            ? { publishedAt: plan.edition.publishedAt, changedTickers: plan.changedTickers, narrativeChanged: plan.narrativeChanged }
            : null,
        }
      : {}),
  };
  return { status: 'PUBLISHED', report, diagnostics };
}
