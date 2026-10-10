/**
 * The Desk Read: the answer, before the evidence.
 *
 * The drawer holds a lot of well-sourced detail, and a trader had to scroll
 * through most of it to learn what the name is doing right now. This assembles
 * the two-second version — live state, the three conclusions, the nearest
 * levels either side, and the single warning that matters — from data the
 * application already has.
 *
 * Nothing here calls a model. Every string is either a label this codebase
 * already defines or text a source already wrote; where no source said
 * anything, the field is null and the UI shows nothing rather than filling the
 * space with a plausible sentence. That restraint is the point: a Desk Read
 * that invents its "why now" is worse than an empty one.
 */

import type { IntelligenceState } from '@/lib/dashboard/intelligence';
import type { DeskRow } from '@/lib/dashboard/merge';
import { floatCellView, type FloatCellView } from '@/lib/dashboard/floatBound';
import type { MarketTelemetry } from '@/lib/dashboard/telemetry';
import {
  levelTypeLabel,
  selectForBoard,
  type LevelMap,
  type LevelZone,
} from '@/lib/data/priceLevels';
import type { StructureClassification, SupplyBlock } from '@/lib/research/types';
import { CATALYST_GRADE_LABEL, STRUCTURE_LABEL } from '@/lib/research/view';

import { resolveComputedCycle } from './cycle';

/** Mirrors the badge tones the components already use. */
export type ReadTone = 'pos' | 'warn' | 'neg' | 'accent' | 'neutral' | 'dim';

/**
 * Where a displayed conclusion came from: the desk's research (`AUTO`), arithmetic on price history
 * (`COMPUTED`), or nothing (`NONE`). Desk only since step 3a: there is no second source to agree or differ.
 */
export type ConclusionProvenance = 'AUTO' | 'COMPUTED' | 'NONE';

export interface DeskConclusion {
  label: string;
  tone: ReadTone;
  provenance: ConclusionProvenance;
  /** Full source text for the hover title; never truncated here. */
  title: string | null;
}

export interface DeskReadLevel {
  price: string;
  type: string;
  /** "LOST SUPPORT" / "PRICE ABOVE" when the relationship is not ordinary. */
  stateLabel: string | null;
  /** The source's own date, YYYY-MM-DD, or null; rendered with `levelDateText`. */
  sourceDate: string | null;
  distance: string;
  distancePct: string;
}

export interface SupplyLine {
  label: string;
  status: string;
  /** Share count or dollar capacity, as the filing stated it. */
  amount: string | null;
}

export interface StructureSummary {
  classification: StructureClassification;
  label: string;
  tone: ReadTone;
  /**
   * The desk's float, as its float cell shows it (Sheet switch-off step 3b; Marketing 644a67e0 S5,
   * Commercial read 60): the cell's own face ("≤ 12.3M", "Unknown", "Cannot verify", "Not computed") and,
   * on a bound, the filed count's date. It was the Sheet's float with a check against the filed count; with
   * no Sheet float there is nothing to check (Research), so the check is gone.
   */
  float: { face: string; date: string | null; kind: FloatCellView['kind'] };
  /**
   * The model's confidence in the DOSSIER's float extraction.
   *
   * Kept for consumers that read the dossier, and deliberately NOT rendered
   * beside `float`, which is the float cell's bound: a confidence describing one
   * number, printed against another, is a label that is false without context.
   */
  floatConfidence: string;
  supply: SupplyLine[];
  /** First structural warning, verbatim. Null when none was recorded. */
  keyWarning: string | null;
}

/**
 * A trader-facing narrative line: the desk's own text, with `qualifier` disclosing a limitation (incomplete
 * source coverage) beside it rather than replacing it.
 */
export interface DeskNarrative {
  text: string | null;
  /**
   * The complete source text behind `text`.
   *
   * `text` is condensed to fit the strip; this is what a hover reveals and
   * what the drawer prints in full, so a sentence trimmed for the layout is
   * never a sentence the trader cannot reach.
   */
  fullText: string | null;
  provenance: ConclusionProvenance;
  /** Short disclosure, e.g. "SOURCE COVERAGE INCOMPLETE". Null when none applies. */
  qualifier: string | null;
}

