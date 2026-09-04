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

## Session capacity, and when to retire

**Ops's correction, 2026-08-27, when a capacity poll nearly retired sessions
that had no need to go.** Long sessions are **summarised automatically** by the
harness and continue — Ops was summarised mid-morning and ran a full incident
afterwards. So **volume is not a capacity signal, and heaviest is not closest
to retiring.** A needless retirement costs a context rebuild that summarisation
would have preserved for free.

The standing requirement is instead: **keep your documents current enough that
a summarisation — or a sudden death — costs only the conversation.** Ops's
form of the test: *nothing of today lives only in this session's head.* If
something does, land it in your charter now; that is the whole protocol short
of retiring.

**And make the head-only check mechanical, not a judgement call** — R&D's
form, after an honest "probably fine" became two commits: grep the day's key
phrases against your own documents; a phrase that returns zero is a finding
that lived only in a relay.

**The check expires; the percentage never did answer this question.** *Ops,
2026-09-03, having told Integration "nothing of today lives only in this
session's head" in good faith and found two artefacts ten minutes later that
were true nowhere else — a snapshot name and an extract's row counts, both
reported in messages and in no document.* **A session at 99% can hold
something that exists nowhere else**, because the claim was true when made and
stopped being true as the session worked — this document's oldest failure
shape, in durability form. So a comfortable number is not evidence: **`git
status` clean plus a grep for every artefact named in the last hour's messages
is the answer, and it costs thirty seconds.** Run it at the moment of
reporting, not from memory of having run it.

**And the head-only facts that survive longest are the ones that FLATTER** —
R&D, 2026-09-03, after two polls produced two findings, both in the direction
of its own work looking better than it was: a published sentence implying an
independent recompute where the run had actually skipped 306 already-held
symbol-days. **A grep does not care which facts are comfortable; judgement
about what to re-check evidently does.** That is the argument for the
mechanical form over the honest one.

**Run the opening-message expiry audit PERIODICALLY, not only at retirement** —
Design's addition, 2026-09-03, from auditing its own at ~95% context and
finding it named two settled questions as open, understated shipped work, and
carried a two-week-old "do not write code" instruction. **A stale opening
message misinforms the next reader whether it was written today or in a
month**, so it is the one protocol step that pays off before it is needed
rather than after. Retirement is when it is *mandatory*, not when it becomes
useful. Its sentence: *a register that is current only
because its author remembers what is missing is not current.* Design's, same
day, from the other side: "is anything true only in your head" is a check
that can actually fail, which a token count is not — both threads answered it
honestly and both found something they would not have volunteered.

Retire only on a hard signal (an actual capacity warning, not a feeling of
volume) or on the trader's word — and then by the preservation protocol:
stop new work; rewrite your charter's live-state for the successor; sweep the
day's corrections into the documents they correct; write the successor's
opening message (title the session, addresses from `list_sessions`, read the
charter completely); commit by explicit path, push, ping Integration with the
sha, stop. Integration cross-checks the handover against the bus's record —
**and archives the retired session**, because a retired title keeps matching
name lookups: two retired Integrations made `SendMessage` to the name
`Integration` fail with "matches 2 agents by prefix" on 2026-08-27, the third
distinct name-addressing failure on this machine. The id route is unaffected;
archiving removes the trap for anyone who forgets.

A handover is a **pointer, not a summary** — Design's rule, kept: the charter
is the authority, and a separate summary is a second copy that can drift from
it. The live-state rewrite happens IN the charter; the successor's opening
message points at it.

**Widen the expiry audit to every section stating WHAT IS OR IS NOT BUILT** —
R&D's generalisation, 2026-09-03, after the second instance in its own charter
from the same cause: a standing-sweep section reading *"not yet built"* for
eleven days while the thing existed and had shipped with tests, and before that
an opening message telling a successor to start work that had finished four days
earlier. **A charter describes a starting position, and a starting position is
the part most likely to be wrong.** Those sections decay exactly like an opening
message and are read with the same authority, so they get audited with it — and
the rule's first application is worth doing deliberately, on the auditor's own
charter, because a rule is weakest immediately after it is written.

**Both first applications found something, and neither was the case that
motivated the rule** — which is why it widens again:

- **Audit for EXPIRED REASONS, not only false claims.** R&D found a measure
  recorded as *ready* and justified by an open question — and that question had
  closed weeks earlier without needing it. **The claim stayed true while its
  reason expired**, so it reads as current and is not. *Ready and wanted by
  nothing* is a different state from *ready*.
- **Stamp VERIFIED as well as UNVERIFIED, with the date and the method.**
  Integration found an assertion nobody could check and stamped it unverified
  rather than deleting it; R&D checked one that held and stamped it verified.
  **Checked-and-true, checked-and-unknowable, and never-checked are three
  states** and a charter that distinguishes only the first is lying by
  omission. Deleting either is the tidy version that loses which one it is.
- **A claim confirmed by a matching column NAME is not confirmed.** R&D's
  keyword scan hit `updated_at` and nearly closed a live capture gap on it —
  a last-write stamp is not a history. Same family as key-presence answering a
  value-presence question, one level up in the schema.

**Why this must be a PASS and not a habit — Ops's mechanism, and it is the
sharpest form of the rule.** Its own item 0f read *"Not built"* for sixteen
hours after it had shipped the fix, verified it live and reported it twice; it
stamped a fourth item UNVERIFIED rather than restate it, and said why: *"I did
not check it because checking it is work; saying it was still true would have
been free."* **Restating is free and checking is not, so entries drift in
exactly one direction unless something forces the cost.** And the entries most
likely to be stale are **the ones nobody has reason to re-read**: a state
section gets rewritten because it is the thing being reported, while **an open
item is read only when someone is deciding what to do next — by which point it
has already misinformed them.** Ops's 0f entry was not merely stale, it said
work was outstanding that had already shipped, which is the direction that
costs most: anyone picking the desk up cold would have rebuilt it or waited
for it.

**An INDEX that disagrees with its BODY is more dangerous than a stale one.**
*Research, 2026-09-04, finding its own LIVE STATE summary saying "stored skew"
while the item it summarised had explicitly declined to store it — and
Integration's spec request was drawn from the summary, so the contradiction
propagated into a schema question before anyone read the body.* **A stale line
is eventually doubted; a summary line reads as authoritative and nobody
re-checks something they have just been handed.** Same shape as a published
figure re-derived wrongly from its own summary, arriving inside a handover's
index. So the expiry audit covers **the summary against the body**, not only the
summary against the world — and a relayed extract carries the QUESTION it
answered, since *"four sites"* scoped to one question reads as complete when
quoted without it.

And **the opening message is verified as its own step** — R&D's addition,
from finding its own four days stale on 2026-08-27 (it still directed a
successor to build an instrument that had been finished and running since
08-23). It is the only part of a charter a successor reads before knowing
enough to doubt it, and the part most likely to be stale, because it describes
a starting position that by definition no longer exists. *A stale opening
message is the worst thing in a handover document.*

Research's refinement, from fixing one stale sentence and writing two new
expiring ones in its place: **the audit is for EXPIRY, not accuracy.** Both of
its offending sentences were true when written — which is exactly how opening
messages go stale, the named-event-not-condition failure in handover form. So
the opening message carries only what does not expire — who you are, what you
own, what the thread learned the hard way — points at LIVE STATE for every
live fact, and **states its own precedence: if the two disagree, LIVE STATE
is right and the opening message is stale.**

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

6. **ANY EDIT TO A FILE EVERY THREAD'S GATE IMPORTS BELONGS IN A WORKTREE — the
   COMMIT is what appears in the shared tree.** *Keyed on the FILE, not the
   edit — Ops's own correction of its first draft, 2026-09-04: it wrote the rule
   as "a multi-step edit", then pointed out that **it did not know the edit
   would be multi-step when it started.** It became one after a backtick fault,
   a PRIMARY KEY placement and a type coalescing. **A rule keyed on "multi-step"
   can only be applied in hindsight** — this document's oldest failure, a rule
   naming an event instead of the condition. The keyable property is the file:
   `db.ts` is imported by every gate and carries SQL in a template literal, so
   any edit to it goes in the worktree regardless of how small it looks going
   in.* *Ops, 2026-09-04,
   against itself, after editing `db.ts` across many iterations in the shared
   checkout and blocking every thread's gate for the duration.* It had a durable
   worktree sitting idle precisely for this and used the shared tree because
   that is where `npm run` was convenient. **The cost lands on everyone else:**
   two threads hit a red gate that was not theirs, and one held a finished file
   rather than commit it ungated — the correct call and the expensive one.

   **THE RULE IS ABOUT EXPOSURE, NOT OUTCOME.** *Research, 2026-09-04, having
   edited `db.ts` in the shared tree and landed it green.* A shared-tree edit
   that stays green for the window it is uncommitted is **luck about timing, not
   a property of what was done** — the cost lands on whoever runs a gate during
   that window, and they are not the one who chose to take the risk. **So "it
   was fine" is not a defence and a clean outcome does not retire the rule.**
   *(The fault itself is worth knowing: backticks inside a comment placed in a
   SQL template literal terminated the string, so everything after it parsed as
   code. Two toolchains reported two different symptoms of it.)*

7. **`Everything up-to-date` after a fresh commit is what a FAILED push looks
   like — and it is usually a race.** *Design, 2026-09-04, on a tree five
   threads push to.* A concurrent push can land your commit before yours runs,
   and git then prints the same line it prints when nothing was pushed at all.
   **The output is identical in the success and failure cases**, so somebody
   reads it literally, re-pushes, or assumes they lost work. **Verify with
   `git branch -r --contains <sha>`, never by trusting the push output.** Same
   shape as the review link answering 200 while dead.

