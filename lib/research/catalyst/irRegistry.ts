/**
 * Company IR/newsroom registry resolution.
 *
 * An issuer's newsroom URL is stable for years. Rediscovering it on every
 * refresh would spend a model call to relearn something that did not change,
 * which is precisely the waste the cheap-first rule exists to prevent. So this
 * runs once per issuer and the result is persisted.
 *
 * What gets persisted matters as much as whether anything does. The only useful
 * answer is a durable collection point — a feed or an index that will list a
 * future announcement. A single release is worse than no answer at all: it
 * satisfies the usable-source check, retires the resolver for that issuer, and
 * leaves every later pass re-reading one frozen page.
 */

import type { MarketDatabase } from '../../market/store/db';
import { readIssuer, upsertIssuer } from '../../market/store/researchRepo';
import { EMPTY_COMPANY_SOURCES, type CompanySourceRegistry } from '../types';
import { fetchCompanyPage, companyUserAgent } from './companySource';
import { looksLikeFeed } from './feeds';
import {
  classifyCollectionPoint,
  countSiblingLinks,
  type CompanySourceResolverProvider,
} from './companySourceContract';

/** Feed paths worth probing once an issuer domain is known. */
const FEED_PATHS = ['/rss', '/feed', '/rss.xml', '/feed.xml', '/news/rss', '/investors/rss'];

/**
 * Where issuers commonly list releases, for sites that publish them off the
 * root rather than under a directory a release URL would reveal.
 */
const INDEX_PATHS = ['/press', '/news', '/newsroom', '/press-releases', '/media', '/investors'];

/** Most candidates worth fetching before giving up and letting discovery run. */
/**
 * No probing happened on this path.
 *
 * Distinct from `{returned: 0}` after a resolver ran: this says the desk never
 * asked, because it reused a stored answer or had no resolver. A census that
 * cannot tell "did not look" from "looked and found nothing" is the defect
 * these counts exist to prevent, so the three no-probe returns say so.
 */
const NO_PROBES: ResolutionProbeCensus = {
  candidatesReturned: 0,
  candidatesProbed: 0,
  candidatesFetched: 0,
};

const MAX_CANDIDATE_PROBES = 6;

/** A confirmed negative is worth a day; re-asking every cycle relearns it. */
const NEGATIVE_COOLDOWN_MS = 24 * 3600_000;

/**
 * An UNREACHABLE candidate is not a negative and must not buy a day.
 *
 * The trading window is 07:00-10:00 ET, so a failure at 06:00 under the old
 * single cooldown cost the name the entire session. One hour is short enough to
 * recover inside the morning and long enough not to hammer a host that is
 * refusing us.
 */
const UNREACHABLE_COOLDOWN_MS = 3600_000;

/** Written when nothing durable was found because nothing could be READ. */
const UNREACHABLE_NOTE = 'company source unreachable; not confirmed unsuitable';

export interface ResolveOptions {
  ticker: string;
  companyName: string | null;
  userAgent: string | null;
  /** Re-resolve even if the registry already has an entry. */
  force?: boolean;
  now?: Date;
}

export interface ResolveResult {
  registry: CompanySourceRegistry;
  /** Token counts for the resolver call, when one was made and reported. */
  usage?: import('./discovery').ProviderUsage | null;
  /** How the hosted search was configured for that call. */
  toolConfig?: string | null;
  /** True when resolution actually ran rather than reusing stored values. */
  resolved: boolean;
  modelCalls: number;
  detail: string;
  /**
   * Why resolution found nothing, as three counts rather than one label.
   *
   * THE SPLIT THESE EXIST FOR: **reach** is whether the desk generated a
   * candidate worth trying; **reachability** is whether the host answered. They
   * need different fixes -- more guessed paths against a longer timeout, a
   * different user-agent, or a retry policy -- and nothing stored could tell
   * them apart.
   *
   * ONE BOOLEAN WOULD NOT HAVE DONE IT, which is why this is not the `unreachable`
   * flag R&D asked for. That flag is a sticky OR across the probe loop: one
   * refusing host sets it even when a later candidate answered fine and simply
   * was not a collection point. It cannot separate the three failures:
   *
   *   returned 0                      -- the resolver named nothing. REACH.
   *   returned N, fetched 0           -- every host refused us. REACHABILITY.
   *   returned N, fetched M, none durable -- pages answered and none was an
   *                                          index or a feed. REACH, and it is
   *                                          the XOS case: every candidate a
   *                                          newswire copy.
   *
   * With the counts, the split is arithmetic. With the boolean, the second and
   * third cases are one observation -- the defect shape this desk hit three
   * times on 2026-09-25 and does not need a fourth.
   */
  probes: ResolutionProbeCensus;
}

