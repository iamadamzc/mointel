import { describe, expect, it } from 'vitest';

import { numbersIn, supportedValues, verifyLine, type ReportFactRow } from '@/lib/desk/reports/verify';

/**
 * The half of the checker that cannot rubber-stamp.
 *
 * A checker that is purely a second model call has a failure mode the design
 * names and cannot prevent: it can pass everything. A checker whose strike rate
 * is near zero is either reading a writer that never errs or is not reading at
 * all, and those look identical from outside.
 *
 * So the numeric half is arithmetic. Every number a report prints must trace to
 * the stored row it is about, which is decidable without a model and is the
 * defect class this desk actually produced during the design: a number from the
 * wrong checkpoint's row, and a rank true of a different checkpoint.
 *
 * THE ROWS BELOW ARE REAL. `IMCC` and `TCRT` at the 14:30 checkpoint of
 * 2026-09-18, from the production snapshot. A fixture invented to be convenient
 * would not have caught the rounding case, which is the one that nearly made
 * this verifier strike every correct sentence.
 */

const IMCC: ReportFactRow = {
  ticker: 'IMCC',
  assessmentRank: 1,
  price: 4.34,
  percentChange: 149.4252873563218,
  rvol: null,
  sessionHigh: 8.65,
  sessionLow: null,
  referenceClose: 1.74,
  ahPercentChange: null,
  ahVolume: null,
  volume: null,
};

const TCRT: ReportFactRow = {
  ticker: 'TCRT',
  assessmentRank: 7,
  price: 1.255,
  percentChange: -21.5625,
  rvol: null,
  sessionHigh: 3.14,
  sessionLow: null,
  referenceClose: 1.6,
  ahPercentChange: null,
  ahVolume: null,
  volume: null,
};

const ROWS = [IMCC, TCRT];

