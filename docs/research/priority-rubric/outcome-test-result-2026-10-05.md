# Priority grades against how the names traded: RESULT

*Research-tmi, 2026-10-05. Pre-registration `outcome-test-prereg-2026-10-05.md` (`1113b940`, amendments 1 and 2 committed before the report step). Script `outcome-test.ts` (`43a926dc`); grades committed at `0031136a` before any outcome table was opened; raw outcomes at `1d5f2d8b` before any statistic; label control `18b14fd9` / `b15b72d0`; report `outcome-test-out-2026-10-05/report.json` at `9fd9e06c`. $0: local read-only SQLite, no network, no model. On his ruling (transcript 1b01d57c, 2026-10-05T21:50:53.964Z, human): "should absolutely see how the names traded against the grades."*

**What was tested.** The Priority grades of the approved rubric and of the looser-A variant, computed from the frozen checkpoint rows, against the next trading day's trading, on 719 stored 22:00 recap rows of the after-hours board's leaders priced $1 to $20, 31 recap dates from 2026-08-17 to 2026-10-01. The primary outcome P is **the next trading day's HIGH FROM 04:00 THROUGH THE CLOSE, premarket included**, over the checkpoint price (relabeled by amendment 2: the label control shows `rth_final_high` matches the extended window on 134 of 369 comparable rows and the regular session alone on 6; the other 216 cannot be told apart). 701 rows were usable: 1 had no next-session row, 14 no final values, 3 a possible split (basis mismatch).

## Controls (run before any verdict was printed): all passed

The injected-separation control returned SEPARATES; 0 of 200 shuffles of the real grades returned SEPARATES or INVERTED; the basis rule excluded 3 rows.

## Verdict, as registered: DOES NOT SEPARATE, for both rules, and robust

| Rule | Groups in the test (n at least 20) | One-sided p, claimed direction / opposite | Median P, best minus worst group | Halves (early / late dates) | First appearance only |
|---|---|---|---|---|---|
| Approved | B, AVOID (A has 5 rows, C has 9) | 0.68 / 0.32 | +0.1 point | -0.4 / +0.4 points | DOES NOT SEPARATE (p 0.63 / 0.37) |
| Looser A | A, B, AVOID (C has 9) | 0.50 / 0.50 | +2.0 points (A over AVOID) | +3.9 / -0.2 points | DOES NOT SEPARATE (p 0.50 / 0.50) |

Neither p value is near the 0.01 line, so the 5-point effect floor did not decide anything and does not need to go to him. In the looser rule the early half shows A ahead of AVOID by 3.9 points and the late half does not (-0.2); I would not read a pattern into that.

## What each group did (medians over usable rows; P is the extended-hours high)

| Grade (rule) | Rows | P median | Close median | Giveback median | Share with P at least 20% |
|---|---|---|---|---|---|
| A, approved | 5 | 9.8% | -20.1% | 29.5% | 0% |
| A, looser | 44 | 8.0% | -5.0% | 11.5% | 22.7% |
| B (approved / looser) | 284 / 245 | 6.1% / 6.0% | -3.8% | 10.8% | 18.3% / 17.1% |
| C | 9 | 11.2% | -4.4% | 16.4% | 22.2% |
| AVOID | 193 | 6.0% | -2.6% | 8.2% | 18.1% |
| UNKNOWN | 65 | 1.7% | -0.1% | 1.7% | 6.2% |
| NOT_YET | 145 | 2.7% | -2.0% | 5.1% | 7.6% |

His 07:00 to 10:00 ET window (descriptive only, the 362 rows with minute bars in it): medians are 1.7 to 3.1 percent across the graded groups (looser A 3.1, B 1.8, AVOID 1.7), no verdict.

## What this does and does not say

1. **Among the testable groups the grades did not order how far the names ran.** B and AVOID are indistinguishable on peak, close and spike share; the looser A runs about 2 points higher at the median than B or AVOID but closes worse than AVOID (-5.0 against -2.6) and gives back more, and none of it clears the registered line.
2. **The controls say the test can see a large separation** (10, 20 and 30 points between grade steps). **It was not shown able to see a separation of a few points,** so "does not separate" is not "no effect": a real effect of a couple of points on 44 A rows would not have been detected. No confidence interval was computed.
3. **The two ungraded groups are quiet names, and that is selection, not the grades.** UNKNOWN and NOT_YET rows (the desk had no, or little, research) show far smaller moves (P median 1.7 and 2.7 percent, spikes of 20 percent or more on about 6 to 8 percent of rows against about 18 percent for the graded groups). The research queue reaches the names that moved; a graded name differs from an ungraded one in more ways than the grade.
4. **The approved rule's A cannot be tested** (5 rows, closing a median -20 percent, n of 5 is not a finding) and neither rule's C (9 rows). The approved rule's test is B against AVOID only.
5. **It is a statement about the after-hours board's leaders at 22:00 ET, $1 to $20, seven weeks, one season.** It is not about the board at large, not the morning (09:25) checkpoint's grade, not any entry or exit, and carries no costs or fills. After-hours leaders fade on average (close medians -0.1 to -5 percent), which is a property of the population.
6. **Not checked:** worker restarts inside a next-session day, which may have re-seeded the session high (`ticker_session` has no reconstruction flag); the within-date permutation keeps that off the ordering test and it can move the medians.

## The legend

The Priority legend's sentence "not tested against outcomes" is a factual claim that expires "the day any test of the grades runs" (the rubric draft section 5, Commercial's condition). **This is that test.** Whether and how the sentence changes is Commercial's and Marketing's; it has to change in the same commit that publishes the legend, and it must not read as "tested and found predictive".
