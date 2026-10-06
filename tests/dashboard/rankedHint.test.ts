import { describe, expect, it } from 'vitest';

import { RANKED_HINT } from '@/lib/dashboard/boardCounts';

// Marketing 970acacd, Commercial 20: true once movers show past Top N (visibleWithMovers).
describe('the ranked segment hint', () => {
  it('says the board shows the first 12, 25 or 50 plus moving names outside them, with no number for the cap', () => {
    expect(RANKED_HINT).toBe(
      'Names in the ranking at the time shown. The board shows the first 12, 25 or 50 of them, plus moving names outside them, up to a limit.',
    );
    expect(RANKED_HINT).not.toMatch(/\b15\b/);
  });
});
