/**
 * The Risk chip — the one thing in a row that says how to treat the stock.
 *
 * This replaces a free sentence truncated at 76 characters whose remainder was
 * reachable only by hovering. A sentence cannot be compared down a column and a
 * hover cannot be scanned, so the row now carries a short coded label with a
 * measured value beside it and one readable line underneath. The full prose is
 * not lost; it moves to the drawer, where there is room to read it.
 *
 * Everything here is selected from data the desk already holds. Nothing is
 * parsed out of prose, nothing is inferred, and a risk that is not established
 * says so rather than being downgraded to silence: "we have not looked at this"
 * and "we looked and found nothing" are different answers and must look
 * different.
 */

import type { DeskRow } from '@/lib/dashboard/merge';
import type { SupplyBlock } from '@/lib/research/types';

export type RiskCode =
  | 'NOT_RESEARCHED'
  | 'ANALYSIS_PENDING'
  | 'ANALYSIS_FAILED'
  | 'DIRTY_FLOAT'
  | 'SUPPLY_OVERHEAD'
  | 'STRUCTURE_CAUTION'
  | 'STRUCTURE_CLEAN';

export type RiskTone = 'neg' | 'warn' | 'pos' | 'dim';

export interface DeskRisk {
  code: RiskCode;
  /** Chip text. Short and fixed-vocabulary, so a column of them compares. */
  label: string;
  /** The measured value that earns the chip, when one exists. */
  value: string | null;
  /** One line, readable in the row without hovering anything. */
  detail: string | null;
  tone: RiskTone;
  /**
   * The complete source text, for the drawer.
   *
   * The row shows `detail`; this is what the drawer shows in full. It is never
   * the only route to information the row needed.
   */
  full: string | null;
}

const MILLION = 1_000_000;

/** Compact share counts: 38,317,241 → 38.3M. */
export function formatShares(shares: number): string {
  if (shares >= MILLION) return `${(shares / MILLION).toFixed(shares >= 10 * MILLION ? 1 : 2)}M`;
  if (shares >= 1_000) return `${Math.round(shares / 1_000)}K`;
  return String(Math.round(shares));
}

/**
 * The first sentence of a longer warning.
 *
 * Split on a sentence boundary rather than cut at a character count, so the row
 * never ends mid-word. If the first sentence is itself long the line is clamped
 * by CSS, not here — the text stays whole in the DOM and in the drawer.
 */
export function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return null;

  // Sentence-ish boundaries: a full stop or semicolon followed by a space and a
  // capital, which is how the analysis layer joins independent findings.
  const match = clean.match(/^(.+?[.;])\s+[A-Z0-9]/);
  return match ? match[1]!.replace(/;$/, '.') : clean;
}

/** Shares of known, potentially sellable supply the analysis actually found. */
export function knownSupplyShares(blocks: readonly SupplyBlock[]): number | null {
  let total = 0;
  let found = false;
  for (const block of blocks) {
    if (block.amountShares !== null && block.amountShares > 0) {
      total += block.amountShares;
      found = true;
    }
  }
  return found ? total : null;
}

/**
 * Resolves the one risk a row should lead with.
 *
 * Ordered by what would change a trader's handling of the stock, hardest first.
 * A dirty float outranks unknown supply, which outranks an unknown float, which
 * outranks a clean read — and every one of those outranks having nothing to say
 * because the analysis has not run, which is reported as its own state rather
 * than as an absence of risk.
 */
export function resolveRisk(row: DeskRow): DeskRisk {
  const status = row.intelligenceState.status;

  if (status === 'NOT_ANALYZED') {
    return {
      code: 'NOT_RESEARCHED',
      label: 'NOT RESEARCHED',
      value: null,
      detail: 'The desk has not assessed this name.',
      tone: 'dim',
      full: null,
    };
  }

  if (status === 'ANALYSIS_PENDING') {
    return {
      code: 'ANALYSIS_PENDING',
      label: 'RESEARCHING',
      value: null,
      detail: 'Structural analysis is running.',
      tone: 'dim',
      full: null,
    };
  }

  if (status === 'FAILED') {
    return {
      code: 'ANALYSIS_FAILED',
      label: 'ANALYSIS FAILED',
      value: null,
      detail: 'Structure could not be established. Treat it as unknown.',
      tone: 'neg',
      full: null,
    };
  }

  const structure = row.intelligence?.analysis?.dossier.structure ?? null;
  const supplyShares = structure ? knownSupplyShares(structure.supplyLedger) : null;
  // Desk only (Sheet switch-off step 3a, Integration 36th): the warning and the classification are the
  // desk's own dossier's. The Sheet's warning used to lead, and its DIRTY_FLOAT alone could set the chip.
  const structuralWarning = structure?.structuralWarnings[0] ?? null;
  const full = structuralWarning ?? structure?.summary ?? null;
  const line = firstSentence(structuralWarning);

  // A dirty float is the strongest structural statement the desk makes, and it comes from an accepted desk
  // dossier, never from arithmetic.
  const dirty = structure?.structureClassification === 'DIRTY_FLOAT';

  if (dirty) {
    return {
      code: 'DIRTY_FLOAT',
      label: 'DIRTY FLOAT',
      value: supplyShares !== null ? `${formatShares(supplyShares)} sh supply` : null,
      detail: line ?? 'The displayed float understates the shares that can reach the market.',
      tone: 'neg',
      full,
    };
  }

  // Registered resale or warrant capacity found but not classified dirty. It is
  // capacity, and the label says capacity — never "selling".
  if (supplyShares !== null) {
    return {
      code: 'SUPPLY_OVERHEAD',
      label: 'SUPPLY OVERHEAD',
      value: `${formatShares(supplyShares)} sh`,
      detail: line ?? 'Registered or issuable shares exist. Capacity, not proof of selling.',
      tone: 'warn',
      full,
    };
  }

  /*
   * NO STRUCTURE UNKNOWN CHIP. Only the Sheet's UNKNOWN_STRUCTURE could set it, and the desk has no trigger
   * of its own; Integration 36th ruled it gone (the desk's own structure label covers the idea).
   */
  if (structure?.structureClassification === 'CAUTION' || line !== null) {
    return {
      code: 'STRUCTURE_CAUTION',
      label: 'STRUCTURE CAUTION',
      value: null,
      detail: line ?? 'Structure is cautionary rather than clean.',
      tone: 'warn',
      full,
    };
  }

  return {
    code: 'STRUCTURE_CLEAN',
    label: 'NO FLAG FOUND',
    // No value (Marketing 644a67e0 S4, Commercial read 60): it printed the Sheet's float as a fact.
    value: null,
    detail: 'Researched; no structural problem established.',
    tone: 'pos',
    full,
  };
}
