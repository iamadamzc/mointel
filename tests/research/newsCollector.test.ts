import { describe, expect, it } from 'vitest';

import { AlpacaRestClient, type AlpacaNewsItem } from '@/lib/market/alpaca/rest';
import { AlpacaNewsAdapter, toNewsItem } from '@/lib/research/news/alpaca';
import {
  admitNewsItem,
  collectNews,
  isMoveNotice,
  MAX_NEWS_ROWS_PER_RUN,
  normaliseHeadline,
} from '@/lib/research/news/collect';
import type { NewsAdapter, NewsFetchResult, NewsItem } from '@/lib/research/news/types';
import { recoverOriginatingWire } from '@/lib/research/news/wire';

/**
 * The news collector: adapter 1 is Alpaca (Benzinga).
 *
 * THE FIXTURES ARE SHAPES, NOT CAPTURED PAYLOADS. This seat holds no Alpaca
 * credentials, so the AIFF and MEDS cases are built from Ops's recorded
 * readings of them (research.md, 2026-09-25 and 2026-09-28): AIFF's release
 * arrived tagged `['AIFF']` with `source: benzinga`; the roundup that tagged it
 * later carried twelve symbols; MEDS's ACCESS Newswire release was absent and
 * the only MEDS item was a roundup tagged `LLY,MEDS,NVO`. The field NAMES are
 * the published API's. **The first live run must be checked against these
 * controls before any coverage number is quoted from it.**
 */

const CREDS = { keyId: 'PKTEST', secret: 'secret-test', feed: 'sip' as const, origin: 'test' };
const WINDOW = { start: new Date('2026-08-11T00:00:00Z'), end: new Date('2026-09-25T13:00:00Z') };
const NOW = new Date('2026-09-25T13:00:00Z');

const AIFF_RELEASE: AlpacaNewsItem = {
  id: 1001,
  headline: 'Firefly Neuroscience Announces Pediatric ADHD Program',
  author: 'Globe Newswire',
  created_at: '2026-09-25T11:47:17Z',
  updated_at: '2026-09-25T11:47:17Z',
  summary: '',
  content:
    '<p>SAN DIEGO, Sept. 25, 2026 (GLOBE NEWSWIRE) -- Firefly Neuroscience, Inc. (NASDAQ: AIFF) today announced...</p>',
  symbols: ['AIFF'],
  source: 'benzinga',
  url: 'https://www.benzinga.com/pressreleases/26/09/g1001/firefly',
};

