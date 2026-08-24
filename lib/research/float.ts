/**
 * Float, and what the desk is entitled to say about one.
 *
 * The desk has never had a float source of its own. Every float on the board
 * comes from the Sheet, which takes it from a vendor that publishes no rules,
 * and 58 hand-pulled names showed that number is arithmetically impossible on
 * one name in six. So this module does not produce a float. It produces the
 * **filed share count**, which the desk can derive and cite, and a **verdict**
 * on whatever float it is shown.
 *
 * That is the whole of Phase C by decision rather than by shortfall: deriving a
 * true free float needs Section 16 and 13D holdings, and that is unstarted on
 * purpose — the supply bound may answer the trading question often enough that
 * an estimated float is not worth its error bars, and whether 13G filers are
 * passive is unsettled. Subtract them and float is understated across the board,
 * which is a false positive on pillar 5 and the dangerous direction.
 *
 * The point of deriving rather than buying is not that the data is better. That
 * is unproven. It is that **the rules are visible and a failure is detectable.**
 */

import { classifySecurity } from '../market/securities';

/**
 * Where a float came from, carried from the first row rather than retrofitted.
 *
 * R&D's rule, and it exists because this was learned late and expensively: a
 * vendor-displayed float and a filing-derived float are different quantities
 * that happen to share a name, and a column that mixes them silently cannot be
 * un-mixed later.
 */
export type FloatBasis =
  /** A vendor number relayed through the Sheet. No published methodology. */
  | 'SHEET_VENDOR'
  /**
   * `dei:EntityCommonStockSharesOutstanding` off a filing cover page, used as a
   * bounded proxy. It is an UPPER bound on float, never a float — every share
   * an insider holds is inside it.
   */
  | 'FILED_SHARES_OUTSTANDING';

/**
 * How old a filed share count may be and still bound a claim about today.
 *
 * MEASURED, not chosen. Across 211 issuers on 2026-08-21 the age of
 * `dei:EntityCommonStockSharesOutstanding` is bimodal with a real valley:
 *
 *     0- 15d  61        90-105d  10
 *    15- 30d  35       105-120d   5
 *    30- 45d   3       120-135d   1
 *    45- 60d   4       135-150d   8
 *    60- 75d   2       150-180d   0
 *    75- 90d   1        >180d    81
 *
 * The first cluster is names that have just filed; the second is names a
 * quarter past one. Between them sit 10 rows in 60 days. **Anywhere in 30-90
 * gives the same coverage within three points** — 46.9% at 45 days against
 * 50.2% at 90 — so this is a robust parameter rather than a tuned one, which is
 * the only reason it is safe to fix a number at all.
 *
 * 45 rather than 90 because the asymmetry is not symmetric. Too tight and a name
 * reports `CANNOT_VERIFY`, which is the honest answer this design is built
 * around. Too loose and a stale count is treated as current, which produces a
 * confident `IMPOSSIBLE` on a company that simply issued shares — and that error
 * lands hardest on the names that dilute hardest.
 */
export const FILED_SHARES_CURRENT_DAYS = 45;

/**
 * Below this, a float is not small — it is in different units.
 *
 * A float under 2% of shares outstanding is not a low-float runner; it is a
 * vendor reporting millions where the filing reports shares, or an ADR ratio
 * applied on one side only. Item 14 fixes it at ~2% and explicitly refuses to
 * gate it on `ADR_ADS`, because YJ is an ADR the classification records as
 * ordinary. The test stands on the ratio alone.
 *
 * It IS gated on the denominator's freshness, though — see `assessFloat`. An
 * unadjusted pre-reverse-split count produces this signature from a perfectly
 * good float.
 */
export const UNIT_MISMATCH_RATIO = 0.02;

/** A filed share count, with the date that makes it a quantity. */
export interface FiledShareCount {
  shares: number;
  /** The cover-page date. A count without its date is a different number. */
  asOf: string;
  /** The XBRL concept, when the source recorded one. */
  concept: string | null;
  /** The evidence row this came from, so the verdict is citable. */
  sourceId: number;
}

export type FloatVerdict =
  /** The claim is consistent with the filed count. */
  | 'CONSISTENT'
  /** Float exceeds shares outstanding against a CURRENT filed count. */
  | 'IMPOSSIBLE'
  /** Float is a fraction of a percent of shares. Almost certainly units. */
  | 'UNIT_MISMATCH'
  /** A warrant, right or unit must not carry its underlying's float. */
  | 'DERIVATIVE_SYMBOL'
  /** Nothing filed to check against. */
  | 'NO_FILED_COUNT'
  /** Checkable in principle, but the denominator is too old to bound today. */
  | 'CANNOT_VERIFY';

