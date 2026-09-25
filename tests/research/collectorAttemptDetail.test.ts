import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `companySourceDetail` said "not attempted" on the path that attempted.
 *
 * THE DEFECT, 2026-09-25. The field initialises to `'not attempted'` and was
 * written ONLY inside the resolver branches. The deterministic fetch of the
 * issuer's own feed -- the code that actually looks -- never touched it, so a
 * fetch that succeeded, read its items and inserted rows still reported
 * `'not attempted'`.
 *
 * WHY THIS IS NOT COSMETIC, AND WHY IT GETS A TEST OF ITS OWN. A production
 * census of 173 jobs partitioned on this field and concluded that 26 of 27
 * `NO_RECENT_SOURCE_LOCATED` jobs had never attempted a known feed. That claim
 * says the instrument behind the desk's founding research question returns
 * "no catalyst" without looking, and it was wrong: it was reading an unwritten
 * default. **A defaulted field that reads as a finding is this desk's most
 * expensive shape, and this is the third instance found in one day.**
 *
 * ASSERTED AGAINST SOURCE, in the idiom `offlinePanels.test.ts` already uses
 * and for the same reason: `collectCatalystEvidence` is a network-bound async
 * function with no seam for `fetchCompanyPage`, and the failure is a field
 * that is not written rather than a value that is wrong. A test that cannot
 * observe an omission is not an instrument. The instrument checks come first
 * so this cannot pass against a file that was restructured out from under it.
 */

const read = () =>
  fs.readFile(path.join(process.cwd(), 'lib/research/catalyst/collector.ts'), 'utf8');

/** The deterministic fetch block: `if (knownSourceUrl) {` to its `} else {`. */
async function attemptBlock(): Promise<string> {
  const source = await read();
  const start = source.indexOf('  if (knownSourceUrl) {');
  expect(start, 'the deterministic fetch block was not found').toBeGreaterThan(-1);
  const end = source.indexOf("    warnings.push('no company IR or newsroom source on file');", start);
  expect(end, 'the no-source-on-file arm was not found').toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('the attempt is observable from the report', () => {
  it('still initialises both fields to the not-attempted default', async () => {
    // The instrument. If either default is removed, the assertions below stop
    // meaning anything and this test says so rather than passing.
    const source = await read();
    expect(source).toContain("companySourceDetail: 'not attempted'");
    expect(source).toContain("companyFetchDetail: 'not attempted'");
  });

  it('persists the fetch detail and the counter, not just the summary', async () => {
    /*
     * The gap that made this expensive was not the missing field in the report
     * object -- it was that the STORED record is an eight-field summary. The
     * report knew whether the fetch ran; `collector_report` did not, so
     * "fetched and found nothing" and "never fetched" were one observation in
     * the only place a reader can reach without an SSH session.
     */
    const repo = await fs.readFile(
      path.join(process.cwd(), 'lib/market/store/researchRepo.ts'),
      'utf8',
    );
    const start = repo.indexOf('export interface CollectorReportRecord');
    expect(start).toBeGreaterThan(-1);
    const record = repo.slice(start, repo.indexOf('}', start));
    expect(record).toContain('companyFetchDetail');
    expect(record).toContain('networkRequests');

    const worker = await fs.readFile(path.join(process.cwd(), 'worker/research.ts'), 'utf8');
    expect(worker).toContain('companyFetchDetail: catalystReport.companyFetchDetail,');
    expect(worker).toContain('networkRequests: catalystReport.networkRequests,');
  });

  it('writes a FETCH detail on the deterministic path', async () => {
    const block = await attemptBlock();
    expect(block).toContain('report.companyFetchDetail =');
  });

  it('never writes the RESOLUTION field from the fetch path', async () => {
    /*
     * THE FIRST VERSION OF THIS FIX DID EXACTLY THAT, AND IT WAS A REGRESSION.
     *
     * `companySourceDetail` is declared as "what issuer-source RESOLUTION did,
     * or why it was not offered a turn". Resolution runs BEFORE this block, so
     * writing the fetch's outcome here overwrote a resolution detail that had
     * been recorded correctly -- destroying information while appearing to add
     * it. Two steps, two fields.
     *
     * And it means `'not attempted'` on the resolution field is CORRECT for a
     * ticker that already has a usable url: resolution is gated on
     * `!usableCompanySourceBefore` and is rightly skipped. It never meant the
     * desk did not look, which is the reading that cost a production census.
     */
    const block = await attemptBlock();
    expect(block).not.toContain('report.companySourceDetail =');
  });

  it('records the attempt BEFORE the outcome is known', async () => {
    /*
     * Order matters and is the actual fix. If the field were only written
     * after a successful read, a fetch that threw or timed out would fall back
     * to `'not attempted'` -- the same wrong answer, reached by a rarer route.
     */
    const block = await attemptBlock();
    const attempt = block.indexOf('report.companyFetchDetail = `attempted');
    const fetchCall = block.indexOf('await fetchCompanyPage(knownSourceUrl');
    expect(attempt, 'no attempt marker on the deterministic path').toBeGreaterThan(-1);
    expect(fetchCall).toBeGreaterThan(-1);
    expect(attempt).toBeLessThan(fetchCall);
  });

  it('distinguishes unreachable, unreadable and read', async () => {
    const block = await attemptBlock();
    // Three outcomes of one attempt. Collapsing any two of them rebuilds a
    // weaker version of the same defect: a state that cannot say what happened.
    expect(block).toContain('unreachable (');
    expect(block).toContain('unreadable (');
    expect(block).toContain('read ${read.items.length} item');
  });

  it('keeps networkRequests as the counter the census should partition on', async () => {
    /*
     * The human-readable string is a convenience and can drift again. The
     * count cannot: it is incremented on the fetch itself, immediately after
     * the call, and it is what a census asking "did the desk look" must use.
     */
    const block = await attemptBlock();
    expect(block).toContain('report.networkRequests += 1;');
  });
});
