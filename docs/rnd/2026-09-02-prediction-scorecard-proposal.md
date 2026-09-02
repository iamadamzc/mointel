# Prediction scorecard — proposal, before looking

**Commissioned by the trader, 2026-09-02, through Integration:** score the
desk's prediction progress over the full record, 2026-08-17 → 09-02.

**This document defines the instruments and fixes every decision rule. It
contains no results.** That order is the point: a rule chosen once the numbers
are looking back at you is not a rule, it is a rationalisation with a date on
it. **Nothing here may be revised after the run except by a dated amendment that
says what changed and why.**

---

## What makes this scorecard unusually honest, and it is an accident

**The baselines were published before this commission existed.** Q1's contrast,
Q5's verdict and the coverage classification were all computed and committed over
2026-08-23..27 against the 08-17..21 window, with no knowledge that a progress
measure would be asked for. **They cannot have been tuned to make a trend
appear.** Every measure below states its pre-registered baseline and its source
commit.

**And I am blind to most of the record while writing this.** The local store
holds **2 dates of assessments and 5 dates of outcomes**; the commission covers
roughly 13 sessions. **I cannot see 08-22 onward and will not until the extract
runs.** Define-before-looking is not discipline here, it is circumstance — but
it makes the pre-registration real rather than declared.

---

## The five instruments

Each states: **what the desk predicts**, the measure, the denominator, the
decision rule fixed in advance, and the window.

### S1 — Board timeliness. *Does the desk surface a name before its move?*

**The prediction.** Putting a name on the board asserts *this is worth your
attention now.*

| | |
| --- | --- |
| **Measure** | Share of board symbol-days whose session peak occurs **after** first board entry. |
| **Denominator** | Board symbol-days carrying both `first_board_entry_at` and `time_of_max_gain`. |
| **Baseline** | **30.1%** (92 of 306), 08-17..21, `c5691f8`. Movers only: **38.9%** (37 of 95). |
| **Decision rule** | Fixed now: **improvement is the share rising by ≥10 points against baseline on ≥8 sessions.** Anything smaller is reported as no detectable change. |
| **Window** | Per session, trended; peak measured over the full 04:00–20:00 tape. |

**Why the threshold is that large:** 13 sessions of ~25 names is a small sample
and a 5-point move is inside noise. **Setting the bar before the run is what
stops a 4-point wobble becoming a headline.**

### S2 — Time to intelligence. *How long from surfacing to a usable grade?*

| | |
| --- | --- |
| **Measure** | Median minutes from `first_board_entry_at` to `catalyst_first_at`. |
| **Denominator** | Board symbol-days that ever received a non-null catalyst grade. **Names never graded are excluded from the median and reported separately as a count** — folding them in as infinity, or dropping them silently, are both wrong. |
| **Baseline** | **Not yet computed.** To be measured on 08-17..21 *before* the later sessions are read, and recorded here as an amendment. |
| **Decision rule** | Improvement is a **≥25% fall in median** with the never-graded share not rising. |
| **Window** | Per session. |

### S3 — Catalyst grades against movers. *Does the grade separate the outcome?*

**The prediction being scored is separation, not rate.** The share of movers
carrying a catalyst is a fact about the market; **whether the grade distinguishes
movers from non-movers is a fact about the desk.**

| | |
| --- | --- |
| **Measure** | Percentage-point gap in `LEGITIMATE_POSITIVE`-or-stronger between 50%+ movers and non-movers. |
| **Denominator** | Admissible symbol-days only — coverage `GRADED` or `UNKNOWN_HONEST`. `FAILED`, `NO_LOOK`, `IN_FLIGHT` excluded and counted. |
| **Baseline** | **+3.3pp** (16.7% vs 13.4%), prior-free five-draw modal, n=84/127, p=0.51 — `52b1d3f`. Stored-column variants: **+0.5 / +4.5 / +6.9pp**, none significant. |
| **Decision rule** | **Quote the band across all four definitions, never one row.** Improvement requires the gap exceeding **+13.2pp** — the upper bound of the baseline's own 95% CI — on the pooled window. |
| **Window** | Pooled across all sessions, not per-session; per-session n is far too small. |

### S4 — Coverage honesty. *Is the pipeline getting more reliable?*

**The one measure of the desk's own machinery rather than its judgement.**

