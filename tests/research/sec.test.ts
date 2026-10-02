import { describe, expect, it } from 'vitest';

import { readResearchConfig, secAvailability } from '@/lib/research/config';
import { RateLimiter } from '@/lib/research/sec/limiter';
import {
  backoffDelayMs,
  CACHE_MAX_BYTES,
  CACHE_TTL_MS,
  cachedBytes,
  parseRetryAfter,
  SecClient,
  SecRequestError,
  SecUnavailableError,
} from '@/lib/research/sec/client';
import {
  cikPathSegment,
  nameSimilarity,
  normaliseCik,
  parseTickerMap,
  resolveTicker,
  type TickerExchangeFile,
} from '@/lib/research/sec/tickerMap';
import {
  formPurposes,
  inferForeignIssuer,
  isRelevantForm,
} from '@/lib/research/sec/forms';
import {
  accessionPathSegment,
  filingDocumentUrl,
  parseSubmissions,
  selectFilingsByFamily,
  type Filing,
  type SubmissionsResponse,
} from '@/lib/research/sec/submissions';
import {
  extractSharesOutstanding,
  latestSharesOutstanding,
  type CompanyFactsResponse,
} from '@/lib/research/sec/companyFacts';
import { extractEvidence, htmlToText } from '@/lib/research/sec/documents';

const CONFIG = {
  userAgent: 'Test Desk test@example.com',
  maxRequestsPerSecond: 5,
  activePollSeconds: 60,
};

/* ------------------------------------------------------------------ config */

describe('research config', () => {
  it('requires SEC_USER_AGENT before any SEC request is made', () => {
    const result = secAvailability({ ...CONFIG, userAgent: null });
    expect(result.available).toBe(false);
    expect(result.detail).toContain('SEC_USER_AGENT');
  });

  it('rejects a user agent with no contact route', () => {
    // SEC asks for something they can contact; a bare product name is not it.
    expect(secAvailability({ ...CONFIG, userAgent: 'Momentum Desk' }).available).toBe(false);
  });

  it('accepts a user agent carrying a contact address', () => {
    expect(secAvailability(CONFIG).available).toBe(true);
  });

  it('defaults the rate ceiling conservatively below the SEC limit', () => {
    const config = readResearchConfig({} as NodeJS.ProcessEnv);
    expect(config.sec.maxRequestsPerSecond).toBe(5);
    expect(config.sec.maxRequestsPerSecond).toBeLessThan(10);
  });

  it('never reports a configured value, only availability', () => {
    const detail = secAvailability(CONFIG).detail;
    expect(detail).not.toContain('test@example.com');
  });
});

/* ----------------------------------------------------------------- limiter */

describe('rate limiter', () => {
  function harness(rate: number) {
    let now = 0;
    const sleeps: number[] = [];
    const limiter = new RateLimiter({
      maxRequestsPerSecond: rate,
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });
    return { limiter, sleeps, advance: (ms: number) => (now += ms) };
  }

  it('spaces requests to the configured ceiling', async () => {
    const { limiter, sleeps } = harness(5); // 200ms apart
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(sleeps).toEqual([200, 200]);
  });

  it('does not delay when callers are already far enough apart', async () => {
    const { limiter, sleeps, advance } = harness(5);
    await limiter.acquire();
    advance(1000);
    await limiter.acquire();
    expect(sleeps).toEqual([]);
  });

  it('is global: concurrent callers share one schedule', async () => {
    const { limiter, sleeps } = harness(5);
    // Two "jobs" firing at once must still add up to 5/s, not 10/s.
    await Promise.all([limiter.acquire(), limiter.acquire(), limiter.acquire(), limiter.acquire()]);
    expect(sleeps).toEqual([200, 200, 200]);
    expect(limiter.requestCount).toBe(4);
  });

  it('applies a penalty to every waiting caller, not just the rejected one', async () => {
    const { limiter, sleeps } = harness(5);
    await limiter.acquire();
    limiter.penalise(5000);
    await limiter.acquire();
    expect(sleeps[0]).toBeGreaterThanOrEqual(4800);
  });
});

/* ------------------------------------------------------------------ client */

