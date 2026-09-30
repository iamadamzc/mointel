/**
 * The company-source resolver contract.
 *
 * This asks a different question from catalyst discovery, and the difference is
 * the whole point. Discovery asks "what was announced" and correctly answers
 * with announcements. Resolution asks "where does this issuer publish", and the
 * only useful answers are durable: a feed, a press index, an IR root — places
 * that will still list something new next week.
 *
 * Reusing the announcement prompt for this produced exactly the failure it
 * should have: ENRD resolved to a single story about a safety-verification
 * partnership and then reported a July catalyst for a month, because a leaf
 * article is frozen by construction. XOS resolved to nothing at all, because
 * every result was a newswire copy.
 *
 * So the model is asked for collection points, and every answer is then checked
 * against the fetched page and the URL itself. The model's label is a claim,
 * not a verdict — a leaf article insists it is a newsroom as readily as an
 * index does.
 */

import { classifyHost } from './discovery';

/** What kind of durable collection point a candidate claims to be. */
export type CollectionPointKind =
  | 'FEED'
  | 'NEWSROOM_INDEX'
  | 'PRESS_LISTING'
  | 'IR_ROOT'
  | 'OFFICIAL_DOMAIN';

export interface CompanySourceCandidate {
  url: string;
  kind: CollectionPointKind;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Why the model believes this is the issuer's own publishing location. */
  rationale: string | null;
}

export interface CompanySourceRequest {
  ticker: string;
  companyName: string | null;
}

export interface CompanySourceResolution {
  candidates: CompanySourceCandidate[];
  /** Null when no call was made, or when the provider returned no counts. */
  usage?: import('./discovery').ProviderUsage | null;
  /** How the hosted search was configured, when one was used. */
  toolConfig?: string | null;
  modelCalls: number;
  detail: string;
}

/**
 * A provider that locates an issuer's durable publishing locations.
 *
 * Deliberately separate from the discovery provider. They share transport and
 * nothing else: different question, different schema, different validation.
 */
export interface CompanySourceResolverProvider {
  readonly name: string;
  readonly available: boolean;
  resolve(request: CompanySourceRequest): Promise<CompanySourceResolution>;
}

export const COMPANY_SOURCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['url', 'kind', 'confidence', 'rationale'],
        properties: {
          url: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['FEED', 'NEWSROOM_INDEX', 'PRESS_LISTING', 'IR_ROOT', 'OFFICIAL_DOMAIN'],
          },
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          rationale: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;

export function buildResolverPrompt(request: CompanySourceRequest): string {
  const company = request.companyName
    ? `${request.companyName} (${request.ticker})`
    : request.ticker;

  /*
   * Stated as a location question and repeated as one. Asked about a company,
   * a model reaches for that company's latest news; the instruction has to keep
   * pulling it back to the address.
   */
  return [
    `Locate the pages ${company} uses to publish its own announcements.`,
    '',
    'You are looking for durable collection points: pages that will list a',
    'future announcement that has not happened yet. Report:',
    '  FEED             an RSS or Atom endpoint',
    '  NEWSROOM_INDEX   a page listing multiple press releases',
    '  PRESS_LISTING    a press or media page listing releases',
    '  IR_ROOT          the investor-relations landing page',
    '  OFFICIAL_DOMAIN  the company\'s own website root',
    '',
    'Do NOT return an individual press release, article, blog post or story,',
    'however recent or relevant. A page about one announcement is never a',
    'collection point. Do NOT return a newswire copy (GlobeNewswire, PR',
    'Newswire, Business Wire, Accesswire), an aggregator (Yahoo, Nasdaq,',
    'Benzinga, StockTitan, Seeking Alpha), a social post, or a search-results',
    'page. Those are not controlled by the company.',
    '',
    'Only return pages on domains the company itself controls.',
    '',
    'Return an empty list if you cannot find one. Never invent a URL.',
  ].join('\n');
}

/* -------------------------------------------------------------- validation */

/** Hosts that publish on an issuer's behalf but are not the issuer. */
const AGGREGATOR_HOSTS = [
  'stocktitan.net',
  'globenewswire.com',
  'prnewswire.com',
  'businesswire.com',
  'accesswire.com',
  'newsfilecorp.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'facebook.com',
  'medium.com',
  'substack.com',
];

/** Verdict for a candidate collection point. */
/**
 * `NOT_FETCHED` is separate from `ARTICLE` on purpose.
 *
 * A page that could not be retrieved and a page retrieved and found unsuitable
 * were the same verdict, so a transient network window wrote a durable-looking
 * rejection and the issuer waited a full day to be re-examined. Only one of
 * those two deserves a day.
 */
