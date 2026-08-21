import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  claimAssessmentSlot,
  completeAssessment,
  readCheckpointLedger,
  readClaimedSlots,
  recordMissedAssessment,
} from '@/lib/market/store/assessmentRepo';
import {
  buildSchedule,
  dueAssessments,
  expiredAssessments,
  slotKey,
  type AssessmentType,
} from '@/lib/desk/schedule';

/**
 * A checkpoint that should have run leaves a record either way.
 *
 * The 22:00 recap ran on 17 and 18 August and then stopped. Nothing failed and
 * nothing was logged: the trading date rolls at 22:00 ET — the exact minute the
 * recap is due — and the scheduler derived its candidate dates from the trading
 * date and from `MAX(ticker_session.trading_date)`, both of which had already
 * advanced. The previous session left the schedule at the instant its last
 * checkpoint became due, so there was never anything to run, miss or catch up.
 *
 * Two things had to be true for that to be invisible, and both are tested here:
 * the previous session has to stay in the schedule while its window is open,
 * and a checkpoint whose window has closed has to be written down.
 */

const DATE = '2026-08-20';
const NEXT = '2026-08-21';

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-ledger-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  db.close();
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows keeps the handle; the OS temp root is swept anyway. */
  }
});

function schedule(tradingDate = DATE) {
  return buildSchedule({
    tradingDate,
    closeMinutes: 16 * 60,
    nextTradingDate: tradingDate === DATE ? NEXT : '2026-08-24',
  });
}

function slotOf(type: AssessmentType, tradingDate = DATE) {
  const found = schedule(tradingDate).find((item) => item.type === type);
  if (!found) throw new Error(`no ${type} in the schedule`);
  return found;
}

function claim(type: AssessmentType, startedAt: string, options: { catchUp?: boolean } = {}) {
  const slot = slotOf(type);
  return claimAssessmentSlot(db, {
    tradingDate: slot.tradingDate,
    targetTradingDate: slot.targetTradingDate,
    assessmentType: slot.type,
    scheduledFor: slot.scheduledFor,
    startedAt,
    generatedLate: false,
    catchUp: options.catchUp ?? false,
    sessionPhase: slot.sessionPhase,
    board: 'DAILY_RVOL',
    rankingDefinition: 'Daily RVOL',
    staleRunningBefore: new Date(Date.parse(startedAt) - 10 * 60_000).toISOString(),
  });
}

function finish(id: number, at: string) {
  completeAssessment(db, id, {
    completedAt: at,
    status: 'COMPLETE',
    tickerCount: 3,
    modelCalls: 0,
    runtimeMs: 12,
    marketFingerprint: 'm',
    researchFingerprint: 'r',
    notes: '',
    metadata: {},
  });
}

describe('downtime spanning a checkpoint', () => {
  it('produces one catch-up run when the window is still open', () => {
    // Desk down over 22:00, back at 23:30. The recap is useful until 04:00.
    const back = new Date('2026-08-21T03:30:00.000Z'); // 23:30 ET
    const due = dueAssessments({
      schedule: schedule(),
      now: back,
      completed: readClaimedSlots(db, DATE),
    });

    const recap = due.filter((item) => item.scheduled.type === 'NEXT_DAY_RECAP');
    expect(recap).toHaveLength(1);
    expect(recap[0].generatedLate).toBe(true);
    expect(recap[0].lateBySeconds).toBeGreaterThan(300);
  });

  it('produces MISSED_SUPERSEDED once the window has closed', () => {
    // Back at 07:00 ET the next morning: past the recap's 04:00 boundary.
    const back = new Date('2026-08-21T11:00:00.000Z');
    const expired = expiredAssessments({
      schedule: schedule(),
      now: back,
      completed: readClaimedSlots(db, DATE),
    });

    const recap = expired.find((item) => item.scheduled.type === 'NEXT_DAY_RECAP');
    expect(recap).toBeDefined();
    expect(recap!.reason).toContain('catch-up window closed');

    const first = recordMissedAssessment(db, {
      tradingDate: recap!.scheduled.tradingDate,
      targetTradingDate: recap!.scheduled.targetTradingDate,
      assessmentType: recap!.scheduled.type,
      scheduledFor: recap!.scheduled.scheduledFor,
      sessionPhase: recap!.scheduled.sessionPhase,
      board: 'AFTER_HOURS',
      reason: recap!.reason,
      recordedAt: back.toISOString(),
    });

    expect(first).toBe(true);
    const ledger = readCheckpointLedger(db, { sinceTradingDate: DATE });
    expect(ledger.missedSuperseded).toBe(1);
    expect(ledger.missed[0].type).toBe('NEXT_DAY_RECAP');
  });

  it('records a miss once, not on every scheduler cycle', () => {
    const slot = slotOf('NEXT_DAY_RECAP');
    const write = () =>
      recordMissedAssessment(db, {
        tradingDate: slot.tradingDate,
        targetTradingDate: slot.targetTradingDate,
        assessmentType: slot.type,
        scheduledFor: slot.scheduledFor,
        sessionPhase: slot.sessionPhase,
        board: 'AFTER_HOURS',
        reason: 'window closed',
        recordedAt: '2026-08-21T11:00:00.000Z',
      });

    expect(write()).toBe(true);
    for (let cycle = 0; cycle < 200; cycle += 1) expect(write()).toBe(false);
    expect(readCheckpointLedger(db, { sinceTradingDate: DATE }).missedSuperseded).toBe(1);
  });
});

