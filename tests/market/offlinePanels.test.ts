import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The server's two offline assessment panels, which used to be one.
 *
 * `buildAssessmentPanel` returned the same object for two unrelated conditions:
 * a store that FAILED TO OPEN, and a store that opened fine whose assessment
 * tables are absent or whose trading date is unresolved. The second is not a
 * fault, and the shared panel resolved through
 * `projectSchedulerHealth({ health: null })` to `tone: 'neg'` with a detail that
 * INSTRUCTS the trader to run `npm run desk`.
 *
 * So a healthy desk was told to restart itself — the same defect
 * `OFFLINE_ASSESSMENTS` fixed at the CLIENT boundary, still live on the server
 * path that shares the function.
 *
 * Asserted against source, in the idiom `statusChrome.test.ts` already uses and
 * for the same reason: the failure is a module-private constant in a file, and
 * these panels are not exported.
 */

const read = (relative: string) => fs.readFile(path.join(process.cwd(), relative), 'utf8');

describe('not measured and could not be read are two panels', () => {
  it('routes the tables-absent case away from the fault panel', async () => {
    const source = await read('lib/market/readModel.ts');

    // The instrument first: if these names were absent the assertions below
    // would pass vacuously against a file that had been renamed out from under
    // them.
    expect(source).toContain('UNMEASURED_PANEL');
    expect(source).toContain('UNREADABLE_PANEL');

    // The store opened; a table or a trading date is missing. Not a fault.
    expect(source).toContain(
      'if (!assessmentTablesPresent(db) || !options.tradingDate) return UNMEASURED_PANEL;',
    );

    // And the two store-failure paths keep a fault verdict, because a failed
    // read IS an observation.
    expect(source.match(/assessments: UNREADABLE_PANEL,/g)).toHaveLength(2);
    expect(source).not.toContain('assessments: OFFLINE_PANEL,');
  });

  it('does not colour an unmeasured panel as a fault, or instruct on it', async () => {
    const source = await read('lib/market/readModel.ts');

    const at = source.indexOf('const UNMEASURED_PANEL');
    expect(at, 'UNMEASURED_PANEL missing').toBeGreaterThan(-1);
    // Sliced AFTER the declaration so the doc comment above it — which quotes
    // the old behaviour to explain why it was wrong — cannot satisfy or fail
    // an assertion about the code.
    const body = source.slice(at, source.indexOf('};', at) + 2);

    expect(body, 'not-measured is coloured as a fault').not.toContain("tone: 'neg'");
    expect(body, 'not-measured has no tone').toContain("tone: 'dim'");
    // The instruction is the worst part: it tells him to fix a desk that is fine.
    expect(body).not.toContain('npm run desk');
    expect(body).not.toContain('scheduler offline');
  });
});

describe('the diagnostics page does not report an unread panel as a stopped scheduler', () => {
  it('gates the scheduler ERROR on a state that was actually read', async () => {
    const source = await read('lib/review/diagnostics.ts');

    /*
     * `running: false` means two things and only one is an error. A panel that
     * was never read reports false because nothing set it true — and this is
     * the page a trader opens BECAUSE he suspects something is broken, so a
     * manufactured ERROR there is the most expensive place to put one.
     */
    expect(source).toContain(
      "if (panel.scheduler.state !== 'UNKNOWN' && !panel.scheduler.running) {",
    );
  });
});
