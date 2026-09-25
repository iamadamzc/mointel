# The market archive

**Status: step 1 built 2026-08-23; steps 2-4 still specification.** The
thresholds and fields below are settled. Outcome capture and the coverage
rollup exist in `lib/archive/` — see
[rnd/2026-08-23-outcome-capture.md](rnd/2026-08-23-outcome-capture.md), which
also records four things this document got wrong.

The desk records what it believed. It does not record what happened next. This
document specifies the second half — a longitudinal record of calls and
outcomes, so the desk can be learned from rather than only watched.

---

## Why, in one paragraph

Since roughly July 2026 the core selection rule this product serves has been
failing: almost none of the recent 50%+ movers have carried a real catalyst, and
names with legitimate catalysts are being passed over. That breaks Pillar 4 of
the playbook. The question — *what is the new structure, and why are these names
being chosen* — cannot be answered from a live dashboard. It needs history,
outcomes, and a control group.

## What is irreplaceable, and what is not

Alpaca serves historical bars, trades and quotes on the existing subscription.
So the tiers below decide **what is pre-fetched, not what is possible**. A wrong
threshold costs an extract, not an answer.

**Genuinely irreplaceable — must be captured live:**

- **The desk's derived state.** RVOL at that instant, board rank, what else was
  competing for attention, the catalyst grade and its provenance, the float
  classification. No amount of money re-fetches this. Already append-only in
  `desk_assessments` / `desk_assessment_tickers`.
- **As-seen, unadjusted prices** and the reference close each percentage was
  measured against. Already carried as `reference_close`, `reference_basis`,
  `price_at`.
- **Outcomes.** Not stored at all today. This is the gap.

**Time-critical, because the window closes:**

- **Reverse splits**, endemic in this universe, retroactively restate history.
  After a 1:10, a stock that ran $0.50 to $1.50 returns from the API as $5.00 to
  $15.00. `daily_bars.adjustment` exists precisely so a change of basis is
  detectable; the archive must record the basis it saw.
- **Delistings.** Names that die become unreliable or unqueryable.

Everything else is fetched on demand.

## The questions this has to answer

| Question | Requires | Population | Grain |
| --- | --- | --- | --- |
| Why do no-catalyst names run while catalyst names are skipped? | catalyst grade and provenance, float/structure, filings in the prior 30d, outcome, time of ignition | movers **and** non-movers | daily + minute |
| Would the playbook have worked on this name? | micro-pullback detection, volume rising through the pullback, stop/target resolution at $0.15-$0.25 | candidates | **10s, derived from prints** |
| Was it tradeable *for this trader*? | spread at the decision moment, large resting presence and whether it was consumed | candidates | prints + quotes |
| What separates a mover from a non-mover? | daily statistics across the full eligible cross-section | everything eligible | daily |

Two consequences worth stating outright.

**Minute bars cannot score a trade.** With a $0.15-$0.25 stop and a hold measured
in seconds, a one-minute candle on an active small cap is routinely wider than
the stop and the target combined. Minute data cannot say which came first.

**The sub-minute null does not apply here.** Viscosity Phase 2B closed the
question *"does sub-minute structure predict forward cleanliness"* — it does not.
This archive is not predicting; it is measuring what was on the tape at the
moment of a decision. That was never tested and is not covered by the null.

## The tiers

| | Contents | Membership | Rough volume |
| --- | --- | --- | --- |
| **A — cross-section** | one daily row per symbol | every price-eligible name (`DISCOVERY_PRICE_MIN`-`MAX`, currently $1-$20) | **~2,830/day, ~710k rows/yr** |
| **B — movers** | minute bars, full session 04:00-20:00 ET | up **20%+** *or* RVOL **>= 2** | ~100-200/day, ~25M rows/yr |
| **C — candidates** | every trade print, plus bid/ask snapshots at 1-second boundaries | up **40%+** *and* RVOL **> 5** *and* traded at **$2+** at any point — plus anything pinned or on the focus list | a handful/day, ~5-15 GB/yr |

**The tier A figure was corrected on 2026-08-23**, measured against the tape
rather than estimated: ~2,830 names close in $1-$20 on a typical session, not
~900. Feasibility is unchanged — one narrow row per symbol-day is a few hundred
MB a year — but work sized from the old number was sized from a third of the
real one. The full five-pillar gate ($2-$20, 5x RVOL, +25% on the session high)
selects **9-20 names a day**, and it is deliberately **not** a capture filter:
tier A exists to be the control group, and a gate-filtered tier A cannot answer
the question it is for. The gate's components are stored as columns so it can be
applied, and retuned, at read time.

