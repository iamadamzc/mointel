/**
 * Bounded company-source collector.
 *
 * Fetches pages an issuer publishes itself: a feed, a newsroom index, or a
 * specific release already listed by one of those. It is not a crawler — it
 * never follows links it was not given, never walks a site, and never expands
 * beyond the registry entry it was handed.
 *
 * What is retained is metadata plus a limited evidence excerpt. A company's
 * release archive is their copyright; we keep enough to reason about the
 * announcement and a canonical URL pointing at the original.
 */

import { extractEvidence, htmlToText } from '../sec/documents';
import { hashContent } from '../fingerprint';
import { normaliseTimestamp, type NormalisedTime } from '../time';
import { looksLikeFeed, parseFeed, parseReleaseIndex, type FeedItem } from './feeds';

/** Identifies us to issuer sites, matching the courtesy SEC requires. */
export function companyUserAgent(secUserAgent: string | null): string {
  return secUserAgent ?? 'Momentum Intelligence Trading Desk';
}

export type FetchFailure =
  | 'UNAVAILABLE'
  | 'ACCESS_RESTRICTED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'TOO_LARGE'
  | 'EMPTY'
  | 'JS_ONLY';

export interface PageFetch {
  url: string;
  body: string | null;
  status: number | null;
  contentType: string | null;
  failure: FetchFailure | null;
  detail: string | null;
}

/** Hard ceiling on a retrieved page, so one bad URL cannot exhaust memory. */
const MAX_BYTES = 3_000_000;
const DEFAULT_TIMEOUT_MS = 12_000;

export interface CompanyFetchOptions {
  userAgent: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Retrieves one page.
 *
 * Every failure mode is named rather than thrown, because an unreachable IR
 * site must never take down SEC evidence collection for the same ticker. The
 * caller records the gap and carries on.
 */
export async function fetchCompanyPage(
  url: string,
  options: CompanyFetchOptions,
): Promise<PageFetch> {
  const impl = options.fetchImpl ?? fetch;
  const base: PageFetch = {
    url,
    body: null,
    status: null,
    contentType: null,
    failure: null,
    detail: null,
  };

  let response: Response;
  try {
    response = await impl(url, {
      headers: { 'User-Agent': options.userAgent, Accept: 'text/html,application/xml,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    return {
      ...base,
      failure: name === 'TimeoutError' || name === 'AbortError' ? 'TIMEOUT' : 'UNAVAILABLE',
      detail: name,
    };
  }

  const contentType = response.headers.get('content-type');

  if (response.status === 403 || response.status === 401 || response.status === 429) {
    // Access refused is a coverage fact worth recording, not an error to hide.
    return {
      ...base,
      status: response.status,
      contentType,
      failure: 'ACCESS_RESTRICTED',
      detail: `HTTP ${response.status}`,
    };
  }
  if (response.status === 404 || response.status === 410) {
    return { ...base, status: response.status, contentType, failure: 'NOT_FOUND' };
  }
  if (!response.ok) {
    return {
      ...base,
      status: response.status,
      contentType,
      failure: 'UNAVAILABLE',
      detail: `HTTP ${response.status}`,
    };
  }

  const length = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > MAX_BYTES) {
    return { ...base, status: response.status, contentType, failure: 'TOO_LARGE' };
  }

  // The body read needs its own guard: the abort signal can fire *during*
  // streaming, after headers arrived, and that rejection would otherwise
  // escape this function and take down collection for the whole ticker.
  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    return {
      ...base,
      status: response.status,
      contentType,
      failure: name === 'TimeoutError' || name === 'AbortError' ? 'TIMEOUT' : 'UNAVAILABLE',
      detail: `body read: ${name}`,
    };
  }

  if (body.trim().length === 0) {
    return { ...base, status: response.status, contentType, failure: 'EMPTY' };
  }

  return { ...base, body: body.slice(0, MAX_BYTES), status: response.status, contentType };
}

/** Text a JS-rendered shell leaves behind once markup is stripped. */
const JS_ONLY_THRESHOLD_CHARS = 400;

export interface CompanySourceRead {
  items: FeedItem[];
  /** Which reader handled the page. */
  mode: 'FEED' | 'INDEX' | 'NONE';
  failure: FetchFailure | null;
  detail: string | null;
}

/**
 * Reads an issuer page into release entries.
 *
 * A feed is parsed as a feed; otherwise the page is read as a release index. A
 * page that yields no entries and almost no text is reported as JS_ONLY rather
 * than as an empty newsroom, because those are different facts: one means the
 * company published nothing, the other means we could not see what they
 * published.
 */
export function readCompanySource(page: PageFetch): CompanySourceRead {
  if (!page.body) {
    return { items: [], mode: 'NONE', failure: page.failure, detail: page.detail };
  }

  if (looksLikeFeed(page.body) || (page.contentType ?? '').includes('xml')) {
    const items = parseFeed(page.body);
    return {
      items,
      mode: 'FEED',
      failure: items.length === 0 ? 'EMPTY' : null,
      detail: items.length === 0 ? 'feed parsed but contained no entries' : null,
    };
  }

  const items = parseReleaseIndex(page.body, page.url);
  if (items.length === 0) {
    const visible = htmlToText(page.body);
    if (visible.length < JS_ONLY_THRESHOLD_CHARS) {
      return {
        items: [],
        mode: 'INDEX',
        failure: 'JS_ONLY',
        detail: 'page rendered client-side; no server-side release list',
      };
    }
    return { items: [], mode: 'INDEX', failure: 'EMPTY', detail: 'no release entries found' };
  }

  return { items, mode: 'INDEX', failure: null, detail: null };
}

export interface ReleaseEvidence {
  title: string;
  url: string;
  published: NormalisedTime;
  contentHash: string;
  excerpt: string | null;
  concepts: string[];
}

/**
 * Turns a fetched release page into stored evidence.
 *
 * Only a bounded excerpt is retained. When the page cannot be fetched, the feed
 * entry's own title and summary still carry provenance, so the announcement is
 * recorded as having existed even where its body is unavailable to us.
 */
export function buildReleaseEvidence(item: FeedItem, page: PageFetch | null): ReleaseEvidence {
  if (!page?.body) {
    const basis = `${item.title}\n${item.summary ?? ''}`;
    return {
      title: item.title,
      url: item.url ?? '',
      published: item.published,
      contentHash: hashContent(basis),
      excerpt: item.summary,
      concepts: [],
    };
  }

  const text = htmlToText(page.body);
  const evidence = extractEvidence(text);

  return {
    title: item.title,
    url: item.url ?? page.url,
    published: item.published,
    contentHash: hashContent(text),
    excerpt: evidence.excerpt,
    concepts: evidence.concepts,
  };
}

/** Normalises a possibly-relative issuer URL, returning null when unusable. */
export function absoluteUrl(candidate: string, base: string): string | null {
  try {
    const url = new URL(candidate, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export { normaliseTimestamp };
