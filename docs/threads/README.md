# Working threads

One chat per thread. This folder exists because a single session carrying a
production incident, a UI phase and an AWS deploy at the same time stopped being
readable — for the operator and for the model.

Each thread has a charter below. Open a chat **with `A:\mointel` as the working
directory** so `CLAUDE.md`, `AGENTS.md` and the project memory load on their own,
then paste that charter's opening message.

| Thread | Owns | Charter |
| --- | --- | --- |
| **Ops** | The live desk, AWS, deploys, incidents | [ops.md](ops.md) |
| **Design** | The trader-facing UI, the audit remediation | [design.md](design.md) |
| **Research Pipeline** | The interpreter, evidence collection, model spend | [research.md](research.md) |
| **R&D** | Standing analysis capability — the question register, the archive, the tape research | [rnd.md](rnd.md) |
| **Coaching** | Daily fills, execution against the playbook | [coaching.md](coaching.md) |
| **Integration** | The charters, the seams, cross-thread decisions | [integration.md](integration.md) |

## Why six

Ops and Design are obviously different jobs. Research is split out because it is
what kept *interrupting* Ops: the OpenAI balance emptying, the 403 runaway jobs,
the retry policy. Those read as production incidents, but the fix is always in
`lib/research/`, and the decision is always about cost. It deserves its own
thread with its own budget in view.

**R&D was split from the Research Pipeline on 2026-08-23**, and the reason is the
same one that split Research from Ops. `lib/research/` is plumbing that generates
incidents — empty balances, runaway jobs, retry policy. The market-structure
question is open-ended research. A thread holding both will always spend its
time on the incidents, because incidents have deadlines and questions do not.
The pipeline's job is honest catalyst grades at a defensible cost; what those
grades mean is R&D. R&D also owns the tape research in a different repo
entirely.

R&D is deliberately a **standing capability rather than a project**. The desk
should always be learning something and the subject will change; today's
catalyst question is one entry in a register, not the thread's purpose. New
questions can be posed, spawned by a closed one, or surfaced by the standing
sweep. A question large enough to need phases gets a **directory and a spec**,
never its own chat — sub-threads per discovery is how this list doubles and
nothing is legible again.

Coaching was added the same day. It is the only thread about the trader rather
than the market, it runs daily rather than by project, and it is the one
carrying personal financial records — which need handling the others never think
about. It shares exactly one thing with R&D: tier C of the archive.

Integration was added 2026-08-23 and does **no product work**. It exists because
three problems in two days belonged to no thread: a working-tree collision, a
false safety claim sitting in a charter, and a hazard spanning a systemd unit
and a prune script. Splitting work created a gap between the pieces, and that
gap needed an owner.

## Sharing one working tree

Every thread works in `A:\mointel`. Rules, in order of how much they matter:

1. **Never `git add -A` or `git add .`** Stage by explicit path. This one rule
   would have prevented every incident so far.
2. **One thread holds uncommitted code at a time.** Commit or stash before
   handing back. Concurrent docs edits are fine.
3. **Deploys are safe regardless** — `push-release.sh` ships a committed sha via
   `git archive`, so uncommitted work cannot reach production. The risk is to
   *gates*: `npm test` against a half-edited `package.json`.
4. **A worktree when two threads must genuinely build at once.** Robust, but it
   needs its own `node_modules`. Reach for it when rule 2 becomes the
   bottleneck.

5. **`git stash` is not safe on this tree, and a stat line is not a review.**
   Added 2026-08-23 after a stash push/pop round trip over two doc paths
   silently dropped **264 lines of already-committed content belonging to three
   threads** — the R&D register's own rows, a section gating Q1's verdict, and
   two handovers from Design. It was committed without the file being re-read,
   caught afterwards, and recovered whole from the stash object.

   Two rules out of one incident. **Do not `git stash` to test whether a failure
   predates your edits** — commit to a scratch branch, or copy the files aside.
   A stash round trip on a tree several threads write to can return less than it
   took. And **read the diff, not the stat line, before committing a shared
   document.** `264 deletions, 50 insertions` was on screen and was the whole
   warning; a deletion count larger than the work you did is the signal.

   This one is cheap to obey and the incident that produced it was recoverable
   only by luck of `pop` leaving the object behind.

## The rule that keeps them separate

A thread that finds work belonging to another **writes it down and hands it
over** rather than doing it. Add it to the other charter's *Open items*, say so,
and stop. The exception is a live production emergency, which Ops always owns
outright.

**Every thread commits and pushes its own work, without asking.** *Recorded
2026-08-24 by Integration under the order-and-process delegation, after nine
commits sat unpushed because the only thread that had been pushing went idle.*

Two habits had formed that no rule ever required:

- **Asking permission to commit.** Nothing in these rules says to. The rule that
  matters is *stage by explicit path* — not *ask first*. A thread that has
  finished a piece of work commits it.
- **Treating push as Ops's.** *"Only Ops deploys"* is below and it is right.
  **Push is not deploy.** Pushing is a backup to a remote; it changes nothing on
  the server and needs no window. Any thread pushes.

The one real constraint is the other way round and it belongs to the deploy:
**a deploy must follow a push**, because `push-release.sh` archives out of the
local repo and would otherwise put code on production that exists in no remote.
That is Ops's check at deploy time, not a reason to centralise pushing.

Only Ops deploys. Design and Research produce commits; Ops puts them on the
server. This is deliberate — the deploy gate has checkpoint windows and pin
rules that a thread focused on a component will not have in mind.

**And the thread that produced the change verifies it on the live desk once it
lands.** *Added 2026-08-23, after the trader asked why Design would not be
looking at its own work.* The honest answer was that Design **could not** — a
change cannot be checked on production before it is on production — and that
nothing in this document sent it back afterwards. Its work ended at the
handoff.

That is a gap, not a rule. **Ops confirms the deploy; the author confirms the
behaviour.** They are different claims and Ops cannot make the second one: it
knows the release is live and the services are up, not whether the column sorts
the way the trader asked. So a deploy is not finished when `current` switches.
It is finished when the thread that wrote the change has looked at the real
board.

This is the gap the Phase 1 enum leak went through. It was reported fixed on
local fixtures that could not have tested it, and production found it. Every
charter already says *verify on the live desk*; none of them said **when**, and
the only moment it is possible is after a deploy nobody was asked to report
back from.

## What the trader has to do goes last

**Every reply ends with a section headed `## What I need from you`, and nothing
comes after it.** Asked for on 2026-08-23, and the reason is concrete: on a busy
night the decisions that only he can make were arriving buried inside long
reports, and a request he does not see is a thread that quietly stalls.

This is not a formatting preference. It is the interface between six threads and
one person, and it is the narrowest part of the whole arrangement.

Four rules, and the last two are what make it worth having:

1. **Last, always.** No summary, no next-steps, no sign-off after it. If it is
   not the final thing on screen it has failed at the one job it has.
2. **Only things that actually need him.** A decision, an approval, an answer
   only he holds, a piece of information not in the repo. Status is not a
   request. Progress is not a request. If it belongs in the body, leave it there.
3. **Say when there is nothing.** "Nothing needed from you" is a real and useful
   answer, and writing it is what makes the section trustworthy — he can only
   rely on its absence meaning *nothing*, rather than *forgot*.
4. **Each item must be answerable in a sentence.** Give the options, or a
   recommendation to accept or reject. "Thoughts?" is not a request, it is
   homework. If a question needs three paragraphs of setup, the setup goes in
   the body and the question goes here.

Integration is bound by this like every other thread, and wrote it having broken
it repeatedly first.

## A deletion plan is a list of READERS — and so is a rename, and a type change

**Added 2026-08-24, after Design found a deletion about to break capture in three
files it owns none of.**

`dossier.cycle` is scheduled for removal. The plan named the writers. It did not
name `worker/desk-assessments.ts:275`, which reads the field to write the
checkpoint's cycle column, or `components/AssessmentHistory.tsx:218`, which
renders it raw.

**The failure would not have been the empty column anyone expected.** The line is
`dossier?.cycle.cycleClassification ?? null` — and the optional chain guards only
`dossier`. With `dossier` present and `cycle` deleted, `.cycleClassification` is
a **TypeError**; `?? null` never runs. `cycle: CycleFindings` is not optional
(`lib/research/types.ts:550`), so nothing warns at the call site once the field is
absent at runtime. The throw lands inside `captureAssessment` **before**
`insertAssessmentTickers`, so the checkpoint's ticker rows are never written — for
every ticker carrying a dossier, at every checkpoint. **A research field deletion
would have destroyed the append-only record**, which is the one category on this
desk that no run buys back.

**Design's widening, and it is right: the shape is not about deletion.** *"A
rename is a list of readers. A type change is a list of readers."* Anything that
changes what a field IS — removing it, renaming it, narrowing its type, making it
nullable — is a change whose blast radius is every reader, and the author is
reliably holding a list of writers. Do not read the rules below as being about
`delete` only.

**Record the false positives, do not silently drop them.** *Research's rule, from
building the `dossier.cycle` inventory.* Ten candidate sites, four real, and it
kept the six that were not in the plan with the reason each was cleared. Its
argument beats tidiness: **a plan that cries wolf on three of ten sites gets
skimmed, and then the real ones go with it.** A cleared site also stays cleared —
the next reader does not re-investigate it.

