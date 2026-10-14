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

import {
  modelAvailability,
  readReportModelConfig,
  readResearchConfig,
  secAvailability,
} from '../lib/research/config';
import { SecClient, describeReachability } from '../lib/research/sec/client';
import { collectSecEvidence, TickerMapCache } from '../lib/research/sec/collector';
import { collectCatalystEvidence } from '../lib/research/catalyst/collector';
import { paidSearchDecision, type PaidSearchDecision } from '../lib/research/catalyst/paidSearchCap';
import { AlpacaNewsAdapter } from '../lib/research/news/alpaca';
import type { NewsAdapter } from '../lib/research/news/types';
import { queueNewsRecheck } from '../lib/research/news/recheck';
import { AlpacaRestClient } from '../lib/market/alpaca/rest';
import { findAlpacaCredentials } from '../lib/market/credentials';
import type { MaterialDemandEvent } from '../lib/research/catalyst/collector';

import { NoopDiscoveryProvider } from '../lib/research/catalyst/discovery';
import {
  OpenAiDiscoveryProvider,
  OpenAiCompanySourceResolver,
} from '../lib/research/catalyst/openaiDiscovery';
import { OpenAiInterpreter } from '../lib/research/interpret/openaiInterpreter';
import { NoopInterpreter } from '../lib/research/interpret/interpreter';
import { interpretTicker } from '../lib/research/interpret/pipeline';
import { runFloatJob } from '../lib/research/floatRun';
import { computeEvidenceFingerprint } from '../lib/research/fingerprint';
import { queueDiscoveryResearch, retireStrandedJobs, timeToIntelligence } from '../lib/research/queue';
import { queueResolverRecovery } from '../lib/research/recovery';
import { RESOLVER_VERSION } from '../lib/research/catalyst/collector';
import {
  basisFetchDue,
  deepHistoryDue,
  ensureDailyHistory,
  ensureDeepHistory,
  splitBasisSessions,
} from '../lib/research/historyFetch';
import { openDatabase, getMeta, type MarketDatabase } from '../lib/market/store/db';
import { maybeStartHistoryStore } from '../lib/research/historyStoreJob';
import { maybeStartBoardBasisPass } from '../lib/research/boardBasisPass';
import { countingSec, maybeStartBoardFloatPass } from '../lib/research/boardFloatPass';
import { maybeStartLevelsRefresh } from '../lib/research/levelsRefreshJob';
import { resolveActiveBoard, type BoardDescriptor } from '../lib/market/board';
import {
  tryClaimQueuedJobs,
  clearRetryState,
  completeJob,
  RECOVERY_TRIGGER,
  markJobStage,
  recordCollectorReport,
  readBoardCandidates,
  MATERIAL_TRIGGERS,
  readJobsForDate,
  readOrphanedJobs,
  readSources,
  recordResearchFailure,
  requeueJobForRetry,
  publishResearchHealth,
} from '../lib/market/store/researchRepo';
import type { ResearchHealth } from '../lib/research/types';
import { startReportLoop } from '../lib/desk/reports/job';
import { reportRanges } from '../lib/desk/reports/ranges';
import { createReportModelsV6 } from '../lib/desk/reports/runner';
import { REPORT_WRITER_PROMPT_VERSION_V6 } from '../lib/desk/reports/writerV6';
import { REPORT_CHECKER_PROMPT_VERSION_V6 } from '../lib/desk/reports/check';

const POLL_MS = Number(process.env.RESEARCH_POLL_MS ?? 5000);
/** News re-check cadence. One data request per poll, no model. */
const NEWS_RECHECK_MS = Number(process.env.RESEARCH_NEWS_RECHECK_SECONDS ?? 180) * 1000;
const MAX_CYCLES = Number(process.env.RESEARCH_MAX_CYCLES ?? 0); // 0 = run forever
/*
 * The insider-only float bound (lib/research/floatRun.ts) runs after each job ONLY when this is "on". Off by default:
 * it adds SEC fetches inside the job loop and its memory on the box is not yet measured; turning it on is Ops's call,
 * after the RSS number, on his yes.
 */
