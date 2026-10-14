/**
 * Sheet step 1 effect read. READ-ONLY. Research-tmi (drafted by an agent from the code, reviewed by Research;
 * the Sheet-adjudicated count widened on review). Committed with the predictions before the export is opened.
 *
 *   npx tsx scripts/sheet-step1-read.ts <export.db> <out-dir>
 *
 * Opens the export read-only (better-sqlite3 `readonly: true, fileMustExist: true`,
 * the pattern of scripts/report-ah-totals.ts:18), reads research_analysis_versions
 * (and model_usage when the export carries it), and writes
 * <out-dir>/sheet-step1-read.txt and <out-dir>/sheet-step1-read.json. Writes nothing
 * to the database.
 *
 * WHAT THE FLAG DOES (read in source, 2026-10-13):
 *   - RESEARCH_OMIT_SHEET_PRIOR=1 sets config.model.omitSheetPrior
 *     (lib/research/config.ts:209).
 *   - The research worker then passes priorHumanAnalysis: null and STILL passes the
 *     Sheet snapshot (worker/research.ts:693-695; same in the hand-run path,
 *     worker/research-interpret.ts:166-168, which logs prior=OMITTED at :143).
 *   - The bundle is serialised whole into the model request
 *     (lib/research/interpret/openaiInterpreter.ts:175), so the prior's text leaves
 *     the input and input tokens should fall where a prior used to be present.
 *   - NOT withheld: on a material structural conflict the escalation model is
 *     handed the Sheet's conclusion as `priorConclusion`
 *     (lib/research/interpret/pipeline.ts:338-347). So after the flag a version
 *     escalated with reason SHEET_AUTO_CONFLICT still saw the Sheet's opinion. This
 *     script counts those separately ("adjudicated") rather than calling them clean.
 *
 * "HAD A SHEET PRIOR" IS NOT STORED AS ONE FIELD. It is DERIVED from two metadata
 * keys written on every version (lib/research/interpret/pipeline.ts:506-529):
 *   - metadata.sheetProvenance (pipeline.ts:524) is non-null exactly when a Sheet
 *     snapshot was supplied: `comparison` is only computed when
 *     options.sheetSnapshot is truthy (pipeline.ts:303-312), and with both a sheet
 *     and a dossier present compareSheetAndAuto returns one of CONFLICT,
 *     SHEET_AUTO_AGREE, AUTO_NEWER, SHEET_NEWER (lib/research/merge/sheetAuto.ts:393-397).
 *   - metadata.sheetPriorOmitted (pipeline.ts:519) is
 *     `priorHumanAnalysis === null && sheetSnapshot != null`: true means a snapshot
 *     was there and the prior was withheld.
 *   - The worker builds prior.analysis and prior.snapshot together from one Sheet row
 *     (lib/research/merge/sheetPrior.ts:50-70), so analysis is non-null whenever a
 *     snapshot exists. Hence:
 *       prior delivered = sheetProvenance != null AND sheetPriorOmitted === false.
 *   Caveat: the analysis object is non-null but its fields can all be null for a
 *   sparse Sheet row (sheetPrior.ts:56-62); such a row counts as "delivered" here.
 *
 * NO SHEET TABLE IN THE PRODUCTION SCHEMA. The Sheet is a Google Sheet read live
 * through loadSheetPriors (lib/research/merge/sheetPrior.ts:119-148) with a 60 s
 * cache; lib/market/store/db.ts has no sheet table (CREATE TABLE list, db.ts:22-762).
 * If the export adds one, set SCHEMA.sheetTable below; it is used ONLY as a proxy for
 * rows whose metadata lacks the sheetProvenance key.
 *
 * REPLAY ROWS. worker/research-replay.ts:238-251 calls interpretTicker with
 * priorHumanAnalysis: null and no snapshot, and the pipeline saves a version
 * (pipeline.ts:499). Such a row looks exactly like a "no Sheet" production row. The
 * version row does not record its trigger; model_usage does (pipeline.ts:161-174,
 * stage INTERPRETATION at :258). When model_usage is present each version is tagged
 * with the trigger of the nearest preceding INTERPRETATION row for its ticker, and
 * REPLAY rows are excluded. Without model_usage this cannot be checked and the
 * summary says so.
 *
 * WINDOWS (UTC). Flag on: research restart 2026-10-11T18:55:03Z
 * (docs/finish-list-2026-10-09.md:77, docs/threads/integration.md:1830). Confound:
 * 2026-10-13 releases, catalyst tags live 00:45:33Z, deal-word fix 00:55:04Z,
 * fresh-count fix 01:05:21Z (docs/threads/research.md:58).
 *
 * This is a before/after with a control arm, not proof of cause. Grades change for
 * many reasons (new evidence, the market, other releases, model variance).
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/* ------------------------------------------------------------------ adaptable */

