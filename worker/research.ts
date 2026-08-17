/**
 * `npm run research`
 *
 * The automatic research worker.
 *
 * Watches the live Discovery board and carries newly eligible names all the way
 * to intelligence without anyone invoking anything:
 *
 *   Top-12 entry → QUEUED → COLLECTING → SOURCES_READY → ANALYZING
 *                → dossier accepted → dashboard-visible
 *
 * Every transition is stamped as it happens, so time-to-intelligence is
 * measured rather than reconstructed. Bounded concurrency; one long-lived
 * process alongside the market worker.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { modelAvailability, readResearchConfig, secAvailability } from '../lib/research/config';
import { SecClient } from '../lib/research/sec/client';
import { collectSecEvidence, TickerMapCache } from '../lib/research/sec/collector';
import { collectCatalystEvidence } from '../lib/research/catalyst/collector';
import { NoopDiscoveryProvider } from '../lib/research/catalyst/discovery';
import { OpenAiDiscoveryProvider } from '../lib/research/catalyst/openaiDiscovery';
import { OpenAiInterpreter } from '../lib/research/interpret/openaiInterpreter';
import { NoopInterpreter } from '../lib/research/interpret/interpreter';
import { loadSheetPriors } from '../lib/research/merge/sheetPrior';
import { interpretTicker } from '../lib/research/interpret/pipeline';
import { queueDiscoveryResearch, timeToIntelligence, type QueueCandidate } from '../lib/research/queue';
import { ensureDailyHistory } from '../lib/research/historyFetch';
import { openDatabase, type MarketDatabase } from '../lib/market/store/db';
import {
  claimQueuedJobs,
  completeJob,
  markJobStage,
  readJobsForDate,
  readOrphanedJobs,
  requeueJobForRetry,
  writeResearchHealth,
} from '../lib/market/store/researchRepo';
import type { ResearchHealth } from '../lib/research/types';

const POLL_MS = Number(process.env.RESEARCH_POLL_MS ?? 5000);
const MAX_CYCLES = Number(process.env.RESEARCH_MAX_CYCLES ?? 0); // 0 = run forever

function log(message: string): void {
  console.log(message);
}

function readCandidates(db: MarketDatabase, tradingDate: string, autoRank: number): QueueCandidate[] {
  return db
    .prepare(
      `SELECT s.symbol AS ticker, s.rvol_rank AS rank, s.rvol, s.percent_change AS percentChange,
              s.cumulative_volume AS cumulativeVolume, s.spread_pct AS spreadPct,
              s.latched, s.qualified_at AS qualifiedAt, u.classification
         FROM ticker_session s
         LEFT JOIN universe u ON u.symbol = s.symbol
        WHERE s.trading_date = ? AND s.rvol_rank IS NOT NULL AND s.rvol_rank <= ?
        ORDER BY s.rvol_rank ASC`,
    )
    .all(tradingDate, autoRank)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        ticker: String(r.ticker),
        rank: Number(r.rank),
        rvol: r.rvol === null ? null : Number(r.rvol),
        percentChange: r.percentChange === null ? null : Number(r.percentChange),
        cumulativeVolume: r.cumulativeVolume === null ? null : Number(r.cumulativeVolume),
        spreadPct: r.spreadPct === null ? null : Number(r.spreadPct),
        latched: r.latched === 1,
        classification: r.classification === null ? null : String(r.classification),
        qualifiedAt: r.qualifiedAt === null ? null : String(r.qualifiedAt),
      };
    });
}

async function main(): Promise<void> {
  const config = readResearchConfig();
  const sec = secAvailability(config.sec);
  const model = modelAvailability(config.model);

  log(`[research] sec: ${sec.detail}`);
  log(`[research] model: ${model.detail}`);

  const db = openDatabase(process.env.MARKET_DB_PATH ?? 'data/market.db', {
    onSchemaBackup: (info) =>
      log(`[store] schema v${info.fromVersion}→v${info.toVersion}, backup ${info.path}`),
  });

  const secClient = new SecClient({ config: config.sec });
  const tickerMap = new TickerMapCache(secClient);
  const discovery = config.model.apiKey
    ? new OpenAiDiscoveryProvider({ config: config.model })
    : new NoopDiscoveryProvider();
  const interpreter = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, timeoutMs: 300_000 })
    : new NoopInterpreter();
  const escalation = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, tier: 'ESCALATION', timeoutMs: 300_000 })
    : null;

  // A restart must not leave a ticker showing COLLECTING forever.
  const bootDate = (
    db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string | null }
  ).d;
  if (bootDate) {
    const orphans = readOrphanedJobs(db, bootDate);
    for (const job of orphans) {
      requeueJobForRetry(db, job.id, 'worker restarted mid-job');
      log(`[research] recovered orphaned job ${job.ticker} (${job.status})`);
    }
  }

  let cycles = 0;
  let lastCompletedTicker: string | null = null;
  let lastCompletedAt: string | null = null;
  const latencies: number[] = [];

  const health = (state: ResearchHealth['state'], active: string[]) => {
    const tradingDate =
      (db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string | null })
        .d ?? '';
    const jobs = readJobsForDate(db, tradingDate);
    writeResearchHealth(db, {
      state,
      queuedJobs: jobs.filter((job) => job.status === 'QUEUED').length,
      activeJobs: active,
      lastCompletedTicker,
      lastCompletedAt,
      secAvailable: sec.available,
      secDetail: sec.detail,
      modelAvailable: model.available,
      modelDetail: model.detail,
      updatedAt: new Date().toISOString(),
    });
  };

  log(`[research] worker started, polling every ${POLL_MS}ms\n`);

  for (;;) {
    cycles += 1;
    const tradingDate = (
      db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string | null }
    ).d;

    if (!tradingDate) {
      health('IDLE', []);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (MAX_CYCLES > 0 && cycles >= MAX_CYCLES) break;
      continue;
    }

    // Human research is read once per cycle and passed through so a material
    // disagreement can reach the escalation decision. Read-only throughout.
    const sheetLoad = await loadSheetPriors();
    const sheetPriors = sheetLoad.priors;

    // ---------------------------------------------------------- queue
    const candidates = readCandidates(db, tradingDate, config.autoRank);
    const decisions = queueDiscoveryResearch(db, candidates, {
      tradingDate,
      autoRank: config.autoRank,
      now: new Date(),
    });
    for (const decision of decisions.filter((item) => item.queued)) {
      log(`[research] ${decision.ticker} queued priority=${decision.priority}`);
    }

    // ---------------------------------------------------------- work
    const claimed = claimQueuedJobs(
      db,
      tradingDate,
      config.concurrency,
      new Date().toISOString(),
    );

    if (claimed.length === 0) {
      health('IDLE', []);
      if (MAX_CYCLES > 0 && cycles >= MAX_CYCLES) break;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      continue;
    }

    health(
      'WORKING',
      claimed.map((job) => job.ticker),
    );

    await Promise.all(
      claimed.map(async (job) => {
        const started = Date.now();
        try {
          const universe = db
            .prepare('SELECT name, exchange FROM universe WHERE symbol = ?')
            .get(job.ticker) as { name: string | null; exchange: string | null } | undefined;

          // ----- daily history (cycle context, separate from live minutes)
          const history = await ensureDailyHistory(
            db,
            job.ticker,
            config.cycleHistory.tradingDays,
          );
          if (history.fetched) log(`[history] ${job.ticker} ${history.detail}`);

          // ----- collection
          log(`[research] ${job.ticker} collecting sources`);
          await collectSecEvidence(db, secClient, tickerMap, {
            ticker: job.ticker,
            expectedName: universe?.name ?? null,
            expectedExchange: universe?.exchange ?? null,
          });
          await collectCatalystEvidence(
            db,
            secClient,
            discovery,
            { sec: config.sec, catalyst: config.catalyst },
            { ticker: job.ticker, companyName: universe?.name ?? null, tradingDate },
          );

          markJobStage(db, job.id, 'SOURCES_READY', new Date().toISOString());
          log(`[research] ${job.ticker} sources ready`);

          // ----- interpretation
          markJobStage(db, job.id, 'ANALYZING', new Date().toISOString());
          const prior = sheetPriors.get(job.ticker) ?? null;
          const report = await interpretTicker(db, interpreter, escalation, {
            ticker: job.ticker,
            tradingDate,
            priorHumanAnalysis: prior?.analysis ?? null,
            sheetSnapshot: prior?.snapshot ?? null,
            onLog: log,
          });

          const acceptedAt = new Date().toISOString();
          const status =
            report.outcome === 'ACCEPTED'
              ? 'COMPLETE'
              : report.outcome === 'PARTIAL' || report.outcome === 'REUSED_UNCHANGED'
                ? 'PARTIAL'
                : 'FAILED';

          completeJob(db, job.id, {
            status,
            completedAt: acceptedAt,
            acceptedAt: report.dossier ? acceptedAt : null,
            evidenceFingerprint: report.evidenceFingerprint,
            error: report.error,
          });

          if (report.dossier) {
            lastCompletedTicker = job.ticker;
            lastCompletedAt = acceptedAt;
            latencies.push(Date.now() - started);
          }

          const timing = timeToIntelligence({ ...job, acceptedAt });
          log(
            `[research] ${job.ticker} ${status} in ${((Date.now() - started) / 1000).toFixed(1)}s` +
              (timing.totalMs !== null
                ? ` · top12→intelligence ${(timing.totalMs / 1000).toFixed(1)}s`
                : ''),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log(`[research] ${job.ticker} failed: ${message}`);
          completeJob(db, job.id, {
            status: 'FAILED',
            completedAt: new Date().toISOString(),
            error: message.slice(0, 300),
          });
        }
      }),
    );

    health('IDLE', []);
    if (MAX_CYCLES > 0 && cycles >= MAX_CYCLES) break;
  }

  log('[research] worker stopped');
  db.close();
}

main().catch((error) => {
  console.error('[research] fatal:', error);
  process.exitCode = 1;
});
