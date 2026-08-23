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
 *      The output is a modal value and an AGREEMENT FRACTION, never a bare
 *      mode. An unlabelled mode of three draws is a coin flip wearing a
 *      measurement's clothes; the same mode carrying "3 of 5 agreed" is a
 *      measurement with its own error beside it, and the consumer can weight
 *      rather than exclude. That distinction is the whole design: on a sample
 *      already thin on controls, discarding a quarter of it costs more than
 *      down-weighting it.
 *
 *      Repeats REMOVE THE MOST UNSTABLE; they do not certify the rest. Agreement
 *      is not stability: for a ticker whose true split is 75/25 two draws agree
 *      62% of the time, at 60/40 it is 52%, at 90/10 it is 82%. Three draws cut
 *      those to 44%, 28% and 73%. So the passing set still contains moderately
 *      unstable names at every draw count anyone would pay for, and the honest
 *      claim is a filter rather than a guarantee.
 *
 *      All three classifications are recorded per draw, not just the catalyst
 *      grade. They come from the same dossier and cost nothing extra, and it
 *      means one run answers the reproducibility question for cycle and
 *      structure on the same population instead of three separate runs on
 *      three different ones.
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

interface FieldOutcome {
  stored: string;
  /** Every draw, in order. The raw material; everything else derives from it. */
  draws: string[];
  /** Most common draw. Never presented without `agreement` beside it. */
  modal: string;
  /** Draws agreeing with the mode, over draws taken. The reliability weight. */
  agreement: number;
  unanimous: boolean;
  changedFromStored: boolean;
}

interface ReplayRow {
  ticker: string;
  /** The stored analysis this replays, and the join key for the archive. */
  storedVersionId: number;
  storedGeneratedAt: string;
  /** Evidence cutoff used, by collection time. */
  asOf: string;
  sourcesVisible: number;
  catalyst: FieldOutcome;
  cycle: FieldOutcome;
  structure: FieldOutcome;
}

function summarise(stored: string, draws: string[]): FieldOutcome {
  const counts = new Map<string, number>();
  for (const draw of draws) counts.set(draw, (counts.get(draw) ?? 0) + 1);
  const [modal, hits] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    stored,
    draws,
    modal,
    agreement: hits / draws.length,
    unanimous: counts.size === 1,
    changedFromStored: modal !== stored,
  };
}

