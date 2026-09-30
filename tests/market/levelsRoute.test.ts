import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * HIS RULING: the web tier's main thread NEVER performs the minute read. The
 * route serves only precomputed rows. This file PROVES the route handler never
 * reaches the store adapter or the minute-bar readers: every one of them is
 * replaced by a spy that records the call, and each test asserts none fired,
 * on the present path and on the absent path.
 */
const spies = vi.hoisted(() => ({
  computeLevelsFromStore: vi.fn(),
  readLevelsInput: vi.fn(),
  computeBoardLevels: vi.fn(),
  loadMinuteBarRange: vi.fn(),
  loadMinuteBars: vi.fn(),
  getResistanceLevels: vi.fn(),
}));

vi.mock('@/lib/market/levelsStore', () => ({
  computeLevelsFromStore: spies.computeLevelsFromStore,
  readLevelsInput: spies.readLevelsInput,
  computeBoardLevels: spies.computeBoardLevels,
}));
vi.mock('@/lib/market/levelsService', () => ({ getResistanceLevels: spies.getResistanceLevels }));
vi.mock('@/lib/market/store/repo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/market/store/repo')>()),
  loadMinuteBarRange: spies.loadMinuteBarRange,
  loadMinuteBars: spies.loadMinuteBars,
}));

import { GET } from '@/app/api/levels/route';
import { readRequested, writeLevelsRow } from '@/lib/market/levelsFiles';
import type { ResistanceLevels } from '@/lib/market/levels';

const TODAY = '2026-09-29';
const NOW = Date.parse(`${TODAY}T16:02:30.000Z`);

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-route-'));
  vi.stubEnv('MARKET_DB_PATH', path.join(dir, 'market.db'));
  vi.stubEnv('LEVELS_DIR', path.join(dir, 'levels'));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  for (const spy of Object.values(spies)) spy.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function expectNoMinuteRead() {
  for (const [name, spy] of Object.entries(spies)) {
    expect(spy, `${name} must never be called by the route`).not.toHaveBeenCalled();
  }
}

async function call(query: string) {
  const response = await GET(new Request(`http://localhost/api/levels${query}`));
  return { status: response.status, body: await response.json() };
}

function row(symbol: string, levels: ResistanceLevels['levels']): ResistanceLevels {
  return {
    symbol,
    tradingDate: TODAY,
    computedAt: `${TODAY}T16:00:00.000Z`,
    price: 2,
    levels,
    ...(levels.length === 0 ? { aboveAllStored: true as const } : {}),
    horizon: { fiveMinFrom: `${TODAY}T08:00:00.000Z`, fifteenMinFrom: null, dailyFrom: null },
  };
}

const LEVEL = {
  price: 2.5,
  low: 2.5,
  high: 2.5,
  timeframes: ['5m' as const],
  tops: 1,
  newestTopEnd: `${TODAY}T15:45:00.000Z`,
  oldestTopEnd: `${TODAY}T15:45:00.000Z`,
};

describe('/api/levels serves only precomputed rows', () => {
  it('PRESENT: 200 with the written row, and no minute read', async () => {
    writeLevelsRow(path.join(dir, 'levels'), row('ABCD', [LEVEL]));
    const { status, body } = await call('?symbol=abcd');
    expect(status).toBe(200);
    expect(body).toEqual(row('ABCD', [LEVEL]));
    expectNoMinuteRead();
  });

  it('EMPTY: 200 with levels [] and aboveAllStored, and no minute read', async () => {
    writeLevelsRow(path.join(dir, 'levels'), row('HIGH', []));
    const { status, body } = await call('?symbol=HIGH');
    expect(status).toBe(200);
    expect(body.levels).toEqual([]);
    expect(body.aboveAllStored).toBe(true);
    expectNoMinuteRead();
  });

  it('ABSENT: 404 with no levels field, the symbol requested for the next refresh, and no minute read', async () => {
    const { status, body } = await call('?symbol=NOPE');
    expect(status).toBe(404);
    expect(body).toEqual({ symbol: 'NOPE', absent: true });
    expect('levels' in body).toBe(false);
    expect(readRequested(path.join(dir, 'levels'), TODAY)).toEqual(['NOPE']);
    await call('?symbol=NOPE');
    expect(readRequested(path.join(dir, 'levels'), TODAY)).toEqual(['NOPE']);
    expectNoMinuteRead();
  });

  it('400 without a usable symbol, including one that could leave the directory', async () => {
    expect((await call('')).status).toBe(400);
    expect((await call('?symbol=..%2Fx')).status).toBe(400);
    expect((await call('?symbol=A%2FB')).status).toBe(400);
    expectNoMinuteRead();
  });
});
