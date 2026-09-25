# Q14 — Grade the grader

**Opened 2026-09-22 on his direct approval, relayed by Integration.** One of the
two benefits behind the capture-for-analysis spec
([../DATA-ARCHIVE.md](../DATA-ARCHIVE.md)); the other is catalyst latency (Gap 1),
which he ruled to the free EX-99 path only.

**This document is a PRE-REGISTRATION.** The test, the population and the primary
outcome are fixed here, before any verdict, because the whole register is a
record of what selecting a candidate on 13 points after seeing it costs (Q13).
The descriptive table at the bottom is feasibility, explicitly **not** the answer.

## The question, and the boundary that is easy to lose

Does the **catalyst grade assigned at board entry** predict what the name then
did? And is the grade *good* — does its confidence track reality?

> **Scope boundary, stated first: this measures the grade AMONG NAMES THE DESK
> BOARDED. It does not measure whether the grade tells the desk what to board.**
> The joinable population is board names only (`symbol_outcomes` is the archive's
> board-capture rollup). "Did STRONG names outrun WEAK names once on the board"
> and "would grading have picked the movers out of the whole universe" are
> different questions with different populations; only the first is answerable
> here. The second needs tier A (the control group), which is Q1/Q3's blocker.

## The data, and it needs no capture

- **Grade:** `desk_assessment_tickers.catalyst`, the label at assessment time.
  Vocabulary and store-wide counts (`assessments-prod.db`, through 09-10):
  MODERATE_MIXED_SECONDARY 2617, UNKNOWN 1629, null 1513, LEGITIMATE_POSITIVE
  1240, WEAK_NEGATIVE_DILUTIVE 631, NONE 288, STRONG 107.
- **Outcome:** `symbol_outcomes` (archive.db), keyed `(symbol, trading_date)`.
- **Join:** `(ticker, trading_date)`. **939 of 939 outcome rows carry a joinable
  grade, over 13 sessions (08-17 … 09-02).** Runnable today; nothing to store.

**The grade is NOT a linear quality scale, and the test must not assume it is.**
`WEAK_NEGATIVE_DILUTIVE` is a *bad* catalyst (dilution), not a weak positive — and
a dilutive pump can spike hard before it fails. So "higher grade → higher gain"
is the wrong null. The grader's own claim is narrower and is what we test:
**`LEGITIMATE_POSITIVE`/`STRONG` mark names with a real positive catalyst; the
desk's Pillar 4 says those are the ones to trust.** The question is whether that
class actually separates from the rest on outcome.

## Pre-registered test

1. **Primary contrast:** `LEGITIMATE_POSITIVE ∪ STRONG` vs
   `MODERATE_MIXED_SECONDARY ∪ WEAK_NEGATIVE_DILUTIVE ∪ NONE`, on the outcome
   below. A single pre-stated contrast, not a scan across all seven labels
   (seven groups on 13 sessions is a fishing licence).
2. **Primary outcome:** `gain_open_30_pct` (high 09:30–10:00 vs reference close)
   — the window the strategy lives in. `max_gain_pct` over the full 04:00–20:00
   session is reported beside it as a secondary, carrying the mover-population
   caveat, because a full-session extreme is not the tradeable outcome.
3. **Coverage held constant FIRST, per the archive's own rule.** `null` and
   `UNKNOWN` are excluded from the primary contrast and analysed separately:
   an ungraded name is very likely one research never reached, so `null`'s weak
   outcome is a **coverage** fact, not a grade fact. Conflating them rebuilds
   "a theory of the market out of a billing outage" (DATA-ARCHIVE.md).
4. **One grade per (ticker, date).** A ticker is reassessed through the day;
   collapse to a single grade (the strongest seen) so repeated rows do not count
   as independent evidence.
5. **Verdict form:** a stated verdict plus what would overturn it. **A null
   counts** — "the grade does not separate outcomes on this population" is as
   real a result as a positive, and is reported with its power.

## Power, and why this is not yet a verdict

13 sessions is the register's binding ceiling. The primary contrast has ~120
LEGITIMATE_POSITIVE∪STRONG against ~380 in the comparison class, but the sessions
are the unit that matters for anything session-correlated, and 13 gives a
critical |r| of **0.553** — a useful effect reports as a null. **The archive
backfill (register standing item, 2026-09-10) lifts this to 17 sessions / 0.482
and is the same lever that unblocks the rest of the register.** So Q14's power is
tied to a decision already on his desk.

