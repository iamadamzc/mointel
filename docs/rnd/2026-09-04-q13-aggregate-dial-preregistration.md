# Q13 — the aggregate momentum dial. Pre-registration.

**Fixed 2026-09-04, before any state variable was computed.** The design is in
`docs/threads/rnd.md` under *Q13 — aggregate momentum state*; this document adds
the constants, the decision rules and the limits, and it is written first
because the trader's condition is **falsifiable or not built** and a threshold
chosen after seeing the red day is a rationalisation with a date on it.

---

## 0. THE LIMIT THAT DECIDES WHAT THIS STUDY CAN SAY

**The archive holds 13 sessions.** At n=13 the smallest correlation reaching
p<0.05 two-sided is:

    n= 13 sessions   critical |r| = 0.553
    n= 20                          0.444
    n= 30                          0.361
    n=100                          0.197

> **This study can only detect a very strong relationship.** An |r| of 0.45 —
> which would be a genuinely useful dial — **is invisible here and will report as
> a null.**

**So the null is PRE-DECLARED AS UNDERPOWERED, and that is not a hedge added
afterwards.** If no candidate clears 0.553:

- the honest verdict is **NOT DETECTABLE AT THIS SAMPLE SIZE**, never *no
  relationship exists*;
- the deliverable becomes **the number of sessions needed** to detect the
  effect actually observed, which is a real answer and a cheap one;
- **the dial is not built**, because the condition was falsifiability and an
  undetectable effect cannot be shown wrong in either direction.

**This is the momentum-viscosity outcome and it would be worth having.** That
question closed on a null and the closure was worth more than a feature.

---

## 1. POPULATION AND WINDOW — strictly ex-ante

**STATE is computed over premarket 04:00–07:00 ET. OUTCOME is the session.**

He trades 07:00–10:00. A state assembled from anything at or after 07:00 cannot
be shown to him at 07:00. **This is question 3 in the design and the place the
study most likely dies** — tonight's peak-trade-count separator is near perfect
and unusable in advance, and an aggregate built the same way would look
identical on a chart.

**Population: the top 5 and the top 12 by PREMARKET GAIN at 07:00**, computed
from minute bars against `reference_close`. Both are reported; neither is
chosen after the fact.

> **`best_rank` is NOT used to select the population.** It is a best-over-session
> quantity, so selecting on it leaks the outcome into the state. Rank at 07:00 is
> re-derivable from bars and is what he would actually see.

---

## 2. CONSTANTS — every one borrowed, none fitted here

| constant | value | source |
|---|---|---|
| active minute | 300 trades/min | `activity.ts`, used by Q11 and the revival study |
| settle exclusion | as `activity.ts` applies it | a partial minute reads as low activity and **manufactures calm** |
| mover | `max_gain_pct >= 50` | the 45.5% yield finding, established before Q13 existed |
| secondary mover | `>= 25` | reported to guard a floor effect, fixed now |

**Nothing in this table was chosen by looking at Q13 data.** That is the whole
reason the table exists.

---

## 3. OUTCOME — a rate, not a count

**PRIMARY: mover rate = movers ÷ board size, per session.**

Board size runs 38..86 across the window while mover count runs 23..7, so **a
count would carry board size into the outcome.** The rate removes it.

**AND A CONFOUND VISIBLE BEFORE ANY STATE VARIABLE WAS COMPUTED, registered
here because that is the only honest place for it:**

    2026-08-17   38 board   17 movers
    ...
    2026-09-02   79 board    7 movers

**Movers decline across the window while the board grows.** Any state variable
that also trends will correlate with the outcome **for reasons that have nothing
to do with momentum state.**

> **So every candidate reports THREE numbers: its raw correlation, its own trend
> against session index, and the PARTIAL correlation controlling for session
> index.** A candidate that passes raw and fails partial has found the calendar,
> not the market. **Fixed before looking, because after looking this is exactly
> the control one is tempted to drop.**

---

## 4. CANDIDATES — order fixed, and the order is a commitment

**1. ROUND-TRIP RATIO.** *Choppy is movement given back.* Per name over the
premarket window: `excursion = (high − open) / open`, `net = (close − open) /
open`. Aggregate:

    roundTrip = 1 − ( Σ max(net, 0) ) / ( Σ excursion )

**High = names moved and did not hold.** Named first so that a better result
from a later candidate cannot be presented as the first thing reached for.

**2. BREADTH.** Share of the top N whose `net >= 0.5 × excursion` — held at
least half the move. Answers *"are there gappers moving"*, the other half of his
sentence.

**3. DISPERSION.** Standard deviation of `net` across the top N. Third, because
it measures how *differently* names behaved rather than how *durably*, and his
complaint is durability. **A choppy session and a trending session can have
identical dispersion.**

**All three must clear §5 or none ships.** The design already records that one
dial compresses two questions — presence of movement and quality of movement —
and that the compression is lossy in the direction that matters most to him.

