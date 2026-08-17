/**
 * `npm run research:catalyst`
 *
 * Phase 3 verification runner: collects catalyst evidence for live Discovery
 * names and reports where each announcement was published.
 *
 * Source collection only — no interpretation, no catalyst grading. It exists to
 * prove the evidence layer is reliable and, critically, that an unchanged
 * second pass costs nothing.
 *
 * Usage:
 *   npm run research:catalyst -- SLE CRGO
 *   npm run research:catalyst -- --twice          run twice to prove no spend
 *   npm run research:catalyst -- --no-discovery   deterministic sources only
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { modelAvailability, readResearchConfig, secAvailability } from '../lib/research/config';
import { SecClient } from '../lib/research/sec/client';
import { NoopDiscoveryProvider } from '../lib/research/catalyst/discovery';
import { OpenAiDiscoveryProvider } from '../lib/research/catalyst/openaiDiscovery';
import {
  collectCatalystEvidence,
  type MaterialDemandEvent,
} from '../lib/research/catalyst/collector';
import { resolveCompanySources } from '../lib/research/catalyst/irRegistry';
import { openDatabase } from '../lib/market/store/db';
import { readIssuer } from '../lib/market/store/researchRepo';
import type { CatalystCollectionReport } from '../lib/research/catalyst/collector';

function parseArgs(argv: string[]) {
  const tickers: string[] = [];
  let twice = false;
  let noDiscovery = false;
  let limit = 6;

  for (const arg of argv) {
    if (arg === '--twice') twice = true;
    else if (arg === '--no-discovery') noDiscovery = true;
    else if (arg.startsWith('--limit=')) limit = Number(arg.split('=')[1]) || limit;
    else if (!arg.startsWith('--')) tickers.push(arg.toUpperCase());
  }
  return { tickers, twice, noDiscovery, limit };
}

function pad(value: unknown, width: number): string {
  return String(value ?? '—').padEnd(width);
}

interface DemandSnapshot {
  rank: number | null;
  previousRank: number | null;
  haltState: string | null;
}

function readDemand(
  db: ReturnType<typeof openDatabase>,
  symbol: string,
  tradingDate: string,
): DemandSnapshot | null {
  const row = db
    .prepare(
      `SELECT rvol_rank AS rank, previous_rvol_rank AS previousRank, halt_state AS haltState
         FROM ticker_session WHERE symbol = ? AND trading_date = ?`,
    )
    .get(symbol, tradingDate) as DemandSnapshot | undefined;
  return row ?? null;
}

/** How much a rank must improve before it counts as material. */
const MATERIAL_RANK_IMPROVEMENT = 5;

/**
 * Derives a material demand change from state the engine already computes.
 *
 * Deliberately conservative: these are observable transitions, not invented
 * trading signals, and none of them asserts the move means anything. They only
 * license looking for news earlier than the interval would allow.
 */
function deriveMaterialEvent(
  demand: DemandSnapshot | null,
  autoRank: number,
): MaterialDemandEvent | null {
  if (!demand || demand.rank === null) return null;

  if (demand.haltState === 'HALTED') {
    return { kind: 'HALT', detail: 'trading halted' };
  }
  if (demand.haltState === 'RESUMED') {
    return { kind: 'RESUME', detail: 'trading resumed' };
  }
  if (demand.previousRank === null && demand.rank <= autoRank) {
    return { kind: 'ENTERED_TOP_N', detail: `entered top ${autoRank} at rank ${demand.rank}` };
  }
  if (
    demand.previousRank !== null &&
    demand.previousRank - demand.rank >= MATERIAL_RANK_IMPROVEMENT &&
    demand.rank <= autoRank
  ) {
    return {
      kind: 'RANK_IMPROVED',
      detail: `rank ${demand.previousRank} → ${demand.rank}`,
    };
  }
  return null;
}

