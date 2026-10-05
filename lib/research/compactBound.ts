/**
 * The float cell's number, compact, for a column 86 px wide (Design's measurement: at most 7 characters including the
 * "≤ " prefix, so the filed count's m/d fits beside it).
 *
 * Two rules, both about the claim "at most":
 *   1. THREE significant digits, with K, M, B or T: "≤ 842", "≤ 1.23K", "≤ 12.3M", "≤ 123M", "≤ 1.23B".
 *   2. ROUND UP, never to nearest. The cell says the float is no more than this, so a rounded-down number would
 *      understate the bound (12,301,000 is "≤ 12.4M", not "≤ 12.3M"). `formatCompactCount` in lib/format.ts rounds to
 *      nearest with two decimals ("123.46M", 8 characters), so it is not used here.
 *
 * Pure. The input is the bound in shares, a positive finite number; anything else throws (a bound that is not above
 * zero is already CANNOT_VERIFY upstream and never reaches a face).
 */

const UNITS: ReadonlyArray<{ suffix: string; size: number }> = [
  { suffix: 'K', size: 1e3 },
  { suffix: 'M', size: 1e6 },
  { suffix: 'B', size: 1e9 },
  { suffix: 'T', size: 1e12 },
];

export const BOUND_PREFIX = '≤ ';

export function compactBound(shares: number): string {
  if (!Number.isFinite(shares) || !(shares > 0)) throw new RangeError(`compactBound needs a positive finite number, got ${shares}`);
  const whole = Math.ceil(shares);
  if (whole < 1000) return `${BOUND_PREFIX}${whole}`;
  let index = UNITS.findIndex((unit, i) => whole < unit.size * 1000 || i === UNITS.length - 1);
  for (;;) {
    const unit = UNITS[index]!;
    const scaled = whole / unit.size;
    let decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    // size / 10^decimals is an exact integer for every unit, so this division and ceil are exact on integers.
    let shown = Math.ceil(whole / (unit.size / 10 ** decimals)) / 10 ** decimals;
    // Rounding up can also reach the next order of magnitude (99.91B -> 100.0B): drop a decimal place so it stays three digits.
    while (decimals > 0 && shown >= 10 ** (3 - decimals)) {
      decimals -= 1;
      shown = Math.ceil(whole / (unit.size / 10 ** decimals)) / 10 ** decimals;
    }
    // Rounding up can carry into the next unit (999,500 -> 1000K -> 1.00M).
    if (shown >= 1000 && index < UNITS.length - 1) {
      index += 1;
      continue;
    }
    return `${BOUND_PREFIX}${shown.toFixed(decimals)}${unit.suffix}`;
  }
}