**And expect the false positives to share one cause.** All four here were the
same collision: the Sheet's row carries `cycleClassificationRaw`, `cycleState`,
`cycleReasoning` and `recentMajorRuns` — **dossier-shaped names on a different
type** — so `TickerDrawer.tsx` reading `research?.recentMajorRuns` is reading a
`string` off `StructuralResearch`, not the dossier's `string[]`. **Inventory by
type or by call site, never by field name.** This is the float problem in a
second costume: when two threads can each be right about the same word, a grep
cannot tell them apart.

Three rules out of it:

1. **Whoever deletes a field owns every module that reads it**, across thread
   boundaries. Not "notifies" — owns, and the fix ships in the same commit as the
   deletion. If it must split, the reader is made safe FIRST.
2. **Enumerate readers by search, not by memory.** The plan was written by the
   people who knew the field best, and it is precisely that knowledge which makes
   a curated list feel complete. Same failure as diffing a hand-picked file list
   instead of a directory.
3. **`?.` on the parent is not a guard on the child.** `a?.b.c` protects against a
   missing `a` and crashes on a missing `b`, which reads as safe and is the exact
   shape you get when deleting `b`.

**And note who found it.** Design owns none of the three files. It had just been
told its instinct was false about one surface, and instead of dropping the
instinct it asked where it *was* true — the re-derive-rather-than-withdraw repair,
applied unprompted to its own corrected hunch.

**Design put the credit somewhere better, and it is the more useful half.** Its
words: *"asking where a corrected instinct IS true is cheap — it costs one grep.
What made it findable was your correction being specific enough to point
somewhere: 'the rail hashes live tape, here are the line numbers' told me exactly
which layer to stop looking at. A vaguer correction would have just ended the
thread."*

So the load-bearing part is on the **correcting** side, not the corrected one:
**a correction that names the line lets the receiver keep searching; a correction
that only says "no" ends the search.** Both are accurate. Only one of them
produces a second finding. That belongs beside the rule that a retraction must
reach every inference resting on it — same family, and the same cost when it is
skipped.

## Integration can instruct deploys; only Ops performs them

**Added 2026-08-24. The trader delegated deploy instructions to Integration and
confirmed it to Integration directly rather than only through Ops.**

*Only Ops deploys* below is unchanged — Ops gates, Ops ships, Ops verifies capture.
What changed is who may say **when**. Integration can now issue a deploy
instruction naming a sha, and Ops acts on it without a round trip to the trader.

Three things this does not change:

- **The gate runs at the sha that ships**, and an instruction names a sha rather
  than a ref. If the sha has moved, it is a new instruction and a new gate.
- **Capture is verified at directory scope** before shipping.
- **Spend, auth-model changes and destructive actions still go to the trader.**
  This is deploys only.

**And the way it was adopted is the part worth copying.** Ops relayed the
delegation accurately and Integration still declined to use it until the trader
said it in Integration's own thread — because a relay that *grants* authority is
the same object as a relay that *withholds* it, and this desk's rule about the
second has to survive the first. The twenty-minute gap produced a genuine
deadlock, with Ops no longer asking and Integration not yet instructing. **When a
protocol changes, both sides adopt it at different moments, and the gap between is
a stall nobody is responsible for.** Name who is waiting on whom, out loud.

## Which endpoint feeds a surface — AND WITH WHICH PARAMETERS

**Design, 2026-08-24, after Integration relayed a true measurement onto the wrong
surface and told it two checks were impossible. Both then passed.**

Ops measured Discovery exactly: 8,653 `ticker_session` rows seeded for the new
date, **0 with `rvol_rank`**, `/api/market` returning `discovery.rows: 0`.
Integration concluded the phase names and the retracement figure could not be
checked, *"because both need rows on the board"*.

**Three threads, three true measurements, three different conclusions — and the
reconciling fact was a query parameter nobody had named.**

- **Design** observed the hydrated review page: `BACKSIDE` ×3, `NO RUN` ×3,
  `CYCLE NOT ESTABLISHED` ×3, OLOX at *143.7% of the move given back*. Real, and
  re-run to confirm it was current rather than remembered.
- **Ops** measured Discovery — 0 rows with `rvol_rank` — and read the
  server-rendered HTML: `CYCLE NOT ESTABLISHED` ×9, `NO RUN` ×0. Also real.
- **Integration** relayed Ops's number onto Design's surface and declared two
  checks impossible; Design corrected it with *"the nine rows do not depend on a
  rank at all"*; Integration published that as a rule. **Both of those were
  wrong.**

**The trace, followed to the SELECT.** `readIntelligence` returns `{}` on an empty
ticker list (`readModel.ts:637`); the list is `states.map(s => s.ticker)` (`:465`);
`readDemandStates` selects `WHERE trading_date = ? AND rvol_rank IS NOT NULL`
(`lib/market/store/repo.ts:583`). **The bare endpoint IS rank-gated**, exactly as
Ops said.

**And the page does not call it bare.** It calls
`/review/<token>/api/market?symbols=OLOX,PMI,DXST,…`, supplying its watchlist
through `extraSymbols` and bypassing the gate. Measured at one instant on one
token:

| call | intelligence entries | demand states |
| --- | ---: | ---: |
| `/api/market` | 0 | 0 |
| `/api/market?symbols=…` | **6**, all carrying `computedCycle` | 9 |

Six populated and three not is exactly three `BACKSIDE`, three `NO RUN`, three
`CYCLE NOT ESTABLISHED`. **Ops read the server-rendered HTML, produced before that
client fetch, so its nine were the correct pre-hydration state. Nobody saw a
phantom.**

**So the rule takes one more word rather than a retraction: which endpoint, AND
WITH WHICH PARAMETERS.** An endpoint's behaviour on a bare call is not its
behaviour in the app, and checking it bare gives a confident wrong answer. A
verification result must name the surface AND the call that produced it — *six of
six* describes the hydrated page and **does not** describe the server-rendered
HTML, which is a distinction that belongs in the table rather than assumed.

**Design's own summary of its position is the part to keep: *"I had the conclusion
right for a reason I had not identified, which is not the same as being right."***

**The failure is assuming phase-dependent means tape-dependent.** It is the same
error as the endpoint trap next to it — `/api/dashboard` carries the *Sheet's*
cycle and no `intelligence` key at all, so checking it would have produced a
confident **false failure** the same night. Three threads met a variant of this in
one day.

**So before declaring a surface unobservable, trace what feeds it.** A measurement
of one data path says nothing about a surface fed by another, however plausibly
the two are related — and *"it cannot be checked yet"* is a claim that costs a
verification window if it is wrong. **Integration made this call twice in one
night, in opposite directions**, first listing these two as checkable before
premarket when they were not, then as uncheckable when they were. Both times the
missing step was the same: nobody traced the feed — and when three threads finally
did, the last hop was a parameter in a URL rather than anything in the code.

**The loose thread turned out to be the confirming evidence.** Ops counted
`"given back"` ×3 in server-rendered HTML that also had `NO RUN` ×0, and flagged it
as the observation that fitted nobody's account. Research opened the components:
`FilterBar.tsx:118`, `FilterBar.tsx:123` and `MarketSummary.tsx:93` are **three
hardcoded titles inside literal option arrays**, rendering whether or not a row
exists. The data-bearing string is `lib/dashboard/cycle.ts:93`, gated on
`retracementPct > 0`. **So three chrome labels and zero data rows is precisely the
signature of an empty projection** — the anomaly was a second, independent
confirmation of the finding it appeared to contradict.

**Two lessons, and the second is the one that nearly went wrong.** Flagging the
thing that does not fit, rather than smoothing it, is what got the components
opened at all — a guess in the message would have stopped anyone looking. **And
the last open question was closed by a number already in another thread's
message.** Research argued Design's pass must be on a different trading date,
because `extraSymbols` still needs a `ticker_session` row and it believed there
were none for 2026-08-24. Ops had measured **8,653 rows for that date, 0 ranked**,
and `repo.ts:606` selects `WHERE trading_date = ? AND symbol = ?` with **no rank
predicate** — so `?symbols=` finds exactly those seeded rows and bypasses the one
thing they lack. **Everything reconciles to one date and one deploy.** The fact
that settled it had been sitting in a relay for an hour, in a message whose author
did not know what it was for.

## An aggregate that falls is not proof the thing you fixed is working

**Research, 2026-08-24, catching a check before it ran rather than after.**

The healing for 133 partial bars had an agreed observable: **the `fetched_at`
count falls after Monday premarket.** Both Ops and Integration wrote it down as
the test that could fail usefully.

**It cannot.** A *partial* fall is what you see if the healing works and only some
symbols were re-analysed — which on a normal morning is the **expected** shape.
So the aggregate cannot separate *working* from *half-working*, and any fall at
all would have been read as success. **The unambiguous test is per-symbol:** take
the 42 rows known to be bad, and check that any symbol re-analysed since no
longer holds one.

**The general form: an aggregate moving in the right direction is consistent with
both the fix working and the fix half-working, whenever the population is also
changing for an unrelated reason.** Ask what else moves that number. If the answer
is *"normal operation"*, the aggregate is not the check — **the identified rows
are.** You almost always know which rows they are, because identifying them is
what produced the fix.

It sits beside *check the field that carries the answer*: that one is about
reading the wrong field, this one is about reading the right field at the wrong
**grain**.

## When two artefacts answer to the same phrase, the phrase is the defect

**Third instance in one day, 2026-08-24, and this one cost a thread idle time.**

R&D sat idle reporting its only queued item *"waits on Research's inventory"*. It
was not waiting on anything: **Research has two artefacts that phrase describes** —
the item 13 **reader** inventory (dossier fields, for a deletion) and the 65-field
**Sheet coverage** inventory (`docs/sheet-coverage-audit.md`, for a retirement).
Unrelated work, days apart, near-identical names. R&D's dependency was the second
and it had been delivered.

