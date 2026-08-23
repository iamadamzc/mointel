/**
 * The assessment extract Ops runs on production.
 *
 * This is the file that leaves the server, so the tests are as much about what
 * it does NOT contain as about what it does. It goes over the wire in place of
 * a 325 MB snapshot carrying every price and every research dossier, and that
 * trade is only sound if the extract really is limited to two tables.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import Database from 'better-sqlite3';

import { readCheckpointRows, rollUpDeskDays } from '@/lib/archive/coverage';
import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentTickers,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import { openDatabase } from '@/lib/market/store/db';
import { exportAssessments } from '@/lib/archive/export';

const directories: string[] = [];

function temporaryDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-export-test-'));
  directories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of directories.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* the OS will clean up */
    }
  }
});

function ticker(symbol: string): AssessmentTickerRecord {
  return {
    ticker: symbol,
    assessmentRank: 1,
    liveSessionRank: 1,
    price: 4.2,
    percentChange: 55,
    rvol: 8,
    rvolRank: 1,
    ahPercentChange: null,
    ahVolume: null,
    ahParticipation: null,
    ahRank: null,
    volume: 1_000_000,
    spreadPct: 0.4,
    sessionHigh: 4.9,
    sessionLow: 3.8,
    referenceClose: 2.7,
    referenceBasis: 'PRIOR_SESSION',
    priceAt: '2026-08-18T14:00:00.000Z',
    cycle: null,
    catalyst: 'LEGITIMATE_POSITIVE',
    structure: null,
    intelligenceStatus: 'INTELLIGENCE_AVAILABLE',
    intelligenceSource: 'AUTO',
    analysisVersionId: null,
    evidenceFingerprint: null,
    cycleFingerprint: null,
    levelSummary: null,
    haltState: null,
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
  };
}

/** A market store with two dates of assessments, plus unrelated content. */
function seedMarketStore(file: string): void {
  const db = openDatabase(file);

  for (const [date, scheduled] of [
    ['2026-08-17', '2026-08-17T20:00:00.000Z'],
    ['2026-08-18', '2026-08-18T20:00:00.000Z'],
    ['2026-08-19', '2026-08-19T20:00:00.000Z'],
  ] as const) {
    const claim = claimAssessmentSlot(db, {
      tradingDate: date,
      targetTradingDate: null,
      assessmentType: 'RTH_CLOSE',
      scheduledFor: scheduled,
      startedAt: scheduled,
      generatedLate: false,
      sessionPhase: 'RTH',
      board: 'DAILY_RVOL',
      rankingDefinition: 'daily rvol',
    });
    if (claim === null) throw new Error(`could not claim a slot for ${date}`);
    insertAssessmentTickers(db, claim, [ticker('AAA'), ticker('BBB')]);
    completeAssessment(db, claim, {
      status: 'COMPLETE',
      completedAt: scheduled,
      tickerCount: 2,
      modelCalls: 0,
      runtimeMs: 10,
      marketFingerprint: null,
      researchFingerprint: null,
      notes: '',
      metadata: {},
    });
  }

  // Content the extract must leave behind.
  db.prepare(
    `INSERT INTO daily_bars (symbol, trading_date, close, adjustment, source, fetched_at)
     VALUES ('AAA', '2026-08-18', 4.2, 'split', 'test', '2026-08-18T21:00:00.000Z')`,
  ).run();
  db.close();
}

