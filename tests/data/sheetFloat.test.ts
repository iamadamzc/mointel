import { describe, expect, it } from 'vitest';

import { floatField, parseNumber, parseSheetFloat } from '@/lib/data/normalize';

/**
 * The float column has its own convention, and reading it with the general
 * numeric parser threw away twelve of thirteen floats on the live board.
 *
 * Measured on the running app, 2026-09-04: of the top 50, thirteen names
 * carried a float string and exactly ONE parsed — the only one written as a
 * bare number. Every other ended in a word, and `parseNumber` anchors the whole
 * cell, so a trailing word costs the number.
 *
 * The strings below are the trader's own, verbatim. They are the fixture
 * because they are the requirement: a parser that reads this column has to read
 * what he actually writes, and a synthetic fixture would have been satisfied by
 * a parser that still failed on the board.
 */

/** Exactly what the live board carried, ticker by ticker. */
const LIVE = [
  ['AKAN', '540,840', 540_840],
  ['TLYS', '11.93M displayed', 11_930_000],
  ['DLTH', '10.49M displayed', 10_490_000],
  ['CHPT', '23.75M displayed', 23_750_000],
  ['INDO', '9.92M displayed', 9_920_000],
  ['BIAF', '532,255 displayed', 532_255],
  ['GPRO', '137.65M displayed', 137_650_000],
  ['NCT', '539,503 displayed', 539_503],
  ['BRNX', '684,470 displayed', 684_470],
  ['NXTT', '1.45M displayed', 1_450_000],
  ['SMTK', '~0.547M displayed float', 547_000],
  ['MODD', '7.58M displayed float', 7_580_000],
] as const;

describe('parseSheetFloat — the trader\'s own strings', () => {
  for (const [ticker, raw, expected] of LIVE) {
    it(`reads ${ticker}: ${raw}`, () => {
      expect(parseSheetFloat(raw)).toBe(expected);
    });
  }

  it('recovers twelve of the thirteen the board discarded', () => {
    // The count is the point: one parsed before, twelve after, and the
    // thirteenth is TENX which must NOT parse.
    expect(LIVE.filter(([, raw]) => parseSheetFloat(raw) !== null)).toHaveLength(12);
  });
});

describe('parseSheetFloat — what it must REFUSE', () => {
  it('refuses TENX, and that is correctness rather than a limitation', () => {
    /*
     * "~50M share base — OUT OF FLOAT RANGE" announces twice that the number is
     * not a float. `shares outstanding is not float` is this thread's oldest
     * working rule, and a parser returning 50,000,000 here would be WORSE than
     * one returning nothing — it would put a share count on the board in the
     * one column that must never hold one.
     */
    expect(parseSheetFloat('~50M share base — OUT OF FLOAT RANGE')).toBeNull();
  });

  it('refuses a share count however it is phrased', () => {
    expect(parseSheetFloat('50M shares outstanding')).toBeNull();
    expect(parseSheetFloat('12.4M share base')).toBeNull();
    expect(parseSheetFloat('$430M market cap')).toBeNull();
  });

  it('refuses UNRECOGNISED trailing text rather than ignoring it', () => {
    /*
     * The allowlist is the design. An unknown word means the desk has not seen
     * this phrasing, and guessing past it is how a parser silently returns a
     * number that means something else. Adding a phrasing must be a deliberate
     * edit with a test behind it.
     */
    expect(parseSheetFloat('11.93M estimated post-offering')).toBeNull();
    expect(parseSheetFloat('9.92M after the raise')).toBeNull();
    expect(parseSheetFloat('11.93M / 40M outstanding')).toBeNull();
  });

  it('refuses a range, which is two numbers wearing one cell', () => {
    expect(parseSheetFloat('9-11M displayed')).toBeNull();
  });

  it('treats zero and negatives as absent, not as a float', () => {
    expect(parseSheetFloat('0 displayed')).toBeNull();
    expect(parseSheetFloat('')).toBeNull();
  });
});

describe('parseNumber is UNTOUCHED, and that is deliberate', () => {
  /*
   * The tempting fix was to loosen the general parser. It serves price, volume,
   * change and resistance cells, so loosening it would make a resistance RANGE
   * read as a price on every one of them. The defect was never here: it was a
   * field with its own convention being read by a general parser.
   */
  it('still refuses descriptive text, as its docstring promises', () => {
    expect(parseNumber('$2.69/$3.00 resistance')).toBeNull();
    expect(parseNumber('11.93M displayed')).toBeNull();
  });

  it('still reads the tokens it was built for', () => {
    expect(parseNumber('11.93M')).toBe(11_930_000);
    expect(parseNumber('540,840')).toBe(540_840);
  });
});

describe('floatField preserves the raw string whatever the parse does', () => {
  it('keeps the text he wrote even when it refuses', () => {
    // The raw string is the evidence and the parsed number is a conclusion.
    // A refusal must not erase what the cell said.
    const refused = floatField('~50M share base — OUT OF FLOAT RANGE');
    expect(refused.value).toBeNull();
    expect(refused.raw).toBe('~50M share base — OUT OF FLOAT RANGE');

    const read = floatField('~0.547M displayed float');
    expect(read.value).toBe(547_000);
    expect(read.raw).toBe('~0.547M displayed float');
  });
});