export interface DeskRead {
  ticker: string;
  telemetry: MarketTelemetry;

  cycle: DeskConclusion;
  catalyst: DeskConclusion;
  structure: DeskConclusion;

  nextUp: DeskReadLevel[];
  nextDown: DeskReadLevel[];
  /** Set when a whole side of the ladder is empty or unusually far away. */
  airPocketAbove: string | null;
  airPocketBelow: string | null;

  /** Why the name is moving, merged across both sources. */
  whyNow: DeskNarrative;
  /** The structural risk that matters, merged across both sources. */
  structuralWarning: DeskNarrative;

  /** Compressed supply picture, when automatic structure work exists. */
  structureSummary: StructureSummary | null;
  /** The one research status every surface shares. */
  intelligence: IntelligenceState;
}

/* --------------------------------------------------------------- conclusions */

export type DeskField = 'cycle' | 'catalyst' | 'structure';

/**
 * What one unresolved dimension is called.
 *
 * "NOT ANALYZED" is a statement about the whole ticker, and using it for a
 * single blank field said the desk had never looked — while the catalyst and
 * structure conclusions sat next to it, produced by the analysis it was
 * claiming had not happened. An unresolved dimension names itself instead.
 */
const UNRESOLVED_LABEL: Record<DeskField, string> = {
  cycle: 'CYCLE NOT ESTABLISHED',
  catalyst: 'CATALYST UNKNOWN',
  structure: 'STRUCTURE UNKNOWN',
};

const UNRESOLVED_DETAIL: Record<DeskField, string> = {
  cycle: 'Analysis ran but did not establish a cycle boundary for this name.',
  catalyst: 'Analysis ran but reached no catalyst conclusion.',
  structure: 'Analysis ran but reached no structural conclusion.',
};

/** Reserved for a ticker with no usable analysis of any kind. */
const NOT_ANALYZED: DeskConclusion = {
  label: 'NOT ANALYZED',
  tone: 'dim',
  provenance: 'NONE',
  title: null,
};

function structureLabelTone(state: StructureClassification): ReadTone {
  switch (state) {
    case 'DIRTY_FLOAT':
      return 'neg';
    case 'CAUTION':
      return 'warn';
    case 'CLEAN':
      return 'pos';
    default:
      return 'warn';
  }
}

/**
 * The desk's conclusion for one field, or what to say when it has none.
 *
 * DESK ONLY (Sheet switch-off step 3a, Integration 36th). The Sheet's label used to lead and the desk's
 * stood as the dissent; on a name where they differed the row showed the Sheet's answer, which is the
 * confusion he named ("users dont know the difference between the sheet and the desk").
 */
function resolveConclusion(options: {
  autoLabel: string | null;
  autoTone: ReadTone;
  autoTitle: string | null;
  field: DeskField;
  /** True when the desk has an accepted dossier for this ticker. */
  analysed: boolean;
  /**
   * What to say when nothing is analysed yet but work is under way, e.g.
   * ANALYSIS PENDING. Null when the ticker genuinely has nothing happening.
   */
  inFlightLabel: string | null;
}): DeskConclusion {
  const { autoLabel, field } = options;

  if (autoLabel) {
    return {
      label: autoLabel,
      tone: options.autoTone,
      provenance: 'AUTO',
      title: options.autoTitle,
    };
  }

  // Neither side reached a conclusion on this dimension. Whether that means
  // "unresolved" or "never looked at" depends on the ticker, not the field.
  if (options.analysed) {
    return {
      label: UNRESOLVED_LABEL[field],
      tone: 'dim',
      provenance: 'NONE',
      title: UNRESOLVED_DETAIL[field],
    };
  }

  /*
   * Research is running, so the field is not unanalyzed — it is unfinished.
   *
   * Saying NOT ANALYZED here put that label beside a status mark reading
   * ANALYSIS PENDING on the same cell, which reads as a contradiction and is
   * simply out of date the moment a job starts.
   */
  if (options.inFlightLabel) {
    return {
      label: options.inFlightLabel,
      tone: 'dim',
      provenance: 'NONE',
      title: 'Desk research is under way for this ticker.',
    };
  }

  return NOT_ANALYZED;
}

