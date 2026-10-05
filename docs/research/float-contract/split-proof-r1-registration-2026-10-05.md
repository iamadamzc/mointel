# Split proof R1: REGISTRATION before the build (a rule change to the float contract)

*Research-tmi, 2026-10-05. His ruling (verified at his own turn, transcript 125cfd6b, 2026-10-05T21:22:37.844Z): "90 days, approve the badge draft, yes hand off", read against Integration's question to him, whose recommendation was: "Research builds the smallest split-proof loosening it tested (allow a missing price bar on the recap day itself) and re-runs the counts". That is R1 of `split-proof-prereg-2026-10-05.md`. Written before the code and the tests. $0.*

## The rule, frozen (contract section 2 gains it; `floatCell` is unchanged, it already takes a `SplitProof`)

Input: the stored daily bars of the ticker from the last bar on or before the count's as-of date through the checkpoint date, oldest first, each with `close` and `split_factor`; the checkpoint date.

1. Fewer than two bars, or bars that do not reach the count's as-of date: **UNPROVEN**.
2. A null `split_factor` is allowed on the FINAL bar only, and only when that bar's date is the checkpoint date (the session in progress has no factor yet). A null anywhere else: **UNPROVEN**.
3. Over the non-null factors, if the smallest is not above zero: **UNPROVEN**; if largest over smallest is at least 1.25 (`SPLIT_JUMP_FACTOR`): **FOUND**.
4. If the final bar's factor is null (the allowed case), the guard: its close and the previous bar's close must both be above zero and their larger over their smaller must be under 1.25; otherwise **UNPROVEN**. (A split-sized step on the one unfactored day cannot be told from a move, and these are momentum stocks, so a large move reads UNPROVEN, which is the safe side.)
5. Otherwise **NONE**.

This is the replayed R1 (`split-replay.ts`, `proof('R1')`) with one added edge, rule 1's "fewer than two bars", which the replay did not have.

## What the build is

A pure function `splitProofFromBars(bars, checkpointDate)` in `lib/research/splitProof.ts`, with its tests; **nothing reads the store or calls it from a worker yet** (the reader that fetches the span and the wiring into the float job are the float build, later). The tests, written with the code:

1. all factors 1, no null: NONE; 2. a null on the checkpoint bar with a 1.05 step: NONE; 3. the same with a 2.0 step (the planted control): UNPROVEN; 4. a null on the final bar whose date is NOT the checkpoint date: UNPROVEN; 5. a null in the middle: UNPROVEN; 6. a factor step of 2.0 among non-null factors: FOUND; 7. empty, and one null bar: UNPROVEN; 8. a null final bar with a zero or null close: UNPROVEN; 9. the guard at exactly 1.25: UNPROVEN, at 1.24: NONE; 10. the factor range at exactly 1.25: FOUND, at 1.24: NONE; 11. a non-positive factor: UNPROVEN.

**Mutants predicted before the tests are read:** allow a null anywhere (the R3 shape): kills 2 (tests 4 and 5); drop the checkpoint-date equality: kills 1 (test 4); drop the guard: kills 2 (tests 3 and 8); guard comparison `>=` to `>`: kills 1 (test 9); factor comparison `>=` to `>`: kills 1 (test 10); drop the fewer-than-two-bars rule: kills 1 (test 7).

## The re-run (no new sample)

`state-table-r1.ts` recomputes `splitSinceCount` from the LIBRARY function (not the replay script's copy) for every counted name in both draws (the first sample, 36, and the fresh draw, 35) and reports the registered state table at **90 days** under both issuance rules (45 days beside it for reference). **Checks that must hold, or the re-run is not read:** the library R1 reproduces the replay's R1 NONE / FOUND / UNPROVEN counts on both draws (first 6 / 6 / 18, fresh 6 / 3 / 21), or every difference is a name with fewer than two bars; no name R0 found a split for (MI) reads NONE.

## What this does not do

It does not ship anything, measure the issuance flag's miss rate (still unmeasured at any age; Commercial's 5i point), or choose a rule from evidence beyond 65 names. A real-split name read as clean would end R1.