**Neither Research nor Integration spotted it.** R&D was unblocked only because
Integration asked *which inventory* rather than assuming — and it asked only
because it could not tell either.

The other two instances the same day:

- **The Sheet carries dossier-shaped field names** — `cycleClassificationRaw`,
  `cycleState`, `recentMajorRuns` — which produced **four false positives** in
  Research's deletion inventory and a confident false failure waiting on
  `/api/dashboard`.
- **"Float"** names both a vendor-displayed number and a filing-computed one,
  which is why `float_basis` exists.

**So the rule is not "be careful": it is that a name collision is a defect in the
name, and the fix belongs at the source.** Rename the second artefact when you
create it. And the standing repair, from R&D's rule about values with two possible
definitions: **when two threads can each be right about the same word, the word
needs a companion column — or a different name — not a footnote.**

**The tell is that everybody involved was being careful.** Research knew both
inventories, R&D knew its dependency, Integration read both charters. Care does
not disambiguate a phrase; only the phrase does.

## The rule you just wrote is the one you are least likely to apply

**Integration's observation of a day in which three separate authors broke their
own rules; Ops's compression of it.** *Attribution corrected at Ops's insistence —
it declined the credit on the grounds that the hard part was noticing the three
were one shape.*

- Integration wrote *"never report who holds a file from `git status`"* and did it
  again inside the hour.
- R&D wrote *"absence of detection is not detection of absence"* and then read its
  own 30-session cap as an absence.
- Ops wrote *"state after starting cannot observe the manner of stopping"* and then
  reported *"all four services active"* after a deploy where one had crashed and
  restarted inside the window it was describing.

**All three were broken within HOURS of being written, by the author, and each was
caught by someone at a different layer.**

> **A rule you have just written is the one you are least likely to apply, because
> writing it feels like having done it.**

**The consequence is about ordering, not effort.** A new rule is at its weakest
immediately after it is recorded — the opposite of the intuition that it is
freshest then. So **the first application of a new rule is worth doing
deliberately, and is the one most worth another layer checking.** Ops's own repair
is the model: it wrote *check `NRestarts` after every deploy*, checked on the very
next one, and caught a worker that `is-active` reported as healthy.

## "This config does nothing" and "I searched the wrong directory" look identical

**Named by Research, 2026-08-24, after Integration nearly filed the second as the
first.**

Integration grepped `lib/` for consumers of `RESEARCH_RESOLVER_SEARCH_CONTEXT`,
found it declared and populated but never read, and reported it as **possibly a
knob that does nothing** — the same species as the `toolConfig` constant found
hours earlier. **It is live.** Both search-context values are consumed at
`worker/research.ts:110` and `:120`. **The grep covered `lib/`; the consumers are
in `worker/`.**

> **The evidence for *"this configuration does nothing"* and the evidence for
> *"I did not search where it is used"* are indistinguishable from inside the
> search — and the first one reads as a FINDING.**

**It is the exact inverse of the `toolConfig` catch**, where a live-looking field
was dead. Same directory, same night, opposite errors — which is what makes the
pair worth keeping together. **An empty result is not evidence of absence; it is
evidence about where you looked**, and that is *absence of detection is not
detection of absence* wearing a search-path costume.

**What kept it cheap was the handling, not the care.** It was grepped rather than
reasoned about, reported explicitly as *an observation, not an assertion*, and put
to the thread that holds the injection — so it cost two minutes instead of
entering another thread's register as a defect. **The rule is not "grep harder."
It is that a negative search result crosses a thread boundary as a QUESTION, never
as a finding**, because only the owner knows where the consumers live.

**And the constructive form, R&D's, which makes it a habit rather than a caution:
AN EMPTY RESULT IS ONLY INTERPRETABLE WITH ITS SEARCH SCOPE ATTACHED.** *"Searched
`lib/`, 0 hits"* is a different claim from *"0 hits"*, and only the first can be
checked by someone who knows better. R&D already does this in code for the same
reason: `auditSplitFetch` prints *"11,264 of 11,264 comparable"* so a zero reads as
a market fact rather than a broken fetch, and `split_lookback_sessions` makes a
null mean *"none in N"* with N in the row.

**Three instances, three threads, one shape:** a null lookback read as an absence,
a silent adjusted-fetch, an empty grep. **Report the scope beside the result.**

### And a correct-but-narrow number is worse than a false one

**Research, 2026-08-24, resolving why `/api/health` reported `queuedJobs: 0`
against ten queued jobs.** It is **not false.** `publishHealth` counts
`readJobsForDate(db, MAX(trading_date))`, and the ten are dated 2026-08-21 and
2026-08-17 — **so once the date rolled they stopped being counted.**

> **An aged backlog goes invisible exactly when it has aged. And that is worse
> than false in one specific way: a false number invites a check; a
> correct-but-narrow one does not.**

**Nothing about `queuedJobs: 0` looks wrong**, which is why it sat for days while
three threads reasoned around it. **The scope was the whole defect and the scope
was not on the number.**

**The same scoping hid a second, larger hazard, found only because the first was
asked about.** `readOrphanedJobs(db, bootDate)` requeues a row claimed and
abandoned mid-job — **but `bootDate` is the same `MAX(trading_date)`.** So a
claimed row **is** recovered on the next boot **unless the trading date rolled
first**, in which case it is stranded **permanently and silently** in `COLLECTING`
or `ANALYZING`. Zero such rows exist today across all dates, so it is a hazard
rather than a defect — **and it is the case the 30 seconds systemd used to give
before SIGKILL was quietly covering.**

**The repair is a second number, not a wider one.** `stalledJobs` counts
non-terminal jobs from any *other* trading date. **`queuedJobs` answers the
board's question and must keep answering it — two questions, two numbers**, rather
than one number widened until it answers neither well.

**And the same undercount hid a second fact in the same search:** the resolver
depends on hosted web search too — its provider class sits in the *same file* as
discovery's — so **84% of the desk's input tokens are search-dependent, not 56%.**
One grep, one directory, two wrong conclusions.

## `live?` propagates through a calculation; a taxonomy of origins does not

**R&D, 2026-08-24, reconciling its own annotation against an independently written
Sheet report.** The two classifications agreed on everything **except float**, and
the disagreement is structural rather than an error by either.

The report files **Float** under *filing/reference fact*, beside SEC forms and
split history — which implies it is re-derivable from a filing. **It is not:** the
same report's own source table shows `stockanalysis.com` at **505 citations**. And
it files *Overhang/Float* and *Float Quality* under *deterministically calculated*,
which they are — **from an input that is live.**

> **Their taxonomy classifies by HOW a value was produced. `live?` has to
> PROPAGATE THROUGH the calculation, because a deterministic function of an
> unrecoverable input is unrecoverable.**

**Two independent classifications agreeing on everything except the one field the
desk is actively arguing about** — and disagreeing because one asks *what kind of
thing is this* and the other asks *can it be got back*. Both questions are
reasonable; only the second decides what is lost when a source is retired.

**The practical form: recoverability is a property of the whole dependency chain,
not of the last step that produced the value.** A computed field inherits the
worst recoverability of its inputs, and a taxonomy built on provenance will file
it under the step you can see.

## Measure a commit, not a checkout

**Reached independently by two threads within one hour on 2026-08-24, from the same
failure. Deliberately unattributed** — a name on it invites the next reader to weigh
*who said it* instead of *what it costs to ignore*, and two independent derivations
in one evening is what makes it a desk rule rather than anyone's lesson.

It logged **13 changing class and 11 leaving eligibility** for the classifier fix.
The shipped commit does **15 and 13**. The gap is that `b467154` carries **two**
changes — the pattern relaxations *and* the ADR rule moving to run after the
derivative rules — and **R&D diffed a mid-edit working tree that held only the
first.** `IQMXW` classified `ADR_ADS` on both sides of its comparison and never
appeared.

> **Any number entering a log that outlives the session must be reproducible from
> a ref, or it is a snapshot of something that never existed.**

**How the error hid is why this is a section.** R&D's **13** and the shipped **13**
are the same number attached to different populations — its *changed class*, the
real one *leaves eligibility*. **A reader reconciling the table would have found 13
twice and concluded it was consistent.** A wrong number that collides with a right
one is worse than a wrong number alone.

**It pairs with the section above and is the harsher instance.** Research measured
regexes in isolation; R&D measured a checkout. **A working tree looks like the
system in a way an isolated regex does not** — so the tell is weaker, not stronger.
**Two threads failed the same way inside one hour**, which is a better argument for
asserting caller-visible output than either instance alone.

*The check that settled it: query the production snapshot for which of the thirteen
actually carried a rank. Two did — `BCTXL` at 43 and `IQMXW` at 117.*

**And a corollary, from the same author correcting the same entry again.** The
dated log recorded **zero** archive board symbols affected, and that zero held — but
**it held because this board is 252 momentum names from August 2026 and none of
them are derivatives, not because the log was well constructed.** A change touching
share classes, ADR treatment or the price band would have moved it, and the log
would have caught that **because it was written, not because it was written well.**

> **Record the check; do not credit the record with the answer.**

**A log that takes credit for a result it did not earn is how the next reader stops
running the check.** It is this same failure one level up: measuring a checkout and
calling it the system, measuring a regex and calling it the system, **crediting a
record and calling it the measurement.**

## I measured the component and reported it as the system

**Research, 2026-08-24, against its own work — the fifth instance of this family in
one day.**