export interface ResolutionProbeCensus {
  /**
   * THE UNIT IS CANDIDATES, NOT REQUESTS, AND THE NAMES SAY SO DELIBERATELY.
   *
   * `fetchCompanyPage` is called from THREE places in this file: the candidate
   * loop below, `probeFeed`, and `probeIndex`. **Only the first is counted
   * here.** `probeFeed` walks every entry in `FEED_PATHS` and `probeIndex` adds
   * another, so one resolution can issue several requests this census never
   * sees.
   *
   * So a reader who takes `probed` for a request count does not merely lack a
   * unit -- they undercount, in the direction that matters most to the first
   * question anyone will bring here, which is rate limits. Ops raised it and it
   * was right: **do not leave a counter whose unit has to be learned from the
   * source.** Renamed before any row was written, because a persisted JSON key
   * renamed after the fact leaves the desk two keys across vintages forever and
   * every later reader must know both -- which is 2026-09-25's own defect in a
   * new place.
   */
  /** Candidates the resolver named, before the probe cap. */
  candidatesReturned: number;
  /** Candidates actually fetched, bounded by `MAX_CANDIDATE_PROBES`. */
  candidatesProbed: number;
  /** Of those probed, how many returned a body rather than a failure. */
  candidatesFetched: number;
}

/**
 * True when the stored answer will still be useful tomorrow.
 *
 * A feed or a verified index qualifies. An article does not, and neither does a
 * row whose shape was never recorded — those were written before the page was
 * ever checked, and they are exactly the ones that need re-resolving.
 */
export function hasUsableSource(registry: CompanySourceRegistry): boolean {
  // A feed proved itself when it was stored: probeFeed only keeps a URL that
  // actually served a feed document.
  if (registry.feedUrl) return true;

  const stored = registry.pressReleaseIndexUrl ?? registry.newsroomUrl;
  if (!stored) return false;
  if (registry.sourceShape === 'ARTICLE') return false;

  /*
   * An unrecorded shape is an unverified one, and unverified is not usable.
   *
   * Guessing from the URL instead let too much through. Production still held
   * `/eslim-02-eha26/` and `readnews.php?cid=186&id=152` as press indexes: too
   * few words in the slug to look like releases, and both single articles. The
   * question "does this page list releases" has an answer, and it comes from
   * fetching the page — so a row that never recorded one gets re-resolved
   * rather than believed.
   *
   * An allowlist rather than `!== null`, because that test did the opposite of
   * this paragraph. Rows persisted before the field existed carry no key at
   * all, so the value deserialises to `undefined`, and `undefined !== null` is
   * true — every legacy row was believed, which is precisely the set the
   * paragraph says must be re-resolved. All four resolved issuers in production
   * were affected, and their stored "index" URLs are single articles:
   * `.../press-releases/detail/303/super-league-reports-second-quarter-2026-...`
   * is one release, not a list of them, so the deterministic IR poll refetched
   * a frozen page and could never see anything new.
   */
  return registry.sourceShape === 'FEED' || registry.sourceShape === 'INDEX';
}

/**
 * Establishes where an issuer publishes news, reusing a stored answer.
 *
 * Returns immediately when the registry already holds a durable source — the
 * common case after the first run, and the one that keeps model spend near
 * zero across a trading session.
 */