export interface FloatAssessment {
  verdict: FloatVerdict;
  /** Days between the filed count's `asOf` and the date being judged. */
  denominatorAgeDays: number | null;
  /** `float / sharesOutstanding`, when both are present. */
  ratio: number | null;
  /** Plain statement of what was decided and on what. Never a trader label. */
  detail: string;
}

export interface FloatClaim {
  ticker: string;
  /**
   * The issuer name, and it is REQUIRED for the derivative test to work.
   *
   * `classifySecurity` reads DOTTED suffixes off the symbol — `PSA.PRM`,
   * `BRK.A` — and Nasdaq's fifth-letter convention has no dot, so `ENRDW`
   * classifies as `UNKNOWN` on the symbol alone. It is `WARRANT` at HIGH
   * confidence the moment the name is supplied. Since `ENRDW` inheriting
   * `ENRD`'s float is the case item 14 names, a null here is not a data gap to
   * work around; it is the failure itself.
   *
   * The name carries it: of 369 five-letter symbols ending in W, 368 say
   * "warrant" in the `universe` name, and 257 of 257 ending in U say "unit".
   * The single exception is `PSNYW`, "Class C-1 ADS (ADW)", which is a warrant
   * under an unusual name — so the miss is still a derivative, not a false
   * positive on common stock. `universe` holds a name for all 13,161 rows, so a
   * null reaching here means a caller did not wire one.
   */
  issuerName: string | null;
  /** The float being judged. Null when the desk holds none. */
  claimedFloat: number | null;
  basis: FloatBasis;
  filed: FiledShareCount | null;
  /** The date the judgement is made as of. */
  asOf: Date;
}

/**
 * Whole days elapsed since a cover-page date.
 *
 * FLOOR rather than round, and the difference is not cosmetic. The cover-page
 * date has no time of day, so it parses at midnight while `now` carries a real
 * clock. Rounding turns a count dated exactly `FILED_SHARES_CURRENT_DAYS` ago
 * into one day older from midday onward, which moves the threshold to 44.5 days
 * for most of every day -- a boundary that drifts with the hour the desk
 * happens to ask. Floor gives the plain reading: a count dated today is 0 days
 * old at any hour.
 */
function ageInDays(asOf: string, now: Date): number | null {
  const filed = Date.parse(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(filed)) return null;
  return Math.floor((now.getTime() - filed) / 86_400_000);
}

/**
 * What the desk may say about one float.
 *
 * Order matters and is not arbitrary. A derivative symbol is refused before the
 * arithmetic runs, because `ENRDW` carried `ENRD`'s float verbatim and the
 * numbers were internally consistent — a warrant inheriting its underlying's
 * float passes every test except the one about what the symbol is.
 *
 * KNOWN RESIDUAL, measured rather than assumed. Over the 732 five-letter W/U/R
 * symbols in `universe` this refuses 719 and misses 11 — every miss a name where
 * the designation is not the LAST thing in it: "Warrant.", "Warrants 8/16/27",
 * "Warrants to purchase American Depositary Shares". `classifySecurity` anchors
 * its name rule at the end of the string. Zero false positives on 400 four-letter
 * symbols ending in the same letters.
 *
 * NOT worked around here. A looser rule was tested and is unsafe — matching the
 * word anywhere hits 24 short symbols that are ordinary LP common units and
 * trusts (PAA, ARLP, UNG), which trade normally and whose float is real. And a
 * second, differently-shaped derivative rule living in this file is precisely
 * the two-definitions seam that cost this desk a day. The gap belongs to
 * `lib/market/securities.ts` and is reported there.
 *
 * **NO arithmetic verdict survives a stale denominator, in either direction.**
 *
 * An earlier version of this gated only `float > shares`, on the argument that
 * an old count UNDERSTATES today's shares, so staleness could hide a unit
 * mismatch but never manufacture one. **That argument assumed dilution and
 * forgot reverse splits**, which run the other way and are ordinary on this
 * desk's universe. `dei:EntityCommonStockSharesOutstanding` is a cover-page
 * figure and is NOT retroactively adjusted, so a pre-split count OVERSTATES
 * today's shares by the split ratio:
 *
 * - `EBON` — 1-for-30 in Nov 2022, count `asOf` 2019-12-31. Filed 111,771,000;
 *   111,771,000 / 30 = 3,725,700.
 * - `ZOOZ` — 1-for-20 effective 2026-06-01, count `asOf` 2025-12-31. Filed
 *   161,995,282; / 20 = 8,099,764.
 *
 * A genuine post-split float against either would read as a 20-30x UNIT
 * MISMATCH — the exact verdict the old comment claimed was unmanufacturable.
 * So both tests are now gated on the same freshness, and the rule is the simple
 * one: a denominator that may be wrong in an unknown direction cannot support
 * any arithmetic about it.
 *
 * Not corrected by split-adjusting instead, deliberately. `reverseSplitHistory`
 * is model-extracted prose ("One-for-thirty reverse stock split ..."), and
 * dividing a share count by a number parsed out of a sentence is a worse
 * failure than declining to answer.
 */
