import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import type { SetupGrade, StoredGrade } from '@/lib/dashboard/setupGrade';
import {
  DISCOVERY_DEFAULT_SORT,
  discoveryMissingCount,
  discoveryValueFor,
  sortDiscoveryRows,
} from '@/lib/dashboard/view';

const grade = (g: StoredGrade): SetupGrade => ({
  grade: g,
  basis: { structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'STRONG', supply: 'UNKNOWN' },
  rule: 'rubric-2026-10-05',
  checkpointCompletedAt: '2026-10-05T19:42:00.000Z',
});

function row(ticker: string, g: StoredGrade | null, wired = true) {
  return { ...buildDeskRow(ticker, null, null, null), setupGrade: g ? grade(g) : null, setupGradeWired: wired };
}

const ROWS = [
  row('NY', 'NOT_YET'),
  row('DD', 'AVOID'),
  row('AA', 'A'),
  row('NG', 'UNKNOWN'),
  row('CC', 'C'),
  row('NN', null),
  row('BB', 'B'),
];
const order = (dir: 'asc' | 'desc') =>
  sortDiscoveryRows(ROWS, { key: 'setupGrade', direction: dir }, 'DAILY_RVOL').map((r) => r.ticker);

describe('sorting the board by setup grade', () => {
  it('ascending is best first: A, B, C, D, Not graded, then the rows with no grade', () => {
    expect(order('asc').slice(0, 5)).toEqual(['AA', 'BB', 'CC', 'DD', 'NG']);
    expect(order('asc').slice(5).sort()).toEqual(['NN', 'NY']);
  });

  it('rows with no grade sort last in BOTH directions; absence is never promoted', () => {
    expect(order('desc').slice(-2).sort()).toEqual(['NN', 'NY']);
    expect(order('desc').slice(0, 5)).toEqual(['NG', 'DD', 'CC', 'BB', 'AA']);
  });

  it('counts the rows with no grade as missing, and "Not graded" is placed, not missing', () => {
    expect(discoveryMissingCount(ROWS, 'setupGrade', 'DAILY_RVOL')).toBe(2);
    expect(discoveryValueFor(row('NG', 'UNKNOWN'), 'setupGrade', 'DAILY_RVOL')).not.toBeNull();
  });

  it('while the grade is not wired every row has no value, so the sort cannot invent an order', () => {
    const unwired = ['A', 'B', 'C'].map((g, i) => row(`T${i}`, g as StoredGrade, false));
    expect(discoveryMissingCount(unwired, 'setupGrade', 'DAILY_RVOL')).toBe(3);
  });

  it('is never the default order', () => {
    expect(DISCOVERY_DEFAULT_SORT.key).toBe('rank');
  });
});

describe('the Grade sort chip', () => {
  const board = readFileSync('components/DiscoveryBoard.tsx', 'utf8');

  it('exists, starts best first, and is hidden while the grade is not wired', () => {
    expect(board).toContain("key: 'setupGrade'");
    expect(board).toMatch(/key === 'rank' \|\| key === 'setupGrade' \? 'asc' : 'desc'/);
    expect(board).toContain("entry.key !== 'setupGrade' || gradeWired");
  });

  it('marks the Ticker column as sorted, where the badge is', () => {
    expect(board).toContain("sorted={activeColumn === 'ticker'}");
  });

  it("uses Marketing's words (02ec44ab): one name for the grade, the whole order, and a count that names the checkpoint", () => {
    expect(board).toContain("label: 'Setup grade',");
    expect(board).not.toContain("label: 'Grade',");
    expect(board).toContain(
      "'Sorted by setup grade: A first, then B, C, D, Not graded. Names with no research at this checkpoint are last. The grade is the desk\\'s reading, not a recommendation.'",
    );
    expect(board).toContain('text: (n: number) => `${n} with no research at this checkpoint`');
    expect(board).toContain(
      "'Names with a dash in the Setup grade column: the desk has no research on them at this checkpoint. Names marked Not graded are not counted here.'",
    );
    // "no grade" would be false of a count that leaves out Not graded.
    expect(board).not.toContain("setupGrade: 'no grade'");
  });
});
