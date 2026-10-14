import { describe, expect, it } from 'vitest';

import {
  clusterSources,
  headlineSimilarity,
  normaliseHeadline,
  sameAnnouncement,
  selectCanonical,
} from '@/lib/research/catalyst/cluster';
import {
  authorityForKind,
  classifyHost,
  NoopDiscoveryProvider,
  validateDiscovered,
  type DiscoveryRequest,
} from '@/lib/research/catalyst/discovery';
import { OpenAiDiscoveryProvider } from '@/lib/research/catalyst/openaiDiscovery';
import {
  parseFilingIndex,
  parseFilingIndexHtml,
  selectReleaseExhibits,
  filingIndexJsonUrl,
  type FilingIndexResponse,
} from '@/lib/research/catalyst/exhibits';
import { parseFeed, parseReleaseIndex, looksLikeFeed } from '@/lib/research/catalyst/feeds';
import { readCompanySource, buildReleaseEvidence } from '@/lib/research/catalyst/companySource';
import {
  DEFAULT_CATALYST_WINDOWS,
  fromStored,
  normaliseTimestamp,
  withinActiveWindow,
} from '@/lib/research/time';
import { computeCatalystFingerprint } from '@/lib/research/fingerprint';
import { SOURCE_AUTHORITY_RANK } from '@/lib/research/types';

/* ------------------------------------------------------------- SEC exhibits */

const INDEX: FilingIndexResponse = {
  directory: {
    name: '/Archives/edgar/data/1/0001',
    item: [
      { name: 'ea01.htm', type: '8-K', size: '4000' },
      { name: 'ex99-1.htm', type: 'EX-99.1', size: '12000' },
      { name: 'ex99-2.htm', type: 'EX-99.2', size: '8000' },
      { name: 'logo.jpg', type: 'GRAPHIC', size: '2000' },
      { name: 'cover.xml', type: 'XML', size: '900' },
      { name: 'fees.htm', type: 'EX-FILING FEES', size: '1000' },
    ],
  },
};

describe('SEC exhibits', () => {
  it('parses the filing index', () => {
    const items = parseFilingIndex(INDEX);
    expect(items).toHaveLength(6);
    expect(items[1]).toMatchObject({ name: 'ex99-1.htm', type: 'EX-99.1' });
  });

  it('selects the probable release exhibit first', () => {
    const chosen = selectReleaseExhibits(parseFilingIndex(INDEX));
    expect(chosen.map((c) => c.type)).toEqual(['EX-99.1', 'EX-99.2']);
    expect(chosen[0].reason).toContain('primary release');
  });

  it('excludes graphics, XBRL and fee exhibits', () => {
    const chosen = selectReleaseExhibits(parseFilingIndex(INDEX), { max: 10 });
    const types = chosen.map((c) => c.type);
    expect(types).not.toContain('GRAPHIC');
    expect(types).not.toContain('XML');
    expect(types).not.toContain('EX-FILING FEES');
  });

  it('returns nothing when a filing carries no release exhibit', () => {
    const bare = parseFilingIndex({
      directory: { item: [{ name: 'a.htm', type: '8-K' }, { name: 'l.jpg', type: 'GRAPHIC' }] },
    });
    expect(selectReleaseExhibits(bare)).toEqual([]);
  });

  it('reads exhibit types from the filing index page, not index.json', () => {
    // index.json's "type" is an icon name (TEXT.GIF), never the exhibit type.
    // Only the index page states EX-99.1, so that is what must be parsed.
    const html = `<table class="tableFile" summary="Document Format Files">
      <tr><th>Seq</th><th>Description</th><th>Document</th><th>Type</th><th>Size</th></tr>
      <tr><td>1</td><td>Form 8-K</td><td><a href="/Archives/edgar/data/1/000/a8k.htm">a8k.htm</a></td><td>8-K</td><td>25478</td></tr>
      <tr><td>2</td><td>Press Release</td><td><a href="/Archives/edgar/data/1/000/ex99-1.htm">ex99-1.htm</a></td><td>EX-99.1</td><td>12000</td></tr>
      <tr><td>3</td><td>Logo</td><td><a href="/Archives/edgar/data/1/000/logo.jpg">logo.jpg</a></td><td>GRAPHIC</td><td>2000</td></tr>
      </table>`;

    const items = parseFilingIndexHtml(html);
    expect(items.map((i) => i.type)).toEqual(['8-K', 'EX-99.1', 'GRAPHIC']);

    const chosen = selectReleaseExhibits(items);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].name).toBe('ex99-1.htm');
  });

  it('yields nothing for a filing whose index lists no release exhibit', () => {
    const html = `<table>
      <tr><td>1</td><td>Form 8-K</td><td><a href="/x/a8k.htm">a8k.htm</a></td><td>8-K</td><td>25478</td></tr>
      </table>`;
    expect(selectReleaseExhibits(parseFilingIndexHtml(html))).toEqual([]);
  });

  it('builds an index URL from the parent accession', () => {
    expect(filingIndexJsonUrl('0001567529', '0001213900-26-088030')).toBe(
      'https://www.sec.gov/Archives/edgar/data/1567529/000121390026088030/index.json',
    );
  });
});