function parseArgs(argv: string[]) {
  const tickers: string[] = [];
  let versionIds: number[] = [];
  let from = '2026-08-17';
  let to = '2026-08-22';
  let draws = 5;
  let out = 'replay-result.json';
  let concurrency = 4;
  for (const arg of argv) {
    if (arg.startsWith('--from=')) from = arg.split('=')[1] ?? from;
    else if (arg.startsWith('--to=')) to = arg.split('=')[1] ?? to;
    else if (arg.startsWith('--draws=')) draws = Number(arg.split('=')[1]) || draws;
    else if (arg.startsWith('--versions='))
      versionIds = (arg.split('=')[1] ?? '').split(',').map(Number).filter(Number.isFinite);
    else if (arg.startsWith('--out=')) out = arg.split('=')[1] ?? out;
    else if (arg.startsWith('--concurrency=')) concurrency = Number(arg.split('=')[1]) || concurrency;
    else if (!arg.startsWith('--')) tickers.push(arg.toUpperCase());
  }
  return { tickers, versionIds, from, to, draws, out, concurrency };
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
  const versions = (
    args.versionIds.length > 0
      ? db
          .prepare(
            `SELECT id, ticker, generated_at, dossier FROM research_analysis_versions
              WHERE id IN (${args.versionIds.map(() => '?').join(',')}) ORDER BY id`,
          )
          .all(...args.versionIds)
      : db
          .prepare(
            `SELECT id, ticker, generated_at, dossier FROM research_analysis_versions
              WHERE ticker IN (${args.tickers.map(() => '?').join(',')})
                AND generated_at >= ? AND generated_at < ?
              ORDER BY ticker, generated_at`,
          )
          .all(...args.tickers, args.from, args.to)
  ) as StoredVersion[];

  console.log(
    `[replay] ${versions.length} stored version(s) across ${args.tickers.length} ticker(s), ` +
      `${args.draws} draw(s) each = ${versions.length * args.draws} interpretations`,
  );

  const rows: ReplayRow[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;

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
      const stored = JSON.parse(version.dossier);
      const catalystDraws: string[] = [];
      const cycleDraws: string[] = [];
      const structureDraws: string[] = [];
      let sourcesVisible = 0;

      /*
       * Every draw is taken, with no early stop.
       *
       * An earlier build stopped as soon as two draws disagreed, which was
       * right when the output was a binary stable/unstable and each draw cost
       * full price. It is wrong now: the output is an agreement FRACTION, and
       * stopping early destroys the very distribution it measures. Draws after
       * the first are also nearly free on input — the request is byte-identical
       * and 61% of a two-draw run's input tokens were cache hits — so the only
       * real cost of depth is output.
       */
      for (let run = 0; run < args.draws; run += 1) {
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
        cachedTokens += report.metrics.cachedInputTokens;
        catalystDraws.push(String(report.dossier?.catalyst?.catalystGrade ?? 'FAILED'));
        cycleDraws.push(String(report.dossier?.cycle?.cycleClassification ?? 'FAILED'));
        structureDraws.push(String(report.dossier?.structure?.structureClassification ?? 'FAILED'));
      }

      const row: ReplayRow = {
        ticker: version.ticker,
        storedVersionId: version.id,
        storedGeneratedAt: version.generated_at,
        asOf: version.generated_at,
        sourcesVisible,
        catalyst: summarise(String(stored.catalyst?.catalystGrade ?? 'UNKNOWN'), catalystDraws),
        cycle: summarise(String(stored.cycle?.cycleClassification ?? 'UNKNOWN'), cycleDraws),
        structure: summarise(String(stored.structure?.structureClassification ?? 'UNKNOWN'), structureDraws),
      };
      rows.push(row);

      console.log(
        `  ${version.ticker.padEnd(6)} v${String(version.id).toString().padEnd(5)} ` +
          `cat ${row.catalyst.modal.padEnd(26)} ${Math.round(row.catalyst.agreement * 100)}%  ` +
          `cyc ${Math.round(row.cycle.agreement * 100)}%  str ${Math.round(row.structure.agreement * 100)}%`,
      );
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(args.concurrency, versions.length)) }, () => worker()),
  );

  // Deterministic output regardless of completion order.
  rows.sort((a, b) => a.storedVersionId - b.storedVersionId);

  fs.writeFileSync(
    args.out,
    JSON.stringify(
      { draws: args.draws, rows, tokens: { inputTokens, outputTokens, cachedTokens } },
      null,
      2,
    ),
  );

  const report = (label: string, pick: (row: ReplayRow) => FieldOutcome) => {
    const all = rows.map(pick);
    const unanimous = all.filter((f) => f.unanimous).length;
    const mean = all.reduce((sum, f) => sum + f.agreement, 0) / all.length;
    const changed = all.filter((f) => f.changedFromStored).length;
    console.log(
      `  ${label.padEnd(10)} unanimous ${String(unanimous).padStart(4)}/${all.length}  ` +
        `mean agreement ${(mean * 100).toFixed(0)}%  ` +
        `modal differs from stored ${String(changed).padStart(4)}`,
    );
  };

  console.log(`
[replay] ${rows.length} version(s) x ${args.draws} draw(s)`);
  report('catalyst', (row) => row.catalyst);
  report('cycle', (row) => row.cycle);
  report('structure', (row) => row.structure);
  console.log(
    `
[replay] tokens in=${inputTokens.toLocaleString()} ` +
      `(cached ${cachedTokens.toLocaleString()}, ${Math.round((cachedTokens / Math.max(1, inputTokens)) * 100)}%) ` +
      `out=${outputTokens.toLocaleString()}
` +
      `[replay] written to ${args.out}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
