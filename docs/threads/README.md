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
  share count in 62% of cases. [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) and
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
new data — and against SEC-filed shares outstanding the test is *stronger* than
Scanz's own, because the denominator is filed rather than derived.

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