## Feasibility read — DESCRIPTIVE ONLY, NOT THE VERDICT

Collapsed to one grade per (ticker, date), joined to `max_gain_pct`. **Printed to
show the instrument works and to expose the confounds, not to answer the
question.** Thin rows marked; do not quote a rate off one.

    grade                       n     mean max_gain%   %>=50% mover
    STRONG                       8*        72.4            62.5      *n=8, says nothing
    LEGITIMATE_POSITIVE        112         64.6            41.1
    WEAK_NEGATIVE_DILUTIVE      55         64.4            38.2   <- as high as LEGIT_POS
    NONE                        30*        56.9            20.0
    UNKNOWN                    187         44.3            19.8      coverage confound
    MODERATE_MIXED_SECONDARY   296         35.8            21.6
    null                       251         14.7             6.4      coverage confound

Three things this already flags for the real test, none of them a finding:

- **The top of the scale is tiny.** STRONG n=8. Any statement about "strong
  catalysts" on this store is unsupported.
- **`WEAK_NEGATIVE_DILUTIVE` runs like a legitimate positive on `max_gain`** —
  which is exactly the dilutive-pump shape and the reason the outcome must be the
  strategy window, not the session extreme, and the reason "grade quality" is not
  "grade height".
- **`null` is the weakest by far and is almost certainly coverage, not grade.**
  Excluding it is pre-registered above, not a post-hoc trim.

## What would overturn / what it does not say

- **Overturn:** a grade field that is not the label at *entry* (reassessment
  drift), an outcome window other than the pre-stated one chosen after seeing the
  result, or a coverage split that dissolves the primary contrast.
- **Does not say:** anything about names never boarded (tier A), and anything
  causal — a grade correlating with a move is not the grade causing the desk to
  catch it.

## Result of the pre-registered primary contrast — 2026-09-22

Run once, exactly as specified above: `gain_open_30_pct`, one grade per
(ticker, date), null/UNKNOWN excluded.

    LEGIT_POS ∪ STRONG      n=118   mean 29.2%   median 12.5%
    MOD ∪ WEAK_NEG ∪ NONE   n=353   mean 11.9%   median  2.8%
    pooled difference of means  +17.3pp   (Welch t≈3.65 — but this pools 471
                                           rows as independent and OVERSTATES;
                                           the real unit is the session)

**Taken to the session level, which is the honest unit:**

    POS median > CMP median in  13 of 13 sessions   (sign test ≈ 1 in 8,000)
    paired session diff (medians)  mean +8.79pp   sd 4.66   paired t=6.80 (12 df)

> **DETECTED, and it survives the clustering that deflated the naive statistic.**
> The grade separates the strategy-window outcome in **every one of 13 sessions**
> — not one big day carrying a pooled average. The catalyst grade at board entry
> carries real forward information about the 09:30–10:00 move **among boarded
> names.** This is a positive result, not the underpowered null 13 sessions
> usually forces (contrast Q13).

**Effect SIZE is the part that is still soft.** The typical (median) session gap
is ~9pp; the pooled mean gap is ~17pp, inflated by right-skew in the POS group.
The interval on the magnitude is wide on 13 sessions even though the *direction*
is unanimous. The backfill tightens the size, not the sign.

**A cross-check worth one line, not a claim of identity:** the pooled +17.3pp
echoes Q1's first-half catalyst relationship at +17.9pp. Plausibly the same
underlying effect — catalyst quality → move — seen through the grade label rather
than through catalyst presence. Recorded as a coincidence to test, not a joined
result.

## What is answered, and what is still open

- **Answered (part a): does the grade predict the outcome? YES, on boarded
  names, 13/13 sessions.** What would overturn it: a coverage split that turns
  out to drive it (the graded class being better-covered than the comparison
  class in a way that itself predicts the move), or a reassessment-drift artifact
  in which "grade at entry" is not the label these names actually entered under.
  Both are checkable and neither is checked yet.
- **Open (part b): is the grade GOOD — does its `confidence` track reality?** Not
  tested. `catalyst.confidence` (HIGH/MEDIUM/…) and the `STRONG` vs
  `LEGITIMATE_POSITIVE` split are the instruments; STRONG is n=8 here and cannot
  carry it until the backfill.
- **Coverage of `null`/`UNKNOWN`** analysed separately, as pre-registered — the
  likely coverage story, not folded into the contrast above.

**Status: part (a) DETECTED and reported with the session-level statistic; part
(b) open; the two overturn-checks above owed before this closes. Re-runs at 17
sessions after the backfill.**

