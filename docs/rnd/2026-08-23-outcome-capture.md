# Outcome capture and the coverage baseline

**Dated 2026-08-23.** First entry in the R&D findings log. Covers step 1 of
[../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — outcome capture with a backfill — and
the coverage measurement that has to precede any conclusion about catalysts.

Nothing here closes Q1. It builds the instrument and reports what the instrument
says about two trading dates, which is not enough dates to conclude anything.

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
grade, and the two agree exactly: `catalyst` is null precisely when the status
says no analysis existed. A missed look and an honest `UNKNOWN` were already
distinguishable, per ticker per checkpoint. They only had to be read.

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

## What the instrument says so far

**Two trading dates. 100 symbol-days. This is not an answer to anything.** It is
reported because a thread that only reports discoveries will eventually
manufacture one, and because the shape is worth having on record before more
data arrives to confirm or kill it.

Catalyst grade among symbol-days with admissible coverage:

| Grade | moved 50%+ (n=30) | did not (n=36) |
| --- | --- | --- |
| STRONG | 0 | 2 |
| LEGITIMATE_POSITIVE | 6 | 7 |
| MODERATE_MIXED_SECONDARY | 9 | 12 |
| WEAK_NEGATIVE_DILUTIVE | 8 | 4 |
| NONE | 2 | 4 |
| UNKNOWN (honest) | 5 | 7 |

Two observations, both provisional:

- **No `STRONG` catalyst appears among the movers at all**, and legitimate
  positives are 20% of them. Directionally consistent with the Pillar 4 concern.
- **The grade distribution barely differs between movers and non-movers.** If
  that survives more data it is the sharper finding, because it says the
  catalyst grade is not separating the two populations — which is a different
  claim from "movers have no catalysts" and points at the first hypothesis in
  the charter, that catalyst was always a proxy for attention.

### The thing that jumped out, which nobody asked about

Where the day's high actually occurred, for the 34 symbol-days that moved 50%+:

| Window (ET) | movers peaking there |
| --- | --- |
| premarket, before 09:30 | **16** |
| 09:30-10:00 | 2 |
| 10:00-11:00 | 2 |
| 11:00-16:00 | 6 |
| after hours | 8 |

Twenty-four of thirty-four peak outside regular trading hours, and **four** peak
inside the 09:30-11:00 window where the playbook says the profit is. If that
holds, the board is largely showing this trader names whose move is already
over.

---

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
