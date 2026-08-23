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
| Q1 | Why do 50%+ movers no longer carry catalysts, and why are catalyst-driven names passed over? | 2026-08-23 | **ACTIVE** — the stored catalyst grade is contaminated by the Sheet; needs a prior-free re-derivation before any verdict |
| Q2 | What share of qualifying movers ever produce a tradeable pullback at all? | 2026-08-23 | proposed |
| Q3 | What separates a mover from a non-mover in the current regime? | 2026-08-23 | proposed |
| Q4 | Can tape character be measured well enough to call a name tradeable? | 2026-08-19 | dormant — see closed lines below |
| Q5 | When does a board name's move happen, relative to when the desk puts it on the board? | 2026-08-23 | proposed — behind Q1, see the ordering note |
| Q6 | Can the 09:25 pre-open assessment be scored against outcomes? | 2026-08-23 | proposed — *handed over from Design*, see below |
| Q7 | Can Chop Risk, Flush Risk or Effective Float Turnover be defined well enough to act on? | 2026-08-23 | proposed — *routed here by the desk owner*, see below |

**Q7 was routed here by the desk owner on 2026-08-23**, in those words: *"None
yet. This needs to go to the viscosity study."* Audit §11 item 3 asked which of
four briefed-but-unbuilt concepts Design should surface. Three of them —
**Chop Risk, Flush Risk, Effective Float Turnover** — are measurement questions
before they are display questions, and they belong to the viscosity programme's
subject rather than to a column budget.

Design is unblocked either way: none of the four gets a column in Phase 2, so
the §6 eight-column set is final and no row design waits on this.

What would make any of them displayable is a definition that survives contact
with the tape — stated as *"a trader would use this to decide X"* — plus
evidence it separates outcomes. Absent that, a column would be a number with no
defensible meaning, which is the failure mode `UNKNOWN` exists to prevent.
Note the standing constraint before reaching for minute bars: a hold is seconds
long, and the closed viscosity lines already establish that completed-minute
trade count predicts a *less* clean next 30–60 s.

**The fourth concept, Overhang Absorption, was deliberately NOT routed here.**
Design's position, recorded in audit §11 item 3, is that it should not be built
in this product at any phase — the booklet's absorption is a live Level 2 /
Time & Sales read at second granularity used as a gate, and a desk-computed
version would compete with a truthful live read the trader already has. It is
not a measurement gap; it is a surface this product should not occupy.

**Q6 came from Design, 2026-08-23**, and is recorded here because validating a
score is this thread's register and not a design decision. Audit §11 item 6 asks
whether the 09:25 pre-open assessment "ever gets a validated score". It is
captured, flagged `EXPERIMENTAL`, and the UI says so.

Design does not need the answer to proceed, and has already acted on the
conditional: **if it stays `EXPERIMENTAL` indefinitely it should not occupy a
slot in the trader-facing checkpoint selector**, and audit F-26 already hides
that selector until it has options. So this is not blocking anything — it is a
question about whether a pre-open read has predictive content at all, which is
the kind of thing this register exists for. Design acts on whatever comes back.

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

**ANSWERED 2026-08-23: the stored catalyst grade is not independent of the
Sheet.** *Research, replayed against a production snapshot with byte-identical
evidence across arms.* Removing the Sheet's prior from the interpreter's context
changed **2 of 6** catalyst grades against a control variance of **0 of 6**. The
effect is real; the mechanism is not asserted at that n, and 2 of 6 is a
direction rather than a rate — the prior exists only for TODAY-tab tickers and
TODAY currently holds 9 rows, 3 without evidence, so six names is the entire
measurable population rather than a chosen sample.

**Also from the control, and it lands here: `structureClassification` moved 2 of
6 on identical input.** A third of it is not reproducible. Nothing in this
thread uses the stored `structure` field — `symbol_desk_day` has no structure
column — so no finding here needs a caveat; the exposure is the desk's
deterministic diff at `lib/desk/assessment.ts:269`, which turns every change
into a trader-facing event, and that is Design's surface.