## OVERTURN-CHECK RESULT — 2026-09-23. The detection was largely look-ahead.

**Run the day after the result above, and it knocks it down. Recorded beside the
original rather than replacing it, per the register's correction rule.**

The 13/13 result used **the strongest grade seen for each (ticker, date)**. That
is contaminated: a ticker is reassessed through the session, so a name upgraded to
`STRONG`/`LEGITIMATE_POSITIVE` at 09:50 — *after* the 09:30–10:00 window being
predicted — was counted in the positive class. Re-run on the grade at **first
board entry** (earliest assessment for that ticker-date, the only grade available
in real time):

    grade AT FIRST ENTRY, gain_open_30_pct
    POS (LEGIT_POS∪STRONG)      n= 65   median 4.47%
    CMP (MOD∪WEAK_NEG∪NONE)     n=302   median 2.44%
    POS median > CMP median in  9 of 13 sessions   (was 13 of 13)
    paired session diff  mean +6.22pp  sd 22.13  t=1.01   (was t=6.80)

**`t≈1.0` is not detection.** The direction is still weakly positive (9/13) but
the effect does not survive the session-level test once the future information is
removed.

**The mechanism, measured:** of the ~118 names in the strongest-seen POS class,
**54 entered POS only via a later upgrade** — they were something weaker at first
board entry. So ~45% of the "positive" evidence was a grade assigned after the
move it appeared to predict. **This is look-ahead, and it is the whole gap
between t=6.80 and t=1.01.**

**And an operational finding falls out of it:** the grade is frequently **not yet
`LEGITIMATE_POSITIVE`/`STRONG` at the moment the name boards** — research has not
resolved. A grade that arrives after the tradeable window cannot be the desk's
real-time predictor even if it is accurate, which is a latency point about the
grade, not only a statistical one.

> **CORRECTED VERDICT (part a): NOT DETECTED at first-entry grade on 13 sessions**
> (9/13, t≈1.0). It may be a real but small effect that 13 sessions cannot
> resolve — an underpowered result in the shape of Q13, not the positive the
> strongest-seen cut implied. **The 13/13 figure must not be quoted; it measured
> the grade the desk ended the day believing, against a move earlier in the same
> day.**

**What this owes going forward:** re-run at 17 sessions after the backfill on
**first-entry grade only**, pre-registered as such. If the ~+6pp direction holds
and tightens, it becomes a real (small) effect; if not, part (a) closes as a
null. The look-ahead cut is retired as an instrument.

**A note for the successor, because it is the register's recurring fault:** the
strongest-seen result concluded what Pillar 4 already believes — that a real
catalyst marks a mover — so it read as confirmation and I nearly closed it. The
overturn-check I owed myself is the only reason it did not ship. *Check hardest
when you agree.*

## RE-RUN on 26 sessions — 2026-09-23. Weakly detected, small, direction-reliable.

**The backfill landed** (`assessments-prod-2026-09-23.db`, his by-name approval to
Ops; archive now 1,999 outcome rows over **26 sessions**, 08-17…09-22). Same
pre-registered contrast, **first-entry grade only**, `gain_open_30_pct`:

    POS (LEGIT_POS∪STRONG)      n=155   median 5.16%
    CMP (MOD∪WEAK_NEG∪NONE)     n=693   median 2.63%
    POS median > CMP median in  19 of 26 sessions   sign test p≈0.029
    paired session diff  mean +6.68pp  sd 17.32  t=1.97 (df 25)  p≈0.06

> **CORRECTED VERDICT (part a), 26 sessions: WEAKLY DETECTED.** The direction is
> reliable — the positive class beats the comparison class in ~3 of every 4
> sessions (19/26, p≈0.029) — and the effect size is **stable at ~+6.7pp median**,
> essentially unchanged from the 13-session first-entry read (+6.2pp), so it is
> not shrinking toward zero. But the magnitude test is only borderline (t≈2.0):
> session-to-session variance is high (sd 17.3), so a few sessions with large
> negative gaps keep the mean test from clearing while the direction stays
> robust. **A real but small effect, noisy in size** — a third answer, between the
> look-ahead 13/13 and the underpowered 13-session null, and the honest one.

**What the three reads together say, which is worth more than any one:**

    strongest-seen, 13 sess    13/13   t=6.80    look-ahead — retired
    first-entry,    13 sess     9/13   t=1.01    underpowered — indeterminate
    first-entry,    26 sess    19/26   t=1.97    weakly detected, small, stable size

