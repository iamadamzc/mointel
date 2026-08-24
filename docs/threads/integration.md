# Thread: Integration

**Owns the seams.** The charters themselves, decisions that span threads, and
the things that are nobody's job until they break something.

Opened 2026-08-23, after three cross-thread problems in two days that no single
thread would have caught.

## Why this exists

Splitting work into five threads solved legibility and created a new gap:
issues that live *between* threads have no owner. The evidence, all real:

- **A working-tree collision.** R&D wrote `lib/archive/` and modified
  `package.json` while Ops was running deploy gates in the same directory.
  Ops handled it correctly by staging only its own files — but that was
  discipline, not a guarantee.
- **A false safety claim in a charter.** `ops.md` stated that `80437c3` and
  `372f5eb` were both pinned. Only `372f5eb` was. It came from a deploy
  transcript rather than `pins.sh list`, and nobody would have checked until a
  rollback failed.
- **A hazard spanning a unit file and a prune script.** The market worker's cwd
  resolves at process start, so it had been running from a release directory
  that `prune.sh` was about to delete. Neither file is wrong on its own.

## Scope

- `docs/threads/` — the charters, and keeping them true
- Decisions that cross threads: process, structure, shared conventions
- Reconciling contradictions between what two threads believe
- Reading other sessions' transcripts to answer "what has already been decided"
- Corrections. When a charter or spec is found to be wrong, this thread makes
  sure the fix lands in the document and not only in a chat.

## Not this thread

- **Any product work at all.** No code, no deploys, no analysis. If this thread
  starts building something it has become a sixth worker and stopped being
  useful.
- Assigning work. Threads are not managed; they own their areas and hand off
  explicitly. This thread maintains the structure that makes handoff possible.

## `lib/market/` has no owner, and it is the second found this way

**Found 2026-08-24 while routing R&D's universe-capture handover.** No charter
claims it. Research's scope is `lib/research/`; Design's is `components/` and
`app/`; R&D's is `lib/archive/`; Ops owns *running* the desk, not the code.
**`lib/market/` — the demand engine, the store, session, rvol, board, cycle — is
unclaimed, and it is the heart of the product.**

That is the second module found unowned by the same route: `lib/review/` was the
first, surfaced when Ops asked whether a fix in it was Design's or its own. Both
times the gap was invisible until a specific piece of work needed a home. **A
module nobody claims is not noticed by anyone reading the charters — only by
someone holding a task and asking who takes it.**

Routed the immediate work rather than the module: the universe capture goes to
Research, on the same basis as `lib/review/` went to Ops — it is the only thread
already writing there, having added `lib/market/cycle.ts`. **The module itself
is deliberately left to the trader.** `lib/review/` was operational machinery and
small; `lib/market/` decides who does most future work on this desk, and that is
larger than a routing call.

## A relayed delegation does not answer a question put to him directly

**Ops's rule, held all night including twice when the relay turned out to be
right, and it is correct.** It put the deploy to the trader directly. A general
"make the call on the rest" arriving through this thread **cannot answer a
prompt Ops made to him** — it costs one word, and it is the difference between
his decision and my inference about his decision.

**Order-and-process being delegated does not extend to a production action a
thread has already put to him.** That boundary is not doubt about the relay; it
is the same principle as everything else recorded here — do not let an inference
stand in for the thing itself, especially when the thing itself is cheap.

**And I told it to "deploy HEAD", which was not executable.** Ops had gated
`a02262e`; HEAD by then carried `34c720f`, a surface switch it had not gated and
which had not been handed to it. Shipping that would have broken its own rule —
**all four gates green at the sha that ships** — which exists because a gate on
a different tree is not a gate.

**Third time today I named a moving reference as though it were fixed.** HEAD,
a clock, a `git status`. A ref is a question, not an answer: **name the sha.**

**And gate staleness is worse than I framed it.** I called it a race to avoid by
gating a clean tree; Ops measured that **HEAD moved three times during a single
gating session** — `f7b8ef5`, then `a02262e` already stale, then `161f15f` while
`npm ci` was running. On this repo **any gate that is not pinned is stale before
it finishes**, so a clean tree only moves the race. A reusable worktree pinned
at a sha is the only version that works, and once it holds real `node_modules`
it re-points with `git checkout` and re-gates without reinstalling.

## Do not ask the trader to arbitrate work that is in motion

**Corrected by him twice within twenty minutes on 2026-08-24, and the second
correction was the real one.** The first fault looked like staleness — I
reported a deploy as clean without checking what anyone was doing. The fix
seemed to be *check first*. It was not enough.

I checked, found Design mid-edit, and then **asked him to decide whether to hold
the deploy until Design committed.** Design committed while I was writing the
question. Both things I put to him resolved themselves before he read them.

**Checking more often does not fix this.** Any state I check is already old when
he reads it, and a thread mid-execution will finish without him. The failure is
putting a *live* state in front of the one person who cannot act on it faster
than the threads can.

So: **only bring him what is settled and needs a decision, or genuinely blocked
on him.** Work in flight needs to finish, not to be arbitrated. If the answer
would change depending on what a running thread does in the next two minutes,
it is not a question for him — it is a question for the thread, or for this one
to decide under the order-and-process delegation.

His attention is the scarcest resource on this desk and the only one that does
not parallelise. Two of tonight's questions spent it on outcomes that arrived
without him.

**And shorter.** Volume is part of the same fault: a decision buried in a status
report costs him the reading as well as the deciding.

## Reading a thread means reading what it SAID, not what it committed

**The trader's correction, 2026-08-24, after this failed repeatedly in one
night.** I checked which sessions were running, read the commit log, and called
that checking the threads. **Commits do not carry questions.**

What it cost, all in one evening:

- Research asked *"Ship the research release, or hold?"* and I walked past it
  twice. **The trader had to point at it.**
- Design's two questions reached me only because he told Design to come to me.
- Ops's deploy question sat unanswered while I reported *"nothing needed from
  you"*.
- I relayed *"noticeably fewer cycle labels"* when the number was **231 of
  231** — an adjective passed on unmeasured, and the difference between an
  expected state and an incident.

**The irony is exact.** I required every thread to end with `## What I need
from you` so his attention would not be spent hunting decisions in prose — and
then did not read that section. The convention protected him from them and made
**this thread** the place asks went to die.

**So, on every check, without exception:**

1. **Read the last message of every thread**, not the commit log. The log tells
   you what a thread finished. Only the message tells you what it is waiting
   for.
2. **Read its `## What I need from you` first.** It exists because I asked for
   it. Skipping it is worse than never having required it.
3. **Read what it said AND what it committed.** They diverge — Design's
   `fecbba6` carried a phrase my own correction had already retracted, and only
   the commit showed it.
4. **Every ask gets one of three outcomes, none of them silence:** answered here
   under the delegation, escalated to him, or declined with the reason said back
   to the thread.
5. **Never report "nothing needed from you" without having read all four asks.**
   That sentence is a claim about four threads and I have made it while one was
   waiting.
6. **Relay numbers, not adjectives.** If a thread hands over a qualitative
   claim, ask what it is quantitatively before passing it on.

## Relaying between threads

**This thread is the message bus, as of 2026-08-23.** The shared README carries
the rule; the obligation it creates is here.

Threads cannot all address each other and the trader was being used as the
transport. He is not one. When a thread sends something for another thread:
relay it promptly, add the context the receiver is missing, and put anything
durable in a charter rather than leaving it in two transcripts.

**The bus produces findings, not just faster delivery.** Ops found the SIGKILL
because a relayed message sent it to read a log it had no other reason to open.
That is worth knowing when weighing whether a relay is worth the hop: a direct
report answers the question asked, while a relay carrying context from a third
thread sometimes sends someone somewhere they were not going.

**Relaying is not repeating.** A bare forward is worth little — the value is in
what the receiving thread does not know: that the number it is about to act on
was retracted, that the file it is being handed is owned by nobody, that the
token it was given expires four minutes before it needs it. If a relay adds
nothing, say so and forward it anyway; if it needs a correction, correct it in
the relay rather than after.

**And relaying is not deciding.** A thread routing a decision through here is a
thread adding a hop between itself and the trader. Push those back to
`## What I need from you` where he will see them.

## LIVE STATE — rewrite or delete this section, never let it go stale

*Written 2026-08-24 ~00:40 UTC because this thread's context was at 96% and a
compaction loses what is not on disk. Everything below expires. **If you are
reading this after 2026-08-24, verify every line before acting on it.***

**Re-verified 2026-08-24, between 00:43Z and 00:50Z, by the successor session,
line by line.** All
four session ids below are correct and all four threads answer to the titles
given. What had already changed in the fifteen minutes since it was written is
marked inline — which is the argument for the section, not against it.*

**A note on the stamps above, because this section is where a stale clock does
its damage.** Several of them were first written as invented precision — 00:52,
00:53, 00:55, 00:58 — when the only clock this session had actually read was
00:43:28Z. Nothing turned on the difference, and that is exactly why it is worth
recording: **a fabricated timestamp is indistinguishable from a read one until
something depends on it**, and the deploy preflight's checkpoint arithmetic does
depend on it. They are now anchored to things that can be checked — commit
times, and the one clock read. **Stamp from a reading or from a commit, never
from a sense of how long the work took.**

**STATE AT 01:45Z, 2026-08-24 — read this block first; everything below it is
older.**

