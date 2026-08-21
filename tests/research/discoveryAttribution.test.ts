import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  INTERVAL_RECHECK,
  RECOVERY_TRIGGER,
  upsertIssuer,
} from '@/lib/market/store/researchRepo';
import { SecClient } from '@/lib/research/sec/client';
import {
  collectCatalystEvidence,
  RESOLVER_VERSION,
  usagePurposeFor,
  type CatalystCollectionInput,
} from '@/lib/research/catalyst/collector';
import { EMPTY_COMPANY_SOURCES } from '@/lib/research/types';
import type {
  CompanySourceCandidate,
  CompanySourceResolverProvider,
} from '@/lib/research/catalyst/companySourceContract';
import type {
  CatalystSourceDiscoveryProvider,
  DiscoveryResult,
} from '@/lib/research/catalyst/discovery';
import type { CatalystConfig, SecConfig } from '@/lib/research/config';

/**
 * Every paid call says why it was made.
 *
 * On 20 August, 42 of 81 discovery calls carried no trigger at all and took
 * 2,131,819 input tokens with them — more than the 39 calls that were attributed.
 * The reason was structural rather than accidental: the purpose was derived from
 * the material event, so the one branch that has no material event by definition
 * — the elapsed-interval re-look — recorded nothing.
 *
 * These tests drive the collector down each branch that can spend money and
 * assert the ledger row, because the report saying INTERVAL and the ledger
 * saying nothing was exactly the state that hid this.
 */

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

const NOW = new Date('2026-08-20T13:00:00.000Z');
const DATE = '2026-08-20';
/** Comfortably past webDiscoveryUnresolvedMinutes, so the interval has elapsed. */
const AN_HOUR_AGO = new Date(NOW.getTime() - 60 * 60_000).toISOString();

const temporaryFiles: string[] = [];

