import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import { computeDisplayedFloatTurnover } from '@/lib/market/derive';
import { normalizeSheetRows } from '@/lib/data/rows';

/** A TODAY row whose float cell carries whatever text is given. */
function todayWithFloat(cell: string) {
  const row: string[] = new Array(27).fill('');
  row[0] = 'B — SECONDARY';
  row[1] = 'INLF';
  row[2] = 'US';
  row[8] = cell;
  return normalizeSheetRows([row], []).tickers[0]!;
}

/*
 * Demand carrying REAL VOLUME, because turnover is volume / float.
 *
 * The first version of the turnover test passed `demand: null`, so turnover was
 * null whatever the float did -- it survived a mutation that removed the
 * refusal entirely. A check that cannot fail is not a check, and this fixture
 * exists so the turnover assertion can actually fail.
 */
const rowFor = (cell: string) => buildDeskRow('INLF', todayWithFloat(cell), null, null, null);

/*
 * The direction is the whole argument. Pillar 5 is float under 10M, so a float
 * wrongly too SMALL is the most bullish structural reading this desk can
 * produce -- it does not make him skip a name, it puts him IN one.
 *
 * INLF is live at "6,109 displayed; ~1.05M SO": 0.58%, a 172:1 ratio.
 */
describe('a float that contradicts the count beside it', () => {
  it('refuses the number rather than displaying it', () => {
    const row = rowFor('6,109 displayed; ~1.05M SO');
    expect(row.displayedFloat).toBeNull();
    expect(row.floatAssessment?.verdict).toBe('UNIT_MISMATCH');
  });

  it('refuses a float larger than its own share count', () => {
    const row = rowFor('9M displayed; 5M SO');
    expect(row.displayedFloat).toBeNull();
    expect(row.floatAssessment?.verdict).toBe('IMPOSSIBLE');
  });

  /*
   * The refusal must reach the CONSUMERS, which is why it happens at the
   * resolver. A caveat at one consumer is the masked-chip shape: a gate reading
   * one field while the value it gated read another.
   */
  it('leaves the float sort nothing to sort', () => {
    // A suspect 6,109 would otherwise sort to the TOP of a tightest-float sort,
    // the most dangerous position on the board for a number believed wrong.
    expect(rowFor('6,109 displayed; ~1.05M SO').displayedFloat).toBeNull();
  });

  /*
   * Turnover, tested through the composition production performs at
   * merge.ts:217 rather than through a DeskRow fixture.
   *
   * The first version asserted `row.displayedFloatTurnover` with `demand: null`
   * -- so turnover was null whatever the float did, and it survived a mutation
   * that removed the refusal entirely. A check that cannot fail is not a check.
   * Both sides are asserted here, so the null means the FLOAT was refused and
   * not that the volume was missing.
   */
  it('leaves turnover nothing to divide by, and would have divided otherwise', () => {
    const volume = 5_000_000;

    const refusedFloat = rowFor('6,109 displayed; ~1.05M SO').displayedFloat;
    const allowedFloat = rowFor('5M displayed; 10M SO').displayedFloat;

    // 172x too small would have read as 172x too much turnover -- bullish
    // again, and the same error surfacing a second time.
    expect(computeDisplayedFloatTurnover(volume, refusedFloat)).toBeNull();
    expect(computeDisplayedFloatTurnover(volume, allowedFloat)).toBeCloseTo(1, 6);
  });
});

/*
 * A detection must never look like an absence. That was the objection to
 * suppressing the number outright, and it holds for the data too.
 */
describe('checked, refused and unchecked are three different states', () => {
  it('keeps a consistent float and says it was checked', () => {
    const row = rowFor('5M displayed; 10M SO');
    expect(row.displayedFloat).toBe(5_000_000);
    expect(row.floatAssessment?.verdict).toBe('CONSISTENT');
  });

  it('reports no assessment when the Sheet states no count beside the float', () => {
    const row = rowFor('5M displayed');
    expect(row.displayedFloat).toBe(5_000_000);
    // UNCHECKED. Distinct from CONSISTENT, and the cell must not claim it was
    // verified.
    expect(row.floatAssessment).toBeNull();
  });

  it('keeps the refusal reason so a cell can say WHAT was wrong', () => {
    const row = rowFor('6,109 displayed; ~1.05M SO');
    expect(row.floatAssessment?.detail).toMatch(/unit error|stated beside it/i);
  });
});

/*
 * Provenance, not arithmetic, is what makes this sound. Both halves come from
 * ONE cell -- never the separate sharesOutstanding column, which has its own
 * source date and would restore the asynchronous-by-construction objection.
 */
describe('the pair comes from one cell', () => {
  it('does not assess when the cell carries no share count', () => {
    expect(rowFor('11.79M displayed').floatAssessment).toBeNull();
  });

  it('never reaches for the separate shares-outstanding column', async () => {
    const { promises: fs } = await import('node:fs');
    const source = await fs.readFile('lib/dashboard/merge.ts', 'utf8');
    // The guard is the call site reading wrong, so assert it never appears.
    expect(source).not.toMatch(/sharesFromSameCell:\s*[\w.]*\bsharesOutstanding\b/);
    expect(source).toContain('floatCellShares');
  });
});
