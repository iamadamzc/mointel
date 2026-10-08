import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { basisFetchDue, deepHistoryDue, splitBasisSessions } from '@/lib/research/historyFetch';
import { readSplitFactors, upsertDailyBars, type NewDailyBar } from '@/lib/research/history';

/**
 * The basis trigger, and the two store facts it stands on.
 *
 * `ensureDeepHistory` itself is not unit-testable — it builds its own client
 * and credentials — so, as with the blue-sky trigger, the gate is where the
 * behaviour that decides COST is pinned. What is different here is WHAT gates:
 * a basis is due once for any researched ticker, with rank and price playing
 * no part. That decoupling is the trader-approved change (2026-08-27), so it
 * gets its own assertion against the blue-sky gate rather than being implied.
 *
 * The predicate is the FACTOR, not the deep-source marker, because the marker
 * does not survive: a shallow refresh overwrites `source` on every row it
 * touches, while `split_factor` is COALESCEd. Both halves are pinned below —
 * if the upsert ever stops preserving factors, the trigger starts refetching
 * every symbol every day, and the test that catches that is this one.
 */

const files: string[] = [];

function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'basis-fetch-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

function bar(over: Partial<NewDailyBar> & { tradingDate: string }): NewDailyBar {
  return {
    symbol: 'ACME',
    open: 9,
    high: 10,
    low: 8,
    close: 9.5,
    volume: 1_000_000,
    tradeCount: null,
    vwap: null,
    adjustment: 'split',
    splitFactor: null,
    source: 'alpaca-daily-bar',
    fetchedAt: '2026-08-20T23:00:00Z',
    ...over,
  } as NewDailyBar;
}

