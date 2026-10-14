import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDashboardState, resetDashboardRuntime, resolveProvider } from '@/lib/data';

/*
 * The Sheet code is removed (removal plan step 7, A5, 2026-10-14). Before it, a desk with no Sheet credentials
 * served demo rows as research and the market worker tracked those fake tickers (step 1). Now there is ONE
 * provider, `none`: an empty payload, never demo rows, whatever the environment says. Both dashboard routes serve
 * what `getDashboardState` returns.
 */

const KEYS = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'USE_MOCK_DATA'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  resetDashboardRuntime();
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  resetDashboardRuntime();
});

async function expectNoSource() {
  expect(resolveProvider().kind).toBe('none');
  const state = await getDashboardState();
  expect(state.tickers).toEqual([]);
  expect(state.research).toEqual({});
  expect(state.summary.namesTracked).toBe(0);
  expect(state.meta.provider).toBe('none');
  expect(state.meta.error).toBeNull();
  expect(state.meta.stale).toBe(false);
}

describe('the dashboard payload after the Sheet removal', () => {
  it('is the explicit no-source payload: empty, not a fault', async () => {
    await expectNoSource();
  });

  it('never serves demo rows, even when USE_MOCK_DATA asks', async () => {
    process.env.USE_MOCK_DATA = '1';
    await expectNoSource();
  });

  it('ignores Sheet credentials: nothing reads the Sheet', async () => {
    process.env.GOOGLE_SHEET_ID = 'x';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'x@example.invalid';
    process.env.GOOGLE_PRIVATE_KEY = 'not-a-key';
    await expectNoSource();
  });

  it('both dashboard routes serve getDashboardState, and no Sheet module remains under lib/data', () => {
    for (const route of ['app/api/dashboard/route.ts', 'app/review/[token]/api/dashboard/route.ts']) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain('getDashboardState(');
      expect(source).not.toMatch(/readableSheet|googleSheets|providers\/mock/);
    }
    const entry = readFileSync('lib/data/index.ts', 'utf8');
    expect(entry).not.toMatch(/GoogleSheetsProvider|MockProvider|USE_MOCK_DATA/);
  });
});