---

## 5. DECISION RULE — fixed now

A candidate **PASSES** only if all four hold:

1. `|r| >= 0.553` against the primary outcome (p<0.05 at n=13);
2. it **survives the partial correlation** controlling for session index;
3. **error rates are reported separately by direction** — wrongly-says-safe and
   wrongly-says-danger, never blended;
4. it is computable from data available **at 07:00**, no exceptions.

**A single blended accuracy figure is an automatic FAIL.** That is the
unfalsifiable shape Integration named, and it is the shape a dial naturally
takes.

**On the error asymmetry: this thread reports both rates and does not weigh
them.** A stand-down that wrongly says *safe* costs a loss; one that wrongly says
*danger* costs a day missed. **Which is worse is his call, not a measurement.**

---

## 6. WHAT A PASS WOULD AND WOULD NOT LICENSE

**The study is MINUTE grain. Any dial would be TICK grain.**

> **A minute-grain study cannot validate a tick-grain instrument. It validates
> the CONCEPT, not the INSTRUMENT** — the same gap as a replay that reproduces a
> predicate without auditing the deployment. **If this passes, the dial still has
> to be checked against it once built**, and that check is not optional.

---

## 7. AMENDMENTS

Amendments are appended here with a timestamp and a reason, before the affected
measurement runs. An amendment after a result is a retraction, not an amendment.

- *(none yet)*

---

# RESULTS — run 2026-09-04, `npm run archive:dial`

## VERDICT: NOT DETECTABLE AT n=13. THE DIAL IS NOT BUILT.

Nothing cleared 0.553. Under the pre-registered rule that is the answer, and
under the trader's condition — **falsifiable or not built** — it means not built.

    TOP 5 BY PREMARKET GAP AT 07:00
      candidate      r(primary)  partial  own trend  r(secondary)
      1 roundTrip      -0.332     0.279     0.493      -0.181
      2 breadth         0.282    -0.083    -0.355       0.317
      3 dispersion      0.504     0.325    -0.415       0.380

    TOP 12
      1 roundTrip      -0.303     0.094     0.383      -0.185
      2 breadth        -0.340    -0.216     0.276      -0.221
      3 dispersion      0.544     0.356    -0.448       0.427

## THE ORDER COMMITMENT EARNED ITS KEEP

**The candidate I ranked THIRD is the strongest, and the one I named FIRST is
the weakest.** Dispersion reaches 0.544; round-trip — my own reasoning about
*choppy is movement given back* — reaches −0.303 and **its partial flips sign**
to +0.094.

> Had the order not been fixed in advance, the honest-looking write-up is
> *"dispersion, the natural measure of a choppy tape, comes closest"* — and it
> would have been a story assembled after the fact. **The pre-registration is
> the only reason that sentence is not in this document.**

## THE TREND CONTROL DID THE WORK IT WAS ADDED FOR

**Dispersion's own trend is −0.448** against a declining mover rate. Controlling
for session index takes it from **0.544 to 0.356** — **most of its raw
correlation is the calendar, not the market.** Round-trip's sign flip is the
same effect in a more visible form.

**Registered before looking, and it is the control that would have been dropped
after seeing 0.544.**

## A DEFECT IN MY OWN PRE-REGISTRATION, recorded rather than quietly patched

**I fixed one threshold and registered SIX tests** — 3 candidates × 2
boundaries — **and did not adjust for multiplicity.**

    uncorrected   alpha 0.05      critical |r| = 0.553
    Bonferroni    alpha 0.05/6    critical |r| = 0.695

**The best observed value is 0.544, under both bars, so the omission changed no
verdict.** It is recorded because next time it might, and because a correction
applied after seeing results is not a correction.

## THE NULL'S DELIVERABLE — and the partial is the honest input

                        raw                partial
    dispersion top12    +0.544 -> ~14     +0.356 -> ~31 sessions
    dispersion top5     +0.504 -> ~16     +0.325 -> ~37
    roundTrip  top5     -0.332 -> ~36     +0.279 -> ~50
    breadth    top12    -0.340 -> ~34     -0.216 -> ~83

> **~31 more sessions would settle dispersion — about six trading weeks, at no
> cost, since capture already runs.** Quoting the raw's ~14 would be quoting the
> confounded number.
>
> **And a re-test must be pre-registered as a test of DISPERSION SPECIFICALLY**,
> because it is now a candidate selected for looking best on this data. Re-running
> all three on new sessions and reporting the winner repeats the error one level
> up.

## WHAT THIS DOES NOT SAY

**It does not say the tape has no aggregate state.** At n=13 an |r| of 0.45 —
a useful dial — is invisible. **This is an underpowered null and the design said
so before the numbers existed.**

**Coverage caveat carried:** 22..52 of each session's board had premarket bars
(41..67%). Names that never traded premarket cannot enter a premarket state, and
whether they differ systematically is unmeasured.
