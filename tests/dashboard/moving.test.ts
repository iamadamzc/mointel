import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import { isMover, isRankedMover, MOVERS_PAST_TOP_N, movingCaption, movingNote, visibleWithMovers } from '@/lib/dashboard/view';

/*
 * His ruling, 2026-10-01T15:36:50Z: a mover is an ordinary row "labeled as
 * moving". These pin the label to the producer's mark and nothing else, and
 * the hover to the row's own numbers.
 */

type Row = Pick<DeskRow, 'demand' | 'telemetry'>;

function row(options: {
  mover: boolean;
  /** A ranked row the rule selected: `moving: true` with no boardReason. */
  ranked?: boolean;
  pct?: number | null;
  volume?: number | null;
  rank?: number | null;
  basis?: 'PRIOR_SESSION' | 'CURRENT_SESSION' | null;
}): Row {
  return {
    demand: {
      ...(options.mover && !options.ranked ? { boardReason: 'MOVER' as const } : {}),
      ...(options.mover && options.ranked ? { moving: true as const } : {}),
      referenceRthCloseBasis: options.basis === undefined ? 'PRIOR_SESSION' : options.basis,
      percentChange: options.pct ?? null,
      cumulativeVolume: options.volume ?? null,
    },
    telemetry: { rvolRank: options.rank ?? null },
  } as unknown as Row;
}

const EM_DASH = String.fromCharCode(0x2014);

describe('movingNote', () => {
  it('labels a mover and nothing else', () => {
    expect(isMover(row({ mover: true }))).toBe(true);
    expect(isMover(row({ mover: false, pct: 43, volume: 7_800_000, rank: 3 }))).toBe(false);
    expect(isMover({ demand: null } as unknown as Row)).toBe(false);
    expect(movingNote(row({ mover: false, pct: 43, volume: 7_800_000, rank: 3 }))).toBeNull();
    expect(movingNote(row({ mover: true }))?.label).toBe('moving');
  });

  it("says why the row is here from the row's own move, volume and rank", () => {
    const note = movingNote(row({ mover: true, pct: 43.21, volume: 7_800_000, rank: 120 }));
    expect(note?.title).toBe(
      'On the board for its move, not its RVOL rank. Up 43.2% from the prior close on 7.8M shares since 04:00 ET. RVOL rank 120, outside the ranking.',
    );
  });

  it('drops a clause it has no number for, and never prints a placeholder', () => {
    expect(movingNote(row({ mover: true, pct: 12, volume: null, rank: 88 }))?.title).toBe(
      'On the board for its move, not its RVOL rank. Up 12.0% from the prior close. RVOL rank 88, outside the ranking.',
    );
    expect(movingNote(row({ mover: true, pct: null, volume: 900_000, rank: null }))?.title).toBe(
      'On the board for its move, not its RVOL rank. No RVOL rank.',
    );
  });

  it('states a negative move as down, never as up', () => {
    expect(movingNote(row({ mover: true, pct: -11.5, volume: 600_000, rank: 70 }))?.title).toContain(
      'Down 11.5% from the prior close',
    );
  });

  it('carries no em dash in any wording', () => {
    const titles = [
      movingNote(row({ mover: true, pct: 43, volume: 7_800_000, rank: 120 }))?.title,
      movingNote(row({ mover: true }))?.title,
      movingCaption([row({ mover: true })])?.title,
      movingCaption([row({ mover: true }), row({ mover: true })])?.title,
    ];
    for (const title of titles) {
      expect(title).toBeTruthy();
      expect(title?.includes(EM_DASH)).toBe(false);
    }
  });
});

describe('movingCaption', () => {
  it('says nothing when the board holds no mover', () => {
    expect(movingCaption([])).toBeNull();
    expect(movingCaption([row({ mover: false }), row({ mover: false })])).toBeNull();
  });

  it('counts only the movers among the rows', () => {
    const one = movingCaption([row({ mover: false }), row({ mover: true }), row({ mover: false })]);
    expect(one?.text).toBe('1 moving');
    expect(one?.title).toBe(
      '1 name on the board is marked moving: it made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names. Any other sort places every name by its own value.',
    );

    const three = movingCaption([row({ mover: true }), row({ mover: false }), row({ mover: true }), row({ mover: true })]);
    expect(three?.text).toBe('3 moving');
    expect(three?.title).toBe(
      '3 names on the board are marked moving: each made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names. Any other sort places every name by its own value.',
    );
  });

  it('counts a ranked mover (IPDN) beside the unranked ones', () => {
    const caption = movingCaption([row({ mover: true }), row({ mover: true, ranked: true }), row({ mover: false })]);
    expect(caption?.text).toBe('2 moving');
  });
});

