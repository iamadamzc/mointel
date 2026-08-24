import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { readDailyBars, upsertDailyBars, type NewDailyBar } from '@/lib/research/history';

/**
 * One definition of a usable daily bar, on the way out as well as in.
 *
 * `ensureDailyHistory` refuses to STORE a bar for a session that has not ended.
 * Three readers — the live cycle overlay, the evidence bundle, and the
 * interpretation pipeline — then computed from whatever was stored, including
 * the 133 rows already poisoned before that guard existed. Two definitions of
 * "finished", four commits apart, same night, same author.
 *
 * The failure these pin is NOT staleness. A partial bar for an ENDED session
 * carries an honest date and dishonest contents: understated volume, a high
 * that never finished forming. Nothing downstream can tell, which is why the
 * test has to be here rather than in a caller.
 */

function bar(over: Partial<NewDailyBar> & { tradingDate: string; fetchedAt: string }): NewDailyBar {
  return {
    symbol: 'ACME',
    open: 1,
    high: 2,
    low: 1,
    close: 2,
    volume: 1_000,
    tradeCount: 10,
    vwap: 1.5,
    adjustment: 'split',
    source: 'test',
    ...over,
  };
}

/** 20:00 ET on the given date, as UTC. Every date here is inside DST. */
const sessionEnd = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 24)).toISOString();
};
const midSession = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 16)).toISOString();
};

const files: string[] = [];
function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-bars-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

describe('readDailyBars', () => {
  it('returns a bar written after its own session ended', () => {
    const store = db();
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-20', fetchedAt: sessionEnd('2026-08-20') })]);

    expect(readDailyBars(store, 'ACME').map((b) => b.tradingDate)).toEqual(['2026-08-20']);
  });

  it('refuses one written mid-session, even though its date is honest', () => {
    // The Friday-partial-read-on-Monday shape: the date is a real, ended
    // session, so no latest-date check can catch it. Only fetched_at can.
    const store = db();
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-21', fetchedAt: midSession('2026-08-21') })]);

    expect(readDailyBars(store, 'ACME')).toEqual([]);
  });

  it('truncates the tail rather than punching a hole in the series', () => {
    /*
     * The property that makes filtering safe at all. An unfinished bar is
     * always the newest — it can only be written on the day it is newest, and
     * any later fetch heals it. If that ever stopped being true, filtering
     * would create a gap and `dailyRvol`'s 20-session baseline would move with
     * no tell.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', fetchedAt: sessionEnd('2026-08-19') }),
      bar({ tradingDate: '2026-08-20', fetchedAt: sessionEnd('2026-08-20') }),
      bar({ tradingDate: '2026-08-21', fetchedAt: midSession('2026-08-21') }),
    ]);

    expect(readDailyBars(store, 'ACME').map((b) => b.tradingDate)).toEqual([
      '2026-08-19',
      '2026-08-20',
    ]);
  });

  it('still fills the requested window when the filter drops rows', () => {
    /*
     * Without the second query the caller silently gets a short series. A
     * cycle computed over 19 sessions where 20 were asked for is not wrong in
     * a way anything reports.
     */
    const store = db();
    const bars: NewDailyBar[] = [];
    for (let day = 3; day <= 20; day += 1) {
      const date = `2026-08-${String(day).padStart(2, '0')}`;
      bars.push(bar({ tradingDate: date, fetchedAt: sessionEnd(date) }));
    }
    bars.push(bar({ tradingDate: '2026-08-21', fetchedAt: midSession('2026-08-21') }));
    upsertDailyBars(store, bars);

    const window = readDailyBars(store, 'ACME', 5);

    expect(window).toHaveLength(5);
    expect(window.map((b) => b.tradingDate)).toEqual([
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ]);
  });

  it('refuses a bar whose fetched_at cannot be parsed', () => {
    /*
     * NOT the missing-value case: `fetched_at` is NOT NULL and holds no nulls
     * in production, so that branch could not be written as a test at all --
     * which is why it is not one. The column is TEXT and nothing constrains
     * its shape, so an unparseable stamp is the reachable failure. Date.parse
     * gives NaN, and NaN >= anything is false, so the bar would have been
     * dropped regardless; the explicit check is what makes that a decision
     * rather than an accident of comparison.
     */
    const store = db();
    store
      .prepare(
        `INSERT INTO daily_bars (symbol, trading_date, open, high, low, close, volume, adjustment, source, fetched_at)
         VALUES ('ACME','2026-08-20',1,2,1,2,1000,'split','test','not a timestamp')`,
      )
      .run();

    expect(readDailyBars(store, 'ACME')).toEqual([]);
  });

  it('does not leak fetched_at into the returned bar', () => {
    const store = db();
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-20', fetchedAt: sessionEnd('2026-08-20') })]);

    expect(readDailyBars(store, 'ACME')[0]).not.toHaveProperty('fetchedAt');
  });
});

