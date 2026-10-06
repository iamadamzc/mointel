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
import { resolveCycleHistory } from '../../market/cycle';
import { readDailyBars, readSplitFactors } from '../history';
import { assessSupplyOverhang, computeSupplyPair } from '../supply';
import type { ResearchDossier } from '../types';
import { buildEvidenceBundle, type ResearchEvidenceBundle, type SheetPriorAnalysis } from './bundle';
import { describeViolations, validateDossier, type Violation } from './guardrails';
import { catalystFreshFromUtc } from '../freshFrom';
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
  /**
   * The job this interpretation belongs to, and why it existed.
   *
   * REQUIRED, AND THAT IS THE WHOLE GUARD. Both were declared optional and
   * passed by nobody: the worker omitted them, `?? null` supplied the default,
   * and 1,335 of 3,334 `model_usage` rows -- the interpretation half, ~78% of
   * cost -- were written with no owner and no purpose. Nothing failed. Every
   * job-keyed cost figure silently measured collection spend alone.
   *
   * No runtime test can catch that recurring, because the omission happens in
   * a worker script's job loop rather than in anything a test calls. The
   * compiler can, so the fields are required and a caller with no job says so:
   * `jobId: null, trigger: 'MANUAL'`. An absent value and a deliberate one are
   * no longer the same keystroke.
   */
  jobId: number | null;
  trigger: string | null;
  priorHumanAnalysis?: SheetPriorAnalysis | null;
  /** Recorded on the stored analysis so replay arms are self-labelling. */
  promptVariant?: 'A' | 'B';
  /**
   * Reconstruct the evidence as it stood at this instant. Replay only.
   *
   * Applied to the fingerprint as well as the bundle: a fingerprint over every
   * stored source would describe evidence the replayed analysis never saw, and
   * the reuse check in front of it would then compare against the wrong thing.
   */
  asOf?: string | null;
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
        jobId: options.jobId,
        ticker: options.ticker.trim().toUpperCase(),
        model,
        stage,
        trigger: options.trigger,
        inputTokens: usage.inputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        outputTokens: usage.outputTokens,
      });
    } catch {
      // Accounting must never take an interpretation down with it.
    }
  };

  const sources = readSources(db, ticker, { asOf: options.asOf ?? null });
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
    log(`[interpret] ${ticker} evidence unchanged, reusing dossier v${existing.id}`);
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
    asOf: options.asOf ?? null,
  });
  base.coverageIncomplete = bundle.coverage.incomplete;

  /*
   * The prior SESSION's close, computed once per interpretation.
   *
   * `validateDossier` recomputes `catalyst.freshness` and reconciles
   * `catalystStatus` against it, and both must band the way the BOARD bands or
   * the write side demotes a row the reader sees green. `why.ts` supplies this
   * boundary from the payload; this supplies it from the store, and they are
   * the same instant by construction -- one implementation, in
   * `lib/research/freshFrom.ts`.
   */
  const catalystFreshFrom = catalystFreshFromUtc(db, options.tradingDate);
  const freshFrom = catalystFreshFrom === null ? null : new Date(catalystFreshFrom);

  log(`[interpret] ${ticker} started evidence=${bundle.sources.length} sources`);

  const first = await interpreter.interpret(bundle);
  /*
   * THE TIER THE REQUEST WAS ACTUALLY SERVED AT, LOGGED THE FIRST TIME IT IS SEEN.
   *
   * The desk sends no `service_tier` and has no SDK client, so the tier was an
   * INFERENCE FROM AN ABSENCE — and the tiers span a factor of four in price.
   * OpenAI returns the tier that served the request; this turns the inference
   * into a journal line, which is where the polling cadence was settled from
   * too.
   */
  if (first.serviceTier) log(`[interpret] ${ticker} served at tier ${first.serviceTier}`);
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

  let validation = validateDossier(first.dossier, bundle, new Date(), freshFrom);
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
      validation = validateDossier(repair.dossier, bundle, new Date(), freshFrom);
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
          priorConclusion: dispute.sheet,
          automaticConclusion: dispute.auto,
        })
      : await escalationInterpreter.interpret(bundle);
    metrics.escalationCalls += 1;
    addUsage(metrics, escalation.usage);
    noteUsage('ESCALATION', escalation.model, escalation.usage);

    if (escalation.dossier) {
      const escalatedValidation = validateDossier(escalation.dossier, bundle, new Date(), freshFrom);
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
      // The risk sentence's ids, only when it survived its guardrails: the payload resolves them to titles and dates.
      ...(accepted.evidenceRisk?.text ? accepted.evidenceRisk.evidenceSourceIds : []),
    ]),
  ];

  /*
   * Cycle position, computed rather than taken from the model.
   *
   * Attached after validation because it is derived, and bounded by `asOf` for
   * the same reason the evidence is: a replay that resolved the cycle against
   * today's bars would know how the move turned out.
   */
  const cycleBars = readDailyBars(db, ticker).filter(
    (bar) => !options.asOf || bar.tradingDate <= options.asOf.slice(0, 10),
  );
  accepted.computedCycle = cycleBars.length > 1 ? resolveCycleHistory(cycleBars) : null;

  /*
   * A PRIOR RUN IS A FACT ABOUT BARS, SO THE MODEL STOPS BEING ASKED TO REMEMBER IT.
   *
   * `resolveCycleHistory` says in its own header that it "replaces
   * `formerRunnerStatus` and `recentMajorRuns`, which the interpreter was also
   * being asked to judge from an evidence bundle that does not contain price
   * history." The replacement was built and never completed: the computed value
   * reached the dossier as `computedCycle`, only `current.phase` was consumed
   * downstream, and `cycle.formerRunnerStatus` -- the field the intelligence
   * panel actually renders -- stayed the model's guess.
   *
   * So the guess is overwritten by the measurement, the same way `supplyPair`
   * and `supplyOverhang` are attached below: after escalation, on the accepted
   * dossier, from data the desk already holds.
   *
   * ONLY WHEN THERE ARE BARS TO MEASURE. `computedCycle` is null for a series of
   * one bar or none, and in that case the model's judgement is left alone rather
   * than replaced with a fabricated NONE -- an absence must not become a
   * measurement, which is the failure this desk keeps paying for. `NONE` from
   * the detector means "bars were read and no prior cycle is in them"; null
   * means "there were no bars", and those are different sentences.
   *
   * The two `FormerRunnerStatus` types are NOT the same type: the model-facing
   * one (`lib/research/types.ts:536`) carries a fourth member `UNKNOWN` that the
   * computed one (`lib/market/cycle.ts:369`) does not, so the assignment is a
   * widening and cannot lose a value.
   */
  if (accepted.computedCycle) {
    accepted.cycle.formerRunnerStatus = accepted.computedCycle.formerRunnerStatus;
  }

  /*
   * The filed share count, stored deterministically rather than transcribed.
   *
   * Already in the bundle and already shown to the model since `55f3e20`; what
   * was missing is a place for the PARSED value to live, so a reader does not
   * have to trust the model to have copied a number correctly. It did so on 38%
   * of dossiers.
   *
   * Stored, not assessed. The verdict in `lib/research/float.ts` needs a
   * CLAIMED float, and the desk's only float source is the Sheet, which is a
   * live external value read at the merge layer. Computing a verdict here would
   * bake a transient into an append-only record -- the same error as resolving
   * the cycle against today's bars, which `overlayLiveCycle` exists to avoid.
   * Evidence is stored; live comparisons are made at read time.
   */
  const reported = bundle.reportedSharesOutstanding;

  /*
   * The supply pair, derived for the same reasons as the cycle above.
   *
   * It reads the ledger AFTER validation has corrected it, and its factors at
   * FULL stored depth rather than from the cycle window: the dates the basis
   * check compares are filing dates, and half of the dated blocks sit beyond
   * 90 sessions. `supplyBound` stays where it is and keeps its meaning; this
   * adds the filed-maximum beside it and the basis check that makes either
   * number safe to divide.
   *
   * Bounded by `asOf` like the cycle bars, so a replay cannot use a split the
   * original analysis had not seen yet -- a factor from the future would
   * silently make a block comparable that was not comparable at the time.
   */
  accepted.structure.supplyPair = reported
    ? computeSupplyPair({
        ledger: accepted.structure.supplyLedger,
        sharesOutstanding: reported.shares,
        sharesOutstandingAsOf: reported.asOf,
        concept: reported.concept,
        sourceId: reported.sourceId,
        factors: readSplitFactors(db, ticker, options.asOf?.slice(0, 10)),
      })
    : null;

  /*
   * The overhang verdict, from the pair just computed.
   *
   * HERE and not earlier, deliberately: `accepted` is the POST-ESCALATION
   * dossier (reassigned at the escalation branch above), and this same
   * numerator over this same denominator is what `escalation.ts` reads as a
   * data fault. Of the seven escalations that ever fired, sol confirmed a real
   * overhang on three and reconciled the blocks away on four -- so the
   * condition is ambiguous before adjudication and settled after it. Running
   * this on the pre-escalation dossier would have published an AVOID that was
   * wrong on the majority of the observed history.
   *
   * Dated by `asOf` when replaying, like the cycle and the pair, so a replay
   * cannot judge a share count current against a date the original run had not
   * reached.
   */
  accepted.structure.supplyOverhang = assessSupplyOverhang(
    accepted.structure.supplyPair,
    (options.asOf ?? generatedAt).slice(0, 10),
  );

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