function response(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

describe('SEC client', () => {
  it('refuses to fetch without a user agent instead of sending an anonymous request', async () => {
    let called = false;
    const client = new SecClient({
      config: { ...CONFIG, userAgent: null },
      fetchImpl: async () => {
        called = true;
        return response('{}');
      },
    });

    await expect(client.get('https://data.sec.gov/x.json')).rejects.toBeInstanceOf(
      SecUnavailableError,
    );
    expect(called).toBe(false);
  });

  it('sends the declared user agent on every request', async () => {
    const seen: string[] = [];
    const client = new SecClient({
      config: CONFIG,
      sleep: async () => undefined,
      fetchImpl: async (_url, init) => {
        seen.push((init?.headers as Record<string, string>)['User-Agent']);
        return response('{"ok":true}');
      },
    });

    await client.get('https://data.sec.gov/a.json');
    await client.get('https://data.sec.gov/b.json');
    expect(seen).toEqual([CONFIG.userAgent, CONFIG.userAgent]);
  });

  it('serves a repeated URL from cache without a second network call', async () => {
    let calls = 0;
    const client = new SecClient({
      config: CONFIG,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        return response('{"v":1}');
      },
    });

    const first = await client.get('https://data.sec.gov/a.json');
    const second = await client.get('https://data.sec.gov/a.json');

    expect(calls).toBe(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.body).toBe(first.body);
    expect(client.requestCount).toBe(1);
  });

  /* The bounded cache (his ruling 2026-10-02T03:12:39Z, "yeah fix the leak"). */
  function counting(bodies: Record<string, string>) {
    const calls: string[] = [];
    let clock = 0;
    const make = (options: { cacheMaxBytes?: number; cacheTtlMs?: number }) =>
      new SecClient({
        config: CONFIG,
        sleep: async () => undefined,
        now: () => clock,
        fetchImpl: async (input) => {
          const url = String(input);
          calls.push(url);
          return response(bodies[url] ?? '');
        },
        ...options,
      });
    return { calls, make, advance: (ms: number) => (clock += ms) };
  }
  const A = 'https://data.sec.gov/a.json';
  const B = 'https://data.sec.gov/b.json';
  const C = 'https://data.sec.gov/c.json';
  const TEN = '0123456789'; // 10 chars = 20 bytes as counted

  it('evicts the LEAST RECENTLY USED entry once the byte cap is passed, and a hit refreshes recency', async () => {
    const f = counting({ [A]: TEN, [B]: TEN, [C]: TEN });
    const client = f.make({ cacheMaxBytes: 50 }); // room for two 20-byte bodies
    await client.get(A);
    await client.get(B);
    await client.get(A); // hit: A becomes most recent
    await client.get(C); // over the cap: B (least recent) goes
    expect(client.cacheBytes).toBe(40);
    await client.get(A); // still cached
    await client.get(B); // evicted, so fetched again
    expect(f.calls).toEqual([A, B, C, B]);
  });

  it('never holds more than the cap, and never caches a body larger than the whole cap', async () => {
    const f = counting({ [A]: TEN, [B]: TEN.repeat(3) });
    const client = f.make({ cacheMaxBytes: 50 });
    await client.get(A);
    await client.get(B); // 60 bytes > 50: not cached, and A is kept
    expect(client.cacheBytes).toBe(20);
    expect((await client.get(B)).cached).toBe(false);
    expect((await client.get(A)).cached).toBe(true);
    expect(f.calls).toEqual([A, B, B]);
  });

  it('a re-research inside the lifetime is a cache hit; past it, the document is fetched fresh (no more stale submissions)', async () => {
    const f = counting({ [A]: TEN });
    const client = f.make({ cacheTtlMs: 1000 });
    await client.get(A);
    f.advance(999);
    expect((await client.get(A)).cached).toBe(true);
    f.advance(1);
    expect((await client.get(A)).cached).toBe(false);
    expect(f.calls).toEqual([A, A]);
    expect(client.cacheBytes).toBe(20);
  });

  it('the defaults bound the cache: 64 MiB and 30 minutes', () => {
    expect([CACHE_MAX_BYTES, CACHE_TTL_MS]).toEqual([64 * 1024 * 1024, 30 * 60_000]);
    expect(cachedBytes(TEN)).toBe(20);
  });

  it('backs off and retries a 429', async () => {
    let calls = 0;
    const slept: number[] = [];
    const client = new SecClient({
      config: CONFIG,
      sleep: async (ms) => {
        slept.push(ms);
      },
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) return response('slow down', 429, { 'retry-after': '2' });
        return response('{"ok":true}');
      },
    });

    const result = await client.get('https://data.sec.gov/a.json');
    expect(result.status).toBe(200);
    expect(calls).toBe(3);
    // Retry-After is honoured rather than replaced by our own schedule.
    expect(slept).toContain(2000);
  });

  it('backs off on a 403 as well, which SEC uses for excessive use', async () => {
    let calls = 0;
    const client = new SecClient({
      config: CONFIG,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        if (calls < 2) return response('forbidden', 403);
        return response('{"ok":true}');
      },
    });

    await client.get('https://data.sec.gov/a.json');
    expect(calls).toBe(2);
  });

  it('does not retry a 404, which is an answer rather than a failure', async () => {
    let calls = 0;
    const client = new SecClient({
      config: CONFIG,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        return response('missing', 404);
      },
    });

    await expect(client.get('https://data.sec.gov/a.json')).rejects.toBeInstanceOf(
      SecRequestError,
    );
    expect(calls).toBe(1);
  });

  it('gives up after bounded attempts rather than hammering SEC', async () => {
    let calls = 0;
    const client = new SecClient({
      config: CONFIG,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        return response('slow down', 429);
      },
    });

    await expect(client.get('https://data.sec.gov/a.json')).rejects.toBeTruthy();
    expect(calls).toBe(4);
  });

  it('grows the backoff but caps it', () => {
    expect(backoffDelayMs(1)).toBe(500);
    expect(backoffDelayMs(2)).toBe(1000);
    expect(backoffDelayMs(20)).toBe(15_000);
  });

  it('reads Retry-After as seconds or as a date', () => {
    expect(parseRetryAfter('3', 0)).toBe(3000);
    expect(parseRetryAfter(null, 0)).toBeNull();
    expect(parseRetryAfter('nonsense', 0)).toBeNull();
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 0)).toBeGreaterThan(0);
  });
});

