/**
 * The desk's performance record: one row per CALL, its outcome measured on the session the call was about.
 *
 * Pre-registered before any code: docs/research/performance-record/design-note-2026-10-06.md, as amended at f544af1a
 * (Amendment 1, A1-A3 and A5-A8; A4 struck). It records the DESK's calls (rank, grade, readings, research at a
 * checkpoint), never his trades, and is shown nowhere on the board.
 *
 * A CALL is a row of a COMPLETE checkpoint of one of three types; its outcome session is fixed by the type:
 *   NEXT_DAY_RECAP (22:00)          -> its target_trading_date
 *   PREMARKET_0700 (07:00)          -> its own trading_date
 *   OPEN_SPIKE_ASSESSMENT (09:25)   -> its own trading_date
 *
 * NEVER A ZERO FOR A MISSING VALUE. Every outcome carries a state: PRODUCED, NOT_YET (the outcome session has not
 * closed with an official close), or UNKNOWN with one reason. The labels (grade, float) are copied from the call's own
 * frozen row and never recomputed or back-filled (A3, A8): a value computed later would be look-ahead.
 */

import { isSplitRow } from '../reports/narrative';
import type { MarketDatabase } from '../../market/store/db';
import { etWallClockToUtc, sessionEndUtc } from '../../market/session';

export const CALL_TYPES = ['NEXT_DAY_RECAP', 'PREMARKET_0700', 'OPEN_SPIKE_ASSESSMENT'] as const;
export type CallType = (typeof CALL_TYPES)[number];

/** Bumped when an outcome's definition changes, so a row says which rules produced it. */
export const OUTCOME_JOB_VERSION = 1;

/** The outcome test's basis rule (outcome-test.ts:106): the outcome session's prior close within 2 percent of the call's. */
export const BASIS_TOLERANCE = 0.02;

export type OutcomeState = 'PRODUCED' | 'NOT_YET' | 'UNKNOWN';

export interface Outcome<T = number> {
  value: T | null;
  state: OutcomeState;
  reason: string | null;
}

/** The call, as its frozen checkpoint row holds it. */
export interface CallRow {
  assessmentId: number;
  ticker: string;
  assessmentType: CallType;
  tradingDate: string;
  targetTradingDate: string | null;
  completedAt: string;
  rank: number | null;
  price: number | null;
  referenceBasis: string | null;
  referenceClose: number | null;
  catalyst: string | null;
  structure: string | null;
  cycle: string | null;
  analysisVersionId: number | null;
  priorityGrade: string | null;
  priorityBasis: string | null;
  priorityRule: string | null;
  floatState: string | null;
  floatReason: string | null;
}

export interface CallOutcome {
  call: CallRow;
  outcomeDate: string;
  /** UNGRADED when the row was captured before the grade existed (schema 29); never back-filled (A3). */
  grade: string;
  /** FLOAT_NOT_FROZEN when the row was captured before schema 30; never back-filled (A8). */
  floatState: string;
  /** Whether the outcome session itself can be measured, and why not. */
  session: Outcome<true>;
  high0400Close: Outcome;
  highAfterCall: Outcome;
  high0700To1000: Outcome;
  close: Outcome;
  retention: Outcome;
  giveback: Outcome;
  /** PRODUCED with the best in-range rank after the call, or NOT_RANKED (its own state, never a number). */
  bestRankAfter: { value: number | null; state: 'PRODUCED' | 'NOT_RANKED' | 'NOT_YET' };
  spikeFade: Outcome<boolean>;
}

interface SessionRow {
  previous_close: number | null;
  rth_final_high: number | null;
  rth_final_low: number | null;
  official_close: number | null;
}

const produced = <T>(value: T): Outcome<T> => ({ value, state: 'PRODUCED', reason: null });
const notYet = <T>(): Outcome<T> => ({ value: null, state: 'NOT_YET', reason: null });
const unknown = <T>(reason: string): Outcome<T> => ({ value: null, state: 'UNKNOWN', reason });

export function outcomeDateOf(call: Pick<CallRow, 'assessmentType' | 'tradingDate' | 'targetTradingDate'>): string | null {
  return call.assessmentType === 'NEXT_DAY_RECAP' ? call.targetTradingDate : call.tradingDate;
}

const iso = (date: string, hour: number, minute = 0) => etWallClockToUtc(date, hour, minute).toISOString();