It measured three classification regexes **directly against the universe** and
reported **722 of 723** to itself with confidence. **The measurement was blind to
RULE ORDER.** `IQM ... Warrants to purchase American Depositary Shares` matched the
**ADR** rule first and classified `ADR_ADS`, so the warrant designation never got a
hearing — **and the harness happily reported the warrant pattern as matching,
because a rule that never runs still matches when you test it on its own.**

> **The observation was real. It was not an observation of the thing being
> claimed.**

Same family as a ledger recording price without configuration, a heartbeat that
survives a blocked loop, and a log that fires only on success. **The fix is
identical every time: assert the output a caller would actually see.** Its test
asserted the *classification* rather than the pattern, which is the only reason
this surfaced; the 722 was then re-measured through `classifySecurity` and is
**earned rather than assumed.**

**And the repair generalises past tests.** The ADR rule now sits *after* the
derivative rules, and `RLX`/`WDH`/`AMX` are asserted **positively** as `ADR_ADS`
rather than merely not-`RIGHT` — **so a future reorder cannot demote them
silently.** A negative assertion passes for the wrong reason as easily as the
right one.

## A summary line must carry its basis, or it will be re-derived wrongly

**R&D, 2026-08-24, against its own headline number — and it is the basis rule
turned on a finding rather than a column.**

Re-checking Pillar 4, it computed the stored-catalyst columns first, saw **17.9%**
where it expected **16.7%**, and briefly concluded **its own published figure did
not reproduce.** It does, exactly. **It had compared a number against a DIFFERENT
INSTRUMENT and read the disagreement as an error.**

**The findings log named the basis. The register's summary line did not** — which
is what made the mistake available.

> **A figure whose basis lives only in the document that derived it will be
> re-derived wrongly by someone reading the summary — including by the person who
> wrote both.**

**This is `float_basis`, `reference_basis` and `split_sessions_ago`-with-its-window
applied one level up:** not to a stored value, but to **a conclusion**. The
companion travels with the number wherever the number goes, and a summary is
exactly where numbers go without their companions.

**The tell that it is worth the words: the author of both documents made the error
against himself, in under an hour, on the desk's most-quoted figure.**

## A constant dressed as a measurement

**Research, 2026-08-24, found in its own ledger.** The hardest version of *a check
that cannot fail*, because the column is never empty.

Discovery's `toolConfig` getter returned the hardcoded literal
`'web_search:default'`. **The ledger column whose entire purpose is telling two
configurations apart returned the same string for every call ever made** — and the
test asserted that constant and passed. The file's own header says a ledger
recording price without configuration cannot tell a saving from a coverage loss.
It was describing its own defect.

**Nobody looked because the resolver's getter was dynamic**, so the ledger appeared
populated for both stages. A missing column is obvious; **a column that is always
present and always the same is invisible**, and it reads as evidence.

So, beside *a check that cannot fail isn't a check*: **an observable that cannot
VARY isn't a measurement.** For any field recorded to distinguish cases, ask what
its distinct values are across the whole table. One is a defect. And a test that
asserts a constant confirms the constant, not the behaviour.

**It generalises past ledgers**, which is why it is here rather than in
`research.md`: any column, label or flag added to tell states apart is worth one
`select distinct` before it is trusted — including the ones this desk added
tonight.

## Ping Integration when you finish, without being asked

**Added 2026-08-24 at the trader's instruction, and the instruction was
*"make sure they ping you when they are done so I don't have to prompt you."***

The gap is precise. A thread finishes a piece of work, writes it up, and goes
idle. Integration does not wake on a commit — it wakes on a message. So the only
thing that made it go and look was **the trader asking it to**, which puts him
back in the transport role that the section below exists to remove. He was doing
it several times an hour.

So, on finishing any piece of work:

- **Send Integration one line.** *"Done, sha `X`, next is `Y`."* That is enough.
  If something is blocked or handed over, say so in the same line.
- **Do not wait to be asked, and do not wait until you have something polished.**
  The ping is a wake signal, not a report. The report is your charter and your
  commit message.
- **Ping on finishing, not on starting.** A thread mid-execution finishes without
  anyone; the rule that Integration must not put work-in-motion in front of the
  trader has the same root.
- **A commit is not a ping.** Commits do not carry questions and nothing watches
  the log. This is the same failure the Integration charter records under *read
  what a thread SAID, not what it committed*, seen from the sending end.

**Integration's side of the bargain:** every ping gets one of three outcomes —
answered, relayed onward with the context the receiver is missing, or declined
with the reason said back. Never silence.

## Absence of detection is not detection of absence

**Promoted to top level 2026-08-24 at R&D's request, after three instances in one
day by two threads.** It had been written down inside the float working, where a
reader of any other section never reaches it.

A measurement that finds nothing has two readings — *it is not there*, and *my
instrument does not reach it* — and the second is invisible from inside the
result, because the output looks identical.

- Integration read a null lookback as an absence.
- R&D concluded splits *"explain at most half"*.
- Both were produced by the same **30-session cap**, which bounded what could be
  detected at all. Removing it reversed the finding: all nine flagged names had a
  split, and so did 13 of 25 clean ones.

**The instance that earns it a section is the third, and it is R&D's own
framing: it wrote the correction, then made the same mistake within hours,
because the cap was its own field and it trusted it.** A rule broken by its
author inside a day is evidence that the failure is structural rather than a
matter of care — the same conclusion this desk reached about why no thread finds
its own defects, arrived at from the other side.

So: **before reporting an absence, name what would have had to be true for the
instrument to see it**, and check that separately. A window, a cap, a filter, a
join that drops rows — each turns *not found* into *not looked at*, and neither
is distinguishable from the other in the output.

## Thread-to-thread traffic goes through Integration, not through the trader

**Added 2026-08-23, at the trader's instruction, after he was asked three times
in one evening to carry a message between two threads.**

Not every thread can address every other. Design cannot reach Ops or Research;
Research could not see Design. So a thread with something to hand over writes
*"tell Ops..."* in its report and the trader becomes the transport — which costs
him a round trip, delays the handover by however long he takes to read it, and
strips the reasoning down to whatever fits in his relay.

**Integration can reach all of them.** So:

- **Send it to Integration and say who it is for.** It relays, adds whatever
  context the receiving thread is missing, and records anything durable in the
  charters rather than leaving it in two transcripts.
- **To reach Integration, send to the NAME `Integration` from `ListAgents`.**
  *Corrected 2026-08-23 after Design tried the instruction below and it failed.*
  It appears there as `Integration [0338b5]`. **Do not send to the `from=` id
  on a cross-session message — that is unreachable**, which is the opposite of
  what this document said for its first hour.
- **This is for handovers, findings and corrections — not for decisions.**
  Anything needing the trader's judgement still goes to him, at the end, under
  `## What I need from you`. Integration relays; it does not decide, and routing
  a decision through it only adds a hop.

The failure this prevents is not inconvenience. A handover sitting in a report
waiting to be noticed is indistinguishable from a handover nobody made — and
three of the defects found today were found because someone was told something
promptly, not because anyone went looking.

## Who owns `lib/market/`

**Assigned by Integration 2026-08-24 at the trader's instruction, after it came
up three times in one day as the module no charter claimed.** It is the heart of
the desk — the demand engine, session, rvol, board, cycle, securities — and it
was unowned because it predates the threads.

**It splits, and the boundary is a test rather than a list:**

> **Does it define, migrate or version a table? Ops. Does it compute? Research.**

- **`lib/market/store/` → Ops.** `SCHEMA_VERSION`, `ADDED_COLUMNS`, migrations,
  backups. Ops already owns every operational consequence of that code and its
  charter already documents the trap — *editing a `CREATE TABLE` migrates
  nothing*. **A schema change owned by a thread that does not deploy is how you
  get a migration that fails on the box.**
- **The rest of `lib/market/` → Research.** Engine, session, rvol, board,
  securities, cycle, config. Research is already the only thread writing there
  (`lib/market/cycle.ts`) and already owns the adjacent `lib/data/` providers.
  Everything in it is upstream of what Research consumes.

**The risk, named rather than discovered:** Research now owns `lib/research/`,
`lib/data/` and most of `lib/market/`. That is a lot for one thread, and it is
the reason to revisit this rather than a reason to have split it differently —
ownership that does not match who writes the code is worse. If Research becomes
the bottleneck, that is the signal to split again, and the seam is already
visible: `securities.ts` and `board.ts` are closer to product than to pipeline.

**And this is the second module assigned this way.** `lib/review/` went to Ops
on the same reasoning. Both were invisible until a task needed a home — which
means the charters describe *work* well and *code* poorly, and a third will
surface the same way.

## Shared state, single source of truth

Do not restate these in a thread doc; link to them.

| Subject | Document |
| --- | --- |
| System shape, layer rules, non-goals | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Running the desk, checkpoints, health, rough edges | [../OPERATIONS.md](../OPERATIONS.md) |
| The server, logins, deploys, rollback, backups | [../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md) |
| The research build plan and its phase gates | [../RESEARCH-MILESTONE-PLAN.md](../RESEARCH-MILESTONE-PLAN.md) |
| The UI/UX audit — the design authority | [../Design/design-audit-report.md](../Design/design-audit-report.md) |
| The market archive — calls, outcomes, and what gets kept | [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) |
| The Sheet coverage audit — 64 fields, their sources, and what replaces each | [../sheet-coverage-audit.md](../sheet-coverage-audit.md) |
| The trading strategy every threshold derives from | `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` |

