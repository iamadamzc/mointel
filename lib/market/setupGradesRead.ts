/**
 * The setupGrades reader: MarketSnapshot.setupGrades from the stored grade.
 *
 * The grade is computed ONCE at capture (assessmentRepo.insertAssessmentTickers,
 * schema v29) and this reader only passes it on: no threshold is applied here
 * (field contract docs/research/sheet-reproduction/field-contract-final-2026-10-05.md
 * section 2; Integration 28th's contract on the map).
 *
 * THE MAP'S THREE STATES.
 *   - undefined: no checkpoint row anywhere carries a grade yet (before the
 *     first checkpoint after the v29 ship). The field is OMITTED, so every
 *     grade surface stays hidden (Design 67da54f4).
 *   - a symbol absent: the name has no row on any COMPLETE checkpoint.
 *   - a symbol null: its latest COMPLETE checkpoint row predates v29.
 * Otherwise the value is that row's grade, readings, rule, and the
 * checkpoint's completed_at (the tooltip's time).
 *
 * CACHED per (store, newest COMPLETE checkpoint id): the answer can change only
 * when a checkpoint completes, and /api/market is read far more often than
 * that. The key read is one MAX over the checkpoint table (hundreds of rows).
 */

import { CRITERIA, type SetupGrade, type StoredGrade, type StoredReading } from '../dashboard/setupGrade';
import type { MarketDatabase } from './store/db';

/** A name no COMPLETE checkpoint ever held: left out of the map. */
const ABSENT = 'ABSENT';

interface Cache {
  key: string;
  graded: boolean;
  values: Map<string, SetupGrade | null | typeof ABSENT>;
}

let cache: Cache | null = null;

/** Tests only: forget the cache between stores. */
export function resetSetupGradesCache(): void {
  cache = null;
}

const GRADES: ReadonlySet<string> = new Set<StoredGrade>(['A', 'B', 'C', 'AVOID', 'UNKNOWN', 'NOT_YET']);
const READINGS: ReadonlySet<string> = new Set<StoredReading>(['STRONG', 'LIMITED', 'RISK', 'UNKNOWN', 'NOT_YET']);

/**
 * The stored basis, or null unless it carries every criterion with a known
 * reading. A value the client cannot map reads as no grade, never as a grade.
 */
function parseBasis(text: string | null): SetupGrade['basis'] | null {
  if (text === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  for (const criterion of CRITERIA) {
    const reading = record[criterion];
    if (typeof reading !== 'string' || !READINGS.has(reading)) return null;
  }
  return Object.fromEntries(CRITERIA.map((criterion) => [criterion, record[criterion]])) as SetupGrade['basis'];
}

export function readSetupGrades(
  db: MarketDatabase,
  dbPath: string,
  symbols: readonly string[],
): Record<string, SetupGrade | null> | undefined {
  const newest = db
    .prepare(`SELECT MAX(id) AS id FROM desk_assessments WHERE status = 'COMPLETE'`)
    .get() as { id: number | null };
  const key = `${dbPath}|${newest.id ?? 0}`;
  if (!cache || cache.key !== key) {
    const graded =
      db
        .prepare(
          `SELECT 1 FROM desk_assessment_tickers t
             JOIN desk_assessments a ON a.id = t.assessment_id
            WHERE a.status = 'COMPLETE' AND t.priority_grade IS NOT NULL
            LIMIT 1`,
        )
        .get() !== undefined;
    cache = { key, graded, values: new Map() };
  }
  if (!cache.graded) return undefined;

  const current = cache;
  const missing = symbols.filter((symbol) => !current.values.has(symbol));
  if (missing.length > 0) {
    const latest = db.prepare(
      `SELECT t.priority_grade AS grade, t.priority_basis AS basis, t.priority_rule AS rule,
              a.completed_at AS completedAt
         FROM desk_assessment_tickers t
         JOIN desk_assessments a ON a.id = t.assessment_id
        WHERE t.ticker = ? AND a.status = 'COMPLETE'
        ORDER BY a.id DESC
        LIMIT 1`,
    );
    for (const symbol of missing) {
      const row = latest.get(symbol) as
        | { grade: string | null; basis: string | null; rule: string | null; completedAt: string | null }
        | undefined;
      if (row === undefined) {
        current.values.set(symbol, ABSENT);
        continue;
      }
      const basis = parseBasis(row.basis);
      current.values.set(
        symbol,
        row.grade === null || !GRADES.has(row.grade) || basis === null || row.rule === null || row.completedAt === null
          ? null
          : {
              grade: row.grade as StoredGrade,
              basis,
              rule: row.rule,
              checkpointCompletedAt: row.completedAt,
            },
      );
    }
  }

  const out: Record<string, SetupGrade | null> = {};
  for (const symbol of symbols) {
    const value = current.values.get(symbol);
    if (value !== undefined && value !== ABSENT) out[symbol] = value;
  }
  return out;
}
