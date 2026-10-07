/**
 * `npm run assessments`
 *
 * The Desk Assessment worker.
 *
 * The trader used to reassess the board at fixed points of the day — 06:10,
 * 06:25, 06:45, 07:00, 09:25, every half hour through the session, at the
 * close, and again at 22:00 for the next day. Those checkpoints were a habit
 * held in a spreadsheet. This makes them a subsystem: they happen on time,
 * they are recorded, they say what changed since the last one, and they
 * survive a restart without duplicating or inventing anything.
 *
 * What this worker is NOT: a polling loop for market data. Prices, ranks,
 * levels, events and research all keep moving continuously between
 * checkpoints. An assessment is a persisted answer to a different question —
 * "what does the desk believe matters at this checkpoint, and what changed
 * since the previous one?"
 *
 * Cost discipline is structural rather than hoped for: this worker makes no
 * model calls at all. Its change detection is deterministic, and when a cycle
 * genuinely needs re-looking it enqueues a research job, leaving the research
 * pipeline's own evidence fingerprint to decide whether a model is worth
 * running.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import { boardForPhase } from '../lib/market/board';
import { closeMinutesFromClock, RTH_END_MIN } from '../lib/market/session';
import { getMeta, openDatabase, type MarketDatabase } from '../lib/market/store/db';
import { insertDeskEvents } from '../lib/market/store/repo';
import type { PriceRange } from '../lib/market/rangeRank';
import { captureRanges, rangeOnlySymbols, reassessmentTargets } from '../lib/desk/rangeCapture';
import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentRanges,
  insertAssessmentTickers,
  readAssessmentTickers,
  readClaimedSlots,
  readPreviousAssessment,
  recordMissedAssessment,
  writeAssessmentHealth,
  type AssessmentHealth,
  type AssessmentRangeRecord,
  type AssessmentTickerRecord,
} from '../lib/market/store/assessmentRepo';
import {
  enqueueResearchJob,
  INTERVAL_RECHECK,
  readCurrentAnalyses,
  readLatestJobForTicker,
  readSources,
} from '../lib/market/store/researchRepo';
import {
  candidateTradingDates,
  nextTradingDate,
} from '../lib/desk/checkpointDates';
import { computeEvidenceFingerprint } from '../lib/research/fingerprint';
import { resolveDisplayStatus } from '../lib/research/view';
import {
  buildSchedule,
  dueAssessments,
  expiredAssessments,
  nextAssessment,
  slotKey,
  type ScheduledAssessment,
} from '../lib/desk/schedule';
import {
  commentary,
  cycleFingerprint,
  detectChanges,
  encodeLevels,
  marketFingerprint,
  researchFingerprint,
  supportCandidatesBelow,
} from '../lib/desk/assessment';

const POLL_MS = Number(process.env.ASSESSMENT_POLL_MS ?? 20_000);
const MAX_CYCLES = Number(process.env.ASSESSMENT_MAX_CYCLES ?? 0); // 0 = forever
/** A RUNNING row older than this belonged to a worker that died. */
const STALE_RUNNING_MS = 10 * 60_000;
/**
 * Past this, a run is filling in a gap rather than merely starting late.
 *
 * `generatedLate` fires after 90 seconds and catches an ordinary slow tick.
 * This marks the runs a backtest must treat differently: a 06:10 refresh that
 * began at 08:30 recorded a different market than one that began at 06:10:04.
 */
const CATCH_UP_AFTER_SECONDS = 300;

function log(message: string): void {
  console.log(message);
}

/**
 * Which board an assessment ranks by.
 *
 * Driven by what the checkpoint is FOR, not only by the clock. The 22:00 recap
 * summarises the completed after-hours session even though 22:00 itself is
 * after it; the close assessment freezes the regular session even though the
 * evening has technically begun by the time it runs.
 */
