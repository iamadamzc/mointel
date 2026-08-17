import { describe, expect, it, vi } from 'vitest';

import { AlpacaRestClient, chunk, runPool } from '@/lib/market/alpaca/rest';
import type { AlpacaCredentials } from '@/lib/market/credentials';

const credentials: AlpacaCredentials = {
  keyId: 'AKTESTKEYID0000000',
  secret: 'super-secret-value-that-must-never-be-logged-0000',
  feed: 'sip',
  origin: 'test',
};

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('historical bars request shape (requirement 10)', () => {
  it('requests split-adjusted SIP bars', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calls.push(String(url));
      return jsonResponse({ bars: { ABCD: [{ t: '2026-08-13T04:00:00Z', o: 1, h: 2, l: 1, c: 2, v: 10 }] } });
    }) as unknown as typeof fetch;

    const client = new AlpacaRestClient(credentials, { fetchImpl, batchSize: 200 });
    await client.getBars(['ABCD'], { timeframe: '1Day', start: '2026-06-15', end: '2026-08-13' });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!);
    expect(url.searchParams.get('adjustment')).toBe('split');
    expect(url.searchParams.get('feed')).toBe('sip');
    expect(url.searchParams.get('timeframe')).toBe('1Day');
    expect(url.searchParams.get('symbols')).toBe('ABCD');
  });

  it('sends credentials as headers only, never in the URL', async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      seen.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
      return jsonResponse({ bars: {} });
    }) as unknown as typeof fetch;

    const client = new AlpacaRestClient(credentials, { fetchImpl });
    await client.getBars(['ABCD'], { timeframe: '1Day', start: '2026-08-01' });

    expect(seen[0]!.url).not.toContain(credentials.keyId);
    expect(seen[0]!.url).not.toContain(credentials.secret);
    expect(seen[0]!.headers['APCA-API-KEY-ID']).toBe(credentials.keyId);
    expect(seen[0]!.headers['APCA-API-SECRET-KEY']).toBe(credentials.secret);
  });
});

describe('page-token pagination (requirement 30)', () => {
  it('follows next_page_token until it is exhausted and merges every page', async () => {
    const pages = [
      { bars: { ABCD: [{ t: '2026-08-10T04:00:00Z', o: 1, h: 1, l: 1, c: 1, v: 1 }] }, next_page_token: 'p2' },
      { bars: { ABCD: [{ t: '2026-08-11T04:00:00Z', o: 2, h: 2, l: 2, c: 2, v: 2 }] }, next_page_token: 'p3' },
      { bars: { ABCD: [{ t: '2026-08-12T04:00:00Z', o: 3, h: 3, l: 3, c: 3, v: 3 }] }, next_page_token: null },
    ];

    const tokens: Array<string | null> = [];
    let call = 0;
    const fetchImpl = vi.fn(async (url: string | URL) => {
      tokens.push(new URL(String(url)).searchParams.get('page_token'));
      return jsonResponse(pages[call++]!);
    }) as unknown as typeof fetch;

    const client = new AlpacaRestClient(credentials, { fetchImpl });
    const result = await client.getBars(['ABCD'], { timeframe: '1Day', start: '2026-08-01' });

    expect(tokens).toEqual([null, 'p2', 'p3']);
    expect(result.get('ABCD')).toHaveLength(3);
    expect(result.get('ABCD')!.map((bar) => bar.v)).toEqual([1, 2, 3]);
  });
});

describe('multi-symbol batching (avoids N requests for N symbols)', () => {
  it('splits symbols into multi-symbol batches', async () => {
    const symbolCounts: number[] = [];
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const symbols = new URL(String(url)).searchParams.get('symbols') ?? '';
      symbolCounts.push(symbols.split(',').length);
      return jsonResponse({ bars: {} });
    }) as unknown as typeof fetch;

    const symbols = Array.from({ length: 450 }, (_, index) => `SY${index}`);
    const client = new AlpacaRestClient(credentials, { fetchImpl, batchSize: 200, concurrency: 1 });
    await client.getBars(symbols, { timeframe: '1Day', start: '2026-08-01' });

    expect(symbolCounts).toEqual([200, 200, 50]);
    expect(symbolCounts.length).toBeLessThan(symbols.length);
  });

  it('chunks and runs a bounded pool', async () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);

    let active = 0;
    let peak = 0;
    await runPool(Array.from({ length: 10 }, (_, index) => index), 3, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('rate limiting and errors', () => {
  it('honours Retry-After on 429 and then succeeds', async () => {
    let call = 0;
    const waits: number[] = [];
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return new Response('slow down', { status: 429, headers: { 'retry-after': '0' } });
      }
      return jsonResponse({ bars: { ABCD: [] } });
    }) as unknown as typeof fetch;

    const client = new AlpacaRestClient(credentials, {
      fetchImpl,
      onRateLimit: (waitMs) => waits.push(waitMs),
    });

    await client.getBars(['ABCD'], { timeframe: '1Day', start: '2026-08-01' });
    expect(call).toBe(2);
    expect(waits).toHaveLength(1);
  });

  it('redacts credentials out of error bodies', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(`forbidden for key ${credentials.keyId} secret ${credentials.secret}`, {
        status: 403,
      }),
    ) as unknown as typeof fetch;

    const client = new AlpacaRestClient(credentials, { fetchImpl, maxRetries: 0 });
    const result = await client.verifyDataAccess('ABCD');

    expect(result.ok).toBe(false);
    expect(result.detail).not.toContain(credentials.keyId);
    expect(result.detail).not.toContain(credentials.secret);
    expect(result.detail).toContain('REDACTED');
  });
});