- **Production is `a259e8c`**, live 01:37 UTC, gated at that exact sha (1278
  tests, lint, build, typecheck), capture verified at directory scope. `c48e199`
  shipped before it at 01:30:37. **Two deploys, two sub-second stops** — 01:30:27
  to 01:30:27 and 01:37:06 to 01:37:06, against 31 seconds and a hard kill
  before the fix. `97f198d` confirmed rather than consistent-with-one-run.
- **The market worker is untouched across both** — pid 129202, `NRestarts=0`,
  still on `fd9556f` behind its pin. Eight deploys now.
- **The overlay's effect cannot be seen tonight and that is not a failure.** The
  Discovery board is empty: 8,653 `ticker_session` rows seeded for 2026-08-24,
  **0 with `rvol_rank`**, against 2,821 on the 21st. Nothing has traded, so
  `/api/market` returns `discovery.rows: 0` and there is nothing for the overlay
  to act on. The six phase names and the retracement figure are **gated on a
  populated board**, not on the deploy.
- **`/api/dashboard` is the Sheet-merged view and carries no `intelligence` key.**
  Its `cycle` is the Sheet's — the overlay feeds the desk read at
  `deskRead.ts:528`. Checking the wrong endpoint gives a confident wrong answer
  **in either direction**. Third instance today of the Sheet's cycle vocabulary
  sitting where the dossier's is expected.
- **OPEN, ROUTED TO RESEARCH, AND IT HAS A MONDAY DATE: the guard and the overlay
  disagree about what a trustworthy bar is.** `ensureDailyHistory` refuses a bar
  whose `fetchedAt` precedes its own session end; **`overlayLiveCycle` applies no
  such test** — verified at the live code, it takes `readDailyBars(...)` and
  computes. So the 42 symbols holding a partial Friday bar render a cycle from an
  unfinished session from Monday's open until each is re-analysed and healed,
  **because board render and re-analysis are independent.** Ops's `latestDate`
  discriminator does not flag them: a partial *Friday* bar carries a prior date
  and reads clean. **Two definitions of a usable daily bar, one in the write path
  and none in the read path, four commits apart on the same night.**
- **Monday has four readings, all Ops's:** the WAL under real write pressure,
  `messageAgeSeconds` off null, the **per-symbol** healing check on the 42, and
  the stop time on whatever ships next.
- **Deploy delegation is live and confirmed by the trader directly.** Next
  instruction is a new gate: six non-docs files above `a259e8c`, including
  `worker/research.ts`.



- **Both item 16 defects are CLOSED.** Guard at `e9e0a9e`, healing folded in;
  read-time cycle at `a259e8c`. The backfill was cancelled and is not coming
  back.
- **The read-time fix landed as an OVERLAY, not a move**, and that is Design's
  doing. `overlayLiveCycle` spreads into a new object and leaves the stored
  dossier untouched, so the `asOf` boundary at `pipeline.ts:363` still governs
  replays and archived assessments while the live board tracks the tape. A test
  asserts the non-mutation directly. **No fetch enters the read path.**
- **Deploy target is `a259e8c`**, not the `c48e199` Ops originally gated — Ops is
  re-gating in its pinned rig while it waits. Non-docs content of
  `a5a3a98..a259e8c`: `lib/market/readModel.ts`, `lib/research/history.ts`,
  `lib/research/historyFetch.ts`, and two test files. **Still unshipped;
  production remains `161f15f`.**
- **The deploy is with the trader and is the only thing blocked on him.**
- **`dossier.cycle`'s deletion is now a reader inventory, not a plan.** Four real
  sites in `worker/desk-assessments.ts` — `:239`, `:240`, `:275`, `:308`, and
  `:239` fires first — plus four false positives, all of them the same
  Sheet-versus-dossier name collision. Writer made safe in the same commit as the
  deletion, never after.
- **Design's verification plan changed shape and check 4 is retired.** Its own
  correction, and it is right: if both commits ship together, check 4 *cannot be
  run at all* — it needs a row with a sheet cycle AND no computed one, and the
  overlay removes the second half everywhere there are two or more stored bars.
  **That is a gain.** Check 4 was a weak positive — the absence of the old answer,
  never the presence of the new one. It is replaced by the six phase names and
  the retracement figure, which I had called not-falsifiable an hour earlier and
  which are **strictly stronger**: `DAY 1`, `OFF HIGH` and `PRIOR RUN` are strings
  the old code cannot produce on any row under any data, and they arrive on every
  row at once instead of trickling. The sitting to plan is: deploy, then check 3
  and the phase names together.
- **The ping rule is live and working.** Four unprompted pings in the first twenty
  minutes, and three of them carried findings rather than status.

**Reaching the threads.** Send to the NAME from `ListAgents`, or by session id
via `mcp__ccd_session_mgmt__send_message`. Ids are stable, names are not:

| Thread | Session id |
| --- | --- |
| Ops | `local_c4fc69df-3427-45d9-97d1-3935510ac8bb` |
| Research | `local_2163766c-fea1-4d95-b86b-c78930fd4771` |
| Design | `local_c6befb28-5c0b-4f3b-b10d-5fefcd46fd58` |
| R&D | `local_61f36ca0-906c-4624-947a-c3c5603257ad` |

**Naming, and it is load-bearing rather than cosmetic.** The other threads
address this one **by the session title**, which appears in their `ListAgents`.
Design established that the title works and that the `from=` id on a
cross-session message does **not**. So:

- **A new Integration session must be titled `Integration`.** Until it is, it
  appears as `mointel-NN` and **no thread can reach it** — they are all holding
  `Integration` as the address. An untitled session is a bus nobody can board.
- **The bracketed ref is per-session and changes.** The previous session was
  `Integration [0338b5]`; that ref dies with it. Threads should send to the bare
  name and only append a ref if `ListAgents` shows two rows sharing it.
- **Two live Integration sessions is the failure case.** Identical names make
  sends ambiguous, and a message can land in the dead one. **End or rename the
  outgoing session before or immediately after the new one is titled.**
- **A new session's first action is to announce its address** to Ops, Research,
  Design and R&D — one line each. They will not discover it, and a thread
  holding a handover for an unreachable bus goes to the trader instead, which
  is the thing this role exists to stop.

*Earlier precedent: this thread appeared to peers as "Project Manager" for its
first hours, which asserted an authority the charter explicitly denies — threads
defer to a manager. The title is what peers see; treat it as part of the
charter.*

**CANCELLED BY THE TRADER, 2026-08-24. His words: "fix the path".** *Everything
below this line about the backfill is history; it never ran. The section is kept
rather than deleted because the reasoning that killed it is the useful part.*

**He killed it by challenging the premise, which nobody else had.** His question
was why Alpaca should be called for 231 names when only the ones reaching the app
matter. Checking it made the case against the run stronger than he put it:

- **`resolveCycleHistory` has exactly one call site outside its own module** —
  `pipeline.ts:365`, inside the accepted-analysis path, after the model call.
  There is no model-free way to write `computedCycle`. So the backfill had to
  force a full model re-interpretation per symbol, and **the ~2.6M input tokens
  were the toll for reaching an arithmetic assignment**, not the cost of the
  cycle. The cycle is a pure function over daily bars and costs nothing.
- **The values would have decayed.** `pipeline.ts:194` returns the existing
  dossier on the reuse path, so a stored cycle refreshes only when the EVIDENCE
  fingerprint moves — filings, not price. `research.md` item 16 already said it:
  *"the stored cycle freezes at the last filing. STAK would carry DAY_ONE from 24
  July for the rest of that week."* A column correct on Monday morning, drifting
  silently from the open.
- **Research's item 16 fix removes the need for a backfill of any size.** Compute
  at read time. And the read path is **synchronous** — `readDailyBars`
  (`history.ts:62`) and `readCurrentAnalyses` (`readModel.ts:622`) are sync
  better-sqlite3 calls — so a read-time cycle costs one arithmetic pass over
  stored bars and **makes no Alpaca call at all.** Fetching stays in the worker,
  for the names being analysed, which is exactly what he described.

**THE DEADLINE MOVED; IT DID NOT DIE, and "backfill cancelled" reads like
"clock gone".** The backfill's own 08:00Z deadline is void. **The live-path
partial-bar exposure Ops escalated at `2830ca3` is untouched and still begins at
Monday's open.** Nothing about this decision reduces it. So the item carrying the
clock is now the **partial-bar guard**, not the read-time move.

**THE GUARD IS DONE: `952f9e1`, committed and pushed 01:11Z.** `lastSettled
TradingDate` is one concept doing both jobs — which bar may be STORED and whether
the cache is CURRENT — because they are the same question asked twice. The cache
test moves from `stored === today` (a **UTC** date) to `stored >= settled` (ET),
and the store write filters `rows.filter(r => r.tradingDate <= settled)`. The
boundary is the **20:00 ET session end, not the 16:00 close**, chosen against the
unverifiable: nobody can establish tonight whether Alpaca folds extended-hours
trades into a `1Day` bar, and four extra hours cost a daily-grain measure nothing
while guessing wrong stores a bar that is still moving. Named as what is
ACCEPTED, per the allowlist rule. Holidays deliberately unhandled and failing in
the redundant-fetch direction.

**Deploy target is `952f9e1`, and it carries both.** Sequencing called here:
one deploy, not two. Outside `docs/`, `a5a3a98..952f9e1` is exactly the guard's
two files, checked at directory scope. Design's checks have their own clock —
review session 13 expires 11:59 ET — and two gates for two wanted changes buys
nothing. Ops was told and offered the reversal.

