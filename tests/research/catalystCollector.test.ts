import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  insertResearchSources,
  readSources,
  upsertIssuer,
} from '@/lib/market/store/researchRepo';
import { SecClient } from '@/lib/research/sec/client';
import { readDeskEvents } from '@/lib/market/store/repo';
import { normaliseTimestamp } from '@/lib/research/time';
import {
  collectCatalystEvidence,
  type MaterialDemandEvent,
  RESOLVER_VERSION,
} from '@/lib/research/catalyst/collector';
import { resolveCompanySources } from '@/lib/research/catalyst/irRegistry';
import type {
  CompanySourceCandidate,
  CompanySourceResolverProvider,
} from '@/lib/research/catalyst/companySourceContract';
import type {
  CatalystSourceDiscoveryProvider,
  DiscoveryResult,
} from '@/lib/research/catalyst/discovery';
import type { CatalystConfig, SecConfig } from '@/lib/research/config';
import type { NewsAdapter, NewsFetchResult } from '@/lib/research/news/types';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-catalyst-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

const SEC_CONFIG: SecConfig = {
  userAgent: 'Test Desk test@example.com',
  maxRequestsPerSecond: 1000,
  activePollSeconds: 60,
};

const CATALYST_CONFIG: CatalystConfig = {
  sourcePollSeconds: 60,
  webDiscoveryUnresolvedMinutes: 10,
  webDiscoveryResolvedMinutes: 30,
  activeFreshnessHours: 36,
  contextLookbackDays: 45,
};

const NOW = new Date('2026-08-17T13:00:00Z');

/**
 * The company-source resolver, counted the same way discovery is.
 *
 * It answers a different question and costs its own call, so the cost tests
 * need to see it separately rather than inferring it from discovery traffic.
 */
class CountingResolver implements CompanySourceResolverProvider {
  readonly name = 'test-resolver';
  available = true;
  calls = 0;

  constructor(private readonly candidates: CompanySourceCandidate[] = []) {}

  async resolve() {
    this.calls += 1;
    return { candidates: this.candidates, modelCalls: 1, detail: 'test resolver' };
  }
}

/**
 * Paid lookups this pass, whichever provider made them.
 *
 * Resolution and discovery alternate — an unresolved issuer is told WHERE it
 * publishes on one eligible pass and asked WHAT it published on the next — so
 * the ceiling that matters is the total per pass, not either counter alone.
 * The split itself is asserted in the resolver-contract tests.
 */
function paidLookups(discovery: CountingDiscovery, resolverDouble: CountingResolver): number {
  return discovery.calls + resolverDouble.calls;
}

/** Fresh per test; individual tests replace it when they need a resolution. */
let resolver: CountingResolver;
beforeEach(() => {
  resolver = new CountingResolver();
});

/** Counts every call so "zero model calls" can be asserted, not assumed. */
class CountingDiscovery implements CatalystSourceDiscoveryProvider {
  readonly name = 'counting';
  available = true;
  calls = 0;

  constructor(private readonly result: Partial<DiscoveryResult> = {}) {}

  async discover(): Promise<DiscoveryResult> {
    this.calls += 1;
    return {
      sources: this.result.sources ?? [],
      ran: true,
      modelCalls: 1,
      detail: this.result.detail ?? 'ran',
    };
  }
}

