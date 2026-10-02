# Reports v6 step 2: the P2 stability probe. RESULT, graded as registered (`8efb1a6f`)

*Seat `local_5f4bfcf8`, 2026-10-02. Raw output committed before it was read: `cbec4095` (`stability-probe-run.json`, `stability-probe-summary.txt`).*

- **Run:** 200 calls, all ran, none CHECKER_FAILED.
- **Spend:** **$8.76** (under the $9.50 stop and the $10 cap, inside his "3 yes").

## The measure

| | CURRENT | P1 |
|---|---|---|
| Model strikes on TRUE control lines (18 lines x 10 runs = 180 line-runs per arm) | **2** (1.1%) | **1** (0.6%) |
| Control report-runs that lost a true line (8 controls x 10 runs) | 2 of 80 | 1 of 80 |
| Named line 480-C S1L1 (WHLR "no fresh catalyst", SECONDARY_STALE) | 1/10 | **0/10** |
| Named line 493-C S1L1 (ARTL "no share count is on file", null shares) | 1/10 | **0/10** |
| Class-4 494-04 S1L2 (XXII "dropped off the board", ranked #6) | 10/10 | 10/10 |
| Class-4 456-04 S1L2 (VEEE "dropped off the board", ranked #5) | 10/10 | 10/10 |
| Rule strikes on any control | 0 | 0 |

**Every split is one run in ten.**

- **CURRENT splits on exactly the two named lines.** The model's notes repeat run 3's two misreadings: freshness re-judged from the research's dates, and "no share count" read as not following from a null field.
- **P1 splits once, on a line not named:** 490-C S1L2. Its note reads "'No fresh catalyst' is broader than the research support, which says no sufficient fresh positive catalyst was identified".

## Graded against the definitions fixed before any call

- **(i) The two named lines are struck 0/10 under P1: HOLDS.**
- **(ii) P1's false strikes (1) are no more than CURRENT's (2): HOLDS.**
- **So P1 REDUCES SPLITS, as defined.**
- **Admits a defect: NO.** Both class-4 lines were struck 10/10 under P1, as under CURRENT.
- **Decision, as approved (`design.md:98`): P1 BECOMES CHECKER PROMPT v4** (`REPORT_CHECKER_PROMPT_VERSION_V5` 3 to 4) in v6's checker, and rides v6's single re-freeze.

## What travels with it

1. **The difference is small.** 2 vs 1 strikes in 180 line-runs is not a measured improvement in rate. What P1 demonstrably removed are the two misreadings it was written for (1/10 to 0/10 each).
2. **The habit is not gone.** P1's one strike is the SAME CLASS on a different line: "no fresh catalyst" read as stricter than the desk's own wording.
   - Per the MODEL'S NOTE (the research itself not opened by this seat), the research says "no sufficient fresh positive catalyst".
   - P1 (a) covers "a line matching its status's supported wording", but this line's status wording and the model's reading still diverge.
   - **Not fixed here.** A candidate for v6's checker, to be proposed with its own measurement, not added silently.
3. **The live rate is the measure that matters.** About 1 in 80 report-runs lost a true line under P1. On the live desk a struck true line is a missing line in his report, never a false one. It goes to diagnostics after v6 ships.
4. **Scope:** 8 control drafts, two days, one author.