function boardForAssessment(scheduled: ScheduledAssessment) {
  if (scheduled.type === 'NEXT_DAY_RECAP' || scheduled.type === 'AFTER_HOURS_CLOSE') {
    return boardForPhase('AFTER_HOURS');
  }
  if (scheduled.type === 'RTH_CLOSE') {
    return boardForPhase('RTH');
  }
  return boardForPhase(scheduled.sessionPhase);
}

interface SessionFacts {
  isTradingDay?: boolean;
  rthClose?: string;
  rthCloseMinutes?: number;
  discoveryRank?: number;
}

function sessionFacts(db: MarketDatabase): SessionFacts {
  const raw = getMeta(db, 'discovery_summary');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SessionFacts;
  } catch {
    return {};
  }
}

function closeMinutesFor(db: MarketDatabase, date: string): number {
  const raw = getMeta(db, 'calendar');
  if (raw) {
    try {
      const days = JSON.parse(raw) as Array<{ date: string; close?: string }>;
      const day = days.find((entry) => entry.date === date);
      if (day) return closeMinutesFromClock(day.close ?? null);
    } catch {
      /* fall through to the session summary */
    }
  }
  const facts = sessionFacts(db);
  return facts.rthCloseMinutes ?? closeMinutesFromClock(facts.rthClose ?? null) ?? RTH_END_MIN;
}

interface TickerRow {
  symbol: string;
  rvol: number | null;
  rvol_rank: number | null;
  ah_rank: number | null;
  ah_percent_change: number | null;
  ah_volume: number | null;
  ah_participation: number | null;
  price: number | null;
  percent_change: number | null;
  cumulative_volume: number | null;
  spread_pct: number | null;
  session_high: number | null;
  session_low: number | null;
  reference_rth_close: number | null;
  reference_rth_close_basis: string | null;
  price_at: string | null;
  rth_final_close: number | null;
  halt_state: string | null;
  ah_reference_close: number | null;
  ah_high: number | null;
  ah_low: number | null;
}

const TICKER_COLUMNS = `symbol, rvol, rvol_rank, ah_rank, ah_percent_change, ah_volume, ah_participation,
              price, percent_change, cumulative_volume, spread_pct, session_high, session_low,
              reference_rth_close, reference_rth_close_basis, price_at,
              rth_final_close, halt_state, ah_reference_close, ah_high, ah_low`;

/**
 * Captures one checkpoint.
 *
 * Reads the active board's population plus the trader's Focus list, folds in
 * whatever research is currently accepted, and diffs the result against the
 * previous assessment. No network, no model, one pass over the store.
 */
