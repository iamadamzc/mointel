import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import { isMover, isRankedMover, movingCaption, movingNote } from '@/lib/dashboard/view';

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
      '1 name on the board is marked moving: it made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names, and Top 12, 25 or 50 can leave it off. Any other sort places every name by its own value.',
    );

    const three = movingCaption([row({ mover: true }), row({ mover: false }), row({ mover: true }), row({ mover: true })]);
    expect(three?.text).toBe('3 moving');
    expect(three?.title).toBe(
      '3 names on the board are marked moving: each made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names, and Top 12, 25 or 50 can leave some of them off. Any other sort places every name by its own value.',
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
