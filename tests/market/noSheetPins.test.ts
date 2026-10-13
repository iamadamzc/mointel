import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sheet step 4 (A4): the market worker stops pinning the TODAY sheet's list.
 * The read lived in two places, the session bootstrap (startup and every roll)
 * and a 60-second timer, so both are asserted. Asserted against source because
 * these are call sites in a process entry point, not values.
 */
const source = fs
  .readFileSync(path.join(process.cwd(), 'worker/alpaca.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

describe('the market worker pins nothing from the Sheet', () => {
  it('reads no Sheet list at bootstrap and starts no Sheet timer', () => {
    expect(source).not.toContain('refreshSheetSymbols(');
    expect(source).not.toContain('startSheetSync(');
    expect(source).not.toContain('pinnedSheetSymbols');
  });

  it('bootstraps with no pins and builds baselines from the universe alone', () => {
    expect(source).toContain('await runtime.bootstrapSession([]);');
    expect(source).toContain('await runtime.ensureBaselines(universe);');
  });
});