function captureAssessment(
  db: MarketDatabase,
  options: {
    scheduled: ScheduledAssessment;
    board: ReturnType<typeof boardForPhase>;
    discoveryRank: number;
    captureCount: number;
    ranges: readonly PriceRange[];
  },
): { records: AssessmentTickerRecord[]; reassess: string[]; ranges: AssessmentRangeRecord[] } {
  const { scheduled, board, discoveryRank, captureCount } = options;
  const rankColumn = board.rankColumn;

  const rows = db
    .prepare(
      `SELECT ${TICKER_COLUMNS}
         FROM ticker_session
        WHERE trading_date = @tradingDate
          AND ${rankColumn} IS NOT NULL AND ${rankColumn} <= @limit
        ORDER BY ${rankColumn} IS NULL, ${rankColumn} ASC`,
    )
    .all({ tradingDate: scheduled.tradingDate, limit: captureCount }) as TickerRow[];

  // Each range's own top names get a row too (rangeOnlySymbols); they are
  // captured, never reassessed (reassessmentTargets).
  const rangeRecords = captureRanges(db, scheduled.tradingDate, board, options.ranges);
  const inBand = new Set(rows.map((row) => row.symbol));
  const rangeOnly = rangeOnlySymbols([...inBand], rangeRecords);
  if (rangeOnly.length > 0) {
    const extra = db
      .prepare(
        `SELECT ${TICKER_COLUMNS}
           FROM ticker_session
          WHERE trading_date = ? AND symbol IN (${rangeOnly.map(() => '?').join(', ')})`,
      )
      .all(scheduled.tradingDate, ...rangeOnly) as TickerRow[];
    rows.push(...extra);
  }

  const tickers = rows.map((row) => row.symbol);
  const analyses = readCurrentAnalyses(db, tickers);

  // The previous checkpoint is what "changed since" is measured against.
  const previous = readPreviousAssessment(db, scheduled.tradingDate, scheduled.scheduledFor);
  const previousByTicker = new Map(
    (previous ? readAssessmentTickers(db, previous.id) : []).map((record) => [
      record.ticker,
      record,
    ]),
  );

  const records: AssessmentTickerRecord[] = [];
  const wanted: string[] = [];

  rows.forEach((row, index) => {
    const analysis = analyses.get(row.symbol) ?? null;
    const dossier = analysis?.dossier ?? null;
    const job = readLatestJobForTicker(db, row.symbol, scheduled.tradingDate);

    const assessmentRank =
      board.board === 'AFTER_HOURS' ? row.ah_rank : row.rvol_rank;

    /*
     * Nearest levels either side of price, from facts this worker can see.
     * Research levels are folded in only when an analysis established them —
     * a 52-week high is not this session's resistance.
     */
    const candidatesBelow = supportCandidatesBelow({
      price: row.price,
      sessionLow: row.session_low,
      referenceRthClose: row.reference_rth_close,
      referenceRthCloseBasis: row.reference_rth_close_basis,
      rthFinalClose: row.rth_final_close,
    });
    const candidatesAbove = [
      row.session_high,
      dossier?.cycle.currentCycleHigh ?? null,
      dossier?.cycle.historicalResistance ?? null,
    ].filter((value): value is number => value !== null && row.price !== null && value > row.price);

    const support = candidatesBelow.length > 0 ? Math.max(...candidatesBelow) : null;
    const resistance = candidatesAbove.length > 0 ? Math.min(...candidatesAbove) : null;

    const supportLost =
      support !== null && row.price !== null ? row.price < support : false;

    const evidenceHash = computeEvidenceFingerprint(readSources(db, row.symbol));

    const record: AssessmentTickerRecord = {
      ticker: row.symbol,
      assessmentRank: assessmentRank ?? null,
      // Identical here, and kept separate anyway: an experimental ordering must
      // never be mistaken for the board the desk was actually showing.
      liveSessionRank: assessmentRank ?? null,
      price: row.price,
      percentChange: row.percent_change,
      rvol: row.rvol,
      rvolRank: row.rvol_rank,
      ahPercentChange: row.ah_percent_change,
      ahVolume: row.ah_volume,
      ahParticipation: row.ah_participation,
      ahRank: row.ah_rank,
      volume: row.cumulative_volume,
      spreadPct: row.spread_pct,
      sessionHigh: row.session_high,
      sessionLow: row.session_low,
      // A snapshot has to be able to say what its own percent change was
      // measured against, and when the data behind it was observed, without
      // consulting live state that has since moved on.
      referenceClose: row.reference_rth_close,
      referenceBasis: row.reference_rth_close_basis,
      priceAt: row.price_at,
      cycle: dossier?.cycle.cycleClassification ?? null,
      catalyst: dossier?.catalyst.catalystGrade ?? null,
      structure: dossier?.structure.structureClassification ?? null,
      intelligenceStatus: resolveDisplayStatus({
        job,
        hasAnalysis: analysis !== null,
        coverageIncomplete: analysis?.metadata.coverageIncomplete === true,
        conflict: false,
      }),
      intelligenceSource: analysis ? 'AUTO' : 'NONE',
      analysisVersionId: analysis?.id ?? null,
      evidenceFingerprint: evidenceHash,
      cycleFingerprint: cycleFingerprint({
        price: row.price,
        sessionHigh: row.session_high,
        sessionLow: row.session_low,
        haltState: row.halt_state,
        rank: assessmentRank ?? null,
        participation:
          board.board === 'AFTER_HOURS' ? row.ah_participation : row.rvol,
        supportLost,
      }),
      levelSummary: encodeLevels({
        support,
        resistance,
        label: `${support === null ? '—' : support.toFixed(2)} / ${
          resistance === null ? '—' : resistance.toFixed(2)
        }`,
      }),
      haltState: row.halt_state,
      // ALWAYS FALSE, AND THE COLUMN IS KEPT RATHER THAN DROPPED. A pin is
      // cosmetic and browser-held, so the worker cannot observe one: the old pin
      // table is orphaned and nothing writes it any more. The column stays
      // because assessments are history and a stored true from before the ruling
      // is a fact about that day, not a bug to erase.
      //
      // The table's name is deliberately not written here: the guard in
      // tests/desk/assessmentStore.test.ts greps this file for it, and a comment
      // naming it would trip a check meant to catch a query.
      focus: false,
      warnings: [
        ...(dossier?.structure.structuralWarnings ?? []),
        ...(dossier?.cycle.cycleWarnings ?? []),
      ].slice(0, 6),
      changedFields: [],
      changeSummary: '',
      ahReferenceClose: row.ah_reference_close,
      ahHigh: row.ah_high,
      ahLow: row.ah_low,
    };

    const change = detectChanges({
      current: record,
      previous: previousByTicker.get(row.symbol) ?? null,
      discoveryRank,
      boardLabel: board.board === 'AFTER_HOURS' ? 'after-hours' : 'discovery',
    });

    record.changedFields = change.changedFields;
    record.changeSummary = change.summary;
    if (change.cycleReassessmentNeeded) wanted.push(row.symbol);

    // Rank order is the capture order; index keeps ties stable.
    void index;
    records.push(record);
  });

  return { records, reassess: reassessmentTargets(wanted, inBand), ranges: rangeRecords };
}

