/**
 * `npm run research:interpret`
 *
 * Phase 4 verification runner: turns collected evidence into dossiers.
 *
 * Interpretation only — it collects nothing. Sources must already exist from
 * the Phase 2/3 collectors, which is what makes a wrong answer attributable to
 * either collection or reasoning rather than to both at once.
 *
 * Usage:
 *   npm run research:interpret -- SLE CRGO
 *   npm run research:interpret -- --twice      prove unchanged evidence is free
 *   npm run research:interpret -- --limit=8
 *   npm run research:interpret -- --date=2026-08-21 --force OLOX PMI
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { modelAvailability, readResearchConfig } from '../lib/research/config';
import { OpenAiInterpreter } from '../lib/research/interpret/openaiInterpreter';
import { NoopInterpreter } from '../lib/research/interpret/interpreter';
import { ensureDailyHistory } from '../lib/research/historyFetch';
import { interpretTicker, type InterpretationReport } from '../lib/research/interpret/pipeline';
import { openDatabase } from '../lib/market/store/db';
import { readCurrentAnalysis } from '../lib/market/store/researchRepo';

function parseArgs(argv: string[]) {
  const tickers: string[] = [];
  let twice = false;
  let limit = 6;
  let force = false;
  let date: string | null = null;

  for (const arg of argv) {
    if (arg === '--twice') twice = true;
    else if (arg === '--force') force = true;
    else if (arg.startsWith('--limit=')) limit = Number(arg.split('=')[1]) || limit;
    else if (arg.startsWith('--date=')) date = arg.split('=')[1] ?? null;
    else if (!arg.startsWith('--')) tickers.push(arg.toUpperCase());
  }
  return { tickers, twice, limit, force, date };
}

function pad(value: unknown, width: number): string {
  return String(value ?? '—').padEnd(width);
}

function printReport(report: InterpretationReport): void {
  console.log(`  outcome           ${report.outcome}`);
  console.log(`  sources           ${report.sourceCount} (coverage ${report.coverageIncomplete ? 'INCOMPLETE' : 'ok'})`);
  console.log(`  fingerprint       ${report.evidenceFingerprint.slice(0, 16)} changed=${report.fingerprintChanged}`);

  if (report.dossier) {
    const { catalyst, structure, cycle } = report.dossier;
    console.log(`  catalyst          ${catalyst.catalystGrade} / ${catalyst.catalystStatus} / ${catalyst.catalystType} (conf ${catalyst.confidence})`);
    console.log(`    summary         ${(catalyst.summary ?? '—').slice(0, 90)}`);
    console.log(`  structure         ${structure.structureClassification} (conf ${structure.confidence})`);
    console.log(`    shares out      ${structure.sharesOutstanding?.toLocaleString() ?? 'unknown'}`);
    console.log(`    float           ${structure.displayedFloat?.toLocaleString() ?? 'unknown'} (${structure.floatConfidence})`);
    console.log(`    supply blocks   ${structure.supplyLedger.length}`);
    for (const block of structure.supplyLedger.slice(0, 5)) {
      console.log(
        `      · ${pad(block.type, 26)} ${pad(block.status, 16)} ${
          block.amountShares !== null
            ? `${block.amountShares.toLocaleString()} sh`
            : block.dollarCapacity !== null
              ? `$${block.dollarCapacity.toLocaleString()}`
              : '—'
        } src=${block.evidenceSourceIds.join(',')}`,
      );
    }
    console.log(`  cycle             ${cycle.cycleClassification} (conf ${cycle.confidence})`);
    console.log(`    cycle high      ${cycle.currentCycleHigh ?? 'unknown'}  giveback ${cycle.currentGivebackPct ?? '—'}`);
    console.log(`    hist resistance ${cycle.historicalResistance ?? 'unknown'}  formerRunner ${cycle.formerRunnerStatus}`);
  }

  console.log(`  model             ${report.model ?? '—'}`);
  console.log(`  calls             terra=${report.metrics.terraCalls} repair=${report.metrics.repairCalls} sol=${report.metrics.escalationCalls}`);
  console.log(`  escalation        ${report.escalated ? report.escalationReason : 'none'}`);
  console.log(`  tokens            in=${report.metrics.inputTokens} out=${report.metrics.outputTokens} cached=${report.metrics.cachedInputTokens}`);
  console.log(`  latency           ${report.metrics.durationMs} ms`);

  for (const violation of report.violations) {
    console.log(`  ! [${violation.severity}] ${violation.rule} — ${violation.message.slice(0, 110)}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { tickers, twice, limit, force } = args;
  const config = readResearchConfig();
  const model = modelAvailability(config.model);
  console.log(`[model] ${model.detail}`);

  const db = openDatabase(process.env.MARKET_DB_PATH ?? 'data/market.db', {
    onSchemaBackup: (info) =>
      console.log(`[store] schema v${info.fromVersion}→v${info.toVersion}, backup ${info.path}`),
  });

  /*
   * The session to interpret against, latest by default.
   *
   * Pinnable because a replay needs it. The latest row is whatever the desk
   * last seeded, which on a Sunday is Monday's pre-seeded session carrying no
   * demand at all -- so an unpinned replay of Friday's board would hand every
   * arm a null demand summary and quietly stop being a replay of Friday.
   */
  const tradingDate =
    args.date ??
    (db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string }).d;

  // Only names that already have collected evidence can be interpreted.
  const symbols =
    tickers.length > 0
      ? tickers
      : (
          db
            .prepare(
              `SELECT DISTINCT s.ticker AS symbol
                 FROM research_sources s
                 JOIN ticker_session t
                   ON t.symbol = s.ticker AND t.trading_date = ?
                WHERE t.rvol_rank IS NOT NULL
                ORDER BY t.rvol_rank ASC LIMIT ?`,
            )
            .all(tradingDate, limit) as Array<{ symbol: string }>
        ).map((row) => row.symbol);

  const interpreter = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, timeoutMs: 300_000 })
    : new NoopInterpreter();
  const escalation = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, tier: 'ESCALATION', timeoutMs: 300_000 })
    : null;

  console.log(
    `[interpret] ${tradingDate}, ${symbols.length} ticker(s), prompt=${config.model.promptVariant}, model=${interpreter.model}\n`,
  );

  const totals = { terra: 0, sol: 0, repair: 0, input: 0, output: 0, ms: 0, accepted: 0 };

  for (const symbol of symbols) {
    console.log(`── ${symbol} ${'─'.repeat(Math.max(0, 50 - symbol.length))}`);
    try {
      // Cycle context is cold history; fetched once per session per symbol.
      const history = await ensureDailyHistory(db, symbol, config.cycleHistory.tradingDays);
      console.log(`  [history] ${history.detail}`);

      const report = await interpretTicker(db, interpreter, escalation, {
        // No job exists for a hand-run interpretation, so the owner is genuinely absent --
        // but the PURPOSE is not, and writing null there would put this
        // spend in the same bucket as the 1,433 rows whose purpose was
        // lost. Absence and a deliberate value must not read alike.
        jobId: null,
        trigger: 'MANUAL',
        ticker: symbol,
        tradingDate,
        // Sheet removal (A5): no human prior.
        priorHumanAnalysis: null,
        promptVariant: config.model.promptVariant,
        force,
        onLog: (message) => console.log(`  ${message}`),
      });
      printReport(report);
      totals.terra += report.metrics.terraCalls;
      totals.sol += report.metrics.escalationCalls;
      totals.repair += report.metrics.repairCalls;
      totals.input += report.metrics.inputTokens;
      totals.output += report.metrics.outputTokens;
      totals.ms += report.metrics.durationMs;
      if (report.outcome === 'ACCEPTED' || report.outcome === 'PARTIAL') totals.accepted += 1;
    } catch (error) {
      console.log(`  FAILED ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log();
  }

  if (twice) {
    console.log('═'.repeat(56));
    console.log('SECOND PASS — unchanged evidence must cost nothing\n');
    let secondTerra = 0;

    for (const symbol of symbols) {
      const report = await interpretTicker(db, interpreter, escalation, {
        // No job exists for a hand-run interpretation, so the owner is genuinely absent --
        // but the PURPOSE is not, and writing null there would put this
        // spend in the same bucket as the 1,433 rows whose purpose was
        // lost. Absence and a deliberate value must not read alike.
        jobId: null,
        trigger: 'MANUAL',
        ticker: symbol,
        tradingDate,
      });
      secondTerra += report.metrics.terraCalls;
      console.log(
        `  ${pad(symbol, 6)} ${pad(report.outcome, 18)} terra=${report.metrics.terraCalls} ${report.metrics.durationMs}ms`,
      );
    }
    console.log(`\n  second-pass Terra calls: ${secondTerra}`);
  }

  console.log('═'.repeat(56));
  console.log(`tickers analyzed   ${symbols.length}`);
  console.log(`dossiers stored    ${totals.accepted}`);
  console.log(`Terra calls        ${totals.terra}`);
  console.log(`repair calls       ${totals.repair}`);
  console.log(`Sol calls          ${totals.sol}`);
  console.log(`input tokens       ${totals.input.toLocaleString()}`);
  console.log(`output tokens      ${totals.output.toLocaleString()}`);
  console.log(
    `avg latency        ${symbols.length > 0 ? Math.round(totals.ms / symbols.length) : 0} ms`,
  );

  // Cost is reported per accepted dossier, which is the unit that matters.
  if (totals.accepted > 0) {
    console.log(
      `avg tokens/dossier in=${Math.round(totals.input / totals.accepted).toLocaleString()} out=${Math.round(totals.output / totals.accepted).toLocaleString()}`,
    );
  }

  console.log('\ncurrent dossiers:');
  for (const symbol of symbols) {
    const current = readCurrentAnalysis(db, symbol);
    console.log(
      `  ${pad(symbol, 6)} ${
        current
          ? `v${current.id} ${pad(current.dossier.catalyst.catalystGrade, 26)} ${pad(current.dossier.structure.structureClassification, 12)} ${current.dossier.cycle.cycleClassification}`
          : 'none'
      }`,
    );
  }

  db.close();
}

main().catch((error) => {
  console.error('[interpret] fatal:', error);
  process.exitCode = 1;
});
