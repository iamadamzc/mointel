/**
 * The deterministic half of the checker.
 *
 * WHY THE CHECKER IS NOT ONE MODEL CALL. The design says a writer and a
 * checker, and a checker that is purely a second model call has a failure mode
 * the design names but cannot prevent: it can rubber-stamp. A checker whose
 * strike rate is near zero is either reading a writer that never errs or is not
 * reading at all, and from the outside those look identical.
 *
 * SO THE NUMERIC HALF IS ARITHMETIC AND CANNOT RUBBER-STAMP. Every number a
 * report prints must be traceable to the stored row it is about. That is
 * decidable without a model, it is the defect class this desk actually produced
 * -- a number from the wrong checkpoint's row, a rank true of a different
 * checkpoint -- and it runs at zero marginal cost on every line, every time.
 *
 * WHAT IS LEFT FOR THE MODEL: the semantic classes. A percent stated against
 * the wrong basis, an absence claim the data cannot support, an unobservable
 * cause for a missing report. Those need reading, not arithmetic.
 *
 * AN ALLOWLIST, NOT A HEURISTIC. A value is supported only if it matches a
 * named stored field or one explicitly derived quantity. Anything else is
 * unsupported BY DEFAULT -- because a verifier that tries to guess whether an
 * unrecognised number might be legitimate is a verifier that passes the
 * interesting cases.
 */

/** One checkpoint row, as the store holds it. Only the fields a report may cite. */
export interface ReportFactRow {
  ticker: string;
  assessmentRank: number | null;
  price: number | null;
  percentChange: number | null;
  rvol: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  referenceClose: number | null;
  ahPercentChange: number | null;
  ahVolume: number | null;
  volume: number | null;
  /**
   * The row's own deterministic change prose (`assessment.ts`). Optional so a
   * row without one is simply a row with nothing to harvest from it.
   */
  changeSummary?: string | null;
}

export type UnsupportedReason =
  /** The line names a ticker with no row in this checkpoint. */
  | 'NO_ROW_FOR_TICKER'
  /** A number in the line matches no stored or derived field on that row. */
  | 'NUMBER_NOT_IN_ROW';

export interface VerifyFinding {
  reason: UnsupportedReason;
  /** The offending value, when the reason is a number. */
  value?: number;
}

/**
 * Rounding, stated once so the writer and the checker cannot disagree.
 *
 * The store holds full float precision -- a real production row carries
 * `172.41379310344828` -- so a report that printed the raw value would read as
 * a machine. The writer rounds; the checker must accept the ROUNDED form of a
 * stored value, or it would strike every correctly-rounded sentence.
 */
const PERCENT_DP = 1;
const PRICE_DP = 2;

/**
 * Half away from zero, on the value's DECIMAL form. Exported because the
 * writer must round with this function and no other.
 *
 * `Math.round(1.255 * 100)` is 125, not 126: 1.255 is stored in binary as
 * 1.25499999..., so the arithmetic rounds a value nobody wrote. TCRT's real
 * 14:30 price is 1.255 and Marketing's specimen prints "$1.26" -- correctly --
 * and this checker struck it. Shifting the exponent in the string reads 1.255
 * as the 125.5 a person means.
 *
 * AWAY FROM ZERO, so a fall rounds the way a rise does: -6.25 is "-6.3", as
 * the specimen writes it. `Math.round` alone gives -6.2.
 */
export function roundTo(value: number, dp: number): number {
  const magnitude = Math.abs(value);
  const text = String(magnitude);
  const scaled = text.includes('e') ? magnitude * 10 ** dp : Number(`${text}e${dp}`);
  const rounded = Math.round(scaled) / 10 ** dp;
  return value < 0 ? -rounded : rounded;
}

/**
 * The three `changeSummary` notes that carry a VALUE, by their exact shapes
 * in `assessment.ts`. Everything else in it -- "rank #1 → #4", "left Top 12"
 * -- is a BAND-frame ordinal, and a set-range report must never print one: a
 * band rank beside an in-range list is two frames on one row. An allowlist of
 * shapes, so a note added there later is refused until it is named here.
 */
