import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { buildEvidenceBundle } from '@/lib/research/interpret/bundle';
import { SecClient } from '@/lib/research/sec/client';
import { collectSecEvidence, TickerMapCache } from '@/lib/research/sec/collector';
import { submissionsUrl } from '@/lib/research/sec/submissions';
import { TICKER_MAP_URL } from '@/lib/research/sec/tickerMap';

/*
 * The SEC industry label, end to end: EDGAR's submissions `sicDescription`, collected by the SEC collector, stored on
 * issuer_registry, and read back into the research bundle (the model's input). Before the fix the collector passed it
 * (collector.ts) and upsertIssuer dropped it, so every bundle read null since schema v28.
 */

const CIK = '0000123456';
const directories: string[] = [];
const databases: MarketDatabase[] = [];

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
  for (const directory of directories.splice(0)) {
    try {
      fs.rmSync(directory, { recursive: true, force: true });
    } catch {
      /* Windows keeps the handle; the OS temp root is swept anyway. */
    }
  }
});

function temporaryDb(): MarketDatabase {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-sic-'));
  directories.push(directory);
  const db = openDatabase(path.join(directory, 'market.db'));
  databases.push(db);
  return db;
}

/** SEC as the collector sees it: the ticker map and one registrant's submissions, nothing else. */
function fakeSec(sicDescription: string | undefined): typeof fetch {
  const body: Record<string, unknown> = {
    [TICKER_MAP_URL]: { fields: ['cik', 'name', 'ticker', 'exchange'], data: [[123456, 'Acme Corp', 'ACME', 'Nasdaq']] },
    [submissionsUrl(CIK)]: {
      cik: CIK,
      name: 'Acme Corp',
      tickers: ['ACME'],
      exchanges: ['Nasdaq'],
      sicDescription,
      addresses: { business: { stateOrCountry: 'F4' } },
      filings: { recent: { accessionNumber: [], form: [], filingDate: [] } },
    },
  };
  return (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!(url in body)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(body[url]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

async function collect(db: MarketDatabase, sicDescription: string | undefined) {
  const client = new SecClient({
    config: { userAgent: 'mointel test test@example.com', maxRequestsPerSecond: 100, activePollSeconds: 60 },
    fetchImpl: fakeSec(sicDescription),
    sleep: async () => {},
  });
  return collectSecEvidence(db, client, new TickerMapCache(client), {
    ticker: 'ACME',
    expectedName: 'Acme Corp',
    includeCompanyFacts: false,
  });
}

const stored = (db: MarketDatabase) =>
  (db.prepare('SELECT sic_description AS sic FROM issuer_registry WHERE ticker = ?').get('ACME') as { sic: string | null } | undefined)?.sic;

describe('the SEC industry label reaches the research bundle', () => {
  it('a collected sicDescription is stored on issuer_registry and read into the bundle', async () => {
    const db = temporaryDb();
    const report = await collect(db, 'Pharmaceutical Preparations');
    // Control: the collector resolved the registrant and parsed the label, so a null below would be the store's fault.
    expect(report.profile?.sicDescription).toBe('Pharmaceutical Preparations');
    expect(stored(db)).toBe('Pharmaceutical Preparations');
    expect(buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: '2026-10-09' }).sicDescription).toBe(
      'Pharmaceutical Preparations',
    );
  });

  it('a submissions document without a label stores none and the bundle reads null', async () => {
    const db = temporaryDb();
    await collect(db, undefined);
    expect(stored(db)).toBeNull();
    expect(buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: '2026-10-09' }).sicDescription).toBeNull();
  });
});
