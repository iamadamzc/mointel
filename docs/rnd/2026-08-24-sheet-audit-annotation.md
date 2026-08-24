# R&D annotation of the Sheet coverage audit

**For Integration to merge into `docs/sheet-coverage-audit.md`.** Not edited in
place — that table is Integration's. Produced 2026-08-24 against the 64 fields
`lib/data/rows.ts` defines.

`live?` marks a field that is **irreplaceable if not captured in the moment**.
`defs` marks one with more than one possible definition, which by this thread's
rule ships with its basis in an adjacent column.

## The finding, before the table

**`live?` and the PRODUCED/NEW WORK verdict answer different questions, and the
audit only asked one of them.** The verdict says whether the desk could rebuild
the *capability*. `live?` says whether it could rebuild the *history*. A field
can be fully PRODUCED and still have every past value lost forever.

The pattern is clean, and it does not follow the verdict column:

- **Anything derived from bars or filings is not live.** Prices, volumes, cycle,
  levels, prior runs, split history, the whole SEC set. Re-fetchable at any time
  — which is why this archive reconstructed five days of outcomes from a cold
  fetch after the fact, and answered the tier A count from nothing.
- **Anything that is a model judgement is live.** Not because it cannot be
  re-run, but because a re-run gives *a* grade rather than *the* grade. Catalyst
  is 45% not-unanimous over five draws; structure is 55%.
- **Anything that is a vendor snapshot is live.** Float above all — vendors keep
  no history, so an uncaptured float is simply gone.
- **A citation is live even when its target is not.** Which source the desk used
  is an act, not a fact about the world. The URL survives; the choice does not.

**27 of 64 fields are live** — 26 as first published, plus `Q` after the source
report corrected it, and two more possible. The three places where liveness and
verdict come apart are where the risk actually sits:

| Field | Verdict | live? | why it matters |
| --- | --- | --- | --- |
| Catalyst Grade | PRODUCED | **LIVE** | reads safe and is not — the history is unreproducible |
| Cycle Classification | PRODUCED | — | *was* live; arithmetic since `97b4caa`, and now the only classification whose history can be rebuilt |
| Float | NEW WORK | **LIVE** | the worst pair: cannot produce it, cannot recover it |

**Ten PRODUCED fields are live** — J, K, P, W on TODAY and 13, 15, 16, 31, 32,
37 on RESEARCH. Those are the ones a retirement plan reads as safe. They are
not. Retiring the Sheet stops new rows, and for these the old rows cannot be
regenerated from anything.

**On the 65th field.** `rows.ts` defines 64 and item 6 says 65. The audit is
right that finding the missing one is itself an answer, and the shape to expect
is a column the parser does not read — which would mean it has been silently
dropped on every ingest rather than lost in a count. That makes it a live-data
question rather than an arithmetic one, and if the column carries anything the
tasks write, its history is already gone.

## Annotated tables

### Outputs — TODAY!A:AA (27)

| # | Field | Verdict | live? | defs | R&D note |
| --- | --- | --- | --- | --- | --- |
| A | Priority | NEW WORK | **LIVE** | | a judgement made at a moment; nothing re-derives what was thought then |
| B | Ticker | PRODUCED | — | | |
| C | Country of Origin | PRODUCED | — | | SEC, re-fetchable |
| D | Cycle | PRODUCED | — | ✓ | arithmetic from bars; point-in-time recompute verified in `lib/archive/cycles.ts` |
| E | RTH Close | PRODUCED | — | ✓ | auction vs last continuous tick — this archive stores both and they differ on 11% of rows |
| F | AH Price | PRODUCED | — | | |
| G | AH % | PRODUCED | — | ✓ | against which reference close; the desk's own flips at the bell |
| H | AH Volume | PRODUCED | — | | |
| I | **Float** | NEW WORK | **LIVE** | ✓ | vendor snapshot — vendors keep no history and float moves |
| J | Catalyst Grade | PRODUCED | **LIVE** | ✓ | 45% not-unanimous over five draws; a re-run gives *a* grade, not *the* grade |
| K | Catalyst | PRODUCED | **LIVE** | | model prose at a moment |
| L | Catalyst Time | PRODUCED | — | ✓ | event time vs discovery time |
| M | Recent Run High | PRODUCED | — | ✓ | which cycle, and on which share basis |
| N | Flush From High % | PRODUCED | — | ✓ | retracement of the move vs giveback below the high — two different numbers |
| O | Prior Runner | PRODUCED | — | ✓ | threshold-dependent; store the threshold |
| P | Structure Flags | PRODUCED | **LIVE** | | `structureClassification` is 55% not-unanimous |
| Q | Key Levels | PRODUCIBLE | **LIVE** | ✓ | **corrected** — the Sheet's is an AI synthesis (§5, §6.1), not computed levels; see below |
| R | Warning Shot | PRODUCIBLE | **LIVE** | | prose synthesis; a judgement |
| S | Notes | NEW WORK | **LIVE** | | free prose |
| T | PM Price | PRODUCED | — | | |
| U | PM % | PRODUCED | — | ✓ | as AH % |
| V | PM Volume | PRODUCED | — | | |
| W | PM Catalyst/Update | PRODUCED | **LIVE** | | a grade at a checkpoint; see J |
| X | PM Catalyst Time | PRODUCED | — | ✓ | as L |
| Y | Confirmation | NEW WORK | **LIVE** | | a judgement on whether premarket confirmed the thesis |
| Z | Revised Priority | NEW WORK | **LIVE** | | as A |
| AA | PM Warning Shot | PRODUCIBLE | **LIVE** | | as R |