**MY OWN CLAIM WENT STALE INSIDE THIRTY MINUTES, and it is the section above
this one working exactly as written.** I told Ops and Design that there was *no
code between `a5a3a98` and HEAD, only charter files.* True when measured, false
by `952f9e1`. It was a directory-scope diff, correctly done, against a HEAD that
then moved — **the measurement was right and the tense was wrong**, which is the
whole of *Observations go stale*. Corrected to Ops in the same message that
asked it to deploy, before it could gate on the old sentence.

**Open, and it is Ops's because it needs the box: is the store ALREADY poisoned?**
The guard is **preventive, not corrective**. Item 16 says the live path always had
this defect and only that it *"has not bitten"* — a claim about consequence, not
about whether partial bars are already sitting in `daily_bars`. It is checkable
and the column exists: `fetched_at` (`db.ts:390`). A row whose `trading_date`
equals the ET date of its own `fetched_at`, with `fetched_at` before 20:00 ET
that day, was written mid-session.

**Checked before raising it, and it is a size question rather than an incident.**
`upsertDailyBars` is `ON CONFLICT(symbol, trading_date) DO UPDATE`
(`history.ts:47`), so a pre-existing partial row is overwritten by the next fetch
that happens once `settled` has moved past its date. The change from `===` to
`>=` **delays that healing by about a day; it does not remove it.** Handed to
Research to record in item 16 in its own words, because the next reader of `>=`
will ask the same question and should not have to re-derive it.

**THE STORE WAS ALREADY POISONED, AND THE DEPLOY TARGET MOVED TWICE.** *Both
within two minutes, 01:16–01:17Z.* Ops ran the read-only `fetched_at` check this
thread routed to it and found **133 rows across 133 symbols** written mid-session
— `trading_date` equal to the ET date of their own `fetched_at`, fetched before
20:00 ET. The load-bearing part is not the total: **42 are Friday's, and those 42
are exactly the 42 symbols whose latest bar IS Friday. Every symbol holding a
Friday bar holds a partial one.** `c48e199`.

**Ops traced `952f9e1` through Monday and found it protects the rows it exists to
remove.** At Monday premarket `lastSettledTradingDate` returns `2026-08-21`,
those symbols hold `stored = 2026-08-21`, `stored >= settled` is true, nothing
refetches — **the partial Friday bar stands all Monday and any cycle computed
from it uses it.** Research found the same defect from the other end, tracing a
partial *Monday* bar surviving all of Tuesday's premarket and session.

**Both threads produced the same repair fifteen seconds apart and neither could
see the other.** Research's `e9e0a9e` at 03:16:44 local; Ops's `c48e199` at
03:16:59, which names `fetched_at` as *"the improvement it is one column away
from"* and says it *"would have refetched these 133 on first contact"* — of a fix
already committed. The skip condition is now both conjuncts:
`stored.tradingDate >= settled && Date.parse(stored.fetchedAt) >=
sessionEndUtc(stored.tradingDate)`. A bar written before its own session ended
fails the second whatever date it carries, is refetched, and is overwritten on
conflict.

**Ops's `latestDate` discriminator does not catch these, and that limit outlives
the fix.** It flags a row whose `latestDate` equals the current trading date; a
partial *Friday* bar carries a prior date and reads clean. So the stamp separates
a cycle computed today from an unfinished session, and says nothing about one
computed from a bar that was unfinished when captured.

**DEPLOY TARGET AT 01:17:47Z IS `c48e199`.** Non-docs content of
`a5a3a98..c48e199` at directory scope over the whole tree: `lib/research/
history.ts`, `lib/research/historyFetch.ts`, `tests/research/historyFetch.test
.ts`. **HEAD moved four times in twenty minutes tonight**, so this is stamped
rather than stated.

**Routed under the delegation, both pieces of item 16 to Research, in this order
and the order inverts the obvious one:** the guard FIRST because it has the
clock and fails closed whether or not Alpaca returns a partial `1Day` bar in
premarket; the read-time cycle SECOND because it has no deadline and its absence
is a blank column, which is honest.

**The ownership call, and item 16 slightly overstates the seam.** It records the
read path as having *"became Ops's in the 2026-08-24 split"*. True of
`lib/market/store/researchRepo.ts` — but its caller is `readModel.ts:622`, and
`lib/market/readModel.ts` is not in `store/`, so it is **Research's** under the
same split. Either way the work is Research's on the split's own test — *does it
define, migrate or version a table? Ops. Does it compute? Research.* It computes,
and there is no schema change, so the schema-fails-on-the-box risk that earned
Ops `store/` does not arise. **Ops reviews and deploys; Ops was told and offered
the call back.**

---

**HISTORICAL FROM HERE — the backfill as it stood before it was cancelled.**

**NOT IN FLIGHT — BLOCKED ON THE TRADER, WITH A HARD DEADLINE.** *Corrected in `91000c1`
(00:50:32Z): this section said "in flight" and it has not started.* Ops is to run a forced
`research:interpret` backfill over 231 dossiers to populate `computedCycle`,
**before 08:00 UTC 2026-08-24**. After that a partial Monday daily bar gets
stored dated today, `latestDailyBarDate` then equals today, and
`ensureDailyHistory` short-circuits forever — **the partial bar is locked in and
no corrective pass reaches it.** Cost ~2.6M in / 0.9M out plus 231 Alpaca REST
calls on the market worker's budget. Ops executes, Ops takes both WAL readings
(baseline 531,574,792). **Research cannot run it — no production access.**

**AND THE BACKFILL DOES NOT INOCULATE AGAINST THE PARTIAL-BAR LOCK-IN.**
*Research, in `54d8c23` at 00:48:10Z; verified here at the lines rather than
relayed.*
`ensureDailyHistory` (`lib/research/historyFetch.ts:32`) short-circuits on exact
string equality between `latestDailyBarDate` and `new Date().toISOString()
.slice(0,10)` — a **UTC** date. A run tonight stores bars dated **2026-08-21**,
the last trading day; UTC today is **2026-08-24**. Not equal, so Monday's live
re-analyses refetch exactly as they would have without it. **The backfill
neither causes the lock-in nor prevents it — all three scope options carry
identical exposure.** It would be natural to assume otherwise, and Ops's own
option 3 was framed as *"arguably the safer-looking board"*; that half does not
hold and Ops was told before the trader answered. What survives of Ops's
argument is a different axis and is untouched: backfilled-correct and
Monday-possibly-wrong cycles are indistinguishable on the board, which is about
running versus not running rather than about 148 versus 231.

**AND OPS'S SECOND ARGUMENT IS RETIRED TOO — THE DISCRIMINATOR WAS ALREADY
STORED.** *Research, verified here end to end.* Ops held that a backfilled-correct
cycle and a Monday-partial-bar one are indistinguishable on the board. They are
not: `CycleArc.latestDate` (`lib/market/cycle.ts:143`, assigned `latest
.tradingDate` at `:330`) is the trading date of the last bar the cycle was
computed through, and it reaches the stored dossier —
`CycleResult` (`:215`) → `CycleHistory.current` (`:365`) →
`computedCycle` (`lib/research/types.ts:563`), written at
`pipeline.ts:365`. **A cycle computed tonight is stamped `2026-08-21`; one
computed Monday from a partial bar is stamped `2026-08-24`, the same date as the
session in progress.** A row whose `latestDate` equals the current trading date
was computed against an unfinished session.

**The step worth recording is which half each thread verified.** Research's
evidence was an arc computed against production bars — necessarily, since 0 of
231 dossiers carry the field, so no stored one existed to read. That left
**persistence** unchecked: whether `latestDate` survives onto the dossier or
lives only in the computation. It survives, by the chain above, and that was the
step where the claim could have failed. **One limit, stated rather than
absorbed: a `NO_CYCLE` result has no `latestDate`, so this is every row with an
arc, not every row.**

**So both arguments Ops offered for "don't run it" are retired** — the safety
half by the inoculation finding, indistinguishability by this — and what remains
behind that option is token cost alone. What remains between 148 and 231 is
coverage against contention, which is Ops's and which nothing tonight touched.
**Research's general form is the durable part: before concluding two states are
indistinguishable, check whether the data already separates them.** The
discriminator existed, was not built for this, and nobody had looked for it. It
is the fourth observable-versus-failure problem the desk hit in a day and the
first where the answer was already in the store.

**It is blocked on one question and one only: scope.** Ops has gated everything
and put the choice to the trader directly — 148 tickers (~1.7M in / 0.6M out,
148 Alpaca calls) against all 231 (~2.6M / 0.9M, 231 calls) — because he
approved it before the token number existed. Ops's words: *"Everything is ready;
one word and I start."* **Nobody is waiting on anybody else.** Research had
raised a possible deadlock — Ops signalling it for the second WAL reading — and
Ops killed it outright: *"No deadlock from me. I'll run it and take both WAL
readings around my own run."* Relayed to Research in the same window so it is not
holding.

**Monday 04:00 ET, two instruments, both Ops's, both need nobody present:** the
WAL sample under real write pressure, and `messageAgeSeconds` coming off null
for the market worker's first open since its 01:27 restart on the 23rd. The
`computedCycle` progress meter is **retired** — it reads the same whether
research works or not.

