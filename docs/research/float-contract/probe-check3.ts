/**
 * One-filing probe of the five check-3 failures (all holdings of 1 to 100 shares): does the audit's
 * "number near a D and Common" test look in the wrong place for a tiny number? One request through the
 * declared SecClient. Run: node --conditions=react-server --import tsx docs/research/float-contract/probe-check3.ts
 */
import { loadWorkerEnv } from '../../../worker/env';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';

loadWorkerEnv('A:/mointel');
const sec = new SecClient({ config: readResearchConfig(process.env).sec });
const textOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');

async function main() {
  const url = 'https://www.sec.gov/Archives/edgar/data/908311/000090831126000070/xslF345X05/wk-form4_1782145678.xml';
  const listing = await sec.getJson<{ filings: { recent: { accessionNumber: string[]; primaryDocument: string[] } } }>('https://data.sec.gov/submissions/CIK0000908311.json');
  const i = listing.data.filings.recent.accessionNumber.indexOf('0000908311-26-000070');
  const doc = listing.data.filings.recent.primaryDocument[i];
  const html = (await sec.get(`https://www.sec.gov/Archives/edgar/data/908311/000090831126000070/${doc}`)).body;
  const text = textOf(html);
  const first = text.indexOf('1');
  console.log('listed document:', doc, '(url sample not used:', url.length, 'chars)');
  console.log('first "1" at', first, 'in:', JSON.stringify(text.slice(Math.max(0, first - 40), first + 60)));
  const table = text.search(/Table I/i);
  console.log('Table I at', table, ':', JSON.stringify(text.slice(table, table + 700)));
}
void main();
