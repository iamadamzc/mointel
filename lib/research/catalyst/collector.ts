/**
 * Catalyst evidence collection.
 *
 * Answers where an issuer's recent announcements were published, when, by whom,
 * and whether anything has appeared since the last check. It does not answer
 * whether any of it is a good catalyst — that is Phase 4, and the phrase
 * NO FRESH CATALYST FOUND deliberately does not exist in this file.
 *
 * The order of work is the point:
 *
 *   1. deterministic comparison of what we already hold  (free)
 *   2. SEC exhibits and known issuer feeds/newsrooms     (network, no model)
 *   3. web discovery                                     (model call)
 *
 * Each step can end the run. An elapsed poll interval alone never reaches
 * step 3 — only genuinely missing coverage does.
 */

import type { MarketDatabase } from '../../market/store/db';
import {
  assignSourceCluster,
  insertResearchSources,
  readIssuer,
  readSources,
  upsertIssuer,
  INTERVAL_RECHECK,
  RECOVERY_TRIGGER,
  recordModelUsage,
} from '../../market/store/researchRepo';
import { insertDeskEvents } from '../../market/store/repo';
import { etDateString } from '../../market/session';
import { computeCatalystFingerprint, hashContent } from '../fingerprint';
import type { CatalystConfig, SecConfig } from '../config';
import { fromStored, type NormalisedTime } from '../time';
import type {
  CatalystCollectionState,
  CompanySourceRegistry,
  NewResearchSource,
  ResearchSource,
  SourceAuthority,
  SourceType,
} from '../types';
import { EMPTY_COMPANY_SOURCES, SOURCE_AUTHORITY_RANK } from '../types';
import type { SecClient } from '../sec/client';
import {
  resolveCompanySources,
  hasUsableSource,
  type ResolutionProbeCensus,
} from './irRegistry';
import type { ProviderUsage } from './discovery';
import type { CompanySourceResolverProvider } from './companySourceContract';
import type { PaidSearchDecision } from './paidSearchCap';

/*
 * Stands in when no resolver is configured, so the collector keeps one code
 * path. It reports unavailable rather than throwing, which leaves the bounded
 * discovery fallback intact.
 */
const UNAVAILABLE_RESOLVER: CompanySourceResolverProvider = {
  name: 'none',
  available: false,
  resolve: async () => ({ candidates: [], modelCalls: 0, detail: 'no resolver configured' }),
};
import { clusterSources, type SourceCluster } from './cluster';
import {
  buildReleaseEvidence,
  companyUserAgent,
  fetchCompanyPage,
  readCompanySource,
  type FetchFailure,
} from './companySource';
import {
  authorityForKind,
  sourceTypeForKind,
  discoveryContentHash,
  type CatalystSourceDiscoveryProvider,
} from './discovery';
import {
  exhibitTitle,
  exhibitUrl,
  filingIndexHtmlUrl,
  parseFilingIndexHtml,
  selectReleaseExhibits,
} from './exhibits';
import { extractEvidence, htmlToText } from '../sec/documents';
import { collectNews } from '../news/collect';
import type { NewsAdapter } from '../news/types';

/** Current-report forms whose exhibits carry announcements. */
const CURRENT_REPORT_FORMS = new Set(['8-K', '8-K/A', '6-K', '6-K/A']);
/** How many recent current reports have their exhibits inspected. */
const MAX_FILINGS_FOR_EXHIBITS = 4;
/** How many releases are fetched from a feed or index per run. */
const MAX_RELEASES_FETCHED = 4;

/**
 * A material Demand Engine change that justifies looking for news early.
 *
 * Deliberately narrow. These are observable state transitions the engine
 * already computes — not invented trading signals, and not a judgement that
 * the move means anything.
 */
export type MaterialDemandEvent =
  | { kind: 'ENTERED_TOP_N'; detail: string }
  | { kind: 'RANK_IMPROVED'; detail: string }
  | { kind: 'HALT'; detail: string }
  | { kind: 'RESUME'; detail: string };

export interface CatalystCollectionInput {
  ticker: string;
  companyName?: string | null;
  now?: Date;
  tradingDate?: string;
  /**
   * Whether the ticker is currently on the board. A name that has dropped off
   * keeps its evidence but stops incurring paid refreshes. Defaults to true so
   * a caller must opt out deliberately.
   */
  relevant?: boolean;
  /** A demand-state change permitting discovery ahead of the interval. */
  materialEvent?: MaterialDemandEvent | null;
  /**
   * This job holds the durable recovery claim for the current resolver version.
   *
   * Set by the worker from the job's trigger rather than derived here, so a
   * restart cannot re-authorise work whose claim was already spent.
   */
  recoveryEpisode?: boolean;
  /** The job this collection belongs to, so token spend can be attributed. */
  jobId?: number | null;
  /** Forces web discovery to be considered regardless of spacing. */
  forceDiscovery?: boolean;
  /** Skips web discovery entirely; used to prove the zero-model path. */
  disableDiscovery?: boolean;
  /**
   * Whether this name may buy a paid web search at all (`paidSearchCap.ts`, his rulings 2026-10-06: top 12, RVOL of
   * at least 3). Refused: no resolver, recovery or discovery call is made, whatever the trigger, and the report says
   * why. Allowed or absent (the diagnostics): the existing cadence decides, unchanged.
   */
  paidSearch?: PaidSearchDecision;
}

export interface CatalystSourceSummary {
  id: number | null;
  type: SourceType;
  authority: SourceAuthority;
  title: string | null;
  url: string;
  published: NormalisedTime;
  parentAccession: string | null;
  clusterId: string | null;
  canonical: boolean;
}

/** Why a paid discovery or resolution pass ran. */
export type DiscoveryTrigger = 'FORCED' | 'FIRST_CHECK' | 'MATERIAL_EVENT' | 'INTERVAL';

