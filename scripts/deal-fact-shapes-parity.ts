/**
 * Parity of the checker's deal-fact shapes (TypeScript, lib/desk/reports/check.ts) with Commercial's Python
 * (docs/commercial/2026-10-12-deal-fact-shapes-check.py, read 75a). Input: a JSON list of { text, python }
 * where `python` is the Python verdict (indexes of the ban rules still hit). The same three ban rules are
 * applied here to withoutDealFacts(text); any difference is printed.
 * Run: node --import tsx scripts/deal-fact-shapes-parity.ts <cases.json>
 */
import fs from 'node:fs';

import { withoutDealFacts } from '../lib/desk/reports/check';

const BAN = [
  /\b(?:buy|buys|buying|sell|sells)\b|(?<!proof of )(?<!confirmed )(?<!not )\bselling\b/i,
  /\b(?:enter|enters|entered|entering|entry)\b/i,
  /\bconfirmed\b/i,
];

const cases = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8')) as Array<{ kind: string; text: string; python: number[] }>;
let differ = 0;
const tally: Record<string, { n: number; struck: number }> = {};
for (const c of cases) {
  const rest = withoutDealFacts(c.text);
  const ts = BAN.flatMap((b, i) => (b.test(rest) ? [i] : []));
  tally[c.kind] ??= { n: 0, struck: 0 };
  tally[c.kind]!.n++;
  if (ts.length > 0) tally[c.kind]!.struck++;
  if (JSON.stringify(ts) !== JSON.stringify(c.python)) {
    differ++;
    console.log(`DIFFER ts=${JSON.stringify(ts)} python=${JSON.stringify(c.python)}: ${c.text.slice(0, 160)}`);
  }
}
for (const [kind, t] of Object.entries(tally)) console.log(`${kind}: ${t.n} cases, ${t.struck} still struck (TypeScript)`);
console.log(differ === 0 ? `PARITY: all ${cases.length} cases agree` : `${differ} of ${cases.length} DIFFER`);
process.exit(differ === 0 ? 0 : 1);