export type CollectionPointShape = 'FEED' | 'INDEX' | 'ARTICLE' | 'REJECTED' | 'NOT_FETCHED';

export interface CollectionPointVerdict {
  shape: CollectionPointShape;
  reason: string;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True when the URL alone shows this is one announcement.
 *
 * Release slugs are long, hyphenated and often carry a date. An index path is
 * short and generic — `/press`, `/investors/news`. This is deliberately a URL
 * test: it runs before any fetch and rejects the common case for free.
 */
export function looksLikeLeafArticle(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  const last = segments[segments.length - 1].toLowerCase();

  // A date in the path is a release archive convention, never an index.
  if (/^\d{4}$/.test(last) === false && /\d{4}[-/]\d{2}[-/]\d{2}/.test(parsed.pathname)) return true;

  // Numeric release identifiers, e.g. /press-new-notified/3309375
  if (/^\d{5,}$/.test(last)) return true;

  const words = last.split('-').filter(Boolean);
  return words.length >= 4;
}

/** True when the URL is a query against a site rather than a page of it. */
export function looksLikeSearchPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.search.length > 0) return true;
    return /\/search(\/|$)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** True when the fetched body carries single-article publication metadata. */
export function hasArticleMetadata(body: string): boolean {
  return (
    /<meta[^>]+property=["']article:published_time["']/i.test(body) ||
    /"@type"\s*:\s*"(?:News)?Article"/i.test(body) ||
    /"@type"\s*:\s*"PressRelease"/i.test(body)
  );
}

/** True when the body advertises a feed or paginates, as listings do. */
export function hasListingBehaviour(body: string): boolean {
  return (
    /<link[^>]+type=["']application\/(?:rss|atom)\+xml["']/i.test(body) ||
    /rel=["']next["']/i.test(body) ||
    /class=["'][^"']*pagination/i.test(body)
  );
}

/**
 * Counts distinct sibling links below a path.
 *
 * Two is the threshold. An index has many; an article has none, except for the
 * "related releases" rail that carries exactly one.
 */
export function countSiblingLinks(body: string, prefix: string): number {
  const quoted = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`href=["'](?:https?://[^"'/]+)?${quoted}/[^"'#?]+`, 'gi');
  const links = new Set<string>();
  for (const match of body.matchAll(pattern)) links.add(match[0].toLowerCase());
  return links.size;
}

/**
 * Decides what a candidate actually is, from the URL and the page it served.
 *
 * `body` may be null when the page could not be fetched; the URL-only checks
 * still apply, but nothing is promoted to INDEX without evidence from the page.
 * Refusing to guess here is the point: a wrong INDEX verdict is persisted, ends
 * further resolution, and silently freezes the issuer.
 */
export function classifyCollectionPoint(
  url: string,
  body: string | null,
): CollectionPointVerdict {
  const host = hostOf(url);
  if (!host) return { shape: 'REJECTED', reason: 'unparseable URL' };

  const hostKind = classifyHost(url);
  if (hostKind === 'NEWSWIRE') return { shape: 'REJECTED', reason: 'newswire host' };
  if (hostKind === 'SECONDARY') return { shape: 'REJECTED', reason: 'aggregator host' };
  if (hostKind === 'SEC') return { shape: 'REJECTED', reason: 'SEC host is collected separately' };
  if (AGGREGATOR_HOSTS.some((bad) => host === bad || host.endsWith(`.${bad}`))) {
    return { shape: 'REJECTED', reason: 'not an issuer-controlled host' };
  }
  if (looksLikeSearchPage(url)) return { shape: 'REJECTED', reason: 'search-results page' };

  if (body && /^\s*<\?xml|<rss[\s>]|<feed[\s>]/i.test(body)) {
    return { shape: 'FEED', reason: 'feed document' };
  }

  if (looksLikeLeafArticle(url)) return { shape: 'ARTICLE', reason: 'release slug in URL' };
  if (body && hasArticleMetadata(body)) {
    return { shape: 'ARTICLE', reason: 'single-article publication metadata' };
  }

  if (!body) return { shape: 'NOT_FETCHED', reason: 'not fetched; cannot confirm a listing' };

  let pathname: string;
  try {
    pathname = new URL(url).pathname.replace(/\/$/, '');
  } catch {
    return { shape: 'REJECTED', reason: 'unparseable URL' };
  }

  if (pathname && countSiblingLinks(body, pathname) >= 2) {
    return { shape: 'INDEX', reason: 'lists multiple releases' };
  }
  if (hasListingBehaviour(body) && pathname) {
    return { shape: 'INDEX', reason: 'listing behaviour (feed link or pagination)' };
  }

  return { shape: 'ARTICLE', reason: 'no listing evidence on page' };
}
