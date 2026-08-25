# Outcome capture and the coverage baseline

**Dated 2026-08-23.** First entry in the R&D findings log. Covers step 1 of
[../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — outcome capture with a backfill — and
the coverage measurement that has to precede any conclusion about catalysts.

**The production extract landed the same day and the backfill has run over it:
306 symbol-days across 2026-08-17 to 08-21, every one with bars.** Nothing here
closes Q1. One week is not a verdict. But there is a first piece of real
evidence for one of its four hypotheses, and the outage caveat the whole thing
was built around turns out not to bite the way anyone expected.

Sections written before the extract arrived have been left in place and marked,
rather than rewritten to look prescient.

> **RETRACTED, same day. The contamination finding did not survive a larger
> sample, and what replaced it is worse for Q1.** The catalyst grade is not
> reproducible run to run for roughly a third of names — noise rather than bias,
> and noise cannot be subtracted. Worse, measurement error in the independent
> variable biases any association toward zero, which is Q1's own hypothesis. See
> *Provenance — retracted, and the real problem is noise*.
>
> The split-timing result, Q5, coverage and everything else derived from market
> data are unaffected. What is suspended is Pillar 4's catalyst rate and the
> catalyst-definition resolution, both of which read the grade.

---

## What was built

| Piece | Where |
| --- | --- |
| Archive store, separate SQLite file | `lib/archive/store.ts` → `data/archive.db` |
| Outcome derivation from raw minute bars | `lib/archive/outcomes.ts` |
| Research coverage and the desk-day rollup | `lib/archive/coverage.ts` |
| Upserts and run provenance | `lib/archive/repo.ts` |
| Split basis and the lookback | `lib/archive/splits.ts` |
| Grade freshness — `ageCatalystGrades` | `lib/archive/coverage.ts` |
| The assessment extract Ops runs on production | `lib/archive/export.ts` |
| The backfill | `worker/archive-backfill.ts` |
| The extract CLI | `worker/archive-export.ts` |

```bash
npm run archive:coverage
```

Coverage rollup only — no network, no bar fetch, no spend. Run this first.

```bash
npm run archive:backfill
```

The full pass. Reads `market.db` **read-only** and writes only `data/archive.db`,
so it is safe beside a live desk. It uses the REST API, which does not touch the
single permitted SIP connection. `--from` / `--to` bound the range, `--force`
re-derives rows already held, `--market-db` points at another store.

### Why the archive is a separate file

`claimStoreForMode` deletes `desk_assessments`, `desk_assessment_tickers`,
`ticker_session`, `minute_bars` and `desk_events` on a market-mode switch. The
spec calls this a loaded gun pointed at an archive meant to last. Putting the
history in its own file makes the guarantee structural rather than a comment,
and `tests/archive/store.test.ts` asserts it by actually switching modes and
checking the archive survives.

`symbol_desk_day` also mirrors the day-grain summary of the assessment record
for the same reason. The per-checkpoint detail still lives only in `market.db`,
where a mode switch can still destroy it — see *Handed to Ops* below.

---

## Five things the build found that the spec did not anticipate

These cost time. The first four would each have silently corrupted the
analysis; the fifth is the one that turns a hazard into evidence.

### 1. `daily_bars` cannot serve the backfill

The archive spec and the R&D charter both say `daily_bars` is never pruned,
already holds ~100 trading dates, and so outcomes can be backfilled over every
assessment already recorded. That is not what the table is.

`daily_bars` is a **research-cycle artifact**. `lib/research/history.ts` fills it
only for symbols that received a cycle analysis, and only to give the cycle
classifier its 90 days of context. On the store as it stands it holds 75
symbols — the researched ones — and **43 of the 100 assessed symbol-days have no
row in it at all**. It is also `adjustment = 'split'` throughout, so its prices
are on a different basis from the desk's as-seen record.

The backfill therefore fetches raw minute bars from Alpaca instead. That is
strictly better: it yields `time_of_high`, the premarket high, and the
09:30-10:00 and to-11:00 windows, none of which a daily bar can give.

### 2. The desk's reference close flips at the bell

`resolveReferenceRthClose` switches the reference to the **current** session's
close the moment RTH ends. Correct for the after-hours percentage on the board;
fatal for a day outcome. Taking the last reference recorded on a date gives that
date's own close for 62 of 100 symbol-days, which measures a runner that faded
against the price it faded to and reports roughly zero.

The rollup now takes only a `PRIOR_SESSION` reference as the baseline, and keeps
the `CURRENT_SESSION` value separately as `session_close_recorded` — which is
not a baseline for its own row but *is* the baseline for the next session.
Missing baselines are filled in three tiers, each labelled in `reference_basis`:

| Basis | Meaning |
| --- | --- |
| `PRIOR_SESSION` | The desk's own as-seen reference, observed that day. Preferred. |
| `PRIOR_SESSION_CHAINED` | The previous session's recorded close, for a name the desk only saw after the bell. |
| `PRIOR_SESSION_FETCHED` | The prior session's daily bar, raw. For names with no desk history. |
| `PRIOR_SESSION_SPLIT_ADJUSTED` | As above, across a split. See below. |

On the two dates available, 48 rows have an observed baseline and 52 are
recovered from the tape.

### 3. Reverse splits, exactly as the spec warned

Two of the 52 recovered baselines crossed a reverse split. RCON on 2026-08-18
came back with a raw prior close of **$0.0224** against a session that traded
$3.02-$6.70 — a reported gain of **29,811%**. CXAI the same day gave 6,821%.

A ratio heuristic cannot fix this: in this universe a 1:100 reverse split and a
100x rally are the same number. The test used instead is definitive — the split
adjustment restates history onto the current share basis, so `adjusted / raw`
for a session is its cumulative split factor, and where that factor **changes
between two sessions**, a split sits between them.

The first version of this compared one session's raw close against its own
adjusted close, and that is subtly wrong in a way that leaves no trace. The
adjustment restates onto the basis at *fetch* time, so a disagreement means "a
split happened between that date and today" — including splits that happened
**after** the session being measured. A name that ran on Tuesday and
reverse-split the following week would have had its Tuesday baseline silently
restated onto a basis Tuesday never traded on. Comparing the two sessions'
factors isolates only the split that actually sits between them.
`lib/archive/splits.ts` holds both, with the failure case as a named test.

With that in place the whole captured range is -9.8% to +643.8%.

### 4. `rth_close` is not the official close

The last regular-session minute bar excludes the closing auction. Comparing the
desk's recorded close against the minute-derived one on the first 62 rows, **20
disagreed by more than two cents**, and 11 of 100 rows differ by more than 2%.
On a thin small cap the cross moves the print.

Both are now stored. `rth_close` is the last continuous-trading price;
`official_close` and `official_volume` come from the daily bar and are what
`gain_to_close_pct` is measured against.

### 5. Splits as evidence, not just as a hazard

Added after the first pass, because the measurement fix left the interesting
half on the floor. Q1's third hypothesis is that the catalyst moved from the
news wire to the filing cabinet — reverse splits, offering completions, S-1
effectiveness — and the pattern that predicts is not *split and run the same
day*. It is a split, then a run days or weeks later once the float is clean.

Detection that only looks at the immediately-prior session cannot see that. So
`split_sessions_ago` records how many sessions back the most recent split took
effect, over a 30-session window. On the two dates available the difference is
the whole finding:

| | symbol-days |
| --- | --- |
| split took effect that day | 2 |
| split within the prior 30 sessions | **21** |

A boolean would have seen two. Twenty-one of a hundred is a population worth
testing against.

Null in that column means **none found within the window** — never "this name
has never split". There is no separate `split_detected` boolean: it was the
same fact as `split_sessions_ago = 0`, and it could not be populated at all for
rows whose baseline came from the desk's own record, so it was null in exactly
the places the two would have been compared. `reference_basis` records whether
a restatement happened; this column records the event.

---

## Research coverage, held constant

This is the measurement the charter demands before any catalyst conclusion, and
the good news is that **nothing new had to be captured**. Every
`desk_assessment_tickers` row already carries `intelligence_status` beside the
grade, and the two are consistent: `catalyst` is null precisely when the status
says no analysis existed. A missed look and an honest `UNKNOWN` were already
distinguishable, per ticker per checkpoint. They only had to be read.

That consistency is one pipeline agreeing with itself — no analysis, therefore
no grade — not two sources corroborating. It supports exactly the narrow
inference above and nothing about where the grade's content came from. See
*Provenance of the independent variable*.

Each symbol-day gets one verdict:

| Coverage | Meaning | Admissible? |
| --- | --- | --- |
| `GRADED` | A look produced a determinate grade. | yes |
| `UNKNOWN_HONEST` | Every completed look returned UNKNOWN. Research ran and found nothing. | yes |
| `FAILED` | Looks were attempted and broke. | no |
| `IN_FLIGHT` | Queued or running all day, never landed. | no |
| `NO_LOOK` | Nothing was ever attempted on this name. | no |

The first two are evidence about the market. The last three are evidence about
the pipeline, and an analysis that pools them is measuring its own outage.

**This is necessary and, as of the production count, no longer sufficient.**
A grade served from a stale analysis reads `GRADED` and is admissible by the
table above while being worth nothing on the date it is attached to. See *What
`model_calls = 0` changes* below, and the freshness measure that answers it.

### What the two available dates show

```
  date         chkpts  late  syms  graded  unk-ok  failed  inflt  nolook   usable
  2026-08-17        2     2    37      18       8       0      0      11      70%
  2026-08-18       12     4    63      36       4      10      0      13      63%
```

**Coverage is not missing at random, and that matters more than the rate.**

| | symbol-days | admissible | never looked at | failed |
| --- | --- | --- | --- | --- |
| moved 50%+ | 34 | 30 | **0** | 4 |
| did not | 66 | 36 | 24 | 6 |

Every single name that ran 50%+ was either graded or honestly unknown. The
pipeline's misses are concentrated entirely in the names that went nowhere. For
Q1 that is a favourable bias — the catalyst question is about movers, and the
movers are the population research actually reaches — but it also means the
`NO_LOOK` bucket must never be treated as a random sample of anything.

### What `model_calls = 0` changes about what Q1 can claim

The single most useful fact to come out of the count, and it is structural
rather than statistical. **The assessment scheduler makes no model calls** —
`model_calls` is 0 on all 75 rows — so an exhausted OpenAI balance could never
have stopped a checkpoint being written. Assessment coverage and research
coverage are independent systems that happened to be discussed as one.

This charter and the archive spec both said reduced catalyst *detection* is
indistinguishable from absent catalysts, and treated that as the thing that
could sink the analysis. It is now a **measurable distinction**, and Q1 is in a
better position than either document assumed. Precisely:

**What Q1 can now claim.** *What the desk looked at* is intact for the whole
window. The board, the ranks, RVOL, the prices, which names were competing for
attention — none of it depended on research, and none of it is degraded on
19-21 August. So any question of the form *what were the characteristics of the
names that ran* is answerable across the full period, at the same quality as a
normal week.

**What it still cannot claim, and this is the part that moved rather than
vanished.** *What the desk learned* was degraded, and the catalyst grade is Q1's
independent variable. The distinction is no longer "is the grade missing" —
`intelligence_status` already answered that, and it reads `AVAILABLE` straight
through the outage, because a grade served from an existing analysis is
genuinely available. The question is whether the analysis behind it was produced
during the window or predates it. A three-session-old grade attached to a name
that ran on 21 August is not evidence about 21 August.

**So the caveat has been replaced by a measurement, not removed.** Coverage as
originally defined — did a look happen — is necessary and no longer sufficient.
Freshness is the other half.

### Answering the second handover: were the grades on 19-21 August any good?

Ops handed this over rather than querying it, correctly: it is Q1's independent
variable and it is this thread's call. `ageCatalystGrades` in
`lib/archive/coverage.ts` settles it, and it needs no extra tables — the
signal is `analysis_version_id`, already on every ticker row and already in the
two-table extract.

`grade_age_sessions` counts sessions between a trading date and the first date
that symbol's backing analysis was seen. **Zero** means the analysis was
produced or first served that day. **Three** means research has not revisited
the name in three sessions, whatever the status column says. Null means no look
produced a grade at all.

The local store shows the mechanism working on real data. MYSZ carried analysis
version 46 from the 08-17 recap through every one of 08-18's checkpoints — one
grade, unchanged, `INTELLIGENCE_AVAILABLE` throughout. SGLY moved 47 → 52 → 67
across the same period. Identical status columns, completely different evidence.

`grade_age_censored` is the honest half and it matters more than the age.
If a symbol's backing analysis was already in use on the **first** date
available, its real age is unknown and the number is only a lower bound. On the
two local dates, 58 of the 66 graded symbol-days are censored — which is the
correct answer for a two-day window and a warning about how the production
extract must be cut:

> **Do not extract 19-21 August alone.** A window that begins inside the outage
> censors every grade in it: the first day reads as freshly graded and the rest
> as barely aged, which is exactly how a stalled pipeline disguises itself. The
> extract has to start well before 19 August — the full five dates on record at
> minimum, and further back if production holds more.

That constraint costs nothing. The extract is bounded by `--from` / `--to` and
the payload is a few MB either way.

### The cadence, which cannot be assumed

The other handover. The schedule is 19 checkpoints a day; 08-18, 08-20 and
08-21 each have all 19, and **08-19 has 16, with three absent rather than marked
missed**, plus 2 of the 16 flagged `generated_late`. Nothing here averages over
checkpoints or assumes an even cadence, and the coverage report now prints
observed checkpoints and late checkpoints per day so an uneven one is visible
rather than discovered later. Late checkpoints are counted per assessment, not
per ticker row — a 25-name board would otherwise report 25.

### A schema difference that would have broken the first production run

Found while building the above, and worth recording because it is invisible
until it fails: **the local development store is schema v15 and production is
v21.** `desk_assessments.catch_up` does not exist locally at all. A query naming
every current column runs here and breaks there, or the reverse. `coverage.ts`
now probes `PRAGMA table_info` and substitutes a constant for any optional
column a store predates, so the same code works against either.

---

## What the instrument says, on the real five days

306 symbol-days, 2026-08-17 to 08-21, from the production extract. All 306 have
minute bars. Two dates of this were reported in an earlier draft on 100
symbol-days; those numbers are superseded by what follows.

### Coverage, held constant

```
  date         chkpts  late  syms  graded  unk-ok  failed  inflt  nolook   usable
  2026-08-17        2     1    38      19       8       0      0      11      71%
  2026-08-18       19     0    70      42       7      10      0      11      70%
  2026-08-19       16     2    58      21      10       0     10      17      53%
  2026-08-20       18     0    65      40      11       0      0      14      78%
  2026-08-21       19     0    75      35      18      10      0      12      71%
```

**19 August is the visible cost of the outage** and the only day that stands
out: 53% usable against 70-78% elsewhere, 17 names never looked at, and the only
`IN_FLIGHT` rows in the week — 10 jobs queued or running that never landed.
08-17 is the two-checkpoint evening the engine shipped, not a gap.

**Coverage is still not missing at random, and more strongly than before:**

| | symbol-days | admissible | never looked at |
| --- | --- | --- | --- |
| ran 50%+ | 95 | 84 | **5** |
| ran 20-50% | 74 | 54 | 10 |
| under 20% | 137 | 73 | **50** |

The pipeline's misses concentrate almost entirely in names that went nowhere.
For Q1 that is a favourable bias — the movers are the population research
actually reaches — and it remains a reason never to treat `NO_LOOK` as a random
sample.

### The grades on 19-21 August were fresh. The reach was what failed.

This is the question Ops handed over, and the answer is not what the framing
assumed.

| Date | graded, age known | fresh (age 0) | carried | oldest carried |
| --- | --- | --- | --- | --- |
| 2026-08-18 | 42 | 42 | 0 | — |
| 2026-08-19 | 31 | 28 | 3 | 1 session |
| 2026-08-20 | 51 | 45 | 6 | 2 sessions |
| 2026-08-21 | 52 | 43 | 9 | 3 sessions |

Nothing is stale. The oldest carried grade in the entire window is three
sessions, and 158 of 176 datable grades were produced on the day they were
served. **The outage cost coverage, not currency** — research reached fewer
names on 19 August, but the analyses it did produce were new ones.

That is a better position than the charter, the archive spec or this note
assumed, and it means the `GRADED` and `UNKNOWN_HONEST` rows on 19-21 August are
usable evidence about the market rather than about a billing incident. The names
research never reached are already excluded by the coverage classification.

Thirty-five rows are censored: 27 on 08-17 and 7 on 08-18, carrying versions
already in use on the window's first date, plus one on 08-21. **19 and 20 August
have none at all**, so the days Q1 turns on are measured rather than bounded.
Cutting the extract at 19 August would have censored roughly three quarters of
it and made none of the above visible.

### Provenance of the independent variable — unsettled

*Raised by Integration 2026-08-23, from the trader. Recorded here because this
thread's rule is to say what was not verified, and because it decides whether
one of the findings below means anything.*

The trader has never reviewed or written to the Google Sheet the desk reads. He
believes a **ChatGPT scheduled task** writes it. The desk's own access is
read-only, and nothing in `lib/`, `worker/` or `app/` writes to it — so the
Sheet is an input produced outside this system by an automation no charter owned
until tonight.

The question that reaches Q1: `lib/research/merge/sheetPrior.ts` reads
`catalystGrade` off the Sheet, and the file is named for a prior. **If that
prior reaches the interpreter's context, the automatic grade is influenced by
the ChatGPT task rather than independent of it** — and "did the desk see a
catalyst" and "did another model say there was one" become partly the same
measurement.

**This thread has not investigated it and will not.** `lib/research/` belongs to
the Research Pipeline thread; it is filed as `research.md` Open item 5.

What can be said from the archive alone, which is this thread's own data:

- **No Sheet-derived grade was ever stored.** Across all 1850 ticker rows in the
  window, `intelligence_source` is `AUTO` (1459 rows) or `NONE` (391). Never
  `SHEET` or `SHEET_AUTO`. Every graded row carries the automatic grade, which
  matches `desk-assessments.ts` taking `dossier.catalyst.catalystGrade`.
- **The conflict detector never fired.** `RESEARCH_CONFLICT` — the status that
  exists to flag Sheet/AUTO disagreement — appears **zero times**. That has two
  readings and the archive cannot separate them: either the comparison did not
  run in this window, or it ran and the two never disagreed. The second would be
  the more interesting, because if the Sheet's answer is in the interpreter's
  context then agreement is what contamination looks like, not corroboration.

Neither observation settles the question. Storing the automatic grade rules out
the Sheet grade being copied in; it says nothing about whether the model saw the
Sheet's answer before producing its own.

**What is suspended, and what is not.** The dependency runs through the catalyst
grade and nothing else:

| Result | Rests on | Status |
| --- | --- | --- |
| Split timing, hypothesis 3 | raw daily bars, minute bars, board membership | **unaffected** |
| Where the day's high falls (Q5) | minute bars, board entry times | **unaffected** |
| Coverage classification | whether an analysis existed | **unaffected** — it is about pipeline state, not about what a grade says |
| Grade freshness on 19-21 August | `analysis_version_id` | **stands as stated**; the inference below does not |
| Pillar 4 catalyst rate | the catalyst grade itself | **suspended** |

The freshness result needs the sharpest line drawn through it. *The pipeline
produced new analyses on 19-21 August* is a fact about currency and survives
intact. *Therefore those grades are independent evidence about the market* is
the inference at risk, because a freshly produced analysis that read a Sheet
prior is fresh and non-independent at the same time.

**No Q1 verdict will be published on the catalyst grade until Research settles
`sheetPrior`.** A verdict either way would be circular if the prior is in
context — including a null, which is the failure mode this thread is most
exposed to, since "movers do not carry catalysts" and "the other model did not
find one either" would be indistinguishable.

> *Superseded 2026-08-23.* `sheetPrior` was tested and the effect is not
> established, so this is no longer what gates a verdict. The hold stands for a
> different and harder reason — the grade is ~1/3 irreproducible — and the
> failure mode named above turns out to be the right one for the wrong cause: a
> noisy measure biases toward the null on its own, with no second model needed.
> See *Provenance — retracted, and the real problem is noise*.

One correction to this note while the subject is open. It said earlier that
`intelligence_status` and the grade "agree exactly", and that phrasing invites
being read as two sources corroborating each other. It is not that. It is a
single pipeline being internally consistent — no analysis, therefore no grade.
The inference it actually supports is narrow and still holds: a missed look and
an honest `UNKNOWN` are distinguishable. It was never an independence check, and
if the Sheet can influence either field it would not become one.

### Provenance — retracted, and the real problem is noise

*Research, 2026-08-23, retracted its own result the same day after widening from
two control runs to four. Recorded in full because this thread acted on the
first version and the correction changes what Q1 can be asked.*

**What was reported first**, and what this note recorded in `05b430e`: removing
the Sheet's prior changed 2 of 6 catalyst grades against a control variance of
0 of 6.

**What four runs per arm show:**

| | of 6 tickers |
| --- | --- |
| unstable *within* the 4 control runs | 2 |
| unstable *within* the 4 prior-free runs | 3 |
| **stable in both arms but different between them** | **0** |

The last row is the one that matters and it is zero. The two names reported as
moved — BTOG and CDTG — are exactly the two that vary within the control set on
their own. The original control variance of 0 of 6 came from two runs that
happened to agree, so noise was measured against too small an estimate of noise.

**The independence effect is not established.** That is not "the prior does not
matter": the code path is real and `sheetPrior` reaches the interpreter's
context on every call. Six names cannot tell. One asymmetry survives — OLOX is
`LEGITIMATE_POSITIVE` in all four control runs and mixed across the four
prior-free runs, which is consistent with the prior acting as an **anchor that
reduces variance** rather than shifting the grade. That is a hypothesis on one
ticker and nothing here uses it.

#### The replacement problem is worse, because noise cannot be corrected for

Contamination is a bias. A bias has a direction, and a direction can be
subtracted. What the wider sample found instead is that **the catalyst grade is
not reproducible for roughly a third of names on identical evidence** — and the
stored grades in this archive are single draws from that distribution.

The consequence for Q1 is specific and it is not a matter of degree:

> **Measurement error in the independent variable attenuates any association
> toward zero.** Q1 asks whether a catalyst predicts a name running. If a third
> of the catalyst measure is a coin-flip, the observed catalyst-to-outcome
> relationship is biased toward *no relationship* — which is Q1's own
> hypothesis. A noisy measure would tend to confirm it regardless of the truth.

That is the failure this thread is most exposed to, because its working rule is
to report the null. A null produced by measurement error looks exactly like a
null produced by the market, and nothing in a one-shot output distinguishes
them.

#### What that does to the authorised re-derivation

The run was authorised to remove Sheet contamination. Contamination is no longer
established, so the run's original justification is largely gone — and a
**one-shot** prior-free grade is a fresh single draw carrying the same
irreproducibility as the stored grade it would replace. Swapping one noisy draw
for another, to remove an effect that has not been shown to exist, buys close to
nothing.

Research reached the same place independently and is flagging it rather than
shipping single-run numbers that would look authoritative: usable grades need
repeats per version and a modal grade, roughly 3x the authorised spend. The
executing run will arrive labelled one-shot with per-ticker instability marked,
which is the right way to ship it.

#### What this archive can add: how much grade churn is information

Across 1248 consecutive checkpoint pairs, catalyst moved **29 times in 56
re-analyses — 52%** — and never once in 1192 same-version pairs.

Against the churn-comparable noise floor of 17%, the implied real-change rate is
35% by subtraction or 42% under independent composition. **Real change is the
larger component**, though not overwhelmingly, and the same holds for structure
at a 25% floor.

An earlier version of this section put the floor at 33% and concluded the
opposite. That figure counted *tickers unstable across four draws* rather than
*pairs of draws that disagree*, which is not comparable to a churn rate between
two observations. Corrected above.

The arithmetic remains illustrative: six names, an assumption of independence,
and a production comparison that cannot hold evidence constant. What survives is
that the floor is high enough that grade transitions cannot be read as events
without saying so — smaller than this note claimed at one point, larger than it
claimed at another.

#### A plausible fabricated result, and the guard it prompted here

*Research, 2026-08-23.* A per-version replay harness ran with no API key.
`interpretTicker` returned each ticker's **latest stored dossier** for every
version, and the harness produced a complete, internally consistent, entirely
fabricated result — "123 stable, 0 unstable, 43 differ from stored". Its only
tell was a token count of zero. It would have arrived here as a finding. The
replay now throws rather than degrading.

**The archive had the same shape and now has a tell.** Split detection compares
one daily series fetched `raw` and fetched `split`. If the adjusted fetch ever
returned nothing, returned raw, or dropped symbols, every comparison would agree
and the run would report **no splits** — a clean, plausible null,
indistinguishable from a window with no corporate actions. Hypothesis 3 would
come back empty and nothing would say why. The only reason it was not silent
tonight is that two splits happened to fire.

`auditSplitFetch` now reports on every run, including when the answer is zero:

```
[archive] split basis: 11264 of 11264 symbol-dates comparable on both bases, 999 differing
```

A stated zero in the `differing` column is a fact about the market. A silent
zero was indistinguishable from a broken fetch. The run also names any symbol
that returned raw bars but no adjusted ones, and **throws** if nothing at all is
comparable — that case is not a market fact, it is a fetch that never happened.
`tests/archive/splits.test.ts` asserts the two cases produce the same
`differing` and different `comparable`, which is the whole point.

The 999 is worth keeping on its own: **8.9% of symbol-dates in the lookback sit
on a pre-split basis relative to today.** Reverse splits are as endemic as the
spec claimed.

#### The one-shot pass: a coverage marker, not a variable

25 of 56 prior-free grades differ from the latest in-window stored grade — 45%.
**This is not a prior effect and must not be quoted as one.** Research names
three live confounds and can separate none of them:

1. the prior, removed — the thing of interest
2. run-to-run noise, ~17% pairwise on its own
3. **evidence** — the pass had no as-of filter, so it bundled every source each
   ticker has ever had, while the stored grade saw only what was collected by
   its own `generated_at`

The third is the largest and is why 45% exceeds everything else measured. It
exists because as-of filtering landed after this pass started.

**The anchoring-inflation hypothesis is dead**, and Research killed it against
the eyeball impression rather than with it. Scanning the list,
`LEGITIMATE_POSITIVE → MODERATE_MIXED_SECONDARY` recurs and reads like the prior
inflating grades. Counted both ways: **10 less positive, 7 more positive, 8
involving `UNKNOWN` and not orderable.** On 17 orderable changes, 10-7 is what a
coin produces about a third of the time. Nothing there.

Recorded in this archive as instability marks only. `data/rederive-run.db`,
rows `id>325`, `sheetPriorOmitted=true`, 608,625 input / 166,941 output tokens.

#### The per-version replay dissolves the join problem

The artifact to wait for: 123 stored versions, up to 2 draws each, as-of filtered
on `fetched_at`, refusing a grade when the draws disagree. It controls confound 3
outright — each version is replayed against exactly what the desk had collected
when it ran — and partially controls confound 2 through the refusal.

**It also makes the join arithmetic below obsolete.** That section works out
which tickers can take a single per-ticker correction: 27 with one version, 10
more whose grade never moved, 19 ambiguous. A per-version replay joins on
`storedVersionId`, which maps directly to this archive's `analysis_version_id`,
so **every one of the 56 resolves** and the ambiguity never arises. The
arithmetic is left below as a record of what a per-ticker output would have
cost, not as a live constraint.

Early sign, explicitly not a result: HUIZ v224 came back
`UNKNOWN | LEGITIMATE_POSITIVE` and was refused; XOS v41 likewise. The refusal
semantics are firing on real cases rather than sitting unused.

#### The per-version artifact landed, and the blocker moved from noise to population

`data/replay-perversion.json`, 123 versions, joining on `storedVersionId` →
`analysis_version_id`. Tokens 2,621,848 in / 730,977 out — checked, per the
convention agreed after the fabricated-result incident. Verified here rather
than taken: 95 stable (77%), 28 refused (23%), 24 stable-but-differing, and
every refused row correctly carries a null grade.

**The 24 differing are not a prior effect**, and Research caught this itself
before reporting it. `55f3e20` put the parsed share count into the evidence
bundle; stored analyses ran before it and the replay after. `sharesOutstanding`
is populated on **38%** of stored analyses against **88%** of replay ones. A
stored-versus-replay difference therefore mixes the prior, single-draw noise on
the stored side, as-of imperfection, and a genuine code change — a comparison
against a baseline produced by different software.

That generalises past this run and belongs in the register: **every catalyst
grade in this archive was produced by a pipeline that could not see a share
count in 62% of cases.** Any comparison against grades stored before 2026-08-23
carries it.

**The 23% refusal rate is a floor, not an estimate**, and this is the archive's
contribution to reading it. Refusal fires when two draws disagree, so it misses
every unstable version whose two draws happened to agree:

| true flip split | P(2 draws disagree) | implied unstable share | unstable hiding in the 95 |
| --- | --- | --- | --- |
| 50/50 | 50% | 46% | 28 of 95 (**29%**) |
| 60/40 | 48% | 47% | 30 of 95 (32%) |
| 75/25 | 38% | 61% | 47 of 95 (**49%**) |

So roughly **half of all stored catalyst grades are irreproducible**, and between
a third and a half of the 95 that passed are unstable versions that agreed by
luck. The 95 are not a clean set; they are a set that passed a weak filter. A
third draw would take 95 down to about 81 and cut the hiding fraction to 17-40%
— an improvement, and a smaller one than it sounds.

#### The join runs. The population it lands on cannot answer Q1.

62 symbol-days over 43 distinct symbols join to a stable prior-free grade. And
then the reason none of it helps:

| Population | symbol-days | ran 50%+ |
| --- | --- | --- |
| joined replay set | 62 | 46 (**74%**) |
| all graded symbol-days | 211 | 84 (40%) |
| full archive | 306 | 95 (31%) |

**The replay population is 74% movers against 31% in the archive.** That is not
a coincidence and it was predictable: the 56 tickers were selected on TODAY-tab
membership, and this note established days ago that TODAY membership correlates
with running — 82% of movers sit in the Sheet's price band against 63% of the
board. Selecting on it selects for movers.

The consequence is that **the control group barely exists**: 16 non-movers
against 46 movers. Running the contrast anyway gives 28% of movers carrying a
real catalyst against 31% of non-movers — a difference of nothing, on a
comparison cell of sixteen, from a variable that is 29-49% coin-flip.

**That null is not reported as a finding and will not be.** It is exactly the
artefact this note has been guarding against since the noise problem surfaced:
attenuation plus an absent control group produces "no relationship" whatever the
truth.

**So the blocker has moved.** It is no longer measurement noise — it is that the
prior-free grades exist only for a population selected on the outcome. No number
of additional draws fixes that, because more draws on a 74%-mover sample still
leave a 74%-mover sample.

#### What would fix it, with the arithmetic

The archive has **185 distinct analysis versions** backing its catalyst grades.
The replay covered **61** of them; 124 remain. (A further 62 replay rows do not
back any board-day grade here at all, which is why 123 replayed versions yield
only 61 usable ones.)

At the observed **~27k tokens per version for two draws**, covering the
remaining 124 is **~3.4M tokens** — about 1.3x what has already been spent.

That is the run that makes Q1 answerable, and it is a better buy than a third
draw on the existing set, for one reason:

> **Noise can hide a signal. It cannot manufacture one.** On a representative
> population, a relationship that survives 29-49% misclassification is real and
> stronger than it appears — attenuation only ever biases toward zero. On an
> unrepresentative one, no result is reachable in either direction, however
> clean the measurement.

A third draw buys precision on a sample that cannot answer the question. The
remaining 124 versions buy a sample that can, at a measurement quality already
known and quantified.

#### The full replay: 100% coverage, and Q1's first half has an answer

`data/replay-full.json` — 236 versions, **five draws each**, prior-free, as-of
filtered, joining on `storedVersionId`. Tokens 9,905,680 in (81% cached) /
2,792,169 out; checked. The budget constraint was lifted and the design changed
with it.

**Every one of the archive's 185 grade-backing versions is covered — 100%.** The
population problem is gone:

| Population | symbol-days | ran 50%+ |
| --- | --- | --- |
| previous TODAY-tab replay | 62 | 74% |
| **full replay, joined** | **211** | **40%** |
| whole archive | 306 | 31% |

40% against a 31% baseline is mild residual enrichment, and it is a property of
*coverage* rather than of the replay: research reaches movers, so graded
symbol-days skew that way. That was measured here days ago and it is the right
population to work on, not a selection artefact.

**Five draws with an agreement fraction replaces refuse-to-emit**, and Research
was right to withdraw its own design — its objection was to an *unlabelled*
mode, and a mode carrying "3 of 5" is not that. It lets the association be run
weighted and unweighted, which on a thin control group is worth more than a
clean subset.

**The two-draw projection held.** This note worked the 23% refusal rate back to
46-61% of stored grades irreproducible. Measured directly on five draws:
catalyst **45% not unanimous**, cycle 46%, structure 55%. The inference from a
weak filter to a true rate was sound, and 45% sitting at the bottom of the range
says the flip distribution is nearer 50/50 than 75/25 — which the shape confirms,
with 53 versions at exactly 3 of 5.

##### The contrast

Share carrying `STRONG` or `LEGITIMATE_POSITIVE`, over 211 symbol-days:

| Measure | movers (n=84) | non-movers (n=127) | difference |
| --- | --- | --- | --- |
| prior-free modal, unweighted | **16.7%** | 13.4% | +3.3pt |
| prior-free modal, agreement-weighted | 17% | 13% | +4pt |
| unanimous rows only (n=113) | 20% | 13% | +7pt |

z = 0.66, p = 0.51. **No detectable relationship.** Mean modal agreement on
these rows is 85%, so misclassification is about 15% and the attenuation factor
about 0.70.




#### The split factor is computed and thrown away — 2026-08-24

Research demonstrated that split dates and ratios are recoverable **exactly**
from price data alone: fetch a window raw and split-adjusted, and the quotient
is the cumulative factor, which **steps at each split**. BTCT resolves to
1-for-30 on 2022-05-06 and 1-for-20 on 2023-08-24, and 30 x 20 reconciles to the
cumulative factor exactly. No model, no prose, no corporate-actions endpoint.

**That is the mechanism `lib/archive/splits.ts` already runs on.** The news is
not the method — it is what Research did with it, and the gap it exposes here.

**This archive records WHEN a split happened and discards BY HOW MUCH.**
`resolveBaseline` computes the exact factor inline —

    prior.raw * (priorRatio / targetRatio)

— and that quotient **is** the split ratio. It is used to restate one close and
then dropped at the return statement. `split_sessions_ago` stores the distance;
nothing stores the magnitude.

**That is this thread's own basis rule broken from a direction it did not
anticipate.** The rule says a value with more than one possible definition ships
with its basis. Here the failure is different and worse: **an event was recorded
and its quantity discarded** — the *when* kept, the *how much* thrown away, when
the two cost the same to store and the second is the one arithmetic needs.

**And it is exactly what the `float > SO` denominator problem was missing.** The
standing position is *a denominator that may be wrong in an unknown direction
cannot support any arithmetic about it.* A stored per-name split factor makes the
direction **known**: a filed share count predating a 1-for-20 is wrong by exactly
20x, recoverable without touching the filing. The refusal was right, and it was
right about *unknown*, not about *wrong* — so this dissolves the blocker rather
than overturning the reasoning.

**Queued: `split_factor` beside `split_sessions_ago`.** Near-free, since the
value is already computed. Not started; the desk is live.

#### BTCT vindicates the readable null, on the worst possible name

BTCT is in this archive at 2026-08-19 with **`split_sessions_ago` = null and
`split_lookback_sessions` = 501.** Research's BTCT splits are 2022-05-06 and
2023-08-24 — **both beyond 501 sessions.** So the null is correct: *no split in
the window searched*, and the true most recent one sits roughly 750 sessions back.

**Without the window column a reader takes that null for "never split" — and
BTCT is a serial reverse-splitter, the single most dangerous name in this
universe to record as clean.** This is the CDTG lesson paying off on the exact
name Research chose as its example, which is a better test than one I could have
picked for myself.

#### Depth poisoning does not reach the cycle fields, and not by luck

Research's second finding: BTCT's all-history split-adjusted ceiling is
**$14,249.94, on a bar that traded four shares** — arithmetically correct,
economically meaningless, and a $25M dollar-volume floor only brings it to
$2,561.94 against an honest post-consolidation $26.58.

**Checked here: `cycle_advance_pct` tops out at 34.2%, with zero of 220 rows
above 1000%.** The reason is structural rather than fortunate — the cycle window
is bounded by a *resolved cycle start*, 21 sessions minimum and typically far
less than a year, so it never reaches back into pre-consolidation history. **A
measure anchored to a found event cannot be poisoned by depth it never reads.**
Any future all-history depth measure on this archive would need the post-
consolidation guard; the existing ones do not.


#### The windowed gain columns are anchored to the wrong session — measured 2026-08-24

**Not fixed, deliberately: he is trading as this is written. Recorded so the
number exists before anyone uses these columns.**

Research found the general form in its own durable notes — *"9:30–10:00 is the
core"* — and caught that this is **the booklet's core, Cameron's, not Adam's**,
under a rule in the same file saying *where the booklet and Adam differ, believe
Adam*. The general shape: *a taught method quietly stands in for the
practitioner's, and it recurs on other facts in the same file.*

**RETRACTED 2026-08-25, and the retraction is the more useful half.** This
section originally read *he trades 04:00–09:30, profit concentrates from 07:00,
RTH is the exception.* **He corrected it himself** (`0595b2c`): *"we can change
that. i do sometimes trade RH and AH. but the core of the strategy is the same
in terms of setups."* **He trades premarket, RTH and after hours. The setup is
the requirement; the session is not.**

**The sharper error, which Coaching caught: replacing the booklet's window with
his was the same mistake with different numbers.** Both were rules about the
clock, and **the clock was never the rule.** Spotting that a constant is
inherited does not license substituting a better constant of the same kind. The
measurements below are unaffected; **what they license is narrower than what
this section first claimed.**

**This archive has the same error one level down, in three column definitions:**

| column | window it measures | relation to the taught window |
| --- | --- | --- |
| `gain_open_30_pct` | 09:30–10:00 | Cameron's core, and only 7.4% of peaks |
| `gain_to_1100_pct` | to 11:00 | entirely after |
| `gain_to_close_pct` | to 16:00 | entirely after |

**Where the max gain actually lands, all 95 movers:**

    04:00-06:59  early premarket           26   27.4%   <- largest single bucket
    07:00-09:29  late premarket            18   18.9%
    09:30-09:59  gain_open_30_pct window    7    7.4%   <- the column named for it
    10:00-10:59                             9    9.5%
    11:00-15:59                            18   18.9%
    16:00-20:00  after hours               17   17.9%

**46.3% of movers peak before 09:30, and 7.4% peak in the window the
opening-gain column measures.** Every derived gain field this archive has starts
at or after 09:30, so **three quarters of where the moves actually top out has no
windowed column at all.**

**Read as opportunity distribution, not as a trading window.** These figures say
where the moves are; they say nothing about where his trades have to be, and the
first version of this section wrongly used them for the second.

**`gain_open_30_pct` is the sharpest instance, because the assumption is in the
name.** "The opening 30 minutes" reads as *the money window* to anyone who opens
the schema, and on this desk it is the seventh-best half hour of six.

**What is NOT wrong, and it matters.** `max_gain_pct`, `time_of_max_gain`,
`premarket_high` and `premarket_high_at` are all full-session 04:00–20:00 and
correct — which is how the table above could be computed at all. **The defect is
in the derived windows, not the capture**, and the minute bars behind them are
re-fetchable. This lands on the reassuring side of this thread's own
re-fetchable / observable-once distinction: **nothing was lost, the wrong
question was asked of what was kept.**

**The fix, when the desk is quiet:** gain-to-07:00 and gain-to-09:30 as windowed
columns, keeping the existing three rather than replacing them — a booklet-window
number is still the right comparison when the question is *how does the taught
window differ from where the moves are*. **Add the dimensions; delete nothing.**
And name them for the clock times they cover, not for whose window they are —
`gain_to_0700_pct`, not `gain_his_window_pct`. **A column named after a person's
habits inherits those habits when the habits change.**

**The wider pass this implies, and it is not a small one.** Every threshold in
the register descends from the same playbook: **Pillar 4's window, the hold-time
grain, the RVOL and price bands.** Any of them may be the booklet's number rather
than his, and each needs checking against him rather than against the source.
Queued, not started.


##### Definition-robustness, added 2026-08-24

Prompted by Research finding that **133 symbols carry a stale grade tail** and
that the stranded jobs are eight, not three — names nothing will ever re-analyse.
The question that raises for Q1 is whether grade staleness is **differential**:
attenuation only biases toward zero when the measurement error is unrelated to
the outcome. If stale grades cluster among movers, the ceiling above is not a
ceiling.

**It does not, and the check is cheap enough that it should have been run at the
time.** Among admissible symbol-days, uncensored mean grade age is **0.15
sessions for movers against 0.11 for non-movers.** No differential worth the
name, so the non-differential assumption behind the +19-point ceiling holds.

**What *is* strongly differential is whether a name was analysed at all** — mover
rate 41.6% among symbol-days carrying an analysis version against 11.6% among
those carrying none. That is selection into the pipeline, not misclassification,
and **the coverage classification already excluded it**: all 11 movers with no
version are `FAILED` (6) or `NO_LOOK` (5), inadmissible by construction. The
instrument did the job it was built for, which is worth recording because it was
built before there was a finding to test it against.

**And the contrast survives every definition of "carried a catalyst" the archive
can express**, over the same 211 admissible symbol-days:

| instrument | movers | non-movers | difference | Fisher 2-sided |
| --- | --- | --- | ---: | ---: |
| **prior-free five-draw modal** *(the published figure)* | 16.7% (14/84) | 13.4% (17/127) | +3.3pp | 0.51 |
| stored `catalyst_first` | 10.7% (9/84) | 10.2% (13/127) | +0.5pp | 1.000 |
| stored `catalyst_last` | 17.9% (15/84) | 13.4% (17/127) | +4.5pp | 0.434 |
| stored `catalyst_best` | 20.2% (17/84) | 13.4% (17/127) | +6.9pp | 0.251 |

**Not one is significant and the widest gap is 6.9 points**, against a Pillar 4
reading that implies a near-total one. The verdict does not turn on which
definition of *carried a catalyst* a reader picks, and that is a stronger claim
than the single-instrument version it replaces. A bounded negative needs exactly
this, because the obvious way to attack one is to say the measure was wrong.

**The spread is itself the sensitivity band**: +0.5pp to +6.9pp depending on
whether you take the first grade of the day, the last, the most generous, or a
prior-free re-derivation. Quote the band, not one row.

**A near-miss worth recording, because it was mine.** Setting out to check the
staleness question I computed the stored-column rates first, saw 17.9% where I
expected 16.7%, and briefly concluded my own published figure did not reproduce.
It does — exactly, 14/84 and 17/127 from `data/replay-full.json`, and the
findings log named the basis all along. **I had compared a number against a
different instrument and read the disagreement as an error.** The register's
summary line did not carry the basis even though the findings log did, which is
what let me do it; it does now. **A figure whose basis lives only in the document
that derived it will be re-derived wrongly by someone reading the summary** —
including by the person who wrote both.


**This is a bounded negative, not a null, and the distinction is the whole
point.** Attenuation biases toward zero, so this instrument cannot support "no
relationship". What it *can* support is a ceiling:

- 95% CI on the observed difference: **-6.6pt to +13.2pt**
- corrected for 15% misclassification: **-9.5pt to +18.9pt**
- a true 20-point difference would have shown as 14pt and been detected; 30
  points would have shown as 21pt

> **The largest true difference consistent with this data is about 19 points.**

Pillar 4 calls a breaking-news catalyst *non-negotiable*. A non-negotiable
selection criterion implies a difference far larger than 19 points — most movers
carrying one and most non-movers not. **That relationship is excluded at this
population and window.** A weak relationship is not excluded, and nothing here
says catalysts are irrelevant.

The absolute figure carries more than the contrast does, because it needs no
comparison group: **83% of 50%+ movers carried no legitimate-positive-or-stronger
catalyst**, on a prior-free, as-of-correct, five-draw modal measurement. That is
a direct reading of the trader's original observation and it is consistent with
it.

**The share-count confound does not reach this.** It bites on stored-versus-replay
deltas, and nothing above compares to stored — the variable is the replay grade
and the outcome is the tape.

##### What still stops Q1 closing

- **The population is the desk's board**, the top 25 by RVOL out of ~900
  price-eligible names. A name that ran 50%+ and never reached the board is
  invisible. That is tier A and it does not exist.
- **Five trading days**, 2026-08-17 to 08-21.
- **Graded symbol-days only** — 211 of 306. The 95 excluded are mostly `NO_LOOK`,
  which skews non-mover, so the control group is thinner than the board is.
- **Q1's second half is untouched.** "Why are catalyst-driven names passed
  over?" needs the cross-section the first bullet describes.

So the first half of Q1 has a measured answer with a stated bound, and the
second half is unanswerable on this instrument. That is a partial verdict, not a
closure.

##### By-product, handed on rather than used

Cycle instability includes **28 versions that flip between two directions, 17 of
them `RED_BACKSIDE` against `YELLOW_FRONTSIDE_WARNING`** — frontside versus
backside on identical evidence. Nothing in `lib/archive/` reads `cycle`, so this
archive is unaffected, but that field is trader-facing and the distinction is not
cosmetic. It reverses a small-sample null Research gave Integration earlier, the
second such reversal tonight.

#### Cycle becomes arithmetic, and unlike every other change tonight it reaches backwards

*Routed by Integration 2026-08-23.* `lib/market/cycle.ts` computes the cycle
classification from daily bars, and the model's version is being deleted rather
than kept alongside — the trader's call, on 75% `UNKNOWN` in production, 46%
irreproducible across five draws, 7.2% of versions flipping frontside against
backside, and the arithmetic winning 8-0 with one unclear where both committed.

**This archive is not exposed today**, because nothing in `lib/archive/` reads
`cycle` — the field was frozen precisely because it could not be trusted. The
definitional boundary lands in `desk_assessment_tickers`, where values before
the change are the model's and values after are deterministic, wearing one name.
Any future analysis reading cycle from the assessment record crosses it blind.

> **Settled, and the archive comes out immune.** The migration order is
> `research.md` item 13: the computed cycle is wired in additively first,
> Design switches its surfaces, and the five model fields are deleted **last** —
> after Design's switch is *deployed and verified* rather than merely merged.
> Meanwhile this archive resolves its own cycle from Alpaca daily bars via
> `lib/archive/cycles.ts` and never reads `desk_assessment_tickers.cycle`, so
> none of that sequence touches it. Two consequences worth having: the boundary
> cannot appear in anything derived here, and once the model fields are gone
> **this archive is the only point-in-time cycle for dates before the pipeline's
> computed version existed.**

**Feasibility, which Integration flagged as unverified and is now verified.**
`resolveCycle(bars)` takes only `{tradingDate, high, low, close, volume}` oldest
first — nothing else. Run against real fetched bars, truncating the series at
each as-of date:

```
as of 2026-08-17                    as of 2026-08-21
  PFSA   DAY_ONE                      PFSA   BACKSIDE
  SGLY   NO_CYCLE                     SGLY   NO_CYCLE
  RCON   BACKSIDE                     RCON   SHADOW
  MYSZ   FRONTSIDE                    MYSZ   PULLBACK
  TNON   SHADOW                       TNON   BACKSIDE
  WFF    BACKSIDE                     WFF    BACKSIDE
```

It is genuinely point-in-time rather than latest-state: the same symbol resolves
differently at the two dates, which is the property a per-symbol-day column
needs. PFSA reads `DAY_ONE` on the 17th and `BACKSIDE` by the 21st, having run
624% on the 18th.

The inputs are already in hand. The backfill fetches raw daily bars over a
62-calendar-day lookback (~42 sessions) for the split work, and `dailyRvol` needs
20. The probe used a wider window (73 sessions) and a wider one is preferable —
cycle-start detection searches for the *most recent* qualifying day and wants
runway — but nothing new has to be fetched in kind, only in span.

**Why this is worth doing and the other definitional changes were not.** Every
other one tonight — the share count entering the bundle, the prior, the model's
own irreproducibility — leaves a boundary that can only be caveated. This one
can be **applied uniformly backwards**, so the archive would carry a single
definition from 2026-08-17 onward and the boundary would simply not exist in
anything derived here.

It would also be the archive's **first reproducible classification**. Catalyst is
45% not-unanimous, structure 55%, cycle 46% — every model-derived field is close
to a coin flip on a meaningful minority of rows. A deterministic cycle is not.

**Where it would earn its place: Q5.** "When does a board name's move happen
relative to when the desk puts it on the board" is, restated, *what cycle phase
is a name in when the board surfaces it*. `first_board_entry_at` is already
stored; a deterministic phase at that instant answers Q5 directly and without a
model in the loop.

**Not built.** Q1 is the active question and does not need it, and the register
caps active questions at two. Recorded as ready rather than done.

**Structure's freeze stands and hardens.** 45% unanimous, mean agreement 84%,
the least reproducible of the three, and it is *not* becoming arithmetic — only
cycle is. Nothing in `lib/archive/` will read it.

#### Tier A reconfirmed: the spec's ~900/day is wrong, and the gate must not filter it

*Asked for by the trader 2026-08-23, who gave the gate as $2-$20, 5x RVOL, +25%.
Measured against the tape rather than taken from the spec.*

Of 5,827 classification-eligible tradable symbols, close-based, using the desk's
own `dailyRvol` (20-session median) and both readings of "+25%":

| Date | close $1-$20 | gate, +25% on the close | gate, +25% on the session high |
| --- | --- | --- | --- |
| 2026-08-18 | 2,826 | 8 | 18 |
| 2026-08-19 | 2,824 | 10 | 14 |
| 2026-08-20 | 2,841 | 4 | 9 |
| 2026-08-21 | 2,839 | 9 | 20 |

**The cross-section is ~2,830/day, not ~900.** The spec is wrong by 3.1x, and
its ~225k rows/yr becomes **~710k**. That changes nothing about feasibility — one
narrow row per symbol-day is a few hundred MB a year in Postgres — but the
number should not stay wrong in a document people size work from.

**The gate is 9-20 names a day.** The desk measures percent change against the
session high, which is what `max_gain_pct` is here, so the right-hand column is
the relevant one.

##### The gate belongs in a column, not in the filter

Tier A's stated job in the spec is *"What separates a mover from a non-mover? —
daily statistics across the full eligible cross-section."* Filtering capture to
$2-$20 + 5x + 25% would mean **every row in tier A is already a mover**, and:

- **Q3 becomes unanswerable by construction.** There is no non-mover to compare
  against. That is the exact failure this thread spent today diagnosing in the
  TODAY-tab replay, where selecting on a mover-correlated property left sixteen
  controls and a contrast worth nothing.
- **Q1's second half goes with it.** "Why are catalyst-driven names passed over"
  is a question about names that did **not** pass the gate. Filtering by the gate
  deletes the population the question is about.
- **It breaks the spec's own rule.** *"Store facts, never scores. Tiers,
  thresholds and 'was this a good call' are views computed at read time, so a
  retuned threshold re-scores the history instead of losing it."* A capture-time
  gate is a threshold baked into history, and the one thing certain about these
  thresholds is that they get retuned — the desk already runs $1-$20 and RVOL
  2-5 against the booklet's $2-$20 and 5x.

And there is no cost argument for filtering: 710k narrow rows a year is not a
storage problem, and the gate would save 99.5% of a number that was never large.

**So: capture the full $1-$20 cross-section, and store the gate's components** —
price, RVOL, percent change on both the close and the session high — **plus a
derived `passed_gate` flag.** Gate-passers are then one `WHERE` clause away,
retuning the gate costs nothing, and Q3 keeps the control group that is the only
reason tier A exists.

##### $1-$20 confirmed, and the sub-$2 population is not a rounding decision

Settled by the trader 2026-08-23, with the reason: sub-$2 names *"are generally
rising penny stocks that trade differently, but sometimes they move into this
universe and behave."* Two distinct populations, and the interesting event is
the **crossing** rather than the price level.

Measured, using prior close under $2 as "started the session as a penny name":

| Date | started sub-$2 | crossed to $2+ intraday | crossers with RVOL >= 5 | crossers +25% |
| --- | --- | --- | --- | --- |
| 2026-08-18 | 831 | 20 | 5 | 5 |
| 2026-08-19 | 831 | 32 | 7 | 11 |
| 2026-08-20 | 817 | 14 | 4 | 5 |
| 2026-08-21 | 821 | 27 | 8 | 11 |

**14-32 names cross into the band on a given day, and 5-11 of them clear the
+25% part of the gate.** Set against a full gate of 9-20 names a day, the
crossers are not a fringe: a meaningful share of each day's qualifying moves
starts below $2. Capturing from $1 rather than $2 roughly doubles the candidate
pool rather than adding a margin.

**The design consequence, and it is the reason this was worth measuring.** A
tier A row carrying only the close would classify a name that ran $1.80 → $3.20
→ $1.95 as a sub-$2 name and lose it — which is precisely the "moves into this
universe and behaves" case. **Tier A must store session high and low, not just
the close**, so the $2 crossing is derivable. That also makes the two
populations separable at read time: *started sub-$2*, *crossed*, and *was in
band throughout* are three different things and only the raw extremes let a
later analysis tell them apart.

Close-based membership is otherwise a good proxy — names *touching* $1-$20
number 2,858-2,886 against 2,824-2,841 closing there, so about 40 a day differ.

#### Built: a deterministic cycle, and one number from it that is not circular

`lib/archive/cycles.ts`, `cycle_phase` and five arc columns on
`symbol_outcomes`, archive schema v4 with a migration. Authorised 2026-08-23.

**Point-in-time, not latest-state.** The series is truncated at each trading
date before resolving, so a row carries what was true then. The test that
matters asserts resolving 07-02 from a series containing 07-03 gives the same
answer as resolving it from a series that ends at 07-02 — without that, a
backfill over past dates silently writes today's view onto every historical row.

**Split-adjusted, deliberately, and it is the one column here that is not
as-seen.** A cycle arc spans dozens of sessions; a reverse split inside the
window leaves the start and the high on different share bases and the advance
becomes fiction — the same error that made RCON read as +29,811%. Outcomes stay
raw because they are compared against the desk's as-seen record. A cycle is a
shape over time and needs one basis throughout.

**Null means could-not-say, not no-cycle.** Fewer than 21 sessions of history,
or a date the symbol did not trade, returns null rather than `NO_CYCLE`. Eight
rows are null. A measured absence and an unmeasurable one are different things
and the distinction has been earned the hard way tonight.

The distribution over 306 symbol-days:

| Phase | rows | ran 50%+ | mean max gain |
| --- | --- | --- | --- |
| NO_CYCLE | 149 | 19 (13%) | 21% |
| BACKSIDE | 97 | 45 (46%) | 75% |
| DAY_ONE | 36 | 24 (67%) | 110% |
| FRONTSIDE | 9 | 3 | 34% |
| PULLBACK | 6 | 0 | 23% |
| SHADOW | 1 | 0 | 3% |
| (null) | 8 | 4 | 177% |

**The phase-to-outcome contrast is circular and is not a finding.**
`isCycleStart` requires `CYCLE_START_MOVE_PCT` 0.2 and `CYCLE_START_RVOL` 5, so
`DAY_ONE` *means* the name moved 20%+ on 5x volume that session. Of course
DAY_ONE names ran — the definition says they did. `BACKSIDE` and the rest are
less directly tautological, since they describe position relative to a *past*
start, but they still imply a qualifying start happened recently. Nothing above
should be read as the cycle predicting anything.

**What is not circular, and is the Q5 content:** *what phase is a name in when
the board surfaces it?* That is descriptive rather than a contrast, and the
answer is stark. **97 of 306 board symbol-days — 32% — are `BACKSIDE`**: already
past the cycle high, more than half the move given back, at the moment the desk
is showing the name. Another 149 are `NO_CYCLE`, where no qualifying move
happened in the window at all.

That agrees with the independent finding from the tape earlier in this note —
44 of 95 movers peaked before 09:30, and only 16 of 95 peaked inside
09:30-11:00. Two different instruments, one measuring position in the cycle and
one measuring clock time, pointing at the same thing: **the board surfaces a
large share of names after the move that qualified them.**

Neither is a verdict. Q5 is proposed and behind Q1, and this is the variable it
would be answered with rather than the answer.

#### Task 4 can stop. This thread needs nothing it produces.

*Asked by Integration 2026-08-23, as the only thread that used the second
ledger.* The narrow question: is anything still needed from what Task 4
**produces**, as opposed to what it has already **written**?

**Nothing.** Four reasons, in the order they settle it:

1. **This thread never read it.** The Sheet was deliberately not touched — that
   surface belonged to another thread while `sheetPrior` was open. The overlap
   was sized from reported counts and from this archive's own price bands, not
   from the ledger's contents.
2. **Its outcomes are strictly worse than this archive's, and that was
   established here.** Self-graded by the process that made the forecasts, 85.8%
   backfilled, 68 of 204 floats still `Unknown`, duplicate date/ticker rows.
   The outcomes here are tape-derived from raw minute bars.
3. **The one check that wanted it can already run.** The calibration proposed
   earlier — its peak gain %, peak window and prior RTH close against
   `max_gain_pct`, `time_of_high` and `reference_close` — needs *overlapping*
   symbol-days, and 2026-08-17 to 08-21 is already in the corpus. More rows add
   nothing to a one-time validation, and validating a ledger that is being
   retired is not worth doing at all.
4. **Task 4 is not the second grader — confirmed.** The catalyst labelling that
   mattered to Q1 is the **RESEARCH** tab, and Integration verified against the
   report that it is written by **tasks 1 and 2 only**. Task 4 writes ACTUAL
   SESSION LEADERS, PREDICTION SCORECARD, OUTCOMES and PATTERNS. One word was
   doing two jobs: the second *ledger* of outcomes is Task 4's and is strictly
   worse than tape-derived; the second *grader* of catalysts is RESEARCH and is
   untouched.

**One condition, and it is the only thing worth insisting on.** The historical
corpus must not be deleted with the task. The dated tabs for nine, 11-14 and
17-21 August hold the stage calls **as made**, at 22:00, 06:10 and 09:25 — and a
forecast recorded before its outcome is the one category the archive spec calls
irreplaceable, because nothing re-creates what somebody believed at the time.
Stopping the task adds no rows; deleting the workbook destroys a record no
re-run reproduces.

**And the capability is better rebuilt than preserved.** Task 4 grades its own
forecasts. Grading the *desk's* calls against tape-derived outcomes is a
different and more useful thing, and this archive already holds both halves —
`symbol_desk_day` for what the desk believed, `symbol_outcomes` for what
happened. That is a query, not a scheduled task.

##### The consequence nobody was looking for: the verdict has a corroboration path

Tasks 1 and 2 are staying, because they are the desk's only float source and
stopping them would retire pillar 5. So **the 204-row RESEARCH catalyst
labelling keeps accumulating** — the second grader was never at risk and it is
still growing.

That matters more than it first looks. `PILLAR_4_STRONG_FORM_EXCLUDED` rests on
prior-free replay grades: one instrument, ~15% misclassification, one window.
Its stated overturn conditions include a catalyst measurement materially better
than that one. **An independent second grader over the same window is the
cheapest available check on it**, and it requires no new spend at all:

- the RESEARCH tab covers 11-21 August; this archive covers 17-21, so the
  overlap already exists
- those grades are produced by a different model from different sources against
  a different universe
- and they are genuinely independent of the replay grades, because the replay
  arm is prior-free by construction — whatever `sheetPrior` does or does not do
  to the *stored* grades cannot reach it

What it needs is one hand-off: ticker, date and catalyst grade from RESEARCH for
17-21 August. Not read here, for the same reason as before. Agreement would
harden the verdict; disagreement would localise the problem to one grader.
Neither should be quoted as a rate — this archive's side still carries its own
noise floor, and the population is still the desk's board.

**Not requested.** Recorded as available and unbudgeted, because the verdict
stands on its own and this is a strengthening rather than a dependency.

#### The minimum-instrumentation rule, re-examined against a changed trade

*Integration, 2026-08-23, flagging that a working rule of this thread may have
been written under an assumption that has since changed. It was, and the rule
survives with a narrow amendment.*

The rule: **build the minimum instrumentation the active question needs; the
archive spec is a destination, not a prerequisite.** It was written when the cost
of waiting was deferred work. The desk's operating constraint is now *can this
interrupt capture*, on the grounds — this thread's own — that the record grows
only in real time and no run buys a day before 2026-08-17. If waiting costs data
that never exists, that is a different trade.

**The challenge is right about the trade and wrong about the conclusion, because
irreversibility is not uniform.** The archive spec says so in its own words and
this thread had stopped reading it: *"Alpaca serves historical bars, trades and
quotes on the existing subscription. So the tiers decide what is pre-fetched,
not what is possible. A wrong threshold costs an extract, not an answer."*

Today demonstrated it twice, both times by accident:

- **Five days of outcomes were reconstructed from a cold fetch.** `symbol_outcomes`
  did not exist on 2026-08-17 and every row of it was recovered afterwards. That
  data was never at risk.
- **The tier A count was answered from nothing.** 5,827 symbols over 60 sessions,
  fetched in minutes, to establish that the spec's ~900/day was really ~2,830.
  Nothing had to have been captured.

So the amended rule:

> Build the minimum instrumentation the active question needs — **for anything
> re-fetchable.** For anything observable only once, capture early and wide,
> because the cost of waiting is not deferred work but data that never exists.
> The test is not *will a question need this* but **can this be obtained later
> at any price.**

##### What that makes urgent, and it is not tier A

**Tier A is not urgent.** It is one daily row per price-eligible name, which is
daily bars, which are re-fetchable indefinitely. Building it early buys deferred
work rather than data. The 2,830/day figure makes it *larger* than anyone
thought, not more urgent — and the sub-$2 crossers make the eventual capture
more valuable without making it more perishable.

**What is urgent is much smaller, and nobody has named it: there is no dated
record of which symbols were tradable.** `universe` holds one row per symbol,
overwritten in place — 13,089 rows, two distinct `updated_at` stamps in the
whole table, every row currently reading `active`. So *"was this symbol tradable
on 2026-08-19"* is **already unanswerable**, and every delisting makes the
cross-section retroactively incomplete in a way no fetch repairs. The spec flags
delistings as time-critical and nothing captures them.

That is the one item where the changed trade actually bites, and it costs
almost nothing: ~13k rows a day of symbol, date, status and tradability. A few
hundred kilobytes a year against a tier A that is 710k rows and can wait.

**Handed over rather than built**, and not tonight. It belongs with whoever owns
the universe refresh, and the sizing above is offered so the decision is not
taken on the assumption that "capture more" means tier A.

#### Float against shares outstanding: the split explains at most half of it

*Two questions from Integration, 2026-08-24, after the trader pulled 18 floats
and shares-outstanding from Scanz by hand. Four rows have float exceeding shares
outstanding, which is arithmetically impossible, and two are on incompatible
units.*

##### 1. CDTG did split — outside the lookback, exactly as suspected

Integration read `split_sessions_ago = NULL` as "no split" and retracted its own
hypothesis on that basis. The retraction was right to make: **null means no split
within 30 sessions, which is the detector's window, not the world.** Checked over
two years of daily bars:

| Symbol | splits found in ~515 sessions | float vs SO |
| --- | --- | --- |
| CDTG | **2026-06-01 ×25** (~57 sessions back) | 511% |
| TNON | 2024-09-06 ×8, **2026-08-10 ×35** (~8 back) | 187% |
| SGLY | 2026-07-27 ×14 (~18 back) | 100.0002% — one share |
| AEIS | **none in two years** | 104% |
| PFSA | 2026-02-09 ×75, 2026-07-07 ×25, **2026-08-17 ×4** | *consistent* |
| FENG | none in two years | unit mismatch |
| HUIZ | 2024-12-09 ×5 | unit mismatch |

**So the hypothesis is rescued for CDTG and does not generalise.** Splits are
associated with the failure but are neither necessary nor sufficient:

- **AEIS has no split in two years** and is still 104%. No split explanation.
- **SGLY differs by exactly one share.** That is a rounding artefact, not a
  reprocessing boundary.
- **PFSA split four sessions before the pull and is internally consistent.** A
  fresh split does not reliably break it.
- And even where a split exists the magnitudes do not reconcile: CDTG's ratio is
  5.11 against a ×25 split, TNON's 1.87 against ×35. The *direction* fits — SO
  looks reprocessed, float does not — but a single split does not account for
  the size of the gap.

**Which strengthens the product idea rather than weakening it, and sharpens what
the signal should be.** The direct arithmetic test `float > SO` fires on all four
regardless of cause. A split flag catches two. **Do the check; do not try to
predict it.** A confidence signal built on "was there a recent split" would have
cleared AEIS and SGLY and flagged PFSA — wrong on three of five.

##### 2. ADRs are 11% of the board, so the unit check is not an edge case

The desk already classifies them: `ADR_ADS`, 291 symbols, all discovery-eligible.
On this archive's 252 board symbols over 17-21 August, **27 are ADRs — 11%**,
one name in nine:

`ADXN AHG AMBR BDRX ENRD EVAX FENG FRSX HCM HSAI HUIZ ICG IQMX JFU KRKR LU MNSO
MOGU PCLA RERE SCNI SOHU STG STKH TKLF XTLB ZKH`

Both of the unit-mismatch cases — FENG and HUIZ — are on that list. A float/SO
ratio under ~2% as a unit-mismatch test would therefore be checking a real and
recurring population, not a curiosity.

##### 3. What this thread cannot measure, and agrees it cannot

The rate at which `float > SO` fires across a large sample. **The archive does
not capture float**, by the trader's standing decision that no Sheet-read float
enters it, and that is unchanged by this. Integration is right that the number
needs more manual pulls.

One thing that is reachable and worth saying: **the consistency check needs no
archive change at all.** It is arithmetic between two numbers at the moment both
are in hand — `float > SO` refuses, `float/SO < 2%` suspects a unit mismatch. It
belongs wherever float is displayed, not in a store. The archive would only
matter if the *rate* became a question worth tracking over time, and that is a
reason to capture float later rather than a reason to capture it now.

##### Done: the threshold is out of the stored value, and it changed the baseline

*Approved by the trader via Integration, 2026-08-24.* `split_sessions_ago` now
searches the whole fetched series, and `split_lookback_sessions` records how far
that went. Null means "none found in N sessions" with N in the row. The daily
history fetched for board symbols widened to two years, so the window averages
**408 sessions** and runs 3 to 503.

**Hypothesis 3 is preserved exactly**, which was the condition: 17 symbols in the
6-30 bucket, 12 of which ran 50%+, 70.6%. Identical, because 6-30 is now a
read-time filter over the same fact.

**And the wider window found something the cap was hiding.** The old baseline —
"no split within 30 sessions", 223 symbols at 27.8% — was a blend of two
populations:

| | symbols | ever ran 50%+ |
| --- | --- | --- |
| no split found at all (up to ~500 sessions) | 150 | **20.7%** |
| split 0-5 sessions ago | 12 | 25.0% |
| **split 6-30 sessions ago** | 17 | **70.6%** |
| split 31+ sessions ago | 73 | **42.5%** |

92 symbol-days that read null before now carry a distance. The true never-split
baseline is **20.7%, not 27.8%** — the old figure was inflated by 73 symbols that
had split earlier and run at more than twice the never-split rate.

That makes the shape richer and more credible than the binary it replaced. A
split at *any* distance roughly doubles the rate (42.5% against 20.7%); the 6-30
window is a peak on top of that; and a split in the last five sessions is
indistinguishable from never having split. The gradient is what a real mechanism
looks like — the float takes time to clean up, and a name that split this week
has not had it yet.

Still 17 symbols at the peak, still one week, still the desk's board. Nothing
here is a verdict. But the finding survived a change to the variable it rests
on, which is the first time tonight a result has been re-derived on a different
footing and come back the same.

##### The design change that produced it

`split_sessions_ago` bakes a 30-session threshold into a stored value, and CDTG
is the case that shows why that is wrong — the field said null and the answer was
57. Per the spec's own rule, **store facts, never scores**: the stored value
should be the distance to the most recent split within the *fetched* window,
with the window length recorded beside it, so null means "none in N sessions"
with N known.

Hypothesis 3's finding is unaffected — it filters 6-30 sessions, which is a
read-time filter over the same fact — so this is a pure improvement rather than
a redefinition. Not built; it changes a column a live finding reads from and is
worth doing deliberately.

#### Second Scanz pull: arithmetic verified, two counts off, and a correction of my own

*44 more names, 2026-08-24. Integration asked for verification rather than
agreement, having been wrong twice on this data. Every ratio recomputed from the
raw figures.*

**All the arithmetic is right.** SDOT 1440.6%, TWG 1097.6%, AUUD 971.0%, ZSTK
284.6%, BTOG 150.3%; SCNI 0.020%, XTLB 0.159%, ADXN 0.678%, EVAX 1.362%, ZKH
1.631%, JFU 1.963%; STKH 421.8%. Row counts confirm: 33 main, 11 ADR
supplement, 2 floats missing with SO present.

**Two counts do not reconcile, and both matter because this decides a build.**

*`float > SO` is 8 or 9 depending on an unstated judgement.* Second pull gives 5,
first pull gave 4 — CDTG, TNON, AEIS and SGLY. That is 9. The headline of 8
requires excluding **SGLY, where float exceeds SO by exactly one share**
(520,964 against 520,963). That exclusion is defensible and I made the same call
myself, but it is a judgement about rounding rather than a count, and it should
be stated rather than absorbed.

*The ADR denominator is not 12.* Computable ratios: 10 in the supplement —
ENRDW has no SO — plus YJ is 11, or 13 if the first pull's FENG and HUIZ are
included. The numerator of 8 works on the 11 (six under 2%, plus YJ, plus STKH);
on 13 it is 10. **8 of 11 or 10 of 13, not 8 of 12.** The direction is unaffected
either way; the rate is high on any reading.

**A name nobody flagged: SIMA at 1.802%.** A non-ADR, classified
`COMMON_EQUITY`, under the 2% unit-mismatch threshold and not on anyone's list.
Either it is a second misclassified ADR like YJ, or the ratio test has a false
positive on an ordinary share. It is in the archive and never ran — best gain 6%
— so nothing turned on it, but it is the first evidence about the *specificity*
of the 2% test and it points the wrong way.

##### Does `float > SO` correlate with anything here?

Ten flagged names, nine in the archive, against the 25 clean names from the same
pull:

| | in archive | ever ran 50%+ | had a split | ADR |
| --- | --- | --- | --- | --- |
| flagged (`float > SO`) | 9 | 7 (**78%**) | **9 (100%)** | 1 |
| clean, same pull | 25 | 16 (64%) | 13 (52%) | 0 |
| whole archive | 252 | 77 (31%) | — | 27 |

**Not with outcome.** 78% against 64% on nine names is nothing, and both are far
above the 31% baseline because *both samples were drawn from names the trader was
already looking at*. The comparison inside the pull is the only valid one and it
shows no effect. Nor with price — flagged spans $0.86 to $13.18, clean $0.97 to
$11.59 — nor with ADR status, one of nine.

**So "nothing" is the answer, and it is the one that makes the arithmetic check
the only viable signal.** There is no cheaper predictor hiding here; the test has
to be the test.

##### Correcting myself: "splits explain at most half" was wrong

Every one of the nine flagged names in the archive has a split — 9 of 9, at 0,
6, 15, 18, 54, 60, 94, 262 and 271 sessions. Yesterday this note said splits were
"neither necessary nor sufficient" and explained at most half, on the strength of
CDTG reading null and SGLY looking like rounding.

**That was measured on the 30-session cap, which is the very thing this thread
removed hours later.** CDTG is 54 sessions, SGLY is 15. The reasoning was wrong
and I should have distrusted it for exactly the reason I gave Integration when
*they* made the same mistake: absence of detection is not detection of absence.

The conclusion survives, on better grounds. **Splits do not discriminate**, not
because flagged names lack them but because **13 of 25 clean names have one
too** — over a ~400-session window a split is a common event, not a rare one.
AEIS is still the counterexample with none in two years. So a confidence signal
built on "was there a recent split" remains the wrong design, and the arithmetic
check remains the right one. Same answer, sounder reason.

#### The model bill has a denominator, and it reads onto the coverage classes

*Research, via Integration, 2026-08-24. Measured against the production snapshot
rather than estimated. Recorded here because it is the first cost figure on this
desk with a denominator, and because it changes what one of this archive's own
columns means.*

| Stage | calls | input tokens | share |
| --- | ---: | ---: | ---: |
| DISCOVERY | 216 | 7,862,324 | **56%** |
| RESOLVER | 181 | 3,853,202 | 28% |
| INTERPRETATION | 312 | 2,024,072 | 14% |

**84% of input tokens go on finding evidence and 14% on reading it.** Anything
reasoning about cost per dossier should start there rather than at the
interpretation call, which is the one everybody pictures.

**And the obvious inference reverses.** Discovery looks like waste at 56%, but
attributing sources by `metadata.discoveredBy` rather than by a time window,
**discovery-bought sources are cited by a dossier 55% of the time against 37%
for the free deterministic ones** — paid sources are used *more*. The productive
rate does not decay across repeats either (22, 15, 22, 33, 25% by ordinal), so
capping repeat discovery would cut cited evidence roughly in proportion to
spend.

Two footings in one finding and only one is soft: 36 of 112 sources did not
match a call inside the 5-minute window, so the ordinal table rests on **76**.
The 55-against-37 citation figure does not depend on that attribution and is
exact. Research carried the limit itself rather than being asked for it.

##### What it changes here: `NO_LOOK` is free and `IN_FLIGHT` is not

This archive's coverage classes were built to separate evidence about the market
from evidence about the pipeline. They turn out to carry a cost reading nobody
has used, and the stage split is what makes it visible.

Discovery and the resolver run **before** the interpretation that produces a
grade, and they are 84% of the bill. So:

- **`NO_LOOK` cost nothing.** Nothing was attempted; no stage ran.
- **`IN_FLIGHT` and `FAILED` may have cost almost everything.** A job that
  queued, discovered, resolved and then died before interpretation spent the
  expensive 84% and produced no grade at all.

19 August had **10 `IN_FLIGHT` and 17 `NO_LOOK`**. Read as coverage those are 27
names lost. Read as cost they are completely different: 17 that were never
started, and 10 that were paid for and produced nothing. **The outage's cost was
not only lost coverage — part of it was spend that bought no grade**, and the
coverage column already distinguishes the two without anyone having asked it to.

Not quantified: per-ticker token attribution is not in the extract, so how much
those 10 actually cost is unknown. The classes make the question askable, not
answered.

##### Two methodological notes worth keeping

**"Filed, then measured."** Research filed a cost-leak item on inference,
measured, and retired its own item — 169 of 175 tickers took exactly one
resolver call and the six repeats each span two days, which is what the 24h
cooldown permits. Its own words on the mistake: the ordering. That is the
cheapest rule of the day and it costs nothing to adopt — **measure before
filing, not after.**

**The 5-minute attribution window is the same shape as the 30-session cap.** A
source that took six minutes reads as unattributed, exactly as a split 57
sessions back read as no split. Research carried the limit explicitly and the
finding is honest, so this is not a criticism of it — but the fix is the one
already applied here: **record the window beside the number** so a later reader
cannot mistake "outside what I looked at" for "did not happen". Thirty-six
unattributed sources is a fact about a threshold, not about the pipeline.

#### The 08-20 capture hole does not reach Pillar 4 — checked, not assumed

*Reported by Integration 2026-08-24: `ticker_session` holds 4,165 rows on
2026-08-20 against ~8,600 on every neighbouring day, and 4,452 symbols present
on both 08-19 and 08-21 have no 08-20 row. The gap sits in the middle of this
archive's window, which is the shape that silently moves a windowed measure.*

**Pillar 4 is unaffected, on three independent checks.**

1. **`ticker_session` is not in the extract.** `data/assessments.db` contains
   `desk_assessments` and `desk_assessment_tickers` and nothing else. There is no
   path by which a missing session row reaches this archive.
2. **Nothing in `lib/archive/` reads it.** The only occurrence in the whole
   thread's code is a comment in `store.ts` about what `claimStoreForMode`
   deletes.
3. **The board on 08-20 is complete.** 18 assessments × 25 tickers = 450 rows,
   ranks running 1 to 25 exactly as on every other day, 65 distinct symbols.

The third is the one that matters, because the first two only answer the direct
question. The indirect one — *did the hole change what reached the assessments?*
— turns on whether the board's candidate pool was thinned. It was not:
**the shortfall is the unranked tail**, ranking produced its full top-25, and
only ranked names ever reach a board snapshot. Coverage on 08-20 was in fact the
week's best at 78% usable, with 45 of 51 grades produced that day.

So the answer for the README is *checked, unaffected*, and the three checks are
the reason rather than the assertion.

##### What it does reach, and does not

**The unranked tail is exactly the population tier A is for.** 4,452 symbols on
one day is the cross-section, not the board — invisible to everything built so
far precisely because everything built so far is board-scoped.

But **tier A is not damaged by it**, and the reason follows from the amended
rule rather than from luck: tier A is one daily row per price-eligible name,
derived from **daily bars, which are re-fetchable indefinitely.** What `ticker_session`
holds that bars cannot reproduce is the desk's *live derived state* — RVOL as
computed at that instant, board rank — and for the unranked tail rank is null by
definition and RVOL is re-derivable from the same bars. The irreplaceable
component of those 4,452 rows is close to nothing.

That is the re-fetchable-versus-observable-once distinction doing useful work on
its first real test: **the hole is in the cheap half.** Had the same day lost its
*ranked* rows, or its assessments, the answer would be the opposite and nothing
would buy them back.

##### On the 133-against-178 disagreement

Not resolved here and it does not need to be, because nothing in this archive
depends on either figure. Integration's instinct is right that the gap is
definitional — its own is *symbols present on both 08-19 and 08-21, absent on
08-20, carrying a rank on either* — and the general rule this desk keeps
arriving at applies: **two threads' numbers need a unit, not a caveat.** The
shape, 130 to 180 watched names with a one-day hole, is what any question of
mine would use, and no question of mine currently has one.

#### The filed share count is pre-split, and it makes the defect look smaller

*Research, 2026-08-24, from Phase C: `dei:EntityCommonStockSharesOutstanding` is
a **cover-page figure and is not retroactively split-adjusted.** It found this
asking why the model's `sharesOutstanding` disagreed with the filed count on 58
of 125 dossiers, expecting the model to be wrong — and in five of the six worst
cases the model is right and the filing is pre-reverse-split. EBON's count is
`asOf` 2019-12-31 against a 1-for-30 in Nov 2022.*

**The `float > SO` finding is unaffected**, because those figures came from a
Scanz panel — same source, same instant, no filing involved.

**But the direction matters and it runs the helpful way, which is the dangerous
way.** A stale filed count on a reverse-split name is the *pre-split* number, so
it **overstates** shares outstanding. An overstated denominator makes `float/SO`
**smaller**, so `float > SO` fires **less often**.

> **Recomputing that test against SEC-filed shares would understate the defect
> rate**, and it would do so worst in exactly the population where it matters:
> all nine flagged names in this archive have a split, at 0 to 271 sessions.

That is a correction to a claim in the shared README, which currently calls a
filed denominator **stronger, because it is filed rather than derived.** On this
universe it is not stronger — it is stale by construction on precisely the names
the test is about. Filed and current are different properties and the reverse
split is where they separate.

**And the asymmetry argument was refutable from data already in this archive.**
Research's module had gated only `float > shares` on staleness, reasoning that an
old count understates today's shares so staleness could hide a mismatch but
never manufacture one — an argument that assumed dilution and forgot reverse
splits. This archive had already measured how ordinary they are: **34,451 of
102,731 symbol-dates over a 730-session window sit on a pre-split basis, 33.5%.**
Not an edge case; a third of the record.

Research's own naming of the failure is the durable part and it is better than
the fix: *"the elaborate justification was the defect — a plain 'gate both'
would have been correct and would not have needed a paragraph. I wrote the
paragraph because the asymmetry felt like an insight."* The replacement rule
belongs beside this thread's basis rule: **a denominator that may be wrong in an
unknown direction cannot support any arithmetic about it.**

Worth adding what it deliberately did *not* do: it did not split-adjust.
`reverseSplitHistory` is model-extracted prose, and dividing a share count by a
number parsed out of a sentence is a worse failure than declining to answer.

**On the storage decision**, `dossier.filedShares` sits *beside*
`structure.sharesOutstanding` rather than replacing it, because the disagreement
proves they are different quantities and neither is trustworthy alone — which is
this thread's basis rule arrived at from the other side. And no verdict is
stored, with a test asserting the absence: baking a live external value into an
append-only record is the error, not the omission.

#### The 65-field audit: what this thread will annotate for

Research produces the inventory, Design annotates what must survive on screen,
this thread annotates what the archive needs — and stays out of `research.md`,
sending annotations through Integration so the audit lives in one table.

The criteria, stated ahead of the inventory so it can be shaped for them. They
are the archive spec's own irreplaceability test, sharpened by what today cost:

- **Is it irreplaceable if not captured live?** Derived desk state — RVOL at
  that instant, board rank, what else was competing — is not re-fetchable at any
  price. Keep unconditionally.
- **Is it re-fetchable later?** Prices, bars, filings. Do not capture; fetch on
  demand. `daily_bars` was kept for months and still could not serve the
  backfill.
- **Does it have more than one possible definition?** Then it needs its **basis
  stored beside it**, not described in a comment. Every expensive error today was
  this: `reference_close` flipping at the bell, `rth_close` versus the auction, a
  catalyst grade served from a three-session-old analysis, a cycle about to mean
  two different things either side of a date.
- **Is it displayed today?** Irrelevant — and this is the annotation no other
  thread will make. A field no surface renders can still be the only witness to
  a question nobody has asked yet.

#### Phase C: a derived float is a different word

A filing-derived float will not equal the Sheet's vendor-displayed one. If the
archive ever captures float — and the trader's standing decision is that no
Sheet-read float enters it — then the two are **different definitions sharing a
name, and the boundary between them is a date.**

**Generalised into `integration.md` on 2026-08-23**, so it applies to every
field rather than to float. The rule this archive arrived at the hard way: **any value with more than one possible
definition is stored with its basis in an adjacent column, and a change of
definition is a change of value in that column, never a silent change of meaning
in the same one.** `reference_basis`, `adjustment_basis` and `split_detected` all
exist because that was learned late. Float should arrive with `float_basis` from
the first row rather than the hundredth.

#### Join arithmetic, which the retraction does not change

*From Integration, and corroborated here.* A replay emits one grade per
**ticker**, not per symbol-day — `readSources` has no date filter, so every run
bundles all of a ticker's evidence. Of the tickers with a stored analysis in the
window, those with more than one stored version cannot have a single prior-free
number attributed to a particular day *if the stored grade moved between
versions*.

This archive's full population gives the same ratio as Integration's
contaminated subset: of 172 tickers with a stored analysis, 128 have one
version, 44 have several, and **29 of those 44 (66%) carry a differing grade** —
against Integration's 19 of 29, also 66%.

One refinement worth having. The split is not "single-version clean, multi
ambiguous". A ticker with several versions whose grade **never moved** is also
cleanly joinable, because there is nothing to attribute — every symbol-day
carries the same stored grade and a single prior-free number compares against a
constant. That is 15 more tickers here and 10 in Integration's subset, so the
clean set is **37 of 56 rather than 27**.

`as-of` source filtering would retire the problem for all of them, at roughly 2x
interpretations plus a code change. It would also retire the snapshot-pinning
condition, since look-ahead would be excluded by construction rather than by the
accident that only one source in the current snapshot postdates the window —
**an accident that decays**, because every day that passes adds sources that
postdate it.

### structureClassification: what the archive can and cannot say about it### structureClassification: what the archive can and cannot say about it

*Routed here by Integration 2026-08-23 as the measurement half of a finding it
gave Design. Three questions were put; the first two are answerable from the
production extract and the third is not.*

Research's control found `structureClassification` moving **2 of 6** on
byte-identical evidence while catalyst held at 0 of 6.

**Does anything here read it across checkpoints?** The desk does:
[`lib/desk/assessment.ts:269`](../../lib/desk/assessment.ts:269) puts
`structure X → Y` into the deterministic diff, so every change becomes a
recorded event in `changed_fields` and `change_summary`. **This archive does
not** — `symbol_desk_day` has no structure column and nothing in `lib/archive/`
reads the field. So nothing built here needs a caveat; the exposure is the
desk's change summaries, which is Design's surface and already routed there.

The measurement half, stated precisely: **every structure change in the record
coincides with a new analysis version, and none occurs without one.** Over 1850
ticker rows and 1248 consecutive checkpoint pairs:

| Transition | pairs | structure moved | catalyst moved |
| --- | --- | --- | --- |
| analysis version unchanged | 1192 | **0** | **0** |
| analysis version changed | 56 | 29 | 29 |

So "structure changed between checkpoints" is exactly "the name was re-analysed",
and given Research's control an unknown fraction of those 29 are re-generation
rather than anything the market did. That is the caveat any such count needs.

The zero row is worth stating on its own: **within a stable analysis version
nothing moves**, on either field, across 1192 pairs. The archive's frozen-state
design does what it claims and Research's finding does not reach it.

**Should the archive record which version produced a structure reading?** It
effectively already does. `analysis_version_id` is stored per ticker row and
backs the whole dossier, structure included — and the table above is the
verification that licenses saying so, since structure never moves while the
version holds. If structure is ever added here, the ageing mechanism built for
the catalyst grade covers it with no new capture. Nothing to build today.

**Should these rates be re-measured at this archive's sample sizes?** No — and
this section has now been wrong twice, in three different ways, so the working
is shown rather than the answer.

*First error, mine.* I argued the 52% could not be a noise estimate because
catalyst was "known stable at 0 of 6" on fixed evidence. That came from two
control runs and was withdrawn.

*Second error, mine.* Having retracted that, I wrote in a different section that
most of the 52% was therefore noise — leaving both claims live in the same
document thirty lines apart.

*Third error, and the one that produced the strongest claim of the day.* I read
Research's "2 of 6" and "3 of 6" as churn rates. **They are not.** They are the
share of *tickers* returning more than one distinct value across *four* draws. A
ticker splitting 3-1 counts as fully unstable in that unit while disagreeing on
only half its pairs. The churn-comparable figure is pairwise — every pair of
draws, 36 per field:

| Field | any-instability across 4 draws | **pairwise floor** |
| --- | --- | --- |
| catalystGrade | 2 of 6 (33%) | **6 of 36 (17%)** |
| structureClassification | 3 of 6 (50%) | **9 of 36 (25%)** |
| cycleClassification | 2 of 6 (33%) | **6 of 36 (17%)** |

Only the right-hand column is subtractable from a churn rate measured between
two observations, which is what the 52% is.

**Struck: "structure transitions carry essentially no information."** It rested
on a 50% floor sitting flush against 52% observed. The comparable floor is 25%,
half that, and the claim does not survive the correction. It is removed rather
than softened, because it was built on a unit error and there is nothing left of
it.

Redone against the pairwise floors, showing both compositions since neither is
obviously right:

| Field | observed churn | pairwise floor | subtraction | independent composition |
| --- | --- | --- | --- | --- |
| catalyst | 52% | 17% | 35% | 42% |
| structure | 52% | 25% | 27% | 36% |

So **both fields carry substantial real signal** on re-analysis, and structure is
not the empty one. That is the opposite of what this section said an hour ago.

*The lesson worth keeping, which is Research's and not mine.* I treated 50%
against 52% as making the conclusion **robust**. Two independently derived
numbers landing that close is the moment to check whether they are the same
quantity, not the moment to declare a result. The coincidence was the evidence
of the error, and I read it as corroboration.

*What is still soft in both directions.* Six names. Subtraction is not the right
composition and independence is an assumption. The production comparison cannot
hold evidence constant, which is why the indirect route exists at all. These are
order-of-magnitude figures, and the direction of the correction is firmer than
any magnitude in it.

*What stands untouched, and it is the only thing here that does.* The zero row:
**0 moves across 1192 same-version pairs**, every field. A structural fact about
the archive rather than an inference from anyone's controls. It establishes that
nothing is spuriously rewritten within a version, and it licenses saying
`analysis_version_id` already covers structure. It says nothing about whether
cross-version changes are signal or noise — that was the overreach in the first
place.

One thing the extract does add, unprompted and relevant to whether the field is
worth stabilising: `structure` takes **three values** across 1459 non-null rows —
`CAUTION` 871, `UNKNOWN` 365, `DIRTY_FLOAT` 223 — with one of them accounting for
60%. A three-level field where the mode is most of the mass carries little
information before any instability is considered, and a 2-in-6 flip rate is
large against that resolution. Whether it is worth stabilising or worth dropping
is Design's and Research's call, not this thread's, but the base rates belong in
front of it.

### Q1's premise against the pipeline's own numbers — the gap is definitional

*Handed over by Research via Integration, 2026-08-23. Resolved here, because it
is a question about populations and this archive holds both of them.*

*Re-sent by Research 2026-08-23 alongside the independence result; already
resolved here and recorded so it does not circulate a third time.*

Research reported that across 94 stored dossiers the pipeline's outright
no-catalyst verdict is **10%**, not the 50%+ Q1's premise implies:
`MODERATE_MIXED_SECONDARY` 31%, `UNKNOWN` 26%, `LEGITIMATE_POSITIVE` 18%,
`WEAK_NEGATIVE_DILUTIVE` 14%, `NONE` 7%, `STRONG` 4%. Its proposed resolution
was that the trader observes names that **ran** while the pipeline observes
names that were **researched**, and those are different sets.

**That resolution does not survive this archive, and something simpler does.**

Grade distribution over 211 researched symbol-days with admissible coverage,
split by whether the name actually ran:

| Grade | ran 50%+ (n=84) | did not (n=127) | all (n=211) |
| --- | --- | --- | --- |
| STRONG | 2 | 1 | 3 (1.4%) |
| LEGITIMATE_POSITIVE | 15 | 16 | 31 (14.7%) |
| MODERATE_MIXED_SECONDARY | 29 | 61 | 90 (42.7%) |
| WEAK_NEGATIVE_DILUTIVE | 11 | 10 | 21 (10.0%) |
| NONE | 4 | 8 | 12 (5.7%) |
| UNKNOWN (honest) | 23 | 31 | 54 (25.6%) |

Two things fall out.

**The population split explains almost nothing.** Restricting to names that ran
barely moves the distribution — a legitimate-positive-or-stronger grade appears
on 20% of movers against 13% of non-movers. Movers are *slightly more* likely to
carry a catalyst, not less. Whatever separates the trader's observation from the
pipeline's number, it is not researched-versus-ran, at least not within the
desk's board.

**The gap is a definition.** These are the same measurement read against two
different bars:

| Reading | Among the 84 movers |
| --- | --- |
| "searched and found nothing at all" — the pipeline's `NONE` | 4 (**4.8%**) |
| no *legitimate positive or stronger* catalyst | 67 (**80%**) |

The pipeline's 10% is `NONE_FOUND`: a search that returned nothing. The trader's
"no catalyst" is Pillar 4's bar — a **breaking news** catalyst. Everything in the
middle, `MODERATE_MIXED_SECONDARY` and `WEAK_NEGATIVE_DILUTIVE` and an honest
`UNKNOWN`, is 63 of the 84 movers, and the pipeline counts those as *having* a
catalyst while a momentum trader looking for breaking news would not. Read on the
trader's bar, **80% of 50%+ movers carried no real positive catalyst** — which is
in the neighbourhood of the premise rather than contradicting it.

So the two are not in conflict and neither is wrong. They answer different
questions, and this archive's own distribution reproduces the pipeline's closely
enough (`UNKNOWN` 25.6% against 26%, `NONE` 5.7% against 7%) to say so with some
confidence despite different windows and units — symbol-days here, dossiers
there.

**What this does not settle.**

- **It rests entirely on the catalyst grade, so it is suspended with everything
  else** pending `sheetPrior`. If the grade carries the Sheet's prior then the
  80% is partly a second model's opinion of what counts as a catalyst.
- **The genuine population gap is still untested and is not the one Research
  named.** The trader observes movers *in the market*; this archive observes
  movers *on the board*, which is the top 25 by RVOL out of roughly 900
  price-eligible names. A name that ran 50%+ and never reached the board is
  invisible here. That is the tier A cross-section, it does not exist, and it
  remains the reason Q3 is unanswerable.
- Research's caveats are carried: its figures are the local `market.db`,
  dossiers from 08-17 and 08-18 only, file last written 20 August, against
  production's `COMPLETE` 120 / `PARTIAL` 619. Indicative, not settled. The
  comparison above is against this archive's five production days, which is why
  the two agree in shape but not in exact proportion.

**Not commissioned.** Research has this folded into a five-day pass already
scoped alongside the independence re-run and the outcome eval — three questions,
one set of tokens, costed and with the trader. Nothing here asks for a separate
run and none is needed: the resolution above used data already on disk.

**Two claims Research withdrew, recorded so they are not inherited from a later
summary.** That 65% of dossiers built on SEC-only bundles indicated
under-detection — withdrawn; discovery runs on its own interval regardless of
what SEC returns and records its misses, with 74 of 77 issuers carrying a
`lastDiscoveryAt` and a fingerprint on a null result, so an SEC-only bundle is a
measured negative rather than a blind spot. And that `sourceShape` was undefined
across the registry — withdrawn; the field does not exist in that schema and its
absence was read as breakage.

### The grades in this window were made without the share count

*Reported by Research via Integration, 2026-08-23.* The reported share count was
parsed into metadata that `toBundleSource` never forwarded, so **the interpreter
never saw it** — while coverage recorded the fact as present. Fixed; it now
reaches the model for 62 of 77 issuers, against 27 of 94 before.

This is a quality boundary running straight through this archive. Every catalyst
grade in the 17-21 August window was produced *before* that fix, by a model that
in most cases had not been shown the share count. The grades are not wrong for
it, but they were made on less than their own coverage claimed, and a re-run
after the fix would not be reproducing them — it would be answering a better-fed
question. Any comparison across that boundary has to say which side it is on.

It bears hardest on hypothesis 3. Share count is the supply variable, and
supply events are precisely what that hypothesis says the catalyst became. The
split result stands regardless — `split_sessions_ago` comes from raw and
split-adjusted daily bars and never touches a dossier — but the *catalyst-grade*
half of testing hypothesis 3 was run blind to the number most relevant to it.

Two things worth carrying forward:

- **The supply bound is now banded rather than boolean**, on the ratio rather
  than the raw count: `NEGLIGIBLE`, `PRESENT`, `HEAVY`, `SEVERE`,
  `EXCEEDS_SHARE_COUNT`. Deliberately asymmetric — a high band is conclusive
  because the denominator is an upper bound on float, while `NEGLIGIBLE` proves
  almost nothing. That asymmetry has to survive into any analysis: the bands are
  not a scale and their midpoint is not a middle. It is the first supply
  variable that would be usable for hypothesis 3 beyond splits, and this archive
  does not capture it yet.
- **A status field claiming more than it delivered** is the same shape as the
  problem this note has hit twice already — `intelligence_status` reading
  `AVAILABLE` for a grade served from an older analysis, and `rth_close` looking
  like the official close. Coverage said the share count was present; the model
  had never seen it. Worth stating as a pattern rather than three coincidences,
  because the next one will look like the last two.

This archive's own coverage measure is not affected: it classifies whether an
analysis *existed*, not what went into one. That is a narrower claim than it
might look, and narrow is why it survives.

### Float is Sheet-derived, which reaches this archive

`resolveDisplayedFloat` (`lib/dashboard/merge.ts:143`) has exactly two branches,
the RESEARCH tab and the TODAY tab, and the type enumerates nothing else.
**Every float on the desk comes from the Sheet.** Recorded by Integration in
`4b06764`.

Three consequences for this thread, none of them acted on yet:

1. **Pillar 5 is not independently measurable today.** Float under 10M is one of
   the five pillars and this archive does not capture it. The only available
   source is the one whose provenance is already the open question.
2. **It would not lift the overlap constraint cleanly.** Sizing the shared
   population against the second ledger stalled on float, and taking float from
   the Sheet to do it would mean filtering the Sheet's universe by the Sheet's
   own numbers — which is not a filter, it is agreement by construction. A
   *derived* float would lift the constraint; a Sheet-read one would not.
3. **The desk and the second ledger are not independent on float either.** Their
   float and this desk's float are the same field from the same workbook, so a
   float comparison between the two records nothing. Only the catalyst labels
   were ever candidates for independence, and only if `sheetPrior` comes back
   clean.

### A second outcome ledger exists over the same window

*Reported by Integration 2026-08-23, from the ChatGPT side. Not read by this
thread — see "what would be needed" below.*

The Google Sheet is written by four weekday ChatGPT tasks (22:00, 06:10, 09:25,
16:15 ET) and holds a parallel record of 11-21 August: an OUTCOMES tab of 148
rows over 115 tickers with peak price, peak gain %, peak window, giveback and
self-assigned grades; a RESEARCH tab of 204 rows over 146 tickers with catalyst
grade plus source URL and timestamp, float with vintage, split history and
filings; dated tabs; and a patterns layer. Catalyst grades across the 204:
35 A, 46 B, 123 C.

**Why it matters to Q1.** Q1 asks whether movers stopped carrying catalysts or
whether the desk stopped seeing them. Those two worlds are separated by a second
grader over the same period, and until now there was not one.

**The asymmetry that decides what it is worth**, and it is worth stating because
it is not symmetric at all. Contamination can only flow one way. Nothing in
`lib/`, `worker/` or `app/` writes to the Sheet and the desk's access is
read-only, so **the Sheet's grades cannot have been influenced by this desk**,
whatever `sheetPrior` turns out to do. The unresolved risk runs the other
direction only. That yields two cases:

- **If `sheetPrior` does not reach the interpreter.** Two independent graders
  over one period. Agreement is corroboration and disagreement localises the
  problem to one side. This is the good case and it is the one Q1 wants.
- **If it does.** Our grade is partly the Sheet's, so *comparing the two is
  circular* — but the Sheet's own grade is still independently produced. It can
  then be used as Q1's independent variable **instead of** ours for names in the
  overlap, rather than as a check on ours.

*Resolved 2026-08-23 into neither case cleanly.* The prior's effect is not
established, so the first case is the live one — but the comparison is limited
by something this section did not anticipate. Our grade is ~1/3 irreproducible,
so comparing it against another labelling measures the disagreement of both.
Agreement would still be informative; disagreement much less so; and no rate
should be quoted until the noise floor on our side is known.

So the ledger has a use either way. What collapses in the bad case is the
comparison, not the second labelling. That is a better position than it first
looks, and it is the reason to size the overlap now rather than after Research
answers.

**It is not ground truth and must not be used for outcomes.** Its outcomes are
self-graded by the same process that produced the forecasts, its float and
catalyst fields are 85.8% backfilled by a retrofit, 68 of 204 float values still
carry Unknown language, and it contains duplicate date/ticker rows with no stage
key. The Alpaca-derived outcomes in this archive are the honest measurement.
Take catalyst *labels* from that side; never outcomes.

**Overlap, sized from this side only.** The universes differ — theirs is $2-$10
with float under 20M, this desk's is $1-$20 ranked on RVOL — so the shared
population is a fraction of both. Their dated tabs cover nine, 11-14 and 17-21
August; this archive covers 17-21, so every date here is inside their window.

| | symbols |
| --- | --- |
| on the board, 17-21 August | 252 |
| of those, traded inside $2-$10 at any point | **159** |
| of those, opened RTH inside $2-$10 | 133 |
| distinct symbols that ran 50%+ | 77 |
| of those, inside $2-$10 | **63** |

159 is a ceiling from this side before their float filter, which will cut it
further and which this archive cannot apply — float is not captured. The number
that matters is the last one: **63 of the 77 distinct names that ran 50%+ are in
their price band**, so the overlap on the population Q1 is actually about may be
usable even if the overall intersection is thin.

**A check worth running first, because it needs no answer from Research.** Their
OUTCOMES tab carries peak gain %, peak window and prior RTH close — the same
quantities this archive derives from raw minute bars. Comparing them on shared
symbol-days calibrates their ledger against the tape, and it touches the
catalyst grade not at all. If their peak-gain figures track `max_gain_pct`, their
catalyst labels get more credible by association. If they do not, that is a
finding about the whole ledger before any of its labels are used. It also
re-uses the reference-basis discipline this archive already had to build: their
"prior RTH close" is exactly the field this note found the desk flipping at the
bell, and a mismatch there would be the first thing to check.

**What would be needed, and what this thread will not do.** Sizing the overlap
properly needs one thing: the ticker-by-date list from OUTCOMES and RESEARCH for
17-21 August. **This thread has not read the Sheet and will not.** The Sheet
client and its credentials sit on another thread's integration surface, that
surface is the live question in `research.md` Open item 5, and a ticker list is
cheap to hand over. Reading it here would tangle who touched what at exactly the
wrong moment.

**On the source report itself.** Its §13 records that it was written without
access to this repository and with the connection expired, so it is first-hand
on the Sheet and second-hand on this application. Nothing in it about this
system's architecture has been verified here and none of it has been acted on.
The two claims that reach this note — the tab contents and the grade counts —
are about the Sheet, which is the half it is first-hand on.

### Pillar 4, with coverage held constant

Catalyst grade among symbol-days whose coverage is admissible and whose outcome
is known:

| Grade | ran 50%+ (n=84) | did not (n=127) |
| --- | --- | --- |
| STRONG | 2 | 1 |
| LEGITIMATE_POSITIVE | 15 | 16 |
| MODERATE_MIXED_SECONDARY | 29 | 61 |
| WEAK_NEGATIVE_DILUTIVE | 11 | 10 |
| NONE | 4 | 8 |
| UNKNOWN (honest) | 23 | 31 |

**Suspended pending `sheetPrior` — see above.** The numbers are recorded because
they are what the archive says; whether they measure the market or partly
measure a ChatGPT scheduled task is the open question.

**20% of 50%+ movers carried a legitimate-positive or stronger catalyst.**
Against 13% of the names that did not run — a real difference in the expected
direction, and nowhere near what Pillar 4 describes as non-negotiable. Two
`STRONG` grades in the entire week. The largest single group among movers is
`MODERATE_MIXED_SECONDARY`, and the second largest is an honest `UNKNOWN`:
27% of the names that ran 50%+ were looked at by research, which could not
determine a catalyst.

This is consistent with Pillar 4 having stopped binding. It does not yet say
which of the four hypotheses explains it — and it is not evidence of anything
until the grade's provenance is settled.

### Hypothesis 3 has its first real evidence, and the timing is the point

Q1's third hypothesis: the catalyst moved from the news wire to the filing
cabinet — reverse splits, offering completions, S-1 effectiveness. Supply
events, not news events. `split_sessions_ago` tests the free part of it.

Per distinct symbol, over the 252 names on the board that week:

| | symbols | ever ran 50%+ | rate |
| --- | --- | --- | --- |
| no split within 30 sessions | 223 | 62 | 27.8% |
| split **0-5** sessions ago | 12 | 3 | 25.0% |
| split **6-30** sessions ago | **17** | **12** | **70.6%** |

A reverse split in the recent past more than doubles the rate at which a board
name produces a 50% move — **but only once it has aged.** A split in the last
five sessions is indistinguishable from no split at all.

That is the shape hypothesis 3 predicts, and it was predicted before the data
arrived rather than found in it. The bucket boundary is the one written into
this note when the lookback was widened, on the reasoning that the pattern is
*a split, then a run once the float is clean* — not split-and-run-the-same-day.
Committed at `8170f58`, before the extract existed.

**What would have to be true for this to be wrong**, in the order I would attack
it:

- **The population is the desk's board, not the market.** A post-split name has
  a small float and mechanically high RVOL, so it is more likely to be on the
  board at all. The comparison above is within the board, which controls for
  that partially, not fully.
- **Seventeen symbols.** The effect is large and the sample is not. Twelve of
  seventeen is four names away from unremarkable.
- **One week, one regime.** Five trading days in August 2026.
- **A reverse split is a third of hypothesis 3 at most.** Offering completions
  and S-1 effectiveness are not captured and would need the SEC evidence in
  `research_sources`.
- **The 6-30 boundary is a hypothesis, not a fit.** It should be re-run on new
  weeks without being retuned, or it stops being a prediction.

The right next step is more weeks at the same boundary, not a finer boundary on
this week.

### Where the day's high falls, on five days

Of the 95 symbol-days that ran 50%+ — updating the two-day cut that first raised
this:

| Window (ET) | movers peaking there |
| --- | --- |
| premarket, before 09:30 | **44** |
| 09:30-10:00 | 7 |
| 10:00-11:00 | 9 |
| 11:00-16:00 | 18 |
| after hours | 17 |

Sixteen of ninety-five peak inside the 09:30-11:00 window the playbook lives in,
and 61 of 95 peak outside regular hours entirely. The two-day cut suggested four
of thirty-four; five days puts it at 17% rather than 12%, so the shape held and
softened slightly. This is Q5 and it stays behind Q1.

## Limits, stated plainly

- **Two trading dates, and not the ones that matter.** The local store's last
  assessment is 2026-08-18. Q1 turns on 19, 20 and 21 August — the balance
  exhaustion days — and those live only on the production store on AWS. Nothing
  here has looked at them.
- **The population is the desk's own board, not a cross-section.** Every
  assessment holds the top 25. So "movers versus non-movers" here means "board
  names that moved versus board names that did not". **Q3 is not answerable
  until tier A exists**, and no statement above generalises to the market.
- **Halts and LULD are not captured.** `halt_count` and `luld_event_count` are
  null and null means *not captured*, never *none happened*.
- **Setup occurrence is not captured.** That needs 10-second bars, which is tier
  C. **Q2 is not answerable** on this instrument.
- **The ignition-timing table above buckets on UTC clock arithmetic** and is
  correct for August only. It is a quick cut, not a committed measure.
- Coverage is derived from what the desk recorded at its checkpoints. A name
  that research graded between two checkpoints and that never appeared on the
  board again is invisible to it.

---

## The question the data volunteered

**Proposed Q5: when does a board name's move actually happen, relative to when
the desk puts it on the board?**

It uses both halves of what the archive now holds — `first_board_entry_at` and
`best_rank` from the desk side, `time_of_high`, `premarket_high_at` and the
windowed gains from the market side. It bears directly on the trader's own
results rather than on market structure in the abstract, and unlike Q1 it does
not depend on the research pipeline having been up. It was surfaced by the data
rather than posed, which is what the standing sweep is meant to produce.

If the board reliably surfaces names after their high, that is a finding about
the product, and it reframes Q1: the interesting question stops being *why do
movers have no catalyst* and becomes *why is the desk selecting for names whose
move is finished*.

**It is not the first thing to run, and this section originally said it was.**
The claim was that Q5 is answerable today on two dates while Q1 waits for
production. That was overstated in both directions: on two dates Q5 is a
curiosity rather than a finding, so it wants the same production dates Q1 does;
and Q1 is the *active* question, capped at two, while Q5 would need opening.
Retracted the same day, and the register in [rnd.md](../threads/rnd.md) records
Q5 as behind Q1. See *Ordering once the dates land* below.

---

## Handed to Ops

Not acted on — this thread does not deploy, and the second item is a live-data
decision.

1. **`claimStoreForMode` still deletes the assessment history.** The archive is
   now out of its reach, but the per-checkpoint detail in
   `desk_assessment_tickers` is not, and that is the irreplaceable half. A mode
   switch on production would destroy it. The archive's day-grain mirror
   reduces the loss; it does not prevent it.
2. **The backfill has only ever run against the stale local store.** To cover
   the dates Q1 needs, Ops has to produce an extract from production. See
   *Getting the production dates* below. The command exists, but it is not on
   the server — **how it gets there is Ops's decision**, now
   [ops.md](../threads/ops.md) Open item 5 with the routes written out.
3. The desk's recorded closing price disagrees with the official close on a
   third of names. Some of that is the closing auction, which is expected; the
   size of the residual has not been checked and may be a real capture defect.

## Getting the production dates

Agreed 2026-08-23: a **two-table extract**, not a full snapshot and not a run of
the backfill on the server.

The backfill reads exactly two tables and fetches everything else from Alpaca,
so that is all that has to leave the box:

| Route | Payload off the box | Already on the server? |
| --- | --- | --- |
| Run the backfill there | the extract, then the archive back | **no** — needs `8170f58` deployed |
| Full `VACUUM INTO` snapshot | ~250-450 MB | yes — `snapshot-db.mjs` ships with the release |
| **Two-table extract, `archive:export`** | **~1-3 MB** | **no** — landed in `8170f58`; production runs `fd9556f` |
| Two-table read hand-rolled in `sqlite3` | ~1-3 MB | yes — nothing to install |

**Corrected by Integration, 2026-08-23.** This table previously recorded "code
on production: no" for the extract route and the *Handed to Ops* section said it
"needs no deploy". Both were wrong, and wrong in the direction that matters — a
thread reading either would have taken the route believing nothing had to reach
the server. `worker/archive-export.ts` says *Usage, on the server* in its own
header and takes `--market-db /var/lib/mointel/market.db`, a path that exists
only on the box.

Nothing about the recommendation changes. Two tables and ~1-3 MB against a
250 MB+ snapshot carrying every price and every research dossier is still the
right trade. What was false was only the claim that it costs nothing to get
there. **The choice of route is a deploy decision and belongs to Ops** —
[ops.md](../threads/ops.md) Open item 5.

`npm run archive:export` opens the source **read-only**, makes no network calls,
touches no credentials, and what it writes contains no prices, no research text
and nothing about the trader — `tests/archive/export.test.ts` asserts the table
list rather than trusting it. It also prints a count per trading date.

```bash
npm run archive:export -- --market-db /var/lib/mointel/market.db --out /tmp/assessments.db --dry-run
npm run archive:export -- --market-db /var/lib/mointel/market.db --out /tmp/assessments.db
```

Then, here:

```bash
npm run archive:backfill -- --market-db <the extract>
```

Verified end to end on the local store: a 596 KB extract drives the backfill to
byte-identical output. The remaining risk is that it is a point-in-time copy, so
it wants re-running as sessions accumulate — which is what `--from` / `--to`
are for.

### The go/no-go came back go

Ops answered it read-only on production, before anything was copied. Recorded in
[ops.md](../threads/ops.md) Open item 5 and [rnd.md](../threads/rnd.md) at
`c705f0b`; the numbers below are from those, not from a chat.

| Date | Assessments | Ticker rows |
| --- | --- | --- |
| 2026-08-19 | 16 | 400 |
| 2026-08-20 | 19 | 450 |
| 2026-08-21 | 19 | 475 |

75 assessments over five dates, 25 tickers each, `COMPLETE` 74 and
`MISSED_SUPERSEDED` 1. The contingency written here — that a zero would make Q1
unanswerable rather than instrumentable — did not arise.

**Ordering once the dates land.** The split test goes first, ahead of Q5. It
serves Q1, which is active and capped at two; Q5 would need opening, and on two
dates it is a curiosity rather than a finding, so its "answerable without
production data" advantage was overstated. Two caveats on the split test:
`split_sessions_ago` covers reverse splits only, so it tests perhaps a third of
hypothesis 3 — offering completions and S-1 effectiveness would need the SEC
evidence in `research_sources`. And 21 symbol-days over two dates is a hint
about the instrument, not about the market.

## Related

- [threads/rnd.md](../threads/rnd.md) — the register this serves
- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the specification. Its claim about
  `daily_bars` is corrected above.