/* --------------------------------------------------------------- ticker map */

const MAP_FILE: TickerExchangeFile = {
  fields: ['cik', 'name', 'ticker', 'exchange'],
  data: [
    [1567529, 'KAMADA LTD', 'KMDA', 'Nasdaq'],
    [1104506, 'Super League Enterprise, Inc.', 'SLE', 'Nasdaq'],
    [9999901, 'Duplicate Holdings A', 'DUP', 'Nasdaq'],
    [9999902, 'Completely Different Co', 'DUP', 'NYSE'],
  ],
};

describe('ticker to CIK mapping', () => {
  const map = parseTickerMap(MAP_FILE);

  it('normalises a CIK to ten digits and back to a path segment', () => {
    expect(normaliseCik(1567529)).toBe('0001567529');
    expect(normaliseCik('0001567529')).toBe('0001567529');
    expect(cikPathSegment('0001567529')).toBe('1567529');
  });

  it('resolves a corroborated ticker with high confidence', () => {
    const result = resolveTicker(map, {
      ticker: 'SLE',
      expectedName: 'Super League Enterprise, Inc. Common Stock',
      expectedExchange: 'NASDAQ',
    });
    expect(result.cik).toBe('0001104506');
    expect(result.confidence).toBe('HIGH');
  });

  it('drops confidence when nothing corroborates the match', () => {
    const result = resolveTicker(map, { ticker: 'SLE' });
    expect(result.cik).toBe('0001104506');
    expect(result.confidence).toBe('MEDIUM');
  });

  it('refuses a match whose registrant name actively disagrees', () => {
    // The mismatch case: accepting this would attach another company's filings.
    const result = resolveTicker(map, {
      ticker: 'KMDA',
      expectedName: 'Wholly Unrelated Mining Corp',
    });
    expect(result.cik).toBeNull();
    expect(result.confidence).toBe('NONE');
    expect(result.reason).toContain('does not corroborate');
  });

  it('keeps an ambiguous ticker visible rather than picking silently', () => {
    const result = resolveTicker(map, {
      ticker: 'DUP',
      expectedName: 'Duplicate Holdings A',
    });
    expect(result.confidence).toBe('LOW');
    expect(result.candidates).toHaveLength(2);
    expect(result.reason).toContain('ambiguous');
  });

  it('reports no match for an unlisted ticker without inventing one', () => {
    const result = resolveTicker(map, { ticker: 'ZZZZ' });
    expect(result.cik).toBeNull();
    expect(result.confidence).toBe('NONE');
    expect(result.reason).toContain('NO SEC MATCH');
  });

  it('matches names despite exchange description noise', () => {
    // "9F Inc. American Depositary Shares" vs "9F INC." is agreement.
    expect(
      nameSimilarity('9F Inc. American Depositary Shares', '9F Inc.'),
    ).toBeGreaterThan(0);
    expect(nameSimilarity('Kamada Ltd', 'Wholly Unrelated Mining Corp')).toBe(0);
  });
});