describe('a ranked mover (Integration 31st, IPDN 2026-10-06)', () => {
  it('is labelled moving, and its hover says what it did, never why it is on the board', () => {
    const ipdn = row({ mover: true, ranked: true, pct: 70.04, volume: 19_300_000, rank: 14 });
    expect(isMover(ipdn)).toBe(true);
    expect(isRankedMover(ipdn)).toBe(true);
    expect(movingNote(ipdn)?.title).toBe('Also a mover. Up 70.0% from the prior close on 19.3M shares since 04:00 ET. RVOL rank 14.');
    expect(movingNote(ipdn)?.title).not.toMatch(/on the board for|outside the ranking/);
  });

  it('an unranked mover keeps its as-built hover, and is not a ranked mover', () => {
    expect(isRankedMover(row({ mover: true, rank: 120 }))).toBe(false);
  });
});

describe('"from the prior close" only when it is (Commercial 17b)', () => {
  it('a row measured from the current session close, or with no basis, is not labelled or counted, either kind', () => {
    for (const basis of ['CURRENT_SESSION', null] as const) {
      for (const ranked of [false, true]) {
        const r = row({ mover: true, ranked, pct: 40, volume: 5_000_000, rank: ranked ? 9 : 90, basis });
        expect(isMover(r)).toBe(false);
        expect(movingNote(r)).toBeNull();
        expect(movingCaption([r])).toBeNull();
      }
    }
  });
});

type Named = Row & { ticker: string };
const named = (ticker: string, mover: boolean, ranked = false): Named => ({ ...row({ mover, ranked, pct: 40, volume: 1_000_000, rank: 1 }), ticker });

describe('movers past Top N (his ruling 2026-10-06T14:41:43Z)', () => {
  const board = (n: number, movers: Record<number, 'ranked' | 'unranked'>) =>
    Array.from({ length: n }, (_, i) => named(`R${i + 1}`, i + 1 in movers, movers[i + 1] === 'ranked'));

  it('a rank-14 mover at Top 12 shows as row 13, after the top twelve, with nothing between', () => {
    const { rows, extra } = visibleWithMovers(board(50, { 14: 'ranked' }), 12);
    expect(rows.map((r) => r.ticker)).toEqual([...Array.from({ length: 12 }, (_, i) => `R${i + 1}`), 'R14']);
    expect(extra).toBe(1);
  });

  it('an unranked mover far down (row 120 of the sort) shows too', () => {
    const { rows } = visibleWithMovers(board(130, { 120: 'unranked' }), 12);
    expect(rows.at(-1)?.ticker).toBe('R120');
  });

  it('a mover inside Top N is not repeated', () => {
    const { rows, extra } = visibleWithMovers(board(60, { 14: 'ranked' }), 50);
    expect(rows).toHaveLength(50);
    expect(rows.filter((r) => r.ticker === 'R14')).toHaveLength(1);
    expect(extra).toBe(0);
  });

  it('sixteen movers past the line show fifteen, in the sort order', () => {
    const movers = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [20 + i, 'unranked' as const]));
    const { rows, extra } = visibleWithMovers(board(60, movers), 12);
    expect(extra).toBe(MOVERS_PAST_TOP_N);
    expect(rows.slice(12).map((r) => r.ticker)).toEqual(Array.from({ length: 15 }, (_, i) => `R${20 + i}`));
  });

  it('no movers past the line changes nothing', () => {
    const { rows, extra } = visibleWithMovers(board(50, {}), 12);
    expect(rows).toHaveLength(12);
    expect(extra).toBe(0);
  });

  it('a row not measured from the prior close is never appended (Commercial 17b)', () => {
    const late = { ...named('LATE', true), demand: { ...named('LATE', true).demand, referenceRthCloseBasis: 'CURRENT_SESSION' } } as Named;
    const { rows } = visibleWithMovers([...board(12, {}), late], 12);
    expect(rows.map((r) => r.ticker)).not.toContain('LATE');
  });

  it('the caption says how many moving names Top N also shows', () => {
    expect(movingCaption([row({ mover: true }), row({ mover: true })], { size: 12, extra: 1 })?.title).toMatch(
      / Top 12 also shows 1 moving name outside it\.$/,
    );
    expect(movingCaption([row({ mover: true }), row({ mover: true })], { size: 25, extra: 2 })?.title).toMatch(
      / Top 25 also shows 2 moving names outside it\.$/,
    );
    expect(movingCaption([row({ mover: true })], { size: 12, extra: 0 })?.title).not.toContain('also shows');
  });
});
