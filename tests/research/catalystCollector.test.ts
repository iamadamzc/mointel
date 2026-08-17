import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

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
} from '@/lib/research/catalyst/collector';
import { resolveCompanySources } from '@/lib/research/catalyst/irRegistry';
import type {
  CatalystSourceDiscoveryProvider,
  DiscoveryResult,
} from '@/lib/research/catalyst/discovery';
import type { CatalystConfig, SecConfig } from '@/lib/research/config';

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
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW },
      ),
    );

    expect(discovery.calls).toBe(1);
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
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + i * 60_000) },
        ),
      );
    }

    // One attempt, then the spacing holds it back.
    expect(discovery.calls).toBe(1);
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
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'UNKNOWN', companyName: null, now: new Date(NOW.getTime() + i * 60_000) },
        ),
      );
    }

    expect(discovery.calls).toBe(1);
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
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000) },
        ),
      );

    await run(0); // first check ever
    const second = await run(2);
    const third = await run(9); // still inside the 10m unresolved interval

    expect(discovery.calls).toBe(1);
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
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000) },
        ),
      );

    await run(0);
    const later = await run(11);

    // A newswire release can appear without any source we already poll moving,
    // so an unchanged local fingerprint is not proof that nothing happened.
    expect(discovery.calls).toBe(2);
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

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        discovery,
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, tradingDate: '2026-08-17' },
      ),
    );

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
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + minutes * 60_000), materialEvent },
        ),
      );

    await run(0);
    await run(2); // inside the interval, nothing happened
    expect(discovery.calls).toBe(1);

    const early = await run(3, { kind: 'HALT', detail: 'trading halted' });
    expect(discovery.calls).toBe(2);
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
          { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
          { ticker: 'ACME', now: new Date(NOW.getTime() + offsetMinutes * 60_000) },
        ),
      );

    await run(0);
    expect(discovery.calls).toBe(1);

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
    expect(discovery.calls).toBe(2);
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
        { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
        { ticker: 'ACME', now: NOW, disableDiscovery: true },
      ),
    );

    expect(report.exhibitsFound).toHaveLength(1);
    expect(report.exhibitsFound[0].parentAccession).toBe('0000000123-26-000001');

    const stored = readSources(db, 'ACME').find((s) => s.sourceType === 'SEC_EXHIBIT')!;
    expect(stored.metadata.parentForm).toBe('8-K');
    expect(stored.metadata.exhibitType).toBe('EX-99.1');
    // The exhibit has no publication time of its own; it inherits the filing's.
    expect(stored.publishedPrecision).toBe('INFERRED');
  });

  it('degrades gracefully when the IR site is unreachable', async () => {
    const db = temporaryDb();
    seedIssuer(db, 'https://acme.example.net/rss');

    const report = await withCompanyFetch({}, () =>
      collectCatalystEvidence(
        db,
        fakeSecClient({}),
        new CountingDiscovery(),
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

    const result = await resolveCompanySources(db, discovery, {
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
    const discovery = new CountingDiscovery({ sources: [] });

    await resolveCompanySources(db, discovery, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      userAgent: 'test',
      now: NOW,
    });
    const second = await resolveCompanySources(db, discovery, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      userAgent: 'test',
      now: new Date(NOW.getTime() + 60_000),
    });

    expect(discovery.calls).toBe(1);
    expect(second.modelCalls).toBe(0);
    expect(second.registry.note).toContain('no company-originated source');
  });

  it('does not call a model when no provider is available', async () => {
    const db = temporaryDb();
    seedIssuer(db, null);

    const result = await resolveCompanySources(
      db,
      { name: 'none', available: false, discover: async () => ({ sources: [], ran: false, modelCalls: 0, detail: '' }) },
      { ticker: 'ACME', companyName: 'Acme Inc.', userAgent: 'test', now: NOW },
    );

    expect(result.modelCalls).toBe(0);
    expect(result.registry.note).toContain('no discovery provider');
  });
});