function describeTime(time: CatalystCollectionReport['latestSourceAt']): string {
  if (!time) return 'none';
  if (time.precision === 'DATE_ONLY') return `${time.etDate} (date only)`;
  if (time.precision === 'UNKNOWN') return `unparsed: ${time.original ?? '—'}`;
  return `${time.etDate} ${time.etClock ?? ''} ET (${time.precision})`;
}

function printReport(report: CatalystCollectionReport): void {
  const registry = report.companySources;
  console.log(`  state             ${report.state}`);
  console.log(
    `  IR source         ${
      registry.feedUrl ?? registry.pressReleaseIndexUrl ?? registry.newsroomUrl ?? 'none on file'
    }${registry.feedUrl ? ' [feed]' : ''}`,
  );
  console.log(`  SEC exhibits      ${report.exhibitsFound.length}`);
  for (const exhibit of report.exhibitsFound.slice(0, 4)) {
    console.log(`    · ${pad(exhibit.parentAccession, 22)} ${exhibit.title ?? ''}`);
  }
  console.log(`  company releases  ${report.companyReleases.length}`);
  for (const release of report.companyReleases.slice(0, 4)) {
    console.log(
      `    · ${pad(describeTime(release.published), 28)} ${(release.title ?? '').slice(0, 64)}`,
    );
  }
  console.log(`  discovered        ${report.discoveredSources.length}`);
  for (const found of report.discoveredSources.slice(0, 4)) {
    console.log(
      `    · ${pad(found.authority, 12)} ${pad(describeTime(found.published), 24)} ${(
        found.title ?? ''
      ).slice(0, 56)}`,
    );
  }

  const multi = report.clusters.filter((cluster) => cluster.memberIds.length > 1);
  console.log(
    `  clusters          ${report.clusters.length} (${multi.length} syndicated)`,
  );
  for (const cluster of multi.slice(0, 4)) {
    console.log(
      `    · ${cluster.memberIds.length} copies → canonical ${cluster.canonicalAuthority} (${cluster.confidence}): ${cluster.reason}`,
    );
  }

  console.log(`  latest source     ${describeTime(report.latestSourceAt)}`);
  console.log(
    `  fingerprint       ${report.fingerprint.slice(0, 16)} changed=${report.fingerprintChanged} newSources=${report.newSourceCount}`,
  );
  console.log(
    `  resolved          ${report.resolved} (${report.discoveryIntervalMinutes}m discovery tier)`,
  );
  console.log(
    `  discovery         ${report.discoveryRan ? `RAN [${report.discoveryTrigger}]` : 'not run'} — ${report.discoveryDetail}`,
  );
  if (report.eventsEmitted.length > 0) {
    console.log(`  events            ${report.eventsEmitted.join(', ')}`);
  }
  console.log(`  model calls       ${report.modelCalls} (interpretation ${report.interpretationCalls})`);
  console.log(`  network requests  ${report.networkRequests}`);
  console.log(`  latency           ${report.durationMs} ms`);

  for (const blocked of report.inaccessible) {
    console.log(`  ! unreachable     ${blocked.failure} ${blocked.url}`);
  }
  for (const warning of report.warnings) console.log(`  ! ${warning}`);
}