/** Every table and column name the script touches. Adapt here for another export. */
export const SCHEMA = {
  versions: {
    // lib/market/store/db.ts:439-454
    table: 'research_analysis_versions',
    id: 'id',
    ticker: 'ticker',
    generatedAt: 'generated_at', // ISO from Date#toISOString (pipeline.ts:383)
    model: 'model',
    dossier: 'dossier', // JSON ResearchDossier
    metadata: 'metadata', // JSON, written at pipeline.ts:506-529
  },
  /** Paths inside the dossier JSON (lib/research/types.ts:485,487,511,547; 580-582). */
  dossierPaths: {
    grade: ['catalyst', 'catalystGrade'],
    status: ['catalyst', 'catalystStatus'],
    structure: ['structure', 'structureClassification'],
    cycle: ['cycle', 'cycleClassification'],
  },
  /** Keys inside the metadata JSON (pipeline.ts:518-528). */
  metadataKeys: {
    sheetPriorOmitted: 'sheetPriorOmitted',
    sheetProvenance: 'sheetProvenance',
    sheetConflicts: 'sheetConflicts', // strings `${field}:${sheet}/${auto}` (pipeline.ts:525)
    escalated: 'escalated',
    escalationReason: 'escalationReason',
    promptVariant: 'promptVariant',
    metrics: 'metrics',
  },
  /** Keys inside metadata.metrics (pipeline.ts:47-55). Totals over all calls of one version. */
  metricsKeys: {
    inputTokens: 'inputTokens',
    cachedInputTokens: 'cachedInputTokens',
    terraCalls: 'terraCalls',
    repairCalls: 'repairCalls',
    escalationCalls: 'escalationCalls',
  },
  /** Optional; lib/market/store/db.ts:348-364. Used for per-call tokens and triggers. */
  modelUsage: {
    table: 'model_usage',
    ticker: 'ticker',
    at: 'at',
    stage: 'stage',
    trigger: 'trigger',
    inputTokens: 'input_tokens',
    cachedInputTokens: 'cached_input_tokens',
    interpretStage: 'INTERPRETATION', // pipeline.ts:258
    replayTrigger: 'REPLAY', // worker/research-replay.ts:244
    /** How far before generated_at an INTERPRETATION row may sit to tag a version. */
    tagLookbackMs: 15 * 60_000,
  },
  /** Not in the production schema. Set only if the export adds a Sheet table. */
  sheetTable: null as null | { table: string; ticker: string; observedAt: string },
};

/** Window edges, UTC. */
export const EDGES = {
  start: '2026-10-08T00:00:00.000Z',
  flagOn: '2026-10-11T18:55:03.000Z',
  /** The restart is known to the second; a row inside that second is held out. */
  flagOnSecondEnd: '2026-10-11T18:55:04.000Z',
  confound: '2026-10-13T00:45:33.000Z',
} as const;

/* ---------------------------------------------------------------------- types */

export type Window = 'PRE' | 'BEFORE' | 'FLAG_SECOND' | 'AFTER_CLEAN' | 'AFTER_CONFOUNDED';
export type Tri = 'YES' | 'NO' | 'UNKNOWN';

export interface RawVersionRow {
  id: number;
  ticker: string;
  generatedAt: string;
  model: string | null;
  dossier: string;
  metadata: string;
}

export interface VersionRecord {
  id: number;
  ticker: string;
  generatedAt: string;
  t: number;
  model: string | null;
  grade: string | null;
  status: string | null;
  structure: string | null;
  cycle: string | null;
  /** null when the metadata has no sheetProvenance key (cannot tell). */
  snapshotPresent: boolean | null;
  snapshotFromProxy: boolean;
  /** null when the metadata has no sheetPriorOmitted key. */
  priorOmittedFlag: boolean | null;
  priorDelivered: Tri;
  sheetProvenance: string | null;
  conflictFields: string[];
  escalated: boolean | null;
  escalationReason: string | null;
  /** Escalated on a Sheet conflict: the escalation model saw the Sheet's conclusion. */
  sheetAdjudicated: boolean;
  promptVariant: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  terraCalls: number | null;
  repairCalls: number | null;
  escalationCalls: number | null;
  /** One Terra call, no repair, no escalation: inputTokens is exactly one interpret call. */
  singleCall: boolean;
  trigger: string | null;
  parseError: string | null;
}

export interface UsageRow {
  ticker: string | null;
  at: string;
  stage: string;
  trigger: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
}

/* ---------------------------------------------------------------- pure pieces */

function parseJson(raw: string | null | undefined): { value: Record<string, unknown> | null; error: string | null } {
  if (raw == null || raw === '') return { value: null, error: 'empty' };
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === 'object' ? { value: value as Record<string, unknown>, error: null } : { value: null, error: 'not an object' };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message.slice(0, 80) : 'parse failed' };
  }
}

