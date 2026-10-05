/**
 * The other four check-3 failures (BYSI 2050151, CMCT 1192951 / 1543270 / 1791070 / 1843822: 100, 1, 1, 1, 2 shares),
 * READ not expected: prints each rendered page's Table I row. Four requests through the declared SecClient, plus the
 * stored raw names for each filing's document name. Run:
 *   node --conditions=react-server --import tsx docs/research/float-contract/probe-check3-rest.ts
 */
import fs from 'node:fs';

import { loadWorkerEnv } from '../../../worker/env';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';

loadWorkerEnv('A:/mointel');
const sec = new SecClient({ config: readResearchConfig(process.env).sec });
const textOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
const dir = 'A:/mointel/docs/research/float-contract/validation-out-2026-10-05/names';

const wanted: Array<{ ticker: string; accession: string }> = [
  { ticker: 'BYSI', accession: '0000950170-24-141459' },
  { ticker: 'CMCT', accession: '0000908311-26-000073' },
  { ticker: 'CMCT', accession: '0000908311-26-000071' },
  { ticker: 'CMCT', accession: '0000908311-26-000072' },
];

async function main() {
  for (const w of wanted) {
    const record = JSON.parse(fs.readFileSync(`${dir}/${w.ticker}.json`, 'utf8')) as { cik: string; filings: Array<{ accession: string; primaryDocument: string }> };
    const meta = record.filings.find((f) => f.accession === w.accession);
    if (!meta) {
      console.log(w.ticker, w.accession, 'NOT IN RAW');
      continue;
    }
    const html = (await sec.get(`https://www.sec.gov/Archives/edgar/data/${record.cik}/${w.accession.replace(/-/g, '')}/${meta.primaryDocument}`)).body;
    const text = textOf(html);
    const at = text.search(/Table I - Non-Derivative/i);
    const row = text.slice(at).replace(/^.*?Nature of Indirect Beneficial Ownership \(Instr\. 4\)/, '').slice(0, 420);
    console.log(w.ticker, w.accession, '| reporting-person headers:', (text.match(/Name and Address of Reporting Person/gi) ?? []).length, '| ROW:', row.trim());
  }
}
void main();
