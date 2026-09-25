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
  it('still initialises the field to the not-attempted default', async () => {
    // The instrument. If this default is ever removed, the assertions below
    // stop meaning anything and this test says so rather than passing.
    const source = await read();
    expect(source).toContain("companySourceDetail: 'not attempted'");
  });

  it('writes the detail on the deterministic path, not only in the resolver', async () => {
    const block = await attemptBlock();
    expect(block).toContain('report.companySourceDetail =');
  });

  it('records the attempt BEFORE the outcome is known', async () => {
    /*
     * Order matters and is the actual fix. If the field were only written
     * after a successful read, a fetch that threw or timed out would fall back
     * to `'not attempted'` -- the same wrong answer, reached by a rarer route.
     */
    const block = await attemptBlock();
    const attempt = block.indexOf('report.companySourceDetail = `attempted');
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
