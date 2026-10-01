/**
 * Big movers on the board. His ruling, 2026-10-01: "VEEA is up 43% from close.
 * it should absolutely show on the board somewhere." Research picks them
 * (`lib/market/boardMovers.ts`, `discovery.movers`); Design shows them. Written
 * from the display rules, not the code:
 *
 * - a mover is never shown twice and never inside the ranking;
 * - movers keep the producer's order (biggest move first); the sort and Top N
 *   do not touch them;
 * - each mover reads as a mover: its own group, its move from the prior close,
 *   its own RVOL rank;
 * - day board only.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { boardMovers, type DeskRow } from '@/lib/dashboard/merge';
import { MOVERS_NOTE, MOVERS_TITLE, moverRankText, moversCountText, showMovers } from '@/lib/dashboard/movers';
import type { DemandState } from '@/lib/market/types';

const row = (ticker: string) => ({ ticker }) as DeskRow;
const state = (ticker: string) => ({ ticker, boardReason: 'MOVER' }) as DemandState;
const rows = new Map(['VEEA', 'ABC', 'XYZ', 'RANKED'].map((t) => [t, row(t)]));

describe('which movers the board shows', () => {
  it("keeps the producer's order, biggest move first", () => {
    expect(boardMovers([state('XYZ'), state('VEEA'), state('ABC')], rows, []).map((r) => r.ticker)).toEqual([
      'XYZ',
      'VEEA',
      'ABC',
    ]);
  });

  it('never shows a name that is already in the ranking, or the same name twice', () => {
    const shown = boardMovers([state('RANKED'), state('VEEA'), state('VEEA')], rows, [row('RANKED')]);
    expect(shown.map((r) => r.ticker)).toEqual(['VEEA']);
  });

  it('shows nothing for a payload without the field, and skips a name with no row', () => {
    expect(boardMovers(undefined, rows, [])).toEqual([]);
    expect(boardMovers([state('NOROW'), state('ABC')], rows, []).map((r) => r.ticker)).toEqual(['ABC']);
  });

  it('shows them on the day board only', () => {
    expect(showMovers('DAILY_RVOL', 2)).toBe(true);
    expect(showMovers('AFTER_HOURS', 2)).toBe(false);
    expect(showMovers('DAILY_RVOL', 0)).toBe(false);
  });
});

describe('how a mover reads', () => {
  it('carries its own RVOL rank, so a big move on a low rank reads as that', () => {
    expect(moverRankText(120)).toBe('RVOL rank 120');
    for (const none of [null, undefined, 0, -3, 1.5, Number.NaN]) expect(moverRankText(none)).toBe('no RVOL rank');
  });

  it('is counted beside the board counts, so a mover below the fold is never a surprise', () => {
    expect(moversCountText(1)).toBe('1 big mover below the ranking');
    expect(moversCountText(3)).toBe('3 big movers below the ranking');
    expect(moversCountText(0)).toBeNull();
  });

  it('says it is outside the RVOL ranking and in move order, and restates no threshold', () => {
    expect(MOVERS_TITLE).toBe('Big movers');
    expect(MOVERS_NOTE).toMatch(/outside the RVOL ranking/);
    expect(MOVERS_NOTE).toMatch(/Biggest move first/);
    expect(MOVERS_NOTE).not.toMatch(/\d/);
    expect(MOVERS_NOTE).not.toContain(String.fromCharCode(0x2014));
  });
});

describe('the board', () => {
  const source = readFileSync(join(process.cwd(), 'components/DiscoveryBoard.tsx'), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('sorts and cuts the ranked rows only; movers are never in that list', () => {
    expect(source).toMatch(/const sorted = sortDiscoveryRows\(rows, sort, sortBoard\);/);
    expect(source).toMatch(/const visible = sorted\.slice\(0, size\);/);
    expect(source).not.toMatch(/sortDiscoveryRows\([^)]*movers/);
  });

  it('puts movers in their own group after the ranked rows, leading with the move from the prior close', () => {
    const ranked = source.indexOf('{visible.map((row) => (');
    const group = source.indexOf('<tbody aria-label={MOVERS_TITLE}>');
    expect(ranked).toBeGreaterThan(-1);
    expect(group).toBeGreaterThan(ranked);
    expect(source.slice(group)).toMatch(/moverRows\.map\(\(row\) => \([\s\S]{0,900}lead="GAP"[\s\S]{0,40}mover/);
  });

  it('is fed by the shell through the same filters as the ranking', () => {
    const shell = readFileSync(join(process.cwd(), 'components/DashboardShell.tsx'), 'utf8');
    expect(shell).toMatch(/merged\.movers\.filter\(\(row\) => rowMatchesFilters\(row, filters, cyclePhase\)\)/);
    expect(shell).toMatch(/movers=\{moverRows\}/);
  });
});
