/**
 * Check 5 is PARTIAL (stored bars decide; the filing text is only searched for the word "split"). Seven audited holdings
 * (GCTK x3, KITT x4) passed on the bars while their rendered filing mentions a split. READ the context. Seven requests
 * through the declared SecClient. Run: node --conditions=react-server --import tsx docs/research/float-contract/probe-split-mentions.ts
 */
import fs from 'node:fs';

import { loadWorkerEnv } from '../../../worker/env';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';

loadWorkerEnv('A:/mointel');
const sec = new SecClient({ config: readResearchConfig(process.env).sec });
const textOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
const dir = 'A:/mointel/docs/research/float-contract/validation-out-fresh-2026-10-05/names';

interface Record {
  cik: string;
  count: { asOf: string };
  tradingDate: string;
  filings: Array<{ accession: string; primaryDocument: string }>;
  audit: Array<{ ownerCik: string; shares: number; asOf: string; rows: Array<{ accession: string }>; checks: Record<string, { note: string }> }>;
}

async function main() {
  for (const ticker of ['GCTK', 'KITT']) {
    const r = JSON.parse(fs.readFileSync(`${dir}/${ticker}.json`, 'utf8')) as Record;
    console.log(`${ticker}: count as-of ${r.count.asOf}, checkpoint ${r.tradingDate}`);
    for (const a of r.audit) {
      if (!/mentions "split": true/.test(a.checks['5_basis']!.note)) continue;
      const accession = a.rows[0]!.accession;
      const meta = r.filings.find((f) => f.accession === accession)!;
      const html = (await sec.get(`https://www.sec.gov/Archives/edgar/data/${r.cik}/${accession.replace(/-/g, '')}/${meta.primaryDocument}`)).body;
      const text = textOf(html);
      const at = text.search(/split/i);
      console.log(`  owner ${a.ownerCik} ${a.shares} sh as-of ${a.asOf} ${accession}: ...${text.slice(Math.max(0, at - 160), at + 200)}...`);
    }
  }
}
void main();
