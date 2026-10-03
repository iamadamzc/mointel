# Review of Ops's split fix `dff3fb0a` (branch `ops/split-day-close`)

*Research seat `local_98e3e9a1`, 2026-10-03. Code read before the tests; the mutant predictions below were committed BEFORE `tests/market/splitRestate.test.ts` or Ops's own counts in `docs/threads/ops.md` were read.*

## The approach, from the code

Sound. `restateBars` applies every split with `bar date < exDate <= tradingDate`, cumulatively, from RAW bars, so it is right whether or not Alpaca has applied its adjustment (NIVF's double-adjustment case). Volume moves the other way. The engine lets a restatement (or its revert) replace a daily-bar close (`replaceClose`), ignores a carried-over pre-session price, and decides once, after the seeded closes. Both gaps from my first review are in.

## One finding: the revert band is flat, so it misreads a gap-down on a SMALL split

`firstPrintBasis` reverts to the old basis when the first print is within 25% of the old close and nearer to it on a log scale. For a large ratio that needs an extreme first print (a 1-for-5 must open 75% below its restated close). For a 1-for-2 it does not. With an old close of $1.44 and a restated $2.88, a first print of $1.80 is a 37.5% gap down on the new basis, a plausible open for a dilutive reverse split, but it reads as "the split did not happen" and the day shows +25% instead of -37.5%.

Suggested: scale the band with the ratio, e.g. OLD_BASIS only when the log distance to the old close is under a quarter of log(ratio), capped at 25% (about +/-19% for a 1-for-2; the 25% cap from a 1-for-3 up). And a fixture: 1-for-2, first print 37.5% below the restated close, which must stay RESTATED.

## Mutants, predicted before reading the tests

| # | Mutation | Predicted kills |
|---|---|---|
| M1 | `restateBars`: `bar.date <= split.exDate` (restates the ex-date bar of an earlier split too) | 1 |
| M2 | restated baseline uses today's split only (earlier window splits dropped) | 1 |
| M3 | volume multiplied by the factor instead of divided | 1 |
| M4 | `firstPrintBasis` always returns `RESTATED` | 2 |
| M5 | `checkSplitBasis` drops the pre-session price guard | 1 |
| M6 | `attachBaseline` ignores `replaceClose` (the old daily-bar gate) | 1 |

Runs wait on Ops's slot.

## Addendum: the candidate is now `f5746a84` (both points taken), predictions restated BEFORE the run

Verified in the diff: the band is `min(|ln(restated/old)|/4, ln 1.25)`, OLD_BASIS only inside it (the "nearer the old close" condition is implied by the band); new tests for the 1-for-2 gap-down (1.80 stays RESTATED, 1.50 reverts) and for the pre-session guard. The suite grew from 19 to 21, so the predictions for M4 and M5 change; the others stand. Written after reading the new test titles, before any run:

| # | On `dff3fb0a` (committed above) | On `f5746a84` |
|---|---|---|
| M1 | 1 | 1 |
| M2 | 1 | 1 |
| M3 | 1 | 1 |
| M4 | 2 | 4 (old-basis unit, forward split, the 1-for-2 test's 1.50 case, the engine revert) |
| M5 | 1 (then, on reading the titles, expected 0: no test covered the guard) | 1 |
| M6 | 1 | 1 |

## Results on `f5746a84`, run in a detached worktree (A:\mointel-splitrev, removed after) in Ops's slot

Baseline green, 21/21. Each mutation matched its source text exactly once.

| # | Predicted | Killed | Tests that died |
|---|---|---|---|
| M1 | 1 | **0, SURVIVED** | none |
| M2 | 1 | 1 | earlier window splits restated through both |
| M3 | 1 | 5 | the three `restateBars` cases, WCT, earlier window splits |
| M4 | 4 | 4 | old-basis unit, the 1-for-2 band test, forward split, the engine revert |
| M5 | 1 | 1 | the pre-session guard test |
| M6 | 1 | 3 | restatement replaces a daily-bar close, the pre-session guard test, decides once |

**M1 survives: a test gap, not a code defect.** The code is right (`bar.date < split.exDate`: a bar ON an earlier ex-date already traded on that split's new basis). But no fixture has a bar dated exactly on an earlier split's ex-date, so restating it would pass. Consequence if the boundary slipped: that one bar's close is off by the split ratio and its volume too, which matters for the prior close only when the earlier ex-date was yesterday, and slightly skews the RVOL average otherwise. One fixture closes it: in the cumulative case, a bar dated on the 1-for-3's ex-date restated only by today's split.

M3 and M6 killed more tests than predicted: those guards are covered more widely than I assumed, which is no fault in the suite.

**Verdict:** approve `f5746a84`, with the one-fixture follow-up for M1 (it does not block a ship).
