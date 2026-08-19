import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertIssuer } from '@/lib/market/store/researchRepo';
import {
  resolveCompanySources,
  hasUsableSource,
  ancestorPaths,
  listsReleases,
} from '@/lib/research/catalyst/irRegistry';
import {
  classifyCollectionPoint,
  looksLikeLeafArticle,
  looksLikeSearchPage,
  type CompanySourceCandidate,
  type CompanySourceResolverProvider,
} from '@/lib/research/catalyst/companySourceContract';
import { EMPTY_COMPANY_SOURCES } from '@/lib/research/types';
import { RESOLVER_VERSION } from '@/lib/research/catalyst/collector';

/**
 * The company-source resolver contract.
 *
 * Both incidents are here as fixtures because both failed in the same place for
 * opposite-looking reasons. ENRD "resolved" to a single release and then spent a
 * month reporting July, because a leaf article is frozen by construction and
 * storing one ends resolution for good. XOS resolved to nothing, because every
 * candidate was a GlobeNewswire copy — and storing one of those would have been
 * worse than the failure, since it would have blocked the discovery fallback
 * that eventually found the Air Force release.
 *
 * So the contract is: store a feed or an index, or store nothing.
 */

const ENRD_LEAF =
  'https://www.einride.tech/press/einride-partners-with-tesla-for-the-worlds-largest-tesla-semi-deployment';
const ENRD_INDEX = 'https://www.einride.tech/press';
const XOS_NEWSWIRE =
  'https://www.globenewswire.com/news-release/2026/08/17/3346486/0/en/xos-secures-u-s-air-force-contract.html';

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-ir-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  db.close();
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows keeps the handle; the OS temp root is swept anyway. */
  }
});

function seed(ticker: string, sources?: Partial<typeof EMPTY_COMPANY_SOURCES>) {
  upsertIssuer(db, {
    ticker,
    companyName: ticker,
    cik: null,
    exchange: null,
    country: null,
    foreignIssuer: null,
    cikConfidence: 'NONE',
    mappingSource: null,
    irUrl: null,
    lastVerifiedAt: null,
    companySources: sources ? { ...EMPTY_COMPANY_SOURCES, ...sources } : null,
  } as never);
}

function resolverOffering(...urls: string[]): CompanySourceResolverProvider & { calls: number } {
  const candidates: CompanySourceCandidate[] = urls.map((url) => ({
    url,
    kind: 'NEWSROOM_INDEX',
    confidence: 'HIGH',
    rationale: null,
  }));
  return {
    name: 'test-resolver',
    available: true,
    calls: 0,
    async resolve() {
      (this as { calls: number }).calls += 1;
      return { candidates, modelCalls: 1, detail: 'test' };
    },
  };
}

const INDEX_BODY = '<a href="/press/one">a</a><a href="/press/two">b</a><a href="/press/three">c</a>';
const ARTICLE_BODY =
  '<meta property="article:published_time" content="2026-08-18"><p>One announcement.</p>';

/** Serves specific bodies; everything else 404s, as an unreachable probe would. */
function serve(routes: Record<string, string>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return routes[url] !== undefined
        ? new Response(routes[url], { status: 200, headers: { 'content-type': 'text/html' } })
        : new Response('not found', { status: 404 });
    }),
  );
}

const OPTIONS = { ticker: 'ENRD', companyName: 'Einride', userAgent: 'test' };

/* ------------------------------------------------------------ URL heuristics */

