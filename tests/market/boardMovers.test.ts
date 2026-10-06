import { describe, expect, it } from 'vitest';

import { addBoardMovers, selectMovers } from '@/lib/market/boardMovers';
import { loadMarketConfig } from '@/lib/market/config';
import type { DemandState } from '@/lib/market/types';

describe('his numbers are the defaults (2026-10-01T15:53:57Z, "10% with 500k shares, cap 15")', () => {
  it('BOARD_MOVERS_MIN_PCT 10, BOARD_MOVERS_MIN_VOLUME 500,000, BOARD_MOVERS_K 15 when unset', () => {
    const config = loadMarketConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    expect([config.boardMoversMinPct, config.boardMoversMinVolume, config.boardMoversK]).toEqual([10, 500_000, 15]);
  });

  it('0 is honoured for the volume floor and the cap (off), not replaced by the default', () => {
    const config = loadMarketConfig({
      NODE_ENV: 'test',
      BOARD_MOVERS_MIN_VOLUME: '0',
      BOARD_MOVERS_K: '0',
    } as NodeJS.ProcessEnv);
    expect([config.boardMoversMinVolume, config.boardMoversK]).toEqual([0, 0]);
  });
});

/* His VEEA ruling, 2026-10-01: a big % mover reaches the board regardless of RVOL rank. */

const state = (
  ticker: string,
  price: number | null,
  percentChange: number | null,
  rvolRank: number | null = null,
  cumulativeVolume: number | null = 1_000_000,
) =>
  ({ ticker, price, percentChange, rvolRank, cumulativeVolume, referenceRthCloseBasis: 'PRIOR_SESSION' }) as unknown as DemandState;

const BAND = { min: 1, max: 20 };

describe('selectMovers', () => {
  it('keeps in-band names at or above the floor, biggest move first, ties by symbol', () => {
    const picked = selectMovers(
      [
        state('LOW', 5, 19.99),
        state('VEEA', 3.1, 42.0, 120),
        state('BIG', 8, 80),
        state('TIEB', 2, 25),
        state('TIEA', 2, 25),
        state('ATFLOOR', 4, 20),
      ],
      BAND,
      20,
      0,
      10,
    );
    expect(picked.map((s) => s.ticker)).toEqual(['BIG', 'VEEA', 'TIEA', 'TIEB', 'ATFLOOR']);
  });

  it('refuses out-of-band prices, unknown prices and unknown moves', () => {
    const picked = selectMovers(
      [state('CHEAP', 0.5, 90), state('DEAR', 25, 90), state('NOPRICE', null, 90), state('NOMOVE', 5, null)],
      BAND,
      20,
      0,
      10,
    );
    expect(picked).toEqual([]);
  });

  it('his volume floor (15:53:57Z, "10% with 500k shares"): under it is refused, exactly at it is kept, unknown volume is refused', () => {
    const picked = selectMovers(
      [
        state('THIN', 5, 40, null, 499_999),
        state('ATVOL', 5, 30, null, 500_000),
        state('NOVOL', 5, 50, null, null),
        state('HEAVY', 5, 12, null, 9_000_000),
      ],
      BAND,
      10,
      500_000,
      15,
    );
    expect(picked.map((s) => s.ticker)).toEqual(['ATVOL', 'HEAVY']);
  });

  it('returns nothing when the limit is 0 (the rule is off)', () => {
    expect(selectMovers([state('BIG', 8, 80)], BAND, 20, 0, 0)).toEqual([]);
  });
});

describe('addBoardMovers', () => {
  const board = [state('A', 5, 3, 1), state('B', 6, 1, 2), state('BIG', 8, 80, 3)];

  it('adds movers not already on the board, marked MOVER, keeping their true rvol rank, and removes nothing', () => {
    const out = addBoardMovers(board, [state('BIG', 8, 80, 3), state('VEEA', 3.1, 42, 120)], 10);
    expect(out.map((s) => s.ticker)).toEqual(['A', 'B', 'BIG', 'VEEA']);
    const veea = out.find((s) => s.ticker === 'VEEA')!;
    expect(veea.boardReason).toBe('MOVER');
    expect(veea.rvolRank).toBe(120);
    expect(out.find((s) => s.ticker === 'BIG')!.boardReason).toBeUndefined();
  });

  it('caps the additions at k and drops the SMALLEST qualifying moves first', () => {
    const movers = [state('M1', 2, 90), state('M2', 2, 70), state('M3', 2, 50), state('M4', 2, 30)];
    const out = addBoardMovers(board, movers, 2);
    expect(out.slice(board.length).map((s) => s.ticker)).toEqual(['M1', 'M2']);
  });

  it('a mover already on the board does not use up the cap', () => {
    const out = addBoardMovers(board, [state('BIG', 8, 80, 3), state('M1', 2, 70), state('M2', 2, 50)], 2);
    expect(out.slice(board.length).map((s) => s.ticker)).toEqual(['M1', 'M2']);
  });

  it('the whole rule, from UNSORTED candidates: the cap keeps the biggest moves', () => {
    const candidates = [state('M3', 2, 50), state('M1', 2, 90), state('M4', 2, 30), state('M2', 2, 70)];
    const out = addBoardMovers(board, selectMovers(candidates, BAND, 20, 0, 50 + 2), 2);
    expect(out.slice(board.length).map((s) => s.ticker)).toEqual(['M1', 'M2']);
  });

  it('k = 0 returns the board unchanged', () => {
    expect(addBoardMovers(board, [state('M1', 2, 90)], 0)).toBe(board);
  });
});

