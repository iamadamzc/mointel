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
| The backfill | `worker/archive-backfill.ts` |

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

## Four things the build found that the spec did not anticipate

These cost time, and each one would have silently corrupted the analysis.

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
100x rally are the same number. The test used instead is definitive — fetch the
same past close both `raw` and `split`, and a disagreement **is** a split,
because the split adjustment restates history onto the current share basis.
`resolvePriorClose` in `lib/archive/outcomes.ts` implements it, the baseline
becomes the split-adjusted close, and `raw_prior_close` and `split_detected`
keep the as-seen evidence.

With that in place the whole captured range is -9.8% to +643.8%.

Worth noting for Q1's third hypothesis — that the catalyst moved from the news
wire to the filing cabinet: **`split_detected` is now a recorded field**, so
"did a reverse split precede the run" is directly queryable rather than
something that has to be looked up by hand.

### 4. `rth_close` is not the official close

The last regular-session minute bar excludes the closing auction. Comparing the
desk's recorded close against the minute-derived one on the first 62 rows, **20
disagreed by more than two cents**, and 11 of 100 rows differ by more than 2%.
On a thin small cap the cross moves the print.

Both are now stored. `rth_close` is the last continuous-trading price;
`official_close` and `official_volume` come from the daily bar and are what
`gain_to_close_pct` is measured against.

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

### What the two available dates show

```
  date         chkpts  syms  graded  unk-ok  failed  inflt  nolook   usable
  2026-08-17        2    37      18       8       0      0      11      70%
  2026-08-18       12    63      36       4      10      0      13      63%
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

## Recommended first answerable question

Not Q1 — Q1 needs the missing week and, for the interesting version of it, a
cross-section. Not Q2 or Q3, which need instrumentation that does not exist.

**Proposed Q5: when does a board name's move actually happen, relative to when
the desk puts it on the board?**

It is answerable *today* on the instrument just built, needs no new capture and
no spend, and it uses both halves of what the archive now holds:
`first_board_entry_at` and `best_rank` from the desk side, `time_of_high`,
`premarket_high_at` and the windowed gains from the market side. It bears
directly on the trader's own results rather than on market structure in the
abstract, and unlike Q1 it does not depend on the research pipeline having been
up. It is also the question the data volunteered rather than one that was posed,
which is what the standing sweep is supposed to produce.

If the answer is that the board reliably surfaces names after their high, that
is a finding about the product, and it reframes Q1: the interesting question
stops being *why do movers have no catalyst* and becomes *why is the desk
selecting for names whose move is finished*.

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
   the dates Q1 needs, it has to run against production — either on the server,
   or here against a `VACUUM INTO` snapshot pulled down. Read-only either way.
3. The desk's recorded closing price disagrees with the official close on a
   third of names. Some of that is the closing auction, which is expected; the
   size of the residual has not been checked and may be a real capture defect.

## Related

- [threads/rnd.md](../threads/rnd.md) — the register this serves
- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the specification. Its claim about
  `daily_bars` is corrected above.
