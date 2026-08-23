# Thread: R&D

**A standing capability, not a project.** The desk should always be learning
something. What it needs to learn will change; the machinery for learning it
should not have to.

Opened 2026-08-23, split out of the Research thread on the grounds that a thread
owning both a billing pipeline and an open research question will always spend
its time on the pipeline.

## Mission

Turn what the desk records into things that are known. Questions arrive, get
worked, and get **closed with a verdict** — including a null. The thread's
health is measured by questions closed, not by questions open.

## Where questions come from

1. **Posed** by the trader, from what he is seeing in the market.
2. **Discovered** by the standing sweep below — the archive noticing that
   something moved before anyone asked.
3. **Spawned** by a closed question. A verdict usually narrows the next one.

All three are equal citizens. The second is the one that makes this worth
building; nobody can pose a question about a shift they have not noticed.

## The register

Every question lives here, dated, with a status. **At most two active at once.**
That cap is the whole anti-diffusion mechanism — a register of eleven open
questions is a thread that has stopped working.

| # | Question | Opened | Status |
| --- | --- | --- | --- |
| Q1 | Why do 50%+ movers no longer carry catalysts, and why are catalyst-driven names passed over? | 2026-08-23 | **ACTIVE** |
| Q2 | What share of qualifying movers ever produce a tradeable pullback at all? | 2026-08-23 | proposed |
| Q3 | What separates a mover from a non-mover in the current regime? | 2026-08-23 | proposed |
| Q4 | Can tape character be measured well enough to call a name tradeable? | 2026-08-19 | dormant — see closed lines below |
| Q5 | When does a board name's move happen, relative to when the desk puts it on the board? | 2026-08-23 | proposed — behind Q1, see the ordering note |

**Closed, and not to be reopened without new evidence:**

| Line | Verdict | Closed |
| --- | --- | --- |
| Sub-minute execution arrival | `NO_SUBMINUTE_INCREMENTAL_SIGNAL` — 2–20s execution count and arrival timing add nothing over the completed-minute baseline. The density gate that makes the price path measurable makes a 2s window a rescaling of the minute. | 2026-08-21 |
| Minute trade count | `WITHIN_DAY_TRADE_COUNT_SIGNAL_CONFIRMED` — raw completed-minute trade count predicts a *less* clean next 30–60s. More executions is worse. The programme's only usable artifact. | 2026-08-21 |

The sub-minute null closed a *predictive* line only. Sub-minute data is still
required for **measurement** — resolving a trade whose stop is $0.15 — and that
was never tested.

## The standing sweep

The discovery mechanism, and the part that makes "always learning" real rather
than aspirational. **Not yet built.** A routine pass over the archive, run on a
regular cadence, that compares the current window against a trailing baseline
and flags what moved:

- catalyst rate among movers, and the grade distribution
- float, price and RVOL distributions of names that ran
- time-of-ignition — premarket gap versus intraday ignition
- setup-occurrence rate: how often a qualifying name ever offered an entry
- the RVOL-to-outcome relationship
- rank persistence: does being on the board predict staying there

Anything that moves materially against its baseline becomes a **candidate
question** in the register. The sweep does not conclude — it notices. Concluding
is a question's job, and questions get hypotheses and verdicts.

## Scope

- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the capture specification.
  **Instrumentation, not the goal.** Build the minimum that answers the active
  question, then answer it.
- Analysis over the archive; findings written down and dated
- `A:\trade_research\momentum\viscosity` — the tape research. Different repo,
  same capability. This thread owns it.

## Not this thread

- `lib/research/` — the catalyst pipeline, its cost and its incidents →
  [research.md](research.md)
- Deploying → [ops.md](ops.md)
- Presenting findings in the UI → [design.md](design.md), and not until a
  finding has survived. The viscosity README is explicit that a tradeability
  state on the desk is a much later concern.
- The trader's own execution → [coaching.md](coaching.md)

## Q1 — the active question

Pillar 4 of the playbook — breaking news catalyst — is described as
non-negotiable, and appears to have stopped binding since roughly July 2026.
Either the rule changed, the market changed, or **the desk stopped being able to
see catalysts**. Those are three different worlds and the desk should be able to
tell them apart.

**Hold coverage constant before concluding anything.** The weeks under
examination are the weeks the research pipeline kept failing — balance
exhaustion on 19, 20 and 21 August, resolver rework throughout. Reduced catalyst
*detection* is indistinguishable from absent catalysts. This is the first
analysis to run, not a caveat to append.

**Four hypotheses, none tested**, recorded so they are not silently reinvented:

- Catalyst was always a proxy for *attention*; something else now supplies
  ignition, leaving float and volume as the binding constraints.
- Attention has gone reflexive — appearing on scanners is what makes the mover.
- The catalyst moved from the news wire to the filing cabinet: reverse splits,
  offering completions, S-1 effectiveness. Supply events, not news events.
