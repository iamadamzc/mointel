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

**Waiting on Ops: one `npm run archive:export` from the production store.** It
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