describe('basisFetchDue', () => {
  it('fires for a researched name the blue-sky gate would never touch', () => {
    /*
     * The decoupling itself, as one assertion. No ticker_session row at all —
     * the blue-sky gate answers "not due" before it ever reaches a price —
     * while the basis gate fires, because being researched is the only
     * qualification a basis needs.
     */
    const store = db();
    upsertDailyBars(store, [bar({ tradingDate: '2026-08-19' })]);

    expect(deepHistoryDue(store, 'ACME', '2026-08-24').due).toBe(false);

    const decision = basisFetchDue(store, 'ACME');
    expect(decision.due).toBe(true);
    expect(decision.reason).toBe('no split basis established');
  });

  it('fires for a name with no stored bars at all', () => {
    expect(basisFetchDue(db(), 'ACME').due).toBe(true);
  });

  it('does not fire once a factor is established through the last settled session', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: 2, source: 'alpaca-daily-deep' }),
    ]);

    // Wed 10:00 ET: the last settled session is Tue 08-19, which carries the factor.
    const decision = basisFetchDue(store, 'ACME', new Date('2026-08-20T14:00:00Z'));
    expect(decision.due).toBe(false);
    expect(decision.reason).toContain('split basis established');
  });

  it('stays established through a shallow refresh of the same row', () => {
    /*
     * The store fact the predicate stands on. The shallow path rewrites the
     * trailing window daily with splitFactor null and its own source string;
     * COALESCE keeps the factor, and the factor — not the overwritten source
     * marker — is what this gate reads. A young listing sits ENTIRELY inside
     * the shallow window, so a source-based predicate would re-arm there
     * forever.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: 2, source: 'alpaca-daily-deep' }),
    ]);
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: null, source: 'alpaca-daily-bar' }),
    ]);

    expect(basisFetchDue(store, 'ACME', new Date('2026-08-20T14:00:00Z')).due).toBe(false);
    expect(readSplitFactors(store, 'ACME').get('2026-08-19')).toBe(2);
  });

  it('fires again when the newest factor predates the last settled session', () => {
    /*
     * The stale basis (Research 263e556a). Only the deep pass derives a
     * factor, and the shallow pass writes every later session with a null
     * one, so a name established once and researched again weeks later
     * carries no factor on its recent bars: the daily level ladder and the
     * blue-sky ceiling drop them, and the float's split proof reads them as
     * unproven. Re-arming on staleness is what refreshes them.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-19',
        splitFactor: 1,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-20T01:00:00Z',
      }),
      bar({ tradingDate: '2026-08-20' }),
      bar({ tradingDate: '2026-08-21' }),
      bar({ tradingDate: '2026-08-24' }),
    ]);

    // Tue 08-25 10:00 ET: the last settled session is Mon 08-24, three sessions after the factor.
    const decision = basisFetchDue(store, 'ACME', new Date('2026-08-25T14:00:00Z'));
    expect(decision.due).toBe(true);
    expect(decision.reason).toBe('split basis stale (last factor 2026-08-19, last settled 2026-08-24)');
  });

  it('is satisfied by a deep pass that reaches the last settled session', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-19', splitFactor: 1, source: 'alpaca-daily-deep' }),
      bar({ tradingDate: '2026-08-24' }),
    ]);
    const now = new Date('2026-08-25T14:00:00Z');
    expect(basisFetchDue(store, 'ACME', now).due).toBe(true);

    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-24',
        splitFactor: 1,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-25T14:00:05Z',
      }),
    ]);
    const after = basisFetchDue(store, 'ACME', now);
    expect(after.due).toBe(false);
    expect(after.reason).toContain('split basis established');
  });

  it('holds a stale basis to one deep pass a day when the pass cannot reach the settled session', () => {
    /*
     * A deep pass today that returned no factor for the newest session (the
     * daily bar not yet published, or no usable raw close) must not re-ask on
     * every job the name gets today. The once-per-ET-day marker caps it, and
     * the next day it is due again.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-19',
        splitFactor: 1,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-25T14:00:05Z',
      }),
      bar({ tradingDate: '2026-08-24' }),
    ]);

    const sameDay = basisFetchDue(store, 'ACME', new Date('2026-08-25T18:00:00Z'));
    expect(sameDay.due).toBe(false);
    expect(sameDay.reason).toContain('already fetched today');

    expect(basisFetchDue(store, 'ACME', new Date('2026-08-26T14:00:00Z')).due).toBe(true);
  });

  it('caps an underivable symbol at one fetch per day', () => {
    /*
     * A deep pass that derived no factors (no usable raw closes) leaves the
     * gate's question unanswered; without this cap it would re-ask on every
     * job the symbol gets. The deep pass's own marker bounds it to one fetch a
     * day, and the next day it is due again.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({
        tradingDate: '2026-08-19',
        splitFactor: null,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-24T14:00:00Z',
      }),
    ]);

    const sameDay = basisFetchDue(store, 'ACME', new Date('2026-08-24T18:00:00Z'));
    expect(sameDay.due).toBe(false);
    expect(sameDay.reason).toContain('already fetched today');

    expect(basisFetchDue(store, 'ACME', new Date('2026-08-25T14:00:00Z')).due).toBe(true);
  });
});

describe('splitBasisSessions — the outcome the log line reports', () => {
  /*
   * Added 2026-09-03 after the worker's deep-fetch line printed the gate's
   * PRE-fetch reason, so a symbol that established a basis logged identically
   * to one that did not. SVRN found four split events and still read "(no
   * split basis established)".
   *
   * `not.toBe(0)` would pass on undefined, so every assertion here is on the
   * exact count -- a negative assertion passes for the wrong reason as easily
   * as the right one.
   *
   * WHAT THIS DOES NOT COVER, stated so green tests are not read as covering
   * the worker: the log STRING lives in `worker/research.ts`, a process entry
   * point that cannot be imported, so these pin the helper it calls rather
   * than the line itself. Same limit as `stalledJobs` in item 24.
   */

  it('counts established sessions, and zero is a real answer', () => {
    const store = db();
    expect(splitBasisSessions(store, 'ACME')).toBe(0);

    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-18', splitFactor: 8, source: 'alpaca-daily-deep' }),
      bar({ tradingDate: '2026-08-19', splitFactor: 1, source: 'alpaca-daily-deep' }),
    ]);
    expect(splitBasisSessions(store, 'ACME')).toBe(2);
  });

  it('separates a fetch that established from one that derived nothing', () => {
    /*
     * The distinction the old log line could not make, and the reason the
     * post-state is asked of the STORE rather than inferred from the fetch
     * result. Both symbols were deep-fetched today; only one has a basis.
     * Note that basisFetchDue reports NEITHER as due -- the underivable one is
     * held off by the once-a-day cap -- so dueness cannot stand in for
     * establishment, which is exactly the substitution that would have
     * reintroduced the bug.
     */
    const store = db();
    upsertDailyBars(store, [
      bar({
        symbol: 'GOOD',
        tradingDate: '2026-08-19',
        splitFactor: 1,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-24T14:00:00Z',
      }),
      bar({
        symbol: 'BARE',
        tradingDate: '2026-08-19',
        splitFactor: null,
        source: 'alpaca-daily-deep',
        fetchedAt: '2026-08-24T14:00:00Z',
      }),
    ]);
    const now = new Date('2026-08-24T18:00:00Z');

    expect(splitBasisSessions(store, 'GOOD')).toBe(1);
    expect(splitBasisSessions(store, 'BARE')).toBe(0);

    expect(basisFetchDue(store, 'GOOD', now).due).toBe(false);
    expect(basisFetchDue(store, 'BARE', now).due).toBe(false);
    expect(basisFetchDue(store, 'BARE', now).reason).toContain('already fetched today');
  });

  it('is the same count the gate reports, so the two cannot drift', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-18', splitFactor: 1, source: 'alpaca-daily-deep' }),
      bar({ tradingDate: '2026-08-19', splitFactor: 1, source: 'alpaca-daily-deep' }),
      bar({ tradingDate: '2026-08-20', splitFactor: 1, source: 'alpaca-daily-deep' }),
    ]);

    // Fri 08-21 10:00 ET: the last settled session is 08-20, the newest factor.
    expect(basisFetchDue(store, 'ACME', new Date('2026-08-21T14:00:00Z')).reason).toBe(
      `split basis established (${splitBasisSessions(store, 'ACME')} session(s))`,
    );
  });
});

