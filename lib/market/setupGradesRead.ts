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

/*
 * Every stored value, as a Record keyed by the type, so tsc rejects a missing
 * or extra member: a new StoredGrade or StoredReading cannot ship without its
 * entry here (Commercial 47a, Integration 36th). A Set literal typed
 * Set<StoredGrade> did not enforce that: it accepts a subset.
 */
const GRADE_VALUES: Record<StoredGrade, true> = {
  A: true,
  B: true,
  C: true,
  AVOID: true,
  UNKNOWN: true,
  NOT_YET: true,
};
const READING_VALUES: Record<StoredReading, true> = {
  STRONG: true,
  LIMITED: true,
  RISK: true,
  UNKNOWN: true,
  NOT_YET: true,
};
export const GRADES: ReadonlySet<string> = new Set(Object.keys(GRADE_VALUES));
export const READINGS: ReadonlySet<string> = new Set(Object.keys(READING_VALUES));

/**
 * Why a stored row read as null. UNGRADED is expected (rows captured before
 * v29); every other cause is a stored grade the client cannot show, so the
 * board would say no grade was recorded when one was. Zero is expected.
 */
export type RejectCause = 'UNGRADED' | 'UNKNOWN_GRADE' | 'BAD_BASIS' | 'NO_RULE' | 'NO_COMPLETED_AT';

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
  log: (line: string) => void = (line) => console.log(line),
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
    const rejected: Record<RejectCause, number> = {
      UNGRADED: 0,
      UNKNOWN_GRADE: 0,
      BAD_BASIS: 0,
      NO_RULE: 0,
      NO_COMPLETED_AT: 0,
    };
    let graded = 0;
    for (const symbol of missing) {
      const row = latest.get(symbol) as
        | { grade: string | null; basis: string | null; rule: string | null; completedAt: string | null }
        | undefined;
      if (row === undefined) {
        current.values.set(symbol, ABSENT);
        continue;
      }
      const basis = parseBasis(row.basis);
      const cause: RejectCause | null =
        row.grade === null
          ? 'UNGRADED'
          : !GRADES.has(row.grade)
            ? 'UNKNOWN_GRADE'
            : basis === null
              ? 'BAD_BASIS'
              : row.rule === null
                ? 'NO_RULE'
                : row.completedAt === null
                  ? 'NO_COMPLETED_AT'
                  : null;
      if (cause !== null || basis === null) {
        rejected[cause ?? 'BAD_BASIS'] += 1;
        current.values.set(symbol, null);
        continue;
      }
      graded += 1;
      current.values.set(symbol, {
        grade: row.grade as StoredGrade,
        basis,
        rule: row.rule as string,
        checkpointCompletedAt: row.completedAt as string,
      });
    }
    /*
     * One line per fill (a fill happens when a checkpoint completes or a new
     * name appears, never on every request), so a stored grade the client
     * cannot show is counted where Ops reads the journal. Zero is expected
     * for every cause except UNGRADED.
     */
    log(
      `[grades] read ${missing.length} name(s): ${graded} graded; null by cause: ` +
        (Object.keys(rejected) as RejectCause[]).map((c) => `${c} ${rejected[c]}`).join(', '),
    );
  }

  const out: Record<string, SetupGrade | null> = {};
  for (const symbol of symbols) {
    const value = current.values.get(symbol);
    if (value !== undefined && value !== ABSENT) out[symbol] = value;
  }
  return out;
}