export async function resolveCompanySources(
  db: MarketDatabase,
  resolver: CompanySourceResolverProvider,
  options: ResolveOptions,
): Promise<ResolveResult> {
  const now = options.now ?? new Date();
  const issuer = readIssuer(db, options.ticker);
  const raw: CompanySourceRegistry = {
    ...EMPTY_COMPANY_SOURCES,
    ...(issuer?.companySources ?? {}),
  };

  /*
   * Shed a non-durable location before anything else looks at this row.
   *
   * Done here rather than on the unresolved path because the cooldown returns
   * first: ENRD recorded a negative, then every later pass short-circuited on
   * it and the leaf stayed on the row for another day. This costs no model
   * call — it is a stored value the current contract has already refused.
   */
  const stored = shedNonDurable(db, options.ticker, raw);

  if (!options.force && hasUsableSource(stored)) {
    return {
      registry: stored,
      resolved: false,
      modelCalls: 0,
      detail: 'reused stored IR source',
      probes: NO_PROBES,
    };
  }

  /*
   * A previous attempt that found nothing is worth reusing for a while, but for
   * HOW LONG depends on what "nothing" meant.
   *
   * The two were armed identically: "we looked and there is genuinely nothing"
   * and "we could not fetch". Only the first is a fact about the issuer. A
   * transient failure inside his 07:00-10:00 window used to cost the name the
   * whole session.
   */
  if (!options.force && stored.note && stored.lastVerifiedAt) {
    const age = now.getTime() - Date.parse(stored.lastVerifiedAt);
    const cooldown =
      stored.note === UNREACHABLE_NOTE ? UNREACHABLE_COOLDOWN_MS : NEGATIVE_COOLDOWN_MS;
    if (Number.isFinite(age) && age < cooldown) {
      return {
        registry: stored,
        resolved: false,
        modelCalls: 0,
        probes: NO_PROBES,
        detail: 'reused stored negative result',
      };
    }
  }

  if (!resolver.available) {
    const registry: CompanySourceRegistry = {
      ...stored,
      discoveryMethod: 'unavailable',
      confidence: 'UNKNOWN',
      note: 'no resolver provider; IR source not established',
      lastVerifiedAt: now.toISOString(),
    };
    persist(db, options.ticker, registry);
    return {
      registry,
      resolved: false,
      modelCalls: 0,
      probes: NO_PROBES,
      detail: 'resolver unavailable; IR source unknown',
    };
  }

  const userAgent = companyUserAgent(options.userAgent);
  const result = await resolver.resolve({
    ticker: options.ticker,
    companyName: options.companyName,
  });

  const {
    point: durable,
    unreachable,
    probes,
  } = await selectCollectionPoint(result.candidates, userAgent);

  if (!durable) {
    /*
     * Unresolved, deliberately. Returning nothing keeps the bounded discovery
     * fallback available on the next eligible pass, which is how XOS — whose
     * every candidate was a GlobeNewswire copy — still reached its Air Force
     * release. Recording a newswire URL here would have looked like success and
     * permanently blocked that path.
     */
    const registry: CompanySourceRegistry = {
      ...stored,
      discoveryMethod: resolver.name,
      confidence: 'UNKNOWN',
      note: unreachable ? UNREACHABLE_NOTE : 'no durable company collection point located',
      sourceShape: null,
      lastVerifiedAt: now.toISOString(),
    };
    persist(db, options.ticker, registry);
    return {
      registry,
      resolved: true,
      modelCalls: result.modelCalls,
      probes,
      usage: result.usage ?? null,
      toolConfig: result.toolConfig ?? null,
      detail: 'no durable company source located',
    };
  }

  let origin: URL;
  try {
    origin = new URL(durable.url);
  } catch {
    return {
      registry: stored,
      resolved: true,
      modelCalls: result.modelCalls,
      probes,
      usage: result.usage ?? null,
      toolConfig: result.toolConfig ?? null,
      detail: 'bad URL',
    };
  }

  const registry: CompanySourceRegistry = {
    ...stored,
    newsroomUrl: durable.url,
    pressReleaseIndexUrl: durable.url,
    investorRelationsUrl: stored.investorRelationsUrl ?? origin.origin,
    feedUrl: durable.shape === 'FEED' ? durable.url : stored.feedUrl,
    sourceShape: durable.shape,
    discoveryMethod: resolver.name,
    confidence: 'HIGH',
    note: null,
    lastVerifiedAt: now.toISOString(),
  };

  // A feed, if one exists, is cheaper and better dated than any HTML index, so
  // it is worth a few probes now to avoid parsing pages later.
  if (!registry.feedUrl) {
    const feed = await probeFeed(origin.origin, userAgent);
    if (feed) registry.feedUrl = feed;
  }

  persist(db, options.ticker, registry);

  return {
    registry,
    resolved: true,
    modelCalls: result.modelCalls,
    probes,
    usage: result.usage ?? null,
    toolConfig: result.toolConfig ?? null,
    detail: `located ${durable.shape === 'FEED' ? 'feed' : 'newsroom index'}`,
  };
}

interface DurablePoint {
  url: string;
  shape: 'FEED' | 'INDEX';
}

/**
 * Picks the first candidate that proves itself a collection point.
 *
 * Each candidate is fetched and judged on what it served, never on the label
 * the model attached. A candidate that turns out to be one release is not
 * discarded — it is used as a starting point to walk up to the page that lists
 * it, which is how a model that answers with the Tesla release still yields
 * `/press`.
 */
