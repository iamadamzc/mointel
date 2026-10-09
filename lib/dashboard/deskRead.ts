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

import {
  materialConflictFields,
  type IntelligenceState,
} from '@/lib/dashboard/intelligence';
import type { DeskRow } from '@/lib/dashboard/merge';
import { floatClaimReading, type FloatClaimReading } from '@/lib/dashboard/supply';
import type { MarketTelemetry } from '@/lib/dashboard/telemetry';
import {
  levelTypeLabel,
  selectForBoard,
  type LevelMap,
  type LevelZone,
} from '@/lib/data/priceLevels';
import type { FieldComparison } from '@/lib/research/merge/sheetAuto';
import type { StructureClassification, SupplyBlock } from '@/lib/research/types';
import { CATALYST_GRADE_LABEL, STRUCTURE_LABEL } from '@/lib/research/view';

import { resolveComputedCycle } from './cycle';

/** Mirrors the badge tones the components already use. */
export type ReadTone = 'pos' | 'warn' | 'neg' | 'accent' | 'neutral' | 'dim';

/**
 * Where a displayed conclusion came from.
 *
 * `COMPUTED` sits outside the Sheet/Auto axis rather than being a third value
 * on it. A conclusion derived from bars has no counterparty to agree or
 * disagree with, so it can never be `SHEET_AUTO` or `CONFLICT`, and a surface
 * rendering it as either would be inventing a second opinion.
 */
export type ConclusionProvenance =
  | 'SHEET'
  | 'AUTO'
  | 'SHEET_AUTO'
  | 'CONFLICT'
  | 'COMPUTED'
  | 'NONE';

export interface DeskConclusion {
  label: string;
  tone: ReadTone;
  provenance: ConclusionProvenance;
  /** Full source text for the hover title; never truncated here. */
  title: string | null;
  /** The other side's conclusion, present only when the two disagree. */
  otherLabel: string | null;
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
  /** Float as a figure, or the word the source used for not knowing. */
  float: string;
  /**
   * The desk's verdict on that float, against its own filed share count.
   *
   * Null when there is no float to judge, or no filed count to judge it
   * against. A surface renders the number and the verdict TOGETHER or renders
   * neither — an unqualified float is the number he is most likely to act on
   * and the one the desk can least stand behind.
   */
  floatCheck: FloatClaimReading | null;
  /**
   * The model's confidence in the DOSSIER's float extraction.
   *
   * Kept for consumers that read the dossier, and deliberately NOT rendered
   * beside `float`, which is the Sheet's number: a confidence describing one
   * number, printed against another, is a label that is false without context.
   */
  floatConfidence: string;
  supply: SupplyLine[];
  /** First structural warning, verbatim. Null when none was recorded. */
  keyWarning: string | null;
}

/**
 * A trader-facing narrative line and where it stands between the two sources.
 *
 * `qualifier` is how a limitation gets disclosed without discarding what is
 * known: the sheet's earnings catalyst stays on screen and "AUTO COVERAGE
 * INCOMPLETE" sits beside it, rather than the automatic layer's "no explanation
 * can be established" replacing a conclusion a human already reached.
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
  /** Short disclosure, e.g. "AUTO COVERAGE INCOMPLETE". Null when none applies. */
  qualifier: string | null;
  /** The other source's text, kept only when the two materially disagree. */
  counterText: string | null;
  counterLabel: string | null;
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
  otherLabel: null,
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

function sheetStructureTone(state: string): ReadTone {
  switch (state) {
    case 'DIRTY_FLOAT':
      return 'neg';
    case 'UNKNOWN_STRUCTURE':
      return 'warn';
    case 'CLEAN':
      return 'pos';
    default:
      return 'dim';
  }
}

function catalystBucketTone(bucket: string): ReadTone {
  switch (bucket) {
    case 'A':
      return 'pos';
    case 'B':
      return 'neutral';
    case 'C':
      return 'warn';
    default:
      return 'dim';
  }
}

/**
 * Picks the conclusion to lead with, and says where it came from.
 *
 * The sheet leads when it has one: it is reviewed work in the desk's own
 * language. The automatic layer fills the gap when the sheet is silent. Neither
 * ever overwrites the other — when they disagree, both labels survive and the
 * provenance says CONFLICT, because the disagreement is itself the finding.
 */
