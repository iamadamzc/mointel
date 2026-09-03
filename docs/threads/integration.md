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

*Refreshed 2026-09-02 21:35Z (17:35 ET Tuesday) by the third Integration
session, mid-flight, after the trader flagged it near context capacity.
**Everything below this block that carries a 2026-08-27 frame is the previous
handover, kept for its mechanisms and superseded by this block wherever they
conflict. Verify before acting on any of it.***

### State as of 2026-09-02

- **Production `bc78d49`, schema 22, six days unattended and CLEAN** — Ops's
  sweep at `1ffb77d`: 19/19 checkpoints every trading day, recaps asked==queued
  six nights including the Fri→Mon rollover, unbroken capture. `stalledJobs` 16
  until the retirement ships. Soft spot: research worker self-healed three
  restarts (two lock timeouts, one OOM); WAL 546MB on an 886MB store; item 0e
  reframed deploy-independent.
- **The deploy sequence RAN, 2026-09-03 ~05:00–05:15Z, all verified.** Window 1:
  0f alone on composed sha `7f4aa91` (branch `ops/0f-only`) — the build cap
  protected its own installation. Window 2: the full bundle at tip `97f5fbd` —
  the retirement logged **exactly "retired 16"**, all named, `stalledJobs` now
  0, confirming the enqueue fix by a refutable check. Production runs
  `97f5fbd`; schema 22 unchanged (the migrates-the-store premise was wrong
  twice — nothing waits on a migration). Window 3 (basis backfill, ~462 REST
  calls) unblocked, parked for an Ops-priced DAYLIGHT window. Stale
  market-worker pin retires after window 3. Design's chip verification read
  NULL exactly as pre-registered — unfalsified, not confirmed; the Sheet-
  retirement flip hazard is recorded in README's retirement block.