Three things the extract settles about it. **Every structure change coincides
with a new analysis version and none occurs without one** — 0 moves across 1192
same-version checkpoint pairs, 29 across 56 version changes — so "structure
changed" means "the name was re-analysed", and an unknown fraction of those are
re-generation. **The ageing mechanism already covers it**: `analysis_version_id`
is per row and backs the whole dossier, and that zero row is what licenses
saying so, so nothing new needs capturing if structure is ever archived. And
**this archive cannot re-measure the 2-of-6 rate** — over the same 56
re-analyses structure and catalyst each moved 29 times, and catalyst is known
stable at 0 of 6 on fixed evidence, which proves the production figure is
dominated by genuine evidence change rather than instability. 52% is not a
competing estimate and must not be quoted as one. Separating the two needs
evidence held constant, which is Research's replay instrument.

Worth having in front of whoever decides the field's future: `structure` takes
**three values** over 1459 non-null rows — `CAUTION` 871, `UNKNOWN` 365,
`DIRTY_FLOAT` 223 — so the mode is 60% of the mass and a 2-in-6 flip rate is
large against that resolution.

**The surface is bounded to the TODAY tab.** The RESEARCH tab's 205 rows never
reach the interpreter — `loadSheetPriors` indexes `state.tickers`, built from
TODAY alone. The Sheet reaches the board, not the corpus.

**Restricting Q1 to clean ticker-days is the wrong route, and this archive's own
numbers say so.** It is not executable from here — TODAY membership per date is
not in the extract — and it would not be neutral if it were. TODAY held 42-56
rows on 17-21 August against 27-53 graded board symbols per day, so little may
survive it. And the filter is biased in the worst direction: TODAY is the
Sheet's $2-$10 momentum watchlist, and **82% of the 77 distinct names that ran
50%+ sit inside that band against 63% of all 252 board symbols**. Movers are
likelier to have carried a prior, so a clean subsample is depleted of exactly
the population Q1 is about.

**The recommendation is a prior-free re-derivation over 2026-08-17 to 08-21**,
replaying stored evidence rather than re-collecting — a grade formed from
today's news about a name that ran on the 19th is worthless. That is a run with
a cost and the decision is the trader's, not this thread's.

**It is the same run the Research thread already scoped, not an additional
one.** *Reconciled by Integration 2026-08-23 — the two charters briefly read as
two separate asks for model spend.* One arm rather than three, 58 tickers,
0.65M input and 0.23M output, and **one approval**. The mechanism, the cost and
a look-ahead condition that invalidates the result if the run is not pinned to
`data/market-prod-2026-08-23.db` all live in
[research.md](research.md) item 10, which carries the run. Do not restate them
here; this thread carries why Q1 needs it, not how it is executed.

**Everything not resting on the grade is unaffected**: the split test, Q5,
coverage, outcomes. What is suspended is Pillar 4's catalyst rate and the
catalyst-definition resolution, both of which read the same variable — and they
are now known to be contaminated rather than merely at risk.

**Consequence for the second ledger.** Its grades remain independently produced,
since nothing here writes to the Sheet. But ours have now been shown to see the
Sheet's answer on TODAY names, so *comparing the two is circular on exactly the
names most likely to matter*. The earlier fallback is the live path: use the
Sheet's grade as the independent variable, or re-derive ours prior-free. Never a
comparison between them.

**A second outcome ledger exists over the same window**, and it changes what Q1
can do. *Reported by Integration 2026-08-23; not read by this thread.* The Sheet
is written by four weekday ChatGPT tasks and holds 11-21 August — 148 outcome
rows over 115 tickers, 204 research rows over 146 with catalyst grade, source
URL, float and split history, graded 35 A / 46 B / 123 C. Q1 asks whether movers
stopped carrying catalysts or whether the desk stopped seeing them, and a second
grader over the same period is what separates those.