**Decided, not started:** the float build (`research.md` item 14) in a fresh
Research session.

**~~The read-time cycle move plus the partial-bar lock (item 16).~~ ESCALATED BY
OPS, AND THE ESCALATION IS AGAINST ME.** *`2830ca3`, committed 00:36:14Z.* I recorded it
here as **not urgent before Monday**. Ops's judgement is that **it is Monday**,
and the reason is exposure rather than code: `computedCycle` shipped in
`161f15f`, so from Monday's open every re-analysis of a moving name runs
`ensureDailyHistory` and none holds a bar dated today, so every one fetches. It
was latent only while nothing re-analysed mid-session with a cycle depending on
the bars, and tonight's deploy ended that. **What decides the size is
unverified and untestable tonight** — whether Alpaca returns a partial `1Day`
bar during premarket; the market is closed, so a call now proves nothing about
08:00 UTC. Ops's framing of the cost is the part to carry: a blank column says
nothing, **a cycle computed on a partial bar reads as a real answer** and is
indistinguishable on the board from a correct one.

**It landed in `ops.md` only.** `research.md` item 16 carries the mechanism and
not the escalation, so a Research session opening item 16 would still read it as
next-session work. Relayed to Research in the same window. **A charter can be corrected
in the wrong document** — this thread's own version of the retraction failure,
and the third instance of it recorded here.

**Design's four verification checks: 2 of 4 done, and the other two are gated on
a deploy rather than on the clock.** *Design's table in `design.md`, last written 00:27:59Z,
is the authority; this is a pointer, not a copy.* PASSED live: the filter chips
reading `All · Day 1 · Frontside · Off high · Backside`, and summary segments
carrying no `warning`. FAILS TODAY: the researched table still shows
`FRONTSIDE — WARNING` on six of nine rows. UNAVAILABLE until `a5a3a98` lands:
a row **with** a sheet cycle rendering `CYCLE NOT ESTABLISHED`.

**The instrument expires: review session 13 is valid to 11:59 ET.** Carried
forward deliberately — I dropped this line in a first rewrite of this section
and put it back, because a review-session expiry is the exact thing this charter
records going missing (*"twelve hours"*, which expired four minutes before the
window it was issued for). At 20:58 ET Sunday that is ~15 hours out and not
tight, but it is the clock the last two checks run against, and it is Ops's
deploy that decides whether they run inside it.

**Two of those four were mine to have got wrong, in the direction that produces
a false pass.** I listed *the six phase names rendering* and *the retracement
figure being of the MOVE* as checkable before premarket. **Neither is.** Both
need a dossier carrying a computed cycle and there are zero, so nothing renders
at `CLOSED` or at 04:00 until re-analysis has run — **gated on the 0→231
counter, not on the clock.** Design caught it. And its opposite correction is
equally mine: I wrote that an empty cycle column is not falsifiable because it
looks identical to a broken one. True in general, **false on a row that has a
sheet cycle**, where `CYCLE NOT ESTABLISHED` is a string only the new path can
produce. The distinguishing case is narrow and it exists.

**Production is `161f15f` per `ops.md:187`, stamped 2026-08-24 00:16 UTC — Ops's
record, not this thread's observation.** This thread has no box access and does
not verify it; Ops confirms the running release at gate time.

**`a5a3a98` is committed, pushed and NOT deployed**, and it is what the two
remaining checks wait on. Design asked for it in its last message (00:27:59Z) and cannot
reach Ops; relayed in this session's opening window. Verified here at directory scope over the whole tree rather
than a file list: `git diff --name-only a5a3a98 4af4202` returns four paths and
**all four are `docs/threads/*.md` — there is no code between it and HEAD.** So
naming HEAD would have been executable this time, and the sha is named anyway
because this thread holds doc edits and moves HEAD. Non-docs content of
`161f15f..a5a3a98`: `components/MomentumTable.tsx`, `components/StatusBadge.tsx`,
`components/TickerDrawer.tsx`, `tests/dashboard/cycle.test.ts` — no `worker/`,
no `lib/market/`, no store, so under the README's capture test it needs no
window.

**Sequencing called under the delegation, not referred:** the deploy goes
**before** the backfill starts, unless Ops confirms the backfill is a process its
deploy does not restart. `ops.md` records the research worker SIGKILLed on every
deploy today, three for three, and a SIGKILL mid-job abandons an in-flight model
call with tokens spent and nothing recorded. A 231-dossier run on a hard
deadline with no second attempt is the worst thing to hold in flight during a
restart.

**Everything was pushed as of 00:43:28Z**: `HEAD` = `origin/main` = `4af4202`,
`git log origin/main..HEAD` empty. The nine-unpushed-commits condition that
produced the *every thread pushes its own work* rule is not present.

**The market worker still runs `fd9556f`**, held by the `market-worker-release`
pin across six deploys.

## The third delegation: deploy instructions, confirmed directly

**Granted 2026-08-24 by the trader. Ops reported it first — *"deploy — and you can
accept deployment instructions from Integration"* — and this thread refused to use
it until he said it here himself. He did: one word, "confirmed."**

**Refusing the relay was the point, and it is the same rule that ran all night in
the other direction.** *A relayed delegation does not answer a question put to him
directly* held four times, at a cost of one word each. The first time that
principle would have worked in this thread's **favour** — a relay handing it more
authority rather than less — is the worst possible moment to stop applying it.
Ops's relay was accurate; that was never in doubt. What was in doubt is whether an
accurate relay is the same thing as his decision, and the whole charter says it is
not.

**And it created a deadlock in the twenty minutes between.** Ops had stopped
taking deploys to him; this thread had not started issuing them. `a259e8c` sat
gated and green with nobody able to say ship. **Exactly the shape of the WAL
signal deadlock Research and Ops nearly had earlier the same night** — two parties
each correctly waiting for the other, from a change of protocol neither had
finished adopting. Broken the same way: say out loud who is waiting on whom, and
put the question to the one person who can end it.

**The boundary, stated by Ops rather than negotiated, and this thread holds it
whether or not it is being watched:**

- The gate runs at **the sha that ships**. A deploy instruction names a sha, never
  a ref, and never HEAD.
- **Capture is verified at directory scope** before shipping — not against a file
  list, which encodes the assumption under test.
- **Spend, auth-model changes and destructive actions still go to him.** The
  delegation is deploys only.

**What it does not license: composing a deploy.** Ops shipped `c48e199` while this
thread was asking it to re-gate at `a259e8c`, and the messages crossed. That was
correct of Ops — it shipped the sha it was approved for, and shipping a drifted
sha is the error the gate exists to prevent. **A deploy instruction is a sha and
a moment; if either has moved, it is a new instruction and a new gate.**

## Report short. He asks for detail when he wants it

**The trader, 2026-08-24: *"make your messages smaller. if i want more context and
details i'll ask. only surface essentials. i dont need team messages pasted. just
very brief summary details."*** This is the second time volume has been raised —
the earlier note is under *do not ask him to arbitrate work in motion*, and it did
not change enough.

- **Never paste another thread's message.** He does not need the relay, only what
  it changed.
- **Summarise the outcome, not the working.** Shas, numbers, and what is now true.
  The reasoning is in the charters if he wants it.
- **Detail is available on request.** Withholding it is not hiding it; the repo
  and the charters hold everything, and he can ask.
- **`## What I need from you` stays last, and stays as short as the rest.**

The failure this fixes is not politeness. **A long report costs him the reading as
well as the deciding**, and the decisions he actually has to make get buried in
material he did not ask for.

## A deploy instruction is a request; preflight is the authority

**Added 2026-08-24 after this thread's first use of the deploy delegation.** I
named `0778533` at 01:57:44Z with `NEXT_DAY_RECAP` due at **02:00**, having never
looked at the checkpoint schedule. **Preflight refused it and caught what I should
have.** Ops did not override, correctly.

**This thread does not compute checkpoint windows.** The schedule is dense — three
premarket scans, open spike, RTH intervals every thirty minutes, close, recap — so
any arithmetic would either block half the day or be done off a clock this charter
has already recorded going four hours stale while planning a deploy window.

So: **instructions are requests, preflight decides, and a refusal is a fact to
record rather than a decision to revisit. This thread never asks for an
override.**

### The guard is now load-bearing for a reason nobody designed

**Ops, same night.** The assessment worker **dies on startup on roughly one deploy
in three** — `SQLITE_BUSY_SNAPSHOT` at `migrate()` inside `withMigrationLock`,
`desk-assessments.ts:380`, exit 1, systemd restarting ten seconds later, three
occurrences in the journal. **The documented fix does not cover it:** the
cross-process lock serialises *writers*, and `BUSY_SNAPSHOT` is a *snapshot*
conflict — web and research reopen the store alongside, and the migrating
connection loses its snapshot. **A lock that serialises writers does not stop a
reader invalidating one.**

Tonight it crashed at 01:55:05 with a recap due at 02:00. **Five minutes,
unplanned, and on a checkpoint that is a permanent hole** — the record only grows
in real time.

**So the 5-minute preflight window, written for mid-checkpoint interruption, also
happens to cover a 10-second crash-and-restart its author never had in view — a
30× margin by luck.** That is the inverse of this document's usual finding, where
a rule names an event that later diverges from its condition. **Record it as luck
anyway:** the margin holds only while the restart is a single clean one, and a
restart loop or a systemd rate limit spends five minutes quickly.

