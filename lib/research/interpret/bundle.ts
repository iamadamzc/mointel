/**
 * Compact evidence bundle.
 *
 * Everything the interpreter is allowed to reason from, and nothing else. It
 * receives no web access and no raw filings — only what Phases 2 and 3 already
 * persisted, plus deterministic market summaries computed here.
 *
 * That boundary is what makes an error attributable. If a conclusion is wrong,
 * it is either bad evidence (collection) or bad reasoning over good evidence
 * (interpretation), and the bundle is the line between them.
 *
 * Compactness is a correctness property too, not only a cost one: a 340,000
 * character 10-Q pasted into a prompt buries the one sentence that matters.
 */

import type { MarketDatabase } from '../../market/store/db';
import { readIssuer, readSources } from '../../market/store/researchRepo';
import { readDemandStates } from '../../market/store/repo';
import type { DemandState } from '../../market/types';
import { fromStored } from '../time';
import {
  DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
  readDailyBars,
  summariseDailyHistory,
  type DailyHistorySummary,
} from '../history';
import type { ResearchSource } from '../types';

/** Hard ceiling on retained excerpt per source inside the bundle. */
const MAX_EXCERPT_CHARS = 1200;
/** Ceiling on sources included, highest authority first. */
const MAX_SOURCES = 28;

export interface BundleSource {
  /** Database id. The interpreter must cite these and nothing else. */
  id: number;
  type: string;
  authority: string;
  title: string | null;
  url: string;
  accession: string | null;
  secForm: string | null;
  publishedAt: string | null;
  publishedPrecision: string;
  publishedEt: string | null;
  clusterId: string | null;
  canonical: boolean;
  excerpt: string | null;
  /** Structural concepts the extractor found, when any. */
  concepts: string[];
}

export interface DemandSummary {
  price: number | null;
  referenceRthClose: number | null;
  percentChange: number | null;
  cumulativeVolume: number | null;
  dailyRvol: number | null;
  rvolRank: number | null;
  previousRvolRank: number | null;
  rankChange: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  spreadPct: number | null;
  haltState: string | null;
  luldLower: number | null;
  luldUpper: number | null;
  qualifiedAt: string | null;
  qualifiedPrice: number | null;
  latched: boolean | null;
}

export interface HistoricalSummary {
  /** Deterministic sentences, never raw bar arrays. */
  notes: string[];
  sessionsObserved: number;
  /** Highest close seen in the retained window, with its date. */
  windowHigh: number | null;
  windowHighDate: string | null;
  windowLow: number | null;
  /**
   * Deliberately absent: this module never computes a current-cycle high. A
   * window high is historical context, and letting it flow into a cycle-high
   * field is exactly the FIEE defect.
   */
  note: 'window high is historical context, not a current-cycle high';
}

export interface SheetPriorAnalysis {
  label: 'HUMAN_REVIEWED_PRIOR_ANALYSIS';
  catalyst: string | null;
  catalystGrade: string | null;
  structure: string | null;
  cycle: string | null;
  warnings: string | null;
  floatQuality: string | null;
  notes: string | null;
}

export interface CoverageSummary {
  secSourceCount: number;
  catalystSourceCount: number;
  canonicalClusterCount: number;
  /**
   * Catalyst sources that are not SEC documents.
   *
   * Reported separately from catalystSourceCount because an 8-K exhibit is both
   * a catalyst source and an SEC document: counting them together is what let an
   * SEC-only bundle describe itself as gap-free.
   */
  nonSecCatalystSourceCount: number;
  /** Whether an IR, newsroom or newswire location is known for this issuer. */
  companySourceKnown: boolean;
  latestSourceAt: string | null;
  hasCurrentReport: boolean;
  hasRegistrationEvidence: boolean;
  hasSharesOutstanding: boolean;
  /** True when material collection gaps exist; blocks confident CLEAN. */
  incomplete: boolean;
  gaps: string[];
}

export interface ResearchEvidenceBundle {
  ticker: string;
  companyName: string | null;
  cik: string | null;
  country: string | null;
  foreignIssuer: boolean | null;
  exchange: string | null;
  cikConfidence: string;
  demand: DemandSummary | null;
  /** Short live window: intraday state only. */
  history: HistoricalSummary;
  /**
   * Longer split-adjusted daily context for momentum-cycle reasoning.
   *
   * Summaries, never bars. Nothing in it is a current-cycle high.
   */
  dailyHistory: DailyHistorySummary;
  sources: BundleSource[];
  coverage: CoverageSummary;
  /** Present only when the desk already has human research on this name. */
  priorHumanAnalysis: SheetPriorAnalysis | null;
}

