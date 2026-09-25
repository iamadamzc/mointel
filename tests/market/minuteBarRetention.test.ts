import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  upsertMinuteBars,
  retainedMinuteBarDates,
  pruneMinuteBars,
  loadMinuteBars,
} from '@/lib/market/store/repo';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-retain-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop();
    try {
      if (file) fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

function seed(db: ReturnType<typeof temporaryDb>, dates: string[]) {
  for (const date of dates) {
    upsertMinuteBars(db, date, [
      {
        symbol: 'ABCD',
        ts: `${date}T14:30:00.000Z`,
        open: 1,
        high: 2,
        low: 1,
        close: 1.5,
        volume: 100,
        tradeCount: 10,
        vwap: 1.4,
        source: 'sip',
        receivedAt: `${date}T14:31:00.000Z`,
      },
    ]);
  }
}

/** Records the SQL of every DELETE the code prepares on this handle. */
function recordDeletes(db: ReturnType<typeof temporaryDb>): string[] {
  const seen: string[] = [];
  const prepare = db.prepare.bind(db);
  db.prepare = ((sql: string) => {
    if (/^\s*DELETE\b/i.test(sql)) seen.push(sql);
    return prepare(sql);
  }) as typeof db.prepare;
  return seen;
}

function survivingDates(db: ReturnType<typeof temporaryDb>, dates: string[]): string[] {
  return dates.filter((d) => loadMinuteBars(db, 'ABCD', d).length > 0);
}

/**
 * On 2026-09-05 the desk deleted 2,121,548 minute bars — every session it
 * held.
 *
 * The retention built its keep-list by counting back CALENDAR days from the
 * trading date. The Saturday session roll had already set that date to MONDAY
 * 09-08, so a three-day window covered Mon/Sun/Sat, matched no stored session,
 * and the DELETE took everything. It had been firing every weekend, behind a
 * debug log nobody reads.
 *
 * db.ts:8 said "pruned to `minuteBarRetentionDays` TRADING DATES" the whole
 * time. The prose named the requirement; the loop named a proxy for it.
 */
describe('minute bar retention counts sessions, not calendar days', () => {
  const WED = '2026-09-02';
  const THU = '2026-09-03';
  const FRI = '2026-09-04';
  const ALL = [WED, THU, FRI];

  /** The incident. Before the fix this kept nothing and deleted all three. */
  it('retains Wed, Thu and Fri when the Saturday roll has moved the date to Monday', () => {
    const db = temporaryDb();
    seed(db, ALL);

    const keep = retainedMinuteBarDates(db, 3, '2026-09-08');
    pruneMinuteBars(db, keep);

    expect(survivingDates(db, ALL).sort()).toEqual(ALL);
    db.close();
  });

  /**
   * A long weekend lands the roll on Tuesday, so the calendar window becomes
   * Tue/Mon/Sun — three non-sessions again, with an extra day of loss. The
   * fix handles it by construction; this proves it rather than assuming it.
   */
  it('retains the same sessions when a holiday rolls the date to Tuesday', () => {
    const db = temporaryDb();
    seed(db, ALL);

    const keep = retainedMinuteBarDates(db, 3, '2026-09-09');
    pruneMinuteBars(db, keep);

    expect(survivingDates(db, ALL).sort()).toEqual(ALL);
    db.close();
  });

  it('still drops the oldest session once more than N are stored', () => {
    const db = temporaryDb();
    const MON = '2026-08-31';
    const TUE = '2026-09-01';
    const dates = [MON, TUE, WED, THU, FRI];
    seed(db, dates);

    const keep = retainedMinuteBarDates(db, 3, FRI);
    const removed = pruneMinuteBars(db, keep);

    expect(removed).toBeGreaterThan(0);
    expect(survivingDates(db, dates).sort()).toEqual([WED, THU, FRI]);
    db.close();
  });

  /**
   * The current session is kept before its first bar exists, so a prune during
   * a live session cannot delete what capture is mid-write.
   */
  it('keeps the current trading date even when it has no bars yet', () => {
    const db = temporaryDb();
    seed(db, ALL);

    expect(retainedMinuteBarDates(db, 3, '2026-09-07')).toContain('2026-09-07');
    db.close();
  });

  /**
   * The prune runs at every worker start, before the socket connects. When
   * nothing is stale it must not issue a write at all: the old NOT IN delete
   * was a full table scan under the write lock and starved research and assess
   * for ~100s on 2026-09-25.
   */
  it('issues no delete when every stored date is kept', () => {
    const db = temporaryDb();
    seed(db, ALL);
    const deletes = recordDeletes(db);

    expect(pruneMinuteBars(db, [...ALL, '2026-09-08'])).toBe(0);
    expect(deletes).toEqual([]);
    expect(survivingDates(db, ALL).sort()).toEqual([...ALL].sort());
    db.close();
  });

  it('plans every delete it issues on the date index, never a table scan', () => {
    const db = temporaryDb();
    const dates = ['2026-08-31', '2026-09-01', ...ALL];
    seed(db, dates);
    const deletes = recordDeletes(db);

    expect(pruneMinuteBars(db, ALL)).toBe(2);
    expect(deletes.length).toBeGreaterThan(0);
    for (const sql of deletes) {
      const params = (sql.match(/\?/g) ?? []).map(() => '2026-08-31');
      const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as Array<{
        detail: string;
      }>;
      const detail = plan.map((row) => row.detail).join(' | ');
      expect(detail).not.toMatch(/^SCAN minute_bars$|SCAN minute_bars(?! USING)/);
      expect(detail).toMatch(/idx_minute_bars_date/);
    }
    db.close();
  });

  /**
   * An empty store must produce "delete nothing", never "keep nothing". On a
   * DELETE path the two are opposite outcomes of the same absent evidence.
   */
  it('returns an empty keep-list on an empty store, and deletes nothing', () => {
    const db = temporaryDb();

    expect(retainedMinuteBarDates(db, 3, '2026-09-08')).toEqual([]);
    expect(pruneMinuteBars(db, [])).toBe(0);
    db.close();
  });
});