describe('telling a release apart from a collection point', () => {
  it('reads a long hyphenated slug as one release', () => {
    expect(looksLikeLeafArticle(ENRD_LEAF)).toBe(true);
  });

  it('reads a short generic path as a listing', () => {
    expect(looksLikeLeafArticle(ENRD_INDEX)).toBe(false);
    expect(looksLikeLeafArticle('https://www.einride.tech/investors/news')).toBe(false);
  });

  it('reads a numeric release id as one release', () => {
    expect(looksLikeLeafArticle('https://www.einride.tech/press-new-notified/3309375')).toBe(true);
  });

  it('reads a dated path as one release', () => {
    expect(looksLikeLeafArticle('https://acme.example.net/news/2026/08/18/thing')).toBe(true);
  });

  it('rejects a search-results page', () => {
    expect(looksLikeSearchPage('https://acme.example.net/search?q=press')).toBe(true);
    expect(looksLikeSearchPage('https://acme.example.net/press')).toBe(false);
  });

  it('yields the nearest ancestor first', () => {
    expect(ancestorPaths('/investors/news/2026/release')).toEqual([
      '/investors/news/2026',
      '/investors/news',
      '/investors',
    ]);
  });

  it('needs two siblings before calling a page an index', () => {
    expect(listsReleases('<a href="/press/one">a</a>', '/press')).toBe(false);
    expect(listsReleases(INDEX_BODY, '/press')).toBe(true);
  });
});

/* -------------------------------------------------------------- host authority */

describe('which hosts can be an issuer index at all', () => {
  it('refuses a newswire copy however the model labels it', () => {
    expect(classifyCollectionPoint(XOS_NEWSWIRE, INDEX_BODY)).toMatchObject({
      shape: 'REJECTED',
      reason: 'newswire host',
    });
  });

  it('refuses an aggregator', () => {
    const verdict = classifyCollectionPoint(
      'https://www.stocktitan.net/news/XOS/xos-secures-air-force',
      INDEX_BODY,
    );
    expect(verdict.shape).toBe('REJECTED');
  });

  it('refuses a social post', () => {
    expect(classifyCollectionPoint('https://www.reddit.com/r/stocks/abc', INDEX_BODY).shape).toBe(
      'REJECTED',
    );
  });

  it('accepts an issuer page that proves it lists releases', () => {
    expect(classifyCollectionPoint(ENRD_INDEX, INDEX_BODY)).toMatchObject({ shape: 'INDEX' });
  });

  it('will not promote a page it could not fetch', () => {
    // Guessing here is what persists a bad index and freezes the issuer.
    expect(classifyCollectionPoint(ENRD_INDEX, null).shape).toBe('ARTICLE');
  });

  it('reads single-article metadata as a release even on a short path', () => {
    expect(classifyCollectionPoint('https://www.einride.tech/story', ARTICLE_BODY).shape).toBe(
      'ARTICLE',
    );
  });
});

/* --------------------------------------------------------------- ENRD fixture */

describe('ENRD: the resolver is handed a release', () => {
  it('stores the index above it, not the release', async () => {
    seed('ENRD');
    serve({ [ENRD_LEAF]: ARTICLE_BODY, [ENRD_INDEX]: INDEX_BODY });

    const result = await resolveCompanySources(db, resolverOffering(ENRD_LEAF), OPTIONS);

    expect(result.registry.newsroomUrl).toBe(ENRD_INDEX);
    expect(result.registry.pressReleaseIndexUrl).toBe(ENRD_INDEX);
    expect(result.registry.sourceShape).toBe('INDEX');
    expect(result.registry.newsroomUrl).not.toBe(ENRD_LEAF);
  });

  it('treats a release as unresolved when no index can be reached', async () => {
    seed('ENRD');
    serve({ [ENRD_LEAF]: ARTICLE_BODY });

    const result = await resolveCompanySources(db, resolverOffering(ENRD_LEAF), OPTIONS);

    expect(result.registry.newsroomUrl).toBeNull();
    expect(result.registry.note).toContain('no durable company collection point');
    expect(result.registry.sourceShape).toBeNull();
  });

  it('takes the index directly when the resolver offers one', async () => {
    seed('ENRD');
    serve({ [ENRD_INDEX]: INDEX_BODY });

    const result = await resolveCompanySources(db, resolverOffering(ENRD_INDEX), OPTIONS);

    expect(result.registry.newsroomUrl).toBe(ENRD_INDEX);
    expect(result.modelCalls).toBe(1);
  });
});

/* ---------------------------------------------------------------- XOS fixture */