/*
 * THE RANKED MOVER (IPDN, 2026-10-06 08:05 ET: +70% on 19.3M shares, RVOL rank
 * 14, so already among the internal 50 and given no mark at all). Integration
 * 31st ruled: a ranked row the mover rule selects carries `moving: true`, in
 * place, never as a second row; computed on this read from the states passed
 * in, never stored (Commercial read 16), so a name whose move falls under the
 * floor has no flag on the next read. The cap still counts ADDED rows only,
 * his "cap 15" (2026-10-01T15:53:57Z), unchanged.
 */
describe('addBoardMovers, a mover already ranked', () => {
  const ranked = [state('A', 5, 3, 1), state('IPDN', 5.27, 70, 14), state('B', 6, 1, 15)];

  it('marks the ranked row moving: true in place, adds no second row, and leaves the input untouched', () => {
    const out = addBoardMovers(ranked, [state('IPDN', 5.27, 70, 14)], 15);
    expect(out.map((s) => s.ticker)).toEqual(['A', 'IPDN', 'B']);
    expect(out[1].moving).toBe(true);
    expect(out[1].boardReason).toBeUndefined();
    expect(out[1].rvolRank).toBe(14);
    expect(ranked[1].moving).toBeUndefined();
  });

  it('a ranked row the rule did not select has no moving key at all', () => {
    const out = addBoardMovers(ranked, [state('IPDN', 5.27, 70, 14)], 15);
    expect('moving' in out[0]).toBe(false);
    expect('moving' in out[2]).toBe(false);
  });

  it('an ADDED mover is marked by boardReason, not moving', () => {
    const out = addBoardMovers(ranked, [state('VEEA', 3.1, 42, 120)], 15);
    const veea = out.find((s) => s.ticker === 'VEEA')!;
    expect(veea.boardReason).toBe('MOVER');
    expect('moving' in veea).toBe(false);
  });

  it('the cap counts added rows only: marking ranked movers never displaces an addition', () => {
    const out = addBoardMovers(ranked, [state('IPDN', 5.27, 70, 14), state('M1', 2, 60), state('M2', 2, 50)], 2);
    expect(out.map((s) => s.ticker)).toEqual(['A', 'IPDN', 'B', 'M1', 'M2']);
    expect(out[1].moving).toBe(true);
  });

  it('a ranked mover that comes AFTER the cap is full is still marked (the cap stops additions, not the loop)', () => {
    const out = addBoardMovers(ranked, [state('M1', 2, 90), state('M2', 2, 80), state('IPDN', 5.27, 70, 14)], 2);
    expect(out.map((s) => s.ticker)).toEqual(['A', 'IPDN', 'B', 'M1', 'M2']);
    expect(out[1].moving).toBe(true);
  });

  it('recomputed per read: the same row with no mover selected on the next read carries no flag', () => {
    const first = addBoardMovers(ranked, [state('IPDN', 5.27, 70, 14)], 15);
    expect(first[1].moving).toBe(true);
    const next = addBoardMovers(ranked, selectMovers([state('IPDN', 2.1, 5, 14)], BAND, 10, 0, 65), 15);
    expect('moving' in next[1]).toBe(false);
  });

  it('k = 0 (the rule off) marks nothing either', () => {
    expect(addBoardMovers(ranked, [state('IPDN', 5.27, 70, 14)], 0)).toBe(ranked);
  });
});

/*
 * THE BASIS (Commercial 17b via Design): after the 22:00 recap the DAILY board
 * can measure from TODAY's close (referenceRthCloseBasis CURRENT_SESSION) while
 * "moving" says "from the prior close". The rule selects only PRIOR_SESSION.
 */
describe('selectMovers, the close basis', () => {
  const withBasis = (ticker: string, pct: number, basis: 'PRIOR_SESSION' | 'CURRENT_SESSION' | null) =>
    ({ ...state(ticker, 5, pct), referenceRthCloseBasis: basis }) as unknown as DemandState;

  it('keeps PRIOR_SESSION, refuses CURRENT_SESSION and an unknown basis', () => {
    const picked = selectMovers(
      [withBasis('PRIOR', 40, 'PRIOR_SESSION'), withBasis('CURRENT', 90, 'CURRENT_SESSION'), withBasis('NOBASIS', 80, null)],
      BAND,
      10,
      0,
      15,
    );
    expect(picked.map((s) => s.ticker)).toEqual(['PRIOR']);
  });
});
