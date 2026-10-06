/**
 * Automatic research queueing.
 *
 * Every eligible ticker in the live Top-N gets queued. Priority decides who
 * goes first and never whether a name runs at all — a thin, wide-spread name is
 * still researched, it simply waits behind a name more likely to matter.
 *
 * Ranking itself is untouched: research enriches names, it never reorders them.
 */

import type { ActivityState } from '../market/activity';
import type { MarketDatabase } from '../market/store/db';
import {
  claimQualificationEpisode,
  enqueueResearchJob,
  INTERVAL_RECHECK,
  readCurrentAnalysis,
  readLatestJobForTicker,
  readRetryState,
  readSources,
} from '../market/store/researchRepo';
import { computeEvidenceFingerprint } from './fingerprint';
import { evaluateRetry } from './retry';
import { resolveCatalystFreshness } from './time';
import { catalystFreshFromUtc } from './freshFrom';

export interface QueueCandidate {
  ticker: string;
  /** Rank on the ACTIVE session board — Daily RVOL by day, AH after the bell. */
  rank: number;
  rvol: number | null;
  percentChange: number | null;
  cumulativeVolume: number | null;
  spreadPct: number | null;
  latched: boolean;
  classification: string | null;
  /**
   * First crossing into the discovery threshold. The correct origin for
   * time-to-intelligence.
   */
  top12EnteredAt: string | null;
  /** Entry to the tracked population at any rank. Retained, not replaced. */
  qualifiedAt: string | null;
  /**
   * Whether the name is still trading. See `lib/market/activity.ts`.
   *
   * OPTIONAL, AND UNDEFINED IS NOT DEAD. It arrives from `ticker_session`, and
   * until that column exists every candidate carries `undefined` — which means
   * the value did not survive its journey, never that the name is silent. The
   * gate below is written to be correct under both, so activating it is one
   * line added to a SELECT rather than a change of logic.
   */
  activity?: ActivityState;
}

/** Instruments allowed onto the ranked board, and therefore into research. */
const ELIGIBLE_CLASSES = new Set(['COMMON_EQUITY', 'ADR_ADS', 'UNKNOWN']);

/**
 * RANKED AND ALIVE, rather than ranked.
 *
 * A dead name kept its rank — RVOL is cumulative, so the rank its morning
 * earned survives the morning — and rank is what this gate reads. The result
 * was that a dead name inside `autoRank` held a research slot while a LIVE
 * name just outside it was refused one, which is the board-lateness defect
 * arriving in the spend rather than on the screen.
 *
 * The rank is deliberately untouched: the graveyard needs the row whole, so
 * the repair is to change what READS the rank and nothing else. Third time
 * that has been the right answer in this line of work.
 *
 * FAIL OPEN. Only `'DEAD'` refuses; `undefined` and `'UNKNOWN'` both keep the
 * name, so research is denied only when the desk POSITIVELY KNOWS the name is
 * silent.
 *
 * A PIN NO LONGER EXEMPTS A NAME FROM EITHER GATE. Both branches used to read
 * `focused`, and the docstring called the exemption deliberate — the trader
 * saying he is still watching a name outranking the desk's opinion of it.
 * Measured on 2026-09-07, that exemption had kept one name under research for
 * TEN HOURS past two deaths for a single dossier. Ruled a defect rather than a
 * capability: a pin follows research, it does not cause or prolong it.
 */
export function isEligible(candidate: QueueCandidate, autoRank: number): boolean {
  if (candidate.rank > autoRank) return false;
  if (candidate.activity === 'DEAD') return false;
  return ELIGIBLE_CLASSES.has(candidate.classification ?? 'UNKNOWN');
}

/**
 * Soft priority score.
 *
 * Deliberately additive and bounded rather than a filter: nothing here can
 * exclude a ticker. A #4 name up 45% on 500k shares with a tight spread should
 * start before a #3 name on 58k shares with a 31% spread — but the #3 name
 * still runs.
 */