/* -------------------------------------------------------------------- levels */

function toReadLevel(zone: LevelZone, sign: '+' | '-'): DeskReadLevel {
  const format = (value: number) => (value < 1 ? value.toFixed(3) : value.toFixed(2));

  return {
    price:
      zone.members.length > 1
        ? `${format(zone.low)}–${format(zone.high)}`
        : format(zone.nearestPrice),
    type: levelTypeLabel(zone.dominantType),
    stateLabel: zone.stateLabel,
    sourceDate: zone.sourceDate,
    distance: zone.distanceAbs === null ? '—' : `${sign}${zone.distanceAbs.toFixed(2)}`,
    distancePct: zone.distancePct === null ? '—' : `${zone.distancePct.toFixed(1)}%`,
  };
}

/**
 * The levels the Desk Read shows.
 *
 * Same importance-times-proximity selection the board uses, so a derived whole
 * dollar cannot push out a nearby HOD or a research level — just more of them,
 * because the drawer has the room.
 */
export function deskReadLevels(map: LevelMap, perSide = 3): {
  nextUp: DeskReadLevel[];
  nextDown: DeskReadLevel[];
} {
  return {
    nextUp: selectForBoard(map.above, perSide).map((zone) => toReadLevel(zone, '+')),
    nextDown: selectForBoard(map.below, perSide).map((zone) => toReadLevel(zone, '-')),
  };
}

/* ----------------------------------------------------------------- structure */

function supplyAmount(block: SupplyBlock): string | null {
  if (block.amountShares !== null) return `${block.amountShares.toLocaleString()} sh`;
  // A dollar shelf is capacity, not shares. It is never converted.
  if (block.dollarCapacity !== null) return `$${block.dollarCapacity.toLocaleString()}`;
  return null;
}

/**
 * The supply picture as a list rather than a paragraph.
 *
 * Presentation only: the blocks, their statuses and their amounts are exactly
 * what the structural analysis recorded. Nothing is reclassified, and capacity
 * is never restated as selling.
 */
export function buildStructureSummary(row: DeskRow): StructureSummary | null {
  const structure = row.intelligence?.analysis?.dossier.structure;
  if (!structure) return null;

  return {
    classification: structure.structureClassification,
    label: STRUCTURE_LABEL[structure.structureClassification],
    tone: structureLabelTone(structure.structureClassification),
    // The float cell's own view when the float is wired; unwired, the desk has computed none.
    float: (() => {
      const view = floatCellView(row.floatBoundWired ? row.floatBound : null);
      return { face: view.face, date: view.date, kind: view.kind };
    })(),
    floatConfidence: structure.floatConfidence,
    supply: structure.supplyLedger.map((block) => ({
      label: block.type.replace(/_/g, ' '),
      status: block.status.replace(/_/g, ' '),
      amount: supplyAmount(block),
    })),
    keyWarning: structure.structuralWarnings[0] ?? null,
  };
}

/* ------------------------------------------------------------------ assembly */

/** Trims long source text at a sentence boundary. Never rewrites words. */
function condense(text: string, limit = 240): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= limit) return clean;

  const cut = clean.slice(0, limit);
  const stop = cut.lastIndexOf('. ');
  return stop > limit * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

const EMPTY_NARRATIVE: DeskNarrative = {
  text: null,
  fullText: null,
  provenance: 'NONE',
  qualifier: null,
};

/**
 * The desk's own text for one narrative line (desk only, step 3a): its accepted dossier text, condensed for
 * the strip and whole for the hover, with incomplete source coverage disclosed beside it.
 */
function deskNarrative(options: {
  autoText: string | null;
  /** Deterministic collection recorded gaps. */
  coverageIncomplete: boolean;
}): DeskNarrative {
  const autoText = options.autoText?.trim() || null;
  if (!autoText) return EMPTY_NARRATIVE;
  return {
    text: condense(autoText),
    fullText: autoText,
    provenance: 'AUTO',
    // Marketing 36d1d600 (1): no "AUTO" once there is one source.
    qualifier: options.coverageIncomplete ? 'SOURCE COVERAGE INCOMPLETE' : null,
  };
}