**Not fixed tonight, and that is Ops's call and the right one** — a migration-path
change hours before an open, for a fault that recovers, is the wrong trade.

## Reading other threads

Other local sessions are readable directly — listing them, and full-text search
across their transcripts. Use it to answer *what was already decided* rather
than asking the trader to relay.

Two limits worth respecting. It shows what was **recorded**, not what a session
is currently reasoning about, and it is a snapshot rather than a feed. **The
repo remains the real channel** — a decision that only exists in a transcript is
not a decision any other thread can act on. When something is settled in a chat,
it belongs in a charter the same day.

## The shared working tree

All threads operate on `A:\mointel`. That is a genuine hazard and the rules are
proportionate rather than absolute, because there is one operator and truly
concurrent building is rare.

1. **Never `git add -A` or `git add .`** Stage by explicit path, always. This is
   the single rule that would have prevented every incident so far.
2. **One thread holds uncommitted code at a time.** A thread starting code work
   commits or stashes before handing back. Docs edits by different threads are
   fine concurrently; they rarely collide and never break a build.
3. **Deploys are safe regardless.** `push-release.sh` ships a committed sha via
   `git archive`, so another thread's uncommitted work cannot reach production.
   Verified. The risk is to *gates*, not to the server — `npm test` against a
   half-edited `package.json` is the failure to worry about.
4. **A git worktree when two threads genuinely must build at once.** It is the
   robust answer and it is not free: a worktree needs its own `node_modules`.
   Reach for it when rule 2 becomes the bottleneck, not before.

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

## Open items

**1. `docs/ARCHITECTURE.md` §4 is stale, and part of it is still being cited as
authority.** *Handed over from Design, 2026-08-23.*

[`../ARCHITECTURE.md:207`](../ARCHITECTURE.md:207), under "Deliberate non-goals
in this milestone", lists as out of scope: *OpenAI analysis, automated SEC
research, IR/newswire scraping, Dirty Float reclassification, overhang
absorption conclusions, Effective Float Turnover, automated Chop/Flush Risk,*
and more.

The first two are **shipped**. The 2026-08-21 UI audit observed OpenAI-backed
interpretation and automated SEC research running live in production — EDGAR
links, accession numbers, the `STRUCTURAL INTELLIGENCE — AUTOMATIC` card.

Why it matters beyond tidiness: the same sentence carries the only written
answer to audit §11 item 3 — whether Chop Risk, Flush Risk, Overhang Absorption
and Effective Float Turnover are wanted. That written default is "no", and it may
well still be right, but it now sits in a paragraph proven stale in part, so it
cannot be cited on its own. Design has flagged this rather than editing a shared
document; the fix is either to date-scope the section to the milestone it
described or to split the still-true entries out of it.

## A queued-message receipt is a reading of the recipient, not a delivery note

**The trader's correction, 2026-08-24, two words: "ops is not idle."** I had
closed a report with *"all four threads are idle"*. Ops was mid-turn, and **the
evidence was in my own tool results, twice.**

`SendMessage` had answered both of my last sends with *"Message queued for session
… it will be processed after the in-flight turn finishes."* **That sentence is a
live-state reading of the recipient.** I read it as a delivery receipt — did the
message go? yes — and discarded the half that said the receiver was busy. Then I
described that receiver as idle, in the same reply.

**This is worse than the stale-clock instances above it**, and differently shaped.
Those were readings that were true when taken and aged. This one **was never
taken**: the fact arrived unasked, in the return value of an action I had chosen
to perform, and I did not treat it as an observation at all because I was not
looking for one. **A tool result answers the question you asked and often one you
did not.**

Two practices out of it:

- **`isRunning` is a claim about now and costs one call.** Never assert a thread's
  state from the last thing it said. `list_sessions` at the moment of reporting,
  or do not report it. *"Nothing outstanding from Design as of 01:59Z"* is
  cheap and cannot mislead; *"all four are idle"* is a claim about four
  processes.
- **Read the whole tool result, including the part that is not the answer.**
  "Sent" and "queued behind an in-flight turn" are different outcomes, and the
  difference is the exact fact I then got wrong.

**And a queued send is itself a small hazard worth knowing:** a message that lands
mid-turn arrives after the recipient has already acted, which is how three
crossed-message pairs happened tonight — the deploy that crossed a re-gate
request, the deadlock retraction that crossed its own escalation, and Design's
check-4 correction crossing mine.

## Observations go stale; this thread reports them anyway

**Added 2026-08-23 after the third instance, which finally named the shared
cause.** The section below is about attributing a file to a thread. It is a
special case of something broader:

1. `rnd.md` reported as held by R&D — three times, twice after the rule below
   existed. R&D said outright that something was "reading a stale snapshot".
2. `design-audit-report.md` §11 listed as carrying a retracted claim. It never
   did; the reading was of a document as it had been described, not as it was.
3. **"It is 11:47 ET"**, quoted to two threads while planning a deploy window.
   It had been 11:47 ET when the clock was read. By the time it was quoted the
   real time was 15:31 ET — nearly four hours stale. Ops caught it, and noted
   that it made the window *wider* than described so nothing was lost. **The
   checkpoint arithmetic depends on that number.** Deploy preflight refuses
   within five minutes of a checkpoint; a stale clock is exactly how a thread
   talks itself into a window that has closed.

The common failure is not carelessness about any one fact. It is that **this
thread's whole job is reading state and telling other threads about it**, and
the reading and the telling are separated by minutes or hours of other work.
Every observation it relays is a snapshot presented as a present tense.

So: **re-read anything time-sensitive at the moment of reporting it, or stamp
it.** A clock, a `git status`, a session list, a deploy state. "As of 11:47
ET" costs three words and cannot mislead; "it is 11:47 ET" is a claim about
now that was true once. When it is cheap, re-read. When it is not, stamp it.

## `git status` does not say who

**Added 2026-08-23 after this thread got it wrong twice.** I reported
`docs/threads/rnd.md` as "held by R&D since 04:45" on two separate occasions.
It was not R&D's work. The uncommitted content was **Design's Q6/Q7 handover**,
written into R&D's charter exactly as the handoff rule requires, and R&D
committed it as Design's in `11f7632`. R&D nearly went looking for work it had
already done.

The inference was: `rnd.md` is modified, `rnd.md` is R&D's charter, therefore
R&D is holding it. **Every step is true except the conclusion.** `git status`
reports that a path changed. It does not report which session changed it, and
no local git command does.

This is not a stray mistake, it is **created by our own handoff rule**. "A
thread that finds work belonging to another writes it into that charter's Open
items" means charters are routinely edited by threads that do not own them. So
a modified charter is *weak* evidence about its owner and often points at
someone else entirely.

What to do instead, in order of cost: **ask the thread**, which is one message
and always correct; read the content of the diff, since a handover reads
nothing like an owner's own work; or say "`rnd.md` is modified" and stop,
rather than naming a holder. Never report a holder from `git status` alone.

**I wrote that rule and then broke it again within the hour.** R&D has now
reported this three times. The third was after this section existed — I told it
"you are holding both" while looking at a `git status` line, which is the exact
sentence this section forbids. A rule the author does not follow is worse than
no rule, because it looks like the problem is handled.

So the rule is now absolute rather than conditional: **this thread does not
report who holds a file. Ever.** Not "appears to be holding", not "modified
since 04:45". If a thread needs to know a path is dirty, name the path. If
ownership actually matters, ask. Three round trips have been spent on this and
every one was avoidable by deleting four words from a sentence.

## Numbers from two threads need a unit, not a caveat

**Added 2026-08-23, after the strongest claim either analysis thread made today
was produced by combining two figures that were not the same unit.**

Research measured field instability as *tickers returning more than one value
across four draws* — 3 of 6 for structure. R&D held a *pairwise churn rate*
between consecutive stored observations — 52%. Read "3 of 6" as 50% and the
two look directly comparable, the floor nearly equals the churn, and the
conclusion writes itself: structure transitions carry essentially no
information. Computed pairwise the floor is 25%, and the claim evaporates.

**This thread relayed that claim onward before it was checked**, which is how a
unit error becomes three threads' problem.

Earlier the same day, the *same two threads' numbers* were nearly quoted
against each other and the fix applied was a caveat — "these answer different
questions, do not treat as competing estimates". **That caveat was true and it
did not work**, because it warned against comparison while leaving both numbers
bare, and the next person did arithmetic on them instead.

So: **a number crossing a thread boundary carries its unit in the same sentence
as the number** — denominator, and what one observation is. "3 of 6 tickers,
across four draws" cannot be silently read as 50% of anything. A caveat tells
someone not to combine two figures; a unit makes the wrong combination visible
when they try.

**And an exact agreement between two independently derived numbers is a
prompt to check the units, not a confirmation.** 50% against 52%, on six names,
was too good and that was the signal.

## The slice you measured is not the population you are claiming about

**Named by Ops on 2026-08-23 after the fourth instance, and the first to reach
another thread's document.** Distinct from the section below: that one is about
a rule whose terms diverge over *time*. This is about a claim generalised from
the *sample that happened to be in front of you*.

- **Ops:** *"claiming is immediate, nought to two minutes"* — measured on **recap
  jobs alone**. Across all 954 jobs that ever started: p50 8s, p90 266s, p99
  1253s, max 2576s. 276 over a minute, 82 over five. At `POLL_MS` 5000, "a few
  poll intervals" **would have fired on 29% of normal work.**
