import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadSheetPriors, resetSheetPriorCache } from '@/lib/research/merge/sheetPrior';

/**
 * The worker polls every five seconds and read the Sheet at the top of every
 * cycle, building a fresh provider each time — so the provider's JWT, title and
 * Drive-availability caches, all instance fields, were rebuilt every cycle. That
 * is roughly 2,800 Google calls an hour, a quarter of them a Drive request that
 * always 403s, to re-read a spreadsheet written four times a day.
 */
const load = vi.fn();

vi.mock('@/lib/data/providers/googleSheets', () => ({
  readCredentialsFromEnv: () => ({ sheetId: 's', clientEmail: 'e', privateKey: 'k' }),
  GoogleSheetsProvider: class {
    load = load;
  },
}));

function state(tickers: unknown[]) {
  return { tickers, research: {}, summary: {}, meta: { fetchedAt: '2026-08-23T00:00:00Z' } };
}

function ticker(symbol: string) {
  return {
    ticker: symbol,
    cycle: { raw: 'FRESH', display: 'FRESH', state: 'FRESH' },
    catalyst: { gradeRaw: 'A', gradeBucket: 'STRONG', latest: 'news', latestTime: null, original: null, originalTime: null, hasPremarketUpdate: false },
    structure: { raw: 'flags', floatRaw: '1M', state: 'DIRTY_FLOAT', badges: [] },
    warning: { current: null, original: null, source: 'NONE' },
  };
}

afterEach(() => {
  resetSheetPriorCache();
  load.mockReset();
});

describe('sheet prior cache', () => {
  it('reads once across a burst of poll cycles', async () => {
    load.mockResolvedValue(state([ticker('ACME')]));

    const t0 = 1_000_000;
    for (let i = 0; i < 12; i += 1) await loadSheetPriors(t0 + i * 5_000);

    // Twelve cycles at the worker's 5s poll is one minute of wall clock.
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reads again once the read has aged out', async () => {
    load.mockResolvedValue(state([ticker('ACME')]));

    const t0 = 1_000_000;
    await loadSheetPriors(t0);
    await loadSheetPriors(t0 + 59_999);
    expect(load).toHaveBeenCalledTimes(1);

    await loadSheetPriors(t0 + 60_001);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps the last good read when the sheet becomes unreadable', async () => {
    load.mockResolvedValueOnce(state([ticker('ACME')]));
    const good = await loadSheetPriors(1_000_000);
    expect(good.priors.has('ACME')).toBe(true);
    expect(good.error).toBeNull();

    // An unlocatable table throws by design rather than blanking the board.
    load.mockRejectedValueOnce(new Error('TODAY tab: could not locate the ticker table'));
    const degraded = await loadSheetPriors(1_000_000 + 61_000);

    expect(degraded.priors.has('ACME')).toBe(true);
    expect(degraded.error).toContain('could not locate');
  });

  it('does not retry a failing sheet on every cycle', async () => {
    load.mockRejectedValue(new Error('boom'));

    const t0 = 1_000_000;
    for (let i = 0; i < 12; i += 1) await loadSheetPriors(t0 + i * 5_000);

    expect(load).toHaveBeenCalledTimes(1);
  });
});
