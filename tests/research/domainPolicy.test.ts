import { describe, expect, it } from 'vitest';

import {
  blockedSearchDomains,
  DOMAIN_POLICY,
  domainRole,
  hostMatches,
  MAX_SEARCH_FILTER_DOMAINS,
  normaliseDomain,
} from '@/lib/research/catalyst/domainPolicy';
import { classifyHost, validateDiscovered } from '@/lib/research/catalyst/discovery';

/**
 * One domain policy, and proof it agrees with itself.
 *
 * The search filter, the host classifier and the validator all have to mean the
 * same thing by a domain. They used to hold three separate lists, which was
 * fine until the filter existed: a blocklist that disagrees with the validator
 * either starves the desk of a source it would have kept, or keeps paying to
 * retrieve one it discards, and the token ledger shows neither.
 */

/**
 * Every distinct host in the production source table on 20 August 2026.
 *
 * The classifier's matching rule changed from substring to suffix in this
 * commit, which is stricter. This fixture is how that change is known to be
 * safe rather than believed to be: every host the desk has ever stored must
 * classify the same way afterwards.
 */
const PRODUCTION_HOSTS: Array<[host: string, expected: ReturnType<typeof classifyHost>]> = [
  // Recognised publishers.
  ['www.sec.gov', 'SEC'],
  ['www.prnewswire.com', 'NEWSWIRE'],
  ['www.globenewswire.com', 'NEWSWIRE'],
  ['www.businesswire.com', 'NEWSWIRE'],
  ['www.newsfilecorp.com', 'NEWSWIRE'],
  // Mirrors: demoted, never refused.
  ['www.nasdaq.com', 'SECONDARY'],
  ['ng.investing.com', 'SECONDARY'],
  // Issuer sites and IR platforms: unrecognised by design, so the model's
  // claim is allowed to stand and the registry settles it downstream.
  ['ir.duostechnologies.com', null],
  ['catocorp.gcs-web.com', null],
  ['galmedpharma.investorroom.com', null],
  ['www.q4inc.com', null],
  ['www.einride.tech', null],
  ['freecast.com', null],
  ['zerostack.ai', null],
  ['ryojbaba.co.jp', null],
  ['ir.ipstrategy.co', null],
  // Not a recognised newswire today, and not made one by this change.
  ['www.newswire.ca', null],
  // Neither recognised nor rejected: stored, and a problem for another pass.
  ['www.reddit.com', null],
  ['www.stocktitan.net', null],
  ['marketchameleon.com', null],
  ['www.itiger.com', null],
  ['apnews.com', null],
  ['www.seattlepi.com', null],
  ['www.google.com', null],
  ['www.enable-javascript.com', null],
  // Not a subdomain of nasdaq.com, so not a mirror under either rule — the
  // fixture caught this expectation being wrong, which is what it is for.
  ['www.nasdaqtrader.com', null],
];

describe('domain normalisation', () => {
  it('accepts a URL or a bare domain and returns the same host', () => {
    expect(normaliseDomain('https://www.PRNewswire.com/news/x?a=1#f')).toBe('www.prnewswire.com');
    expect(normaliseDomain('www.prnewswire.com')).toBe('www.prnewswire.com');
    expect(normaliseDomain('www.prnewswire.com/news/x')).toBe('www.prnewswire.com');
    expect(normaliseDomain('www.prnewswire.com:443')).toBe('www.prnewswire.com');
    expect(normaliseDomain('user@www.prnewswire.com')).toBe('www.prnewswire.com');
    expect(normaliseDomain('www.prnewswire.com.')).toBe('www.prnewswire.com');
  });

  it('refuses things that are not hosts', () => {
    // 'privacy-policy' is real: production stored it as a source URL host.
    expect(normaliseDomain('privacy-policy')).toBeNull();
    expect(normaliseDomain('')).toBeNull();
    expect(normaliseDomain('   ')).toBeNull();
    expect(normaliseDomain('not a domain')).toBeNull();
    expect(normaliseDomain('..com')).toBeNull();
    expect(normaliseDomain('ftp://')).toBeNull();
  });
});

