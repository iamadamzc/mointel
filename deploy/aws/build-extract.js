/*
 * Rebuilds a production assessment extract into a local SQLite file and stamps
 * its coverage INSIDE the file.
 *
 *   node deploy/aws/build-extract.js <dump.sql> <out.db> <coverage.tsv> \
 *        <extract_as_of> <expect_per_date> <complete_through> <max_date> \
 *        <source_host> [exclude_date]
 *
 * Called by extract-assessments.sh. Separate from it because the development
 * machine has no sqlite3 binary, and better-sqlite3 is already a dependency of
 * the desk -- so the rebuild uses the same engine the store itself runs on
 * rather than a second one that might disagree about a type.
 *
 * WHAT THIS WRITES BEYOND THE DATA, AND WHY EACH FIELD EARNS ITS PLACE.
 *
 *   extract_date_coverage  one row per trading date: the count, and whether it
 *                          is complete. JOIN against it and a query CANNOT
 *                          return an answer for an uncovered date. This is the
 *                          guard; everything else is documentation.
 *
 *   extract_meta           extract_as_of   when the read ran (ISO-8601 UTC)
 *                          complete_through the newest WHOLE date -- gate here
 *                          max_trading_date the newest date present -- NEVER gate
 *                                           here; it is the likeliest to be partial
 *                          expected_per_date what "complete" means, so a future
 *                                           reader can check the claim rather
 *                                           than trust it
 *                          source_host / source_db  which box, which store
 *                          excluded_date    a date deliberately left out, or ''
 *
 * The filename is deliberately NOT self-describing. Coaching asked for that in
 * these words: "I would rather it collide with the old one and force me to
 * check the meta row than be self-describing and let me skip the check again."
 * The 09-02 wall was invisible for days behind a filename that named its own
 * date, because a filename does not travel into a query result.
 */
'use strict';

const fs = require('node:fs');
const Database = require('better-sqlite3');

const [
  dumpPath, outPath, coveragePath, extractAsOf, expectRaw,
  completeThrough, maxDate, sourceHost, excludeDate = '',
] = process.argv.slice(2);

if (!dumpPath || !outPath || !coveragePath || !extractAsOf || !completeThrough) {
  console.error('[build] missing arguments — see the header of this file');
  process.exit(2);
}

const expectPerDate = Number(expectRaw);
if (!Number.isFinite(expectPerDate) || expectPerDate <= 0) {
  console.error(`[build] expected_per_date must be a positive number, got "${expectRaw}"`);
  process.exit(2);
}

const sql = fs.readFileSync(dumpPath, 'utf8');
if (!/CREATE TABLE.*desk_assessments/s.test(sql) || !/CREATE TABLE.*desk_assessment_tickers/s.test(sql)) {
  console.error('[build] REFUSING: the dump does not contain both tables.');
  console.error('[build] A short dump rebuilds into a database that looks complete.');
  process.exit(1);
}

fs.rmSync(outPath, { force: true });
const db = new Database(outPath);
db.exec(sql);

/*
 * Excluding a partial tail is a DELETE after the fact rather than a filtered
 * dump, so the removal is one visible statement here instead of a predicate
 * threaded through a remote command. The ticker rows go with it -- an
 * assessment whose children outlive it is worse than either.
 */
if (excludeDate) {
  const kids = db
    .prepare(
      'DELETE FROM desk_assessment_tickers WHERE assessment_id IN ' +
        '(SELECT id FROM desk_assessments WHERE trading_date = ?)',
    )
    .run(excludeDate);
  const parents = db.prepare('DELETE FROM desk_assessments WHERE trading_date = ?').run(excludeDate);
  console.log(`[build] excluded ${excludeDate}: ${parents.changes} assessments, ${kids.changes} ticker rows`);
}

db.exec(`
  CREATE TABLE extract_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE extract_date_coverage (
    trading_date     TEXT PRIMARY KEY,
    assessment_count INTEGER NOT NULL,
    is_complete      INTEGER NOT NULL
  );
`);

const coverage = fs
  .readFileSync(coveragePath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.split('|'))
  .filter(([date]) => date && date !== excludeDate);

const insertCoverage = db.prepare(
  'INSERT INTO extract_date_coverage (trading_date, assessment_count, is_complete) VALUES (?, ?, ?)',
);
db.transaction(() => {
  for (const [date, count] of coverage) {
    insertCoverage.run(date, Number(count), Number(count) === expectPerDate ? 1 : 0);
  }
})();

const counts = {
  assessments: db.prepare('SELECT COUNT(*) AS n FROM desk_assessments').get().n,
  tickers: db.prepare('SELECT COUNT(*) AS n FROM desk_assessment_tickers').get().n,
};

const insertMeta = db.prepare('INSERT INTO extract_meta (key, value) VALUES (?, ?)');
db.transaction(() => {
  for (const [key, value] of [
    ['extract_as_of', extractAsOf],
    ['complete_through', completeThrough],
    ['max_trading_date', maxDate],
    ['expected_per_date', String(expectPerDate)],
    ['excluded_date', excludeDate],
    ['source_host', sourceHost],
    ['assessment_rows', String(counts.assessments)],
    ['ticker_rows', String(counts.tickers)],
    [
      'read_me',
      'Gate joins on complete_through, never on max_trading_date. Better: JOIN ' +
        'extract_date_coverage and require is_complete = 1, which also catches ' +
        'incomplete dates BELOW the ceiling.',
    ],
  ]) {
    insertMeta.run(key, value);
  }
})();

/*
 * VERIFY WHAT LANDED, rather than trust that it did. An orphan check earns its
 * place specifically because the exclusion above deletes from two tables and a
 * half-done exclusion is the failure that reads as a clean file.
 */
const orphans = db
  .prepare(
    'SELECT COUNT(*) AS n FROM desk_assessment_tickers t ' +
      'LEFT JOIN desk_assessments a ON a.id = t.assessment_id WHERE a.id IS NULL',
  )
  .get().n;

const coveredMax = db.prepare('SELECT MAX(trading_date) AS d FROM extract_date_coverage').get().d;
const dataMax = db.prepare('SELECT MAX(trading_date) AS d FROM desk_assessments').get().d;

db.close();

console.log(`[build] ${outPath}`);
console.log(`[build]   assessments=${counts.assessments}  tickers=${counts.tickers}  orphans=${orphans}`);
console.log(`[build]   complete_through=${completeThrough}  max=${maxDate}  as_of=${extractAsOf}`);
console.log(`[build]   coverage rows=${coverage.length}  coverage max=${coveredMax}  data max=${dataMax}`);

/*
 * A FAILED BUILD MUST NOT LEAVE A FILE. Everything above ran against an open
 * database, so a verify that fails has already written a plausible-looking
 * extract to disk -- and the whole point of this exercise is that nobody can
 * tell a good extract from a bad one by looking at it. An unusable file with
 * the expected name is worse than no file, because the name is what gets
 * picked up.
 */
function fail(...lines) {
  for (const line of lines) console.error(line);
  fs.rmSync(outPath, { force: true });
  console.error(`[build] removed ${outPath} — a failed extract must not survive as a file.`);
  process.exit(1);
}

if (orphans !== 0) {
  fail(`[build] FAILED: ${orphans} ticker rows have no assessment.`);
}
if (coveredMax !== dataMax) {
  fail(
    `[build] FAILED: coverage says ${coveredMax}, data holds ${dataMax}.`,
    '[build] The coverage table is the guard — it disagreeing with the data is fatal.',
  );
}
