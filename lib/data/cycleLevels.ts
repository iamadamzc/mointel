/**
 * Momentum-cycle level semantics.
 *
 * A 52-week high, an old run high, or any other historical resistance is NOT
 * the current momentum-cycle high, and the distance to it is NOT a current
 * giveback. Presenting one as the other is the kind of error that makes a
 * trader size a position against a level that has no bearing on today's move.
 *
 * The sheet mixes both meanings in the same columns — FIEE carries
 * "Recent Cycle High = $10.59 (52-week proxy)" — so every level reading is
 * classified before it is displayed, and a current-cycle high is only asserted
 * on affirmative evidence.
 */

import type { MomentumTicker, StructuralResearch } from './types';
import { parseNumber } from './normalize';

export type LevelKind =
  /** Affirmatively part of the move happening now. */
  | 'CURRENT_CYCLE'
  /** A 52-week high, prior run high, or other historical level. */
  | 'HISTORICAL'
  /** Present, but nothing establishes which of the two it is. */
  | 'UNVERIFIED';

export interface LevelReading {
  /** The sheet cell, verbatim. */
  raw: string;
  value: number | null;
  kind: LevelKind;
  /** Which sheet field produced it. */
  field: string;
  /** Why it was classified this way, for audit. */
  reason: string;
  /** A short human label, e.g. "52-week high". */
  label: string | null;
}

export interface CycleLevels {
  /** Only populated when a level is affirmatively part of the current cycle. */
  currentCycleHigh: LevelReading | null;
  /** 52-week / prior-run / historical resistance. */
  historicalResistance: LevelReading | null;
  /** A level we cannot attribute to either bucket. Shown as unverified. */
  unverifiedRunHigh: LevelReading | null;
  /** (currentCycleHigh - price) / currentCycleHigh * 100, when computable. */
  givebackFromCurrentCycleHighPct: number | null;
  /**
   * The sheet's own "Flush From High %" value, preserved for audit together
   * with what it was measured from. Never presented as a current giveback when
   * its basis is historical.
   */
  sheetReportedFlush: {
    raw: string;
    value: number | null;
    basisField: string;
    basisKind: LevelKind;
  } | null;
  notes: string[];
}

const HISTORICAL_PATTERN =
  /52[\s-]?week|52wk|proxy|all[\s-]?time|historical|prior\s+(run|high|peak|cycle)|previous\s+(run|high|peak|cycle)|former\s+(high|peak|runner)|year\s+high/i;

const CURRENT_PATTERN =
  /current\s+cycle|this\s+(session|cycle|move|run)|today'?s\s+(high|run)|intraday\s+high|session\s+high/i;

function labelFor(raw: string): string | null {
  if (/52[\s-]?week|52wk|year\s+high/i.test(raw)) return '52-week high';
  if (/all[\s-]?time/i.test(raw)) return 'all-time high';
  if (/prior\s+run|previous\s+run|former\s+(high|peak|runner)/i.test(raw)) return 'prior run high';
  if (/proxy/i.test(raw)) return 'historical proxy';
  if (/historical/i.test(raw)) return 'historical resistance';
  return null;
}

/** Classifies one level cell on its own text. */
export function classifyLevel(raw: string, field: string): LevelReading | null {
  const text = raw.trim();
  if (!text) return null;

  const value = parseNumber(text) ?? firstPriceIn(text);

  if (CURRENT_PATTERN.test(text) && !HISTORICAL_PATTERN.test(text)) {
    return {
      raw: text,
      value,
      kind: 'CURRENT_CYCLE',
      field,
      reason: 'cell text identifies the current cycle or session',
      label: null,
    };
  }

  if (HISTORICAL_PATTERN.test(text)) {
    return {
      raw: text,
      value,
      kind: 'HISTORICAL',
      field,
      reason: 'cell text identifies a historical level, not the current cycle',
      label: labelFor(text),
    };
  }

  return {
    raw: text,
    value,
    kind: 'UNVERIFIED',
    field,
    reason: 'no evidence the level belongs to the current cycle',
    label: null,
  };
}

/** Pulls the first dollar-denominated price out of descriptive text. */
function firstPriceIn(text: string): number | null {
  const match = text.match(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function sameLevel(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) < Math.max(0.005, Math.abs(a) * 0.001);
}

/**
 * Looks for corroborating evidence in the narrative fields, e.g.
 * "No verified current former superrunner; 52-week high $10.59".
 */
function historicalCorroboration(value: number | null, texts: string[]): string | null {
  if (value === null) return null;

  for (const text of texts) {
    if (!text || !HISTORICAL_PATTERN.test(text)) continue;
    const prices = [...text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g)].map(
      (match) => Number(match[1].replace(/,/g, '')),
    );
    if (prices.some((price) => sameLevel(price, value))) {
      return text.length > 140 ? `${text.slice(0, 137)}…` : text;
    }
  }

  return null;
}