describe('XOS: every candidate is a newswire copy', () => {
  it('stores none of them and reports unresolved', async () => {
    seed('XOS');
    serve({ [XOS_NEWSWIRE]: INDEX_BODY });

    const result = await resolveCompanySources(
      db,
      resolverOffering(XOS_NEWSWIRE),
      { ticker: 'XOS', companyName: 'Xos, Inc.', userAgent: 'test' },
    );

    expect(result.registry.newsroomUrl).toBeNull();
    expect(result.registry.feedUrl).toBeNull();
    expect(result.detail).toContain('no durable company source');
  });

  it('leaves the issuer eligible for the discovery fallback', async () => {
    seed('XOS');
    serve({ [XOS_NEWSWIRE]: INDEX_BODY });

    const result = await resolveCompanySources(
      db,
      resolverOffering(XOS_NEWSWIRE),
      { ticker: 'XOS', companyName: 'Xos, Inc.', userAgent: 'test' },
    );

    // Nothing usable was stored, so the collector's fallback stays reachable.
    expect(hasUsableSource(result.registry)).toBe(false);
  });
});

/* ------------------------------------------------------- leaf remediation */

describe('registries already holding a leaf article', () => {
  it('does not count one as a usable source', () => {
    expect(
      hasUsableSource({
        ...EMPTY_COMPANY_SOURCES,
        newsroomUrl: ENRD_LEAF,
        pressReleaseIndexUrl: ENRD_LEAF,
        sourceShape: 'ARTICLE',
      }),
    ).toBe(false);
  });

  it('does not count a legacy entry whose URL reads as a release', () => {
    // Written before sourceShape existed: judge it by the URL instead.
    expect(
      hasUsableSource({
        ...EMPTY_COMPANY_SOURCES,
        newsroomUrl: ENRD_LEAF,
        pressReleaseIndexUrl: ENRD_LEAF,
        sourceShape: null,
      }),
    ).toBe(false);
  });

  it('still counts a stored feed', () => {
    expect(
      hasUsableSource({ ...EMPTY_COMPANY_SOURCES, feedUrl: 'https://www.einride.tech/rss' }),
    ).toBe(true);
  });

  it('re-resolves a stored leaf into the index without clearing timestamps', async () => {
    seed('ENRD', {
      newsroomUrl: ENRD_LEAF,
      pressReleaseIndexUrl: ENRD_LEAF,
      sourceShape: 'ARTICLE',
      lastDiscoveryAt: '2026-08-18T11:00:00.000Z',
    });
    serve({ [ENRD_INDEX]: INDEX_BODY });

    const result = await resolveCompanySources(db, resolverOffering(ENRD_INDEX), OPTIONS);

    expect(result.registry.newsroomUrl).toBe(ENRD_INDEX);
    // The discovery clock is untouched; nothing was reset to force this.
    expect(result.registry.lastDiscoveryAt).toBe('2026-08-18T11:00:00.000Z');
  });

  it('spends nothing once a durable source is stored', async () => {
    seed('ENRD', { pressReleaseIndexUrl: ENRD_INDEX, sourceShape: 'INDEX' });
    const resolver = resolverOffering(ENRD_INDEX);

    const result = await resolveCompanySources(db, resolver, OPTIONS);

    expect(result.modelCalls).toBe(0);
    expect(resolver.calls).toBe(0);
    expect(result.resolved).toBe(false);
  });

  it('holds a negative result for a day rather than re-asking each cycle', async () => {
    seed('ENRD');
    serve({});
    const resolver = resolverOffering(ENRD_LEAF);

    await resolveCompanySources(db, resolver, OPTIONS);
    const second = await resolveCompanySources(db, resolver, {
      ...OPTIONS,
      now: new Date(Date.parse('2026-08-18T12:00:00.000Z')),
    });

    expect(second.modelCalls).toBe(0);
    expect(resolver.calls).toBe(1);
  });
});

/* ------------------------------------------- the collector's own judgement */

