/**
 * Normalized application types for the Momentum Intelligence Trading Desk.
 *
 * The UI depends ONLY on these types. Google Sheets is a temporary prototype
 * data store; any future provider (PostgreSQL, market-data API, internal
 * service) must satisfy these shapes so the product does not have to be
 * rewritten when the source changes.
 */

/** Which trading session produced the value currently being displayed. */
export type SessionKind = 'PM' | 'AH' | 'RTH' | 'NONE';

/** Coarse bucket derived from free-text priority, used for filtering/sorting only. */
export type PriorityBucket = 'A' | 'B' | 'C' | 'AVOID' | 'EXCLUDED' | 'UNCLASSIFIED';

/** Coarse bucket derived from free-text momentum cycle text. */
export type CycleState =
  | 'FRESH_FRONTSIDE'
  | 'FRONTSIDE_WARNING'
  | 'BACKSIDE'
  | 'UNCLASSIFIED';

/** Coarse bucket derived from free-text catalyst grade. */
export type CatalystGradeBucket = 'A' | 'B' | 'C' | 'UNCLASSIFIED';

/**
 * Structure state is only ever asserted when the source text says so.
 * `UNCLASSIFIED` means "the source did not tell us" — it must never be
 * rendered or reasoned about as CLEAN.
 */
export type StructureState =
  | 'DIRTY_FLOAT'
  | 'UNKNOWN_STRUCTURE'
  | 'CLEAN'
  | 'UNCLASSIFIED';

/**
 * A spreadsheet value that may or may not be numeric.
 *
 * `display` is always what a human should see (original formatting preserved).
 * `value` is populated only when a number could be parsed with confidence.
 * `isUnknown` marks explicit Unknown/UNKNOWN/N/A source text — which is
 * information, not zero.
 */
export interface NumericField {
  /** Original cell text, trimmed. Empty string when the cell was blank. */
  raw: string;
  /** Human-facing string. Falls back to an em dash when there is nothing to show. */
  display: string;
  /** Parsed number, or null when the text is not confidently numeric. */
  value: number | null;
  /** True when the source explicitly said Unknown / UNKNOWN / N/A. */
  isUnknown: boolean;
}

/** A value carrying both the currently-effective reading and its origin. */
export interface SessionValue extends NumericField {
  session: SessionKind;
}

export interface PriorityField {
  /** Currently effective priority text (Revised Priority when present). */
  raw: string;
  display: string;
  bucket: PriorityBucket;
  /** True when Revised Priority overrode the original Priority. */
  isRevised: boolean;
  /** The original TODAY!Priority text, always preserved. */
  originalRaw: string;
}

export interface CycleField {
  raw: string;
  display: string;
  state: CycleState;
}

export interface CatalystField {
  gradeRaw: string;
  gradeBucket: CatalystGradeBucket;
  /** PM Catalyst/Update when present, otherwise the original Catalyst. */
  latest: string;
  /** Always the TODAY!Catalyst text. */
  original: string;
  /** Timestamp matching `latest`. */
  latestTime: string;
  originalTime: string;
  /** True when a premarket update superseded the original catalyst. */
  hasPremarketUpdate: boolean;
}

export interface StructureField {
  /** TODAY!Structure Flags, verbatim. */
  raw: string;
  /** TODAY!Float, verbatim — often carries UNKNOWN / DIRTY FLOAT rather than a number. */
  floatRaw: string;
  state: StructureState;
  /** Short badge labels explicitly supported by the source text. */
  badges: string[];
}

export interface WarningField {
  /** PM Warning Shot when present, otherwise Warning Shot. */
  current: string;
  /** Always the TODAY!Warning Shot text. */
  original: string;
  source: 'PM' | 'RTH' | 'NONE';
}

/** One row of the TODAY tab, normalized. */
export interface MomentumTicker {
  ticker: string;
  /** 1-based row number in the TODAY tab; stable key for a given sync. */
  sourceRow: number;
  country: string;

