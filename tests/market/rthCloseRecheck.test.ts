import { describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import { RTH_CLOSE_RECHECK_AFTER_SECONDS, closeReplacements, formatRecheckLine } from '@/lib/market/rthCloseRecheck';

/*
 * The 16:30 ET close re-check (his "yes to the 4:30 close re-check", 2026-10-13T14:54:19.833Z). The gate must ADMIT:
 * a pre-final close is replaced; an equal one, a missing fresh value and a nonsense fresh value are left alone.
 */

describe('closeReplacements', () => {
  it('replaces a pre-final close (the MNDR case: 3.02 stored, 3.04 final)', () => {
    const out = closeReplacements(new Map([['MNDR', 3.02]]), new Map([['MNDR', 3.04]]));
    expect(out).toEqual([{ symbol: 'MNDR', old: 3.02, next: 3.04 }]);
  });

  it('leaves an equal close alone', () => {
    expect(closeReplacements(new Map([['AAA', 1.5]]), new Map([['AAA', 1.5]]))).toEqual([]);
  });

  it('leaves a close alone when there is no fresh value, or the fresh value is null, zero, negative or not finite', () => {
    const stored = new Map([
      ['A', 1],
      ['B', 1],
      ['C', 1],
      ['D', 1],
      ['E', 1],
    ]);
    const fresh = new Map<string, number | null>([
      ['B', null],
      ['C', 0],
      ['D', -2],
      ['E', Number.NaN],
    ]);
    expect(closeReplacements(stored, fresh)).toEqual([]);
  });

  it('returns replacements sorted by symbol, only for the changed names', () => {
    const out = closeReplacements(
      new Map([
        ['ZZZ', 2],
        ['AAA', 1],
        ['MMM', 3],
      ]),
      new Map([
        ['ZZZ', 2.01],
        ['AAA', 1.02],
        ['MMM', 3],
      ]),
    );
    expect(out.map((r) => r.symbol)).toEqual(['AAA', 'ZZZ']);
  });
});

describe('the re-check log line and timing', () => {
  it('names the count and each replacement, so the change is countable', () => {
    expect(formatRecheckLine(300, [{ symbol: 'MNDR', old: 3.02, next: 3.04 }])).toBe(
      '[demand] RTH close re-check: 1 of 300 close(s) replaced: MNDR 3.02 -> 3.04',
    );
    expect(formatRecheckLine(300, [])).toBe('[demand] RTH close re-check: 0 of 300 close(s) replaced');
  });

  it('runs 30 minutes after the close (16:30 ET on a normal day)', () => {
    expect(RTH_CLOSE_RECHECK_AFTER_SECONDS).toBe(1800);
  });
});

describe('DemandEngine.todayRthCloses', () => {
  const engine = () =>
    new DemandEngine({
      tradingDate: '2026-10-12',
      feed: 'sip',
      discoveryRank: 12,
      internalRank: 50,
      priceMin: 0.25,
      priceMax: 20,
      baselineSessions: 20,
      enforceSessionWindow: false,
      now: () => Date.parse('2026-10-12T20:31:00.000Z'),
    });

  it('is empty before the session closes, and lists stored closes after', () => {
    const e = engine();
    e.seedSession('MNDR', { volumeBase: 1000, volumeBaseThrough: null, volumeBaseSource: 'test', price: 3.0 });
    e.setTodayRthClose('MNDR', { close: 3.02, date: '2026-10-12', source: 'alpaca-daily-bar-rth-close' });
    expect(e.todayRthCloses().size).toBe(0);
    e.setRthClosed(true);
    expect([...e.todayRthCloses()]).toEqual([['MNDR', 3.02]]);
  });

  it('a replacement through setTodayRthClose changes the stored close the next re-check reads', () => {
    const e = engine();
    e.seedSession('MNDR', { volumeBase: 1000, volumeBaseThrough: null, volumeBaseSource: 'test', price: 3.0 });
    e.setRthClosed(true);
    e.setTodayRthClose('MNDR', { close: 3.02, date: '2026-10-12', source: 'alpaca-daily-bar-rth-close' });
    for (const r of closeReplacements(e.todayRthCloses(), new Map([['MNDR', 3.04]]))) {
      e.setTodayRthClose(r.symbol, { close: r.next, date: '2026-10-12', source: 'alpaca-daily-bar-rth-close' });
    }
    expect(e.todayRthCloses().get('MNDR')).toBe(3.04);
  });
});
