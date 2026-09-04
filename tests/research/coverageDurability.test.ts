import { describe, expect, it } from 'vitest';

import { hasUsableSource } from '@/lib/research/catalyst/irRegistry';
import { EMPTY_COMPANY_SOURCES, type CompanySourceRegistry } from '@/lib/research/types';

/**
 * "We know where to look" must mean a place that LISTS future announcements.
 *
 * The coverage gap tested URL PRESENCE, and `investorRelationsUrl` is set to a
 * bare origin as a by-product of resolution — so an issuer whose only stored
 * address is a homepage satisfied the condition while having nowhere to poll.
 *
 * Measured on the 2026-08-23 store: 19 registry rows carry only that origin,
 * and on NINE current dossiers it SUPPRESSED the SEC-only gap. The warning was
 * silent on exactly the names where the desk is blind and believes it is not,
 * which is worse than a warning that never fires.
 *
 * These pin the predicate rather than the gap string, because the gap is
 * composed in `bundle.ts` and the predicate is what changed.
 */

const registry = (over: Partial<CompanySourceRegistry>): CompanySourceRegistry => ({
  ...EMPTY_COMPANY_SOURCES,
  ...over,
});

describe('a homepage is not a collection point', () => {
  it('refuses a bare investor-relations origin', () => {
    /*
     * The nine-name case. A URL exists, so the old condition was satisfied and
     * the SEC-only warning was suppressed — while the collector, which gates on
     * this same predicate, would refuse to poll it.
     */
    expect(
      hasUsableSource(registry({ investorRelationsUrl: 'https://example.com' })),
    ).toBe(false);
  });

  it('refuses a stored leaf article', () => {
    // A single release satisfies "a URL is present" and can never list a newer
    // one. `sourceShape` is what separates it from an index.
    expect(
      hasUsableSource(
        registry({
          newsroomUrl: 'https://example.com/news-release/one-story',
          pressReleaseIndexUrl: 'https://example.com/news-release/one-story',
          sourceShape: null,
        }),
      ),
    ).toBe(false);
  });

  it('accepts a feed and an index, which are the two that can list', () => {
    expect(hasUsableSource(registry({ feedUrl: 'https://example.com/rss', sourceShape: 'FEED' })))
      .toBe(true);
    expect(
      hasUsableSource(
        registry({ pressReleaseIndexUrl: 'https://example.com/news', sourceShape: 'INDEX' }),
      ),
    ).toBe(true);
  });

  it('refuses a legacy row whose shape was never recorded', () => {
    /*
     * `sourceShape` post-dates these rows, so the value deserialises to
     * undefined. Believing them is what left four production issuers polling a
     * frozen article — so an unrecorded shape must read as unresolved and
     * re-resolve, never as a source.
     */
    const legacy = { ...EMPTY_COMPANY_SOURCES, newsroomUrl: 'https://example.com/press' };
    delete (legacy as { sourceShape?: unknown }).sourceShape;
    expect(hasUsableSource(legacy as CompanySourceRegistry)).toBe(false);
  });
});

describe('coverage asks the collector’s own question', () => {
  it('imports the predicate rather than restating it', async () => {
    /*
     * Two copies of "what counts as a source" is how coverage came to claim one
     * the collector would refuse to read. Pinned as source because the failure
     * is a duplicated condition, not a wrong value.
     */
    const fs = await import('node:fs/promises');
    const source = await fs.readFile('lib/research/interpret/bundle.ts', 'utf8');

    expect(source).toContain("import { hasUsableSource } from '../catalyst/irRegistry';");
    expect(source).toContain('hasUsableSource(issuer.companySources)');
    // The old predicate, which must not survive alongside the new one.
    expect(source).not.toContain('issuer?.companySources?.investorRelationsUrl,');
  });
});
