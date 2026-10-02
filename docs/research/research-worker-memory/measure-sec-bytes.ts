// Research worker memory, step 2 of "THE MEASUREMENT THAT DECIDES" (docs/research/research-worker-memory-2026-10-02.md).
// What ONE ticker's two large SEC JSON bodies weigh when SecClient caches them: the submissions JSON and the
// companyfacts JSON, for 8 tickers researched on 2026-09-29 (local copy research_jobs). Filing documents
// (up to 17 per ticker) are NOT fetched here, so the per-ticker figure is a LOWER BOUND.
// V8 keeps a string at 1 byte per char if every char is Latin-1, else 2 bytes per char; both are reported.
// Uses the desk's own SecClient (its rate limiter and declared User-Agent). Read-only: no database, no writes.
// Run: node --env-file=.env.local --import tsx docs/research/research-worker-memory/measure-sec-bytes.ts
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';
import { companyFactsUrl } from '../../../lib/research/sec/companyFacts';
import { submissionsUrl } from '../../../lib/research/sec/submissions';

const TICKERS = ['CYAB', 'ILLR', 'BGIN', 'KMRK', 'EGG', 'SDEV', 'TEAD', 'NAUT'];
const TICKER_FILE = 'https://www.sec.gov/files/company_tickers_exchange.json';

const v8Bytes = (s: string) => (/[^\u0000-ÿ]/.test(s) ? 2 : 1) * s.length;
const mb = (n: number) => (n / 1e6).toFixed(2);

async function main() {
  const client = new SecClient({ config: readResearchConfig().sec });
  const map = await client.get(TICKER_FILE);
  console.log(`ticker file: ${mb(v8Bytes(map.body))} MB in V8 (once per process)`);
  const parsed = JSON.parse(map.body) as { fields: string[]; data: unknown[][] };
  const iT = parsed.fields.indexOf('ticker');
  const iC = parsed.fields.indexOf('cik');
  const cikOf = new Map(parsed.data.map((row) => [String(row[iT]), String(row[iC]).padStart(10, '0')]));
  let total = 0;
  let measured = 0;
  for (const ticker of TICKERS) {
    const cik = cikOf.get(ticker);
    if (!cik) {
      console.log(`${ticker}: no CIK in the ticker file`);
      continue;
    }
    let sub = 0;
    let facts = 0;
    try {
      sub = v8Bytes((await client.get(submissionsUrl(cik))).body);
    } catch (e) {
      console.log(`${ticker}: submissions failed ${String(e).slice(0, 80)}`);
    }
    try {
      facts = v8Bytes((await client.get(companyFactsUrl(cik))).body);
    } catch (e) {
      console.log(`${ticker}: companyfacts failed ${String(e).slice(0, 80)}`);
    }
    console.log(`${ticker} cik ${cik}: submissions ${mb(sub)} MB, companyfacts ${mb(facts)} MB, sum ${mb(sub + facts)} MB`);
    total += sub + facts;
    measured += 1;
  }
  console.log(`MEAN over ${measured} tickers: ${mb(total / Math.max(measured, 1))} MB per ticker (submissions + companyfacts only; a lower bound)`);
}

void main();