async function main(): Promise<void> {
  const { tickers, twice, noDiscovery, limit } = parseArgs(process.argv.slice(2));
  const config = readResearchConfig();

  const sec = secAvailability(config.sec);
  const model = modelAvailability(config.model);
  console.log(`[sec] ${sec.detail}`);
  console.log(`[model] ${model.available ? model.detail : model.detail}`);

  const db = openDatabase(process.env.MARKET_DB_PATH ?? 'data/market.db', {
    onSchemaBackup: (info) =>
      console.log(`[store] schema v${info.fromVersion}→v${info.toVersion}, backup ${info.path}`),
  });

  const tradingDate = (
    db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string }
  ).d;

  const symbols =
    tickers.length > 0
      ? tickers
      : (
          db
            .prepare(
              `SELECT symbol FROM ticker_session
                WHERE trading_date = ? AND rvol_rank IS NOT NULL
                ORDER BY rvol_rank ASC LIMIT ?`,
            )
            .all(tradingDate, limit) as Array<{ symbol: string }>
        ).map((row) => row.symbol);

  const secClient = new SecClient({ config: config.sec });
  const discovery =
    config.model.apiKey && !noDiscovery
      ? new OpenAiDiscoveryProvider({ config: config.model })
      : new NoopDiscoveryProvider();

  console.log(
    `[catalyst] ${tradingDate}, ${symbols.length} ticker(s), discovery=${discovery.available ? discovery.name : 'off'}\n`,
  );

  let totalModelCalls = 0;
  const firstPass: Record<string, CatalystCollectionReport> = {};

  for (const symbol of symbols) {
    console.log(`── ${symbol} ${'─'.repeat(Math.max(0, 50 - symbol.length))}`);
    const issuer = readIssuer(db, symbol);

    if (issuer && discovery.available) {
      const resolved = await resolveCompanySources(db, discovery, {
        ticker: symbol,
        companyName: issuer.companyName,
        userAgent: config.sec.userAgent,
      });
      totalModelCalls += resolved.modelCalls;
      console.log(`  IR registry       ${resolved.detail} (model calls ${resolved.modelCalls})`);
    }

    const demand = readDemand(db, symbol, tradingDate);
    const relevant = demand !== null && demand.rank !== null && demand.rank <= config.autoRank;
    const materialEvent = deriveMaterialEvent(demand, config.autoRank);

    if (materialEvent) {
      console.log(`  demand event      ${materialEvent.kind} — ${materialEvent.detail}`);
    }
    if (!relevant) {
      console.log(`  relevance         off board (rank ${demand?.rank ?? '—'}); no paid refresh`);
    }

    try {
      const report = await collectCatalystEvidence(
        db,
        secClient,
        discovery,
        { sec: config.sec, catalyst: config.catalyst },
        {
          ticker: symbol,
          companyName: issuer?.companyName ?? null,
          tradingDate,
          relevant,
          materialEvent,
        },
      );
      firstPass[symbol] = report;
      totalModelCalls += report.modelCalls;
      printReport(report);
    } catch (error) {
      console.log(`  FAILED ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log();
  }

  if (twice) {
    console.log('═'.repeat(56));
    console.log('SECOND PASS — unchanged evidence must cost nothing\n');
    let secondModelCalls = 0;

    for (const symbol of symbols) {
      const issuer = readIssuer(db, symbol);
      const demand = readDemand(db, symbol, tradingDate);
      // The second pass must use the same relevance and event inputs as the
      // first, or an off-board ticker silently starts paying again.
      const relevant = demand !== null && demand.rank !== null && demand.rank <= config.autoRank;
      const t0 = Date.now();
      try {
        const report = await collectCatalystEvidence(
          db,
          secClient,
          discovery,
          { sec: config.sec, catalyst: config.catalyst },
          {
            ticker: symbol,
            companyName: issuer?.companyName ?? null,
            tradingDate,
            relevant,
            materialEvent: deriveMaterialEvent(demand, config.autoRank),
          },
        );
        secondModelCalls += report.modelCalls;
        console.log(
          `  ${pad(symbol, 6)} changed=${pad(report.fingerprintChanged, 6)} modelCalls=${pad(
            report.modelCalls,
            3,
          )} discovery=${pad(report.discoveryRan, 6)} ${Date.now() - t0}ms  ${report.state}`,
        );
      } catch (error) {
        console.log(`  ${pad(symbol, 6)} FAILED ${String(error)}`);
      }
    }

    console.log(`\n  second-pass model calls: ${secondModelCalls}`);
    totalModelCalls += secondModelCalls;
  }

  console.log('═'.repeat(56));
  console.log(`tickers            ${symbols.length}`);
  console.log(`total model calls  ${totalModelCalls}`);
  console.log(`SEC requests       ${secClient.requestCount}`);

  db.close();
}

main().catch((error) => {
  console.error('[catalyst] fatal:', error);
  process.exitCode = 1;
});