function truncate(text: string | null, limit = MAX_EXCERPT_CHARS): string | null {
  if (!text) return null;
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function conceptsOf(source: ResearchSource): string[] {
  const raw = source.metadata.concepts;
  return Array.isArray(raw) ? raw.map(String) : [];
}

function toBundleSource(source: ResearchSource): BundleSource {
  const published = fromStored(source.publishedAt, source.publishedPrecision);
  return {
    id: source.id,
    type: source.sourceType,
    authority: source.authority,
    title: source.title,
    url: source.url,
    accession: source.accession,
    secForm: source.secForm,
    publishedAt: source.publishedAt,
    publishedPrecision: source.publishedPrecision,
    publishedEt: published.etDate
      ? `${published.etDate}${published.etClock ? ` ${published.etClock} ET` : ' (date only)'}`
      : null,
    clusterId: source.clusterId,
    canonical: source.canonical,
    excerpt: truncate(source.excerpt),
    concepts: conceptsOf(source),
  };
}

const CATALYST_TYPES = new Set([
  'SEC_EXHIBIT',
  'COMPANY_IR',
  'COMPANY_NEWSROOM',
  'COMPANY_RELEASE',
  'NEWSWIRE',
  'SECONDARY_DISCOVERY',
]);

const REGISTRATION_FORMS = /^(S-1|S-3|F-1|F-3|POS AM|424B|EFFECT|RW|S-3ASR|F-3ASR)/i;

function summariseDemand(state: DemandState | null): DemandSummary | null {
  if (!state) return null;
  const s = state as unknown as Record<string, unknown>;
  const num = (key: string): number | null => {
    const value = s[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  return {
    price: num('price'),
    referenceRthClose: num('referenceRthClose'),
    percentChange: num('percentChange'),
    cumulativeVolume: num('cumulativeVolume'),
    dailyRvol: num('rvol'),
    rvolRank: num('rvolRank'),
    previousRvolRank: num('previousRvolRank'),
    rankChange: num('rvolRankChange'),
    sessionHigh: num('sessionHigh'),
    sessionLow: num('sessionLow'),
    bid: num('bid'),
    ask: num('ask'),
    spread: num('spread'),
    spreadPct: num('spreadPct'),
    haltState: typeof s.haltState === 'string' ? s.haltState : null,
    luldLower: num('luldLower'),
    luldUpper: num('luldUpper'),
    qualifiedAt: typeof s.qualifiedAt === 'string' ? s.qualifiedAt : null,
    qualifiedPrice: num('qualifiedPrice'),
    latched: typeof s.latched === 'boolean' ? s.latched : null,
  };
}

interface DailyBar {
  trading_date: string;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

/**
 * Deterministic historical context.
 *
 * Produces short factual sentences from retained minute bars rather than
 * shipping the bars themselves. Deliberately does not classify: it says what
 * the prices did, never whether that makes the name a former runner.
 */
export function summariseHistory(bars: readonly DailyBar[]): HistoricalSummary {
  const notes: string[] = [];
  const usable = bars.filter((bar) => bar.close !== null);

  if (usable.length === 0) {
    return {
      notes: ['no retained historical sessions'],
      sessionsObserved: 0,
      windowHigh: null,
      windowHighDate: null,
      windowLow: null,
      note: 'window high is historical context, not a current-cycle high',
    };
  }

  let windowHigh: number | null = null;
  let windowHighDate: string | null = null;
  let windowLow: number | null = null;

  for (const bar of usable) {
    const high = bar.high ?? bar.close!;
    const low = bar.low ?? bar.close!;
    if (windowHigh === null || high > windowHigh) {
      windowHigh = high;
      windowHighDate = bar.trading_date;
    }
    if (windowLow === null || low < windowLow) windowLow = low;
  }

  notes.push(`${usable.length} retained session(s) from ${usable[0].trading_date}`);
  if (windowHigh !== null && windowHighDate) {
    notes.push(`highest price in retained window ${windowHigh} on ${windowHighDate}`);
  }
  if (windowLow !== null) notes.push(`lowest price in retained window ${windowLow}`);

  const last = usable[usable.length - 1];
  if (windowHigh !== null && last.close !== null && windowHigh > 0) {
    const off = ((windowHigh - last.close) / windowHigh) * 100;
    notes.push(`last close ${last.close} is ${off.toFixed(1)}% below the retained-window high`);
  }

  // Stated explicitly so the interpreter cannot mistake the retention window
  // for the full history of the security.
  notes.push(
    'retained window is short (minute-bar retention), so absence of a prior run here is not evidence there was none',
  );

  return {
    notes,
    sessionsObserved: usable.length,
    windowHigh,
    windowHighDate,
    windowLow,
    note: 'window high is historical context, not a current-cycle high',
  };
}

export interface BuildBundleOptions {
  ticker: string;
  tradingDate: string;
  priorHumanAnalysis?: SheetPriorAnalysis | null;
  cycleHistoryTradingDays?: number;
}

export function buildEvidenceBundle(
  db: MarketDatabase,
  options: BuildBundleOptions,
): ResearchEvidenceBundle {
  const ticker = options.ticker.trim().toUpperCase();
  const issuer = readIssuer(db, ticker);
  const all = readSources(db, ticker);

  // Highest authority first, then most recent, then cap. A bundle that spends
  // its budget on secondary mirrors has crowded out the filings.
  const ordered = [...all].sort((a, b) => {
    if (a.canonical !== b.canonical) return a.canonical ? -1 : 1;
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  });
  const sources = ordered.slice(0, MAX_SOURCES).map(toBundleSource);

  const secSources = all.filter((source) => source.authority === 'SEC');
  const catalystSources = all.filter((source) => CATALYST_TYPES.has(source.sourceType));
  const clusters = new Set(
    all.filter((source) => source.canonical && source.clusterId).map((source) => source.clusterId),
  );

  const hasCurrentReport = all.some(
    (source) => source.secForm === '8-K' || source.secForm === '6-K',
  );
  const hasRegistrationEvidence = all.some(
    (source) => source.secForm !== null && REGISTRATION_FORMS.test(source.secForm),
  );
  const hasSharesOutstanding = all.some(
    (source) => source.sourceType === 'SEC_COMPANY_FACTS',
  );

  /*
   * Whether anything OUTSIDE the SEC was ever located for this issuer.
   *
   * This is the gap the XOS incident exposed. Xos announced an Air Force
   * contract through GlobeNewswire at 16:30 ET; the SEC bundle ran to 13
   * August; and because an 8-K exhibit counts as a catalyst source, the
   * collection satisfied "a catalyst source was located" and reported itself
   * complete. The analysis then said, accurately and uselessly, that no company
   * announcement dated 17 August had been supplied — while the coverage flag
   * told every downstream reader the evidence had no holes.
   *
   * An exhibit is an SEC document. It says nothing about whether the issuer's
   * own newsroom was reached, and on this store the web-discovery pass resolves
   * a company source for only a small minority of issuers. So SEC-only coverage
   * is now stated as what it is: adequate for filings, silent on anything the
   * company published directly.
   */
  const nonSecCatalystSources = catalystSources.filter(
    (source) => source.authority !== 'SEC',
  );
  const companySourceKnown = Boolean(
    issuer?.companySources?.feedUrl ??
      issuer?.companySources?.pressReleaseIndexUrl ??
      issuer?.companySources?.newsroomUrl ??
      issuer?.companySources?.investorRelationsUrl,
  );

  const gaps: string[] = [];
  if (!issuer?.cik) gaps.push('no SEC registrant matched for this ticker');
  if (secSources.length === 0) gaps.push('no SEC evidence collected');
  if (catalystSources.length === 0) gaps.push('no catalyst source located');
  if (nonSecCatalystSources.length === 0 && !companySourceKnown) {
    gaps.push(
      'no company IR, newsroom or newswire source located; catalyst coverage is SEC-only ' +
        'and an announcement published outside a filing would not have been seen',
    );
  }
  if (!hasSharesOutstanding) gaps.push('no reported share count available');
  if (!hasRegistrationEvidence) {
    gaps.push('no registration or prospectus evidence collected; supply picture may be incomplete');
  }

  const latest = all
    .filter((source) => source.publishedAt !== null)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))[0];

  const demandStates = readDemandStates(db, options.tradingDate, {
    limit: 0,
    extraSymbols: [ticker],
  });
  const demand = summariseDemand(demandStates.find((state) => state.ticker === ticker) ?? null);

  const bars = db
    .prepare(
      `SELECT trading_date, MAX(high) AS high, MIN(low) AS low,
              MAX(close) AS close, SUM(volume) AS volume
         FROM minute_bars WHERE symbol = ?
        GROUP BY trading_date ORDER BY trading_date ASC`,
    )
    .all(ticker) as DailyBar[];

  const dailyHistory = summariseDailyHistory(
    readDailyBars(db, ticker, options.cycleHistoryTradingDays ?? DEFAULT_CYCLE_HISTORY_TRADING_DAYS),
  );

  return {
    ticker,
    companyName: issuer?.companyName ?? null,
    cik: issuer?.cik ?? null,
    country: issuer?.country ?? null,
    foreignIssuer: issuer?.foreignIssuer ?? null,
    exchange: issuer?.exchange ?? null,
    cikConfidence: issuer?.cikConfidence ?? 'NONE',
    demand,
    history: summariseHistory(bars),
    dailyHistory,
    sources,
    coverage: {
      secSourceCount: secSources.length,
      catalystSourceCount: catalystSources.length,
      nonSecCatalystSourceCount: nonSecCatalystSources.length,
      companySourceKnown,
      canonicalClusterCount: clusters.size,
      latestSourceAt: latest?.publishedAt ?? null,
      hasCurrentReport,
      hasRegistrationEvidence,
      hasSharesOutstanding,
      // Coverage is a deterministic fact about collection, and the interpreter
      // is not permitted to talk its way past it.
      incomplete: gaps.length > 0,
      gaps,
    },
    priorHumanAnalysis: options.priorHumanAnalysis ?? null,
  };
}

/** Source ids the interpreter is permitted to cite. */
export function citableIds(bundle: ResearchEvidenceBundle): Set<number> {
  return new Set(bundle.sources.map((source) => source.id));
}
