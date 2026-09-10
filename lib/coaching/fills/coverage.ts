/**
 * Coverage windows for cross-store joins.
 *
 * This exists because of a specific failure, and then survived a second one
 * that was hiding inside the fix for the first.
 *
 * **The original.** On 2026-09-07 a claim about which names the desk held was
 * measured against `assessments-prod-2026-09-02.db` -- a snapshot that stops
 * before the session being asked about. The query returned zero rows and the
 * zero was read as "the desk did not hold them". The file's own name said
 * 09-02 and had been typed repeatedly. **A filename does not travel into a
 * query result**, so the warning was present and useless where it was needed.
 *
 * **The one hiding in the fix.** The first version of this file gated on the
 * newest `trading_date` in the extract. Ops caught it before the refresh ran:
 * a trading date is not whole until roughly six hours after the bell, so an
 * extract taken mid-session carries a newest date holding a handful of rows
 * out of a full day's checkpoints. Gating on the max would have reported
 * coverage through today and **permitted the join most worth running, on the
 * one date guaranteed to be partial.** The newest date is always the likeliest
 * to be incomplete. A max is no more a guard than a filename was: both
 * describe the file rather than what is answerable from it.
 *
 * So the gate is `completeThrough` -- the newest date carrying a full day's
 * assessments -- and `lastDate` survives only as an observation. The invariant
 * that makes this checkable is that a complete date holds a fixed number of
 * assessments (19 in production at time of writing); an extract should record
 * that as `expected_per_date`, and where it does not it is inferred from the
 * LARGEST per-date count in the file -- not the commonest, because the
 * commonest count in a mostly-partial extract is itself a partial day. See
 * `maxCount` for why a guard should fail toward refusing.
 *
 * Partial dates inside the window are reported as `partial`, never silently
 * excluded. Production has two genuinely incomplete early dates; a rule that
 * flags them is working, and they must not be special-cased away.
 */

import Database from 'better-sqlite3';

export type CoverageBasis = 'extract_as_of' | 'max_trading_date';
export type ExpectedBasis = 'declared' | 'inferred_max' | 'unknown';

export interface Coverage {
  source: string;
  firstDate: string | null;
  /** Newest date present. An observation -- NEVER the gate. See the note above. */
  lastDate: string | null;
  /** Newest date carrying a full day's assessments. This is the gate. */
  completeThrough: string | null;
  /** When the extract was taken, if the file records it. */
  asOf: string | null;
  basis: CoverageBasis;
  /** Assessments expected on a whole trading date. */
  expectedPerDate: number | null;
  expectedBasis: ExpectedBasis;
  /**
   * Set when the inferred ceiling exceeds the commonest count -- either a
   * retried checkpoint inflating one date, or most dates genuinely short.
   * Either way the inference deserves a second look.
   */
  countsDisagree: boolean;
  /** Every date present, with how many assessments it holds. */
  perDate: { date: string; count: number }[];
  /** Dates present but short of `expectedPerDate`. */
  partialDates: string[];
  dates: string[];
}

function tableExists(db: Database.Database, name: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?")
      .get(name) !== undefined
  );
}

