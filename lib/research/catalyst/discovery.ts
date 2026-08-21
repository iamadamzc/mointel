/**
 * Catalyst source discovery.
 *
 * This provider locates candidate public sources. It does not judge them.
 *
 * That boundary is the whole design: the model is asked "where was this
 * published and by whom", never "is this a strong catalyst" or "does this
 * explain the move". Those are Phase 4 questions, and asking them here would
 * smuggle interpretation into the evidence layer where it could not be audited
 * against sources.
 *
 * It is also the last resort in the cheap-first order. Deterministic checks
 * run first; this costs a model call and only runs when they cannot answer.
 */

import { hashContent } from '../fingerprint';
import { domainRole } from './domainPolicy';
import { normaliseTimestamp, type NormalisedTime } from '../time';
import type { SourceAuthority, SourceType } from '../types';

export type DiscoveredSourceKind =
  | 'COMPANY_IR'
  | 'COMPANY_NEWSROOM'
  | 'NEWSWIRE'
  | 'SEC'
  | 'SECONDARY';

export interface DiscoveredSource {
  title: string;
  url: string;
  /** Who published it, as reported by the provider. */
  publisher: string | null;
  published: NormalisedTime;
  kind: DiscoveredSourceKind;
  /** Why the provider believes this concerns the issuer. Not a verdict. */
  relevance: string;
  /** Whether this looks like the original rather than a mirror. */
  appearsOriginal: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DiscoveryRequest {
  ticker: string;
  companyName: string | null;
  /** Only sources at or after this ISO date are wanted. */
  since: string;
  /** URLs already held, so the provider is not asked to re-find them. */
  knownUrls: string[];
}

/** What one model call cost, when the provider reports it. */
export interface ProviderUsage {
  model: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}

export interface DiscoveryResult {
  sources: DiscoveredSource[];
  /** Null when no call was made, or when the provider returned no counts. */
  usage?: ProviderUsage | null;
  /** True when the provider ran; false when unavailable or skipped. */
  ran: boolean;
  /** Model calls actually issued by this request. */
  modelCalls: number;
  detail: string;
}

/**
 * Pluggable source locator. Implementations must not classify catalysts.
 */
export interface CatalystSourceDiscoveryProvider {
  readonly name: string;
  readonly available: boolean;
  discover(request: DiscoveryRequest): Promise<DiscoveryResult>;
}

/** Used when no model key is configured. Collection continues without it. */
export class NoopDiscoveryProvider implements CatalystSourceDiscoveryProvider {
  readonly name = 'noop';
  readonly available = false;

  async discover(): Promise<DiscoveryResult> {
    return {
      sources: [],
      ran: false,
      modelCalls: 0,
      detail: 'no discovery provider configured',
    };
  }
}

/* ------------------------------------------------------------------ schema */

/**
 * Strict schema for the locator. Every field is factual metadata about where
 * something was published — there is deliberately no field for strength,
 * sentiment, or whether the news explains a price move.
 */
export const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sources'],
  properties: {
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'url',
          'publisher',
          'publishedAt',
          'kind',
          'relevance',
          'appearsOriginal',
          'confidence',
        ],
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          publisher: { type: ['string', 'null'] },
          publishedAt: { type: ['string', 'null'] },
          kind: {
            type: 'string',
            enum: ['COMPANY_IR', 'COMPANY_NEWSROOM', 'NEWSWIRE', 'SEC', 'SECONDARY'],
          },
          relevance: { type: 'string' },
          appearsOriginal: { type: 'boolean' },
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        },
      },
    },
  },
} as const;

/* -------------------------------------------------------------- validation */

/**
 * What the host says a source is.
 *
 * The lists themselves live in `domainPolicy`, because the web-search filter
 * has to agree with this function about what a domain means and a second copy
 * would drift from the first the day either changed.
 */
export function classifyHost(url: string): DiscoveredSourceKind | null {
  switch (domainRole(url)) {
    case 'SEC':
      return 'SEC';
    case 'NEWSWIRE':
      return 'NEWSWIRE';
    case 'MIRROR':
      return 'SECONDARY';
    // A placeholder is not a kind of source; validateDiscovered refuses it
    // outright rather than classifying it.
    default:
      return null;
  }
}

export function authorityForKind(kind: DiscoveredSourceKind): SourceAuthority {
  switch (kind) {
    case 'SEC':
      return 'SEC';
    case 'COMPANY_IR':
    case 'COMPANY_NEWSROOM':
      return 'COMPANY_IR';
    case 'NEWSWIRE':
      return 'NEWSWIRE';
    default:
      return 'SECONDARY';
  }
}

