/**
 * `npm run archive:scorecard`
 *
 * Runs the pre-registered prediction scorecard over the archive and prints the
 * verdicts. **The rules live in `lib/archive/scorecard.ts`; this file only
 * joins the data and formats.** Nothing here decides anything.
 *
 *   npm run archive:scorecard
 *   npm run archive:scorecard -- --archive data/archive.db --from 2026-08-17 --to 2026-09-02
 *
 * `--json` emits the whole result as JSON, which is the form to hand back if
 * the run happens on the server and only numbers travel.
 *
 * **Read-only.** It opens the archive without writing and touches nothing else.
 */

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import Database from 'better-sqlite3';

import { scoreAll, UNTRENDABLE_DATES, type Measure, type ScorecardRow } from '../lib/archive/scorecard';

interface Options {
  archive: string;
  from: string | null;
  to: string | null;
  json: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { archive: 'data/archive.db', from: null, to: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--archive':
        options.archive = argv[++i] ?? options.archive;
        break;
      case '--from':
        options.from = argv[++i] ?? null;
        break;
      case '--to':
        options.to = argv[++i] ?? null;
        break;
      case '--json':
        options.json = true;
        break;
      default:
        if (argv[i].startsWith('--')) throw new Error(`unknown flag ${argv[i]}`);
    }
  }
  return options;
}

/**
 * The join, and the one place a silent data problem could enter.
 *
 * A LEFT JOIN, deliberately: a desk-day with no outcome row is a fact worth
 * counting, and an INNER JOIN would drop it and quietly shrink every
 * denominator. Each measure decides for itself whether it can use such a row.
 */
export function loadRows(archive: string, from: string | null, to: string | null): ScorecardRow[] {
  const db = new Database(archive, { readonly: true });
  try {
    const clauses: string[] = [];
    const params: Record<string, string> = {};
    if (from) {
      clauses.push('d.trading_date >= @from');
      params.from = from;
    }
    if (to) {
      clauses.push('d.trading_date <= @to');
      params.to = to;
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return db
      .prepare(
        `SELECT d.symbol, d.trading_date AS tradingDate,
                d.first_board_entry_at AS firstBoardEntryAt,
                d.catalyst_first_at AS catalystFirstAt,
                d.catalyst_first AS catalystFirst,
                d.catalyst_last  AS catalystLast,
                d.catalyst_best  AS catalystBest,
                d.coverage,
                d.grade_age_sessions AS gradeAgeSessions,
                d.grade_age_censored AS gradeAgeCensored,
                o.time_of_max_gain AS timeOfMaxGain,
                o.max_gain_pct AS maxGainPct
           FROM symbol_desk_day d
           LEFT JOIN symbol_outcomes o
             ON o.symbol = d.symbol AND o.trading_date = d.trading_date
           ${where}
          ORDER BY d.trading_date, d.symbol`,
      )
      .all(params) as ScorecardRow[];
  } finally {
    db.close();
  }
}

const VERDICT_MARK: Record<string, string> = {
  IMPROVED: '++',
  REGRESSED: '--',
  NO_DETECTABLE_CHANGE: '  ',
  NOT_EVALUABLE: ' ?',
};

function printMeasure(measure: Measure): void {
  const value = measure.value === null ? 'n/a' : measure.value.toFixed(1);
  console.log(`\n${VERDICT_MARK[measure.verdict]} ${measure.id}  ${measure.title}`);
  console.log(`     value ${value}   baseline ${measure.baseline}   ${measure.verdict}`);
  console.log(`     ${measure.reason}`);

  // Diagnostics are not optional output. Every instrument this desk has shipped
  // recently was wrong in a way invisible in the headline and obvious here.
  const dropped = Object.entries(measure.diagnostics.dropped).filter(([, v]) => v > 0);
  console.log(
    `     n=${measure.diagnostics.n}` +
      (dropped.length ? `  dropped: ${dropped.map(([k, v]) => `${k}=${v}`).join(', ')}` : '') +
      `  dates=${measure.diagnostics.dates.length}`,
  );

  if (measure.extra) {
    for (const [key, val] of Object.entries(measure.extra)) {
      if (val === null || val === undefined) continue;
      console.log(`       ${key}: ${typeof val === 'number' ? val.toFixed(2) : val}`);
    }
  }

  if (measure.perSession.length > 0) {
    const line = measure.perSession
      .map((s) => {
        const v = s.value === null ? '  n/a' : s.value.toFixed(0).padStart(5);
        return `${s.tradingDate.slice(5)}${s.trendable ? ' ' : '*'}${v}`;
      })
      .join('  ');
    console.log(`     per session (* = excluded from trend): ${line}`);
  }
}

export function runScorecard(argv: readonly string[]): number {
  const options = parseArgs(argv);
  if (!fs.existsSync(options.archive)) {
    console.error(`[scorecard] no such archive: ${options.archive}`);
    return 1;
  }

  const rows = loadRows(options.archive, options.from, options.to);
  if (rows.length === 0) {
    console.error('[scorecard] no rows in window; nothing to score');
    return 1;
  }

  const measures = scoreAll(rows);
  if (options.json) {
    console.log(JSON.stringify({ rows: rows.length, measures }, null, 2));
    return 0;
  }

  const dates = [...new Set(rows.map((r) => r.tradingDate))].sort();
  console.log(`[scorecard] ${options.archive} (read-only)`);
  console.log(`[scorecard] ${rows.length} symbol-days over ${dates.length} sessions, ${dates[0]} .. ${dates[dates.length - 1]}`);
  const holes = dates.filter((d) => UNTRENDABLE_DATES.has(d));
  console.log(
    holes.length
      ? `[scorecard] pre-registered holes present and excluded from trends: ${holes.join(', ')}`
      : '[scorecard] no pre-registered hole dates in this window',
  );
  console.log('[scorecard] rules are fixed in docs/rnd/2026-09-02-prediction-scorecard-proposal.md');

  for (const measure of measures) printMeasure(measure);

  console.log('\n[scorecard] a value short of its threshold is NO DETECTABLE CHANGE, not a trend.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runScorecard(process.argv.slice(2)));
}
