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

import { hasUsableSource } from '../catalyst/irRegistry';
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

/**
 * The Sheet's prior analysis, and NO HUMAN HAS EVER WRITTEN OR REVIEWED IT.
 *
 * This label read `HUMAN_REVIEWED_PRIOR_ANALYSIS` until 2026-09-19 and reached
 * the model in the prompt, alongside the instruction *"do not adopt it because a
 * person wrote it"* — **an instruction whose premise was false.** The Sheet is
 * written by a scheduled ChatGPT task. A model told a human reviewed something
 * weights it differently from one told another model produced it, under
 * identical wording, so every dossier in the back catalogue was interpreted
 * against a prior it had been told carried human judgement.
 *
 * `config.ts`'s own comment had it right the whole time — *"the prior is another
 * model's conclusion"* — while five files in this directory said human. The
 * correction is his, 2026-09-19.
 *
 * **Do not restore the human framing.** The desk's conflict apparatus adjudicates
 * two model pipelines with different universes, which is why agreement between
 * them is weak evidence and disagreement is strong — the opposite of how it
 * would read if one side were a person.
 */
export interface SheetPriorAnalysis {
  label: 'PRIOR_MODEL_ANALYSIS';
  catalyst: string | null;
  catalystGrade: string | null;
  structure: string | null;
  cycle: string | null;
  warnings: string | null;
  floatQuality: string | null;
  notes: string | null;
}

/**
 * A share count the issuer reported, parsed deterministically from company
 * facts.
 *
 * Carried as a number because the model was never shown one. `companyFacts`
 * puts the value in the source's `metadata`; `toBundleSource` forwards title,
 * excerpt and concepts but not metadata; and the excerpt on these records is
 * empty. So the bundle contained a source titled "Reported shares outstanding"
 * with no number in it, while `coverage.hasSharesOutstanding` reported true.
 * The count reached the dossier on 27 of 94 analyses despite company facts
 * existing for 62 of 77 issuers.
 *
 * The note travels with the value for the same reason it is stored on the
 * source: this is the number most likely to be mistaken for a float.
 */