### Outputs — RESEARCH!A:AK (37)

| # | Field | Verdict | live? | defs | R&D note |
| --- | --- | --- | --- | --- | --- |
| 1 | Report Date | PRODUCED | — | | |
| 2 | Ticker | PRODUCED | — | | |
| 3 | Country of Origin | PRODUCED | — | | |
| 4 | Company | PRODUCED | — | | |
| 5 | RTH Close | PRODUCED | — | ✓ | as TODAY E |
| 6 | AH Price | PRODUCED | — | | |
| 7 | AH % | PRODUCED | — | ✓ | as TODAY G |
| 8 | AH Volume | PRODUCED | — | | |
| 9 | **Float** | NEW WORK | **LIVE** | ✓ | as TODAY I — and a filing-derived float is a different word, boundary is a date |
| 10 | Float Source Date | NEW WORK | **LIVE** | | the vintage of a live-captured value is part of the value |
| 11 | Float Source URL | NEW WORK | **LIVE** | | which source was used *then*, not which exists now |
| 12 | Shares Outstanding | PRODUCED | — | ✓ | **confirmed by Research 2026-08-24**: `dei:EntityCommonStockSharesOutstanding` is a **cover-page figure and is NOT retroactively split-adjusted**, so a filed count on a reverse-split name is pre-split and overstates. Re-fetchable, but only usable with its `asOf` beside it |
| 13 | Catalyst Details | PRODUCED | **LIVE** | | as TODAY K |
| 14 | Catalyst Timestamp | PRODUCED | — | ✓ | as TODAY L |
| 15 | Catalyst Grade | PRODUCED | **LIVE** | ✓ | as TODAY J |
| 16 | Catalyst Source URL | PRODUCED | **LIVE** | | the citation is the desk's act, not a fact about the world |
| 17 | Recent Cycle High | PRODUCED | — | ✓ | as TODAY M |
| 18 | Flush From High % | PRODUCED | — | ✓ | as TODAY N |
| 19 | Cycle Classification | PRODUCED | — | ✓ | as TODAY D — arithmetic since `97b4caa`, so no longer live |
| 20 | Cycle Reasoning | NEW WORK | **LIVE** | | prose |
| 21 | Recent Major Runs | PRODUCED | — | ✓ | threshold-dependent |
| 22 | Historical Runner Notes | PRODUCIBLE | **LIVE** | | prose over a produced status |
| 23 | Split History | PRODUCIBLE | — | ✓ | recoverable from raw vs split-adjusted bars — verified over 515 sessions |
| 24 | Daily Resistance | PRODUCIBLE | **LIVE?** | ✓ | probably AI-derived as the input to Q; §5 names "key levels" but not these individually |
| 25 | Daily Support | PRODUCIBLE | **LIVE?** | ✓ | as 24 |
| 26 | 8-K / 6-K | PRODUCED | — | | SEC |
| 27 | Registration / Prospectus | PRODUCED | — | | SEC |
| 28 | Offerings / ATM / PIPE | PRODUCED | — | ✓ | from filings |
| 29 | Warrants / Convertibles | PRODUCED | — | ✓ | from filings |
| 30 | Other Share Structure | PRODUCED | — | | |
| 31 | Structure Source URLs | PRODUCED | **LIVE** | | as 16 |
| 32 | Warning Flags | PRODUCED | **LIVE** | | model-derived; see P |
| 33 | Overall Priority | NEW WORK | **LIVE** | | as TODAY A |
| 34 | Analyst Notes | NEW WORK | **LIVE** | | free prose |
| 35 | Float Quality | PRODUCIBLE | **LIVE** | ✓ | inherits float's liveness |
| 36 | Overhang / Float | NEW WORK | **LIVE** | ✓ | inherits float's liveness; `supplyBound` is a lower bound and asymmetric |
| 37 | Supply Evidence | PRODUCED | **LIVE** | | the ledger re-derives; the citation set does not |

## Counts