/** The official close for the outcome date, the recap's own condition (OFFICIAL_CLOSE_SQL, narrative.ts:325); A1. */
function readSession(db: MarketDatabase, symbol: string, date: string): SessionRow | null {
  return (
    (db
      .prepare(
        `SELECT previous_close, rth_final_high, rth_final_low,
                CASE WHEN reference_rth_close_basis = 'CURRENT_SESSION' AND reference_rth_close_date = trading_date
                     THEN reference_rth_close END AS official_close
           FROM ticker_session WHERE symbol = ? AND trading_date = ?`,
      )
      .get(symbol, date) as SessionRow | undefined) ?? null
  );
}

function barCount(db: MarketDatabase, symbol: string, date: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM minute_bars WHERE symbol = ? AND trading_date = ?').get(symbol, date) as {
    n: number;
  }).n;
}

function maxHigh(db: MarketDatabase, symbol: string, from: string, to: string): number | null {
  return (
    db.prepare('SELECT MAX(high) AS h FROM minute_bars WHERE symbol = ? AND ts >= ? AND ts < ?').get(symbol, from, to) as {
      h: number | null;
    }
  ).h;
}

/** The regular-session bar holding the session's high (earliest on a tie), or null without bars. */
function regularHighBar(db: MarketDatabase, symbol: string, date: string): { ts: string; open: number | null; high: number } | null {
  return (
    (db
      .prepare(
        `SELECT ts, open, high FROM minute_bars
          WHERE symbol = ? AND ts >= ? AND ts < ? AND high IS NOT NULL
          ORDER BY high DESC, ts ASC LIMIT 1`,
      )
      .get(symbol, iso(date, 9, 30), iso(date, 16, 0)) as { ts: string; open: number | null; high: number } | undefined) ?? null
  );
}

function bestRankAfter(db: MarketDatabase, call: CallRow, outcomeDate: string): number | null {
  return (
    db
      .prepare(
        `SELECT MIN(t.assessment_rank) AS r
           FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
          WHERE t.ticker = ? AND a.status = 'COMPLETE' AND a.trading_date = ?
            AND a.completed_at > ? AND t.assessment_rank IS NOT NULL`,
      )
      .get(call.ticker, outcomeDate, call.completedAt) as { r: number | null }
  ).r;
}

const pct = (value: number, price: number) => (value - price) / price;

/**
 * One call's outcome as of `now`. Reads the outcome session, its minute bars and later checkpoints; writes nothing.
 */