**The band stays $1-$20 and the row must carry session high and low, not just
the close.** Sub-$2 names are a different population — rising penny stocks that
trade differently — but some cross into the tradeable band intraday and then
behave like it, and that crossing is the interesting event. Measured over
2026-08-18 to 08-21: ~825 names a day start the session under $2 and **14-32 of
them cross to $2+ intraday, 5-11 of those clearing the +25% gate** — against a
full gate of only 9-20 names a day. A close-only row would classify a name that
ran $1.80 to $3.20 and back to $1.95 as a penny stock and lose it.

Tier B is deliberately a **union**. A 20% move on weak volume is a mover without
participation; an RVOL 4 name that went nowhere is participation without a move.
Both break the pairing the playbook assumes, and that pairing is exactly what
appears to have changed.

"Traded at $2+" means **at any point in the session**, so a $1.40 name that runs
into the tradeable band qualifies. That shape is common here and excluding it
would drop some of the most interesting names.

Tier C membership is **mechanical**. It says nothing about whether the trader
took the name, so rejected and missed names are in it by construction. That is
the point — see "Setups and misses".

## Outcome fields

One row per symbol per trading date. **Store facts, never scores.** Tiers,
thresholds and "was this a good call" are views computed at read time, so a
retuned threshold re-scores the history instead of losing it.

- `reference_close`, `reference_basis` — what percentages are measured against
- `session_high`, `session_low`, `time_of_high`
- `max_gain_pct`, `time_of_max_gain` — the primary outcome measure
- `final_rvol` — Daily RVOL is cumulative from 04:00 and never reset, so it is
  monotonic and the **final value is the peak**. No separate maximum is needed.
- `volume`, `dollar_volume`
- `premarket_high`, `premarket_high_at`
- `rth_open`, `rth_high`, `rth_low`, `rth_close`
- gain within the windows this strategy lives in: **09:30-10:00**, **to 11:00**,
  **to close**
- `next_open`, `next_high` — follow-through
- `halt_count`, LULD events
- `reached_board`, `best_rank`, `first_board_entry_at`
- `catalyst_grade_at_entry` and its provenance
- `research_coverage` — see below
- `adjustment_basis`, `as_of` — so a later restatement is detectable

### The measurement trap, and it is not optional

The period under study overlaps repeated failures of the desk's own research
pipeline — OpenAI balance exhaustion on 19, 20 and 21 August, plus resolver
rework. **Reduced catalyst *detection* is indistinguishable from absent
catalysts** unless coverage is measured.

So every outcome row carries `research_coverage`: was research running, did this
ticker get an analysis, and was `UNKNOWN` an honest verdict or a missed look.
Any analysis of the catalyst question must hold coverage constant **first**, not
as a footnote. Without it there is a real risk of building a theory of the
market out of a billing outage.

## Setups and misses

Tier C contains every qualifying name, traded or not. Whether a **tradeable
micro pullback** occurred is mechanically detectable from 10-second bars — a
pullback with volume rising into the first green candle making a new high — so
the archive can classify without the trader labelling anything:

1. qualified, setup occurred, traded — hit rate
2. qualified, setup occurred, not traded — **missed opportunity**
3. qualified, no setup ever occurred — correctly passed; the name never offered
   an entry

Only bucket 1 needs anything external: which names were actually traded. That
comes from the daily fills the trader supplies — see
[threads/coaching.md](threads/coaching.md). Buckets 2 and 3 are computable from
the archive alone, and bucket 3 is a market-structure fact in its own right. If
most 40%+ movers never produce a tradeable pullback, that answers a question
nobody thought to ask.

The entry gate is a **veto, not a trigger**: a large unconsumed presence on the
tape means stay out, and the name becomes enterable once it has been eaten
through. Model it that way. Detecting it needs displayed size from quotes, which
is why tier C is not trades-only.

## Where it lives