describe('the collector agrees with the resolver about what is usable', () => {
  /*
   * Production caught this and the unit tests had not.
   *
   * hasUsableSource was corrected in the resolver, but the collector kept its
   * own inline test — "is any URL present" — so ENRD, still holding the TUV SUD
   * article, looked resolved. It never took the resolver's turn, spent its one
   * recovery episode on a discovery pass, and stamped itself forward with the
   * leaf intact. One predicate, used by both, is the only version of this that
   * cannot drift again.
   */
  it('does not consider a stored leaf article a usable source', () => {
    expect(
      hasUsableSource({
        ...EMPTY_COMPANY_SOURCES,
        newsroomUrl: ENRD_LEAF,
        pressReleaseIndexUrl: ENRD_LEAF,
        investorRelationsUrl: 'https://www.einride.tech',
        sourceShape: null,
        confidence: 'HIGH',
      }),
    ).toBe(false);
  });

  it('considers a durable index usable', () => {
    expect(
      hasUsableSource({
        ...EMPTY_COMPANY_SOURCES,
        newsroomUrl: ENRD_INDEX,
        pressReleaseIndexUrl: ENRD_INDEX,
        sourceShape: 'INDEX',
      }),
    ).toBe(true);
  });

  it('advances the resolver version so stranded registries get another episode', () => {
    // Bumped because the fix above changes which issuers can resolve at all.
    expect(RESOLVER_VERSION).toBeGreaterThanOrEqual(3);
  });
});

describe('what an unresolved verdict leaves behind', () => {
  it('drops a leaf left over from the old contract', async () => {
    // Production kept these: hasUsableSource already refused them, so nothing
    // acted on them, but the row still read as though a newsroom were on file.
    seed('ENRD', {
      newsroomUrl: ENRD_LEAF,
      pressReleaseIndexUrl: ENRD_LEAF,
      investorRelationsUrl: 'https://www.einride.tech',
      lastDiscoveryAt: '2026-08-18T21:13:26.392Z',
    });
    serve({}); // nothing fetchable, as einride.tech/press proved to be

    const result = await resolveCompanySources(db, resolverOffering(ENRD_LEAF), OPTIONS);

    expect(result.registry.newsroomUrl).toBeNull();
    expect(result.registry.pressReleaseIndexUrl).toBeNull();
    expect(result.registry.note).toContain('no durable company collection point');
    // The company domain is still a fact worth keeping.
    expect(result.registry.investorRelationsUrl).toBe('https://www.einride.tech');
    // And the discovery clock is untouched.
    expect(result.registry.lastDiscoveryAt).toBe('2026-08-18T21:13:26.392Z');
  });

  it('keeps a durable source that is already on file', async () => {
    seed('ENRD', { pressReleaseIndexUrl: ENRD_INDEX, sourceShape: 'INDEX' });

    const result = await resolveCompanySources(db, resolverOffering(ENRD_INDEX), OPTIONS);

    expect(result.registry.pressReleaseIndexUrl).toBe(ENRD_INDEX);
    expect(result.modelCalls).toBe(0);
  });
});

describe('legacy rows whose shape was never recorded', () => {
  /*
   * Guessing from the URL let too much through. Production still held
   * `/eslim-02-eha26/` and `readnews.php?cid=186&id=152` as press indexes —
   * both single articles, neither slug-shaped enough to be caught.
   */
  it.each([
    'https://www.hutch-med.com/eslim-02-eha26/',
    'https://cdthb.cn/en/readnews.php?cid=186&id=152',
    'https://investors.aixcrypto.ai/node/9586/html',
    'https://www.univest.us/news/',
  ])('treats %s as unverified rather than usable', (url) => {
    expect(
      hasUsableSource({ ...EMPTY_COMPANY_SOURCES, pressReleaseIndexUrl: url, sourceShape: null }),
    ).toBe(false);
  });

  it('trusts a shape that was actually recorded', () => {
    expect(
      hasUsableSource({
        ...EMPTY_COMPANY_SOURCES,
        pressReleaseIndexUrl: 'https://www.univest.us/news/',
        sourceShape: 'INDEX',
      }),
    ).toBe(true);
  });

  it('still trusts a feed, which proved itself when it was stored', () => {
    expect(
      hasUsableSource({
        ...EMPTY_COMPANY_SOURCES,
        feedUrl: 'https://acme.example.net/rss',
        sourceShape: null,
      }),
    ).toBe(true);
  });
});