const RSS_BODY = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Acme Announces Major Contract Award</title>
<link>https://acme.example.net/news/contract</link>
<pubDate>Mon, 17 Aug 2026 11:30:00 GMT</pubDate></item>
</channel></rss>`;

/** SEC client backed by canned responses; no network. */
function fakeSecClient(routes: Record<string, string>): SecClient {
  return new SecClient({
    config: SEC_CONFIG,
    sleep: async () => undefined,
    fetchImpl: async (url) => {
      const key = String(url);
      const body = routes[key];
      if (body === undefined) return new Response('missing', { status: 404 });
      return new Response(body, { status: 200 });
    },
  });
}

function seedIssuer(db: ReturnType<typeof temporaryDb>, feedUrl: string | null) {
  upsertIssuer(db, {
    ticker: 'ACME',
    companyName: 'Acme Inc.',
    cik: '0000000123',
    exchange: 'NASDAQ',
    country: 'CA',
    foreignIssuer: false,
    cikConfidence: 'HIGH',
    mappingSource: 'company_tickers_exchange',
    irUrl: null,
    lastVerifiedAt: NOW.toISOString(),
    companySources: feedUrl
      ? {
          investorRelationsUrl: 'https://acme.example.net',
          newsroomUrl: 'https://acme.example.net/news',
          pressReleaseIndexUrl: 'https://acme.example.net/news',
          feedUrl,
          discoveryMethod: 'test',
          confidence: 'HIGH',
          lastVerifiedAt: NOW.toISOString(),
          note: null,
          lastDiscoveryAt: null,
          lastDiscoveryFingerprint: null,
          resolverVersion: RESOLVER_VERSION,
          lastDiscoveryMode: null,
          sourceShape: 'FEED' as const,
        }
      : undefined,
  });
}

/** Stubs global fetch for company-source pages only. */
function withCompanyFetch<T>(routes: Record<string, string>, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    const key = String(url);
    if (routes[key] !== undefined) return new Response(routes[key], { status: 200 });
    return new Response('not found', { status: 404 });
  }) as typeof fetch;

  return run().finally(() => {
    globalThis.fetch = original;
  });
}

describe('catalyst collection', () => {
  it('collects a release from a known company feed', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch(
      {
        'https://acme.example.net/rss': RSS_BODY,
        'https://acme.example.net/news/contract': '<html><body><p>Acme won a contract.</p></body></html>',
      },
      () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW },
        ),
    );

    expect(report.companyReleases).toHaveLength(1);
    expect(report.companyReleases[0].title).toBe('Acme Announces Major Contract Award');
    expect(report.state).toBe('RECENT_SOURCE_LOCATED');
    // A known feed answered the question, so no model call was justified.
    expect(discovery.calls).toBe(0);
    expect(report.modelCalls).toBe(0);
  });

  it('performs zero model calls on an unchanged second pass', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');
    const discovery = new CountingDiscovery();
    const routes = {
      'https://acme.example.net/rss': RSS_BODY,
      'https://acme.example.net/news/contract': '<html><body><p>Acme won a contract.</p></body></html>',
    };

    const run = () =>
      withCompanyFetch(routes, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW },
        ),
      );

    const first = await run();
    const second = await run();

    expect(first.fingerprintChanged).toBe(true);
    // The heart of the cheap-first rule: polling again changed nothing, so it
    // must cost nothing.
    expect(second.fingerprintChanged).toBe(false);
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(discovery.calls).toBe(0);
    expect(second.modelCalls).toBe(0);
    expect(readSources(db, 'ACME')).toHaveLength(1);
  });

  it('uses web discovery only when deterministic sources found nothing recent', async () => {
    const db = temporaryDb();
    // No feed on file and no recent source, so discovery is the only option.
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW },
      ),
    );

    expect(paidLookups(discovery, resolver)).toBe(1);
    expect(report.discoveryRan).toBe(true);
    expect(report.modelCalls).toBe(1);
  });

  it('does not call discovery merely because polling came round again', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');
    const discovery = new CountingDiscovery();
    const routes = {
      'https://acme.example.net/rss': RSS_BODY,
      'https://acme.example.net/news/contract': '<html><body><p>Acme won a contract.</p></body></html>',
    };

    for (let i = 0; i < 5; i += 1) {
      await withCompanyFetch(routes, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          // Time advances across polls; evidence does not.
          { ticker: 'ACME', now: new Date(NOW.getTime() + i * 60_000) },
        ),
      );
    }

    expect(discovery.calls).toBe(0);
  });

  it('does not re-run discovery for a quiet ticker on every poll', async () => {
    // Regression: a ticker with no recent news satisfies "nothing found" on
    // every poll, which on its own would buy a model call every minute for
    // precisely the names least likely to reward one.
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    for (let i = 0; i < 5; i += 1) {
      await withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + i * 60_000) },
        ),
      );
    }

    // One attempt, then the spacing holds it back.
    expect(paidLookups(discovery, resolver)).toBe(1);
  });

  it('remembers the discovery attempt even for a ticker with no issuer row', async () => {
    // Regression: with no issuer record the stamp had nowhere to live, so an
    // unresolved ticker repeated a paid search on every poll indefinitely.
    const db = temporaryDb();
    const discovery = new CountingDiscovery();

    for (let i = 0; i < 4; i += 1) {
      await withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'UNKNOWN', companyName: null, now: new Date(NOW.getTime() + i * 60_000) },
        ),
      );
    }

    expect(paidLookups(discovery, resolver)).toBe(1);
  });

  it('makes zero web or model calls before the discovery interval', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const run = (minutes: number) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000) },
        ),
      );

    await run(0); // first check ever
    const second = await run(2);
    const third = await run(9); // still inside the 10m unresolved interval

    expect(paidLookups(discovery, resolver)).toBe(1);
    expect(second.modelCalls).toBe(0);
    expect(third.modelCalls).toBe(0);
  });

  it('runs one cheap discovery check for an unresolved name after the interval', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const run = (minutes: number) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000) },
        ),
      );

    await run(0);
    const later = await run(11);

    // A newswire release can appear without any source we already poll moving,
    // so an unchanged local fingerprint is not proof that nothing happened.
    expect(paidLookups(discovery, resolver)).toBe(2);
    expect(later.discoveryTrigger).toBe('INTERVAL');
    expect(later.discoveryIntervalMinutes).toBe(10);
    expect(later.modelCalls).toBe(1);
  });

  it('leaves fingerprint and interpretation untouched when discovery finds nothing', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery({ sources: [] });

    const run = (minutes: number) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000) },
        ),
      );

    const first = await run(0);
    const later = await run(11);

    expect(later.discoveryRan).toBe(true);
    // The point of the cheap tier: a fruitless check costs one small call and
    // creates no downstream work at all.
    expect(later.fingerprint).toBe(first.fingerprint);
    expect(later.fingerprintChanged).toBe(false);
    expect(later.newSourceCount).toBe(0);
    expect(later.eventsEmitted).toEqual([]);
    expect(later.interpretationCalls).toBe(0);
  });

  it('changes the fingerprint and emits CATALYST_SOURCE_CHANGE on a new source', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);

    const discovery = new CountingDiscovery({
      sources: [
        {
          title: 'Acme Announces Major Contract Award',
          url: 'https://www.globenewswire.com/news/acme-contract',
          publisher: 'GlobeNewswire',
          published: normaliseTimestamp('2026-08-17T11:45:00Z'),
          kind: 'NEWSWIRE',
          relevance: 'issuer named in headline',
          appearsOriginal: true,
          confidence: 'HIGH',
        },
      ],
    });

    /*
     * Two passes, because an issuer with no known publishing location gets the
     * resolver's turn first and general discovery's turn second. That
     * alternation is deliberate: running both on one pass would double the
     * model spend for exactly the names that resolve worst.
     */
    const first = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' },
      ),
    );
    expect(first.discoveryMode).toBe('RESOLVER');

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        // Far enough past the interval that the next paid pass is due.
        { ticker: 'ACME', now: new Date(NOW.getTime() + 6 * 3600_000), tradingDate: '2026-08-17' },
      ),
    );

    expect(report.discoveryMode).toBe('DISCOVERY');
    expect(report.newSourceCount).toBe(1);
    expect(report.fingerprintChanged).toBe(true);
    expect(report.eventsEmitted).toContain('CATALYST_SOURCE_CHANGE');

    const change = readDeskEvents(db, '2026-08-17').find(
      (event) => event.type === 'CATALYST_SOURCE_CHANGE',
    )!;
    expect(change.symbol).toBe('ACME');
    // The event states what appeared, never whether it is good news.
    expect(change.message).not.toMatch(/strong|bullish|good|fresh catalyst/i);
  });

  it('uses the longer interval once a canonical catalyst source is established', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');
    const discovery = new CountingDiscovery();
    const routes = {
      'https://acme.example.net/rss': RSS_BODY,
      'https://acme.example.net/news/contract': '<html><body><p>Acme won a contract.</p></body></html>',
    };

    const run = (minutes: number) =>
      withCompanyFetch(routes, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000) },
        ),
      );

    const first = await run(0);
    expect(first.resolved).toBe(true);
    expect(first.discoveryIntervalMinutes).toBe(30);

    // 11 minutes would have re-checked an unresolved name; a resolved one waits.
    await run(11);
    expect(discovery.calls).toBe(0);

    await run(31);
    expect(discovery.calls).toBe(1);
  });

  it('stops paid discovery for a ticker that is no longer relevant', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    for (let i = 0; i < 6; i += 1) {
      await withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + i * 20 * 60_000), relevant: false },
        ),
      );
    }

    // Evidence is retained; only the recurring cost stops.
    expect(discovery.calls).toBe(0);
  });

  it('permits an early check on a material demand change', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const run = (minutes: number, materialEvent: MaterialDemandEvent | null = null) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000), materialEvent },
        ),
      );

    await run(0);
    await run(2); // inside the interval, nothing happened
    expect(paidLookups(discovery, resolver)).toBe(1);

    const early = await run(3, { kind: 'HALT', detail: 'trading halted' });
    expect(paidLookups(discovery, resolver)).toBe(2);
    expect(early.discoveryTrigger).toBe('MATERIAL_EVENT');
  });

  it('never performs interpretation, however much time passes', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    let interpretationCalls = 0;
    for (let hour = 0; hour < 8; hour += 1) {
      const report = await withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + hour * 3600_000) },
        ),
      );
      interpretationCalls += report.interpretationCalls;
    }

    // Discovery may be paced by the clock; interpretation is never bought by it.
    expect(interpretationCalls).toBe(0);
  });

  it('re-checks after the interval once new evidence has landed', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const run = (offsetMinutes: number) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + offsetMinutes * 60_000) },
        ),
      );

    await run(0);
    expect(paidLookups(discovery, resolver)).toBe(1);

    // Something genuinely new lands, and enough time has passed.
    insertResearchSources(db, [
      {
        ticker: 'ACME',
        sourceType: 'SEC_EXHIBIT',
        title: 'EX-99.1',
        url: 'https://www.sec.gov/Archives/edgar/data/123/ex99-1.htm',
        publishedAt: '2026-07-01T12:00:00.000Z',
        fetchedAt: NOW.toISOString(),
        accession: '0000000123-26-000009',
        secForm: '8-K',
        authority: 'SEC',
        contentHash: 'new-exhibit',
        documentFingerprint: 'new-exhibit-doc',
        excerpt: null,
        metadata: {},
        active: true,
      },
    ]);

    await run(31);
    expect(paidLookups(discovery, resolver)).toBe(2);
  });

  it('links a SEC exhibit to its parent filing', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);

    insertResearchSources(db, [
      {
        ticker: 'ACME',
        sourceType: 'SEC_FILING',
        title: '8-K',
        url: 'https://www.sec.gov/Archives/edgar/data/123/000000012326000001/a.htm',
        publishedAt: '2026-08-17T00:00:00.000Z',
        fetchedAt: NOW.toISOString(),
        accession: '0000000123-26-000001',
        secForm: '8-K',
        authority: 'SEC',
        contentHash: 'filing-hash',
        documentFingerprint: 'filing-doc',
        excerpt: null,
        metadata: {},
        active: true,
      },
    ]);

    // The filing index PAGE is what states exhibit types; index.json only
    // carries icon names such as TEXT.GIF.
    const indexUrl =
      'https://www.sec.gov/Archives/edgar/data/123/000000012326000001/0000000123-26-000001-index.htm';
    const exhibit =
      'https://www.sec.gov/Archives/edgar/data/123/000000012326000001/ex99-1.htm';

    const sec = fakeSecClient({
      [indexUrl]: `<table class="tableFile">
        <tr><td>1</td><td>Form 8-K</td><td><a href="/x/a.htm">a.htm</a></td><td>8-K</td><td>4000</td></tr>
        <tr><td>2</td><td>Press Release</td><td><a href="/x/ex99-1.htm">ex99-1.htm</a></td><td>EX-99.1</td><td>12000</td></tr>
        <tr><td>3</td><td>Logo</td><td><a href="/x/logo.jpg">logo.jpg</a></td><td>GRAPHIC</td><td>2000</td></tr>
        </table>`,
      [exhibit]: '<html><body><p>Acme Announces Major Contract Award today.</p></body></html>',
    });

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        sec,
        new CountingDiscovery(),
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, disableDiscovery: true },
      ),
    );

    expect(report.exhibitsFound).toHaveLength(1);
    expect(report.exhibitsFound[0].parentAccession).toBe('0000000123-26-000001');

    const stored = readSources(db, 'ACME').find((s) => s.sourceType === 'SEC_EXHIBIT')!;
    expect(stored.metadata.parentForm).toBe('8-K');
    expect(stored.metadata.exhibitType).toBe('EX-99.1');
    // Marketing 7b332c27 / Commercial read 50: no date or time in the stored title.
    expect(stored.title).toBe('EX-99.1 to 8-K');
    /*
     * THE PARENT HERE HAS NO ACCEPTANCE TIME, SO NEITHER HAS THE EXHIBIT.
     *
     * The seeded filing carries no precision, which stores as UNKNOWN over a
     * date whose clock is a placeholder. `INFERRED` would claim a time derived
     * from the parent when the parent states none, and that claim is what put
     * all 878 stored exhibits into an evening hour bucket: midnight UTC reads
     * as 20:00 ET. UNKNOWN keeps the row out of a latency measurement instead
     * of into the wrong bucket.
     */
    expect(stored.publishedPrecision).toBe('UNKNOWN');
  });

  it('carries an exhibit at INFERRED when its parent states an acceptance time', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);

    // EDGAR accepted the whole submission at one instant, so this is the
    // moment the market could read the release. The exhibit inherits it and is
    // INFERRED rather than EXACT: it is standing in for the parent's timestamp,
    // which is the case `lib/research/time.ts` names by hand.
    const acceptance = '2026-08-17T12:34:56.000Z';

    insertResearchSources(db, [
      {
        ticker: 'ACME',
        sourceType: 'SEC_FILING',
        title: '8-K',
        url: 'https://www.sec.gov/Archives/edgar/data/123/000000012326000002/a.htm',
        publishedAt: acceptance,
        publishedPrecision: 'EXACT',
        fetchedAt: NOW.toISOString(),
        accession: '0000000123-26-000002',
        secForm: '8-K',
        authority: 'SEC',
        contentHash: 'filing-hash-exact',
        documentFingerprint: 'filing-doc-exact',
        excerpt: null,
        metadata: {},
        active: true,
      },
    ]);

    const indexUrl =
      'https://www.sec.gov/Archives/edgar/data/123/000000012326000002/0000000123-26-000002-index.htm';
    const exhibit =
      'https://www.sec.gov/Archives/edgar/data/123/000000012326000002/ex99-1.htm';

    const sec = fakeSecClient({
      [indexUrl]: `<table class="tableFile">
        <tr><td>1</td><td>Form 8-K</td><td><a href="/x/a.htm">a.htm</a></td><td>8-K</td><td>4000</td></tr>
        <tr><td>2</td><td>Press Release</td><td><a href="/x/ex99-1.htm">ex99-1.htm</a></td><td>EX-99.1</td><td>12000</td></tr>
        </table>`,
      [exhibit]:
        '<html><body><p>Acme Announces Major Contract Award today.</p></body></html>',
    });

    await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        sec,
        new CountingDiscovery(),
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, disableDiscovery: true },
      ),
    );

    const stored = readSources(db, 'ACME').find((s) => s.sourceType === 'SEC_EXHIBIT')!;
    expect(stored.publishedPrecision).toBe('INFERRED');
    // The instant itself survives the inheritance -- an INFERRED row is usable
    // for a latency measurement in a way an UNKNOWN one is not.
    expect(stored.publishedAt).toBe(acceptance);
    // The instant lives in publishedAt only, never in the stored title (Marketing 7b332c27).
    expect(stored.title).toBe('EX-99.1 to 8-K');
  });

  it('degrades gracefully when the IR site is unreachable', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        new CountingDiscovery(),
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, disableDiscovery: true },
      ),
    );

    expect(report.inaccessible.length).toBeGreaterThan(0);
    expect(report.state).toBe('COVERAGE_INCOMPLETE');
    // An unreachable newsroom must not be reported as "no news".
    expect(report.state).not.toBe('NO_RECENT_SOURCE_LOCATED');
  });

  it('contains a company-source fetch failure instead of failing the ticker', async () => {
    // Regression: an abort during the body read escaped the fetch helper and
    // took down collection for the whole ticker.
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');

    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      const error = new Error('aborted');
      error.name = 'TimeoutError';
      throw error;
    }) as typeof fetch;

    try {
      const report = await collectCatalystEvidence(
        db,
        fakeSecClient({}),
        new CountingDiscovery(),
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, disableDiscovery: true },
      );

      expect(report.inaccessible.some((entry) => entry.failure === 'TIMEOUT')).toBe(true);
      expect(report.state).toBe('COVERAGE_INCOMPLETE');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('collects SEC and direct sources with no model key at all', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');

    const unavailable: CatalystSourceDiscoveryProvider = {
      name: 'none',
      available: false,
      discover: async () => ({ sources: [], ran: false, modelCalls: 0, detail: 'unavailable' }),
    };

    const report = await withCompanyFetch(
      {
        'https://acme.example.net/rss': RSS_BODY,
        'https://acme.example.net/news/contract': '<html><body><p>Acme won a contract.</p></body></html>',
      },
      () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          unavailable,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW },
        ),
    );

    expect(report.companyReleases).toHaveLength(1);
    expect(report.modelCalls).toBe(0);
  });

  it('produces no catalyst grade or interpretation field', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');

    const report = await withCompanyFetch(
      {
        'https://acme.example.net/rss': RSS_BODY,
        'https://acme.example.net/news/contract': '<html><body><p>Acme won a contract.</p></body></html>',
      },
      () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          new CountingDiscovery(),
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW },
        ),
    );

    const serialised = JSON.stringify(report);
    // Phase 3 states collection facts only; every verdict word belongs to
    // Phase 4, including the exact phrase it will eventually emit.
    expect(serialised).not.toMatch(/NO FRESH CATALYST FOUND/);
    expect(serialised).not.toMatch(/catalystGrade|STRONG|DIRTY_FLOAT|FRONTSIDE|bullish/i);
    expect(report.state).toMatch(
      /^(RECENT_SOURCE_LOCATED|NO_RECENT_SOURCE_LOCATED|COVERAGE_INCOMPLETE|SOURCE_DISCOVERY_FAILED)$/,
    );
  });
});

describe('IR registry', () => {
  it('reuses a stored source instead of rediscovering it', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');
    const discovery = new CountingDiscovery();

    const result = await resolveCompanySources(db, resolver, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      userAgent: 'test',
      now: NOW,
    });

    expect(result.resolved).toBe(false);
    expect(result.modelCalls).toBe(0);
    expect(discovery.calls).toBe(0);
    expect(result.registry.feedUrl).toBe('https://acme.example.net/rss');
  });

  it('records a negative result so it is not re-asked every cycle', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);

    await resolveCompanySources(db, resolver, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      userAgent: 'test',
      now: NOW,
    });
    const second = await resolveCompanySources(db, resolver, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      userAgent: 'test',
      now: new Date(NOW.getTime() + 60_000),
    });

    expect(resolver.calls).toBe(1);
    expect(second.modelCalls).toBe(0);
    expect(second.registry.note).toContain('no durable company collection point');
  });

  it('does not call a model when no provider is available', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);

    const result = await resolveCompanySources(
      db,
      { name: 'none', available: false, resolve: async () => ({ candidates: [], modelCalls: 0, detail: '' }) },
      { ticker: 'ACME', companyName: 'Acme Inc.', userAgent: 'test', now: NOW },
    );

    expect(result.modelCalls).toBe(0);
    expect(result.registry.note).toContain('no resolver provider');
  });
  it('spends nothing on the resolver before a paid pass is due', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery({ sources: [] });

    // First pass takes the resolver's turn and sets the clock.
    await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' }),
    );
    const afterFirst = discovery.calls;

    // A rapid re-poll a minute later must buy nothing at all. This is what the
    // seven cost tests protect, and what the earlier draft broke.
    const second = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: new Date(NOW.getTime() + 60_000), tradingDate: '2026-08-17' }),
    );

    expect(discovery.calls).toBe(afterFirst);
    expect(second.discoveryMode).toBeNull();
    expect(second.modelCalls).toBe(0);
  });

  it('gives one turn per eligible pass, never two', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery({ sources: [] });

    const first = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' }),
    );

    // One tier ran, so at most one provider call was bought.
    expect(first.discoveryMode).toBe('RESOLVER');
    expect(discovery.calls).toBeLessThanOrEqual(1);
  });

  it('still reaches general discovery after the resolver finds nothing', async () => {
    // The failure mode worth preventing: an issuer whose IR site cannot be
    // located retrying that same lookup forever and never getting the fallback.
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery({ sources: [] });

    const first = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' }),
    );
    const second = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: new Date(NOW.getTime() + 6 * 3600_000), tradingDate: '2026-08-17' }),
    );

    expect(first.discoveryMode).toBe('RESOLVER');
    expect(second.discoveryMode).toBe('DISCOVERY');
  });

  it('never offers the resolver a turn once a source is known', async () => {
    const db = temporaryDb();
    // A feed URL means the registry already knows where this issuer publishes.
    seedIssuer(db, 'https://acme.example.net/feed.xml');
    const discovery = new CountingDiscovery({ sources: [] });

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' }),
    );

    // Knowing where they publish is the resolver's entire job. It is done.
    expect(report.discoveryMode).not.toBe('RESOLVER');
  });
});

describe('urgent first qualification', () => {
  /*
   * ENRD is the case this exists for. It printed a new high at 06:30:01,
   * spiked to $10.53 by 06:31, entered the Top 12 at 06:32 and was analysed
   * twenty seconds later — while the release that caused all of it had
   * published at 06:30. Under the ordinary alternating cooldown the first pass
   * buys a resolution and the release waits for the next one, which is an
   * interval too late for the only moment anybody was looking.
   */
  const QUALIFIED: MaterialDemandEvent = {
    kind: 'ENTERED_TOP_N',
    detail: 'entered the discovery Top 12 at #5',
  } as MaterialDemandEvent;

  it('collects the release in the SAME pass the ticker qualifies', async () => {
    const db = temporaryDb();
    // The issuer's publishing location is known, so there is nothing to resolve
    // and the release must be read immediately rather than an interval later.
    seedIssuer(db, 'https://acme.example.net/rss');
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch(
      { 'https://acme.example.net/rss': RSS_BODY },
      () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', materialEvent: QUALIFIED },
        ),
    );

    // What matters is that the release is in THIS pass's evidence rather than
    // the next one. A qualifying name may also buy one search; it may not buy
    // a resolution it does not need.
    expect(report.companyReleases).toHaveLength(1);
    expect(report.fingerprintChanged).toBe(true);
    expect(report.companySourceDetail).not.toContain('urgent');
    expect(discovery.calls).toBeLessThanOrEqual(1);
  });

  it('resolves and reads the source within one pass when unresolved', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', materialEvent: QUALIFIED },
      ),
    );

    // Resolution was attempted ahead of the known-source read, so anything it
    // finds is fetched now rather than next interval. discoveryMode records the
    // last tier to run, which is the fallback when resolution finds nothing —
    // the resolver's own turn is recorded on companySourceDetail.
    expect(report.companySourceDetail).toContain('urgent');
  });

  it('falls back to general discovery in the same pass when resolution finds nothing', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', materialEvent: QUALIFIED },
      ),
    );

    // Two calls is the ceiling, and only for this one episode: a resolution
    // that finds nothing must not leave the name with no search at all.
    expect(discovery.calls).toBeLessThanOrEqual(2);
    expect(report.modelCalls).toBeLessThanOrEqual(2);
  });

  it('spends nothing extra on the polls that follow', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const run = (minutes: number, materialEvent: MaterialDemandEvent | null = null) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          {
            ticker: 'ACME',
            now: new Date(NOW.getTime() + minutes * 60_000),
            materialEvent,
          },
        ),
      );

    await run(0, QUALIFIED);
    const afterQualification = discovery.calls;

    // Ordinary polling for the next few minutes buys nothing: the episode is
    // over and the interval governs again.
    await run(1);
    await run(2);
    await run(3);

    expect(discovery.calls).toBe(afterQualification);
  });

  it('never treats background polling as urgent', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    // No material event: a quiet name the desk merely glanced at.
    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' },
      ),
    );

    expect(report.companySourceDetail).not.toContain('urgent');
    expect(discovery.calls).toBeLessThanOrEqual(1);
  });
});

describe('resolver success feeds the same collection pass', () => {
  /*
   * The provider contract, documented by exercising it.
   *
   * resolveCompanySources asks a dedicated resolver where the issuer publishes
   * and accepts only a durable collection point — a feed, or a page that proves
   * it lists releases. A newswire copy says where one release lived, not where
   * the issuer publishes, and a single release page is frozen by construction.
   * The accepted URL is written to newsroomUrl and pressReleaseIndexUrl, and
   * the collector's known-company-source read picks it up from there.
   *
   * The doubles sit at that boundary: the resolver names a feed, and discovery
   * is left idle to prove the resolution cost one call and not two. The registry
   * is NOT preloaded — it starts unresolved and the resolver fills it, which is
   * the whole point of the test.
   */
  class ResolvingDiscovery implements CatalystSourceDiscoveryProvider {
    readonly name = 'resolving';
    available = true;
    calls = 0;

    constructor(private readonly newsroomUrl: string) {}

    async discover(): Promise<DiscoveryResult> {
      this.calls += 1;
      return {
        ran: true,
        modelCalls: 1,
        detail: 'located newsroom',
        sources: [
          {
            title: 'Acme Newsroom',
            url: this.newsroomUrl,
            publisher: 'Acme Inc.',
            published: normaliseTimestamp('2026-08-17T11:30:00Z'),
            // An unclassified host: classifyHost returns null for a company's
            // own domain, so the declared kind is what carries it through.
            kind: 'COMPANY_NEWSROOM',
            relevance: 'issuer newsroom',
            appearsOriginal: true,
            confidence: 'HIGH',
          },
        ],
      };
    }
  }

  const QUALIFIED: MaterialDemandEvent = {
    kind: 'ENTERED_TOP_N',
    detail: 'entered the discovery Top 12 at #5',
  } as MaterialDemandEvent;

  it('resolves, fetches and collects the release in one pass', async () => {
    const db = temporaryDb();
    seedIssuer(db, null); // unresolved: nothing on file
    const discovery = new CountingDiscovery();
    resolver = new CountingResolver([
      { url: 'https://acme.example.net/rss', kind: 'FEED', confidence: 'HIGH', rationale: null },
    ]);

    const report = await withCompanyFetch(
      { 'https://acme.example.net/rss': RSS_BODY },
      () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', materialEvent: QUALIFIED },
        ),
    );

    // The location was unknown when this pass began and the release is in its
    // evidence by the time it ends. That is the sequence ENRD needed at 06:32.
    expect(report.companySources.newsroomUrl).toBe('https://acme.example.net/rss');
    expect(report.companyReleases).toHaveLength(1);
    expect(report.companyReleases[0].title).toBe('Acme Announces Major Contract Award');
    expect(report.fingerprintChanged).toBe(true);

    // One resolution, and no separate search on top of it.
    expect(resolver.calls).toBe(1);
    expect(discovery.calls).toBe(0);
    expect(report.modelCalls).toBe(1);
  });

  it('does not repeat the urgent spend on later polls', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new ResolvingDiscovery('https://acme.example.net/rss');
    const routes = { 'https://acme.example.net/rss': RSS_BODY };

    await withCompanyFetch(routes, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', materialEvent: QUALIFIED }),
    );
    const afterEpisode = discovery.calls;

    // Same evidence, ordinary polls. The source is known now, so the resolver
    // is never offered another turn and nothing new is bought.
    for (const minutes of [1, 2, 5]) {
      const later = await withCompanyFetch(routes, () =>
        collectCatalystEvidence(db, fakeSecClient({}), discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          {
            ticker: 'ACME',
            now: new Date(NOW.getTime() + minutes * 60_000),
            tradingDate: '2026-08-17',
          }),
      );
      expect(later.fingerprintChanged).toBe(false);
      expect(later.modelCalls).toBe(0);
    }

    expect(discovery.calls).toBe(afterEpisode);
  });
});

describe('recovery for issuers poisoned by the old resolver', () => {
  /*
   * XOS and ENRD were both attempted by a production path that never called the
   * resolver, so their lastDiscoveryAt is populated and the urgent gate — which
   * keys on never-attempted — can never fire for them. A resolver-version stamp
   * makes exactly those rows eligible once. No timestamp is cleared and no
   * symbol is named.
   */
  function seedPoisoned(db: ReturnType<typeof temporaryDb>) {
    upsertIssuer(db, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      cik: '0000000123',
      exchange: 'NASDAQ',
      country: 'CA',
      foreignIssuer: false,
      cikConfidence: 'HIGH',
      mappingSource: 'company_tickers_exchange',
      irUrl: null,
      lastVerifiedAt: NOW.toISOString(),
      companySources: {
        investorRelationsUrl: null,
        newsroomUrl: null,
        pressReleaseIndexUrl: null,
        feedUrl: null,
        discoveryMethod: null,
        confidence: 'UNKNOWN',
        lastVerifiedAt: null,
        note: null,
        // Attempted under the old path, which is why it is stuck.
        lastDiscoveryAt: new Date(NOW.getTime() - 60_000).toISOString(),
        lastDiscoveryFingerprint: null,
        lastDiscoveryMode: null,
        resolverVersion: null,
        sourceShape: null,
      },
    });
  }

  it('gives a poisoned issuer one episode without a material event', async () => {
    const db = temporaryDb();
    seedPoisoned(db);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        // Authorised by the queue, which holds the durable claim. The collector
        // no longer decides this for itself: inferring it from registry state
        // is what let five restarts re-open work that was already done.
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', recoveryEpisode: true }),
    );

    // Nothing spiked; it is eligible because the code that judged it could not
    // have succeeded. It is recovery work, and it says so — not "urgent".
    expect(report.discoveryMode).toBe('RECOVERY');
    expect(report.companySourceDetail).toContain('recovery');
    expect(report.companySourceDetail).not.toContain('urgent');
  });

  it('never repeats the episode, however many polls or restarts follow', async () => {
    const db = temporaryDb();
    seedPoisoned(db);
    const discovery = new CountingDiscovery();

    const run = (minutes: number) =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(db, fakeSecClient({}), discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          {
            ticker: 'ACME',
            now: new Date(NOW.getTime() + minutes * 60_000),
            tradingDate: '2026-08-17',
          }),
      );

    await run(0);
    const afterRecovery = discovery.calls;

    // Rapid polls, and the long gaps a restart would look like. The stamp
    // advanced even though resolution found nothing, so none of these re-enter
    // recovery.
    await run(1);
    await run(2);
    const laterReport = await run(600);

    expect(discovery.calls).toBeGreaterThanOrEqual(afterRecovery);
    expect(laterReport.companySourceDetail).not.toContain('urgent');
  });

  it('advances the stamp even when resolution finds nothing', async () => {
    const db = temporaryDb();
    seedPoisoned(db);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(db, fakeSecClient({}), discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17', recoveryEpisode: true }),
    );

    // A resolver that cannot find this issuer must not retry forever.
    expect(report.companySources.resolverVersion).toBe(RESOLVER_VERSION);
  });

  it('leaves an already-current issuer alone', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss'); // stamped current
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch(
      { 'https://acme.example.net/rss': RSS_BODY },
      () =>
        collectCatalystEvidence(db, fakeSecClient({}), discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' }),
    );

    expect(report.companySourceDetail).not.toContain('urgent');
    expect(discovery.calls).toBe(0);
  });
});

describe('news adapters inside collection', () => {
  const release = {
    adapter: 'test',
    provider: 'benzinga',
    providerItemId: '1',
    headline: 'Acme Announces Pivotal Trial Result',
    summary: 'Acme announced a pivotal result.',
    bodyText: 'TORONTO, Aug. 17, 2026 (GLOBE NEWSWIRE) -- Acme announced...',
    url: 'https://www.benzinga.com/pressreleases/acme',
    publishedAt: '2026-08-17T11:50:00.000Z',
    symbols: ['ACME'],
    originatingWire: 'GLOBENEWSWIRE' as const,
  };
  const adapter = (result: NewsFetchResult): NewsAdapter => ({
    id: 'test',
    fetchForTicker: async () => result,
  });

  it('a wire release from a news adapter answers the ticker and spares the paid pass', async () => {
    const db = temporaryDb();
    // No feed on file: without the adapter, discovery is the only option.
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW },
        [adapter({ ok: true, items: [release], truncated: false, requests: 1 })],
      ),
    );

    expect(report.newsItems).toHaveLength(1);
    expect(report.newsItems[0].authority).toBe('NEWSWIRE');
    expect(report.newsFetchDetail).toBe('test: read 1 items (1 single-symbol, 0 multi-symbol)');
    expect(report.state).toBe('RECENT_SOURCE_LOCATED');
    expect(paidLookups(discovery, resolver)).toBe(0);
    expect(readSources(db, 'ACME').filter((s) => s.sourceType === 'NEWS_FEED')).toHaveLength(1);
  });

  it('an adapter ERROR leaves the paid fallback open and says ERROR', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        resolver,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW },
        [adapter({ ok: false, error: 'HTTP 503', requests: 1 })],
      ),
    );

    expect(report.newsFetchDetail).toBe('test: ERROR HTTP 503');
    expect(paidLookups(discovery, resolver)).toBeGreaterThan(0);
  });

  it('a second pass over the same release stores nothing new and moves no fingerprint', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);
    const discovery = new CountingDiscovery();
    const run = () =>
      withCompanyFetch({}, () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          discovery,
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW },
          [adapter({ ok: true, items: [release], truncated: false, requests: 1 })],
        ),
      );
    const first = await run();
    const second = await run();
    expect(first.fingerprintChanged).toBe(true);
    // Unchanged evidence is what keeps a re-poll from buying a re-interpretation.
    expect(second.fingerprintChanged).toBe(false);
    expect(second.newSourceCount).toBe(0);
  });

  it('with no adapters the report says so rather than reading zero', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');
    const report = await withCompanyFetch(
      {
        'https://acme.example.net/rss': RSS_BODY,
        'https://acme.example.net/news/contract': '<html><body><p>Acme won.</p></body></html>',
      },
      () =>
        collectCatalystEvidence(
          db,
          fakeSecClient({}),
          new CountingDiscovery(),
          resolver,
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: NOW },
        ),
    );
    expect(report.newsFetchDetail).toBe('no news adapters configured');
  });
});