/* ------------------------------------------------------------------- forms */

describe('form selection', () => {
  it('treats 6-K as a current report for foreign issuers', () => {
    expect(isRelevantForm('6-K')).toBe(true);
    expect(formPurposes('6-K')).toContain('CATALYST');
    expect(formPurposes('8-K')).toContain('CATALYST');
  });

  it('includes the dilution and resale forms', () => {
    for (const form of ['424B5', '424B3', 'S-3', 'F-3', 'POS AM', 'EFFECT', '10-Q', '20-F']) {
      expect(isRelevantForm(form)).toBe(true);
    }
  });

  it('ignores forms with no bearing on catalyst or structure', () => {
    expect(isRelevantForm('4')).toBe(false);
    expect(isRelevantForm('CERT')).toBe(false);
    expect(isRelevantForm('NT 10-K')).toBe(false);
  });

  it('infers foreign issuer status from the filing track', () => {
    expect(inferForeignIssuer(['6-K', '20-F', '4'])).toBe(true);
    expect(inferForeignIssuer(['8-K', '10-Q', '10-K'])).toBe(false);
  });

  it('leaves foreign status unknown when the history says nothing', () => {
    // Not false. Recording "domestic" here would be an invention.
    expect(inferForeignIssuer([])).toBeNull();
    expect(inferForeignIssuer(['4', '3', 'SC 13G'])).toBeNull();
  });
});

/* ------------------------------------------------------------- submissions */

const SUBMISSIONS: SubmissionsResponse = {
  cik: '0001567529',
  name: 'KAMADA LTD',
  tickers: ['KMDA'],
  exchanges: ['Nasdaq'],
  entityType: 'operating',
  addresses: { business: { stateOrCountry: 'L3' } },
  filings: {
    recent: {
      accessionNumber: ['0001-26-01', '0001-26-02', '0001-26-03', '0001-26-04'],
      form: ['6-K', '424B5', '4', '20-F'],
      filingDate: ['2026-08-12', '2026-08-01', '2026-07-30', '2026-03-01'],
      // One blank on purpose: the payload can omit it, and a missing acceptance
      // must arrive as null rather than as an invented time.
      acceptanceDateTime: [
        '2026-08-12T06:31:15.000Z',
        '2026-08-01T21:04:00.000Z',
        '',
        '2026-03-01T11:00:00.000Z',
      ],
      reportDate: ['2026-08-12', '', '', '2025-12-31'],
      primaryDocument: ['ea01.htm', 'ea02.htm', 'ea03.xml', 'ea04.htm'],
      primaryDocDescription: ['Report of foreign issuer', 'Prospectus', 'Form 4', 'Annual report'],
      items: ['', '', '', ''],
    },
  },
};

