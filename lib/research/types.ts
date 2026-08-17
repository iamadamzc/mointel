/**
 * Automatic Public Intelligence Research — domain types.
 *
 * These describe collected evidence and its interpretation. They deliberately
 * carry no market-demand fields: `DemandState` stays the sole owner of live
 * price/volume/RVOL, exactly as `docs/ARCHITECTURE.md` requires, and the merge
 * layer joins the two without collapsing either.
 *
 * The governing rule throughout: a value a source did not state stays unknown.
 * No enum here has a "probably fine" member, and none of the confidence types
 * default to a high value.
 */

/* --------------------------------------------------------------- job states */

/**
 * Lifecycle of one research job. `NOT_QUEUED` is never stored — it is the
 * absence of a row, and exists so callers can describe that state without
 * reaching for null.
 */
export type ResearchJobStatus =
  | 'NOT_QUEUED'
  | 'QUEUED'
  | 'COLLECTING'
  | 'SOURCES_READY'
  | 'ANALYZING'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'FAILED'
  | 'STALE';

/** Statuses that mean a worker currently owns the job. */
export const ACTIVE_JOB_STATUSES: readonly ResearchJobStatus[] = [
  'COLLECTING',
  'SOURCES_READY',
  'ANALYZING',
];

/** Statuses that mean the job is finished, successfully or not. */
export const TERMINAL_JOB_STATUSES: readonly ResearchJobStatus[] = [
  'COMPLETE',
  'PARTIAL',
  'FAILED',
];

export interface ResearchJob {
  id: number;
  ticker: string;
  tradingDate: string;
  status: ResearchJobStatus;
  /** Soft ordering score. Higher runs first; it never excludes a ticker. */
  priority: number;
  /** Human-readable explanation of why this was queued, for the desk log. */
  reason: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  error: string | null;
  /** Fingerprint of the evidence this job last analyzed. */
  evidenceFingerprint: string | null;
}

/* ---------------------------------------------------------- issuer registry */

/**
 * How confident we are that a ticker maps to a specific SEC registrant.
 * SEC states its ticker/CIK associations are updated periodically and are not
 * guaranteed complete, so a mapping is evidence, not gospel.
 */
export type CikConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface IssuerRecord {
  ticker: string;
  companyName: string | null;
  /** Ten-digit zero-padded CIK, or null when no registrant matched. */
  cik: string | null;
  exchange: string | null;
  /** SEC `stateOrCountry` code; not normalised to a country name. */
  country: string | null;
  /**
   * True when the issuer files on the foreign-private-issuer track (6-K/20-F/
   * 40-F) rather than 8-K/10-Q/10-K. Null when not yet established — this is
   * not a boolean that may default to false.
   */
  foreignIssuer: boolean | null;
  cikConfidence: CikConfidence;
  /** Which mapping source produced the CIK, e.g. company_tickers_exchange. */
  mappingSource: string | null;
  /** Company IR/news URL, persisted so it is not rediscovered every analysis. */
  irUrl: string | null;
  lastVerifiedAt: string | null;
}

/* ----------------------------------------------------------------- evidence */

/**
 * Evidence hierarchy from the specification. Ordering is meaningful: a lower
 * number outranks a higher one, and a secondary aggregator must never override
 * a primary filing.
 */
export type SourceAuthority =
  | 'SEC'
  | 'EXCHANGE'
  | 'COMPANY_IR'
  | 'NEWSWIRE'
  | 'MARKET_DATA'
  | 'SECONDARY';

/** Rank of each authority. Lower wins. */
export const SOURCE_AUTHORITY_RANK: Record<SourceAuthority, number> = {
  SEC: 1,
  EXCHANGE: 2,
  COMPANY_IR: 3,
  NEWSWIRE: 4,
  MARKET_DATA: 5,
  SECONDARY: 6,
};

export type SourceType =
  | 'SEC_FILING'
  | 'SEC_SUBMISSIONS'
  | 'SEC_COMPANY_FACTS'
  | 'COMPANY_RELEASE'
  | 'NEWSWIRE'
  | 'WEB_SEARCH'
  | 'MARKET_HISTORY';

