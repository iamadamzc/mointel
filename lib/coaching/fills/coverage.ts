/**
 * Coverage windows for cross-store joins.
 *
 * This exists because of a specific failure, and the failure is the argument
 * for the shape of the fix.
 *
 * On 2026-09-07 a claim about which names the desk held was measured against
 * `assessments-prod-2026-09-02.db` -- a snapshot that stops before the session
 * being asked about. The query returned zero rows and the zero was read as
 * "the desk did not hold them". The file's own name said 09-02 and had been
 * typed repeatedly. **A filename does not travel into a query result**, so the
 * warning was present and useless at the moment it was needed.
 *
 * Every bucket-1 and bucket-2 question is a join between the trader's fills,
 * which advance every session he trades, and a desk extract, which advances
 * only when someone pulls one. The gap therefore grows on its own, always in
 * one direction, and every question asked across it comes back as a confident
 * zero that reads like a finding. Silent, directional, self-renewing.
 *
 * So the rule here is *make it impossible, not visible*: `assertCovers` throws
 * rather than returning a flag, and `describe` produces the line that belongs
 * beside any result computed across two stores.
 *
 * On `asOf` and why the fallback is marked weaker: an extract SHOULD carry
 * `meta.extract_as_of`, the moment the read against production ran. Where it
 * does not, the best available substitute is the newest `trading_date` in the
 * file -- but that is a strictly weaker fact. It says when the data ends, not
 * when the file was made, and those differ precisely when collection has
 * stopped, which is the case most worth detecting. `basis` records which one
 * was available so a caller can say so out loud.
 */

import Database from 'better-sqlite3';

export type CoverageBasis = 'extract_as_of' | 'max_trading_date';

export interface Coverage {
  /** The file the window was read from. */
  source: string;
  /** Earliest trading date present. */
  firstDate: string | null;
  /** Latest trading date present. */
  lastDate: string | null;
  /** When the extract was taken, if the file records it. */
  asOf: string | null;
  /** Which fact `asOf` rests on -- see the note above on why it matters. */
  basis: CoverageBasis;
  /** Distinct trading dates present, ascending. */
  dates: string[];
}

function tableExists(db: Database.Database, name: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?")
      .get(name) !== undefined
  );
}

/**
 * Read a store's coverage window.
 *
 * `dateTable`/`dateColumn` name where trading dates live; the defaults suit a
 * desk assessments extract. Works on any store that has a date column.
 */
export function readCoverage(
  dbPath: string,
  dateTable = 'desk_assessments',
  dateColumn = 'trading_date',
): Coverage {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    if (!tableExists(db, dateTable)) {
      throw new Error(`${dbPath} has no ${dateTable} table -- wrong store for this question?`);
    }

    const dates = (
      db
        .prepare(`SELECT DISTINCT ${dateColumn} AS d FROM ${dateTable} ORDER BY d`)
        .all() as { d: string }[]
    )
      .map((row) => row.d)
      .filter(Boolean);

    let asOf: string | null = null;
    if (tableExists(db, 'meta')) {
      const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('extract_as_of') as
        | { value: string }
        | undefined;
      asOf = row?.value ?? null;
    }

    return {
      source: dbPath,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      asOf: asOf ?? dates[dates.length - 1] ?? null,
      basis: asOf ? 'extract_as_of' : 'max_trading_date',
      dates,
    };
  } finally {
    db.close();
  }
}

/** The line that belongs beside any result computed across two stores. */
export function describe(coverage: Coverage): string {
  const range =
    coverage.firstDate && coverage.lastDate
      ? `${coverage.firstDate}..${coverage.lastDate}`
      : 'EMPTY';
  const stamp =
    coverage.basis === 'extract_as_of'
      ? `as-of ${coverage.asOf}`
      : `as-of UNKNOWN (file records none; newest data is ${coverage.lastDate})`;
  return `${coverage.source}  covers ${range}  ${stamp}`;
}

/** Trading dates inside the window that are missing from it -- a real hole. */
export function gaps(coverage: Coverage, expected: readonly string[]): string[] {
  const have = new Set(coverage.dates);
  return expected
    .filter((d) => coverage.firstDate !== null && d >= coverage.firstDate)
    .filter((d) => coverage.lastDate !== null && d <= coverage.lastDate)
    .filter((d) => !have.has(d));
}

export interface CoverageVerdict {
  covered: string[];
  /** Requested dates after the window ends -- the self-renewing failure. */
  beyond: string[];
  /** Requested dates before the window starts. */
  before: string[];
  /** Requested dates inside the window but absent -- a genuine hole. */
  missing: string[];
}

export function classify(coverage: Coverage, requested: readonly string[]): CoverageVerdict {
  const have = new Set(coverage.dates);
  const verdict: CoverageVerdict = { covered: [], beyond: [], before: [], missing: [] };

  for (const date of requested) {
    if (coverage.lastDate === null || coverage.firstDate === null) {
      verdict.beyond.push(date);
    } else if (date > coverage.lastDate) {
      verdict.beyond.push(date);
    } else if (date < coverage.firstDate) {
      verdict.before.push(date);
    } else if (!have.has(date)) {
      verdict.missing.push(date);
    } else {
      verdict.covered.push(date);
    }
  }

  return verdict;
}

/**
 * Refuse the join rather than let it answer from silence.
 *
 * Throws when any requested date falls outside the window. That is deliberate:
 * a boolean would be checked at the call site by the same discipline that
 * already failed once, so this raises instead. A caller that genuinely wants
 * the partial answer calls `classify` and says which dates it dropped.
 */
export function assertCovers(coverage: Coverage, requested: readonly string[]): void {
  const verdict = classify(coverage, requested);
  const outside = [...verdict.beyond, ...verdict.before, ...verdict.missing];
  if (outside.length === 0) return;

  const detail: string[] = [];
  if (verdict.beyond.length > 0) {
    detail.push(
      `${verdict.beyond.length} date(s) AFTER the extract ends (${verdict.beyond.join(', ')}) ` +
        '-- a query for these returns zero rows, which is the extract\'s silence and not a finding',
    );
  }
  if (verdict.before.length > 0) {
    detail.push(`${verdict.before.length} date(s) before it starts (${verdict.before.join(', ')})`);
  }
  if (verdict.missing.length > 0) {
    detail.push(
      `${verdict.missing.length} date(s) inside the window but absent (${verdict.missing.join(', ')}) ` +
        '-- a real hole, unlike the above',
    );
  }

  throw new Error(
    `Refusing the join: ${describe(coverage)}\n  ` + detail.join('\n  '),
  );
}