  /*
   * NO `priority` (removed 2026-10-05, Web). The desk shows its own Setup grade
   * (his ruling 22:04:14.942Z, transcript 1b01d57c) and nothing reads the
   * Sheet's A/B/C/AVOID any more (Design, f9110751). Absent from the type, it
   * cannot reach /api/dashboard, the review API, either page's first paint or
   * the MCP tools, and a new reader fails to compile. rows.ts still reads the
   * column for the change signature only.
   */
  cycle: CycleField;
  catalyst: CatalystField;
  structure: StructureField;
  warning: WarningField;

  price: SessionValue;
  changePct: SessionValue;
  volume: SessionValue;

  rthClose: NumericField;
  ahPrice: NumericField;
  ahChangePct: NumericField;
  ahVolume: NumericField;
  pmPrice: NumericField;
  pmChangePct: NumericField;
  pmVolume: NumericField;

  float: NumericField;
  /**
   * The share count stated INSIDE the float cell, beside the float itself.
   *
   * `"537,665 displayed; 785,655 SO"` -- one author, one cell, one instant.
   *
   * DELIBERATELY NOT NAMED `sharesOutstanding`. `StructuralResearch` already
   * has a field by that name, read from a DIFFERENT CELL with its own
   * `floatSourceDate`, and the two are indistinguishable at a call site: both
   * are `NumericField`, both hold a share count, both typecheck, and reaching
   * for the wrong one passes every test.
   *
   * WHAT THE SWAP WOULD COST is the reason the name is long. Item 28 recorded
   * the float and the share count as "asynchronous by construction" -- written
   * at different times, so a comparison between them proves nothing. The
   * trader dissolved that by stating both in one cell, AND THAT IS THE ONLY
   * REASON `assessSheetPair` IS SOUND. A pair assembled from two cells does
   * not give a weaker verdict, it gives a WRONG one -- and IMPOSSIBLE is the
   * one most likely to fire falsely, because issuance between two cells' write
   * times is ordinary. The desk's strongest check would become its loudest
   * false positive.
   *
   * THE VALIDITY IS A PROPERTY OF PROVENANCE, NOT OF THE TWO NUMBERS.
   */
  floatCellShares: NumericField;
  recentRunHigh: NumericField;
  flushFromHighPct: NumericField;

  priorRunner: string;
  keyLevels: string;
  confirmation: string;
  notes: string;

  /** Timestamp text describing when this row was last meaningfully updated. */
  updatedLabel: string;

  /** Cheap signature used client-side to detect meaningful changes between polls. */
  changeSignature: string;
}

/** One row of the RESEARCH tab, normalized. */
export interface StructuralResearch {
  ticker: string;
  sourceRow: number;
  reportDate: string;
  /** Parsed report date for "most recent record wins" selection; null when unparseable. */
  reportDateValue: number | null;

  company: string;
  country: string;

  rthClose: NumericField;
  ahPrice: NumericField;
  ahChangePct: NumericField;
  ahVolume: NumericField;

  float: NumericField;
  /**
   * The share count stated INSIDE the float cell, beside the float itself.
   *
   * `"537,665 displayed; 785,655 SO"` -- one author, one cell, one instant.
   *
   * DELIBERATELY NOT NAMED `sharesOutstanding`. `StructuralResearch` already
   * has a field by that name, read from a DIFFERENT CELL with its own
   * `floatSourceDate`, and the two are indistinguishable at a call site: both
   * are `NumericField`, both hold a share count, both typecheck, and reaching
   * for the wrong one passes every test.
   *
   * WHAT THE SWAP WOULD COST is the reason the name is long. Item 28 recorded
   * the float and the share count as "asynchronous by construction" -- written
   * at different times, so a comparison between them proves nothing. The
   * trader dissolved that by stating both in one cell, AND THAT IS THE ONLY
   * REASON `assessSheetPair` IS SOUND. A pair assembled from two cells does
   * not give a weaker verdict, it gives a WRONG one -- and IMPOSSIBLE is the
   * one most likely to fire falsely, because issuance between two cells' write
   * times is ordinary. The desk's strongest check would become its loudest
   * false positive.
   *
   * THE VALIDITY IS A PROPERTY OF PROVENANCE, NOT OF THE TWO NUMBERS.
   */
  floatCellShares: NumericField;
  floatSourceDate: string;
  floatSourceUrls: string[];
  /**
   * RESEARCH column 11 -- ITS OWN CELL, with its own `floatSourceDate`.
   *
   * NOT the counterpart of `float`. For anything comparing a float against a
   * share count, use `floatCellShares`, which comes from the same cell at the
   * same instant. This one may have been written days apart from the float and
   * a comparison against it proves nothing -- see `floatCellShares`.
   */
  sharesOutstanding: NumericField;