**Still open:** the magnitude wants more sessions to tighten (it accrues now); and
**part (b) — does the grade's own `confidence` track reality, and does `STRONG`
separate from `LEGITIMATE_POSITIVE`** — is untouched and is the next pre-registered
cut. The second overturn-check (coverage split: is the graded class simply
better-covered in a way that itself predicts the move) is also still owed before
part (a) closes.

## OVERTURN-CHECK C1 — COVERAGE. Run 2026-09-25. Does NOT overturn part (a).

**The instrument was rebuilt from scratch and reproduces the published 26-session
first-entry figures exactly** — nPOS=155, nCMP=693, medians 5.16% / 2.63%, 19/26
sessions, +6.68pp, sd 17.32, t=1.97, exact two-sided sign p=0.0290. Every cut
below uses that same paired-session statistic, so the rows are comparable
line-for-line.

**Coverage inside the contrast population is binary, and that was worth knowing
before designing the test.** The uncovered states (`NOT_ANALYZED` 592,
`ANALYSIS_FAILED` 18, `COLLECTING_SOURCES` 6, `ANALYZING` 5) carry **only**
null/UNKNOWN grades — already excluded by the pre-registration. So every graded
name is either `INTELLIGENCE_AVAILABLE` (599) or `PARTIAL_INTELLIGENCE` (249),
and the check is a two-way stratification rather than a covered/uncovered one.

**Pre-registered overturn criterion, stated before running:** part (a) is
overturned if the larger stratum's sign count falls to <=13/26 or the gap
collapses below +2pp.

    stratified on intelligence_status at FIRST ENTRY
    INTELLIGENCE_AVAILABLE   nPOS=121 nCMP=478   17/25   +6.99pp  sd 15.75  t=2.22   sign p=0.108
    PARTIAL_INTELLIGENCE     nPOS= 34 nCMP=215   13/19   +5.95pp  sd 21.53  t=1.20   sign p=0.167
    coverage ALONE (grade ignored, AVAILABLE vs PARTIAL)
                                                 20/26   +2.36pp  sd  7.45  t=1.61   sign p=0.0094

> **NOT OVERTURNED. The grade effect survives holding coverage constant, at the
> same size in both strata** — +6.99pp and +5.95pp against the pooled +6.68pp.
> **If coverage drove it the gap would concentrate in one stratum; it does not.**
> Coverage is ruled out as the driver of part (a).

**But coverage is itself a predictor, and its DIRECTION is more reliable than the
grade's.** Better-covered names beat partially-covered ones in **20 of 26
sessions (p=0.0094)** — a tighter sign result than the grade contrast's own
19/26 (p=0.029) — while being **a third the size** (+2.36pp against +6.68pp) and
not clearing the magnitude test (t=1.61). **Recorded as a finding in its own
right, not as a caveat:** "was this name researched at all" carries direction
information about the 09:30-10:00 move. It does not dissolve the grade result,
because the grade result is measured within each coverage level, but any future
cut that compares graded classes across different coverage mixes inherits it.

## OVERTURN-CHECK C2 — DECISION-TIME AVAILABILITY. New, not previously owed.

**The census raised this before the coverage check could be written.** "First
board entry" is not the same as "available before the window being predicted".
**310 of the 848 graded ticker-days (37%) had their first entry AFTER 09:30 ET**
— 193 via `NEXT_DAY_RECAP` (runs ~22:00 ET), 98 via a post-window `RTH_INTERVAL`,
19 via `RTH_CLOSE`. Their grade could not have been on the screen during the
09:30-10:00 move it is scored against. **This is the same look-ahead channel the
2026-09-23 retraction closed, one level down: the retraction fixed "strongest
grade seen" and left "first entry, whenever that was".**

Cut at `started_at < 13:30Z` (09:30 ET; every date 08-17..09-22 is EDT, UTC-4):

    BEFORE window   nPOS=104 nCMP=434   15/24   +15.23pp  sd 34.22  t=2.18  sign p=0.308
    AFTER  window   nPOS= 51 nCMP=259   16/23   + 7.99pp  sd 25.85  t=1.48  sign p=0.093

> **NOT OVERTURNED, and it cuts the opposite way to the worry that prompted it.**
> If the residual effect were look-ahead, the AFTER group would carry it and the
> BEFORE group would be flat. **The BEFORE group's gap is more than twice as
> large (+15.2pp against +8.0pp).** The grade that was genuinely on the screen
> before the window separates outcomes harder than the one assigned after it.

