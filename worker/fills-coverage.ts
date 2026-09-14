/**
 * `npm run fills:coverage -- <desk-extract.db>`
 *
 * Prints the overlap between the fills store and a desk extract, and says
 * plainly which of the trader's sessions the extract can and cannot speak
 * about. Run it BEFORE any question of the form "was that name on the board
 * when he traded it" -- that is the whole purpose.
 *
 * With no argument it reports the fills store alone, which is useful for
 * nothing except confirming what dates are held.
 *
 * Why this command exists rather than a note in a document: on 2026-09-07 a
 * join returned zero rows for a session the extract did not reach, and the
 * zero was read as a fact about the desk. The extract's own filename carried
 * the date and had been typed repeatedly. A filename does not travel into a
 * query result; this does.
 */

import { pathToFileURL } from 'node:url';

import { classify, crossCheck, describe, readCoverage } from '../lib/coaching/fills/coverage';
import { openFillsStore, resolveFillsPath } from '../lib/coaching/fills/store';

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const extract = args[0] ?? null;

  const db = openFillsStore(null);
  let sessions: string[];
  try {
    sessions = (
      db.prepare('SELECT DISTINCT trading_date AS d FROM round_trips ORDER BY d').all() as {
        d: string;
      }[]
    ).map((row) => row.d);
  } finally {
    db.close();
  }

  console.log('');
  console.log(`  fills    ${resolveFillsPath(null)}`);
  console.log(
    `           covers ${sessions[0] ?? 'EMPTY'}..${sessions[sessions.length - 1] ?? 'EMPTY'}` +
      `  (${sessions.length} sessions, current by construction)`,
  );

  if (!extract) {
    console.log('');
    console.log('  No desk extract given. Pass one to see the overlap:');
    console.log('    npm run fills:coverage -- data/assessments-prod-YYYY-MM-DD.db');
    console.log('');
    return;
  }

  const coverage = readCoverage(extract);
  console.log('');
  console.log(`  desk     ${describe(coverage)}`);
  console.log(
    `           declarations read from ${coverage.metaTable ? '`' + coverage.metaTable + '`' : 'NO key/value table'}`,
  );
  console.log(
    `           a whole date holds ${coverage.expectedPerDate ?? '?'} assessments` +
      ` (${coverage.expectedBasis.replace('_', ' ')})`,
  );

  const verdict = classify(coverage, sessions);
  console.log('');
  console.log(`  ANSWERABLE   ${verdict.covered.length} session(s)  ${verdict.covered.join(' ') || '-'}`);
  if (verdict.partial.length > 0) {
    console.log(`  PARTIAL      ${verdict.partial.length} session(s)  ${verdict.partial.join(' ')}`);
    console.log('               present but short of a full day -- a join answers from part of');
    console.log('               a session and looks complete, which is worse than empty');
  }
  if (verdict.beyond.length > 0) {
    console.log(`  BEYOND IT    ${verdict.beyond.length} session(s)  ${verdict.beyond.join(' ')}`);
    console.log("               a join over these returns zero rows -- that is the extract's");
    console.log('               silence, not a finding about the desk');
  }
  if (verdict.before.length > 0) {
    console.log(`  BEFORE IT    ${verdict.before.length} session(s)  ${verdict.before.join(' ')}`);
  }
  if (verdict.missing.length > 0) {
    console.log(
      `  REAL HOLE    ${verdict.missing.length} session(s)  ${verdict.missing.join(' ')}` +
        '  (inside the window but absent)',
    );
  }

  if (coverage.partialDates.length > 0) {
    console.log('');
    console.log('  short dates in the extract (all of them, traded or not):');
    for (const row of coverage.perDate.filter((r) => coverage.partialDates.includes(r.date))) {
      console.log(`    ${row.date}  ${row.count} of ${coverage.expectedPerDate}`);
    }
  }

  const cross = crossCheck(coverage, extract);
  console.log('');
  if (cross.status === 'agreed') {
    console.log(
      `  CROSS-CHECK  agreed on ${cross.checked} date(s) with the producer's own count,`,
    );
    console.log("               taken on the box before the dump. Nothing was lost in transfer.");
  } else if (cross.status === 'disagreed') {
    console.log(`  CROSS-CHECK  DISAGREED on ${cross.conflicts.length} date(s)`);
    console.log('               the producer counted these on the box; this side counted the');
    console.log('               rows that arrived. A difference means the transfer lost rows.');
    for (const c of cross.conflicts) {
      console.log(
        `                 ${c.date}  declared ${c.declaredComplete ? 'complete' : 'partial'}` +
          `${c.declaredCount !== null ? ` n=${c.declaredCount}` : ''}` +
          `  ->  arrived n=${c.observedCount} (${c.observedComplete ? 'complete' : 'partial'})`,
      );
    }
    for (const d of cross.missingFromFile) {
      console.log(`                 ${d}  declared by the producer, ABSENT from the file`);
    }
  } else {
    console.log(`  CROSS-CHECK  not available -- ${cross.reason}`);
  }
  if (cross.undeclared.length > 0) {
    console.log(
      `               ${cross.undeclared.length} date(s) in the file the producer never declared: ` +
        cross.undeclared.join(' '),
    );
  }

  if (coverage.basis === 'max_trading_date') {
    console.log('');
    console.log(
      `  NOTE  this extract records no extract_as_of${coverage.metaTable ? ` in \`${coverage.metaTable}\`` : ' and has no key/value table'}, so the as-of above is`,
    );
    console.log('        inferred from its newest trading date. That is weaker: it says when');
    console.log('        the DATA ends, not when the FILE was made, and the two differ exactly');
    console.log('        when collection has stopped -- the case most worth detecting.');
  }
  if (coverage.expectedBasis === 'inferred_max') {
    console.log('');
    console.log('  NOTE  `expected_per_date` was inferred from the LARGEST per-date count, not');
    console.log('        declared by the producer. The largest rather than the commonest on');
    console.log('        purpose: the commonest count in a mostly-partial extract IS a partial');
    console.log('        day, and would pass every join it should refuse. This errs toward');
    console.log('        refusing instead.');
  }
  if (coverage.countsDisagree) {
    console.log('');
    console.log('  CHECK the largest per-date count exceeds the commonest one. Either a retried');
    console.log('        checkpoint inflated a single date, or most dates here are short. Worth');
    console.log('        a look before trusting the gate.');
  }
  console.log('');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