/**
 * Rejects results we cannot treat as real sources.
 *
 * A model can produce a plausible URL that does not exist, and an invented URL
 * recorded as provenance is worse than no source at all — it would make an
 * unfounded conclusion look evidenced. So anything unparseable, non-http, or
 * carrying obvious placeholder markers is discarded, and the host has the final
 * say on kind regardless of what the model claimed.
 */
export function validateDiscovered(
  raw: unknown,
  knownUrls: ReadonlySet<string>,
): { accepted: DiscoveredSource[]; rejected: Array<{ url: string; reason: string }> } {
  const accepted: DiscoveredSource[] = [];
  const rejected: Array<{ url: string; reason: string }> = [];

  const list = Array.isArray((raw as { sources?: unknown[] })?.sources)
    ? ((raw as { sources: unknown[] }).sources as Array<Record<string, unknown>>)
    : [];

  for (const entry of list) {
    const url = typeof entry.url === 'string' ? entry.url.trim() : '';
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';

    if (!url || !title) {
      rejected.push({ url: url || '(none)', reason: 'missing url or title' });
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      rejected.push({ url, reason: 'unparseable URL' });
      continue;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      rejected.push({ url, reason: `unsupported protocol ${parsed.protocol}` });
      continue;
    }

    if (domainRole(url) === 'PLACEHOLDER' || /\{|\}|\.\.\./.test(url)) {
      // The one rejection that is decided by domain, and therefore the one
      // that may drive the search filter. blockedSearchDomains() is derived
      // from the same list this reads.
      rejected.push({ url, reason: 'placeholder or templated URL' });
      continue;
    }

    if (knownUrls.has(url)) {
      rejected.push({ url, reason: 'already held' });
      continue;
    }

    const claimedKind = entry.kind as DiscoveredSourceKind | undefined;
    /*
     * The host decides what a source is; the model only gets to speak where
     * the host cannot.
     *
     * A recognised host always wins outright — a model calling a Yahoo Finance
     * page "company IR" must not promote a mirror above the original it copied.
     * The subtler case is an UNRECOGNISED host, where the model's claim used to
     * be accepted unchallenged: XOS's discovery returned a Reddit thread, and
     * had the model labelled it NEWSWIRE it would have been stored with
     * newswire authority on nothing but its say-so.
     *
     * So the two claims that assert a recognised publisher — NEWSWIRE and SEC —
     * are only honoured by a matching host, because those categories ARE their
     * hosts: a newswire that is not on a newswire domain is not a newswire.
     * COMPANY_IR and COMPANY_NEWSROOM are different in kind. Every issuer's own
     * site is an unrecognised host by definition, and no global allowlist could
     * contain them all, so the claim is allowed to stand here and is validated
     * downstream against the issuer's identity by the registry.
     */
    const hostKind = classifyHost(url);
    const CLAIMS_RECOGNISED_PUBLISHER =
      claimedKind === 'NEWSWIRE' || claimedKind === 'SEC';

    const kind: DiscoveredSourceKind =
      hostKind ?? (CLAIMS_RECOGNISED_PUBLISHER ? 'SECONDARY' : claimedKind ?? 'SECONDARY');

    accepted.push({
      title,
      url,
      publisher: typeof entry.publisher === 'string' ? entry.publisher : null,
      published: normaliseTimestamp(
        typeof entry.publishedAt === 'string' ? entry.publishedAt : null,
      ),
      kind,
      relevance: typeof entry.relevance === 'string' ? entry.relevance : '',
      appearsOriginal: entry.appearsOriginal === true && kind !== 'SECONDARY',
      confidence:
        entry.confidence === 'HIGH' || entry.confidence === 'MEDIUM' ? entry.confidence : 'LOW',
    });
  }

  return { accepted, rejected };
}

export function discoveryContentHash(source: DiscoveredSource): string {
  return hashContent(`${source.url}\n${source.title}\n${source.published.utc ?? ''}`);
}

/**
 * The stored source type for a discovered kind.
 *
 * Kept beside authorityForKind so the two cannot drift. They did: everything
 * that was not SECONDARY was filed as NEWSWIRE, so an issuer's own press page
 * arrived carrying authority COMPANY_IR and type NEWSWIRE at once. Downstream
 * reads that ask "is the company's own source covered" consult the type, and
 * were told no while the authority said yes.
 */
export function sourceTypeForKind(kind: DiscoveredSourceKind): SourceType {
  switch (kind) {
    case 'SEC':
      return 'SEC_FILING';
    case 'COMPANY_IR':
      return 'COMPANY_IR';
    case 'COMPANY_NEWSROOM':
      return 'COMPANY_NEWSROOM';
    case 'NEWSWIRE':
      return 'NEWSWIRE';
    default:
      return 'SECONDARY_DISCOVERY';
  }
}
