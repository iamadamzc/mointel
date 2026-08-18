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
  looksLikeLeafArticle,
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
const MAX_CANDIDATE_PROBES = 6;

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
  /** True when resolution actually ran rather than reusing stored values. */
  resolved: boolean;
  modelCalls: number;
  detail: string;
}

/**
 * True when the stored answer will still be useful tomorrow.
 *
 * A feed or an index qualifies. An article does not, and neither does a legacy
 * entry whose shape was never recorded but whose URL reads as a release — those
 * are the rows written before the distinction existed, and they are exactly the
 * ones that need re-resolving.
 */
export function hasUsableSource(registry: CompanySourceRegistry): boolean {
  if (registry.feedUrl) return true;
  const stored = registry.pressReleaseIndexUrl ?? registry.newsroomUrl;
  if (!stored) return false;
  if (registry.sourceShape === 'ARTICLE') return false;
  if (registry.sourceShape === null && looksLikeLeafArticle(stored)) return false;
  return true;
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
  const stored: CompanySourceRegistry = {
    ...EMPTY_COMPANY_SOURCES,
    ...(issuer?.companySources ?? {}),
  };

  if (!options.force && hasUsableSource(stored)) {
    return { registry: stored, resolved: false, modelCalls: 0, detail: 'reused stored IR source' };
  }

  // A previous attempt that found nothing is also worth reusing for a while;
  // re-asking every cycle would cost a call per cycle to relearn a negative.
  if (!options.force && stored.note && stored.lastVerifiedAt) {
    const age = now.getTime() - Date.parse(stored.lastVerifiedAt);
    if (Number.isFinite(age) && age < 24 * 3600_000) {
      return {
        registry: stored,
        resolved: false,
        modelCalls: 0,
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
      detail: 'resolver unavailable; IR source unknown',
    };
  }

  const userAgent = companyUserAgent(options.userAgent);
  const result = await resolver.resolve({
    ticker: options.ticker,
    companyName: options.companyName,
  });

  const durable = await selectCollectionPoint(result.candidates, userAgent);

  if (!durable) {
    /*
     * Unresolved, deliberately. Returning nothing keeps the bounded discovery
     * fallback available on the next eligible pass, which is how XOS — whose
     * every candidate was a GlobeNewswire copy — still reached its Air Force
     * release. Recording a newswire URL here would have looked like success and
     * permanently blocked that path.
     */
    /*
     * A leaf left over from the old contract is dropped, not kept.
     *
     * hasUsableSource already refuses it, so it changes no behaviour — but a
     * registry row reading `newsroomUrl: .../press/einride-teams-up-with-tuv-sud`
     * tells a reader this issuer has a newsroom on file when the resolver has
     * just concluded the opposite. State nobody should act on should not be
     * stored as though they might.
     */
    const registry: CompanySourceRegistry = {
      ...stored,
      newsroomUrl: null,
      pressReleaseIndexUrl: null,
      discoveryMethod: resolver.name,
      confidence: 'UNKNOWN',
      note: 'no durable company collection point located',
      sourceShape: null,
      lastVerifiedAt: now.toISOString(),
    };
    persist(db, options.ticker, registry);
    return {
      registry,
      resolved: true,
      modelCalls: result.modelCalls,
      detail: 'no durable company source located',
    };
  }

  let origin: URL;
  try {
    origin = new URL(durable.url);
  } catch {
    return { registry: stored, resolved: true, modelCalls: result.modelCalls, detail: 'bad URL' };
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
): Promise<DurablePoint | null> {
  const seen = new Set<string>();
  let fallbackFromArticle: DurablePoint | null = null;

  for (const candidate of candidates.slice(0, MAX_CANDIDATE_PROBES)) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);

    const page = await fetchCompanyPage(candidate.url, { userAgent, timeoutMs: 6000 });
    const verdict = classifyCollectionPoint(candidate.url, page.failure ? null : page.body);

    if (verdict.shape === 'FEED') return { url: candidate.url, shape: 'FEED' };
    if (verdict.shape === 'INDEX') return { url: candidate.url, shape: 'INDEX' };

    if (verdict.shape === 'ARTICLE' && !fallbackFromArticle) {
      const index = await probeIndex(candidate.url, userAgent);
      if (index) fallbackFromArticle = { url: index, shape: 'INDEX' };
    }
  }

  return fallbackFromArticle;
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

function persist(db: MarketDatabase, ticker: string, registry: CompanySourceRegistry): void {
  const issuer = readIssuer(db, ticker);
  if (!issuer) return;
  upsertIssuer(db, { ...issuer, companySources: registry });
}