export interface ReportedShareCount {
  shares: number;
  /** Period end the count refers to, not the date it was filed. */
  asOf: string;
  /** XBRL concept, e.g. dei:EntityCommonStockSharesOutstanding. */
  concept: string | null;
  /** The bundle source that reported it, so a conclusion can cite it. */
  sourceId: number;
  note: 'shares outstanding is not float';
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
  /** EDGAR's SIC industry label: the grounding for `businessDescription`. */
  sicDescription: string | null;
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
  /**
   * The issuer's own reported share count, when one was collected.
   *
   * Deliberately a sibling of `coverage.hasSharesOutstanding` rather than a
   * replacement: the flag says a source exists, this says what it said. Never
   * a float — `structure.displayedFloat` stays null unless a source states a
   * float, and SHARES_OUTSTANDING_IS_NOT_FLOAT rejects reusing this as one.
   */
  reportedSharesOutstanding: ReportedShareCount | null;
  /** Present only when the Sheet already carries a prior analysis of this name. */
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

/** A company-facts source that carries a usable share count, as `readReportedShares` reads one. */
function carriesShareCount(source: ResearchSource): boolean {
  const shares = source.metadata.sharesOutstanding;
  const asOf = source.metadata.asOf;
  return source.sourceType === 'SEC_COMPANY_FACTS' && typeof shares === 'number' && Number.isFinite(shares) && shares > 0 && typeof asOf === 'string' && asOf !== '';
}

/**
 * The newest share count ALWAYS keeps a place in the bundle (Integration 39th's ruling, 2026-10-13, from his EZRA
 * question). The company-facts row is never canonical (only clustered news is) and is dated by its filing, so a busy
 * filer's newer filings push it past MAX_SOURCES: EZRA on 10-13 had 13 canonical rows and 16 newer non-canonical rows
 * ahead of its 07-30 count (Ops's keyed reads, data/ezra-reads-2026-10-13.txt), and its dossier said "No filed share
 * count" while one was stored. When the newest count is outside the cap it takes the LAST place, the cap stays 28.
 */
function keepShareCount(capped: ResearchSource[], all: readonly ResearchSource[]): ResearchSource[] {
  let newest: ResearchSource | null = null;
  for (const source of all) {
    if (!carriesShareCount(source)) continue;
    if (newest === null || (source.metadata.asOf as string) > (newest.metadata.asOf as string)) newest = source;
  }
  if (newest === null || capped.some((source) => source.id === newest.id)) return capped;
  return capped.length < MAX_SOURCES ? [...capped, newest] : [...capped.slice(0, MAX_SOURCES - 1), newest];
}

/**
 * The newest reported share count among the sources the model may cite.
 *
 * Restricted to citable sources on purpose. A number the model cannot attribute
 * is a number it can only assert, and STRUCTURE_REQUIRES_SOURCE rejects an
 * uncited structural claim — so surfacing an uncitable count would invite the
 * rejection rather than prevent it. The newest count is always citable now
 * (`keepShareCount`): the old note here, that only one issuer of seventy-seven
 * reached MAX_SOURCES, stopped holding (EZRA, 2026-10-13).
 *
 * Newest by period end, not by filing date: two filings can report the same
 * cover-page count, and the question is which period the count describes.
 */
function readReportedShares(
  citableIdSet: ReadonlySet<number>,
  sources: readonly ResearchSource[],
): ReportedShareCount | null {
  let best: ReportedShareCount | null = null;

  for (const source of sources) {
    if (source.sourceType !== 'SEC_COMPANY_FACTS') continue;
    if (!citableIdSet.has(source.id)) continue;

    const shares = source.metadata.sharesOutstanding;
    const asOf = source.metadata.asOf;
    if (typeof shares !== 'number' || !Number.isFinite(shares) || shares <= 0) continue;
    if (typeof asOf !== 'string' || asOf === '') continue;
    if (best !== null && best.asOf >= asOf) continue;

    const concept = source.metadata.concept;
    best = {
      shares,
      asOf,
      concept: typeof concept === 'string' && concept !== '' ? concept : null,
      sourceId: source.id,
      note: 'shares outstanding is not float',
    };
  }

  return best;
}

const CATALYST_TYPES = new Set([
  'SEC_EXHIBIT',
  'COMPANY_IR',
  'COMPANY_NEWSROOM',
  'COMPANY_RELEASE',
  'NEWSWIRE',
  'SECONDARY_DISCOVERY',
  'NEWS_FEED',
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
  /**
   * Reconstruct the bundle as it stood at this instant, by collection time.
   * Replay only — unset is the live path and sees every stored source.
   */
  asOf?: string | null;
}

export function buildEvidenceBundle(
  db: MarketDatabase,
  options: BuildBundleOptions,
): ResearchEvidenceBundle {
  const ticker = options.ticker.trim().toUpperCase();
  const issuer = readIssuer(db, ticker);
  const all = readSources(db, ticker, { asOf: options.asOf ?? null });

  // Highest authority first, then most recent, then cap. A bundle that spends
  // its budget on secondary mirrors has crowded out the filings.
  const ordered = [...all].sort((a, b) => {
    if (a.canonical !== b.canonical) return a.canonical ? -1 : 1;
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  });
  const sources = keepShareCount(ordered.slice(0, MAX_SOURCES), all).map(toBundleSource);

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
  /*
   * A DURABLE collection point, not merely a URL.
   *
   * This tested URL PRESENCE, and `investorRelationsUrl` is set to a bare
   * origin as a by-product of resolution — so an issuer whose only stored
   * address is a homepage satisfied "we know where to look" while having
   * nowhere to poll. Measured on the 2026-08-23 store: 19 registry rows carry
   * only that origin, and on NINE current dossiers it SUPPRESSED the SEC-only
   * gap entirely. The warning was silent on the names where the desk is blind
   * and believes it is not.
   *
   * `hasUsableSource` is the same predicate the COLLECTOR gates its poll on —
   * imported rather than restated, so coverage cannot claim a source the
   * collector would refuse to read.
   */
  const companySourceKnown = issuer?.companySources
    ? hasUsableSource(issuer.companySources)
    : false;

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

  /*
   * INCLUDE, because `summariseDailyHistory` returns both bounds and rates and
   * splits them itself.
   *
   * EXCLUDE was silently wrong here in a way the call site could not fix.
   * `windowHigh`, `windowLow` and `historicalResistance` are bounds and were
   * being understated -- and `historicalResistance` compounded it, since it
   * already drops the last session and the filter had removed one before it,
   * so it lost TWO. Those figures reach the model and are copied into
   * `cycle.historicalResistance` on 81% of dossiers, which is an append-only
   * record rather than a screen.
   */
  const dailyHistory = summariseDailyHistory(
    readDailyBars(
      db,
      ticker,
      options.cycleHistoryTradingDays ?? DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
      'INCLUDE',
    ),
  );

  return {
    ticker,
    companyName: issuer?.companyName ?? null,
    cik: issuer?.cik ?? null,
    country: issuer?.country ?? null,
    foreignIssuer: issuer?.foreignIssuer ?? null,
    sicDescription: issuer?.sicDescription ?? null,
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
    reportedSharesOutstanding: readReportedShares(
      new Set(sources.map((source) => source.id)),
      all,
    ),
    priorHumanAnalysis: options.priorHumanAnalysis ?? null,
  };
}

/** Source ids the interpreter is permitted to cite. */
export function citableIds(bundle: ResearchEvidenceBundle): Set<number> {
  return new Set(bundle.sources.map((source) => source.id));
}