function readMeta(db: Database.Database, key: string): string | null {
  if (!tableExists(db, 'meta')) return null;
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

/**
 * What a whole date looks like, inferred from the file when nobody declares it.
 *
 * **The largest observed count, not the commonest.** Ops named the failure the
 * mode cannot see: the mode of a mostly-partial extract IS a partial day, and
 * it would be labelled "inferred" while being confidently wrong -- permitting
 * every join it should refuse. The max fails the other way: an anomalous
 * over-count (a retried checkpoint, say) makes it flag whole dates as short.
 *
 * A guard should fail toward refusing, so the max is correct here even though
 * it is noisier. `modeCount` is kept only to detect the disagreement and say
 * so, because max > mode is exactly the anomaly signature.
 */
function maxCount(counts: readonly number[]): number | null {
  return counts.length === 0 ? null : Math.max(...counts);
}

/** Commonest count -- used ONLY to notice that it disagrees with the max. */
function modeCount(counts: readonly number[]): number | null {
  if (counts.length === 0) return null;
  const tally = new Map<number, number>();
  for (const c of counts) tally.set(c, (tally.get(c) ?? 0) + 1);
  let best: number | null = null;
  let bestN = 0;
  for (const [value, n] of tally) {
    if (n > bestN || (n === bestN && best !== null && value > best)) {
      best = value;
      bestN = n;
    }
  }
  return best;
}

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

    const perDate = (
      db
        .prepare(
          `SELECT ${dateColumn} AS date, COUNT(*) AS count
             FROM ${dateTable} WHERE ${dateColumn} IS NOT NULL
            GROUP BY ${dateColumn} ORDER BY ${dateColumn}`,
        )
        .all() as { date: string; count: number }[]
    ).filter((row) => row.date);

    const dates = perDate.map((row) => row.date);

    const declared = readMeta(db, 'expected_per_date');
    const declaredN = declared !== null && Number.isFinite(Number(declared)) ? Number(declared) : null;
    const counts = perDate.map((row) => row.count);
    const inferred = maxCount(counts);
    const mode = modeCount(counts);
    const expectedPerDate = declaredN ?? inferred;
    const expectedBasis: ExpectedBasis =
      declaredN !== null ? 'declared' : inferred !== null ? 'inferred_max' : 'unknown';
    const countsDisagree = declaredN === null && inferred !== null && mode !== null && inferred !== mode;

    const partialDates =
      expectedPerDate === null
        ? []
        : perDate.filter((row) => row.count < expectedPerDate).map((row) => row.date);

    const whole =
      expectedPerDate === null ? dates : perDate.filter((r) => r.count >= expectedPerDate).map((r) => r.date);

    // A declared complete_through overrides what the counts imply -- the
    // producer knows things the row counts cannot show.
    const declaredThrough = readMeta(db, 'complete_through');

    const asOf = readMeta(db, 'extract_as_of');

    return {
      source: dbPath,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      completeThrough: declaredThrough ?? whole[whole.length - 1] ?? null,
      asOf: asOf ?? dates[dates.length - 1] ?? null,
      basis: asOf ? 'extract_as_of' : 'max_trading_date',
      expectedPerDate,
      expectedBasis,
      countsDisagree,
      perDate,
      partialDates,
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
  const gate = `answerable through ${coverage.completeThrough ?? 'NOTHING'}`;
  return `${coverage.source}  holds ${range}  ${gate}  ${stamp}`;
}

export interface CoverageVerdict {
  /** Present and whole. */
  covered: string[];
  /** Present but short of a full day -- refused, and the reason differs from beyond. */
  partial: string[];
  /** After the last complete date. */
  beyond: string[];
  before: string[];
  /** Inside the range but absent entirely -- a real hole. */
  missing: string[];
}

export function classify(coverage: Coverage, requested: readonly string[]): CoverageVerdict {
  const have = new Set(coverage.dates);
  const partialSet = new Set(coverage.partialDates);
  const verdict: CoverageVerdict = { covered: [], partial: [], beyond: [], before: [], missing: [] };

  for (const date of requested) {
    if (coverage.firstDate === null || coverage.completeThrough === null) {
      verdict.beyond.push(date);
    } else if (date < coverage.firstDate) {
      verdict.before.push(date);
    } else if (partialSet.has(date)) {
      verdict.partial.push(date);
    } else if (!have.has(date) && date <= (coverage.lastDate ?? '')) {
      verdict.missing.push(date);
    } else if (date > coverage.completeThrough) {
      verdict.beyond.push(date);
    } else {
      verdict.covered.push(date);
    }
  }

  return verdict;
}

export function gaps(coverage: Coverage, expected: readonly string[]): string[] {
  const have = new Set(coverage.dates);
  return expected
    .filter((d) => coverage.firstDate !== null && d >= coverage.firstDate)
    .filter((d) => coverage.lastDate !== null && d <= coverage.lastDate)
    .filter((d) => !have.has(d));
}

/**
 * Refuse the join rather than let it answer from silence or from half a day.
 *
 * Throws rather than returning a flag: a boolean would be checked at the call
 * site by the same discipline that already failed once.
 */
export function assertCovers(coverage: Coverage, requested: readonly string[]): void {
  const v = classify(coverage, requested);
  if (v.beyond.length + v.before.length + v.missing.length + v.partial.length === 0) return;

  const detail: string[] = [];
  if (v.beyond.length > 0) {
    detail.push(
      `${v.beyond.length} date(s) PAST the last complete date (${v.beyond.join(', ')}) ` +
        "-- a query for these returns zero rows, which is the extract's silence and not a finding",
    );
  }
  if (v.partial.length > 0) {
    detail.push(
      `${v.partial.length} date(s) PRESENT BUT PARTIAL (${v.partial.join(', ')}) ` +
        `-- fewer than ${coverage.expectedPerDate ?? '?'} assessments, so a query answers from ` +
        'part of a session and looks complete',
    );
  }
  if (v.before.length > 0) {
    detail.push(`${v.before.length} date(s) before the window starts (${v.before.join(', ')})`);
  }
  if (v.missing.length > 0) {
    detail.push(
      `${v.missing.length} date(s) inside the window but absent (${v.missing.join(', ')}) ` +
        '-- a real hole, unlike the above',
    );
  }

  throw new Error(`Refusing the join: ${describe(coverage)}\n  ` + detail.join('\n  '));
}