const CHANGE_NOTE_VALUES = [
  /([+-]?\d+(?:\.\d+)?)% since prior assessment/g,
  /([+-]?\d+(?:\.\d+)?)% off session high/g,
  /lost \$(\d+(?:\.\d+)?) support/g,
];

function changeNoteValues(summary: string | null | undefined): number[] {
  if (!summary) return [];
  const out: number[] = [];
  for (const shape of CHANGE_NOTE_VALUES) {
    for (const match of summary.matchAll(shape)) out.push(Number(match[1]));
  }
  return out.filter(Number.isFinite);
}

/**
 * Every value a line may legitimately contain, derived once per row.
 *
 * THE ONE DERIVED QUANTITY IS THE GIVEBACK, and it is here rather than left to
 * the model because it is the arc he actually asked for -- "what went up and
 * back down" -- and it lives inside a single row as `sessionHigh` against
 * `price`. Allowing it explicitly is what lets the report tell his story
 * without opening the door to arbitrary arithmetic.
 */
export function supportedValues(row: ReportFactRow): number[] {
  const out: number[] = [];

  /*
   * ONE ROUNDING PER FIELD, AND NOT ALSO THE INTEGER.
   *
   * This pushed `roundTo(value, 0)` as well, on the reasoning that a whole
   * number may be written without its decimal. **It made every price collide
   * with every small integer**: `IMCC` at $4.34 rounded to `4`, so the line
   * "IMCC slipped to #4" -- a rank true of a DIFFERENT checkpoint, and an error
   * this seat actually made -- passed verification against the price.
   *
   * A verifier that accepts a number because it resembles an unrelated field is
   * how the interesting cases get through. A stored value that is genuinely
   * integral already survives: `roundTo(4.00, 2)` is `4`.
   */
  const push = (value: number | null, dp: number) => {
    if (value === null || !Number.isFinite(value)) return;
    out.push(roundTo(value, dp));
  };

  push(row.price, PRICE_DP);
  push(row.sessionHigh, PRICE_DP);
  push(row.sessionLow, PRICE_DP);
  push(row.referenceClose, PRICE_DP);
  push(row.percentChange, PERCENT_DP);
  push(row.ahPercentChange, PERCENT_DP);
  push(row.rvol, PERCENT_DP);
  push(row.volume, 0);
  push(row.ahVolume, 0);
  if (row.assessmentRank !== null) out.push(row.assessmentRank);

  // The giveback: the only derived value a line may carry.
  if (row.sessionHigh !== null && row.price !== null && row.sessionHigh > 0) {
    const giveback = ((row.sessionHigh - row.price) / row.sessionHigh) * 100;
    push(giveback, PERCENT_DP);
  }

  /*
   * The row's own change notes, AS PRINTED. "down 30.2% since the last read"
   * and "lost $1.84 support" are facts this checkpoint's row stores in
   * `changeSummary`, not in a numeric field -- and without them every such
   * sentence in Marketing's specimens was struck. Taken as written, not
   * re-rounded: the note already carries its one decimal.
   */
  out.push(...changeNoteValues(row.changeSummary));

  return out;
}

/**
 * Numbers a line asserts, as written.
 *
 * Deliberately crude: it takes every numeric literal and checks them all. A
 * cleverer extractor that tried to decide which numbers are "claims" would be
 * making the judgement this function exists to avoid making.
 */
