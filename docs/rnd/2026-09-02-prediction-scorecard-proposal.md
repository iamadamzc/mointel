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
