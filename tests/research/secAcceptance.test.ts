import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { easternToUtc, filingAcceptance, filingHeaderUrl, parseAcceptance } from '@/lib/research/sec/acceptance';
import { SecClient } from '@/lib/research/sec/client';
import { collectSecEvidence, TickerMapCache } from '@/lib/research/sec/collector';
import { submissionsUrl } from '@/lib/research/sec/submissions';
import { TICKER_MAP_URL } from '@/lib/research/sec/tickerMap';

/*
 * A filing's acceptance time comes from the filing's own index header, never the submissions JSON (Integration 42nd,
 * 2026-10-16; docs/research/sec-acceptance/ on f4fa9c89: the JSON was off by 4-5 h for 858 of 10,446 stored rows).
 * The live cases below were read from EDGAR by Research and by Integration in the browser.
 */

describe('easternToUtc: the header is Eastern, converted by the US daylight rule', () => {
  it('reads the live EDT cases: XLAB 8-K 0001829126-26-011139 and Form 4 0001829126-26-010804', () => {
    expect(easternToUtc('20261014201755')).toBe('2026-10-15T00:17:55.000Z');
    expect(easternToUtc('20261006151916')).toBe('2026-10-06T19:19:16.000Z');
  });

  it('reads a winter (EST) filing at UTC-5: 0001493152-25-006531, 06:36:16 ET on 2025-02-14', () => {
    expect(easternToUtc('20250214063616')).toBe('2025-02-14T11:36:16.000Z');
  });

  it('switches on the second Sunday of March and the first Sunday of November at 02:00, in both years', () => {
    // 2026: Sunday 8 March and Sunday 1 November (each month starts on a Sunday).
    expect(easternToUtc('20260308015959')).toBe('2026-03-08T06:59:59.000Z');
    expect(easternToUtc('20260308030000')).toBe('2026-03-08T07:00:00.000Z');
    expect(easternToUtc('20261101005959')).toBe('2026-11-01T04:59:59.000Z');
    expect(easternToUtc('20261101013000')).toBe('2026-11-01T05:30:00.000Z'); // the repeated hour, read as EDT
    expect(easternToUtc('20261101020000')).toBe('2026-11-01T07:00:00.000Z');
    // 2025: Sunday 9 March and Sunday 2 November (neither month starts on a Sunday).
    expect(easternToUtc('20250308120000')).toBe('2025-03-08T17:00:00.000Z');
    expect(easternToUtc('20250309120000')).toBe('2025-03-09T16:00:00.000Z');
    expect(easternToUtc('20251101120000')).toBe('2025-11-01T16:00:00.000Z');
    expect(easternToUtc('20251102120000')).toBe('2025-11-02T17:00:00.000Z');
  });

  it('refuses anything that is not a 14-digit stamp', () => {
    for (const bad of ['', '2026101420175', '2026-10-14 20:17:55', '20261314201755', '20261014251755']) expect(easternToUtc(bad)).toBeNull();
  });
});

describe('parseAcceptance and filingAcceptance', () => {
  it('reads ACCEPTANCE-DATETIME from the header page as EDGAR serves it, escaped or not', () => {
    expect(parseAcceptance('<pre>&lt;ACCEPTANCE-DATETIME&gt;20261014201755\nFILED AS OF DATE: 20261015</pre>')).toBe('2026-10-15T00:17:55.000Z');
    expect(parseAcceptance('<ACCEPTANCE-DATETIME>20261006151916')).toBe('2026-10-06T19:19:16.000Z');
    expect(parseAcceptance('no header here')).toBeNull();
  });

  it('builds the header URL from the CIK and accession, and returns null when the read fails', async () => {
    expect(filingHeaderUrl('0002109869', '0001829126-26-011139')).toBe(
      'https://www.sec.gov/Archives/edgar/data/2109869/000182912626011139/0001829126-26-011139-index-headers.html',
    );
    const failing = { get: async () => { throw new Error('HTTP 503'); } };
    expect(await filingAcceptance(failing as never, '2109869', '0001829126-26-011139')).toBeNull();
  });
});

/* ---------------------------------------------------- the collector, end to end */