export function priorityScore(candidate: QueueCandidate, autoRank: number): number {
  let score = 0;

  // Rank: earlier is better, scaled so it never dominates outright.
  score += Math.max(0, autoRank - candidate.rank) * 2;

  // Absolute move.
  const move = Math.abs(candidate.percentChange ?? 0);
  score += Math.min(move, 200) / 10;

  // Real participation, log-scaled so a huge print does not swamp everything.
  const volume = candidate.cumulativeVolume ?? 0;
  if (volume > 0) score += Math.log10(volume) * 2;

  // Tradeable spread is a quality signal, not a qualification threshold.
  const spread = candidate.spreadPct;
  if (spread !== null) {
    if (spread <= 1) score += 6;
    else if (spread <= 3) score += 3;
    else if (spread > 10) score -= 4;
  }

  // A latched name has already proven it belongs on the board.
  if (candidate.latched) score += 4;

  return Math.round(score * 100) / 100;
}

export interface QueueDecision {
  ticker: string;
  queued: boolean;
  reason: string;
  priority: number;
  jobId: number | null;
}

/** Job states that mean work is already under way for this ticker. */
const LIVE_STATUSES = ['QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING'];

/**
 * Fallback re-ask interval, matching `webDiscoveryUnresolvedMinutes`.
 *
 * A default rather than the authority: the worker passes the collector's real
 * configured interval, so the two cannot drift apart in production. This value
 * only governs a caller that supplies none.
 */
const DEFAULT_RECHECK_AFTER_MS = 10 * 60_000;

/**
 * How far down the board a STALE catalyst re-opens the research question.
 *
 * HIS RULING, 2026-09-25: *"yes, re-ask stale catalysts -- top 12 only"*, given
 * against his product rule of the same day: *"TMI isn't about being FAST, it's
 * about being ACCURATE. so if it's public we should have it."* Under that rule
 * a three-minute lag behind the wire is acceptable and never finding a public
 * release is not.
 *
 * A LITERAL 12 RATHER THAN `autoRank`, WHICH IS THE WHOLE POINT OF THE
 * CONSTANT. `autoRank` defaults to 12 but reads `RESEARCH_AUTO_RANK` from the
 * environment, so gating on it would silently widen his ruling to 50 the day
 * that variable moved -- naming when the bound usually holds instead of what he
 * actually decided. The effective bound is the MINIMUM of the two, so this can
 * never reach past his 12 nor past the queue's own ceiling.
 */
const STALE_REASK_MAX_RANK = 12;

/**
 * Reconciles research coverage for the eligible Top-N.
 *
 * Deliberately reconciliatory rather than edge-triggered: it looks at the
 * population that is on the board NOW and asks whether each name is covered,
 * rather than reacting to a crossing event. A crossing observed by nobody —
 * because the worker had not started yet, or was down, or had just restarted —
 * is not a crossing that gets researched, which is how Top-12 names ended up
 * sitting at NOT YET ANALYZED indefinitely.
 *
 * Every eligible name therefore converges to a live job, an accepted dossier,
 * or an explicit failure. None of those is "nothing".
 */
