import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { recordModelUsage, upsertIssuer } from '@/lib/market/store/researchRepo';
import { SecClient } from '@/lib/research/sec/client';
import { collectCatalystEvidence, RESOLVER_VERSION, type CatalystCollectionInput } from '@/lib/research/catalyst/collector';
import { paidSearchDecision, readPaidSearchPasses, type PaidSearchDecision } from '@/lib/research/catalyst/paidSearchCap';
import { EMPTY_COMPANY_SOURCES } from '@/lib/research/types';
import type { CompanySourceResolverProvider } from '@/lib/research/catalyst/companySourceContract';
import type { CatalystSourceDiscoveryProvider, DiscoveryResult } from '@/lib/research/catalyst/discovery';
import type { CatalystConfig, SecConfig } from '@/lib/research/config';

/*
 * His paid-search rulings, 2026-10-06 (transcript 557bca06): "entry, 5 and 10" then stop; "only search the top 12
 * ranked ... make the min search for rvol be 3x". The free paths are not governed here.
 */

const T = '2026-10-06T13:00:00.000Z';
const at = (minutes: number) => new Date(Date.parse(T) + minutes * 60_000);
const iso = (minutes: number) => at(minutes).toISOString();
const ok = { rank: 3, rvol: 12 };

describe('paidSearchDecision: entry, +5, +10, then stop; top 12 with RVOL of at least 3', () => {
  it('T1 entry: the first paid pass of the day is allowed', () => {
    expect(paidSearchDecision({ now: at(0), ...ok, priorPasses: [] })).toEqual({ allowed: true, pass: 1 });
  });

  it('T2 +5: the second waits until 5 minutes after the first, and says when it is due', () => {
    expect(paidSearchDecision({ now: at(4.99), ...ok, priorPasses: [iso(0)] })).toEqual({ allowed: false, reason: 'NOT_YET_DUE', dueAt: iso(5) });
    expect(paidSearchDecision({ now: at(5), ...ok, priorPasses: [iso(0)] })).toEqual({ allowed: true, pass: 2 });
  });

  it('T3 +10: the third waits until 10 minutes after the FIRST pass', () => {
    expect(paidSearchDecision({ now: at(9.99), ...ok, priorPasses: [iso(0), iso(6)] })).toEqual({ allowed: false, reason: 'NOT_YET_DUE', dueAt: iso(10) });
    expect(paidSearchDecision({ now: at(10), ...ok, priorPasses: [iso(0), iso(6)] })).toEqual({ allowed: true, pass: 3 });
  });

  it('T4 then stop: a fourth is refused at any later time that day', () => {
    expect(paidSearchDecision({ now: at(300), ...ok, priorPasses: [iso(0), iso(5), iso(10)] })).toEqual({ allowed: false, reason: 'DAILY_CAP_REACHED', dueAt: null });
  });

  it('T5 top 12 only: rank 12 allowed, rank 13 and off the board refused', () => {
    expect(paidSearchDecision({ now: at(0), rank: 12, rvol: 12, priorPasses: [] }).allowed).toBe(true);
    expect(paidSearchDecision({ now: at(0), rank: 13, rvol: 12, priorPasses: [] })).toEqual({ allowed: false, reason: 'NOT_TOP_12', dueAt: null });
    expect(paidSearchDecision({ now: at(0), rank: null, rvol: 12, priorPasses: [] })).toEqual({ allowed: false, reason: 'NOT_TOP_12', dueAt: null });
  });

  it('T6 RVOL 3x: exactly 3 allowed, below 3 refused, unknown refused', () => {
    expect(paidSearchDecision({ now: at(0), rank: 3, rvol: 3, priorPasses: [] }).allowed).toBe(true);
    expect(paidSearchDecision({ now: at(0), rank: 3, rvol: 2.99, priorPasses: [] })).toEqual({ allowed: false, reason: 'RVOL_BELOW_3', dueAt: null });
    expect(paidSearchDecision({ now: at(0), rank: 3, rvol: null, priorPasses: [] })).toEqual({ allowed: false, reason: 'RVOL_UNKNOWN', dueAt: null });
  });

  it('T7 the clock starts at the EARLIEST pass, whatever order the ledger returns them in', () => {
    expect(paidSearchDecision({ now: at(9), ...ok, priorPasses: [iso(6), iso(0)] })).toEqual({ allowed: false, reason: 'NOT_YET_DUE', dueAt: iso(10) });
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
const usage = (db: MarketDatabase, stage: string, minutes: number, jobId: number | null, ticker = 'ACME', tradingDate = DATE) =>
  recordModelUsage(db, { tradingDate, at: iso(minutes), jobId, ticker, model: 'm', stage: stage as never, trigger: null, calls: 1 });

describe('readPaidSearchPasses: the persisted count', () => {
  it('L1 one pass per job that billed a paid stage; interpretation is not one; a jobless row counts alone; other names and dates do not', () => {
    const db = temporaryDb();
    usage(db, 'RESOLVER', 0, 1);
    usage(db, 'DISCOVERY', 0.5, 1);
    usage(db, 'INTERPRETATION', 1, 2);
    usage(db, 'RECOVERY', 7, 3);
    usage(db, 'DISCOVERY', 12, null);
    usage(db, 'DISCOVERY', 3, 4, 'OTHER');
    usage(db, 'DISCOVERY', 3, 5, 'ACME', '2026-10-05');
    expect(readPaidSearchPasses(db, 'ACME', DATE).sort()).toEqual([iso(0), iso(7), iso(12)]);
  });

  it('L2 a restart continues the count: three passes in the ledger hold the cap for a fresh process', () => {
    const db = temporaryDb();
    usage(db, 'DISCOVERY', 0, 1);
    usage(db, 'RESOLVER', 5, 2);
    usage(db, 'DISCOVERY', 10, 3);
    expect(paidSearchDecision({ now: at(60), ...ok, priorPasses: readPaidSearchPasses(db, 'ACME', DATE) }).allowed).toBe(false);
  });
});

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

const refused: PaidSearchDecision = { allowed: false, reason: 'DAILY_CAP_REACHED', dueAt: null };
const allowed: PaidSearchDecision = { allowed: true, pass: 2 };

describe('collectCatalystEvidence under the budget', () => {
  it('C1 refused: no urgent resolver and no discovery, even on a first qualification by a material event; the report says why', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: null, lastDiscoveryMode: null });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();
    const report = await collect(db, discovery, resolver, { materialEvent: { kind: 'ENTERED_TOP_N', detail: 'rank 4' }, paidSearch: refused });
    expect([resolver.calls, discovery.calls]).toEqual([0, 0]);
    expect(report.discoveryDetail).toBe('paid search not allowed: DAILY_CAP_REACHED');
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

  it('C4 allowed: the pass runs 5 minutes after the last one, inside the old 10-minute interval; without a decision the interval still holds it back', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: at(-5).toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();
    await collect(db, discovery, resolver, { paidSearch: allowed });
    expect(discovery.calls).toBe(1);

    const db2 = temporaryDb();
    seedIssuer(db2, { lastDiscoveryAt: at(-5).toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const discovery2 = new CountingDiscovery();
    await collect(db2, discovery2, new CountingResolver());
    expect(discovery2.calls).toBe(0);
  });
});
