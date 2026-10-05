/**
 * One-filing probe of control (i)'s failure: why the audit's independent scan found 0 shares for
 * a holding the parser read as 377,095. One request through the declared SecClient. Prints the
 * relevant XML tags only. Run: node --conditions=react-server --import tsx docs/research/float-contract/probe-control.ts
 */
import { loadWorkerEnv } from '../../../worker/env';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';

loadWorkerEnv('A:/mointel');
const sec = new SecClient({ config: readResearchConfig(process.env).sec });
async function main() {
  const { body } = await sec.get('https://www.sec.gov/Archives/edgar/data/1527352/000182912625007776/ownership.xml');
  const block = /<nonDerivativeTable>[\s\S]*?<\/nonDerivativeTable>/.exec(body)?.[0] ?? '(no nonDerivativeTable)';
  console.log(block.replace(/\s+/g, ' ').slice(0, 1800));
}
void main();