/**
 * The same bar set, two opposite requirements.
 *
 * `EXCLUDE` was the only behaviour, and it was chosen for the cycle -- where a
 * part-day close and a part-day volume make a rate wrong in an unknown
 * direction. Blue sky is a BOUND, and there the same filter is actively
 * harmful: a high only rises within a session, so hiding an unfinished bar
 * UNDERSTATES the ceiling, and an understated ceiling is the direction that
 * manufactures a false blue sky.
 *
 * BTCT, 2026-08-24, on the trader's board: the 08-20 bar held a 1.57 high and
 * was fetched at 10:01 ET, mid-session. Hidden, the ceiling fell to 1.48 from
 * June, and the ladder reported "IN VERIFIED BLUE SKY - PRIOR CEILING $1.48"
 * against a level the same store already contradicted.
 */
describe('choosing what an unfinished bar means', () => {
  const btct = () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-06-09', high: 1.48, close: 1.4, fetchedAt: sessionEnd('2026-06-09') }),
      bar({ tradingDate: '2026-08-19', high: 1.32, close: 0.84, fetchedAt: sessionEnd('2026-08-19') }),
      // Fetched 10:01 ET on its own trading date: a running high, not a final one.
      bar({ tradingDate: '2026-08-20', high: 1.57, close: 1.25, fetchedAt: midSession('2026-08-20') }),
    ]);
    return store;
  };

  it('hides the running high by default, which is what broke the ceiling', () => {
    const highs = readDailyBars(btct(), 'ACME').map((b) => b.high);

    expect(highs).toEqual([1.48, 1.32]);
    expect(Math.max(...(highs as number[]))).toBe(1.48);
  });

  it('includes it for a bound, restoring the real ceiling', () => {
    const bars = readDailyBars(btct(), 'ACME', 90, 'INCLUDE');

    expect(bars.map((b) => b.high)).toEqual([1.48, 1.32, 1.57]);
    expect(Math.max(...(bars.map((b) => b.high) as number[]))).toBe(1.57);
  });

  it('marks which sessions had finished, so a consumer is never guessing', () => {
    const bars = readDailyBars(btct(), 'ACME', 90, 'INCLUDE');

    expect(bars.map((b) => b.sessionComplete)).toEqual([true, true, false]);
  });

  it('reports every bar complete when they are excluded, rather than leaving it unset', () => {
    // An absent flag would have to be read as "probably fine", which is the
    // default this codebase refuses everywhere else.
    const bars = readDailyBars(btct(), 'ACME');

    expect(bars.every((b) => b.sessionComplete)).toBe(true);
  });

  it('still fills the requested window under EXCLUDE, and does not under INCLUDE', () => {
    /*
     * INCLUDE takes the limit literally because nothing was dropped; EXCLUDE
     * re-queries to make up the shortfall. Pinned because the two paths return
     * different counts for the same limit and that is intentional.
     */
    const store = btct();

    expect(readDailyBars(store, 'ACME', 2)).toHaveLength(2);
    expect(readDailyBars(store, 'ACME', 2, 'INCLUDE')).toHaveLength(2);
    expect(readDailyBars(store, 'ACME', 2, 'INCLUDE').map((b) => b.tradingDate)).toEqual([
      '2026-08-19',
      '2026-08-20',
    ]);
  });
});