function temporaryDb(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-attrib-')), 'market.db');
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

class CountingDiscovery implements CatalystSourceDiscoveryProvider {
  readonly name = 'counting';
  available = true;
  calls = 0;

  async discover(): Promise<DiscoveryResult> {
    this.calls += 1;
    return {
      sources: [],
      ran: true,
      modelCalls: 1,
      detail: 'ran',
      toolConfig: 'web_search:default;domains:v1',
    };
  }
}

class CountingResolver implements CompanySourceResolverProvider {
  readonly name = 'test-resolver';
  available = true;
  calls = 0;

  constructor(private readonly candidates: CompanySourceCandidate[] = []) {}

  async resolve() {
    this.calls += 1;
    return {
      candidates: this.candidates,
      modelCalls: 1,
      detail: 'test resolver',
      toolConfig: 'web_search:low;domains:v1',
    };
  }
}

/** No network: every SEC route 404s, so only the discovery gate is exercised. */
function fakeSecClient(): SecClient {
  return new SecClient({
    config: SEC_CONFIG,
    sleep: async () => undefined,
    fetchImpl: async () => new Response('missing', { status: 404 }),
  });
}

interface UsageRow {
  stage: string;
  trigger: string | null;
  ticker: string;
  tool_config: string | null;
}

function usageRows(db: MarketDatabase): UsageRow[] {
  return db
    .prepare('SELECT stage, trigger, ticker, tool_config FROM model_usage ORDER BY id')
    .all() as UsageRow[];
}

/**
 * An issuer that has been looked at before and has no durable source.
 *
 * `lastDiscoveryMode` decides which of the two paid tiers takes the next turn,
 * and both of them were unattributed in production, so both are driven here.
 */
function seedIssuer(
  db: MarketDatabase,
  overrides: { lastDiscoveryAt: string | null; lastDiscoveryMode: 'RESOLVER' | 'DISCOVERY' | null },
) {
  upsertIssuer(db, {
    ticker: 'ACME',
    companyName: 'Acme Inc.',
    cik: null,
    exchange: null,
    country: null,
    foreignIssuer: null,
    cikConfidence: 'NONE',
    mappingSource: null,
    irUrl: null,
    lastVerifiedAt: null,
    companySources: {
      ...EMPTY_COMPANY_SOURCES,
      // Current version, so nothing here is eligible for resolver recovery.
      resolverVersion: RESOLVER_VERSION,
      ...overrides,
    },
  } as never);
}

function collect(
  db: MarketDatabase,
  discovery: CountingDiscovery,
  resolver: CountingResolver,
  input: Partial<CatalystCollectionInput> = {},
) {
  return collectCatalystEvidence(
    db,
    fakeSecClient(),
    discovery,
    resolver,
    { sec: SEC_CONFIG, catalyst: CATALYST_CONFIG },
    { ticker: 'ACME', now: NOW, tradingDate: DATE, jobId: null, ...input },
  );
}

describe('the purpose recorded against a paid call', () => {
  it('names an elapsed-interval discovery pass', async () => {
    const db = temporaryDb();
    // The resolver already had its turn, so this pass belongs to discovery.
    seedIssuer(db, { lastDiscoveryAt: AN_HOUR_AGO, lastDiscoveryMode: 'RESOLVER' });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();

    const report = await collect(db, discovery, resolver);

    expect(discovery.calls).toBe(1);
    expect(report.discoveryTrigger).toBe('INTERVAL');

    const rows = usageRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].stage).toBe('DISCOVERY');
    expect(rows[0].trigger).toBe(INTERVAL_RECHECK);
  });

  it('names an elapsed-interval resolver pass', async () => {
    const db = temporaryDb();
    // Discovery had the last turn, so resolution takes this one.
    seedIssuer(db, { lastDiscoveryAt: AN_HOUR_AGO, lastDiscoveryMode: 'DISCOVERY' });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();

    const report = await collect(db, discovery, resolver);

    expect(resolver.calls).toBe(1);
    expect(report.discoveryMode).toBe('RESOLVER');

    const rows = usageRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].stage).toBe('RESOLVER');
    expect(rows[0].trigger).toBe(INTERVAL_RECHECK);
  });

  it('names a first check as a first check, not an interval', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: null, lastDiscoveryMode: null });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();

    const report = await collect(db, discovery, resolver);

    expect(report.discoveryTrigger).toBe('FIRST_CHECK');
    const rows = usageRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].trigger).toBe('FIRST_CHECK');
  });

  it('records a material event under its own kind', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: AN_HOUR_AGO, lastDiscoveryMode: 'RESOLVER' });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();

    const report = await collect(db, discovery, resolver, {
      materialEvent: { kind: 'ENTERED_TOP_N', detail: 'rank 4' },
    });

    expect(report.discoveryTrigger).toBe('MATERIAL_EVENT');
    // The event's own kind, because that is the vocabulary the queue writes on
    // the job and the diagnostics already group by.
    expect(usageRows(db)[0].trigger).toBe('ENTERED_TOP_N');
  });

  it('records a forced pass distinctly from an interval one', async () => {
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: NOW.toISOString(), lastDiscoveryMode: 'RESOLVER' });
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();

    // Interval has NOT elapsed; only forceDiscovery gets past the gate.
    const report = await collect(db, discovery, resolver, { forceDiscovery: true });

    expect(report.discoveryTrigger).toBe('FORCED');
    expect(usageRows(db)[0].trigger).toBe('FORCED_DISCOVERY');
    expect(usageRows(db)[0].trigger).not.toBe(INTERVAL_RECHECK);
  });

  it('records a recovery episode under the recovery trigger', async () => {
    const db = temporaryDb();
    upsertIssuer(db, {
      ticker: 'ACME',
      companyName: 'Acme Inc.',
      cik: null,
      exchange: null,
      country: null,
      foreignIssuer: null,
      cikConfidence: 'NONE',
      mappingSource: null,
      irUrl: null,
      lastVerifiedAt: null,
      companySources: {
        ...EMPTY_COMPANY_SOURCES,
        lastDiscoveryAt: AN_HOUR_AGO,
        // Stranded at an older version: the one thing recovery exists for.
        resolverVersion: RESOLVER_VERSION - 1,
      },
    } as never);
    const discovery = new CountingDiscovery();
    const resolver = new CountingResolver();

    const report = await collect(db, discovery, resolver, { recoveryEpisode: true });

    /*
     * Two rows, and they are allowed to differ.
     *
     * Recovery resolution found nothing, so the episode spends its second
     * permitted call on general discovery — and that call is an interval
     * re-look, not part of the recovery claim. Recording both under
     * RESOLVER_RECOVERY would overstate what recovery costs.
     */
    const rows = usageRows(db);
    expect(rows.map((row) => [row.stage, row.trigger])).toEqual([
      ['RECOVERY', RECOVERY_TRIGGER],
      ['DISCOVERY', INTERVAL_RECHECK],
    ]);
    expect(report.discoveryMode).toBe('DISCOVERY');
  });

  it('leaves no paid call unattributed across every branch that can spend', async () => {
    /*
     * The invariant, stated once. Individual branches are asserted above; this
     * asks the question the ledger asks — is there any row here that cannot say
     * why it exists — because that is the only form the defect can take again.
     */
    const cases: Array<Partial<CatalystCollectionInput>> = [
      {},
      { materialEvent: { kind: 'ENTERED_TOP_N', detail: 'rank 4' } },
      { materialEvent: { kind: 'HALT', detail: 'LUDP' } },
      { forceDiscovery: true },
    ];
    const modes: Array<'RESOLVER' | 'DISCOVERY'> = ['RESOLVER', 'DISCOVERY'];

    for (const mode of modes) {
      for (const extra of cases) {
        const db = temporaryDb();
        seedIssuer(db, { lastDiscoveryAt: AN_HOUR_AGO, lastDiscoveryMode: mode });
        await collect(db, new CountingDiscovery(), new CountingResolver(), extra);

        const rows = usageRows(db);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(row.trigger, `${mode} / ${JSON.stringify(extra)}`).not.toBeNull();
          expect(row.trigger).not.toBe('');
        }
      }
    }
  });

  it('records how the search was configured alongside what it cost', async () => {
    /*
     * The other half of attribution. Knowing a call cost 44,591 tokens is not
     * useful next week unless the row also says what the search was told to
     * retrieve — otherwise a configuration change and a coverage change look
     * identical in the ledger.
     */
    const db = temporaryDb();
    seedIssuer(db, { lastDiscoveryAt: AN_HOUR_AGO, lastDiscoveryMode: 'DISCOVERY' });
    await collect(db, new CountingDiscovery(), new CountingResolver());

    const [row] = usageRows(db);
    expect(row.stage).toBe('RESOLVER');
    expect(row.tool_config).toBe('web_search:low;domains:v1');
  });

  it('maps every trigger to a purpose, with no silent fallthrough', () => {
    // A new DiscoveryTrigger member fails typecheck at usagePurposeFor rather
    // than quietly returning undefined into the ledger.
    expect(usagePurposeFor('INTERVAL', null)).toBe(INTERVAL_RECHECK);
    expect(usagePurposeFor('FIRST_CHECK', null)).toBe('FIRST_CHECK');
    expect(usagePurposeFor('FORCED', null)).toBe('FORCED_DISCOVERY');
    expect(usagePurposeFor('MATERIAL_EVENT', { kind: 'RESUME', detail: '' })).toBe('RESUME');
    // A material trigger with no event still names itself rather than nothing.
    expect(usagePurposeFor('MATERIAL_EVENT', null)).toBe('MATERIAL_EVENT');
  });
});