| | TODAY | RESEARCH | total |
| --- | ---: | ---: | ---: |
| live | 12 | 15 | **27** of 64 (+2 possible: RESEARCH 24, 25) |
| defs | 12 | 17 | **29** of 64 |

`defs` largely agrees with the audit's own pre-marking. Where this thread added
one it is because the field has already bitten here: `RTH Close` differs from
the auction close on 11% of rows in this archive, and `Flush From High %` is two
different numbers — retracement of the move against giveback below the high.

## Checked against the source report, and it corrected me

*`docs/sheet-data-report-2026-08-22.md`, committed 2026-08-24. First outside
account of the workbook. Read against this annotation rather than taken from a
relay, because its §5 arrives at the same distinction independently and a
disagreement between two independent classifications is a finding.*

### One correction to my own column, and it is the error I keep making

§5 lists **key levels** under *Analyst/AI-derived*, and §6.1 confirms `Q` is
*"relevant support, resistance, current-cycle high, and split-aware historical
levels in one concise cell"* — a synthesis, not a computation.

**`Q` is LIVE and I marked it not-live.** The mistake is the same one this thread
has caught twice elsewhere: I annotated what the field would *become* — the
desk's `priceLevels` replacement, which is computed — rather than what the Sheet
actually holds. `live?` is a question about the existing history, and the
existing history is a model's synthesis.

`24` and `25` are probably the same and are marked `LIVE?` rather than moved:
§6.4 calls them *"detailed daily levels underlying the concise TODAY ladder"*, so
they are Q's inputs, but §5 names only "key levels" and does not list them
individually. **Flagged rather than guessed** — Research or whoever owns the
Sheet can settle it in one look.

That takes the count from 26 to **27 live, possibly 29**.

### Three places the two classifications disagree, and all three are float

§5's split — direct observation / filing fact / deterministically calculated /
reconciliation / analyst-derived — is the same instinct as `live?`, and on most
fields the two agree exactly. Where they part, they part on the same field:

1. **Float sits under *Filing/reference fact*, alongside SEC forms and split
   history.** That grouping implies it is re-derivable from a filing. **The
   vendor-displayed float is not a filing fact** — the report's own §4.3 shows
   `stockanalysis.com` at 505 citations, a vendor, and vendors keep no history.
   This is exactly the Phase C problem: a filing-derived float will not equal
   this number, and the taxonomy that files them together is what makes the
   difference easy to miss.
2. **`Overhang / Float` sits under *Deterministically calculated before
   write*.** It is — from an input that is live. **Their taxonomy classifies by
   how a value was produced; `live?` has to propagate through the calculation**,
   because a deterministic function of an unrecoverable input is unrecoverable.
   Field 36 is marked live here for that reason.
3. **`Float Quality`** is the same shape as 2.

So the two classifications agree on everything except the one field the desk is
actively arguing about, and they disagree because one asks *what kind of thing
is this* and the other asks *can I get it back*. Neither is wrong; only one of
them answers the retirement question.

### The 65th field: the report says 64, and the real gap is 16 columns

Counting §6.4 directly — identity 8, float 4, catalyst 4, cycle and runner 7,
levels 2, filing and supply 6, conclusions 3, dirty-float retrofit 3 — gives
**exactly 37**, matching `A:AK`. §6.1 is `A:S` = 19 and §6.2 is `T:AA` = 8,
giving **27** for TODAY. **27 + 37 = 64.** An independent source confirms
`rows.ts`; the 65 is a miscount and there is no missing field.

**But §6.3 is a separate 16-column 9:25 section that is not part of `A:AA` at
all** — decision, PM snapshot, opening thesis, must-hold, invalidation,
spread/liquidity, supply risk, opening plan. It is outside the 64, it is written
by a **paused** task, and it is almost entirely analyst-derived, which makes it
live by every criterion here.

So the audit's scope gap is not one field. It is a 16-column surface plus the
dated tabs, and both stopped on 2026-08-23.

## Are any of the ten written only by a paused task?

*Asked by Integration 2026-08-24, before recording the finding as settled: if a
live field's only writer is already paused, its history stopped accumulating on
2026-08-23 and "deciding late and deciding no are the same thing" has already
resolved to **no** — a post-mortem rather than a decision.*

**No. All ten are written by tasks that are still running.**

| Range | Columns | Writer | State |
| --- | --- | --- | --- |
| `TODAY!A:S` | 1–19 | 22:00 After-Hours Recap | running |
| `TODAY!T:AA` | 20–27 | 06:10 Premarket Confirmation | running |
| `RESEARCH!A:AK` | all | tasks 1 and 2 — 22:00 and 06:10 | running |

The ten map as `J`=10, `K`=11, `P`=16 into `A:S`, and **`W`=23 into `T:AA`** —
which is the 06:10 Premarket task, still running. That also reads correctly on
its face: `W` is *PM Catalyst/Update*, a premarket field written by the
premarket task. The six RESEARCH fields are covered by the earlier confirmation
that RESEARCH is written by tasks 1 and 2 only.