- A real catalyst manufactures sellers from the prior run, while a no-news
  runner has no waiting holder base. The only one that also explains why
  catalyst names get *passed over*, rather than just why others run.

## State as of 2026-08-23

**Step 1 is built and has run.** Outcome capture plus the coverage rollup:
`lib/archive/`, `worker/archive-backfill.ts`, `npm run archive:backfill` and
`npm run archive:coverage`. Findings, defects and limits are in
[../rnd/2026-08-23-outcome-capture.md](../rnd/2026-08-23-outcome-capture.md).
Read that before touching the archive.

The instrument exists; the data does not yet. It has only ever run against the
stale local store, which ends 2026-08-18. **Q1 turns on 19, 20 and 21 August,
and those dates live only on production.**

**The dates exist. Ops confirmed it 2026-08-23**, read-only, before anything
was copied: 2026-08-19 has 16 assessments and 400 ticker rows, 08-20 has 19 and
450, 08-21 has 19 and 475. 75 assessments over five dates, 25 tickers each,
`COMPLETE` 74 and `MISSED_SUPERSEDED` 1. Full numbers in [ops.md](ops.md) Open
item 5.

**Why the failing week did not cost checkpoints — and it matters to Q1's
premise.** The assessment scheduler makes zero model calls (`model_calls` is 0
on all 75 rows), so an exhausted OpenAI balance cannot stop it. Assessment
coverage and research coverage are independent. *What the desk looked at* is
intact for the whole window; only *what it managed to learn* was degraded.
That is the distinction Q1 turns on, and it is now known rather than assumed.

**What that lets Q1 claim, stated so it is not overread.** Any question about
the *characteristics of the names that ran* — board, rank, RVOL, price, what
else was competing — is answerable across the full period at normal quality;
none of it depended on research. The catalyst grade is the part still in
question, and the open issue is no longer "is it missing" but "was the analysis
behind it produced during the window". `intelligence_status` reads `AVAILABLE`
straight through the outage, because a grade served from an existing analysis
genuinely is available. **The caveat was replaced by a measurement, not
removed** — see the findings note.

**Two things Ops handed over, both unexamined here:**

1. **19 August is thin, and not for a reason status records.** The full
   schedule is 19 checkpoints a day. 08-18, 08-20 and 08-21 each have all 19;
   **08-19 has 16, with three absent rather than marked missed**, and 2 of the
   16 flagged `generated_late`. Any analysis assuming an even cadence across
   the three days will not get one.
2. **The rows exist; what is inside them on 19-21 August may not be sound.**
   `intelligence_status`, `catalyst` and `structure` were being written during
   the days research was failing. The snapshots are real — whether those
   columns are degraded or stale is a different question, and it is Q1's
   independent variable. Ops did not query it: it is this thread's call on its
   own extract. Worth settling before any outcome is attributed to a catalyst
   grade from that window.

   **Instrumented 2026-08-23; the answer needs the extract.** `analysis_version_id`
   is already on every ticker row and already in the two-table extract, so
   `ageCatalystGrades` can say for each symbol-day how many sessions old the
   analysis behind its grade is. Zero means produced that day; three means
   research has not revisited the name in three sessions while
   `intelligence_status` still reads `AVAILABLE`. **Consequence for how the
   extract is cut: it must NOT start at 19 August.** A window beginning inside
   the outage censors every grade in it — the first day reads as freshly graded
   and the rest as barely aged, which is how a stalled pipeline disguises
   itself. Take the full five dates on record, and further back if production
   holds more. Costs nothing; the payload is a few MB either way.

**Delivered 2026-08-23: the extract is at `data/assessments.db`.** Cut from
production by Ops after deploying `775c5a9`, unbounded — no `--from`, no `--to`,
so the censoring problem above does not arise. 2.8 MB, `integrity_check` ok,
exactly `desk_assessments` and `desk_assessment_tickers`, **75 assessments and
1850 ticker rows** over 2026-08-17 → 2026-08-21, `COMPLETE` 74 and
`MISSED_SUPERSEDED` 1. Verified on the server and again after transfer; counts
match the independent read-only query Ops ran against production on the same
evening. `/data/` and `*.db` are both gitignored, so it will not be committed.

**Before anyone runs that tool again — `--dry-run` deletes a directory.**
*Found by Ops on first production contact, 2026-08-23. This is R&D's file and
R&D's fix; Ops has not touched it.*

[`worker/archive-export.ts:127`](../../worker/archive-export.ts:127) is, inside
the `--dry-run` branch:

```js
fs.rmSync(path.dirname(destination), { recursive: true, force: true });
```

Two separate defects in one line. It removes **`dirname(destination)`** — the
*containing directory* of `--out` — rather than the file that was written. And
the run is not dry: `exportAssessments` executes unconditionally about twenty
lines earlier and writes the real extract; `--dry-run` changes only the cleanup,
so the header's "reports only that and writes nothing" is also untrue.