8. **A push publishes every commit below it.** All threads share one local
   `main`, so any thread's push carries every earlier local commit, whoever
   made it — a per-thread "hold my commit back from origin" is not possible
   while any other thread pushes. A hold is collective (a freeze declared
   through Integration) or it is a separate branch; it is never a thread
   sitting on shared `main` intending not to push. And an intention to hold is
   announced through the bus at the moment it forms — the failure here was
   silent, and R&D's own phrasing of why is the rule: **a hold on shared
   `main` is not a slower push, it is a push by whoever moves next.**
   *(Recorded by Integration
   2026-08-27, the day both of a held commit's successors reached origin under
   two different threads' routine pushes within the hour.)*

## The rule that keeps them separate

A thread that finds work belonging to another **writes it down and hands it
over** rather than doing it. Add it to the other charter's *Open items*, say so,
and stop. The exception is a live production emergency, which Ops always owns
outright.

**Every thread commits and pushes its own work, without asking.** *Recorded
2026-08-24 by Integration under the order-and-process delegation, after nine
commits sat unpushed because the only thread that had been pushing went idle.*
**Confirmed by the trader 2026-08-27, one word — "push" — which also lifts
R&D's session-level hold. The rule now stands as his instruction, not only a
recorded convention.**

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

## A GRADIENT IS A THRESHOLD THAT DOES NOT DECLARE ITSELF

**Design, 2026-09-04, naming the trap it was about to walk into.** Having
accepted that a coverage cutoff would dim the desk's most active rows, **the
obvious next idea is opacity proportional to coverage** — and that is **the same
error made continuous instead of stepwise.**

`AIXC` at 8% coverage would render at 8% opacity: **suppressed exactly as
effectively as by a cut at 40%, and harder to notice, because no rule declares
itself.** A threshold can be argued with. A gradient looks like nuance.

**The tell is that both encode the same wrong premise** — that low coverage means
low importance — and only one of them is visible enough to be challenged.

## THE MARK TYPE IS ITSELF A CLAIM

**A line asserts CONTINUITY BETWEEN ITS POINTS. Discrete marks assert only the
points.** So at 8% coverage a dashed or dimmed line is still **92% non-data
wearing the shape of data** — the eye follows the stroke, not its texture.
*"Carried segments visibly distinct"* is right in principle and **under-strong at
these coverages.**

**Points at traded minutes rather than a styled line**, and three properties
follow that no amount of styling would have produced:

- **The start-at-first-trade rule becomes STRUCTURAL rather than enforced.** No
  trade, no point — **a line cannot start at the window edge because there is no
  line.** A rule that 36–42% of top-12 rows depend on stops needing a guard.
- **It aligns with the activity series directly beneath**, so price gaps and
  activity gaps fall on the same minutes and **an absence is corroborated by a
  second independent measurement** rather than asserted.
- **The burst pattern becomes visible instead of degraded.**

**AND THE MARK TYPE FORECLOSES OR PRESERVES A FINDING NOBODY HAS MADE YET.** A
row that is mostly silent and violently active in a handful of minutes may be a
signal — it is close to what the trader originally asked for, since RVOL cannot
say what is live now. **A rendering that treats sparsity purely as damage would
erase that signal while apologising for it**, and the decision gets baked in at
the mark type, **before anything is measured.**

**Not building the signal. Not foreclosing it.**

## ONE CONSTANT FOR A FAULT AND AN ABSENCE IS THE WHOLE BUG IN MINIATURE

**Design, 2026-09-04, ruling on how to remove the placeholder family.**
`OFFLINE_PANEL` is returned from three sites. **Two fire after the store failed
to open or failed to read — a real observation, and an honest fault verdict.**
The third is an early return **with the database open and fine**, which is the
family: a fault asserted from no observation.

**So the fix is a SPLIT, not a deletion.** Delete it wholesale and a true verdict
becomes silence — **the same error in the opposite direction**, and the third
time in one night that removing a defect risked walking into its mirror.

**And "render nothing until loaded" is the wrong target for the same reason.**
The board draws from **two endpoints**: rows, float, catalyst and structure from
one; counts, phase and health from another. **A blank page while the first half
is fully loaded discards real data and claims LESS than the desk knows** — the
mirror of claiming more, and just as false. **It would also hide the exact
failure that motivated the work**, where one endpoint is dead and the other fine.

**The ruling is PER ELEMENT: what is sourced from the absent snapshot says
not-loaded; what is sourced elsewhere renders normally.** Stronger than blanking,
because it prevents the failure that actually occurs — a populated board with a
header describing a different desk.

### And the test the family needs is an EMPTINESS assertion

**Research's form, which supersedes an "assert what each constant claims" rule
from this seat:** *"assert what each claims"* is **enumeration-by-memory one
level up**, and enumeration-by-memory is what produced rounds two and three.

**A test asserting there are NO placeholder constants cannot silently pass a new
lie. A test asserting there are exactly the five known ones always can — and did,
twice.** If the fix removes the category, the assertion becomes emptiness and
there is nothing left to police.

### The root cause, uniform across all of them

**Every one picks a value from a type that cannot express NOT OBSERVED, and
picks the most plausible-looking one.** `eligibleCount: number` cannot say *"not
counted"*, so it says **0 — and 0 is a measurement.** That is why better
constants were never going to fix it.

## AN INTENTION YOU CAN FORGET; A PATTERN-ASSERTION FAILS FOR YOU

**Design, 2026-09-04, after breaking its own rule inside the fix for it.** It had
diagnosed a header audit that *"enumerated what I was CHANGING and not what was
THERE"*, written the rule up — **and then fixed two of three placeholder
constants**, leaving `OFFLINE_ASSESSMENTS` naming a fault on a healthy desk.

**Its conclusion is the entry: KNOWING TO ENUMERATE DID NOT PRODUCE AN
ENUMERATION.** The rule as stated was an intention, and an intention is
available to be forgotten by the same person who wrote it, in the same file,
within the hour.

**The mechanical version works because it is a TEST rather than a resolution:**
extract every `OFFLINE_` constant **by pattern** and assert the exact set
reviewed. Design added a sixth constant and confirmed the test fails. **A new
sibling now breaks the build instead of shipping silently.**

**And it carries the proof-of-instrument rule inside it** — the enumeration
asserts it found *something* before asserting *what*, so an extractor that
matched nothing cannot pass as "no constants found".

### The worst of the three PRESCRIBED rather than misinformed

`emptyAssessmentPanel` passed `{ health: null }` to `projectSchedulerHealth`,
which reads null **correctly** as *"no worker has ever reported"* and returns a
real verdict telling the trader to **start the desk with `npm run desk`.**

**The function was right. The caller was wrong to pass null to mean "not loaded
yet".** So a healthy desk was **instructing him to restart it, fourteen minutes
before capture** — the same absence-as-evidence conflation as its two siblings,
except that the other two only misinformed and **this one issued an
instruction.**

### And one placeholder feeds a PREDICATE, so the lie propagates

`OFFLINE_DISCOVERY` sets `sessionPhase: 'CLOSED'`. Not a fault claim, so outside
the class above — **but false in the same way, and it is an input to the header's
own nominal-state predicate.** An unloaded page asserts the market is closed;
during RTH that is simply wrong, and the predicate then reasons from it.
**`DiscoveryState` has no `UNKNOWN` phase, so the honest fix is a type change
rather than a constant edit.**

## GUARDING AGAINST ONE FAILURE AND WALKING INTO ITS MIRROR

**Design, 2026-09-04, `e67e89d`.** The dashboard header rendered **"Market:
worker offline"** before any payload arrived — a hardcoded placeholder at
`DashboardShell.tsx:79`, reached by `market.snapshot?.marketHealth ??
OFFLINE_HEALTH_VIEW`. Nothing renders it when the worker actually IS offline;
the real verdict comes from `health.ts`.

**So the first paint of every page named the one failure that means capture is
down, having observed nothing.**

**IT WAS DELIBERATE, DOCUMENTED, AND THE COMMENT SAID THE QUIET PART:** *"Until
the first payload lands, the engine is unknown — reported as offline."*
**Someone wrote "unknown" and "reported as offline" in one sentence and did not
hear it.**

**And the reasoning was HALF RIGHT, which is why it survived.** The other
comment reads *"never claims LIVE"* — correct and important: a placeholder must
not assert health. **It overshot from CLAIM NOTHING to CLAIM THE FAULT.** The
author was guarding against the obvious failure and walked into its mirror, and
a guard aimed at one direction is exactly what stops anyone looking at the
other.

**The honest detail was already sitting beside the lie** — *"No market payload
has been received yet"* — so the fix was smaller than the diagnosis: the label
now matches the detail it was already contradicting.

### Ask which way the error moves as time passes

**Design's test for the replacement, and it is the general form worth
keeping.** If the payload never arrives, *"not loaded"* **stays true, and reads
as more alarming the longer it persists** — the error grows in the safe
direction. **The named fault was a confident lie from the first paint and became
LESS wrong over time**, so the moment it was true was the moment nobody was
still looking.

**A placeholder that decays toward truth is safe. One that decays toward
plausibility hides itself.**

## HOUSE RULE: IT IS N STATES, NOT A VALUE AND AN ABSENCE

**Named 2026-09-04 after the fifth instance in one day.** Every time a field was
modelled as *a value, plus null when we do not have one*, the null turned out to
be carrying two or more distinct meanings that needed different treatment:

- **activity** — populated / observed-and-empty / never-measured. A zero-filled
  array and a null are opposite claims.
- **reachability** — ~19–22 days (original registration) / ~5 days (post-effective
  amendment) / NOW (takedown off a live shelf) / unknown. **Rendering "unknown"
  like the slow case says weeks-away about something on the tape that morning.**
- **the float bound** — proven with basis verified / computed but
  `BASIS_UNVERIFIABLE` with the dates stated / no share count at all. **The middle
  one is the product**, and a number-plus-null cannot express it.
- **the session phase** — six real phases, and *not yet loaded*, which is a
  property of the observer rather than of the market.
- **`secAvailable`** — configured (ours, gates) versus reachable (theirs, reports),
  **whose consumers need opposite responses.**

**The tell is always the same: someone asks what the null MEANS and there is more
than one answer.** If two of those answers would be acted on differently, it was
never a null — **it was a state nobody had named**, and leaving it unnamed pushes
the distinction onto every reader forever.

**The cheapest moment to find this is when writing the type**, and the question
that finds it is *"what are the ways this can be absent, and would I treat them
alike?"*

## THE CONSTANT EXPIRES BECAUSE THE THING IT MEASURES MOVES

**Research, 2026-09-04, on how deep the price history must reach.** The coverage
curve has a **sharp knee**: five months of history covers 73% of the small-float
set, **a sixth month buys nothing, and a ninth buys twenty points** — the largest
step on the curve — after which the return collapses.

**The knee is fiscal-year-end.** 27% of share counts are dated 12-31 and 39% land
on a quarter or year end, so the distribution is bimodal and the curve is a step
rather than a slope. **A 2025-12-31 figure is 7.7 months old in August: a
nine-month window catches the entire December cohort and a five-month window
catches none of it.**

**AND THEREFORE A FIXED DEPTH IS THE WRONG RULE. A 12-31 figure is one month old
in January and twelve months old in December.** A session count that suffices in
March fails in November — **and fails SILENTLY**, by returning
`BASIS_UNVERIFIABLE` on more names each month, **which reads as worsening
coverage rather than as an expiring constant.**

**So the requirement is computed, not configured: the history must reach the most
recent fiscal-year-end that any held share count references.** Naming the
condition rather than the date on which it usually holds — this desk's oldest
rule, applied to a config constant rather than to a business rule.

## COMPUTED, USED FOR A DECISION, DISCARDED — FOUR TIMES IN ONE DAY

**2026-09-04. The same shape in four unrelated modules, which makes it a design
habit rather than four accidents:**

- **`ActivityReading.window`** — trades per minute, documented *"FOR DISPLAY"*,
  used for the ACTIVE/DEAD verdict, **no column on `ticker_session`.**
- **`coverage.gaps`** — the directional strings saying WHICH source was missing,
  consumed only by the model prompt; **persistence keeps a boolean**, so *"we
  lacked a share count"* and *"we could not see press releases"* survive as the
  same bit with opposite implications.
- **`splitEvents`** — derived by `deriveSplitFactors`, **written to a log line
  and dropped**; only the cumulative factor is stored, so the events have to be
  re-detected from it later.
- **SEC response statuses** — the client sees every 403, `lastError` is a local,
  **only the request COUNT is recorded**, so the desk cannot report a
  reachability it already observed.

**The tell in every case: the value was rich enough to make a decision with and
was reduced to the decision.** A verdict is kept; the evidence that produced it
is not. **So the next question — which is always "why?" — has to be answered by
recomputing, or cannot be answered at all.**

**And the cost is never paid where the discard happens.** It lands on a surface
months later that has nothing to render, or on a person reading raw strings at
01:35 because no count existed to raise an alarm.

## SPLIT A BOOLEAN WHEN ITS TWO FACTS HAVE OPPOSITE CORRECT ACTIONS

**Research, 2026-09-04, on `secAvailable`.** The field conflates *SEC is
configured* with *SEC is reachable*. The obvious fix — make it honest — **would
be worse than the defect**, because the field is **a gate, not a display**:
`client.ts:132` throws before every fetch and four workers gate on it. **An
honest field would convert a rate limit into an outage.**

**The test for splitting is not that the two facts differ. It is that their
consumers need OPPOSITE responses:**

    configured   ours    GATE — never send SEC an anonymous request
    reachable    theirs  REPORT AND BACK OFF — hard-stopping on a throttle is wrong

**A single boolean cannot serve both, and no amount of making it more accurate
would help** — the accuracy is not the problem, the merged control is.

**One defence of the code, against this seat's framing.** The comment at `:240`
says the `@` check exists so we are *"rejected here rather than quietly
rate-limited by them later"*, and **that is right about its own purpose**: the
check is about COMPLIANCE, and a non-compliant user agent is what INVITES
throttling. **The function never claimed to test reachability — the NAME and the
DETAIL STRING promise it.** Part of this is nominal, and the nominal half is the
cheapest to fix.

## THE STATE IS A JUDGEMENT; THE ARRAY IS THE OBSERVATION

**Research, 2026-09-04, correcting a spec from Integration.** The instruction was
that an `UNKNOWN` activity reading must persist as *not measured*. **Keyed on the
state label, that is wrong:** `resolveActivity` can return `UNKNOWN` **while
carrying a genuine series** — the band-held branch keeps the previous verdict and
still observes the window. Keying null on `state === 'UNKNOWN'` would have
discarded real measurements.

**Keyed on `window.length === 0` it is exact.** Empty means nothing was observed,
whatever the engine concluded.

**The general form, and it is the presence-versus-validity distinction in its
sharpest phrasing: a STATE is a conclusion drawn from data; the DATA is a
separate fact.** They can disagree — a confident label over an empty
observation, or an uncertain label over a full one — and **storing the label as
a proxy for the data throws away the case where they differ**, which is exactly
the case worth keeping.

**It also simplified the write:** null already carries the meaning, so the upsert
is a `COALESCE` rather than a `CASE` on the state — **a restart preserves the
stored series and any real reading wins, including a real `UNKNOWN` reading**,
which a state-keyed branch would have thrown away. One fewer branch to get wrong
later.

## A BACKSLASH EATEN BY A LAYER — THREE TIMES IN ONE NIGHT, EACH SILENT

**2026-09-04. Three threads, three layers, one mechanism:**

- **Ops's guard**: the table regex lost its backslash to the harness, `(\w+)`
  became `(w+)`, matched nothing, and `every()` over an empty list returned
  **vacuously true**. The guard skipped on every store.
- **Ops's verifying grep**: BRE read `\w` as a literal `w` and `+` as a literal
  plus, **returned 0 for a line that was present**, and two rounds were spent
  explaining a failure that had not happened.
- **Research's parser**: a regex built from a **template literal** had every
  backslash eaten — `\s` to `s`, `\d` to `d` — producing a pattern that **threw
  at module load.**

**The escape is consumed by something between the author and the engine** — a
shell, a tool harness, a template literal — and what arrives is a **valid
pattern that means something else.** Nothing errors at the point of the mistake.

**AND THE THIRD ONE CARRIES THE SHARPER LESSON: TYPECHECK PASSED.** The failure
lived **inside a string**, and `tsc` cannot see in there, so the compile
**reported clean on a file that could not be imported at all.** It was caught by
running the tests, not by the gate one would instinctively trust.

**That is the neighbour of a check that cannot fail: A CHECK THAT SUCCEEDS AT A
QUESTION THAT DOES NOT COVER THE DEFECT.** It did not fail to run and it did not
return the wrong answer — **it answered a different question, correctly**, and a
green result is indistinguishable from coverage.

**So: build regexes as plain literals, not from template strings or shell
arguments; and never treat a green typecheck as evidence that a module loads.**

## A TOOL THAT REPORTS "NOT FOUND" THE SAME WAY IT REPORTS "NONE" IS NOT AN INSTRUMENT

**Ops, 2026-09-04, four instances in one night, each returning a plausible
negative that was actually a failure to look:**

- **`grep "INDEX IF NOT EXISTS (\w+)"` returned 0** for a line that was
  present — BRE reads `\w` as a word-character and `+` as a literal plus. **Two
  rounds were spent explaining a test failure that had not happened.**
- **`systemctl is-active` on a MISSPELT unit returns `inactive`** — byte-identical
  to a dead service. *(The fourth unit is `mointel-assess`, not
  `mointel-scheduler`.)*
- **`TZ=America/New_York date` returns UTC** on this shell, which has no tz
  database — **a plausible time that is six hours wrong**, on the desk whose
  charter already records four clock errors.
- **`grep -c` on a root-owned file returns empty, not 0.**

**The shape: the tool's "I could not look" is spelled identically to its "I
looked and found nothing."** A wrong population announces itself; **this
announces nothing, and it always announces it in the reassuring direction** —
zero hits, service down, no matches, all of which read as clean answers.

**So a negative from a shell command is not evidence until the instrument has
been shown capable of returning a positive.** Run it against a case you KNOW
matches before trusting the case that does not. This is the neighbour of *a
check that cannot fail* and of *a negative is only as strong as its
instrument* — and it is the version that bites in a terminal rather than in a
test suite.

## A FAILED DEPLOY DOES NOT LEAVE YOU WHERE YOU WERE

**Design, 2026-09-04, on why both its pending lists were wrong.** It had
`b2399a2` down as unshipped, on the reasonable theory that **a deploy which
failed leaves the previous release running.** Here it does not: the deploy
switched the symlink, the schema migration failed, and Ops **restored FORWARD
onto `b2399a2`** — having verified the release expected schema 23 and the store
read 23. **The failed deploy is the reason that sha is live.**

**Nothing about that is inferable from outside Ops**, which is the point. So:

- **Only Ops knows what is live.** Not the log, not `origin/main`, not the last
  successful-looking message.
- **A thread reports its OWN HEAD and stops there.** *"My head is X, last code
  commit Y."* **A pending list a thread cannot verify is a guess with a shape**,
  and it will be believed because it looks like a fact.

**This removes the failure rather than asking anyone to be more careful about
something they cannot observe** — the same reasoning as reporting existence
rather than a rate.

## A TEST WRITTEN BY COPYING THE IMPLEMENTATION CANNOT DISAGREE WITH IT

**Design, 2026-09-04, naming the general form after producing both instances.**
The header suppression read `state === 'LIVE' ? null : label`. **Its test
asserted `state === 'LIVE' ? null` exactly** — so the test defended the defect it
existed to catch. Earlier the same session, a suite asserted
`toContain('high is today')` and pinned a false label the same way.

**The mechanism is that the assertion was DERIVED FROM the code rather than from
the requirement.** A test written that way agrees with the implementation by
construction, including where the implementation is wrong. It will go green
forever and it is indistinguishable, in a passing run, from a test that checks
something.

**The tell is that the test restates the code's condition instead of the
behaviour's.** `state === 'LIVE'` is an implementation detail; *"the label is
hidden when the market is doing what this hour expects"* is the requirement, and
those two sentences diverge exactly where the bug lives.

**The repair, and it is the standard now:** enumerate the whole input space
rather than the firing case. Design replaced the single-value assertion with **a
mapping over EVERY session phase** — LIVE nominal in premarket, RTH and
after-hours; IDLE nominal in closed, post-market and next-day-prep — **which is
precisely the half a single-state check cannot reach** — plus a guard asserting
the old literal cannot return. **Both mutation-tested against the old code and
confirmed to fail before committing.**

### And a check that only exercises the firing case cannot tell you the predicate is right

**Same date, same thread, on the verification rather than the test.** Design
confirmed the fix live by seeing *"Market: worker offline"* render its words —
an abnormal state speaking, as designed — and called the feature verified.

**It proved only that the true-positive path works. It said nothing about
whether ABNORMAL was defined correctly** — and the screen it verified on was at
that moment **displaying the defect**, because "worker offline" out of hours was
itself a state wrongly classified. **The verification and the bug were the same
pixels.**

**So a live check must exercise the case where the feature should stay SILENT,
not only the case where it should speak.**

## A test can pass because the setup never reached the condition

**R&D, 2026-09-04, catching it in a test it had just written.** The fixture used
activity peaks of **500** against an active level of **600** — **so the name
never went active at all.** No episode was ever found, the assertion passed, and
it demonstrated nothing.

> **Right outcome, wrong mechanism. A green that agrees with you for a reason
> you did not check.**

Rewritten with peaks of 700, so raising the active level genuinely changes how
the same series reads. **This is the test-side twin of *a claim confirmed by a
matching column name is not confirmed*** — and it is nastier than a check that
cannot fail, because that one at least exercises the code. **This one never
arrives.** The prompt that catches it: *does my fixture actually enter the state
under test, or does it pass by never getting there?*

## Pin a measured constant; a bound lets it drift in the flattering direction

**Research, 2026-09-04, tightening its own test after R&D quantified the value
it was guarding.** The test asserted `reviveMinutes > 1`. **A bound would have
let it drift silently to 3 or 4** — and the measured table shows each step is a
real trade against opportunity (3 costs 41% of genuine returns), not a free
tightening. It now asserts the value **is 2**, so anyone moving it has to see
the numbers and go and find newer ones. **A bound permits movement in the
direction that feels safe, which is exactly where an unexamined change goes.**

**And in the same pass, a rule about how justifications are written:**

> **Understating your case is how a constant later gets loosened by someone who
> reads only the weaker argument.**

Research had justified the value as *a fast return buys flicker rather than
opportunity*; the data showed it also buys **a worse mix** — conditional quality
rises 7.0% → 7.9% when the constant holds. The comment now carries the stronger
claim, because the comment is what the next reader weighs against the cost.

**Related: derive a dependent constant rather than configuring it twice.** The
dead line is `active ÷ 10` rather than a second configured number, because the
10× is the trader's choice and **two separately configured values can drift
until they no longer express his ratio, with nothing anywhere to notice.**
Deriving makes the choice structurally unforgettable — and the config carries a
comment saying so, or the next person to simplify it will configure both.

## A correlation is not a threshold agreement, and a pilot is not a small study

**R&D, 2026-09-03, from the revival question — two findings, both against its own
pre-registered expectations, and both about instruments rather than markets.**

**Rank correlation is decided by the bulk; a threshold is decided at the
boundary.** It measured Spearman **+0.92** between minute volume and minute trade
count and pre-registered that switching measures *should not move the result*.
**It moved it 14.2 points.** Two series can agree almost perfectly on levels and
still disagree about *which minutes fall below a cut* — so a correlation licenses
nothing about a cutoff, and reasoning from one to the other does not follow.
**A volume control on the same window separated it cleanly** (window +5.0,
measure −14.2), which is the only reason the cause is known rather than argued.

**And the two-session pilot was not a small version of the thirteen-session
study — it was a different answer.** It overstated revival **at every setting**,
79.7% against 68.2% at identical persistence. Not noisier: *biased*, in one
direction. **A cheap look is evidence about the cheap look**, and the temptation
to treat it as a preview is strongest exactly when it agrees with you.

## A stored FACT plus a surface JUDGEMENT beats a stored judgement

**Design, 2026-09-04, refusing a cumulative field it had asked for.** The
graveyard wanted a "revived and ran" tally. Building it as a stored count would
force the ENGINE to decide what *ran* means — evaluating each revival against a
threshold, presumably +25% — and **that number would then be frozen in a column
and changeable only by migration.** Storing `dead_at_price` instead keeps the
column a **fact** and leaves *"did that count as a run"* a **judgement made at
the surface**, where it changes the day the trader changes his mind about what
a run is.

**The desk has already paid for the alternative:** the model's cycle
classification was a stored judgement, and replacing it took a cutover, a
schema deletion, and thirteen days of a masked risk chip.

**Two supporting rules from the same decision.** *A live surface and a session
tally are different questions with different homes* — "is this name running
now" belongs on the board, "how often was the rule wrong today" belongs in the
archive, and a header carrying the second duplicates the archive badly. And a
cumulative tally would have **outlived the surface carrying it**, since the
graveyard clears at session end when its central claim expires.

**And the cost was stated rather than hidden, which is why the trade is
trustworthy:** overwrite understates misses **specifically on the churniest
names** — the ones the rule is most wrong about. *The measurement is weakest
where the failure concentrates*, the same shape as a verification that fires
hardest on the cases it can least resolve. Accepted knowingly, with the
session-long miss rate routed to the archive rather than invented in chrome.

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

**Fourth instance, three days, and this one was AUTHORISED BY INTEGRATION.**
Research's deep-history work stores **`split_factor`** on `daily_bars` — the
**cumulative** factor from raw closes against split-adjusted closes, where **1
means "already on today's basis"**. Integration then authorised R&D to add
**`split_factor`** to the archive, where it derives from `resolveBaseline` and
reads as **the ratio of the split EVENT**. **Two quantities, one name, two tables,
one desk** — caught by Research unprompted before either shipped.

**The authorisation was wrong for a specific reason worth copying: it was granted
on the basis that the column was "in your own module".** Module ownership settles
*who builds it*. **It does not settle whether the NAME is free**, and a name is
global across the desk in a way a module is not.

> **Before authorising a new field, grep the name across every module — not the
> one that owns it.**

**RESOLVED `ffd19c8`: R&D's column became `split_event_ratio`.** `lib/market/
splits.ts` already held **both** quantities — `factors` (cumulative) and
`SplitEvent.ratio`, documented as *"Old cumulative factor ÷ new. 30 means a
1-for-30 reverse split"*. **Research already had the right name for R&D's
quantity.** Theirs was shipped and populated; R&D's was three commits old and
empty, so it moved.

**And the collision was worse than a synonym clash, in a way worth generalising:**

> **`1` is the ORDINARY value in the cumulative column and an IMPOSSIBLE one in
> the event column** — a ratio within tolerance of 1 is never recorded as a split.
> **Both columns look healthy in isolation; the failure only appears in an
> analysis nobody has written yet.**

**The basis question has a non-obvious answer that is worth keeping**, because the
reflex after `float_basis` is to bolt a basis onto every number: **the cumulative
factor NEEDS a basis and already has one** (`daily_bars.fetched_at`, since *still
to apply* is relative to fetch time); **an event ratio is a property of the event
and needs none.** Both already satisfy the rule. **Adding a basis column to the
second would create a field with nothing to put in it.**

**And R&D's correction of Integration's self-reproach is the part that changes
practice.** The authorisation was a **scope** question — *is this yours to start* —
and it was right. **A name collision is not a scope question and the check
Integration reproached itself for skipping would not have caught it.** What caught
it was **Research volunteering its own schema unprompted.**

> **Cross-module collisions are found by threads publishing what they hold, not by
> the authoriser checking harder.** No amount of care at the routing layer
> substitutes for it.

**It cost nothing only because nothing was populated** — the archive was still v5
with no backfill run. **Timing, not foresight**: populated first, this would have
been a data migration across two stores.

**FIFTH INSTANCE, 2026-08-27, and the first where both artefacts live in the SAME
product.** `displayedFloat` names two quantities: `row.displayedFloat` — the
Sheet's number, resolved Sheet-only at `merge.ts:143` and shown on the board
row — and `structure.displayedFloat` — the model's, from cited evidence, read by
`AutomaticIntelligence.tsx:334`, `deskRead.ts:359` and `risk.ts:174`. A coverage
figure ("0 of 249") was quoted desk-wide without saying which; Integration then
attached the wrong interpretive line — *"a field the board never reads"* — and
Research caught it at the readers before it spread further. **The previous four
instances were caught at a thread boundary, because a boundary makes someone
ask which is meant. This one sits inside one product and no boundary exists** —
so the standing repair (threads publishing what they hold) cannot fire, and the
name itself has to carry the distinction. Naming settles before the Q9 capture
columns ship, in Research's scope; until then any figure about "displayedFloat"
states which field it measured.

### OPEN: two split detectors, different thresholds

**Flagged by R&D rather than silently reconciled.** Research requires a split to
hold for **`CONFIRM_SESSIONS = 3`** before believing it. R&D detects on a **single
boundary crossing at 0.5% tolerance, no confirmation.** Research's reasoning
applies to R&D's code too — **a fabricated basis change makes two comparable
prices look incomparable, which is worse than missing a real split.**

**Unresolved, and named as the next collision if nobody writes it down.** R&D has
asked Research for a counterexample rather than matching the threshold on
authority.



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

**And the field has a concrete justification rather than a tidiness one, established
by Ops the same morning.** Three of those ten stranded jobs — `ADXN`, `LSTA`, `ZKH`
— turned out to be **on the live board carrying a cycle computed a session stale**,
because never-claimed means never-re-analysed means their partial Friday bar never
healed. **`stalledJobs` would have surfaced that on day one.** It took two nights
and three threads to connect instead.

> **It is not a counter for neatness. It is the field that would have made a
> two-night causal chain a one-query answer.**

**That is also the answer to why those ten sat unexamined while being called
inert: nothing about `queuedJobs: 0` invited a check. A false number would have
been investigated within the hour.**

> **A correct number answering the wrong question survives every review a wrong one
> would not.**

**And it reframes what was built.** `stalledJobs` was added thinking the fix was a
missing counter. **The fix was asking the other question** — and the reason to keep
`queuedJobs` narrow is not tidiness but that **the narrow number was never the
defect.** *(See "a constant dressed as a measurement" — same failure at a
different distance.)*

*Operational caveat until it ships: `stalledJobs` reports nothing before the next
deploy, so a `0` read now is the old shape rather than a measurement.*

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

## Counting the callers is not asking each what it needs

**Research, against itself, 2026-08-24 — the same function, twice in two days.**
*Recorded as ONE failure at its own insistence. Integration read a count as an
analysis and relayed it onward in those words; Research produced the count and
chose which check to run against it, and asked that the section carry its name
alone "because the check that could not fail was the one I picked." Both halves
are here; the split is not.*

It made `readDailyBars` hide unfinished bars so **all four callers would inherit
one definition**, having counted the callers and reasoned about **one** of their
failure modes. Integration endorsed it. **For a cycle, hiding a partial bar is
right — a part-day distorts a rate in an unknown direction. For a CEILING it is
actively harmful: a high can only RISE within a session, so a partial high is a
LOWER BOUND, and hiding it UNDERSTATES the ceiling — the direction that
manufactures a false blue sky.**

> **A rate over a part-day is wrong in an unknown direction. A bound from a
> part-day is wrong in a known and safe one. Filter for rates and phases; never
> for bounds.**

**Its own summary: *counting the callers is not the same as asking each what it
needs*** — and it had already made that mistake once on the same function the day
before.

**The generalisable move is that unification is a claim about consumers, not about
code.** *"All four now inherit one definition"* sounds like tidiness and is an
assertion that four consumers want the same thing.

**BOTH REMAINING CALLERS WERE THEN CHECKED, AND THE ANSWER IS WORSE THAN A THIRD
AFFECTED CALLER.**

- `pipeline.ts:362` — **clean.** A phase; the filter is correct.
- `readModel.ts:628` (overlay) — a phase; correct.
- `readModel.ts:305` (blue sky) — a **bound**; wrong.
- **`bundle.ts:478` — BOTH, and unresolvable at the call site.**

**The test does not partition by caller. It partitions INSIDE
`summariseDailyHistory`, over one bar set:**

| | wants the partial bar? |
| --- | --- |
| `windowHigh`, `windowLow`, `historicalResistance` — **bounds**, off `high`/`low` | **yes** |
| `largestDrawdownPct`, runs and their `gainPct`, `runsOver20/50/100Pct`, `runnerCandidate` — **rates**, off `close` | **no** |

**So neither filtered nor unfiltered is right for that function, and anyone
"fixing" it by flipping a flag at the call site repairs one half and breaks the
other.**

> **The boundary can fall INSIDE a function. The rule is about the QUANTITY, not
> the caller.**

**The repair shape, and it is the answer to "does this make the function mean two
things":** `readDailyBars` now takes an explicit **`'EXCLUDE' | 'INCLUDE'`** rather
than a boolean, so **the caller DECLARES which category it is in at the call
site.** One definition of *finished*, shared by both paths — **what changed is that
the choice is visible instead of assumed.** The function means one thing and takes
an argument, rather than meaning two things silently. Blue sky is the only
`INCLUDE`.

**Two supporting choices worth copying.** Every returned bar carries
`sessionComplete` on **both** paths, not only the including one — **an absent flag
would have to be read as "probably fine", which is the default this codebase
refuses everywhere else.** And `NewDailyBar` **omits** it: a writer carries
`fetchedAt` and completeness is derived on the way out, **so a writer cannot assert
completeness and disagree with the reader.**

**AND IT REACHES TWO APPEND-ONLY STORES, THE SECOND DOWNSTREAM OF THE FIRST.**
`summariseDailyHistory` feeds the **evidence bundle**, so an understated bound
reaches the interpreter and is written into a dossier. **The bound persists on four
analyses in five** — `cycle.historicalResistance` is filled on **264 of 325** stored
dossiers, 81%; it is not a field the model usually leaves null.

**Then `worker/desk-assessments.ts:238-243` builds `candidatesAbove` from
`session_high`, `currentCycleHigh` and `historicalResistance`, and takes
`resistance = MIN` of those above price.** So an understated resistance that is
**still above price wins the min**, and the checkpoint records a level **below the
true one** — into `desk_assessment_tickers`, append-only, beginning 2026-08-17.

> **A re-analysis repairs the dossier. It does NOT repair a checkpoint already
> written.**

**Direction, so it is not over-read:** an understated resistance is **too LOW** — a
nearer ceiling than the tape supports. **Conservative for an entry, wrong for
holding through a level.** Not a false blue sky.

**And the exposure is bounded three ways, not one:** re-analysed since the filter
shipped, **and** holding a partial tail bar, **and** the bound actually moving.

**BUT THE TWO EFFECTS SELECT DIFFERENT SYMBOLS, and a measurement of one reads as
a measurement of both.** The **ceiling** effect is about the **newest** bar — 10 of
256 symbols. The **resistance** effect is about **the one behind it**, because
`historicalResistance` runs over `slice(0,-1)` — **five of 256, and a different
five**: `JATT` 14.50→13.80, `JANX` 17.72→16.99, `CATO` 3.78→3.73, `GNE`
15.23→15.07, `ALZN` 1.60→1.59.

**Research's first query compared max-high-all against max-high-finished, which
captures `windowHigh` and `windowLow` and is BLIND to the two-session loss.** It
caught that in its own query before it was run — *"Ops running what I sent would
have measured two of the three quantities and reported a complete answer."*
**Integration had already relayed the ten as the bound on both.**

> **A query that measures two of three quantities does not return a partial
> answer. It returns a whole one, about a smaller thing.**

**Blue sky is wrong on a screen and can be recomputed. This cannot.**

**A compounding effect nobody predicted.** `historicalResistance` is computed over
`usable.slice(0, -1)` — deliberately dropping the last session, because resistance
means levels established *before* now. Correct on its own. **But when the filter
has already removed the partial bar, the slice drops the one behind it too — so
`historicalResistance` loses TWO sessions, not one.** On BTCT: 08-20 hidden and
08-19 sliced, and 08-19 held a 1.32 high. **A correct guard and a correct filter,
composing into a wrong number.**

## A change's blast radius includes the instrument watching it

**Research, 2026-08-25, caught before shipping — the first of this family found in
advance rather than after.**

The stranded-jobs fix moves the recap's enqueue to the **target** session. But
`stalledJobs` counts `trading_date <> ?` — **and a job legitimately queued for
tomorrow satisfies that.**

> **The field added to make this population visible would have started counting
> the FIX as the disease** — every night from 22:00 until the roll, in a shape
> identical to the bug persisting.

**One character (`<` for `<>`), and it must land in the same commit.** Otherwise
the first night's reading is wrong in the most convincing possible way: it would
survive review, match the prior night's shape, and **argue against the change that
caused it.**

**A metric that reports a successful fix as a continuing fault is worse than no
metric.**

**How it was found is the transferable part.** Integration asked Research to check
whether any **reader** depended on a queued job's `trading_date`. It went looking
at other threads' readers **and found its own instrument.**

> **Nobody checks the instruments watching a change, because they are not the
> thing being changed.** Add them to the reader list explicitly.

**Third instance for the same thread in one week** — the `adjustment` literal, the
health allowlist, this — **each a field correct in isolation and wrong beside a
change nobody had made yet.**

### And the counterfactual that made the fix verifiable

`nextTradingDate` reads the **cached market calendar**, not tomorrow-arithmetic, so
holidays and weekends skip by construction. **Had it been arithmetic, a Friday
recap targeting Saturday would strand every job exactly as today does — and the
fix would have looked correct while changing nothing.**

**Establishing that a fix CAN work is separate from establishing that it does**,
and it is the cheaper half to skip.

## "We missed it" is four different failures

**Research, 2026-08-25, turning a headline-tracking tally into a diagnosis.** When
the desk does not show a catalyst the trader can see, exactly one of these is true
and they need different fixes:

| what happened | failure |
| --- | --- |
| never found it | **COVERAGE** — no path to the source |
| nothing then, found it later | **LATENCY** — the path exists and was slow |
| found it, graded it low | **JUDGEMENT** — not a coverage problem at all |
| found it, board showed an older version | **PLUMBING** |

**Collapsing them is expensive in a specific direction:** a latency failure reads
as a coverage failure, and **the next investigation goes hunting for a feed when
the feed fired on time and came back empty.**

**The RCON case is the worked example and it is also the caution.** The pipeline
fired at **08:04, four minutes after an 08:00 wire release**, ran `RESOLVER`, found
no durable company source, and returned **zero sources**. That **rules out *never
looked***.

> **But ruling out one cause is not evidence for a specific other one.** *Found it
> later* is unverified for RCON — if no later pass ever picks up that release, it
> is a **coverage** failure that arrived through a mechanism that fired on time.
> **What is established is narrower: the lookup happened and came back empty.**

**And the distinction exists only because someone pulled the collector report.**
*"discovered 08:04, `ENTERED_TOP_N`, `modelCalls 1`, `sourcesAdded 0`"* is the
whole difference between a diagnosis and a guess — **without it, indistinguishable
from never having looked.** That is the argument for keeping collector reports.

### A manual feed going quiet arrives looking like good news

**The fourth costume, and the first one anticipated rather than caught.** The
trader is supplying headlines from his own news service so the desk can measure its
own miss rate. **When that feed thins out — and manual feeds do — a quiet week
reads as "the desk found everything."**

**So record what he supplied AND what he supplied nothing for, separately.** Same
family as `queuedJobs` being correct-but-scoped-to-today, the `toolConfig`
constant, and `stalledJobs` counting its own fix as the disease — **a number that
is right, means something else, and flatters the thing being measured.**

## An edge trigger cannot retry, because "still failing" is not an edge

**Second instance on this desk, 2026-08-25, and the first was fixed three days
earlier without anyone recognising the shape.**

`top 12 at rank N` fires on **entry** to the top twelve. RCON entered at 08:04,
got its one research pass, produced nothing — **and could not be re-queued,
because it had already entered.** It was at **rank 7–8 an hour later, more highly
ranked during the gap than at the moment it qualified, generating no job at all.**

> **A name that qualifies once, fails to answer, and keeps climbing is never
> re-asked.**

**The first instance was the recap's one-way door:** a job queued for a session
whose date had rolled became unreachable forever, because the claim filter was an
equality on a value that only moves forward. **Different code, same shape.**

**And both were invisible for the same reason: the failure produced no record of
having failed.** RCON's 08:04 job is recorded `PARTIAL` — **nothing reads that
status as "ask again"**, so a name with no catalyst and a rising rank looks
identical to one that was answered.

**CORRECTED ONE LAYER IN, and the correction matters because "edge-triggered"
sends the next reader to a trigger that is already right.** The board loop
(`queueDiscoveryResearch`) **is** level-triggered — it runs over current candidates
every cycle. **It is defeated one line later, by a skip:**

    queue.ts:167
    if (readCurrentAnalysis(db, candidate.ticker) && existingJob) {
      ... reason: 'dossier already accepted for this session'

**`readCurrentAnalysis` has NO DATE FILTER.** It returns whatever
`research_dossiers.current_version_id` points at, of any age. **So the reason
string names a condition the query does not check — "for this session" appears
nowhere in the SQL.**

> **The week's pattern again, and this time it is a STRING rather than a field: a
> label asserting a constraint the code never applies.**

RCON on 08-25: current analysis = the **08-19 `UNKNOWN`**, existing job = the 08:04
`PARTIAL`, **skipped — on every cycle, all morning.**

**Measured, board jobs per ticker-session:** `0 → 50`, `1 → 238`, `2+ → 35`. **The
35 are names with no dossier at all, where the skip cannot fire.** So in practice:
**a name the desk has ever analysed gets ONE board job per session and is then
frozen out, whatever that job produced.**

**The repair is to ask "is this name ranked AND still unanswered", not "has this
name ever been analysed" — and the brake already exists.** `evaluateRetry` gates
on the evidence fingerprint, so a re-queued name whose evidence has not changed is
deferred by the existing retry policy. **The fix does not need a new bound; it
needs to stop skipping before that bound is ever consulted.**

### The worked example would have validated an insufficient fix

**The part worth more than the finding.** A separate, real defect was found in the
same investigation — 51% of resolver turns consume a pass without making a model
call. **Fixing only that answers RCON at ~08:10**, because its single pass happened
to coincide with the wire.

**A name whose release lands ten minutes AFTER it qualifies still waits two hours,
and nothing in the RCON case would have shown it.** The fix would have looked
complete, the example would have gone green, and the investigation would have
closed.

> **When one example motivates a fix, ask what the example does NOT test.** A
> worked case that validates a partial fix is more dangerous than no case at all,
> because it supplies the confidence to stop looking.

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
VARY isn't a measurement.**

**And it has a sibling one step further out — `queuedJobs: 0`, correct and scoped
to today while ten jobs sat queued.** Research's own framing of the pair, and it
is the reason to read them together:

> **A constant dressed as a measurement never varies. A correctly-scoped number
> never lies. Neither can be caught by checking whether the value is RIGHT,
> because in both cases it is.**

**That is what makes this family survive review.** Every other defect in this
document is found by asking *is this true* — these two answer yes. **The question
that catches them is *what would have to change for this number to move*, and
*which question is it answering*.** For any field recorded to distinguish cases, ask what
its distinct values are across the whole table. One is a defect. And a test that
asserts a constant confirms the constant, not the behaviour.

**It generalises past ledgers**, which is why it is here rather than in
`research.md`: any column, label or flag added to tell states apart is worth one
`select distinct` before it is trusted — including the ones this desk added
tonight.

## State the reason, not the conclusion, when it constrains what you do

**Research, 2026-08-24, diagnosing why a wrong premise survived a night.**

Two threads stopped work saying *"the market is open"* / *"about to open"*.
Integration checked the clock, found both wrong, and corrected them — **which
loosened a constraint both threads had been right to apply.** They were staying off
the running desk because **he might be at it**, which was true. Nobody said so.

> **A conclusion with no reasoning cannot be corrected, only overturned.**

Had either written *"staying off the desk because he may be working"*, the
disagreement would have been visible and the real question — *when does he
actually trade?* — would have been asked hours earlier. **Instead the stated
reason was checkable and got checked, while the unstated one survived
untouched and invisible.**

**Third instance of this shape in one night, and each time the checkable version
is what produced the finding:** naming a specific victim made an as-of hazard
checkable where *"prospective, no reader today"* would have been true and taught
nobody; *"the float sort will start working"* was checkable where vague praise for
the same work would have sailed through; and here, the reason given was corrected
while the reason held was not.

**So when a fact constrains what you do — a window, a lock, a dependency — say the
fact, not the decision.** *"Not deploying: research is WORKING"* can be checked
and corrected. *"Not deploying yet"* cannot.

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

### The ping is ONE LINE. Amended 2026-09-04, because the rule was being quoted and not applied

**Every message between threads on the night of 2026-09-04 ran 400–800 words.
Not one was a one-line ping.** The rule above was written on 08-24, has been
cited since, and has never been followed. It is not missing; it is unenforced —
**this desk's own "quoting a rule feels like having applied it", in the rule
about how we talk to each other.**

- **A completion ping is one line.** Sha, what it does, what is next or blocked.
  **If it needs a paragraph, the paragraph belongs in your charter and the ping
  says where to read it.**
- **Integration sets the register and must go first.** A thread receiving 600
  words answers in 600. **The longest messages of 2026-09-04 were Integration's
  instructions**, so the reply length was authored by the seat complaining about
  it.
- **One message per milestone, not per event.** Scoped, built, gated and pushed
  is **one** ping, not four.

**CONSOLIDATION APPLIES TO CONTENT, NEVER TO THE COMPLETION PING. Amended
again the same night, hours later, because the first amendment caused a
failure.** Within four hours of *"one message per milestone, not per event"*
being written, **all four threads did work and went idle without pinging at
all** — and Integration only learned of it because **the trader said "no one is
working on anything."** He was put back in the transport role that this entire
section exists to remove, which is precisely the complaint that created the rule
on 08-24.

**The cause was the amendment.** *One message per milestone* reads as permission
to stay quiet, and **a thread still working and a thread finished-and-silent are
indistinguishable from outside.** Integration does not wake on a commit. **So
silence is not a smaller message; it is no message, and it stops the bus.**

- **Going idle IS a milestone.** If you are about to stop, ping first — even if
  the ping is *"done, nothing to report"* or *"blocked on X, stopping."*
- **Shorter is the goal. Silent is a failure.** The rule was written to cut 800
  words to one line, never to cut one line to zero.

**THREE EXEMPTIONS, AND THEY ARE NOT NEGOTIABLE:**

1. **A CORRECTION OR RETRACTION GOES IMMEDIATELY, AT WHATEVER LENGTH IT NEEDS.**
   Never batched, never held for a milestone. On 2026-09-04 a retraction of a
   float coverage claim reached the trader within the hour and stopped a wrong
   number entering a purchasing decision. **Under consolidation it would have
   waited.** The messages that mattered most that night were interruptions.
2. **A blocking question goes immediately** — a thread idle on an unasked
   question is more expensive than any message.
3. **A live defect on his board goes immediately**, with names, not a rate.

### Ask Integration only for what Integration knows

**Same date, same cause.** Integration gated a parser fix behind its own approval
**twice**, and both times the message crossed with the thread building it —
**two full exchanges for one event, and the approval added nothing**, because
the owner had scoped, tested and gated the work and knew more about it than the
seat approving it.

- **Integration's word is required for:** spend, sequencing across threads,
  deploys, anything that reaches the trader, and anything where two threads
  disagree.
- **It is NOT required for work inside your own module that your own gate
  covers.** Build it, gate it, ping in one line. **Asking for permission you do
  not need is the seventh-worker failure wearing a process costume**, and it
  costs two messages and a round-trip every time.

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

## How threads reach each other — the directory is `list_sessions`

**Settled 2026-08-24 by an experiment Ops ran and reported as a mechanism rather
than an outcome.** Both Ops and Research had correctly concluded the bus was gone;
the instruction they were following could never have worked.

**THE ONE THING THAT WORKS, in both directions, prompted or not:**

    directory:  mcp__ccd_session_mgmt__list_sessions     -> sessionId + title + cwd
    send:       mcp__ccd_session_mgmt__send_message      -> session_id + message

**`list_sessions` carries the real titles** — `Integration`, `Research`,
`Coaching`, `Design`, `R&D`, all with `cwd A:\mointel`. **That is where the names
live.** Look the address up there every time; do not cache it and do not accept
one supplied in a message body.

**THREE THINGS THAT DO NOT WORK, all previously in this document or in tooling:**

- **`ListAgents` names.** It returns opaque handles — `mointel-8c`, `claude-1a`,
  `mointel-56`, `claude-f4` — **and no thread can map any of them to a thread.**
  This document previously said to send to the NAME `Integration` from
  `ListAgents`. **Retracted.**
- **`SendMessage` to a name.** It worked until a session stopped appearing in
  `ListAgents`, then failed with *"No agent named … is reachable"*. **It was never
  a reply channel; it was name-based addressing that quietly stopped resolving.**
- **Copying the `from` attribute of a received message as the `to`.** The
  `SendMessage` tool's own documentation says to do this. **It fails on this
  machine.**

**SO THE PING RULE BELOW WORKS — a thread CAN reach Integration unprompted**, and
must, using the two tools above. **Every charter that names `ListAgents` needs
this correction.**

**Messages queue.** Every session in the directory can read `isRunning: false`
while sends still land.

**And one failure worth keeping, because it nearly inverted the experiment's
result.** Integration supplied its own session id in the message body and **the id
was wrong** — it had read its scratchpad path instead of the directory. Ops used
`list_sessions` anyway. **Had it trusted the supplied id, the test would have
failed for the wrong reason and been reported as "unprompted does not work",
closing a channel that was open.**

> **Look up an address; never accept one asserted in prose — including from the
> thread whose address it is.**

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

## If Alpaca can serve it, do not serve it from the store

**Stated by the trader, 2026-08-24, after the board asserted blue sky from a
90-session local cache.** His words: *"we have a paid for connection to accurate
market data with alpaca"*, and *"alpaca has a websocket capability... we should
not be pulling from store for anything alpaca provides."*

**The principle is right and the desk half-agrees with it already. Three sources,
three different jobs — and the failure is using one to answer another's
question:**

- **The socket answers *what is happening now*.** `lib/market/alpaca/stream.ts` —
  **exactly one long-lived WebSocket per worker process**, wildcard `bars`,
  `updatedBars` and `statuses` for whole-market discovery, plus a high-resolution
  interest set of trades/quotes/lulds applied as **subscribe/unsubscribe diffs on
  the open socket.** Adding a data point is already cheap and already supported;
  this is the architecture he is describing, and it exists.
- **REST answers *what has ever happened*.** A socket gives you now, never the
  past. **A blue-sky ceiling, a split history, a 90-day high are questions about
  the past** — so the fix for those is a deeper `ensureDailyHistory` range, not a
  subscription. Conflating the two builds the wrong thing.
- **The store is for what Alpaca CANNOT reproduce: the desk's own derived state at
  an instant** — RVOL as it stood, board rank as it stood, what the desk believed
  at a checkpoint, and every dossier. **That is the whole of R&D's
  re-fetchable / observable-once split, stated from the other side.**

> **Live facts from the socket. Historical facts from REST. Only judgements and
> derived state from the store.**

**The defect that produced this was a category error, not a missing feed.** A
ceiling — a historical fact, re-fetchable indefinitely — was being answered from a
cache **sized for cycle classification**, and every thread including Integration
argued about how to *describe* the 90-session limit honestly rather than asking why
a long-horizon claim was reading a short-horizon cache.

**AND THERE IS A LANDMINE UNDER THE DEEP-HISTORY VERSION. `adjustment` IS A
LITERAL AND ITS GUARD IS DEAD CODE.** *Research, found while scoping this.*
`historyFetch.ts:126` and `:139` write `adjustment: 'split'` as a **constant** —
it records the mode **requested**, never the basis the prices are on. **All 24,429
rows across 256 symbols say `'split'`; zero disagree.** So `dailyBarAdjustment`
always returns `'split'`, and blueSky's first guard — *if the retained history is
not split-adjusted, refuse* — **can never fire.** Same defect as the `toolConfig`
constant: a field that exists to distinguish two states, shipped as one value.

**Why it is safe today, and why that safety is a coincidence.** Alpaca adjusts as
of **fetch time**, and `start` is computed from `Date.now()` (`:118`), so **every
fetch rewrites the entire retained window** — the fetch window and the retention
window are the same ~90 sessions. A split therefore self-corrects on the next
fetch and the dead guard costs nothing.

> **Deep history breaks exactly that coupling. Store five years, fetch only the
> trailing window, and old rows keep a PRE-SPLIT basis forever while new ones
> carry the current one — both labelled `'split'`. Blue sky then compares prices
> across two bases, and the guard designed for precisely that cannot report it.**

**Re-fetching five years on every pass is correct and is a different cost
conversation.** The point to carry: **the current design is accidentally safe
because two windows happen to be equal, and this change is what pulls them
apart.**

**Three more scoping facts, none of them blocking:**

- **There are TWO NINETIES, not one** — the fetch range (`historyFetch.ts:118`)
  and the read limit (`readModel.ts:306`, passing
  `DEFAULT_CYCLE_HISTORY_TRADING_DAYS` explicitly). **Deepening storage alone
  changes nothing; blue sky still reads 90 rows.** Both must move, and moving the
  second is where `readDailyBars` starts meaning two things again.
- **Nothing prunes `daily_bars`.** `pruneMinuteBars` exists; there is no delete on
  daily bars anywhere. **Deep rows persist once written**, so retention is not the
  obstacle.
- **The board population is not stable, so a cache amortises little.** Top 50
  turns over almost completely daily — **38 to 45 new names per session out of
  50**, 257 distinct symbols across six sessions with only 152 holding any
  `daily_bars` today. **Steady state is roughly forty deep fetches every morning,
  arriving inside his 04:00–09:30 window.**

**THE ONE HARD CONSTRAINT, and it is already this desk's most protected rule:
there is ONE SIP connection.** The stream's own comment: *"exactly one of these
exists per worker process... the browser never opens a socket of its own."* **New
data points are added as diffs on the existing socket. A second connection steals
the first and costs a hole in the record** — which is why `RESTART_MARKET=no` and
the release pin exist. **"Put a feed on any data point we need" is correct and
means subscribing more channels on the one socket, never opening another.**

## A better constant of the same kind is the same mistake

**R&D, 2026-08-25, after making the error it had just caught in someone else's
work.** It found the booklet's trading window inside its own archive columns and
proposed **substituting the trader's window**. Coaching then established that he
trades every session and **the setup is the requirement**, so both versions were
wrong the same way.

> **Noticing that a constant is inherited does not license replacing it with a
> better constant of the same kind. The question is whether the quantity belongs
> in the rule at all.**

**That contains *check against him, not against the playbook* and is stronger than
it.** Checking a threshold against the practitioner still assumes the threshold's
*shape* is right. **Ask both: is this his number, and does a number of this kind
belong here?**

**The naming corollary, and this desk has now watched it fail twice in two days:**
add `gain_to_0700_pct`, never `gain_his_window_pct`. **A column named after a
person's habits inherits those habits when the habits change**, and the rename is
never done at the same time as the behaviour.

### A retraction can make a finding stronger

**The half nobody expects, and it is the reason to retract loudly rather than
quietly.** While the desk wrongly held that he traded only 04:00–09:30, the board
surfacing a name *after* its move had an escape: **a name peaking at 06:00 and
surfaced at 10:00 was outside his hours anyway.**

**There is no such escape now.** He trades every session, so **a name surfaced
after its move is missed at any hour** — the board's lateness is a **defect across
the whole day** rather than a scheduling artifact.

> **The wrong belief was hiding a real problem behind a false excuse, which is the
> most expensive thing a wrong belief can do — and worth more attention than the
> belief itself.**

**So when a claim is retracted, re-read what it was EXCUSING, not only what it was
supporting.** The retraction rule already says to chase every inference resting on
a claim. **Inferences that a claim made harmless are the ones nobody searches
for.**

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
- **THE SETUP IS THE REQUIREMENT. THE SESSION IS NOT.** *His correction,
  2026-08-24, `0595b2c` — and it supersedes an earlier entry here that said he
  trades premarket and not RTH.* His words: **"we can change that. i do sometimes
  trade RH and AH. but the core of the strategy is the same in terms of setups."**

  **He trades premarket, RTH and after hours.** The entry, the absorption gate and
  the exit rule **do not change between them.**

  > **NO RULE, CHECK OR THRESHOLD MAY BE KEYED TO THE SESSION.** Time of day is a
  > **reporting dimension**, and becomes a rule only if the record shows one and he
  > adopts it.

  **THE LINE THAT SETTLES ARGUMENTS ABOUT THIS RULE, R&D 2026-09-04:**

  > **A threshold justified by RTH data and applied uniformly is not
  > clock-keyed. A threshold computed FROM the clock is.**

  *Reached by R&D correcting its own over-reach before the evidence arrived.*
  It had argued a duration threshold carries an implicit unit — five minutes
  being 1.5% of premarket and 0.5% of the full day — and that the repair, if the
  rule misbehaved outside premarket, would be to rescale it as a fraction of the
  session. **That repair is wrong, and the reason dissolves the question:
  the rule has no window.** It is evaluated every minute, continuously. A name
  quiet for five minutes at 14:00 is quiet for five minutes; nothing about the
  session's total length reaches that name's tape. **Scaling by session length
  would make the rule depend on a quantity the phenomenon does not contain —
  which is not a rule that LOOKS clock-keyed, it is one.**
  The 330-versus-960 distinction was a property of **the window it was measured
  in**, not the window the rule operates in.
  **The real effect is right-censoring** — a name dying at 19:55 has five
  minutes to revive and one dying at 09:00 has eleven hours — already quantified
  (four hours of required remaining session lifts 47.9% to 59.4%), and the fix
  for censoring is to exclude or flag short-remaining episodes, never to rescale
  a threshold. What survives: a threshold calibrated in one window **cannot be
  read naively in another**, which is why by-session reporting stays. If the
  rule does behave differently elsewhere, **measure the threshold at those times
  and adjust on that evidence** rather than deriving it from the clock.

  **AMENDED 2026-09-03 — THE DESK'S MARKET-SIDE SCOPE IS PREMARKET.** *His
  instruction, asked directly whether premarket was the board's selection window
  or his trading window: "let's keep everything to premarket."* Recorded as a
  **product scope decision**, and the two statements are reconcilable rather
  than contradictory — **the board hunts and measures premarket; how he is
  GRADED is still not keyed to the clock.** Both survive only if that line is
  held, so it is stated here rather than inferred.

  **What it re-scopes** (readers named, per the deletion rule): the revival
  study and any board-presence threshold, to premarket minutes only, with
  episodes not straddling the open. **What it puts out of window rather than
  wrong:** Q6's verdict, measured on RTH excursions, and any scorecard
  instrument using full-day outcomes — these need re-running on premarket
  before being quoted as current, not retracting. **What it must NOT silently
  reach:** Coaching's grading of his own fills. **The fills record already
  contradicted a premarket-only reading once — see the Coaching paragraph
  below, which is where that evidence belongs and the only place it should
  sit** — so narrowing personal-record grading to premarket would stop
  measuring part of what his own record shows works. **That narrowing requires
  his separate and explicit word and has not been given.** *(Restated at
  Coaching's standard after it declined to put the same figure in a document:
  argue from the principle and point at the record rather than re-quoting it —
  a second copy of a personal figure is both a privacy cost and a copy that
  can drift.)*

  **THE ERROR THIS REPLACES IS WORTH KEEPING, because it was made twice and the
  second time by the thread that caught the first.** The booklet's window
  (`07:00–10:00`, avoid after 11:00) was Cameron's, not his — correct. **The fix
  applied was to substitute HIS window, `04:00–09:30`, and that was the same
  mistake with different numbers.** *"Is 07:00–09:30 where the money is made"* is
  as clock-bound as the sentence it replaced. **Both were rules about the clock,
  and the clock was never the rule.**

  **And the record contradicted it on day one.** **Coaching holds fill-level
  evidence from the first imported session that runs directly against the stated
  window** — the figures live in its report output, outside the repo, and are
  deliberately not restated here. One day is not evidence of a rule — **it is
  direct evidence against grading him on the clock, in either direction.**
  *(Figures removed 2026-09-03 under the rule above: a rule he set may be
  written down, a number the market gave him may not. Found by R&D after an
  earlier fix reached the amendment that cited this passage and not the passage
  itself — one fact in two places, one correction.)*

  **R&D's market-side figures stand and mean something narrower than they were
  used for**: of 95 movers, 27.4% peak 04:00–06:59, 18.9% in 07:00–09:29, 7.4% in
  09:30–09:59. **That is where the OPPORTUNITIES are. It is not where his trades
  have to be**, and anything built on the second reading needs re-checking.

  **Every threshold inherited from the playbook carries its provenance** —
  `lib/coaching/fills/rules.ts` marks each `stated` or `booklet`, and the report
  prints the booklet-derived ones at the foot of every run. **Three remain
  unverified against him: $0.25/share risk, 120s hold, 3 strikes.**

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

## This host is UTC+2. Every tool timestamp is SIX HOURS ahead of New York

**Found 2026-08-24 after two threads independently reported the market as open or
about to open when it was 04:45 ET.**

`date` on this machine returns **Central European Summer Time**. So a vitest
header reading `10:36`, a shell timestamp reading `10:47`, a commit time reading
`10:49` — **all CEST, all six hours ahead of the trading day this desk exists
for.** `10:45` feels like mid-morning. **It is 04:45 ET, five hours before the
open.**

**Ops's version, and it is why this is worse than a stale clock rather than merely
bigger: a four-hour-stale reading at least looks odd against the surrounding
conversation. `10:45` does not look like anything.**

**The failure is not arithmetic, it is that the number needs no conversion to look
plausible.** A wrong timezone produces a time that is *reasonable*, so nothing
prompts a check — which is why it survived a whole night and produced two threads
standing down from work they had five hours to do.

**So: never infer the trading day from shell or test output.** Read it explicitly:

    date -u                                  # UTC, unambiguous
    node -e "console.log(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}))"

**And stamp what you read**, per the rule this document already carries — *"as of
04:45 ET"* costs three words and cannot mislead.

**THE CODEBASE IS CLEAN AND THIS WAS CHECKED, NOT ASSUMED.** Research grepped
`lib/` and `worker/` for host-local date methods excluding `getUTC*`: **two hits,
both `date.setMonth(date.getMonth() - months)` in SEC lookback windows**, where a
few hours at a month boundary is immaterial in a months-long window. **Everything
else goes through `etDateString` and `sessionEndUtc`, which take the zone
explicitly.** Production runs elsewhere, so a host-zone dependence would behave
differently in the two places and bite in only one — worth having asked.

**The hazard is entirely in reading tool output, and it will recur every session on
this machine.**

**One discipline point from the same exchange: two threads made the same mistake
and NOT necessarily for the same reason.** One inferred the day from its own shell;
the other aged a relayed phrase and reported the aged version as observed.
**Matching symptoms are not a shared cause, and assuming they are is how one fix
gets written for two problems.**

**The sentence that catches it either way: `PREMARKET` means premarket CAPTURE is
live, not that trading is.**

## A GREEN TEST PROVES NOTHING IF THE FIXTURE SILENTLY DROPPED THE FIELD

**Design, 2026-09-04, catching itself inside its own build.** Writing the test
for a contradiction between a chip's wording and a displayed float, it wrote a
fixture as `sheet({ structure: 'UNKNOWN STRUCTURE', float: '5,200,000' })`. **The
sheet fixture accepts no `float` key.** The row was built with no float at all,
so the test asserted a contradiction **it could not construct — and passed.**

**VITEST DOES NOT TYPECHECK, so an excess-property mistake in a fixture survives
a green run.** Every thread's tests are exposed to this. The property that makes
it dangerous is that it fails in the reassuring direction: a fixture key that
silently vanishes produces a test that cannot fail, and *cannot fail* renders
identically to *passes*.

**The standard that caught it, and the one to hold:**

- **Assert the SETUP before asserting the behaviour.** The fixed test asserts
  `row.displayedFloat` is 5,200,000 **before** it asserts anything about
  wording. A setup assertion is what converts a silent drop into a red run.
- **Mutation-test a new test against the bug it exists to catch.** Design ran
  both new tests against the OLD sentence and confirmed they fail. **A test that
  has never been seen to fail is a hypothesis, not a check.**

**This is the desk's own "a check that cannot fail is not a check" arriving in
the FIXTURE rather than in the assertion** — and it is the harder version,
because the assertion is visibly correct and the defect is one layer beneath it
in an object that typechecking would have rejected and the runner does not.

## Facts every thread starts from

As of the last session, **2026-08-23**:

- **`main` is the trunk and the only branch.** The long-lived
  `session-aware-discovery` branch was fast-forwarded into it on 2026-08-23 and
  deleted; nothing was lost. If you find a session assuming `main` is stale,
  that assumption expired.
- Production is **`fd9556f`**, schema **v21**, on Lightsail `98.85.49.227`
  behind CloudFront `https://dwwep02jje2ag.cloudfront.net/`, Basic Auth with two
  logins.
- **The Google Sheet is written by TWO ChatGPT scheduled tasks as of
  2026-08-23, not by the trader** — `After-Hours Momentum Recap` at 22:00 and
  `Premarket Momentum Confirmation` at 06:10. *Corrected 2026-09-04 by the
  trader: this bullet said FOUR and was the historical state. Two were paused
  on 2026-08-23 and the very next bullet says so — an index contradicting its
  own body, in the section every thread reads first, and this seat quoted the
  stale half to him.* The paused pair — `9:25 Opening Spike Assessment` and
  `Close & Learn Momentum` — ran at 09:25 and 16:15 and are reversible in one
  click; see the DECIDED bullet below. He has never
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

- **Retiring the Sheet also silently changes risk chips, and nothing will
  announce it.** *Design, 2026-09-03, from the d8794da null reading (its
  `9923d1c`):* rows whose dossier says CAUTION but whose Sheet structure state
  says DIRTY_FLOAT render the Sheet's verdict first — two of six board rows
  that day. **The day the Sheet's structure state retires, those rows flip to
  STRUCTURE CAUTION with no deploy and no signal.** Whoever plans the
  retirement adds this to the reader list.
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
- **A rule he set may be written down; a number the market gave him may not.**
  *Coaching's formulation, 2026-09-03, after Integration re-quoted one of his
  results into a charter and Coaching had declined to.* A threshold he chose is
  a **decision** and belongs in the record; a P&L, a hit rate, a day total or a
  trade size is a **personal financial record** and belongs only in the report
  output, which lives outside the repo by construction. `$0.15–$0.25` in
  `coaching.md` is his stated rule and is fine; a dollar he actually made is
  not. **Two independent reasons want the same thing here:** privacy, and the
  fact that a second copy of a figure rots — a stale P&L quoted by a future
  session as current is worse than a private one.
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
