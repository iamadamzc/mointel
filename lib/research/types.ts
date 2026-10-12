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

import type { FloatBasis } from './float';
import type { CatalystDealStatus, CatalystEvent, CatalystTheme } from './interpret/catalystTheme';
import type { SupplyOverhangAssessment, SupplyPair } from './supply';
import type { CycleHistory } from '../market/cycle';
import type { TimePrecision } from './time';

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
  /* Lifecycle stamps, for time-to-intelligence. */
  top12At: string | null;
  /**
   * The demand episode that created this job, recorded at queue time.
   *
   * Read rather than recomputed: rank moves between qualification and
   * execution, so deciding materiality when collection begins would judge a
   * different moment than the one that justified the work.
   */
  trigger: string | null;
  sourcesReadyAt: string | null;
  analysisStartedAt: string | null;
  acceptedAt: string | null;
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
  /**
   * EDGAR's SIC industry label, from the submissions response. Optional:
   * a store before schema v28 has no column, and a record built without a
   * submissions fetch has nothing to say. Absent reads as unknown.
   */
  sicDescription?: string | null;
  cikConfidence: CikConfidence;
  /** Which mapping source produced the CIK, e.g. company_tickers_exchange. */
  mappingSource: string | null;
  /** Company IR/news URL, persisted so it is not rediscovered every analysis. */
  irUrl: string | null;
  lastVerifiedAt: string | null;
  /** Reusable company-source metadata; see CompanySourceRegistry. */
  companySources?: CompanySourceRegistry;
}

/**
 * Where an issuer publishes its own news.
 *
 * Persisted per issuer and reused. Rediscovering a company's newsroom on every
 * refresh would burn a web-discovery call to learn something that does not
 * change, which is exactly what the cheap-first rule exists to prevent.
 */
export interface CompanySourceRegistry {
  investorRelationsUrl: string | null;
  newsroomUrl: string | null;
  pressReleaseIndexUrl: string | null;
  /**
   * What the stored location actually is.
   *
   * A feed or an index will list an announcement that has not happened yet; a
   * single article never will. Recording the difference is what stops a leaf
   * page from counting as a usable source, ending resolution and freezing the
   * issuer on whatever it said that day. Null means it was stored before this
   * distinction existed and cannot be trusted.
   */
  sourceShape: 'FEED' | 'INDEX' | 'ARTICLE' | null;
  /** RSS or Atom feed, when the issuer publishes one. Cheapest source of all. */
  feedUrl: string | null;
  /** How these were found: SEC filing, web discovery, manual. */
  discoveryMethod: string | null;
  confidence: Confidence;
  lastVerifiedAt: string | null;
  /** Why a source could not be established or used, when that is the case. */
  note: string | null;
  /**
   * When web discovery last ran for this issuer, and the evidence fingerprint
   * it ran against.
   *
   * Both are needed to honour the cheap-first rule. A ticker with no recent
   * news satisfies "nothing recent found" on every single poll, so without
   * remembering the last attempt, that condition alone would re-trigger a paid
   * discovery call every minute for exactly the quiet names least likely to
   * reward one.
   */
  lastDiscoveryAt: string | null;
  lastDiscoveryFingerprint: string | null;
  /**
   * Which paid tier ran on the last eligible pass.
   *
   * An issuer with no known publishing location needs two different things: to
   * be told WHERE it publishes (the resolver) and to be told WHAT it published
   * (general web search). Running both on one pass would double the model spend
   * for exactly the names that resolve worst, so they alternate — one call per
   * eligible pass, both capabilities within two. Once a usable source is known
   * the resolver stops being offered a turn at all.
   */
  lastDiscoveryMode: 'RESOLVER' | 'DISCOVERY' | null;
  /**
   * Which resolver implementation last processed this issuer.
   *
   * Rows written before the resolver was wired into production carry a stale
   * value, and their populated lastDiscoveryAt would otherwise suppress the
   * repair forever: the urgent path keys on never-attempted, and these issuers
   * have all been attempted — by a code path that could not succeed. Bumping
   * the version makes exactly those rows eligible for one recovery episode,
   * without clearing a timestamp or naming a ticker.
   */
  resolverVersion: number | null;
}

