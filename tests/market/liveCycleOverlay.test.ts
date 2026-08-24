import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { overlayLiveCycle } from '@/lib/market/readModel';
import { upsertDailyBars } from '@/lib/research/history';
import type { ResearchAnalysisVersion } from '@/lib/research/types';

const files: string[] = [];
function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-overlay-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function seedRun(db: ReturnType<typeof temporaryDb>, symbol = 'ACME') {
  const bars = Array.from({ length: 24 }, (_, i) => ({
    symbol,
    tradingDate: `2026-06-${String(i + 1).padStart(2, '0')}`,
    open: 1.3, high: 1.32, low: 1.28, close: 1.3, volume: 1_000_000,
    tradeCount: null, vwap: null, adjustment: 'split', splitFactor: null,
    source: 'test', fetchedAt: '2026-07-01T00:00:00Z',
  }));
  bars.push({
    symbol, tradingDate: '2026-07-01', open: 1.3, high: 3.4, low: 1.3, close: 3.0,
    volume: 40_000_000, tradeCount: null, vwap: null, adjustment: 'split',
    splitFactor: null, source: 'test', fetchedAt: '2026-07-02T00:00:00Z',
  });
  upsertDailyBars(db, bars);
}

function analysis(dossier: unknown): ResearchAnalysisVersion {
  return { id: 1, ticker: 'ACME', generatedAt: '2026-07-01T12:00:00Z', dossier } as ResearchAnalysisVersion;
}

/**
 * The live overlay.
 *
 * A cycle moves with price every session; filings do not. Storing it on a
 * dossier put a price-derived value behind an evidence-change gate, so a name
 * whose filings had not moved kept a stale cycle and a name analysed before the
 * field existed never got one.
 */
describe('overlayLiveCycle', () => {
  it('gives a cycle to a dossier that has none', () => {
    const db = temporaryDb();
    seedRun(db);
    // The shape of every dossier stored before computedCycle existed.
    const result = overlayLiveCycle(db, analysis({ ticker: 'ACME', catalyst: {}, structure: {}, cycle: {} }));
    expect(result?.dossier?.computedCycle?.current.phase).toBe('DAY_ONE');
  });

  it('replaces a stale stored cycle rather than deferring to it', () => {
    const db = temporaryDb();
    seedRun(db);
    const stale = { ticker: 'ACME', catalyst: {}, structure: {}, cycle: {}, computedCycle: { current: { phase: 'NO_CYCLE' } } };
    const result = overlayLiveCycle(db, analysis(stale));
    expect(result?.dossier?.computedCycle?.current.phase).toBe('DAY_ONE');
  });

  it('DOES NOT MUTATE the stored analysis, which is what preserves as-of', () => {
    const db = temporaryDb();
    seedRun(db);
    // The stored value is asOf-bounded at pipeline.ts:363 so a replay or an
    // archived assessment can resolve a cycle against the bars that existed at
    // the time. If the overlay wrote through, that boundary would be gone and a
    // historical reader would silently learn how the move turned out.
    const stored = { ticker: 'ACME', catalyst: {}, structure: {}, cycle: {}, computedCycle: null };
    const input = analysis(stored);
    overlayLiveCycle(db, input);

    expect(stored.computedCycle).toBeNull();
    expect(input.dossier).toBe(stored);
  });

  it('leaves an absent cycle absent rather than guessing', () => {
    const db = temporaryDb();
    // No bars at all.
    const result = overlayLiveCycle(db, analysis({ ticker: 'ACME', catalyst: {}, structure: {}, cycle: {} }));
    expect(result?.dossier?.computedCycle ?? null).toBeNull();
  });

  it('passes a null analysis straight through', () => {
    expect(overlayLiveCycle(temporaryDb(), null)).toBeNull();
  });
});
