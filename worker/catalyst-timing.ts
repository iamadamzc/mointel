/**
 * WAS THE EVIDENCE ALREADY THERE BEFORE HE SAT DOWN?
 *
 *   npx tsx worker/catalyst-timing.ts --dates=2026-09-02,2026-09-03 --db=/var/lib/mointel/market.db
 *
 * Integration made this the main line after the lead-time test came back
 * unpowered by structure: 29 of 54 and 31 of 45 RVOL entries fire BEFORE 07:00
 * ET, so most selection is over before the window opens. If the evidence behind
 * those names is also already published, an overnight pass reaches them without
 * racing anything.
 *
 * PRE-REGISTERED IN ITEM 90, NO DIRECTION PREDICTED. I can argue both, so the
 * result cannot be read to fit.
 *
 * ── THE QUESTION AS ASKED CANNOT BE ANSWERED, AND THAT IS MEASURED ────────
 *
 * It was posed as *"published before 07:00 ET"*. THE STORE HAS NO TIME OF DAY.
 * 1,401 of 1,437 `published_at` values are BARE DATES with no time component at
 * all; `published_precision` reads `UNKNOWN` for 80% and `EXACT` for NINE ROWS.
 * The 26 `DATE_ONLY` rows carry a synthesised 12:00Z — 08:00 ET — which would
 * place every one of them INSIDE his window by placeholder rather than by fact.
 *
 * SO SAME-DAY EVIDENCE IS REPORTED AS INDETERMINATE AND NEVER SPLIT. Forcing it
 * either way is an absence borrowing a value, and this one would borrow the
 * value that answers the question.
 *
 * What date resolution CAN settle is the half that matters: evidence published
 * on an EARLIER DAY was available overnight, no time of day required.
 *
 * ── AND "HAD A PRIOR DOCUMENT" IS VACUOUS, SO IT IS NOT THE METRIC ───────
 *
 * Every operating company has old filings; a 10-K from 2024 would score as
 * "evidence existed". On the local session ALL 25 names with any source had one
 * predating the session, which is a statement about corporate life rather than
 * about catalysts.
 *
 * SO NO THRESHOLD IS CHOSEN. The measure is the AGE of the freshest pre-session
 * evidence, reported ACROSS ITS DISTRIBUTION — the same dissolution that
 * replaced a cutoff in the lead-time design. Mass at one or two days means an
 * overnight pass has material; mass at hundreds of days means it does not.
 *
 * ── THE POPULATION IS RECORDED, NOT RECONSTRUCTED ────────────────────────
 *
 * Names with an `RVOL_RANK_ENTRY` that session — the trigger the desk actually
 * ran and acts on. GAIN-ONLY NAMES ARE NOT COVERED: adding them needs the gain
 * reconstruction and drags in its field-size bias for no gain in this answer.
 * The funnel below states that boundary rather than hiding it.
 *
 * ── THE FUNNEL IS THE POINT, BECAUSE COLLECTION IS JOB-GATED ─────────────
 *
 * `collectCatalystEvidence` runs INSIDE job processing (`queue.ts:268`), so a
 * name with no job has no sources — and a fired name with no job would score as
 * "no evidence" WHEN NOTHING EVER LOOKED. Every stage is printed with its
 * denominator so that loss is visible rather than absorbed into the answer.
 */

import Database from 'better-sqlite3';

interface Args {
  dates: string[];
  dbPath: string;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  let dates: string[] = [];
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let force = false;
  for (const arg of argv) {
    if (arg === '--force') force = true;
    else if (arg.startsWith('--dates=')) dates = arg.split('=')[1].split(',').filter(Boolean);
    else if (arg.startsWith('--db=')) dbPath = arg.split('=')[1];
  }
  return { dates, dbPath, force };
}