describe('a number must trace to the row it is about', () => {
  it('accepts a line built from stored fields at the stated rounding', () => {
    /*
     * The store holds 149.4252873563218. The writer rounds to one decimal and
     * the checker must accept the ROUNDED form, or it strikes every correctly
     * written sentence -- a checker that refuses everyone, which this desk has
     * shipped once already.
     */
    expect(
      verifyLine({ ticker: 'IMCC', text: 'IMCC is #1 at $4.34, up 149.4% from the prior close.' }, ROWS),
    ).toEqual([]);
  });

  it('accepts the giveback, the one derived value a line may carry', () => {
    // 8.65 -> 4.34 is 49.8% off the high. His "up and back down", in-row.
    expect(
      verifyLine({ ticker: 'IMCC', text: 'It set a high of $8.65 and sits 49.8% under it.' }, ROWS),
    ).toEqual([]);
  });

  it('STRIKES a number from another checkpoint -- the defect that actually happened', () => {
    /*
     * "+38.8% premarket" was a real sentence in a real draft: the correct
     * number for TCRT, from the retired 07:00 checkpoint, in a report sourced
     * from 14:30. Correct value, wrong row.
     */
    const findings = verifyLine(
      { ticker: 'TCRT', text: 'TCRT ran +38.8% in the premarket.' },
      ROWS,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual({ reason: 'NUMBER_NOT_IN_ROW', value: 38.8 });
  });

  it('STRIKES a rank that is true of a different checkpoint', () => {
    /*
     * My own error: IMCC is #1 at 09:25, 14:30 and the close, and #4 at the
     * 22:00 recap. A rank asserted from the wrong checkpoint is a number from
     * the wrong row and dies the same way.
     */
    const findings = verifyLine({ ticker: 'IMCC', text: 'IMCC slipped to #4.' }, ROWS);
    expect(findings).toEqual([{ reason: 'NUMBER_NOT_IN_ROW', value: 4 }]);
  });

  it('STRIKES a number that is in NO row at all', () => {
    const findings = verifyLine({ ticker: 'IMCC', text: 'IMCC traded 12,500,000 shares.' }, ROWS);
    expect(findings).toEqual([{ reason: 'NUMBER_NOT_IN_ROW', value: 12500000 }]);
  });

  it('STRIKES a line about a ticker with no row in this checkpoint', () => {
    // OBA is absent from the 09:25 checkpoint entirely; a line about it there
    // has nothing to trace to.
    expect(verifyLine({ ticker: 'OBA', text: 'OBA printed a new high.' }, ROWS)).toEqual([
      { reason: 'NO_ROW_FOR_TICKER' },
    ]);
  });

  it('does not check a line with no ticker, and that hole is deliberate', () => {
    /*
     * A section heading or "Nothing in our sources for this section" carries no
     * per-ticker claim. The SEMANTIC half owns those -- which is why this is
     * the first half of a checker and not the whole of one.
     */
    expect(verifyLine({ ticker: null, text: 'Nothing in our sources for this section.' }, ROWS)).toEqual(
      [],
    );
  });
});

describe('the allowlist refuses by default', () => {
  it('derives only from named fields, never from arbitrary arithmetic', () => {
    const values = supportedValues(IMCC);
    // Present: price, high, reference close, percent, rank, giveback.
    expect(values).toContain(4.34);
    expect(values).toContain(8.65);
    expect(values).toContain(1.74);
    expect(values).toContain(149.4);
    expect(values).toContain(1);
    expect(values).toContain(49.8);
    // NOT present: a plausible but unnamed derivation (high minus price).
    expect(values).not.toContain(4.31);
    /*
     * AND NOT the price rounded to an integer. An earlier version pushed that
     * too, so $4.34 supported the bare `4` -- and "IMCC slipped to #4", a rank
     * from another checkpoint, verified against the PRICE. A verifier that
     * accepts a number because it resembles an unrelated field passes exactly
     * the cases it exists to catch.
     */
    expect(values).not.toContain(4);
  });

  it('reads a thousands-separated number as one value', () => {
    // "12,500,000" must not parse as 12, 500 and 000 -- three numbers that
    // might each spuriously match a rank or a price.
    expect(numbersIn('traded 12,500,000 shares at $4.34')).toEqual([12500000, 4.34]);
  });

  it('reads a negative percent with its sign', () => {
    expect(numbersIn('down -21.6% on the session')).toEqual([-21.6]);
  });
});

/**
 * Timestamps are not numeric claims, and the defect cut both ways.
 *
 * Design raised the strict direction: a line reads "at $3.10 at 09:25", and a
 * clock time yielded [3.1, 9, 25] — so every timed sentence would have been
 * struck, on a design that requires every price to carry its time.
 *
 * Measuring it found the permissive direction, which is worse: an ISO date
 * yielded [2026, -9, -18], because the hyphens parse as MINUS SIGNS. A date
 * could therefore match a stored percentChange of -18.0 and VALIDATE a sentence
 * nobody had checked.
 */
describe('timestamps are excised, not verified', () => {
  it('does not read a clock time as two numbers', () => {
    expect(numbersIn('at $3.10 at 09:25')).toEqual([3.1]);
  });

  it('does not read an ISO date as a year and two NEGATIVE numbers', () => {
    // The permissive half: -18 would have matched a -18.0 percent change.
    expect(numbersIn('since Fri close on 2026-09-18')).toEqual([]);
  });

  it('still reads a real percent and a real price', () => {
    expect(numbersIn('up 149.4% at $4.34')).toEqual([149.4, 4.34]);
  });

  it('accepts a timed line about a real row, which is the case that was broken', () => {
    expect(
      verifyLine({ ticker: 'IMCC', text: 'IMCC was $4.34 at 14:30, up 149.4%.' }, ROWS),
    ).toEqual([]);
  });

  it('a seconds-precision time is excised too', () => {
    expect(numbersIn('the last write landed at 20:00:00')).toEqual([]);
  });
});
