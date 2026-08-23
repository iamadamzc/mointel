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
 *      third of them would be a coin flip that nothing in the output marks.
 *
 *      Repeats REMOVE THE MOST UNSTABLE; they do not certify the rest. Agreement
 *      is not stability: for a ticker whose true split is 75/25 two draws agree
 *      62% of the time, at 60/40 it is 52%, at 90/10 it is 82%. Three draws cut
 *      those to 44%, 28% and 73%. So the passing set still contains moderately
 *      unstable names at every draw count anyone would pay for, and the honest
 *      claim is a filter rather than a guarantee.
 *
 *      Draws stop the moment two disagree, because instability is established at
 *      that point and further draws buy nothing. Every marginal draw is
 *      therefore spent only where it is still informative — confirming an
 *      agreement, never re-confirming a disagreement.
 *
 *   3. NEVER PRODUCTION. Point MARKET_DB_PATH at a copy. interpretTicker calls
 *      saveAnalysisVersion, so a replay writes dossiers, and on the live store
 *      they would surface as ordinary analysis.
 *
 * Usage:
 *   MARKET_DB_PATH=data/replay.db npm run research:replay -- \
 *     --from=2026-08-17 --to=2026-08-22 --max-draws=3 --out=replay.json AAA BBB
 */

import fs from 'node:fs';

import { loadWorkerEnv } from './env';
import { openDatabase } from '../lib/market/store/db';
import { readResearchConfig } from '../lib/research/config';
import { OpenAiInterpreter } from '../lib/research/interpret/openaiInterpreter';
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
  let maxDraws = 2;
  let out = 'replay-result.json';
  let concurrency = 4;
  for (const arg of argv) {
    if (arg.startsWith('--from=')) from = arg.split('=')[1] ?? from;
    else if (arg.startsWith('--to=')) to = arg.split('=')[1] ?? to;
    else if (arg.startsWith('--max-draws=')) maxDraws = Number(arg.split('=')[1]) || maxDraws;
    else if (arg.startsWith('--out=')) out = arg.split('=')[1] ?? out;
    else if (arg.startsWith('--concurrency=')) concurrency = Number(arg.split('=')[1]) || concurrency;
    else if (!arg.startsWith('--')) tickers.push(arg.toUpperCase());
  }
  return { tickers, from, to, maxDraws, out, concurrency };
}

async function main(): Promise<void> {
  // A standalone worker does not get .env.local for free. Omitting this is what
  // made the first run of this script produce a complete, plausible, and
  // entirely fabricated result -- see the interpreter guard below.
  loadWorkerEnv();

  const args = parseArgs(process.argv.slice(2));
  const dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  if (dbPath.endsWith('data/market.db')) {
    throw new Error('refusing to replay into the default store; point MARKET_DB_PATH at a copy');
  }

  const config = readResearchConfig();
  const db = openDatabase(dbPath);
  /*
   * Refuse to run without an interpreter, rather than degrading.
   *
   * interpretTicker is right to return the previously accepted dossier when no
   * interpreter is configured -- a desk is better served by yesterday's verified
   * analysis than by nothing. For a REPLAY that same kindness is poison: every
   * version came back carrying readCurrentAnalysis's dossier, which is the
   * ticker's LATEST stored analysis rather than the version being replayed. The
   * output read "123 stable, 0 unstable, 43 differ from stored" -- a clean,
   * plausible, entirely fabricated result whose only tell was tokens in=0.
   *
   * A replay that cannot call a model has no answer, and must say so.
   */
  if (!config.model.apiKey) {
    throw new Error('no OPENAI_API_KEY: a replay with no interpreter would report stored dossiers as re-derived');
  }
  const interpreter = new OpenAiInterpreter({ config: config.model, timeoutMs: 300_000 });

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
      `up to ${args.maxDraws} draw(s) each; a disagreement stops that version early`,
  );

  const rows: ReplayRow[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  /*
   * Versions are replayed concurrently.
   *
   * Written as a straight sequential loop first, on the reasoning that a
   * replay's correctness matters more than its speed. That reasoning did not
   * survive contact with a real run: 123 versions at two draws is 246
   * interpretations at roughly 25 seconds each, which is ten minutes of work
   * spread over an hour and a half. Nothing about it needed to be sequential —
   * each version reads its own as-of slice and appends its own row, and the
   * production research worker has run concurrently all along.
   */
  const queue = [...versions];
  const worker = async (): Promise<void> => {
    for (;;) {
      const version = queue.shift();
      if (!version) return;
      const storedGrade = String(JSON.parse(version.dossier).catalyst?.catalystGrade ?? 'UNKNOWN');
      const grades: string[] = [];
      let sourcesVisible = 0;

      for (let run = 0; run < args.maxDraws; run += 1) {
        // Established unstable: a third draw cannot change the verdict.
        if (new Set(grades).size > 1) break;

        const report = await interpretTicker(db, interpreter, null, {
          ticker: version.ticker,
          tradingDate: version.generated_at.slice(0, 10),
          // The whole point: prior-free, and blind to anything collected later.
          priorHumanAnalysis: null,
          asOf: version.generated_at,
          force: true,
        });
        if (report.outcome === 'UNAVAILABLE' || report.outcome === 'REUSED_UNCHANGED') {
          throw new Error(
            `${version.ticker} v${version.id} returned ${report.outcome}: that dossier was not re-derived`,
          );
        }
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
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(args.concurrency, versions.length)) }, () => worker()),
  );

  // Deterministic output regardless of completion order.
  rows.sort((a, b) => a.storedVersionId - b.storedVersionId);

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