export const EMPTY_COMPANY_SOURCES: CompanySourceRegistry = {
  investorRelationsUrl: null,
  newsroomUrl: null,
  pressReleaseIndexUrl: null,
  feedUrl: null,
  discoveryMethod: null,
  confidence: 'UNKNOWN',
  lastVerifiedAt: null,
  note: null,
  lastDiscoveryAt: null,
  lastDiscoveryFingerprint: null,
  lastDiscoveryMode: null,
  resolverVersion: null,
  sourceShape: null,
};

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
  | 'SEC_EXHIBIT'
  | 'SEC_SUBMISSIONS'
  | 'SEC_COMPANY_FACTS'
  | 'COMPANY_IR'
  | 'COMPANY_NEWSROOM'
  | 'COMPANY_RELEASE'
  | 'NEWSWIRE'
  | 'SECONDARY_DISCOVERY'
  /** An item from a news adapter (lib/research/news); authority says whether its wire was recovered. */
  | 'NEWS_FEED'
  | 'WEB_SEARCH'
  | 'MARKET_HISTORY';

/**
 * Factual state of catalyst source collection.
 *
 * Deliberately not a verdict. "No recent source located" is a statement about
 * our coverage, not about whether a catalyst exists — that judgement, and the
 * phrase NO FRESH CATALYST FOUND, belong to Phase 4 after coverage is weighed.
 */
export type CatalystCollectionState =
  | 'RECENT_SOURCE_LOCATED'
  | 'NO_RECENT_SOURCE_LOCATED'
  | 'COVERAGE_INCOMPLETE'
  | 'SOURCE_DISCOVERY_FAILED';

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
  /**
   * Groups copies of one underlying announcement. The same release routinely
   * exists as an SEC exhibit, an IR post and a newswire item; those are three
   * source records but one event, and counting them as three catalysts would
   * badly misrepresent what happened.
   */
  clusterId: string | null;
  /** True for the highest-authority member of its cluster. */
  canonical: boolean;
  /** Publication time with its precision; see lib/research/time.ts. */
  publishedPrecision: TimePrecision;
}

/**
 * A source not yet assigned a database id.
 *
 * Cluster membership and canonical status are optional because they are decided
 * by the clustering pass after collection, not by the collector that found the
 * document. A collector states what it found; it does not decide which copy of
 * an announcement wins.
 */
export type NewResearchSource = Omit<
  ResearchSource,
  'id' | 'clusterId' | 'canonical' | 'publishedPrecision'
> &
  Partial<Pick<ResearchSource, 'clusterId' | 'canonical' | 'publishedPrecision'>>;

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

/**
 * A deterministic floor under the supply-to-float ratio.
 *
 * Derived after interpretation, never produced by the model, and deliberately
 * not a float estimate. The desk has no float source at all — every float on
 * the board comes from the spreadsheet — so the honest move is a bound rather
 * than a number.
 *
 * The arithmetic: float can never exceed shares outstanding, so dividing
 * established live supply by the share count can only UNDERSTATE the true
 * supply-to-float ratio. That makes the result a lower bound, and a lower bound
 * at or above 1.0 settles the question without a float ever being known —
 * supply equals or exceeds every share in existence, so it necessarily equals
 * or exceeds the float.
 *
 * The numerator counts only KNOWN_ACTIVE blocks carrying a real share count.
 * Anything weaker would break the guarantee: to stay a lower bound the
 * numerator must under-count, so possible-but-unproven supply, warrants that
 * may never be exercised, and dollar shelf capacity are all excluded. A bound
 * below 1.0 therefore means "not proven from established supply alone", never
 * "clean".
 */
/**
 * Materiality band for a supply bound.
 *
 * A single boolean at 1.0 treated 26,768 acquisition shares and 21,254,106
 * registered resale shares as the same finding, which they are not — the
 * observed blocks span three orders of magnitude. Banding is on the RATIO, not
 * the raw count, because a million shares is noise against a 45M base and fatal
 * against a 1.9M float.
 *
 * The bands are not symmetric in what they license. Because the denominator is
 * an upper bound on float, a HIGH band is conclusive — the true ratio is at
 * least that — while NEGLIGIBLE proves almost nothing, since 1% of shares
 * outstanding could be 5% of a float that is a fifth of the share count. So
 * NEGLIGIBLE only removes a veto; it is never evidence for CLEAN.
 */
export type SupplyBand =
  | 'NEGLIGIBLE'
  | 'PRESENT'
  | 'HEAVY'
  | 'SEVERE'
  | 'EXCEEDS_SHARE_COUNT';

