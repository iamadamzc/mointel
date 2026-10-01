import { describe, expect, it } from 'vitest';

import { addBoardMovers, selectMovers } from '@/lib/market/boardMovers';
import { loadMarketConfig } from '@/lib/market/config';
import type { DemandState } from '@/lib/market/types';

describe('his numbers are the defaults (2026-10-01T15:53:57Z, "10% with 500k shares, cap 15")', () => {
  it('BOARD_MOVERS_MIN_PCT 10, BOARD_MOVERS_MIN_VOLUME 500,000, BOARD_MOVERS_K 15 when unset', () => {
    const config = loadMarketConfig({});
    expect([config.boardMoversMinPct, config.boardMoversMinVolume, config.boardMoversK]).toEqual([10, 500_000, 15]);
  });

  it('0 is honoured for the volume floor and the cap (off), not replaced by the default', () => {
    const config = loadMarketConfig({ BOARD_MOVERS_MIN_VOLUME: '0', BOARD_MOVERS_K: '0' });
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
) => ({ ticker, price, percentChange, rvolRank, cumulativeVolume }) as unknown as DemandState;

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
