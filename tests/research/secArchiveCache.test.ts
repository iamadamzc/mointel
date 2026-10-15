import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { computeFloatBound, type FloatJobDeps, type SubmissionsRecent } from '@/lib/research/floatJob';
import { ARCHIVE_DOCUMENT, archiveCachePath, archiveCacheSize, archiveCached } from '@/lib/research/secArchiveCache';

/*
 * L8 defect fix (Integration 41st): EDGAR archive documents are immutable by accession, so a repeat night reads them from
 * disk. Required test: a name's SECOND run makes only the 2 mutable requests (companyfacts, submissions) and gives an
 * identical row.
 */

const dirs: string[] = [];
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-archive-cache-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const DOC = 'https://www.sec.gov/Archives/edgar/data/555/000120919126000001/form4.xml';

describe('archiveCached', () => {
  it('fetches an archive document once, then serves the same text from disk', async () => {
    const calls: string[] = [];
    const get = archiveCached(async (url) => {
      calls.push(url);
      return 'the document';
    }, tempDir());
    expect(await get(DOC)).toBe('the document');
    expect(await get(DOC)).toBe('the document');
    expect(calls).toEqual([DOC]);
  });

  it('never caches a mutable URL (companyfacts, submissions) or a failure; null dir is today\'s path', async () => {
    const dir = tempDir();
    const calls: string[] = [];
    const listing = 'https://data.sec.gov/submissions/CIK0000000555.json';
    const get = archiveCached(async (url) => {
      calls.push(url);
      if (url.endsWith('missing.xml')) throw new Error('404');
      return 'text';
    }, dir);
    await get(listing);
    await get(listing);
    const missing = 'https://www.sec.gov/Archives/edgar/data/555/000120919126000009/missing.xml';
    await expect(get(missing)).rejects.toThrow('404');
    await expect(get(missing)).rejects.toThrow('404');
    expect(calls).toEqual([listing, listing, missing, missing]);
    expect(ARCHIVE_DOCUMENT.test(listing)).toBe(false);
    expect(ARCHIVE_DOCUMENT.test(DOC)).toBe(true);
    const passthrough = archiveCached(async () => 'x', null);
    await passthrough(DOC);
    expect(fs.existsSync(archiveCachePath(dir, DOC))).toBe(false);
  });

  it('reports its size (Ops: it cannot grow unseen); a missing directory reads as empty', async () => {
    const dir = tempDir();
    expect(archiveCacheSize(path.join(dir, 'none'))).toEqual({ files: 0, bytes: 0 });
    const get = archiveCached(async () => 'the document', dir);
    await get(DOC);
    await get('https://www.sec.gov/Archives/edgar/data/555/000120919126000002/b.xml');
    const size = archiveCacheSize(dir);
    expect(size.files).toBe(2);
    expect(size.bytes).toBeGreaterThan(0);
  });

  it('a corrupt cache file is refetched, never trusted, and the fetch still succeeds', async () => {
    const dir = tempDir();
    const file = archiveCachePath(dir, DOC);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'not gzip');
    let calls = 0;
    const get = archiveCached(async () => {
      calls += 1;
      return 'fresh';
    }, dir);
    expect(await get(DOC)).toBe('fresh');
    expect(calls).toBe(1);
    expect(await get(DOC)).toBe('fresh');
    expect(calls).toBe(1);
  });
});

/* ---------------------------------------------------- a name's second night */

const AS_OF = '2026-09-28';
const COUNT_END = '2026-08-01';
const owner = (cik: string) => `<reportingOwner><reportingOwnerId><rptOwnerCik>${cik}</rptOwnerCik><rptOwnerName>OWNER ${cik}</rptOwnerName></reportingOwnerId></reportingOwner>`;
const form4 = (cik: string, date: string, after: number) =>
  `<ownershipDocument><periodOfReport>${date}</periodOfReport>${owner(cik)}` +
  `<nonDerivativeTransaction><securityTitle><value>Common Stock</value></securityTitle><transactionDate><value>${date}</value></transactionDate>` +
  `<postTransactionAmounts><sharesOwnedFollowingTransaction><value>${after}</value></sharesOwnedFollowingTransaction></postTransactionAmounts>` +
  `<ownershipNature><directOrIndirectOwnership><value>D</value></directOrIndirectOwnership></ownershipNature></nonDerivativeTransaction></ownershipDocument>`;

