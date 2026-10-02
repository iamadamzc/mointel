import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import { isMover, movingCaption, movingNote } from '@/lib/dashboard/view';

/*
 * His ruling, 2026-10-01T15:36:50Z: a mover is an ordinary row "labeled as
 * moving". These pin the label to the producer's mark and nothing else, and
 * the hover to the row's own numbers.
 */

type Row = Pick<DeskRow, 'demand' | 'telemetry'>;

function row(options: {
  mover: boolean;
  pct?: number | null;
  volume?: number | null;
  rank?: number | null;
}): Row {
  return {
    demand: {
      ...(options.mover ? { boardReason: 'MOVER' as const } : {}),
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
      '1 name is on the board for its move from the prior close, not its RVOL rank. Under the Rank and RVOL sorts it follows the ranked names, so Top 12, 25 or 50 can leave it off. Any other sort places it by its own value.',
    );

    const three = movingCaption([row({ mover: true }), row({ mover: false }), row({ mover: true }), row({ mover: true })]);
    expect(three?.text).toBe('3 moving');
    expect(three?.title).toBe(
      '3 names are on the board for their move from the prior close, not their RVOL rank. Under the Rank and RVOL sorts they follow the ranked names, so Top 12, 25 or 50 can leave them off. Any other sort places them by their own value.',
    );
  });
});
