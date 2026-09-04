import { describe, expect, it } from 'vitest';

import {
  floatField,
  parseSheetFloat,
  parseSheetFloatCell,
  sheetSharesOutstandingField,
} from '@/lib/data/normalize';

/**
 * The float cell now states a share count beside the float.
 *
 * Measured on the live board 2026-09-04: the TODAY tab writes
 * `"537,665 displayed; 785,655 SO"` and the RESEARCH tab writes
 * `"537,665 displayed"` — same names, same day, two formats. RESEARCH is read
 * first, so the board kept working and the TODAY fallback was 100% dead: it
 * costs nothing until a name is in TODAY and not in RESEARCH, which is exactly
 * the case the fallback exists for.
 *
 * The cell carries TWO numbers and only the first is the float. That is R&D's
 * NWTG trap — "based on N shares outstanding, of which M held by
 * non-affiliates", read as N, 1.92× wrong — in a shorter costume, so these
 * tests are mostly about the second number NOT reaching the first.
 */

/** Ops's live TODAY strings, verbatim, with the pair each states. */
const LIVE_TODAY = [
  ['537,665 displayed; 785,655 SO', 537_665, 785_655],
  ['11.79M displayed; 13.1M SO', 11_790_000, 13_100_000],
  ['7.14M displayed; 8.15M SO', 7_140_000, 8_150_000],
  ['6,109 displayed; ~1.05M SO', 6_109, 1_050_000],
  ['2.46M displayed; 3.75M SO', 2_460_000, 3_750_000],
] as const;

describe('the live TODAY format, which the deployed parser refuses entirely', () => {
  for (const [raw, float, so] of LIVE_TODAY) {
    it(`reads both numbers from ${raw}`, () => {
      expect(parseSheetFloatCell(raw)).toEqual({ float, sharesOutstanding: so });
    });
  }

  it('never returns the share count as the float', () => {
    /*
     * The whole point of splitting before parsing. If the float grammar could
     * reach the tail, one of these would come back as the larger number and it
     * would look like a coverage win on every row.
     */
    for (const [raw, float, so] of LIVE_TODAY) {
      expect(parseSheetFloat(raw)).toBe(float);
      expect(parseSheetFloat(raw)).not.toBe(so);
    }
  });
});

describe('the RESEARCH format still reads, unchanged', () => {
  it('parses a float with no tail and reports no share count', () => {
    expect(parseSheetFloatCell('537,665 displayed')).toEqual({
      float: 537_665,
      sharesOutstanding: null,
    });
  });

  it('still handles every earlier phrasing', () => {
    expect(parseSheetFloat('~0.547M displayed float')).toBe(547_000);
    expect(parseSheetFloat('540,840')).toBe(540_840);
    expect(parseSheetFloat('137.65M displayed')).toBe(137_650_000);
  });
});

describe('what the cell must still refuse', () => {
  it('refuses TENX, whose head quotes a share count as a float', () => {
    /*
     * The disqualifier applies to the HEAD only — a tail saying "shares
     * outstanding" is the tail doing its job. TENX puts it in the head, which
     * is the cell claiming a share base IS the float, and it says so twice.
     */
    expect(parseSheetFloatCell('~50M share base — OUT OF FLOAT RANGE')).toEqual({
      float: null,
      sharesOutstanding: null,
    });
  });

  it('refuses the WHOLE cell when a tail clause is unrecognised', () => {
    /*
     * Not "parse the float and ignore the rest". An unknown clause may qualify
     * the float in a way nobody has seen, so the float goes with it.
     */
    expect(parseSheetFloatCell('11.79M displayed; post-offering').float).toBeNull();
    expect(parseSheetFloatCell('11.79M displayed; 13.1M SO; pending S-1').float).toBeNull();
  });

  it('refuses two share counts rather than choosing between them', () => {
    expect(parseSheetFloatCell('11.79M displayed; 13.1M SO; 14M SO').float).toBeNull();
  });

  it('refuses a head that was never a float', () => {
    expect(parseSheetFloatCell('n/a; 785,655 SO').float).toBeNull();
    expect(parseSheetFloatCell('; 785,655 SO').float).toBeNull();
  });
});

describe('the fields carry the raw text either way', () => {
  it('exposes the float and the share count as separate fields', () => {
    const cell = '6,109 displayed; ~1.05M SO';
    expect(floatField(cell).value).toBe(6_109);
    expect(sheetSharesOutstandingField(cell).value).toBe(1_050_000);
    // Raw survives on both, so a refusal is still legible.
    expect(sheetSharesOutstandingField(cell).raw).toBe(cell);
  });

  it('reports an absent share count as null rather than zero', () => {
    const field = sheetSharesOutstandingField('537,665 displayed');
    expect(field.value).toBeNull();
    expect(field.value).not.toBe(0);
  });
});

describe('the pair item 28 said could not be assembled', () => {
  it('gives float and shares outstanding from one cell, one author, one instant', () => {
    /*
     * Item 28 recorded these as "asynchronous by construction" — the float from
     * a live Sheet read, the share count from a dossier written days earlier —
     * and concluded the comparison could not be made by capturing harder. In
     * one cell it can.
     *
     * And it bites immediately: 6,109 against ~1.05M is 0.58%, under the 2%
     * this desk already treats as a probable unit error rather than a very
     * small float. A head-only parser would have put that on the board looking
     * like a win.
     */
    const { float, sharesOutstanding } = parseSheetFloatCell('6,109 displayed; ~1.05M SO');
    expect(float).not.toBeNull();
    expect(sharesOutstanding).not.toBeNull();
    expect(float! / sharesOutstanding!).toBeLessThan(0.02);
  });
});