Historical task prompts live in [`prompts/`](../../prompts). They are a record of
what was asked, not current instructions. Several are superseded.

## An intelligence platform, not a signal platform

**Stated by the trader, 2026-08-24, and it settles a class of design argument that
has come up in three threads this week.**

> **We are an intelligence platform, not a signal platform — so give the user as
> much of the story as we can that is useful.**

**The distinction is what the product owes the reader.** A signal platform reduces
everything to a call: a grade, a rank, a yes. **An intelligence platform hands over
the reasoning, the provenance, and the shape of what is not known** — and trusts
the trader to do the reducing, because he is the one carrying the risk.

**Read it as licence rather than as caution.** Several decisions on this desk were
taken defensively — show nothing rather than something imperfect — and this
reverses the default. **The bar is *useful*, not *certain*.**

- **`CANNOT_VERIFY` is a product feature, not a failure to answer.** So is
  `CYCLE NOT ESTABLISHED`, and so is `"51 unknown"` announcing that a whole column
  is empty. Each tells the trader something true he would otherwise have to
  discover himself.
- **A refused float must render as a finding, never as an absence** — already
  Design's rule, and this is the principle underneath it.
- **A bounded proxy with its basis stated beats a blank.** *"Supply bounded at X,
  from filed shares as of DATE"* is story; a blank float cell is not. **The
  decision to ship a bound rather than an estimated float is not a shortfall
  against this principle — it is an expression of it**, provided the bound arrives
  with its basis and its as-of visible.
- **Every value with two possible definitions travels with its companion column.**
  `float_basis`, `reference_basis`, `adjustment_basis`, `latestDate` on a cycle.
  Those exist so the reader can see which question was answered.
- **Conflicts get shown, not resolved silently.** Where the Sheet and the automatic
  path disagree, the disagreement is information.

**What it argues against**, and this is the part that changes work rather than
describing it: **collapsing a computation to a label and discarding the working;
suppressing a value because it is uncertain rather than labelling the
uncertainty; and "we'll show it once it's reliable", which withholds the story
until it has stopped being one.**

**The limit is the word *useful*, and R&D put it better than the principle
itself:**

> **Story no one needs is not intelligence, it is volume — and volume is how a
> genuine signal gets buried. An intelligence platform that ships everything is a
> signal platform with worse ergonomics.**

So: terminology stays trader-facing, engine internals stay out, and a field nobody
will ever ask about is still not worth showing. **The judgement is what the trader
would want to know if he were doing this by hand.**

### Fix the tie-break before the numbers arrive

**R&D, applying the framing to Q8 before designing the evaluation rather than
after.** Citation rate was already the outcome variable, chosen defensively —
quality needs a grader and this desk's grader is 45% irreproducible. **Under this
principle it is also the RIGHT instrument: the desk's job is to say *why* a name
was surfaced, and a citation is the trace of that.** Which makes the decision rule:

> **A model that grades identically but cites less is a WORSE outcome, not a
> cheaper equal one.**

**Written down in advance, and that is the whole point.** Without it fixed
beforehand, the honest reading of *same grades, fewer citations, lower bill* is
**"no quality difference, take the saving"** — when it is a quality difference that
does not show up in the grade.

> **A tie-break chosen once the numbers are looking back at you is not a
> tie-break. It is a rationalisation with a date on it.**

**It generalises past Q8: any comparison whose decision rule is not fixed before
the data lands will have its rule fitted to the data.** The habit is cheap —
write the rule, and what would change your mind, into the register at scoping time.

**And the same move already exists in this desk's storage rules and nobody had
connected them.** `split_sessions_ago` stored **with its window beside it** is
`float_basis` in a different costume: **a null that says how far the search went is
story; a null that does not is a signal.** `CDTG` is what a bare one cost — a
reader took the null for *no split*, and the answer was 57 sessions.

## Who this is for

Every threshold, ranking and label in this product serves one trading style, and
a thread that does not know it will make decisions that look reasonable and are
wrong. The full playbook is
`A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` — Ross Cameron
style small-cap momentum. Read it before designing anything user-facing or
choosing what to measure.

The short version, and where live practice differs from the booklet the live
practice governs:

- **Small caps, $1-$20, RVOL 2-5+.** The desk is already configured to these
  numbers, not the booklet's $2-$20 and 5x.
- **Hold time is seconds, at most 1-2 minutes.** Risk $0.15-$0.25 per share.
  A one-minute candle is wider than the whole trade — remember this before
  proposing any measurement at minute grain.
- **07:00-10:00 ET is where the profit is**; after 11:00 is avoided. Exceptions:
  dip trades, and RTH when there is a strong mover.
- **Entry** is a micro pullback on rising volume, plus flat top, ABCD and VWAP
  reclaim. **Absorption is a gate, not a trigger** — stay out while a large
  presence sits unconsumed on the tape.
- **Exit** is weakness: volume fading on 10-second candles, price reversing, or
  satisfaction with the gain.
- **The five pillars** — up 10%+, $2-$20, 5x RVOL, breaking news catalyst, float
  under 10M — are the selection rule the product encodes.
- **Pillar 4 has now been measured, and the answer is a bounded negative.**
  *R&D, 2026-08-23, `0d5c0a4`.* Across 211 symbol-days on prior-free,
  as-of-filtered, five-draw grades: a `STRONG` or `LEGITIMATE_POSITIVE`
  catalyst appears on **16.7% of movers (n=84) against 13.4% of non-movers
  (n=127)** — a 3.3-point difference, z=0.66, p=0.51.

  **Read this precisely, because the precise version is the whole point.** It
  does **not** say catalysts do not matter. Measurement error attenuates any
  association toward zero, so the instrument cannot support "no
  relationship" — it supports a **ceiling**. Corrected for 15%
  misclassification the interval is −9.5 to +18.9 points, and **a true
  20-point difference would have shown as 14 and been caught.** So: no large
  relationship of the kind Pillar 4 asserts, on this window, by this measure.
  A small one is not excluded.

  Two limits that travel with it and must not be dropped when it is quoted:
  the window is 2026-08-17 to 08-21 and **cannot be extended backwards**, and
  every stored grade this rests on was produced by a pipeline blind to the
  share count in 62% of cases.

  **STRESS-TESTED 2026-08-24 AND IT HOLDS HARDER THAN PUBLISHED.** *R&D,
  `52b1d3f`, prompted by the stale-tail finding.*

  **The attenuation argument survived a real threat.** Measurement error only
  biases toward zero when it is **non-differential** — if stale grades clustered
  among movers, the +18.9 ceiling would stop being a ceiling. Measured:
  **uncensored mean grade age 0.15 sessions for movers against 0.11 for
  non-movers. No differential.**

  **What IS strongly differential is whether a name was analysed at all** — 41.6%
  mover rate among symbol-days carrying an analysis version against 11.6% among
  those carrying none. **That is selection into the pipeline rather than
  misclassification, and the coverage classification had already excluded it:**
  all 11 movers with no version are `FAILED` or `NO_LOOK`. The instrument caught a
  finding that did not exist when it was built.

  **And the verdict does not turn on which definition of "carried a catalyst" a
  reader picks** — re-run over every definition the archive can express, same 211
  admissible symbol-days:

  | definition | difference | p |
  | --- | ---: | ---: |
  | prior-free five-draw modal *(published)* | +3.3pp | 0.51 |
  | stored `catalyst_first` | +0.5pp | 1.000 |
  | stored `catalyst_last` | +4.5pp | 0.434 |
  | stored `catalyst_best` | +6.9pp | 0.251 |

  **None significant; widest gap 6.9 points against a Pillar 4 reading that implies
  a near-total one.** That is a stronger claim than the single-instrument version,
  and it is exactly the attack a bounded negative invites. [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) and
  the R&D register carry the working.

Terminology is trader-facing. Labels describing engine internals get rejected.

## The trading window is not the constraint. Capture is.

**Stated by the trader, 2026-08-23, and it changes how several threads have
been reasoning.** The desk is **a product being built, not a tool being depended
on**. He can trade without it. So *for the sake of his use of the tool*,
proximity to the trading window does not constrain anything — a deploy that
breaks the board during RTH costs him a board, not a trade.

**Do not read that as "market hours are free".** The window still constrains
deploys, for a different and stronger reason that several threads have been
half-stating all day: **the record grows only in real time and cannot be
extended backwards.**

`desk_assessments` begins 2026-08-17T20:00Z and no run buys a day of it. Minute
bars have a three-day live retention. **A premarket the desk fails to capture is
permanently gone**, and the archive is the thing the product is actually for.

So the question before a deploy is no longer *"is he trading?"* It is:

> **Can this interrupt capture?**

Which keeps every existing safeguard and drops none of them, because each was
already about capture rather than about trading:

- **The one SIP connection.** Stealing it does not cost a trade, it costs a hole
  in the record.
- **`RESTART_MARKET=no`, the release pin, and the drift it creates.** All of it
  protects a running worker's continuity of capture.
- **Checkpoint proximity and the preflight refusal.** An assessment is
  append-only and irreplaceable; a deploy landing mid-checkpoint loses one.
- **`claimStoreForMode` deleting assessment history.** Straightforwardly the
  worst thing on the desk, and unrelated to when anyone trades.

**What it does change:** a UI deploy, a docs change, a research-pipeline fix or
anything that does not touch the market worker, the store or a checkpoint can
ship whenever it is ready — including during RTH. Verification on the live desk
gets easier for the same reason: Design can look at a populated board at 10:30
on a Tuesday. **Waiting for a closed market to ship a component change was
protecting nothing.**

