# Validation sample for the insider-only float bound: PRE-REGISTRATION (written before any code or run)

*Research-tmi, 2026-10-05. Amendable only before the run it governs, and any amendment is labeled. Gates the board cell AND the public page. Cost: $0 (no model; SEC fetches only). Needs Ops's slot for the run.*

## The question

Does the insider-only bound (`contract-2026-10-05.md` sections 1 to 3) ever come out LOWER than the true "filed count minus the insiders' shares as of the count's date", and is every subtracted holding the thing the contract says it is?

It does NOT test whether the bound equals the true float (nothing here measures a true float), and it cannot prove zero errors: it bounds the error rate.

## Sample

Names: the first 30 distinct tickers, by rank, from the desk's top-12-in-range of each COMPLETE `NEXT_DAY_RECAP` checkpoint, newest date first, whose bound is PRODUCED or CANNOT_VERIFY (a name with no filed count is UNKNOWN and not sampled). No stratification; record how many of the 30 had at least one subtracted holding. A name with zero subtracted holdings contributes to the range check only. If fewer than 30 distinct names exist in the stored checkpoints, report the count and run on all of them.

Holdings audited: ALL subtracted holdings of each sampled name (the bound is only as good as every one), plus ALL REFUSED holdings of the first 10 names (to see what the refusals hide).

## What is checked, per subtracted holding, against the filing's own rendered page (the `xsl` HTML view EDGAR serves, read by a second code path that does not use the parser under test)

1. **Owner:** the filing has exactly one reporting owner, and it is the owner credited.
2. **Number:** the shares equal the figure in the rendered table for that row (the column "Amount of securities beneficially owned following reported transaction(s)", direct rows only).
3. **Class:** the row is direct (`D`), non-derivative, common or ordinary.
4. **As-of alignment:** the row's date is on or before the filed count's as-of date, and no later eligible row (date still on or before it) exists for the same owner.
5. **Basis:** no split between the holding's date and the count's date, read from SEC text (the count filing and the holding filing's footnotes), not only from the desk's stored factor.
6. **No double count:** no two subtracted holdings share an owner CIK; no holding is the same shares attributed through two filers.
7. **Range:** 0 < bound <= count.

Per name: count minus the sum of the audited holdings recomputes to the stored bound.

## The control that proves the check can fail (run first)

Before the sample, the same audit runs on TWO constructed cases: (i) a real clean name from the 10-name run (NXL, bound 21,419,055 from 617,347 insider shares), which MUST pass all seven checks; (ii) a planted fault on a copy of NXL: one holding replaced by a Form 4 dated AFTER the count date, which MUST fail check 4. If (i) fails or (ii) passes, the audit instrument is broken and the sample is not run (the 10-name harness's own split check once refused every holding for exactly this reason).

## Grading (fixed now)

- **Dangerous failure:** any audited holding failing checks 1 to 6 in the direction that LOWERS the bound (a holding credited to the wrong owner, a number above the filing's, a non-direct or derivative row counted, a holding dated after the count, a split between, a double count), or any bound failing check 7.
- **PASS:** zero dangerous failures across all audited holdings AND control (i) passes AND control (ii) fails as planned.
- **The report states** the number of holdings audited, n, and that zero failures bounds the true failure rate at about 3 over n at 95 percent (the rule of three). It never says "verified" or "safe".
- **FAIL:** one dangerous failure. The cell does not ship; the failure is classified into one of the contract's rules, the rule is fixed, and the sample re-runs on a fresh draw (the same 30 names are not reused).
- **Non-dangerous failures** (the desk subtracted less than the filing shows; a refusal that was unnecessary) are counted and reported, not graded.
- **INSUFFICIENT:** fewer than 30 audited holdings in total is reported as INSUFFICIENT, not as a pass; the draw widens to the next distinct names until 30 holdings or the checkpoints run out.

## Order of work

This file committed; the parser change for as-of alignment built and gated (mutants predicted first, counts stated in that commit); the audit script written; the controls run; the sample run; raw output committed before it is read; the report written.