export function numbersIn(text: string): number[] {
  /*
   * TIMESTAMPS ARE EXCISED BEFORE ANY NUMBER IS READ, AND THE DEFECT CUT BOTH WAYS.
   *
   * Design raised the strict direction as a lead: a report line naturally reads
   * "at 3.10 at 09-25-style clock time", and a clock time yielded three numbers
   * instead of one, so EVERY TIMED SENTENCE WOULD HAVE BEEN STRUCK -- on a
   * design that requires every price to carry its time.
   *
   * MEASURING IT FOUND THE PERMISSIVE DIRECTION TOO, WHICH IS WORSE. An ISO date
   * yielded a year and two NEGATIVE numbers, because the hyphens parse as minus
   * signs -- so a date could match a stored percent change and VALIDATE a
   * sentence nobody checked.
   *
   * A timestamp is not a claim about a row's values, so neither reading reaches
   * the allowlist.
   *
   * NOT SOLVED HERE, AND WORTH ITS OWN CHECK: a stated time IS a claim -- it
   * should be the CHECKPOINT's time, and a report quoting one checkpoint's clock
   * over another's rows is the wrong-row defect wearing a clock. That needs the
   * checkpoint passed in, so it is a second pass rather than a silent widening
   * of this one.
   */
  const scrubbed = stripTimestamps(text);
  const out: number[] = [];
  for (const match of scrubbed.matchAll(/([+\-−])?(\d+(?:,\d{3})*(?:\.\d+)?)/g)) {
    const magnitude = Number(match[2]!.replace(/,/g, ''));
    if (!Number.isFinite(magnitude)) continue;
    out.push(signOf(scrubbed, match.index!, match[1]) * magnitude);
  }
  return out;
}

/**
 * A number's sign, AS A READER HEARS IT, and the stored value is signed.
 *
 * "down 25.1%" is -25.1 to a reader and was +25.1 to this function, so a
 * correct sentence about a fall was struck against the stored -25.06 -- and
 * "−6.3%" (the typographic minus a writer uses) read as +6.3. Both were
 * measured on Marketing's own specimens, 2026-09-29.
 *
 * - An explicit sign counts only where a sign can stand: at the start or after
 *   a space or bracket. "top-12" is a hyphen, not a minus.
 * - Else `up` / `down` IMMEDIATELY before the number. Not before a "$": "down
 *   $1.84" names a level, and a level has no direction.
 * - Else positive. An unsigned "6.3%" for a stored -6.25 is STRUCK, which is
 *   right: a reader takes it as a rise. Any other verb ("fell 6.3%") is
 *   unsigned too, so the strike errs toward refusing -- the allowlist's side.
 */
function signOf(text: string, index: number, sign: string | undefined): number {
  const before = text.slice(0, index);
  if (sign && (index === 0 || /[\s(]$/.test(before))) return sign === '+' ? 1 : -1;
  if (sign === '-' || sign === '−') {
    // A hyphen joined to a word: the number itself is unsigned, and the word
    // before it cannot give it a direction either.
    return 1;
  }
  if (/\bdown\s+$/i.test(before)) return -1;
  return 1;
}

/** ISO dates and clock times, replaced with a space. Exported so it is testable alone. */
export function stripTimestamps(text: string): string {
  return text
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, ' ');
}

/**
 * Whether every number in a line traces to the row it is about.
 *
 * A line with NO ticker is not checked here: a section heading or a "nothing in
 * our sources" line carries no per-ticker claim, and the semantic half owns it.
 * That is a deliberate hole and it is why this is the FIRST half of a checker
 * rather than the whole of one.
 */
export function verifyLine(
  line: { ticker: string | null; text: string },
  rows: readonly ReportFactRow[],
): VerifyFinding[] {
  if (line.ticker === null) return [];

  const row = rows.find((candidate) => candidate.ticker === line.ticker);
  if (!row) return [{ reason: 'NO_ROW_FOR_TICKER' }];

  const supported = new Set(supportedValues(row));
  const findings: VerifyFinding[] = [];

  for (const value of numbersIn(line.text)) {
    // A bare year or a ticker-adjacent integer is still a number the line
    // asserts; if it is not in the row it is not from the row.
    if (!supported.has(value)) findings.push({ reason: 'NUMBER_NOT_IN_ROW', value });
  }

  return findings;
}