| | |
| --- | --- |
| **Measure** | Share of looks classified `GRADED` or `UNKNOWN_HONEST`, against `FAILED` / `NO_LOOK` / `IN_FLIGHT`. |
| **Denominator** | All board symbol-day checkpoints in the window. |
| **Baseline** | To be recomputed on 08-17..21 before later sessions are read. |
| **Decision rule** | Improvement is the admissible share rising **≥10 points**, with **`UNKNOWN_HONEST` not falling** — a pipeline that grades more by guessing more is worse, not better. |
| **Window** | Per session. |

### S5 — Grade freshness. *Is a grade produced, or carried?*

| | |
| --- | --- |
| **Measure** | Median `grade_age_sessions`, and the share at age 0. |
| **Denominator** | Symbol-days carrying an analysis version, uncensored rows only. |
| **Baseline** | Movers **0.15**, non-movers **0.11** sessions — `52b1d3f`. |
| **Decision rule** | Improvement is the age-0 share rising ≥10 points. **The mover/non-mover difference must also be re-checked: if staleness becomes differential, Q1's attenuation ceiling stops holding** and that is a finding regardless of direction. |
| **Window** | Per session. |

---

## What is deliberately NOT scored, and why

**Cycle labels against subsequent tape.** This archive cannot answer it. The
cycle is computed from the same daily bars the outcome is measured from, and my
register already records the consequence: *nothing about cycle predicting
outcomes should be quoted from this archive.* **Proposing it would contradict a
constraint this thread wrote down, and a circular measure that produces a tidy
number is worse than no measure.**

**The news one-cell miss filter.** I do not know this instrument well enough to
define its denominator, and **a measure whose denominator I am guessing at is
how five of today's errors happened.** Integration or Design should supply the
definition, or it stays out.

**Anything requiring sub-minute resolution.** A hold is seconds long. Nothing
here claims to score entries or exits, and no minute-grain measure should be
read as doing so.

---

## Known holes, stated in advance rather than discovered

- **2026-08-20 is a half day** of `ticker_session`. Any per-session rate on that
  date is computed on a partial denominator and **must be plotted but not
  trended through.**
- **2026-08-27 has roughly 40 thin premarket minutes** from the deploy incident.
  Same treatment.
- **The last six sessions are unverified** until Ops's integrity sweep reports.
  **No verdict ships before it does.**
- **The archive reaches 08-21.** Everything later needs the backfill re-run.
- **13 sessions is a short record.** **The pre-registered expectation is that
  most of these return "no detectable change."** That is a result, not a
  disappointment, and the thresholds above are set so a null is reportable rather
  than embarrassing.

---

## What it needs to run

1. **A production assessment extract**, five dates and onward — `npm run archive:export`, read-only. *Ops. Also unblocks Q6.*
2. **The outcome backfill re-run** over 08-22 → 09-02 to extend `symbol_outcomes` and `symbol_desk_day`. *Mine, once the extract lands.*
3. **Ops's integrity sweep result** before any verdict.

**Nothing here is blocked on a build.** The instrument exists and has run; it
needs data it does not have.

---

## The one commitment that matters

**These rules are fixed as of this document.** If a measure comes back at +9
points against a +10 threshold, **it is reported as no detectable change** — and
the temptation to call it "approaching significance" is the exact failure this
document exists to prevent. **A scorecard whose thresholds move after the run
measures its author, not the desk.**

---

## Amendment 1 — 2026-09-02, after Ops's integrity sweep

**Amendments are dated and additive. Nothing above has been edited.**

**The six unverified sessions are VERIFIED CLEAN.** 19/19 checkpoints complete on
every trading day 08-27 → 09-02, recaps `asked == queued` all six nights
including the Friday→Monday rollover, `ticker_session` 8,657–8,745 rows/day with
no half-day class. **The pre-registered hole "no verdict ships before the sweep
reports" is discharged.** The two remaining holes stand unchanged: **08-20 half
day, 08-27's thin premarket — plotted, not trended through.**

**Imported caution: `daily_bars` has a recency slope BY DESIGN.** Backfill-on-
demand via `ensureDailyHistory` means each date climbs toward ~620 as
interpretation touches symbols. **The plateau is the healthy signal; the slope is
an artifact.** A count that grows across the window by construction is the
perfect fake trend for a progress scorecard.

**Checked: none of S1–S5 touches it.** `worker/archive-backfill.ts` fetches raw
minute and daily bars over REST and never reads `daily_bars` — the reason is
documented at its line 16, that the table is a research-cycle artifact populated
only for symbols that got a cycle analysis. **So no measure here has a
backfill-on-demand denominator.** Recorded because the check is cheap and the
next instrument added to this scorecard may not be so lucky.