describe('suffix matching', () => {
  it('matches the domain and its subdomains only', () => {
    expect(hostMatches('prnewswire.com', 'prnewswire.com')).toBe(true);
    expect(hostMatches('www.prnewswire.com', 'prnewswire.com')).toBe(true);
    expect(hostMatches('a.b.prnewswire.com', 'prnewswire.com')).toBe(true);
  });

  it('does not match a host that merely contains the domain', () => {
    /*
     * The reason the rule changed. The old test was `host.includes('prnewswire')`,
     * so any host with the string anywhere in it carried newswire authority —
     * and newswire authority is what lets a source outrank a mirror.
     */
    expect(hostMatches('not-prnewswire.example.com', 'prnewswire.com')).toBe(false);
    expect(hostMatches('prnewswire.com.evil.net', 'prnewswire.com')).toBe(false);
    expect(classifyHost('https://prnewswire.com.evil.net/story')).not.toBe('NEWSWIRE');
  });
});

describe('the classifier over every host production has stored', () => {
  for (const [host, expected] of PRODUCTION_HOSTS) {
    it(`classifies ${host} as ${expected ?? 'unrecognised'}`, () => {
      expect(classifyHost(`https://${host}/some/path`)).toBe(expected);
    });
  }
});

describe('the search filter', () => {
  it('blocks only domains the validator already rejects', () => {
    /*
     * The invariant that makes the filter safe. Anything listed here must be
     * something the desk would have thrown away on arrival — otherwise the
     * filter is silently changing what counts as evidence.
     */
    for (const domain of blockedSearchDomains()) {
      const url = `https://${domain}/news/story`;
      const { accepted, rejected } = validateDiscovered(
        { sources: [{ url, title: 'A headline', kind: 'COMPANY_IR' }] },
        new Set<string>(),
      );
      expect(accepted, `${domain} must not be accepted`).toHaveLength(0);
      expect(rejected[0]?.reason).toBe('placeholder or templated URL');
    }
  });

  it('never blocks the SEC, a newswire, or an issuer site', () => {
    const blocked = blockedSearchDomains();
    const protectedDomains = [
      ...DOMAIN_POLICY.SEC_DOMAINS,
      ...DOMAIN_POLICY.NEWSWIRE_DOMAINS,
      'einride.tech',
      'ir.duostechnologies.com',
      'catocorp.gcs-web.com',
    ];
    for (const domain of protectedDomains) {
      expect(blocked).not.toContain(domain);
      // Nor by suffix: blocking a parent would take the child with it.
      for (const entry of blocked) {
        expect(hostMatches(domain, entry), `${entry} must not capture ${domain}`).toBe(false);
      }
    }
  });

  it('does not block a mirror, because a mirror is stored rather than refused', () => {
    /*
     * SECONDARY_DISCOVERY is a catalyst type, so a demoted mirror still reaches
     * the evidence bundle. Blocking these would be a change to what the desk
     * considers evidence, not a token optimisation, and it is deliberately not
     * made here.
     */
    for (const mirror of DOMAIN_POLICY.MIRROR_DOMAINS) {
      expect(blockedSearchDomains()).not.toContain(mirror);
      const { accepted } = validateDiscovered(
        { sources: [{ url: `https://${mirror}/story`, title: 'A headline' }] },
        new Set<string>(),
      );
      expect(accepted).toHaveLength(1);
      expect(accepted[0].kind).toBe('SECONDARY');
    }
  });

  it('emits normalised, deduplicated domains within the API limit', () => {
    const blocked = blockedSearchDomains();
    expect(blocked.length).toBeLessThanOrEqual(MAX_SEARCH_FILTER_DOMAINS);
    expect(new Set(blocked).size).toBe(blocked.length);
    for (const domain of blocked) {
      expect(domain).not.toMatch(/^https?:/);
      expect(normaliseDomain(domain)).toBe(domain);
    }
  });

  it('agrees with domainRole about what it is blocking', () => {
    for (const domain of blockedSearchDomains()) {
      expect(domainRole(`https://${domain}/x`)).toBe('PLACEHOLDER');
    }
  });
});