| Store | Holds | Why |
| --- | --- | --- |
| **SQLite** (`data/market.db`) | hot session state, unchanged | worker-local, low latency, already good at this |
| **Postgres** | assessments, outcomes, tiers A and B | append-only, grows forever, queried analytically, and out of reach of `claimStoreForMode` |
| **S3, parquet** | tier C prints and quote snapshots | the format the viscosity research tooling already reads, so the desk feeds research without an export step |

`claimStoreForMode` currently **deletes every assessment** when the store
switches market mode. Correct for data hygiene, and a loaded gun pointed at an
archive meant to last. History must not live where a mode switch can reach it.

## Sequence

1. **Outcome capture, with a backfill** over the assessments already recorded.
   **Built 2026-08-23** — `lib/archive/`, `npm run archive:backfill`. The
   original reasoning here was wrong and is left in place as a record: it said
   `daily_bars` is never pruned and holds 100 trading dates, so a useful history
   would exist the day this shipped. `daily_bars` is a research-cycle artifact,
   split-adjusted, covering only symbols that got a cycle analysis, and it
   missed 43 of the first 100 assessed symbol-days. The backfill fetches raw
   minute bars instead. See
   [rnd/2026-08-23-outcome-capture.md](rnd/2026-08-23-outcome-capture.md).
2. **Nightly archival extract** for tier B and C membership. The viscosity work
   shows the scale is practical: 442 symbol-days, 92.9M trades and 64.1M quotes,
   2.036 GiB, ~60 minutes at 5 workers, zero retries.
3. **Postgres** for the history store — after 1 and 2, so a settled schema is
   migrated rather than a moving one.
4. **Fills ingest** for the coaching workstream.

## Capture-for-analysis — spec, 2026-09-22

**On his direct approval, relayed by Integration.** Two benefits he named:
**grade the grader** (measure how good our catalyst grades are) and **catalyst
analysis** (which catalysts actually create movement). He floated "store
everything"; Integration reframed it and he agreed, to the principle this
document already runs on:

> **Store what a source WON'T give back, not what it will.** Do not duplicate
> Alpaca/SEC-served data. Blanket hoarding grows unbounded and re-stores what
> sources already persist.

**This is a spec + cost, not a build.** Nothing here ships until he approves the
cost via Integration.

### Gap 1 — newswire catalyst TEXT is dropped. Real, but the fix is a licence, not a fetch.

> **HIS RULING, 2026-09-22 (via Integration): the FREE EX-99 path only. No wire
> licence, and no wire-body capture/scraping — not now, not as a fallback.** He
> took the free route over a licence or a terms-override, consistent with the
> `stockanalysis.com` constraint. **This is a standing decision recorded so a
> later seat does not reopen the scrape as an option.** The rest of this section
> is retained as the reasoning behind the ruling, not as a menu of live choices.

**Verified in the store, not from the relay.** The web-discovery branch of
[`../lib/research/catalyst/collector.ts:889`](../lib/research/catalyst/collector.ts)
stores each discovered source with `excerpt: null` — its own comment (`:902`):
*"we did not retrieve the page, so no excerpt is stored."* SEC exhibits (`:448`)
and company IR/newsroom releases (`:639`) store `excerpt` because those paths
fetch the page. Counts by content check:

    store                        NEWSWIRE   SECONDARY_DISCOVERY   SEC_EXHIBIT   COMPANY_IR
    market-prod-2026-08-23.db    31 / 0     54 / 0                878 / 878     93 / 88
    market.db (Sep 7)           15 / 0     17 / 0                251 / 251     4 / 4
                                (rows / rows carrying text)

**So the drop is by construction and covers EVERY web-discovered source, not
newswire specifically** — the condition is *discovered-but-never-fetched*.

**THE BLOCKER IS TERMS, NOT ANTI-BOT — Research-tmi's correction, 2026-09-22,
and it changes the whole item.** To retain wire text the discovery pass would
have to *fetch and store the wire page body*. For a commercial product that is
the act the wire terms govern:

- **PRNewswire is already answered, and the answer is no.**
  [`Wire_Feed_Collector_SCOPE.md`](Wire_Feed_Collector_SCOPE.md) records a read
  of `prnewswire.com/terms-of-use/` (2026-09-21): automated retrieval by robot
  or spider prohibited, scraping/republishing without written permission
  prohibited, licensed for personal noncommercial use only. Their RSS page
  routes commercial users to a **licensing programme**. So there is a legitimate
  route and it is a **licence — his decision, not a build.**