describe('submissions parsing', () => {
  const profile = parseSubmissions(SUBMISSIONS, '0001567529');

  it('parses the parallel arrays into filings', () => {
    expect(profile.filings).toHaveLength(4);
    expect(profile.filings[0]).toMatchObject({
      accession: '0001-26-01',
      form: '6-K',
      filingDate: '2026-08-12',
    });
  });

  it('carries issuer identity and country through', () => {
    expect(profile.name).toBe('KAMADA LTD');
    expect(profile.country).toBe('L3');
    expect(profile.foreignIssuer).toBe(true);
  });

  it('skips malformed rows rather than losing the whole history', () => {
    const damaged = parseSubmissions(
      {
        filings: {
          recent: {
            accessionNumber: ['0001-26-01', null, '0001-26-03'],
            form: ['8-K', '8-K', null],
            filingDate: ['2026-08-12', '2026-08-11', '2026-08-10'],
          },
        },
      } as unknown as SubmissionsResponse,
      '0000000001',
    );
    expect(damaged.filings).toHaveLength(1);
  });

  it('tolerates an entirely absent filings block', () => {
    const empty = parseSubmissions({}, '0000000001');
    expect(empty.filings).toEqual([]);
    expect(empty.foreignIssuer).toBeNull();
  });

  it('selects across families and drops the irrelevant', () => {
    const manifest = selectFilingsByFamily(profile.filings, { asOf: new Date('2026-08-17') });
    expect(manifest.totalRelevant).toBe(3); // the Form 4 is excluded
    expect(manifest.selected.map((f) => f.form).sort()).toEqual(['20-F', '424B5', '6-K']);
    expect(manifest.familiesPresent.sort()).toEqual([
      'CURRENT_REPORT',
      'PERIODIC_REPORT',
      'PROSPECTUS',
    ]);
  });

  it('reports which families the issuer has none of', () => {
    const manifest = selectFilingsByFamily(profile.filings, { asOf: new Date('2026-08-17') });
    expect(manifest.familiesAbsent).toContain('REGISTRATION');
    expect(manifest.familiesAbsent).toContain('OWNERSHIP');
  });

  it('does not let a flood of current reports crowd out a live shelf', () => {
    // The failure this design exists to prevent: an issuer filing 8-Ks weekly
    // buries its own registration on date alone under a flat "latest N" cap.
    const flood: Filing[] = Array.from({ length: 40 }, (_, i) => ({
      accession: `0001-26-${String(i).padStart(3, '0')}`,
      form: '8-K',
      filingDate: `2026-0${(i % 8) + 1}-15`,
      acceptanceDateTime: null,
      reportDate: null,
      primaryDocument: 'a.htm',
      primaryDocDescription: null,
      items: null,
    }));
    const shelf: Filing = {
      accession: '0001-24-999',
      form: 'S-3',
      filingDate: '2024-02-01',
      acceptanceDateTime: null,
      reportDate: null,
      primaryDocument: 's3.htm',
      primaryDocDescription: 'Shelf',
      items: null,
    };

    const manifest = selectFilingsByFamily([...flood, shelf], { asOf: new Date('2026-08-17') });
    const forms = manifest.selected.map((f) => f.form);

    // The 2024 shelf is still operative and must survive selection.
    expect(forms).toContain('S-3');
    expect(manifest.selected.find((f) => f.form === 'S-3')?.accession).toBe('0001-24-999');
  });

  it('records every omission with a reason rather than a bare count', () => {
    const flood: Filing[] = Array.from({ length: 12 }, (_, i) => ({
      accession: `0001-26-${i}`,
      form: '8-K',
      filingDate: '2026-08-01',
      acceptanceDateTime: null,
      reportDate: null,
      primaryDocument: 'a.htm',
      primaryDocDescription: null,
      items: null,
    }));
    const ancient: Filing = {
      accession: '0001-10-1',
      form: '8-K',
      filingDate: '2010-01-01',
      acceptanceDateTime: null,
      reportDate: null,
      primaryDocument: 'a.htm',
      primaryDocDescription: null,
      items: null,
    };

    const manifest = selectFilingsByFamily([...flood, ancient], { asOf: new Date('2026-08-17') });
    const current = manifest.families.find((f) => f.family === 'CURRENT_REPORT')!;

    expect(current.availableTotal).toBe(13);
    expect(current.omitted.some((o) => o.reason === 'OUTSIDE_LOOKBACK')).toBe(true);
    expect(current.omitted.some((o) => o.reason === 'BEYOND_FAMILY_CAP')).toBe(true);
    // Every omitted filing is individually accounted for.
    expect(current.selected.length + current.omitted.length).toBe(13);
  });

  it('keeps an old registration eligible but an old current report not', () => {
    const asOf = new Date('2026-08-17');
    const old = (form: string, date: string): Filing => ({
      accession: `x-${form}-${date}`,
      form,
      filingDate: date,
      acceptanceDateTime: null,
      reportDate: null,
      primaryDocument: 'a.htm',
      primaryDocDescription: null,
      items: null,
    });

    const manifest = selectFilingsByFamily(
      [old('S-3', '2024-01-01'), old('8-K', '2024-01-01')],
      { asOf },
    );
    const forms = manifest.selected.map((f) => f.form);

    // A shelf from 2024 can still govern what is sold today; a 2024 8-K cannot
    // still be the reason a stock is moving this morning.
    expect(forms).toContain('S-3');
    expect(forms).not.toContain('8-K');
  });

  it('builds archive URLs with an unpadded CIK and stripped accession', () => {
    expect(accessionPathSegment('0001213900-26-088030')).toBe('000121390026088030');
    expect(filingDocumentUrl('0001567529', profile.filings[0])).toBe(
      'https://www.sec.gov/Archives/edgar/data/1567529/00012601/ea01.htm',
    );
  });
});