const hhmm = (minuteOfDay: number) =>
  `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;

/** Shared with the lead-time instrument by intent, restated because these are
 * one-off workers and an import between them would couple two throwaways. */
export function insideCaptureHours(now: Date): { inside: boolean; label: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const minute =
    (Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24) * 60 +
    Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return {
    inside: !['Sat', 'Sun'].includes(weekday) && minute >= 4 * 60 && minute < 20 * 60,
    label: `${weekday} ${hhmm(minute)} ET`,
  };
}

/**
 * Proof, not assertion, that this cannot write — the same probe as the
 * lead-time instrument, and for the same reason.
 *
 * A zero-row `UPDATE` raises `SQLITE_READONLY` on execution regardless of row
 * count, so it demands write capability and changes nothing either way.
 * `BEGIN IMMEDIATE` is NOT a substitute: SQLite grants it on a read-only handle
 * and defers refusal to the first real write.
 *
 * AN AUDIT THAT SCANS FOR MUTATING SQL WILL REJECT THIS FILE FOR THE LINE THAT
 * MAKES IT SAFE. Audit the property — can it write — and prove it by execution.
 */
function proveReadOnly(db: Database.Database, path: string): void {
  db.pragma('query_only = 1');
  const queryOnly = db.pragma('query_only', { simple: true });
  try {
    db.exec("UPDATE ticker_session SET symbol = symbol WHERE symbol = '__read_only_probe__'");
  } catch (error) {
    const code = (error as { code?: string }).code ?? String(error);
    console.log(`[catalyst-timing] READ-ONLY PROVEN: zero-row write refused (${code}), query_only=${queryOnly}`);
    return;
  }
  console.error(`[catalyst-timing] ABORT: ${path} accepted a write statement.`);
  process.exit(1);
}

const quantile = (sorted: number[], q: number): number | null => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};
const fmt = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined ? '-' : value.toFixed(digits);

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

function report(db: Database.Database, date: string): void {
  console.log(`\n=== ${date}`);

  const fired = (
    db
      .prepare(
        `SELECT DISTINCT symbol FROM desk_events
          WHERE trading_date = ? AND type = 'RVOL_RANK_ENTRY' AND symbol IS NOT NULL`,
      )
      .all(date) as Array<{ symbol: string }>
  ).map((row) => row.symbol);

  if (!fired.length) {
    console.log('  no RVOL_RANK_ENTRY events — nothing to report.');
    return;
  }

  const withJob = new Set(
    (
      db
        .prepare('SELECT DISTINCT ticker FROM research_jobs WHERE trading_date = ?')
        .all(date) as Array<{ ticker: string }>
    ).map((row) => row.ticker),
  );

  const placeholders = fired.map(() => '?').join(',');
  const sources = db
    .prepare(
      `SELECT ticker, substr(published_at, 1, 10) AS day, source_type, published_precision,
              length(published_at) AS stamp_length
         FROM research_sources
        WHERE active = 1 AND published_at IS NOT NULL AND ticker IN (${placeholders})`,
    )
    .all(...fired) as Array<{
    ticker: string;
    day: string;
    source_type: string;
    published_precision: string | null;
    stamp_length: number;
  }>;

  /** Freshest evidence dated STRICTLY BEFORE the session, per name. */
  const freshestPrior = new Map<string, string>();
  const sameDay = new Set<string>();
  const withAnySource = new Set<string>();
  let sameDayPlaceable = 0;
  let sameDayPlaceholder = 0;
  let sameDayRows = 0;

  for (const row of sources) {
    withAnySource.add(row.ticker);
    if (row.day < date) {
      const held = freshestPrior.get(row.ticker);
      if (!held || row.day > held) freshestPrior.set(row.ticker, row.day);
    } else if (row.day === date) {
      sameDay.add(row.ticker);
      sameDayRows += 1;
      /*
       * A bare date is 10 characters, so anything longer carries a time — and
       * MOST OF THOSE TIMES ARE SYNTHETIC. Only `EXACT` is a time the source
       * actually stated; `DATE_ONLY` is the 12:00Z midpoint the desk invented.
       * Counting "carries a time" alone would report the placeholder as
       * placeable, which is the whole failure this bucket exists to avoid.
       */
      if (row.stamp_length > 10) {
        if (row.published_precision === 'EXACT') sameDayPlaceable += 1;
        else sameDayPlaceholder += 1;
      }
    }
  }

  console.log(`  fired the RVOL trigger:            ${fired.length}`);
  console.log(
    `  of those, had a research job:      ${fired.filter((t) => withJob.has(t)).length}` +
      `   <- collection is job-gated, so the rest CANNOT have evidence recorded`,
  );
  /*
   * NOT A SUBSET OF THE LINE ABOVE. `research_sources` is keyed on ticker with
   * no trading date, so a name carries rows collected during ANY session's job.
   * It can exceed the job count for this date, and reading it as a funnel step
   * would understate the gap it is here to expose.
   */
  console.log(`  have any source row (any session's collection): ${withAnySource.size}`);
  console.log(`  with evidence dated BEFORE the session: ${freshestPrior.size}`);
  console.log(`  with evidence dated ON the session:     ${sameDay.size}   (${sameDayRows} rows)`);

  /*
   * THE INDETERMINATE BUCKET, KEPT SEPARATE. Same-day evidence is what the
   * before-07:00 question was actually about, and the store cannot place it.
   */
  console.log(
    `    of those ${sameDayRows} same-day rows: ${sameDayPlaceable} carry a STATED time, ` +
      `${sameDayPlaceholder} carry a SYNTHESISED one, ${sameDayRows - sameDayPlaceable - sameDayPlaceholder} carry none`,
  );
  if (sameDayPlaceable === 0) {
    console.log('      NOT ONE STATED TIME. The 07:00 split is unanswerable for every same-day row.');
  }

  const ages = [...freshestPrior.values()].map((day) => daysBetween(day, date)).sort((a, b) => a - b);
  if (!ages.length) {
    console.log('  no prior-dated evidence at all — the age distribution is empty.');
    return;
  }

  console.log('\n  AGE OF THE FRESHEST PRE-SESSION EVIDENCE, in days — no threshold, the distribution');
  console.log(
    `    n=${ages.length}   min ${ages[0]}   p25 ${fmt(quantile(ages, 0.25))}   ` +
      `median ${fmt(quantile(ages, 0.5))}   p75 ${fmt(quantile(ages, 0.75))}   max ${ages[ages.length - 1]}`,
  );

  /*
   * Printed as a shape rather than a rate against a cutoff. The buckets are
   * calendar facts — the prior session, the prior week — not chosen thresholds,
   * and the whole distribution is above them.
   */
  const bucket = (label: string, test: (age: number) => boolean) =>
    console.log(`    ${label.padEnd(28)} ${ages.filter(test).length} of ${ages.length}`);
  bucket('1 day (the prior session)', (a) => a <= 1);
  bucket('within 3 days', (a) => a <= 3);
  bucket('within 7 days', (a) => a <= 7);
  bucket('within 30 days', (a) => a <= 30);
  bucket('older than 90 days', (a) => a > 90);

  const byType = new Map<string, number>();
  for (const row of sources) byType.set(row.source_type, (byType.get(row.source_type) ?? 0) + 1);
  console.log(
    `\n  source mix: ${[...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, n]) => `${type} ${n}`)
      .join(', ')}`,
  );
}

