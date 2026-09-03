# Prediction scorecard — results, 2026-08-17 → 09-02

**Run against the rules fixed in
[the proposal](2026-09-02-prediction-scorecard-proposal.md) before any of this
window was read.** Runner `e9643b3`, committed before the extract landed.
Thresholds unchanged since. **Nothing below moved a rule to fit a number.**

**Data:** 939 symbol-days over 13 sessions, from Ops's extract
(226 assessments, ids 1–227, one gap at id 2, 5,625 ticker rows — id range
stated so it can be told from a recount). **The baseline window reproduces
exactly after the backfill**: 30.1 / 38.9 / p75 15 / 6.85 / 69.0 / 0.15 vs 0.11,
every published figure unchanged.

---

## The card

| | measure | value | baseline | verdict |
| --- | --- | ---: | ---: | --- |
| **S1** | Board timeliness | 30.0% | 30.1% | no detectable change |
| **S1m** | — movers only | 41.0% | 38.9% | no detectable change |
| **S2** | Time to intelligence, p75 | **0 min** | 15 min | **IMPROVED** |
| **S3** | Catalyst separation | **+14.9pp** | +13.2 CI | **IMPROVED** |
| **S4** | Coverage honesty | 73.3% | 69.0% | no detectable change |
| **S5** | Grade freshness, carried | **14.3%** | 10.2% | **REGRESSED** |

**Two improved, one regressed, three unchanged.** The pre-registered expectation
was that most would return no detectable change; three did, and the two that
moved cleared thresholds set before the data existed.

---

## S3 is the result, and it overturns half of Q1

**The catalyst grade now separates movers from non-movers, decisively.**

    field            movers          non-movers      gap      Fisher 2-sided
    catalyst_first   26/179  14.5%    54/509  10.6%   +3.9pp   p = 0.18
    catalyst_last    46/179  25.7%    62/509  12.2%  +13.5pp   p = 0.00004
    catalyst_best    51/179  28.5%    69/509  13.6%  +14.9pp   p = 0.00002

**The baseline window found nothing at p = 0.51 on n = 211. This window finds it
at p = 0.00002 on n = 688.**

**And the widening is entirely on the mover side**, which is what makes it a
finding about the market rather than about grading:

    movers      20.2%  ->  28.5%    +8.3pp
    non-movers  13.4%  ->  13.6%    +0.2pp

### The confound I expected, and it runs the other way

S5 regressed, and its guard fired: **grade staleness became differential** —
movers mean age 0.07 sessions against non-movers 0.44, carried 5.6% against
17.1%. Q1's attenuation ceiling assumed non-differential error, so **that
assumption no longer holds**, and my first reading was that fresher grades on
movers would inflate S3.

**Tested rather than assumed. It deflates it.** Restricting to grades produced
the same session — which removes the differential entirely:

    all admissible            movers 28.5%   non-movers 13.6%   +14.9pp   p = 0.00002
    SAME-SESSION GRADES ONLY  movers 32.7%   non-movers 14.8%   +17.9pp   p < 0.00001
    carried grades only       movers  0.0%   non-movers  4.8%    -4.8pp   p = 1.00 (n=9)

**Stale grades dilute the signal, exactly as attenuation predicts. +14.9pp is a
FLOOR, not a ceiling.** The clean-measurement estimate is **+17.9pp.**

### What this does to Q1's verdict

**Q1 closed as `PILLAR_4_STRONG_FORM_EXCLUDED` with an attenuation-corrected
ceiling: *the largest true difference consistent with the data is about +19
points.*** It also said, in the same breath, *a weak relationship is not
excluded and nothing here says catalysts are irrelevant.*

> **The clean-measurement estimate eight sessions later is +17.9pp, against a
> predicted ceiling of +19pp.**

**The bounded negative held, and its ceiling was very nearly exact.** Two halves
of the verdict now separate:

- **The strong form stays excluded.** Pillar 4 calls a breaking-news catalyst
  *non-negotiable*, which implies something near-total. **+17.9pp is not that**,
  and 67% of movers still carry no legitimate-positive-or-stronger catalyst.
- **The "no detectable relationship" half is SUPERSEDED.** There is a
  relationship, it is moderate, and it is now measured rather than bounded.

