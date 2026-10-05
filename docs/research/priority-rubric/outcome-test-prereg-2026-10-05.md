# Priority grades against how the names traded: PRE-REGISTRATION (written before any outcome is read; $0)

*Research-tmi, 2026-10-05. On his ruling, read at his own turn by Integration (transcript 1b01d57c, origin human, 2026-10-05T21:50:53.964Z, which I re-read myself): "1, should absolutely see how the names traded against the grades. 2, no retirement yet." It answered the looser-A question (approved rule A 5 of 719 vs looser A 45, `looser-a-result-2026-10-05.md`). The approved rubric STANDS; this is a test of it and of the looser variant, not a change. Amendable only before the run it governs, and any amendment is labeled. This file is committed before the script and before any outcome column is read; the only data read so far is COVERAGE (counts of null fields), listed in section 2.*

## 1. The question

For the stored 22:00 recap rows, graded by `priorityGrade` (approved rule, and the looser-A variant of `looser-a.ts`), do the grades separate how the names traded in the NEXT regular session, in the direction the grades claim?

**The claim being tested, and what it is not.** The rubric says the grade is the desk's reading of five criteria at the checkpoint ("not a prediction", Commercial's condition). This test asks whether those readings turned out to line up with next-session trading anyway. A finding of "do not separate" does not make the readings wrong as readings; a finding of "separate" does not make them a signal.

## 2. Population, and what selected it

**What the 719 rows are:** the names the 22:00 `NEXT_DAY_RECAP` checkpoint stored from the AFTER_HOURS board (`board` = AFTER_HOURS, 25 to 32 names per checkpoint, 788 rows over 31 checkpoints, 2026-08-17 to 2026-10-01), restricted to a row price between $1 and $20 (719 of the 788). That is **the after-hours board's leaders at 22:00 ET**, in the desk's range, over about seven weeks of one season. **It is not the board at large, not the premarket board, not the names a trader would have chosen, and not the morning (09:25) checkpoint's grade.** A result is a statement about these rows only. The data is the local scratch copy of the store (`A:\mointel-scratch\market-scratch-2026-10-02.db`, a copy of production through 2026-10-02), read-only.

**Coverage, counted before this file (no outcome value read):** of the 719 rows, 1 has no next-session `ticker_session` row; 14 have no `rth_final_high`/`rth_final_close`; 1 has no next-session `previous_close`; 3 show a basis mismatch above 2 percent between the row's `reference_close` and the next session's `previous_close` (a possible split). Minute bars exist only from 2026-09-09 (the retention window), so the early-window outcome (section 3, S3) covers the 382 rows whose next session is on or after 2026-09-10. Daily bars for the next session exist for only 277 rows, so they are NOT used.

## 3. Outcomes, fixed now

Reference price `ref` = the row's `price` (the last price at the 22:00 checkpoint). All outcomes are from the NEXT trading session (`target_trading_date`) and read from `ticker_session` (`rth_final_high`, `rth_final_close`, latched at 16:00):

- **P (primary):** peak = `rth_final_high / ref - 1`. The opportunity measure the recap prompt itself tracks ("peak rank, spike/fade, peak-to-close giveback, strong retention").
- **S1:** close = `rth_final_close / ref - 1`. **S2:** giveback = `(rth_final_high - rth_final_close) / rth_final_high`.
- **S3 (subset, descriptive):** early window = the highest minute-bar high between 07:00 and 10:00 ET of the next session over `ref`, minus one, for the 382-row subset. His window; fewer rows; no verdict.

**Exclusions, each counted and reported by grade:** no next-session row or null `rth_final_*` (missing outcome); `|next previous_close / row reference_close - 1| > 0.02` (a basis change, treated as a possible split, outcome not comparable). If any grade group loses more than 5 percent of its rows to exclusions, that is stated beside its result (a halted or delisted name leaves no outcome, which can bias a group).

## 4. Grades, as of the checkpoint (look-ahead)

Every input to `priorityGrade` is a column frozen on the checkpoint row at capture (`cycle`, `catalyst`, `structure`, `rvol`, `spread_pct`, `volume`, `price`, `analysis_version_id`; `worker/desk-assessments.ts:291` copies the dossier's values at capture), so the grade is reconstructible exactly as of the checkpoint and uses no later dossier. **Order of work enforces it:** the script computes and WRITES the grades (both rules) before it opens any outcome table; that grades file is committed before outcomes are read. Two caveats stated, not hidden: the stored `cycle` is the model's classification (UNKNOWN on 73 percent of researched rows), so the approved rule's A is rare for input reasons; and the supply reading cannot be STRONG until the float bound ships.

## 5. The test, fixed now

Unit: one row (ticker by recap date). Groups: A, B, C, AVOID, UNKNOWN, NOT_YET, for each rule separately; no pooling of the two rules.

- **Descriptive for every group:** n after exclusions, median and quartiles of P, S1, S2, and the share with P at least 20 percent.
- **The verdict test** uses the ordered grades A, B, C, AVOID (the rubric's order of favour) on P, over groups with **n of at least 20**; a smaller group is reported and excluded from the test. Statistic: Jonckheere-Terpstra for the ordered alternative "a higher grade has a higher P". Null: **grade labels permuted within recap date** (10,000 permutations, seed 20261005), which keeps each day's market constant. Report the one-sided p in both directions.
- **SEPARATES (as the grades claim):** the p for the claimed direction is under 0.01 AND the median P of the best included group exceeds the worst's by at least 5 percentage points (a floor I chose so a detectable but trivial difference is not called separation; his to move) AND the sign of that difference is the same in the earlier and the later half of the recap dates.
- **INVERTED:** the same, in the opposite direction.
- **DOES NOT SEPARATE:** both one-sided p values are 0.05 or more.
- **INCONCLUSIVE:** anything else. **INSUFFICIENT:** fewer than two groups reach n of 20.
- **Cohort robustness:** the same test on the first appearance of each ticker only (a name that stays on the board for days is not independent). If the verdict differs, the result is reported as not robust.
- **One primary test per rule (two tests);** S1, S2, S3 and the other groups carry no verdict and are not used to rescue a negative primary.

**What this can already say it cannot test:** under the approved rule the groups A (5 rows) and C (9) are below 20, so its verdict can only compare B and AVOID; under the looser rule A (45), B and AVOID can be compared and C (9) cannot.

## 6. Controls (run first; if any fails the result is not read)

1. **Power control:** a copy of the outcomes with a known separation injected (P plus 30, 20, 10, 0 points for A, B, C, AVOID) MUST return SEPARATES under the looser rule.
2. **False-positive control:** 200 within-date shuffles of the real grades, each run through the whole procedure, MUST return SEPARATES or INVERTED in at most 2 percent of runs.
3. **Exclusion control:** the basis-mismatch rule MUST exclude at least one row (the coverage count says 3); zero would mean the check is not looking.
4. **Order control:** the grades file is committed before any outcome is read (the commit order shows it).

## 7. Cost, and what it waits on

**$0.** Stored data only: local read-only SQLite on this PC, no network, no model, nothing on the live endpoint (so nothing on `/api/market` at 07:00 to 10:00 ET). It needs no Ops slot beyond one node process of a few minutes; it runs no vitest, tsc or build. Any spend is his and none is proposed.

## 8. Order of work

This file committed and its sha sent to Integration for the seam read; then the script (grades first, written and committed; then controls; then outcomes, raw output committed before it is read; then the report).
