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