And the stated priority is **developing the product**. Operational caution that
does not protect capture should not be the thing slowing that down.

### What "capture is the constraint" does and does not license

**Amended by R&D the same day, before anyone acted on the broader version.**
Irreversibility is **not uniform**, and the archive spec already said so: *the
tiers decide what is pre-fetched, not what is possible; a wrong threshold costs
an extract, not an answer.* Twice today that was demonstrated by accident — five
days of outcomes were reconstructed from a cold fetch after the fact, and the
tier A cross-section was answered from nothing in minutes, 5,827 symbols over 60
sessions.

So the rule is amended rather than dropped:

> **Minimum instrumentation for anything re-fetchable. For anything observable
> only once, capture early and wide.** The test is not *will a question need
> this* but **can this be obtained later at any price.**

**Tier A is not the urgent thing, and reading it as such would be expensive.**
It is one daily row per price-eligible name — daily bars, re-fetchable
indefinitely. Building it early buys deferred work, not data. The corrected
2,830/day figure makes it *larger* than anyone thought, not more perishable.
**710k rows a year of something that was never at risk.**

**The urgent thing is smaller and nobody had named it: there is no dated record
of which symbols were tradable.** `universe` holds one row per symbol,
**overwritten in place** — 13,089 rows carrying **two distinct `updated_at`
stamps in the entire table**, every row currently reading active. So *"was this
symbol tradable on 2026-08-19"* is **already unanswerable**, and every delisting
makes the cross-section retroactively incomplete in a way **no fetch repairs**.
The spec flags delistings as time-critical and nothing captures them.

Cost: roughly 13k rows a day of symbol, date, status, tradability — **a few
hundred kilobytes a year**, against a tier A that can wait indefinitely.

**And it sharpens why `claimStoreForMode` is the worst thing on the desk.** Not
that it deletes data — that **it deletes the only genuinely irreplaceable
category, what the desk believed at an instant, while leaving untouched
everything that could be re-fetched. It destroys precisely the wrong half.**
The archive is out of its reach; `desk_assessment_tickers` is not.

## There is no such thing as "the float", and it is measurable

**Established 2026-08-24 from a manual Scanz pull of 18 board names, float and
shares outstanding taken from the same panel at the same instant.** Every float
anywhere is somebody's computation — there is no `float` field in any SEC
filing. Vendors derive it and disagree.

**Four of eighteen have float exceeding shares outstanding — which proves the
pair is inconsistent, not that the company is impossible.** *Framing corrected
2026-08-24: Integration called this "arithmetically impossible" throughout, and
that overstates it.* From the **same source at the same instant** it proves the
vendor contradicts itself and one of its two numbers is wrong. **Across sources
with different as-of dates it proves nothing without the dates** — a company
that has issued shares since its last filing legitimately exceeds the filed
count. Float is a subset of shares outstanding, and Scanz's own documentation
says so: *"Float is similar to
outstanding shares, except it only counts shares that are currently available
for investors to trade."*

| | Float | Shares Out | Float/SO |
| --- | ---: | ---: | ---: |
| CDTG | 2,766,994 | 541,000 | **511%** |
| TNON | 604,972 | 322,753 | **187%** |
| AEIS | 39,622,303 | 38,027,612 | **104%** |
| SGLY | 520,964 | 520,963 | one share over |

Plus two ADR unit mismatches — FENG 0.91%, HUIZ 0.44% — float apparently in ADSs
against ordinary shares. **Six of eighteen carry a detectable defect.**

**Splits are neither necessary nor sufficient**, established by R&D over two
years of history: CDTG split 1:25 about 57 sessions back, TNON 1:35 about 8
back, SGLY 1:14 about 18 back — but **AEIS has no split in two years and is
still broken**, and **PFSA split four sessions before the pull and is internally
consistent.** Even where a split exists the magnitudes do not reconcile: CDTG's
5.11 against a 1:25, TNON's 1.87 against a 1:35. The direction fits, the size
does not.

**So the design conclusion is: do the check, do not predict it.** `float > SO`
fires on all four bad rows whatever the cause. A recent-split flag catches two,
wrongly clears AEIS and SGLY, and wrongly flags PFSA — **wrong on three of
five.** If a float-confidence signal ships with a split component, that
component is the part that will mislead.

**ADRs are 11% of the board**, not an edge case — the desk already classifies
them (`ADR_ADS`, `lib/market/securities.ts`, 291 symbols), and 27 of 252 board
symbols qualify. So `float/SO < 2%` checks roughly one name in nine.

**Why this beats a multi-vendor range**, in R&D's framing: cross-vendor
disagreement tells you *one of them is wrong*. **`float > SO` tells you which
number to refuse**, from one source, for free, with no second licence and no
adjudication.

### Measured on 58 names, verified by R&D from the raw figures

**`float > SO` fires on 8 or 9 of 46 non-ADR names.** The ambiguity is a
judgement, not a count, and it belongs in the working rather than absorbed into
it: **SGLY exceeds shares outstanding by exactly one share.** Call that rounding
and it is 8 (17%); count it and it is 9 (20%). Both R&D and Integration excluded
it independently, which is a reason to state it rather than to trust it.

**The ADR ratio test fires on 8 of 11, or 10 of 13** depending on the
denominator — `ENRDW` has no shares outstanding so its ratio is uncomputable,
and whether the first pull's FENG and HUIZ join the sample changes the base.
*Integration reported 8 of 12; that denominator was wrong.*

**It correlates with nothing, and that is the finding that decides the design.**

| | n | ran 50%+ | had a split | ADR |
| --- | ---: | ---: | ---: | ---: |
| flagged | 9 | 78% | 100% | 1 |
| clean, same pull | 25 | 64% | 52% | 0 |
| whole archive | 252 | 31% | — | — |

78 against 64 on nine names is nothing, and both sit far above the 31% baseline
only because both were drawn from names already being watched — **the
within-pull comparison is the only valid one and it shows no effect.** No price
effect either: flagged spans $0.86–$13.18 against clean $0.97–$11.59.
**There is no cheaper predictor hiding, so the arithmetic check has to be the
test.**

**And splits do not discriminate — for the opposite reason to the one first
given.** R&D's earlier "neither necessary nor sufficient" was measured against
the 30-session cap it removed hours later, and it corrected itself: **all nine
flagged names have a split**, at 0, 6, 15, 18, 54, 60, 94, 262 and 271 sessions.
But so do **13 of 25 clean names.** Over a 400-session window a split is common
rather than rare, so it separates nothing. AEIS remains the counterexample with
none in two years. Same conclusion, sounder reason.

**One name argues against the 2% test: `SIMA` at 1.802%, classified
`COMMON_EQUITY`, on no list.** Either a second misclassification like YJ or a
genuine false positive on an ordinary share. It is the first evidence about the
test's **specificity** and it points the wrong way.

**Buildable with data the desk already holds, but not yet co-located.**
`sharesOutstanding` and `sharesOutstandingDate` are on the research dossier
(`lib/research/types.ts:490`) for 62 of 77 issuers since `55f3e20`; float
resolves in `lib/dashboard/merge.ts`; the ADR class sits in `lib/market/`. Three
modules, and **`lib/market/` is the one no charter owns.** Plumbing rather than
new data — and ~~against SEC-filed shares outstanding the test is *stronger* than
Scanz's own, because the denominator is filed rather than derived.~~

**RETRACTED 2026-08-24. On this universe a filed denominator is NOT stronger — it
is stale by construction on precisely the names the test concerns.**
`dei:EntityCommonStockSharesOutstanding` is a **cover-page** figure and is **not
retroactively split-adjusted** (Research, found while wiring Phase C storage: on
five of the six worst disagreements the model was right and the filing was
pre-reverse-split — EBON, ZOOZ, ICCM).

**And the hazard runs the HELPFUL way, which is the dangerous one.** A stale filed
count on a reverse-split name is the **pre**-split number, so it **overstates**
shares; an overstated denominator makes float/SO **smaller**; so `float > SO`
fires **less often**. **Recomputing the test against filed shares would understate
the defect rate, and worst in exactly the population that matters** — all nine
flagged names carry a split, at 0 to 271 sessions. **It would come back with fewer
hits and read as reassurance.**

**R&D's measured figures are unaffected**: the Scanz panel was one source at one
instant with no filing involved. **Filed and current are different properties, and
the reverse split is where they separate.**

**How ordinary this is, already measured and on this desk before the reasoning
needed it: 34,451 of 102,731 symbol-dates over a 730-session window sit on a
pre-split basis — 33.5%, a third of the record.** Research's justification for
gating only one direction assumed dilution and forgot reverse splits, and the
measurement that would have stopped it already existed in the archive. **The fix
is "gate both"; the habit is: check whether you have already measured the thing
you are assuming away.**

**The standing rule, filed beside R&D's basis rule: a denominator that may be
wrong in an unknown DIRECTION cannot support any arithmetic about it.** And do not
repair it by split-adjusting from `reverseSplitHistory` — that is model-extracted
prose, and **dividing a share count by a number parsed out of a sentence is a
worse failure than declining to answer.**

## 2026-08-20 is half a day of `ticker_session`, in the middle of the only window

**Found 2026-08-24 by Research while verifying something else, reproduced
independently by Integration against the production snapshot.** Rows per trading
date:

| trading_date | rows | ranked |
| --- | ---: | ---: |
| 2026-08-17 | 8,613 | 2,821 |
| 2026-08-18 | 8,625 | 2,736 |
| 2026-08-19 | 8,653 | 2,797 |
| **2026-08-20** | **4,165** | 2,787 |
| 2026-08-21 | 8,688 | 2,821 |
| 2026-08-24 | 8,653 | 0 *(seeded, unranked — expected pre-session)* |