  catalystDetails: string;
  catalystTimestamp: string;
  catalystGradeRaw: string;
  catalystGradeBucket: CatalystGradeBucket;
  catalystSourceUrls: string[];

  recentCycleHigh: NumericField;
  flushFromHighPct: NumericField;
  cycleClassificationRaw: string;
  cycleState: CycleState;
  cycleReasoning: string;
  recentMajorRuns: string;
  historicalRunnerNotes: string;
  splitHistory: string;

  dailyResistance: string;
  dailySupport: string;

  currentReports: string;
  registrationProspectus: string;
  offeringsAtmPipe: string;
  warrantsConvertibles: string;
  otherShareStructure: string;
  structureSourceUrls: string[];
  warningFlags: string;

  // No overallPriorityRaw/Bucket (removed 2026-10-05, Web): the Sheet's
  // priority verdict, read by nothing since the Researched Names table went.
  analystNotes: string;

  floatQualityRaw: string;
  floatQualityState: StructureState;
  overhangFloat: string;
  supplyEvidence: string;
}

/** Aggregate counts for the market summary strip. Derived only from explicit classifications. */
export interface MarketSummary {
  namesTracked: number;
  freshFrontside: number;
  frontsideWarning: number;
  backside: number;
  dirtyFloat: number;
  strongCatalysts: number;
}

/**
 * `none`: no outside research source is configured. Not a fault: the Sheet is
 * being removed (his ruling, `docs/sheet-removal-plan-2026-10-03.md`), and a
 * desk without it serves an empty list rather than demo rows.
 */
export type ProviderKind = 'google-sheets' | 'mock' | 'none';

/** Freshness / provenance metadata attached to every dashboard payload. */
export interface DataSourceMeta {
  provider: ProviderKind;
  /** ISO timestamp of the successful upstream read this payload came from. */
  fetchedAt: string;
  /** Upstream document modification time when the provider can supply one. */
  sourceUpdatedAt: string | null;
  /** True when the payload is being served after an upstream failure. */
  stale: boolean;
  /** Human-readable reason for the stale/degraded state, if any. */
  error: string | null;
  /** Age of the cached payload, in milliseconds, at response time. */
  cacheAgeMs: number;
  /** Upstream document title, when known. */
  sourceTitle: string | null;
  /** Non-fatal problems encountered while normalizing (bad rows, etc.). */
  warnings: string[];
}

/** The complete payload served by `/api/dashboard`. */
export interface DashboardState {
  tickers: MomentumTicker[];
  /** RESEARCH records keyed by uppercase ticker — most recent report date wins. */
  research: Record<string, StructuralResearch>;
  summary: MarketSummary;
  meta: DataSourceMeta;
}

/** Contract every data source must implement. */
export interface DashboardDataProvider {
  readonly kind: ProviderKind;
  /** Reads the upstream source and returns a fully normalized payload. */
  load(): Promise<Omit<DashboardState, 'meta'> & { meta: Omit<DataSourceMeta, 'cacheAgeMs' | 'stale'> }>;
}
