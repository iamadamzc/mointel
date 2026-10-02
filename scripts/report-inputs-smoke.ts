/**
 * Read-only, no model calls: what a v5 report would be written from, for each
 * kind on one date, from a store copy. A wiring check of
 * `lib/desk/reports/pipeline.ts` on real rows before any spend.
 *
 *   npx tsx scripts/report-inputs-smoke.ts <store.db> <YYYY-MM-DD> <min> <max>
 */
import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import type { ReportKind } from '../lib/desk/reports/contract';
import { openDatabase } from '../lib/market/store/db';

const [file, date, min, max] = process.argv.slice(2);
if (!file || !date || !min || !max) {
  console.error('usage: npx tsx scripts/report-inputs-smoke.ts <store.db> <YYYY-MM-DD> <min> <max>');
  process.exit(2);
}
const db = openDatabase(file, { readonly: true, skipSchema: true });
const kinds: ReportKind[] = ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'PREMARKET'];
for (const kind of kinds) {
  const read = readReportInputs(db, kind, date, { min: Number(min), max: Number(max) });
  if (!read.ok) {
    console.log(kind, 'MISSED', JSON.stringify(read.cause));
    continue;
  }
  const { inputs } = read;
  const paths = [...inputs.paths.values()];
  console.log(
    kind,
    `checkpoint #${inputs.checkpoint.id} ${inputs.checkpoint.type} ${inputs.checkpoint.completedAt}`,
    `facts ${inputs.facts.length}`,
    `research ${inputs.research.size}`,
    `paths ${paths.filter((p) => p !== null).length}/${paths.length}`,
    `totals ${JSON.stringify(inputs.afterHoursTotals)}`,
  );
  const first = inputs.facts[0];
  if (first) {
    const r = inputs.research.get(first.ticker);
    console.log(
      '   first:',
      first.ticker,
      `$${first.price}`,
      JSON.stringify(inputs.paths.get(first.ticker)),
      r ? JSON.stringify(r.company) : 'no research',
      r ? `sources ${r.catalyst.sources.length}, shares ${JSON.stringify(r.structure.sharesOutstanding)}` : '',
    );
  }
}

// End to end with SCRIPTED models (no spend): a writer that says one plain
// line per name, and a checker that supports every line. Shows the payload
// the runner would store, without judging any prose.
async function endToEnd() {
  for (const kind of kinds) {
    const read = readReportInputs(db, kind, date, { min: Number(min), max: Number(max) });
    if (!read.ok) continue;
    const writer = {
      complete: async () =>
        JSON.stringify({ narrative: null, lines: read.inputs.facts.map((f) => ({ ticker: f.ticker, text: 'Where it sits: on file.' })) }),
    };
    const checker = {
      complete: async (prompt: { user: string }) => {
        const ids = [...prompt.user.matchAll(/^(S\d+L\d+|O|H)(?: \[|:)/gm)].map((m) => m[1]);
        return JSON.stringify({ verdicts: ids.map((id) => ({ id, supported: true, note: '' })) });
      },
    };
    const run = await runReport(db, { kind, rangeId: '1-20', tradingDate: date, range: { min: Number(min), max: Number(max) } }, { writer, checker });
    if (run.status !== 'PUBLISHED') {
      console.log(kind, 'RUN', run.status, JSON.stringify(run.cause));
      continue;
    }
    const line = run.report.sections[0]!.lines[0]!;
    console.log(
      kind,
      'RUN PUBLISHED',
      `watchCount ${run.report.watchCount}`,
      `late ${run.report.late}`,
      `lines ${run.diagnostics.lines}`,
      `rule strikes ${run.diagnostics.strikes.length}`,
      JSON.stringify({ ticker: line.ticker, company: line.company, path: line.path, liveFeed: line.liveFeed }),
    );
  }
}

void (process.argv.includes('--run') ? endToEnd() : Promise.resolve()).then(() => db.close());