function resolveConclusion(options: {
  sheetLabel: string | null;
  sheetTone: ReadTone;
  sheetTitle: string | null;
  autoLabel: string | null;
  autoTone: ReadTone;
  autoTitle: string | null;
  comparison: FieldComparison | undefined;
  /** Only a genuine difference of judgement, not an automatic coverage gap. */
  conflicted: boolean;
  field: DeskField;
  /** True when some usable analysis exists for this ticker, from either side. */
  analysed: boolean;
  /**
   * What to say when nothing is analysed yet but work is under way, e.g.
   * ANALYSIS PENDING. Null when the ticker genuinely has nothing happening.
   */
  inFlightLabel: string | null;
}): DeskConclusion {
  const { sheetLabel, autoLabel, comparison, conflicted, field } = options;

  if (sheetLabel) {
    return {
      label: sheetLabel,
      tone: conflicted ? 'warn' : options.sheetTone,
      provenance: conflicted
        ? 'CONFLICT'
        : comparison?.agreement === 'AGREE'
          ? 'SHEET_AUTO'
          : 'SHEET',
      title: options.sheetTitle,
      otherLabel: conflicted ? autoLabel : null,
    };
  }

  if (autoLabel) {
    return {
      label: autoLabel,
      tone: options.autoTone,
      provenance: 'AUTO',
      title: options.autoTitle,
      otherLabel: null,
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
      otherLabel: null,
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
      otherLabel: null,
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
    /*
     * THE ROW'S FLOAT, NOT THE DOSSIER'S, AND THEY ARE DIFFERENT FIELDS.
     *
     * `row.displayedFloat` is what the board sorts on, what turnover divides
     * by and what the risk chip prints; `structure.displayedFloat` is the
     * model's own extraction and reaches no other surface. The drawer showing
     * the second while every other surface shows the first is F-19 — two
     * values for one field, on two screens, with no reconciliation. One claim
     * for the whole desk, and it is the one the rest of the desk already uses.
     */
    float: row.displayedFloat === null ? 'Unknown' : row.displayedFloat.toLocaleString(),
    floatCheck: floatClaimReading(row.floatCheck),
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
  counterText: null,
  counterLabel: null,
};

/**
 * Merges the two sources into one trader-facing line.
 *
 * The defect this replaces: the automatic text won whenever it existed. FIEE
 * therefore led with "no company-specific explanation can be established from
 * the supplied evidence" while its own Desk Read badge read A — STRONG/FRESH,
 * because the sheet's reviewed earnings catalyst was silently outranked by an
 * automatic pass that had admitted its coverage was incomplete.
 *
 * The rule is that a source cannot override the other side with its own absence
 * of evidence. An incomplete automatic pass qualifies the sheet conclusion; it
 * does not replace it. A genuine disagreement is shown as a disagreement, with
 * no winner picked here.
 */
function mergeNarrative(options: {
  sheetText: string | null;
  autoText: string | null;
  /** The automatic side reached a usable conclusion on this field. */
  autoUsable: boolean;
  /** Deterministic collection recorded gaps. */
  coverageIncomplete: boolean;
  /** The two sources materially disagree on this field. */
  conflict: boolean;
  /** The other side's conclusion label, for the conflict case. */
  autoLabel: string | null;
}): DeskNarrative {
  const sheetText = options.sheetText?.trim() || null;
  const autoText = options.autoText?.trim() || null;

  if (!sheetText && !autoText) return EMPTY_NARRATIVE;

  if (options.conflict && sheetText && autoText) {
    // Both sides reached a conclusion and they differ. The outside read leads
    // because it is reviewed work, but the automatic reading stays visible and
    // the state is named. Nothing is resolved here.
    return {
      text: condense(sheetText),
      fullText: sheetText,
      provenance: 'CONFLICT',
      qualifier: 'SOURCES DISAGREE',
      counterText: condense(autoText),
      counterLabel: options.autoLabel,
    };
  }

  if (sheetText && autoText && options.autoUsable && !options.coverageIncomplete) {
    // Agreement. The automatic text is the more specific of the two — it is
    // written against linked evidence — so it carries the agreed conclusion.
    return {
      text: condense(autoText),
      fullText: autoText,
      provenance: 'SHEET_AUTO',
      qualifier: null,
      counterText: null,
      counterLabel: null,
    };
  }

  if (sheetText) {
    // Either the automatic side has nothing usable, or it admitted incomplete
    // coverage. Known human intelligence is not downgraded to UNKNOWN for that.
    const incomplete = autoText !== null || options.coverageIncomplete || !options.autoUsable;
    return {
      text: condense(sheetText),
      fullText: sheetText,
      provenance: 'SHEET',
      qualifier: incomplete && (options.coverageIncomplete || !options.autoUsable)
        ? 'AUTO COVERAGE INCOMPLETE'
        : null,
      counterText: null,
      counterLabel: null,
    };
  }

  return {
    text: condense(autoText as string),
    fullText: autoText,
    provenance: 'AUTO',
    qualifier: options.coverageIncomplete ? 'AUTO COVERAGE INCOMPLETE' : null,
    counterText: null,
    counterLabel: null,
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
  const sheet = row.research;
  const dossier = row.intelligence?.analysis?.dossier ?? null;
  const byField = new Map(
    (row.comparison?.comparisons ?? []).map((item) => [item.field, item] as const),
  );

  /*
   * Only a genuine difference of judgement counts as a conflict here.
   *
   * When the automatic side disagrees because it had less evidence, the honest
   * presentation is the human conclusion with the coverage gap disclosed — not
   * a CONFLICT badge that would fire on most partially-covered names.
   */
  const conflicted = materialConflictFields(row.comparison);

  // Some usable analysis exists, even if this particular field has no answer.
  const analysed = row.intelligenceState.hasSheet || row.intelligenceState.hasAuto;
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
    otherLabel: null,
  };

  const catalyst = resolveConclusion({
    field: 'catalyst',
    analysed,
    inFlightLabel,
    sheetLabel:
      sheet && sheet.catalyst.gradeBucket !== 'UNCLASSIFIED'
        ? sheet.catalyst.gradeRaw || sheet.catalyst.gradeBucket
        : null,
    sheetTone: catalystBucketTone(sheet?.catalyst.gradeBucket ?? ''),
    sheetTitle: sheet?.catalyst.latest || null,
    autoLabel:
      dossier && dossier.catalyst.catalystGrade !== 'UNKNOWN'
        ? CATALYST_GRADE_LABEL[dossier.catalyst.catalystGrade]
        : null,
    autoTone: 'neutral',
    autoTitle: dossier?.catalyst.summary ?? null,
    comparison: byField.get('catalyst'),
    conflicted: conflicted.has('catalyst'),
  });

  const structure = resolveConclusion({
    field: 'structure',
    analysed,
    inFlightLabel,
    sheetLabel:
      sheet && sheet.structure.state !== 'UNCLASSIFIED'
        ? sheet.structure.state.replace(/_/g, ' ')
        : null,
    sheetTone: sheetStructureTone(sheet?.structure.state ?? ''),
    sheetTitle: sheet?.structure.raw || sheet?.structure.floatRaw || null,
    autoLabel:
      dossier && dossier.structure.structureClassification !== 'UNKNOWN'
        ? STRUCTURE_LABEL[dossier.structure.structureClassification]
        : null,
    autoTone: structureLabelTone(dossier?.structure.structureClassification ?? 'UNKNOWN'),
    autoTitle: dossier?.structure.summary ?? null,
    comparison: byField.get('structure'),
    conflicted: conflicted.has('structure'),
  });

  return { cycle, catalyst, structure };
}

export function buildDeskRead(row: DeskRow): DeskRead {
  const sheet = row.research;
  const dossier = row.intelligence?.analysis?.dossier ?? null;
  const conflicted = materialConflictFields(row.comparison);
  const { cycle, catalyst, structure } = resolveConclusions(row);

  const levels = deskReadLevels(row.levelMap, 3);
  const coverageIncomplete = row.intelligence?.coverageIncomplete === true;

  const whyNow = mergeNarrative({
    sheetText: sheet?.catalyst.latest ?? null,
    autoText: dossier?.catalyst.summary ?? null,
    autoUsable: dossier ? dossier.catalyst.catalystGrade !== 'UNKNOWN' : false,
    coverageIncomplete,
    conflict: conflicted.has('catalyst'),
    autoLabel: catalyst.provenance === 'CONFLICT' ? catalyst.otherLabel : null,
  });

  /*
   * The structural warning follows the same rule.
   *
   * A sheet DIRTY_FLOAT beside an incomplete automatic CAUTION must not quietly
   * read as CAUTION here — the conclusion badge already keeps the human call,
   * and the narrative keeps the human warning with the automatic limitation
   * disclosed next to it.
   */
  const structuralWarning = mergeNarrative({
    sheetText:
      row.researchRecord?.warningFlags?.trim() || sheet?.structure.raw?.trim() || null,
    autoText: dossier?.structure.structuralWarnings[0] ?? null,
    autoUsable: dossier ? dossier.structure.structureClassification !== 'UNKNOWN' : false,
    coverageIncomplete,
    conflict: conflicted.has('structure'),
    autoLabel: structure.provenance === 'CONFLICT' ? structure.otherLabel : null,
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