/**
 * The purpose recorded against a paid call, from the same derivation that sets
 * the report's trigger.
 *
 * One mapping, so the report and the ledger cannot disagree about why money was
 * spent. A material event reports the event's own kind, because that vocabulary
 * is already what the queue writes on the job and what the diagnostics group by;
 * everything else reports the branch that authorised the call.
 */
export function usagePurposeFor(
  trigger: DiscoveryTrigger,
  materialEvent: MaterialDemandEvent | null,
): string {
  switch (trigger) {
    case 'MATERIAL_EVENT':
      return materialEvent?.kind ?? 'MATERIAL_EVENT';
    case 'FORCED':
      return 'FORCED_DISCOVERY';
    case 'FIRST_CHECK':
      return 'FIRST_CHECK';
    case 'INTERVAL':
      return INTERVAL_RECHECK;
  }
}

export interface CatalystCollectionReport {
  ticker: string;
  state: CatalystCollectionState;
  /** Where the issuer publishes, as known before and after this run. */
  companySources: CompanySourceRegistry;
  exhibitsFound: CatalystSourceSummary[];
  companyReleases: CatalystSourceSummary[];
  discoveredSources: CatalystSourceSummary[];
  /**
   * Sources the paid discovery call returned THIS pass that were not already held (0 when it did not run), so one
   * search per look can be compared with three: paid finds per paid pass, before and after (his ruling 2026-10-06).
   */
  paidSourcesFound: number;
  /** Items stored from news adapters (lib/research/news). */
  newsItems: CatalystSourceSummary[];
  clusters: SourceCluster[];
  /** Most recent publication time across all catalyst sources. */
  latestSourceAt: NormalisedTime | null;
  fingerprintBefore: string | null;
  fingerprint: string;
  fingerprintChanged: boolean;
  /** True when web discovery was invoked. */
  discoveryRan: boolean;
  discoveryDetail: string;
  /** Which paid tier ran this pass, when one did. */
  discoveryMode: 'RESOLVER' | 'DISCOVERY' | 'RECOVERY' | null;
  /** What issuer-source resolution did, or why it was not offered a turn. */
  companySourceDetail: string;
  /**
   * Whether the issuer's own feed was FETCHED this pass, and what came back.
   *
   * A separate step from resolution and a separate field for the reason that
   * cost this desk a wrong finding: resolution is skipped when a usable url is
   * already on file, so its `'not attempted'` says nothing about whether the
   * fetch ran.
   */
  companyFetchDetail: string;
  /**
   * What each news adapter returned this pass, as item counts, or ERROR.
   * `'no news adapters configured'` when the worker passed none -- which is a
   * different fact from an adapter that ran and read nothing.
   */
  newsFetchDetail: string;
  /**
   * Why RESOLUTION found nothing, as counts rather than a label.
   *
   * `candidatesReturned` 0 -- the resolver named nothing. **REACH.**
   * `candidatesProbed` > 0 with `candidatesFetched` 0 -- every host refused us.
   * **REACHABILITY.**
   * `candidatesFetched` > 0 and still no durable point -- pages answered and
   * none was an index or a feed. **REACH again**, and the XOS case, where every
   * candidate was a newswire copy.
   *
   * **The unit is CANDIDATES, not requests.** `probeFeed` and `probeIndex` each
   * issue requests this census does not count, so a rate-limit reading taken
   * from here undercounts.
   *
   * **A single `unreachable` boolean cannot separate the last two** -- it is a
   * sticky OR across the probe loop, so one refusing host sets it even when a
   * later candidate answered fine. R&D needs exactly that split to know whether
   * the fix is more guessed paths or a different fetch policy.
   */
  resolutionProbes: ResolutionProbeCensus;
  /** Why discovery ran, when it did. */
  discoveryTrigger: DiscoveryTrigger | null;
  /** Which interval tier applied, in minutes. */
  discoveryIntervalMinutes: number;
  /** True when a recent canonical source is already established. */
  resolved: boolean;
  /** Sources newly stored by this run, which is what moves the fingerprint. */
  newSourceCount: number;
  /** Desk events emitted. Factual only; no grade, no verdict. */
  eventsEmitted: string[];
  /**
   * Interpretation calls made by this phase. Structurally zero: Phase 3 does
   * not interpret, and the field exists so a test can assert that elapsed time
   * never buys one.
   */
  interpretationCalls: number;
  modelCalls: number;
  networkRequests: number;
  durationMs: number;
  /** Sources we could not reach, with the reason. Coverage stated honestly. */
  inaccessible: Array<{ url: string; failure: FetchFailure; detail: string | null }>;
  warnings: string[];
}

function toSummary(source: ResearchSource): CatalystSourceSummary {
  return {
    id: source.id,
    type: source.sourceType,
    authority: source.authority,
    title: source.title,
    url: source.url,
    published: fromStored(source.publishedAt, source.publishedPrecision),
    parentAccession:
      typeof source.metadata.parentAccession === 'string'
        ? source.metadata.parentAccession
        : source.accession,
    clusterId: source.clusterId,
    canonical: source.canonical,
  };
}

/**
 * The current resolver implementation.
 *
 * Bumped when a change makes previously-unresolvable issuers resolvable. Every
 * issuer whose registry carries an older value gets one recovery episode, once,
 * and is then stamped forward — which is what makes the recovery idempotent
 * across restarts rather than a loop.
 *
 * Version 2 is the dedicated company-source contract. Version 1 asked the
 * announcement prompt, so it stored leaf articles and newswire copies as though
 * they were collection points.
 *
 * Version 3 is that fix reaching the collector. Version 2 corrected what the
 * resolver would store but left this file judging a source usable by "is any
 * URL present", so an issuer holding a leaf looked resolved, never took the
 * resolver's turn, and burned its one recovery episode on a discovery pass.
 *
 * Version 4 clears leaves left behind by an unresolved verdict, so a row that
 * nothing will act on stops reading as though a newsroom were on file.
 *
 * Version 5 stops trusting rows whose shape was never recorded at all, which is
 * most of what the old contract wrote.
 */
