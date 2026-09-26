import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { readFeedHealth, writeFeedHealth } from '@/lib/market/store/repo';
import type { MarketFeedHealth } from '@/lib/market/types';

/**
 * After a rollback to a build older than trades.db's schema, the worker refuses
 * the store, degrades rather than dying, and every OTHER field of the desk
 * reads healthy. The only place that state can be seen without reading a
 * startup log is /api/health -- so this proves it arrives there.
 */
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-health-'));
  vi.stubEnv('MARKET_DB_PATH', path.join(dir, 'market.db'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function seedHealth(tradeCapture: MarketFeedHealth['tradeCapture']) {
  const db = openDatabase(path.join(dir, 'market.db'));
  const base = readFeedHealth(db);
  const health = {
    ...(base ?? {}),
    mode: 'LIVE',
    feed: 'sip',
    connectionState: 'CONNECTED',
    tradeCapture,
  } as MarketFeedHealth;
  writeFeedHealth(db, health);
  db.close();
}

describe('/api/health reports ten-second trade capture', () => {
  it('shows DISCARDING, with its reason and count, when the worker could not open the store', async () => {
    seedHealth({
      state: 'DISCARDING',
      detail: '[trades] store unavailable: schema v2, newer than this build',
      bucketsWritten: 0,
      bucketsDiscarded: 37,
    });
    const { GET } = await import('@/app/api/health/route');

    const body = await (await GET()).json();

    expect(body.market.tradeCapture).toEqual({
      state: 'DISCARDING',
      detail: '[trades] store unavailable: schema v2, newer than this build',
      bucketsWritten: 0,
      bucketsDiscarded: 37,
    });
  });

  it('reports null, not a default, for a worker older than the field', async () => {
    seedHealth(undefined);
    const { GET } = await import('@/app/api/health/route');

    const body = await (await GET()).json();

    expect(body.market.tradeCapture).toBeNull();
  });
});
