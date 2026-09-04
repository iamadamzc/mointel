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
  | 'STRUCTURE_UNKNOWN'
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
  const warning = row.research?.warning.current ?? null;
  const structuralWarning = structure?.structuralWarnings[0] ?? null;
  const full = warning ?? structuralWarning ?? structure?.summary ?? null;
  const line = firstSentence(warning) ?? firstSentence(structuralWarning);

  // A dirty float is the strongest structural statement the desk makes, and it
  // comes from the outside research or an accepted desk dossier, never from
  // arithmetic.
  const dirty =
    row.research?.structure.state === 'DIRTY_FLOAT' ||
    structure?.structureClassification === 'DIRTY_FLOAT';

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
   * The Sheet's UNKNOWN_STRUCTURE only. The dossier's float is NOT a trigger.
   *
   * This also fired on `structure.displayedFloat === null`, which has been null
   * on every stored version since id 237 (2026-08-20). That made FLOAT UNKNOWN
   * true of every researched row, and a chip identical on every row cannot make
   * rejection cheap, which is the one job this cell has. It short-circuited both
   * branches below: STRUCTURE CAUTION never rendered, and neither did
   * STRUCTURE_CLEAN — the only `tone: 'pos'` outcome in this function. The desk
   * had no way to tell the trader a researched name was structurally clean for
   * thirteen days.
   *
   * The two floats are different fields with the same name: `structure
   * .displayedFloat` is the dossier's, null, and `row.displayedFloat` below is
   * the Sheet's, populated — so the gate read one while the value it gated read
   * the other.
   *
   * The chip stays correct while the desk has no float source. It is BECAUSE it
   * is correct for everyone that it cannot be a per-row chip. Restore a
   * dossier-float condition only when that float can vary.
   *
   * **It was called FLOAT UNKNOWN and it reads STRUCTURE.** The name was
   * harmless while `displayedFloat` was null on 49 of 50 rows, because the two
   * were absent together. Research's Sheet float parser takes top-50 coverage
   * to about 12 of 50, and a row can carry UNKNOWN in the structure cell AND a
   * parsed float in the float cell — different columns. The old detail said
   * "No sourced float figure" and the same drawer would have rendered that
   * float: a contradiction inside one screen.
   *
   * The gate is untouched; it was never wrong. Only the words were, and they
   * were wrong about WHICH FIELD IS MISSING.
   *
   * The general form, which is the part worth carrying: **a condition
   * unreachable because a field is universally absent becomes reachable the
   * moment the field is populated.** Filling a data gap activates dormant code
   * paths, and no grep for the field name finds them.
   */
  const structureUnknown = row.research?.structure.state === 'UNKNOWN_STRUCTURE';

  if (structureUnknown) {
    return {
      code: 'STRUCTURE_UNKNOWN',
      label: 'STRUCTURE UNKNOWN',
      value: null,
      /*
       * Says what is unknown rather than prescribing a size.
       *
       * The old sentence ended "size the position as if it could be large",
       * which was advice about the FLOAT. It goes stale the moment a float
       * appears beside it, and this chip is not about the float.
       *
       * "Outside research" rather than "the Sheet": the 16a vocabulary, and it
       * falls out of use rather than needing renaming when the Sheet retires.
       */
      detail:
        line ??
        'The outside research did not establish the share structure. Nothing here is known about supply or dilution.',
      tone: 'warn',
      full,
    };
  }

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
    value: row.displayedFloat !== null ? `${formatShares(row.displayedFloat)} float` : null,
    detail: 'Researched; no structural problem established.',
    tone: 'pos',
    full,
  };
}
