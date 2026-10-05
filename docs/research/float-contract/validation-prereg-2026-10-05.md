# Validation sample for the insider-only float bound: PRE-REGISTRATION (written before any code or run)

*Research-tmi, 2026-10-05. Amendable only before the run it governs, and any amendment is labeled. Gates the board cell AND the public page. Cost: $0 (no model; SEC fetches only). Needs Ops's slot for the run.*

## The question

Does the insider-only bound (`contract-2026-10-05.md` sections 1 to 3) ever come out LOWER than the true "filed count minus the insiders' shares as of the count's date", and is every subtracted holding the thing the contract says it is?

It does NOT test whether the bound equals the true float (nothing here measures a true float), and it cannot prove zero errors: it bounds the error rate.

## Sample

Names: the first 30 distinct tickers, by rank, from the desk's top-12-in-range of each COMPLETE `NEXT_DAY_RECAP` checkpoint, newest date first, whose bound is PRODUCED or CANNOT_VERIFY (a name with no filed count is UNKNOWN: it has nothing to audit, so it does not count toward the 30, but it IS counted in Amendment 1's state table). No stratification; record how many of the 30 had at least one subtracted holding. A name with zero subtracted holdings contributes to the range check only. If fewer than 30 distinct names exist in the stored checkpoints, report the count and run on all of them.

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

## Amendment 1 (labeled, 2026-10-05, Integration's ask, BEFORE any run; $0): the state table at three max ages

On the sampled names at their own checkpoint dates, report the number and share of names in each state at max age 45, 90 and 120 days: PRODUCED / UNKNOWN (no filed count) / CANNOT_VERIFY by age / CANNOT_VERIFY by active issuance (KNOWN_ACTIVE block, contract section 5). A name counts in exactly one row, by this precedence: UNKNOWN, then CANNOT_VERIFY by issuance, then CANNOT_VERIFY by age, then PRODUCED (so the issuance row is the same at the three ages and only the age row and PRODUCED move). **Amendment 1b (labeled, same day, before any run): the issuance row is reported under both status rules of contract section 5, KNOWN_ACTIVE alone and KNOWN_ACTIVE plus POSSIBLY_ACTIVE, with the type and date rules of that section; CANNOT_VERIFY by `ISSUANCE_NOT_CHECKED` (no dossier at the checkpoint) is its own row, and every non-PRODUCED row is broken out by its stored reason (contract section 3).** Reported beside the validation verdict but NOT graded: it informs the max-age choice, which is his; it does not change PASS or FAIL. The table covers every name drawn, including those with no subtracted holding; its denominator is stated. The 30-name draw is the board's own population, not the calibration's FINRA settlement pairs.

**Amendment 1c (labeled, 2026-10-05, before any run):** the state table also carries `SPLIT_SINCE_COUNT` (contract section 2, rule 2) as its own CANNOT_VERIFY row, split into "a split was found" and "no proof either way (missing split factor or bars)", at precedence after issuance and before age. The second count is the one that tells whether the proof is usable inside the 45-day window.

**Amendment 1d (labeled, 2026-10-05, before any run; $0):** on the sampled names' checkpoint dossiers, count supply blocks by type and by the `sourceType` of every source they cite: blocks citing at least one SEC source type (`SEC_FILING`, `SEC_EXHIBIT`, `SEC_SUBMISSIONS`, `SEC_COMPANY_FACTS`) versus blocks citing only other types, and the count of each non-SEC type. Reported, not graded. It decides whether the public page may say issuance is found "in the company's filings" (contract section 5).

**Amendment 1e (labeled, 2026-10-05, before any run; Integration's ask, so the choice of strictness is made on real numbers):** the state table is reported at max age 45, 90 and 120 with ALL of these rows, in this precedence (a name counts once, in the first row that applies): UNKNOWN by each stored reason; CANNOT_VERIFY by issuance under (i) KNOWN_ACTIVE alone and (ii) KNOWN_ACTIVE plus POSSIBLY_ACTIVE, shown as two complete tables, plus `ISSUANCE_NOT_CHECKED`; CANNOT_VERIFY by `SPLIT_SINCE_COUNT` split into "split found" and "proof unavailable"; CANNOT_VERIFY by age; PRODUCED. For each table the headline is PRODUCED as a share of the denominator, and the sentence "how many of the always-on column would show a number" is stated for each of the six combinations (two issuance rules by three ages). A name with no bound row (NOT_YET) is not in the draw.

## Order of work

This file committed; the parser change for as-of alignment built and gated (mutants predicted first, counts stated in that commit); the audit script written; the controls run; the sample run; raw output committed before it is read; the report written.
