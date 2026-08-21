/**
 * One place that decides what a domain means.
 *
 * Three lists used to live inside `classifyHost` and a fourth inside
 * `validateDiscovered`, which was survivable while nothing else needed them.
 * Then the web-search tool grew a `filters.blocked_domains` option, and a
 * blocklist that disagrees with the validator is worse than no blocklist: the
 * search stops returning a domain the desk would happily have stored, or keeps
 * paying to retrieve one the desk throws away, and nothing in either case is
 * visible from the token ledger.
 *
 * So the roles are declared once, matched one way, and the search filter is
 * DERIVED from the rejection rule rather than maintained beside it.
 *
 * Matching is suffix-based — `host === domain` or `host.endsWith('.' + domain)`
 * — which is deliberately stricter than the substring test it replaces. That
 * test classified any host merely CONTAINING `prnewswire` as a newswire, so
 * `not-prnewswire.example.com` would have carried newswire authority. Every
 * host the desk has actually stored classifies identically under both rules,
 * which `domainPolicy.test.ts` asserts against the production host list.
 */

/** The API caps each filter list; exceeding it is an error, not a truncation. */
export const MAX_SEARCH_FILTER_DOMAINS = 100;

/** What a recognised domain is, independent of what a model calls it. */
export type DomainRole = 'SEC' | 'NEWSWIRE' | 'MIRROR' | 'PLACEHOLDER';

/** The regulator. Nothing else may claim it. */
const SEC_DOMAINS = ['sec.gov'] as const;

/**
 * Primary newswires: an issuer's release on one of these is the release.
 *
 * Never blockable. A press release crossing the wire is frequently the only
 * public form a small-cap catalyst takes.
 */
const NEWSWIRE_DOMAINS = [
  'prnewswire.com',
  'globenewswire.com',
  'accesswire.com',
  'businesswire.com',
  'newsfilecorp.com',
] as const;

/**
 * Hosts that republish rather than publish.
 *
 * Classified as SECONDARY so a mirror can never outrank the original it copied.
 * Note what this list does NOT do: these domains are still ACCEPTED and still
 * count as catalyst evidence. Demoting a source and refusing it are different
 * decisions, and only the second one may drive a search filter.
 */
const MIRROR_DOMAINS = [
  'finance.yahoo.com',
  'stocktwits.com',
  'investing.com',
  'benzinga.com',
  'seekingalpha.com',
  'marketbeat.com',
  'msn.com',
  'nasdaq.com',
  'fool.com',
] as const;

/**
 * Documentation domains, reserved by RFC 2606 and resolvable by nobody.
 *
 * A URL here is a model filling in a template, so `validateDiscovered` rejects
 * it outright — which is what makes it, and currently only it, eligible for the
 * search filter below.
 */
const PLACEHOLDER_DOMAINS = ['example.com', 'example.org', 'example.net'] as const;

/**
 * A bare registrable host, or null if the input is not one.
 *
 * Accepts a full URL or a bare domain, because the search API wants domains
 * without a scheme and the validator holds URLs, and a policy that requires its
 * callers to remember which is which will eventually be given the wrong one.
 */
export function normaliseDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) return null;

  let host = trimmed;
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname;
    } catch {
      return null;
    }
  } else {
    // Bare form: drop any path, query, fragment, port or credentials.
    host = host.split(/[/?#]/)[0];
    if (host.includes('@')) host = host.slice(host.lastIndexOf('@') + 1);
    if (host.includes(':')) host = host.slice(0, host.indexOf(':'));
  }

  host = host.replace(/\.$/, '');
  if (host.length === 0 || !host.includes('.')) return null;
  // A hostname, not a path fragment or an IP-with-scheme mishap.
  if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.') || host.includes('..')) return null;
  return host;
}

/** True when `host` is `domain` or a subdomain of it. */
export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function firstMatch(host: string, domains: readonly string[]): boolean {
  return domains.some((domain) => hostMatches(host, domain));
}

/**
 * What the desk recognises this URL's domain as, or null when it recognises
 * nothing — which is the normal case, because every issuer's own site is an
 * unrecognised host by definition.
 */
export function domainRole(url: string): DomainRole | null {
  const host = normaliseDomain(url);
  if (host === null) return null;
  if (firstMatch(host, SEC_DOMAINS)) return 'SEC';
  if (firstMatch(host, NEWSWIRE_DOMAINS)) return 'NEWSWIRE';
  if (firstMatch(host, MIRROR_DOMAINS)) return 'MIRROR';
  if (firstMatch(host, PLACEHOLDER_DOMAINS)) return 'PLACEHOLDER';
  return null;
}

/**
 * Domains the hosted web search should not spend tokens retrieving.
 *
 * Derived from the deterministic rejection rule, and containing only domains
 * whose every returned URL `validateDiscovered` already discards. That is a
 * short list on purpose.
 *
 * It is short because the validator rejects almost nothing by domain: mirror
 * hosts are demoted to SECONDARY and then STORED, and SECONDARY_DISCOVERY is a
 * catalyst type, so those pages reach the evidence bundle. Blocking them would
 * not be a token optimisation, it would be a change to what the desk considers
 * evidence — a decision that belongs to whoever owns the research policy, made
 * deliberately and with the coverage cost measured, not smuggled in through a
 * search filter. Until that decision is taken this filter saves nothing, and
 * saying so is more useful than a list that quietly drops sources.
 */
export function blockedSearchDomains(): string[] {
  const blocked = PLACEHOLDER_DOMAINS.map((domain) => normaliseDomain(domain)).filter(
    (domain): domain is string => domain !== null,
  );

  if (blocked.length > MAX_SEARCH_FILTER_DOMAINS) {
    throw new Error(
      `blocked_domains holds ${blocked.length} entries; the API accepts ${MAX_SEARCH_FILTER_DOMAINS}`,
    );
  }
  return blocked;
}

/** Exposed for the policy tests, which assert the roles against real hosts. */
export const DOMAIN_POLICY = {
  SEC_DOMAINS,
  NEWSWIRE_DOMAINS,
  MIRROR_DOMAINS,
  PLACEHOLDER_DOMAINS,
} as const;