> **A general guard, fixed with the rest: no measure whose denominator grows by
> backfill-on-demand may be trended. Report its plateau or leave it out.**

## Amendment 2 — run the instrument where the data is

**The extract exists.** It ran on 08-27 and sits on the server: 9 dates,
08-17→08-27, 136 assessments, 3,375 ticker rows. **Its copy-down was refused by
Ops's permission classifier, consistent with the trader's do-not-copy-data-down
instruction, and Ops stopped rather than route around it. That is the correct
outcome and I am not asking for an exception.**

**So invert it: move the instrument, not the data.**

`worker/archive-backfill.ts` already takes `--market-db` and `--archive`. It
reads the market store **read-only** and writes a separate archive file. **It can
run entirely on the server.** Then either the derived archive comes down — no
raw dossier text, no assessment bodies — or, better, **nothing comes down but
the numbers.**

**That requires the scorecard runner to be written BEFORE anyone sees the data,
which is the strongest form of the pre-registration this document already
claims.** The constraint improves the method rather than obstructing it: **a
scoring script written blind, run by someone else, returning only aggregates,
cannot have been tuned to its result.**

**Not started.** It is a real build and the instruments above are still with the
trader; if he changes a measure the runner changes with it. **Sequence: he
approves or amends the five instruments, then the runner is written to them,
then Ops runs it.** Asking otherwise would be building against a spec that is
still a proposal.

## Amendment 3 — baselines computed, and one decision rule was broken

**Computed on 08-17..21 before any later data exists, as Amendment-0 promised.
The extract has not landed. Nothing below could have been tuned to a result.**

### S2 baseline — and the rule it breaks

    graded n=211   never-graded n=95   never-graded share 31.0%
    minutes board-entry -> first grade:  p25 0   MEDIAN 0   p75 15
    graded BEFORE board entry: 0

**The median is ZERO.** A grade is typically already present at the moment a name
is surfaced — carried from a prior analysis rather than produced on surfacing,
which agrees with S5's freshness picture from the other side.

> **So S2's pre-registered rule — *a ≥25% fall in median* — is UNDEFINED. You
> cannot fall 25% from zero.**

**Amended, and this is why the baseline had to be computed first.** The
discriminating statistics here are the **p75 (15 min)** and the **never-graded
share (31.0%)**:

| | |
| --- | --- |
| **Decision rule, replacing the above** | Improvement is **p75 falling ≥25% (15 → ≤11 min)** *and* the **never-graded share not rising** above 31.0%. |
| **Reported alongside** | The median, so a shift off zero is visible if it happens. |

**A rule that cannot be evaluated is worse than a lax one, because it looks
rigorous until someone tries to apply it.** It was caught by keeping a promise
this document made about ordering, not by care.

### S4 baseline

    GRADED           157   51.3%
    NO_LOOK           65   21.2%
    UNKNOWN_HONEST    54   17.6%
    FAILED            20    6.5%
    IN_FLIGHT         10    3.3%
    ADMISSIBLE               69.0%

**Rule stands as written**: improvement is admissible rising ≥10 points, to
**≥79.0%**, with `UNKNOWN_HONEST` **not falling below 17.6%**.

## Amendment 4 — method chosen, and it is not the one I argued for

**The trader approved the copy-down as a specific exception, and left the
server-side blind runner available. Both are permitted, so the choice is mine on
method strength.**

**I argued I would take the blind runner even if the copy-down were approved. I
am not taking it, and the reason is today's record rather than a change of
principle.**

**My instruments have been wrong on first contact repeatedly** — the float
extractor took three passes, each fixing a hand-checked case and introducing
another; the store comparison was wrong twice. **A blind runner returning only
aggregates gives me no way to see that a denominator collapsed or a join missed.
It would produce a confident number with no tell**, which is the exact failure
mode this desk has spent two days cataloguing.

**What preserves the pre-registration without that risk: commit the runner
BEFORE the data arrives.** The commit timestamp is the proof, verifiable by
anyone, and it does not depend on my never having seen the data afterwards.
**A script committed before the extract lands cannot have been tuned to a result
that did not yet exist** — and it can still be debugged when its denominators
look wrong.

**The runner will also emit diagnostics beside every aggregate** — denominators,
null counts, dates covered, rows dropped. **Today's errors were all invisible in
the headline number and obvious in the input.**