describe('readSplitFactors', () => {
  it('reads the full stored depth, not the cycle window', () => {
    /*
     * The reason the pipeline reads THIS and not the 90-bar cycle window:
     * filing dates routinely sit beyond it — 122 of 239 dated supply blocks on
     * the 08-23 snapshot — and a clipped series returns null for exactly the
     * operands the basis fetch exists to make comparable.
     */
    const store = db();
    const rows: NewDailyBar[] = [];
    const start = Date.parse('2025-01-01T00:00:00Z');
    for (let i = 0; i < 120; i += 1) {
      const tradingDate = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      rows.push(bar({ tradingDate, splitFactor: i < 10 ? 8 : 1, source: 'alpaca-daily-deep' }));
    }
    upsertDailyBars(store, rows);

    const factors = readSplitFactors(store, 'ACME');
    expect(factors.size).toBe(120);
    expect(factors.get('2025-01-01')).toBe(8);
    expect(factors.get('2025-04-30')).toBe(1);
  });

  it('bounds by asOf and skips rows with no established factor', () => {
    const store = db();
    upsertDailyBars(store, [
      bar({ tradingDate: '2026-08-18', splitFactor: 1 }),
      bar({ tradingDate: '2026-08-19', splitFactor: null }),
      bar({ tradingDate: '2026-08-21', splitFactor: 1 }),
    ]);

    const bounded = readSplitFactors(store, 'ACME', '2026-08-20');
    expect([...bounded.keys()]).toEqual(['2026-08-18']);

    const unbounded = readSplitFactors(store, 'ACME');
    expect([...unbounded.keys()]).toEqual(['2026-08-18', '2026-08-21']);
  });
});
