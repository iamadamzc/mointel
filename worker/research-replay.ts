/**
 * `npm run research:replay`
 *
 * Re-derives stored analyses against the evidence as it stood when each one was
 * produced, with the Sheet's prior omitted, repeated so instability is visible
 * rather than averaged into a number that looks solid.
 *
 * Three properties this exists to hold, none of which the ordinary interpret CLI
 * provides:
 *
 *   1. AS-OF EVIDENCE. Each stored version is replayed against the sources the
 *      desk had actually COLLECTED by that version's generated_at. Without it a
 *      replay bundles everything a ticker has ever had, including sources
 *      fetched days later, and hands the re-derivation hindsight the original
 *      never had. That is invisible in the output and would invalidate any
 *      downstream join against outcomes.
 *
 *   2. REPEATS. Catalyst grade is not reproducible: over four identical runs on
 *      byte-identical evidence, 2 of 6 tickers returned more than one grade. A
 *      single re-derived grade is therefore a draw, not a measurement, and a
 *      third of them would be a coin flip that nothing in the output marks. Two
 *      runs separate the trustworthy from the untrustworthy; that is the useful
 *      distinction, and it is deliberately not the same as resolving the
 *      untrustworthy ones, which a mode of three draws only appears to do.
 *
 *   3. NEVER PRODUCTION. Point MARKET_DB_PATH at a copy. interpretTicker calls
 *      saveAnalysisVersion, so a replay writes dossiers, and on the live store
 *      they would surface as ordinary analysis.
 *
 * Usage:
 *   MARKET_DB_PATH=data/replay.db npm run research:replay -- \
 *     --from=2026-08-17 --to=2026-08-22 --repeats=2 --out=replay.json AAA BBB
 */

import fs from 'node:fs';

import { openDatabase } from '../lib/market/store/db';
import { readResearchConfig } from '../lib/research/config';
import { OpenAiInterpreter } from '../lib/research/interpret/openaiInterpreter';
import { NoopInterpreter } from '../lib/research/interpret/interpreter';
import { interpretTicker } from '../lib/research/interpret/pipeline';

interface StoredVersion {
  id: number;
  ticker: string;
  generated_at: string;
  dossier: string;
}

interface ReplayRow {
  ticker: string;
  /** The stored analysis this replays, and the join key for the archive. */
  storedVersionId: number;
  storedGeneratedAt: string;
  storedCatalystGrade: string;
  /** Evidence cutoff used, by collection time. */
  asOf: string;
  sourcesVisible: number;
  /** One grade per repeat, in order. */
  priorFreeGrades: string[];
  /** True when every repeat agreed. Only these are safe to join on. */
  stable: boolean;
  /** Present only when stable; deliberately absent rather than a modal guess. */
  priorFreeCatalystGrade: string | null;
  changedFromStored: boolean | null;
}

function parseArgs(argv: string[]) {
  const tickers: string[] = [];
  let from = '2026-08-17';
  let to = '2026-08-22';
  let repeats = 2;
  let out = 'replay-result.json';
  for (const arg of argv) {
    if (arg.startsWith('--from=')) from = arg.split('=')[1] ?? from;
    else if (arg.startsWith('--to=')) to = arg.split('=')[1] ?? to;
    else if (arg.startsWith('--repeats=')) repeats = Number(arg.split('=')[1]) || repeats;
    else if (arg.startsWith('--out=')) out = arg.split('=')[1] ?? out;
    else if (!arg.startsWith('--')) tickers.push(arg.toUpperCase());
  }
  return { tickers, from, to, repeats, out };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  if (dbPath.endsWith('data/market.db')) {
    throw new Error('refusing to replay into the default store; point MARKET_DB_PATH at a copy');
  }

  const config = readResearchConfig();
  const db = openDatabase(dbPath);
  const interpreter = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, timeoutMs: 300_000 })
    : new NoopInterpreter();

  /*
   * Snapshotted before anything runs. Each replay appends its own version, so
   * re-reading this list mid-run would start replaying the replays.
   */
  const versions = db
    .prepare(
      `SELECT id, ticker, generated_at, dossier FROM research_analysis_versions
        WHERE ticker IN (${args.tickers.map(() => '?').join(',')})
          AND generated_at >= ? AND generated_at < ?
        ORDER BY ticker, generated_at`,
    )
    .all(...args.tickers, args.from, args.to) as StoredVersion[];

  console.log(
    `[replay] ${versions.length} stored version(s) across ${args.tickers.length} ticker(s), ` +
      `${args.repeats} repeat(s) = ${versions.length * args.repeats} interpretations\n`,
  );

  const rows: ReplayRow[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (const version of versions) {
    const storedGrade = String(JSON.parse(version.dossier).catalyst?.catalystGrade ?? 'UNKNOWN');
    const grades: string[] = [];
    let sourcesVisible = 0;

    for (let run = 0; run < args.repeats; run += 1) {
      const report = await interpretTicker(db, interpreter, null, {
        ticker: version.ticker,
        tradingDate: version.generated_at.slice(0, 10),
        // The whole point: prior-free, and blind to anything collected later.
        priorHumanAnalysis: null,
        asOf: version.generated_at,
        force: true,
      });
      sourcesVisible = report.sourceCount;
      inputTokens += report.metrics.inputTokens;
      outputTokens += report.metrics.outputTokens;
      grades.push(String(report.dossier?.catalyst?.catalystGrade ?? 'FAILED'));
    }

    const stable = new Set(grades).size === 1;
    rows.push({
      ticker: version.ticker,
      storedVersionId: version.id,
      storedGeneratedAt: version.generated_at,
      storedCatalystGrade: storedGrade,
      asOf: version.generated_at,
      sourcesVisible,
      priorFreeGrades: grades,
      stable,
      priorFreeCatalystGrade: stable ? grades[0] : null,
      changedFromStored: stable ? grades[0] !== storedGrade : null,
    });

    console.log(
      `  ${version.ticker.padEnd(6)} v${String(version.id).padEnd(5)} ` +
        `stored=${storedGrade.padEnd(26)} priorFree=${grades.join('|')}` +
        `${stable ? '' : '   UNSTABLE'}`,
    );
  }

  const stable = rows.filter((row) => row.stable);
  const changed = stable.filter((row) => row.changedFromStored);
  fs.writeFileSync(args.out, JSON.stringify({ rows, tokens: { inputTokens, outputTokens } }, null, 2));

  console.log(
    `\n[replay] ${rows.length} version(s): ${stable.length} stable, ` +
      `${rows.length - stable.length} unstable and NOT joinable.\n` +
      `[replay] of the stable, ${changed.length} differ from the stored grade.\n` +
      `[replay] tokens in=${inputTokens.toLocaleString()} out=${outputTokens.toLocaleString()}\n` +
      `[replay] written to ${args.out}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