/**
 * One retained piece of public evidence.
 *
 * `excerpt` holds only the limited extracted text analysis needs. Whole
 * articles and whole filings are deliberately not copied into the database —
 * see the source-rights caveat in the specification.
 */
export interface ResearchSource {
  id: number;
  ticker: string;
  sourceType: SourceType;
  title: string | null;
  url: string;
  publishedAt: string | null;
  fetchedAt: string;
  /** SEC accession number, when the source is a filing. */
  accession: string | null;
  /** SEC form type, e.g. 8-K, 6-K, 424B5. */
  secForm: string | null;
  authority: SourceAuthority;
  /**
   * Hash of the normalised body alone. Two different accessions carrying the
   * same text share this, which is what makes recycled or duplicated content
   * detectable. It is deliberately NOT the dedupe key.
   */
  contentHash: string;
  /**
   * Identity of this specific document, including its accession. This is the
   * dedupe key: re-fetching one filing collapses, but two legally distinct
   * filings stay distinct even when their wording is identical.
   */
  documentFingerprint: string;
  excerpt: string | null;
  metadata: Record<string, unknown>;
  /**
   * Whether this source still reflects current state. A superseded prospectus
   * stays stored — it is history, not garbage — but is no longer current.
   */
  active: boolean;
}

/** A source not yet assigned a database id. */
export type NewResearchSource = Omit<ResearchSource, 'id'>;

/* ------------------------------------------------------------- supply ledger */

/**
 * Whether a block of potential supply is actually live.
 *
 * The distinction the specification insists on: registration, effectiveness and
 * eligibility are all separate from anyone actually selling. `KNOWN_ACTIVE`
 * describes supply established as outstanding and unrestricted — never an
 * inference that an unidentified holder is currently dumping.
 */
export type SupplyBlockStatus = 'KNOWN_ACTIVE' | 'POSSIBLY_ACTIVE' | 'NOT_YET_ACTIVE' | 'UNKNOWN';

export type SupplyBlockType =
  | 'REGISTERED_RESALE'
  | 'ATM'
  | 'PIPE'
  | 'WARRANTS'
  | 'CONVERTIBLES'
  | 'EQUITY_PURCHASE_AGREEMENT'
  | 'ACQUISITION_SHARES'
  | 'RECENT_OFFERING'
  | 'SHELF_CAPACITY'
  | 'PREFERRED_CONVERSION'
  | 'OTHER_ISSUED_SHARES';

export interface SupplyBlock {
  type: SupplyBlockType;
  /** Null when only a dollar capacity is known. Never derived from dollars. */
  amountShares: number | null;
  /**
   * Dollar capacity when share terms are not established. A dollar shelf is
   * capacity, not proof shares were issued, and must not be converted to a
   * share count without actual pricing or terms.
   */
  dollarCapacity: number | null;
  sourceFiling: string | null;
  registrationStatus: string | null;
  effectiveDate: string | null;
  terms: string | null;
  holderRestrictions: string | null;
  status: SupplyBlockStatus;
  eligibilityAssessment: string | null;
  evidenceSourceIds: number[];
  confidence: Confidence;
}

/* ----------------------------------------------------------- classifications */

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type CatalystStatus =
  | 'FRESH_FOUND'
  | 'SECONDARY_STALE'
  | 'NONE_FOUND'
  | 'CONFLICTING'
  | 'UNKNOWN';

/**
 * `FLOW_DOMINANT` requires affirmative live-demand evidence. Finding no news is
 * not evidence of flow; that case is `NONE_IDENTIFIED`.
 */
export type CatalystType = 'NEWS_DRIVEN' | 'FLOW_DOMINANT' | 'SECONDARY_STALE' | 'NONE_IDENTIFIED';

/** Maps onto the desk's existing catalyst language. */
export type CatalystGrade =
  | 'STRONG'
  | 'LEGITIMATE_POSITIVE'
  | 'MODERATE_MIXED_SECONDARY'
  | 'WEAK_NEGATIVE_DILUTIVE'
  | 'NONE';

export type CatalystFreshness = 'FRESH' | 'RECENT' | 'STALE' | 'UNKNOWN';

/**
 * Exact string shown when the configured source search located no fresh
 * catalyst. Required verbatim by the specification — vague substitutes are a
 * regression, so it is a constant and a test asserts it.
 */