/* ---------------------------------------------------------- company facts */

describe('company facts', () => {
  const facts: CompanyFactsResponse = {
    entityName: 'Sample',
    facts: {
      dei: {
        EntityCommonStockSharesOutstanding: {
          units: {
            shares: [
              { end: '2026-03-31', val: 9_000_000, accn: '0001-26-01', form: '10-Q' },
              { end: '2026-06-30', val: 12_500_000, accn: '0001-26-02', form: '10-Q' },
            ],
          },
        },
      },
    },
  };

  it('extracts share counts newest period first', () => {
    const all = extractSharesOutstanding(facts);
    expect(all[0].shares).toBe(12_500_000);
    expect(all[0].asOf).toBe('2026-06-30');
    expect(all[0].concept).toBe('dei:EntityCommonStockSharesOutstanding');
  });

  it('returns null when the issuer exposes no share facts', () => {
    // Common for foreign private issuers. Absence is not zero.
    expect(latestSharesOutstanding({ facts: {} })).toBeNull();
    expect(latestSharesOutstanding({})).toBeNull();
  });

  it('ignores nonsensical values rather than reporting them', () => {
    const bad: CompanyFactsResponse = {
      facts: {
        dei: {
          EntityCommonStockSharesOutstanding: {
            units: { shares: [{ end: '2026-06-30', val: 0 }, { end: '2026-06-30', val: -5 }] },
          },
        },
      },
    };
    expect(latestSharesOutstanding(bad)).toBeNull();
  });

  it('exposes no float field anywhere in its output', () => {
    // Structural guard: shares outstanding must not be able to leak into a
    // float slot by name collision downstream.
    const fact = latestSharesOutstanding(facts)!;
    expect(Object.keys(fact)).toEqual(
      expect.arrayContaining(['shares', 'asOf', 'accession', 'form', 'filed', 'concept']),
    );
    expect(Object.keys(fact)).not.toContain('float');
    expect(Object.keys(fact)).not.toContain('displayedFloat');
    expect(Object.keys(fact)).not.toContain('marketCap');
  });
});

/* ---------------------------------------------------------------- documents */

