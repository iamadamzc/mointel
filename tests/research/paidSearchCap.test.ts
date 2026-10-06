import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertIssuer } from '@/lib/market/store/researchRepo';
import { SecClient } from '@/lib/research/sec/client';
import { collectCatalystEvidence, RESOLVER_VERSION, type CatalystCollectionInput } from '@/lib/research/catalyst/collector';
import { paidSearchDecision, type PaidSearchDecision } from '@/lib/research/catalyst/paidSearchCap';
import { EMPTY_COMPANY_SOURCES } from '@/lib/research/types';
import type { CompanySourceResolverProvider } from '@/lib/research/catalyst/companySourceContract';
import type { CatalystSourceDiscoveryProvider, DiscoveryResult } from '@/lib/research/catalyst/discovery';
import type { CatalystConfig, SecConfig } from '@/lib/research/config';

/*
 * His paid-search rulings (transcript 557bca06): "only search the top 12 ranked ... make the min search for rvol be 3x"
 * (2026-10-06T20:20:33.619Z) and "a" (23:39:21.703Z): one search per look, this gate, no entry/+5/+10 cutoff. The free
 * paths are not governed here. Unknown RVOL is allowed (Research's call, paidSearchCap.ts).
 */

describe('paidSearchDecision: top 12 with RVOL of at least 3', () => {
  it('T5 top 12 only: rank 12 allowed, rank 13 and off the board refused', () => {
    expect(paidSearchDecision({ rank: 12, rvol: 12 })).toEqual({ allowed: true });
    expect(paidSearchDecision({ rank: 13, rvol: 12 })).toEqual({ allowed: false, reason: 'NOT_TOP_12' });
    expect(paidSearchDecision({ rank: null, rvol: 12 })).toEqual({ allowed: false, reason: 'NOT_TOP_12' });
  });

  it('T6 RVOL 3x: exactly 3 allowed, below 3 refused, unknown allowed (no baseline yet, as on a new listing)', () => {
    expect(paidSearchDecision({ rank: 3, rvol: 3 })).toEqual({ allowed: true });
    expect(paidSearchDecision({ rank: 3, rvol: 2.99 })).toEqual({ allowed: false, reason: 'RVOL_BELOW_3' });
    expect(paidSearchDecision({ rank: 3, rvol: null })).toEqual({ allowed: true });
  });
});