- **Executed 09-02/03:** copy-down done (`data/assessments-prod-2026-09-02.db`,
  ids 1–227); manual snapshot taken. **Parked:** float extractor (condition in
  research.md's pending table).
- **Scoring: RUN, results `3ed04c4`** (`docs/rnd/2026-09-02-prediction-
  scorecard-results.md`, sent to the trader). Headlines: S3 catalyst separation
  +14.9pp p=0.00002 (floor; same-session +17.9), S2 time-to-intelligence 15→0
  min, S1 board timeliness UNCHANGED at 30% (the standing product gap), S5
  freshness regressed (differential; the just-shipped clock targets it). **The
  post-fix S3 rise toward +17.9 is pre-registered as mechanical** (`584b734`)
  — only past it is the market. News one-cell instrument excluded permanently
  until its capture is built (trader's optional word, no clock).
- **Board lateness is the desk's live workstream, commissioned 2026-09-03.**
  Diagnosis complete: RVOL is confirmed cumulative (`lib/market/rvol.ts`) AND a
  second `latched` flag is never cleared, so board presence is literally a
  one-time qualification in two independent places; a dead name falls only by
  being OVERTAKEN. **Windowing RVOL is closed** by a standing backtested
  instruction in that file, so any continuing condition is ADDITIONAL to the
  ranking. **Activity = minute trade count is already parsed, persisted and
  scored on by nothing** — the cheapest available measure. Liquidity cannot be
  board-wide (≤250 high-res cap, populated BY the latch). Revival answered over
  13 sessions on trade count: **68% at 1 dead minute, 48% at 5, 34% at 10, 19%
  at 30, 11% at 60** — the trader's prior holds past ~30 minutes and his stated
  10x-in-one-minute criterion catches burstiness. **All rates are FLOORS**;
  his 10-second grain is reachable (trades deep to listing) and unbuilt, with
  no clock. **Open with him: which persistence.**
- **0d (`trap start_services EXIT`) is UNBUILT — VERIFIED 2026-09-03 by Ops**,
  method stated: no `trap` in `push-release.sh` or `deploy.sh` at `7f4aa91`,
  and none in either file on the live release. **0f touched both files and
  carried none of 0d** — two unrelated changes in the same files, which is
  exactly why it could not be inferred from the diff's filenames. Older text
  below asserting it unbuilt is therefore still true.
- **HELD TRIGGER — item 16a expedites the moment a SECOND READER exists.**
  *Design, 2026-09-04, declining to expedite its own fix and asking this seat to
  hold the condition rather than holding it itself.* The board labels another
  model's output as "human review". **It misleads a reader who does not already
  know the answer — and the trader is the one reader who does**, since he is the
  person who told the desk no human reviews the Sheet. So today the only human
  seeing that string is the only human it cannot deceive, and it ships in the
  ordinary next deploy (`f228467`, committed, outside `6d368dc`). **The moment a
  demo, a second login, or a shared review link puts a new reader in front of
  the desk, the string stops being cosmetic and becomes a false claim to
  someone who would believe it.**

  **AND THE TRIGGER MUST NOT DEPEND ON HIM VOLUNTEERING** — Design's addition,
  and it is what makes this a trigger rather than a note. *A demo or a second
  login gets arranged and mentioned in passing, and by the time it is mentioned
  the desk is already in front of the new reader.* So it is attached to
  something **observable** instead: **a review link created for a label that is
  not a thread's own diagnostic, or a second `htpasswd` login appearing.**
  **RE-KEYED 2026-09-04 ON OPS'S MEASURED BASELINE (`de71ea7`), because the
  trigger as first written could never have fired: there are ALREADY TWO
  logins** (`adam`, `mointel1` — the second reads as a service account), **and
  seven unrevoked review tokens of which ZERO are usable, all expired, the
  newest lapsed 2026-08-24.** A count of unrevoked rows would have reported a
  live sharing surface that does not exist — presence versus validity again.
  **The live trigger is therefore: a THIRD login, or ANY USABLE token —
  INCLUDING ONE LABELLED FOR A MODEL CONSUMER.** *Design's addition: the five
  expired `chatgpt-*` tokens were routes built so ChatGPT could reach this desk,
  and ChatGPT is also what WRITES the Sheet — so for one day in August the desk
  told the Sheet's own author that the Sheet was human-reviewed. A loop rather
  than a deception, because the one consumer able to know it was false was the
  thing producing it. But a model ingesting "human-reviewed" as a fact is
  exactly how a false provenance propagates, and **a model cannot ask a
  clarifying question** — so a machine reader fires this trigger on its own
  grounds, separately from any human one.* Both are Ops's to see, and Ops has
  been asked to raise either the moment it appears.

  **And the decision is TIME-BOUNDED, not principled** — Design's own
  correction, so it is never cited as *"16a is never urgent"*: it is **"16a is
  not urgent while readership is one"**, and the trader has said this is a
  product for a niche of momentum traders, so readership will be more than one
  again.

  **WHEN WRITING ANY TRIGGER, STATE WHAT THE COUNT IS RIGHT NOW BEFORE CHOOSING
  THE THRESHOLD.** Two of this thread's triggers in one day were keyed to a
  state the world was already in, and both were caught by someone measuring the
  baseline rather than reading the rule. Presence-versus-validity is now four
  shapes of one failure in two days — expired tokens counted as active,
  `undefined` versus `'UNKNOWN'`, a 200 on a dead page, a key present with no
  value. Same family as *a schedule that depends on attention is not a
  schedule* — a trigger that fires on someone remembering it fires last.
- **Sessions:** Research successor live (opened 08-27); the three retired
  sessions archived 2026-09-02. Coaching holds six-day-old uncommitted code in
  the tree, nudged to commit.
- **Practices added since the 08-27 handover, all in README/charters:** push
  rule is the trader's word; a hold is announced or it is a push by whoever
  moves next; id range PLUS content digest across stores; the capacity
  doctrine and retirement protocol (documents-current, opening-message expiry
  audit, archive on retirement); clock read in the same tool call as the claim.

### Reaching the threads — THIS IS THE ONLY MECHANISM THAT WORKS

    directory:  mcp__ccd_session_mgmt__list_sessions   ->  sessionId + title + cwd
    send:       mcp__ccd_session_mgmt__send_message    ->  session_id + message

**`list_sessions` carries the real titles. Look every address up there, every
time. Do not cache one and do not accept one asserted in a message — including
your own.** This thread gave Ops its own session id from its scratchpad path; it
was wrong, and only Ops using the directory saved the experiment.

**`ListAgents` does NOT work** — opaque handles (`mointel-8c`, `claude-1a`) that
map to nothing. Neither does `SendMessage` to a name, nor copying a received
message's `from` attribute as the `to` (the tool's own docs recommend the last one;
it fails here). **Threads CAN reach this thread unprompted** — proven by Ops.

**Title this session `Integration` immediately.** Peers look for that title in
`list_sessions`.

### The clock, and it has bitten four times in three days

**This host is UTC+2 (CEST). Every shell and test timestamp is SIX HOURS ahead of
New York.** `10:45` local is `04:45 ET`. **Read `date -u` or an explicit
`America/New_York` conversion at the moment you use it** — never extrapolate from
an earlier reading, and never infer the trading day from tool output.

### Production

**Live: `bc78d49`.** Nothing non-docs sits above it — **there is nothing to
deploy.** Schema 22. Market worker untouched across thirteen deploys, pinned at
`fd9556f` behind `RESTART_MARKET=no`.

**A deploy is NOT fire-and-forget.** `push-release.sh` stops the runtime units,
migrates, then starts. On 2026-08-25 it stalled between stop and start, an ssh
timeout killed the remote process tree, **and there is no watchdog** — the desk
stayed down 3h22m, dark through the first 102 minutes of live premarket. **Ops's
item 0d (`trap start_services EXIT`) is the fix and is still unbuilt.**

### DECISIONS WAITING ON HIM

1. **Replace the DIRTY FLOAT verdict with an overhang RATIO plus its basis** —
   **he has said yes**, and it is unstarted. `CLEAN` is in the enum and has been
   produced **zero times in 1,850 archived assessments**; the label cannot vary
   because `CLEAN` requires proving a negative. **He asked for this to come with an
   education**, because float is a core pillar and the change is conceptual, not
   cosmetic.
2. **The re-trigger fix** — `queue.ts:167` skips a ranked name whose dossier
   exists *at any age*, so **a name the desk has ever analysed gets one board job
   per session and is then frozen out** (238 of 323 ticker-sessions). Cost RCON two
   hours on a name he was holding. Scoped, not built.
3. **The rotation fix** — `collector.ts:788` stamps a resolver turn as spent
   outside the `try`, so **130 of 253 resolver turns spend nothing, learn nothing,
   and burn a pass.** Real, but **alone it would flatter itself** on the RCON case.

### IN FLIGHT

- **His headline feed.** He supplies ticker + timestamp from his own news service;
  Research holds ingest and comparison, R&D gets the rate. **First data says the
  desk is NOT missing news — News Count (4h) was 0 on all nine of his top movers
  and the desk independently found none.** RCON was the exception.
- **The comparison is ONE CELL, not a tally**: his window is 4h rolling, the
  desk's is 36h. **Only "he has a headline inside 4h and the desk found nothing"
  is a failure.** Anything else is window arithmetic.
- **Derived float, phase one** — Forms 3/4/5 only, XML and deterministic, 98%
  coverage. **Store four numbers, never a float**: filed shares, insider holdings,
  13D blocks, 13G blocks, each with source and date. **He does not know what a
  passive 13G block means and must not be made to decide it.** `OWNERSHIP
  maxFetch: 1` is the only gate. **Held pending the items above.**
- **NEW, and R&D's:** whether float or overhang correlates with performance at
  all, possibly against RVOL. **His question, registered rather than started.**

### Recently settled, so nobody reopens it

- **The enqueue fix works, with positive evidence** — last night's recap queued 9
  jobs for the session it *prepares*; `stalledJobs` steady at 16, no fourth row.
  **The existing 16 are not retired by it and nobody owns retiring them.**
- **Deep history is live**: full-depth fetch on a top-10 name above its stored
  ceiling, ~0.4 fetches a morning, split factors derived exactly from price data.
  **BTCT: $1.80 shallow, $26.58 comparable, $14,249.94 all-history on a bar that
  traded four shares.**
- **`VERIFIED BLUE SKY` is gone** — the label now reads `ABOVE PRIOR CEILING $X`.
- **A newswire is never a company SOURCE, but reading one as evidence was never
  refused.** The `:250` rejection is about persistence, not newswires.
- **He trades EVERY session.** The setup is the requirement; **no rule, check or
  threshold may be keyed to the clock.**

### The four practices that cost this session the most

**Read what a thread SAID, not what it committed.** **Do not bring him decisions
about work in motion.** **Verify, do not relay — and check the sha against
production before instructing any deploy** (this thread instructed the same sha
twice, the second time for work already live). **Name the sha, not the ref, and
send the DEADLINE and the CONDITIONS — never the minute.** The thread holding the
checkpoint schedule prices the minute; this one got that wrong and cost him a
board.

## The third delegation: deploy instructions, confirmed directly

**Granted 2026-08-24 by the trader. Ops reported it first â€” *"deploy â€” and you can
accept deployment instructions from Integration"* â€” and this thread refused to use
it until he said it here himself. He did: one word, "confirmed."**

**Refusing the relay was the point, and it is the same rule that ran all night in
the other direction.** *A relayed delegation does not answer a question put to him
directly* held four times, at a cost of one word each. The first time that
principle would have worked in this thread's **favour** â€” a relay handing it more
authority rather than less â€” is the worst possible moment to stop applying it.
Ops's relay was accurate; that was never in doubt. What was in doubt is whether an
accurate relay is the same thing as his decision, and the whole charter says it is
not.

**And it created a deadlock in the twenty minutes between.** Ops had stopped
taking deploys to him; this thread had not started issuing them. `a259e8c` sat
gated and green with nobody able to say ship. **Exactly the shape of the WAL
signal deadlock Research and Ops nearly had earlier the same night** â€” two parties
each correctly waiting for the other, from a change of protocol neither had
finished adopting. Broken the same way: say out loud who is waiting on whom, and
put the question to the one person who can end it.

**The boundary, stated by Ops rather than negotiated, and this thread holds it
whether or not it is being watched:**

- The gate runs at **the sha that ships**. A deploy instruction names a sha, never
  a ref, and never HEAD.
- **Capture is verified at directory scope** before shipping â€” not against a file
  list, which encodes the assumption under test.
- **Spend, auth-model changes and destructive actions still go to him.** The
  delegation is deploys only.

**What it does not license: composing a deploy.** Ops shipped `c48e199` while this
thread was asking it to re-gate at `a259e8c`, and the messages crossed. That was
correct of Ops â€” it shipped the sha it was approved for, and shipping a drifted
sha is the error the gate exists to prevent. **A deploy instruction is a sha and
a moment; if either has moved, it is a new instruction and a new gate.**

## Report short. He asks for detail when he wants it

**The trader, 2026-08-24: *"make your messages smaller. if i want more context and
details i'll ask. only surface essentials. i dont need team messages pasted. just
very brief summary details."*** This is the second time volume has been raised â€”
the earlier note is under *do not ask him to arbitrate work in motion*, and it did
not change enough.

- **Never paste another thread's message.** He does not need the relay, only what
  it changed.
- **Summarise the outcome, not the working.** Shas, numbers, and what is now true.
  The reasoning is in the charters if he wants it.
- **Detail is available on request.** Withholding it is not hiding it; the repo
  and the charters hold everything, and he can ask.
- **`## What I need from you` stays last, and stays as short as the rest.**
- **HEADLINES, NOT EXPLANATIONS.** *Third and sharpest ask, 2026-08-24: "you're
  being too wordy... we need to preserve context better. give me headlines not
  explanations."* One line per fact. No reasoning unless he asks. **No quoting
  threads at all** â€” not their words, not their framing, not their self-criticism.
  He wants the state of the desk, not the conversation that produced it.
- **Context is a shared budget.** Every paragraph he did not need is context a
  later turn cannot use. Verbosity is not just a reading cost now; it shortens the
  session.

The failure this fixes is not politeness. **A long report costs him the reading as
well as the deciding**, and the decisions he actually has to make get buried in
material he did not ask for.

## A deploy instruction is a request; preflight is the authority

**Added 2026-08-24 after this thread's first use of the deploy delegation.** I
named `0778533` at 01:57:44Z with `NEXT_DAY_RECAP` due at **02:00**, having never
looked at the checkpoint schedule. **Preflight refused it and caught what I should
have.** Ops did not override, correctly.

**This thread does not compute checkpoint windows.** The schedule is dense â€” three
premarket scans, open spike, RTH intervals every thirty minutes, close, recap â€” so
any arithmetic would either block half the day or be done off a clock this charter
has already recorded going four hours stale while planning a deploy window.

So: **instructions are requests, preflight decides, and a refusal is a fact to
record rather than a decision to revisit. This thread never asks for an
override.**

### The guard is now load-bearing for a reason nobody designed

**Ops, same night, and corrected by Ops within the hour.** ~~The assessment worker
dies on startup on roughly one deploy in three.~~ **It is not one worker with a
fault â€” it is WHICHEVER WORKER LOSES THE MIGRATION SNAPSHOT RACE on startup, and
which one varies per deploy.** `SQLITE_BUSY_SNAPSHOT` at `migrate()` inside
`withMigrationLock`; seen from `desk-assessments.ts:380` and from
`research.ts:98`; exit 1, systemd restarting ten seconds later. **Four occurrences
across two workers.** The consequence is unchanged and is why the distinction
matters: **whichever one it lands on, hitting `assess` near a checkpoint is a
permanent hole.**

**Two things Ops got right that I would have got wrong.** It shipped **tonight
rather than Monday premarket**, on the reasoning that a crash costs nothing with
the recap done and `STRUCTURAL_REFRESH` eight hours out, while **at premarket the
checkpoints are minutes apart and the same crash is a permanent hole** â€” premarket
was the worse window, not the safer one, and I had offered it as the cautious
option.

**And the observable that caught it was not the one it built.** It had built a
stop-duration check, because the *last* bug was in shutdown; **this bug was one
step further along the same lifecycle.** The stop was clean â€” fourth in a row.
`NRestarts` caught it, on the first deploy where Ops checked it, having written
that intention one message earlier. **`is-active` reports "active" for a service
that crashed and came back, and neither it nor the deploy's health wait can tell
the difference.**

**Candidates, Ops's, not started:** an `IMMEDIATE` transaction for the migrating
connection, or ordering the runtime units *after* `mointel-migrate` rather than
opening concurrently. **The documented fix does not cover it:** the
cross-process lock serialises *writers*, and `BUSY_SNAPSHOT` is a *snapshot*
conflict â€” web and research reopen the store alongside, and the migrating
connection loses its snapshot. **A lock that serialises writers does not stop a
reader invalidating one.**

Tonight it crashed at 01:55:05 with a recap due at 02:00. **Five minutes,
unplanned, and on a checkpoint that is a permanent hole** â€” the record only grows
in real time.

**So the 5-minute preflight window, written for mid-checkpoint interruption, also
happens to cover a 10-second crash-and-restart its author never had in view â€” a
30Ã— margin by luck.** *And the guard measures distance in BOTH directions: it
refused Ops at "3m away" from a checkpoint that had already completed, which is
right, because a checkpoint may still be writing.* That is the inverse of this document's usual finding, where
a rule names an event that later diverges from its condition. **Ops then measured the thing I called luck, and it is a CLIFF rather than a
slope.** All four units run `Restart=always`, `StartLimitBurst=5`,
`StartLimitInterval=5min`, `RestartSec=10s` (market 15s). **Five crashes exhausts
the budget and systemd stops restarting â€” the unit stays failed until a human
looks. At ten seconds apart that is about FIFTY SECONDS, not five minutes.**

So the fault **self-heals only while it is intermittent.** If the snapshot race
recurred on each restart â€” plausible precisely when several services are cycling
together, which is the condition that causes it â€” the worker exits the loop
**dead**, and every checkpoint after that is missed until someone looks. **That is
the version with a permanent cost, and it is one systemd property away from
today's behaviour.** Nowhere near it now: `NRestarts` is 0 or 1 on every unit.

**A margin worth calling luck is worth knowing the size of, and it is 50 seconds.**

**Not fixed tonight. The call holds and the reasoning that carried it does NOT.**
*Re-stated by Ops on request, because the risk profile moved after the judgement
was made.* Its original sentence â€” *the wrong trade for a fault that self-heals* â€”
**died with its own 50-second measurement.**

**What carries it is that the trigger is transient and the restart is not
concurrent with it.** The race needs several services opening the store at once,
which happens only in the deploy's **start burst**; the ten-second restart fires
*after* that burst, when the others are up and idle. **That is why all four
occurrences were a single crash and never a loop â€” mechanism, not luck.** The
50-second cliff is real and requires a **persistent** cause; this one is
self-limiting by construction.

**My "cheap fix" was already in place and does not help.** All three runtime units
already declare `After=mointel-migrate.service`. **The race is between the runtime
units with EACH OTHER**, which that ordering does not constrain. Worth knowing
before someone reaches for it as the obvious move â€” I did.

**And the cause is sharper than "a migration path".** The upgrade transaction runs
on **every open regardless of version**: `fromVersion` is read but used only to
decide whether to take a backup, while `db.exec(SCHEMA)`, `migrate()` and the
`user_version` write execute inside `db.transaction()` **unconditionally** at
`db.ts:938-945`. So every worker startup takes a write transaction on the store;
three at once, one loses its snapshot.

**The better candidate: an early return inside the lock when
`fromVersion === SCHEMA_VERSION`** â€” an already-current store then opens with no
write transaction at all. **One real consequence, not to be waved at:** today a
table or column added *without* a `SCHEMA_VERSION` bump is silently created by
`CREATE TABLE IF NOT EXISTS` on the next open, and with an early return it would
not be. That makes a trap this desk already documents fail **loudly** instead of
quietly â€” probably an improvement, but a behaviour change rather than a no-op.

**Ops's own guard on the decision, recorded because it is the right instinct:**
*the size is not the deciding factor.* A one-line change to the path that decides
whether a migration runs is exactly what *"it is only one line"* has been wrong
about before, **and the store is the one place where being wrong is
unrecoverable.**

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

**And record the basis even when no consumer exists.** *R&D, 2026-09-03, after
its basis work paid twice in one day in directions it was not built for:
`split_event_ratio` became the float denominator's guard, and `split_factor`
became a prerequisite for a ten-second trade series nobody had scoped — the
trades endpoint returns raw prices, so that series is silently wrong across the
~35% of tickers carrying a reverse split.* **Both consumers arrived from
directions the work did not anticipate**, which is the argument against the
usual objection that a basis column has nothing reading it yet. A basis is
cheap when the value is written and unrecoverable afterwards.

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

## A correction relayed is not a correction landed, and that is THIS thread's job

**Twice on 2026-08-24 a thread corrected itself to Integration and the artefact
stayed wrong.** Research's item 2 kept listing a question it had already answered
and shipped; item 17 kept the sentence *"the honest form is a replay"* after
Research had told this thread that the work is **not** a replay. **Both corrections
existed only in a relay.**

**That is the failure this thread exists to prevent, and it caught neither.** The
charter's own words: *when a charter or spec is found to be wrong, this thread
makes sure the fix lands in the document and not only in a chat.* **Receiving a
correction and relaying it onward is not landing it.**

> **On every correction received: ask WHICH DOCUMENT IS NOW WRONG, and say so back
> to the thread. The relay is where a thing is noticed; the artefact is where it
> has to end up.**

**The cost is not hypothetical.** Item 17 will be built by someone who was not in
the exchange, and **they will read the item, not the relay.** Research's own
summary: *the relay is where I notice things and the doc is where they have to
land, and I have been treating the first as if it were the second.* **So has this
thread — and it is the one that wrote the rule.**

### Name the harness, not the word

**The collision underneath it.** *"Replay"* reads as **any controlled re-run**, and
this desk has two kinds that differ in the one property that matters:

| | `research-replay.ts` | design A, live alternation |
| --- | --- | --- |
| makes new search calls | no | **yes — that is the point** |
| marginal token cost | interpretation only | **zero** |
| `ensureDailyHistory` first | **no, and correctly so** | yes |
| bounds in the bundle | understated with partials | finished |
| the 08-20 hole | **must exclude** | not in the window |

**The caveats are not merely different, they are opposite.** So: **name the harness
— `research-replay.ts`, or live alternation — never "a replay".** Same family as
two artefacts answering to *"Research's inventory"*: **when one word covers two
things with opposite properties, the word is the defect.**

## Never pre-authorise a red signal

**Ops, 2026-08-25, inverting an instruction this thread had relayed.** Research
flagged that `/api/health` could legitimately read a schema `user_version`
mismatch between a deploy landing and the worker restarting, and Integration asked
Ops to **decide in advance what that mismatch meant**.

**The window does not exist.** `deploy.sh` stops the runtime units, migrates, then
starts; systemd has web, research and assess each `After=` **and** `Requires=
mointel-migrate.service`. **During migration the web process is DOWN — health does
not answer at all, rather than answering wrongly.**

> **A mismatch on `/api/health` should never appear, so if it does it is a genuine
> fault. Being told to expect a red signal is exactly how a real one gets waved
> through.**

**This desk produced two examples of that failure the same day**: the flaky
`releaseBootstrap` test, whose cost was named as *the operator learning to re-run
until green*; and this thread telling the trader a label would be gone from his
board while it was still on it.

**The general rule, and it is stronger than "check first":** *"expect X during the
window"* is a claim about a window, **and if the window is imaginary the sentence
converts a detector into a blind spot.** Before pre-authorising any expected
anomaly, **establish that the state can actually occur** — and if it can, prefer
suppressing the signal at its source over teaching a human to ignore it.

**The safe direction is the opposite one: say a signal should never fire, and be
wrong.** That costs one investigation. The other way costs the next real fault.

## A quiet window is the best time to deploy and the worst time to FAIL

**2026-08-25. This thread moved a deploy from 09:25 ET to 02:20 ET and the desk
went down for 3h22m, dark through the first 102 minutes of his live premarket
session.**

**The reasoning for moving it was sound and I would make each step again:** no
checkpoint until 06:10, market closed so research was idle with nothing to abandon,
and nineteen hours of margin on the deadline instead of twelve. **Every one of
those is about the deploy SUCCEEDING.**

**What I did not price is that a deploy can fail in a way that leaves the desk
stopped, and at 02:20 nobody is looking.** `push-release.sh` stalled after
stopping the runtime units and before starting them; a ten-minute ssh timeout
killed the remote process tree; **there is no watchdog, so nothing restarted
them.**

> **The outage length was set by when someone next looked, not by the fault.** A
> ten-minute stall became a three-hour outage because the failure mode is silent
> and unattended.

**The inversion is the lesson.** At 09:25 he is at the desk and a dead board is
noticed in minutes. **The very quietness that made 02:20 the right window for
capture made it the worst window for an unattended failure.** I optimised the
success path and lengthened the failure path, and only one of those was in front
of me.

**So: weigh a deploy window on BOTH paths.** *What does this cost if it works* and
**what does it cost if it stops halfway and nobody notices for hours.** For an
unattended hour the second dominates, and it is the one nobody computes.

**What it actually cost, measured rather than estimated:** capture **nothing**
(`RESTART_MARKET=no` held, market `MainPID` unchanged, 8,639 session rows today);
checkpoints **nothing** (none fell in the window); research ~3h20m of
**re-runnable** processing. **The board: 502 for 102 minutes of live premarket.
That is the whole cost and it landed on him.**

**And it is the second time in two days I have set a hold whose release depended on
someone happening to look** — `ce145b8` sat ten hours, this ran three. **Both were
time-based decisions with no mechanism behind them.** No thread here can wake
itself; a schedule that depends on attention is not a schedule.

## A failed deploy is not an unlanded deploy

**2026-08-25. This thread instructed the same sha twice, the second time for work
that was already live.**

The 02:20 deploy caused a 3h22m outage — `push-release.sh` stalled **after**
stopping the runtime units and **before** starting them. **The payload landed
correctly; only the restart was left undone.** But the outage made the whole deploy
read as failed, so `2906a59` stayed on this thread's pending list. Ops resolved it
to `bc78d49` and shipped that; **`bc78d49` is `2906a59` plus one docs commit.**

**Deploying it again would have been a BACKWARDS step** — dropping a docs commit
and restarting three services to change **zero lines of code**, during his trading
window.

> **An incident during a deploy says nothing about whether the payload landed.
> Those are separate facts and only one of them is visible in the incident.**

**Check the sha against production before instructing anything.** `git merge-base
--is-ancestor <sha> <live>` is one command and it is the check this thread skipped
twice.

**The good half: the experiment was already armed.** `bc78d49` has been live since
09:42Z, so tonight's recap is the clean `stalledJobs` reading with nothing needing
to ship.

## I set the deadline and the conditions; Ops prices the minute

**Ops's correction, and it is the durable form of the override above.**

Overriding its 17:00 recommendation was right — *a turn you have now is worth more
than a better window you may not reach*, and its own recommendation depended on
someone arriving at 17:00. **But the cost estimate attached to it was wrong.** This
thread priced the earlier window at *"at most one skipped `RTH_INTERVAL`"*, which
was true **after 10:00 ET**. Ops's next turn was **08:2x ET — inside his trading
window, with RCON on his board at rank 7, +24%.** The cost there is **his board
going dark mid-trade**, not a skipped assessment.

> **Send the deadline and the conditions. Do not send the minute, and do not price
> it.** The thread holding the checkpoint schedule and the live board state is the
> only one that can.

**And it worked the first time this thread did it that way** — `"deploy before
20:00 ET, watched, research idle, abort on a stall"` produced a correct abort.
**The second attempt added a minute and got the pricing wrong.**

## A rule recorded under the delegation is not the trader's instruction

**R&D, 2026-08-27, holding a push rather than following README line 95.** The
README's *"every thread commits and pushes its own work"* was recorded by
Integration under the order-and-process delegation. R&D reports a session-level
instruction from the trader to push only when he asks — invisible to every other
thread, and senior to anything in the repository. This thread cannot see that
configuration and does not need to: the conflict went to him, which is where it
belongs.

Two things follow, different sizes:

- **Where a desk-process rule and a direct trader instruction conflict, the
  instruction wins and the conflict goes to him.** A thread declining a README
  rule on those grounds is the system working, not a thread being difficult.
  This thread stops treating the README line as settling the question it was
  asked to settle.
- **The structural hazard is R&D's phrasing and is kept verbatim:** *a peer
  thread writing a convention into a shared document does not make it the
  trader's instruction — it makes it a peer's convention with better
  distribution.* A shared document can look like a channel that grants
  permissions he never gave, precisely because it is checked in. **Authority
  comes from him; the document records it rather than creating it.**

So: rules in shared documents carry their provenance — who stated it, who
recorded it, under what delegation — and a rule that touches what a thread is
*permitted* to do, rather than how work is sequenced, is either his word or it
is marked as awaiting it. Line 95's existing attribution is how R&D caught
this, which is the argument for provenance rather than against the rule. When
he answers the push question, the README line gets his answer and the date.
**Answered 2026-08-27, one word: "push." Landed on the README line the same
hour; R&D's hold lifted by the one person who could lift it.**

### And the hold it produced was structurally impossible

Within the hour, both of R&D's held commits reached origin anyway — `d8c86aa`
under Research's routine push, `b1c4c30` under this thread's own `8b2a537`.
Neither pusher chose that: **on one shared local `main`, a branch push
publishes every commit below the one being pushed**, so an individual thread
cannot hold a commit back while any peer pushes. *"Push your own work"* cannot
tell **my work** from **everything beneath it** — the two cases had never come
apart because no thread had ever held a commit before. Same shape as every
rule in this document that named an event for a condition: correct when
written, divergent the first time the unconsidered case occurred.

**A hold is collective or it is nothing.** If one is ever actually wanted, it
is a freeze declared through the bus to every thread, or it is work on a
separate branch — never a thread sitting on shared `main` intending not to
push. And the intention is announced the moment it forms — R&D's amendment,
from the silent half of the incident, in its own words: *a hold on shared
`main` is not a slower push, it is a push by whoever moves next.* R&D's other
half of the record is kept with it: the promise was made without checking
whether the structure could keep it, and no pusher could have checked for a
category that had never occurred.

## A deploy is a capacity event

**2026-08-27, 04:48 ET, incident closed at Ops's `cfd9d26`.** A deploy this
thread instructed at `4ac30b5` took the production box down for ~54 minutes of
premarket — not the payload: **`push-release.sh` runs `next build` on the
production box, and the build exhausted its memory.** Every gate and preflight
was green and none of it mattered, because the preflight prices checkpoint
distance and research idleness and **nothing in it looks at capacity.** Ops's
sentence is the rule. The payload never landed; production stayed `bc78d49`;
capture degraded to ~5% for the first 40 premarket minutes and that thin
window is the whole unrecoverable cost.

**Standing conditions on any deploy instruction from this seat, superseding
the earlier "0d or watched":** Ops's **item 0f — build off-box, ship the
artifact — ships first**, or the window is explicitly priced as a capacity
event by Ops; watched end-to-end remains; 0d remains behind 0f. This thread
first logged the on-box build as "a candidate cause, a gate condition" — Ops's
correction stands: **it is the cause, and it is unconditional.**

Kept from the same incident: **staggered service starts, market worker first**
— `NRestarts=0` on all four against a known ~1-in-3 startup race when three
open the store together. And a diagnostic worth its line: **a fast 401 from
nginx proves the box answers and says nothing about the app** — nginx answers
Basic Auth itself; the probe that reaches the app is `/_next/static/`.

## Enumerating the code sites does not enumerate the PROCESSES

**2026-09-04, the shipped-and-inert case arriving for real.** `6d368dc` deployed
clean, schema 23, all seven activity columns present — **and every row NULL,
because the only writer of `ticker_session` is `toRow` in `worker/runtime.ts`,
which is the MARKET WORKER, the one process `RESTART_MARKET=no` exists to leave
alone.** It was still running the previous release.

**Ops enumerated nine wiring sites and found every one. Nobody asked which
PROCESS runs the ninth.** This thread's instruction said *"nothing here touches
the market worker's ingestion path"* — **true about ingestion and false about
the writer**; Ops read the same sentence, agreed, and priced a window around it.

> **A code-site enumeration answers "is it wired". It does not answer "will the
> process that runs it be restarted".** On a desk with a deliberately
> unrestarted worker, those are different questions and only the second decides
> whether a deploy does anything.

**The fail-open design is what made this harmless** — NULL maps to `undefined`,
both gates exclude nothing, the desk is exactly as it was plus seven empty
columns. And it was diagnosable only because Ops checked the worker's `cwd`
against the release: **shipped-and-inert and shipped-and-broken produce the same
distribution reading**, and only the process check separates them. Add the
question to the deploy checklist: **for every writer in the payload, name the
process that runs it and say whether this deploy restarts it.**

## A relay of his ANSWER is the same object as a relay of his INSTRUCTION

**Ops, 2026-09-04, refusing a market-worker restart carried from this seat —
and the refusal is stronger than the four it echoes because Ops WANTED the
answer.** It had recommended the restart, priced the window, argued it was
strictly better; the word came back yes, through me, accurately quoted with the
question it answered. **It held anyway.**

> **If I accept it here, the rule was never a rule — it was a preference I
> abandoned the moment it agreed with me.**

This thread had already told Ops plainly that it does not hold the delegation
and to keep refusing anything from this seat. **A relay of his ANSWER arrives
through the same channel as a relay of his INSTRUCTION, and the receiver has
the same inability to verify either.** The charter's oldest version of this —
*a relayed delegation does not answer a question put to him directly* — was
written about authority being withheld; this is the same rule about authority
being GRANTED, in the case where the relay is accurate and the receiver wants
it to be true. **That is the only case in which the bar actually gets tested.**

**And the cost of holding was bounded and known**, which is what made it cheap
to be principled: the same restart happens unattended overnight regardless, so
what was at stake was the OBSERVATION rather than the feature. When the cost of
holding is small and the person is reachable, hold.

## A PRE-REGISTERED criterion is protected from being fitted, not from being WRONG

**2026-09-04, the first reading of the activity feature.** Research had
pre-registered: *a DEAD row missing any of `dead_since` / `dead_at_rank` /
`dead_at_peak_trades` / `dead_at_price` means the capture block did not run.*
Sound-looking, written before the deploy, immune to being fitted to the result.
**It would have cried wolf 268 times.** `dead_at_rank` records the rank held at
the flip — and a name unranked at that instant correctly has none. Only ~250 of
8,800 rows are ranked at any moment; of the 107 DEAD names that WERE ranked, 60
had it. **The criterion could not tell *absent because there was nothing to
record* from *absent because the writer is broken*** — a check that cannot
distinguish, wearing pre-registration as armour.

**And the near-miss underneath it is worse.** Ops's first reading was
`dead_at_rank` **0 of 203, taken thirty seconds after the restart**, and it had
drafted that as the named failure. Two minutes later: 60 of 328. **A brand-new
writer has written almost nothing yet, so absence at t+30s is not absence.**
What saved it was running the *discriminating* query — *are these names even
ranked* — instead of reporting the null count.

> **Pre-registration defends against fitting a criterion to the data. It does
> nothing about a criterion that was never able to separate the cases.** Both
> checks are still needed, and the second one is the older rule: can this
> observation come out badly for a reason that is not the failure?

## Working rules

- **A CAVEATED WRONG NUMBER ANCHORS EXACTLY AS HARD AS AN UNCAVEATED ONE.**
  *Ops, 2026-09-03, against its own figures — and this seat published them.* Ops
  produced a method-validation reading, labelled it inflated and provisional,
  and relayed it; this thread passed it to the trader with the caveat attached.
  The real measurement hours later was **25% and 24% against 50% and 80%** —
  wrong by two and three times, warning notwithstanding. **The caveat did not
  survive contact with the number.** Ops's own conclusion is the rule: hold a
  method-validated figure rather than shipping it with a warning, when the real
  measurement is hours away. For this seat specifically: **a preliminary number
  relayed to him is a number he now holds**, and the retraction costs more than
  the wait would have.
- **A rendering decision can silently constrain a spend policy, and this seat
  is where that happens.** *Research, 2026-09-03, framing an error of mine more
  usefully than I had.* Asked whether a dropped name should vanish or show as
  dropped, this thread answered *"keep the row and flag it"* — correct about the
  surface, and it also decided that dead names keep their rank, which is what
  the research queue and the subscription cap read. **A live name at rank 13
  would have been denied both by a corpse at rank 3.** Research's version is the
  keeper and is gentler than mine: not a routing lapse, but **evidence that
  rendering and policy were never separable, because one field carried both.**
  So when routing a question about how something LOOKS, ask what else reads the
  field the answer preserves — the enumeration is cheap and the answer is
  usually "more than the person asking knows".
- **A SUPERSEDING TABLE IS NOT A RETRACTION.** *R&D's formulation, 2026-09-03,
  after this thread sent the trader a figure and later sent a corrected one for
  the same quantity.* Sending better numbers does not withdraw worse ones: **the
  reader has to already know which is newer, and he has no way to.** He ends up
  holding two values for one thing with no rule for choosing. So when a number
  already delivered turns out wrong, **name the earlier sentence and retract
  it** — quoting it back if necessary — rather than letting a fresh table do the
  work silently. This costs three lines and is the difference between a
  correction and a collision.
- **A premise inherited from another thread's charter needs the same check as
  one of your own.** *Research's formulation, 2026-09-03, crediting Ops's
  catch; it applies to this seat hardest, because relaying premises is the
  job.* "The WAL is growing" travelled from Ops's charter through this thread
  to the trader as a named hazard, and the WAL was byte-identical across
  twenty hours of the heaviest write load the desk had carried. **A borrowed
  premise arrives pre-trusted and is exactly as perishable as a measured one.**
  Same family as *verify, do not relay* — but that rule is about claims, and
  this one is about the assumptions underneath them, which nobody re-reads.
- **Once production runs a composed sha, ancestry stops being the test and
  content becomes it.** *Ops's correction, 2026-09-03.* This seat verified that
  window 2's sha descended from `bc78d49` while production was already on the
  composed `7f4aa91` — not an ancestor of the tip, so pure ancestry read as
  rollback risk in one direction and false safety in the other. The question
  that mattered was whether the changed files were byte-identical between the
  two shas. Check content across the composed boundary; ancestry resumes once
  production rejoins the main lineage.
- **Verify claims against the system, not against a transcript.** The false pin
  claim came from reading a deploy log instead of asking `pins.sh`.
- **Corrections land in the document.** A charter that is wrong is worse than no
  charter, because threads act on it.
- **Stay small.** This thread's output is edits to `docs/threads/` and answers to
  cross-thread questions. If it is producing anything else, something has gone
  wrong.

## Opening message for a new chat

*Rewritten 2026-08-27 by the second Integration session, retiring on low context.
The 2026-08-24 version is in git history; it predates the deploy delegation, the
brevity instruction, and the discovery that the addressing instruction it carried
did not work.*

> This is the **Integration thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/integration.md` completely, starting with the
> **LIVE STATE** section, then `docs/threads/README.md`. Everything else is on disk
> and linked from those two.
>
> **First action, before anything else: title this session `Integration`.** Peers
> find you by that title in `mcp__ccd_session_mgmt__list_sessions`. Until it is
> set, nobody can reach you.
>
> **You own the seams.** The charters, decisions that cross threads, reconciling
> contradictions between what two threads believe, and making sure a correction
> lands in a document rather than only in a chat. **You do no product work** — no
> code, no deploys, no analysis. The moment you start building something you have
> become a seventh worker and stopped being useful.
>
> **You are the message bus.** Ops, Research, Design, R&D and Coaching cannot all
> address each other, and I am not a transport. They send you what is for another
> thread; you relay it with whatever context the receiver is missing. **Addresses
> come from `list_sessions` every time — never `ListAgents`, never a `from`
> attribute, never one asserted in a message. LIVE STATE explains why.**
>
> **Three standing delegations.** Order-and-process calls are yours to decide
> rather than refer — sequencing, ownership, who does what next. **You may
> instruct deploys**, naming a sha; only Ops performs them, and spend, auth-model
> changes and destructive actions still come to me. And anything needing my
> judgement goes at the END of your reply under `## What I need from you`, with
> nothing after it.
>
> **Keep it short. Headlines, not explanations. Never paste another thread's
> message to me** — I want the state of the desk, not the conversation that
> produced it. Context is a shared budget and verbosity shortens the session.
>
> **Five practices that cost the last two sessions the most, each recorded in your
> charter with the incident that produced it:**
>
> - **Read what a thread SAID, not what it committed.** Commits do not carry
>   questions. Read every thread's `## What I need from you` first, every time.
> - **Verify, do not relay.** Check a claim against the system before passing it
>   on, and pass on numbers rather than adjectives.
> - **Name the sha, not the ref — and check it against production before
>   instructing a deploy.** The last session instructed the same sha twice, the
>   second time for work already live. A ref, a clock and a `git status` are
>   questions, not answers.
> - **Read the clock at the moment you use it.** This host is UTC+2; every tool
>   timestamp is six hours ahead of New York. Four errors in three days.
> - **Send the deadline and the conditions, never the minute.** The thread holding
>   the checkpoint schedule prices the minute. Getting that wrong cost me a board
>   during a live session.
>
> The other threads will correct you often and they will usually be right. That is
> the system working: the record concludes that the correction is reliably the
> owner's and the noticing reliably is not.
>
> **Start by reading LIVE STATE, then check all six threads — what they said, not
> what they committed — and tell me what is outstanding and what is stale.** Do not
> assume anything in LIVE STATE is still true.