**This is what a bounded negative is for.** Had Q1 concluded *catalysts do not
matter*, this window would have refuted it. It concluded *the strong form is
excluded, a weak relationship is not*, and **the follow-up landed inside the
interval it published.** The two limits that were required to travel with that
verdict are the reason it survived contact with three times the data.

---

## S2 improved on both halves, which is the harder thing

    p75 minutes to first grade   15  ->  0
    never-graded share         31.0%  ->  26.7%

**The guard mattered.** S2 would have reported improvement on a falling p75
alone, and a p75 that falls because fewer names get graded is not an
improvement. **Both moved the right way**: grades arrive faster *and* reach more
names.

## S5 regressed, and it is the one to watch

    carried share   10.2%  ->  14.3%
    mean age        movers 0.07   non-movers 0.44   differential 0.37

**More grades are now carried rather than produced**, and the staleness has
become **outcome-dependent**. It does not damage S3 — the opposite, as above —
but it breaks an assumption Q1 relied on, and **a differential that helps one
measure can hurt the next one.** The guard is doing its job; the finding is that
non-movers are being revisited far less often than movers.

## S1 did not move, and that is its own answer

**30.0% overall against a 30.1% baseline** — a tenth of a point over eight
additional sessions. Movers 41.0% against 38.9%; four of eleven trendable
sessions cleared the bar, and the rule required eight.

**Seven of ten board names still peak before the desk surfaces them.** Two weeks
of sessions and the number has not moved at all. **The board's lateness is not
drifting — it is stable**, which is a stronger statement than the single-window
verdict could make, and a worse one for the desk.

## S4 did not clear, and moved the right way underneath

**73.3% admissible against 69.0%, needing 79.0%.** `UNKNOWN_HONEST` rose from
17.65% to 19.91% — **the pipeline is not buying its admissible share by grading
names it should be calling unknown**, which is the failure S4's guard exists to
catch. Under the threshold; honest underneath it.

---

## Holes, as pre-registered

**08-20 and 08-27 are plotted and excluded from every trend**, as declared before
the window was read. Ops's sweep verified 08-27 → 09-02 clean, discharging the
third hole. **No rule was changed after the run.**

**The prior-free five-draw modal — S3's fourth definition — is not recomputed
here.** It exists only for the baseline window, and its absence is stated rather
than allowing the band to quietly become three. **The band as reported is
+3.9 / +13.5 / +14.9pp**, and the honest summary is *two of three stored
definitions clear the bar, the earliest-grade definition does not.*

---

## Regime boundary — everything above is PRE-fix

**Window 2 deploys 2026-09-03 (`97f5fbd`), carrying the re-trigger clock and
rotation fix. It changes S5's mechanism from that night.** Non-movers holding
`UNKNOWN` dossiers become re-askable at most once per ten minutes — aimed
directly at the differential staleness S5 flagged above.

> **Every figure in this document is measured through 2026-09-02, before that
> deploy. Any reading after 09-03 is a different mechanism and must not be
> trended through this boundary.**

**AND THE CONSEQUENCE FOR S3 IS THE PART THAT WOULD OTHERWISE BE MISSED.** S3's
measured gap is *diluted* by stale grades — that is the finding above, +14.9pp
all-admissible against +17.9pp on same-session grades only. **The fix reduces
staleness. So it will raise S3's measured gap by removing dilution, with no
change whatever in the underlying relationship.**

**Pre-registered now, before the next window exists:**

| | |
| --- | --- |
| **Predicted artifact** | S3's all-admissible gap rises toward the clean-measurement figure, **up to about +3pp (14.9 → ~17.9)**, purely mechanically. |
| **How to read it** | **An S3 rise of that size after 09-03 is evidence the fix worked, not evidence that catalysts matter more.** Only a rise *past* the same-session estimate would be a new finding about the market. |
| **The check** | Recompute the same-session-grades-only figure each window. **If it holds near +17.9pp while the all-admissible figure climbs to meet it, the movement is entirely measurement.** |

**S5 improving after 09-03 is likewise attributable to a specific change rather
than to the desk getting better in general** — which is the whole reason to
record the boundary while it is still one day old rather than reconstruct it
later from a series that looks odd.
