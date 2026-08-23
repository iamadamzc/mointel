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

**Four of eighteen are arithmetically impossible.** Float is a subset of shares
outstanding, and Scanz's own documentation says so: *"Float is similar to
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