So the finding stands as a decision rather than a post-mortem, and the sentence
survives unchanged.

### But something has already resolved to "no", and the audit does not cover it

The two paused tasks — 09:25 Opening Spike and 16:15 Close & Learn — write
neither `TODAY` nor `RESEARCH`. They write the **dated tabs**, which hold the
stage calls *as made* at 22:00, 06:10 and **09:25**, alongside what actually
happened.

Both of those paused components are on the dated tabs:

- **the 09:25 stage call** stopped on 2026-08-23
- **the outcome column beside it** stopped with Close & Learn

So the dated tabs have lost two of their four parts and continue to accumulate
the other two. **A forecast recorded before its outcome is the category the
archive spec calls irreplaceable**, and half of that record stopped three days
ago.

**This is outside the 64.** The inventory covers `TODAY!A:AA` and
`RESEARCH!A:AK`; the dated tabs are neither, so no annotation of mine reaches
them and no `live?` mark protects them. That is a gap in the audit's *scope*
rather than in its verdicts — worth saying plainly, because a 64-field audit
signed off as complete is exactly the artefact someone later reads as covering
everything the Sheet holds.

Nothing here argues against the pauses. It argues that the retirement question
and the pause question have different boundaries, and only one of them has been
mapped.

## Can the paused tasks be rebuilt? Mostly — and the loss is on the wrong variable

*Integration asked for a read before settling an answer for the trader, having
verified that the desk already runs its own 09:25 checkpoint and that
`deriveOutcome` covers most of what Close & Learn computes.*

**The framing correction is right and I would make it downward.** These are not
capture questions. But two precisions first, one of which matters.

**Close & Learn's leader rule is computable from stored columns today — not
re-derivable, already there.** Its rule is *maximum gain from the prior RTH
close between premarket and 4:00 PM*. That is
`max(premarket_high, rth_high) / reference_close`, and all three columns are in
`symbol_outcomes` on 243 rows. It is a `SELECT`, not a fetch.

**But `max_gain_pct` is the wrong column for it, and by more than a rounding.**
`max_gain_pct` runs the full 04:00–20:00 session. **17 of 95 movers peaked after
16:00 ET**, so using it would overstate the leader gain on 18% of the names the
rule is about — and **47 of 95 had their premarket high above their RTH high**,
so dropping premarket would be worse still. The rebuild is exact only if the
window is rebuilt with it.

### The three items

**1. The tasks' own judgement — build nothing, and do not rent it either.**
Spike/chop/flush framing is not a missing feature; it is **Q7**, already in this
register as a measurement question routed here by the desk owner. Resuming a
task to obtain a model's opinion on it would put an unvalidated label in front
of the trader ahead of the measurement that would tell anyone whether the label
means anything. The desk's existing judgement fields are already 45% and 55%
not-unanimous; another is not what it needs.

*One exception, and it is cheap.* **"Grades decision usefulness"** is
outcome-grading, and grading the desk's own calls against tape-derived outcomes
is a query over `symbol_desk_day` and `symbol_outcomes` — no task, no model.
Already noted when Task 4 was retired; it stands.

**2. The second grader — the loss is real and it is on the wrong variable.**
This is the item that would be mine to want, and the honest answer is that the
grader worth having was never lost.

- The catalyst second opinion lives on **`RESEARCH`, written by the two tasks
  still running.** That is the comparison Q1's verdict could actually use, and
  it is unaffected.
- What the paused pair provided was a second opinion on **outcomes and decision
  quality** — graded by the same process that made the forecasts, against
  outcomes this archive already measures from the tape and measures better.

So: a genuine independent grader is valuable to this thread, and the one that
stopped is the one whose measurements this archive supersedes.

**3. `PATTERNS` — do not resume it, but read it once before it goes stale.**
Seven maintained rows of aggregate learning, self-graded over self-produced
outcomes, so the *evidence* behind them compounds the weakness above. But the
**hypotheses** are cheap and this thread is short of them: P1–P6 is a list of
things a process watching this market for weeks thought were worth tracking.
**It is not a learning layer to preserve; it is a list of candidate questions to
harvest** — which is exactly what the standing sweep in this charter is supposed
to produce and has not yet been built to. P6, the Dirty Float series, is the one
with live content, and that subject has already moved to the desk.

### The read, in one line

**Not a capture question, a second-opinion question — and of the three second
opinions, the one worth having is still running.** Correcting downward is right.

## What this does not say

It says nothing about whether a field should be kept. A live field that nobody
will ever ask a question about is still not worth capturing, and that judgement
needs the question, not this column. What `live?` establishes is only the
**order of the decision**: for the 26, deciding late and deciding no are the same
decision, and for the other 38 they are not.