function at(obj: unknown, keys: readonly string[]): unknown {
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

/** Window for an instant. AFTER_ALL is AFTER_CLEAN plus AFTER_CONFOUNDED. */
export function windowOf(t: number): Window {
  if (t < Date.parse(EDGES.start)) return 'PRE';
  if (t < Date.parse(EDGES.flagOn)) return 'BEFORE';
  if (t < Date.parse(EDGES.flagOnSecondEnd)) return 'FLAG_SECOND';
  if (t < Date.parse(EDGES.confound)) return 'AFTER_CLEAN';
  return 'AFTER_CONFOUNDED';
}

/**
 * Prior delivered to the model: snapshot present AND not omitted.
 * Derivation and its sources are in the file header.
 */
export function derivePriorDelivered(snapshotPresent: boolean | null, priorOmittedFlag: boolean | null): Tri {
  if (snapshotPresent === null) return 'UNKNOWN';
  if (!snapshotPresent) return 'NO';
  if (priorOmittedFlag === true) return 'NO';
  if (priorOmittedFlag === false) return 'YES';
  return 'UNKNOWN';
}

/**
 * Optional proxy, used only when sheetProvenance is absent from the metadata: a
 * Sheet row for the ticker observed at or before the version.
 */
export type SheetProxy = Map<string, number[]>;

export function parseVersion(row: RawVersionRow, proxy: SheetProxy | null = null): VersionRecord {
  const d = parseJson(row.dossier);
  const m = parseJson(row.metadata);
  const meta = m.value ?? {};
  const K = SCHEMA.metadataKeys;
  const MK = SCHEMA.metricsKeys;
  const P = SCHEMA.dossierPaths;
  const t = Date.parse(row.generatedAt);

  const hasProvenanceKey = Object.prototype.hasOwnProperty.call(meta, K.sheetProvenance);
  const sheetProvenance = str(meta[K.sheetProvenance]);
  let snapshotPresent: boolean | null = hasProvenanceKey ? sheetProvenance !== null : null;
  let snapshotFromProxy = false;
  if (snapshotPresent === null && proxy) {
    const seen = proxy.get(row.ticker);
    snapshotPresent = Boolean(seen && seen.some((s) => s <= t));
    snapshotFromProxy = true;
  }
  const priorOmittedFlag = bool(meta[K.sheetPriorOmitted]);

  const conflictsRaw = meta[K.sheetConflicts];
  const conflictStrings = Array.isArray(conflictsRaw) ? conflictsRaw.filter((x): x is string => typeof x === 'string') : [];
  const conflictFields = [...new Set(conflictStrings.map((x) => x.split(':')[0]))];
  // escalation.ts:69-77: a MATERIAL structural conflict is a structure field with DIRTY_FLOAT on one side (and reason
  // INTERPRETATION_DIFFERENCE, which the metadata string does not keep). So this over-counts, never under-counts.
  const structuralDirty = conflictStrings.some((x) => x.startsWith('structure:') && x.includes('DIRTY_FLOAT'));

  const escalated = bool(meta[K.escalated]);
  const escalationReason = str(meta[K.escalationReason]);
  const metrics = meta[K.metrics];
  const terraCalls = num(at(metrics, [MK.terraCalls]));
  const repairCalls = num(at(metrics, [MK.repairCalls]));
  const escalationCalls = num(at(metrics, [MK.escalationCalls]));

  return {
    id: row.id,
    ticker: row.ticker,
    generatedAt: row.generatedAt,
    t,
    model: row.model,
    grade: str(at(d.value, P.grade)),
    status: str(at(d.value, P.status)),
    structure: str(at(d.value, P.structure)),
    cycle: str(at(d.value, P.cycle)),
    snapshotPresent,
    snapshotFromProxy,
    priorOmittedFlag,
    priorDelivered: derivePriorDelivered(snapshotPresent, priorOmittedFlag),
    sheetProvenance,
    conflictFields,
    escalated,
    escalationReason,
    // pipeline.ts:338-347: ANY escalation with a material structural dispute is adjudicated with the Sheet's conclusion,
    // whatever its reason. An upper count (see structuralDirty).
    sheetAdjudicated: escalated === true && (escalationReason === 'SHEET_AUTO_CONFLICT' || structuralDirty),
    promptVariant: str(meta[K.promptVariant]),
    inputTokens: num(at(metrics, [MK.inputTokens])),
    cachedInputTokens: num(at(metrics, [MK.cachedInputTokens])),
    terraCalls,
    repairCalls,
    escalationCalls,
    singleCall: terraCalls === 1 && repairCalls === 0 && escalationCalls === 0,
    trigger: null,
    parseError: d.error || m.error ? `dossier:${d.error ?? 'ok'} metadata:${m.error ?? 'ok'}` : null,
  };
}

/**
 * Tags each version with the trigger of the nearest preceding INTERPRETATION usage
 * row for its ticker (within the lookback). A proxy: usage rows and versions share
 * no key. Mutates and returns the records.
 */
export function tagTriggers(versions: VersionRecord[], usage: readonly UsageRow[]): VersionRecord[] {
  const U = SCHEMA.modelUsage;
  const byTicker = new Map<string, Array<{ t: number; trigger: string | null }>>();
  for (const u of usage) {
    if (u.stage !== U.interpretStage || !u.ticker) continue;
    const list = byTicker.get(u.ticker) ?? [];
    list.push({ t: Date.parse(u.at), trigger: u.trigger });
    byTicker.set(u.ticker, list);
  }
  for (const list of byTicker.values()) list.sort((a, b) => a.t - b.t);
  for (const v of versions) {
    const list = byTicker.get(v.ticker);
    if (!list) continue;
    let best: { t: number; trigger: string | null } | null = null;
    for (const u of list) {
      if (u.t > v.t) break;
      if (v.t - u.t <= U.tagLookbackMs) best = u;
    }
    v.trigger = best ? (best.trigger ?? '(null)') : null;
  }
  return versions;
}

export function mean(xs: readonly number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function distribution(values: ReadonlyArray<string | null>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    const k = v ?? '(null)';
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

export interface ArmWindowStats {
  versions: number;
  tickers: number;
  grade: Record<string, number>;
  status: Record<string, number>;
  structure: Record<string, number>;
  cycle: Record<string, number>;
  sheetProvenance: Record<string, number>;
  promptVariant: Record<string, number>;
  priorDelivered: Record<string, number>;
  /** Versions that had a snapshot, and per field the share of them in conflict with the Sheet. */
  withSnapshot: number;
  conflictShareByField: Record<string, number | null>;
  sheetAdjudicated: number;
  /** Exact per-interpret-call input, from single-call versions only. */
  singleCallVersions: number;
  inputTokensPerCallMean: number | null;
  inputTokensPerCallMedian: number | null;
  /** All calls of a version summed (repair and escalation included). */
  inputTokensPerVersionMean: number | null;
  inputTokensPerVersionMedian: number | null;
  /** From model_usage INTERPRETATION rows when the export has them; null otherwise. */
  usageInterpretCalls: number | null;
  usageInputPerCallMean: number | null;
  usageInputPerCallMedian: number | null;
}

export function armWindowStats(versions: readonly VersionRecord[], usage: readonly UsageRow[] | null): ArmWindowStats {
  const withSnap = versions.filter((v) => v.snapshotPresent === true);
  const single = versions.filter((v) => v.singleCall && v.inputTokens !== null).map((v) => v.inputTokens as number);
  const totals = versions.filter((v) => v.inputTokens !== null).map((v) => v.inputTokens as number);
  const fields = ['catalyst', 'structure', 'cycle'];
  const conflictShareByField: Record<string, number | null> = {};
  for (const f of fields) {
    conflictShareByField[f] = withSnap.length === 0 ? null : withSnap.filter((v) => v.conflictFields.includes(f)).length / withSnap.length;
  }
  const usageInputs = usage ? usage.filter((u) => u.inputTokens !== null).map((u) => u.inputTokens as number) : null;
  return {
    versions: versions.length,
    tickers: new Set(versions.map((v) => v.ticker)).size,
    grade: distribution(versions.map((v) => v.grade)),
    status: distribution(versions.map((v) => v.status)),
    structure: distribution(versions.map((v) => v.structure)),
    cycle: distribution(versions.map((v) => v.cycle)),
    sheetProvenance: distribution(versions.map((v) => (v.snapshotPresent === null ? '(key absent)' : v.sheetProvenance ?? '(no snapshot)'))),
    promptVariant: distribution(versions.map((v) => v.promptVariant)),
    priorDelivered: distribution(versions.map((v) => v.priorDelivered)),
    withSnapshot: withSnap.length,
    conflictShareByField,
    sheetAdjudicated: versions.filter((v) => v.sheetAdjudicated).length,
    singleCallVersions: single.length,
    inputTokensPerCallMean: mean(single),
    inputTokensPerCallMedian: median(single),
    inputTokensPerVersionMean: mean(totals),
    inputTokensPerVersionMedian: median(totals),
    usageInterpretCalls: usage ? usage.length : null,
    usageInputPerCallMean: usageInputs ? mean(usageInputs) : null,
    usageInputPerCallMedian: usageInputs ? median(usageInputs) : null,
  };
}

export type Field = 'grade' | 'status' | 'structure' | 'cycle';
const FIELDS: Field[] = ['grade', 'status', 'structure', 'cycle'];

export interface ChangeStats {
  pairs: number;
  changedShare: Record<Field, number | null>;
  changedCount: Record<Field, number>;
}

/** Latest BEFORE version vs first AFTER version, per ticker present in both. */
export function crossWindowChange(before: readonly VersionRecord[], after: readonly VersionRecord[]): ChangeStats {
  const lastBefore = new Map<string, VersionRecord>();
  for (const v of before) {
    const cur = lastBefore.get(v.ticker);
    if (!cur || v.t > cur.t || (v.t === cur.t && v.id > cur.id)) lastBefore.set(v.ticker, v);
  }
  const firstAfter = new Map<string, VersionRecord>();
  for (const v of after) {
    const cur = firstAfter.get(v.ticker);
    if (!cur || v.t < cur.t || (v.t === cur.t && v.id < cur.id)) firstAfter.set(v.ticker, v);
  }
  const pairs: Array<[VersionRecord, VersionRecord]> = [];
  for (const [ticker, b] of lastBefore) {
    const a = firstAfter.get(ticker);
    if (a) pairs.push([b, a]);
  }
  return changeOverPairs(pairs);
}

/**
 * Natural churn baseline: consecutive version pairs per ticker INSIDE one window.
 * A cross-window pair is one step, so its change share compares to this per-step rate.
 */
export function withinWindowChurn(versions: readonly VersionRecord[]): ChangeStats {
  const byTicker = new Map<string, VersionRecord[]>();
  for (const v of versions) {
    const list = byTicker.get(v.ticker) ?? [];
    list.push(v);
    byTicker.set(v.ticker, list);
  }
  const pairs: Array<[VersionRecord, VersionRecord]> = [];
  for (const list of byTicker.values()) {
    list.sort((a, b) => a.t - b.t || a.id - b.id);
    for (let i = 1; i < list.length; i += 1) pairs.push([list[i - 1], list[i]]);
  }
  return changeOverPairs(pairs);
}

function changeOverPairs(pairs: ReadonlyArray<[VersionRecord, VersionRecord]>): ChangeStats {
  const changedCount = { grade: 0, status: 0, structure: 0, cycle: 0 } as Record<Field, number>;
  for (const [a, b] of pairs) for (const f of FIELDS) if (a[f] !== b[f]) changedCount[f] += 1;
  const changedShare = {} as Record<Field, number | null>;
  for (const f of FIELDS) changedShare[f] = pairs.length === 0 ? null : changedCount[f] / pairs.length;
  return { pairs: pairs.length, changedShare, changedCount };
}

export interface Arms {
  treated: Set<string>;
  control: Set<string>;
  /** Tickers whose BEFORE prior status could not be read; in neither arm. */
  undetermined: Set<string>;
}

/**
 * TREATED: any BEFORE version had a prior delivered.
 * CONTROL: versions in BEFORE and in the after window, and no BEFORE version had a
 * prior delivered or an unreadable one. CONTROL may still have had a snapshot
 * withheld in AFTER (a name added to the Sheet late); counted, not excluded.
 */
export function buildArms(before: readonly VersionRecord[], after: readonly VersionRecord[]): Arms {
  const treated = new Set<string>();
  const unknown = new Set<string>();
  const seenBefore = new Set<string>();
  for (const v of before) {
    seenBefore.add(v.ticker);
    if (v.priorDelivered === 'YES') treated.add(v.ticker);
    else if (v.priorDelivered === 'UNKNOWN') unknown.add(v.ticker);
  }
  const afterTickers = new Set(after.map((v) => v.ticker));
  const control = new Set<string>();
  const undetermined = new Set<string>();
  for (const t of seenBefore) {
    if (treated.has(t)) continue;
    if (unknown.has(t)) {
      undetermined.add(t);
      continue;
    }
    if (afterTickers.has(t)) control.add(t);
  }
  return { treated, control, undetermined };
}

export interface FlagChecks {
  beforeVersions: number;
  beforePriorDelivered: number;
  beforePriorUnknown: number;
  /** Prior omitted before the flag was on: a hand run with the flag, or a defect. */
  beforeOmittedWithSnapshot: Array<{ id: number; ticker: string; generatedAt: string }>;
  afterVersions: number;
  afterWithSnapshot: number;
  afterPriorDelivered: Array<{ id: number; ticker: string; generatedAt: string; trigger: string | null }>;
  afterPriorUnknown: number;
  afterSheetAdjudicated: Array<{ id: number; ticker: string; generatedAt: string }>;
  metadataKeyCoverage: Record<string, { rows: number; provenanceKey: number; omittedKey: number }>;
  verdict: 'FLAG HELD' | 'FLAG LEAKED' | 'NOT DECIDED';
  verdictReason: string;
}

/**
 * The check that can come out either way. A clean 0 in AFTER is only believed when
 * the same detector saw a present case in BEFORE and AFTER had snapshots to withhold.
 */
export function flagChecks(before: readonly VersionRecord[], afterAll: readonly VersionRecord[]): FlagChecks {
  const brief = (v: VersionRecord) => ({ id: v.id, ticker: v.ticker, generatedAt: v.generatedAt });
  const coverage = (vs: readonly VersionRecord[]) => ({
    rows: vs.length,
    provenanceKey: vs.filter((v) => v.snapshotPresent !== null && !v.snapshotFromProxy).length,
    omittedKey: vs.filter((v) => v.priorOmittedFlag !== null).length,
  });
  const beforePriorDelivered = before.filter((v) => v.priorDelivered === 'YES').length;
  const afterWithSnapshot = afterAll.filter((v) => v.snapshotPresent === true).length;
  const afterLeaks = afterAll.filter((v) => v.priorDelivered === 'YES');
  const afterUnknown = afterAll.filter((v) => v.priorDelivered === 'UNKNOWN').length;

  let verdict: FlagChecks['verdict'];
  let verdictReason: string;
  if (beforePriorDelivered === 0) {
    verdict = 'NOT DECIDED';
    verdictReason = 'no BEFORE version reads as prior-delivered, so the detector has not been shown to see a present case; an AFTER count of 0 would mean nothing';
  } else if (afterWithSnapshot === 0) {
    verdict = 'NOT DECIDED';
    verdictReason = 'no AFTER version had a Sheet snapshot, so there was nothing for the flag to withhold';
  } else if (afterLeaks.length > 0) {
    verdict = 'FLAG LEAKED';
    verdictReason = `${afterLeaks.length} AFTER version(s) read as prior-delivered (listed)`;
  } else if (afterUnknown > 0) {
    verdict = 'NOT DECIDED';
    verdictReason = `0 leaks seen, but ${afterUnknown} AFTER version(s) could not be read`;
  } else {
    verdict = 'FLAG HELD';
    verdictReason = `0 of ${afterWithSnapshot} AFTER versions with a snapshot carried a prior; the detector saw ${beforePriorDelivered} in BEFORE`;
  }

  return {
    beforeVersions: before.length,
    beforePriorDelivered,
    beforePriorUnknown: before.filter((v) => v.priorDelivered === 'UNKNOWN').length,
    beforeOmittedWithSnapshot: before.filter((v) => v.snapshotPresent === true && v.priorOmittedFlag === true).map(brief),
    afterVersions: afterAll.length,
    afterWithSnapshot,
    afterPriorDelivered: afterLeaks.map((v) => ({ ...brief(v), trigger: v.trigger })),
    afterPriorUnknown: afterUnknown,
    afterSheetAdjudicated: afterAll.filter((v) => v.sheetAdjudicated).map(brief),
    metadataKeyCoverage: { BEFORE: coverage(before), AFTER_ALL: coverage(afterAll) },
    verdict,
    verdictReason,
  };
}

export interface AfterRead {
  label: string;
  confounded: boolean;
  window: { from: string; to: string; fromExclusive: boolean; toExclusive: boolean };
  arms: { treated: number; control: number; undetermined: number; treatedInAfter: number; controlWithSnapshotInAfter: number };
  stats: {
    TREATED: { BEFORE: ArmWindowStats; AFTER: ArmWindowStats };
    CONTROL: { BEFORE: ArmWindowStats; AFTER: ArmWindowStats };
  };
  /** Treated AFTER versions where a snapshot existed, i.e. where the flag actually withheld something. */
  treatedAfterWithheld: number;
  change: { TREATED: ChangeStats; CONTROL: ChangeStats };
  churnBefore: { TREATED: ChangeStats; CONTROL: ChangeStats };
  /** TREATED changed share minus CONTROL changed share. A difference, not a cause. */
  changeGap: Record<Field, number | null>;
}

export function afterRead(
  label: string,
  confounded: boolean,
  window: AfterRead['window'],
  before: readonly VersionRecord[],
  after: readonly VersionRecord[],
  usageFor: ((tickers: Set<string>, from: number, to: number) => UsageRow[]) | null,
  bounds: { beforeFrom: number; beforeTo: number; afterFrom: number; afterTo: number },
): AfterRead {
  const arms = buildArms(before, after);
  const pick = (vs: readonly VersionRecord[], set: Set<string>) => vs.filter((v) => set.has(v.ticker));
  const tb = pick(before, arms.treated);
  const ta = pick(after, arms.treated);
  const cb = pick(before, arms.control);
  const ca = pick(after, arms.control);
  const u = (set: Set<string>, from: number, to: number) => (usageFor ? usageFor(set, from, to) : null);
  const change = { TREATED: crossWindowChange(tb, ta), CONTROL: crossWindowChange(cb, ca) };
  const changeGap = {} as Record<Field, number | null>;
  for (const f of FIELDS) {
    const a = change.TREATED.changedShare[f];
    const b = change.CONTROL.changedShare[f];
    changeGap[f] = a === null || b === null ? null : a - b;
  }
  return {
    label,
    confounded,
    window,
    arms: {
      treated: arms.treated.size,
      control: arms.control.size,
      undetermined: arms.undetermined.size,
      treatedInAfter: new Set(ta.map((v) => v.ticker)).size,
      controlWithSnapshotInAfter: new Set(ca.filter((v) => v.snapshotPresent === true).map((v) => v.ticker)).size,
    },
    stats: {
      TREATED: {
        BEFORE: armWindowStats(tb, u(arms.treated, bounds.beforeFrom, bounds.beforeTo)),
        AFTER: armWindowStats(ta, u(arms.treated, bounds.afterFrom, bounds.afterTo)),
      },
      CONTROL: {
        BEFORE: armWindowStats(cb, u(arms.control, bounds.beforeFrom, bounds.beforeTo)),
        AFTER: armWindowStats(ca, u(arms.control, bounds.afterFrom, bounds.afterTo)),
      },
    },
    treatedAfterWithheld: ta.filter((v) => v.snapshotPresent === true && v.priorOmittedFlag === true).length,
    change,
    churnBefore: { TREATED: withinWindowChurn(tb), CONTROL: withinWindowChurn(cb) },
    changeGap,
  };
}

/* ------------------------------------------------------------------- render */

const pct = (x: number | null) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const n0 = (x: number | null) => (x === null ? 'n/a' : Math.round(x).toLocaleString('en-US'));
const dist = (d: Record<string, number>) => Object.entries(d).map(([k, v]) => `${k} ${v}`).join(', ') || '(none)';

function renderStats(name: string, s: ArmWindowStats): string[] {
  return [
    `    ${name}: ${s.versions} versions, ${s.tickers} tickers`,
    `      grade      ${dist(s.grade)}`,
    `      status     ${dist(s.status)}`,
    `      structure  ${dist(s.structure)}`,
    `      cycle      ${dist(s.cycle)}`,
    `      sheet      ${dist(s.sheetProvenance)}`,
    `      prior      ${dist(s.priorDelivered)}   variant ${dist(s.promptVariant)}`,
    `      conflict share of ${s.withSnapshot} with a snapshot: catalyst ${pct(s.conflictShareByField.catalyst)}, structure ${pct(s.conflictShareByField.structure)}, cycle ${pct(s.conflictShareByField.cycle)}; Sheet-adjudicated escalations ${s.sheetAdjudicated}`,
    `      input tokens per interpret call (${s.singleCallVersions} single-call versions): mean ${n0(s.inputTokensPerCallMean)}, median ${n0(s.inputTokensPerCallMedian)}`,
    `      input tokens per version, all calls: mean ${n0(s.inputTokensPerVersionMean)}, median ${n0(s.inputTokensPerVersionMedian)}`,
    s.usageInterpretCalls === null
      ? '      model_usage: not in export'
      : `      model_usage INTERPRETATION calls ${s.usageInterpretCalls}: input mean ${n0(s.usageInputPerCallMean)}, median ${n0(s.usageInputPerCallMedian)}`,
  ];
}

function renderChange(name: string, c: ChangeStats): string {
  return `    ${name} (${c.pairs} pairs): grade ${pct(c.changedShare.grade)}, status ${pct(c.changedShare.status)}, structure ${pct(c.changedShare.structure)}, cycle ${pct(c.changedShare.cycle)}`;
}

export function renderSummary(result: StepOneResult): string {
  const L: string[] = [];
  L.push('SHEET STEP 1 EFFECT READ (RESEARCH_OMIT_SHEET_PRIOR=1)');
  L.push(`export: ${result.source}   rows read ${result.rowsRead}, unparseable ${result.parseErrors}, last generated_at ${result.lastGeneratedAt ?? 'n/a'}`);
  L.push('');
  L.push('Windows (UTC):');
  L.push(`  BEFORE       [${EDGES.start}, ${EDGES.flagOn})`);
  L.push(`  AFTER_CLEAN  [${EDGES.flagOnSecondEnd}, ${EDGES.confound})  MAIN READ; ends before the 2026-10-13 releases`);
  L.push(`  AFTER_ALL    [${EDGES.flagOnSecondEnd}, ${result.lastGeneratedAt ?? 'end of export'}]  CONFOUNDED by catalyst tags 00:45:33Z, deal-word fix 00:55:04Z, fresh-count fix 01:05:21Z on 2026-10-13`);
  L.push(`  held out: ${result.heldOut.flagSecond} version(s) inside the restart second ${EDGES.flagOn}; ${result.heldOut.pre} before ${EDGES.start}; ${result.heldOut.replay} tagged REPLAY`);
  L.push(result.triggerTagging);
  L.push('');
  L.push('This is a before/after with a control arm, not proof of cause. Grades change for many');
  L.push('reasons: new evidence, the market, other releases, model variance. A shift in CONTROL');
  L.push('measures one of those, not the flag.');
  L.push('');
  const c = result.checks;
  L.push(`FLAG CHECK: ${c.verdict} (${c.verdictReason})`);
  L.push(`  BEFORE: ${c.beforePriorDelivered} of ${c.beforeVersions} versions had a prior delivered (must be above 0); unreadable ${c.beforePriorUnknown}; omitted-with-snapshot before the flag ${c.beforeOmittedWithSnapshot.length}`);
  L.push(`  AFTER_ALL: ${c.afterPriorDelivered.length} of ${c.afterVersions} versions had a prior delivered (should be 0); ${c.afterWithSnapshot} had a snapshot; unreadable ${c.afterPriorUnknown}`);
  for (const v of c.afterPriorDelivered) L.push(`    LEAK v${v.id} ${v.ticker} ${v.generatedAt} trigger=${v.trigger ?? 'untagged'}`);
  for (const v of c.beforeOmittedWithSnapshot) L.push(`    OMITTED-BEFORE-FLAG v${v.id} ${v.ticker} ${v.generatedAt}`);
  L.push(`  AFTER_ALL versions escalated with a structure conflict against the Sheet (the escalation model may have seen the Sheet's conclusion, pipeline.ts:338-347; an upper count): ${c.afterSheetAdjudicated.length}`);
  L.push(`  metadata key coverage: ${JSON.stringify(c.metadataKeyCoverage)}`);
  for (const r of result.reads) {
    L.push('');
    L.push(`== ${r.label}${r.confounded ? ' (CONFOUNDED)' : ''}: after window ${r.window.from} to ${r.window.to} ==`);
    L.push(`  arms: TREATED ${r.arms.treated} tickers (${r.arms.treatedInAfter} with AFTER versions), CONTROL ${r.arms.control}, undetermined ${r.arms.undetermined}; CONTROL tickers with a snapshot withheld in AFTER ${r.arms.controlWithSnapshotInAfter}`);
    L.push(`  TREATED AFTER versions where the flag actually withheld a prior: ${r.treatedAfterWithheld}`);
    L.push('  BEFORE');
    L.push(...renderStats('TREATED', r.stats.TREATED.BEFORE));
    L.push(...renderStats('CONTROL', r.stats.CONTROL.BEFORE));
    L.push('  AFTER');
    L.push(...renderStats('TREATED', r.stats.TREATED.AFTER));
    L.push(...renderStats('CONTROL', r.stats.CONTROL.AFTER));
    L.push('  changed, latest BEFORE vs first AFTER version, tickers in both:');
    L.push(renderChange('TREATED', r.change.TREATED));
    L.push(renderChange('CONTROL', r.change.CONTROL));
    L.push(`    gap TREATED minus CONTROL: grade ${pct(r.changeGap.grade)}, status ${pct(r.changeGap.status)}, structure ${pct(r.changeGap.structure)}, cycle ${pct(r.changeGap.cycle)}`);
    L.push('  baseline churn inside BEFORE, consecutive versions of one ticker:');
    L.push(renderChange('TREATED', r.churnBefore.TREATED));
    L.push(renderChange('CONTROL', r.churnBefore.CONTROL));
  }
  L.push('');
  if (c.verdict === 'NOT DECIDED' && c.beforePriorDelivered === 0) {
    L.push('EFFECT READ: NOT DECIDED. Prior detection saw no present case in BEFORE, so the arms cannot be trusted.');
  } else {
    L.push('EFFECT READ: compare TREATED and CONTROL shifts above against the predictions file. Not a verdict on cause.');
  }
  return L.join('\n') + '\n';
}

/* --------------------------------------------------------------------- main */

export interface StepOneResult {
  source: string;
  rowsRead: number;
  parseErrors: number;
  lastGeneratedAt: string | null;
  heldOut: { pre: number; flagSecond: number; replay: number };
  triggerTagging: string;
  checks: FlagChecks;
  reads: AfterRead[];
}

function tableExists(db: Database.Database, name: string): boolean {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function q(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function analyse(source: string, rows: RawVersionRow[], usage: UsageRow[] | null, proxy: SheetProxy | null): StepOneResult {
  const all = rows.map((r) => parseVersion(r, proxy));
  if (usage) tagTriggers(all, usage);
  const replay = all.filter((v) => v.trigger === SCHEMA.modelUsage.replayTrigger);
  const kept = all.filter((v) => v.trigger !== SCHEMA.modelUsage.replayTrigger && Number.isFinite(v.t));
  const by = (w: Window) => kept.filter((v) => windowOf(v.t) === w);
  const before = by('BEFORE');
  const clean = by('AFTER_CLEAN');
  const afterAll = [...clean, ...by('AFTER_CONFOUNDED')];
  const lastT = kept.reduce((m, v) => Math.max(m, v.t), -Infinity);
  const last = Number.isFinite(lastT) ? new Date(lastT).toISOString() : null;

  const tFlag = Date.parse(EDGES.flagOnSecondEnd);
  const tConf = Date.parse(EDGES.confound);
  const usageFor = usage
    ? (tickers: Set<string>, from: number, to: number) =>
        usage.filter((u) => {
          if (u.stage !== SCHEMA.modelUsage.interpretStage || !u.ticker || !tickers.has(u.ticker)) return false;
          if (u.trigger === SCHEMA.modelUsage.replayTrigger) return false;
          const t = Date.parse(u.at);
          return t >= from && t < to;
        })
    : null;
  const beforeBounds = { beforeFrom: Date.parse(EDGES.start), beforeTo: Date.parse(EDGES.flagOn) };

  return {
    source,
    rowsRead: rows.length,
    parseErrors: all.filter((v) => v.parseError !== null).length,
    lastGeneratedAt: last,
    heldOut: { pre: by('PRE').length, flagSecond: by('FLAG_SECOND').length, replay: replay.length },
    triggerTagging: usage
      ? `  triggers (nearest preceding model_usage INTERPRETATION row, proxy): ${dist(distribution(all.map((v) => v.trigger ?? 'untagged')))}`
      : '  model_usage not in export: REPLAY and MANUAL versions cannot be told from worker versions',
    checks: flagChecks(before, afterAll),
    reads: [
      afterRead('AFTER_CLEAN', false, { from: EDGES.flagOnSecondEnd, to: EDGES.confound, fromExclusive: false, toExclusive: true }, before, clean, usageFor, {
        ...beforeBounds,
        afterFrom: tFlag,
        afterTo: tConf,
      }),
      afterRead('AFTER_ALL', true, { from: EDGES.flagOnSecondEnd, to: last ?? 'end of export', fromExclusive: false, toExclusive: false }, before, afterAll, usageFor, {
        ...beforeBounds,
        afterFrom: tFlag,
        afterTo: Number.isFinite(lastT) ? lastT + 1 : tFlag,
      }),
    ],
  };
}

function main(): void {
  const [file, outDir] = process.argv.slice(2);
  if (!file || !outDir) {
    console.error('usage: npx tsx scripts/sheet-step1-read.ts <export.db> <out-dir>');
    process.exit(2);
  }
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const V = SCHEMA.versions;
    const rows = db
      .prepare(
        `SELECT ${q(V.id)} AS id, ${q(V.ticker)} AS ticker, ${q(V.generatedAt)} AS generatedAt,
                ${q(V.model)} AS model, ${q(V.dossier)} AS dossier, ${q(V.metadata)} AS metadata
           FROM ${q(V.table)}
          WHERE ${q(V.generatedAt)} >= ?
          ORDER BY ${q(V.generatedAt)}, ${q(V.id)}`,
      )
      .all(EDGES.start) as RawVersionRow[];

    const U = SCHEMA.modelUsage;
    const usage = tableExists(db, U.table)
      ? (db
          .prepare(
            `SELECT ${q(U.ticker)} AS ticker, ${q(U.at)} AS at, ${q(U.stage)} AS stage, ${q(U.trigger)} AS trigger,
                    ${q(U.inputTokens)} AS inputTokens, ${q(U.cachedInputTokens)} AS cachedInputTokens
               FROM ${q(U.table)}
              WHERE ${q(U.at)} >= ? AND ${q(U.stage)} = ?`,
          )
          .all(new Date(Date.parse(EDGES.start) - U.tagLookbackMs).toISOString(), U.interpretStage) as UsageRow[])
      : null;

    let proxy: SheetProxy | null = null;
    const S = SCHEMA.sheetTable;
    if (S && tableExists(db, S.table)) {
      proxy = new Map();
      for (const r of db.prepare(`SELECT ${q(S.ticker)} AS ticker, ${q(S.observedAt)} AS observedAt FROM ${q(S.table)}`).all() as Array<{
        ticker: string;
        observedAt: string;
      }>) {
        const t = Date.parse(r.observedAt);
        if (!Number.isFinite(t)) continue;
        const list = proxy.get(r.ticker) ?? [];
        list.push(t);
        proxy.set(r.ticker, list);
      }
    }

    const result = analyse(path.basename(file), rows, usage, proxy);
    fs.mkdirSync(outDir, { recursive: true });
    const text = renderSummary(result);
    fs.writeFileSync(path.join(outDir, 'sheet-step1-read.txt'), text);
    fs.writeFileSync(path.join(outDir, 'sheet-step1-read.json'), JSON.stringify({ edges: EDGES, schema: SCHEMA, ...result }, null, 2));
    process.stdout.write(text);
  } finally {
    db.close();
  }
}

// Runs only when invoked as a script, so the pure functions above can be imported by a test.
if (process.argv[1] && /sheet-step1-read\.[cm]?[tj]s$/.test(process.argv[1])) main();
