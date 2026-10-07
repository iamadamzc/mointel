/**
 * What an assessment records, and what it says changed.
 *
 * Two deliberate constraints, both about cost and both about honesty:
 *
 *   1. Every change fact here is DETERMINISTIC. A rank moved, a high was
 *      exceeded, a support level was lost, a halt happened, a classification
 *      string differs. None of it is generated prose, so a checkpoint every
 *      thirty minutes costs nothing and never invents a narrative.
 *
 *   2. Nothing here reruns interpretation. When the objective facts a cycle
 *      call rests on are unchanged, the existing Cycle is reused verbatim.
 *      Only a material change produces a reassessment request, and even then
 *      the research pipeline's own evidence fingerprint decides whether a model
 *      is actually worth calling.
 *
 * No buy/sell language, ever. These lines describe observed state, not what to
 * do about it.
 */

import { createHash } from 'node:crypto';

import type { AssessmentTickerRecord } from '../market/store/assessmentRepo';

/** Rank movement worth mentioning at all. */
export const MATERIAL_RANK_MOVE = 3;
/** Price movement between checkpoints worth calling an expansion/retracement. */
export const MATERIAL_MOVE_PCT = 10;
/** Retracement off the session high that can change a cycle read. */
export const MATERIAL_GIVEBACK_PCT = 15;
/** New session high must clear the previous one by this much to be "major". */
export const MAJOR_NEW_HIGH_PCT = 3;
/** Price change across checkpoints that alone justifies a cycle re-look. */
export const CYCLE_MOVE_PCT = 20;

/** Nearest levels either side of price, as stored in level_summary. */
export interface LevelSnapshot {
  support: number | null;
  resistance: number | null;
  label: string;
}

/**
 * Price levels below the current price that can serve as support.
 *
 * Today's close comes from the reference close once the bell has passed
 * (basis CURRENT_SESSION): that is Alpaca's official daily-bar close, written
 * through on every flush. rth_final_close is the bell capture, frozen by design
 * and often the last trade before the closing auction (measured 2026-10-06/07:
 * it equals the official close on 2/8 to 45/121 names a day, the reference on
 * all but a split basis). It counts only when no official close was captured.
 */
export function supportCandidatesBelow(input: {
  price: number | null;
  sessionLow: number | null;
  referenceRthClose: number | null;
  referenceRthCloseBasis: string | null;
  rthFinalClose: number | null;
}): number[] {
  const { price } = input;
  if (price === null) return [];
  const bellCapture = input.referenceRthCloseBasis === 'CURRENT_SESSION' ? null : input.rthFinalClose;
  return [input.sessionLow, input.referenceRthClose, bellCapture].filter(
    (value): value is number => value !== null && value < price,
  );
}

export function encodeLevels(levels: LevelSnapshot): string {
  return JSON.stringify(levels);
}

export function decodeLevels(raw: string | null): LevelSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LevelSnapshot>;
    return {
      support: typeof parsed.support === 'number' ? parsed.support : null,
      resistance: typeof parsed.resistance === 'number' ? parsed.resistance : null,
      label: typeof parsed.label === 'string' ? parsed.label : '',
    };
  } catch {
    return null;
  }
}

/**
 * The facts a Cycle classification actually rests on, hashed.
 *
 * Bucketed rather than exact so ordinary tape noise does not read as a change:
 * a name ticking between $4.11 and $4.13 has not entered a new cycle, and
 * hashing raw prices would claim it had on every checkpoint.
 */
