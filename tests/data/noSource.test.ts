import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDashboardState, resetDashboardRuntime, resolveProvider } from '@/lib/data';
import { researchedEmptyText } from '@/lib/dashboard/view';

/*
 * Sheet removal, step 1 (`docs/sheet-removal-plan-2026-10-03.md`): a desk with
 * no Sheet credentials served the MOCK provider's demo rows as if they were
 * research, and the market worker tracked those fake tickers. Written from the
 * plan's rule, not from the code:
 *
 * - no credentials and no USE_MOCK_DATA: provider `none`, an EMPTY payload with
 *   no error and not stale (absence is the intended state, not a fault);
 * - USE_MOCK_DATA still gives the demo rows, and only it does;
 * - the researched table blames the filters only when there were names to filter.
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

describe('a desk with no outside research source', () => {
  it('serves an empty payload, never demo rows, and not as a fault', async () => {
    expect(resolveProvider().kind).toBe('none');
    const state = await getDashboardState();
    expect(state.tickers).toEqual([]);
    expect(state.research).toEqual({});
    expect(state.summary.namesTracked).toBe(0);
    expect(state.meta.provider).toBe('none');
    expect(state.meta.error).toBeNull();
    expect(state.meta.stale).toBe(false);
  });

  it('gives demo rows only when USE_MOCK_DATA asks for them', async () => {
    process.env.USE_MOCK_DATA = '1';
    expect(resolveProvider().kind).toBe('mock');
    const state = await getDashboardState();
    expect(state.tickers.length).toBeGreaterThan(0);
  });
});

describe('the researched table when it shows nothing', () => {
  it('blames the filters only when there were names to filter', () => {
    expect(researchedEmptyText(4)).toBe('No names match the current filters.');
    expect(researchedEmptyText(0)).toBe('No researched names on file.');
  });
});