describe('document extraction', () => {
  it('converts filing HTML to readable text', () => {
    const html =
      '<html><head><style>p{color:red}</style></head><body><p>First line.</p>' +
      '<p>Second&nbsp;line &amp; more.</p><script>ignore()</script></body></html>';
    const text = htmlToText(html);
    expect(text).toContain('First line.');
    expect(text).toContain('Second line & more.');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('ignore()');
  });

  it('pulls the passages that bear on supply', () => {
    const text = `${'filler '.repeat(200)} The Company had 41,250,000 shares outstanding as of June 30, 2026. ${'filler '.repeat(200)} entered into an at-the-market offering agreement. ${'filler '.repeat(200)}`;
    const evidence = extractEvidence(text);
    expect(evidence.matchedTerms).toContain('shares outstanding');
    expect(evidence.matchedTerms).toContain('at-the-market');
    expect(evidence.excerpt).toContain('41,250,000');
  });

  it('never retains a whole filing', () => {
    const huge = `shares outstanding ${'x'.repeat(500_000)}`;
    const evidence = extractEvidence(huge);

    // The guarantee is proportional, not just an absolute cap: a half-megabyte
    // filing must leave a tiny bounded excerpt in the database.
    expect(evidence.excerpt.length).toBeLessThanOrEqual(4001);
    expect(evidence.fullLength).toBeGreaterThan(400_000);
    expect(evidence.excerpt.length / evidence.fullLength).toBeLessThan(0.01);
  });

  it('caps the excerpt when matches are spread across a long document', () => {
    // Enough separated matches that the merged windows would exceed the cap.
    const filler = 'filler '.repeat(300);
    const document = [
      'shares outstanding',
      'at-the-market',
      'convertible',
      'warrant',
      'reverse stock split',
      'selling stockholder',
      'private placement',
      'gross proceeds',
      'net proceeds',
      'exercise price',
      'conversion price',
      'shelf registration',
      'placement agent',
      'equity purchase agreement',
    ]
      .map((term) => `${filler}${term}${filler}`)
      .join(' ');

    const evidence = extractEvidence(document);
    expect(evidence.matchedTerms.length).toBeGreaterThan(4);
    expect(evidence.excerpt.length).toBeLessThanOrEqual(4001);
    expect(evidence.truncated).toBe(true);
  });

  it('keeps the opening when no term matches, and flags it as a fallback', () => {
    const evidence = extractEvidence('An unanticipated disclosure with novel wording.');
    expect(evidence.matchedTerms).toEqual([]);
    expect(evidence.excerpt).toContain('unanticipated disclosure');
    // A fallback excerpt is weaker evidence and must be distinguishable.
    expect(evidence.fallback).toBe(true);
    expect(evidence.concepts).toEqual([]);
  });

  it('reports which structural concepts a filing spoke to', () => {
    const filler = 'lorem ipsum '.repeat(60);
    const document = [
      `${filler} 41,250,000 shares outstanding as of June 30 ${filler}`,
      `${filler} entered into an at-the-market sales agreement ${filler}`,
      `${filler} each pre-funded warrant has an exercise price of $0.001 ${filler}`,
      `${filler} effected a reverse stock split at a ratio of one-for-ten ${filler}`,
    ].join(' ');

    const evidence = extractEvidence(document);
    expect(evidence.fallback).toBe(false);
    expect(evidence.concepts).toContain('SHARES_OUTSTANDING');
    expect(evidence.concepts).toContain('OFFERING_ATM_PIPE');
    expect(evidence.concepts).toContain('WARRANTS');
    expect(evidence.concepts).toContain('REVERSE_SPLIT');
  });

  it('retains character offsets so a passage can be located in the source', () => {
    const filler = 'x'.repeat(2000);
    const document = `${filler} 12,000,000 shares outstanding today.`;
    const evidence = extractEvidence(document);

    const window = evidence.windows[0];
    expect(window.start).toBeGreaterThan(1000);
    expect(window.end).toBeLessThanOrEqual(document.length);
    // The offsets must actually address the retained passage.
    expect(document.slice(window.start, window.end)).toContain('shares outstanding');
  });

  it('covers breadth of concepts rather than one verbose section', () => {
    // A filing that discusses warrants at length must not crowd out the single
    // sentence carrying the share count.
    const warrantNoise = `${'warrant terms and conditions apply. '.repeat(400)}`;
    const document = `${warrantNoise} The Company had 7,500,000 shares outstanding. ${warrantNoise}`;

    const evidence = extractEvidence(document);
    expect(evidence.concepts).toContain('SHARES_OUTSTANDING');
    expect(evidence.excerpt).toContain('7,500,000');
  });

  it('finds a later occurrence, not only a heading', () => {
    const document = `WARRANTS\n${'filler '.repeat(300)} each warrant has an exercise price of $4.10 per share.`;
    const evidence = extractEvidence(document);
    expect(evidence.concepts).toContain('WARRANTS');
    expect(evidence.excerpt).toContain('4.10');
  });
});
