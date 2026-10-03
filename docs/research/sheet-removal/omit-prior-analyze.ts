/**
 * Sheet removal, step 2: the analysis of `omit-prior-run.ts`'s raw output, written
 * BEFORE the run so the reported quantities are the pre-registered ones
 * (`prereg-omit-prior.md`, 4a0f65c1) and nothing else.
 *
 * Per field: the disagreement rate WITH-1 vs WITH-2 (noise), WITHOUT-1 vs
 * WITHOUT-2 (noise), and WITH vs WITHOUT over all four cross pairs, pooled and
 * per pair. A field whose pooled cross rate exceeds BOTH noise rates is FLAGGED,
 * with the tickers whose cross pairs disagree. Escalation counts per arm. No pass
 * line: a measurement of what changes, not a gate.
 *
 * A pair is compared only when both arms have a row for the ticker. A field with
 * no dossier on one side compares as null, so a lost dossier counts as a change.
 *
 * Run: node --import tsx docs/research/sheet-removal/omit-prior-analyze.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';

interface Row {
  ticker: string;
  arm: string;
  outcome: string;
  escalated: boolean;
  catalyst: Record<string, unknown> | null;
  structure: Record<string, unknown> | null;
  cycle: Record<string, unknown> | null;
  chips: { why: { code: string; grade?: unknown }; risk: { label: string } };
}

const FIELDS: Array<[string, (r: Row) => unknown]> = [
  ['outcome', (r) => r.outcome],
  ['catalyst.catalystStatus', (r) => r.catalyst?.catalystStatus ?? null],
  ['catalyst.catalystGrade', (r) => r.catalyst?.catalystGrade ?? null],
  ['catalyst.catalystType', (r) => r.catalyst?.catalystType ?? null],
  ['catalyst.plausiblyExplainsMove', (r) => r.catalyst?.plausiblyExplainsMove ?? null],
  ['structure.structureClassification', (r) => r.structure?.structureClassification ?? null],
  ['structure.sharesOutstanding', (r) => r.structure?.sharesOutstanding ?? null],
  ['structure.sharesOutstandingDate', (r) => r.structure?.sharesOutstandingDate ?? null],
  ['cycle.cycleClassification', (r) => r.cycle?.cycleClassification ?? null],
  ['escalated', (r) => r.escalated],
  ['chip.why.code', (r) => r.chips.why.code],
  ['chip.why.grade', (r) => r.chips.why.grade ?? null],
  ['chip.risk.label', (r) => r.chips.risk.label],
];
const NOISE: Array<[string, string]> = [
  ['WITH-1', 'WITH-2'],
  ['WITHOUT-1', 'WITHOUT-2'],
];
const CROSS: Array<[string, string]> = [
  ['WITH-1', 'WITHOUT-1'],
  ['WITH-1', 'WITHOUT-2'],
  ['WITH-2', 'WITHOUT-1'],
  ['WITH-2', 'WITHOUT-2'],
];

function main() {
  const [out] = process.argv.slice(2);
  if (!out) throw new Error('usage: omit-prior-analyze.ts <out-dir>');
  const rows = fs
    .readFileSync(path.join(out, 'raw.jsonl'), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Row);
  const byKey = new Map(rows.map((r) => [`${r.ticker}|${r.arm}`, r]));
  const tickers = [...new Set(rows.map((r) => r.ticker))];

  const compare = (get: (r: Row) => unknown, pairs: Array<[string, string]>) => {
    let n = 0;
    let differ = 0;
    const which = new Set<string>();
    for (const ticker of tickers) {
      for (const [a, b] of pairs) {
        const ra = byKey.get(`${ticker}|${a}`);
        const rb = byKey.get(`${ticker}|${b}`);
        if (!ra || !rb) continue;
        n += 1;
        if (JSON.stringify(get(ra)) !== JSON.stringify(get(rb))) {
          differ += 1;
          which.add(ticker);
        }
      }
    }
    return { n, differ, rate: n === 0 ? null : differ / n, tickers: [...which] };
  };

  const lines: string[] = [`Sheet removal step 2, analysis of ${out}: ${rows.length} rows, ${tickers.length} tickers`, ''];
  const report: Record<string, unknown> = {};
  const pct = (x: number | null) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
  for (const [name, get] of FIELDS) {
    const withNoise = compare(get, [NOISE[0]!]);
    const withoutNoise = compare(get, [NOISE[1]!]);
    const cross = compare(get, CROSS);
    const perPair = CROSS.map((pair) => ({ pair: pair.join(' vs '), ...compare(get, [pair]) }));
    const flagged =
      cross.rate !== null &&
      withNoise.rate !== null &&
      withoutNoise.rate !== null &&
      cross.rate > withNoise.rate &&
      cross.rate > withoutNoise.rate;
    report[name] = { withNoise, withoutNoise, cross, perPair, flagged };
    lines.push(
      `${flagged ? 'FLAGGED ' : ''}${name}: WITH noise ${pct(withNoise.rate)} (${withNoise.differ}/${withNoise.n}), ` +
        `WITHOUT noise ${pct(withoutNoise.rate)} (${withoutNoise.differ}/${withoutNoise.n}), ` +
        `cross ${pct(cross.rate)} (${cross.differ}/${cross.n})${flagged ? `; tickers ${cross.tickers.join(' ')}` : ''}`,
    );
  }
  const escalations = Object.fromEntries(
    ['WITH-1', 'WITHOUT-1', 'WITH-2', 'WITHOUT-2'].map((arm) => [arm, rows.filter((r) => r.arm === arm && r.escalated).length]),
  );
  report.escalationsPerArm = escalations;
  lines.push('', `escalations per arm: ${JSON.stringify(escalations)}`);

  fs.writeFileSync(path.join(out, 'analysis.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'analysis.txt'), `${lines.join('\n')}\n`);
  console.log(lines.join('\n'));
}

main();