export function computeCallOutcome(db: MarketDatabase, call: CallRow, now: Date): CallOutcome | null {
  const outcomeDate = outcomeDateOf(call);
  if (!outcomeDate) return null;
  const grade = call.priorityGrade ?? 'UNGRADED';
  const floatState = call.floatState ?? 'FLOAT_NOT_FROZEN';
  const base = { call, outcomeDate, grade, floatState };

  const session = readSession(db, call.ticker, outcomeDate);
  /*
   * NOT_YET until the official close exists or the outcome session has ended (20:00 ET, sessionEndUtc). A1 says
   * "the outcome date is today or later"; read literally, a name that never gets an official close would be written
   * NOT_YET at the 22:00 run and never revisited, since the job runs once per date. After the session ends a missing
   * official close is UNKNOWN NO_OFFICIAL_CLOSE. A6 (iii) holds: at 15:59 ET every outcome is NOT_YET.
   */
  const pending = (session?.official_close ?? null) === null && now.getTime() < sessionEndUtc(outcomeDate).getTime();
  if (pending) {
    return {
      ...base,
      session: notYet(),
      high0400Close: notYet(),
      highAfterCall: notYet(),
      high0700To1000: notYet(),
      close: notYet(),
      retention: notYet(),
      giveback: notYet(),
      bestRankAfter: { value: null, state: 'NOT_YET' },
      spikeFade: notYet(),
    };
  }

  const rank = bestRankAfter(db, call, outcomeDate);
  const bestRank = rank === null ? { value: null, state: 'NOT_RANKED' as const } : { value: rank, state: 'PRODUCED' as const };

  const refuse = (reason: string): CallOutcome => ({
    ...base,
    session: unknown(reason),
    high0400Close: unknown(reason),
    highAfterCall: unknown(reason),
    high0700To1000: unknown(reason),
    close: unknown(reason),
    retention: unknown(reason),
    giveback: unknown(reason),
    bestRankAfter: bestRank,
    spikeFade: unknown(reason),
  });

  if (!session) return refuse('NO_SESSION_ROW');
  if (session.rth_final_high === null || session.rth_final_low === null) return refuse('NO_FINAL_VALUES');
  const price = call.price;
  if (price === null || !(price > 0)) return refuse('NO_CALL_PRICE');
  if (
    session.previous_close !== null &&
    call.referenceClose !== null &&
    call.referenceClose > 0 &&
    Math.abs(session.previous_close - call.referenceClose) / call.referenceClose > BASIS_TOLERANCE
  ) {
    return refuse('BASIS_MISMATCH');
  }
  if (
    session.previous_close !== null &&
    session.official_close !== null &&
    isSplitRow(db, {
      symbol: call.ticker,
      date: outcomeDate,
      previousClose: session.previous_close,
      high: session.rth_final_high,
      low: session.rth_final_low,
      close: session.official_close,
    })
  ) {
    return refuse('SPLIT_ROW');
  }

  const official = session.official_close;
  const close: Outcome = official === null ? unknown('NO_OFFICIAL_CLOSE') : produced(pct(official, price));

  // The 04:00 high includes prints from before a morning call, which are not its outcome.
  const high0400Close: Outcome =
    call.assessmentType === 'NEXT_DAY_RECAP' ? produced(pct(session.rth_final_high, price)) : unknown('WINDOW_STARTS_BEFORE_CALL');

  const hasBars = barCount(db, call.ticker, outcomeDate) > 0;
  const recap = call.assessmentType === 'NEXT_DAY_RECAP';
  const afterFrom = recap ? iso(outcomeDate, 4, 0) : call.completedAt;
  const end = iso(outcomeDate, 16, 0);

  let highAfter: number | null = null;
  let highAfterCall: Outcome;
  if (!hasBars) {
    highAfterCall = unknown('BARS_PRUNED');
  } else {
    const minuteMax = maxHigh(db, call.ticker, afterFrom, end);
    // A2: the official close is itself a price after the call.
    const candidates = [minuteMax, official].filter((v): v is number => v !== null);
    highAfter = candidates.length > 0 ? Math.max(...candidates) : null;
    highAfterCall = highAfter === null ? unknown('NO_BARS_AFTER_CALL') : produced(pct(highAfter, price));
  }

  let high0700To1000: Outcome;
  if (!hasBars) {
    high0700To1000 = unknown('BARS_PRUNED');
  } else {
    const open7 = iso(outcomeDate, 7, 0);
    const from = recap || call.completedAt < open7 ? open7 : call.completedAt;
    const window = maxHigh(db, call.ticker, from, iso(outcomeDate, 10, 0));
    high0700To1000 = window === null ? unknown('NO_BARS_IN_WINDOW') : produced(pct(window, price));
  }

  let retention: Outcome;
  let giveback: Outcome;
  if (official === null) {
    retention = unknown('NO_OFFICIAL_CLOSE');
    giveback = unknown('NO_OFFICIAL_CLOSE');
  } else if (highAfter === null) {
    retention = unknown(highAfterCall.reason ?? 'NO_HIGH_AFTER_CALL');
    giveback = unknown(highAfterCall.reason ?? 'NO_HIGH_AFTER_CALL');
  } else {
    retention = highAfter > price ? produced((official - price) / (highAfter - price)) : unknown('HIGH_NOT_ABOVE_PRICE');
    giveback = produced((highAfter - official) / highAfter);
  }

  let spikeFade: Outcome<boolean>;
  if (!hasBars) {
    spikeFade = unknown('BARS_PRUNED');
  } else if (official === null) {
    spikeFade = unknown('NO_OFFICIAL_CLOSE');
  } else {
    const bar = regularHighBar(db, call.ticker, outcomeDate);
    if (!bar || bar.open === null) {
      spikeFade = unknown('NO_REGULAR_BARS');
    } else {
      spikeFade = produced(bar.ts < iso(outcomeDate, 10, 0) && official < bar.open);
    }
  }

  return {
    ...base,
    session: produced(true as const),
    high0400Close,
    highAfterCall,
    high0700To1000,
    close,
    retention,
    giveback,
    bestRankAfter: bestRank,
    spikeFade,
  };
}
