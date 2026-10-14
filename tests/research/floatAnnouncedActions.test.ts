import { describe, expect, it, vi } from 'vitest';

import { AlpacaRestClient, type CorporateActionRow } from '@/lib/market/alpaca/rest';
import type { AlpacaCredentials } from '@/lib/market/credentials';
import { ANNOUNCED_ACTION_TYPES } from '@/lib/research/floatJob';
import { fetchAnnouncedActions } from '@/lib/research/floatRun';

/*
 * L6 step 1 (split-restate-build-plan-2026-10-14.md, R2): the real `announcedActions` dep, shared by runFloatJob and
 * the nightly run. Request types are the API's SINGULAR names; rows come back under PLURAL groups, kept as returned.
 */

describe('fetchAnnouncedActions: the real announcedActions dep', () => {
  it('asks for the seven share-changing types for the one symbol, keeps the group and rateless rows, dates a merger by its effective date', async () => {
    const asked: Array<{ symbols: string[]; start: string; end: string; types: readonly string[] }> = [];
    const row = (group: string, exDate: string | null, oldRate: number | null, newRate: number | null, raw: Record<string, unknown> = {}): CorporateActionRow => ({ group, symbol: 'ACME', exDate, oldRate, newRate, raw });
    const client = {
      getCorporateActionsRaw: async (params: { symbols: string[]; start: string; end: string; types: readonly string[] }) => {
        asked.push(params);
        return [
          row('reverse_splits', '2026-09-15', 10, 1),
          row('stock_dividends', '2026-09-20', null, null),
          // No ex_date: dated by effective_date, never dropped (a dropped merger would let a restatement run across it).
          row('stock_mergers', null, null, null, { effective_date: '2026-09-22' }),
          // A spin-off row names its symbols under other fields, so its `symbol` reads ''; it is still kept.
          { ...row('spin_offs', '2026-09-25', null, null), symbol: '' },
          // The same split listed twice is one split (its factor must not be squared).
          row('reverse_splits', '2026-09-15', 10, 1),
        ];
      },
    };

    const actions = await fetchAnnouncedActions(client, 'ACME', '2026-06-01', '2026-10-02');

    expect(asked).toEqual([{ symbols: ['ACME'], start: '2026-06-01', end: '2026-10-02', types: ANNOUNCED_ACTION_TYPES }]);
    expect([...asked[0]!.types].sort()).toEqual(['forward_split', 'reverse_split', 'spin_off', 'stock_and_cash_merger', 'stock_dividend', 'stock_merger', 'unit_split']);
    expect(actions).toEqual([
      { group: 'reverse_splits', exDate: '2026-09-15', oldRate: 10, newRate: 1 },
      { group: 'stock_dividends', exDate: '2026-09-20', oldRate: null, newRate: null },
      { group: 'stock_mergers', exDate: '2026-09-22', oldRate: null, newRate: null },
      { group: 'spin_offs', exDate: '2026-09-25', oldRate: null, newRate: null },
    ]);
  });

  it('a row with no ex, effective or process date cannot be placed: the fetch throws (stored as null, today\'s refusal)', async () => {
    const undated: CorporateActionRow = { group: 'unit_splits', symbol: 'ACME', exDate: null, oldRate: null, newRate: null, raw: {} };
    await expect(fetchAnnouncedActions({ getCorporateActionsRaw: async () => [undated] }, 'ACME', '2026-06-01', '2026-10-02')).rejects.toThrow(/no ex, effective or process date/);
  });

  it('through the REST client: the singular types go on the wire, the plural groups come back as published', async () => {
    const credentials: AlpacaCredentials = { keyId: 'AKTESTKEYID0000000', secret: 'test-secret-not-a-real-key-0000', feed: 'sip', origin: 'test' };
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calls.push(String(url));
      const body = {
        corporate_actions: {
          forward_splits: [{ symbol: 'acme', ex_date: '2026-09-15', old_rate: 1, new_rate: 2 }],
          unit_splits: [{ symbol: 'ACME', ex_date: '2026-09-18' }],
          stock_dividends: [{ symbol: 'ACME', rate: 0.05 }],
        },
        next_page_token: null,
      };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;

    const actions = await fetchAnnouncedActions(new AlpacaRestClient(credentials, { fetchImpl }), 'ACME', '2026-06-01', '2026-10-02');

    const url = new URL(calls[0]!);
    expect(url.pathname).toBe('/v1/corporate-actions');
    expect(url.searchParams.get('types')).toBe(ANNOUNCED_ACTION_TYPES.join(','));
    expect(url.searchParams.get('symbols')).toBe('ACME');
    expect(url.searchParams.get('start')).toBe('2026-06-01');
    expect(url.searchParams.get('end')).toBe('2026-10-02');
    expect(actions).toEqual([
      { group: 'forward_splits', exDate: '2026-09-15', oldRate: 1, newRate: 2 },
      { group: 'unit_splits', exDate: '2026-09-18', oldRate: null, newRate: null },
    ]);
  });
});