- **Integration:** the routing instruction — correct for my own outbound sends,
  shipped as true of all sends, and wrong for every thread receiving it.
- **Integration:** *"a monitor would never notice a dead review link"* — true of
  the page Ops had tested, false of the API, and I claimed it of the capability.
- **Integration:** *"one bad line, not a pattern"* — I searched `worker/` for
  recursive deletes, found one, and concluded about a class I had not searched.

**The tell is that the measurement was real.** Every one of these was a true
number from a genuine check — which is why none felt like a guess, and why
review does not catch them. The question is never *did I measure it* but
**what was I measuring, and is that the thing I am about to say?**

**Put this first if the section is ever read as a checklist.** *Ops's ordering,
and it is right.* The instinct on being caught is to **withdraw the whole
claim** — which is cheap, looks rigorous, and throws away a correct detector
along with its wrong reasoning. **Re-deriving is more work and is the only way
to find out which half was wrong.**

**Ops's repair is the worked example.** The stall rule survives, but
the load-bearing part turned out to be the **conjunct, not the timer**: a
legitimately slow worker has `activeCount > 0`, which `activeCount == 0` already
excludes. So the timer goes in minutes and generously and the conjunct does the
discriminating. A bad justification does not always mean a bad rule — but you
only find that out by re-deriving it rather than defending it.

**What Ops refused to claim is the other half.** `activeCount` has no history —
*that absence is the whole problem* — so the false-positive rate of the
**conjunction** is unmeasured; only the timer alone was ever tested. So it
**ships in shadow and is compared before it pages anyone.**

**Broader than I first wrote it, per Ops.** Shadow-first is not only for
detectors whose error rate cannot be established beforehand. It is for **any
check whose false-positive cost is paid by a human under pressure.** The flaky
`releaseBootstrap` test had a perfectly measurable failure rate and still should
not have been trusted mid-incident — because **the cost is not the wrong answer,
it is the operator learning to re-run until green.** That cost is behavioural
and it is paid once and kept.

### For "nothing changed", diff at directory scope — never a curated list

**Fifth instance, and Ops found it by turning the tell above on this desk's most
load-bearing claim rather than agreeing with it.** *"The ingestion path is
byte-identical to production"* — the sentence that retired the two-candidate-
causes risk before Monday — was measured over a **hand-picked file list**. The
list omitted `lib/market/config.ts`, which `worker/alpaca.ts` imports at line 11
and calls at line 17. **A file the market worker loads sat outside a measurement
behind a claim about what the market worker runs.**

**A curated list encodes the assumption under test** — that you already know
what is in the path — so it cannot fail in the one way that matters. Diff the
directory.

The conclusion survived, on two grounds neither of which was the one given: the
`config.ts` change is purely additive, zero removed lines and a new unreferenced
export; and the worker does not restart, so it runs `fd9556f` whatever ships.
And the claim Monday actually rests on **was** measured properly — `git diff
80437c3 fd9556f` over `lib/market` and `worker/` is empty **at directory
scope**.

It fits the tell exactly: the diff was true, the files were right, the output
was genuinely empty. **What was measured was "these eight paths did not
change". What was said was "the ingestion path did not change".**

## A rule that cannot tell two cases apart

**Named by Ops on 2026-08-23, after it happened three times in one evening.**
The section below is about a *check* reading the wrong field. This is the same
failure one level up, in the **rule** rather than the measurement, and it is
harder to see because the rule reads perfectly sensibly:

- **"Issue long, revoke on report of done."** Design reported done *for
  tonight*. The rule could not tell that from *done*, and following it would
  have destroyed the premarket verification the token was issued for.
- **"Twelve hours"** for a review session. A sensible number that did not know
  `PREMARKET_START_MIN` existed, and expired four minutes before the window it
  was issued for.
- **"Check the link returns 200."** A dead link returns 200 too.

Each is defensible written down and each collapses two cases the writer never
had side by side. **The tell is that the rule names an event — "done",
"twelve hours", "200" — rather than the condition the event was standing in
for.** Ops's correction shows the repair: *revoke when the work the session was
issued for is finished, not when somebody reports finishing a sitting of it —
and if the two ever look the same, the session stays.* The rule now names the
condition and states which way to fail.

**The constructive form, which is Ops's too: prove the check can fail.** It
mutation-tested the releaseBootstrap fix by reverting the comparison to confirm
two tests went red. Design reached the same principle from the other side and
applied it against its own work — refusing to count a label verified because at
`CLOSED` phase the fixed and unfixed code render identically, so no observation
of that button could have come out badly. **"A check that cannot fail isn't a
check."**

**Ops's refinement, which turns a habit into a question with an answer.** All of
these share something past the event-for-condition swap: **the substituted name
was correct at the moment it was written.** Twelve hours was a fine number at
15:56. Revoke-on-report was fine while there was one sitting.
Monday-after-the-close is fine if bars flow. **The name only diverges from the
condition later** — which is why none looked wrong when written, and why review
does not catch them: at review time they are still true.

So the prompt is not *"did I name a condition or an event"*, which is a habit
that will lapse. It is:

> **When do these two come apart, and what happens then?**

That is asked once and has an answer, and the answer belongs beside the rule.

**It applies to plans, and a plan is worse than a test** — a test that cannot
fail at least runs and reports green, while a plan that cannot fail waits to be
executed by someone who was not there when it was written. Ops checked its own
charter and found two, both **pending rather than history** (`b6125a2`):

- *"Restart the market worker Monday, after the close."* The condition is *once
  bars have flowed and no session is live*. **If bars do not flow, "after the
  close" still arrives** — and the rule would restart away the only live
  process carrying the failure, at the moment it is the evidence.
- *"Sample the WAL Monday premarket."* What makes it mean anything is
  contention between writers and dashboard polling, not the hour. On a thin
  premarket a flat WAL says what Saturday said: nothing. Now stated as sustained
  write load with the write rate recorded beside the size, **so a sample that
  proves nothing is recognisable as one.**

For this thread: most of the rules in this document were written today, and each
is owed that question.

## Name the outcomes you accept, never the ones you reject

**Research, 2026-08-23, after the same fabrication happened twice.** Its replay
guard was a **denylist**. `interpretTicker` attaches the last accepted dossier
on `UNAVAILABLE`, on `REUSED_UNCHANGED`, **and on `FAILED`** — three separate
kindnesses, each correct for a live desk. Research guarded two after the first
fabricated result. The failing model call walked through the third and reported
a stored dossier as a re-derivation, with `tokens in=0` again the only tell.

It is now an allowlist: `ACCEPTED` or `PARTIAL`, everything else throws with the
provider error attached, plus a check that an interpretation which spent no
tokens did not happen. **The allowlist caught an empty OpenAI balance on its
first run instead of inventing a dossier.**

**A denylist has to be complete, and only the callee knows whether it is.** The
same bug in a different costume appeared earlier the same day: `!== null`
admitted every legacy row in `hasUsableSource`, because an absent key
deserialises to `undefined` rather than `null`. Both are a guard enumerating
what to refuse, against a producer free to invent a new thing to return.

**A third costume, and it is not a data guard at all.** `worker/research.ts:193`
installs `process.on('SIGTERM', () => clearInterval(heartbeat))` and then loops
forever. **Installing a SIGTERM listener overrides Node's default action, which
is to terminate** — so the handler added to tidy up is exactly what removed the
exit. The research worker has been **SIGKILLed on every deploy today**, three
for three, thirty seconds of `stop-sigterm` timeout each. `worker/alpaca.ts`
handles SIGTERM and exits. `worker/desk-assessments.ts` stops cleanly **because
nobody improved it.**

So: **a partial handler is worse than none.** Same rule — it enumerated one
thing to do on the way out and inherited responsibility for all of them. The
cost is not the thirty seconds: a SIGKILL mid-job abandons an in-flight model
call with tokens spent and nothing recorded, and can leave a claimed row with no
process behind it. Fixed by Research at `97f198d`, one line, mirroring
`alpaca.ts`.

**The ten QUEUED rows: what is dead, what is established, what is open.** *Two
mechanisms have now been proposed and both died on the same rows. This section
has recorded each as a finding in turn, so it is rewritten to hold the **state of
the question** rather than a third answer — a paragraph naming the current best
guess needs replacing every time the guess moves, and reads as settled in
between.*

**Dead — a SIGKILL orphan.** All ten carry `started_at` NULL and `retry_count` 0,
so none was ever claimed; `requeueJobForRetry` only touches rows that were
mid-flight. Disproved by Research. The signal-handler bug was real and is fixed
at `97f198d`; it just does not produce these.

**Dead — "queued for a finished date, so never claimable".** Disproved by Ops
against the snapshot, read-only:

| recap for | queued | started | stranded |
| --- | ---: | ---: | ---: |
| 2026-08-17 | 8 | 6 | 2 |
| 2026-08-18 | 10 | **10** | 0 |
| 2026-08-21 | 8 | 0 | **8** |

Sixteen of twenty-six ran and one recap claimed ten of ten, so nothing is
structurally unclaimable. **It is intermittent and concentrated on two dates.**

**Established, and it is the operational part: these will NOT clear on Monday.**
Every recap job that started did so **within nought to two minutes of being
queued** — claiming is immediate. So the ten were passed over at the time; they
are not waiting for a session to come round. The phrase *"queued for a finished
date"* invites exactly that wait, and both Ops and I nearly took it.