export const NO_FRESH_CATALYST_FOUND = 'NO FRESH CATALYST FOUND';

/**
 * `CLEAN` requires affirmative evidence supporting it. The absence of a warning
 * is not evidence of cleanliness; that case is `UNKNOWN`.
 */
export type StructureClassification = 'CLEAN' | 'CAUTION' | 'DIRTY_FLOAT' | 'UNKNOWN';

/** Existing product cycle categories; not redefined here. */
export type CycleClassification =
  | 'GREEN_FRESH_FRONTSIDE'
  | 'YELLOW_FRONTSIDE_WARNING'
  | 'RED_BACKSIDE'
  | 'UNKNOWN';

/* ------------------------------------------------------------------ dossier */

export interface CatalystFindings {
  catalystStatus: CatalystStatus;
  catalystType: CatalystType;
  catalystGrade: CatalystGrade;
  summary: string | null;
  eventTimestamp: string | null;
  freshness: CatalystFreshness;
  whyTradersMayCare: string | null;
  plausiblyExplainsMove: boolean | null;
  confidence: Confidence;
  evidenceSourceIds: number[];
}

export interface StructureFindings {
  sharesOutstanding: number | null;
  sharesOutstandingDate: string | null;
  /**
   * Only ever a sourced float figure. Shares outstanding is not float and
   * market cap is not float; when no source states a float, this stays null and
   * `floatConfidence` stays `UNKNOWN`.
   */
  displayedFloat: number | null;
  displayedFloatSource: string | null;
  floatConfidence: Confidence;
  structureClassification: StructureClassification;
  supplyLedger: SupplyBlock[];
  structuralWarnings: string[];
  reverseSplitHistory: string[];
  knownRegistrationStatus: string | null;
  summary: string | null;
  confidence: Confidence;
  evidenceSourceIds: number[];
}

export interface CycleFindings {
  cycleClassification: CycleClassification;
  reasoning: string | null;
  /**
   * Populated only when the current cycle's boundary is actually established.
   * A 52-week high, an old run high or historical resistance must never land
   * here — they belong in `historicalResistance`. This is the FIEE regression.
   */
  currentCycleHigh: number | null;
  currentCycleHighConfidence: Confidence;
  historicalResistance: number | null;
  formerRunnerStatus: string | null;
  recentMajorRuns: string[];
  confidence: Confidence;
  evidenceSourceIds: number[];
}

export interface ResearchDossier {
  ticker: string;
  companyName: string | null;
  cik: string | null;
  country: string | null;
  foreignIssuer: boolean | null;
  catalyst: CatalystFindings;
  structure: StructureFindings;
  cycle: CycleFindings;
}

/* --------------------------------------------------------------- provenance */

/** Where a displayed conclusion came from. */
export type ResearchProvenance = 'SHEET' | 'AUTO' | 'SHEET_AND_AUTO' | 'CONFLICT';

export interface ResearchAnalysisVersion {
  id: number;
  ticker: string;
  generatedAt: string;
  evidenceFingerprint: string;
  /** Model that produced this version, or null for a deterministic pass. */
  model: string | null;
  /** Schema version of the dossier, so old rows stay readable. */
  analysisVersion: number;
  dossier: ResearchDossier;
  sourceIds: number[];
  /** Version this one replaces, forming a reconstructible chain. */
  supersedesId: number | null;
}

/** Current dossier schema version. Bump when the shape changes. */
export const ANALYSIS_VERSION = 1;

/* ----------------------------------------------------------- worker health */

export type ResearchHealthState = 'OFFLINE' | 'IDLE' | 'WORKING' | 'DEGRADED' | 'ERROR';

export interface ResearchHealth {
  state: ResearchHealthState;
  queuedJobs: number;
  activeJobs: string[];
  lastCompletedTicker: string | null;
  lastCompletedAt: string | null;
  /** Whether SEC fetching is configured and answering. Never holds a key. */
  secAvailable: boolean;
  secDetail: string | null;
  /** Whether an interpreter is configured. Never holds a key. */
  modelAvailable: boolean;
  modelDetail: string | null;
  updatedAt: string;
}
