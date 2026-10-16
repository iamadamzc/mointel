import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';

import { computeFloatBound, type FloatJobDeps, type SubmissionsRecent } from '@/lib/research/floatJob';
import {
  ARCHIVE_DOCUMENT,
  archiveCacheMaxBytes,
  archiveCachePath,
  archiveCacheSize,
  archiveCached,
  archiveYear,
  legacyArchiveCachePath,
  pruneArchiveCache,
} from '@/lib/research/secArchiveCache';

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

/* ---------------------------------------------------------------- the bound */

/*
 * The bound (Integration 41st, L8 follow-up; Ops measured 67,205 documents / 206.4 MB after one full night): filing-year
 * shards, the first layout read and migrated, a prune at nightly start, and a write-stop cap that never deletes.
 */
const gz = (text: string) => zlib.gzipSync(Buffer.from(text, 'utf8'));
const put = (file: string, text: string, mtime?: Date) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, gz(text));
  if (mtime) fs.utimesSync(file, mtime, mtime);
};

describe('the archive cache bound', () => {
  it('reads the filing year from the accession; 90-99 are the 1990s; a URL with no accession has none', () => {
    expect(archiveYear(DOC)).toBe(2026);
    expect(archiveYear('https://www.sec.gov/Archives/edgar/data/555/000095012399000001/old.txt')).toBe(1999);
    expect(archiveYear('https://data.sec.gov/submissions/CIK0000000555.json')).toBeNull();
    expect(archiveCachePath('/c', DOC).split(path.sep)).toContain('2026');
    expect(legacyArchiveCachePath('/c', DOC).split(path.sep)).not.toContain('2026');
  });

  it('serves a first-layout file without a fetch and moves it into its year shard', async () => {
    const dir = tempDir();
    put(legacyArchiveCachePath(dir, DOC), 'kept from the first night');
    let calls = 0;
    const get = archiveCached(async () => {
      calls += 1;
      return 'fetched';
    }, dir);
    expect(await get(DOC)).toBe('kept from the first night');
    expect(calls).toBe(0);
    expect(fs.existsSync(archiveCachePath(dir, DOC))).toBe(true);
    expect(fs.existsSync(legacyArchiveCachePath(dir, DOC))).toBe(false);
    expect(await get(DOC)).toBe('kept from the first night');
    expect(calls).toBe(0);
  });

  it('prunes year shards older than this year minus 2 and first-layout files unread for 7 days; keeps the rest', () => {
    const dir = tempDir();
    const now = new Date('2026-10-16T08:00:00Z');
    const at = (yy: string, n: number) => `https://www.sec.gov/Archives/edgar/data/555/0001209191${yy}${String(n).padStart(6, '0')}/d.xml`;
    put(archiveCachePath(dir, at('23', 1)), 'old');
    put(archiveCachePath(dir, at('24', 1)), 'kept: 2024 is this year minus 2');
    put(archiveCachePath(dir, at('26', 1)), 'kept');
    put(legacyArchiveCachePath(dir, at('26', 2)), 'unread for 8 days', new Date('2026-10-08T08:00:00Z'));
    put(legacyArchiveCachePath(dir, at('26', 3)), 'read 1 day ago', new Date('2026-10-15T08:00:00Z'));
    const removed = pruneArchiveCache(dir, now);
    expect(removed.yearShards).toEqual(['2023']);
    expect(removed.legacyFiles).toBe(1);
    expect(removed.bytes).toBeGreaterThan(0);
    expect(fs.existsSync(archiveCachePath(dir, at('23', 1)))).toBe(false);
    expect(fs.existsSync(archiveCachePath(dir, at('24', 1)))).toBe(true);
    expect(fs.existsSync(archiveCachePath(dir, at('26', 1)))).toBe(true);
    expect(fs.existsSync(legacyArchiveCachePath(dir, at('26', 2)))).toBe(false);
    expect(fs.existsSync(legacyArchiveCachePath(dir, at('26', 3)))).toBe(true);
    expect(archiveCacheSize(dir).files).toBe(3);
    // A missing directory prunes nothing and does not throw.
    expect(pruneArchiveCache(path.join(dir, 'none'), now)).toEqual({ yearShards: [], legacyFiles: 0, bytes: 0 });
  });

  it('at its cap stops WRITING, says so once, deletes nothing, and still serves what it holds', async () => {
    const dir = tempDir();
    const full: number[] = [];
    let calls = 0;
    const get = archiveCached(
      async (url) => {
        calls += 1;
        return `text of ${url}`;
      },
      dir,
      { maxBytes: 1, startBytes: 0, onFull: (bytes) => full.push(bytes) },
    );
    const second = 'https://www.sec.gov/Archives/edgar/data/555/000120919126000002/b.xml';
    await get(DOC); // under the cap at the start: written
    await get(second); // now over: fetched, not written
    await get(second);
    await get(DOC); // still served from disk
    expect(calls).toBe(3);
    expect(fs.existsSync(archiveCachePath(dir, DOC))).toBe(true);
    expect(fs.existsSync(archiveCachePath(dir, second))).toBe(false);
    expect(full).toHaveLength(1);
  });

  it('reads the cap setting: default 2048 MB, "off" none, megabytes otherwise, a bad value the default', () => {
    expect(archiveCacheMaxBytes(undefined)).toBe(2048 * 1_048_576);
    expect(archiveCacheMaxBytes('off')).toBeNull();
    expect(archiveCacheMaxBytes('100')).toBe(100 * 1_048_576);
    expect(archiveCacheMaxBytes('lots')).toBe(2048 * 1_048_576);
    expect(archiveCacheMaxBytes('0')).toBe(2048 * 1_048_576);
  });
});