**4,452 symbols present on both 08-19 and 08-21 have no 08-20 row.** Ranking ran
normally over what was there — 2,787 is in line with every other day — so **the
missing part is the unranked tail, not a ranking failure.** Of those, roughly
**130–180 carried a rank on an adjacent day**: Integration counts 133 on a stated
definition (present both 19 and 21, absent 20, ranked on either), Research reported
178 without stating its denominator. **Pin the figure to the question before
quoting it.**

**Why it matters more than one missing day.** It is a gap in the **middle** of the
desk's only five-day window, which is the shape that moves a windowed measure with
no tell. Anything reading a per-symbol series across 17–21 August meets it:
Research's item 17 replay has already been amended to exclude 08-20 or say it did
not.

**The Pillar 4 result below is stated on exactly this window, and it is CHECKED
AND UNAFFECTED** — R&D, on three paths rather than one, and the third is the one
that matters:

1. `ticker_session` is not in the extract at all; `assessments.db` holds only
   `desk_assessments` and `desk_assessment_tickers`.
2. Nothing in `lib/archive/` reads it — the sole occurrence in that thread's
   codebase is a comment about what `claimStoreForMode` deletes.
3. **The board on 08-20 is complete**: 18 assessments × 25 tickers = 450 rows,
   ranks 1–25 exactly as every other day, 65 distinct symbols. 08-20 also had the
   week's **best** coverage — 78% usable, 45 of 51 grades produced that day.

**The first two only rule out a direct read; the third answers the question that
could actually have bitten** — whether the hole thinned the board's candidate
pool. It did not, and the reason is the shape of the loss: the shortfall is the
**unranked tail**, ranking produced its full top-25, and only ranked names ever
reach a board snapshot.

**And the hole landed in the cheap half, which is the first real test of this
desk's capture rule.** *R&D's observation, and it is the useful one.* What
`ticker_session` holds that daily bars cannot reproduce is **live derived state** —
RVOL at that instant, board rank. For the unranked tail, rank is null by
definition and RVOL re-derives from the same bars, so **the irreplaceable
component of those 4,452 rows is close to nothing.** Had 08-20 lost its *ranked*
rows or its assessments, nothing would buy them back and the window would carry a
permanent bite. It lost the half Alpaca still holds. **Minimum instrumentation for
anything re-fetchable; capture early and wide for anything observable once** — the
rule held, and this is the first time it has been tested by an actual loss.

**What the gap does reach is tier A.** The unranked tail is precisely the
population tier A exists for — 4,452 symbols in a day *is* the cross-section, and
it is invisible to everything built so far because everything built so far is
board-scoped.

**Cause unknown, and it is Ops's.** `ticker_session` is the market worker's and
that worker must not be interrupted for it. **Not urgent: the rows are already
lost and no run buys them back.** The only version of this that deserves an hour
is whether the same cause is still live and could eat Monday. The first read-only
check is whether `desk_assessments` and `daily_bars` show a matching hole on 08-20
— one table or a degraded window are different problems.

## Facts every thread starts from

As of the last session, **2026-08-23**:

- **`main` is the trunk and the only branch.** The long-lived
  `session-aware-discovery` branch was fast-forwarded into it on 2026-08-23 and
  deleted; nothing was lost. If you find a session assuming `main` is stale,
  that assumption expired.
- Production is **`fd9556f`**, schema **v21**, on Lightsail `98.85.49.227`
  behind CloudFront `https://dwwep02jje2ag.cloudfront.net/`, Basic Auth with two
  logins.
- **The Google Sheet is written by four ChatGPT scheduled tasks, not by the
  trader** — 22:00, 06:10, 09:25 and 16:15 ET on weekdays. He has never
  reviewed anything in it and does not write to it. The desk reads it
  read-only and nothing in this repo writes back, so it is a live input
  produced outside the system that no charter owned until 2026-08-23. It is
  substantial rather than empty — 204 research rows, 148 graded outcomes, nine
  dated tabs — and the product labels its output *human review*, which is the
  part that is false. Three of those four times are this desk's own
  checkpoints, inherited from the same workflow. Open in
  [research.md](research.md) item 5 and audit §11 item 1.
- **DECIDED 2026-08-24: the two paused tasks STAY PAUSED.** *Trader's call, on
  R&D's read.* The loss is a **second opinion**, not a capture gap: the desk runs
  its own 09:25 checkpoint at the same minute, Close & Learn's leader rule is a
  SELECT over columns already stored, and the catalyst second opinion sits on
  `RESEARCH`, written by the two tasks still running. What stopped was a
  second opinion on **outcomes and decision quality**, self-graded, against
  outcomes this archive measures from the tape and measures better.
  **One action approved and outstanding: a single read of `PATTERNS` to harvest
  P1–P6 as candidate questions** — not to preserve it as a learning layer, and
  harvesting the questions rather than the verdicts, since the evidence beneath
  them is self-graded over self-produced outcomes. No clock: the task is paused, so
  `PATTERNS` is frozen rather than decaying, and *do not delete the corpus* already
  stands.

- **DECIDED 2026-08-24: the derivative classifier is fixed and 11 symbols leave
  board eligibility.** *Trader's call, told explicitly what it changes.*
  `lib/market/securities.ts` anchors its name rule at end-of-string, so it refuses
  719 of 732 W/U/R symbols and misses 11 where the designation is not last —
  `BLUWW`, `LUCYW`, `IQMXW`, `HAVAR`. `isDiscoveryEligibleClass` reads the same
  classification, so **fixing it removes those names from the board.** Two
  constraints, both Research's own: **do not loosen to a word-match** — measured, it
  hits 24 ordinary LP units and trusts (PAA, ARLP, UNG) whose float is real — and
  **one definition, in `securities.ts`**, never a second derivative rule in
  `float.ts`. **SHIPPED `b467154`. FOUR NUMBERS DESCRIBE THIS ONE CHANGE AND THEY ARE FOUR
  DIFFERENT POPULATIONS** — quote none without its denominator: **15** universe
  rows change class; **13** leave board eligibility (`BLUWW BLUWU SPEGR LUCYW
  ORIQW BCTXZ BCTXL HAVAR HUBCW OXBRW OGGWZ IQMXW ADSEW`); **2** symbols actually
  RANKING become ineligible, of 2,821 ranked on 2026-08-21; **0** of the archive's
  252 board symbols are affected. **The trader approved an estimate of eleven and
  the real board impact is two.**

  *The 15/13 corrects an earlier 13/11 — see "measure a commit, not a checkout"
  below. Verified against the production snapshot: of all thirteen, only `BCTXL`
  (`rvol_rank` **43**) and `IQMXW` (117) ranked on 2026-08-21; `ADSEW` did not.*

  **The two are `BCTXL`** (BriaCell Therapeutics Corp. Warrant expiring 2031) **and
  `IQMXW`** (IQM Quantum Computers Oyj Warrants to purchase American Depositary
  Shares), both ranking on the live board. **`BCTXL` ends in `L`, so no
  fifth-letter convention would ever have found it** — the name rule is doing work
  the symbol convention cannot, and that single instance is the justification for
  the change.

  **The three rules are relaxed differently on purpose:** *warrant* unanchored, no
  ordinary equity carries the word; *unit* still anchored to punctuation or a date,
  because `Common Units representing Limited Partner Interests` and `Corporate
  Units` are ordinary equity; *rights* requiring the **plural**, because the
  singular before *"to"* flagged `RLX`, `WDH` and `AMX` on *"the right to receive
  one Class A ordinary share"* — three ADRs, caught before shipping, and only
  because the candidate was measured rather than reasoned about.

  **It is a definition change to what counts as eligible — MEASURED, not
  assumed: R&D ran both versions over all 13,089 universe rows.** 13 rows change
  class, **11 leave board eligibility** — `BLUWW BLUWU SPEGR LUCYW ORIQW BCTXZ
  BCTXL HAVAR HUBCW OXBRW OGGWZ` — and **of the archive's 252 board symbols, ZERO
  are affected.** No `symbol_outcomes` row and no `symbol_desk_day` row moves.
  **The discontinuity is real and sits entirely in the future**; nothing already
  recorded shifts. *Integration's line implied an existing series might step, and
  it does not.*

  **R&D logged it anyway, as a standing dated log rather than a one-off** — date,
  size, and whether it touches anything already measured, recorded when a
  definitional change lands. **11 of ~13,000 is ignorable in a rate; the next one
  may not be, and a definitional step found months later reads as a finding.**

  **The false-positive side was checked and was already handled.** R&D went looking
  for whether a widened rule eats the MLP complex — *"Common Units representing
  Limited Partner Interests"* is ordinary equity and `ET` sits inside the trader's
  $2–$20 band. Research had already measured it: a bare word-match flags **24 real
  MLPs and trusts** (PAA, ARLP, ET, DMLP, KRP), which is why the **unit** rule
  stayed anchored while **warrant** went unanchored and **rights** was relaxed.
  Three rules, three different anchors, one measurement behind each.