**The contamination is one-directional and that is what makes it useful either
way.** Nothing here writes to the Sheet, so the Sheet's grades cannot have been
influenced by this desk whatever `sheetPrior` does. If the prior does not reach
the interpreter, the two are independent graders and the comparison is the
instrument Q1 wanted. If it does, the *comparison* is circular but the Sheet's
grade is still independently produced and can serve as Q1's independent variable
**instead of** ours over the overlap. What collapses in the bad case is the
comparison, not the second labelling.

**It is not ground truth and never supplies an outcome.** Self-graded by the
process that made the forecasts, 85.8% backfilled, 68 of 204 floats still
Unknown, duplicate date/ticker rows. This archive's Alpaca-derived outcomes are
the honest measurement; take catalyst labels from that side and nothing else.

**Overlap, sized from this side.** Their universe is $2-$10 with float under
20M against this desk's $1-$20 on RVOL. Of 252 board symbols over 17-21 August,
159 traded inside $2-$10 at some point — a ceiling before their float filter,
which this archive cannot apply. **63 of the 77 distinct names that ran 50%+ are
in their band**, so the overlap on the population Q1 is about may be usable even
if the whole intersection is thin. Sizing it properly needs one thing: the
ticker-by-date list for 17-21 August. **This thread has not read the Sheet and
will not** — that surface is `research.md` Open item 5 and a list is cheap to
hand over.

**First move once anything lands, and it needs no answer from Research:**
compare their peak gain %, peak window and prior RTH close against this
archive's `max_gain_pct`, `time_of_high` and `reference_close` on shared
symbol-days. It calibrates their ledger against the tape without touching a
catalyst grade. Their "prior RTH close" is the exact field this thread found the
desk flipping at the bell, so a mismatch there is the first thing to look at.

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
that is the one Ops used.

**Fixed in `85bd8e9`.** A dry run is now a read: `countAssessments` queries the
source read-only and returns the per-date counts, so there is no destination,
nothing to clean up, and `--out` is ignored on that branch rather than honoured.
There is no recursive delete anywhere in the tool; the one remaining deletion is
an `unlinkSync` of the exact file `--force` names, behind an `isDirectory`
guard. The root cause was the shape — "do the real thing, then clean up" needs a
destructive step to exist and puts an operator's path inside it — so the shape
is gone rather than the line patched. `runExport` was extracted from `main` and
the module-level invocation guarded so the CLI is testable at all; the
regression test was checked by reinstating the original line and confirming it
fails. Ops can run `--dry-run` again.

The tool otherwise
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

**First results, 2026-08-23.** The backfill has run over the extract — 306
symbol-days, every one with minute bars. Full write-up in
[../rnd/2026-08-23-outcome-capture.md](../rnd/2026-08-23-outcome-capture.md);
four things belong in the register.

1. **The outage cost coverage, not currency.** Every grade on 19-21 August is
   fresh. The oldest carried grade in the whole window is three sessions, and
   158 of 176 datable grades were produced on the day they were served.
   19 August lost *reach* — 53% usable against 70-78% elsewhere, 17 names never
   looked at, and the week's only 10 `IN_FLIGHT` rows — but not *currency*.
   19 and 20 August have no censored grades at all. The caveat this thread was
   built around does not bite the way it assumed.

   *The pipeline produced new analyses on those days* stands. *Therefore those
   grades are independent evidence about the market* is the inference now
   waiting on the provenance question — a freshly produced analysis that read a
   Sheet prior is fresh and non-independent at once.
