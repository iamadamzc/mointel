# Split-proof replay: PRE-REGISTRATION (written before the script or any run; $0)

*Research-tmi, 2026-10-05, on Integration's GO. Follows `result-2026-10-05.md` section 4.2. Amendable only before the run it governs; any amendment is labeled.*

## The question

`SPLIT_SINCE_COUNT` was UNPROVEN on 28 of the 30 names with a filed count (`result-2026-10-05.md`). Which rule for proving "no split between the count's date and the checkpoint" would turn how many of them into NONE, **without ever turning a real split into NONE**?

## What the exploratory reads already say (informing the design, not graded)

`split-unproven-reasons.json` and `split-null-dates.json` (both from the raw names and the local scratch copy of the store): of the 28, 26 are UNPROVEN because the span holds a bar with a null `split_factor`, and 2 because the bars start after the count date. Of the 26, **15 have their only null on the checkpoint date's own bar** (the session in progress, which has no factor yet), 2 have nulls only within the last three sessions, and 11 have older runs of nulls (7 to 19 bars, from mid-September on). The stored bars are split-adjusted closes as of the day each was fetched (`adjustment` is the literal `'split'` on every row, `splits.ts` header), so a split-sized step between consecutive stored closes marks a split since the earlier bar was fetched.

## The rules (each evaluated on all 30 names with a count; "guard" = the ratio of consecutive stored closes, higher over lower, stays under 1.25 = `SPLIT_JUMP_FACTOR`)

- **R0 (as built, the baseline):** NONE only if no bar in the span has a null `split_factor` and the factor range stays under 1.25.
- **R1 (tolerate the checkpoint date's own bar):** R0, except a null on the checkpoint date's bar is allowed if the guard holds between that bar and the previous bar.
- **R2 (tolerate the tail, at most three sessions):** R0, except nulls on any of the last three sessions up to the checkpoint are allowed if the guard holds across every consecutive pair that touches a null bar.
- **R3 (tolerate any null bars):** R0, except nulls anywhere in the span are allowed if the guard holds across every consecutive pair that touches a null bar.
- **R4 (dossier `reverseSplitHistory`), REPORT ONLY, never a proof:** the number of names whose checkpoint dossier lists a split dated inside [count date, checkpoint]. An empty list is not evidence of no split (no coverage evidence), so R4 never produces NONE.
- **FINRA's split flag is NOT a rule.** It is published at settlement dates with a lag of about a week; the latest settlement published by a late-September checkpoint is 2026-09-15 (`calibrate-viewtime.ts:36`, FINRA's calendar), so it cannot cover the last two weeks of any span by construction. Noted, not run.

## Controls (run first, must behave as registered or the replay is not read)

1. **Planted split, by rule:** a synthetic span with a null on the checkpoint bar and a 2-for-1 step (ratio 2.0) between the last two closes MUST read not-NONE under R1, R2 and R3. A synthetic span with the same null and a 1.05 step MUST read NONE under R1.
2. **The FOUND name:** the one name with `FOUND` (R0) MUST NOT read NONE under any rule.
3. **A clean admit:** the one name that reads NONE under R0 MUST read NONE under R1, R2 and R3.

## Reporting (fixed now)

For each rule: the number of the 30 that read NONE, FOUND, UNPROVEN; and the registered state table (UNKNOWN, issuance under KNOWN_ACTIVE and under KNOWN plus POSSIBLY, split, age at 45/90/120, PRODUCED) recomputed with that rule as the split proof, so the effect on the column is stated, not inferred. A rule that turns any name with a real split in its span (R0 FOUND, or the planted control) into NONE is disqualified, whatever else it gains.

## What this does not do

It does not prove any rule correct on names it has not seen: three rules and 30 names are a replay, not a validation. A rule that survives goes into the contract only after the fresh-draw re-run (amendment 3 of the validation).
