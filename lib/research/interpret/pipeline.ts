/**
 * Interpretation pipeline.
 *
 * Bundle → interpret → validate → (one repair) → (escalate) → persist.
 *
 * Two properties matter most and are both enforced here rather than trusted:
 * unchanged evidence never reaches a model, and a failed interpretation never
 * destroys the dossier that was already accepted. A desk is better served by
 * yesterday's verified analysis than by today's rejected one.
 */

import type { MarketDatabase } from '../../market/store/db';
import {
  readCurrentAnalysis,
  readSources,
  saveAnalysisVersion,
  recordModelUsage,
} from '../../market/store/researchRepo';
import { computeEvidenceFingerprint } from '../fingerprint';
import type { ResearchDossier } from '../types';
import { buildEvidenceBundle, type ResearchEvidenceBundle, type SheetPriorAnalysis } from './bundle';
import { describeViolations, validateDossier, type Violation } from './guardrails';
import {
  isMaterialStructuralConflict,
  shouldEscalate,
  type EscalationReason,
  type SheetConflict,
} from './escalation';
import { compareSheetAndAuto, type SheetSnapshot } from '../merge/sheetAuto';
import type { InterpretUsage, ResearchInterpreter } from './interpreter';
import {
  AUTOMATIC_DOSSIER_SCHEMA_VERSION,
  INTERPRETER_PROMPT_VERSION,
} from './schema';

export type InterpretationOutcome =
  | 'ACCEPTED'
  | 'REUSED_UNCHANGED'
  | 'PARTIAL'
  | 'FAILED'
  | 'UNAVAILABLE';

export interface InterpretationMetrics {
  terraCalls: number;
  escalationCalls: number;
  repairCalls: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  durationMs: number;
}

export interface InterpretationReport {
  ticker: string;
  outcome: InterpretationOutcome;
  dossier: ResearchDossier | null;
  /** Version id when a new analysis was appended. */
  versionId: number | null;
  supersedesId: number | null;
  evidenceFingerprint: string;
  fingerprintChanged: boolean;
  sourceCount: number;
  violations: Violation[];
  repaired: boolean;
  escalated: boolean;
  escalationReason: EscalationReason | null;
  model: string | null;
  metrics: InterpretationMetrics;
  coverageIncomplete: boolean;
  error: string | null;
}

function emptyMetrics(): InterpretationMetrics {
  return {
    terraCalls: 0,
    escalationCalls: 0,
    repairCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    durationMs: 0,
  };
}

function addUsage(metrics: InterpretationMetrics, usage: InterpretUsage): void {
  metrics.inputTokens += usage.inputTokens ?? 0;
  metrics.outputTokens += usage.outputTokens ?? 0;
  metrics.cachedInputTokens += usage.cachedInputTokens ?? 0;
}

export interface InterpretOptions {
  ticker: string;
  tradingDate: string;
  /** The job this interpretation belongs to, for token attribution. */
  jobId?: number | null;
  /** Why the job existed, carried through so spend can be grouped by purpose. */
  trigger?: string | null;
  priorHumanAnalysis?: SheetPriorAnalysis | null;
  /** Recorded on the stored analysis so replay arms are self-labelling. */
  promptVariant?: 'A' | 'B';
  /**
   * Normalised human conclusions for deterministic comparison. Supplying this
   * is what makes the SHEET_AUTO_CONFLICT criterion reachable at all.
   */
  sheetSnapshot?: SheetSnapshot | null;
  /** Re-interpret even when the fingerprint is unchanged. */
  force?: boolean;
  now?: Date;
  onLog?: (message: string) => void;
}

/**
 * Interprets one ticker.
 *
 * The interpreter is only reached when the evidence fingerprint has moved.
 * Price movement is deliberately not an input to that decision: a stock trading
 * differently does not change what its filings say, and re-reading them on
 * every tick would be the single largest avoidable cost in the system.
 */
