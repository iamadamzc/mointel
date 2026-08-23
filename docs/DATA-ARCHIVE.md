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
| **A — cross-section** | one daily row per symbol | every price-eligible name (`DISCOVERY_PRICE_MIN`-`MAX`, currently $1-$20) | ~900/day, ~225k rows/yr |
| **B — movers** | minute bars, full session 04:00-20:00 ET | up **20%+** *or* RVOL **>= 2** | ~100-200/day, ~25M rows/yr |
| **C — candidates** | every trade print, plus bid/ask snapshots at 1-second boundaries | up **40%+** *and* RVOL **> 5** *and* traded at **$2+** at any point — plus anything pinned or on the focus list | a handful/day, ~5-15 GB/yr |

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

## Related

- [threads/rnd.md](threads/rnd.md) — the thread that owns this, and the question it serves
- [threads/coaching.md](threads/coaching.md) — fills, adherence, bucket 1
- `A:\trade_research\momentum\viscosity` — the tape research this feeds. Its
  Databento archive is frozen and non-extendable, which is why the desk's live
  Alpaca connection is the successor archive.
- `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` — the strategy
  every threshold here derives from