const CIK = '0002109869';
const ACCESSION = '0001829126-26-011139';
const DOC = `https://www.sec.gov/Archives/edgar/data/2109869/000182912626011139/exascalelabs_8k.htm`;
const HEADER = filingHeaderUrl(CIK, ACCESSION);
const dirs: string[] = [];
const dbs: MarketDatabase[] = [];
afterEach(() => {
  for (const db of dbs.splice(0)) db.close();
  for (const d of dirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* Windows */ }
  }
});
function temporaryDb(): MarketDatabase {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-acceptance-'));
  dirs.push(d);
  const db = openDatabase(path.join(d, 'market.db'));
  dbs.push(db);
  return db;
}

/** EDGAR as the collector sees it: the JSON's acceptance is XLAB's wrong one (+4 h); the header carries the truth. */
function fakeSec(requests: string[], headerOk: boolean): typeof fetch {
  const json: Record<string, unknown> = {
    [TICKER_MAP_URL]: { fields: ['cik', 'name', 'ticker', 'exchange'], data: [[2109869, 'Exascale Labs Holdings Inc.', 'XLAB', 'Nasdaq']] },
    [submissionsUrl(CIK)]: {
      cik: CIK, name: 'Exascale Labs Holdings Inc.', tickers: ['XLAB'], exchanges: ['Nasdaq'],
      filings: { recent: {
        accessionNumber: [ACCESSION], form: ['8-K'], filingDate: ['2026-10-15'], acceptanceDateTime: ['2026-10-15T04:17:55.000Z'],
        reportDate: ['2026-10-09'], primaryDocument: ['exascalelabs_8k.htm'], primaryDocDescription: ['8-K'], items: ['1.01,9.01'],
      } },
    },
  };
  return (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    requests.push(url);
    if (url in json) return new Response(JSON.stringify(json[url]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url === DOC) return new Response('<html><body>Item 1.01 Entry into a Material Definitive Agreement with Sunon.</body></html>', { status: 200 });
    if (url === HEADER && headerOk) return new Response('<pre>&lt;ACCEPTANCE-DATETIME&gt;20261014201755\nFILED AS OF DATE:\t\t20261015</pre>', { status: 200 });
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

async function collect(db: MarketDatabase, requests: string[], headerOk = true) {
  const client = new SecClient({
    config: { userAgent: 'mointel test test@example.com', maxRequestsPerSecond: 100, activePollSeconds: 60 },
    fetchImpl: fakeSec(requests, headerOk),
    sleep: async () => {},
  });
  return collectSecEvidence(db, client, new TickerMapCache(client), {
    ticker: 'XLAB', expectedName: 'Exascale Labs Holdings Inc.', includeCompanyFacts: false, asOf: new Date('2026-10-16T12:00:00Z'),
  });
}
const rows = (db: MarketDatabase) =>
  db.prepare("SELECT source_type AS type, published_at AS at, published_precision AS precision FROM research_sources WHERE ticker = 'XLAB' ORDER BY source_type").all() as Array<{ type: string; at: string; precision: string }>;

describe('the SEC collector stores the header instant, never the JSON one', () => {
  it("XLAB's 8-K: the JSON says 04:17:55Z, the header 20:17:55 ET; the filing and the submissions row store 00:17:55Z EXACT", async () => {
    const db = temporaryDb();
    const requests: string[] = [];
    await collect(db, requests);
    expect(rows(db)).toEqual([
      { type: 'SEC_FILING', at: '2026-10-15T00:17:55.000Z', precision: 'EXACT' },
      { type: 'SEC_SUBMISSIONS', at: '2026-10-15T00:17:55.000Z', precision: 'EXACT' },
    ]);
    expect(requests.filter((u) => u === HEADER).length).toBeGreaterThanOrEqual(1);
  });

  it('a failed header read stores the filing DATE with UNKNOWN precision, never the JSON instant', async () => {
    const db = temporaryDb();
    await collect(db, [], false);
    expect(rows(db)).toEqual([
      { type: 'SEC_FILING', at: '2026-10-15', precision: 'UNKNOWN' },
      { type: 'SEC_SUBMISSIONS', at: '2026-10-15', precision: 'UNKNOWN' },
    ]);
  });

  it('a second collection reads no header for an accession already stored (its insert is ignored) and keeps the row', async () => {
    const db = temporaryDb();
    await collect(db, []);
    const second: string[] = [];
    await collect(db, second);
    expect(second).not.toContain(HEADER);
    expect(rows(db)[0]).toEqual({ type: 'SEC_FILING', at: '2026-10-15T00:17:55.000Z', precision: 'EXACT' });
  });
});