export function cycleFingerprint(input: {
  price: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  haltState: string | null;
  rank: number | null;
  participation: number | null;
  supportLost: boolean;
}): string {
  const bucketPct = (value: number | null, reference: number | null): string => {
    if (value === null || reference === null || reference <= 0) return 'x';
    return String(Math.round(((value - reference) / reference) * 20)); // 5% buckets
  };

  const parts = [
    bucketPct(input.price, input.sessionHigh),
    bucketPct(input.price, input.sessionLow),
    input.haltState ?? 'UNKNOWN',
    // Rank in bands: #1–3, #4–6, #7–12, beyond. A move inside a band is not a
    // different cycle context.
    input.rank === null ? 'x' : input.rank <= 3 ? 'a' : input.rank <= 6 ? 'b' : input.rank <= 12 ? 'c' : 'd',
    input.participation === null
      ? 'x'
      : String(Math.floor(Math.log2(Math.max(input.participation, 0.0001)))),
    input.supportLost ? 'support-lost' : 'support-held',
  ];

  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

/** One assessment's market state, hashed, for the parent row's provenance. */
export function marketFingerprint(records: readonly AssessmentTickerRecord[]): string {
  const parts = records
    .slice()
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .map((record) =>
      [
        record.ticker,
        record.assessmentRank ?? 'x',
        record.price ?? 'x',
        record.volume ?? 'x',
        record.ahVolume ?? 'x',
      ].join(':'),
    );
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

/** The research state behind one assessment, hashed. */
export function researchFingerprint(records: readonly AssessmentTickerRecord[]): string {
  const parts = records
    .slice()
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .map((record) =>
      [record.ticker, record.evidenceFingerprint ?? 'x', record.analysisVersionId ?? 'x'].join(':'),
    );
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

export interface ChangeResult {
  changedFields: string[];
  summary: string;
  /** True when the cycle context moved enough to justify a re-look. */
  cycleReassessmentNeeded: boolean;
}

function pct(from: number, to: number): number {
  return ((to - from) / from) * 100;
}

function signed(value: number, digits = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

/**
 * Compares one ticker against its row in the preceding assessment.
 *
 * A ticker with no previous row is a new entry, which is itself the fact worth
 * recording — not an absence of change.
 */
export function detectChanges(options: {
  current: AssessmentTickerRecord;
  previous: AssessmentTickerRecord | null;
  discoveryRank: number;
  /** Trader-facing name of the board, used in the entry/exit wording. */
  boardLabel: string;
}): ChangeResult {
  const { current, previous, discoveryRank, boardLabel } = options;
  const changed: string[] = [];
  const notes: string[] = [];
  let cycleTrigger = false;

  if (!previous) {
    if (current.assessmentRank !== null && current.assessmentRank <= discoveryRank) {
      changed.push('ENTERED_TOP_N');
      notes.push(`entered ${boardLabel} Top ${discoveryRank} at #${current.assessmentRank}`);
    } else {
      changed.push('NEW_TO_ASSESSMENT');
      notes.push('first appearance in an assessment today');
    }

    /*
     * Never a reassessment request.
     *
     * A name with no previous row is new to the assessment HISTORY, not new to
     * the desk — on the day's first checkpoint that is every name on the
     * board. The research engine already reconciles the live Top N
     * continuously, so asking for a re-look here would enqueue the whole board
     * once a day for no new information. A reassessment needs a previous
     * checkpoint to have moved away from.
     */
    return {
      changedFields: changed,
      summary: `${current.ticker}: ${notes.join('; ')}.`,
      cycleReassessmentNeeded: false,
    };
  }

  // ---- rank ---------------------------------------------------------------
  const wasInside = previous.assessmentRank !== null && previous.assessmentRank <= discoveryRank;
  const isInside = current.assessmentRank !== null && current.assessmentRank <= discoveryRank;

  if (isInside && !wasInside) {
    changed.push('ENTERED_TOP_N');
    notes.push(`entered Top ${discoveryRank}`);
    cycleTrigger = true;
  } else if (!isInside && wasInside) {
    changed.push('LEFT_TOP_N');
    notes.push(`left Top ${discoveryRank}`);
  }

  if (previous.assessmentRank !== null && current.assessmentRank !== null) {
    const move = previous.assessmentRank - current.assessmentRank;
    if (Math.abs(move) >= MATERIAL_RANK_MOVE) {
      changed.push(move > 0 ? 'RANK_IMPROVED' : 'RANK_DETERIORATED');
      notes.push(`rank #${previous.assessmentRank} → #${current.assessmentRank}`);
      if (Math.abs(move) >= MATERIAL_RANK_MOVE * 2) cycleTrigger = true;
    }
  }

  // ---- price --------------------------------------------------------------
  if (previous.price !== null && current.price !== null && previous.price > 0) {
    const move = pct(previous.price, current.price);
    if (Math.abs(move) >= MATERIAL_MOVE_PCT) {
      changed.push(move > 0 ? 'PRICE_EXPANSION' : 'PRICE_RETRACEMENT');
      notes.push(`${signed(move)}% since prior assessment`);
      if (Math.abs(move) >= CYCLE_MOVE_PCT) cycleTrigger = true;
    }
  }

  if (
    previous.sessionHigh !== null &&
    current.sessionHigh !== null &&
    current.sessionHigh > previous.sessionHigh
  ) {
    changed.push('NEW_HOD');
    const clear = pct(previous.sessionHigh, current.sessionHigh);
    notes.push('new HOD');
    if (clear >= MAJOR_NEW_HIGH_PCT) cycleTrigger = true;
  }

  // Retracement off the session high is the classic frontside-to-backside
  // question, so it is a cycle trigger even when the rank has not moved.
  if (current.sessionHigh !== null && current.price !== null && current.sessionHigh > 0) {
    const giveback = pct(current.sessionHigh, current.price);
    const priorGiveback =
      previous.sessionHigh !== null && previous.price !== null && previous.sessionHigh > 0
        ? pct(previous.sessionHigh, previous.price)
        : 0;
    if (giveback <= -MATERIAL_GIVEBACK_PCT && priorGiveback > -MATERIAL_GIVEBACK_PCT) {
      changed.push('MAJOR_GIVEBACK');
      notes.push(`${signed(giveback)}% off session high`);
      cycleTrigger = true;
    }
  }

  // ---- levels -------------------------------------------------------------
  const priorLevels = decodeLevels(previous.levelSummary);
  if (
    priorLevels?.support !== null &&
    priorLevels?.support !== undefined &&
    current.price !== null &&
    current.price < priorLevels.support &&
    (previous.price === null || previous.price >= priorLevels.support)
  ) {
    changed.push('SUPPORT_LOST');
    notes.push(`lost $${priorLevels.support.toFixed(2)} support`);
    cycleTrigger = true;
  }

  // ---- halts --------------------------------------------------------------
  if (previous.haltState !== current.haltState) {
    changed.push('HALT_STATE');
    notes.push(`${previous.haltState ?? 'UNKNOWN'} → ${current.haltState ?? 'UNKNOWN'}`);
    cycleTrigger = true;
  }

  // ---- research -----------------------------------------------------------
  if (previous.catalyst !== current.catalyst) {
    changed.push('CATALYST_CHANGED');
    notes.push(`catalyst ${previous.catalyst ?? 'unknown'} → ${current.catalyst ?? 'unknown'}`);
  }
  if (previous.structure !== current.structure) {
    changed.push('STRUCTURE_CHANGED');
    notes.push(`structure ${previous.structure ?? 'unknown'} → ${current.structure ?? 'unknown'}`);
  }
  if (previous.cycle !== current.cycle) {
    changed.push('CYCLE_CHANGED');
    notes.push(`cycle ${previous.cycle ?? 'unknown'} → ${current.cycle ?? 'unknown'}`);
  }
  if (
    previous.evidenceFingerprint !== current.evidenceFingerprint &&
    current.evidenceFingerprint !== null
  ) {
    changed.push('NEW_EVIDENCE');
    notes.push('new source evidence on file');
  }
  if (previous.analysisVersionId !== current.analysisVersionId) {
    changed.push('ANALYSIS_UPDATED');
  }
  if (previous.intelligenceStatus !== current.intelligenceStatus) {
    changed.push('INTELLIGENCE_STATUS');
    if (current.intelligenceStatus === 'CONFLICT') notes.push('research conflict appeared');
    else if (previous.intelligenceStatus === 'CONFLICT') notes.push('research conflict resolved');
  }

  /*
   * The cycle fingerprint is the final gate.
   *
   * A trigger above says something happened; this says the objective context a
   * cycle call rests on is genuinely different from the one the current call
   * was made against. Both must hold, so an ordinary tick never books a
   * reassessment.
   */
  const fingerprintMoved =
    current.cycleFingerprint !== null &&
    previous.cycleFingerprint !== null &&
    current.cycleFingerprint !== previous.cycleFingerprint;

  return {
    changedFields: changed,
    summary: notes.length > 0 ? `${current.ticker}: ${notes.join('; ')}.` : '',
    cycleReassessmentNeeded: cycleTrigger && fingerprintMoved,
  };
}

/**
 * The checkpoint's commentary: the lines that actually say something.
 *
 * Capped, because an assessment note is meant to be read. Tickers with no
 * material change contribute nothing rather than a line saying so.
 */
export function commentary(records: readonly AssessmentTickerRecord[], limit = 12): string[] {
  return records
    .filter((record) => record.changeSummary.length > 0)
    .slice(0, limit)
    .map((record) => record.changeSummary);
}