export function queueDiscoveryResearch(
  db: MarketDatabase,
  candidates: readonly QueueCandidate[],
  options: {
    tradingDate: string;
    autoRank: number;
    now: Date;
    /** Which board produced these candidates; recorded on the job for audit. */
    board?: string;
    maxAttempts?: number;
    /**
     * Fingerprint of the evidence currently on file. Injectable for tests;
     * by default it is computed from stored sources, which costs one local
     * read and no network — the same evidence the analysis would have used.
     */
    currentFingerprint?: (ticker: string) => string;
    /**
     * How long a name already carrying a dossier waits before it may be asked
     * again this session.
     *
     * Supply the collector's unresolved discovery interval. Below it the
     * collector will not pay for discovery, so a re-ask can only repeat the
     * deterministic poll — the board loop runs every 5s and would otherwise
     * queue a job per name per cycle.
     */
    recheckAfterMs?: number;
    /**
     * Per name, overrides `recheckAfterMs` (his paid-search rulings 2026-10-06): a top-12 name with RVOL of at least
     * 3 and a paid pass still owed today is re-asked at the paid budget's step (5 minutes), so its +5 and +10 passes
     * can happen; every other name keeps `recheckAfterMs`.
     */
    recheckAfterMsFor?: (candidate: QueueCandidate) => number;
  },
): QueueDecision[] {
  const decisions: QueueDecision[] = [];
  const queuedAt = options.now.toISOString();

  const ordered = [...candidates]
    .filter((candidate) => isEligible(candidate, options.autoRank))
    .map((candidate) => ({ candidate, priority: priorityScore(candidate, options.autoRank) }))
    .sort((a, b) => b.priority - a.priority);

  const fingerprintFor =
    options.currentFingerprint ??
    ((ticker: string) => computeEvidenceFingerprint(readSources(db, ticker)));

  const recheckAfterMs = options.recheckAfterMs ?? DEFAULT_RECHECK_AFTER_MS;

  /*
   * THE SAME BOUNDARY THE BOARD USES, COMPUTED ONCE PER PASS.
   *
   * `8687f04` derived staleness with a TWO-argument call and its comment
   * claimed the gate and the board could not disagree. That was wrong, and
   * Integration caught it. `why.ts` passes a third argument -- the prior
   * session's close -- so a CLOCKED catalyst after that close bands FRESH on
   * the board while the day bands alone call it STALE.
   *
   * WHERE IT BITES, and it is narrower than it first looks: a day-band-1
   * catalyst diverges RECENT/FRESH, which this gate ignores because it only
   * re-asks on STALE. The consequence is confined to a catalyst that is TWO OR
   * MORE ET days old AND falls after the prior session's close -- which is
   * Monday morning holding Friday evening's news, and the day after a holiday.
   * Measured on the 2026-08-23 snapshot: 6 of 59 clocked catalysts diverge and
   * ALL SIX are day-band 1, so that snapshot contains no instance of the case
   * that would fire here.
   *
   * **THAT ABSENCE CARRIES ALMOST NO WEIGHT, AND THE WINDOW IS WHY.** The
   * snapshot's read-dates are 2026-08-17..21 -- one Monday, and **5 of the 58
   * clocked catalysts were read on it.** So the firing case COULD have appeared
   * and did not, which is a real observation and an n of five. It does not
   * support "rarer than the divergence count suggests", and an earlier version
   * of this comment said exactly that. **A sound negative is a fact about the
   * instrument and its window before it is a fact about the world.**
   *
   * Fixed rather than documented for the reason that does not depend on the
   * rate: rare is not absent, and Monday is not a rare day.
   */
  const freshFrom = catalystFreshFromUtc(db, options.tradingDate);

  for (const { candidate, priority } of ordered) {
    const existingJob = readLatestJobForTicker(db, candidate.ticker, options.tradingDate);

    if (existingJob && LIVE_STATUSES.includes(existingJob.status)) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: `job already ${existingJob.status}`,
        priority,
        jobId: existingJob.id,
      });
      continue;
    }

    /*
     * The skip must check what its message claims.
     *
     * `readCurrentAnalysis` has no date filter — it returns whatever
     * `research_dossiers.current_version_id` points at, of any age — so this
     * used to skip on a dossier from any prior session while reporting one
     * "for this session". A name the desk had ever analysed then got one board
     * job per session and was frozen out, whatever that job produced. RCON sat
     * on an 08-19 UNKNOWN through the morning of 08-25 with its wire release
     * unread.
     *
     * Two conditions, because "already answered" needs both halves:
     *
     * `existingJob` is already scoped to `options.tradingDate`, so its
     * `acceptedAt` IS the session-local fact. Reading it from the job avoids
     * comparing a UTC `generatedAt` against an exchange trading date, which
     * would put every dossier accepted after 20:00 ET into the next session.
     *
     * And UNKNOWN is not an answer. A still-ranking name whose catalyst status
     * is UNKNOWN is precisely the one worth re-asking.
     */
    const currentAnalysis = readCurrentAnalysis(db, candidate.ticker);

    /*
     * AND A CATALYST THE DESK ITSELF CALLS STALE IS NOT AN ANSWER EITHER.
     *
     * His ruling, 2026-09-25, top 12 only. THE CASE THAT PRODUCED IT: `AIFF`
     * ran on a GLOBE NEWSWIRE release that morning; a competing scanner had it
     * at 07:53 with the name already up 5%; the desk asked ONCE at 07:48, three
     * minutes into the move and before the wire had propagated, and never asked
     * again in seven hours. It did not stop because it found nothing -- it
     * stopped because its dossier carried `FRESH_FOUND` on a catalyst from
     * 2026-09-17, eight days old. **The question closed because the desk
     * believed it already had the answer.**
     *
     * `UNKNOWN` re-asked and both kinds of confidence did not, and "confident"
     * included confidently holding week-old news as current.
     *
     * DERIVED HERE RATHER THAN READ OFF THE DOSSIER, and that is not
     * incidental. `catalyst.freshness` was banded by the guardrails against the
     * clock at WRITE time; a catalyst written yesterday as RECENT is STALE
     * today and the stored word still says RECENT. Re-deriving against
     * `options.now` AND the prior-session boundary above is the same seam and
     * the same inputs `why.ts` uses. **An earlier version of this comment said
     * the two could not disagree while passing only two arguments, which was
     * the disagreement.**
     *
     * A catalyst with NO timestamp bands UNKNOWN, not STALE, so it does not
     * re-ask on this path. An unknown age is not an established staleness, and
     * widening it here would be this desk's oldest mistake in a new place.
     */
    const staleReaskApplies =
      candidate.rank <= Math.min(options.autoRank, STALE_REASK_MAX_RANK);
    const catalystIsStale =
      currentAnalysis !== null &&
      resolveCatalystFreshness(
        currentAnalysis.dossier.catalyst.eventTimestamp,
        options.now,
        freshFrom === null ? null : new Date(freshFrom),
      ) === 'STALE';

    const answered =
      currentAnalysis !== null &&
      currentAnalysis.dossier.catalyst.catalystStatus !== 'UNKNOWN' &&
      !(staleReaskApplies && catalystIsStale);

    if (answered && existingJob?.acceptedAt) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: 'dossier accepted for this session',
        priority,
        jobId: existingJob.id,
      });
      continue;
    }

    /*
     * What bounds the re-ask, and why it is a clock rather than a fingerprint.
     *
     * This fix was scoped believing `evaluateRetry` already bounded it. That is
     * true of the case it was built for and only that case: `evaluateRetry`
     * reads `research_retry_state`, which `nextRetryState` writes on FAILURE. A
     * job that finishes and produces an UNKNOWN dossier has not failed, records
     * no state, and arrives there as "no prior failure", allow. It is a failure
     * policy, not a re-ask policy.
     *
     * The obvious bound — skip while the evidence fingerprint has not moved —
     * DEADLOCKS, and the deadlock is the same freeze this fix exists to break.
     * `collectCatalystEvidence` runs inside job processing, so a name with no
     * job collects nothing, its fingerprint cannot move, and it never earns a
     * job. RCON would sit exactly where it sat.
     *
     * So the bound is time. The board loop runs every 5s; a re-ask sooner than
     * the collector's own discovery interval cannot see anything the last one
     * did not, because below that interval the collector refuses to pay for
     * discovery at all. Matching the two means every re-ask is a pass that
     * could actually learn something.
     *
     * What this does NOT need to bound is model spend. `interpretTicker`
     * returns REUSED_UNCHANGED on an unmoved fingerprint without building a
     * bundle or making a call, so a re-ask that finds nothing new is already
     * free. The cost being bounded here is job rows, SEC polling and worker
     * slots.
     */
    const sinceLastAsk =
      existingJob?.completedAt === null || existingJob?.completedAt === undefined
        ? null
        : options.now.getTime() - Date.parse(existingJob.completedAt);

    if (
      currentAnalysis !== null &&
      sinceLastAsk !== null &&
      Number.isFinite(sinceLastAsk) &&
      // A completion stamped in the future is clock skew, not a recent ask.
      // Reading it as one would freeze the name until the clocks agreed.
      sinceLastAsk >= 0 &&
      sinceLastAsk < (options.recheckAfterMsFor ? options.recheckAfterMsFor(candidate) : recheckAfterMs)
    ) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: `re-asked ${Math.round(sinceLastAsk / 1000)}s ago; nothing new is reachable yet`,
        priority,
        jobId: existingJob?.id ?? null,
      });
      continue;
    }

    /*
     * A finished job without an accepted dossier is deliberately re-openable,
     * so a name whose evidence has since changed can be analyzed again. The
     * accepted-dossier check above stops that repeating once an analysis
     * lands; the retry policy below stops it repeating when one never does.
     */
    const verdict = evaluateRetry({
      state: readRetryState(db, candidate.ticker, options.tradingDate),
      currentFingerprint: fingerprintFor(candidate.ticker),
      now: options.now,
      maxAttempts: options.maxAttempts,
    });

    if (!verdict.allow) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: verdict.blocked
          ? `left explicitly FAILED: ${verdict.reason}`
          : `deferred: ${verdict.reason}`,
        priority,
        jobId: existingJob?.id ?? null,
      });
      continue;
    }

    const jobId = enqueueResearchJob(db, {
      ticker: candidate.ticker,
      tradingDate: options.tradingDate,
      priority,
      reason: `${options.board ?? 'top'} ${options.autoRank} at rank ${candidate.rank}`,
      queuedAt,
      /*
       * Board entry is the origin for time-to-intelligence.
       *
       * qualifiedAt is only a fallback: it marks entry to the tracked
       * population at ANY rank, so using it as the origin measured from the
       * wrong event and inflated the metric by hours for names that qualified
       * early and reached the Top N much later.
       */
      top12At: candidate.top12EnteredAt ?? candidate.qualifiedAt ?? queuedAt,
      /*
       * A first crossing into the ranked board is the material episode. It is
       * captured here, at the moment that justified the job, because rank moves
       * and the collector must not have to guess later what this was about.
       *
       * Focus-list refreshes and ordinary re-polls are re-looks, and they say
       * so. They previously carried no trigger at all, which made "we are
       * looking again" indistinguishable from "we forgot to record why" in
       * every ledger downstream. The descriptive `reason` above is unchanged,
       * so naming the purpose adds a category without losing the detail.
       */
      /*
       * Only the crossing itself qualifies.
       *
       * The old test was "is it on the board now", which every poll satisfies
       * while a ticker sits there. CXAI climbing 12 → 10 → 8 was three separate
       * ENTERED_TOP_N jobs in 173 seconds, each buying a model call, for one
       * qualification. Claiming the episode by its entry timestamp collapses
       * those to one and still lets a genuine exit and re-entry — which
       * produces a new timestamp — qualify again.
       */
      trigger:
        candidate.top12EnteredAt !== null &&
        candidate.rank <= options.autoRank &&
        claimQualificationEpisode(db, {
          ticker: candidate.ticker,
          tradingDate: options.tradingDate,
          enteredAt: candidate.top12EnteredAt,
          createdAt: queuedAt,
        })
          ? 'ENTERED_TOP_N'
          : INTERVAL_RECHECK,
    });

    decisions.push({
      ticker: candidate.ticker,
      queued: jobId !== null,
      reason: jobId !== null ? 'queued' : 'already live',
      priority,
      jobId,
    });
  }

  return decisions;
}