What that means on the box: `--out /var/lib/mointel/assessments.db --dry-run`,
run as the `mointel` user, attempts `rm -rf /var/lib/mointel` — `market.db`, the
WAL, and all six backups, every one of them owned by that user. The live run on
2026-08-23 used `--out /tmp/…`, so it tried to remove `/tmp` and was stopped by
the sticky bit with `EACCES`. Nothing was lost, and that was luck, not design.

Why the tests did not catch it: `tests/archive/export.test.ts` covers
`lib/archive/export.ts` thoroughly, and **nothing exercises
`worker/archive-export.ts` at all** — the CLI wrapper is the untested part and
is where the `rm -rf` lives. The library being proven is what justified this
route; that argument still holds and is not what failed.

The real (non-`--dry-run`) path does not call `rmSync` on anything and is safe;
that is the one Ops used. **Ops will not run `--dry-run` against production
again until this is fixed.**

The tool as it stands
opens the store read-only and produces ~1-3 MB rather than a 250 MB+ snapshot
— the backfill reads two tables and fetches the rest from Alpaca. The same
command reports checkpoints per trading date, which also answers whether the
desk recorded anything on the three days in question. Full procedure in the
findings note.

**It does need the code on the box, though — corrected by Integration
2026-08-23.** This charter and the findings note both said "needs no deploy",
and the findings note's comparison table records "code on production: no" for
this route. That is wrong. `worker/archive-export.ts` says *Usage, on the
server* in its own header and takes `--market-db /var/lib/mointel/market.db`,
a path that only exists on the box — so the tool has to run there, and it
landed in `8170f58`, four commits ahead of what production runs. The payload
argument is untouched and the route is still the right one; what was wrong is
only the claim that nothing has to reach the server. **How it gets there is
Ops's call, not this thread's** — see [ops.md](ops.md) Open item 5.

**Ordering once those dates land**: the split test first, because it serves Q1,
which is active. `split_sessions_ago` makes the reverse-split half of Q1's third
hypothesis a query — 21 of 100 symbol-days had a split within 30 sessions, where
a same-day-only check saw 2. Q5 stays proposed until Q1 has a verdict.

What was already there and turned out to be enough:

- `desk_assessments` and `desk_assessment_tickers` are **append-only**, with 40+
  fields of frozen per-ticker state at every checkpoint and a deterministic diff
  against the previous one. The record of what the desk believed — the half
  nobody could reconstruct later.
- The catalyst grade is stored per ticker per checkpoint with provenance, and
  `UNKNOWN` is an honest verdict rather than a gap. That is Q1's independent
  variable, already labelled. **Coverage needed no new capture** — the desk
  already recorded, per ticker per checkpoint, whether a look had happened.

What turned out not to be there:

- **`daily_bars` cannot serve the backfill.** It is a research-cycle artifact —
  populated only for symbols that got a cycle analysis, and split-adjusted. 43
  of 100 assessed symbol-days have no row in it. The backfill fetches raw
  minute bars instead, which is strictly better: it also gives `time_of_high`,
  the premarket high, and the windowed gains.

## Working rules

- **Close questions.** A question that is neither active nor closed is debt. The
  verdict format that worked in viscosity — a single stated verdict plus what
  would have to be true to overturn it — should continue.
- **Report the null.** Two of three viscosity phases returned nulls and they were
  the useful results. A thread that only reports discoveries will eventually
  manufacture one.
- **Say what was not verified.** Distinguish backfilled from as-seen, adjusted
  from unadjusted, and a coverage gap from a finding.
- **Sub-streams are directories, not threads.** A question big enough to need its
  own phases gets a folder and a spec, the way viscosity did. It does not get its
  own chat — that rebuilds the sprawl these threads exist to prevent.
- Build the minimum instrumentation the active question needs. The archive spec
  is a destination, not a prerequisite.

## Opening message for a new chat

> This is the **R&D thread** for the Momentum Intelligence desk at `A:\mointel`.
> Read `docs/threads/rnd.md` and `docs/threads/README.md` first, then
> `docs/DATA-ARCHIVE.md`.
>
> You are a standing capability, not a project: the desk should always be
> learning something, and what it needs to learn will change. Questions live in
> the register in the charter, at most two active at a time, and they get closed
> with a verdict — a null counts. You also own the tape research at
> `A:\trade_research\momentum\viscosity`.
>
> You do not own `lib/research/` (Research Pipeline) and you do not deploy (Ops).
>
> Q1 is active. Start with outcome capture and a backfill over the assessments
> already recorded, and tell me what the first answerable question is once it
> lands. Before any conclusion about catalysts, measure research coverage per
> day — the weeks in question are also the weeks the pipeline kept failing.