2. **Pillar 4, coverage held constant — recorded, not concluded.** 20% of 50%+
   movers carried a legitimate-positive or stronger catalyst, against 13% of the
   names that did not run. Two `STRONG` grades in the entire week, and 27% of
   movers were looked at and came back honestly `UNKNOWN`. **Suspended pending
   the provenance question above** — this is the one result that rests entirely
   on the catalyst grade.

   **The gap against the pipeline's own numbers is a definition, not two
   populations.** *Handed over by Research via Integration; resolved here
   2026-08-23 because this archive holds both populations.* Research reported a
   10% outright no-catalyst rate against Q1's 50%+ premise, and proposed that
   the trader observes names that **ran** while the pipeline observes names that
   were **researched**. That does not survive: restricting to movers barely
   moves the distribution (20% carry a real catalyst against 13% of non-movers —
   movers are slightly *more* likely to). The two numbers are the same
   measurement read against different bars. `NONE` — searched, found nothing —
   is 4 of 84 movers, **4.8%**. No legitimate-positive-or-stronger catalyst is
   67 of 84, **80%**. The pipeline counts the `MODERATE`/`WEAK`/`UNKNOWN` middle
   as having a catalyst; Pillar 4's breaking-news bar does not, and that middle
   is 63 of the 84. Neither side is wrong.

   **The real population gap is untested and is not the one Research named.**
   The trader observes movers *in the market*; this archive observes movers *on
   the board* — top 25 by RVOL out of ~900 eligible. A name that ran and never
   reached the board is invisible here. That is tier A, it does not exist, and
   it is why **Q3 stays unanswerable**.

3. **Hypothesis 3 has its first evidence, and the timing is the point.** Of the
   252 board names that week, those with a reverse split **6-30 sessions ago**
   ran 50%+ at **70.6%** (12 of 17), against **27.8%** with no split (62 of
   223) — while a split in the *last five sessions* is indistinguishable from
   none at all (25%, 3 of 12). That is the shape hypothesis 3 predicts, and the
   bucket boundary was committed at `8170f58` before the extract existed.

   Seventeen symbols, one week, and the population is the desk's board rather
   than the market — a post-split name has a small float and mechanically high
   RVOL, so it is likelier to be on the board at all. **The next step is more
   weeks at the same boundary, not a finer boundary on this week.** Retuning it
   now would turn a prediction into a fit.

4. **Every float on the desk comes from the Sheet.** `resolveDisplayedFloat`
   has two branches, RESEARCH tab and TODAY tab, and the type enumerates nothing
   else — recorded by Integration in `4b06764`. Three consequences here.
   **Pillar 5 is not independently measurable today**; this archive does not
   capture float and the only source is the one whose provenance is in question.
   **It would not lift the overlap constraint** against the second ledger:
   filtering the Sheet's universe by the Sheet's own float is agreement by
   construction, so a *derived* float would help and a Sheet-read one would not.
   And **the desk and the second ledger are not independent on float either** —
   same field, same workbook — so only the catalyst labels were ever candidates
   for independence.

   **Decided 2026-08-23, by the desk owner:** no Sheet-read float goes into the
   archive. The constraint lifts only if a *derived* float appears. Pillar 5
   stays not independently measurable until then, and the second-ledger overlap
   stays capped at the 159 symbols price alone can identify.

Q5 stays proposed and behind Q1. The five-day cut moved it slightly: 16 of 95
movers peak inside 09:30-11:00 and 61 of 95 peak outside regular hours.

What was already there and turned out to be enough:

- `desk_assessments` and `desk_assessment_tickers` are **append-only**, with 40+
  fields of frozen per-ticker state at every checkpoint and a deterministic diff
  against the previous one. The record of what the desk believed — the half
  nobody could reconstruct later.
- The catalyst grade is stored per ticker per checkpoint, and `UNKNOWN` is an
  honest verdict rather than a gap. **Coverage needed no new capture** — the
  desk already recorded, per ticker per checkpoint, whether a look had happened.
  `analysis_version_id`, on the same rows, turned out to carry grade freshness
  too. The word *provenance* used to appear in this bullet and has been removed:
  the row records which pipeline stored the grade, not where the grade's content
  came from, and conflating those is what the question above is about.

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
