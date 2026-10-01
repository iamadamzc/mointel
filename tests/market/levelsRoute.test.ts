import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * HIS RULING: the web tier NEVER performs the minute read. The route serves
 * only the rows the research worker's refresh child stored in history.db's
 * `resistance_levels`. This file PROVES the route never opens market.db and
 * never computes: the market store's open, the store adapter and the
 * minute-bar readers are all replaced by spies that record the call, and every
 * test asserts none fired (present, empty, absent, missing store, corrupt
 * payload, bad symbol). market.db is also never on disk here, and every test
 * checks it was not created.
 */
const sqliteOpens = vi.hoisted(() => [] as string[]);
const spies = vi.hoisted(() => ({
  openDatabase: vi.fn(),
  computeLevelsFromStore: vi.fn(),
  readLevelsInput: vi.fn(),
  computeBoardLevels: vi.fn(),
  loadMinuteBarRange: vi.fn(),
  loadMinuteBars: vi.fn(),
}));

// EVERY SQLite open, by file, whatever module makes it: a route that reached
// market.db by any path (not only openDatabase) is caught here.
vi.mock('better-sqlite3', async (importOriginal) => {
  const Original = (await importOriginal<{ default: typeof import('better-sqlite3') }>()).default;
  function Recording(file: string, options?: unknown) {
    sqliteOpens.push(path.resolve(String(file)));
    return new Original(file, options as never);
  }
  Recording.prototype = Original.prototype;
  return { default: Recording };
});
vi.mock('@/lib/market/store/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/market/store/db')>();
  return {
    ...original,
    openDatabase: (...args: Parameters<typeof original.openDatabase>) => {
      spies.openDatabase(...args);
      return original.openDatabase(...args);
    },
  };
});
vi.mock('@/lib/market/levelsStore', () => ({
  computeLevelsFromStore: spies.computeLevelsFromStore,
  readLevelsInput: spies.readLevelsInput,
  computeBoardLevels: spies.computeBoardLevels,
}));
vi.mock('@/lib/market/store/repo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/market/store/repo')>()),
  loadMinuteBarRange: spies.loadMinuteBarRange,
  loadMinuteBars: spies.loadMinuteBars,
}));

import { GET } from '@/app/api/levels/route';
import type { ResistanceLevels } from '@/lib/market/levels';
import { openHistoryStore, writeResistanceLevels } from '@/lib/market/store/historyStore';

/* 2026-09-29 is EDT: 12:02:30 ET is 16:02:30Z. */
const TODAY = '2026-09-29';
const NOW = Date.parse(`${TODAY}T16:02:30.000Z`);

let dir: string;
let marketPath: string;
let historyPath: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-route-'));
  marketPath = path.join(dir, 'market.db');
  historyPath = path.join(dir, 'history.db'); // the default: beside market.db
  vi.stubEnv('MARKET_DB_PATH', marketPath);
  vi.stubEnv('HISTORY_DB_PATH', '');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  for (const spy of Object.values(spies)) spy.mockClear();
  sqliteOpens.length = 0;
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

function expectNoMarketRead() {
  for (const [name, spy] of Object.entries(spies)) {
    expect(spy, `${name} must never be called by the route`).not.toHaveBeenCalled();
  }
  expect(fs.existsSync(marketPath), 'the route must never create market.db').toBe(false);
  expect(sqliteOpens, 'the route must never open market.db').not.toContain(path.resolve(marketPath));
}

/** Only history.db is opened by a request, and only by the route (not the test's own seeding). */
async function callOpening(query: string) {
  sqliteOpens.length = 0;
  const result = await call(query);
  expect(sqliteOpens.every((file) => file === path.resolve(historyPath)), sqliteOpens.join(', ')).toBe(true);
  return result;
}

async function call(query: string) {
  const response = await GET(new Request(`http://localhost/api/levels${query}`));
  return {
    status: response.status,
    cache: response.headers.get('Cache-Control'),
    body: await response.json(),
  };
}