- **The other four wires are unread and must not be probed.** GlobeNewswire,
  Businesswire, AccessWire, Newsfile need a **manual desktop terms read** first.
  A retrieval probe *is* the automated access those terms govern, so "does it
  403" is the wrong question in the wrong order — a host that serves a bot can
  still forbid it in writing. This is the `stockanalysis.com` shape (his standing
  constraint, 2026-09-19): never fetch from a worker/route/job when the terms bar
  automated or competing-product use, and *the volume is small enough that
  automating it keeps looking like an easy win.*
- **Not a policy being relaxed — a new decision.** The code's only stated reason
  for not fetching is the comment; nothing conditions it on latency and
  `domainPolicy` governs which domains are searched/stored, not whether a page is
  retrieved. The terms question was never faced because nothing ever fetched.
  Do not write this as loosening an existing guard.

**AND THE CAPTURE THAT MATTERS ALREADY EXISTS, PUBLIC-DOMAIN AND STORED.**
SEC EX-99 exhibits are press releases the issuer files with the SEC —
**669 of 878 stored SEC_EXHIBIT rows are EX-99*, every one already carrying a
full excerpt** (independently re-counted here: EX-99.1 562, EX-99.2 103, EX-99.3
2, EX-99 2; SEC content is public domain, no terms problem). **So the gap is
LATENCY, not existence:** the wire crosses at ~08:00; the EX-99 appears when the
issuer files, which can be later. A wire licence buys the *earlier arrival* of
text the desk already gets — nothing more.

**⇒ The right first instrument is free, and it must run before any wire cost is
quoted.** Use EDGAR `acceptanceDateTime` (public-domain, re-fetchable; already
read by `lib/research/sec/submissions.ts`) to measure **what share of EX-99 press
releases become public inside 04:00–09:30 ET.** That one distribution decides
whether a wire licence buys minutes or buys the whole premarket window — and
pricing a wire fetch before it prices a thing the desk may not need.

**THE INSTRUMENT IS FORWARD-LOOKING, NOT A QUERY OVER A SNAPSHOT — Research-tmi,
2026-09-22, and it changes the dependency put to him.** The existing 878 stored
exhibits **cannot be measured by anything**, and a fresh copy-down does not
change that:

- `insertResearchSources` is **`INSERT OR IGNORE`** (`../lib/market/store/researchRepo.ts:558`,
  verified here). The only UPDATEs on `research_sources` touch `cluster_id`/
  `canonical` (`:710`) and `active` (`:732`) — **no path writes `published_at` or
  `published_precision` on an existing row.** An exhibit's document fingerprint
  is `hash(accession|exhibitName)`, so re-collecting the same exhibit is ignored.
  Those 878 keep INFERRED-over-a-bare-date **permanently**; `ea2d1c9` cannot reach
  backwards and neither can a snapshot.
- It compounds: the exhibit branch inherits its parent's date from the **stored**
  `SEC_FILING` row (`collector.ts:378`, capped 4/ticker), and parents are frozen
  by the same `INSERT OR IGNORE`. So a *new* exhibit hung off an *old* parent
  inherits the old bare date. **The measurable population is EX-99 exhibits whose
  parent filing row was itself inserted after both shas were live in production**
  — new filings, accruing from the deploy instant. First useful read is some
  sessions out, not a one-shot on a pull.
- **Two deploy preconditions, not one:** `b1d64b9` (parent gets an acceptance
  instant, 2026-09-06) **and** `ea2d1c9` (exhibit stops claiming a derived time
  from a parent that states none). **Which sha production runs is an Ops
  question, to settle before any copy-down** — a snapshot taken before both is
  the same dead end as `market-prod-2026-08-23.db`.
- **Partition on the VALUE, not the label:** ask whether the exhibit's
  `published_at` carries a time-of-day clock at all, never filter on
  `published_precision`. Without `ea2d1c9` the old code stamped every row
  INFERRED, so a `precision != 'UNKNOWN'` filter sweeps in bare dates — which
  parse as midnight UTC = **20:00 ET**, filing press releases in the evening and
  arguing hard for a licence nobody needs. This is the artifact the measurement
  exists to avoid, so it must not be built out of the same mislabel.
- **Not misread as a defect:** the 1-of-3,253-EXACT figure in
  `market-prod-2026-08-23.db` is that store predating `b1d64b9` with no
  post-change arm, not a bug.

