import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { loadMinuteBars, minuteBarsLowerBound, upsertMinuteBars } from '@/lib/market/store/repo';

/*
 * loadMinuteBars' ts bound returns the SAME rows by design, so no row-level
 * test can tell it is gone. The plan test is the only one that fails when the
 * bound is removed; the D-1 bar test is the only one that fails when it is
 * made too tight. Each was predicted to kill exactly one mutant.
 */

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-mbbound-')), 'market.db');
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

function bar(ts: string) {
  return {
    symbol: 'ABCD',
    ts,
    open: 1,
    high: 2,
    low: 1,
    close: 1.5,
    volume: 100,
    tradeCount: 10,
    vwap: 1.4,
    source: 'sip',
    receivedAt: ts,
  };
}

/** Records the SQL of every SELECT on minute_bars the code prepares on this handle. */
function recordMinuteBarSelects(db: ReturnType<typeof temporaryDb>): string[] {
  const seen: string[] = [];
  const prepare = db.prepare.bind(db);
  db.prepare = ((sql: string) => {
    if (/^\s*SELECT\b[\s\S]*\bFROM minute_bars\b/i.test(sql)) seen.push(sql);
    return prepare(sql);
  }) as typeof db.prepare;
  return seen;
}

describe('loadMinuteBars ts bound', () => {
  it('seeks the (symbol, ts) key instead of walking every retained date of the symbol', () => {
    const db = temporaryDb();
    upsertMinuteBars(db, '2026-09-29', [bar('2026-09-29T14:30:00.000Z')]);
    const seen = recordMinuteBarSelects(db);

    loadMinuteBars(db, 'ABCD', '2026-09-29');

    expect(seen).toHaveLength(1);
    const plan = db
      .prepare(`EXPLAIN QUERY PLAN ${seen[0]}`)
      .all('ABCD', '2026-09-29', minuteBarsLowerBound('2026-09-29')) as Array<{ detail: string }>;
    expect(plan.map((row) => row.detail).join(' | ')).toContain('(symbol=? AND ts>?)');
    db.close();
  });

  it('still returns a bar filed under D whose ts falls on D-1', () => {
    const db = temporaryDb();
    upsertMinuteBars(db, '2026-09-29', [
      bar('2026-09-28T23:59:00.000Z'),
      bar('2026-09-29T14:30:00.000Z'),
    ]);
    upsertMinuteBars(db, '2026-09-25', [bar('2026-09-25T14:30:00.000Z')]);

    expect(loadMinuteBars(db, 'ABCD', '2026-09-29').map((row) => row.ts)).toEqual([
      '2026-09-28T23:59:00.000Z',
      '2026-09-29T14:30:00.000Z',
    ]);
    db.close();
  });

  it('bounds at 00:00Z of the day before', () => {
    expect(minuteBarsLowerBound('2026-09-29')).toBe('2026-09-28T00:00:00.000Z');
    expect(minuteBarsLowerBound('2026-03-09')).toBe('2026-03-08T00:00:00.000Z');
  });
});
