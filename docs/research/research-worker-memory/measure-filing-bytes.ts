// Research worker memory, step 2 continued: the FILING documents. For 2 tickers, every SEC_FILING and SEC_EXHIBIT
// URL the desk stored as a source (local copy data/market-prod-2026-09-29.db, read-only) is fetched through the
// desk's own SecClient and its raw body measured as SecClient would cache it (1 byte per char if all Latin-1, else 2).
// Note: these are the sources across the ticker's whole research history, which may be more than one process fetched.
// Run: node --env-file=.env.local --import tsx docs/research/research-worker-memory/measure-filing-bytes.ts
import Database from 'better-sqlite3';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';

const TICKERS = ['SDEV', 'ILLR'];
const v8Bytes = (s: string) => (/[^\u0000-\u00ff]/.test(s) ? 2 : 1) * s.length;
const mb = (n: number) => (n / 1e6).toFixed(2);

async function main() {
  const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
  const client = new SecClient({ config: readResearchConfig().sec });
  for (const ticker of TICKERS) {
    const urls = (db
      .prepare("SELECT DISTINCT url, source_type FROM research_sources WHERE ticker = ? AND source_type IN ('SEC_FILING', 'SEC_EXHIBIT')")
      .all(ticker) as Array<{ url: string; source_type: string }>);
    let total = 0;
    let largest = { url: '', bytes: 0 };
    let failed = 0;
    for (const { url } of urls) {
      try {
        const bytes = v8Bytes((await client.get(url)).body);
        total += bytes;
        if (bytes > largest.bytes) largest = { url, bytes };
      } catch {
        failed += 1;
      }
    }
    console.log(`${ticker}: ${urls.length} documents, ${failed} failed, total ${mb(total)} MB, largest ${mb(largest.bytes)} MB (${largest.url.slice(-60)})`);
  }
  db.close();
}

void main();