const AIFF_ROUNDUP: AlpacaNewsItem = {
  id: 1002,
  headline: "12 Health Care Stocks Moving In Friday's Pre-Market Session",
  author: 'Benzinga Insights',
  created_at: '2026-09-25T12:05:42Z',
  summary: '',
  symbols: ['AIFF', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
  source: 'benzinga',
  url: 'https://www.benzinga.com/news/26/09/1002/12-health-care-stocks',
};

const MEDS_ROUNDUP: AlpacaNewsItem = {
  id: 2001,
  headline: 'GLP-1 Apps Are Crowding In',
  author: 'Benzinga Staff',
  created_at: '2026-09-26T17:30:00Z',
  summary: '',
  symbols: ['LLY', 'MEDS', 'NVO'],
  source: 'benzinga',
  url: 'https://www.benzinga.com/news/26/09/2001/glp1-apps',
};

function fetchReturning(pages: unknown[]): { fetchImpl: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  let call = 0;
  const fetchImpl = (async (url: RequestInfo | URL) => {
    urls.push(String(url));
    const body = pages[Math.min(call++, pages.length - 1)];
    if (body instanceof Response) return body;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, urls };
}

class StaticAdapter implements NewsAdapter {
  constructor(
    readonly id: string,
    private readonly result: NewsFetchResult,
  ) {}
  async fetchForTicker(): Promise<NewsFetchResult> {
    return this.result;
  }
}

function item(overrides: Partial<NewsItem>): NewsItem {
  return {
    adapter: 'test',
    provider: 'test',
    providerItemId: '1',
    headline: 'Acme Announces Contract',
    summary: null,
    bodyText: null,
    url: 'https://example.test/1',
    publishedAt: '2026-09-25T11:00:00.000Z',
    symbols: ['ACME'],
    originatingWire: null,
    ...overrides,
  };
}

describe('the Alpaca news endpoint', () => {
  it('asks for the published maximum of 50, never more', async () => {
    const { fetchImpl, urls } = fetchReturning([{ news: [], next_page_token: null }]);
    const client = new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 });
    await client.getNews({ symbols: ['AIFF'], start: 's', end: 'e' });
    const url = new URL(urls[0]);
    expect(url.pathname).toBe('/v1beta1/news');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('symbols')).toBe('AIFF');
    expect(url.searchParams.get('sort')).toBe('desc');
  });

  it('THROWS on a payload with no news array rather than reading it as empty', async () => {
    // The 0%-coverage near-miss: an error object read as `.news` gave zero
    // items on five days that contained a known item.
    const { fetchImpl } = fetchReturning([{ message: 'limit must be <= 50' }]);
    const client = new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 });
    await expect(client.getNews({ symbols: ['AIFF'], start: 's', end: 'e' })).rejects.toThrow(
      /no news array/,
    );
  });

  it('follows the page token and reports truncation at the page cap', async () => {
    const { fetchImpl, urls } = fetchReturning([
      { news: [AIFF_RELEASE], next_page_token: 'p2' },
      { news: [AIFF_ROUNDUP], next_page_token: 'p3' },
    ]);
    const client = new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 });
    const result = await client.getNews({ symbols: ['AIFF'], start: 's', end: 'e', maxPages: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.pages).toBe(2);
    expect(new URL(urls[1]).searchParams.get('page_token')).toBe('p2');
  });

  it('a 4xx surfaces as an adapter ERROR, never as zero items', async () => {
    const { fetchImpl } = fetchReturning([new Response('forbidden', { status: 403 })]);
    const adapter = new AlpacaNewsAdapter(new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 }));
    const result = await adapter.fetchForTicker('AIFF', WINDOW);
    expect(result.ok).toBe(false);
    const collection = await collectNews([adapter], 'AIFF', WINDOW, NOW);
    expect(collection.detail).toMatch(/^alpaca: ERROR /);
    expect(collection.detail).not.toContain('read 0');
    expect(collection.rows).toHaveLength(0);
  });

  it('never puts the secret in an adapter error', async () => {
    const { fetchImpl } = fetchReturning([new Response('bad key secret-test', { status: 401 })]);
    const adapter = new AlpacaNewsAdapter(new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 }));
    const result = await adapter.fetchForTicker('AIFF', WINDOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain('secret-test');
  });
});

describe('recovering the originating wire', () => {
  it('reads it from the dateline when the source field says benzinga', () => {
    const news = toNewsItem({ ...AIFF_RELEASE, author: 'Benzinga Newsdesk' })!;
    expect(news.provider).toBe('benzinga');
    expect(news.originatingWire).toBe('GLOBENEWSWIRE');
  });

  it('reads it from the byline', () => {
    expect(recoverOriginatingWire({ author: 'ACCESS Newswire', bodyText: null, summary: null })).toBe(
      'ACCESS_NEWSWIRE',
    );
    expect(recoverOriginatingWire({ author: 'PRNewswire', bodyText: null, summary: null })).toBe(
      'PR_NEWSWIRE',
    );
  });

  it('ignores a wire named below the head of the body', () => {
    const body = `${'x'.repeat(500)} previously announced via Business Wire`;
    expect(recoverOriginatingWire({ author: 'Benzinga', bodyText: body, summary: null })).toBeNull();
  });

  it('takes the EARLIEST wire in the head, not the first pattern listed', () => {
    const body = 'NEW YORK (BUSINESS WIRE) -- Acme, which once used GlobeNewswire...';
    expect(recoverOriginatingWire({ author: null, bodyText: body, summary: null })).toBe(
      'BUSINESS_WIRE',
    );
  });

  it('an editorial item with no wire recovers none', () => {
    expect(
      recoverOriginatingWire({
        author: 'Benzinga Insights',
        bodyText: 'Shares of Acme are trading higher after...',
        summary: null,
      }),
    ).toBeNull();
  });

  it('drops an item with no parseable time rather than inventing one', () => {
    expect(toNewsItem({ ...AIFF_RELEASE, created_at: 'not a date' })).toBeNull();
    expect(toNewsItem({ ...AIFF_RELEASE, created_at: undefined })).toBeNull();
  });
});