const files: string[] = [];
function temporaryDb(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-paidcap-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

const DATE = '2026-10-06';
const T = '2026-10-06T13:00:00.000Z';
const at = (minutes: number) => new Date(Date.parse(T) + minutes * 60_000);

/* --------------------------------------------------------------- the collector gate */

const SEC_CONFIG: SecConfig = { userAgent: 'Test Desk test@example.com', maxRequestsPerSecond: 1000, activePollSeconds: 60 };
const CATALYST_CONFIG: CatalystConfig = {
  sourcePollSeconds: 60,
  webDiscoveryUnresolvedMinutes: 10,
  webDiscoveryResolvedMinutes: 30,
  activeFreshnessHours: 36,
  contextLookbackDays: 45,
};
const NOW = at(0);

class CountingDiscovery implements CatalystSourceDiscoveryProvider {
  readonly name = 'counting';
  available = true;
  calls = 0;
  async discover(): Promise<DiscoveryResult> {
    this.calls += 1;
    return { sources: [], ran: true, modelCalls: 1, detail: 'ran', toolConfig: 'web_search:default;domains:v1' };
  }
}

class CountingResolver implements CompanySourceResolverProvider {
  readonly name = 'test-resolver';
  available = true;
  calls = 0;
  async resolve() {
    this.calls += 1;
    return { candidates: [], modelCalls: 1, detail: 'test resolver', toolConfig: 'web_search:low;domains:v1' };
  }
}

function fakeSecClient(): SecClient {
  return new SecClient({ config: SEC_CONFIG, sleep: async () => undefined, fetchImpl: async () => new Response('missing', { status: 404 }) });
}

function seedIssuer(db: MarketDatabase, sources: Record<string, unknown>) {
  upsertIssuer(db, {
    ticker: 'ACME', companyName: 'Acme Inc.', cik: null, exchange: null, country: null, foreignIssuer: null,
    cikConfidence: 'NONE', mappingSource: null, irUrl: null, lastVerifiedAt: null,
    companySources: { ...EMPTY_COMPANY_SOURCES, resolverVersion: RESOLVER_VERSION, ...sources },
  } as never);
}

function collect(db: MarketDatabase, discovery: CountingDiscovery, resolver: CountingResolver, input: Partial<CatalystCollectionInput> = {}) {
  return collectCatalystEvidence(db, fakeSecClient(), discovery, resolver, { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG }, {
    ticker: 'ACME', now: NOW, tradingDate: DATE, jobId: null, ...input,
  });
}

class FindingDiscovery extends CountingDiscovery {
  async discover(): Promise<DiscoveryResult> {
    await super.discover();
    const published = { original: '2026-10-06T12:30:00Z', originalTimeZone: null, utc: '2026-10-06T12:30:00.000Z', etDate: DATE, etClock: '08:30', precision: 'EXACT' };
    const source = (n: number) => ({
      title: `Acme release ${n}`, url: `https://example.com/acme-${n}`, publisher: 'Acme', published, kind: 'COMPANY_NEWSROOM',
      relevance: 'issuer', appearsOriginal: true, confidence: 'HIGH',
    });
    return { sources: [source(1), source(2)], ran: true, modelCalls: 1, detail: 'ran', toolConfig: 'web_search:default;domains:v1;max_tool_calls:1' } as never;
  }
}

const refused: PaidSearchDecision = { allowed: false, reason: 'RVOL_BELOW_3' };
const allowed: PaidSearchDecision = { allowed: true };

describe('collectCatalystEvidence under the budget', () => {
  it('C1 refused: no urgent resolver and no discovery, even on a first qualification by a material event; the report says why', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: null, lastDiscoveryMode: null });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();
    const report = await collect(db, discovery, resolver, { materialEvent: { kind: 'ENTERED_TOP_N', detail: 'rank 4' }, paidSearch: refused });
    expect([resolver.calls, discovery.calls]).toEqual([0, 0]);
    expect(report.discoveryDetail).toBe('paid search not allowed: RVOL_BELOW_3');
  });

  it('C2 refused: no recovery resolution either', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: at(-60).toISOString(), resolverVersion: RESOLVER_VERSION - 1 });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();
    await collect(db, discovery, resolver, { recoveryEpisode: true, paidSearch: refused });
    expect([resolver.calls, discovery.calls]).toEqual([0, 0]);
  });

  it('C3 refused: no steady-state resolver turn and no interval discovery after the interval elapsed', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: at(-60).toISOString(), lastDiscoveryMode: 'DISCOVERY' });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();
    await collect(db, discovery, resolver, { paidSearch: refused });
    expect([resolver.calls, discovery.calls]).toEqual([0, 0]);
  });

  it('C4 allowed does not force a pass: the existing interval still decides (his "a" keeps the current cadence)', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: at(-5).toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const discovery = new CountingDiscovery();
    await collect(db, discovery, new CountingResolver(), { paidSearch: allowed });
    expect(discovery.calls).toBe(0);

    const db2 = temporaryDb();
    seedIssuer(db2, { lastDiscoveryAt: at(-15).toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const discovery2 = new CountingDiscovery();
    await collect(db2, discovery2, new CountingResolver(), { paidSearch: allowed });
    expect(discovery2.calls).toBe(1);
  });
  it('C5 the report carries the paid finds of this pass: 2 when discovery returned two new sources, 0 when refused', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: at(-15).toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const report = await collect(db, new FindingDiscovery(), new CountingResolver(), { paidSearch: allowed });
    expect(report.paidSourcesFound).toBe(2);

    const db2 = temporaryDb();
    seedIssuer(db2, { lastDiscoveryAt: at(-15).toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const refusedReport = await collect(db2, new FindingDiscovery(), new CountingResolver(), { paidSearch: refused });
    expect(refusedReport.paidSourcesFound).toBe(0);
  });
});
