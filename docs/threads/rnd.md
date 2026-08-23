# Thread: R&D

**Owns the questions.** What is the market actually doing, does the playbook
still work on it, and what would have to be true for the desk to say so.

Opened 2026-08-23, split out of the Research thread on the grounds that a thread
owning both a billing pipeline and an open research question will always spend
its time on the pipeline.

## The prize

**Why do 50%+ movers no longer carry catalysts, and why are catalyst-driven
names being passed over?**

That is the question. Everything else in this thread is instrumentation for it.
Pillar 4 of the playbook — breaking news catalyst — is described as
non-negotiable, and it appears to have stopped binding since roughly July 2026.
Either the rule changed, the market changed, or the desk stopped being able to
see catalysts. Those are three very different worlds and the desk should be able
to tell them apart.

Secondary, and downstream of the same data:

- Would the playbook have worked on these names? What share of qualifying movers
  ever produced a tradeable pullback at all?
- What distinguishes a mover from a non-mover in the current regime?
- What is the tape character of a name worth trading — the open line from the
  viscosity programme.

## Scope

- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the capture specification. **Means,
  not end.** Build enough of it to answer a question, then answer the question.
- Analysis over the archive; findings, written down and dated
- `A:\trade_research\momentum\viscosity` — the tape research. Different repo,
  same question. This thread owns it.

## Not this thread

- `lib/research/` — the catalyst pipeline, its cost and its incidents →
  [research.md](research.md)
- Deploying anything → [ops.md](ops.md)
- Presenting findings in the UI → [design.md](design.md), and not until a
  finding has survived. The viscosity README is explicit that a tradeability
  state on the desk is a much later concern.
- The trader's own execution → [coaching.md](coaching.md)

## State as of 2026-08-23

**Nothing built.** The archive is specified and agreed; no code exists.

What already exists and is useful on day one:

- `desk_assessments` and `desk_assessment_tickers` are **append-only** and carry
  40+ fields of frozen per-ticker state at every checkpoint, including a
  deterministic diff against the previous one. This is the record of what the
  desk believed, and it is the half nobody else could reconstruct.
- `daily_bars` is **never pruned** and already holds ~100 trading dates.
  Outcomes can be backfilled over every assessment already recorded.
- The catalyst grade is stored per ticker per checkpoint with provenance, and
  `UNKNOWN` is an honest verdict rather than a gap. That is the independent
  variable the whole question turns on, already labelled.

From the viscosity programme, closed and worth not repeating:

- `WITHIN_DAY_TRADE_COUNT_SIGNAL_CONFIRMED` — raw completed-minute trade count
  predicts a *less* clean next 30-60s. More executions is worse, not better.
  The programme's only usable artifact.
- `NO_SUBMINUTE_INCREMENTAL_SIGNAL` — the execution-arrival line is closed.
  Sub-minute adds nothing *predictively*. It is still required for
  *measurement*, which is a different question and was never tested.
- The Databento archive is frozen and non-extendable. The desk's live Alpaca
  connection is the successor.

## Open items

**1. Outcome capture, with a backfill.** Step 1 of the archive sequence. Cheapest
possible start and it makes ~100 trading dates immediately queryable.

**2. Hold coverage constant before concluding anything.** The weeks under
examination are the weeks the research pipeline kept failing — balance
exhaustion on 19, 20 and 21 August, resolver rework throughout. Reduced catalyst
*detection* is indistinguishable from absent catalysts. This is the first
analysis to run, not a caveat to add at the end.

**3. Four hypotheses, none tested.** Recorded so they are not silently reinvented:

- Catalyst was always a proxy for *attention*; something else now supplies
  ignition and float plus volume are the binding constraints.
- Attention has gone reflexive — appearing on scanners is what makes the mover.
- The catalyst moved from the news wire to the filing cabinet: reverse splits,
  offering completions, S-1 effectiveness. Supply events, not news events.
- A real catalyst manufactures sellers from the prior run, while a no-news
  runner has no waiting holder base. This is the only one that also explains why
  catalyst names get *passed over*, rather than just why others run.

## Working rules

- **Findings get written down and dated**, with the verdict stated as a verdict.
  The viscosity programme's convention — a single `SCREAMING_VERDICT` plus what
  would have to be true to overturn it — works and should continue.
- **Report the null.** Two of the three viscosity phases returned nulls and they
  were the useful results. A thread that only reports discoveries will
  eventually manufacture one.
- **Say what was not verified.** Distinguish backfilled from as-seen, adjusted
  from unadjusted, and a coverage gap from a finding.
- Build the minimum instrumentation that answers the current question. The
  archive spec is a destination, not a prerequisite.

## Opening message for a new chat

> This is the **R&D thread** for the Momentum Intelligence desk at `A:\mointel`.
> Read `docs/threads/rnd.md` and `docs/threads/README.md` first, then
> `docs/DATA-ARCHIVE.md`.
>
> You own the question: why do 50%+ movers no longer carry catalysts, and why
> are catalyst-driven names being passed over. The archive is instrumentation
> for that, not the goal — build the minimum that answers something real.
>
> You do not own `lib/research/` (that is the Research Pipeline thread) and you
> do not deploy (Ops does). You also own the tape research at
> `A:\trade_research\momentum\viscosity`.
>
> Start with outcome capture and a backfill over the assessments already
> recorded, and tell me what the first answerable question is once it lands.
> Before any conclusion about catalysts, measure research coverage per day —
> the weeks in question are also the weeks the pipeline kept failing.