export interface CycleLevelInput {
  ticker: MomentumTicker | null;
  research: StructuralResearch | null;
  /** Current market price, used only for the giveback calculation. */
  currentPrice: number | null;
}

/**
 * Derives the separated level model from a TODAY row and its RESEARCH record.
 *
 * The RESEARCH "Recent Cycle High" cell is the stronger signal because it is
 * where the analyst annotates the basis; a bare TODAY "Recent Run High" that
 * matches a historical RESEARCH level inherits that classification rather than
 * being promoted to a current-cycle high.
 */
export function deriveCycleLevels(input: CycleLevelInput): CycleLevels {
  const notes: string[] = [];

  const researchReading = input.research
    ? classifyLevel(input.research.recentCycleHigh.raw, 'RESEARCH · Recent Cycle High')
    : null;
  const todayReading = input.ticker
    ? classifyLevel(input.ticker.recentRunHigh.raw, 'TODAY · Recent Run High')
    : null;

  const narrative = [
    input.ticker?.priorRunner ?? '',
    input.research?.historicalRunnerNotes ?? '',
    input.research?.recentMajorRuns ?? '',
  ];

  const readings = [researchReading, todayReading].filter(
    (reading): reading is LevelReading => reading !== null,
  );

  // An unverified reading that matches a level the sheet elsewhere calls
  // historical is historical too.
  for (const reading of readings) {
    if (reading.kind !== 'UNVERIFIED') continue;

    const historicalTwin = readings.find(
      (other) => other !== reading && other.kind === 'HISTORICAL' && sameLevel(other.value, reading.value),
    );
    if (historicalTwin) {
      reading.kind = 'HISTORICAL';
      reading.label = historicalTwin.label;
      reading.reason = `matches ${historicalTwin.field}, which is annotated as historical`;
      continue;
    }

    const corroboration = historicalCorroboration(reading.value, narrative);
    if (corroboration) {
      reading.kind = 'HISTORICAL';
      reading.label = labelFor(corroboration);
      reading.reason = `corroborated as historical by the sheet narrative: "${corroboration}"`;
    }
  }

  const currentCycleHigh = readings.find((reading) => reading.kind === 'CURRENT_CYCLE') ?? null;
  const historicalResistance = readings.find((reading) => reading.kind === 'HISTORICAL') ?? null;
  const unverifiedRunHigh = readings.find((reading) => reading.kind === 'UNVERIFIED') ?? null;

  const givebackFromCurrentCycleHighPct =
    currentCycleHigh?.value !== null &&
    currentCycleHigh?.value !== undefined &&
    currentCycleHigh.value > 0 &&
    input.currentPrice !== null &&
    Number.isFinite(input.currentPrice)
      ? ((currentCycleHigh.value - input.currentPrice) / currentCycleHigh.value) * 100
      : null;

  // The sheet's flush percentage is only meaningful alongside the level it was
  // measured from, so it travels with that basis and never alone.
  const flushRaw = input.research?.flushFromHighPct.raw || input.ticker?.flushFromHighPct.raw || '';
  const flushValue =
    input.research?.flushFromHighPct.value ?? input.ticker?.flushFromHighPct.value ?? null;
  const flushBasis = researchReading ?? todayReading;

  const sheetReportedFlush = flushRaw
    ? {
        raw: flushRaw,
        value: flushValue,
        basisField: flushBasis?.field ?? 'unknown',
        basisKind: flushBasis?.kind ?? ('UNVERIFIED' as LevelKind),
      }
    : null;

  if (historicalResistance && !currentCycleHigh) {
    notes.push(
      'No verified current-cycle high. The sheet level is historical resistance, so no current giveback is calculated.',
    );
  }
  if (sheetReportedFlush && sheetReportedFlush.basisKind === 'HISTORICAL') {
    notes.push(
      `The sheet's ${sheetReportedFlush.raw} is measured from ${sheetReportedFlush.basisField}, a historical level — not a current-cycle giveback.`,
    );
  }

  return {
    currentCycleHigh,
    historicalResistance,
    unverifiedRunHigh,
    givebackFromCurrentCycleHighPct,
    sheetReportedFlush,
    notes,
  };
}