/**
 * The 06:10 structural refresh's target set.
 *
 * Deliberately bounded and deterministic. Deep-analysing thirteen thousand
 * stocks at 06:10 is not a structural refresh, it is a bill — and the names
 * that matter are knowable: what last night's recap carried, what the trader
 * is watching, what is already moving this morning, and anything whose source
 * evidence has changed since it was last looked at.
 */
function structuralRefreshTargets(
  db: MarketDatabase,
  options: { tradingDate: string; previousDate: string | null; breadth: number },
): string[] {
  const targets = new Set<string>();

  if (options.previousDate) {
    const recap = db
      .prepare(
        `SELECT t.ticker FROM desk_assessment_tickers t
           JOIN desk_assessments a ON a.id = t.assessment_id
          WHERE a.trading_date = ? AND a.assessment_type = 'NEXT_DAY_RECAP'
          ORDER BY t.assessment_rank IS NULL, t.assessment_rank ASC
          LIMIT ?`,
      )
      .all(options.previousDate, options.breadth) as Array<{ ticker: string }>;
    for (const row of recap) targets.add(row.ticker);
  }

  const premarket = db
    .prepare(
      `SELECT symbol FROM ticker_session
        WHERE trading_date = ? AND rvol_rank IS NOT NULL AND rvol_rank <= ?
        ORDER BY rvol_rank ASC`,
    )
    .all(options.tradingDate, options.breadth) as Array<{ symbol: string }>;
  for (const row of premarket) targets.add(row.symbol);

  return [...targets];
}

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const db = openDatabase(config.dbPath, {
    onSchemaBackup: (info) =>
      log(`[store] schema v${info.fromVersion}→v${info.toVersion}, backup ${info.path}`),
  });

  log(`[assess] worker started, checking every ${POLL_MS / 1000}s`);

  let cycles = 0;
  let lastError: string | null = null;
  let lastType: string | null = null;
  let lastAt: string | null = null;

  for (;;) {
    cycles += 1;
    const now = new Date();

    try {
      const facts = sessionFacts(db);
      const discoveryRank = facts.discoveryRank ?? config.discoveryRank;
      const dates = candidateTradingDates(db);

      let health: AssessmentHealth = {
        state: 'IDLE',
        tradingDate: dates[dates.length - 1] ?? '',
        lastAssessmentType: lastType,
        lastAssessmentAt: lastAt,
        nextAssessmentType: null,
        nextAssessmentAt: null,
        lastError,
        updatedAt: now.toISOString(),
      };

      for (const tradingDate of dates) {
        const schedule = buildSchedule({
          tradingDate,
          closeMinutes: closeMinutesFor(db, tradingDate),
          nextTradingDate: nextTradingDate(db, tradingDate),
        });

        // Only the session the desk is currently facing drives the "next"
        // indicator; a finished day has nothing left to look forward to.
        if (tradingDate === dates[dates.length - 1]) {
          const upcoming = nextAssessment(schedule, now);
          health.nextAssessmentType = upcoming?.type ?? null;
          health.nextAssessmentAt = upcoming?.scheduledFor ?? null;
        }

        const claimed = readClaimedSlots(db, tradingDate);

        /*
         * Reconcile first, on every cycle and therefore on every startup.
         *
         * A checkpoint whose window has closed is written down as missed
         * before anything else runs, so the gap survives in the ledger instead
         * of being inferable only from an absence. This is what was missing
         * when two 22:00 recaps vanished: nothing ran, and nothing recorded
         * that nothing ran.
         */
        for (const expired of expiredAssessments({ schedule, now, completed: claimed })) {
          const first = recordMissedAssessment(db, {
            tradingDate: expired.scheduled.tradingDate,
            targetTradingDate: expired.scheduled.targetTradingDate,
            assessmentType: expired.scheduled.type,
            scheduledFor: expired.scheduled.scheduledFor,
            sessionPhase: expired.scheduled.sessionPhase,
            board: boardForAssessment(expired.scheduled).board,
            reason: expired.reason,
            recordedAt: now.toISOString(),
          });
          if (first) {
            log(
              `[assess] MISSED ${expired.scheduled.type} for ${expired.scheduled.tradingDate} ` +
                `(${expired.scheduled.clock} ET): ${expired.reason}`,
            );
          }
        }

        const due = dueAssessments({
          schedule,
          now,
          completed: claimed,
        });

        for (const item of due) {
          health = { ...health, state: 'WORKING' };
          writeAssessmentHealth(db, health);

          const ran = runAssessment(db, {
            item,
            discoveryRank,
            captureCount: Math.max(discoveryRank * 2, 25),
            // The configured set range(s). Today one: the board's default.
            ranges: [{ min: config.boardDefaultMin, max: config.boardDefaultMax }],
            previousDate:
              dates.length > 1 && tradingDate === dates[dates.length - 1] ? dates[0] : null,
          });

          if (ran) {
            lastType = item.scheduled.type;
            lastAt = new Date().toISOString();
            health.lastAssessmentType = lastType;
            health.lastAssessmentAt = lastAt;
          }
        }
      }

      lastError = null;
      writeAssessmentHealth(db, { ...health, state: 'IDLE', lastError: null });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      log(`[assess] cycle failed: ${lastError}`);
      try {
        writeAssessmentHealth(db, {
          state: 'ERROR',
          tradingDate: '',
          lastAssessmentType: lastType,
          lastAssessmentAt: lastAt,
          nextAssessmentType: null,
          nextAssessmentAt: null,
          lastError,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // A health row that cannot be written is itself the signal.
      }
    }

    if (MAX_CYCLES > 0 && cycles >= MAX_CYCLES) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  log('[assess] worker stopped');
  db.close();
}

/** Runs one due checkpoint. Returns false when another worker owned the slot. */
function runAssessment(
  db: MarketDatabase,
  options: {
    item: ReturnType<typeof dueAssessments>[number];
    discoveryRank: number;
    captureCount: number;
    ranges: readonly PriceRange[];
    previousDate: string | null;
  },
): boolean {
  const { item, discoveryRank, captureCount } = options;
  const scheduled = item.scheduled;
  const board = boardForAssessment(scheduled);
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const id = claimAssessmentSlot(db, {
    tradingDate: scheduled.tradingDate,
    targetTradingDate: scheduled.targetTradingDate,
    assessmentType: scheduled.type,
    scheduledFor: scheduled.scheduledFor,
    startedAt,
    generatedLate: item.generatedLate,
    catchUp: item.lateBySeconds > CATCH_UP_AFTER_SECONDS,
    sessionPhase: scheduled.sessionPhase,
    board: board.board,
    rankingDefinition: board.rankingLabel,
    staleRunningBefore: new Date(startMs - STALE_RUNNING_MS).toISOString(),
  });

  if (id === null) return false;

  try {
    return captureAndPersist(db, { id, item, board, discoveryRank, captureCount, startMs, options });
  } catch (error) {
    /*
     * A failure is recorded as one.
     *
     * Leaving the row RUNNING would make the slot look taken while holding
     * nothing, and the next worker would only reclaim it after the ten-minute
     * abandonment window. Marking it FAILED says what happened and lets the
     * catch-up window decide whether another attempt is still worth making.
     */
    const message = error instanceof Error ? error.message : String(error);
    log(`[assess] ${scheduled.type} ${scheduled.clock} ET FAILED: ${message}`);
    completeAssessment(db, id, {
      completedAt: new Date().toISOString(),
      status: 'FAILED',
      tickerCount: 0,
      modelCalls: 0,
      runtimeMs: Date.now() - startMs,
      marketFingerprint: null,
      researchFingerprint: null,
      notes: message.slice(0, 500),
      metadata: { error: message.slice(0, 500), generatedLate: item.generatedLate },
    });
    throw error;
  }
}

function captureAndPersist(
  db: MarketDatabase,
  context: {
    id: number;
    item: ReturnType<typeof dueAssessments>[number];
    board: ReturnType<typeof boardForPhase>;
    discoveryRank: number;
    captureCount: number;
    startMs: number;
    options: { previousDate: string | null; ranges: readonly PriceRange[] };
  },
): boolean {
  const { id, item, board, discoveryRank, captureCount, startMs, options } = context;
  const scheduled = item.scheduled;

  const { records, reassess, ranges } = captureAssessment(db, {
    scheduled,
    board,
    discoveryRank,
    captureCount,
    ranges: options.ranges,
  });

  insertAssessmentTickers(db, id, records);
  insertAssessmentRanges(db, id, ranges);

  /*
   * Structural refresh and cycle re-looks are ENQUEUED, never performed here.
   *
   * That keeps this worker free of model calls entirely and leaves the
   * decision about whether an analysis is worth paying for where the evidence
   * fingerprint already lives.
   */
  const queued: string[] = [];

  /*
   * The session a queued job is FOR, which is not always the one being
   * summarised.
   *
   * The research worker claims for exactly one date — `MAX(trading_date)` from
   * `ticker_session`, recomputed each cycle — and that value only ever moves
   * forward. Nothing lowers it, nothing sweeps behind it, and a job not claimed
   * before the roll is unreachable permanently, with no error.
   *
   * The 22:00 recap was queueing for the session it summarises, at the end of
   * that session, which put every job it created into a race against the roll.
   * Measured on 2026-08-17: ids 41-48 queued together, claimed in pairs at
   * concurrency 2, and 47/48 were simply next when the door shut. 2 stranded
   * that night, 8 on 08-21, 6 on 08-24 — whatever remained in the batch.
   *
   * `NEXT_DAY_RECAP` is the only checkpoint carrying a target, and preparing
   * tomorrow is what it already means, so this makes the data match the intent
   * rather than widening a filter to compensate. The job waits on the far side
   * of the door instead of racing it.
   *
   * The fallback is the current session because that reproduces today's
   * behaviour, which is the right thing to fail to: `nextTradingDate` reads the
   * cached market calendar and returns null past its horizon.
   */
  const queueFor = scheduled.targetTradingDate ?? scheduled.tradingDate;

  const enqueue = (ticker: string, reason: string) => {
    const jobId = enqueueResearchJob(db, {
      ticker,
      tradingDate: queueFor,
      priority: 0,
      reason,
      queuedAt: new Date().toISOString(),
      top12At: null,
      /*
       * Structural refreshes and cycle re-looks are exactly what the name says:
       * the desk asking again. Naming them keeps their model spend attributable
       * without promoting them to demand events, which they are not.
       */
      trigger: INTERVAL_RECHECK,
    });
    if (jobId !== null) queued.push(ticker);
  };

  if (scheduled.type === 'STRUCTURAL_REFRESH') {
    const targets = structuralRefreshTargets(db, {
      tradingDate: scheduled.tradingDate,
      previousDate: options.previousDate,
      breadth: Math.max(discoveryRank * 2, 25),
    });
    for (const ticker of targets) enqueue(ticker, 'structural refresh 06:10');
  }

  for (const ticker of reassess) enqueue(ticker, `cycle context changed at ${scheduled.clock}`);

  const lines = commentary(records);
  const runtimeMs = Date.now() - startMs;

  completeAssessment(db, id, {
    completedAt: new Date().toISOString(),
    status: 'COMPLETE',
    tickerCount: records.length,
    // Structurally zero: this worker never calls a model. Recorded rather than
    // assumed, so the claim stays checkable.
    modelCalls: 0,
    runtimeMs,
    marketFingerprint: marketFingerprint(records),
    researchFingerprint: researchFingerprint(records),
    notes: lines.join(' '),
    metadata: {
      generatedLate: item.generatedLate,
      lateBySeconds: item.lateBySeconds,
      // The intervals the desk was absent for. Recorded, never manufactured.
      missedSlots: item.missed.map((missed) => missed.scheduledFor),
      reassessmentRequests: reassess,
      researchQueued: queued,
      commentary: lines,
      experimental: scheduled.type === 'OPEN_SPIKE_ASSESSMENT' ? 'ORDERING_UNVALIDATED' : null,
    },
  });

  const top = records.filter((record) => record.assessmentRank !== null).slice(0, 3);
  insertDeskEvents(db, [
    {
      tradingDate: scheduled.tradingDate,
      ts: new Date().toISOString(),
      type: 'DESK_ASSESSMENT',
      symbol: 'DESK',
      message:
        `${scheduled.label} (${scheduled.clock} ET) — ${records.length} names on ${board.rankingLabel}` +
        (item.generatedLate ? ` · generated late by ${item.lateBySeconds}s` : '') +
        (top.length > 0 ? `: ${top.map((r) => r.ticker).join(', ')}` : ''),
      payload: {
        assessmentId: id,
        type: scheduled.type,
        scheduledFor: scheduled.scheduledFor,
        generatedLate: item.generatedLate,
        board: board.board,
        tickerCount: records.length,
        commentary: lines,
      },
      dedupeKey: `DESK_ASSESSMENT:${scheduled.tradingDate}:${slotKey(scheduled)}`,
    },
  ]);

  log(
    `[assess] ${scheduled.type} ${scheduled.clock} ET — ${records.length} names, ` +
      `${lines.length} material changes, ${queued.length} research jobs queued, ` +
      `${runtimeMs}ms, 0 model calls` +
      (item.generatedLate ? ` (LATE by ${item.lateBySeconds}s)` : ''),
  );
  for (const line of lines.slice(0, 6)) log(`[assess]   ${line}`);
  if (item.missed.length > 0) {
    log(
      `[assess]   ${item.missed.length} earlier ${scheduled.type} slot(s) were missed and are ` +
        'recorded, not reconstructed',
    );
  }

  return true;
}

main().catch((error) => {
  console.error('[assess] fatal:', error);
  process.exitCode = 1;
});