/** The three conclusions, resolved once for every surface that shows them. */
export interface DeskConclusions {
  cycle: DeskConclusion;
  catalyst: DeskConclusion;
  structure: DeskConclusion;
}

/**
 * Resolves the cycle, catalyst and structure conclusions for a ticker.
 *
 * Exported so the board, the Focus strip and the drawer render the same three
 * labels. They used to derive them separately, which is how one surface could
 * call a field UNKNOWN while another called the whole ticker unanalyzed.
 */
export function resolveConclusions(row: DeskRow): DeskConclusions {
  const dossier = row.intelligence?.analysis?.dossier ?? null;

  // Some usable analysis exists, even if this particular field has no answer.
  const analysed = row.intelligenceState.hasAuto;
  const inFlightLabel =
    row.intelligenceState.status === 'ANALYSIS_PENDING' ||
    row.intelligenceState.status === 'FAILED'
      ? row.intelligenceState.label
      : null;

  /*
   * Cycle is arithmetic, and leaves the Sheet/Auto merge entirely.
   *
   * Computed from daily bars in lib/market/cycle.ts, so there is no second
   * reading to reconcile: no provenance axis, no comparison row, no conflict.
   * The model's classification it replaces measured 46% irreproducible across
   * five draws on identical evidence, and lost 8-0 to the arithmetic wherever
   * both committed.
   *
   * With no computed cycle the field reads unresolved. It does NOT fall back to
   * the model's classification: that field is being deleted, and reading it
   * here would keep it alive past its own removal.
   */
  const cycle: DeskConclusion = resolveComputedCycle(dossier?.computedCycle) ?? {
    label: inFlightLabel ?? (analysed ? UNRESOLVED_LABEL.cycle : NOT_ANALYZED.label),
    tone: 'dim',
    provenance: 'NONE',
    title: analysed && !inFlightLabel ? UNRESOLVED_DETAIL.cycle : null,
  };

  const catalyst = resolveConclusion({
    field: 'catalyst',
    analysed,
    inFlightLabel,
    autoLabel:
      dossier && dossier.catalyst.catalystGrade !== 'UNKNOWN'
        ? CATALYST_GRADE_LABEL[dossier.catalyst.catalystGrade]
        : null,
    autoTone: 'neutral',
    autoTitle: dossier?.catalyst.summary ?? null,
  });

  const structure = resolveConclusion({
    field: 'structure',
    analysed,
    inFlightLabel,
    autoLabel:
      dossier && dossier.structure.structureClassification !== 'UNKNOWN'
        ? STRUCTURE_LABEL[dossier.structure.structureClassification]
        : null,
    autoTone: structureLabelTone(dossier?.structure.structureClassification ?? 'UNKNOWN'),
    autoTitle: dossier?.structure.summary ?? null,
  });

  return { cycle, catalyst, structure };
}

export function buildDeskRead(row: DeskRow): DeskRead {
  const dossier = row.intelligence?.analysis?.dossier ?? null;
  const { cycle, catalyst, structure } = resolveConclusions(row);

  const levels = deskReadLevels(row.levelMap, 3);
  const coverageIncomplete = row.intelligence?.coverageIncomplete === true;

  const whyNow = deskNarrative({ autoText: dossier?.catalyst.summary ?? null, coverageIncomplete });
  const structuralWarning = deskNarrative({
    autoText: dossier?.structure.structuralWarnings[0] ?? null,
    coverageIncomplete,
  });

  return {
    ticker: row.ticker,
    telemetry: row.telemetry,
    cycle,
    catalyst,
    structure,
    nextUp: levels.nextUp,
    nextDown: levels.nextDown,
    airPocketAbove: row.levelMap.airPocketAbove,
    airPocketBelow: row.levelMap.airPocketBelow,
    whyNow,
    structuralWarning,
    structureSummary: buildStructureSummary(row),
    intelligence: row.intelligenceState,
  };
}