/** Why the same-day half cannot be split, stated from the store rather than claimed. */
function precisionCensus(db: Database.Database): void {
  const rows = db
    .prepare(
      `SELECT COALESCE(published_precision, 'NULL') AS precision,
              SUM(CASE WHEN length(published_at) > 10 THEN 1 ELSE 0 END) AS with_time,
              COUNT(1) AS n
         FROM research_sources WHERE published_at IS NOT NULL
        GROUP BY precision ORDER BY n DESC`,
    )
    .all() as Array<{ precision: string; with_time: number; n: number }>;

  console.log('\n=== WHY THE 07:00 SPLIT IS NOT AVAILABLE  (whole store, every ticker)');
  for (const row of rows) {
    console.log(`  ${row.precision.padEnd(10)} n=${String(row.n).padStart(5)}   carrying a time: ${row.with_time}`);
  }
  console.log(
    '  A bare date cannot be placed against 07:00, and the synthesised stamps sit at 12:00Z = 08:00 ET —\n' +
      '  INSIDE his window by placeholder rather than by fact. Same-day evidence stays indeterminate.',
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dates.length) {
    console.error('give --dates=YYYY-MM-DD[,YYYY-MM-DD]');
    process.exitCode = 1;
    return;
  }

  const { inside, label } = insideCaptureHours(new Date());
  if (inside && !args.force) {
    console.error(
      `[catalyst-timing] REFUSED: ${label} is inside capture hours (04:00-20:00). ` +
        'Run it while the market is shut, or pass --force.',
    );
    process.exit(1);
  }

  const db = new Database(args.dbPath, { readonly: true });
  proveReadOnly(db, args.dbPath);
  console.log(`[catalyst-timing] store ${args.dbPath} (read-only), dates ${args.dates.join(', ')}`);

  for (const date of args.dates) report(db, date);
  precisionCensus(db);

  console.log('\n=== WHAT THIS CANNOT SETTLE');
  console.log('  whether same-day evidence predates 07:00 — NO. The store has no time of day.');
  console.log('  gain-only names — NOT COVERED. The population is the recorded RVOL trigger.');
  console.log('  whether a name with no job had evidence — NO. Collection is job-gated; nothing looked.');

  db.close();
}

main();
