# Split proofs read stale bars: REGISTRATION before the build (a rule change to the float contract)

*Research-tmi `local_dd23765d`, 2026-10-05. Written before any code for it and before the measurement in section 3 runs. Raised by my own question to Ops (build plan section 3a) and answered by Ops (`local_c71f613a`, 2026-10-05, from the code: `history.ts:60-85`, `historyFetch.ts:119-126`, `219-226`). I have read Ops's answer and `lib/market/splitRestate.ts:1-30`; I have not read the ingestion code myself. $0 in model spend; the measurement makes Alpaca API calls under the desk's existing credentials.*

## 1. The hazard, as Ops read it

`upsertDailyBars` restates a bar only when that bar is RE-FETCHED; `split_factor` is `COALESCE(excluded, existing)`, so a stale factor survives; the shallow refresh re-fetches only a recent window, and older rows change only when a deep pass reaches the symbol, which is not every cycle. So a bar stored before a split's ex-date and outside the shallow window can keep its pre-split factor, and **both sides of a split can carry the same factor**. Both float split proofs (R0 for a holding's span, R1 for the count's) read only `split_factor`, so either can read NONE across a real split. Consequence for the bound: a reverse split between a holding and the count subtracts a pre-split holding from a post-split count, **too LOW**, the dangerous direction. Between the count and D: the count is in the wrong units (a forward split makes it too low). The validation saw no real-split name read as clean in 65 names; that is evidence it is uncommon, not that it cannot happen.

## 2. The rule, frozen: R-A, a second source that can only refuse

The float job also fetches Alpaca's announced splits (`/v1/corporate-actions`, the source `splitRestate.ts` already uses for split-day baselines, which listed 11 of 12 confirmed cases on their ex-date; RFAI 2026-08-21 was absent) for the symbol over [the earliest subtracted holding's as-of date, D]. Then:

- a holding whose span (its as-of date to the count's) contains an announced ex-date is refused, whatever R0 says;
- a count whose span (its as-of date to D) contains an announced ex-date is `SPLIT_SINCE_COUNT`, whatever R1 says;
- R0 and R1 are unchanged and still refuse on their own. The rule is the UNION: either source can refuse, neither can admit against the other;
- **a failed corporate-actions fetch is not "no split"**: the name is `SPLIT_SINCE_COUNT` (the bars alone can no longer vouch for it), and the job logs it.

Ex-date on the span's boundary: a split whose ex-date equals the holding's or the count's as-of date is treated as inside the span (refuse), since the filing's date does not say whether it is pre- or post-split units.

## 3. The measurement, before the build ($0 in spend)

On the scratch store (`A:\mointel-scratch\market-scratch-2026-10-02.db`, read-only) and the committed raw names of both validation draws:

1. For every symbol in either draw, fetch Alpaca's announced splits over the store's window. Count the splits whose ex-date falls inside a stored R0 holding span or R1 count span, and of those, how many R0 or R1 read NONE (**a stale-bar miss**). That count is the answer to whether the hazard bites on this sample.
2. The state table at 90 days under S1 (registration `insider-sale-registration-2026-10-05.md`) with and without R-A: the coverage cost.
3. **Control, run first:** WCT (1-for-5, ex-date 2026-09-08, from `split-day-previous-close/result-2026-10-03.md`) must be listed by the fetch, and a planted span containing 2026-09-08 must refuse; a planted span ending 2026-09-05 must not. If the control fails, nothing is reported.

Raw output committed before it is read.

## 4. What this does not do

It does not fix ingestion (Ops's, and a separate question: restating older bars after a split is a market-worker behaviour change). It does not cover a split Alpaca does not list (RFAI's shape); for that the bars remain the only source, and the hazard in section 1 stays for it. The ship ask for the float job states this residual.

## Amendment 1 (2026-10-05, written with the code, before any measurement runs)

The fetch window END is D plus the 4-day reuse span (contract 9b), not D: Alpaca publishes splits ahead of their ex-date (`splitRestate.ts`: Monday's were listed on the Saturday), so a reader reusing the row up to 4 days later can check the stored list against [count date, its own D] without a fetch. Its start is the earliest of the count's date and every holding's count-date (`h0`) as-of date. This can only add refusals. Residual, stated: a split announced AFTER the job ran and effective inside the reuse span is not in the stored list; for that case the reader has the bars (R1, with its price guard on the checkpoint's own bar) and nothing else. The job runs only with Alpaca credentials; without them it writes no row (NOT_YET), because a missing credential is a fact about the desk, not about the company.