export async function interpretTicker(
  db: MarketDatabase,
  interpreter: ResearchInterpreter,
  escalationInterpreter: ResearchInterpreter | null,
  options: InterpretOptions,
): Promise<InterpretationReport> {
  const startedAt = Date.now();
  const ticker = options.ticker.trim().toUpperCase();
  const log = options.onLog ?? (() => undefined);
  const metrics = emptyMetrics();

  /*
   * Interpretation is where most of the day's tokens go, so each tier is
   * recorded separately: a repair and an escalation cost very different things
   * and were previously indistinguishable in the aggregate.
   */
  const noteUsage = (stage: string, model: string, usage: InterpretUsage) => {
    try {
      recordModelUsage(db, {
        tradingDate: options.tradingDate,
        at: new Date().toISOString(),
        jobId: options.jobId ?? null,
        ticker: options.ticker.trim().toUpperCase(),
        model,
        stage,
        trigger: options.trigger ?? null,
        inputTokens: usage.inputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        outputTokens: usage.outputTokens,
      });
    } catch {
      // Accounting must never take an interpretation down with it.
    }
  };

  const sources = readSources(db, ticker);
  const fingerprint = computeEvidenceFingerprint(sources);
  const existing = readCurrentAnalysis(db, ticker);
  const fingerprintChanged = existing?.evidenceFingerprint !== fingerprint;

  const base: InterpretationReport = {
    ticker,
    outcome: 'FAILED',
    dossier: existing?.dossier ?? null,
    versionId: null,
    supersedesId: existing?.id ?? null,
    evidenceFingerprint: fingerprint,
    fingerprintChanged,
    sourceCount: sources.length,
    violations: [],
    repaired: false,
    escalated: false,
    escalationReason: null,
    model: null,
    metrics,
    coverageIncomplete: false,
    error: null,
  };

  // Unchanged evidence: reuse. No bundle is even built.
  if (!fingerprintChanged && existing && !options.force) {
    log(`[interpret] ${ticker} evidence unchanged — reusing dossier v${existing.id}`);
    metrics.durationMs = Date.now() - startedAt;
    return { ...base, outcome: 'REUSED_UNCHANGED', dossier: existing.dossier };
  }

  if (!interpreter.available) {
    metrics.durationMs = Date.now() - startedAt;
    return {
      ...base,
      outcome: 'UNAVAILABLE',
      error: 'no interpreter configured',
      // The previously accepted dossier survives an unavailable interpreter.
      dossier: existing?.dossier ?? null,
    };
  }

  const bundle: ResearchEvidenceBundle = buildEvidenceBundle(db, {
    ticker,
    tradingDate: options.tradingDate,
    priorHumanAnalysis: options.priorHumanAnalysis ?? null,
  });
  base.coverageIncomplete = bundle.coverage.incomplete;

  log(`[interpret] ${ticker} started evidence=${bundle.sources.length} sources`);

  const first = await interpreter.interpret(bundle);
  metrics.terraCalls += 1;
  addUsage(metrics, first.usage);
  noteUsage('INTERPRETATION', first.model, first.usage);
  base.model = first.model;

  if (!first.dossier) {
    metrics.durationMs = Date.now() - startedAt;
    log(`[interpret] ${ticker} failed: ${first.error}`);
    // Prior accepted analysis is left in place, untouched.
    return { ...base, outcome: 'FAILED', error: first.error, dossier: existing?.dossier ?? null };
  }

  let validation = validateDossier(first.dossier, bundle);
  let accepted = validation.dossier;
  let repaired = false;

  if (!validation.ok) {
    const rejections = validation.violations.filter((item) => item.severity === 'REJECT');
    log(`[interpret] ${ticker} validation failed: ${rejections[0]?.message ?? 'unknown'}`);

    // Exactly one repair. Looping on a model that cannot satisfy the validator
    // burns money without converging.
    const repair = await interpreter.repair({
      bundle,
      previous: first.dossier,
      errors: describeViolations(validation.violations),
    });
    metrics.repairCalls += 1;
    metrics.terraCalls += 1;
    addUsage(metrics, repair.usage);
    noteUsage('REPAIR', repair.model, repair.usage);
    repaired = true;

    if (repair.dossier) {
      validation = validateDossier(repair.dossier, bundle);
      accepted = validation.dossier;
      if (validation.ok) log(`[interpret] ${ticker} repair succeeded`);
    }
  }

  /*
   * Compare against human research BEFORE deciding on escalation.
   *
   * Previously nothing computed this, so the SHEET_AUTO_CONFLICT criterion was
   * unreachable: the worker had no sheet access and no caller supplied the flag.
   * A material structural disagreement now reaches the escalation decision.
   */
  const comparison = options.sheetSnapshot
    ? compareSheetAndAuto({
        ticker,
        sheet: options.sheetSnapshot,
        auto: accepted,
        autoGeneratedAt: (options.now ?? new Date()).toISOString(),
        autoCoverageIncomplete: bundle.coverage.incomplete,
        autoLatestSourceAt: bundle.coverage.latestSourceAt,
      })
    : null;

  const sheetConflicts: SheetConflict[] = (comparison?.comparisons ?? [])
    .filter((item) => item.agreement === 'DISAGREE' && item.sheet && item.auto)
    .map((item) => ({
      field: item.field,
      sheet: item.sheet as string,
      auto: item.auto as string,
      reason: item.reason ?? 'UNKNOWN',
    }));

  const decision = shouldEscalate({
    dossier: accepted,
    bundle,
    violationsAfterRepair: validation.violations,
    repairAttempted: repaired,
    sheetConflicts,
  });

  let escalated = false;
  if (decision.escalate && escalationInterpreter?.available) {
    log(`[interpret] ${ticker} escalated → ${escalationInterpreter.model} reason=${decision.reason}`);

    // A structural dispute is adjudicated with the disputed field named and the
    // human conclusion labelled as a prior opinion. Everything else re-reads the
    // same bundle from scratch.
    const dispute = sheetConflicts.find(isMaterialStructuralConflict);
    const escalation = dispute
      ? await escalationInterpreter.adjudicate({
          bundle,
          terra: accepted,
          validation: describeViolations(validation.violations),
          field: dispute.field,
          humanConclusion: dispute.sheet,
          automaticConclusion: dispute.auto,
        })
      : await escalationInterpreter.interpret(bundle);
    metrics.escalationCalls += 1;
    addUsage(metrics, escalation.usage);
    noteUsage('ESCALATION', escalation.model, escalation.usage);

    if (escalation.dossier) {
      const escalatedValidation = validateDossier(escalation.dossier, bundle);
      // Only adopt the escalated result if it is at least as valid.
      if (escalatedValidation.ok || !validation.ok) {
        validation = escalatedValidation;
        accepted = escalatedValidation.dossier;
        base.model = escalation.model;
        escalated = true;
      }
    }
  }

  const stillRejected = validation.violations.some((item) => item.severity === 'REJECT');
  metrics.durationMs = Date.now() - startedAt;

  if (stillRejected) {
    log(`[interpret] ${ticker} rejected after validation`);
    return {
      ...base,
      outcome: 'PARTIAL',
      dossier: existing?.dossier ?? null,
      violations: validation.violations,
      repaired,
      escalated,
      escalationReason: decision.reason,
      metrics,
      error: 'validation rejected the dossier',
    };
  }

  const generatedAt = (options.now ?? new Date()).toISOString();
  const sourceIds = [
    ...new Set([
      ...accepted.catalyst.evidenceSourceIds,
      ...accepted.structure.evidenceSourceIds,
      ...accepted.cycle.evidenceSourceIds,
      ...accepted.structure.supplyLedger.flatMap((block) => block.evidenceSourceIds),
    ]),
  ];

  const version = saveAnalysisVersion(db, {
    ticker,
    generatedAt,
    evidenceFingerprint: fingerprint,
    model: base.model,
    dossier: accepted,
    sourceIds,
    metadata: {
      schemaVersion: AUTOMATIC_DOSSIER_SCHEMA_VERSION,
      promptVersion: INTERPRETER_PROMPT_VERSION,
      /*
       * Which arm produced this row.
       *
       * promptVersion alone cannot say: variant B changes the instructions
       * without changing the schema, so both variants report version 1 and
       * three replay arms would land as indistinguishable rows distinguished
       * only by the order someone ran them in. Recorded per row so a diff reads
       * the store rather than a run log.
       */
      promptVariant: options.promptVariant ?? 'A',
      sheetPriorOmitted: options.priorHumanAnalysis === null && options.sheetSnapshot != null,
      repaired,
      repairCount: metrics.repairCalls,
      escalated,
      escalationReason: decision.escalate ? decision.reason : null,
      sheetProvenance: comparison?.provenance ?? null,
      sheetConflicts: sheetConflicts.map((item) => `${item.field}:${item.sheet}/${item.auto}`),
      violations: validation.violations.map((item) => item.rule),
      coverageIncomplete: bundle.coverage.incomplete,
      metrics,
    },
  });

  const downgraded = validation.violations.length > 0;
  log(
    `[research] ${ticker} dossier accepted catalyst=${accepted.catalyst.catalystGrade} ` +
      `structure=${accepted.structure.structureClassification} ` +
      `cycle=${accepted.cycle.cycleClassification} ` +
      `confidence=${accepted.structure.confidence} ${(metrics.durationMs / 1000).toFixed(1)}s`,
  );

  return {
    ...base,
    outcome: downgraded || bundle.coverage.incomplete ? 'PARTIAL' : 'ACCEPTED',
    dossier: accepted,
    versionId: version.id,
    supersedesId: version.supersedesId,
    violations: validation.violations,
    repaired,
    escalated,
    escalationReason: decision.escalate ? decision.reason : null,
    metrics,
  };
}