export interface TimeToIntelligence {
  ticker: string;
  top12At: string | null;
  queuedAt: string;
  collectionStartedAt: string | null;
  sourcesReadyAt: string | null;
  interpretationStartedAt: string | null;
  acceptedAt: string | null;
  /** Milliseconds between each adjacent pair, null when a stamp is missing. */
  top12ToQueuedMs: number | null;
  queuedToCollectionMs: number | null;
  collectionToSourcesMs: number | null;
  sourcesToInterpretationMs: number | null;
  interpretationToAcceptedMs: number | null;
  /** The headline metric: board entry to available intelligence. */
  totalMs: number | null;
}

function delta(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return end - start;
}

/** Computes the stage timings for one job. */
export function timeToIntelligence(job: {
  ticker: string;
  top12At: string | null;
  queuedAt: string;
  startedAt: string | null;
  sourcesReadyAt: string | null;
  analysisStartedAt: string | null;
  acceptedAt: string | null;
}): TimeToIntelligence {
  return {
    ticker: job.ticker,
    top12At: job.top12At,
    queuedAt: job.queuedAt,
    collectionStartedAt: job.startedAt,
    sourcesReadyAt: job.sourcesReadyAt,
    interpretationStartedAt: job.analysisStartedAt,
    acceptedAt: job.acceptedAt,
    top12ToQueuedMs: delta(job.top12At, job.queuedAt),
    queuedToCollectionMs: delta(job.queuedAt, job.startedAt),
    collectionToSourcesMs: delta(job.startedAt, job.sourcesReadyAt),
    sourcesToInterpretationMs: delta(job.sourcesReadyAt, job.analysisStartedAt),
    interpretationToAcceptedMs: delta(job.analysisStartedAt, job.acceptedAt),
    totalMs: delta(job.top12At, job.acceptedAt),
  };
}