/* -------------------------------------------------------------------- feeds */

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Acme Reports Q2 Results</title><link>https://acme.com/news/q2</link>
<pubDate>Mon, 17 Aug 2026 12:15:00 GMT</pubDate><description>Revenue grew.</description></item>
<item><title><![CDATA[Acme Signs Supply Agreement]]></title><link>https://acme.com/news/supply</link>
<pubDate>Fri, 14 Aug 2026 20:05:00 GMT</pubDate></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Acme Announces Clinical Milestone</title>
<link rel="alternate" href="https://acme.com/news/clinical"/>
<published>2026-08-17T11:30:00Z</published></entry></feed>`;

describe('feed parsing', () => {
  it('detects feed content', () => {
    expect(looksLikeFeed(RSS)).toBe(true);
    expect(looksLikeFeed(ATOM)).toBe(true);
    expect(looksLikeFeed('<html><body>hi</body></html>')).toBe(false);
  });

  it('parses RSS items with exact timestamps', () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Acme Reports Q2 Results');
    expect(items[0].url).toBe('https://acme.com/news/q2');
    expect(items[0].published.precision).toBe('EXACT');
    expect(items[0].published.utc).toBe('2026-08-17T12:15:00.000Z');
  });

  it('parses Atom entries and CDATA titles', () => {
    expect(parseFeed(ATOM)[0].title).toBe('Acme Announces Clinical Milestone');
    expect(parseFeed(RSS)[1].title).toBe('Acme Signs Supply Agreement');
  });

  it('survives a malformed feed by returning fewer items', () => {
    const broken = '<rss><channel><item><title>Only One</title></channel></rss>';
    expect(() => parseFeed(broken)).not.toThrow();
  });

  it('parses a release index page and treats its dates as date-only', () => {
    const html = `<html><body><ul>
      <li>August 17, 2026 <a href="/news/acme-announces-major-contract-award">Acme Announces Major Contract Award With Partner</a></li>
      <li><a href="/about">About</a></li>
    </ul></body></html>`;
    const items = parseReleaseIndex(html, 'https://acme.com/news');

    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://acme.com/news/acme-announces-major-contract-award');
    // A printed calendar date is not a publication time.
    expect(items[0].published.precision).toBe('DATE_ONLY');
    expect(items[0].published.etClock).toBeNull();
  });

  it('ignores skip-links, attachment URLs and page chrome', () => {
    // All of these appeared on a real IR page and were stored as releases,
    // which is worse than storing nothing because they look like evidence.
    const html = `<html><body>
      <a href="#main">Skip to section navigation and content</a>
      <a href="https://ir.example.com/">https://ir.example.com/attachments/12345678</a>
      <a href="/news/real">Example Corp Announces Record Second Quarter Revenue</a>
      <a href="/dl">Download the full press release PDF here</a>
      <a href="/">Super League Enterprise, Inc.</a>
    </body></html>`;

    const items = parseReleaseIndex(html, 'https://ir.example.com/news');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Example Corp Announces Record Second Quarter Revenue');
  });

  it('does not mistake the issuer name in a header for an announcement', () => {
    // This one was live: a header link stored as a release. It fabricates
    // evidence, and because it reappears it keeps the fingerprint moving,
    // which re-triggers paid discovery on every poll.
    const html = `<html><body>
      <a href="/">Super League Enterprise, Inc.</a>
      <a href="/x">Momentum Holdings Group Limited</a>
    </body></html>`;
    expect(parseReleaseIndex(html, 'https://ir.example.com/news')).toEqual([]);
  });

  it('reports a client-rendered page rather than calling it empty', () => {
    const read = readCompanySource({
      url: 'https://acme.com/news',
      body: '<html><body><div id="root"></div><script src="app.js"></script></body></html>',
      status: 200,
      contentType: 'text/html',
      failure: null,
      detail: null,
    });
    // "We could not see it" and "there was nothing" are different facts.
    expect(read.failure).toBe('JS_ONLY');
  });

  it('keeps feed metadata as evidence when the release body is unreachable', () => {
    const [item] = parseFeed(RSS);
    const evidence = buildReleaseEvidence(item, null);
    expect(evidence.title).toBe('Acme Reports Q2 Results');
    expect(evidence.contentHash).toHaveLength(64);
  });
});

/* ------------------------------------------------------------ time handling */

describe('timestamp normalisation', () => {
  it('keeps an exact timestamp exact', () => {
    const time = normaliseTimestamp('Mon, 17 Aug 2026 12:15:00 GMT');
    expect(time.precision).toBe('EXACT');
    // 12:15 GMT is 08:15 ET in August — a premarket release, not yesterday's.
    expect(time.etClock).toBe('08:15:00');
    expect(time.etDate).toBe('2026-08-17');
  });

  it('never invents a clock for a date-only release', () => {
    const time = normaliseTimestamp('August 17, 2026');
    expect(time.precision).toBe('DATE_ONLY');
    expect(time.etDate).toBe('2026-08-17');
    // In premarket the difference between 08:15 and "sometime that day" is the
    // whole question, so no time is fabricated.
    expect(time.etClock).toBeNull();
  });

  it('rebuilds a stored timestamp without degrading it', () => {
    // Regression: feeding a stored ISO UTC value back through the parser with
    // a DATE_ONLY hint failed to parse and silently reported UNKNOWN, so a
    // known publication time was displayed as unparsed.
    const exact = fromStored('2026-08-17T12:15:00.000Z', 'EXACT');
    expect(exact.precision).toBe('EXACT');
    expect(exact.etDate).toBe('2026-08-17');
    expect(exact.etClock).toBe('08:15:00');

    const dateOnly = fromStored('2026-08-17T12:00:00.000Z', 'DATE_ONLY');
    expect(dateOnly.precision).toBe('DATE_ONLY');
    expect(dateOnly.etDate).toBe('2026-08-17');
    // Still no fabricated clock for a date-only source.
    expect(dateOnly.etClock).toBeNull();

    expect(fromStored(null, 'UNKNOWN').precision).toBe('UNKNOWN');
  });

  it('records unparseable timestamps without discarding the source', () => {
    const time = normaliseTimestamp('sometime last week');
    expect(time.precision).toBe('UNKNOWN');
    expect(time.original).toBe('sometime last week');
  });

  it('separates the active window from context lookback', () => {
    const now = new Date('2026-08-17T12:00:00Z');
    const yesterday = normaliseTimestamp('2026-08-16T21:00:00Z');
    const old = normaliseTimestamp('2026-06-01T12:00:00Z');

    expect(withinActiveWindow(yesterday, DEFAULT_CATALYST_WINDOWS, now)).toBe(true);
    expect(withinActiveWindow(old, DEFAULT_CATALYST_WINDOWS, now)).toBe(false);
    // The old release is still collected for context, so recycled news is
    // recognisable rather than looking new.
    expect(DEFAULT_CATALYST_WINDOWS.contextLookbackDays).toBeGreaterThan(30);
  });
});

/* --------------------------------------------------------------- clustering */

function src(overrides: Partial<Parameters<typeof selectCanonical>[0][number]> = {}) {
  return {
    id: 1,
    title: 'Acme Announces Major Contract Award',
    url: 'https://acme.com/news/a',
    publishedAt: '2026-08-17T12:15:00.000Z',
    contentHash: 'hash-a',
    authority: 'COMPANY_IR' as const,
    accession: null,
    sourceType: 'COMPANY_IR' as const,
    ...overrides,
  };
}

describe('announcement clustering', () => {
  it('normalises headlines past boilerplate', () => {
    expect(normaliseHeadline('Acme Inc. Announces Major Contract Award')).toBe(
      'acme major contract award',
    );
  });

  it('clusters the same announcement across SEC, IR and newswire', () => {
    const sources = [
      src({ id: 1, authority: 'SEC', sourceType: 'SEC_EXHIBIT', accession: 'A-1', contentHash: 'x' }),
      src({ id: 2, authority: 'COMPANY_IR', contentHash: 'y' }),
      src({
        id: 3,
        authority: 'NEWSWIRE',
        sourceType: 'NEWSWIRE',
        url: 'https://prnewswire.com/a',
        contentHash: 'z',
      }),
    ];

    const clusters = clusterSources('ACME', sources);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].memberIds.sort()).toEqual([1, 2, 3]);
    // Authority decides the canonical copy: the SEC exhibit outranks both.
    expect(clusters[0].canonicalId).toBe(1);
    expect(clusters[0].canonicalAuthority).toBe('SEC');
  });

  it('does not cluster genuinely different announcements', () => {
    const clusters = clusterSources('ACME', [
      src({ id: 1, title: 'Acme Announces Major Contract Award', contentHash: 'a' }),
      src({ id: 2, title: 'Acme Prices Public Offering of Common Stock', contentHash: 'b' }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it('does not merge a repeat of the same headline months later', () => {
    const verdict = sameAnnouncement(
      src({ id: 1, publishedAt: '2026-08-17T12:00:00.000Z', contentHash: 'a' }),
      src({ id: 2, publishedAt: '2026-02-17T12:00:00.000Z', contentHash: 'b' }),
    );
    // A company repeating itself is two events, not one.
    expect(verdict.same).toBe(false);
  });

  it('treats identical content as the same announcement outright', () => {
    const verdict = sameAnnouncement(
      src({ id: 1, title: 'One wording', contentHash: 'same' }),
      src({ id: 2, title: 'Totally different wording', contentHash: 'same' }),
    );
    expect(verdict.same).toBe(true);
    expect(verdict.confidence).toBe('HIGH');
  });

  it('never lets a secondary mirror outrank an original', () => {
    const canonical = selectCanonical([
      src({ id: 9, authority: 'SECONDARY', sourceType: 'SECONDARY_DISCOVERY' }),
      src({ id: 4, authority: 'NEWSWIRE', sourceType: 'NEWSWIRE' }),
    ]);
    expect(canonical.id).toBe(4);
    expect(SOURCE_AUTHORITY_RANK.NEWSWIRE).toBeLessThan(SOURCE_AUTHORITY_RANK.SECONDARY);
  });

  it('gives every announcement a canonical source, even alone', () => {
    const clusters = clusterSources('ACME', [src({ id: 7 })]);
    expect(clusters[0].canonicalId).toBe(7);
    expect(clusters[0].confidence).toBe('HIGH');
  });

  it('measures headline overlap symmetrically', () => {
    const a = 'Acme Announces Major Contract Award';
    const b = 'Acme Inc Announces a Major Contract Award With Partner';
    expect(headlineSimilarity(a, b)).toBe(headlineSimilarity(b, a));
    expect(headlineSimilarity(a, b)).toBeGreaterThan(0.5);
  });
});

/* ---------------------------------------------------------------- discovery */

describe('web discovery provider', () => {
  const request: DiscoveryRequest = {
    ticker: 'ACME',
    companyName: 'Acme Inc.',
    since: '2026-08-16',
    knownUrls: [],
  };

  it('classifies hosts regardless of what a result claims', () => {
    expect(classifyHost('https://finance.yahoo.com/news/x')).toBe('SECONDARY');
    expect(classifyHost('https://www.globenewswire.com/x')).toBe('NEWSWIRE');
    expect(classifyHost('https://www.sec.gov/Archives/x')).toBe('SEC');
  });

  it('maps source kinds onto the authority hierarchy', () => {
    expect(authorityForKind('SEC')).toBe('SEC');
    expect(authorityForKind('COMPANY_IR')).toBe('COMPANY_IR');
    expect(authorityForKind('SECONDARY')).toBe('SECONDARY');
  });

  it('rejects invented and templated URLs', () => {
    const { accepted, rejected } = validateDiscovered(
      {
        sources: [
          { title: 'Real', url: 'https://acme.com/news/a', kind: 'COMPANY_IR', confidence: 'HIGH' },
          { title: 'Fake', url: 'https://example.com/news', kind: 'NEWSWIRE' },
          { title: 'Template', url: 'https://acme.com/{slug}', kind: 'NEWSWIRE' },
          { title: 'Broken', url: 'not-a-url', kind: 'NEWSWIRE' },
          { title: 'No url', url: '', kind: 'NEWSWIRE' },
        ],
      },
      new Set(),
    );

    expect(accepted.map((a) => a.url)).toEqual(['https://acme.com/news/a']);
    expect(rejected).toHaveLength(4);
  });

  it('will not let a model promote a mirror to a company source', () => {
    const { accepted } = validateDiscovered(
      {
        sources: [
          {
            title: 'Mirror',
            url: 'https://finance.yahoo.com/news/acme',
            kind: 'COMPANY_IR',
            appearsOriginal: true,
            confidence: 'HIGH',
          },
        ],
      },
      new Set(),
    );
    // The host has the final say, so an aggregator cannot displace an original.
    expect(accepted[0].kind).toBe('SECONDARY');
    expect(accepted[0].appearsOriginal).toBe(false);
  });

  it('drops sources already held', () => {
    const { accepted, rejected } = validateDiscovered(
      { sources: [{ title: 'Known', url: 'https://acme.com/a', kind: 'COMPANY_IR' }] },
      new Set(['https://acme.com/a']),
    );
    expect(accepted).toHaveLength(0);
    expect(rejected[0].reason).toBe('already held');
  });

  it('performs no model call and no failure when no key is configured', async () => {
    const provider = new OpenAiDiscoveryProvider({
      config: {
        apiKey: null,
        researchModel: 'r',
        escalationModel: 'e',
        changeDetectModel: 'c',
      resolverSearchContext: null,
      discoverySearchContext: null, promptVariant: 'A' as const,
      },
      fetchImpl: async () => {
        throw new Error('must not be called');
      },
    });

    const result = await provider.discover(request);
    expect(result.ran).toBe(false);
    expect(result.modelCalls).toBe(0);
    expect(provider.available).toBe(false);
  });

  it('uses the change-detection tier, not the full research model', async () => {
    let seenModel: string | null = null;
    const provider = new OpenAiDiscoveryProvider({
      config: {
        apiKey: 'test-key',
        researchModel: 'expensive-research-model',
        escalationModel: 'escalation',
        changeDetectModel: 'cheap-detect-model',
      resolverSearchContext: null,
      discoverySearchContext: null, promptVariant: 'A' as const,
      },
      fetchImpl: async (_url, init) => {
        seenModel = JSON.parse(String(init?.body)).model;
        return new Response(
          JSON.stringify({
            output: [{ type: 'message', content: [{ type: 'text', text: '{"sources":[]}' }] }],
          }),
          { status: 200 },
        );
      },
    });

    await provider.discover(request);
    expect(seenModel).toBe('cheap-detect-model');
    expect(seenModel).not.toBe('expensive-research-model');
  });

  it('asks the model to locate sources, never to judge them', async () => {
    let prompt = '';
    const provider = new OpenAiDiscoveryProvider({
      config: {
        apiKey: 'k',
        researchModel: 'r',
        escalationModel: 'e',
        changeDetectModel: 'c',
      resolverSearchContext: null,
      discoverySearchContext: null, promptVariant: 'A' as const,
      },
      fetchImpl: async (_url, init) => {
        prompt = JSON.parse(String(init?.body)).input;
        return new Response(
          JSON.stringify({
            output: [{ type: 'message', content: [{ type: 'text', text: '{"sources":[]}' }] }],
          }),
          { status: 200 },
        );
      },
    });

    await provider.discover(request);
    expect(prompt).toMatch(/locating sources/i);
    expect(prompt).toMatch(/Do NOT assess/i);
    // No interpretation vocabulary may reach the model in this phase.
    expect(prompt).not.toMatch(/bullish|strong catalyst|frontside|dirty float/i);
  });

  it('survives a provider error without losing collection', async () => {
    const provider = new OpenAiDiscoveryProvider({
      config: { apiKey: 'k', researchModel: 'r', escalationModel: 'e', changeDetectModel: 'c', resolverSearchContext: null,
      discoverySearchContext: null, promptVariant: 'A' as const },
      fetchImpl: async () => new Response('nope', { status: 500 }),
    });
    const result = await provider.discover(request);
    expect(result.sources).toEqual([]);
    expect(result.detail).toContain('500');
  });

  it('never echoes the key in its detail text', async () => {
    const provider = new OpenAiDiscoveryProvider({
      config: {
        apiKey: 'sk-secret-value',
        researchModel: 'r',
        escalationModel: 'e',
        changeDetectModel: 'c',
      resolverSearchContext: null,
      discoverySearchContext: null, promptVariant: 'A' as const,
      },
      fetchImpl: async () => new Response('err', { status: 401 }),
    });
    const result = await provider.discover(request);
    expect(result.detail).not.toContain('sk-secret-value');
  });

  it('has a no-op provider for the unconfigured case', async () => {
    const noop = new NoopDiscoveryProvider();
    const result = await noop.discover();
    expect(result.ran).toBe(false);
    expect(result.modelCalls).toBe(0);
  });
});

/* -------------------------------------------------------- change detection */

describe('catalyst fingerprint', () => {
  const base = [
    { url: 'https://acme.com/a', contentHash: 'h1', publishedAt: '2026-08-17T12:00:00Z' },
    { url: 'https://acme.com/b', contentHash: 'h2', publishedAt: '2026-08-16T12:00:00Z' },
  ];

  it('is stable across re-reads of the same source set', () => {
    expect(computeCatalystFingerprint(base)).toBe(computeCatalystFingerprint([...base].reverse()));
  });

  it('changes when a new source appears', () => {
    const extended = [
      ...base,
      { url: 'https://acme.com/c', contentHash: 'h3', publishedAt: '2026-08-17T13:00:00Z' },
    ];
    expect(computeCatalystFingerprint(extended)).not.toBe(computeCatalystFingerprint(base));
  });

  it('changes when an existing source body changes', () => {
    const edited = [{ ...base[0], contentHash: 'changed' }, base[1]];
    expect(computeCatalystFingerprint(edited)).not.toBe(computeCatalystFingerprint(base));
  });

  it('changes when clustering reassigns the canonical source', () => {
    const clustered = base.map((s, i) => ({ ...s, clusterId: 'c1', canonical: i === 0 }));
    const recanonicalised = base.map((s, i) => ({ ...s, clusterId: 'c1', canonical: i === 1 }));
    expect(computeCatalystFingerprint(clustered)).not.toBe(
      computeCatalystFingerprint(recanonicalised),
    );
  });
});
