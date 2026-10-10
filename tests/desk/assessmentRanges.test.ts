import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, SCHEMA_VERSION } from '@/lib/market/store/db';
import {
  computeRangeCounts,
  insertAssessmentRanges,
  insertAssessmentTickers,
  readAssessmentRanges,
  readAssessmentTickers,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import {
  captureRanges,
  RANGE_TOP_N,
  rangeOnlySymbols,
  reassessmentTargets,
} from '@/lib/desk/rangeCapture';

/*
 * v28: per-range rows at each checkpoint (frozen counts + the range's own top
 * names) and the after-hours path frozen on each ticker row.
 */

const temporaryFiles: string[] = [];

function temporaryPath() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-ranges-')), 'market.db');
  temporaryFiles.push(file);
  return file;
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

const D = '2026-09-30';

interface Seed {
  symbol: string;
  price: number | null;
  rvol?: number | null;
  percentChange?: number | null;
  cumulativeVolume?: number | null;
  volumeBaseThrough?: string | null;
  ahParticipation?: number | null;
  ahPercentChange?: number | null;
  ahVolume?: number | null;
  eligible?: 0 | 1 | null;
}

function seed(db: ReturnType<typeof openDatabase>, rows: Seed[]) {
  const insert = db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, price, rvol, percent_change, cumulative_volume,
       volume_base_through, ah_participation, ah_percent_change, ah_volume, feed, updated_at)
     VALUES (@symbol, @date, @price, @rvol, @percentChange, @cumulativeVolume,
       @volumeBaseThrough, @ahParticipation, @ahPercentChange, @ahVolume, 'sip', @date)`,
  );
  const universe = db.prepare(
    `INSERT INTO universe (symbol, discovery_eligible, source, updated_at) VALUES (?, ?, 'test', '2026-09-30')`,
  );
  for (const row of rows) {
    insert.run({
      symbol: row.symbol,
      date: D,
      price: row.price,
      rvol: row.rvol ?? null,
      percentChange: row.percentChange ?? null,
      cumulativeVolume: row.cumulativeVolume ?? null,
      volumeBaseThrough: row.volumeBaseThrough ?? null,
      ahParticipation: row.ahParticipation ?? null,
      ahPercentChange: row.ahPercentChange ?? null,
      ahVolume: row.ahVolume ?? null,
    });
    if (row.eligible !== undefined && row.eligible !== null) universe.run(row.symbol, row.eligible);
  }
}

const POPULATION: Seed[] = [
  // Inside $1-$20.
  // Common equity in the engine's eligible set (eligible: 1), as on the box.
  { symbol: 'UPUP', price: 5, rvol: 9, percentChange: 12, cumulativeVolume: 1000, ahParticipation: 0.5, ahPercentChange: 3, ahVolume: 500, eligible: 1 },
  { symbol: 'DOWN', price: 2, rvol: 4, percentChange: -8, cumulativeVolume: 500, volumeBaseThrough: `${D}T14:00:00.000Z`, ahParticipation: 0.2, ahPercentChange: -1, ahVolume: 100, eligible: 1 },
  { symbol: 'FLAT', price: 10, rvol: 2, percentChange: 0, cumulativeVolume: 50, ahParticipation: 0, ahPercentChange: null, eligible: 1 },
  { symbol: 'NOTR', price: 7, rvol: null, percentChange: 3, cumulativeVolume: 0, eligible: 1 },
  // Bounds are inclusive.
  { symbol: 'EDGE', price: 20, rvol: 6, percentChange: 1, cumulativeVolume: 10, ahParticipation: 0.1, ahPercentChange: 2, ahVolume: 10, eligible: 1 },
  // Outside: priced out, NULL price, ineligible.
  { symbol: 'HIGH', price: 25, rvol: 50, percentChange: 40, cumulativeVolume: 9999, eligible: 1 },
  { symbol: 'NOPR', price: null, rvol: 30, percentChange: 5, cumulativeVolume: 10, eligible: 1 },
  { symbol: 'INEL', price: 3, rvol: 40, percentChange: 9, cumulativeVolume: 10, eligible: 0 },
  // No universe row: outside, as the engine never ranks it (Integration 37th, 2026-10-10). Counted until then.
  { symbol: 'NORW', price: 4, rvol: 45, percentChange: 6, cumulativeVolume: 100, ahParticipation: 0.9, ahPercentChange: 4, ahVolume: 900 },
];

describe('v28 schema', () => {
  it('upgrades a v27-shaped store: the ranges table and the four columns appear', () => {
    const file = temporaryPath();
    const fresh = openDatabase(file);
    fresh.exec('DROP TABLE desk_assessment_ranges');
    fresh.exec('DROP TABLE session_reports');
    for (const column of ['ah_reference_close', 'ah_high', 'ah_low']) {
      fresh.exec(`ALTER TABLE desk_assessment_tickers DROP COLUMN ${column}`);
    }
    fresh.exec('ALTER TABLE issuer_registry DROP COLUMN sic_description');
    fresh.pragma('user_version = 27');
    fresh.close();

    const db = openDatabase(file);
    // v29 (the Priority grade) followed; a v27 store now upgrades to the current version.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(28);
    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    const columns = (table: string) =>
      (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
    expect(columns('desk_assessment_ranges')).toContain('top_tickers');
    expect(columns('desk_assessment_tickers')).toEqual(
      expect.arrayContaining(['ah_reference_close', 'ah_high', 'ah_low']),
    );
    expect(columns('issuer_registry')).toContain('sic_description');
    expect(columns('session_reports')).toEqual(
      expect.arrayContaining(['kind', 'range_key', 'assessment_id', 'status', 'payload', 'missed_cause']),
    );
    db.close();
  });

  it('holds session_reports to one row per slot, with payload iff PUBLISHED', () => {
    const db = openDatabase(temporaryPath());
    // better-sqlite3 enforces foreign keys by default: a report needs its checkpoint.
    db.prepare(
      `INSERT INTO desk_assessments (id, trading_date, assessment_type, scheduled_for, started_at,
         session_phase, status) VALUES (1, ?, 'AFTER_HOURS_CLOSE', ?, ?, 'POST_MARKET', 'COMPLETE')`,
    ).run(D, `${D}T00:05:00.000Z`, `${D}T00:05:00.000Z`);
    const insert = db.prepare(
      `INSERT INTO session_reports (kind, range_key, range_min, range_max, trading_date,
         assessment_id, status, payload, missed_cause, versions, created_at)
       VALUES (@kind, '1-20', 1, 20, @date, 1, @status, @payload, @missed, '{}', @date)`,
    );
    const row = { kind: 'AFTER_HOURS', date: D, status: 'PUBLISHED', payload: '{}', missed: null };
    insert.run(row);
    // One row per (kind, range, date).
    expect(() => insert.run(row)).toThrow(/UNIQUE/);
    // A PUBLISHED row must carry a payload; a MISSED row a cause and no payload.
    expect(() => insert.run({ ...row, kind: 'INTO_RTH', payload: null })).toThrow(/CHECK/);
    expect(() =>
      insert.run({ ...row, kind: 'INTO_RTH', status: 'MISSED', payload: '{}', missed: '{}' }),
    ).toThrow(/CHECK/);
    insert.run({ ...row, kind: 'INTO_RTH', status: 'MISSED', payload: null, missed: '{}' });
    db.close();
  });
});

describe('the range-only guard', () => {
  it('adds each range name the band did not carry, once', () => {
    expect(
      rangeOnlySymbols(['AAA', 'BBB'], [{ topTickers: ['BBB', 'CCC'] }, { topTickers: ['CCC', 'DDD'] }]),
    ).toEqual(['CCC', 'DDD']);
  });

  it('never queues a reassessment for a range-only name', () => {
    expect(reassessmentTargets(['AAA', 'CCC', 'BBB'], new Set(['AAA', 'BBB']))).toEqual(['AAA', 'BBB']);
  });
});

describe('computeRangeCounts', () => {
  it('counts the session to date: traded by volume since 04:00, up/down among traded', () => {
    const db = openDatabase(temporaryPath());
    seed(db, POPULATION);
    expect(computeRangeCounts(db, D, { min: 1, max: 20 }, 'SESSION_TO_DATE')).toEqual({
      // UPUP DOWN FLAT NOTR EDGE; not HIGH (priced out), NOPR (no price), INEL (ineligible), NORW (no universe row).
      eligible: 5,
      // NOTR has zero volume.
      traded: 4,
      up: 2,
      down: 1,
      // DOWN carries a snapshot volume base.
      volumeBaseSeeded: 1,
    });
    db.close();
  });

  it('counts the after-hours session: traded by participation, up/down by the AH change', () => {
    const db = openDatabase(temporaryPath());
    seed(db, POPULATION);
    expect(computeRangeCounts(db, D, { min: 1, max: 20 }, 'AFTER_HOURS')).toEqual({
      eligible: 5,
      traded: 3,
      up: 2,
      down: 1,
      volumeBaseSeeded: 0,
    });
    db.close();
  });
});

describe("computeRangeCounts, the engine's empty-set fallback", () => {
  it('with no eligible universe row at all, every priced name in range counts, as the engine ranks them all', () => {
    const db = openDatabase(temporaryPath());
    seed(db, POPULATION);
    db.prepare('UPDATE universe SET discovery_eligible = 0').run();
    // UPUP DOWN FLAT NOTR EDGE INEL NORW.
    expect(computeRangeCounts(db, D, { min: 1, max: 20 }, 'SESSION_TO_DATE').eligible).toBe(7);
    db.close();
  });
});

describe('captureRanges', () => {
  it("ranks inside the range with the board's own function, and records the counts", () => {
    const db = openDatabase(temporaryPath());
    seed(db, POPULATION);
    const [row] = captureRanges(db, D, { board: 'DAILY_RVOL', rankingLabel: 'Daily RVOL' }, [
      { min: 1, max: 20 },
    ]);
    expect(row.rangeKey).toBe('1-20');
    expect(row.countWindow).toBe('SESSION_TO_DATE');
    expect(row.topN).toBe(RANGE_TOP_N);
    // By RVOL, in range only: HIGH and INEL outrank them on the band but are not in it.
    expect(row.topTickers).toEqual(['UPUP', 'EDGE', 'DOWN', 'FLAT']);
    expect(row.eligible).toBe(5);
    db.close();
  });

  it('uses the after-hours board and window at an after-hours checkpoint', () => {
    const db = openDatabase(temporaryPath());
    seed(db, POPULATION);
    const [row] = captureRanges(db, D, { board: 'AFTER_HOURS', rankingLabel: 'AH Participation' }, [
      { min: 1, max: 20 },
    ]);
    expect(row.countWindow).toBe('AFTER_HOURS');
    // Names that have not traded since the bell are not on the after-hours board.
    expect(row.topTickers).not.toContain('FLAT');
    expect(row.topTickers).not.toContain('NOTR');
    expect(row.traded).toBe(3);
    db.close();
  });
});

describe('persistence', () => {
  it('round-trips a range row and the frozen after-hours path', () => {
    const db = openDatabase(temporaryPath());
    const id = Number(
      db
        .prepare(
          `INSERT INTO desk_assessments (trading_date, assessment_type, scheduled_for, started_at,
             session_phase, status) VALUES (?, 'AFTER_HOURS_CLOSE', ?, ?, 'POST_MARKET', 'RUNNING')`,
        )
        .run(D, `${D}T00:05:00.000Z`, `${D}T00:05:00.000Z`).lastInsertRowid,
    );
    const ticker = {
      ticker: 'UPUP',
      assessmentRank: 1,
      liveSessionRank: 1,
      price: 5,
      percentChange: 12,
      rvol: 9,
      rvolRank: 1,
      ahPercentChange: 3,
      ahVolume: 500,
      ahParticipation: 0.5,
      ahRank: 1,
      volume: 1000,
      spreadPct: null,
      sessionHigh: null,
      sessionLow: null,
      referenceClose: null,
      referenceBasis: null,
      priceAt: null,
      cycle: null,
      catalyst: null,
      structure: null,
      intelligenceStatus: null,
      intelligenceSource: null,
      analysisVersionId: null,
      evidenceFingerprint: null,
      cycleFingerprint: null,
      levelSummary: null,
      haltState: null,
      focus: false,
      warnings: [],
      changedFields: [],
      changeSummary: '',
      ahReferenceClose: 4.8,
      ahHigh: 5.4,
      ahLow: 4.7,
    } satisfies AssessmentTickerRecord;
    insertAssessmentTickers(db, id, [ticker]);
    const [stored] = readAssessmentTickers(db, id);
    expect([stored.ahReferenceClose, stored.ahHigh, stored.ahLow]).toEqual([4.8, 5.4, 4.7]);

    const range = {
      rangeKey: '1-20',
      rangeMin: 1,
      rangeMax: 20,
      countWindow: 'AFTER_HOURS' as const,
      countsVersion: 1,
      eligible: 5,
      traded: 3,
      up: 2,
      down: 1,
      volumeBaseSeeded: 0,
      topN: 25,
      topTickers: ['UPUP', 'EDGE', 'DOWN'],
      rankingDefinition: 'AH Participation',
    };
    insertAssessmentRanges(db, id, [range]);
    // Append-only: a second write of the same range is ignored.
    insertAssessmentRanges(db, id, [{ ...range, traded: 99 }]);
    expect(readAssessmentRanges(db, id)).toEqual([range]);
    db.close();
  });
});