// Real-shaped accessions (18 digits once the dashes go), as EDGAR writes them.
const filed = [
  { accession: '0001209191-26-000001', form: '4', filingDate: '2026-07-15', doc: 'xslF345X05/a.xml', text: form4('111', '2026-07-14', 1_000_000) },
  { accession: '0001209191-26-000002', form: '4', filingDate: '2026-09-02', doc: 'b.xml', text: form4('111', '2026-08-30', 400_000) },
  { accession: '0001209191-26-000003', form: '4', filingDate: '2026-08-03', doc: 'c.xml', text: form4('555', COUNT_END, 300_000) },
  // A later filing read for a stated share count (statedCount.ts): an 8-K that states none.
  { accession: '0000555000-26-000004', form: '8-K', filingDate: '2026-09-10', doc: 'k.htm', text: '<html><body>Item 8.01 Other Events.</body></html>' },
];
const submissions: SubmissionsRecent = {
  filings: { recent: { accessionNumber: filed.map((f) => f.accession), form: filed.map((f) => f.form), filingDate: filed.map((f) => f.filingDate), primaryDocument: filed.map((f) => f.doc) } },
};
const companyFacts = {
  facts: { dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: COUNT_END, val: 10_000_000, filed: '2026-08-10', accn: '0000555000-26-000099', form: '10-Q' }] } } } },
};

function secFake(requests: string[]): Pick<FloatJobDeps, 'getJson' | 'getText'> {
  return {
    getJson: async <T,>(url: string) => {
      requests.push(url);
      if (url.includes('/companyfacts/')) return companyFacts as T;
      if (url.includes('/submissions/')) return submissions as T;
      throw new Error(`unexpected ${url}`);
    },
    getText: async (url: string) => {
      requests.push(url);
      const hit = filed.find((f) => url === `https://www.sec.gov/Archives/edgar/data/555/${f.accession.replace(/-/g, '')}/${f.doc.replace(/^xsl[^/]*\//, '')}`);
      if (!hit) throw new Error(`unexpected ${url}`);
      return hit.text;
    },
  };
}

const night = (requests: string[], dir: string | null): FloatJobDeps => {
  const sec = secFake(requests);
  return {
    getJson: sec.getJson,
    getText: archiveCached(sec.getText, dir),
    spanBars: (_symbol, from, to) => [{ date: from, close: 10, factor: 1 }, { date: to, close: 10, factor: 1 }],
    announcedSplits: async () => [],
    announcedActions: async () => [],
    now: () => '2026-09-28T23:00:00.000Z',
  };
};

describe('a name computed on a second night', () => {
  it('makes only the 2 mutable SEC requests and gives the identical row', async () => {
    const dir = tempDir();
    const input = { symbol: 'ACME', cik: '0000555', asOfDate: AS_OF, dossier: { analysisVersionId: 42, ledger: [] } };
    const first: string[] = [];
    const row1 = await computeFloatBound(input, night(first, dir));
    const second: string[] = [];
    const row2 = await computeFloatBound(input, night(second, dir));
    // Night 1 fetched the archive documents (three Form 4s and the 8-K); night 2 only companyfacts and submissions.
    expect(first.filter((u) => ARCHIVE_DOCUMENT.test(u))).toHaveLength(4);
    expect(second).toEqual(['https://data.sec.gov/api/xbrl/companyfacts/CIK0000000555.json', 'https://data.sec.gov/submissions/CIK0000000555.json']);
    expect(row2).toEqual(row1);
    expect(row1.cell).toMatchObject({ state: 'PRODUCED', bound: 9_300_000 });
    // Control: with no cache, night 2 fetches every document again.
    const uncached: string[] = [];
    await computeFloatBound(input, night(uncached, null));
    expect(uncached).toHaveLength(first.length);
  });
});
