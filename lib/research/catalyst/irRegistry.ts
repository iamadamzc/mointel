/**
 * Company IR/newsroom registry resolution.
 *
 * An issuer's newsroom URL is stable for years. Rediscovering it on every
 * refresh would spend a model call to relearn something that did not change,
 * which is precisely the waste the cheap-first rule exists to prevent. So this
 * runs once per issuer and the result is persisted.
 */

import type { MarketDatabase } from '../../market/store/db';
import { readIssuer, upsertIssuer } from '../../market/store/researchRepo';
import { EMPTY_COMPANY_SOURCES, type CompanySourceRegistry } from '../types';
import type { CatalystSourceDiscoveryProvider } from './discovery';
import { fetchCompanyPage, companyUserAgent } from './companySource';
import { looksLikeFeed } from './feeds';

/** Feed paths worth probing once an issuer domain is known. */
const FEED_PATHS = ['/rss', '/feed', '/rss.xml', '/feed.xml', '/news/rss', '/investors/rss'];

/**
 * Where issuers commonly list releases, for sites that publish them off the
 * root rather than under a directory the release URL reveals.
 */
const INDEX_PATHS = ['/press', '/news', '/newsroom', '/press-releases', '/media', '/investors'];

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

function hasUsableSource(registry: CompanySourceRegistry): boolean {
  return Boolean(
    registry.feedUrl ?? registry.pressReleaseIndexUrl ?? registry.newsroomUrl,
  );
}

/**
 * Establishes where an issuer publishes news, reusing a stored answer.
 *
 * Returns immediately when the registry already holds a usable source — the
 * common case after the first run, and the one that keeps model spend near
 * zero across a trading session.
 */
export async function resolveCompanySources(
  db: MarketDatabase,
  discovery: CatalystSourceDiscoveryProvider,
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

  if (!discovery.available) {
    const registry: CompanySourceRegistry = {
      ...stored,
      discoveryMethod: 'unavailable',
      confidence: 'UNKNOWN',
      note: 'no discovery provider; IR source not established',
      lastVerifiedAt: now.toISOString(),
    };
    persist(db, options.ticker, registry);
    return {
      registry,
      resolved: false,
      modelCalls: 0,
      detail: 'discovery unavailable; IR source unknown',
    };
  }

  const result = await discovery.discover({
    ticker: options.ticker,
    companyName: options.companyName,
    // Ask for anything recent; we want the newsroom, not a specific story.
    since: new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10),
    knownUrls: [],
  });

  // The company's own pages are the only useful answer here. A newswire copy
  // tells us where one release lived, not where the issuer publishes.
  const companyHit = result.sources.find(
    (source) => source.kind === 'COMPANY_IR' || source.kind === 'COMPANY_NEWSROOM',
  );

  if (!companyHit) {
    const registry: CompanySourceRegistry = {
      ...stored,
      discoveryMethod: discovery.name,
      confidence: 'UNKNOWN',
      note: 'no company-originated source located',
      lastVerifiedAt: now.toISOString(),
    };
    persist(db, options.ticker, registry);
    return {
      registry,
      resolved: true,
      modelCalls: result.modelCalls,
      detail: 'no company source located',
    };
  }

  let origin: URL;
  try {
    origin = new URL(companyHit.url);
  } catch {
    return { registry: stored, resolved: true, modelCalls: result.modelCalls, detail: 'bad URL' };
  }

  const userAgent = companyUserAgent(options.userAgent);

  /*
   * The model answers "where was this published", so what comes back is one
   * release, not the page that lists releases. Storing the release itself is
   * worse than storing nothing: it satisfies hasUsableSource(), so the resolver
   * never runs again, and every later pass re-reads one frozen article that by
   * construction can never mention a newer announcement. ENRD resolved to a
   * story about a safety-verification partnership and kept reporting July while
   * the Tesla Semi release sat one directory above it.
   */
  const index = await probeIndex(origin, userAgent);

  const registry: CompanySourceRegistry = {
    ...stored,
    newsroomUrl: index ?? companyHit.url,
    pressReleaseIndexUrl: stored.pressReleaseIndexUrl ?? index ?? companyHit.url,
    investorRelationsUrl: stored.investorRelationsUrl ?? origin.origin,
    discoveryMethod: discovery.name,
    confidence: companyHit.confidence === 'HIGH' ? 'HIGH' : 'MEDIUM',
    note: null,
    lastVerifiedAt: now.toISOString(),
  };

  // A feed, if one exists, is cheaper and better dated than any HTML index, so
  // it is worth a few probes now to avoid parsing pages later.
  const feed = await probeFeed(origin.origin, userAgent);
  if (feed) registry.feedUrl = feed;

  persist(db, options.ticker, registry);

  const located = index ? 'newsroom index' : 'newsroom';
  return {
    registry,
    resolved: true,
    modelCalls: result.modelCalls,
    detail: feed ? `located ${located} and feed` : `located ${located}`,
  };
}

/**
 * Paths above a release, nearest first.
 *
 * `/press/some-release` yields `/press`. The nearest ancestor is tried first
 * because that is where the issuer actually filed the release; the generic
 * names below are only for sites that publish releases off the root.
 */
export function ancestorPaths(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  const paths: string[] = [];
  for (let depth = segments.length - 1; depth >= 1; depth -= 1) {
    paths.push(`/${segments.slice(0, depth).join('/')}`);
  }
  return paths;
}

/**
 * True when a page lists several releases rather than being one.
 *
 * Two sibling links is the whole test. An index has many, an article has none —
 * except for "related release" rails, which is why one is not enough.
 */
export function listsReleases(body: string, prefix: string): boolean {
  const quoted = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`href="(?:https?://[^"/]+)?${quoted}/[^"#?]+`, 'gi');
  const links = new Set<string>();
  for (const match of body.matchAll(pattern)) links.add(match[0]);
  return links.size >= 2;
}

/**
 * Walks up from a release to the page that lists it.
 *
 * Deterministic and model-free: a handful of conditional GETs against a domain
 * the resolver has already identified.
 */
async function probeIndex(article: URL, userAgent: string): Promise<string | null> {
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
    const prefix = new URL(url).pathname.replace(/\/$/, '');
    if (prefix && listsReleases(page.body, prefix)) return url;
  }
  return null;
}

async function probeFeed(origin: string, userAgent: string): Promise<string | null> {
  for (const path of FEED_PATHS) {
    const url = `${origin}${path}`;
    const page = await fetchCompanyPage(url, { userAgent, timeoutMs: 6000 });
    if (!page.failure && page.body && looksLikeFeed(page.body)) return url;
  }
  return null;
}

function persist(db: MarketDatabase, ticker: string, registry: CompanySourceRegistry): void {
  const issuer = readIssuer(db, ticker);
  if (!issuer) return;
  upsertIssuer(db, { ...issuer, companySources: registry });
}