export function assessFloat(claim: FloatClaim): FloatAssessment {
  const security = classifySecurity({ symbol: claim.ticker, name: claim.issuerName });
  if (
    security.classification === 'WARRANT' ||
    security.classification === 'RIGHT' ||
    security.classification === 'UNIT' ||
    // A preferred series has its own share count. Handing it the common float
    // is the ENRDW error wearing a different suffix, and item 14's rule is
    // about inheritance rather than about warrants specifically.
    security.classification === 'PREFERRED'
  ) {
    return {
      verdict: 'DERIVATIVE_SYMBOL',
      denominatorAgeDays: null,
      ratio: null,
      detail: `${claim.ticker} is a ${security.classification.toLowerCase()}; a float here would be the underlying's`,
    };
  }

  /*
   * An unestablished class is refused rather than assumed common.
   *
   * `UNKNOWN` means the name was absent and the symbol carried no dotted
   * suffix, which is exactly the state `ENRDW` is in before its name arrives --
   * and in that state its float looked internally consistent, because it was
   * its underlying's and its underlying's numbers agree with each other. So
   * proceeding here would pass the one case this test exists for. Loud rather
   * than silent: `universe` has full name coverage, so this fires on a wiring
   * bug, not on missing data.
   */
  if (security.classification === 'UNKNOWN') {
    return {
      verdict: 'CANNOT_VERIFY',
      denominatorAgeDays: null,
      ratio: null,
      detail: `security class not established for ${claim.ticker}; no issuer name supplied`,
    };
  }

  if (claim.filed === null) {
    return {
      verdict: 'NO_FILED_COUNT',
      denominatorAgeDays: null,
      ratio: null,
      detail: 'no filed share count collected for this issuer',
    };
  }

  const age = ageInDays(claim.filed.asOf, claim.asOf);
  const current = age !== null && age <= FILED_SHARES_CURRENT_DAYS;

  if (claim.claimedFloat === null || claim.claimedFloat <= 0) {
    // The filed count still stands on its own as an upper bound, and saying so
    // is more useful than saying nothing — but it is not a verified float.
    return {
      verdict: 'CANNOT_VERIFY',
      denominatorAgeDays: age,
      ratio: null,
      detail: `no float to check; filed shares ${claim.filed.shares} as of ${claim.filed.asOf}`,
    };
  }

  const ratio = claim.claimedFloat / claim.filed.shares;

  /*
   * One gate for both tests, checked before either.
   *
   * A stale count can be too LOW (shares issued since) or too HIGH (a reverse
   * split the cover page predates), and nothing here can tell which. Both
   * arithmetic verdicts would name the float as the broken side when the
   * denominator is the one that moved.
   */
  if (!current) {
    return {
      verdict: 'CANNOT_VERIFY',
      denominatorAgeDays: age,
      ratio,
      detail:
        age === null
          ? 'filed share count carries an unusable date'
          : `filed count is ${age} days old; issuance or a reverse split since would move it in either direction`,
    };
  }

  if (ratio < UNIT_MISMATCH_RATIO) {
    return {
      verdict: 'UNIT_MISMATCH',
      denominatorAgeDays: age,
      ratio,
      detail: `float is ${(ratio * 100).toFixed(2)}% of filed shares; below ${UNIT_MISMATCH_RATIO * 100}% reads as a unit error rather than a small float`,
    };
  }

  if (ratio > 1) {
    return {
      verdict: 'IMPOSSIBLE',
      denominatorAgeDays: age,
      ratio,
      detail: `float exceeds filed shares against a count ${age} days old`,
    };
  }

  return {
    verdict: 'CONSISTENT',
    denominatorAgeDays: age,
    ratio,
    detail: `float is ${(ratio * 100).toFixed(1)}% of filed shares as of ${claim.filed.asOf}`,
  };
}