export interface SupplyBound {
  /** Sum of amountShares across KNOWN_ACTIVE blocks that state a share count. */
  activeSupplyShares: number;
  /** Denominator, and an upper bound on the float. */
  sharesOutstanding: number;
  /** activeSupplyShares / sharesOutstanding. A LOWER bound on supply-to-float. */
  ratioLowerBound: number;
  /** Banded form of the ratio. Prefer this on any surface; see SupplyBand. */
  band: SupplyBand;
  /** True when established supply alone equals or exceeds the entire share count. */
  exceedsSharesOutstanding: boolean;
  /** How many ledger blocks the numerator rests on. */
  blocksCounted: number;
  /** Blocks excluded for having no share count, so a thin bound reads as thin. */
  blocksWithoutShareCount: number;
  note: string;
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
export type CatalystType =
  | 'NEWS_DRIVEN'
  | 'FLOW_DOMINANT'
  | 'SECONDARY_STALE'
  | 'NONE_IDENTIFIED'
  | 'UNKNOWN';

/** Maps onto the desk's existing catalyst language. */
export type CatalystGrade =
  | 'STRONG'
  | 'LEGITIMATE_POSITIVE'
  | 'MODERATE_MIXED_SECONDARY'
  | 'WEAK_NEGATIVE_DILUTIVE'
  | 'NONE'
  | 'UNKNOWN';

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
  /**
   * The catalyst tags (schema 4, `interpret/catalystTheme.ts`). All absent on a version written before schema 4
   * (read as NOT_TAGGED, never filled in later); null when written but not established (the guardrail).
   */
  catalystThemes?: CatalystTheme[] | null;
  catalystPassingThemes?: CatalystTheme[] | null;
  catalystEvent?: CatalystEvent | null;
  catalystDealStatus?: CatalystDealStatus | null;
  catalystGrade: CatalystGrade;
  summary: string | null;
  eventTimestamp: string | null;
  freshness: CatalystFreshness;
  whyTradersMayCare: string | null;
  plausiblyExplainsMove: boolean | null;
  confidence: Confidence;
  evidenceSourceIds: number[];
  /** What could not be established. Stated, not silently omitted. */
  unknowns: string[];
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
  displayedFloatDate: string | null;
  displayedFloatSource: string | null;
  floatConfidence: Confidence;
  structureClassification: StructureClassification;
  supplyLedger: SupplyBlock[];
  /**
   * Derived by `validateDossier`, not by the model — which is why it is
   * optional here and absent from AUTOMATIC_DOSSIER_SCHEMA. Null when the
   * share count or an established share-denominated supply block is missing.
   */
  supplyBound?: SupplyBound | null;
  /**
   * Floor and filed-maximum over the same share count, with the blocks neither
   * could use. Derived by the pipeline, not by the model, so it is optional
   * here and absent from AUTOMATIC_DOSSIER_SCHEMA -- see `lib/research/supply.ts`.
   */
  supplyPair?: SupplyPair | null;
  /**
   * Whether proven-live supply is at least the entire float, from filings alone.
   *
   * Derived beside `structureClassification` and never into it: that field is
   * the model's reading of a whole structure, this is arithmetic on a share
   * count, and a proof and a prose judgement must not share a column. Monotone
   * toward AVOID — nothing here can produce CLEAN or soften anything.
   */
  supplyOverhang?: SupplyOverhangAssessment | null;
  structuralWarnings: string[];
  reverseSplitHistory: string[];
  knownRegistrationStatus: string | null;
  summary: string | null;
  confidence: Confidence;
  evidenceSourceIds: number[];
  unknowns: string[];
}

/** How much prior momentum history a name carries. */
export type FormerRunnerStatus = 'NONE' | 'FORMER_RUNNER' | 'FORMER_SUPERRUNNER' | 'UNKNOWN';

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
  /** Only meaningful relative to a real current-cycle high. */
  currentGivebackPct: number | null;
  historicalResistance: number | null;
  formerRunnerStatus: FormerRunnerStatus;
  recentMajorRuns: string[];
  cycleWarnings: string[];
  confidence: Confidence;
  evidenceSourceIds: number[];
  unknowns: string[];
}

/** Why a guardrail removed the evidence risk sentence (`interpret/evidenceRisk.ts`, design section 4). */
export type EvidenceRiskRule =
  | 'RISK_REQUIRES_SOURCE'
  | 'RISK_NOT_ONE_SENTENCE'
  | 'RISK_FORBIDDEN_WORDING'
  | 'RISK_ACTIVITY_WITHOUT_ACTIVE_BLOCK'
  | 'RISK_SHARES_RULE';