describe('a completed checkpoint is final', () => {
  it('never runs twice', () => {
    const id = claim('STRUCTURAL_REFRESH', '2026-08-20T10:10:02.000Z');
    expect(id).not.toBeNull();
    finish(id!, '2026-08-20T10:10:40.000Z');

    // Every later cycle sees it in the completed set and skips it.
    const completed = readClaimedSlots(db, DATE);
    expect(completed.has(slotKey(slotOf('STRUCTURAL_REFRESH')))).toBe(true);

    const due = dueAssessments({
      schedule: schedule(),
      now: new Date('2026-08-20T12:00:00.000Z'),
      completed,
    });
    expect(due.some((item) => item.scheduled.type === 'STRUCTURAL_REFRESH')).toBe(false);
  });

  it('cannot be downgraded to a miss by a later reconciliation', () => {
    /*
     * The reconciliation pass runs on every cycle, including long after a run
     * completed. It must never overwrite a real assessment with a tombstone.
     */
    const id = claim('STRUCTURAL_REFRESH', '2026-08-20T10:10:02.000Z');
    finish(id!, '2026-08-20T10:10:40.000Z');

    const slot = slotOf('STRUCTURAL_REFRESH');
    const wrote = recordMissedAssessment(db, {
      tradingDate: slot.tradingDate,
      targetTradingDate: slot.targetTradingDate,
      assessmentType: slot.type,
      scheduledFor: slot.scheduledFor,
      sessionPhase: slot.sessionPhase,
      board: 'DAILY_RVOL',
      reason: 'window closed',
      recordedAt: '2026-08-20T20:00:00.000Z',
    });

    expect(wrote).toBe(false);
    const ledger = readCheckpointLedger(db, { sinceTradingDate: DATE });
    expect(ledger.completed).toBe(1);
    expect(ledger.missedSuperseded).toBe(0);
  });
});