describe('the two fixed controls', () => {
  it('AIFF 2026-09-25 (PRESENT): the release is stored as a NEWSWIRE row; the roundup is counted, not stored', async () => {
    const { fetchImpl } = fetchReturning([
      { news: [AIFF_ROUNDUP, AIFF_RELEASE], next_page_token: null },
    ]);
    const adapter = new AlpacaNewsAdapter(new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 }));
    const collection = await collectNews([adapter], 'AIFF', WINDOW, NOW);

    expect(collection.detail).toBe('alpaca: read 2 items (1 single-symbol, 1 multi-symbol)');
    expect(collection.rows).toHaveLength(1);
    const [row] = collection.rows;
    expect(row.sourceType).toBe('NEWS_FEED');
    expect(row.authority).toBe('NEWSWIRE');
    expect(row.publishedAt).toBe('2026-09-25T11:47:17.000Z');
    expect(row.publishedPrecision).toBe('EXACT');
    expect(row.metadata).toMatchObject({
      provider: 'benzinga',
      originatingWire: 'GLOBENEWSWIRE',
      discoveredVia: 'alpaca',
    });
    // The body is licensed for reading, not copying whole.
    expect((row.excerpt ?? '').length).toBeLessThanOrEqual(600);
  });

  it('MEDS 2026-09-28 (ABSENT): only a roundup came back, so nothing is stored and the detail says why', async () => {
    const { fetchImpl } = fetchReturning([{ news: [MEDS_ROUNDUP], next_page_token: null }]);
    const adapter = new AlpacaNewsAdapter(new AlpacaRestClient(CREDS, { fetchImpl, maxRetries: 0 }));
    const collection = await collectNews([adapter], 'MEDS', WINDOW, NOW);
    expect(collection.rows).toHaveLength(0);
    expect(collection.detail).toBe('alpaca: read 1 items (0 single-symbol, 1 multi-symbol)');
  });
});

describe('many sources, one row per release', () => {
  it('collapses one release reaching two adapters, keeping the copy that names its wire', async () => {
    const plain = item({ adapter: 'a', providerItemId: 'a1', publishedAt: '2026-09-25T11:00:00.000Z' });
    const wired = item({
      adapter: 'b',
      providerItemId: 'b1',
      headline: 'ACME announces contract!',
      publishedAt: '2026-09-25T11:02:00.000Z',
      originatingWire: 'PR_NEWSWIRE',
    });
    const collection = await collectNews(
      [
        new StaticAdapter('a', { ok: true, items: [plain], truncated: false, requests: 1 }),
        new StaticAdapter('b', { ok: true, items: [wired], truncated: false, requests: 1 }),
      ],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows).toHaveLength(1);
    expect(collection.rows[0].authority).toBe('NEWSWIRE');
    expect(collection.rows[0].metadata).toMatchObject({ discoveredVia: 'b' });
    expect(collection.requests).toBe(2);
    expect(collection.detail).toBe(
      'a: read 1 items (1 single-symbol, 0 multi-symbol); b: read 1 items (1 single-symbol, 0 multi-symbol)',
    );
  });

  it('one adapter failing does not hide what the other found', async () => {
    const collection = await collectNews(
      [
        new StaticAdapter('down', { ok: false, error: 'HTTP 503', requests: 1 }),
        new StaticAdapter('up', { ok: true, items: [item({})], truncated: false, requests: 1 }),
      ],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows).toHaveLength(1);
    expect(collection.detail).toContain('down: ERROR HTTP 503');
  });

  it('keeps a recurring headline on different days as different rows', async () => {
    const monday = item({ providerItemId: '1', publishedAt: '2026-09-21T14:00:00.000Z' });
    const friday = item({ providerItemId: '2', publishedAt: '2026-09-25T14:00:00.000Z' });
    const collection = await collectNews(
      [new StaticAdapter('a', { ok: true, items: [monday, friday], truncated: false, requests: 1 })],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows).toHaveLength(2);
    expect(new Set(collection.rows.map((row) => row.documentFingerprint)).size).toBe(2);
  });

  it('a single-symbol item with no recovered wire is SECONDARY, not NEWSWIRE', async () => {
    const collection = await collectNews(
      [new StaticAdapter('a', { ok: true, items: [item({})], truncated: false, requests: 1 })],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows[0].authority).toBe('SECONDARY');
  });

  it('does not store an item tagged only with another symbol, and counts it', async () => {
    const collection = await collectNews(
      [
        new StaticAdapter('a', {
          ok: true,
          items: [item({ symbols: ['OTHER'] })],
          truncated: false,
          requests: 1,
        }),
      ],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows).toHaveLength(0);
    expect(collection.detail).toContain('1 not tagged ACME');
  });

  it(`stores at most ${MAX_NEWS_ROWS_PER_RUN} rows, newest first`, async () => {
    const many = Array.from({ length: MAX_NEWS_ROWS_PER_RUN + 5 }, (_, index) =>
      item({
        providerItemId: String(index),
        headline: `Acme update ${index}`,
        publishedAt: new Date(Date.UTC(2026, 8, 1 + index, 14)).toISOString(),
      }),
    );
    const collection = await collectNews(
      [new StaticAdapter('a', { ok: true, items: many, truncated: false, requests: 1 })],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows).toHaveLength(MAX_NEWS_ROWS_PER_RUN);
    expect(collection.rows[0].title).toBe(`Acme update ${MAX_NEWS_ROWS_PER_RUN + 4}`);
  });

  it('no adapters is its own statement, not a zero', async () => {
    const collection = await collectNews([], 'ACME', WINDOW, NOW);
    expect(collection.detail).toBe('no news adapters configured');
  });

  it('normalises headlines for dedupe only by case and punctuation', () => {
    expect(normaliseHeadline('ACME: Announces -- Contract!')).toBe('acme announces contract');
  });
});