function row(symbol: string, levels: ResistanceLevels['levels'], tradingDate = TODAY): ResistanceLevels {
  return {
    symbol,
    tradingDate,
    computedAt: `${tradingDate}T16:00:00.000Z`,
    price: 2,
    levels,
    ...(levels.length === 0 ? { aboveAllStored: true as const } : {}),
    horizon: { fiveMinFrom: `${tradingDate}T08:00:00.000Z`, fifteenMinFrom: null, dailyFrom: null },
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

function store(rows: Array<{ symbol: string; tradingDate?: string; payload: string }>) {
  const db = openHistoryStore(historyPath);
  writeResistanceLevels(
    db,
    rows.map((r) => ({
      symbol: r.symbol,
      tradingDate: r.tradingDate ?? TODAY,
      computedAt: `${r.tradingDate ?? TODAY}T16:00:00.000Z`,
      payload: r.payload,
    })),
  );
  db.close();
}

describe('/api/levels serves only the rows stored in history.db', () => {
  it('PRESENT: 200 with the stored row, no-store, and market.db never touched', async () => {
    store([{ symbol: 'ABCD', payload: JSON.stringify(row('ABCD', [LEVEL])) }]);
    const result = await callOpening('?symbol=abcd');
    expect(result.status).toBe(200);
    expect(result.cache).toMatch(/no-store/);
    expect(result.body).toEqual(row('ABCD', [LEVEL]));
    // The open recorder sees opens: exactly one, history.db, for this request.
    expect(sqliteOpens).toEqual([path.resolve(historyPath)]);
    expectNoMarketRead();
  });

  it('EMPTY: 200 with levels [] and aboveAllStored, and market.db never touched', async () => {
    store([{ symbol: 'HIGH', payload: JSON.stringify(row('HIGH', [])) }]);
    const { status, body } = await callOpening('?symbol=HIGH');
    expect(status).toBe(200);
    expect(body.levels).toEqual([]);
    expect(body.aboveAllStored).toBe(true);
    expectNoMarketRead();
  });

  it('ABSENT: 200 + null for a name with no row, and for a row stored only for another date', async () => {
    store([{ symbol: 'PRV', tradingDate: '2026-09-28', payload: JSON.stringify(row('PRV', [LEVEL], '2026-09-28')) }]);
    for (const query of ['?symbol=NOPE', '?symbol=PRV']) {
      const result = await callOpening(query);
      expect(result).toEqual({ status: 200, cache: expect.stringMatching(/no-store/), body: null });
    }
    expectNoMarketRead();
  });

  it('a missing history.db is 200 + null, and the read-only open does not create it', async () => {
    const result = await callOpening('?symbol=ABCD');
    expect(result.status).toBe(200);
    expect(result.body).toBeNull();
    expect(fs.existsSync(historyPath)).toBe(false);
    expectNoMarketRead();
  });

  it('a corrupt payload, or one that is not this name, is 200 + null, never a 500', async () => {
    store([
      { symbol: 'TORN', payload: '{"symbol":"TO' },
      { symbol: 'WRNG', payload: JSON.stringify(row('ABCD', [LEVEL])) },
      { symbol: 'NULL', payload: 'null' },
    ]);
    for (const query of ['?symbol=TORN', '?symbol=WRNG', '?symbol=NULL']) {
      expect((await callOpening(query)).body).toBeNull();
    }
    expectNoMarketRead();
  });

  it('a file that is not a database is 200 + null, never a 500', async () => {
    fs.writeFileSync(historyPath, 'this is not a sqlite database, it is only long enough to be read as a header');
    const result = await callOpening('?symbol=ABCD');
    expect(result).toEqual({ status: 200, cache: expect.stringMatching(/no-store/), body: null });
    expectNoMarketRead();
  });

  it('400 without a usable symbol', async () => {
    expect((await callOpening('')).status).toBe(400);
    expect((await callOpening('?symbol=%20')).status).toBe(400);
    expect((await callOpening('?symbol=..%2Fx')).status).toBe(400);
    expectNoMarketRead();
  });
});