/**
 * Retires jobs left behind the one-way door.
 *
 * The worker claims for exactly one trading date — `MAX(trading_date)` from
 * `ticker_session` — and that value only ever moves forward. A job for an
 * earlier date can never be claimed again: no sweep reaches it, no retry
 * touches it, and it produces no error. `2906a59` stopped new ones being
 * created by having the recap queue for the session it PREPARES; these are the
 * ones created before that.
 *
 * `STALE` rather than `FAILED`, and rather than deleting the row. They did not
 * fail — nothing ever ran them — and the distinction is the record. `STALE` is
 * outside `LIVE_STATUSES`, outside the `stalledJobs` count, and outside the
 * partial unique index on `(ticker, trading_date)`, so a retired job neither
 * shows as work nor blocks the same ticker being queued again.
 *
 * THE RETIREMENT IS ITS OWN RECORD, which is the point. `stalledJobs` going
 * 16 → 0 because a population was retired reads identically to it going to zero
 * because the fix worked, and the enqueue fix has its own positive evidence
 * (jobs queued forward, nothing behind the door). So each row keeps its reason
 * and the instant it was retired: the step in the series is explainable from
 * the data rather than from someone remembering.
 *
 * `<` rather than `<>`, for the same reason `stalledJobs` uses it: the recap now
 * queues for TOMORROW, and tomorrow's work is not stranded — it is waiting.
 */
export interface StrandedRetirement {
  /** Jobs moved to STALE by this call. Zero on every run after the first. */
  retired: number;
  tickers: string[];
  /** Jobs strictly before this date were considered. */
  before: string;
  retiredAt: string;
}

export function retireStrandedJobs(
  db: MarketDatabase,
  options: { before: string; now?: Date },
): StrandedRetirement {
  const retiredAt = (options.now ?? new Date()).toISOString();
  const reason = `retired: stranded before the enqueue fix; unclaimable behind trading_date ${options.before}`;

  const run = db.transaction((): StrandedRetirement => {
    const rows = db
      .prepare(
        `SELECT id, ticker FROM research_jobs
          WHERE trading_date < ?
            AND status IN ('QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING')
          ORDER BY id ASC`,
      )
      .all(options.before) as Array<{ id: number; ticker: string }>;

    const update = db.prepare(
      `UPDATE research_jobs
          SET status = 'STALE', error = ?, completed_at = ?
        WHERE id = ?`,
    );
    for (const row of rows) update.run(reason, retiredAt, row.id);

    return {
      retired: rows.length,
      tickers: rows.map((row) => row.ticker),
      before: options.before,
      retiredAt,
    };
  });

  return run();
}