describe('exportAssessments', () => {
  it('copies the assessment record and nothing else', () => {
    const dir = temporaryDir();
    const source = path.join(dir, 'market.db');
    const destination = path.join(dir, 'assessments.db');
    seedMarketStore(source);

    const result = exportAssessments({ source, destination });

    expect(result.counts.desk_assessments).toBe(3);
    expect(result.counts.desk_assessment_tickers).toBe(6);

    const copy = new Database(destination, { readonly: true });
    const tables = (
      copy
        .prepare(
          `SELECT name FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name`,
        )
        .all() as { name: string }[]
    ).map((row) => row.name);

    // The whole justification for shipping this instead of a full snapshot.
    // sqlite_sequence is excluded above: SQLite creates it itself for the
    // AUTOINCREMENT key and it carries one integer.
    expect(tables).toEqual(['desk_assessment_tickers', 'desk_assessments']);
    expect(tables).not.toContain('daily_bars');
    expect(tables).not.toContain('research_sources');
    expect(tables).not.toContain('minute_bars');
    copy.close();
  });

  it('never writes to the source', () => {
    const dir = temporaryDir();
    const source = path.join(dir, 'market.db');
    seedMarketStore(source);
    const before = fs.statSync(source).mtimeMs;

    exportAssessments({ source, destination: path.join(dir, 'out.db') });

    // Opened read-only, so this is belt and braces — but it is production, and
    // the whole option rests on the claim being true rather than intended.
    expect(fs.statSync(source).mtimeMs).toBe(before);
  });

  it('bounds the child rows through their parent, not by themselves', () => {
    const dir = temporaryDir();
    const source = path.join(dir, 'market.db');
    const destination = path.join(dir, 'bounded.db');
    seedMarketStore(source);

    const result = exportAssessments({
      source,
      destination,
      from: '2026-08-18',
      to: '2026-08-19',
    });

    expect(result.counts.desk_assessments).toBe(2);
    // desk_assessment_tickers has no trading_date of its own. Bounded wrongly,
    // this would carry all six rows and orphan two of them.
    expect(result.counts.desk_assessment_tickers).toBe(4);

    const copy = new Database(destination, { readonly: true });
    const orphans = copy
      .prepare(
        `SELECT COUNT(*) AS n FROM desk_assessment_tickers t
          WHERE NOT EXISTS (SELECT 1 FROM desk_assessments a WHERE a.id = t.assessment_id)`,
      )
      .get() as { n: number };
    expect(orphans.n).toBe(0);
    copy.close();
  });

  it('reports a count per trading date, so it doubles as the verification query', () => {
    const dir = temporaryDir();
    const source = path.join(dir, 'market.db');
    seedMarketStore(source);

    const result = exportAssessments({ source, destination: path.join(dir, 'out.db') });

    expect(result.byDate).toEqual([
      { tradingDate: '2026-08-17', assessments: 1, tickerRows: 2 },
      { tradingDate: '2026-08-18', assessments: 1, tickerRows: 2 },
      { tradingDate: '2026-08-19', assessments: 1, tickerRows: 2 },
    ]);
  });

  it('produces something the backfill can actually read', () => {
    // The point of the whole exercise: what Ops copies down has to drive the
    // coverage rollup with no further translation.
    const dir = temporaryDir();
    const source = path.join(dir, 'market.db');
    const destination = path.join(dir, 'assessments.db');
    seedMarketStore(source);
    exportAssessments({ source, destination });

    const extract = new Database(destination, { readonly: true });
    const days = rollUpDeskDays(readCheckpointRows(extract));

    expect(days).toHaveLength(6);
    expect(days.every((day) => day.coverage === 'GRADED')).toBe(true);
    expect(days[0].catalystBest).toBe('LEGITIMATE_POSITIVE');
    extract.close();
  });

  it('carries the unique slot index, so the copy keeps the constraint', () => {
    const dir = temporaryDir();
    const source = path.join(dir, 'market.db');
    const destination = path.join(dir, 'assessments.db');
    seedMarketStore(source);
    exportAssessments({ source, destination });

    const copy = new Database(destination);
    expect(() =>
      copy
        .prepare(
          `INSERT INTO desk_assessments
             (trading_date, assessment_type, scheduled_for, started_at, session_phase, status)
           VALUES ('2026-08-17', 'RTH_CLOSE', '2026-08-17T20:00:00.000Z',
                   '2026-08-17T20:00:00.000Z', 'RTH', 'COMPLETE')`,
        )
        .run(),
    ).toThrow(/UNIQUE/);
    copy.close();
  });
});