export interface EvidenceRisk {
  /** One sentence stating the condition, or null (the model returned none, or a guardrail removed it). */
  text: string | null;
  evidenceSourceIds: number[];
  /**
   * Set when a guardrail removed the text: the rule, the shape, and the removed
   * sentence is NOT stored (Integration 29th): the board payload carries the whole dossier (readModel.ts), and refused text about a named company is not kept.
   * Absent on the model's own output, before validation.
   */
  removed?: { rule: EvidenceRiskRule; detail: string } | null;
}

export interface ResearchDossier {
  ticker: string;
  companyName: string | null;
  cik: string | null;
  country: string | null;
  foreignIssuer: boolean | null;
  /**
   * What the company does, in one plain line, grounded in EDGAR's SIC label and
   * the filings in the bundle. His ruling 2026-09-30T10:42:25Z: "just make it a
   * partof the query" (verbatim). Optional because every dossier written before schema
   * v2 lacks it; absent and null both read as not stated.
   */
  businessDescription?: string | null;
  /**
   * The main risk CONDITION in the evidence, one cited sentence, or null
   * (contract row 20; `interpret/evidenceRisk.ts`). Optional because every
   * dossier before schema v3 lacks it; read it through `evidenceRiskState`,
   * never directly.
   */
  evidenceRisk?: EvidenceRisk | null;
  catalyst: CatalystFindings;
  structure: StructureFindings;
  cycle: CycleFindings;
  /**
   * Cycle position computed from daily bars, not judged from the bundle.
   *
   * Optional and derived, like `structure.supplyBound` — the model does not
   * produce it and it is absent from AUTOMATIC_DOSSIER_SCHEMA. It runs
   * alongside `cycle` deliberately: the model's version is being retired, and
   * carrying both until every surface has switched is what makes that a
   * migration rather than an outage.
   *
   * `cycle` is 75% UNKNOWN in production and returned a different answer across
   * five identical draws 46% of the time. This does not.
   */
  computedCycle?: CycleHistory | null;
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
  /** How the analysis was produced; see the pipeline for what is recorded. */
  metadata: Record<string, unknown>;
}

/** Current dossier schema version. Bump when the shape changes. */
export const ANALYSIS_VERSION = 1;

/* ----------------------------------------------------------- worker health */

export type ResearchHealthState = 'OFFLINE' | 'IDLE' | 'WORKING' | 'DEGRADED' | 'ERROR';

export interface ResearchHealth {
  state: ResearchHealthState;
  /**
   * Queued work for the CURRENT trading date. Scoped, deliberately, because
   * that is the question the board asks.
   *
   * It is also why an aged backlog is invisible exactly when it has aged: the
   * worker counts `readJobsForDate(db, MAX(trading_date))`, so a job stuck since
   * a previous session stops being counted the moment the date rolls. Ten such
   * rows sat QUEUED on 2026-08-21 and 2026-08-17 while this field read 0 -- and
   * the field was being used to confirm the desk was idle before a deploy.
   *
   * Pair it with `stalledJobs` below rather than widening it. Two questions,
   * two numbers.
   */
  queuedJobs: number;
  /**
   * Non-terminal jobs from any OTHER trading date: queued, or claimed and never
   * finished.
   *
   * Nothing will pick these up. Boot recovery requeues orphans, but it is
   * scoped the same way -- `readOrphanedJobs(db, bootDate)` -- so a row claimed
   * before a date roll is stranded permanently and silently. Zero such rows
   * exist today, which makes this a hazard rather than a defect, and the whole
   * point of the field is that the difference stays visible.
   */
  stalledJobs: number;
  activeJobs: string[];
  lastCompletedTicker: string | null;
  lastCompletedAt: string | null;
  /** Whether SEC fetching is configured and answering. Never holds a key. */
  /** Whether a User-Agent is configured. This GATES fetching; it cannot report an outage. */
  secAvailable: boolean;
  /**
   * What SEC last actually did. UNKNOWN until a request has been made, and
   * UNKNOWN is not healthy — it is "not yet observed". Separate from
   * secAvailable because configuration and reachability are different facts
   * and collapsing them cost a morning on 2026-09-04.
   */
  secReachable?: 'UNKNOWN' | 'REACHABLE' | 'UNREACHABLE';
  secReachableDetail?: string;
  secDetail: string | null;
  /** Whether an interpreter is configured. Never holds a key. */
  modelAvailable: boolean;
  modelDetail: string | null;
  updatedAt: string;
}