describe('halt and price-move notices', () => {
  /*
   * Every headline in Ops's raw dump of the 2026-09-28 top 12 (Alpaca news,
   * 04:00-10:30 ET, 17 items). Exactly the two KNRX circuit-breaker notices
   * are move notices. The rest -- including four catalysts that share the
   * halts' author, /quote/ url and empty body -- are not.
   */
  const HALTS = [
    'KNOREX Shares Halted On Circuit Breaker To The Upside, Stock Now Up 302.63%',
    'KNOREX Shares Halted On Circuit Breaker To The Upside, Stock Now Up 190.79%',
  ];
  const NOT_HALTS = [
    'Transcript: Kandi Technologies Group H1 2026 Earnings Conference Call',
    'Bold Eagle Acquisition Announces Deal To Take Cyber Intelligence Firm REDLattice Public At',
    'Why Is Accuray Stock Gaining Monday?',
    'Lakewood-Amedex Biotherapeutics Announces Minimum Inhibitory Concentration Data From Recen',
    "Volato's Alignment Engine Announces $1.17B In Four-Year Take-Or-Pay AI GPU Orders From Unn",
    "12 Health Care Stocks Moving In Monday's Pre-Market Session",
    "12 Industrials Stocks Moving In Monday's Pre-Market Session",
    "12 Information Technology Stocks Moving In Monday's Pre-Market Session",
    'Maris-Tech Announces $10M Order For Airborne Defense Video Systems Under Project With Maga',
    'Fusemachines Announces Access To IBM Fusion Infrastructure Through ModulAlre',
    'SCYNEXIS Announces $214M BARDA Contract For Antifungal SCY-247, With About $18.5M In Initi',
    'Earnings Scheduled For September 28, 2026',
    "Kandi Technologies Announces Second Order For Heavy-Truck Battery Swap Stations From CATL'",
    'Kandi Technologies Gr H1 EPS $0.10 Up From $0.02 YoY, Sales $57.117M Up From $36.291M YoY',
    'Why Webuy Global Shares Are Trading Higher By Around 15%; Here Are 20 Stocks Moving Premar',
  ];

  it('the instrument: the sample is the 17 headlines Ops dumped', () => {
    expect(HALTS.length + NOT_HALTS.length).toBe(17);
  });

  it('flags both halts in the real sample', () => {
    for (const headline of HALTS) expect(isMoveNotice(headline), headline).toBe(true);
  });

  it('flags none of the 15 others, including catalysts in the same field shape', () => {
    for (const headline of NOT_HALTS) expect(isMoveNotice(headline), headline).toBe(false);
  });

  it('flags the other halt shapes (synthetic -- not yet seen in a dump)', () => {
    expect(isMoveNotice('ACME Shares Resume Trade')).toBe(true);
    expect(isMoveNotice('ACME Shares Are Halted, News Pending')).toBe(true);
    expect(isMoveNotice('ACME Shares Halted On Circuit Breaker To The Downside, Stock Now Down 12%')).toBe(true);
  });

  it('counts a halt notice and does not store it', async () => {
    const collection = await collectNews(
      [
        new StaticAdapter('a', {
          ok: true,
          items: [item({ headline: HALTS[0] }), item({ providerItemId: '2' })],
          truncated: false,
          requests: 1,
        }),
      ],
      'ACME',
      WINDOW,
      NOW,
    );
    expect(collection.rows.map((row) => row.title)).toEqual(['Acme Announces Contract']);
    expect(collection.detail).toBe(
      'a: read 2 items (1 single-symbol, 0 multi-symbol, 1 halt/move notices)',
    );
  });

  it('a halt notice is ADMITTED to nothing, so the re-check cannot queue on it', () => {
    expect(admitNewsItem(item({ headline: HALTS[1] }), 'ACME')).toBe('MOVE_NOTICE');
  });
});