**What C2 costs, and it is the honest half:** splitting 26 sessions into 24 and 23
destroys the direction statistic that was part (a)'s strongest evidence. **No
sub-population clears the sign test on its own** (p=0.31 and p=0.09). The
magnitude t holds up (2.18) and the effect size roughly doubles, but session
medians on ~4 POS names a session are noisy. **This is power, not absence** — the
two cuts disagree about which statistic is convincing, and neither is a null.

**The BEFORE population also moves more in absolute terms** (medians 9.98% /
5.40% against 2.78% / 1.55%), which is a population fact rather than a grade
fact: names boarded premarket are the gappers.

> **VERDICT, part (a): WEAKLY DETECTED stands, and both owed overturn-checks are
> now run and neither overturns it.** The corrected reading after C1 and C2:
> **a small, real effect of roughly +7pp on the pooled population, concentrated
> in (and roughly doubled within) the names graded before the window, not
> explained by research coverage.** What would still overturn it: an outcome
> window chosen after seeing these results, or a session-weighting that upweights
> the six sessions carrying the largest gaps. **Part (a) is clear to close on
> this; Q14 as a whole does not close until part (b) is settled.**

## PART (b) IS NOT RUNNABLE AS THE HANDOVER DESCRIBED IT. 2026-09-25.

**The opening prompt told this seat part (b) was newly runnable "now that 26
sessions give more than the n=8 STRONG had". It is still n=8.** Measured:

    ticker-days in the 26-session extract        1,999
    STRONG at any point during the day              20
    STRONG at FIRST entry                            8   (40% of ever-STRONG)
    POS   at first entry                           162   (61% of ever-POS)

    the 194 store-wide STRONG rows are 20 ticker-days re-stamped:
      RTH_INTERVAL 151 | RTH_CLOSE 11 | OPEN_SPIKE 8 | NEXT_DAY_RECAP 7
      PREMARKET_0700 6 | PREMARKET_0645 6 | PREMARKET_0625 3 | STRUCTURAL_REFRESH 2

**The backfill bought nothing here and could not have.** The binding constraint on
the STRONG/LEGITIMATE_POSITIVE split is not sessions — it is that **STRONG is a
1%-of-ticker-days label (20 in 1,999) assigned late in 60% of the cases it is
assigned at all.** Doubling the sessions doubles a number that starts at four.
**Six of 26 sessions carry both classes.** No session-paired test exists on that.

*Descriptive only, and the row is thin — n=8, do not quote it:* median
`gain_open_30_pct` 43.81% for first-entry STRONG against 4.17% for
LEGITIMATE_POSITIVE. **That is eight names. It is printed to show the instrument
runs, exactly as the feasibility table above was, and it is not a result.**

**And the confidence arm has no input in this store at all.** `catalyst.confidence`
(HIGH/MEDIUM/LOW) is **not a column on `desk_assessment_tickers`** — it lives
inside the `dossier` JSON on `research_analysis_versions`, which is in the
**market** DB, not the assessments extract. The newest production market snapshot
on disk is `data/market-prod-2026-08-23.db`: **325 versions spanning 2026-08-17
to 08-21, five sessions**, against the archive's 26. Distribution there is
MEDIUM 156 / LOW 99 / HIGH 70.

> **So part (b) is BLOCKED, in two different ways, and neither is a power problem
> that waiting fixes:**
> - **(b1) STRONG vs LEGITIMATE_POSITIVE — blocked on RARITY, not on sessions.**
>   At ~0.8 first-entry STRONG per session it needs on the order of 100+ sessions,
>   or it is not this instrument's question. **Do not re-propose it after the next
>   backfill; the arithmetic above is why.**
> - **(b2) confidence calibration — blocked on an INPUT THAT IS NOT HERE.** It
>   needs a read-only copy-down of production `research_analysis_versions`, which
>   is **a fresh named exception requiring his by-name word.** It is **NOT**
>   covered by `8f331ed`: that grant names `research_sources`, for the EX-99
>   latency read, a different table for a different measurement. **Resting this
>   request on it would be the spent-exception failure the register already
>   recorded once.**

**What this means for closing Q14.** Part (a) is settled. Part (b) cannot be
settled on the data this desk holds. **The question is whether Q14 closes as
"(a) weakly detected, (b) not answerable without a new pull" or stays open
holding a register slot against a copy-down decision — and that is his call, not
this seat's.**