**Established: stranding is confined to this one checkpoint.** Of the 938 jobs
queued at every other hour, **zero** were ever left unstarted.

**Established, weakly: the cost is a refresh rather than coverage.** The only
historically checkable pair, CRGO and MYSZ stranded from the 17th, each already
carried two analyses that same day. n=2 — evidence, not proof. It puts the size
nearer *ten stale rows* than *a checkpoint silently dropping its work*, which
were the two sizes in question.

**Dead — "the trading date rolls before they can be claimed".** Killed by
Research, its own. The jobs sat claimable for **23 hours**: queued
2026-08-22T02:00:06 for trading date 08-21, and the next date first appears
2026-08-23T01:27:38. An 18-hour window on the 18th left 2 of 8 stranded anyway.
There is no race. **Three mechanisms proposed today, three disproved, each by
someone other than the one who most wanted it to be true — and the third by its
own author.**

**Established — the worker did not lose a race, it stopped.** It *queued* those
eight at 02:00:06, so it was alive at that instant. In the ninety minutes
around it: 0 started, 0 completed, 0 failed. Its last analysis was three and a
half hours earlier, and it stayed silent 23 hours until a restart.

**Established — and this kills the empty-balance candidate.** On the 18th: 10
started, 10 completed, **4 failed on HTTP 429**. A failing worker still claims,
because claiming precedes the model call. So a dry balance cannot produce
nought-of-eight.

**A certain defect, whatever caused this.** Two network calls in the worker loop
have **no timeout at all** — `lib/data/providers/googleSheets.ts` (no timeout,
no `AbortSignal`) and `lib/research/sec/client.ts`. `openaiInterpreter` at 300s
is the only bounded one. **`loadSheetPriors()` runs at the top of every pass,
before `claimQueuedJobs`** — so an unbounded fetch there hangs the loop with no
error and no heartbeat failure: the process stays up, health keeps its last
state, and nothing is claimed. That is the observed signature exactly. Research
**does not assert it as the cause** and is right not to.

**The observability gap that cost three threads an evening.** The heartbeat is
an independent `setInterval` and survives a blocked loop, so it is **not
diagnostic**. And `research_health` is a **single overwritten row with no
history** — there is no way to ask what the worker was doing at a past instant.
That absence is why every hypothesis tonight was reasoned from job timestamps,
and why three of them could be argued at all.

**Open: why did one recap claim ten of ten and another nought of eight?** Narrowed to: **why did the worker stop?** The
empty-balance candidate is dead. The unbounded fetch is the standing candidate
and is unfalsifiable from what is stored, because nothing recorded what the
worker was doing.

This sits beside the two rules below rather than replacing them. "A check that
cannot fail isn't a check" is about whether an observation can come out badly;
"check the field that carries the answer" is about reading the right one.
**This one is about the shape of the guard**, and it is the only one of the
three that is mechanical: an allowlist fails closed against futures nobody has
thought of, and a denylist cannot.

## A deploy changes what will run, not what is running

**Twice in one day, in two layers, and the second was caught before it cost an
investigation.**

- **The release drift.** `mointel-market` had `WorkingDirectory=/opt/mointel/current`,
  which is correct — but Linux resolves the symlink at **process start**, so the
  worker's cwd had been a specific release directory since Friday and had
  survived two deploys. It was running `80437c3`'s code while everything else
  was on `fd9556f`.
- **The SIGTERM handler.** `97f198d` makes the research worker exit on SIGTERM
  instead of ignoring it. But the process being stopped by that deploy was
  started from the *old* code and holds the *old* handler in memory. **So the
  deploy that ships the fix will SIGKILL one last time**, identically to the
  three before it.

Research predicted the second **before the deploy**, unprompted, because a
fourth identical failure would have read as the fix failing and cost Ops an
investigation.

**The general form: a fix concerning startup or shutdown cannot be demonstrated
by the process that carries it in.** The process that must show the fix works is
by definition not the one shipping it. So the test is always the run *after* —
and if a rollout is judged on the deploy that installs it, it will be judged on
the last instance of the old behaviour.

## ~~The one check that CAN fail~~ — it would have failed for the wrong reason

**Written as a triumph at `f498926`, retracted within the hour.** I recorded the
`computedCycle` count as the inverse of everything else in this document — the
one check that *could* fail, found by accident. Research then found the defect
underneath it and Ops verified it at the lines: `computedCycle` is assigned at
`pipeline.ts:365`, **after the model call**, and the reuse path returns at line
190 — *"Unchanged evidence: reuse. No bundle is even built."* A name whose
fingerprint has not changed **never gains the field at all.**

**So flat at zero is not the stalled condition. It is the expected reading of a
working system.** Ops would have arrived at 04:00, run one query, seen zero, and
concluded the worker was hung — **with every other signal agreeing**: research
`IDLE`, queue non-empty, heartbeat fresh. A false positive with full
corroboration, at the worst hour.

**Ops's correction is the durable part and it is sharper than my original:**

> **A check that can fail is not automatically better than one that cannot. It
> has to fail for the right reason.**

That is worse than the failures collected below, not better. Those were checks
that stayed silent. This one would have spoken, confidently, wrongly, and been
believed.

**And the error that produced it is the same one this document keeps recording.**
Ops measured that 231 of 231 dossiers lacked the field — true. Then it asserted
*why*: that they would gain it as research worked. **The count was measured; the
mechanism was assumed** — written in the sentence immediately after it quoted
that same tell approvingly. I then built a report to the trader on top of it
without asking what populated the field either.

**What survives**: a heartbeat proves a process exists, a count of produced work
proves it is doing something, and `/api/health` expresses only the first. That
gap is real. `computedCycle` was the wrong carrier — set on one branch of one
path, and now backfilled besides.

## The check that was found by accident

**Ops, 2026-08-24, as a side effect of a caveat about a display column.** Every
other entry in this document is a check that could not fail. This is the
inverse, and it is the only one.

Design's cycle cutover deliberately does not fall back to the model's field, so
every dossier predating `computedCycle` reads `CYCLE NOT ESTABLISHED`. Ops
measured it rather than accepting the adjective **"noticeably fewer"**:

> **231 current dossiers. 0 carry `computedCycle`. All 231 will read NOT
> ESTABLISHED.** Not some — the column is empty at 04:00, and anyone not told
> will read it as the cutover having broken the column.

**That same count is a progress meter, and it needs no new code:**

```sql
select count(*) from research_dossiers d
  join research_analysis_versions v on v.id = d.current_version_id
 where json_extract(v.dossier, '$.computedCycle') is not null;
```

It runs 0 → 231 as research re-analyses. **A heartbeat proves a process exists;
this proves it is doing work** — which is exactly what `/api/health` cannot
express and what the STALLED proposal was going to build.

So on Monday **one query answers three separate questions**:

- **Rising** — research is working, `2433470`'s billing exemption healed the
  board unaided on its first real production test, and the cutover is clearing
  as designed.
- **Flat at 0 with a non-empty queue** — the STALLED condition **observed rather
  than theorised**, and evidence that tonight's unbounded-fetch ceilings did not
  cover the hang.

**The lesson is not "look harder".** Nobody could have looked for this: the
observable did not exist until a display change created it, in a place no one
was watching. What made it visible was measuring a caveat instead of repeating
it — *"noticeably fewer" and "none at all" are different mornings.* **An
adjective is where a falsifiable number goes to hide.**

## Check the field that carries the answer

**Added 2026-08-23 after three instances, two of which nearly became reports.**
A check reads some observable. If that observable can be right while the thing
itself is wrong, the check is decorative — and it is decorative in the
reassuring direction.

- `research-replay` reported 123 stable versions having made **no model calls
  at all**. The output was clean and internally consistent. Its only tell was
  `tokens in=0 out=0` — a counter added for **cost**, not correctness.
- Ops tested a revoked review token **by status code**, got 200, and read it as
  broken revocation. It was not: a garbage token also returns 200. The **bodies**
  settled it — revoked 9,584 bytes with zero RVOL occurrences against a valid
  535,437 with four. Ops caught this before reporting it as an incident.
- The release-bootstrap flake ran the other way. **Capturing the status instead
  of the assertion text** is what cracked it, because 141 is 128+13 and the
  message said nothing.

**So the rule is not "trust bodies over statuses".** The flake proves the
opposite case exists. It is: **name the field that carries the answer, and
confirm it can distinguish the failure you are testing for.** A status code
cannot tell a live capability from a revoked one when the route returns 200 for
both. A token counter can tell a real run from a fabricated one, and did.

**And a fourth instance, from Ops against its own record.** After each of three
deploys it reported *"all four services active"*. True, and the wrong check: it
verified **state after starting** and never **the manner of stopping**. The
project memory says in as many words that clean-shutdown claims must be tested,
because one such claim was already false once and cost three orphaned workers.
The evidence sat in `journalctl` all evening.

The practical form, since this thread relays other threads' verifications:
**when a thread reports a check, ask what it read.** "Verified" is not a
finding; "fetched the asset URLs out of the page's own HTML with no
credentials and got 200" is.

**And the same question applies to what this thread writes down.** I recorded
the review-status defect as "a monitor would never notice a dead link". Ops
investigated and that is true only of the **page** — the review API returns 403
for revoked and garbage alike, so a monitor polling the API sees it instantly.
I had generalised from the one surface Ops happened to test to the whole
capability, which is the same error as reading the wrong field, committed one
level up.

