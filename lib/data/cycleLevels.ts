/**
 * Momentum-cycle level semantics.
 *
 * A 52-week high, an old run high, or any other historical resistance is NOT
 * the current momentum-cycle high, and the distance to it is NOT a current
 * giveback. Presenting one as the other is the kind of error that makes a
 * trader size a position against a level that has no bearing on today's move.
 *
 * The only source these readings were ever classified from was the Google
 * Sheet (TODAY "Recent Run High", RESEARCH "Recent Cycle High"). The Sheet is
 * gone (A5, 2026-10-14) and its cell classifier went with it, so the model is
 * always empty: no current-cycle high, no historical resistance, no giveback.
 * The shape is kept because a desk row carries it and the price-level map reads
 * it; an empty model is what both already received.
 */

export type LevelKind =
  /** Affirmatively part of the move happening now. */
  | 'CURRENT_CYCLE'
  /** A 52-week high, prior run high, or other historical level. */
  | 'HISTORICAL'
  /** Present, but nothing establishes which of the two it is. */
  | 'UNVERIFIED';

export interface LevelReading {
  /** The source cell, verbatim. */
  raw: string;
  value: number | null;
  kind: LevelKind;
  /** Which source field produced it. */
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
   * The source's own "Flush From High %" value, preserved for audit together
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

/**
 * The level model for one name. With no level source every field is empty,
 * exactly what the Sheet-era derivation returned when given no TODAY row and no
 * RESEARCH record. A fresh object each call, so no caller can mutate another's
 * `notes`.
 */
export function deriveCycleLevels(): CycleLevels {
  return {
    currentCycleHigh: null,
    historicalResistance: null,
    unverifiedRunHigh: null,
    givebackFromCurrentCycleHighPct: null,
    sheetReportedFlush: null,
    notes: [],
  };
}