const FLOAT_JOB = process.env.RESEARCH_FLOAT_JOB === 'on';

function log(message: string): void {
  console.log(message);
}

/**
 * The board the desk is showing right now.
 *
 * Phase is derived from the clock, exactly as the dashboard derives it; the
 * calendar facts this process cannot look up — is this a trading day, when
 * does it close — travel in the summary the market worker writes. Both
 * processes reading the same resolver is what stops the dashboard showing the
 * after-hours board while the research engine still queues the day's leaders.
 */
function activeBoard(db: MarketDatabase, tradingDate: string): BoardDescriptor {
  let facts: { isTradingDay?: boolean; rthClose?: string; rthCloseMinutes?: number } = {};
  const raw = getMeta(db, 'discovery_summary');
  if (raw) {
    try {
      facts = JSON.parse(raw) as typeof facts;
    } catch {
      facts = {};
    }
  }

  return resolveActiveBoard({ now: new Date(), tradingDate, facts });
}

/**
 * Whether this job may buy a paid web search (his rulings 2026-10-06, `paidSearchCap.ts`): the name's rank and RVOL on
 * the board active NOW, since the ruling gates the search itself, not the trigger that queued the job.
 */
function paidSearchFor(db: MarketDatabase, ticker: string, tradingDate: string, autoRank: number): PaidSearchDecision {
  const board = activeBoard(db, tradingDate);
  const candidate = readBoardCandidates(db, { tradingDate, autoRank, board: board.board }).find((c) => c.ticker === ticker) ?? null;
  return paidSearchDecision({ rank: candidate?.rank ?? null, rvol: candidate?.rvol ?? null });
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

  /*
   * The history store job (resistance-levels spec section 3): its own serial
   * loop, its own Alpaca client at concurrency 1, its own file, and a
   * READ-ONLY connection to market.db. OFF unless HISTORY_STORE_ENABLED is an
   * explicit yes, so this line changes nothing until the flag is set.
   */
  const marketDbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  const historyStore = maybeStartHistoryStore({
    env: process.env,
    marketDbPath,
    log,
    createClient: ({ onRateLimit, symbolsPerCall }) => {
      const credentials = findAlpacaCredentials().credentials;
      return credentials
        ? new AlpacaRestClient(credentials, { concurrency: 1, batchSize: symbolsPerCall, onRateLimit })
        : null;
    },
    openMarketReadonly: (file) => openDatabase(file, { readonly: true }),
  });

  /*
   * The levels refresh (resistance-levels spec section 2): at each 5m close +
   * 20 s, ONE child process (`worker/levels-refresh.ts`) reads market.db
   * read-only and writes the board's rows to history.db. This process only
   * schedules, spawns and relays; a child still running at 270 s is killed.
   * OFF unless LEVELS_REFRESH_ENABLED is "1". Both exits below stop it, which
   * kills a running child, so no exit orphans a writer.
   */
  const levelsRefresh = maybeStartLevelsRefresh(process.env, { log });

  /*
   * The board basis pass (lib/research/boardBasisPass.ts): every 5 min, a
   * deep fetch for each board name whose split basis is due, so names the
   * research queue never picks up stop showing stale levels and blue sky.
   * ON unless BOARD_BASIS_PASS is "off". Both exits below stop it.
   */
  const boardBasis = maybeStartBoardBasisPass(process.env, {
    db,
    fetch: (store, ticker) => ensureDeepHistory(store, ticker),
    log,
  });

  const secClient = new SecClient({ config: config.sec });
  const tickerMap = new TickerMapCache(secClient);
  const discovery = config.model.apiKey
    ? new OpenAiDiscoveryProvider({
        config: config.model,
        // The larger of the two search bills, and until now the only one with
        // no dial reaching it. Null leaves the provider default unchanged.
        searchContextSize: config.model.discoverySearchContext ?? undefined,
      })
    : new NoopDiscoveryProvider();
  // Same transport and tier as discovery, different question entirely.
  const companySourceResolver = config.model.apiKey
    ? new OpenAiCompanySourceResolver({
        config: config.model,
        // Null leaves the provider default. The value is recorded against
        // every call it pays for, so a token comparison across days can tell
        // which configuration produced which bill.
        searchContextSize: config.model.resolverSearchContext ?? undefined,
      })
    : null;
  const interpreter = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, timeoutMs: 300_000 })
    : new NoopInterpreter();
  const escalation = config.model.apiKey
    ? new OpenAiInterpreter({ config: config.model, tier: 'ESCALATION', timeoutMs: 300_000 })
    : null;
  /*
   * News adapters. Alpaca's credentials are the market account's, which this
   * process already reads for history (lib/research/historyFetch.ts). None
   * found means none configured, and every job records exactly that rather
   * than a silent zero. RESEARCH_NEWS=off disables them without a deploy.
   */
  const newsCredentials =
    process.env.RESEARCH_NEWS === 'off' ? null : findAlpacaCredentials().credentials;
  const newsAdapters: NewsAdapter[] = newsCredentials
    ? [new AlpacaNewsAdapter(new AlpacaRestClient(newsCredentials))]
    : [];
  // Rule R-A needs Alpaca's announced splits; without credentials the float job cannot vouch for a split and is skipped.
  const floatSplits = FLOAT_JOB ? findAlpacaCredentials().credentials : null;
  const floatSplitClient = floatSplits ? new AlpacaRestClient(floatSplits) : null;
  if (FLOAT_JOB) log(`[research] float job: ${floatSplitClient ? 'on' : 'SKIPPED (no Alpaca credentials for announced splits)'}`);

  /*
   * The board float pass (lib/research/boardFloatPass.ts; his "yes", Integration chat 2026-10-09T01:13:13Z): every
   * 5 min, a float job for each board name with research and no current float row, once per name per trading date,
   * stopping on the first that stores nothing. Only when the float job itself is on. BOARD_FLOAT_PASS=off disables
   * it. Both exits below stop it.
   */
  const boardFloatRequests = { requests: 0 };
  const boardFloat = floatSplitClient
    ? maybeStartBoardFloatPass(process.env, {
        db,
        run: (ticker, date) => runFloatJob(db, countingSec(secClient, boardFloatRequests), floatSplitClient, ticker, date, log),
        counter: boardFloatRequests,
        log,
      })
    : null;
  log(
    `[research] news: ${
      newsAdapters.length > 0
        ? newsAdapters.map((adapter) => adapter.id).join(', ')
        : process.env.RESEARCH_NEWS === 'off'
          ? 'disabled (RESEARCH_NEWS=off)'
          : 'none (no Alpaca credentials)'
    }`,
  );

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

  /*
   * And retire what recovery cannot reach.
   *
   * `readOrphanedJobs` requeues claimed-and-abandoned work for TODAY. Anything
   * for an earlier date is behind the one-way door -- the claim filter is a
   * single trading date that only moves forward -- so it will never run, never
   * error, and never leave. `2906a59` stopped new ones being created; this
   * clears the ones that predate it.
   *
   * At boot rather than on a schedule, because it is idempotent and the second
   * run retires nothing. Ordering matters and is safe: recovery works on
   * `= bootDate` and this works on `< bootDate`, so they cannot contend.
   */
  if (bootDate) {
    const retirement = retireStrandedJobs(db, { before: bootDate });
    if (retirement.retired > 0) {
      log(
        `[research] retired ${retirement.retired} stranded job(s) behind ${bootDate}: ` +
          retirement.tickers.join(', '),
      );
    }
  }

  let cycles = 0;
  let lastBoard: string | null = null;
  let lastCompletedTicker: string | null = null;
  let lastCompletedAt: string | null = null;
  const latencies: number[] = [];

  // Remembered so the heartbeat below can keep republishing the current state
  // while a long collection is in flight.
  let currentState: ResearchHealth['state'] = 'IDLE';
  let currentActive: string[] = [];
  // Logged on the edge, not per skip: a lock held for minutes would otherwise
  // write one line per poll.
  let healthSkipping = false;

  const publishHealth = () => {
    const tradingDate =
      (db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string | null })
        .d ?? '';
    const jobs = readJobsForDate(db, tradingDate);
    /*
     * Work from any other date that nothing will ever pick up.
     *
     * Counted separately rather than folded into `queuedJobs`, which answers
     * the board's question -- what is pending TODAY -- and must keep answering
     * it. This answers the other one, and it exists because the two were
     * indistinguishable: ten rows sat QUEUED from earlier sessions while
     * `queuedJobs` read 0, and that 0 was used to confirm the desk was idle
     * before a deploy. It happened to be right.
     */
    const stalled = (
      db
        .prepare(
          /*
           * `<` rather than `<>`, and the difference is the whole reading.
           *
           * The 22:00 recap now queues for the NEXT session, so from 22:00
           * until the roll there are legitimately-queued jobs on a date that is
           * not this one. Counting those would make this field report a
           * successful fix as a continuing fault — every night, in exactly the
           * shape the bug had — and it would have matched the previous night's
           * number closely enough to argue against the change that caused it.
           *
           * Stalled means work the worker can never reach. A future date is
           * reached the moment `MAX(trading_date)` rolls; only a past one is
           * behind the one-way door.
           */
          `SELECT COUNT(*) AS n FROM research_jobs
             WHERE trading_date < ?
               AND status IN ('QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING')`,
        )
        .get(tradingDate) as { n: number }
    ).n;
    const written = publishResearchHealth(db, {
      state: currentState,
      queuedJobs: jobs.filter((job) => job.status === 'QUEUED').length,
      stalledJobs: stalled,
      activeJobs: currentActive,
      lastCompletedTicker,
      lastCompletedAt,
      secAvailable: sec.available,
      secDetail: sec.detail,
      secReachable: secClient.reachability.state,
      secReachableDetail: describeReachability(secClient.reachability),
      modelAvailable: model.available,
      modelDetail: model.detail,
      updatedAt: new Date().toISOString(),
    });
    if (written === healthSkipping) {
      healthSkipping = !written;
      log(
        written
          ? '[research] health write resumed'
          : '[research] health write skipped: store busy (another writer holds the lock)',
      );
    }
  };

  const health = (state: ResearchHealth['state'], active: string[]) => {
    currentState = state;
    currentActive = active;
    publishHealth();
  };

  /*
   * A heartbeat, not just a status write.
   *
   * The dashboard can only tell a stopped worker from a quiet one by the age of
   * this row, and the main loop parks inside a collection for minutes at a
   * time. Without an independent tick a healthy worker mid-job would go dark
   * and read as OFFLINE — which is precisely the false alarm that would teach
   * somebody to stop trusting the indicator.
   */
  const heartbeat = setInterval(() => {
    try {
      publishHealth();
    } catch {
      // A heartbeat that cannot write is not worth crashing the worker over;
      // the row going stale is itself the correct signal.
    }
  }, POLL_MS);
  heartbeat.unref?.();

  /*
   * Session reports (lib/desk/reports/job.ts): its own loop, because the
   * research loop below parks inside a collection for minutes and a report is
   * due minutes after its checkpoint. Here because this worker holds the model
   * key; the assess worker stays model-free.
   */
  const reportModelConfig = readReportModelConfig();
  const reportLoop = startReportLoop({
    db,
    ranges: reportRanges().ranges,
    createModels: reportModelConfig.apiKey
      ? (onUsage) => createReportModelsV6(reportModelConfig, onUsage)
      : null,
    versions: {
      writerPrompt: REPORT_WRITER_PROMPT_VERSION_V6,
      checkerPrompt: REPORT_CHECKER_PROMPT_VERSION_V6,
      writerModel: reportModelConfig.writerModel,
      // The configured first checker; each stored report records the checker that actually ran (job.ts).
      checkerModel: reportModelConfig.claudeChecker?.model ?? reportModelConfig.checkerModel,
    },
    log,
  });
  log(
    reportModelConfig.claudeChecker
      ? `[reports] runner started: writer ${reportModelConfig.writerModel}, checker ${reportModelConfig.claudeChecker.model} (Reports key), fallback ${reportModelConfig.checkerModel}`
      : `[reports] runner started: writer ${reportModelConfig.writerModel}, checker ${reportModelConfig.checkerModel} (no Reports key: OpenAI only)`,
  );

  /*
   * Installing a signal listener REPLACES Node's default action, which is to
   * terminate. So a handler added only to tidy up is what removes the exit.
   *
   * This worker was SIGKILLed on every deploy today -- three for three, thirty
   * seconds of systemd waiting each time, then "State 'stop-sigterm' timed out.
   * Killing." mointel-market exits cleanly because its handler calls exit();
   * mointel-assess exits cleanly because it installs no handler at all and
   * inherits the default. This one did the one thing that is worse than either:
   * it enumerated a single task for the way out and thereby took ownership of
   * all of them.
   *
   * Same shape as a denylist. Naming part of what must happen leaves the rest
   * unowned, and the gap is invisible until something falls through it.
   *
   * A SIGKILL mid-job also abandons an in-flight model call -- tokens spent,
   * nothing recorded -- which is its own reason not to leave this.
   */
  const shutdown = (signal: string) => {
    log(`[research] ${signal} received, shutting down`);
    clearInterval(heartbeat);
    reportLoop.stop();
    historyStore?.stop();
    levelsRefresh?.stop();
    boardBasis?.stop();
    boardFloat?.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  log(`[research] worker started, polling every ${POLL_MS}ms\n`);

  let lastNewsRecheck = 0;
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

    /* ---------------------------------------------------------- queue
     *
     * THE BOARD IS DERIVED HERE AND MUST NEVER ARRIVE FROM A REQUEST.
     *
     * `activeBoard(db, tradingDate)` reads the clock. Nothing in this chain
     * takes a caller's choice, and that is the property to preserve rather
     * than a description of today: **this call feeds `readBoardCandidates`,
     * which feeds `queueDiscoveryResearch`, which SPENDS.**
     *
     * The board is not an ordering. `repo.ts:818` and `researchRepo.ts` both
     * put the rank column in the WHERE — `AND ${rankColumn} IS NOT NULL` — so
     * switching it changes the ROSTER, not the sort. A viewer choosing a
     * session on screen is choosing which numbers to read; wiring that same
     * choice to this line would make every viewer's dropdown queue research
     * for a different population, once per subscriber.
     *
     * A session selector belongs to the READ MODEL only. `extraSymbols` is the
     * precedent: a request shapes what is returned without touching the queue.
     *
     * Falsifiable by inspection in one step — if `activeBoard` ever gains a
     * parameter that is not `db` or `tradingDate`, or if a board reaches this
     * scope from anywhere but this line, the guarantee is gone.
     */
    const board = activeBoard(db, tradingDate);
    if (board.board !== lastBoard) {
      log(`[research] following the ${board.title.toUpperCase()} board (${board.rankingLabel})`);
      lastBoard = board.board;
    }

    const candidates = readBoardCandidates(db, {
      tradingDate,
      autoRank: config.autoRank,
      board: board.board,
    });
    const decisions = queueDiscoveryResearch(db, candidates, {
      tradingDate,
      autoRank: config.autoRank,
      board: board.board === 'AFTER_HOURS' ? 'after-hours top' : 'top',
      now: new Date(),
      // The collector's own gate, so a re-ask is never scheduled for a moment
      // when discovery would refuse to pay anyway.
      recheckAfterMs: config.catalyst.webDiscoveryUnresolvedMinutes * 60_000,
    });
    for (const decision of decisions.filter((item) => item.queued)) {
      log(`[research] ${decision.ticker} queued priority=${decision.priority}`);
    }

    /*
     * The news re-check (his ruling 2026-09-28): a poll, not a per-cycle call.
     * The board loop runs every few seconds; the poll runs every
     * NEWS_RECHECK_MS and costs one data request, no model.
     */
    if (newsAdapters.length > 0 && Date.now() - lastNewsRecheck >= NEWS_RECHECK_MS) {
      lastNewsRecheck = Date.now();
      try {
        const recheck = await queueNewsRecheck(db, candidates, newsAdapters, {
          tradingDate,
          autoRank: config.autoRank,
          now: new Date(),
        });
        log(`[news-recheck] ${recheck.detail}; queued ${recheck.queued.length}`);
        for (const hit of recheck.queued) {
          log(`[news-recheck] ${hit.ticker} queued on "${hit.headline.slice(0, 100)}"`);
        }
      } catch (error) {
        // A poll must never take the research loop down with it.
        log(`[news-recheck] failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    /*
     * Recovery rides the same queue as ordinary research, after the board has
     * had first claim on the cycle's slots. A faded name must never displace a
     * name the desk is ranking right now.
     */
    for (const recovered of queueResolverRecovery(db, {
      tradingDate,
      resolverVersion: RESOLVER_VERSION,
      now: new Date(),
    }).filter((item) => item.queued)) {
      log(`[research] ${recovered.ticker} queued for resolver recovery`);
    }

    // ---------------------------------------------------------- work
    const claimed = tryClaimQueuedJobs(
      db,
      tradingDate,
      config.concurrency,
      new Date().toISOString(),
    );

    if (claimed === 'busy') {
      // The claim rolled back whole; every job is still QUEUED. Try next poll.
      log('[research] claim skipped: store busy (another writer holds the lock)');
      if (MAX_CYCLES > 0 && cycles >= MAX_CYCLES) break;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      continue;
    }

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
          /*
           * Logged whatever the outcome, because the outcomes that matter are
           * the quiet ones.
           *
           * `ensureDailyHistory` REPORTS failure rather than throwing -- cycle
           * context is enrichment and losing it must not fail a job whose SEC
           * and catalyst evidence collected fine. Gated on `fetched`, that
           * design became invisible: a healed symbol logged, while a failed
           * Alpaca fetch and an already-current skip were both silent. So a
           * symbol still holding a partial bar meant either the healing branch
           * did not fire or the fetch failed, and the log could not say which.
           *
           * `detail` already separates all four outcomes -- 'already current',
           * 'no Alpaca credentials', the session count, and the error. Only
           * this line was discarding them.
           *
           * `worker/research-interpret.ts:153` logged it unconditionally all
           * along. Same call, two workers, and the quiet one was the one
           * running in production.
           */
          log(`[history] ${job.ticker} ${history.detail}`);

          /*
           * Full depth, on either of TWO triggers into one mechanism.
           *
           * The BASIS trigger: a researched name whose split basis is not yet
           * established gets the dual-adjustment fetch once, whatever its rank
           * or price -- decoupled from the blue-sky gate on the trader's
           * 2026-08-27 approval, because the supply pair's basis check needs
           * per-session factors and the blue-sky gate would ever have fired
           * for none of the 55 rows that would render a pair. Roughly two REST
           * calls once per ticker forever; the one-off backfill for
           * already-researched names is `worker/basis-backfill.ts`.
           *
           * The BLUE-SKY trigger, unchanged: a name that is both running and
           * not already disproved. Blue sky asks "has this price ever been
           * exceeded", and ninety sessions cannot answer "ever" -- BTCT read
           * as blue sky at $1.71 against an $1.80 ninety-session ceiling while
           * the same symbol had traded at $26.58 two years earlier on today's
           * basis. Gated because the gate is what makes refetching a whole
           * history per pass affordable: it fires on about 3% of top-10 slots.
           *
           * After the shallow pass, not instead of it. The shallow one heals a
           * partial bar and is what every other consumer depends on.
           */
          const basisDue = basisFetchDue(db, job.ticker);
          const deepDue = basisDue.due ? basisDue : deepHistoryDue(db, job.ticker, job.tradingDate);
          if (deepDue.due) {
            const deep = await ensureDeepHistory(db, job.ticker);
            /*
             * The trigger reason and the OUTCOME, labelled as two different
             * things.
             *
             * This line used to print `deepDue.reason` bare, which is
             * evaluated BEFORE the fetch and therefore reads as a verdict on
             * it: a symbol that established a basis logged "(no split basis
             * established)" identically to one that did not. On 2026-09-03 it
             * cost Ops an investigation -- SVRN found four split events and
             * still printed the failure-shaped line -- and it is the desk's
             * most-repeated defect, an observable that cannot distinguish a
             * thing from its failure.
             *
             * The post-state is asked of the STORE rather than inferred from
             * the fetch result, because a fetch can succeed and derive
             * nothing: bars returned with no usable raw closes yield no
             * factors, and "fetched" is not the claim this line makes.
             */
            const basisSessions = splitBasisSessions(db, job.ticker);
            log(
              `[history] ${job.ticker} deep: ${deep.detail} (due: ${deepDue.reason}; ` +
                `basis after: ${
                  basisSessions > 0
                    ? `established on ${basisSessions} session(s)`
                    : 'STILL UNESTABLISHED'
                })`,
            );
          }

          // ----- collection
          log(`[research] ${job.ticker} collecting sources`);
          await collectSecEvidence(db, secClient, tickerMap, {
            ticker: job.ticker,
            expectedName: universe?.name ?? null,
            expectedExchange: universe?.exchange ?? null,
          });
          /*
           * The trigger travels with the job, and this is the line that was
           * missing.
           *
           * The collector has always accepted a materialEvent — an early,
           * ahead-of-interval look for a name that just did something — and
           * production never supplied one, so that path and the urgent
           * first-qualification path built on top of it were both dead. ENRD
           * qualified at 06:32 and was analysed twenty seconds later holding
           * SEC evidence that stopped on 21 July.
           *
           * It is read from the job rather than recomputed from current rank:
           * a name can qualify at 06:32 and be down ten places by the time the
           * job runs, and the question the collector needs answered is what
           * justified the work, not where the ticker sits now.
           */
          const catalystReport = await collectCatalystEvidence(
            db,
            secClient,
            discovery,
            companySourceResolver,
            { sec: config.sec, catalyst: config.catalyst },
            {
              ticker: job.ticker,
              companyName: universe?.name ?? null,
              tradingDate,
              // Narrowed against the union rather than cast: an unrecognised
              // value in the column must read as "no material episode", not as
              // a trigger the collector has never heard of.
              jobId: job.id,
            recoveryEpisode: job.trigger === RECOVERY_TRIGGER,
            materialEvent: MATERIAL_TRIGGERS.has(job.trigger ?? '')
                ? {
                    kind: job.trigger as MaterialDemandEvent['kind'],
                    detail: job.reason,
                  }
                : null,
              paidSearch: paidSearchFor(db, job.ticker, tradingDate, config.autoRank),
            },
            newsAdapters,
          );

          // Stop discarding what the collector worked out. One line, and it is
          // the difference between diagnosing the next incident and repeating
          // this investigation.
          log(
            `[catalyst] ${job.ticker} mode=${catalystReport.discoveryMode ?? 'none'} ` +
              `trigger=${catalystReport.discoveryTrigger ?? 'none'} ` +
              `sources+${catalystReport.newSourceCount} ` +
              `fingerprint=${catalystReport.fingerprintChanged ? 'changed' : 'unchanged'} ` +
              `models=${catalystReport.modelCalls} · ${catalystReport.companySourceDetail}`,
          );

          /*
           * The same facts, stored where a reader can reach them.
           *
           * The line above only existed in journald, so proving a resolution
           * had happened meant an SSH session — which is exactly what was
           * unavailable when it mattered.
           */
          recordCollectorReport(db, job.id, {
            discoveryMode: catalystReport.discoveryMode,
            paidSourcesFound: catalystReport.paidSourcesFound,
            discoveryDetail: catalystReport.discoveryDetail,
            companySourceDetail: catalystReport.companySourceDetail,
            companyFetchDetail: catalystReport.companyFetchDetail,
            newsFetchDetail: catalystReport.newsFetchDetail,
            networkRequests: catalystReport.networkRequests,
            resolutionProbes: catalystReport.resolutionProbes,
            companySourceUrl:
              catalystReport.companySources.feedUrl ??
              catalystReport.companySources.pressReleaseIndexUrl ??
              catalystReport.companySources.newsroomUrl,
            companySourceShape: catalystReport.companySources.sourceShape,
            modelCalls: catalystReport.modelCalls,
            sourcesAdded: catalystReport.newSourceCount,
            fingerprintChanged: catalystReport.fingerprintChanged,
            state: catalystReport.state,
          });

          markJobStage(db, job.id, 'SOURCES_READY', new Date().toISOString());
          log(`[research] ${job.ticker} sources ready`);

          // ----- interpretation
          markJobStage(db, job.id, 'ANALYZING', new Date().toISOString());
          const report = await interpretTicker(db, interpreter, escalation, {
            /*
             * THE OWNER OF THE SPEND, AND THE REASON FOR IT.
             *
             * Both were declared on `InterpretOptions` and passed by nobody, so
             * every interpretation wrote a row with a null owner: 1,335 of
             * 3,334 `model_usage` rows unjoinable to a job, and they are the
             * INTERPRETATION half -- terra and sol, ~78% of cost by measurement
             * on 2026-09-07. The collector eleven lines above has always passed
             * `jobId`, which is why the cheap half joins and the expensive half
             * does not.
             *
             * `trigger` is the same omission in the adjacent field: 1,433 rows
             * carry no purpose, so spend could not be grouped by why the job
             * existed either. Fixed together because leaving it would repair
             * the join and leave the grouping, and the next reader would have
             * to rediscover that the type declares both.
             */
            jobId: job.id,
            trigger: job.trigger,
            ticker: job.ticker,
            tradingDate,
            // Sheet removal (A5): no human prior, and no Sheet comparison or its escalation.
            priorHumanAnalysis: null,
            promptVariant: config.model.promptVariant,
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

          // After the job is complete, so the board never waits on it; runFloatJob never throws.
          if (floatSplitClient) await runFloatJob(db, secClient, floatSplitClient, job.ticker, tradingDate, log);

          if (report.dossier) {
            // It works now, so whatever it failed on before is history.
            clearRetryState(db, job.ticker, tradingDate);
            lastCompletedTicker = job.ticker;
            lastCompletedAt = acceptedAt;
            latencies.push(Date.now() - started);
          } else if (status === 'FAILED') {
            const state = recordResearchFailure(db, {
              ticker: job.ticker,
              tradingDate,
              evidenceFingerprint:
                report.evidenceFingerprint ?? computeEvidenceFingerprint(readSources(db, job.ticker)),
              error: report.error ?? null,
              now: new Date(),
            });
            log(`[research] ${job.ticker} failure ${state.attempts} recorded`);
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

          /*
           * A thrown failure never reached a fingerprint of its own, so the
           * evidence on file is used instead. Without this the count would be
           * keyed on '' and a crash loop would look like the same failure even
           * after new filings arrived.
           */
          const state = recordResearchFailure(db, {
            ticker: job.ticker,
            tradingDate,
            evidenceFingerprint: computeEvidenceFingerprint(readSources(db, job.ticker)),
            error: message,
            now: new Date(),
          });
          log(
            `[research] ${job.ticker} failure ${state.attempts} recorded` +
              (state.nextAttemptAt ? `, next attempt after ${state.nextAttemptAt}` : ''),
          );
        }
      }),
    );

    health('IDLE', []);
    if (MAX_CYCLES > 0 && cycles >= MAX_CYCLES) break;
  }

  log('[research] worker stopped');
  historyStore?.stop();
  levelsRefresh?.stop();
  boardBasis?.stop();
  boardFloat?.stop();
  db.close();
}

main().catch((error) => {
  console.error('[research] fatal:', error);
  process.exitCode = 1;
});