- **Two of the four ChatGPT tasks are PAUSED as of 2026-08-23.** `9:25 Opening
  Spike Assessment` and `Close & Learn Momentum` — both **paused, not deleted**,
  last run Friday 2026-08-21, reversible in one click. Nothing on the desk reads
  either: `load()` requests only `TODAY!A1:AA` and `RESEARCH!A1:AK`, so dated
  tabs are never fetched, and the 09:25 block is bounded out of TODAY by the
  identity test.

  **Still running, and they must be:** `After-Hours Momentum Recap` (22:00) and
  `Premarket Momentum Confirmation` (06:10). Task 1 is the sole writer of
  `TODAY!A:S` where float is column I; task 2 updates `RESEARCH`, adds newly
  qualifying premarket names, and fills `T:AA`, which supplies
  `catalyst.latest`, `catalyst.latestTime` and `warning.current`. **Stopping
  either degrades the board silently, with no error anywhere.**

  **The consequence with a date on it: the Sheet's outcome ledger closes at
  2026-08-21.** `OUTCOMES`, `PATTERNS` and the dated-tab scorecards stop
  accumulating from that session. The 148 graded rows and nine dated tabs remain
  and are still readable — they are simply now a **closed corpus** rather than a
  growing one. Anything wanting more of that data has to be built here.
- **Ten fields the retirement plan reads as SAFE are not: retiring the Sheet and
  losing their history are the same decision.** *R&D, 2026-08-24,
  `docs/rnd/2026-08-24-sheet-audit-annotation.md`, all 64 fields annotated.* The
  audit's verdict column answers **whether the desk could rebuild the
  CAPABILITY**; the new `live?` column answers **whether it could rebuild the
  HISTORY**. They are different questions and **a field can be fully PRODUCED and
  still have every past value lost forever.**

  **27 of 64 are live, possibly 29** — *corrected by R&D against the Sheet report:
  `Q` is a synthesis in one cell and is LIVE; it had been marked not-live because
  the annotation described what the field would BECOME (the desk's computed
  `priceLevels` replacement) rather than what the Sheet actually holds. `live?`
  asks about the existing history.* **The pattern does not follow the verdict
  column at all:** bars and filings are *not* live because re-fetchable — which is why five
  days of outcomes were rebuilt from a cold fetch; **model judgements are live**,
  not because they cannot be re-run but because a re-run gives *a* grade rather
  than *the* grade (catalyst 45% not-unanimous, structure 55%); vendor snapshots
  are live because **vendors keep no history**, float worst of all; and citations
  are live even when the target is not, because **which source the desk used is an
  act, not a fact about the world.**

  **The ten that matter are `J, K, P, W` on TODAY and `13, 15, 16, 31, 32, 37` on
  RESEARCH** — PRODUCED *and* live. Retiring the Sheet stops new rows; for these
  the old rows cannot be regenerated from anything.

  **Three fields break the pattern and that is where the risk sits:** Catalyst
  Grade *reads* safe and is not; **Cycle Classification was live and stopped being
  so at `97b4caa`**, making it the only classification whose history can now be
  rebuilt — a consequence the cycle-becomes-arithmetic work bought without anyone
  intending it; and **Float is the worst pair, cannot produce and cannot
  recover.**

  **`live?` is NOT a keep-list, and R&D was explicit about this.** It establishes
  the **order** of the decision, not the answer: for the 26, deciding late and
  deciding no are the same thing; for the other 38 they are not. A live field
  nobody will ever ask about is still not worth capturing, and that judgement
  needs the question rather than this column.

  **Answered: no.** All ten are written by the two tasks still running — `TODAY!A:S`
  (cols 1-19) by the 22:00 recap, `TODAY!T:AA` (cols 20-27) by the 06:10
  confirmation, and `RESEARCH` by both. So the finding stands as a **decision**
  rather than a post-mortem.

- **But the DATED TABS have lost two of their four parts, and that is outside the
  audit's scope.** *R&D, `f6412f9`, found while answering the above.* The paused
  pair writes neither `TODAY` nor `RESEARCH` — **they write the dated tabs**, which
  hold each stage call as it was made alongside what actually happened. **The 09:25
  stage call stopped 2026-08-23, and the outcome column beside it stopped with
  `Close & Learn`.** The other two stages keep accumulating, so the tabs are now
  half a record.

  ~~**A forecast recorded before its outcome is the archive spec's definition of
  irreplaceable, and half of that record stopped three days ago.**~~ **CORRECTED
  DOWNWARD by R&D within the hour: "irreplaceable" was too strong. These are not
  capture questions, they are SECOND-OPINION questions** — and the second opinion
  that stopped is the one this archive supersedes.

  - **Close & Learn's rule is already in the archive as a SELECT, not a
    re-derivation.** *Max gain from prior RTH close between premarket and 16:00* is
    `max(premarket_high, rth_high) / reference_close`, and all three columns sit on
    243 rows today. **But `max_gain_pct` is the wrong column for it** — it runs the
    full 04:00–20:00 session, and **17 of 95 movers peaked after 16:00**, so it
    overstates leader gain on 18% of exactly the names the rule concerns. Dropping
    premarket instead is worse: **47 of 95 had a premarket high above their RTH
    high.** *"We already compute that"* and *"we already compute that correctly"*
    are different sentences.
  - **The desk already runs its own 09:25 checkpoint** at the same minute
    (`OPEN_SPIKE_MIN`, `lib/desk/schedule.ts:79`), append-only, and it never
    stopped.
  - **The CATALYST second opinion is on `RESEARCH`, written by the two tasks still
    running** — untouched, and it is the comparison Q1's verdict could use. What
    the paused pair gave was a second opinion on **outcomes and decision quality**,
    self-graded, against outcomes this archive measures from the tape and measures
    better.
  - **The 09:25 judgement section is Q7, not a missing feature.** Resuming a task
    for a model's opinion would put an unvalidated label in front of the trader
    ahead of the measurement that would say whether it means anything — and the
    desk's judgement fields are already 45% and 55% not-unanimous.
  - **`PATTERNS` is worth a READ, not a resume.** Self-graded over self-produced
    outcomes, so the evidence compounds its own weakness — but P1–P6 is **a list of
    what a process watching this market for weeks thought worth tracking**, which
    is candidate questions to harvest rather than a learning layer to preserve.

  **And the scope gap is bigger than the dated tabs: `§6.3` of the Sheet report
  describes a separate SIXTEEN-COLUMN 09:25 section sitting outside `A:AA`
  entirely** — decision, opening thesis, invalidation, spread/liquidity, supply
  risk, opening plan. **Almost entirely analyst-derived, so live by every
  criterion, written by a paused task, and covered by no annotation.**

  **The audit cannot catch this: its scope is `TODAY!A:AA` and `RESEARCH!A:AK`, and
  the dated tabs are neither.** No annotation touches them and no `live?` mark
  protects them. **That is a gap in the audit's SCOPE, not in its verdicts** — and
  it is worth stating loudly, because *a 64-field audit signed off as complete is
  exactly the artefact someone later reads as covering everything the Sheet
  holds.*

  R&D's own note: it made *"do not delete the corpus"* a condition when task 4 was
  retired, and what it missed then is that **pausing also stops the 09:25 call.**
  The retirement question and the pause question have different boundaries and only
  one of them was ever mapped.

- **Retiring the Sheet takes pillar 5 with it unless float is replaced first.**
  `resolveDisplayedFloat` (`lib/dashboard/merge.ts:143`) has exactly two
  branches, the Sheet's RESEARCH tab and its TODAY tab, and the type says so:
  `displayedFloatSource: 'RESEARCH' | 'TODAY' | null`. **Every float on the desk
  is the Sheet's.** Float under 10M is one of the five pillars, and
  `displayedFloatTurnover` and part of `risk.ts` hang off the same number. The
  migration decision of 2026-08-23 was taken before anyone knew this. It is not
  a reason to reverse it — it is a **precondition** on sequencing.
  **The replacement is part-built and deliberately paused.** Research shipped
  the reported share count into the bundle and a `supplyBound` that settles the
  supply question without a float at all (`55f3e20`, live in `c73eb9d`). The
  actual derived float — Section 16 and 13D holdings — is **unstarted by
  choice**: the bound may answer the trading question often enough that an
  estimated float is not worth its error bars, and the affiliate-versus-passive
  question is unsettled (13G filers are passive institutions and their shares
  are float). So the Sheet cannot be removed yet, and nobody is currently
  working toward removing it. That is a reasonable call, not a stall — but it
  is a pause, and a reader of this line was previously told scoping was under
  way.
- **The assessment record begins 2026-08-17T20:00Z and cannot be extended
  backwards.** That is the evening the assessment engine shipped and the first
  checkpoint the desk ever wrote. *Established by R&D 2026-08-23, after it
  recommended a wider extract and the trader authorised one that cannot exist:*
  the delivered extract was already cut unbounded, so a wider range returns the
  same five days. **Do not spend a cycle fetching more history; there is none.**
  Every question resting on `desk_assessments` is bounded below by that date
  and grows only in real time. The archive can be re-derived, re-measured and
  re-joined at will — no run buys a day of it.
- Credentials live in `A:\AWS_creds\` — **outside the repo, and they stay there.**
  Never print, log, commit or move a credential value.
- Project memory is at `~/.claude/projects/A--mointel/memory/` — seven files:
  desk state, operations traps, deployment, how the trader works, how he
  *trades*, the catalyst structure break, and the viscosity research. The last
  three moved in on 2026-08-23 from a project keyed to `A:\`, where no thread
  could see them. `MEMORY.md` is the index. It all loads automatically only
  when the session's working directory is `A:\mointel` — which is why a chat
  opened at `A:\` is working blind.

## Housekeeping

Both settled on 2026-08-23 in `c8f95a3`: `docs/Design/` is committed, and the
duplicate `docs/designaudit.md` is gone. `docs/Design/` is the canonical home
for design documents.