## A retraction only reaches the sentence it edits

**Added 2026-08-23, found by R&D in its own documents.** It retracted a claim,
edited the section that named it — and left the opposite conclusion standing
thirty lines away in the same two files. Both live, both its own: one saying a
churn figure *"proves the production figure is dominated by genuine evidence
change rather than instability"*, the other saying *"most of that churn is the
model disagreeing with itself"*. The second was written **while retracting the
premise of the first**.

This is not carelessness, it is the default outcome. A retraction is drafted by
searching for the claim, and searching finds the claim — not the paragraphs
that quietly assumed it three sections later, which use none of the same words.

**So a retraction is not done when the claim is struck. It is done when every
inference that rested on it has been re-read.** Search for the conclusion as
well as the claim: what did this let us say? Who else was told? A retraction
that only edits its own sentence leaves a document that contradicts itself, and
the contradiction reads as two findings rather than one error.

This thread has issued several retractions today and should assume it has the
same debt outstanding.

## Why none of us found our own

**Ops's observation at the end of 2026-08-23, and it is the best argument for
this thread existing that anyone has made.** Every defect found that day was a
check that could not fail, and they surfaced in a fixed order — the test
fixture, then the guard, then the plans, then the monitoring. **Each was found
by the thread that owned the layer above it, never by the layer itself.** The
heartbeat could not have flagged itself as insufficient; it took a stall nobody
could explain.

**Checked before recording, because the strong version is not quite right.**
Threads did correct themselves, repeatedly and without being told to: Design
found its own hover-only label, Research killed its own trading-date mechanism
and its own denylist, Ops disproved its own SIGKILL guess and filed its own
wrong check against itself. What none of them did was **find** it unprompted.
In every case the prompt came from outside the layer — a rule that sent Design
back to the live desk, a relayed message that sent Ops to a log, a hypothesis
that sent Research to the rows.

So the accurate form is: **the correction is reliably the owner's; the noticing
reliably is not.** That is a stronger claim than Ops's, not a weaker one — it
says the failure is structural rather than a matter of care, because these are
four careful threads and every one of them needed an outside prompt.

**And it says what this thread is for.** Not review — it is worse at each
layer's work than the thread that owns it, and every substantive correction
today came from an owner. What it does is carry a thing from one layer to
another, which is the only motion that reliably produces noticing. More
discipline inside any one thread would not have found these.

## A value with two possible definitions is stored with its basis

**R&D, 2026-08-23, written as a general rule rather than a caveat about float.**
Any value that can be computed more than one way is stored **with its basis in
an adjacent column**. A change of definition then becomes a change of *value in
that column*, rather than a silent change of *meaning in the same one*.

`reference_basis`, `adjustment_basis` and `split_detected` all exist because
this was learned late and expensively — the reference close that flipped at the
bell would have measured a faded runner against the price it faded to, and every
number would have looked plausible. **Float should arrive with `float_basis`
from the first row, not the hundredth.**

It is the constructive form of a problem this thread keeps finding by accident:
the Sheet's float is vendor-displayed, the derived one is filing-computed, and
*float* names both. Same shape as the model cycle becoming arithmetic, and as
the two instability figures that were nearly quoted against each other. **When
two threads can each be right about the same word, the word needs a companion
column, not a footnote.**

## A deferral in one document becomes a workaround in another

**Found 2026-08-24, and by the trader rather than by any thread.** Research's
item 16 recorded a cheap structural fix — compute the cycle at read time — and
this thread deferred it to *"a fresh session, no mitigation pass"*. Ops then
built a **2.6M-token forced re-interpretation of 231 dossiers** as the mitigation
for the blank column that deferral produced. Both documents were correct. **The
deferral is in `research.md`, the workaround is in `ops.md`, and nobody put the
two sentences side by side until he asked why we were doing it at all.**

The tell is that neither thread could see it. Research had no reason to re-open a
decision this thread had taken; Ops had no reason to question a task it had been
handed and had gated properly. **The cost of a deferral is paid in a different
charter from the one it is recorded in**, and this thread writes the deferrals.

So: **when this thread defers a fix, it owns the price of the deferral too.**
Name what will be done instead, in the same sentence, and compare the two. *"Item
16 deferred to a fresh session"* was a decision about one item; *"item 16
deferred, and the interim costs 2.6M tokens for a field that is arithmetic"* is
a decision anyone would have questioned, including the person who wrote it.

**It belongs beside the retraction rule and it is the same shape one level up.**
A retraction only reaches the sentence it edits; **a deferral only reaches the
document it is written in.** Both are failures of a decision to travel to the
place where its consequence lands.

## "Eventually" is not a unit, and a mechanism check is not a timeline check

**Added 2026-08-24. This thread reviewed Research's partial-bar guard, found the
right column, and drew the comfortable conclusion from it.**

The guard changed a cache test from `stored === today` to `stored >= settled`. I
asked whether that stranded a bar already stored partial, traced the mechanism to
`upsertDailyBars` being `ON CONFLICT(symbol, trading_date) DO UPDATE`, and
concluded: **healing delayed by about a day, not removed — a size question rather
than an incident.** I told two threads the question was closed.

**The mechanism was right and the timeline was never walked.** Research walked it:

| | settled | stored | |
| --- | --- | --- | --- |
| Mon midday | 2026-08-21 | 2026-08-24 | skip |
| Mon evening | 2026-08-24 | 2026-08-24 | skip |
| Tue premarket | 2026-08-24 | 2026-08-24 | **skip** |
| Tue midday | 2026-08-24 | 2026-08-24 | **skip** |
| Tue evening | 2026-08-25 | 2026-08-24 | refetch |

A partial bar survives **the entire next premarket and session** — the exact
window where it does harm — and the `=== today` test it replaced would have
refetched it on Tuesday morning. **The guard was preventive at the price of
protecting the rows it exists to remove**, and Ops independently found the same
thing pointed at Friday, with 133 real rows behind it.

**"It heals eventually" is not an answer. Healing that completes outside the
window it protects is not healing.** The question a mechanism check cannot
answer, and which has to be asked separately, is: **relative to the window that
matters, when?** Walk it against a real calendar — a Monday and a Tuesday, with
hours — rather than reasoning about the operator.

**This is worse than missing it.** A gap left open gets found by the next person
to look. A gap examined and pronounced closed does not — I had the right column
in hand, and used it to end the enquiry instead of to start it. Two threads acted
on that sentence.

**And the relay still worked, which is the honest part of the record.** Routing
the `fetched_at` check to Ops produced the 133; the too-generous review sent
Research back to re-derive and it found the real defect. **Two correct results
came out of one wrong conclusion**, because the conclusion moved between layers
and got tested. That is the argument for this seat and not an excuse for the
sentence.

## Working rules

- **Verify claims against the system, not against a transcript.** The false pin
  claim came from reading a deploy log instead of asking `pins.sh`.
- **Corrections land in the document.** A charter that is wrong is worse than no
  charter, because threads act on it.
- **Stay small.** This thread's output is edits to `docs/threads/` and answers to
  cross-thread questions. If it is producing anything else, something has gone
  wrong.

## Opening message for a new chat

*Rewritten 2026-08-24 after the first Integration session ran ~20 hours and was
compacted. The original two-paragraph version is in git history; it was written
before the thread had any standing delegations or any live work to carry.*

> This is the **Integration thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/integration.md` completely, then
> `docs/threads/README.md`. Everything else you need is on disk and linked from
> those two.
>
> **You own the seams.** The charters, decisions that cross threads, reconciling
> contradictions between what two threads believe, and making sure a correction
> lands in a document rather than only in a chat. **You do no product work** — no
> code, no deploys, no analysis. The moment you start building something you have
> become a sixth worker and stopped being useful.
>
> **You are the message bus.** Ops, Research, Design and R&D cannot all address
> each other, and I am not a transport. They send you what is for another thread;
> you relay it with whatever context the receiver is missing. Session ids and the
> current live work are in the LIVE STATE section of your charter — **verify that
> section before acting on it, it is written to expire.**
>
> **Two standing delegations from me.** Order-and-process calls are yours to
> decide rather than refer — sequencing, ownership, who does what next. Anything
> needing my judgement goes at the END of your reply under `## What I need from
> you`, and nothing comes after it. Those are rules I asked for; you are bound by
> them too.
>
> **Four practices that cost the last session the most, all recorded in your
> charter with the incidents that produced them.** Read them before you start,
> because every one of them was learned by getting it wrong:
>
> - **Read what a thread SAID, not what it committed.** Commits do not carry
>   questions. Read every thread's `## What I need from you` first, every time.
> - **Do not bring me decisions about work in motion.** A thread mid-execution
>   finishes without me. Only what is settled and needs me, or genuinely blocked
>   on me.
> - **Verify, do not relay.** Check a claim against the system before passing it
>   on, and pass on numbers rather than adjectives.
> - **Name the sha, not the ref.** A ref, a clock, a `git status` — all of them
>   are questions, not answers, and all three were reported as facts last session.
>
> The other threads will correct you often and they will usually be right. That
> is the system working: the last session's own record concludes that the
> correction is reliably the owner's and the noticing reliably is not.
>
> **Start by reading the LIVE STATE section, then check all four threads — what
> they said, not what they committed — and tell me what is outstanding and what
> is stale.** Do not assume anything in LIVE STATE is still true.
