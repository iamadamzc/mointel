import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { whySpoken, type DeskWhy } from '@/lib/dashboard/why';

/*
 * A row's accessible name never reads the empty-cell glyph aloud. The cell
 * prints a lone dash for "no grade"; the spoken label says why there is none.
 * Written from that rule, not from the code.
 */

const EM_DASH = String.fromCharCode(0x2014);
const why = (grade: string, code: DeskWhy['code']) => ({ grade, code });

describe('the catalyst, spoken', () => {
  it('reads a grade letter as the grade', () => {
    expect(whySpoken(why('A', 'GRADED'))).toBe('A catalyst');
    expect(whySpoken(why('C', 'OLD_CATALYST'))).toBe('C catalyst');
  });

  it('says why there is no grade, never the dash', () => {
    expect(whySpoken(why(EM_DASH, 'NOT_RESEARCHED'))).toBe('not researched');
    expect(whySpoken(why(EM_DASH, 'RESEARCHING'))).toBe('catalyst being researched');
    expect(whySpoken(why(EM_DASH, 'UNKNOWN'))).toBe('no catalyst grade');
    expect(whySpoken(why('', 'UNKNOWN'))).toBe('no catalyst grade');
  });

  it('keeps a word grade as a word', () => {
    expect(whySpoken(why('UNGRADED', 'GRADED'))).toBe('catalyst UNGRADED');
  });

  it('no case speaks an em dash', () => {
    for (const code of ['GRADED', 'NO_FRESH_CATALYST', 'OLD_CATALYST', 'NOT_RESEARCHED', 'RESEARCHING', 'UNKNOWN'] as const) {
      for (const grade of ['A', 'B', 'C', EM_DASH, '']) {
        expect(whySpoken(why(grade, code)).includes(EM_DASH)).toBe(false);
      }
    }
  });

  it('the board builds its row label from it, not from the raw grade', () => {
    for (const file of ['components/DiscoveryBoard.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('${whySpoken(why)}');
      expect(source).not.toContain('${why.grade} catalyst');
    }
  });
});