describe('two schedulers, one checkpoint', () => {
  it('lets exactly one claim it', () => {
    const first = claim('RTH_CLOSE', '2026-08-20T20:00:03.000Z');
    const second = claim('RTH_CLOSE', '2026-08-20T20:00:04.000Z');

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('lets a second worker reclaim only after the lease expires', () => {
    const first = claim('RTH_CLOSE', '2026-08-20T20:00:03.000Z');
    expect(first).not.toBeNull();

    // Nine minutes later the lease is still held: the run may just be slow.
    expect(claim('RTH_CLOSE', '2026-08-20T20:09:00.000Z')).toBeNull();

    // Eleven minutes later the worker that held it is gone.
    const reclaimed = claim('RTH_CLOSE', '2026-08-20T20:11:00.000Z');
    expect(reclaimed).toBe(first);

    const row = db
      .prepare('SELECT attempt_count FROM desk_assessments WHERE id = ?')
      .get(first) as { attempt_count: number };
    expect(row.attempt_count).toBe(2);
  });

  it('resumes the same row after a crash rather than creating a second', () => {
    claim('RTH_CLOSE', '2026-08-20T20:00:03.000Z');
    claim('RTH_CLOSE', '2026-08-20T20:11:00.000Z');

    const rows = db
      .prepare("SELECT COUNT(*) AS n FROM desk_assessments WHERE assessment_type = 'RTH_CLOSE'")
      .get() as { n: number };
    expect(rows.n).toBe(1);
  });
});

describe('catch-up runs are labelled as such', () => {
  it('separates a slow tick from filling in a gap', () => {
    const onTime = claim('PREMARKET_0700', '2026-08-20T11:00:04.000Z');
    finish(onTime!, '2026-08-20T11:00:30.000Z');

    const late = claimAssessmentSlot(db, {
      ...{
        tradingDate: DATE,
        targetTradingDate: null,
        assessmentType: 'STRUCTURAL_REFRESH',
        scheduledFor: slotOf('STRUCTURAL_REFRESH').scheduledFor,
        startedAt: '2026-08-20T12:30:00.000Z',
        generatedLate: true,
        catchUp: true,
        sessionPhase: 'PREMARKET',
        board: 'DAILY_RVOL',
        rankingDefinition: 'Daily RVOL',
        staleRunningBefore: '2026-08-20T12:20:00.000Z',
      },
    });
    finish(late!, '2026-08-20T12:30:30.000Z');

    const rows = db
      .prepare('SELECT assessment_type AS type, catch_up AS catchUp FROM desk_assessments ORDER BY id')
      .all() as Array<{ type: string; catchUp: number }>;

    expect(rows.find((row) => row.type === 'PREMARKET_0700')!.catchUp).toBe(0);
    expect(rows.find((row) => row.type === 'STRUCTURAL_REFRESH')!.catchUp).toBe(1);
    expect(readCheckpointLedger(db, { sinceTradingDate: DATE }).catchUp).toBe(1);
  });

  it('keeps the original checkpoint type and trading date on a catch-up', () => {
    // A recap caught up at 23:30 is still the 22:00 recap for the 20th, and
    // every downstream trigger has to agree.
    const slot = slotOf('NEXT_DAY_RECAP');
    const id = claim('NEXT_DAY_RECAP', '2026-08-21T03:30:00.000Z', { catchUp: true });
    finish(id!, '2026-08-21T03:30:30.000Z');

    const row = db
      .prepare(
        `SELECT trading_date AS tradingDate, target_trading_date AS target,
                assessment_type AS type, scheduled_for AS scheduledFor, catch_up AS catchUp
           FROM desk_assessments WHERE id = ?`,
      )
      .get(id) as Record<string, unknown>;

    expect(row.tradingDate).toBe(DATE);
    expect(row.target).toBe(NEXT);
    expect(row.type).toBe('NEXT_DAY_RECAP');
    expect(row.scheduledFor).toBe(slot.scheduledFor);
    expect(row.catchUp).toBe(1);
  });
});

describe('trading-date rollover creates the next set of identities', () => {
  it('gives the new session its own checkpoints, distinct from yesterday’s', () => {
    const yesterday = new Set(schedule(DATE).map(slotKey));
    const today = schedule(NEXT).map(slotKey);

    expect(today.length).toBeGreaterThan(0);
    for (const key of today) expect(yesterday.has(key)).toBe(false);
  });

  it('keeps yesterday’s recap addressable after the date has rolled', () => {
    /*
     * The regression in one assertion. At 22:05 ET on the 20th the desk is on
     * the 21st, and the 20th's recap must still be reachable — it is due right
     * now and belongs to a session that is over.
     */
    const justAfterRoll = new Date('2026-08-21T02:05:00.000Z');
    const due = dueAssessments({
      schedule: schedule(DATE),
      now: justAfterRoll,
      completed: readClaimedSlots(db, DATE),
    });

    expect(due.some((item) => item.scheduled.type === 'NEXT_DAY_RECAP')).toBe(true);
  });
});
