import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveTestStorePath } from '../../lib/market/config';

/**
 * `worker/test-stream.ts` writes synthetic FAKEPACA prints. It used to pick its
 * store with `MARKET_DB_PATH ? live : test`, on the reasoning that setting the
 * variable was an explicit act. It is — on a laptop. On the server it is ambient
 * service configuration, so the guard inverted exactly where contamination would
 * matter and the diagnostic would have written into the live desk's store.
 *
 * These pin the corrected contract: the ambient variable is ignored, the opt-in
 * is a dedicated one, and resolving onto the live store is refused rather than
 * honoured.
 */

const LIVE = '/var/lib/mointel/market.db';
const CWD = '/srv/app';

describe('resolveTestStorePath', () => {
  it('defaults to the test store when nothing is set', () => {
    const result = resolveTestStorePath({ env: {}, liveDbPath: LIVE, cwd: CWD });

    expect(result).toEqual({ path: path.resolve(CWD, 'data', 'market-test.db') });
  });

  it('ignores MARKET_DB_PATH, which the server sets for every unit', () => {
    const result = resolveTestStorePath({
      env: { MARKET_DB_PATH: LIVE },
      liveDbPath: LIVE,
      cwd: CWD,
    });

    // The regression: this used to resolve to LIVE.
    expect(result).toEqual({ path: path.resolve(CWD, 'data', 'market-test.db') });
  });

  it('honours the dedicated opt-in', () => {
    const result = resolveTestStorePath({
      env: { MARKET_TEST_DB_PATH: 'data/scratch.db' },
      liveDbPath: LIVE,
      cwd: CWD,
    });

    expect(result).toEqual({ path: path.resolve(CWD, 'data', 'scratch.db') });
  });

  it('refuses when the opt-in points at the live store', () => {
    const result = resolveTestStorePath({
      env: { MARKET_TEST_DB_PATH: LIVE },
      liveDbPath: LIVE,
      cwd: CWD,
    });

    expect(result).toHaveProperty('error');
    expect('error' in result && result.error).toContain('refusing to run against the live store');
  });

  it('refuses on a relative path that resolves onto the live store', () => {
    const result = resolveTestStorePath({
      env: { MARKET_TEST_DB_PATH: '../../market.db' },
      liveDbPath: LIVE,
      cwd: '/var/lib/mointel/nested/deeper',
    });

    expect(result).toHaveProperty('error');
  });

  it('refuses a case variant on a case-insensitive filesystem', () => {
    // Windows: a different string, the same file. Enumerated cases would not
    // have caught this; the property did.
    const result = resolveTestStorePath({
      env: { MARKET_TEST_DB_PATH: '/var/lib/mointel/MARKET.DB' },
      liveDbPath: LIVE,
      cwd: CWD,
      caseInsensitiveFs: true,
    });

    expect(result).toHaveProperty('error');
  });

  it('allows the same case variant where case genuinely distinguishes files', () => {
    const result = resolveTestStorePath({
      env: { MARKET_TEST_DB_PATH: '/var/lib/mointel/MARKET.DB' },
      liveDbPath: LIVE,
      cwd: CWD,
      caseInsensitiveFs: false,
    });

    expect(result).toEqual({ path: path.resolve('/var/lib/mointel/MARKET.DB') });
  });

  /**
   * The property, not a case list.
   *
   * The header of `worker/test-stream.ts` promises that synthetic prints cannot
   * reach real market state. That promise was already written down when it was
   * false — so the guarantee itself is what gets asserted, over every way anyone
   * has thought to spell the live store. A new spelling belongs in this list.
   */
  it('never resolves onto the live store, however the path is spelled', () => {
    const spellings = [
      LIVE,
      `${LIVE}`,
      './market.db',
      '../mointel/market.db',
      '../../var/lib/mointel/market.db',
      '/var/lib/mointel/./market.db',
      '/var/lib/mointel/nested/../market.db',
      '/var/lib/mointel/MARKET.DB',
      '  /var/lib/mointel/market.db  ',
    ];

    for (const caseInsensitiveFs of [true, false]) {
      for (const spelling of spellings) {
        const result = resolveTestStorePath({
          env: { MARKET_TEST_DB_PATH: spelling },
          liveDbPath: LIVE,
          cwd: '/var/lib/mointel',
          caseInsensitiveFs,
        });

        if ('path' in result) {
          const sameFile = caseInsensitiveFs
            ? result.path.toLowerCase() === path.resolve(LIVE).toLowerCase()
            : result.path === path.resolve(LIVE);
          expect(sameFile, `"${spelling}" (caseInsensitive=${caseInsensitiveFs}) reached the live store`).toBe(
            false,
          );
        }
      }
    }
  });
});