export const RESOLVER_VERSION = 5;

/** Source types that constitute catalyst evidence rather than structure. */
const CATALYST_TYPES = new Set<SourceType>([
  'SEC_EXHIBIT',
  'COMPANY_IR',
  'COMPANY_NEWSROOM',
  'COMPANY_RELEASE',
  'NEWSWIRE',
  'SECONDARY_DISCOVERY',
  'NEWS_FEED',
]);

export function catalystSourcesOf(sources: readonly ResearchSource[]): ResearchSource[] {
  return sources.filter((source) => CATALYST_TYPES.has(source.sourceType));
}

/** Clusters a ticker's catalyst sources and writes the canonical flags. */
function clusterAndPersist(db: MarketDatabase, ticker: string): SourceCluster[] {
  const clusters = clusterSources(ticker, catalystSourcesOf(readSources(db, ticker)));
  for (const cluster of clusters) {
    assignSourceCluster(db, cluster.clusterId, cluster.memberIds, cluster.canonicalId);
  }
  return clusters;
}

/**
 * Collects catalyst evidence for one ticker.
 */
export async function collectCatalystEvidence(
  db: MarketDatabase,
  secClient: SecClient,
  discovery: CatalystSourceDiscoveryProvider,
  resolver: CompanySourceResolverProvider | null,
  config: { sec: SecConfig; catalyst: CatalystConfig },
  input: CatalystCollectionInput,
  news: readonly NewsAdapter[] = [],
): Promise<CatalystCollectionReport> {
  const startedAt = Date.now();
  const now = input.now ?? new Date();
  const ticker = input.ticker.trim().toUpperCase();

  /*
   * Attribute every paid call to a stage and a purpose.
   *
   * Written here rather than inside the provider because only the collector
   * knows why the call was made — the same discovery request is worth very
   * different things behind a material event and behind an interval poll.
   *
   * The purpose is a required argument rather than something derived inside,
   * which is the whole repair. Deriving it from the material event alone meant
   * the interval poll — the branch this comment already singled out as the one
   * worth telling apart — recorded no purpose at all: on 20 August that was 42
   * of 81 discovery calls and 2.13M input tokens that could not be attributed
   * to a reason. A caller that cannot name why it is spending does not spend.
   */
  const noteUsage = (
    stage: string,
    purpose: string,
    usage: ProviderUsage | null | undefined,
    toolConfig?: string | null,
  ) => {
    try {
      recordModelUsage(db, {
        tradingDate: input.tradingDate ?? now.toISOString().slice(0, 10),
        at: now.toISOString(),
        jobId: input.jobId ?? null,
        ticker,
        model: usage?.model ?? 'unknown',
        stage,
        trigger: purpose,
        inputTokens: usage?.inputTokens ?? null,
        cachedInputTokens: usage?.cachedInputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        toolConfig: toolConfig ?? null,
      });
    } catch {
      // Accounting must never take a collection down with it.
    }
  };
  const warnings: string[] = [];
  const inaccessible: CatalystCollectionReport['inaccessible'] = [];

  const issuer = readIssuer(db, ticker);
  const registry: CompanySourceRegistry = {
    ...EMPTY_COMPANY_SOURCES,
    ...(issuer?.companySources ?? {}),
  };

  const existing = readSources(db, ticker);
  const fingerprintBefore = computeCatalystFingerprint(catalystSourcesOf(existing));

  const report: CatalystCollectionReport = {
    ticker,
    state: 'NO_RECENT_SOURCE_LOCATED',
    companySources: registry,
    exhibitsFound: [],
    companyReleases: [],
    discoveredSources: [],
    paidSourcesFound: 0,
    newsItems: [],
    clusters: [],
    latestSourceAt: null,
    fingerprintBefore,
    fingerprint: fingerprintBefore,
    fingerprintChanged: false,
    discoveryRan: false,
    discoveryDetail: 'not required',
    discoveryMode: null,
    companySourceDetail: 'not attempted',
    companyFetchDetail: 'not attempted',
    newsFetchDetail: 'no news adapters configured',
    resolutionProbes: { candidatesReturned: 0, candidatesProbed: 0, candidatesFetched: 0 },
    discoveryTrigger: null,
    discoveryIntervalMinutes: 0,
    resolved: false,
    newSourceCount: 0,
    eventsEmitted: [],
    interpretationCalls: 0,
    modelCalls: 0,
    networkRequests: 0,
    durationMs: 0,
    inaccessible,
    warnings,
  };

  const collected: NewResearchSource[] = [];
  const requestsBefore = secClient.requestCount;

  // ------------------------------------------------- 2a. SEC exhibits
  if (issuer?.cik) {
    const currentReports = existing
      .filter(
        (source) =>
          source.sourceType === 'SEC_FILING' &&
          source.secForm !== null &&
          CURRENT_REPORT_FORMS.has(source.secForm),
      )
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, MAX_FILINGS_FOR_EXHIBITS);

    for (const filing of currentReports) {
      if (!filing.accession) continue;
      try {
        // The index page, not index.json: only the page states exhibit types.
        const indexPage = await secClient.get(
          filingIndexHtmlUrl(issuer.cik, filing.accession),
        );
        const exhibits = selectReleaseExhibits(parseFilingIndexHtml(indexPage.body));

        for (const exhibit of exhibits) {
          const url = exhibitUrl(issuer.cik, filing.accession, exhibit.name);
          const result = await secClient.get(url);
          const text = htmlToText(result.body);
          const evidence = extractEvidence(text);

          collected.push({
            ticker,
            sourceType: 'SEC_EXHIBIT',
            title: exhibitTitle(exhibit.type, filing.secForm),
            url,
            // The exhibit inherits its parent filing's date: the exhibit file
            // itself carries no publication time of its own.
            publishedAt: filing.publishedAt,
            /*
             * AND IT INHERITS THE PARENT'S PRECISION RATHER THAN ASSERTING ONE.
             *
             * `INFERRED` means a time DERIVED from something adjacent, and
             * `time.ts` names this exact case: an acceptance timestamp standing
             * in for an exhibit. That is the right label only when the parent
             * HAS an acceptance timestamp. When the parent carries a bare
             * filing date there is no time to derive, and a fixed `INFERRED`
             * claims one anyway — which is what every stored exhibit does
             * today: 878 of 878 INFERRED over a BARE DATE, measured
             * 2026-09-21 against `data/market-prod-2026-08-23.db`.
             *
             * That mislabel is what keeps the latency question unanswerable. A
             * bare date parses as midnight UTC, which is 20:00 ET, so any hour
             * bucket built from these rows files press releases in the evening
             * — the artifact that nearly argued for buying a wire licence.
             * `UNKNOWN` keeps them out of the measurement rather than into the
             * wrong bucket.
             *
             * EXACT demotes to INFERRED because the exhibit inherits the
             * instant rather than stating it. Every other precision passes
             * through unchanged, carrying its own warning with it.
             */
            publishedPrecision:
              filing.publishedPrecision === 'EXACT' ? 'INFERRED' : filing.publishedPrecision,
            fetchedAt: now.toISOString(),
            accession: filing.accession,
            secForm: filing.secForm,
            authority: 'SEC',
            contentHash: hashContent(text),
            documentFingerprint: hashContent(`${filing.accession}|${exhibit.name}`),
            excerpt: evidence.excerpt,
            metadata: {
              parentAccession: filing.accession,
              parentForm: filing.secForm,
              exhibitType: exhibit.type,
              exhibitFile: exhibit.name,
              selectionReason: exhibit.reason,
              concepts: evidence.concepts,
            },
            active: true,
          });
        }
      } catch (error) {
        warnings.push(
          `exhibit index unavailable for ${filing.accession}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  } else {
    warnings.push('no CIK on file; SEC exhibit collection skipped');
  }

  /*
   * ------------------------------------------------- 2a½. urgent resolution
   *
   * A name qualifying for the first time cannot wait a discovery interval.
   *
   * ENRD is the case: it printed a new high at 06:30:01, spiked to $10.53 by
   * 06:31, entered the Top 12 at 06:32, and was analysed twenty seconds later
   * — while the GlobeNewswire release that caused all of it had published at
   * 06:30. Under the ordinary alternating cooldown the first pass buys a
   * resolution and the release itself waits for the next one, which is an
   * interval too late for the only moment anybody was looking.
   *
   * So the first episode gets resolution AHEAD of the known-source read, which
   * means a source located here is fetched in this same pass rather than the
   * next. `neverAttempted` is the whole condition and it is self-limiting: the
   * clock is stamped below, so this branch can never run twice for an issuer.
   */
  const usableCompanySourceBefore = Boolean(
    hasUsableSource(registry),
  );
  /*
   * One recovery episode for an issuer last touched by the old resolver.
   *
   * XOS and ENRD were both attempted under a production path that never called
   * the resolver at all, so their lastDiscoveryAt is populated and the urgent
   * gate below can never fire for them. This makes exactly those rows eligible
   * once — no timestamp is cleared, no symbol is named — and the stamp below
   * closes it whether the attempt succeeded or failed.
   */
  const staleResolver =
    // Attempted before, by an implementation that could not succeed. A brand
    // new issuer is not poisoned — it reaches the ordinary first-qualification
    // path and must not buy a model call merely for being seen.
    registry.lastDiscoveryAt !== null &&
    (registry.resolverVersion ?? 0) < RESOLVER_VERSION &&
    input.relevant !== false &&
    discovery.available &&
    !input.disableDiscovery;

  /*
   * Urgency is a demand event, and only a demand event.
   *
   * staleResolver used to satisfy this on its own, which meant that after a
   * resolver-version bump every collection in the desk printed "urgent" and
   * took the ahead-of-interval branch — 170 of them on 18 August, none carrying
   * a trigger. Recovery is real work but it is not urgent work, so it now has
   * its own branch below and its own mode.
   */
  const firstQualification =
    registry.lastDiscoveryAt === null &&
    (input.materialEvent ?? null) !== null &&
    input.relevant !== false &&
    discovery.available &&
    !input.disableDiscovery;

  /*
   * The one recovery episode this issuer is entitled to at this version.
   *
   * Authorised by the queue, which holds the durable claim, rather than
   * inferred here from registry state — inferring it is what let a restart
   * re-open work that had already been done.
   */
  const recoveryEpisode = input.recoveryEpisode === true && staleResolver;

  // His paid-search gate (2026-10-06): refused means no paid call of any kind in this pass.
  const paidRefused = input.paidSearch !== undefined && !input.paidSearch.allowed;

  let urgentResolutionRan = false;
  let urgentResolutionResolved = false;

  if ((firstQualification || recoveryEpisode) && !usableCompanySourceBefore && !paidRefused) {
    urgentResolutionRan = true;
    report.discoveryMode = recoveryEpisode && !firstQualification ? 'RECOVERY' : 'RESOLVER';
    const label = recoveryEpisode && !firstQualification ? 'recovery' : 'urgent';
    try {
      const resolution = await resolveCompanySources(db, resolver ?? UNAVAILABLE_RESOLVER, {
        ticker,
        companyName: input.companyName ?? issuer?.companyName ?? null,
        userAgent: companyUserAgent(config.sec.userAgent),
        now,
      });
      Object.assign(registry, resolution.registry);
      report.modelCalls += resolution.modelCalls;
      if (resolution.modelCalls > 0) {
        // Both branches that reach here are named by construction: recovery
        // holds a durable claim, and a first qualification requires a material
        // event, so neither can fall through to an unattributed call.
        noteUsage(
          label === 'recovery' ? 'RECOVERY' : 'RESOLVER',
          label === 'recovery'
            ? RECOVERY_TRIGGER
            : usagePurposeFor('MATERIAL_EVENT', input.materialEvent ?? null),
          resolution.usage,
          resolution.toolConfig,
        );
      }
      report.companySourceDetail = `${label}: ${resolution.detail}`;
      report.resolutionProbes = resolution.probes;
      urgentResolutionResolved = Boolean(
        hasUsableSource(registry),
      );
    } catch (error) {
      warnings.push(
        `${label} issuer source resolution failed: ${
          error instanceof Error ? error.name : 'error'
        }`,
      );
      report.companySourceDetail = `${label} resolution failed`;
    }
  }

  // ------------------------------------------------- 2b. known company sources
  const userAgent = companyUserAgent(config.sec.userAgent);
  /*
   * Only a durable location is worth reading.
   *
   * A stored leaf article satisfies neither: re-fetching it yields the same
   * frozen story every pass, and counting it as coverage is what let ENRD
   * report a July catalyst while holding a URL that could never mention a
   * newer release.
   */
  const knownSourceUrl = hasUsableSource(registry)
    ? (registry.feedUrl ?? registry.pressReleaseIndexUrl ?? registry.newsroomUrl)
    : null;

  if (knownSourceUrl) {
    /*
     * THE FETCH GETS ITS OWN FIELD, AND THE FIRST VERSION OF THIS FIX DID NOT.
     *
     * `companySourceDetail` is declared above as *"what issuer-source
     * RESOLUTION did, or why it was not offered a turn"*. Writing the fetch's
     * outcome into it was wrong twice: it overloaded one field with two steps,
     * and because resolution runs FIRST, the fetch then overwrote a
     * `${label}: ${resolution.detail}` that had been recorded correctly. That
     * destroyed information while claiming to add some.
     *
     * So `'not attempted'` on that field is CORRECT when a ticker already has
     * a usable url on file: resolution is gated on `!usableCompanySourceBefore`
     * and is rightly skipped. It never meant the desk did not look.
     *
     * WHAT WAS GENUINELY MISSING IS THIS FIELD. Nothing recorded whether the
     * deterministic fetch of the issuer's own feed ran, so "fetched and found
     * nothing" and "never fetched" were one observation -- and a production
     * census read the resolution field as if it answered that question.
     * Recorded BEFORE the outcome, so a throw or a timeout cannot leave it
     * reading 'not attempted' by a rarer route.
     *
     * `networkRequests` remains the counter. This is the readable half, and
     * both are now persisted, because the report object knew all of this and
     * the stored record did not.
     */
    report.companyFetchDetail = `attempted ${knownSourceUrl}`;

    const page = await fetchCompanyPage(knownSourceUrl, { userAgent });
    report.networkRequests += 1;

    if (page.failure) {
      inaccessible.push({ url: knownSourceUrl, failure: page.failure, detail: page.detail });
      report.companyFetchDetail = `unreachable (${page.failure})`;
      // An unreachable IR site never invalidates SEC evidence for this ticker.
      warnings.push(`company source unreachable (${page.failure}); SEC evidence unaffected`);
    } else {
      const read = readCompanySource(page);
      if (read.failure) {
        inaccessible.push({ url: knownSourceUrl, failure: read.failure, detail: read.detail });
        report.companyFetchDetail = `unreadable (${read.failure})`;
      } else {
        report.companyFetchDetail = `read ${read.items.length} item${
          read.items.length === 1 ? '' : 's'
        } via ${read.mode}`;
      }

      const cutoffMs = now.getTime() - config.catalyst.contextLookbackDays * 86_400_000;
      const recent = read.items
        .filter((item) => {
          if (!item.published.utc) return true; // undated entries stay candidates
          return Date.parse(item.published.utc) >= cutoffMs;
        })
        .slice(0, MAX_RELEASES_FETCHED);

      for (const item of recent) {
        let releasePage = null;
        if (item.url) {
          releasePage = await fetchCompanyPage(item.url, { userAgent });
          report.networkRequests += 1;
          if (releasePage.failure) {
            inaccessible.push({
              url: item.url,
              failure: releasePage.failure,
              detail: releasePage.detail,
            });
          }
        }

        const evidence = buildReleaseEvidence(item, releasePage);
        const sourceType: SourceType = registry.feedUrl ? 'COMPANY_IR' : 'COMPANY_NEWSROOM';

        collected.push({
          ticker,
          sourceType,
          title: evidence.title,
          url: evidence.url || knownSourceUrl,
          publishedAt: evidence.published.utc,
          publishedPrecision: evidence.published.precision,
          fetchedAt: now.toISOString(),
          accession: null,
          secForm: null,
          authority: 'COMPANY_IR',
          contentHash: evidence.contentHash,
          documentFingerprint: hashContent(`company|${evidence.url || evidence.title}`),
          excerpt: evidence.excerpt,
          metadata: {
            sourceOwner: registry.investorRelationsUrl ?? knownSourceUrl,
            discoveredVia: read.mode,
            originalTimestamp: evidence.published.original,
            timestampPrecision: evidence.published.precision,
            concepts: evidence.concepts,
          },
          active: true,
        });
      }
    }
  } else {
    warnings.push('no company IR or newsroom source on file');
  }

  // ------------------------------------------------- 2c. news adapters
  // Deterministic, no model. Run before the discovery gate so a fresh wire
  // item can stand as the recent canonical source and spare a paid pass.
  if (news.length > 0) {
    const lookbackStart = new Date(
      now.getTime() - config.catalyst.contextLookbackDays * 86_400_000,
    );
    const newsRun = await collectNews(news, ticker, { start: lookbackStart, end: now }, now);
    report.newsFetchDetail = newsRun.detail;
    report.networkRequests += newsRun.requests;
    collected.push(...newsRun.rows);
  }

  // Persist what deterministic collection found before deciding on discovery,
  // so the decision is made against the freshest state.
  if (collected.length > 0) insertResearchSources(db, collected);

  // Cluster before deciding on discovery, not after: "resolved" means a recent
  // CANONICAL source exists, and canonical status is only assigned by
  // clustering. Deciding first would read every freshly stored source as
  // non-canonical and treat an already-answered ticker as unresolved.
  clusterAndPersist(db, ticker);

  const afterDeterministic = catalystSourcesOf(readSources(db, ticker));
  const deterministicFingerprint = computeCatalystFingerprint(afterDeterministic);

  // ------------------------------------------------- 3. web discovery
  const activeCutoff = now.getTime() - config.catalyst.activeFreshnessHours * 3600_000;
  const changedThisRun = deterministicFingerprint !== fingerprintBefore;

  /*
   * The discovery gate.
   *
   * Cheap-first still holds, but discovery refresh and interpretation refresh
   * are different things and are paced differently.
   *
   * A press release can cross a newswire without touching SEC submissions or
   * the company feed we poll, so an unchanged local fingerprint is not evidence
   * that nothing happened — it only means nothing we already watch has moved.
   * Elapsed time may therefore trigger a bounded check on the cheap
   * source-locator tier. It may never trigger interpretation: this phase runs
   * no interpretation at all, and when Phase 4 exists it is gated on the
   * evidence fingerprint, which a fruitless discovery pass leaves untouched.
   *
   * Two further brakes keep this from becoming a polling loop with a bill:
   * only currently relevant tickers qualify, and a resolved catalyst is checked
   * far less often than an unresolved one.
   */
  const relevant = input.relevant !== false;

  const hasRecentCanonical = afterDeterministic.some(
    (source) =>
      source.canonical &&
      source.publishedAt !== null &&
      Date.parse(source.publishedAt) >= activeCutoff,
  );

  const intervalMinutes = hasRecentCanonical
    ? config.catalyst.webDiscoveryResolvedMinutes
    : config.catalyst.webDiscoveryUnresolvedMinutes;

  const sinceLastDiscoveryMs = registry.lastDiscoveryAt
    ? now.getTime() - Date.parse(registry.lastDiscoveryAt)
    : Number.POSITIVE_INFINITY;
  const intervalElapsed =
    !Number.isFinite(sinceLastDiscoveryMs) ||
    sinceLastDiscoveryMs >= intervalMinutes * 60_000;

  const neverAttempted = registry.lastDiscoveryAt === null;
  // A material demand change is a reason to look early, ahead of the interval.
  const materialEvent = input.materialEvent ?? null;

  /*
   * Why this pass would run, decided once.
   *
   * Both paid branches below used to re-derive this expression independently,
   * and both derived it AFTER spending — so the ledger recorded the call and
   * the report recorded the reason, with nothing joining them. Deciding it here
   * lets the same value pay for the call and describe it.
   */
  const discoveryTrigger: DiscoveryTrigger =
    input.forceDiscovery === true
      ? 'FORCED'
      : materialEvent
        ? 'MATERIAL_EVENT'
        : neverAttempted
          ? 'FIRST_CHECK'
          : 'INTERVAL';
  const discoveryPurpose = usagePurposeFor(discoveryTrigger, materialEvent);

  // Deterministic collection just produced a recent canonical source, so the
  // question is answered for now and paying to ask it again would be waste.
  // The interval then governs the next look.
  const justResolved = changedThisRun && hasRecentCanonical;

  /*
   * Deliberately NOT gated on a stored negative resolver result.
   *
   * Suppressing interval discovery for issuers whose newsroom could not be
   * located would have removed the path that actually found XOS: its Air Force
   * release arrived on an INTERVAL discovery pass, not a material one, months
   * after the resolver had given up on its Squarespace site. "We cannot find
   * where you publish" and "nothing was published" are different questions, and
   * conflating them would blind the desk to exactly the small caps that need
   * it most. The 170 wasted calls were recovery-driven, and bounding recovery
   * removes them without touching catalyst freshness.
   */
  const discoveryNeeded =
    !input.disableDiscovery &&
    discovery.available &&
    relevant &&
    !paidRefused &&
    (input.forceDiscovery === true ||
      materialEvent !== null ||
      (!justResolved && (neverAttempted || intervalElapsed)));

  /*
   * Where the issuer publishes is a different question from what it published,
   * and until this ran in production nobody was asking the first one.
   *
   * resolveCompanySources existed and worked, but was wired only into the
   * standalone research:catalyst diagnostic — so the registry stayed empty for
   * every ticker the desk actually researched, knownSourceUrl above was always
   * null, and the deterministic IR path never ran. Four issuers of thirty-nine
   * had a company source, and those came from hand-run diagnostics.
   *
   * It runs under the SAME gate as general discovery rather than a timer of its
   * own, so a resolver call can only happen when a paid pass was already due,
   * and the two tiers alternate so one pass never buys two model calls.
   */
  const usableCompanySource = Boolean(
    hasUsableSource(registry),
  );
  /*
   * The steady-state resolver turn. Skipped when the urgent branch above
   * already took it, so a first qualification never buys two resolutions.
   */
  const resolverDue =
    discoveryNeeded &&
    !urgentResolutionRan &&
    !usableCompanySource &&
    registry.lastDiscoveryMode !== 'RESOLVER';

  /*
   * Whether the resolver turn actually cost anything.
   *
   * A pass is the scarce resource on a name that is moving, and the stamping
   * below used to happen unconditionally — outside the `try`, regardless of
   * whether a model call was made. So when the 24-hour negative cooldown inside
   * `resolveCompanySources` returned `reused stored negative result` at
   * `modelCalls: 0`, the pass was consumed and the interval clock restarted for
   * a turn that spent nothing and learned nothing. Measured across stored
   * collector reports: 130 of 253 resolver turns, 51%.
   *
   * The cooldown was saving the money and keeping the delay, which is the wrong
   * half to save.
   */
  let resolverSpentThePass = false;

  if (resolverDue) {
    report.discoveryMode = 'RESOLVER';
    try {
      const resolution = await resolveCompanySources(db, resolver ?? UNAVAILABLE_RESOLVER, {
        ticker,
        companyName: input.companyName ?? issuer?.companyName ?? null,
        userAgent: config.sec.userAgent,
        now,
      });
      Object.assign(registry, resolution.registry);
      report.modelCalls += resolution.modelCalls;
      if (resolution.modelCalls > 0) {
        noteUsage('RESOLVER', discoveryPurpose, resolution.usage, resolution.toolConfig);
      }
      report.companySourceDetail = resolution.detail;
      report.resolutionProbes = resolution.probes;
      report.discoveryRan = resolution.resolved;
      report.discoveryDetail = `issuer source resolution: ${resolution.detail}`;
      resolverSpentThePass = resolution.modelCalls > 0;
    } catch (error) {
      // A failed IR lookup must never take SEC collection down with it, and
      // must not consume the next pass's turn either — the mode below records
      // that the resolver had this one.
      warnings.push(
        `issuer source resolution failed: ${error instanceof Error ? error.name : 'error'}`,
      );
      report.companySourceDetail = 'resolution failed';
      report.discoveryDetail = 'issuer source resolution failed';

      /*
       * A throw is charged as a spent pass, deliberately.
       *
       * The failure may have come from anywhere in the call — including after
       * the request was billed — so `modelCalls` is not readable here and
       * falling through would risk two paid calls in one pass. The old comment
       * claimed the stamp existed so a failed lookup would not retry forever;
       * that reason still holds, and it is the only branch it ever applied to.
       */
      resolverSpentThePass = true;
    }

    if (resolverSpentThePass) {
      // The next eligible pass belongs to general discovery, so an issuer whose
      // IR site cannot be found still gets the fallback rather than retrying
      // the same failing lookup forever.
      registry.lastDiscoveryAt = now.toISOString();
      registry.lastDiscoveryFingerprint = deterministicFingerprint;
      registry.lastDiscoveryMode = 'RESOLVER';
      registry.resolverVersion = RESOLVER_VERSION;
      report.discoveryTrigger = discoveryTrigger;
    }
  }

  /*
   * Falls through in the same run when the resolver turn cost nothing, rather
   * than deferring discovery by a full interval. Otherwise reached exactly as
   * before: this was an `else if` on `resolverDue`, and `resolverSpentThePass`
   * is false whenever `resolverDue` was.
   */
  if (
    !resolverSpentThePass &&
    discoveryNeeded &&
    !(urgentResolutionRan && urgentResolutionResolved)
  ) {
    /*
     * Reached on an ordinary alternating pass, and also immediately after an
     * urgent resolution that found nothing — that is the second of the two
     * calls this first episode is allowed. When urgent resolution DID find a
     * source, 2b has already read it deterministically and a paid search would
     * be buying an answer we hold.
     */
    report.discoveryMode = 'DISCOVERY';
    const since = new Date(now.getTime() - config.catalyst.activeFreshnessHours * 3600_000)
      .toISOString()
      .slice(0, 10);

    const result = await discovery.discover({
      ticker,
      companyName: input.companyName ?? issuer?.companyName ?? null,
      since,
      knownUrls: afterDeterministic.map((source) => source.url),
    });

    report.discoveryRan = result.ran;
    report.discoveryDetail = result.detail;
    report.modelCalls += result.modelCalls;
    if (result.modelCalls > 0) {
      noteUsage('DISCOVERY', discoveryPurpose, result.usage, result.toolConfig);
    }

    const discovered: NewResearchSource[] = result.sources.map((source) => ({
      ticker,
      sourceType: sourceTypeForKind(source.kind),
      title: source.title,
      url: source.url,
      publishedAt: source.published.utc,
      publishedPrecision: source.published.precision,
      fetchedAt: now.toISOString(),
      accession: null,
      secForm: null,
      authority: authorityForKind(source.kind),
      contentHash: discoveryContentHash(source),
      documentFingerprint: hashContent(`discovery|${source.url}`),
      // Metadata only: we did not retrieve the page, so no excerpt is stored.
      excerpt: null,
      metadata: {
        publisher: source.publisher,
        relevance: source.relevance,
        appearsOriginal: source.appearsOriginal,
        discoveryConfidence: source.confidence,
        discoveredBy: discovery.name,
        originalTimestamp: source.published.original,
      },
      active: true,
    }));

    if (discovered.length > 0) insertResearchSources(db, discovered);
    report.paidSourcesFound = discovered.length;
    if (!result.ran) report.state = 'SOURCE_DISCOVERY_FAILED';

    // Stamp only an attempt that actually happened, so the interval measures
    // time since the last paid check.
    registry.lastDiscoveryAt = now.toISOString();
    registry.lastDiscoveryFingerprint = deterministicFingerprint;
    registry.lastDiscoveryMode = 'DISCOVERY';
    registry.resolverVersion = RESOLVER_VERSION;
    report.discoveryTrigger = discoveryTrigger;
  } else if (!relevant) {
    // A name that has dropped off the board stops costing money. Its evidence
    // is retained; only the paid refresh stops.
    report.discoveryDetail = 'ticker not currently relevant; periodic discovery stopped';
  } else if (!discovery.available) {
    report.discoveryDetail = 'discovery provider unavailable';
  } else if (input.disableDiscovery) {
    report.discoveryDetail = 'discovery disabled by caller';
  } else if (input.paidSearch && !input.paidSearch.allowed) {
    report.discoveryDetail = `paid search not allowed: ${input.paidSearch.reason}`;
  } else if (justResolved) {
    // Start the clock from the moment we became resolved, so the next poll
    // does not read an unset timer as "interval already elapsed".
    registry.lastDiscoveryAt = now.toISOString();
    registry.lastDiscoveryFingerprint = deterministicFingerprint;
    report.discoveryDetail = `canonical source located this run; next discovery in ~${intervalMinutes}m`;
  } else {
    const waitMinutes = Math.max(
      0,
      Math.round(intervalMinutes - sinceLastDiscoveryMs / 60_000),
    );
    report.discoveryDetail = `${
      hasRecentCanonical ? 'canonical source established' : 'awaiting interval'
    }; next discovery in ~${waitMinutes}m (${intervalMinutes}m tier)`;
  }

  /*
   * A successful urgent resolution still spends the episode. Without this the
   * clock stays unset and the very next poll would look like another first
   * qualification.
   */
  if (urgentResolutionRan) {
    // Advances even on failure. A resolver that cannot find this issuer must
    // not re-enter recovery on the next poll, or a restart, or forever.
    registry.resolverVersion = RESOLVER_VERSION;
  }

  if (urgentResolutionRan && registry.lastDiscoveryAt === null) {
    registry.lastDiscoveryAt = now.toISOString();
    registry.lastDiscoveryFingerprint = deterministicFingerprint;
    registry.lastDiscoveryMode = 'RESOLVER';
    report.discoveryTrigger = report.discoveryTrigger ?? 'FIRST_CHECK';
  }

  report.discoveryIntervalMinutes = intervalMinutes;
  report.resolved = hasRecentCanonical;

  // ------------------------------------------------- clustering
  // Run again so anything discovery added is clustered too.
  report.clusters = clusterAndPersist(db, ticker);

  const persisted = catalystSourcesOf(readSources(db, ticker));
  report.exhibitsFound = persisted
    .filter((source) => source.sourceType === 'SEC_EXHIBIT')
    .map(toSummary);
  report.companyReleases = persisted
    .filter(
      (source) =>
        source.sourceType === 'COMPANY_IR' ||
        source.sourceType === 'COMPANY_NEWSROOM' ||
        source.sourceType === 'COMPANY_RELEASE',
    )
    .map(toSummary);
  report.discoveredSources = persisted
    .filter(
      (source) =>
        source.sourceType === 'NEWSWIRE' || source.sourceType === 'SECONDARY_DISCOVERY',
    )
    .map(toSummary);

  const latest = persisted
    .filter((source) => source.publishedAt !== null)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))[0];
  report.latestSourceAt = latest
    ? fromStored(latest.publishedAt, latest.publishedPrecision)
    : null;

  report.fingerprint = computeCatalystFingerprint(persisted);
  report.fingerprintChanged = report.fingerprint !== fingerprintBefore;

  report.newsItems = persisted
    .filter((source) => source.sourceType === 'NEWS_FEED')
    .map(toSummary);

  const knownBefore = new Set(catalystSourcesOf(existing).map((source) => source.url));
  const newSources = persisted.filter((source) => !knownBefore.has(source.url));
  report.newSourceCount = newSources.length;

  /*
   * A source change is recorded only when the fingerprint actually moved.
   *
   * This is what makes a fruitless discovery pass genuinely free: it stores
   * nothing new, so the fingerprint is unchanged, so no event fires and Phase 4
   * has no reason to reinterpret. Time passing cannot manufacture work.
   */
  if (report.fingerprintChanged && newSources.length > 0) {
    const tradingDate = input.tradingDate ?? etDateString(now);
    const newest = newSources
      .filter((source) => source.publishedAt !== null)
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))[0];

    const inserted = insertDeskEvents(db, [
      {
        tradingDate,
        ts: now.toISOString(),
        type: 'CATALYST_SOURCE_CHANGE',
        symbol: ticker,
        // Factual wording only: what appeared and from where, never a verdict.
        message: `${newSources.length} new public source${
          newSources.length === 1 ? '' : 's'
        }, highest authority ${
          newSources.slice().sort((a, b) =>
            SOURCE_AUTHORITY_RANK[a.authority] - SOURCE_AUTHORITY_RANK[b.authority],
          )[0].authority
        }`,
        payload: {
          newSourceCount: newSources.length,
          fingerprint: report.fingerprint,
          latestPublishedAt: newest?.publishedAt ?? null,
          urls: newSources.slice(0, 5).map((source) => source.url),
        },
        // Keyed on the fingerprint so one evidence state emits one event.
        dedupeKey: `catalyst-source-change:${ticker}:${report.fingerprint}`,
      },
    ]);
    if (inserted > 0) report.eventsEmitted.push('CATALYST_SOURCE_CHANGE');
  }

  // Factual collection state only. Whether any of this is a catalyst worth
  // trading is not decided here.
  if (report.state !== 'SOURCE_DISCOVERY_FAILED') {
    const nowHasRecent = persisted.some(
      (source) => source.publishedAt !== null && Date.parse(source.publishedAt) >= activeCutoff,
    );
    if (nowHasRecent) report.state = 'RECENT_SOURCE_LOCATED';
    else if (inaccessible.length > 0 || !knownSourceUrl) report.state = 'COVERAGE_INCOMPLETE';
    else report.state = 'NO_RECENT_SOURCE_LOCATED';
  }

  // The registry always persists, creating a minimal issuer row when Phase 2
  // never resolved one. The discovery stamp lives here, and a ticker with no
  // CIK and no IR source is precisely the one that would otherwise repeat a
  // fruitless paid search on every single poll.
  upsertIssuer(db, {
    ticker,
    companyName: issuer?.companyName ?? input.companyName ?? null,
    cik: issuer?.cik ?? null,
    exchange: issuer?.exchange ?? null,
    country: issuer?.country ?? null,
    foreignIssuer: issuer?.foreignIssuer ?? null,
    cikConfidence: issuer?.cikConfidence ?? 'NONE',
    mappingSource: issuer?.mappingSource ?? null,
    irUrl: issuer?.irUrl ?? null,
    lastVerifiedAt: issuer?.lastVerifiedAt ?? null,
    companySources: {
      ...registry,
      lastVerifiedAt: knownSourceUrl ? now.toISOString() : registry.lastVerifiedAt,
    },
  });

  report.networkRequests += secClient.requestCount - requestsBefore;
  report.durationMs = Date.now() - startedAt;
  return report;
}