async function selectCollectionPoint(
  candidates: readonly { url: string }[],
  userAgent: string,
): Promise<{ point: DurablePoint | null; unreachable: boolean; probes: ResolutionProbeCensus }> {
  const seen = new Set<string>();
  let fallbackFromArticle: DurablePoint | null = null;
  let unreachable = false;
  // Counted here rather than inferred later: this loop is the only place that
  // knows how many candidates it tried and how many answered.
  const probes: ResolutionProbeCensus = {
    candidatesReturned: candidates.length,
    candidatesProbed: 0,
    candidatesFetched: 0,
  };

  for (const candidate of candidates.slice(0, MAX_CANDIDATE_PROBES)) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);

    const page = await fetchCompanyPage(candidate.url, { userAgent, timeoutMs: 6000 });
    probes.candidatesProbed += 1;
    if (!page.failure) probes.candidatesFetched += 1;
    const verdict = classifyCollectionPoint(candidate.url, page.failure ? null : page.body);

    if (verdict.shape === 'FEED')
      return { point: { url: candidate.url, shape: 'FEED' }, unreachable, probes };
    if (verdict.shape === 'INDEX')
      return { point: { url: candidate.url, shape: 'INDEX' }, unreachable, probes };

    // Not probed for an index: a host that just refused us will refuse the
    // derived path too, and spending a request to learn that is what the
    // shortened cooldown exists to avoid.
    if (verdict.shape === 'NOT_FETCHED') unreachable = true;

    if (verdict.shape === 'ARTICLE' && !fallbackFromArticle) {
      const index = await probeIndex(candidate.url, userAgent);
      if (index) fallbackFromArticle = { url: index, shape: 'INDEX' };
    }
  }

  return { point: fallbackFromArticle, unreachable, probes };
}

async function probeFeed(origin: string, userAgent: string): Promise<string | null> {
  for (const path of FEED_PATHS) {
    const url = `${origin}${path}`;
    const page = await fetchCompanyPage(url, { userAgent, timeoutMs: 6000 });
    if (!page.failure && page.body && looksLikeFeed(page.body)) return url;
  }
  return null;
}

/**
 * Paths above a release, nearest first.
 *
 * `/press/some-release` yields `/press`. The nearest ancestor is tried first
 * because that is where the issuer actually filed the release; the generic
 * names are only for sites that publish releases off the root.
 */
export function ancestorPaths(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  const paths: string[] = [];
  for (let depth = segments.length - 1; depth >= 1; depth -= 1) {
    paths.push(`/${segments.slice(0, depth).join('/')}`);
  }
  return paths;
}

/** True when a page links several siblings below `prefix`, as an index does. */
export function listsReleases(body: string, prefix: string): boolean {
  return countSiblingLinks(body, prefix) >= 2;
}

/**
 * Walks up from a release to the page that lists it.
 *
 * Deterministic and model-free: a handful of conditional GETs against a domain
 * the resolver has already identified.
 */
async function probeIndex(articleUrl: string, userAgent: string): Promise<string | null> {
  let article: URL;
  try {
    article = new URL(articleUrl);
  } catch {
    return null;
  }

  const candidates: string[] = [];
  for (const path of ancestorPaths(article.pathname)) candidates.push(`${article.origin}${path}`);
  for (const path of INDEX_PATHS) {
    const url = `${article.origin}${path}`;
    if (!candidates.includes(url)) candidates.push(url);
  }

  for (const url of candidates.slice(0, 8)) {
    if (url === article.href) continue;
    const page = await fetchCompanyPage(url, { userAgent, timeoutMs: 6000 });
    if (page.failure || !page.body) continue;
    if (classifyCollectionPoint(url, page.body).shape === 'INDEX') return url;
  }
  return null;
}

/**
 * Removes a stored location the current contract would not accept.
 *
 * hasUsableSource already refuses it, so this changes no behaviour — but a row
 * naming a newsroom tells a reader the issuer has one, and leaving ENRD's
 * .../press/einride-teams-up-with-tuv-sud on file said exactly that while the
 * resolver's own note underneath said no durable collection point was found.
 */
function shedNonDurable(
  db: MarketDatabase,
  ticker: string,
  registry: CompanySourceRegistry,
): CompanySourceRegistry {
  if (hasUsableSource(registry)) return registry;
  if (!registry.newsroomUrl && !registry.pressReleaseIndexUrl) return registry;

  // The company domain survives; that part is still true.
  const shed = { ...registry, newsroomUrl: null, pressReleaseIndexUrl: null };
  persist(db, ticker, shed);
  return shed;
}

function persist(db: MarketDatabase, ticker: string, registry: CompanySourceRegistry): void {
  const issuer = readIssuer(db, ticker);
  if (!issuer) return;
  upsertIssuer(db, { ...issuer, companySources: registry });
}
