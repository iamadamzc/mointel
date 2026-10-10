/**
 * The held rank list (lib/market/heldRanks.ts, rank once): what it serves and when it refuses. Against a real worker
 * thread and a real store; the clock is injected (monotonic in production), so staleness is tested without waiting.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { HeldRanks, MAX_AGE_MS, filterHeld, heldBoardFromRows } from '@/lib/market/heldRanks';

const DATE = '2026-10-09';
const files: string[] = [];
const instances: HeldRanks[] = [];

afterEach(() => {
  while (instances.length) instances.pop()!.close();
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

/** A store whose ranked rows are `symbols`, in that rank order, all priced $5. */
function store(symbols: readonly string[]): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-held-')), 'market.db');
  files.push(file);
  const db = openDatabase(file);
  const insert = db.prepare(
    `INSERT INTO ticker_session
       (symbol, trading_date, price, rvol, rvol_rank, ah_rank, latched, ah_latched, feed, updated_at)
     VALUES (?, ?, 5, 1, ?, ?, 0, 0, 'sip', '2026-10-09T14:00:00Z')`,
  );
  symbols.forEach((symbol, i) => insert.run(symbol, DATE, i + 1, i + 1));
  db.close();
  return file;
}

function held(clock: { t: number }) {
  const instance = new HeldRanks(() => clock.t);
  instances.push(instance);
  return instance;
}

describe('the held list', () => {
  it('serves its own date while fresh, and refuses another date and a stale list', async () => {
    const clock = { t: 1_000 };
    const ranks = held(clock);
    ranks.touch(store(['AAA', 'BBB']), DATE);
    expect(ranks.get(DATE)).toBeNull(); // cold until the thread answers
    await ranks.next();
    expect(ranks.get(DATE)?.day.symbols).toEqual(['AAA', 'BBB']);
    expect(ranks.get(DATE)?.ah.symbols).toEqual(['AAA', 'BBB']);
    expect(ranks.get('2026-10-08')).toBeNull();
    clock.t += MAX_AGE_MS;
    expect(ranks.get(DATE)).not.toBeNull(); // the edge is still fresh
    clock.t += 1;
    expect(ranks.get(DATE)).toBeNull();
  });

  it('another store drops the list at once: it is not that store\'s, whatever its date', async () => {
    const clock = { t: 1_000 };
    const ranks = held(clock);
    ranks.touch(store(['AAA']), DATE);
    await ranks.next();
    expect(ranks.get(DATE)?.day.symbols).toEqual(['AAA']);
    ranks.touch(store(['ZZZ']), DATE);
    expect(ranks.get(DATE)).toBeNull();
    await ranks.next();
    expect(ranks.get(DATE)?.day.symbols).toEqual(['ZZZ']);
  });

  it('a store that cannot be opened leaves no list and records the error', async () => {
    const clock = { t: 1_000 };
    const ranks = held(clock);
    ranks.touch(path.join(os.tmpdir(), 'mointel-held-missing', 'market.db'), DATE);
    await expect(ranks.next(1_500)).rejects.toThrow('no held list');
    expect(ranks.get(DATE)).toBeNull();
    expect(ranks.error()).not.toBeNull();
  });
});

describe('filterHeld', () => {
  const board = heldBoardFromRows([
    ['IN', 5, 0, null],
    ['LOW', 0.99, 0, null],
    ['EDGE', 1, 0, null],
    ['TOP', 20, 0, null],
    ['NOPRICE', null, 1, 5],
    ['RAN', 25, 1, 4], // latched at $4, now $25: in a $1-$20 range
    ['RANWIDE', 25, 1, 0.5], // latched at $0.50: not in $1-$20
    ['NOLATCHPRICE', 25, 1, null],
    ['UNLATCHED', 25, 0, 4],
  ]);

  it('keeps the engine order, priced inside (edges inclusive) or latched at a price inside', () => {
    expect(filterHeld(board, { min: 1, max: 20 })).toEqual(['IN', 'EDGE', 'TOP', 'RAN']);
  });

  it('a range that takes only a latched name: UNLATCHED carries a qualification price but no latch', () => {
    expect(filterHeld(board, { min: 3, max: 4 })).toEqual(['RAN']);
  });
});
