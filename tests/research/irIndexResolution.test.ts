import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertIssuer } from '@/lib/market/store/researchRepo';
import {
  resolveCompanySources,
  ancestorPaths,
  listsReleases,
} from '@/lib/research/catalyst/irRegistry';
import type { CatalystSourceDiscoveryProvider } from '@/lib/research/catalyst/discovery';

/**
 * Turning a located release into the page that lists releases.
 *
 * The resolver asks where an announcement was published, so the answer is one
 * announcement. Storing it is actively harmful: it satisfies the "usable
 * source" check, which retires the resolver, and then every later pass re-reads
 * a frozen article. ENRD proved it in production — resolved to a safety
 * partnership story and went on reporting a July catalyst.
 */

const ARTICLE = 'https://www.einride.tech/press/einride-and-scan-sverige-partner';
const INDEX = 'https://www.einride.tech/press';

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-ir-'));
  db = openDatabase(path.join(directory, 'market.db'));
  upsertIssuer(db, {
    ticker: 'ENRD',
    companyName: 'Einride',
    cik: null,
    exchange: null,
    country: null,
    foreignIssuer: null,
    cikConfidence: 'NONE',
    mappingSource: null,
    irUrl: null,
    lastVerifiedAt: null,
    companySources: null,
  } as never);
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

describe('walking up from a release to its index', () => {
  it('yields the nearest ancestor first', () => {
    expect(ancestorPaths('/press/einride-and-scan-sverige-partner')).toEqual(['/press']);
    expect(ancestorPaths('/investors/news/2026/some-release')).toEqual([
      '/investors/news/2026',
      '/investors/news',
      '/investors',
    ]);
  });

  it('yields nothing for a release published at the root', () => {
    expect(ancestorPaths('/some-release')).toEqual([]);
  });
});

describe('recognising a page that lists releases', () => {
  it('accepts a page linking several siblings', () => {
    const body = '<a href="/press/one">a</a><a href="/press/two">b</a>';
    expect(listsReleases(body, '/press')).toBe(true);
  });

  it('rejects an article carrying a single related link', () => {
    // One "related release" rail is not an index.
    expect(listsReleases('<a href="/press/one">a</a>', '/press')).toBe(false);
  });

  it('accepts absolute sibling links', () => {
    const body =
      '<a href="https://www.einride.tech/press/one">a</a><a href="https://www.einride.tech/press/two">b</a>';
    expect(listsReleases(body, '/press')).toBe(true);
  });
});

function discoveryReturning(url: string): CatalystSourceDiscoveryProvider {
  return {
    name: 'test-discovery',
    available: true,
    discover: async () => ({
      sources: [
        {
          url,
          title: 'Einride and Scan Sverige partner',
          publisher: 'Einride',
          publishedAt: null,
          kind: 'COMPANY_NEWSROOM' as const,
          confidence: 'HIGH' as const,
          original: true,
        },
      ],
      modelCalls: 1,
      detail: 'ok',
    }),
  } as unknown as CatalystSourceDiscoveryProvider;
}

/** Serves the index for /press and a bare article everywhere else. */
function stubWeb(indexBody: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === INDEX) {
        return new Response(indexBody, { status: 200, headers: { 'content-type': 'text/html' } });
      }
      return new Response('not found', { status: 404 });
    }),
  );
}

describe('what the resolver persists', () => {
  it('stores the index rather than the release it was handed', async () => {
    stubWeb('<a href="/press/one">a</a><a href="/press/two">b</a>');

    const result = await resolveCompanySources(db, discoveryReturning(ARTICLE), {
      ticker: 'ENRD',
      companyName: 'Einride',
      userAgent: null,
    });

    expect(result.registry.newsroomUrl).toBe(INDEX);
    expect(result.registry.pressReleaseIndexUrl).toBe(INDEX);
    expect(result.detail).toContain('newsroom index');
  });

  it('falls back to the release when no index can be reached', async () => {
    // Every probe 404s; a single article still beats no source at all.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));

    const result = await resolveCompanySources(db, discoveryReturning(ARTICLE), {
      ticker: 'ENRD',
      companyName: 'Einride',
      userAgent: null,
    });

    expect(result.registry.newsroomUrl).toBe(ARTICLE);
  });

  it('does not mistake the article itself for its own index', async () => {
    // The article links two siblings, but it is not the page that lists them.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input) === ARTICLE
          ? new Response('<a href="/press/one">a</a><a href="/press/two">b</a>', { status: 200 })
          : new Response('nope', { status: 404 }),
      ),
    );

    const result = await resolveCompanySources(db, discoveryReturning(ARTICLE), {
      ticker: 'ENRD',
      companyName: 'Einride',
      userAgent: null,
    });

    expect(result.registry.newsroomUrl).toBe(ARTICLE);
  });
});