**PRECONDITION MET 2026-09-22 (Ops read the box, via Integration):** `b1d64b9`
and `ea2d1c9` are both ancestors of both live releases, research worker included.
**So accrual begins now.** New EX-99 exhibits hung off post-deploy parent filings
carry a real acceptance instant from here on; the first useful premarket-latency
read is some sessions out.

**The one dependency the FIRST READ carries (not now):** to run the 04:00–09:30
distribution I need a **post-deploy production snapshot** — the newest market DB
on disk (`market-prod-2026-08-23.db`) predates the shas and cannot answer it. So
once ~a handful of post-deploy sessions have accrued (≈late Sep), a read-only
copy-down of production `research_sources` is the trigger to take the first read.
Flagged here so a forward-accruing instrument is not forgotten. **That copy-down
is PRE-APPROVED — his ongoing grant `8f331ed` (confirmed via Integration
2026-09-23) — so when it has accrued, Ops runs it without returning to him.** The
wire ruling above means this measurement only ever decides whether the desk
already has the text in time, never a scrape.

**Cost of Gap 1: nothing to build.** His ruling is free-path-only; the EX-99
instrument is forward-accruing with its precondition now met, and its only future
ask is a read-only production copy-down once data has accrued.

### Gap 2 — grade the grader needs NO new capture. It is analysis, not storage.

**This is the scoping correction, and it changes what gets built.** Integration
framed the grade→outcome join as "the missing half." Both halves are **already
retained**:

- **Grades are kept forever.** `research_analysis_versions` is never pruned —
  no `DELETE` anywhere in `lib/` or `worker/`, and `claimStoreForMode`
  ([`../lib/market/store/db.ts:1391`](../lib/market/store/db.ts)) — the mode-
  switch nuke that clears assessments, jobs, bars and events — explicitly spares
  it.
- **Outcomes are re-fetchable from bars** and already rolled into
  `symbol_outcomes` (archive.db, 939 rows, keyed symbol + trading date).

**So under the principle above there is nothing to capture:** grades won't be
given back but we already keep them; outcomes the vendor *will* give back on
demand. The grade→outcome link is **derivable today** by `(ticker,
trading_date)` — `research_analysis_versions` carries `ticker` and
`generated_at`; `symbol_outcomes` carries symbol and date. It is an
**analysis/rollup**, cost ≈ query work, **zero new storage.**

**Two traps for whoever builds the rollup, both already in the R&D register:**

1. **`generated_at` → trading_date is a session-boundary conversion**, not a
   string slice — a grade generated at 19:25 ET and a premarket grade belong to
   different sessions than a naive UTC date implies. Use the session logic, not
   `substr(generated_at,1,10)`.
2. **`id`/`analysis_version_id` is a per-store sequence position, not an
   identity across stores.** Join on `(ticker, date)` and content, never on a
   version id carried between the grades store and the archive.

**A null is a result here.** If grade quality shows no relationship to outcome,
that is as useful as any positive and is reported with its coverage caveat —
`research_coverage` (above) must be held constant first, or a billing outage
reads as a bad grader.

### Where this lands

- Gap 1: a fetch added to the discovery path + the existing `excerpt` column.
  **Research-tmi owns the pipeline change**; R&D owns the analysis it feeds.
- Gap 2: an R&D rollup over the two existing stores. No pipeline change, no
  capture, no new table required to start — a query.

**Status: SPEC. Not built.** Gap 2 (grade the grader) is free analysis, startable
on his word. Gap 1 (wire text) is **not a build** — a manual terms read of four
wires plus a licensing decision that are his, both gated behind a free EX-99
latency measurement. That measurement is **forward-accruing**: its only
precondition is confirming production runs past both `b1d64b9` and `ea2d1c9` (an
Ops question), after which it accrues from the deploy instant — not a query a
snapshot answers. Back to him via Integration before anything ships.

## Related

- [threads/rnd.md](threads/rnd.md) — the thread that owns this, and the question it serves
- [threads/coaching.md](threads/coaching.md) — fills, adherence, bucket 1
- `A:\trade_research\momentum\viscosity` — the tape research this feeds. Its
  Databento archive is frozen and non-extendable, which is why the desk's live
  Alpaca connection is the successor archive.
- `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` — the strategy
  every threshold here derives from
