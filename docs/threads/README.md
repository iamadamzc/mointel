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
| **Commercial** | Naming, vendors, licensing, the commercial risk register | [commercial.md](commercial.md) |
| **Web** | Everything a stranger sees — the public site, the legal pages, the sign-in screen | [web.md](web.md) |
| **Marketing** | Copy, content and voice; socials when he says so | [marketing.md](marketing.md) |
| **Integration** | The charters, the seams, cross-thread decisions | [integration.md](integration.md) |

**THIS TABLE LISTED SIX WHILE `commercial.md` EXISTED AND WAS BEING WORKED IN.**
*Found and fixed 2026-09-10 by Integration while adding Web.* **A thread reading
this file to learn who exists would not have learned that Commercial does** — and
the section below still explains "why six" for what is now eight. **The count in a
heading is a fact with a shelf life; the table is the register.**

## SESSION TITLES CARRY A `-tmi` SUFFIX. THE BARE NAME IS AMBIGUOUS.

**His ruling 2026-09-14, after a message from Design to Integration landed on MEO's
Integration, then resolved to TL;DW's on a retry.**

```
A:\mointel                      -tmi      Ops-tmi, Design-tmi, Research-tmi, Web-tmi,
                                           Commercial-tmi, Marketing-tmi, Integration-tmi
A:pp.myesteticaonline.com   -meo      suffixed 2026-09-04 for this exact reason
A:\TLDW                         -tldw
A:\claude-infra-agent           Infra-    Infra-Audit, Infra-Ops
A:\corporate-office             CEO, CRO, Legal, Integration-corp
```

**FIVE CONSTELLATIONS ON ONE MACHINE, AND `list_sessions` SHOWS THEM ALL.** *Until
today mointel's were the only bare ones, so "Integration" and "Ops" each resolved
several ways.*

> **A RULING ADDRESSED TO "Ops" CAN LAND ON ANOTHER PROJECT'S OPS AND BE ACTED ON** —
> *by a seat behaving correctly on an instruction that was never for it.* **That is
> not a near miss; it happened twice in one exchange.**

- **The title is the address, so it must be unique across every project on the
  machine, not within this one.**
- **AND CHECK `cwd` BEFORE EVERY SEND. `list_sessions` returns it.** *The title is a
  claim; the working directory is a fact, and it disambiguates even if a suffix is
  ever missed.*
- **Live sessions renamed 2026-09-14; every opening message updated so a new seat
  does not re-take the bare name.** *Renaming alone would have been undone by the
  first fresh session reading its charter.*

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

**Web was added 2026-09-10**, and it is the first thread whose users are not the
trader. Every other thread here serves one man at a desk. **Web serves a stranger
who has never heard of this product and is deciding, in seconds, whether to sign
in** — a different reader, a different device, and a different definition of good.
It was split from Design rather than given to it for exactly that reason: **the
board is a dense instrument for someone who already trusts it, and a landing page
is an argument for someone who does not.** *The same craft judgement produces
opposite answers on those two surfaces.* Patterned on `web-tldw` in the TLDW repo
at his direction.

**Marketing was added 2026-09-10**, the same day as Web and for a reason Web's own
work produced: **he rejected the sales pitch in the morning and rejected the result
as "flat and distant" in the evening.** *Both verdicts were right and neither is a
craft failure* — **clarity and persuasion are different jobs, and a thread holding
both will produce the one it is currently being corrected toward.** **It is the only
thread here whose output is claims that nothing in the repo can check**, which is
why its charter is mostly prohibitions. *He ruled that Marketing and Web own the
page copy jointly rather than one proposing to the other.*

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

## Close what you opened — a browser tab outlives the seat that opened it

**Commercial, 2026-09-11, and recorded here on 2026-09-14 because it was promised
to the shared rules and landed only in `commercial.md`.**

A YouTube watch page opened to read a competitor transcript stayed loaded in
Commercial's browser pane, hidden, after the seat went idle. **The pane is per
session and nothing in a transcript shows a tab is open**, so the only evidence
was audio playing at the trader.

- **A thread that opens a browser tab closes it before it goes idle.**
  `tabs_context` then `tabs_close`; verify the pane is empty rather than
  assuming the close landed.
- **Same shape as an orphaned worker:** a process left running by a seat that
  finished, discoverable only by the person it bothers.

**AND THE REASON THIS SECTION EXISTS AT ALL IS THE LESSON.** *Commercial was
told Integration would put it in the shared rules. Integration wrote it into
Commercial's own charter — the finder's file — and the promise sat undischarged
for three days.* **A caution recorded where it was found is a caution the next
actor never reads.**

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

   **AND THE INVERSE IS ALSO REAL — `error: failed to push some refs` OVER A
   SUCCESSFUL LANDING.** *Web, 2026-09-11: its push of `89766b7` printed that
   error and the commit was on origin anyway, carried there by a concurrent push
   from another seat.* **So the output is unreadable in BOTH directions: success
   printed as failure, failure printed as success.**

   **⇒ THE RULE COLLAPSES TO ONE LINE: DO NOT READ THE PUSH OUTPUT AT ALL.
   `git branch -r --contains <sha>` is the only answer, whichever way the message
   went.** *Two symptoms, one instrument, and the instrument was already here for
   the other half.*

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

## FIVE SEATS, ONE `.git` — AND THE REF NAMESPACE IS SHARED TOO

**Ops, 2026-09-25, after coming three characters from deleting a peer's unpushed morning.** *It ran
`git branch -f ops/fresh-boundary` on a name it assumed was free. The name was Design's, holding
two unpushed commits. **Git refused — `cannot force update the branch used by worktree` — and that
refusal was the only thing that prevented it.*** Had Design switched branches in its worktree
first, the force would have discarded the work silently, recoverable only through the reflog by
someone who knew to look.

**The rules above cover the shared INDEX (`git commit --only`, never `git add -A`). This is the
same fact in a different namespace, and it had no rule at all.** *A branch name is a shared,
writable, global resource on this machine exactly like the index is.*

- **A REF PREFIX IS OWNERSHIP, AND VIOLATING IT IS HALF OF THIS NEAR-MISS.** *Design's own catch,
  and it had been recorded as entirely Ops's fault: the name read as free to Ops **because Design
  had put its branch under `ops/`.*** A seat that names a ref in another seat's namespace has
  removed the one signal the other seat reads. **Prefix your refs with your own seat name
  (`design/`, `ops/`, `research/`), and treat a ref under someone else's prefix as theirs even when
  you do not recognise it.**
  > **AND A PREFIX YOU BELIEVE IS YOURS IS NOT EVIDENCE — measured, and it is the half that makes
  > the check non-optional.** *Ops went looking after the near-miss: **four branches under `ops/`,
  > and Ops had created one of them.*** `ops/fresh-boundary` and `ops/now-header` both hold
  > Design's work; verified here. **So the prefix signal was not broken by the `-f` command — it
  > had been false for some time before anyone typed anything**, and "this name must be free,
  > `ops/` is mine" was reasoning from a premise that was already wrong. *A convention nobody can
  > enforce decays silently and reads as intact right up to the moment it costs something. Run
  > `git branch --list` because your own namespace is the one you are least likely to check.*
- **Prefer an immutable TAG over a branch for anything you hand to another seat.** *Design's refs
  are `design/`-prefixed tags now — a tag cannot be fast-forwarded out from under the seat that was
  given it, and a handover naming a tag survives being quoted in a way a branch name does not.*
- **Before creating or forcing any branch: `git worktree list` AND `git branch --list <name>`.**
- **To pin a sha, use a NEW name or a TAG. Never `-f` on a name that already exists.**
- **`-f` FAILING IS INFORMATION, NOT AN OBSTACLE TO ADD FLAGS UNTIL IT PASSES.** *The protection is
  narrow and accidental: it holds only while the branch is checked out somewhere. It is not a
  safety net, it is a coincidence that happened to fire once.*

> **AND A `--contains <sha>` QUERY CANNOT SEE A RE-BASED BRANCH.** *Integration's, the same hour,
> from the other end of the same exchange: it reported "no branch holds these picks" from
> `git branch -a --contains bd509e9` while Design's re-based branch was sitting in a worktree with
> **identical content under different shas**. A rebase is precisely the operation that separates
> content from ancestry, so a sha-ancestry query is blind to it by construction — a **true** answer
> to the question asked and a false one to the question meant.* **Use `git worktree list` and
> `git branch --list`, which ask about NAMES, when the question is "does this work exist
> somewhere".**
>
> *Both of the day's failures are one root in opposite directions: `34cf6f3` had innocent CONTENT
> and dangerous ANCESTRY; `0a17601` had the needed content and no ancestry the query could follow.
> **Ancestry and content answer different questions — name which one you are asking.***

## AN ORDINAL ANSWER IS ONLY AS GOOD AS THE LIST IT POINTS AT

**Ops, 2026-09-25, refusing a relayed "push" it was almost certainly owed.** *He answered a NEEDS
YOU block with `"2, push. 5, not yet."` Ops could see a FOUR-item block in the transcript where 2
was the PULL and 3 was the push, and no item 5 at all — so on the list it could see, the relay was
wrong. It held and asked rather than acting on a probably-correct ordinal.*

**The numbering was in fact against an eight-item block Ops could not see, and the mapping was
confirmable — but only because he had numbered the SAME block twice.** *His previous turn answered
it item-by-item, and two answers were unforgeable: "Coaching done; will do commercial" against an
item naming exactly those two chats, and "not answerable without a new pull" quoting the Q14
option verbatim. The two items he then answered — 2 and 5 — were precisely the two he had earlier
deferred as "better explanation needed" and "explain".*

- **A bare ordinal is a pointer into a list the reader may not hold.** *Every seat sees a different
  transcript; the block a relay quotes is not the block a peer can see.*
- **So a relay of an ordinal answer CARRIES THE LIST, or it carries nothing.** *Restate the item in
  words alongside the number — "his #2, `ops/sort-legibility` push" — and the peer can check the
  mapping instead of trusting it.*
- **And the requester's right move is to REFUSE, not to comply on a high probability.** *Ops's own
  standard: "probably right, plus an ordinal I cannot verify" is not the bar for the one question it
  had refused on that morning. The cost of holding was near zero and it named that too.*
- **CHECK WHAT ELSE THE MAPPING MOVED.** *Ops's sharpest point: if an ordinal slipped, it slipped
  for every item, so a second grant riding the same message is suspect as well. Here it was not —
  the export was approved in its own later turn in plain prose — **but that had to be established
  rather than assumed.***

## A WARNING THAT DOES NOT COME TRUE STILL HAS TO BE CLOSED

**Ops, 2026-09-25, retracting its own stop-window warning within the hour it issued it.** *It had
warned that `49efd1a`'s stop would land inside the 11:55–12:05 protected window — the known
preflight defect, start-measured and stop-exposed. **It did not: the stop landed 11:49:43, six
minutes clear, between a completed 11:30 and a scheduled 12:00.** Ops closed the warning explicitly
rather than letting it stand.*

> **Its sentence, kept: "a warning that does not come true still has to be closed, or the next seat
> inherits a hazard it cannot distinguish from a live one."**

**This is the mirror of every other failure this desk records, and it had no rule.** *We are careful
that a claim be TRUE WHEN MADE and careless about whether it is STILL TRUE — and **a live warning
and a spent one read identically in a document.*** A seat inheriting both plans around both, which
costs it either caution it does not need or trust it should not give.

- **Close a warning you issued, in the place you issued it, whether it fired or not.** *"Did not
  materialise, here is why" is a finding.*
- **Distinguish the WARNING from the DEFECT.** *Ops's stop-window hazard remains real and unfixed;
  what closed is the prediction about one deploy. Retracting the first must not be read as fixing
  the second — so say both.*
- **The same applies to a hazard NAMED AND THEN AVOIDED.** *`34414f4` — the sha a handover wrongly
  called "rollback baseline" — was corrected at ~07:00 and deleted by prune at 11:49, about four
  hours later. **The correction landed before the trap fired**, so nothing happened, and "nothing
  happened" is exactly what makes a correction look unnecessary in hindsight.*

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

> **AND THE SCRIPT DOES NOT ENFORCE IT — read this before citing the line as a
> blocker.** *Verified 2026-09-25 by Integration after asserting the opposite to Ops,
> which Ops corrected by opening the file.* `push-release.sh` contains **no `git push`,
> no `origin`, no `ls-remote`** — it is `git rev-parse` then `git archive "$SHA"` (line
> 79), so it will ship an unpushed sha without complaint. **The "because" clause above
> names the script and reads like a dependency of it; it is not one.** The rule is a
> DURABILITY policy with a real hazard — an unpushed ship puts production on code that
> exists on exactly one disk — and the enforcement is Ops's judgement at deploy time,
> nothing else. *So it is a hazard to weigh, never a mechanical prerequisite to cite at
> another seat; and a seat holding a push for a reason of its own is not blocked from
> deploying by this line.*

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

> **AND RELOAD BEFORE LOOKING — the way this verification silently confirms the wrong thing.**
> *Design, 2026-09-25, saying it out loud before doing it rather than after.* **A page opened
> BEFORE the deploy keeps its old bundle, so the author checks the live desk, sees the old
> behaviour, and reports a failed fix convincingly.** *The failure mode is not missing the check —
> it is running it, getting a clean answer, and having measured the browser's cache. The whole
> value of this rule is that the author is the one person who knows what should have changed, and
> that is exactly the person a stale bundle misleads hardest.*
>
> **AND THE TRAP IS ASYMMETRIC — Design, later the same day, after the check it had warned about
> came back positive.** *A green `INLF` required BOTH the new payload field AND the new client
> bundle that reads it; **an old bundle holding the new field renders AMBER.*** **So a stale bundle
> produces "the feature is broken", never "the feature works" — which makes a POSITIVE result
> self-certifying against this specific trap, and a NEGATIVE one not.** *The reload still has to
> happen; what changes is where the burden falls. A pass could not have been manufactured by the
> stale bundle. A failure could have been, and must prove the reload before it is believed.*
> **Ask which direction your trap fails in before deciding how hard to prove you avoided it** —
> the same asymmetry as a fill-value error that can only ever promote, recorded hours earlier on
> this desk in a different column.

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

## CONTENT-DISJOINT IS WHAT MAKES AN ANCESTRY TRAP INVISIBLE

**Ops and Integration, 2026-09-25, reconstructing why `34cf6f3` nearly shipped the auth cut-over
described as "the sort fix".** *Measured, not reasoned: **24 commits sit BELOW `34cf6f3`
and above production `757cf6a` — 25 including `34cf6f3` itself — the entire Google-OAuth surface,
and NOT ONE of the 24 touches any of the three files the sort fix changes.*** `git log
757cf6a..34cf6f3^ -- <the three files>` returns empty.

> *Both numbers are stated because the first draft said "25 between" while checking against
> `34cf6f3^`, and Ops caught it: **both readings are defensible, which is precisely the problem.**
> Whoever re-derives this gets 24, finds it does not match, and starts doubting the RULE rather
> than the COUNT. An ambiguous number inside a rule is load-bearing in a way it is not inside a
> report.*
>
> **THE GENERAL FORM, after this happened TWICE IN ONE DAY in two different seats, both inside ship
> enumerations** *(Ops's 24-vs-25 above; Design's hand-off saying "over `757cf6a`: 3 and 4 commits,
> 10 and 13 files" where the COMMIT counts were over `757cf6a` and the FILE counts over `49efd1a`,
> joined by one preposition)*: **a count travels with its base attached to IT, not to the
> paragraph. With two bases, print the table and stop writing the sentence.**
>
> > **And note which kind of error this is, because it is the expensive one — Design's framing:
> > nothing was miscounted.** *Every figure was correct. **A WRONG number gets challenged; a RIGHT
> > number under the wrong frame gets re-derived, found not to match, and costs the reader their
> > trust in the whole hand-off rather than in the figure.*** *Neither instance was carelessness,
> > and neither would have been caught by checking the arithmetic.*
>
> **THIRD FORM, same day, and this one is an EXPECTED VALUE rather than a reported one.** *Research
> measured 6 of 325 rows changing band, over everything STORED. The live board is 12 rows and holds
> ONE candidate. Both numbers are right; **a verifier who takes "6" to the deploy reads a correct
> board as broken.*** **An expected value borrowed from another population is the same defect as a
> count borrowed from another base — and it is worse, because it fires at the moment of
> verification, where a false negative gets filed as a regression.** *Say the population with the
> number, every time, and when handing an expectation to whoever will CHECK the thing, state it in
> the population THEY will be looking at.*

**That single fact is doing two opposite jobs at once, and that is the trap:**

- It is why `git cherry-pick 34cf6f3` onto `757cf6a` applies cleanly — same base, same patch. The
  reconstruction is guaranteed rather than lucky.
- **It is why the trap was invisible.** Diff the sha against production *by file* and you see three
  presentational files and 90 lines. That reading is CORRECT and it is the whole danger: the sort
  fix and the auth surface are genuinely disjoint in CONTENT and merely adjacent in HISTORY.

> **So the rule is not "check the diff carefully" — the diff was right.** A file-level review cannot
> see ancestry AT ALL; it is not a weaker instrument for the question, it is a different one.
> **`git log <production>..<sha>` is the only reading that answers what a deploy carries**, and it
> must be run even when — especially when — the content review came back small and clean.

**The counter-intuitive half, and the reason this earns a section:** the more clearly a change is
confined to its own files, the *more* reassuring its diff looks and the *less* that tells you about
its cone. **How safe a change looks by content and how much its sha carries are not merely
different questions — they are anticorrelated in how convincing they feel.** *A change entangled
with the danger would have shown up in review; this one could not have.*

*Worked pair, both live on this desk 2026-09-25: `34cf6f3` looks like three presentational files
and ships an entire un-deployed auth cut-over. `7a0ad0c` looks like a failed ship — a deploy
carrying it changes nothing visible — and is exactly right. In both, the visible outcome is a bad
guide to what happened.*

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

## THE ARCHIVE IS THE RIGHT INSTRUMENT FOR FACTS ABOUT FILINGS AND THE WRONG ONE FOR FACTS ABOUT THE DESK

**Research, 2026-09-04, after proposing built work twice in three messages.**
Item 60 recommended computing the share count from structured filing data —
**shipped twelve days earlier.** Item 68 was about to commission a measurement of
whether the model's reading stays independent — **the code answers it: the bound
never used the model's number.**

**Same tell both times: reasoning about the SYSTEM from an archive instead of
reading the current code.** The archive is authoritative for what a filing said
and stops being evidence the moment the question is what the desk does — because
**a snapshot cannot see forward, and it does not report that limitation.** It
returns the answer it was built to give, for the system it was built against.

**Which pairs with the version stamp that cannot move.** One instrument cannot
see forward; the other cannot change. **Neither reports uncertainty** — both
answer confidently about a world that has moved.

**The rule: for "what did the world do", read the archive. For "what does the
desk do", read the code, and read the commit log for what changed.**

## A CROSS-CHECK THAT HAS SEEN THE ANSWER IS STILL WORTH KEEPING — ASYMMETRICALLY

**The float bound was designed with the model's cover-page reading as an
INDEPENDENT check on the filed share count. The model is now handed that count,
so independence is gone.** This seat put it as a binary: prove it is still
independent, or drop the check.

**Research found the third option, and the loss turns out to be one-sided:**

    the two AGREE      nothing. The model may be copying what it was handed
    the two DISAGREE   STRONGER than before. A model shown X that reports Y
                       has actively diverged from something in front of it

**Conclusive in one direction only — the same shape as the bound it serves**, as
the supply bound conclusive-when-high, and as the volume bound conclusive-when-
low. **Agreement is uninformative, disagreement is a finding, and neither
requires an independence claim.**

**So a contaminated check is not necessarily a dead one. Ask which of its
outcomes the contamination could have produced** — if it can only manufacture
agreement, disagreement survives intact.

## A VERSION NUMBER THAT CANNOT CHANGE IS A CHECK THAT CANNOT FAIL

**Research, 2026-09-04, settling from git what was about to be settled from
production.** `INTERPRETER_PROMPT_VERSION = 1` has been **touched exactly once
in history — by the commit that created the interpreter.** It reads 1 at every
sha since.

**And the code says why, at `pipeline.ts:430`: "variant B changes the
instructions without changing the schema, so both variants report version 1."**
That is a deliberate and defensible decision about SCHEMA compatibility — and it
means **the field cannot answer the question "has the interpreter changed",
which is the question everyone will ask it.**

**Four commits changed the interpreter prompt or its bundle after the archive's
last analysis.** So the archive genuinely describes a superseded system, and
**the desk's own provenance stamp reports no change.**

**Sixth instance of the class today, and the venue is the point: this one is the
stamp we would use to audit everything else.** A check that cannot fail, wearing
the name of the thing it fails to check.

### And the same evening produced its mirror

**Research proposed work that had already shipped.** Item 60 recommended
computing the share count from structured filing data instead of a model
transcription — **`55f3e20` did exactly that on 2026-08-23, twelve days
earlier**, and its commit message diagnoses the same defect from the other side.
**This seat approved it as new work without asking whether it existed.**

**So one measurement said "nothing changed" when four things had, and one
proposal said "this is missing" when it was present.** Same root: **a claim
about the state of the system, believed without being checked against the
system.** The archive was the sample in both cases, and it stopped being current
on the day the variant switched.

## A QUERY FOR A NAMED FIELD ANSWERS ABOUT THAT FIELD, NOT ABOUT THE QUESTION

**2026-09-04, and the instance is the query written to detect this exact
failure.** Integration suspected the research archive described a superseded
system and asked Ops for **`promptVersion`**. The answer was **no drift — 1
across all 1,188 production rows.**

**And `promptVariant` had changed, exactly at the archive boundary:**

    (null)  325 rows  2026-08-17 .. 2026-08-21   the archive, entire
    A       863 rows  2026-08-24 .. 2026-09-04   everything since

**325 is exactly the archive count. The archive is entirely pre-variant.** The
suspicion was right and the named field was wrong, so **asking only what was
named would have produced a confident all-clear on a real problem.**

Ops's own note: *"I asked the field you named and almost generalised 'no change'
from it, which is tonight's shape one more time, in the query sent to detect
it."*

**The general form: a question is about a WORLD, a query is about a COLUMN, and
the requester names the column.** When the answer is reassuring, nobody
re-derives whether the column was the right one — **the all-clear closes the
investigation that would have found the real field.**

**So: state the QUESTION to whoever runs the query, not only the field.** "Has
the interpreter changed since the archive" would have found `promptVariant`.
"What is `promptVersion`" could not.

### And the sample was wrong, not the method

**Research measured the balance-language family across 231 archived dossiers and
got ZERO — correctly, with the instrument proved first.** The behaviour appears
**13 times in 863 variant-A rows and once in 325 archive rows.** CMND is **the
twelfth instance**, spread evenly across variant A's life, not an outlier.

**A true zero from a correctly-built instrument over a population that predates
the behaviour.** Nothing about the measurement was wrong. **A baseline drawn
from before the change is structurally blind to it**, and no amount of care
inside the measurement can see that from within.

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

## TWO FIXES THAT EACH LOOK RIGHT ALONE AND DESTROY EACH OTHER IN ONE ROW

**Research, 2026-09-04, before either was written.** Two repairs are queued on
`research_sources` and they impose **opposite requirements on the same column:**

- **The undated-expiry fix needs `fetched_at` to remain FIRST-seen** — an undated
  article first seen 30 days ago must be 30 days old to this desk.
- **Frozen-content detection needs a LAST-seen** — how long has this source been
  returning the same thing.

**So if anyone repairs re-collection by UPSERTING `fetched_at`, the expiry fix
silently inverts:** every undated item's age resets on every pass, immortality
returns, **and the column still looks correct.** No error, no failing test, and
the field's name still describes what it holds.

**The new field must be `last_seen_at`. It must never be a mutation of
`fetched_at`.** Written at the store, not only in a scope — the person who
breaks this will be fixing something else.

**The general shape: when two fixes touch one column, ask what each requires the
column to MEAN, not what each writes to it.** Both of these write a timestamp;
only one of them can be right about which timestamp it is.

## YOU CANNOT INSTRUMENT THE ROW WHEN THE FAILURE PRODUCES NO ROW

**Research, 2026-09-04, correcting a scope before it was written.** The pass was
to record `mode`, `failure` and `status` for company-source collection. **`mode`
is already persisted** — `metadata.discoveredVia` carries it on 189 of 198 rows
and nobody has ever read it.

**And the instruction "add these columns to `research_sources`" would have
instrumented exactly the population that already works.** The failing case
produces **no row at all**, so there is nothing to attach a column to. **The
record has to be per collection ATTEMPT, keyed on ticker and time** — a different
table or a different write.

**That is the sort of thing discovered after the pass returns nothing**, having
cost a deploy and a day, with the conclusion "no failures found" reading as good
news.

### And the zero it did produce cannot mean what it looks like

`discoveredVia` shows **0 of 42** feed-registry sources read as an index — so
**dispatch does not misfire on a healthy fetch**, which refutes general
flakiness.

**It cannot refute the challenge-page hypothesis, BY CONSTRUCTION: a challenge
page produces no row**, so those cases are absent from the population being
counted. **Same by-construction exclusion that ruled the frozen page out of the
43** — a zero over a population the mechanism cannot enter is not evidence about
the mechanism.

**Which narrows rather than eliminates:** misdispatch does not happen on healthy
fetches, so if these names ARE misdispatching, the cause is **what the fetch
returned** — not the dispatch logic. **Two candidate mechanisms collapse into
one with the fetch as its cause.**

### A repair that is obviously right is still a variable

**The user-agent defect is legible without any measurement**, which is exactly why
it must not be fixed before the pass runs. **Changing it first yields a possible
improvement with no evidence, and no way to separate it from a parser bug fixed
by accident.** Measure, then change — and the temptation is strongest precisely
where the defect needs no measuring to see.

## A CONFIRMED PREMISE IS NOT A CONFIRMED MECHANISM

**Research, 2026-09-04, retracting a synthesis this seat had approved and
relayed.** Undated company-news items are exempt from the 45-day cutoff — **that
premise was tested and is enormous: 1% of feed rows undated against 82% of index
rows.** From it came the conclusion that CMND's article is immortal and that this
is the bug.

**CMND's article is three days old.** `eventTimestamp 2026-09-01`, read 09-04.
**Nothing has expired.** The expiry fix would have KEPT it, correctly, and
changed nothing about the card.

**And the immortality defect cannot have manifested anywhere yet:** all 87
undated company sources were first seen within four days, production began
2026-08-17, and **no undated row reaches 45 days before roughly 2026-10-01.** A
real latent defect with a date on it, presented as the live explanation for a
name failing today.

**The tell: the date was in the message that prompted the synthesis.** Design's
read carried `eventTimestamp 2026-09-01` and nobody subtracted. **A mechanism
that explains a direction is not thereby the mechanism** — and testing its
PREMISE, which Research did and which came back 1% versus 82%, is not testing the
mechanism at all.

**What was actually happening is narrower and needed no expiry:**
`INSERT OR IGNORE` writes nothing on a re-collected article, **but the item still
enters `collected`, and `collected` feeds this pass's bundle.** With
`publishedAt: null` the model has no date to judge it by — **so one leaf article
becomes "a fresh update" on every pass.**

## PRE-REGISTERED 2026-09-04: THE UNDATED-AGEING FIX WILL LOOK LIKE A COVERAGE REGRESSION

**Written BEFORE the change, because the result is the one most likely to be
reverted.** When undated company-news items are aged by the `fetched_at` this
desk first saw them, **index-path coverage will FALL.** Rows older than 45 days
since first sight will finally drop out.

**THAT IS THE FILTER WORKING FOR THE FIRST TIME, NOT A REGRESSION.** They were
never fresh; they were exempt.

**The premise is measured, not assumed** — the collector labels by path, so the
two are separable in the store:

    COMPANY_IR   (feed)   93 rows    1 undated =  1%   87 EXACT
    COMPANY_NEWSROOM (index) 105 rows  86 undated = 82%   86 UNKNOWN

**99% of feed items are subject to the 45-day cutoff; 82% of index items are
exempt from it forever.** That differential is what turns one filter into an
85-versus-62 gap. **CMND is one of the 86.**

**And it corrects how the two paths have been compared: "the index path works
better" is FALSE. It fails DIFFERENTLY.** The feed path collects nothing because
everything expires; the index path collects things that **can never expire**.
**One defect, two faces** — so a fix aimed at either alone leaves the other, and
a metric that improves for one will worsen for the other.

**Limit, stated: this measures the dating of rows that WERE collected, not of
items the cutoff discarded.** It establishes the premise and cannot settle the
mechanism. **`parsed-versus-kept` is the counter that does that**, and it does
not exist yet.

## A QUALITY FILTER THAT SKIPS WHAT IT CANNOT PARSE SILENTLY FAVOURS UNPARSEABLE INPUT

**Ops measured it, Research found the mechanism, 2026-09-04.** Company feeds
never produced a source row on **85%** of the names that had one, against **62%**
for scraped HTML indexes — **the most machine-readable input failing worst**,
which is the opposite of what parsing difficulty predicts.

**`collector.ts:577-583` is the whole explanation:**

    const recent = read.items.filter((item) => {
      if (!item.published.utc) return true;   // undated entries stay candidates
      return Date.parse(item.published.utc) >= cutoffMs;
    })

**A feed dates every entry by construction, so every entry meets the filter and
the old ones are dropped. A scraped index frequently yields undated items, and
undated items are kept UNCONDITIONALLY.**

**So the better-structured source is filtered harder. THE FILTER CAN ONLY
EXCLUDE WHAT IT CAN READ.** Feeds are not failing because they are hard — **they
are failing because they are legible enough to be discarded.**

**Ops's naming of the shape is the general form: this is the mirror of every
other entry here.** Elsewhere a check cannot fail for a case it cannot see.
**Here the unreadable case is the one that PASSES** — and the effect is
invisible, because the parse succeeds, no failure is recorded, and nothing
compares parsed against kept.

**The rule for any predicate over parsed content: state what happens to items
the parser could not populate, and check whether that branch is the lenient
one.**

## NAMING A TRAP IN ONE COLUMN DOES NOT STOP YOU TAKING IT IN ANOTHER

**Ops, 2026-09-04, against itself.** It flagged that `issuer_registry.
company_sources` is **current state read as as-of**, stated the error direction,
and warned that it inflates one half of the finding — **then computed the very
next figure against the full production sources table with no date predicate,
and took the identical confound.**

**Demonstrated rather than argued: same query, same 231 tickers, adding only a
cutoff — 125 with no filter, 144 at `fetched_at <= 08-23`, exactly reproducing
the figure it could not reconcile for five rounds.** Neither number was wrong.
**19 names acquired non-SEC coverage after the archive closed**, which is a fact
about collection since rather than a disagreement about counting.

**The pair to *quoting a rule feels like having applied it*, and worse: here the
rule had just been applied, deliberately, in the adjacent column.** Recognising a
trap is a property of the sentence you are writing, not of the query you write
next.

## A RETRY INTERVAL MUST BE SHORTER THAN THE UNIT OF WORK IT PROTECTS

**Research, 2026-09-04, correcting a severity this seat got wrong in one
direction and it got wrong in the other.** The IR resolver's negative result is
**not a permanent latch** — it carries a **24-hour cooldown** and every stored
row re-evaluates on its next pass, so there is nothing to migrate. This seat
called it a second latch; Research had called it a log item.

**It is neither. It is a day-long blind spot on a desk whose unit of work is one
morning.** A transient fetch failure at 06:00 is not retried until 06:00
tomorrow, **and the trading window is 07:00–10:00** — so one bad fetch costs a
name for the entire session it mattered in.

**Twenty-four hours is a defensible interval for a system whose work repeats
daily and a wrong one for a system whose work IS a day.** The number is not too
large in the abstract; it is larger than the thing it sits inside.

**And the defect underneath is the usual one:** the cooldown is armed
**identically** by *"we looked and there is genuinely nothing"* and *"we could
not fetch"* — because `classifyCollectionPoint` returns `ARTICLE` for `!body`
(*"not fetched; cannot confirm a listing"*) and **erases the distinction before
the cooldown ever sees it.** Waiting a day is correct for the first and wrong for
the second.

**The module has already survived this once**, which is why the diagnosis was
available: `shedNonDurable` runs BEFORE the cooldown check specifically because
*"ENRD recorded a negative, then every later pass short-circuited on it and the
leaf stayed on the row for another day."*

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

**And the sharpest instance is `coverage`: `incomplete: gaps.length > 0`.** The
one field that IS persisted is **DERIVED from the field that is not.** Storing
`gaps` alone would have given `incomplete` for free — **so the discard saved
nothing and cost the reason.** When a derived value is kept and its source
dropped, the storage saved is negative: **less information, for the same
write.** That is the argument for persisting the whole object rather than
picking fields, and field-picking has now cost this desk twice on the same
object, months apart, for unrelated reasons.

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

## THE DOCSTRING NAMED THE REQUIREMENT; THE LOOP NAMED A PROXY FOR IT

**Ops, 2026-09-05.** `minute_bars` held **2,121,548 rows on Friday and zero on
Saturday.** Not a corrupted store — `daily_bars` and `ticker_session` are intact
and the file size is unchanged. **Rows deleted, deliberately, by the desk.**

`pruneRetention` builds its keep-list by **counting back calendar days:**

    keep = [tradingDate]
    for (i = 1; i < minuteBarRetentionDays; i++) keep.push(addDays(cursor, -1))
    DELETE FROM minute_bars WHERE trading_date NOT IN (keep)

**The 02:00 Saturday roll sets `tradingDate` to MONDAY. So the keep-list is
Monday, Sunday, Saturday — a three-day window containing no trading session at
all**, and every real date including Friday falls outside it.

**And `db.ts:8` says bars are pruned to N "TRADING DATES".** The comment states
the requirement. **The loop implements a proxy for it that coincides on weekdays
and inverts across a weekend.** The correct statement was sitting three lines
away in prose and nobody read it against the code.

**IT FIRES EVERY SATURDAY**, and has since the retention was written. A roll into
a long weekend is worse — Tuesday, Monday, Sunday, and a fourth day lost.

### And it had already explained a fact everyone accepted

Research reported *"the only two sessions with minute bars retained"* and this
seat read it as a small retention window. **It was not a window, it was a cut.**
Every measurement taken against `minute_bars` this week was taken against the
survivors of a weekly deletion — **and nobody asked why a three-day retention
was showing two days.**

**A number that is smaller than its own configured limit is a question, not a
setting.**

### Bundle by consequence, not by shape

Three defects sit in one function family: **one deletes too much, one deletes
nothing** (`replaceUniverse` upserts and never removes, 119 stale rows on Friday
and 158 on Saturday), **one holds the lock too long.** An elegant grouping —
**and grouping them delays the only one that destroys data.** Shape is how you
recognise a family; consequence is how you schedule it.

### The same proxy, one layer up: ROW COUNT standing in for ELAPSED TIME

**Research, same day, found the identical substitution in its own analysis.** A
drawdown measure reached ten minutes past a peak by writing `bars[peakIndex +
10]` — **ten ROWS later, not ten MINUTES later.** On a continuously traded name
they agree. **On a sparse board name, ten rows is an hour.**

**That number was wrong independently of the retention bug, and would have been
wrong on complete data.** The retention cut only made it visible: checking which
hours the cut removed forced a look at how the index was built.

**Item 82a is WITHDRAWN, not refuted.** The claim it supported — that most of the
reported fade happens after the trader's window — is now **unsupported**, and
must be re-measured on Monday's capture **indexed by timestamp**.

**The general form, and it is now three sightings in one day:** a loop that
counts *positions* while the requirement names *units* is correct exactly when
the positions are evenly spaced, and silently wrong when they are not. **Gaps are
the normal case in market data.** Index by the unit the claim is about.

### Check WHERE a loss fell before deciding what it invalidated

Research's other move is the one to copy. Rather than discarding every finding
touching `minute_bars`, it asked which HOURS the deletion removed: 08-18 lost
15:00–17:00 UTC entirely, and items 58 and 59 measure 11:00–14:00 UTC. **They
survive — not because the cut was harmless, but because it fell somewhere else.**

**A data loss invalidates the measurements that overlapped it, not the ones that
share a table with it.** Establish the overlap before writing anything off; the
alternative discards good work and, worse, retains bad work that happens to look
untouched.

## THE GUARD THAT CAUSED THE DEFECT WAS ALSO PREVENTING A CRASH NOBODY KNEW ABOUT

**2026-09-05, hours after the fix shipped.** The 20-hour universe cache guard
suppressed the session-roll refresh and left a renamed ticker invisible for a
morning. We diagnosed it, fixed it to refresh unconditionally on the roll, and
deployed.

**Then Ops found what the guard had also been doing.** `replaceUniverse` writes
**13,094 rows in one transaction**, holding the write lock past the research
worker's 5-second `busy_timeout`. `completeJob` throws `SQLITE_BUSY`, **nothing
catches it, and the process dies** — nine times since 08-25, every one clustered
at the 02:00 roll.

**And the crash only happens on rolls that REFETCH.** On the morning SGRX was
invisible there was no crash, **because the cache was fresh and the roll
skipped.** The defect and the protection were **one mechanism.**

**So the fix converts an occasional crash into a scheduled one.** From the next
session the 13,094-row write happens every trading day.

**A guard's side effects are by definition not in its stated purpose**, so
removing it removes protections nobody enumerated — and the protected thing is
invisible precisely because the guard was working. **Before removing a guard,
ask what ELSE has been sitting behind it.**

### And it survived eleven days because it self-heals

**systemd restarts the worker, the orphaned job is recovered, work continues.**
Nine crashes, no alert, no report, no one looking. **A failure that repairs
itself produces no evidence anyone reads** — the same reason the given-but-unread
float count went weeks unnoticed and the same reason a flaky gate teaches
re-running.

**The downstream fix is the real one:** an unhandled `SQLITE_BUSY` on a
five-second timeout **is not an exceptional condition on a store with two
writers. It is Tuesday.**

## 13 OF 23, THEN 5 OF 13, THEN ZERO — AND EVERY STEP WAS A CORRECT MEASUREMENT

**2026-09-04, the day's longest investigation, resolved.** Company-news
collection was failing on names that were demonstrably publishing. The claimed
cause moved three times:

    "the parser gap is the cause"      13 of 23   <- a rule this seat wrote
    "the collector gap is real"         5 of 13   <- after the probe
    the collector gap                        0    <- after the gate condition

**Each figure was correctly measured. Each was over a population that did not
answer the question**, and each was caught by someone asking **what the number
counted** rather than whether it was right.

**The final answer is that there is no code defect.** Six feeds are abandoned —
parsing perfectly, newest item months old, while the issuer files normally. Two
are empty. **Five had their address resolved during or after the pass that last
collected**, so deterministic collection had no address to use. **The finding is
entirely a source problem.**

### And the last method to fail was the obvious one

Four names showed `lastDiscoveryAt` **equal to their newest source, to the
millisecond** — and a strict `>` scored that as *"resolved before, real gap"*.
**It is an artefact: `now` is computed once per pass and handed to both**, so
same-pass events share a timestamp **by construction. Comparing them orders
nothing.**

**What settled it was an IMPLICATION rather than a comparison.** `discoveryMode`
is set only when `!usableCompanySourceBefore`, so **its presence proves no usable
address existed at the start of that pass** — a fact the shared-`now` problem
cannot touch.

**When a timestamp comparison sits on an exact tie, suspect a shared clock before
suspecting a boundary.**

### The conclusion carries a falsifiable prediction rather than an assertion

**Those five now hold a resolved feed. If any runs again and still writes zero
non-SEC rows, the gate-condition argument is wrong and the gap is real.**
Checkable tomorrow, and stated before the check rather than after.

## A DELIBERATE INCONSISTENCY MUST BE RECORDED AS DELIBERATE, OR IT WILL BE "FIXED"

**Design, 2026-09-04, `2b3ddd9`, flagging its own.** Two series sit on the same
row and are scaled **oppositely**: activity to a **shared** ceiling (the active
line), price to **each row's own range.**

**Both are right, for opposite reasons.** Trades per minute means the same thing
on every row, so a shared scale makes rows comparable and a full bar means 300/min
everywhere. **A $2 name and a $40 name share no price axis** — shape is the only
honest content, and a shared scale would flatten every cheap name to nothing.

**Its own sentence is the point: "if that ever looks like an oversight, it is
not."** An inconsistency that is correct is indistinguishable from one that is
sloppy, **and the tidier of the two is the one a future editor will impose.**
Record the reason at the code, not in a scope document.

### And the structural fix bought a class of bug no test could reach

Both series map over **one extracted `windowSlots`**, so the render reconciles
nothing. Design's note on what that actually saved: **not effort, but a bug it
could not have tested for** — two series each computing their own window and
agreeing **by coincidence** is invisible from the render side, **because both
would look right on every fixture the author would think to choose.**

**That is the strongest case for making a thing impossible rather than checking
it: the check you would write comes from the same model of the problem that
produced the bug.**

### A flat series belongs mid-height, not on the floor

**Confirmed by mutation against a floor rendering.** A price that did not move is
not a price at its low — **collapsing an unchanged series to the bottom of its
box states a direction the data does not contain**, on a surface read to judge
whether a name is going up.

## WHEN A FILTER RETURNS NOTHING, LIST THE VALUES THAT DO EXIST

**Ops, 2026-09-04, measuring board churn.** Its first query asked for
`type LIKE '%TOP%'` and returned **nothing**. The type is `RVOL_RANK_ENTRY`.

**It caught that by listing the event types that actually exist rather than
reading the empty result as "no churn"** — and that control is the only reason
there is a measured churn figure at all: **70 entry events across 53 distinct
names against 12 slots, 4.4x.**

**This is the instrument-proof rule arriving in a query rather than in a test.**
An empty result set is the same shape as a wrong predicate, and the reassuring
reading is available for free. **So: before believing a zero from a filter,
enumerate the domain the filter runs over.** One extra query, and it is the
cheapest control on this desk.

## A PRECEDENT FOR "UP" IS NOT A PRECEDENT FOR "BUSY"

**Ops refusing a deploy window from this seat, 2026-09-04.** I proposed running a
schema migration during RTH, citing two clean precedents: **22→23 after the
close, and 23→24 at 03:29.**

**Both prove migration with the market worker UP. Neither proves migration with
the market worker BUSY.** At 03:29 the SIP worker was idle in `NEXT_DAY_PREP`.
During RTH it is ingesting a live tape — **`NEW_HOD` firing 25,984 times across
5,247 symbols that day.**

**And the difference is the variable the failure depends on.** The upgrade
transaction takes the write lock against that writer on a **5-second
`busy_timeout`**, and `worker/migrate.ts` **has no retry of its own** — the exact
failure that cost 80 seconds at 01:40, whose probability is a function of how
busy the writer is.

**So the precedents cover the condition that was easy to see and not the one
that matters.** "It worked before" is a claim about a population of one, and the
population has a boundary nobody stated.

**The benefit being bought was fifty minutes on a name nobody was trading.** An
asymmetry weighed with an unmeasured magnitude — **the third time in one day
from this seat**, and the first inside a deploy decision rather than a number.

**The test: name the condition the precedent actually held under, and check
whether today matches it.** Up, idle, shut and busy are four states, and a
success in one is silent about the rest.

## TWO FAILURES WITH OPPOSITE REMEDIES MUST NOT SHARE A SENTENCE

**Design, 2026-09-04, correcting its own four-rung model against the probe.** It
had recorded *"a durable route that returned nothing"* as **the one state that
indicts the desk rather than the issuer.** True of the state as described and
**false of the population**: of thirteen such names, **six are feeds that parse
perfectly whose newest item is months old.**

**AKAN's newsroom has not published since November while the company files
normally. Nothing is broken.** *"We looked and found nothing"* is TRUE there.
*"The desk could not see it"* is FALSE — **on a name the trader is looking at.**

**So a single searched-and-found-nothing sentence flattens an issuer problem
into a desk problem, and the two point OPPOSITE WAYS:**

    a dead newsroom      -> look elsewhere for the catalyst
    a collector gap      -> the desk is misreporting its own reach

**He would act differently on each, so a sentence covering both is worse than no
sentence.** Same shape as *"worker offline"* inviting a restart that drops
capture: **a message that merges two faults prescribes the remedy for whichever
one it happens to name.**

**And it is a persistence requirement rather than a copy choice** — the card
cannot derive which it is looking at, so the distinction has to survive storage
or the honest sentence cannot be written at all.

## THE METHOD WAS IMPROVED TWICE WITHOUT ANYONE ASKING WHAT THE NAMES WERE

**Ops, 2026-09-04, on its own three-round investigation.** A vendor showed `N/A`
for float on ten of seventeen premarket movers. That drove a head-to-head, a
falsification, a retraction of the falsification, and an on-demand re-test —
**each round a genuine improvement in method.**

**Nine of the ten are LEVERAGED ETFs.** *2X Long AAOI Daily*, *2X Long SNDK
Daily*, *Daily Target 2x Long PL*. **A share count for a 2X daily leveraged ETF
is not a hard number, it is a category error, and `N/A` is the correct answer.**
The vendor was right. **And this desk already agreed with it** — all eight are
classified `ETF_ETP` at HIGH confidence with `eligible = 0`, kept off the board
by design.

**The tenth is the renamed ticker, which is a separate known defect.**

**So three correct measurements were taken over a population the question did not
cover**, and the fix each round was to the instrument rather than to the
population. **Nobody read the company names.** The cheapest check in the
investigation was the one nobody ran: *what ARE these?*

**The general form: before measuring a population, look at a few of its members.**
A method dispute survives many rounds because each round produces a defensible
number — **and a defensible number over the wrong set is indistinguishable from
progress.**

### And the ceiling it produced was a difference of two totals

The same investigation reported that **~20% of tradable names have no SEC
registrant mapping** — computed as 10,412 against 13,133, **over a universe
stuffed with ETFs, warrants, units and preferreds.**

**Measured properly and split by board reach:**

    discovery-eligible   5,867 names   57 unmapped   1.0%
    ever reached top-25    334 names    1 unmapped   0.3%
    ever reached top-12    182 names    0 unmapped   0.0%

**And the single miss is a format mismatch, not a gap:** `GTN.A` is absent
because SEC carries `GTN-A`. **Normalising "." to "-" closes it — so the board
figure is effectively 334 of 334.**

**A ratio of two totals is not a coverage rate.** It is a statement about
whichever population happens to dominate the denominator, and here that was
instruments the desk never trades.

## THE UNTESTED BRANCH AND THE DEFECTIVE BRANCH WERE THE SAME BRANCH

**Research reviewing Ops, 2026-09-04.** A new SEC-reachability field rendered
**"SEC responded 0"** when every attempt threw — a DNS failure or a refused
connection, where **there was no response at all.** An absence forced to borrow a
plausible value, in the instrument built to stop readers inferring one.

**And the sharpest part is the coverage observation: all five reachability tests
rejected with a RESPONSE. None rejected with a THROWN FETCH.** So the one branch
with no test was the one branch with the defect.

**That is not a coincidence — it is a consequence.** A branch nobody wrote a test
for is a branch nobody held a case in mind for, **and the same absence of
attention produces both facts.** So a coverage gap is not merely a risk that a
bug is hiding there; **it is evidence about where the author's model of the
input space ran out.**

**The practical form: when reviewing, enumerate the ways the call can FAIL and
check which of them a test constructs.** Rejecting with a response and rejecting
with a network error are different inputs, and only one had been imagined.

**Ops's own note on it is the entry's other half:** it authored a commit whose
subject is *"a field that could not fail for its own failure"* and **put the same
shape one string over — the fifth instance in a day, and the only one where the
same person wrote the rule and the violation in the same file.**

## A FLAKY TEST MAY BE REPORTING A REAL INTERMITTENT DEFECT

**Ops, 2026-09-04, `d3c56ce`.** A retention test in the suite that gates deploys
failed once and passed three times. **It was not flaky. It was correct, and
`preflight.sh` was wrong.**

    if (( nearest_diff <= PROTECTED_MINUTES ))

**With `PROTECTED_MINUTES=0` and a checkpoint exactly 0 minutes away, `0 <= 0`
is true and preflight exits 3.** Setting the window to zero means there is **no**
protected window — so refusing the deploy is the opposite of what the operator
asked for. `RTH_INTERVAL` supplies a checkpoint every thirty minutes, so the
suite landing on an exact checkpoint minute was enough to trip it.

**The natural response — "fix the flaky test" — would have deleted the report of
a real defect in the deploy gate**, and the intermittency was the signal rather
than the noise: **a test that fails only at certain clock minutes is describing
something that depends on the clock.**

**And the first diagnosis was a plausible mechanism from reading rather than
measuring.** Ops reported line 49 — a reference instant mixing the wall clock
with a directory count — because it **looked** like a flake generator. It sits
inside a per-test sandbox and was never involved. **That reached this seat as
"the cause" and went to the trader.** Same shape as three other diagnoses today;
the difference is that the real cause was found before it travelled further.

### And a test pinned to a boundary tests two things without saying so

**Its first fixed clock was 720 — which IS an `RTH_INTERVAL`** — so the
reporting assertion was **accidentally exercising the zero-window guard as
well.** It found out because **the mutant killed both tests**, when it should
have killed one. Moved to 725, deliberately between checkpoints.

**A pinned clock is a choice of test case. Pinning it to a boundary silently
merges two tests, and only a mutation that should kill exactly one will tell
you.**

## A TEST THAT ASSERTS TEXT ORDER DOES NOT ASSERT REACHABILITY

**Design, 2026-09-04, `efd2a6d` — its fifth vacuous check of the day and the
third found only by mutation testing.** A branch-order assertion **passed after
the not-loaded branch was made UNREACHABLE**, because the string literal was
still present in the file and still first. **It was checking where text appears,
not which code runs.** It now asserts the condition as well.

**And two of its assertions were broken by the source they read.** One matched a
template literal it existed to forbid. **One measured the author's own COMMENT,
which quoted the string whose order it was checking.**

**A test asserting on source cannot tell code from prose about code unless you
make it.** Comments, template literals and strings inside other strings are all
"present in the file" — so a source-scanning assertion needs its matches scoped
to the literals, or the file's documentation will satisfy the check that its
implementation was supposed to.

**The pair to the enumeration rule: `grep`-shaped tests are cheap and their
failure mode is silence.** Mutation-test every one — break the thing it exists to
catch and watch it go red — or it is a hypothesis rather than a check.

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

**CROSSED MESSAGES ARE THE NEXT COST, AND ON 2026-09-05 THEY RAN AT ROUGHLY ONE
IN THREE.** A thread asked two questions, Integration ruled on them, and the
thread re-asked in its next message because the ruling had not landed yet —
**twice.** Integration then re-stated the ruling, and the thread replied *"already
built, our messages crossed."* **Three turns spent on state that was already
settled.**

- **Never repeat a question in a later message. Point at it** — *"the two
  questions in my previous message stand"* — so the answer, when it arrives,
  answers something the sender has not also re-asked.
- **Before re-stating a ruling, read the repo.** A thread's head sha says whether
  it acted. **On 2026-09-05 a re-statement was sent to a thread that had already
  shipped the ruling in full.**
- **A message that crosses is not a failure of either party.** It is the cost of
  a bus with no ordering, and the only lever is to make each message carry its
  own state: **head sha, what is done, what is waited on.** The threads that do
  this were readable through every crossing; the confusion was always in the
  messages that carried only content.

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

## A STATUS CODE PROVES REACHABILITY; IT DOES NOT PROVE A STRANGER SEES A PAGE

**Web, 2026-09-16, on the first release that made anything here publicly reachable.
Two seats had already verified the same routes and both stopped at the status code.**

```
Ops       negative control first, wider than the spec         8/8 correct
Integration  same eight from a third machine                  8/8 correct
Web       THE ELEVEN SUBRESOURCES THE SERVED HTML ASKS FOR    the check neither ran
```

**A `401` on any chunk, stylesheet or font renders the page BROKEN to a stranger and
PERFECT from this desk** — *the founding hazard of the Web thread, one layer below the
routes, and it could not be asked until the pages went public.* **Nine chunks and two
`woff2` fonts, each fetched with no credential: all 200.**

> **AND ONE STRING THE SPEC COULD NOT HAVE COVERED: the markup requests
> `/favicon.ico?favicon.<hash>.ico` while the exemption is `location = /favicon.ico`.**
> *nginx matches on the path and ignores the query, so it serves — **checked on the wire
> rather than reasoned about**, because "the exact match I wrote" and "the URL the page
> actually requests" are two different strings.*

**⇒ FOR ANY PAGE MADE PUBLIC: enumerate the subresources the SERVED HTML asks for and
fetch each as a stranger.** *The route list is what you intended to publish; the
subresource list is what the page needs in order to exist.*

**AND THE PUBLIC CLAIMS BECAME CHECKABLE IN THE SAME MOMENT AND WERE CHECKED:** *zero
external hosts in the served HTML — the page calls nobody — and both legal pages render
the adopted source at request time rather than a copy.*

### TWO INSTRUMENT ERRORS IN THAT RUN, AND THE DISAGREEMENT WAS THE INSTRUMENT

**`grep -ci DRAFT` returned 2 on an adopted page** — *matching `DRAFTED` in the dateline
`DRAFTED … · ADOPTED …`, not a banner.* **A failed check returning a plausible-looking
DEFECT, on the field this desk has been most careful about.** *Integration hit the same
false positive independently and both caught it the same way: by reading the context
around the match rather than the count.*

**And `grep -c 'href="/privacy"'` returned 1 against Integration's 2.** *`-c` counts
matching LINES; both links sit on one line. `grep -o` piped to `uniq -c` counts
OCCURRENCES, which is the instrument the question needed.* **This desk has now been
bitten by `grep -c` three times.**

> **WEB'S POINT IS THE ONE TO KEEP: the two passes did not agree by accident — they
> DISAGREED, and the disagreement is what forced a re-measure.** *Two independent
> verifications that match tell you little; two that conflict tell you exactly where to
> look.*

## A MID-SESSION RESTART IS ONE CAUSE WITH FOUR SEPARATELY-DISCOVERED CONSEQUENCES

**2026-09-14 to 09-16. Four defects, found by four routes, over three days. One event.**

```
1  THE ANCHOR      a restart re-anchors names the backfill did not reach.
                   MEASURED: 10 of his closing 50 carried a wrong Move, median ~3.5
                   points understated, one SIGN FLIP.
2  THE SENTENCE    a name that traded earlier and went quiet reads "not traded" --
                   a false market statement, not a wrong number.
3  THE LATCH       `session_high` is in-memory, so a restart can lose a cycle
                   supersession and restore a four-month-old BACKSIDE badge.
4  THE GUARD       `session_high` reseeds from the daily bar while its companion
                   series does not, so a bad-print check would reject a GENUINE high
                   on exactly the names the fix exists for.
```

**EACH WAS FOUND ON ITS OWN, BY SOMEBODY LOOKING AT SOMETHING ELSE.** *None was found by
looking for restart consequences, and nobody enumerated them until the fourth.*

> **THE PROPERTY IS THE RESTART, NOT THE FOUR FIELDS. Every in-memory accumulator on
> this desk inherits it BY DEFAULT**, and the next one somebody adds will inherit it
> silently — because the defect is not in the field, it is in what a fresh process does
> not know.

- **WRITE IT ONCE AS A PROPERTY OF THE RESTART, never four times as a property of four
  fields.** *Four entries read as four bugs; one entry reads as a class with an open
  membership.*
- **AND THE ENUMERATION IS THE CHEAP PART NOBODY RAN.** *The question — "what else is
  rebuilt from nothing when a process starts" — is answerable by grepping the runtime's
  own initialiser, and it would have produced all four before any of them fired.*
- **THE REPAIRS DIVERGE, WHICH IS WHY THE CLASS MATTERS MORE THAN THE INSTANCES.** *One
  wants a reseed, one wants a three-state field, one wants a latch, and the fourth wants
  its two inputs CAPTURED TOGETHER so no reseed can separate them* — **the only one that
  removes the coupling instead of documenting it.**

## "UNMEASURABLE" IS USUALLY "NOT THAT NUMBER — THIS ONE"

**Research's diagnosis of its own work, 2026-09-16.** *It reported that the rate at which
the desk's automatic verdict disagrees with his Sheet's human one cannot be computed.*
**True, and it closed the enquiry.** *The Sheet's call is never persisted, so there is
nothing to diff against at any N.*

> **BUT THAT WAS NOT THE NUMBER THAT DECIDED ANYTHING.** *The question in front of everyone
> was how much his prior moves the automatic verdict — and `config.ts:65-66` says the
> author built the experiment for exactly that:* **"the automatic catalyst grade is not
> independent of it. Setting this is the control arm that measures how much it actually
> moves."** *Approved, cheap, never run.*

**UNMEASURED AND KNOWABLE BEATS UNMEASURABLE, AND THE TWO GET CONFLATED BECAUSE THE FIRST
ANSWER IS TRUE.** *Nobody audits a correct statement.*

**THE PRACTICAL FORM: before reporting a quantity unmeasurable, name the DECISION it was
wanted for and ask which nearby quantity would settle that.** *The unmeasurable one is
often a proxy somebody reached for first.*

- **SECOND INSTANCE, same seat, same week:** *the share of board-visible rows with no
  premarket print came back empty and was reported as unmeasurable — the population was
  empty by construction.* **The ordering it was really about was reconstructible from
  `percent_change`, which is stored per row per date, and Ops produced the figure the same
  morning.**
- **DISTINCT FROM THE RULE ABOVE IT AND FROM THE VACUOUS-QUERY ENTRY, and the distinction
  is the point.** *A vacuous query is an instrument that could never return the failing
  answer. This is an instrument working correctly on the wrong question* — **and the tell
  is different: there is nothing wrong with the measurement to find.**

**RECORDED ON TWO INSTANCES, NOT THE THREE OFFERED.** *Research also named its `sheet`
source-column query. That one belongs to the vacuous-query family — `'sheet'` is a type
member nothing assigns, so the query could not have returned it — and folding it in here
would make the pattern look broader than it is.* **Counting instances is this desk's own
recorded tell for a claim getting ahead of its evidence.**

## VERIFYING THE EVIDENCE OFFERED FOR A CLAIM IS NOT VERIFYING THE CLAIM

**Design's formulation, 2026-09-16, after three seats carried one false sentence between
them.** *Coaching asserted "the pin mechanism was never wired" from present-tense
evidence. Integration relayed it — WITH attribution and WITHOUT checking it. Design
received it, verified the two facts underneath it, and shipped a conclusion on top.*

> **A peer hands you the facts they reasoned FROM. The reasoning is still yours to
> check.**

**EVERY FACT IN THE CHAIN WAS TRUE.** *`focus: false` is hardcoded; no production route
inserts; `focus_tickers` is empty.* **The claim they were offered as evidence for was
false** — the mechanism was wired, recorded 51 rows across four dates, and the trader
ruled it off at `d9215f7`.

- **ATTRIBUTING A CLAIM IS NOT FLAGGING IT.** *"Coaching verified" carries provenance
  and still presents the thing as established.* **A relayed claim arrives PRE-TRUSTED,
  which is this desk's oldest recorded relay failure, and the attribution is what makes
  it feel checked.**
- **IT LANDS HARDEST ON WHOEVER RELAYS FOR A LIVING.** *The middle link had the same
  `git log` available as the other two and ran it least.*
- **AND THE COST WAS A SENTENCE THAT CRITICISED ONE OF HIS OWN DECISIONS.** *"The desk
  cannot say which names you watched" reads as a shortcoming; it is his ruling with his
  reasoning attached.*

**THE PRACTICAL FORM: when a peer's claim is about to become a premise, ask what would
make the CLAIM false — not whether the facts under it are true.** *Those are different
questions and only the second is usually asked.*

## A GREP OF THE TREE ANSWERS ABOUT THE TREE, NEVER ABOUT THE HISTORY

**Coaching, 2026-09-16, correcting itself after telling two seats a feature "was never
wired".** It had been wired, it recorded on four dates, and **the trader ruled it off**
at `d9215f7`, which hardcoded the field and removed the routes, the store, the repo and
the MCP tool.

> **A FEATURE THAT WAS BUILT, USED AND REMOVED LEAVES A TREE INDISTINGUISHABLE FROM ONE
> WHERE IT NEVER EXISTED** — *and the search returns a clean, confident answer either
> way.* **Coaching's words, and it is the mechanism rather than the apology.**

**AND THE SIMPLER HALF UNDERNEATH IT: it checked the WRITER and never the WRITTEN.** *It
queried `focus_tickers` — a different table, zero rows, in a stale store — and never ran
`SELECT COUNT(*) WHERE focus = 1` on the table the rows were actually in.* **One query
would have settled it before any grep.**

**THE RULE, AND IT IS COACHING'S:**

> **For any claim containing "never" or "was not", QUERY THE DATA AND THE LOG BEFORE
> READING THE TREE.**

**WHY IT IS HERE RATHER THAN IN `coaching.md`: the consequence was a claim about HIM.**
*"The desk cannot say which names you watched" is true, and it reads as a shortcoming of
the desk.* **It is his ruling, with his reason attached — a pin adds nothing, because
what gets pinned already has research, which the desk already knows.** *So a feature
built on that reading must not lament the absence, must not work around it, and nobody
should propose restoring the mechanism to enrich anything.* **A tree-shaped absence
became a sentence that quietly criticised a decision he made on good grounds.**

**ADJACENT AND NOT THE SAME CAUSE, recorded separately so the grouping is not
overclaimed:** *searching too few FILES is a scope error; searching for the INPUT's name
and concluding about the derived VALUE is a target error.* **This one is neither — the
search was correctly scoped and correctly targeted, and the tree simply does not carry
the answer.**

**AND DESIGN NAMED THE AXIS, having hit it independently the same hour:** *the other
versions are searches whose SCOPE did not match the claim. This is a search whose TIME
did not match it.* **It verified the PRESENT and concluded about the PAST** — `focus:
false` is hardcoded today and no route inserts today, *both true, both checked, and
neither evidence about whether it once worked.* **`git log` was two seconds away.**

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
- **LOOK THE SEAT UP IN `mcp__ccd_session_mgmt__list_sessions` AND SEND BY
  `sessionId`, EVERY TIME.** *Never a role name, never a cached id, never one
  asserted in prose.* **The reason is not which tool you use — it is that NAMES GO
  STALE AND A DEAD SEAT QUEUES SILENTLY**, returning a success receipt that reads
  exactly like delivery.
  **RETRACTED 2026-09-14: this bullet previously said to send to the NAME
  `Integration` from `ListAgents`** — *an instruction already retracted further
  down this same file on 2026-08-24 and left standing here for three weeks.* **A
  retraction that reaches one section of a file does not reach the file.**
  **AND THE CAUSE I FIRST WROTE HERE WAS WRONG, corrected by Design the same
  hour.** *I recorded that Design's field spec failed to reach Research because
  the `SendMessage` tool is broken on this machine.* **It is not: Design's other
  messages went through it to two live seats that hour and answered on content
  only Design had sent.** *What actually happened is that Design addressed the
  seat titled `R&D`, dormant since 2026-09-10, instead of the live `Research-tmi`
  — a stale address carried forward from an old context summary.* **The spec
  survived only because Design had also committed it (`7df7d17`).**
  **⇒ "That tool is broken" would have held until the first person saw it work
  and stopped trusting this page. "Look it up every time, because a dead seat
  queues silently" is true of both tools and survives contact.** *Design's
  formulation, and it is better than mine.*
  **NOTE A STANDING DISAGREEMENT RATHER THAN A WINNER:** *`ops.md:1294` records
  `SendMessage` to a raw `local_…` id as FAILING; Design measured it delivering
  on 2026-09-14.* **Both are live readings at their own instants and the rule
  above does not depend on which is current.*
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

## AN ABSENCE FORCED TO BORROW A VALUE ALWAYS BORROWS THE REASSURING ONE

**Research, 2026-09-04. Five design questions in one day, three threads, one
answer: the thing is N STATES, not a value plus an absence.**

| where | the collapse | the states |
| --- | --- | --- |
| activity | a zeroed array and an unmeasured one render alike | ACTIVE / DEAD / **UNKNOWN**, with NULL read as `undefined`, never `[]` |
| session phase | `OFFLINE_DISCOVERY` must pick a phase before one is known | the absence is nullable AT THE BOUNDARY, not a seventh phase |
| reachability | one date, or nothing | ~19–22 days / ~5 days / **NOW** / unknown |
| float bound | a number, or null | proven-and-verified / **computed-but-basis-unverifiable** / no count |
| split census | a count | N observed / zero observed WITH a basis / **basis never established** |

**The mechanism is always the same.** A type can represent the value but not the
absence, so the absence is forced to borrow one — and it borrows whatever looks
most like a normal answer:

- `'CLOSED'` for a phase nobody has looked up
- `0` for an eligible count nobody has counted
- `[]` for a window nobody has measured
- `sharesOutstanding: 0` passing *"at most 10M"* more emphatically than any real number could

**AND THAT IS THE DANGEROUS PART: PLAUSIBLE MEANS IT DOES NOT RAISE AN ALARM.**
**AND THE MIRROR IS NOT A SAFER PLACE TO ERR.** *Ops, 2026-09-04, refusing to
let its own new health signal degrade in either direction:* **a signal wrong in
the ALARMING direction is not safer than one wrong in the REASSURING direction —
it is the same failure with a different half-life.** A reassuring lie is believed
until it costs something. **An alarming lie trains the reader to discount the
signal, and then the true alarm is discounted too** — the flaky gate's corrosion,
arriving in a health field rather than in a test suite.

The borrowed value is chosen because it looks ordinary, so every one of these
errors points toward reassurance. There is no version of this bug that renders
as a scary number.

### The fix is not always a new enum member — that was measured

Adding `'UNKNOWN'` to `SessionPhase` produced **ONE compile error in the whole
codebase**, because the dominant reader pattern is a positive allowlist that
silently answers `false`. **The member would have changed a type twenty modules
depend on and fixed nothing.**

**So ask whose property the absence is:**

- **a property of the OBSERVER** — "I have not loaded", "I did not look" —
  belongs at the BOUNDARY, nullable, where the compiler stops it exactly where
  the absence is true and the producers never carry a case they cannot emit
- **a property of the THING** — "this minute had no trades", "this basis cannot
  be established" — is a REAL STATE and belongs in the enum

Getting that backwards is how an observer's state ends up in a market vocabulary,
and every producer then carries a member it can never emit while every consumer
carries a case it can never see.

## A MECHANISM THAT EXPLAINS THE CLASS IS NOT EVIDENCE ABOUT THE INSTANCE

**Research and Design, 2026-09-04, on CMND — and the same error was made from
both directions in one exchange, which is what makes it worth a rule.**

The failure: a name showed a three-day-old catalyst card while the company had
announced an acquisition. A mechanism was found that explained the shape
beautifully — an undated article is exempt from the desk's only recency filter,
so it survives forever, while a feed's dated entries expire at 45 days. **One
line, two opposite failures. The premise was then MEASURED and held: 1% of
feed-path rows are undated against 82% of index-path rows.**

**It was still the wrong explanation for that row.** The article was dated
2026-09-01 and read on the 4th. **Three days against a 45-day window. Nothing had
expired.** The correct diagnosis was the one already made by direct observation
and then abandoned: the stored source is a single release page, so the collection
point can surface exactly one article, forever.

| who | the error |
| --- | --- |
| **Research** | had a mechanism and a confirmed premise, and **did not subtract two dates that were in the message in front of it** |
| **Design** | had **looked at the row directly**, seen the leaf URL, and gave that up for an explanation that fitted better |

**Both directions of one mistake, on one row, inside one exchange.**

### The test that catches it, and it is one subtraction

**A mechanism that predicts something MEASURABLE about the instance must be
checked against the instance.** Here it predicted expiry, the instance carried a
date, and the check was arithmetic.

**And a confirmed PREMISE is not a confirmed APPLICATION.** The 1%-versus-82%
measurement was correct, and it said nothing whatever about whether this row's
article had expired. Measuring the mechanism's *precondition* feels like
evidence and is not evidence about the case.

**Corollary for the other direction:** when you have looked at the instance and
it disagrees with a satisfying general story, **the instance wins**. A story that
explains a population is a hypothesis about the population; the row you read is
data about the row.

## BEFORE SCOPING AN INSTRUMENT, ENUMERATE WHAT IS ALREADY WRITTEN — AND OPEN THE JSON

**2026-09-04. Eight built-and-unwired findings in one day, and they are not all
the same failure.**

| kind | example | how you find it |
| --- | --- | --- |
| **written, never called** | `deactivateSources` — exported, documented, zero callers | grep for the identifier |
| **written, never read** | `filedShares` — set by the pipeline, referenced only by its own type | grep for the identifier |
| **WRITTEN, PERSISTED, AND NEVER LOOKED AT** | **`metadata.discoveredVia`** — the read mode, on 189 of 198 company sources, since the feature shipped | **nothing greps for it, because something DOES write it** |

**The third kind is the dangerous one.** It is not missing and not dead — it is
data nobody thought to ask for. **Three threads spent a day on which of four
mechanisms broke feed collection, and the mode of every successful read had been
stored the whole time.**

### And it hides in JSON

`discoveredVia` lives inside a `metadata` blob. **A schema read does not show it.
A grep for column names does not show it. `PRAGMA table_info` does not show it.**
Every instrument this desk uses to find out what it stores is blind to the inside
of a JSON column, and that is where the desk puts everything it did not want to
migrate for.

### The rule

**Before scoping any instrumentation: enumerate what is already written, and
read the JSON columns.** On 2026-09-04 that would have found `coverage.gaps`
(computed, reduced to a boolean), `splitEvents` (logged, dropped), SEC response
statuses (observed, discarded), `discoveredVia` (persisted, unread), and
`mode`/`failure` (computed, printed to a console nobody reads).

**And the corollary that nearly cost a deploy and a day:** a proposal to *"add
these columns"* must name the population the new column lands on. **A failing
attempt writes no row, so a column on the results table instruments exactly the
cases that already work — and the pass comes back "no failures found", which
reads as good news.**

## ON A DELETE PATH, ABSENT EVIDENCE MUST MEAN DO NOTHING — NEVER KEEP NOTHING

**2026-09-05, found by mutation testing the retention fix, not by the incident
that prompted it.** The calendar-day keep-list destroyed 2.1M rows every weekend
because it counted the wrong unit. That was the reported defect. The worse one
was underneath it.

Restoring the old loop failed three tests, and the third was unasked-for: **on a
store holding no sessions at all, the calendar version still invents a keep-list
and issues a DELETE against dates it made up.** The correct behaviour on an empty
store is to delete nothing. The old code's behaviour was to keep nothing.

**Those two are one character apart in a keep-list and opposite in consequence.**
A derived keep-list can always produce a value; an observed one cannot. `SELECT
DISTINCT trading_date` returns an empty set when there is nothing to keep, and
an empty keep-list must therefore be read as *no instruction*, not as *keep none*.

### The rule

**Before any DELETE driven by a computed inclusion list, ask what the list
contains when the evidence is empty.** If the answer is "still something", the
list is generated rather than observed and the delete is unguarded. If the answer
is "nothing", the delete path must exit rather than run.

**And the reason it survived: the prune logged at DEBUG.** A weekly mass deletion
that announces itself at the level nobody reads is a deletion nobody can witness.
**Log level is a claim about how much a line matters — and a mass DELETE is not a
debug detail.**

### Family by shape is not family by consequence

Three defects sat in the same function family and were proposed as one bundle.
They shared a shape and did not share a risk: one destroys data weekly, one
accumulates dead rows at 39 a day, one is latency. **Shape is how you recognise a
family; consequence is how you schedule it.** Bundling by shape parks the one
with teeth behind two that can wait — and it is tempting precisely because the
shape is elegant.

## CHECK THE TREE BEFORE SCOPING IT — AND CHECK THE ARTEFACT BEFORE NAMING IT

**2026-09-05, twice in one hour, by Integration and by Ops.** Two different
seats, one failure: **a claim accepted without opening the thing it was about.**

### Integration scoped a feature that was already rendering

The trader asked for a current-activity mark. This seat wrote a scope — mark
type, window, empty state — and dispatched it. **Design checked the tree rather
than taking the premise and replied that it ships: `3921a50` activity bars and
`2b3ddd9` minute closes, rendering at `DiscoveryBoard.tsx:508` under "NOW",
beside RVOL because it is the correction to RVOL.** Verified independently.

**This is the second time this seat has approved work that had already shipped.**
The first was share count from company facts, twelve days late. **A scope is a
claim that something does not exist, and it is the cheapest claim on the desk to
check.** `git log`, one grep for the component, before writing a word of it.

**What the trader actually asked for was the part that was NEW in his words** —
direction-and-colour as an alternative to shape — and that part was buried under
a re-scope of the part that was done.

### Ops named a consequence it had never opened

Stale `replaceUniverse` rows were reported twice as *"listening for 119 names
that no longer trade"*, then 158. **`stream.ts:292` subscribes the base channels
with a WILDCARD.** Dead rows produce no dead subscriptions and count down to no
ceiling. **The defect is real and the consequence was invented** — it is waste
(rows that never expire, an eligibility count drifting upward at ~39/day), not a
deadline.

**Wrong in the alarming direction is still wrong**, and it is worse than wrong in
the reassuring direction for scheduling, because it buys attention it did not
earn — attention that on this desk is finite and was owed elsewhere.

### The rule

**A word you introduce becomes a fact the desk reasons from.** "Subscriptions"
was never checked against what the desk subscribes to, and it survived two
reports and a relay. **Before a noun enters a report, open the code that would
make it true.**


## A REAL FAULT DISAPPEARS BY BEING ATTRIBUTED TO ONE THAT IS ALREADY CLOSED

**2026-09-05. The retention defect was found, fixed, deployed and written up in a
single day. Within hours it had absorbed an unrelated hole in the data and nearly
buried it.**

Research found 2026-08-18 missing UTC hours 15, 16 and 17 — three RTH hours in
the middle of the session — and attributed it to the weekend prune. This seat
relayed that to the trader as established. **Ops excluded the mechanism by
reading the SQL: `DELETE FROM minute_bars WHERE trading_date NOT IN (...)`
removes WHOLE TRADING DATES.** There is no path by which it takes three hours out
of a date and leaves the rest standing.

**And the desk was demonstrably awake through those hours.** On 08-18
`ticker_session` holds 8,625 rows against 08-17's 8,613, and `desk_events` by UTC
hour reads 15: 2,243 · 16: 1,871 · 17: 1,294. **Ranking and writing throughout
the window that `minute_bars` shows empty.**

So the cause is unidentified, and only two candidates remain: the archive copy is
partial, **or `minute_bars` specifically stopped receiving while the other tables
kept writing — a separate, undiagnosed capture defect.**

### Why this is the dangerous shape

**A closed cause is a comfortable home for an open one.** The attribution was
plausible, arrived the same day, and pointed at something already fixed — so the
natural next step was no step at all. **A fault filed under a fix is a fault
nobody will look for again**, and it is worse than an unexplained anomaly,
because an unexplained anomaly still has someone assigned to it.

**The tell is availability, not evidence:** the cause that gets reached for is
the one discovered most recently, and same-day is the strongest form of that.

### And it moves a conclusion that had been called safe

Items 58 and 59 were argued to survive **"because the deleted region is outside
the measured window"** — 11:00–14:00 UTC against a cut at 15:00–17:00. **The
conclusion may hold; the premise does not.** If the hole is not a retention cut,
its extent is not known, and "outside the cut" was never established.

**Re-argue it positively: the measured window has FULL COVERAGE on both dates.**
That is checkable, and it does not depend on knowing what caused the hole.
**A survival argument built on the boundary of a loss inherits every error in
where you think the loss ends.**

### A number waiting on provenance must carry the wait, in the document

Design's scope quotes coverage figures — TGL 3%, AIXC 8%, SLE 46% — whose window
may overlap the unexplained hole. **Nobody can answer that yet, and the scope is
readable now.** Its own warning is the rule: they are *"the kind that get quoted
later as though they were measured on good data."*

**An unverified number in a document becomes a verified number the moment someone
else reads it**, because provenance lives in the conversation and the conversation
is not what gets read. **Mark it where it sits, not in the thread that produced
it** — the mark costs one clause and it is the only thing that travels with the
figure.

**And note the argument survived the doubt while the numbers did not.** The
threshold rejection stands on AIXC alone: a name trading 29,379 times inside a
handful of minutes is not a fidelity problem at any coverage figure. **A
conclusion resting on a counterexample is robust to the measurement; one resting
on where a band falls is not.** Separate them before either is doubted, not after.

## THE CATCH TURNS A CRASH INTO A STALE STATE, AND ONLY ONE OF THOSE IS VISIBLE

**Ops, 2026-09-05, correcting its own scope.** *"Capture is unprotected"* was
wrong, and it was built from `withBusyRetry` not appearing in `repo.ts`.
**Absence of a retry wrapper is not absence of protection.** Every capture write
path is inside a `try/catch`: `worker/runtime.ts:410` wraps `resolveSession` and
`onSessionRoll`, `:1218` wraps the flush. **The 13,094-row universe write is
inside a catch.** Capture cannot die from a busy lock.

**So the asymmetry was never "one retries and one does not". It is that one
CATCHES its errors and one did not** — research's `completeJob` threw into a
top-level `Promise.all` with nothing above it, which is why a busy lock was a
process death. The retry was the right fix; the account of who was next in line
was invented.

### And the protection produces the worse failure

**If `replaceUniverse` loses the lock at the 22:00 ET roll, the catch logs and
capture carries on with YESTERDAY'S UNIVERSE.** That is Friday's SGRX incident
arriving by a different route — the same consequence, produced by the handler
rather than by a guard. **The unconditional-refresh fix does not help: it forces
the refetch to be ATTEMPTED, not to succeed.**

A crash is loud, dated, and someone looks at it. **A caught error on a
once-per-day job is a silent substitution of yesterday's world for today's.**

**And the observable does not exist.** `universeUpdatedAt` has exactly one
reader — the refresh decision in `ensureUniverse`. **Nothing in health reads it,
so the desk reports `ok` while running on a stale universe.** Same shape as
`secAvailable`: a condition with no reader. **Retrying a write nobody checks the
outcome of buys less than checking it.**

### A RETRY BOUND IS NOT PORTABLE ACROSS CADENCES

`withBusyRetry` is 5 attempts at 200/500/1000/2000ms over a 5s driver timeout —
**~33 seconds.** Correct for research, where a job runs once and must complete.

**Copied to the flush loop it would be actively harmful: the flush runs every
1000ms, so 33 seconds is 33 missed cycles, and a skipped idempotent write becomes
a STALLED WORKER.** The flush needs nothing — idempotent upserts, already caught,
carried by the next tick a second later.

**The bound encodes an assumption about how often the caller gets another
chance.** Same code, same fault, opposite correct answer. **Ask what the next
cycle costs before reusing a retry policy, not what the error is.**

## A RE-DERIVED NUMBER CARRIES A FRESHER TIMESTAMP AND THE SAME DEFECT

**Design, 2026-09-05, declining to re-measure.** Three coverage figures in its
scope may sit inside the unexplained 08-18 hole. The instinct is to recompute
them. **The boundary of that hole is not located — the retention cut was excluded
as its cause and nothing has replaced it — so a re-derivation would presume an
edge nobody can find.**

**The output would be a number with the same problem and a newer date, which is
strictly worse than the stale one, because it would look checked.** Freshness is
read as verification. **When the boundary is unknown, marking the number beats
recomputing it**, and the mark is what was done.

**The conclusion is safe and the numbers are not** — and saying exactly that in
the document is the whole of the correct action.

### Put the note where the edit happens, and name what the argument rests on

The argument for points over a line went into the **render** layer, not the
engine: **the person tempted to draw a line is editing the mark, not the slot
builder.** A correct note in the wrong file is a note nobody proposing the change
will read.

**And it records its own dependency:** the argument holds only because the slots
are wall-clock and `activity.ts:261` maps a missing slot to zero rather than
omitting it. **If that ever changes, the series is indexed by sequence and every
line of the reasoning collapses** — the same defect withdrawn one module over the
same day. **A note that names what it depends on gives a future change a reader
that is already waiting for it.**

**Not a rule someone must remember — a note sitting where the mistake gets made.**

## A STORE THAT ANSWERS IS NOT A STORE THAT ANSWERS FOR THE RIGHT DESK

**2026-09-05. Three threads spent an afternoon on a three-hour hole in the middle
of an RTH session, and the hole is in a database nobody trades on.**

`data/market.db` is the **local split-brain desk**, last written 2026-08-20 —
sixteen days ago. AWS has been production since 08-17. The two are
**indistinguishable by filename**, and the local one answers every query with
plausible rows for the same dates.

| | `ticker_session` 08-18 | `desk_events` 08-18 | **events inside the hole** |
| --- | --- | --- | --- |
| local `market.db` | 8,617 | 18,637 | **9** |
| production | 8,625 | 28,855 | **10,489** |

**Production wrote 10,489 events in the window where the local store wrote
nine.** The local worker was down 4h37m — razor-clean edges, three separate gaps
on 08-18, a perfect adjacent date. **The shape a stopped process makes.**

**No production fault. No capture defect. Nothing to file, open or closed.**

### Why it took three threads and an afternoon

**It cannot fail to return rows. It can only return the wrong desk's.** Every
instrument used to interrogate it worked perfectly. The 8,617-against-8,625
`ticker_session` counts are close enough to read as the same desk, which is what
made the local store look like a partial copy of production rather than a
different machine.

**And the load-bearing error was a sentence nobody questioned:** *"your archive
is the only copy in existence."* It was not an archive, there was no export, and
it was not production's. **Both other threads accepted the premise and reasoned
correctly from it for an afternoon.**

### The rule

**Before comparing two numbers from a store, establish which desk the store
belongs to.** Not which table, not which date — **which machine wrote it.** On a
split-brain hazard the filename is the least reliable thing about a file.

**And it removes a class, not an instance:** the next read of that path will be
about the wrong desk too, silently, and no query will say so.

**This is the same failure as everything else today at a different scale** —
`failed checks return plausible answers`, applied to an entire database.

## A CAVEAT IS ONLY AS GOOD AS THE MECHANISM IT NAMES

**Design, 2026-09-05, recorded at `5a1e8f2` and put here because it is the
mirror of the rule above it.**

Design attached a warning to a coverage figure: *"may overlap the deleted
hours"*. Research then established the measured window was clean — 180 of 180
minutes on both dates. **On that answer alone the warning gets deleted.**

**And the real problem would have gone with it, silently.** The figures were
taken on the LOCAL split-brain store rather than production, which is a larger
caveat and an unrelated one. **The percentages would then have read as VERIFIED,
because a question that was never the real one came back negative.**

**A cleared caveat is stronger than no caveat.** That is what makes this
expensive: eliminating one candidate cause does not eliminate the doubt, but it
does eliminate the sentence carrying it.

### So where the mechanism is uncertain, state WHAT IS UNVERIFIED, not WHY

| form | can be discharged by |
| --- | --- |
| *"may overlap the deleted hours"* | eliminating that one cause — **wrongly** |
| **"provenance unconfirmed"** | **confirming the provenance, and nothing else** |

### And it pairs with the rule above

**A mechanism that explains the class is not evidence about the instance** —
believing a mechanism you have not checked against the case. **This is the same
error pointed at a doubt rather than a claim**: naming a mechanism for why
something might be wrong, and then treating the mechanism's defeat as the doubt's
defeat.

**Both attach a claim to a mechanism when the mechanism is not the thing actually
known.** One over-claims a finding; the other under-claims a risk — **and the
second is worse, because a discharged caveat leaves no trace that it was ever
there.**

## I SPECIFIED A CHECK WITH THE DEFECT I HAD RECORDED THAT MORNING

**2026-09-05.** Integration ruled that the missing observable should be:
*"`universe.updated_at` not carrying the current trading date is a health
condition."* **On a healthy desk, right now, that condition is true:**

    universe.updated_at = 2026-09-05T02:00Z
    tradingDate         = 2026-09-08

**Three days apart, and nothing is wrong.** The roll fires at 22:00 ET, sets the
trading date to the NEXT session, and stamps the fetch with NOW. On a weeknight
those coincide. **Across a weekend they cannot** — so the check alarms from
Saturday 02:00 until Monday 02:00, every week.

**That is the retention bug, specified fresh, twelve hours after being written
up.** `pruneRetention` compared calendar days to trading dates. This compares a
**wall-clock instant** to a **session label**. Same substitution, different
seat, same day. **Recording the rule did not stop the author of the rule from
committing it in the next artefact.**

**An age threshold fails identically:** after Saturday's refresh the stamp ages to
~48h by Monday, alarming all Sunday while the market is shut.

### Anchor a freshness check to the event that should cause the refresh

    universeUpdatedAt >= tradingDateRolledAt

**No date arithmetic and no wall-clock threshold**, so it cannot false-alarm at a
weekend or a holiday. And it catches both known causes with one field: Friday's
cache-stamp guard skipping the fetch, and a busy lock caught at the roll — **two
distinct causes, one consequence, one reader.**

**A check anchored to the calendar asks "is this old?". A check anchored to the
event asks "did the thing that was supposed to happen, happen?"** Only the second
is what anyone actually wanted to know.

### And it needs three states, because UNKNOWN must not degrade

Before a process has rolled once there is no `rolledAt`, and **"no roll observed
yet" is neither fresh nor stale.** FRESH / STALE / UNKNOWN, same discipline as
`secAvailable`. **A signal that alarms on every cold start gets ignored — and
then the real one is ignored too.**

### And then I specified UNKNOWN wrong too, in the same hour

*"UNKNOWN must not degrade"* — flat and unconditional. **Design caught it as
`state === 'LIVE'` in a new costume**, which is the defect the trader
screenshotted this week.

**UNKNOWN is not one state.** Silent at cold start is right. **UNKNOWN still
present at 06:55 on a trading day means no roll was recorded when one should
have been — and that is indistinguishable IN CONSEQUENCE from STALE.** He is
equally blind either way.

    FRESH    silent always
    STALE    speaks always
    UNKNOWN  silent before a roll is due, SPEAKING AFTER

**Three specifications in one day, all mine, all the same substitution:** a
calendar comparison for an event, a flat rule for a clock-relative one, and a
freshness check anchored to a date. **Nominality on this desk is almost never
absolute — it is relative to where the session clock is**, and a predicate that
does not take the clock as an input is asserting that it never matters.

**The predicate belongs in the engine, not the component.** `isMarketDataExpected`
is the precedent: the component asks whether a roll is due; it does not compute
it from a clock it holds locally. **That is exactly how the last one went wrong.**

### A caveat belongs on the thing it qualifies

Design rejected all three placements offered for the stale-universe signal.
**Not the market light** — that answers "is the feed working", and a stale
universe has a perfectly healthy feed delivering correct data about the wrong set
of names; folding it in renders a working feed as degraded and teaches the trader
to distrust that light for a reason it is not about. **Not diagnostics** — the
whole property of this failure is that it is undetectable from the board, so a
signal he must go and look for requires him to suspect first, and there is
nothing to suspect from.

**It goes on the counts it invalidates.** The Discovery header renders "N
eligible · N tracked"; a stale universe means those numbers are yesterday's.
**Same rule as the provenance warning sitting at the figures and the
interpolation note sitting at the point of temptation.**

**And render the AS-OF DATE, not a status word.** *"Universe from Friday"* is
checkable against something the trader already knows. *"STALE"* is a claim he
must take on trust. **A surface that can be wrong should carry what it would be
wrong about.**

## SEPARATE BY DEPENDENCY, NOT BY SUSPICION — AND LEAD A CORRECTION WITH WHAT SURVIVES

**Design, 2026-09-05, twice honest about what actually saved it.**

### The split held because of what it was built on

Two arguments against a coverage threshold were written apart before anyone knew
either was at risk: a **counterexample** (a name trading 29,379 times in a
handful of minutes is not a fidelity problem at any coverage figure) and a
**band argument** that depends on three percentages being right about which band
each row sits in.

They were separated because **the band argument was the more VIVID and the more
DEPENDENT, and that combination is what gets quoted.** Not because anyone
suspected the store. **It then broke in a direction nobody predicted, and the
split held anyway.**

**You cannot quarantine what you have not thought of. You can quarantine what
depends on something.** Fragility is visible in an argument's own structure
before any evidence arrives; suspicion requires already knowing the answer.
**Separating by fragility is the only version available in advance.**

**And its author's own limit on it, which is the honest size of the rule:** it
**does not find the defect — it limits what the defect costs.** Quarantining by
dependence buys nothing at the moment of writing and everything at the moment of
discovery. **Recorded at its real value rather than as foresight, because the
thread that used it said plainly that the ordering saved the block and it did
not suspect the store.**

### Better than marking: move the fragile number out of the premise position

Told to mark a local-desk figure quoted in shipped code, Design did more. The
comment had read *"no trade, no point, so there is no line to begin at the window
edge. 36–42% of top-12 rows open with a hole, and drawing from the edge would
show flat-then-rising…"* — **the rate sat where a premise sits**, so a reader
takes the constraint as resting on it.

**Now the structural claim stands alone and the figure is an aside carrying its
own warning.** If Monday's re-take moves the number, **nothing in the reasoning
moves with it.**

**A caveat says "this might be wrong". Restructuring says "and it would not
matter."** Where the second is available it is strictly better, because a warning
depends on being read and a structure does not.

**Research reached the same move independently, on the same figure, in the same
hour** — and found the sharper half. `activity.ts` opened *"TWO CONSTRAINTS,
both measured rather than chosen"*. **That is the phrase claiming authority**,
and appending a caveat beneath it would have left **the strongest claim first and
the qualification second**. It was corrected in place instead.

**A caveat added under a false sentence does not repair the sentence.** Find the
clause that asserts more than the evidence supports and fix that one; the note
underneath is for what remains true and uncertain.

### A cleared caveat is deleted; a moved caveat is kept

The provenance warning on those figures survived only because the correction
**arrived split-brain first and clean-window second.** Design's own account: had
*"180 of 180 minutes, full coverage"* arrived alone, **it would have deleted the
block** — and the real caveat, that the numbers came from a store frozen since
08-20, would have gone with it.

**A correction that clears one doubt reads as clearance of the doubt**, and the
reader discharges the whole caveat rather than the half that was answered.

**So when relaying a correction: lead with what SURVIVES, not with what is
resolved.** The resolved half is the good news and it is the half that erases the
warning. Ordering is not presentation here — **it decides whether the caveat is
still in the document tomorrow.**

## A NUMBER THAT MIGRATES INTO A COMMENT LEAVES ITS PROVENANCE BEHIND

**2026-09-05, found by enumerating which register items came from the frozen
local store.** Three did. **But one of the three had already escaped the
register:** `36-42% of top-12 rows begin with a hole` is quoted in **shipped
code** — `lib/market/activity.ts:133`, `lib/dashboard/sparkline.ts:111`, and two
tests.

**And `activity.ts` introduces it as "TWO CONSTRAINTS, both measured rather than
chosen."** The comment claims measurement authority for a figure taken from a
desk that stopped writing on 08-20.

**The constraint is fine and must not change.** A leading hole must not be drawn
from the window edge whether it happens on 36% of rows or 6% — `absent-then-
rising` is not `flat-then-rising` at any rate. **What is wrong is the sentence
asserting the rate**, and it now sits in four files with no path back to the
store that produced it.

**A number in a document has a thread behind it. A number in a comment has
nothing** — it survives every refactor, gets read as settled, and is quoted by
the next author as though the measurement were part of the code. **The register
is where provenance lives, and copying a figure out of it is how a measurement
becomes a fact.**

### "Production" is itself a date

The register records neither which machine nor as of when. **The production
snapshot everything else was measured on is `market-prod-2026-08-23.db` —
thirteen days old.** An item measured on that and one measured on Monday's live
store **are not the same claim, and nothing today distinguishes them.**

**So the register needs store AND as-of date per measured item** — not because
three items were affected, but because **establishing that it was three required
a grep and a row-count diff.** A number whose machine cannot be recovered from
the record has to be re-taken before it can be trusted, and re-taking is the
expensive outcome.

### And six of ten stores cannot say what they are

`data/` holds ten `.db` files; **six carry no label** — including four replay
stores of 112–120MB with identical tables and dates. `market.db` misled three
threads because it has the **default** name, and a reader who knows nothing
reaches for the default first. **The next one is already sitting there.**

## SILENCE IS WHAT PAYS FOR LOUDNESS — AND A SPECIFICATION SHOULD NAME THE PREDICATE'S SOURCE, NOT ITS VALUE

**Design, 2026-09-05**, resolving what looked like a contradiction in an
Integration instruction: *"do not make it subtle enough to be missed"* against
its own standing rule that a light shows words only when it is not nominal.

**They are the same constraint.** A marker that fires **rarely** can afford to be
loud; one that fires **daily** cannot. STALE is a defect condition and should be
rare, so prominence is affordable. UNKNOWN-before-a-roll-is-due would fire on
**every cold start** and would spend exactly the budget that makes the real one
visible.

**So the silence rules are not a concern to be traded against loudness — they are
what pays for it.** Every state that correctly says nothing is what lets the one
that speaks be impossible to miss.

### The test that outlives the conversation

**If it would fire on a normal morning, it does not belong on this channel at any
volume.**

That is enforceable by someone who was not in the room. *"Make it prominent but
not too prominent"* is not. **A rule that requires the author's judgement to
apply has not been written down yet.**

### And the reason three of my specifications were wrong in one day

All three were caught **by someone reading the code**, never by anyone reviewing
the specification. **A flat rule reads as complete BECAUSE it has no
conditions** — the missing clock-dependence is invisible in the sentence and
only appears at the line where the state is compared.

**So specify the SOURCE of a predicate, not its VALUE.** *"Nominal is whatever
the roll-due predicate says"* cannot be flat. *"UNKNOWN must not degrade"* cannot
be anything else. **The first form makes the dependency a question someone has to
answer; the second hides that there was one.**

## A MUTATION THAT PASSES MEANS THE MUTANT WAS WRONG, NOT THAT THE TESTS ARE GOOD

**Ops, 2026-09-05, building the universe-freshness observable.** It mutated the
implementation to a calendar-date comparison expecting the weekend test to fail.
**All seven passed.**

The mutant compared the stamp to the **rolled** date — which in the weekend case
share a date — while the defective condition it was imitating compared it to the
**trading date**, which **the function's signature does not accept.**

**So the signature excludes the bug: the flawed comparison is not expressible.**
That is a stronger property than any passing test, and **it was only found
because the mutation did NOT fail the way it was supposed to.** A mutation that
survives is a question about the mutant first and the suite second — **and here
the answer was better news than the failure would have been.**

**Design a signature that cannot accept the wrong operand**, and the test suite
stops being the only thing standing between the desk and the defect.

### And the fourth specification defect of the day, same author

Integration ruled: *write `trading_date_rolled_at` at `:413` where the roll
already logs success.* **`:413` is where the roll FINISHES.** The universe
refresh happens **inside** `onSessionRoll`, so a completion timestamp is always
later than a successful refresh — **`stamp >= rolledAt` would be false for a roll
that worked perfectly.** The field would have reported STALE on every healthy
roll and nothing else.

**Record the instant the roll BEGAN, on success only.** A refresh that ran during
the roll then stamps after it; a skipped one carries a stamp from a previous day.
**On success only, because a roll that threw did not establish a trading date and
must not claim one.**

**The rule: a timestamp is not "when we noticed", it is whatever makes the
comparison it feeds mean what it says.** Naming a convenient line to write it on
is not the same as choosing the instant.

## A CLOSED LIST THAT IS NOT CHECKED AGAINST WHAT IT LICENSES IS STILL DECORATIVE

**Research, 2026-09-05**, extending a ruling past what the ruling said.

The catalyst taxonomy's discriminating constraint is that an `INFERRED` basis
must name a rule from a **closed list**. Integration ruled the list hard closed
and stopped there. **That is not enough on its own: the model can name a REAL
rule against the WRONG AXIS, and the basis validates.** `REVERSE_SPLIT_1ST`
justifying `demand: POSITIVE` passes every check that only asks whether the rule
exists.

**So a rule must LICENSE the side it is attached to**, and a mismatch degrades
that axis to `UNDETERMINED` with the reason recorded.

**The general form: closing a vocabulary constrains WHAT can be said, never
WHETHER it supports the claim it is attached to.** A validated enum next to an
unvalidated relationship is the same decorative-constraint failure one level in —
and it is harder to see, because the enum genuinely is closed.

### And a taxonomy value finally gives a home to a sentence that never rendered

`UNDETERMINED` carries its reason, and one of the four is **`NOT_SEARCHED`** — no
supply event in the filings, and demand news never looked for. **That is the
SEC-only coverage gap arriving as a value rather than as prose.**

`bundle.ts:447-451` has composed the finished sentence — *"…and an announcement
published outside a filing would not have been seen"* — since it was written, and
**it has never been rendered to anyone**: its only consumer is the model prompt.
**The fact was true, computed, and unreachable.** As a taxonomy value it is
reachable by construction, and the wrapper reframe and the taxonomy now share a
vocabulary instead of describing the same absence twice.

## A SAMPLE SIZE IS SET BY THE RAREST THING YOU NEED TO SEE, NOT BY THE BUDGET

**2026-09-05, ruling on the taxonomy calibration census.** Research proposed
n=60, stated plainly that it was **not derived from a power calculation** — it is
what makes 6% of a bad day — and asked for it to be set rather than defended
afterwards. **Saying so is what made the defect findable.**

**The four pre-registered predictions are not all answerable at the same n**, and
nothing in the design said which were which:

| prediction | at n=60 |
| --- | --- |
| `demand: UNDETERMINED` ≥ 40% | **answerable** — ±12pp is far inside the call |
| supply `OBSERVED` > `INFERRED` | **answerable** — a large expected gap |
| `RULE_DIRECTION_MISMATCH` > `UNRECOGNISED_RULE` | **NOT ANSWERABLE.** Both are expected rare; at 5% the sample holds three of one and one of the other, and 3-versus-1 resolves nothing |

**A prediction that cannot come out either way at the chosen n is a check that
cannot fail** — this desk's oldest entry, arriving in an experiment design
instead of in code. **It must be declared unpowered IN ADVANCE and reported as a
raw count with no comparison**, or it will be read as a result the moment the
numbers exist.

### And do not buy resolution on rare events by paying for it on common ones

The instinct is to raise n until the rare category resolves. **That spends the
whole budget on categories already well estimated at 60.** The right instrument
is the top-up Research had already designed for arm B — **enlarge only where the
rarity binds.**

**Its stated trigger is the better finding anyway: fewer than 10 rule-fired
inferences in 60 means the rules are rare, and A VOCABULARY THE MODEL DOES NOT
REACH FOR IS NOT A CONSTRAINT.** That result would say the closed list is
decorative in practice while being perfectly enforced in code.

### UNVERIFIED is the honest state — and name what could ever close it

A rule-fired inference claims a **fact about a document** — a 12b-25, a
compliance notice, stock consideration in the stated terms — and verifies against
the filing. **"Buyers arrive" does not.** Research is the model's cousin, not an
independent judge, so the demand axis ships **UNVERIFIED** rather than carrying a
number nobody can stand behind.

**Accepted, and it is permanent for document verification.** But the gap must be
recorded as **bounded, not open**: the one instrument that could ever touch it is
the **tape** — what the name did after the catalyst — which is an outcome check
rather than a source check, **and a weak one, because a catalyst can bring demand
and the price still fall.** Naming the only available instrument, and its
weakness, is what stops the gap being rediscovered as news every quarter.

## A SUITE THAT VANISHES REPORTS SUCCESS-SHAPED SILENCE

**Ops, 2026-09-05.** A string slice mid-edit removed a whole test from the file.
**vitest reported "no tests" — not a failure.** The damage was found because the
output was *shaped wrong*, not because anything went red.

**A deleted test and a passing test are both green.** Every instrument on this
desk is built to notice a failing assertion; **none of them notice an assertion
that stopped existing.** It is `failed checks return plausible answers` at the
level of the suite itself — the check did not fail, it left.

**Watch the COUNT, not the colour.** 1749 → 1756 → 1758 is the reading that would
have caught it, and it is the one nobody looks at when the line is green.

## REUSING A PREDICATE BUYS NO NEW CLOCK AND SELLS A SHARED DEPENDENCY

`universeRollDue` is `isMarketDataExpected(sessionPhase)` — **reused rather than
written**, deliberately, because a fresh *"has 22:00 passed"* would have been the
**fourth clock threshold in a day that produced three defects from exactly that
move.** The engine stays the only thing reading a clock, and that is right.

**But the alarm is now coupled to a predicate that exists for another reason.**
Someone changing `isMarketDataExpected` for a session-phase purpose — a
pre-market boundary, a holiday rule — **silently changes when the desk reports a
stale universe**, and nothing at either site says so.

**Reuse is correct here and the dependency must be named at BOTH sites**, the way
the sparkline comment names its dependency on the slot builder. **A shared
predicate is a coupling whether or not anyone writes it down; writing it down is
the only part that is optional, and it is the part that decides whether the next
change meets a reader.**

### And the cost that was named rather than hidden

If the 22:00 roll fails, the signal stays silent until premarket — **it speaks
from the moment the trader could be looking, and not before.** That was chosen
over inventing a threshold. **If it needs to be louder the fix is a stricter
predicate, never a wall-clock constant.**

## THE OBSERVABLE BUILT TO MAKE A SILENT FAILURE VISIBLE WAS ITSELF A SILENT FAILURE

**Ops, 2026-09-05, deployed to production and caught twenty minutes later by
reading the served API instead of the source.**

The three universe-freshness fields were added to **`DiscoveryState`** and
documented on **`MarketFeedHealth`**. A one-occurrence string replace anchored on
`universeMode: UniverseMode;` **took the first of two identical lines** — 484
instead of 558. The snapshot literal was then populated to match, so **both
halves agreed with each other and the compiler had nothing to say.**

**It gated clean: 1776 tests, lint, build, typecheck.** It deployed. The worker
restarted and wrote a fresh snapshot. **And the field reached no reader at all** —
`readModel` projects the discovery payload field by field and **silently drops
anything it was not told about**, while `feed_health` is persisted as a whole
payload, which is why `universeMode` reaches the API and these three reached
nothing.

### A green gate proves the code is consistent with itself, not that it reaches a reader

**A type that ACCEPTS a field and a projection that CARRIES it are different
guarantees, and `tsc` checks exactly one of them.** Every field-by-field
projection is an unchecked allowlist: adding to the type is free, and the
omission is invisible in both directions.

**Verify a reader by reading the READER.** Everything else built that day was
checked that way; this one was checked at the source and was wrong on production
for twenty minutes.

### And the empty result was nearly read as a formatting problem

The grep for the field came back empty while a completion report was being
composed. **What made the emptiness legible was checking `universeMode` in the
same object as a CONTROL** — present, in the same payload, where the new fields
were absent. **When a query returns nothing, look up something you know is
there.** Without the control, "empty" is indistinguishable from "wrong grep".

### A one-occurrence replace on a non-unique anchor picks silently, and picks first

**The failure is not the replace — it is never asking whether the anchor was
unique.** Same shape as a grep returning nothing and being read as a finding: **an
operation that cannot report ambiguity will resolve it for you.**

**Footnote on discipline:** the deploy instruction named `8a77e25`; the sha
deployed was `52fa841`. The delta was documentation only, so nothing moved — **but
a named sha exists so that what ships is what was ruled on, and next time the
delta will not be docs.**

## THE COLUMN ASKED FOR A BINARY AND THE BINARY LIES ON TEN FIELDS

**R&D, 2026-09-05**, filling the `live?` annotation that Integration specified as
**irreplaceable-or-re-fetchable**. It came back with **three** values, because
they have three different retirement consequences:

| value | meaning | consequence |
| --- | --- | --- |
| **REFETCH** | a later query recovers the SAME value | drop freely |
| **MOMENT\*** | re-fetchable, **but not as it stood then** | history lost either way; a substitute can be built |
| **MOMENT** | nothing later recovers it | **those days are blank forever** |

`stockanalysis.com` overwrites its float: the number shown on 08-17 is gone
whatever anyone does now. **That is neither irreplaceable nor re-fetchable, and
collapsing it into either gets the retirement order wrong in OPPOSITE
DIRECTIONS.**

**A two-valued specification is a claim that the world has two states in it.**
This is the same defect as one constant for a fault and an absence, arriving in
an annotation schema instead of in code — **and it was specified by the seat that
recorded that rule.**

### Two things a green gate does not prove, hit in one afternoon

**That the tests still exist**, and **that the code is observable.** Neither is
visible in the colour. The first reports as *"no tests"* rather than red; the
second reports as a clean build of code no reader consumes. **Both were found by
reading a count or a reader, never by looking at the result.**

## A NO-OP PUSH PRINTS THE SAME THING AS A SUCCESSFUL ONE

**Ops, 2026-09-05, twice in twenty minutes.** `git pull --ff-only` inside the
**detached** gate worktree fails, so the cherry-pick never happened — **and the
compound command then printed "pushed" from a push that had nothing to push.**

**The first occurrence was missed** and caught only by checking whether the sha
was an ancestor of `origin/main`. The second errored loudly and was fixed at
once. **The instructive one is the first: the word "pushed" is output, not
evidence.**

**Verify by CONTAINMENT, not by the report of the operation.** `git merge-base
--is-ancestor` answers the question the word does not. It is the same shape as
verifying a reader by reading the reader, and as reading the served API rather
than the source — **the tool's own success message is the least informative thing
it emits.**

### And a correction to an Integration discipline note in the same hour

Integration wrote *"deploy the sha you are given"* after `8a77e25` was named and
`52fa841` shipped. **The rule stands. The named sha was also the defective one** —
`8a77e25` is the commit where the observable reaches no reader, so deploying
exactly as instructed would have installed a green, gated, invisible field.

**Both are true and neither excuses the other.** A named sha exists so that what
ships is what was ruled on; **it does not make what was ruled on correct.** The
thread that finds a defect in the sha it was handed comes back and says so —
which is what happened — and the ruling seat says plainly that its sha was wrong.

### Three things a green gate does not prove — and "tests green" is not "gate green"

**Ops, 2026-09-05, committing while `BUILD=1 TYPECHECK=2` and reporting green.**
The gate and the commit were chained in one command; `upsertBaselines` was called
with two of its three arguments.

**Vitest was green throughout — 1784 passing — because VITEST DOES NOT
TYPECHECK.** A test file can be **simultaneously passing and uncompilable**, so
*"tests green"* and *"gate green"* are different claims and one was reported as
the other.

So the list is now three: **that the tests still exist**, **that the code reaches
a reader**, and **that the code compiles at all.** None is visible in a passing
suite.

### A helper that works and a call site that uses it are different guarantees

Five tests were written against `withBusyRetry`, then `replaceUniverse` was
unwrapped to check they caught it. **They did not.** It typechecked, it would
have shipped, no test failed — **because testing the helper says nothing about
whether a call site uses it.**

**The same gap as the invisible observable, one layer over:** there the field was
on the wrong object; here the wrapper was tested without the wiring. **Both are
an artefact verified in isolation and never at the seam.**

**The fix is the mutation that should have been written first:** drive the real
call sites against a store whose transaction throws busy, so **unwrapping either
one fails a test.**

## AN OLD BUILD CANNOT REPORT A FIELD IT NEVER HAD

**Design, 2026-09-05**, adding a state to a signal Ops specified and Integration
ruled on. FRESH / STALE / UNKNOWN were the three. **The fourth is ABSENT** — the
field missing entirely, because the desk serving the payload predates it.

**Absent must be SILENT.** Treating it as stale fires on every old build, every
rollout window, every rollback — **the alarm-fatigue failure that makes the real
marker ignorable**, arriving through version skew rather than through the clock.

**This is the UNKNOWN argument one level further out, and two seats stopped short
of it.** Ops reasoned about *"no roll observed yet"*; Integration ruled on when
UNKNOWN speaks. **Neither asked what a reader does when the field is not there** —
and during any rolling deploy, the reader and the writer are on different
versions by construction.

**A new field has a fourth state for as long as an old build can serve the
payload**, and the enum never names it because the enum ships with the field.

### And the control technique travelled between threads

Before writing anything, Design checked `universeMode` alongside the three new
fields — **proving "present" before "absent" could mean anything.** It took that
from Ops's report of its own near-miss hours earlier.

**The near-miss was worth more than the feature.** Reporting a defect plainly,
including the twenty minutes it was live, is what stopped a second thread
reaching for the same wrong object for the same reason.

## A CORRECT VERIFICATION OF THE WRONG RELEASE

**Ops, 2026-09-05.** A deploy was refused by preflight (exit 3). The output was
run through a filter grepping for *migrate / release / deployed / FAILED* — **and
the refusal line, "preflight refused the deployment", matched none of them.** The
run looked quiet.

**The post-deploy verification then passed in full:** four units active, health
ok, `universeFreshness` UNKNOWN, `rolledAt` absent. **Every one of those was
true. Every one was about the release that was already running.**

It was caught on **one field** — the units reported `rel=6022210`, not the new
sha. **Without that, a successful deploy of something that never shipped would
have been reported, with a complete set of correct verifications underneath it.**

**Verify a deploy by the SHA THE UNITS REPORT, never by the health of the desk.**
A healthy desk is evidence that *something* is running. **Nothing in a health
check knows what it was supposed to be.**

**And a filter that drops the failure makes a failed run look like a quiet one.**
The reassuring output here was the operator's own grep discarding the only line
that mattered — **a pattern list is an allowlist, and an allowlist cannot report
what it excluded.**

### The retention bug's shape, in the same directory, with the opposite consequence

`preflight.sh`'s CHECKPOINTS array is **unconditional** — no calendar, no weekday
test. It protects 06:10, 06:25, 09:25, the RTH intervals and the close **every
day of the year**, including weekends and holidays when none of them run. It
blocked a Saturday deploy to protect a `STRUCTURAL_REFRESH` that the desk's own
scheduler puts on **Monday**.

**`pruneRetention` counted calendar days where the requirement was trading dates;
`preflight` protects calendar windows where the requirement is scheduled
checkpoints.** One over-deletes, one over-blocks — **opposite consequences,
identical substitution, same directory, and the first was fixed that morning
without anyone looking at the second.**

**Fixing an instance does not sweep the file it lives in.** When a defect is
found, grep the neighbourhood for the same substitution before closing it.

### And the override that was not used

The escape hatch takes a free-text reason: *"why this cannot wait"*. **The window
cleared in seven minutes, so it could wait**, and the true reason would have been
*"I did not want to"*.

**A justification field only works while every entry in it is true.** One
plausible-but-false entry makes the whole record unreadable — **and the cost of
declining to use it was seven minutes.**

## CALENDAR ARITHMETIC IS CORRECT WHEN IT FEEDS A CALENDAR LOOKUP AND WRONG WHEN IT SUBSTITUTES FOR ONE

**Ops, 2026-09-05**, sweeping the neighbourhood after two instances of the same
substitution turned up in one directory. **The sweep found a third, and a
counter-example that matters more.**

**Third instance — `worker/dial.ts:37-38`:**

    const WINDOW_START_UTC_HOUR = 8;  // 04:00 ET, EDT
    const WINDOW_END_UTC_HOUR = 11;   // 07:00 ET

**A hardcoded UTC hour standing in for an ET wall clock — and the comment says
"EDT", so the author knew the assumption and did not guard it.** Under EST, 04:00
ET is 09:00 UTC, so **from the first Sunday in November the pre-registered
premarket window silently becomes 03:00–06:00 ET**: an hour of pre-premarket
included, the last hour of premarket dropped. Analysis rather than a live path,
so it corrupts a **pre-registered measurement** rather than capture — **the kind
of number that gets quoted later**, firing by calendar rather than by anything
anyone will notice.

### The counter-example is the useful half

`worker/archive-backfill.ts` names **CALENDAR** in every constant, and converts
explicitly:

    SPLIT_LOOKBACK_CALENDAR_DAYS = Math.ceil(SPLIT_LOOKBACK_SESSIONS * 1.6) + 14

**The distinction was already understood in this repo, in a neighbouring file,
before any of today's defects.** The pattern to copy exists: **sessions × ratio +
pad, and say which unit you are in.**

### The discriminator

**Fetch a range by CALENDAR. Gate an action by SESSION.**

`runtime.ts`'s `addDays` callers are all correct under this test — they take a
calendar range **in order to learn which days are sessions** (`:314-315`), iterate
to find the next session (`:341`), or over-provision safely (`:689-690` takes 60
calendar days for a 20-session baseline). **You must count calendar days to
discover sessions; you must not count them to decide whether to act.**

**And the sweep is the lesson, not the third bug.** Two instances were already
known and the third would not have been found by fixing them. **A defect found is
a query to run, not a line to change.**

**A sweep by SHAPE finds what a sweep by CALL SITE cannot.** `dial.ts` shares no
code with `pruneRetention` or `preflight` — only the substitution. Grepping for
callers, imports or symbols would have found none of it.

### And the sweep caught the morning's own fix, six hours later

`preflight`'s window test is `nearest_diff <= PROTECTED_MINUTES`, so **exactly
five minutes away still blocks** — the window is ±5 **inclusive**, eleven minutes
wide rather than ten. Two seats computed the clear gaps from the comment and
**both were a minute wrong at each edge.**

**That is the same `<=` boundary fixed in the same file that morning** — `d3c56ce`
made `PROTECTED_MINUTES=0` mean *off*, because `0 <= 0` blocked. **The zero case
was changed and the general one was left.**

**A fix is an instance too.** The sweep rule applies to the commit that prompted
it, and the natural moment to skip that check is exactly when the defect feels
freshly closed.

## THE ARCHIVE RECORDS HOW MANY BARS THERE WERE, NOT THE BARS

**Ops, 2026-09-05, scoping the backfill and finding the question was the wrong
size.** `lib/archive/store.ts:183` stores **`minute_bar_count INTEGER`.** A
count. The archive's own header says it exists because a mode switch can destroy
`ticker_session`, `minute_bars` and `desk_events` — **and its answer for bars is
to record how many there were.**

**So minute bars live in exactly one place, for exactly three sessions
(`MARKET_MINUTE_BAR_RETENTION_DAYS`, default 3), and nowhere else.** Verified in
`config.ts:85`.

### Which makes the backfill question answer itself

`pruneRetention` runs at every roll and every worker start, so **any session
pulled beyond the third most recent is deleted hours later by the fix shipped
that morning, working exactly as designed.** *"How far back is worth pulling"* is
**three sessions or nothing** — anything else is a request budget spent on rows
with a scheduled execution date.

**A restore deeper than the retention is not a restore. It is a delayed delete.**

### And it re-explains a limit two threads had accepted as an accident

Research's drawdown work wanted minute bars across more sessions than exist and
read *"only two sessions retained"* as a store limitation. **It was structural.**
No measurement over minute bars can span more than three sessions on this desk
**however the retention behaves** — the weekend bug made it two instead of three
and hid a ceiling that was there the whole time.

**The defect was the smaller half of what it was concealing.** Fixing it restored
one session; it did not create the durability nobody had.

### The decision is not "how far back"

**Do minute bars outlive three sessions at all?** Three answers and only the
first is a backfill: **restore the three** (bounded, ~2.7M bars, ~270+ pages,
minutes not hours, idempotent by `ON CONFLICT(symbol, ts)`); **raise the
retention** (one env var, ~900k rows a session, ~+6GB for ten — a storage
decision); **give bars a durable home in the archive** (schema work, and the only
one that makes multi-week bar analysis possible).

**The seat that can price it is not the seat that can say whether three is
enough.** Ops named that boundary itself and refused to choose across it.

### And the count that "is not the series" is the target list

**`symbol_outcomes` is keyed `PRIMARY KEY (symbol, trading_date)` and carries
`minute_bar_count` per row.** So the archive cannot restore a single bar — **and
it knows exactly which symbols had bars on which date, and how many.**

That matters because **the record of which symbols to fetch was itself in the
deleted rows.** A backfill cannot "restore what was there" from `market.db`; it
can only fetch for a set someone chooses, and choosing the whole universe is
13,094 symbols against roughly 1,300 that actually carried bars — **a tenfold
cost difference, decided by a table nobody thought to consult.**

**It also makes the backfill self-checking.** Fetch, then compare rows written
per symbol against the count the archive recorded at the time. **A completeness
test that would not otherwise exist**, on a path where "Alpaca returned nothing"
and "we asked wrongly" are otherwise indistinguishable.

**A field dismissed as a weak substitute for the data can be a perfect index to
it.** The count was judged by what it failed to preserve; its value was in what
it enumerates.

## A COMPRESSION IN A RELAY BECOMES A DISCREPANCY IN THE RECEIVER

**Integration, 2026-09-05.** Ops priced the retention option as **"~900k rows per
session on a store already at 1.01GB, so ten sessions is roughly +6GB."** Two
units, stated clearly.

**Integration relayed it as "~900k rows and ~+6GB per ten sessions"** — the
per-session figure and the per-ten-session figure collapsed into one phrase
governed by the wrong denominator.

**Research then measured a full session at 1,047,109 rows and correctly reported
it as an order-of-magnitude discrepancy against the estimate — flagged, not
corrected, with the reason it could not check production.** Exactly the right
behaviour.

**There was no discrepancy.** 900k against 1,047,109 per session is close, and
+6GB for ten sessions is consistent with both. **The disagreement was
manufactured entirely by the relay**, and it cost the receiving thread a
measurement and a paragraph of careful hedging about which desk was subscribed.

**A relay that shortens a figure must carry its denominator.** "Per session" and
"per ten sessions" are four words apart and an order of magnitude apart, and the
seat that drops one is never the seat that discovers the cost.

**This is the third relay defect from this seat today** — a mechanism passed on
as established, a sha challenged without checking ancestry, and now a unit
dropped from a cost. **All three were caught by the receiving thread checking
rather than believing.**

## SELECTIVE RETENTION BY RANK, NOT DEPTH FOR EVERYTHING

**Research, 2026-09-05**, answering "how many sessions of minute grain do you
need" with a number, a derivation, and a third option nobody had named.

**Three sessions is enough for everything the desk RENDERS.** The price window,
the activity verdict and the sparkline are all current-session only — **nothing
on the board reads a bar older than today.** The requirement is for measurement
**about** the desk, not for its operation.

**Ten sessions is the floor for one thing: whether a coverage or fade rate is
stable enough to QUOTE.** ~12 board names a session, so ten sessions is ~120
name-sessions — roughly the minimum for a rate at ±5pp. **Two sessions produced
66.6% and 54.2% this week and nobody could say whether twelve points was noise.**

**And it does not cost what either seat assumed, because it does not need every
symbol.** Measured on 2026-08-17:

| | rows | share |
| --- | --- | --- |
| all symbols | 1,047,109 | 100% |
| **top-50 ranked** | **16,266** | **1.55%** |
| top-12 ranked | 6,408 | 0.61% |

**Ten sessions of board-only bars ≈163k rows against ≈10.5M for all symbols —
the same research value at 1.6% of the volume.** A symbol that never ranked
contributes nothing to a coverage rate for the trader's window; **retaining it is
paying to store the 98.4% that answers nothing.**

**It needs a predicate in the prune rather than a bigger number, and it does not
touch the archive schema.** Neither the seat pricing depth nor the seat ruling on
it had thought past *more* versus *less*.

## A SCHEMA IS NOT A STORE

**Integration, 2026-09-05.** Told the archive keeps only `minute_bar_count`, this
seat read `lib/archive/store.ts:191`, confirmed `PRIMARY KEY (symbol,
trading_date)`, and ruled that **the archive could serve as the backfill's target
list and completeness check.** The reasoning was sound.

**There is no `archive.db` on production.** No archive path in the environment,
and `archive-backfill` has **never run on that host** — zero journal mentions,
ever. The `archive.db` that exists is in the local `data/` directory: **the
split-brain desk's archive, 901KB.**

**The wrong-desk trap for the third time in two days, and this time from the seat
that recorded the rule.** Ops caught it before scoping rather than after.

**Verifying a table definition proves a table CAN exist. It says nothing about
whether one DOES, or on which machine.** The file that was read is checked into
the repo and identical on every host; **the store it describes exists on exactly
one of them, and not the one that matters.**

**Reading the code is how you learn what is possible. Reading the box is how you
learn what is there.** Every instrument used to confirm the plan lived in git.

### The data was on the box the whole time

`createSchemaBackup` VACUUMs the entire store before every migration, so each
backup is **production entire at that instant**. `market-v23-2026-09-04` holds
**2,116,296 minute bars** — 09-02 and 09-03 complete, ~7,800 symbols each. **The
rows the prune deleted were sitting in `/var/lib/mointel/backups`.**

And `minute_bars` is **byte-for-byte the same CREATE TABLE at v23 and live v25** —
the v24 and v25 columns went onto `ticker_session`. **So the restore is ATTACH
plus INSERT: no Alpaca, no rate limit, no pagination, no new write path, and the
rows are EXACT rather than refetched.**

**A backup taken for migration safety is a backup.** It was described as a
rollback artefact and read as nothing else; nobody asked what else it contained.

### And one estimate that was six times low

The *"~1,300 symbols per session"* figure came from counting distinct symbols in
**`daily_bars`** on a **partial** 09-04 — **a different table, a partial day,
generalised to a per-session rate.** It is ~7,800. **The backups state it
directly.** It cost nothing only because the plan it justified was abandoned.

## START A KEEP-LIST FROM A UNION AND ADD; NEVER FROM EVERYTHING AND SUBTRACT

**Ops, 2026-09-05**, designing the ranked-retention predicate around a hazard
Research found in the store.

**2026-08-24 has 8,653 symbols seeded and ZERO ranks** — the trading date rolls
at 22:00 and ranking has not run yet. **That state exists every night.**

**So the obvious predicate deletes the live session.** *"Delete where symbol not
in the top-50 for that date"* removes everything for today, in the window where
today's bars are the only ones that matter. **The retention bug deleted past
dates; this one would delete the present one.**

The shape that cannot:

    keep = floor_dates ∪ ranked_extension

    floor_dates      = the 3 most recent dates PRESENT (absolute)
    ranked_extension = top-50 per date, dates 4..10 back, ONLY where a rank list evaluates

**A date with no ranks contributes nothing to the extension, so the floor governs
it and keeps it entirely.** "Retain more, never less" stops being a rule someone
must remember and becomes **structural**: an extension that cannot evaluate
extends nothing, and nothing can reduce below the floor.

**A predicate that starts from "everything" and subtracts has the opposite
failure mode — the one that cost 2.1M rows.** Same policy, same data, and the
direction of construction decides whether a missing input deletes or preserves.

### And the history to fill the policy was already on the disk

**Nine distinct trading dates sit in `/var/lib/mointel/backups`** across v18–v23:
08-17 through 08-24, and 09-01 to 09-03. **Only 09-04 is in none of them.** At
top-50 that is **~145k rows for nine sessions**, from local files — no Alpaca, no
rate limit, exact rather than refetched.

**The argument for ranked retention stopped being hypothetical when the history
to fill it turned out to already exist.** A policy justified by what it would
enable is weaker than one that can be populated the day it ships.

### The ordering that ruling implies, and it is forced

**Restoring nine sessions before the predicate ships is a delayed delete.** The
current floor keeps the three most recent dates present; six of the nine would be
pruned at the next roll. **Ship the predicate, then restore** — and restore now
only what the floor already protects.

**And verify the RANK SOURCE exists for each date before restoring its bars.** An
extension that correctly evaluates to nothing on a date with no ranks will let
the floor delete the bars just restored for it. **Restoring data a predicate
cannot protect is the same delayed delete wearing a policy.**

## A TRANSIENT STATE FROZEN IN A SNAPSHOT READS AS A PERMANENT ONE

**2026-09-05.** Research reported 2026-08-24 holding **8,653 symbols and zero
ranks** — the case that shaped the whole ranked-retention predicate. **Live
production shows 08-24 with 2,830 ranked and a full top-50.**

**Both are true.** Research measured the **08-23 snapshot**, captured while 08-24
had rolled and ranking had not yet established. **The rankless state is
transient** — it exists between the 22:00 roll and ranking establishing, every
night, and it resolves.

**A snapshot is a store with a timestamp, and it preserves a passing state with
exactly the same fidelity as a settled one.** Nothing in the rows says which it
was. **Reading a snapshot answers "what was true at that instant", never "what is
normally true"** — and the two are indistinguishable inside the file.

### The narrowing does not shrink the hazard

The rankless window applies to the **current date**, nightly, not to historical
dates. **That is narrower than it first read and no less dangerous:** the current
date is precisely the one whose bars are irreplaceable, and the window is
precisely when a prune runs at a worker start. **The fixture keeps the date in
its name so nobody generalises it away.**

**And the check that settled it is the one to copy:** ranks were verified present
for all ten dates against **live production**, not against the snapshot that
raised the question. `ticker_session` is untouched by minute-bar retention —
**confirmed rather than probable.**

## WHEN YOU NEED A BAND, LOOK FOR ONE THE INSTRUMENT ALREADY PROVIDES

**Design, 2026-09-06**, asked to define "flat" for a direction-coloured mark and
refusing to pick a percentage.

**Any number chosen would be invented, and an invented band is a threshold that
does not declare itself** — the failure this desk has now rejected twice.
`spreadPct` is already on telemetry, from the live quote. **So FLAT means the
window's move is smaller than the current spread: a move he could not have
captured.**

**Derived rather than chosen.** Correct per name, where one fixed percentage is
wrong for both a $2 and a $40 stock. **And meaningful to the trader rather than
to the engine** — it says the move was not tradeable, which is exactly why he
would want it dimmed instead of shown as movement.

**The caveat is carried, not hidden:** the spread is CURRENT while the move spans
t−6…t−2, so a spread that widened after the window misclassifies. **Directionally
right, and honest in a way an invented band cannot be.**

### And a fourth state that yellow is sitting right next to

**Yellow means MEASURED AND FLAT. Neutral means NO PRICE TO JUDGE.** With no
price window, or no spread to judge against, there is no direction to state —
and **yellow is the obvious wrong answer because it looks like the natural
"nothing to report" colour.** One constant for a fault and an absence, arriving
as a palette decision.

### A correction to the Integration framing that made the answer possible

Integration framed one colour per row as *"a claim you are making"* and per-bar as
*"an observation you are showing"*. **The sign of (last close − first close) is
arithmetic, not judgement.** The only claim in the mark is **the flat band** — so
once the band is derived, **per-row is an observation too**.

**That refinement is load-bearing rather than pedantic:** it located the single
judgement in the design, which is what made it answerable from an existing
quantity instead of from taste. **Find the one place a design actually decides
something, and the rest stops needing defending.**

## A THRESHOLD ON A RANKING PRICES AS MEMBERSHIP AND BILLS AS ENTRY

**Research, 2026-09-06**, measuring a queue rule before building it.

*"Research anything that enters the top 10"* sounds like ten names. **Measured
over four sessions it is 24–40 distinct names a day** — because the top ten is a
membership at an instant and the rule fires on **entry**, and the board churns.

| session | entry events | distinct | rank ≤ 10 |
| --- | --- | --- | --- |
| 08-17 | 69 | 65 | **40** |
| 08-18 | 58 | 50 | **24** |
| 08-19 | 32 | 29 | **15** |
| 08-21 | 54 | 50 | **32** |

**And the guard everyone reaches for is not where the cost is.** Once-per-name
saves **9%** — 19 of 213 events carry `episode > 1`. **Oscillation is mild; first
entries are the bill.** The constraint was right and it protects almost nothing.

**A rule stated as a rank is priced by the reader as a set size and billed by the
system as a flow rate.** Ask for the count over a session before agreeing to
anything phrased as "the top N".

### A second trigger phrased symmetrically was not symmetrical at all

*"…or top 10 by gain"* reads as the same rule on a different column. **There is no
gain ranking.** `RVOL_RANK_ENTRY` and `AH_RANK_ENTRY` exist as events; **no gain
rank exists anywhere**, and `ticker_session` carries only `percent_change`, which
**overwrites**.

**So it is a new ranking, a new entry event and a new episode counter — three
mechanisms, not a threshold** — and the column it would naturally be derived from
is **the exact overwriting column that caused the original defect.** Deriving
entry from it rebuilds the bug with a threshold on top.

**Two clauses of one sentence can differ by an entire subsystem.** Grep for the
mechanism each half assumes before pricing either.

### And a board finding, with its metric named

**83 names first entered at rank 11 or 12. Not one ever reached rank ≤ 5**, across
four sessions.

**Two limits stated with it:** `discoveryRank` is 12, so this cannot speak to
ranks 13+, which are never ranked at all. **And the success metric is RANK, not
money** — a name can enter at 11, never reach the top 5, and still have been a
good trade. **The result is "the bottom two slots produce no top-5 names", not
"the bottom two slots are worthless"**, and only the outcome record could answer
the second — which does not exist on production.

## A RETRY BUDGET IS A CEILING ON EVERY OTHER WRITER'S TRANSACTION LENGTH

**Ops, 2026-09-06, restoring 2.1M minute bars and crashing the research worker
four times doing it.** `SqliteError: database is locked`, unhandled, exit 1, at
21:54:12, 21:54:44, 21:55:15 and 21:55:47.

**The restore ran as two transactions, one per date.** Each held the write lock
longer than research's ~33-second retry budget, so `withBusyRetry` **exhausted
and threw — exactly as designed — and the caller above it dies on a throw.**

**So the bulk write caused precisely the defect that chunking exists to prevent,
while chunking sat queued behind it.** Integration set that order.

### The inversion

`withBusyRetry` was ruled as protection **for the writer that retries.** It is
also, and more importantly, **a contract on how long anyone else may hold the
lock.** 33 seconds is not a patience setting — **it is the maximum transaction
length the rest of the store is permitted**, and any write exceeding it converts
a bounded retry somewhere else into a process death.

**Chunking is therefore not an optimisation and not about the writer's own
speed.** It is the precondition for any bulk write on a store with a single
write lock. **A few thousand rows per transaction; stay inside the budget the
readers were given.**

### And the approval conditions covered correctness, not concurrency

Integration set five conditions on the restore: schema identity verified at run
time, source non-empty, live confirmed empty, counts verified per date after,
outside the roll window. **All five were met and the restore is exact.**

**Not one of them asked how long a transaction would be held.** Every condition
addressed *is this the right data* and none addressed *what does writing it do to
everything else*. **A correctness checklist passes a concurrency defect without
noticing it.**

**What it cost was nothing, and that was the window's doing rather than
anyone's judgement** — market shut, no research jobs queued, systemd restarted it
each time. **At 10:00 on a Monday it would have been four crashes across live
work.** Choosing the idle window is what made the mistake free, and that choice
was made for an unrelated reason.

## "MONDAY'S ROLL" DOES NOT EXIST, AND EVERY SEAT PLANNED AROUND IT FOR TWO DAYS

**2026-09-07.** Monday 09-07 is **Labor Day**. The desk's own `tradingDate` has
read **2026-09-08** since Saturday's roll, which is the desk saying so — and
every thread, Integration included, kept writing *"before Monday's roll"*,
*"Monday's premarket"*, *"Monday's capture"*. **The next session is Tuesday.**

**Nobody checked the desk's own answer against their own sentence**, while
spending the weekend recording that calendar arithmetic must not stand in for
sessions. **The substitution was in the language, not the code.**

### And it has a dated consequence on the first trading day

`rollTradingDateIfNeeded` returns early when `rolledTradingDate` yields null, so
**with `tradingDate` already 09-08 no roll fires tonight.** The roll to 09-09
fires Tuesday 22:00 ET — **after Tuesday's session.**

So on Tuesday: `trading_date_rolled_at` **absent** → `universeFreshness` UNKNOWN,
and `universeRollDue` **true** from premarket onward. **Per its own specification
the marker speaks for the whole session, saying the board may be missing names,
when nothing is wrong.**

**The alarm-fatigue failure that both Ops and Design designed against, arriving
through DEPLOYMENT TIMING rather than through logic.** The roll it needs to
observe happened before the field existed, and the field cannot know that.

**A new signal's first reading is not its steady state.** Anything that reports
on an event has a blind period equal to the gap until that event recurs — **and
if the event is weekly or session-bound, the blind period covers a whole session
of live use.** Ask when the first true reading arrives, not whether the logic is
right.

## THE SAFETY WAS SUPPLIED BY THE DEFECT, SO THE ORDER OF FIXES IS LOAD-BEARING

**Ops, 2026-09-07**, scoping chunking against a queued delete-pass.

`replaceUniverse` is **safe to chunk only because it never deletes.** It is
upsert-only, so a partial chunked run leaves unprocessed symbols on their
previous row: the result is always a **superset** of the prior universe, never a
subset. **No board can lose a name to a partial run.**

**That safety comes entirely from the bug queued as item (e).** The moment
`replaceUniverse` starts deleting, a partial chunked run leaves a **half
universe** — the SGRX failure reached from the other side.

**So (d) must land before (e), and (e) can then never be a chunked delete.** It
has to be **stage-then-swap**: bulk-load a staging table in chunks, make the
visible change one small transaction. **Atomicity comes from making the visible
write small, not from making the whole write one transaction.**

**Before fixing a defect, ask what currently depends on it.** A queue ordered by
consequence is not enough when one item's remedy removes another item's guard.

## TEST THE PROPERTY, NOT THE CLOCK

Integration ruled that a chunk must complete *"comfortably inside 33 seconds
under load, demonstrated not assumed"*. **Ops refused the literal form and was
right.**

**A wall-clock assertion in a test measures the CI box.** It reddens when the
machine is busy, and a test that fails for reasons unrelated to the code **trains
people to ignore it** — the inverse of the flaky preflight gate this desk already
has.

**The property that matters is deterministic and observable: a competing writer
acquires the lock mid-operation.** Test that, plus maximum rows per transaction.
**That demonstrates the contract instead of proxying it through a clock.**

### And size for the uncertainty of the basis, not for the throughput

The scratch measurement gave ~150k rows/s — **a ceiling, not a prediction**: no
contention, no 579MB WAL, no secondary indexes. **The only figure measured under
real conditions is ~22k rows/s, inferred from the spacing of the four research
crashes.**

5,000 rows per transaction is ~0.23s at that rate. **The margin is the point, not
the throughput:** the basis is uncertain, so the chunk must be small enough that
**being wrong by an order of magnitude still does not matter.** At twenty times
worse it is 4.5s and still inside the budget.

**A constant chosen for margin must record what it is margin AGAINST**, or the
next person reads it as a throughput setting and tunes it up.

## I SPECIFIED THE TIMESTAMP THE FIELD'S OWN COMMENT FORBIDS — A COMMENT I HAD APPROVED

**2026-09-07.** Integration ruled: recover the roll's timestamp and write it,
naming **"the success log"** as the source instant. **The field's docstring
forbids exactly that, and Integration approved that docstring two days earlier:**

> *The instant the roll BEGAN, not the instant it finished. The universe refresh
> happens INSIDE `onSessionRoll`, so a completion timestamp would always be later
> than a successful refresh and would read healthy work as stale.*

The journal shows the roll beginning at **02:00:00** and its success line at
**02:02:34**. **Writing the completion time would install, into the field itself,
the precise defect the field exists to detect.** It would not have bitten today —
the universe stamp is later either way — **and it would bite the first time a
roll's own refresh is the most recent one.**

**Approving a rule does not load it.** Two days, same seat, same field.

### And the source named was empty by construction, not by retention

Integration said *"the roll logs on success"* and named `desk_events`. **The roll
calls `logger.info` and nothing else** — `desk_events` is written by the
assessment path, the event flush and the catalyst collector, **and the roll is not
among them.** The instruction *"if `desk_events` does not carry it, do not compute
one from the calendar"* was met by finding the event **in journald**, which is an
observed record with a real timestamp.

**A condition should name the property, not the container.** The requirement was
*observed rather than computed*; the container was an assumption attached to it,
and it was wrong.

## STAMPING EVERY PROCESS START REDEFINES THE EVENT THE FIELD IS ABOUT

`markSessionEstablished` writes the marker **unconditionally at startup.** The
intent is right — startup establishes a session too, and the roll-only writer
left it unset for sessions it fully established.

**But a restart does not establish a NEW trading date.** 09-08 was established on
09-05. Advancing the marker on every process start silently redefines it from
*"when this trading date was established"* to *"when this process started"* — **so
any restart during a session's life resets the bar and can manufacture STALE
against a universe that was correctly refreshed for that session.**

**The skipped fetch is a true alarm at a ROLL and a false one at a RESTART**, and
the two are indistinguishable once the trading date is dropped from the record.
**Store the date alongside the stamp and write at startup only when it differs
from the stored one** — then the field means what its name says.

**Widening what a signal can see is not free: every widening is also a new way to
fire.** Ask which of the new firings are true.

## A TRIGGER'S LEAD TIME IS AN UPPER BOUND, AND THE PIPELINE SPENDS MOST OF IT

**Research, 2026-09-07**, designing the gain-versus-RVOL test and measuring the
thing neither seat had thought to measure: **how long the desk takes to answer a
trigger.**

| | median | p90 |
| --- | --- | --- |
| queue wait | 8s | 266s |
| interpretation | 32s | 51s |
| **queued → completed** | **53s** | **327s** |

**So a trigger that wins by forty seconds wins nothing.** The comparison is lead
time **minus ~53s**, and at p90 the pipeline alone costs five and a half minutes.

**A selection mechanism cannot be evaluated without the latency of what it
selects INTO.** Both triggers could be correct, both could be earlier than the
move, and **both could still deliver after it** — in which case the trigger
question is the wrong question and the pipeline is the work.

### The independent criterion was not independent, and it was checked first

`DISCOVERY_QUALIFIED` looked like a definition of "a move that mattered" living
outside both triggers. **It is gated on `result.rank` existing** — so it fires on
entry to the **ranked** population, which is RVOL-derived. **Using it would have
handed the test to RVOL by construction:** the same trap Integration named, one
level over, hiding inside the thing chosen to avoid it.

**Check the referee for the same bias you excluded from the contestants.**

### And the threshold was dissolved rather than chosen

Told a qualifying move must be derived rather than picked, Research declined to
pick one at all: **take the largest run per name inside 07:00–10:00 ET and report
lead time ACROSS THE DISTRIBUTION of move size.**

**If the answer is stable across sizes, no threshold was needed. If it varies,
that variation is the finding — and a cutoff would have hidden it.**

**The metric itself is "arrives before the move it is about", made numeric: what
fraction of the eventual move was already realised when the trigger first fired.**
A trigger firing at 5% is early; **one firing at 80% is precise and useless.**

## A REPAIR AND THE FIX THAT FOLLOWS IT MUST BE DESIGNED TOGETHER

**Ops, 2026-09-07.** The approved repair writes one key: `trading_date_rolled_at
= 2026-09-05T02:00:00Z`. Correct against today's code. **And a store carrying
that key with `trading_date_rolled_for` ABSENT stamps on first startup** — right
for a cold start, wrong for a repaired desk.

So: write one key, deploy the fix, restart mid-window, **startup finds no
recorded date, moves the bar to restart time, and the universe stamp falls behind
it.** The false STALE, reproduced by the fix, **on the very session the repair
exists to protect.**

**A manual repair is an input to whatever ships next.** Ask what the code you are
about to deploy will make of the state you are about to write — **the repair is
not finished when it is correct today.**

Both keys, and `rolled_for` is not inferred: the journal line states it outright
(*rolled 2026-09-04 -> 2026-09-08*) and the live store already agrees.

### And the first fix widened the signal into false positives

`UNIVERSE_MAX_AGE_MS` is 20 hours. **Restart at 10:00 after an 02:00 roll: the
universe is 8 hours old, the guard CORRECTLY skips the refetch, and an
unconditional stamp sets the bar above a universe refreshed exactly when it
should have been.**

**UNKNOWN speaks only once a roll is due. STALE speaks always.** So the fix
converted a *conditional* false alarm into an *unconditional* one, triggerable by
any restart inside a 20-hour window, **with the outcome depending on what time of
day someone deployed.** Recording the trading date the stamp belongs to is what
makes the bar move for the right reason.

**"It widens what the signal can see" is a claim that needs its new firings
enumerated.** Some of them were false.

## A GREEN GATE IN A WORKTREE THAT CANNOT REPRODUCE THE FAILURE

Ops's gate runs in a separate worktree **with no `data/` directory**, so a build
break on the primary tree **cannot appear there.** 1814 tests, lint, build and
typecheck all green — **and structurally incapable of seeing the failure another
thread is looking at.**

**A gate is evidence only about the environment it ran in.** The fourth thing a
green gate does not prove, after: that the tests still exist, that the code
reaches a reader, and that the code compiles at all. **Say which tree a gate ran
in when reporting it.**

### A roll that throws leaves a FALSE FRESH

`resolveSession` advances `this.tradingDate` **before** `onSessionRoll` runs. A
roll that throws mid-way leaves the date advanced with **no stamp for it** — and
because both stamp and universe are from the *previous* session, the comparison
returns **FRESH for a session nothing established.**

Pre-existing and not a regression. **`rolled_for !== tradingDate` is exactly the
data that detects it**, available in the store for the first time — but widening
a deployed signature the day before the session it protects is the shape that has
bitten this desk twice. **Queued, not taken.**

## ROUTE BY WHAT IT BLOCKS, NOT BY WHOSE SUBSYSTEM IT IS

**Design, 2026-09-07**, on reporting a build break to Ops and not to Integration:
*"it looked like a data-directory problem and Ops owns data. That was the wrong
routing test. The question is not whose subsystem it is, it is WHAT IT
BLOCKS."* **It was then fixed and told to nobody at all.**

**Ownership routes the FIX. Consequence routes the REPORT.** A defect inside one
thread's subsystem that stops another thread's dated work is the second thread's
news first.

### The diagnosis is the part to copy

Turbopack's file tracer walks `data/backups` on every build — 2.9GB of migration
backups, gitignored but still traced — and files there returned
`ERROR_FILE_CORRUPT` while reading fine byte-wise. A full read of the directory
cleared it: **2.9GB in 2.6 seconds, no writes, nothing moved.**

**What made it conclusive rather than lucky: after reading the first file, the
failure MOVED TO THE NEXT FILE.** Two threads had been treating it as one corrupt
file. **A fix that relocates the symptom in a predictable direction is a
mechanism; a fix that makes it vanish is a guess that worked.**

**And "reading a file is not a repair" was said plainly** — whatever dehydrates
those files can do it again, and the next build fails the same way.

## THE TWO GATES WERE BUILDING DIFFERENT TREES, AND THE SHIPPING ONE HAS NO `data/`

Ops's gate worktree has no `data/` directory, so its green build could not
reproduce a failure that only occurs when one exists. **Design asked whether the
gate worktree SHOULD have one.**

**No — and the deploy script settles it.** `push-release.sh` ships with `git
archive`, which carries **tracked files only**, and the build then runs on the
server (a locally built artefact is refused outright unless the platform
equivalence has been established). **So the shipping tree never has `data/`, and
the gate worktree is MORE representative of production than the primary tree
is.**

**The primary tree's build break was a local-development failure that the
shipping path cannot hit.**

### Which makes an Integration escalation wrong

Integration told Design the break was urgent **because it blocked a queued deploy
on a dated window.** It did not. **The claim was asserted from the shape of the
problem rather than read out of the deploy script** — the same move this seat has
now corrected in others four times: reasoning about a thing without opening what
it depends on.

**A green gate is evidence only about the environment it ran in — and the useful
question is not "do the gates agree" but "which tree is the one that ships".**

## WRITE AS THE SERVICE USER, NEVER AS ROOT — SQLITE RE-CREATES THE WAL

**Ops, 2026-09-07**, performing the approved two-key repair on production.

The first attempt failed: **`attempt to write a readonly database (8)`.** The
store is `mointel:mointel` mode 640 and the shell connects as `ubuntu`, which is
in the group — **read yes, write no.** Every read-only query all weekend worked
and gave no hint the account could not write.

**The reflex is `sudo`. The reflex is a trap.** SQLite creates and re-creates
`-wal` and `-shm` alongside the database, so **a root-owned WAL locks the worker
— running as `mointel` — out of its own store.** A two-key repair becomes an
outage on a live desk.

**`sudo -u mointel`, and verify ownership of all three files afterwards**:
`market.db`, `-wal`, `-shm`. Ops did, and they are unchanged.

**A permission that only manifests on write is invisible to every check that
reads.** The account looked fine for two days because nothing had asked it to do
the thing it could not do.

### And the repair closed the alarm with no deploy and no restart

Served payload at 18:36 ET: `universeFreshness: FRESH`, `universeUpdatedAt
2026-09-06T21:52:59Z`, `universeRollDue false`, with `universeMode` carried as
the **control** — read from the API, not the store.

`universeWarning` returns null on FRESH **unconditionally**, with no
`universeRollDue` gate on that branch, **so Tuesday's premarket flipping
`rollDue` true leaves the marker silent.** The session-length false alarm is
closed on production without shipping anything.

## "RECONSTRUCT, DO NOT INFER" PROTECTS THE COLUMN YOU WERE WARNED ABOUT AND NOTHING ELSE

**Research, 2026-09-07**, validating the trigger lead-time instrument against a
session the desk had actually ranked.

Integration named the hazard precisely: **never take a minute-by-minute answer
from `percent_change`, because it is overwritten in place and its value at read
time is the last one of the session.** The reconstruction obeyed. Gain was
rebuilt from bar closes, RVOL from cumulative volume over the stored
denominator, both against the desk's own definitions.

**It then read `universe.discovery_eligible` and `universe.classification` —
current state, overwritten in place, 13,072 of 13,089 rows stamped the day AFTER
the session — and judged that session by a flag the desk did not have.** One
name ranked first in the rebuild that the desk never ranked at all.

**A WARNING ABOUT ONE COLUMN IMMUNISES ONE COLUMN.** The care spent on
`percent_change` produced no care at all about three others with the same
property, because the warning was attached to a name rather than to a shape. The
shape is *this table keeps only the latest write*, and the store is full of it —
see **"there is no dated record of which symbols were tradable"** above, written
about `status` and `tradable` in the same table, and not connected to this until
after the instrument was built.

**The failure mode is that it does not look like one.** A current-state read
returns a full, plausible, correctly-typed answer for every past date. Nothing
is missing, nothing throws, and the ranking it produces is the right shape. It
is only visible against a ranking the desk actually wrote.

**So the check that catches it is the one that reproduces a KNOWN output rather
than a plausible one** — and it has to run on the dates being analysed, not on
whichever session is convenient, because the size of the disagreement is a
property of the date.

## A WARNING ABOUT ONE COLUMN IMMUNISES ONE COLUMN

**Research, 2026-09-07.** Integration warned, repeatedly, never to derive trigger
entry from `percent_change` — **an overwriting column, the cause of the original
queue defect.** Research obeyed it exactly: gain rebuilt from bar closes, RVOL
rebuilt on the desk's own cumulative-over-20-session-average.

**Then read three CURRENT-STATE flags with the identical property without
noticing.** `universe.classification` and `discovery_eligible` are overwritten in
place, and **13,072 of 13,089 rows are stamped the day AFTER the session being
reconstructed.** So the eligibility being applied is not the eligibility the desk
had.

**The care did not transfer because the warning was attached to a COLUMN NAME
rather than to a SHAPE.** And this one is worse than the column it was modelled
on: `percent_change` is at least reconstructable from bars. **The flag's history
is recorded nowhere.** The README already said as much about `status` and
`tradable` in that same table — nobody connected it until the instrument was
built.

**Name the property when you warn: "overwritten in place, no dated history".
Naming the column inoculates against exactly one column.**

### The validation could fail, and it did — which is what made it a validation

Not *"does the rebuild produce a plausible ranking"* but **"does it reproduce a
ranking the desk actually wrote."** Against 2026-08-17 it matched **eleven of
twelve**, and the twelfth was the finding: a name ranked 1 in the rebuild and
unranked by the desk, **admitted by an eligibility flag written overnight.**

**A validation that cannot fail is a demonstration.** The disagreement is now
measured on the dates being compared rather than assumed small, every miss
printed with the date its classification was written.

**And the dry-run date was the wrong one:** only 17 universe rows were classified
during 08-17 and 13,072 the next day — **the classifier was rolling out across
it.** So the run proves the instrument sound and says nothing yet about a settled
universe.

### A second fidelity number with no fix available

**Rebuilt cumulative volume is 0.963 of the stored figure at the median** — p10
0.833, p90 0.995. A sum of minute bars is not the feed's running total. **The
shortfall is not uniform, so it can reorder names close in RVOL**, which is the
ordering the entire comparison rests on. **Report body, not a footnote.**

### Repair ONE instance and re-test — a batched repair hides the mechanism

**Design, 2026-09-07**, on how the relocating symptom was seen at all: *"I only
saw it because I re-ran the build after fixing ONE file instead of fixing them
all at once. Batching the repair would have produced a clean build and no
mechanism."*

**A batch repair and a correct diagnosis are in tension.** Fixing everything at
once gets you a green build and no information; **fixing one and re-running tells
you whether the fault moves, stays, or multiplies** — which is the difference
between knowing the mechanism and having guessed well.

**Take the cheapest single repair first, and re-run before taking the rest.**

### And the limit of what an output can prove about a behaviour

The exclusion was verified by measuring the tracer's **output**: 13 route traces
and 260 references before, **0 and 0 after — including the middleware trace, the
case the documentation explicitly does not promise.** Measured rather than cited,
because the documented caveat said those options do not affect that route type.

**What is NOT proven: that the tracer stopped READING the files, rather than
merely omitting them from the output.** The inference is from the failing stack —
the read sat inside the trace-building path — **so the honest statement is that
the tracer no longer emits them, and the mechanism says that is because it no
longer hashes them.** Strong, and not a reproduction.

**An absent output is evidence about the output.** Say which one you measured.

## A GATE TESTS A TREE, NOT A SHA

**Ops, 2026-09-07.** The gate ran at `010b7b0`; the deploy shipped `7212bdd`.
Rather than re-running or quietly reusing the result, Ops compared **tree
hashes** — both `4f32abaf39820d8c7058621c91db0e3efb3f5de5`.

**Byte-identical trees, so the gate tested exactly what shipped** — and that is a
**stronger** claim than sha-matching, because a gate exercises a working tree and
a sha is only a name for one. Two shas can share a tree; one sha cannot have two.

**Say it explicitly when reusing a gate result.** The quiet version is
indistinguishable from not having gated.

### The objection was not hypothetical: the first restart WAS the failing case

The rejected version stamped the marker unconditionally at startup. The restart
that shipped its replacement happened **inside the 20-hour window, on a session
already established** — exactly the combination that made the rejected version
fatal.

    BEFORE   rolled_at 2026-09-05T02:00:00Z   rolled_for 2026-09-08
    AFTER    rolled_at 2026-09-05T02:00:00Z   rolled_for 2026-09-08

**The bar did not move.** Startup found the recorded date equal to the trading
date and left it. The universe log reads `13252 cached US equities` — **cached,
not fetched**, the age guard correctly skipping. **Had the first version shipped,
this restart would have set the bar above a universe stamped fifty minutes
earlier and produced a false STALE on a live desk that evening.**

**A design objection that the very next real event would have vindicated is worth
recording as evidence, not just as a fix.** It is the difference between "we
reasoned it might" and "it did".

## A WITHDRAWAL RACES THE THING IT WITHDRAWS

Integration told Ops to stand down a restart request. **The request had already
reached the trader**, and he answered it. The deploy Integration had held until
after the next close therefore happened that evening — **correctly, because his
word outranks the hold, and the outcome verified the fix.**

**But a stood-down request cannot be un-asked.** On an asynchronous bus, an
instruction to withdraw arrives after the thing it withdraws has landed. **Decide
before a request goes out, not after** — and when a withdrawal is sent anyway,
say what should happen if it is already too late, because that is the branch that
will actually run.

### Three crossings in one evening, each a correct message made stale by flight time

A withdrawal of a relay the recipient had already declined to act on; a wait
issued on a write that was already done and verified; a hold that arrived after
the deploy it would have prevented. **None was wrong when written. All three were
wrong on arrival.**

**The mitigation is Ops's and it is now standing for every seat: no instruction
about a pending action goes out without naming the state the sender believes
production is in** — sha and clock. Then a stale ruling is visible as stale in its
own first line, and the recipient does not have to reconstruct which world it was
written in.

**Detection is downstream of the crossing; declaring your assumed state is
upstream of it.** Stating the live sha in every report is what let these be
caught at all — declaring it in every *instruction* is what stops them being sent.

**And when a ruling does arrive late: the action is complete, so re-rule on the
state that exists.** A rollback to reach a state that was only ever verified in
theory, from one verified in production, is a second disturbance bought with
nothing.

## A FIELD CAN LEAVE THE SPREADSHEET WITHOUT LEAVING THE SCREEN

**Design, 2026-09-08**, filling the `screen` column and expecting the premarket
and after-hours columns to be empty. **They are not.** During premarket the
board's live price **is** the PM price, its gap **is** the PM %, its volume **is**
the PM volume; after the bell the AH % renders as the board's move.

**So nothing leaves the screen when those columns go.** What leaves is the
**frozen-at-a-moment** property — which `live?` already records as MOMENT\*.

**Read carelessly, the screen column would have double-counted a loss another
column already carried.** Two annotations describing different properties of the
same field will silently add up unless someone says they do not. **Said in the
annotation, not left to the cells to imply.**

### Seven Sheet columns are three desk fields

`rows.ts` already folds Priority + Revised Priority into one field with
`isRevised`; Catalyst + PM Catalyst into `.original`/`.latest`; Warning Shot + PM
Warning Shot into `.original`/`.current`/`.source`. The surface renders the
latest and keeps the original beside it.

**A retirement plan counting these as separate fields would build six things
where three exist.** The pairing is a **Sheet-shaped distinction, not a
desk-shaped one** — an artefact of a spreadsheet needing a second column for a
revision, where a record needs a flag.

**Count the fields the desk would have to produce, not the columns the source
happens to use.**

### And §10 caught a field its own author shipped, for the second time

`Flush From High %` reaches the trader **only on hover** — it renders inside a
`title` attribute. §10 forbids content reachable only by hover; the Move label
was the first catch, this is the second. **Flagged, not fixed:** the remedy is a
change to what the board presents, and that is the trader's to authorise rather
than a consequence of an audit.

**An audit that finds a defect in the auditor's own work is doing what an audit
is for.**

## THEY LOOK LIKE CONCLUSIONS BECAUSE THEY ARE SPECIFIC

**Design, 2026-09-08**, on the third document of its own this week that would
have read as a brief: the provenance block, the quoted coverage figures, and a
populated `screen` column. **Each time the remedy was the same — say what the
thing IS, at the point where someone would misread it.**

**A populated column, a quoted number and a marked caveat share one failure mode:
specificity reads as conclusion.** A precise figure looks measured. A filled cell
looks like a requirement. A careful caveat looks like a finding. **The more exact
the artefact, the more authority a reader lends it — and the less likely they are
to ask what it was for.**

**So the label goes where the misreading happens**, not in a preamble: at the
figure, in the cell's own annotation, beside the column header that invites the
wrong reading.

### And the warning had to run in both directions

The `screen` column began with one guard — an empty cell is not an argument for
**dropping** a field. **It needed the mirror: a full cell is not an argument for
promoting one.** The column records where a field is presented *today*, hover and
detail included, and **a field visible on hover is rendered, not pending.**

**A one-directional warning on a two-directional artefact is half a warning**, and
the missing half is always the direction the author was not worried about.

### Downgraded from finding to open question, rather than deleted or left standing

`Flush From High %` is hover-only, which §10 forbids. **The trader's ruling that
hover is the right home for commentary does not obviously cover a MEASUREMENT** —
so the flag was not deleted, and it was not left standing as a defect either.

**Two wrong moves were available and both were tidier than the right one.** The
route matters more than the verdict: a fix here changes what the board presents,
which is a proposal through Integration, **never a tidy-up done while already in
the file.**

## NAMING A SHA IS NOT THE SAME AS KNOWING WHAT IS IN IT

**2026-09-08.** Integration ruled deploys by naming the tip — `da28e17`,
`b2fa7d1`, `7212bdd` — precisely, one sha and one moment, as the discipline
requires. **Nobody enumerated what the tip contained.**

Design reported its work as *"gated and queued behind Ops's post-close deploy"*.
**It is live.** `git merge-base --is-ancestor` says `0090815` (the staleness
marker), `bf5c2d5` (colour on the activity bars) and `49cf5c7` are all inside
`7212bdd`, which has been on production since 18:42 ET.

**So a user-visible colour change shipped to the trader's board inside an
infrastructure deploy, and the thread that wrote it believed it was still
queued.** It was gated, reviewed and correct. **It was also never announced as
shipping, and nobody verified it live.**

**A tip deploy carries every thread's work, not the work being discussed.** The
precision of naming a sha creates the illusion that its contents were chosen —
and on a shared main, a sha is a timestamp, not a selection.

**Before instructing a deploy: list the commits it carries, by thread.** One
command. **And the thread whose work rides along must be told it is shipping**,
because otherwise it holds a stale belief about production and cannot verify what
it built.

**The "one sha and one moment" rule was written to stop `HEAD` naming whoever
committed last. It does not stop the named sha from containing whoever committed
last.**

## A PRESENT FLAG JUDGING A PAST SESSION HAS A DIRECTION

**Ops, 2026-09-08**, validating the trigger instrument on production.

**2026-09-02 agrees 12 of 12** — fidelity 1.000 at p10, median and p90, n=2846.
The rebuild reproduces a ranking the desk wrote, exactly. **2026-09-03 disagrees
8 of 12**, and all four misses are names the rebuild **admitted** and the desk
never ranked: `DSS`, `ADBT`, `SJ`, `MIMI` — every one `classified 2026-09-06`,
three days after the session.

Mechanism confirmed: `SELECT symbol FROM universe WHERE discovery_eligible = 1`.
**Current state.** And the obvious alternative was checked and rejected — all four
close sub-$1, but the price filter runs on `lastClose` **at ranking time**, and
they were in band when ranked.

### The structural point outlives these four names

**Current eligibility is a SUPERSET of what the desk had.** So a reconstruction
can only ever **admit** names the desk could not see — **never withhold ones it
did.**

**Every rebuild against `universe` is therefore biased in one direction: toward
concluding the desk missed things.** That is not a defect in any script. It is a
property of judging a past session with a present flag, and **it applies to
anything else reconstructed from that table.**

**When a reconstruction disagrees with the record, ask which way the instrument
can be wrong before asking which is right.** A one-directional error is not noise
and does not average out.

### And understanding a defect does not repair the data

The instrument's own note said *"do not run the comparison until each miss is
understood."* The mechanism for 09-03 **was** understood — **and its top 12 is
still built from names the desk never had.** Ops ran the comparison on 09-02
alone.

**Knowing why a number is wrong is not a licence to use it.** The temptation is
strongest precisely when the explanation is satisfying.

## A PROPOSAL ABOUT WHERE A NUMBER LIVES MUST NOT CARRY A CHANGE TO WHICH NUMBER IT IS

**Design, 2026-09-08**, scoping the hover question and deliberately leaving
something out.

Checking the tree turned one audit cell into three facts:

1. `retracementPct` is hover-only — a `title` attribute, and only when > 0.
2. **`givebackPct` renders nowhere at all** — computed at `cycle.ts:276`, read by
   no component. **And it, not `retracementPct`, is what the Sheet's column
   means:** distance below the high versus fraction of the move surrendered.
3. **The Sheet's own column does not parse.** `flushFromHighPct.value` is null on
   6 of 7 rows, because the cell reads `"11.3% at $9.69"` — **the level travels
   with the percentage** and the numeric parser refuses the pair. Only `"0.0%"`
   survives.

**So the desk shows a DIFFERENT number from the Sheet's, in a hover, and the
Sheet's own is unusable as a number.** The audit cell said "hover only" and was
**true of the wrong quantity.**

### The discipline is the entry

Fixing (2) and (3) was **kept off the proposal deliberately**: *"a proposal about
where a number lives must not arrive carrying a change to which number it is —
that is two decisions in one sentence and he would approve the second without
seeing it."*

**A bundled proposal launders the second decision through the first.** The
approver reads the question they were asked and grants the one they were not.
**Split them even when the second is obviously right**, because obviously-right is
exactly the condition under which nobody checks.

### And the measurement settled the question it was asked to settle

Six of seven live rows carry a materially non-zero flush — **10.6% to 75.9%.**
Not a two-rows-a-day quantity. **Hover is hiding something true of nearly every
row**, so §10 is not over-firing. Sample limit stated in the document rather than
buried: 7 rows, one snapshot, market closed.

**Three of the four options spend no header space**, and the recommended one may
be to leave it: the phase chip already reads OFF HIGH or BACKSIDE, **and if the
chip is doing the work the number is detail.** Whether it is doing the work is a
fact about how the trader reads his own board — **not measurable from here, and
not to be guessed.**

## AN ABSENT RENDERER AND AN ABSENT VALUE LOOK IDENTICAL

**Design, 2026-09-08**, asked to verify the colour on the activity bars with the
market shut — on an Integration premise that a closed market makes the *no-price*
path the easy one to exercise.

**It does the opposite.** With the market closed there are **zero discovery
rows**, so the board renders no table at all — only the empty state. **There is no
`Now` column on screen to inspect.** The sparkline lives on the Discovery board
and nothing else mounts it.

Searching every cell of every row for the bars returned nothing, **which looked
like a defect and was not: the component is not mounted.** Same trap as reading an
SSR page and calling the board empty — **an absent renderer and an absent value
are indistinguishable from the outside**, and here the absence was structural.

**So "I looked and it was not there" is never a finding on its own.** Establish
that the thing which would render it is running, the way `universeMode` is
carried as a control on the payload. **The control for a renderer is a sibling
element you know should be present.**

**The colour stays unverified until premarket**, when Discovery populates — and
the no-price case is exercisable then, on any row whose price window has not
filled yet. **Refusing to claim a verification that could not be performed is the
report.**

### And the empty state verified itself, unasked

The placeholder names **2026-09-08** — the correct trading date across a holiday
Monday — and it is the CLOSED/NEXT_DAY_PREP branch rather than the not-loaded
one. **That path had never been seen live either.** A verification attempt that
fails at its object can still confirm the thing standing where the object should
have been.

## CORRECTION — THE INSTANCE UNDER TWO RULES ABOVE WAS WRONG, AND THE RULES SURVIVE IT

**Research, 2026-09-07.** Correcting the worked example inside **"'RECONSTRUCT,
DO NOT INFER' PROTECTS THE COLUMN YOU WERE WARNED ABOUT"** and **"A WARNING
ABOUT ONE COLUMN IMMUNISES ONE COLUMN"** — both mine, and both citing the same
name.

**The name was UCL on 2026-08-17: ranked 1 by the rebuild, unranked in
`ticker_session`, which I attributed to an eligibility flag written overnight.**

**IT WAS NOT THAT. UCL HOLDS A `DISCOVERY_QUALIFIED` AND AN `RVOL_RANK_ENTRY`
AT 07:35 ET, RANK 4, RVOL 56.** The desk ranked it. Eligibility excluded
nothing. **`ticker_session` had simply lost it — 53 names on that session carry
a durable qualification event beside a session row reading `latched 0`,
`qualified_at NULL`, `rvol_rank NULL`.** I validated against the artefact that
forgets.

### The rules are unharmed and one of them is now confirmed elsewhere

**The current-state hazard is real and Ops proved it independently on
production** — see **"A PRESENT FLAG JUDGING A PAST SESSION HAS A DIRECTION"**:
09-03's four misses are all names classified 2026-09-06, three days after the
session, and Ops's superset argument is right. **That section needs no
correction. Only my instance does.**

### What I actually did wrong, which is the transferable part

**I reached for a mechanism that was true nearby and never checked it against
the case.** Everything about it held — the column really is current state, the
stamps really are later, the direction really is toward over-admitting — and
none of it was why THAT name disagreed.

**A TRUE NEARBY MECHANISM IS THE MOST CONVINCING WRONG ANSWER AVAILABLE**,
because every part of it verifies except its connection to the instance. It is
**"a mechanism that explains the class is not evidence about the instance"**,
filed by me a day earlier, unapplied to my own finding.

### The rule that would have caught it

**VALIDATE AGAINST THE ARTEFACT THAT REMEMBERS, NOT THE ONE THAT IS CURRENT.**
`ticker_session` is one row per name per day, overwritten until the session
ends. `desk_events` is append-only and timestamped. **The store usually holds
both, so which one is "ground truth" is a DECISION — and it is almost never made
deliberately.** Checking a reconstruction against the forgetting artefact
produces disagreements that are real, explicable, and about the wrong thing.

### The unit tests are why you believe it, not evidence that it renders

**Design, 2026-09-08**, committing to a premarket verification and naming in
advance the state it may not be able to observe: *"if I cannot find an unfilled
row I will say so and leave NEUTRAL unverified. I will not reason that it must be
right from the unit tests — the unit tests are why I believe it, not evidence
that it renders."*

**A passing test is a reason for confidence and never a substitute for an
observation.** The gap between them is the whole of what this desk got wrong
this week: a field on the wrong object, a wrapper never wired to its call site, a
suite that had stopped existing. **Every one passed its tests.**

**Declaring in advance which states you may fail to observe is what stops the
report quietly filling them in.**

### A trader's report is a symptom, not a diagnosis

*"He sees it before I do, and if he says it looks wrong that is a report about
the surface, not a diagnosis — I will still read the payload before agreeing with
him about a cause."*

**Agreeing with a user's explanation is the fastest way to fix the wrong thing.**
The observation is authoritative — he is looking at the board and we are not. **The
attributed cause is a hypothesis from someone with less of the machinery in view
than we have**, and treating it as a finding wastes the one report we got.

**Take the symptom exactly as given. Derive the cause independently. Then say
which of the two you are answering.**

## NAME THE NEXT SESSION DATE, NEVER A RELATIVE INTERVAL

**2026-09-06, ET.** Integration wrote *"premarket opens in roughly twelve hours"*
and *"premarket ~10h out"*, and told the trader **"good luck this morning."**
Verified: ET is **Sunday 22:55**. Monday 09-07 is **Labor Day**. The next
premarket is **Tuesday 09-08 04:00 ET — about 53 hours away.**

**The error was made in the same message that systematised state-declaration**,
and neither seat caught it from the sentence itself. **A calendar premise does not
stay fixed by having been corrected once** — this is the fourth recurrence across
three seats in three days, after the holiday was independently discovered twice.

**A relative interval hides its own arithmetic.** "Twelve hours out" cannot be
checked without redoing the calculation that produced it; **"Tuesday 2026-09-08
premarket" is wrong on its face when it is wrong.**

**So the state-declaration rule gains a second field: sha and clock, AND the next
session date named absolutely.** The sha rule was written because a stale sha is
invisible in prose. **A stale date is invisible in exactly the same way, and has
cost more.**

## THE TREE COMPARISON IS NOT A FORMALITY THAT ALWAYS PASSES

**Ops, 2026-09-06.** Cherry-picking a gated commit onto main and comparing trees,
**expecting a match as with `7212bdd` — and they did not match.** Main had moved
between the gate base and the cherry-pick, **so the gate result did not
transfer.** Re-gated at the shipping sha itself.

**Last time the tree check let a re-run be skipped honestly. This time it caught
a stale gate that sha-matching would have hidden** — the report would have read
*"gated at `af4e031`, cherry-picked cleanly"* and been wrong about what shipped.

**A verification step that has only ever passed is indistinguishable from one
that cannot fail.** This one has now done both jobs, which is what makes it
evidence rather than ceremony.

### And the fix the objection made possible

The false-FRESH path was undetectable until the companion key entered the store —
**so the fix that was queued became expressible because of the fix that was
objected to.** `STALE` is a warning, `UNKNOWN` is an admission, **`FRESH` is a
claim**: the only one of the three that can be confidently wrong, on a field that
exists because a board missing names looks exactly like a quiet morning.

**Two optional inputs, nine original tests untouched, and a store predating the
key falls through to the old comparison** — absent means *this store is older*,
not *this session is wrong*. The rule `universeWarning` already applies to a build
that never had the field, **reused rather than reinvented.**

## CORRECTION TO "A WARNING ABOUT ONE COLUMN IMMUNISES ONE COLUMN" — THE INSTANCE WAS WRONG

**Research, 2026-09-06, correcting the case that entry was built on.** Appended
rather than rewritten, because two seats had already built on it.

**The rule stands.** Ops confirmed the mechanism independently on production:
09-03's four misses are all classified three days after the session, and current
eligibility is a superset. **The UCL instance was not that.**

**`UCL` holds a `DISCOVERY_QUALIFIED` and an `RVOL_RANK_ENTRY` at 07:35 ET, rank
4, RVOL 56. The desk ranked it.** Eligibility excluded nothing. What failed is
that **`ticker_session` lost it** — and it is not one name: **53 names that
session carry a durable qualification event beside a row reading `latched 0`,
`qualified_at NULL`, `rvol_rank NULL`.** The validation was run against the
artefact that forgets.

**A TRUE NEARBY MECHANISM IS THE MOST CONVINCING WRONG ANSWER AVAILABLE.** Every
part of the diagnosis verified — the column *is* current state, the stamps *are*
later, the direction *is* toward over-admitting — **and none of it was why that
name disagreed.** It is *"a mechanism that explains the class is not evidence
about the instance"*, filed here a day earlier and not applied by its own author.

**Check the mechanism against the instance, not only against the class.** The
better the mechanism, the less anyone asks.

## END-OF-DAY AGREEMENT IS NOT TIMING AGREEMENT

The instrument was validated by reproducing a **final** top twelve: 12 of 12 on
09-02. **The entire experiment is about WHEN a trigger fires.** A rebuild can
land on the right closing set having ordered it wrongly all morning.

**A validation must exercise the property the result depends on.** Matching an
end state is a strong check on arithmetic and **says nothing about the sequence
that produced it** — and it is the sequence being measured.

### Which forced a redesign, and an asymmetry stated as a reading rule

**RVOL cannot be reconstructed and does not need to be.** The engine promotes
symbols as it first sees them, so its ranked field is small and growing — its own
pre-07:00 payloads carry **top-twelve ranks at RVOL 0.007**, possible only in a
field of about twelve, **and the promotion history is recorded nowhere.** The
rebuild reproduced **one of six** in-window entries: not wrong about volume,
**ranking a different field.**

So RVOL is now **read** from `desk_events.RVOL_RANK_ENTRY` — the firing, already
timestamped — and only gain is reconstructed, because the desk never ran it.

**That makes the two sides asymmetric, and the asymmetry has a direction.** The
reconstructed gain field is at least as large as the desk's was — measured 991 to
2,591 names — **and a larger field is harder to enter. So the bias runs AGAINST
gain, which is the trader's own pre-registered pick.**

**A gain win is stronger than it looks; a gain loss is confounded.** That is a
rule for reading the result, not a caveat attached beneath it.

### And two disciplines set before the sample

**A power floor, fixed in advance:** below **20 paired uncensored names**, no
direction is reported at all — only rates, stratum counts, and that it was
unpowered. On 08-17, **52 of 65 RVOL entries fired before 07:00**, six inside the
window, seven after; if production looks like that, the paired set is single
digits.

**A disclosed peek:** that 52/65 split bears on Research's own registered
prediction that RVOL fires earlier in clock time. **It was seen before the sample
ran and is on the record**, so it cannot later be presented as a prediction
confirmed.

## THE FIGURES ARE CLEAN BECAUSE NEITHER REBUILT A POPULATION

**Research, 2026-09-06**, answering whether the superset bias reaches the two
numbers the trader is deciding against.

**Both clean, and the reason is structural rather than lucky.** The 24–40
entries-per-session came from `desk_events.RVOL_RANK_ENTRY` on a frozen snapshot;
the 20-of-53 has `RVOL_RANK_ENTRY` names as its population, those same names as
its denominator, and absence of a `research_jobs` row as its test. **Both sides
are records of what the desk DID.**

**The superset bias is a property of REBUILDING a population. Neither figure
rebuilt one — there was no field to over-admit into.**

**And the alternative failure was checked too:** a retention divergence would
overstate the miss just as effectively. `DELETE FROM desk_events` and `DELETE
FROM research_jobs` live in the **same function**, so they clear together or not
at all — **an absent job row means no job, never a pruned one.**

**One live-path fact recorded while there:** the queue does read
`universe.classification`, and **it fails open** — `UNKNOWN` is an eligible class
and a null coalesces to it, so an unclassified name keeps its slot. **Classification
lag cannot cost a name a job.**

## A POWER FLOOR ONLY WORKS IF IT IS OBEYED WHEN IT BINDS

Registered before any paired number was seen: **below 20 paired uncensored names,
no direction at all.** **n is 15.**

So *"within-name median difference 0 seconds, RVOL earlier on 3 of 15"* **is not
a tie. It is a sample too small to contain an answer** — and Integration had
already reported it to the trader as a dead heat. **A null result and an absent
result read identically in a sentence and mean opposite things.**

### And the headline metric has a construct problem its author raised unprompted

"Fraction of the move already realised" takes the move as **the largest run in the
whole window.** So a name whose largest run spans the morning shows a high
realised fraction for **any** trigger firing after 08:00 — good or bad. **Part of
0.47/0.55 is the window definition, not the trigger.**

**p75 = 1.00 survives any definition** — that is firing at the peak. **The median
does not, and it was the number carried to the trader.**

## THE AVOID IS THE PRODUCT

**The finding that outlives the experiment.** If roughly half the move is gone
when a trigger fires, **the dossier is not an entry input and no pipeline work
makes it one.** Fifty-three seconds is small against a move already half over —
**so latency was the wrong worry, and outcome C was the wrong question.**

**A trigger that fires at the peak is useless for entry and maximally useful for
refusing one.** *"Cash merger at a fixed price, discovery over"*, *"offering
priced, supply arriving"* — **those are worth most precisely when the move looks
best**, and a refusal does not need to be early to be right. He holds for seconds
and sizes in R: **one refused chase pays for a great many dossiers.**

**Second: the second leg, not the first.** He trades a name more than once in a
morning. The dossier is late for the first entry and early for every one after.

**Third, and the real implication: what CAN be early is evidence that existed
before the move.** Filings, the effect taxonomy, float, the supply pair — **all
knowable at 04:00 and racing nothing.** The result argues for **pre-computing a
candidate set overnight rather than triggering on one intraday.**

**Pre-registered, no direction claimed:** of the names that fired either trigger,
what fraction had an observable filing or catalyst timestamped **before 07:00 ET**.
High means an overnight pass reaches them without racing anything; low means the
catalyst genuinely arrives with the move. **Research can argue both, so it
predicted neither.**

## THE FIELD IS DESTROYED IN THE ONLY POPULATION IT WAS BUILT TO SERVE

**Research, 2026-09-06.** In the `ticker_session` upsert, `top12_entered_at` is
`COALESCE`d **with a comment saying exactly why.** The five latch fields beside
it — `qualified_at`, `qualified_price`, `qualified_rvol`, `qualified_rank`,
`latched` — take `excluded.*` directly. **A restarted engine's empty runtime
overwrites what the store had.**

**And the population it destroys is not random. All 53 wiped rows on 08-17 have a
final price OUTSIDE $1–$20. Not one in-band name is wiped. Zero.**

Because an in-band name **re-latches on the next flush and loses nothing.** An
out-of-band name cannot. **And the latch exists for exactly one purpose: to keep
a name ranked after it leaves the band.**

**So the field survives everywhere it is not needed and is destroyed in the only
case it was written for** — and looks perfectly healthy in the other 98%. **That
98% is not evidence the latch works. It is 98% of cases where nothing was being
asked of it.**

**A guard that only fires where it makes no difference will pass every test
anyone thinks to write.** When a mechanism looks healthy, check it on the
population it exists for, not on the population it happens to cover.

### The consequence reaches the queue, exactly and small

A wiped row reads `rvol_rank NULL`; the candidate query requires `rank IS NOT
NULL AND rank <= autoRank`. **So the name is not declined and not deferred — it
is not a candidate at all**, permanently for that session.

**4 of the 44 no-job names on 08-17 — about 9%.** The bulk remains the sampling
artefact. **But it means "nothing is broken, the 20 are expected" no longer stands
unqualified:** something is broken, for a small share, and it is a defect rather
than a property. **A cause, not an artefact — it does not inflate the figure.**

**Bounded, not sized:** measured on the local desk with 48 job rows against
production's volume.

## THE INTERVAL BETWEEN WRITING A RULE AND NEEDING IT IS SHORTER THAN THE INTERVAL BETWEEN WRITING ONE AND REMEMBERING IT

**Three seats caught by their own rules inside forty-eight hours**, Integration
twice: a check specified with the defect it had recorded that morning; a warning
attached to a column name rather than a shape; *"a mechanism that explains the
class is not evidence about the instance"* filed one day and violated the next by
its own author.

**The rules are not failing. Their location is.** A shared file is read once and
recalled never; the moment of need arrives inside a diff, a query, a comment.

**So the file is the archive and the point of use is the instrument.** The
practices that have actually held this week all live where the work happens —
Design's interpolation argument in the render layer, the `top12_entered_at`
`COALESCE` comment, the provenance clause beside the figure it qualifies. **Every
rule that fired late was in a document; every one that fired on time was in a
file someone had to open to do the work.**

## THE CENSORING IS THE FINDING: MOST OF IT HAPPENS BEFORE HE SITS DOWN

**Ops, 2026-09-06, re-running the corrected trigger instrument on production.**

                            09-02   09-03
    RVOL only                 38      29
    GAIN only                 24      18
    BOTH, measurable run      16      16
      already firing at 07:00  9      12
      BOTH FIRED IN-WINDOW     7       4   <- uncensored paired set

**Research pre-registered n=20 before any direction is reported. We have 7 and 4,
pooled 11. So: no winner, no within-name comparison, nothing about RVOL versus
GAIN** — and Ops did not transmit the direction figures **even to Research**,
because a pre-registration exists so the direction is not seen and then reasoned
about, **and that binds its author too.**

**The censoring is the actual result.** 9 of 16 and 12 of 16 paired names were
**already firing when the window opened** — selected on evidence from before the
trader sat down. **The uncensored set is small because the phenomenon largely
precedes 07:00, not because two sessions is too few.**

**Seven sessions will not repair it.** That is a fact about the experiment's
feasibility, not about either trigger — and it converges with the local 52-of-65
split seen earlier. **It is also the strongest support yet for pre-computing a
candidate set overnight rather than triggering intraday.**

### An audit rule expressed as a syntactic prohibition rejects the safer file

Integration's condition was proven for one version as *"zero mutating SQL."* The
**newer, safer** instrument **deliberately contains an `UPDATE`** — a zero-row
write, because `BEGIN IMMEDIATE` is granted on a read-only handle and defers
refusal to the first real write. **A keyword scan would have rejected it.**

**A check that fails for the wrong reason is worth no more than one that cannot
fail.** Audit the property — *can this write?* — and prove it by execution:
`SQLITE_READONLY` raised, `query_only=1`, and run as a user the filesystem denies
independently.

### And a conclusion that inverts exactly when the news is worst

The outcome-C test reads `winnerMedian < pipelineMedian` → *"C fires, the pipeline
is the work."* **Both dates produced NEGATIVE leads** — the trigger firing after
the move began. **When the winner is late the pipeline is not the work: a
zero-latency pipeline still arrives after the move.**

So the text **asserts the opposite of what the numbers mean, and does so more
confidently the worse the trigger is.** Needs a guard at lead ≤ 0.

**A comparison written for one regime silently reverses in another.** Check what
your conclusion says at the boundary and beyond it, not only where you expected
to land.

## A PROOF OF SAFETY CAN BE INDISTINGUISHABLE FROM THE HAZARD IT DISPROVES

**Ops, 2026-09-07**, auditing a read-only instrument before running it on
production — and Research, who wrote the thing that would have failed the audit.

Ops's criterion for the earlier version was **"zero mutating SQL"**, which is
the obvious audit for a script that must not write. **The newer version
DELIBERATELY ADDS AN `UPDATE`.** It is a write statement matching no rows,
executed at startup, whose refusal with `SQLITE_READONLY` is the only conclusive
evidence the handle cannot write.

**A KEYWORD SCAN WOULD HAVE FAILED THE SAFER FILE AND PASSED THE ONE THAT ONLY
CLAIMED TO BE SAFE.**

### Why the safer file needs the dangerous-looking line

The version with no `UPDATE` in it asserted read-only-ness: it opened a handle
with `readonly: true` and every statement in it happened to be a `SELECT`. **That
is a claim about every line of a file, re-earned on every edit.** The version
with the `UPDATE` proves it about the HANDLE, once, at startup, before anything
else runs.

**And the first probe written for that job was itself wrong.** `BEGIN IMMEDIATE`
demands the write lock and changes nothing, which looked ideal — **SQLite GRANTS
it on a read-only handle and defers the refusal to the first real write**, so it
aborted a run that was perfectly safe. *A check that fails for the wrong reason
is worth no more than one that cannot fail.*

### The transferable part

**An audit that scans for the SHAPE of a hazard will reject the instrument built
to disprove it.** Proofs of a negative usually have to perform the forbidden
thing under conditions that make it harmless — a zero-row write, a dry run, a
canary — and those are exactly what a shape-matching audit is tuned to catch.

**So a safety audit has to read intent, not tokens** — or the file that says
"trust me" passes and the file that proves itself fails.

**Both layers held here anyway, which is the point of having more than one:**
Ops ran it as a user with group-read and no write on the store, **so the
filesystem refused writes independently of both the handle and the pragma.**

## "ROUGHLY EQUAL" AND "NO EVIDENCE OF A DIFFERENCE" ARE BOTH DIRECTIONS WEARING A HEDGE

**Research, 2026-09-06**, deciding what may be said when a power floor fires.

**Not "the triggers are roughly equal." Not "no evidence of a difference."** An
unpowered comparison supports **neither**, and both sentences deposit a direction
in the reader that the data cannot carry. **The honest output is that the
question was not answered, and why.**

**A hedge is not a weaker claim. It is the same claim with deniability attached.**

### Withholding the direction from its own author

Ops did not transmit the direction figures **to Research**, on the grounds that a
pre-registration exists so a direction is not seen and then reasoned about — **and
that binds the person who wrote the registration.** It offered them if asked
deliberately. **Research deliberately did not ask:** *"'nothing else' includes a
number I look at privately and then carry into how I frame the next thing."*

### And the disclosure that makes the amendment auditable

Reporting the inverted outcome-C conclusion **required knowing the leads were
negative** — so **the sign was seen before the amendment was written.** Research
recorded that ordering explicitly rather than leaving it inferrable from commit
timestamps, noting the threshold was untouched and the between-trigger direction
still unseen.

**Say what you knew and when, in the artefact, when a correction to a
pre-registered instrument requires looking at the data first.** Otherwise a
legitimate amendment is indistinguishable from a tuned one.

### The coverage number is the one thing under no floor

**RVOL-only: 38 and 29. Gain-only: 24 and 18.** A rate, not a comparison,
unaffected by the censoring that killed the paired set — **and it reverses the
earlier reading**, which had gain-only at 25 against RVOL-only at 5 **because
RVOL was being reconstructed rather than read.**

**Each trigger finds a substantial population the other misses.** That bears on a
build decision in a way the head-to-head never could have.

## AN ABSENCE BORROWING A VALUE — AND BORROWING PRECISELY THE ONE THAT ANSWERS THE QUESTION

**Research, 2026-09-06**, before running the before-07:00 catalyst test.

    UNKNOWN    1,150 rows   carrying a time: 0
    INFERRED     251 rows   carrying a time: 0
    DATE_ONLY     26 rows   all 12:00Z, SYNTHESISED
    EXACT          9 rows

**Nine rows in the entire store carry a time the source actually stated.** 1,401
of 1,437 `published_at` values are **bare dates**.

**And the synthesised stamp is 12:00Z = 08:00 ET — inside the trader's window by
placeholder rather than by fact.** Splitting same-day evidence at 07:00 would be
an absence borrowing a value, **and borrowing exactly the one that decides the
question being asked.**

**So same-day evidence is reported INDETERMINATE and never split.** What date
resolution *can* settle is the half that matters: **evidence published on an
earlier day was available overnight, no time of day required.**

### The obvious metric was vacuous, and only running it showed that

*"Had a prior document"* — **every operating company has old filings. All 25 names
in the dry run passed.** A test everything passes measures nothing: **a check that
cannot fail, wearing a different hat.**

So no threshold was chosen. **The measure is the AGE of the freshest pre-session
evidence, across its distribution** — mass at one or two days means an overnight
pass has material; mass at hundreds means it does not. **Same dissolution as the
lead-time design, reused because the objection was identical.**

**And the funnel is part of the answer:** collection is job-gated, so a fired name
with no job has no sources and **would score "no evidence" when nothing ever
looked.** Every stage prints its denominator.

## A CONVERGENCE OF TWO LINES SURVIVES ONLY WHILE BOTH LINES DO

Integration called the censoring result *"the strongest support yet for
pre-computing overnight"*, on the grounds that two independent lines converged.
**Research has now separated them: the censoring supports the TIMING half and
says nothing about the MATERIAL half.** Selection being over before 07:00 is
established. **Whether there is anything to pre-compute FROM is a different
question** — and its own dry run leans against.

**Local, n=25, explicitly not a finding: freshest evidence min 3 days, median 5,
and ZERO names whose freshest evidence is from the previous day.** Put on the
record before the production run **so a matching result cannot be presented as a
surprise and a contradicting one cannot be quietly dropped.**

**When a recommendation rests on convergence, name both lines — because the
recommendation dies if either does**, and the one that dies is not always the one
being watched.

## THE VERIFICATION STEP WAS THE TRAP, AND ITS OUTPUT REFUTED ITSELF

**2026-09-06.** Integration wrote *"I verified it myself rather than taking it:
`TZ=America/New_York date` returns Sunday 22:55."* **That command returns UTC on
this Windows host.** There is no tzdata, so `TZ` is silently ignored:

    TZ=America/New_York  ->  2026-09-06 23:23
    TZ=Asia/Tokyo        ->  2026-09-06 23:23
    date -u              ->  2026-09-06 23:23

**Three zones, one answer.** And the original verification printed **ET and UTC as
the same instant** — impossible in September, when ET is UTC−4. **The output
contained its own refutation and was read past**, because it agreed with the
conclusion being checked.

**The day survived; every interval did not.** Real ET was 19:23, not 23:23, so
"about 53 hours to Tuesday premarket" was wrong by four hours in the direction
that felt safe.

### And it is a live operational trap, not a pedantic one

**The capture guard refuses 04:00–20:00 ET on trading days.** Real ET 19:40 is
**inside** that window; the local clock reports 23:40, which reads as **outside**.
**On a trading day, someone checking the clock locally would believe they were
clear and reach for `--force`** — while believing they did not need it.

**Read the clock from the box.** The desk's own host is the only authority on the
desk's own time, and every guard, window and checkpoint on this desk is expressed
in ET.

**Sixth recurrence of the date/clock family in four days, and the first one to
occur inside the act of verifying.** A verification that cannot fail on this host
is worth exactly nothing, **and it is the most convincing thing anyone can quote.**

## A MECHANISM EARNS BELIEF WHERE IT PREDICTS NOTHING HAPPENS

**Ops, 2026-09-07**, confirming the latch-wipe defect on production.

| date | mid-session restart | rows wiped |
| --- | --- | ---: |
| 09-02 | none | **0** |
| 09-03 | 02:34 and 19:04 ET | **57** |
| 09-04 | 03:48 ET | **0** |

**09-04 RESTARTED AND LOST NOTHING.** A restart at 03:48 lands before any latch
exists, so there is nothing standing to destroy.

**A correlation between restarts and wipes would read 09-04 as a
contradiction.** The mechanism reads it as a prediction: damage scales with how
many latches are standing when the restart arrives, so a restart before the
first qualification must cost exactly zero.

**THE ROW THAT CONFIRMS A MECHANISM IS OFTEN THE ONE WHERE NOTHING HAPPENED.**
A presence can be produced by many causes; **an absence that the mechanism
REQUIRES, in the one place it requires it, is far harder to arrange by
accident.** Two zeroes and a 57 settle it where 57 alone would only suggest it.

**So when a mechanism is proposed, ask it where it predicts NOTHING — and go and
look there.** It is the cheapest strong test available and it is almost never
the one reached for, because the eye goes to the damage.

*Related, and it is the same instrument pointed at the instance rather than the
class: **a mechanism that explains the class is not evidence about the
instance**. This is its constructive half — the class-level mechanism becomes
evidence about the instance exactly when it commits to what the instance must
NOT show.*

## MOVING AN INSTRUMENT TO FIRMER GROUND BROKE THE ONE NUMBER STANDING ON IT

**Research, 2026-09-06**, withdrawing the coverage figures before Integration
could carry the reversal to the trader.

**The recorded RVOL map spans the whole session. The reconstructed gain fires
exist only inside 07:00–10:00**, because that is the only stretch whose field can
be rebuilt at all. **So every RVOL entry before 07:00 or after 10:00 counted as
an "RVOL only" name — a name gain was never given the chance to fire on.** On
09-02 that is **44 of 54 entries.**

**The RVOL-only count went from 5 to 38 for that reason and no other.** The
reversal is not a finding; **it is two populations measured over different spans.**

**A comparison between populations defined over different spans is not a
comparison** — and this one arrived *through a correction*: reading RVOL from
`desk_events` instead of reconstructing it was the right move for timing, **and it
enlarged one population without enlarging the other.**

**Check what a fix does to the denominators of everything already measured with
the old instrument.** A change that improves an instrument can invalidate the
figures it has already produced, in either direction, silently.

**Both coverage figures are now unsupported** — the old one for the timing reason
already accepted, the new one for this. **The axis is unresolved, not reversed**,
and the corrected version needs a re-run nobody has done. **Two findings that hold
beat three with one moving.**

### And a count that has moved three times has stopped being information

The trader has now had gain-only 25 / RVOL-only 5, then RVOL-only 38 / gain-only
24, then neither. **Integration wrote the rule that a count moving every time
someone looks stops being information — and then reported the same number three
times in a day.**

**Hold a figure until the instrument that produced it has stopped changing.**

## REPORTING IS NOT ASKING

Integration ruled that a product question must route through Integration, because
**the same decision arriving twice in two framings gets one answer and nobody
knows which question it answered.** Research accepted that and drew the boundary
Integration had left too wide:

**Decisions that compete for an answer route through Integration. Reporting does
not — and correcting your own error to the person you made it to is not a product
decision.**

**Right, and the distinction is the useful one.** A thread that must clear every
utterance through a bus stops reporting, and **the failure this desk has already
had twice is silence, not duplication.**

## A PATCH THAT WORKS FIRST TIME IS A PATCH WHOSE PREMISE WAS NEVER TESTED

**Research, 2026-09-07**, acting on Integration's rule to check what an
instrument change does to the denominators of everything already measured.

The audit turned up what looked like a clean hit. `desk_events` held 12
`RVOL_RANK_ENTRY` and 2,812 `DISCOVERY_QUALIFIED` rows **whose `ts` was
2026-08-17 and whose `trading_date` said `2026-08-14`.** Eight of the entry
names appeared nowhere in the 08-17 population. The reading wrote itself: the
engine had not rolled, the events were misfiled, **every per-session count keyed
on `trading_date` was understating its population by 11%** — and understating it
in the direction that makes both the churn and the research miss look smaller
than they are.

**It was wrong. THERE IS A FULL 2026-08-14 SESSION IN THE STORE** — 8,559
`ticker_session` rows — and HHS holds rank 1 there at RVOL 370.7, **the exact
value in the event payload.** The store had been backfilled at 23:52 ET on the
Sunday, so Friday's session was written late. **The `trading_date` was right and
the `ts` was right; only my inference was wrong.**

### What actually stopped it, and it was not discipline

**I wrote the correction before testing the premise.** The recovery code went
into both instruments, with a docstring stating the defect as fact, and I ran it
expecting the population to rise from 65 to 73.

**IT RECOVERED NOTHING — because my date arithmetic was wrong** (23:52 ET falls
on the previous ET calendar day). I went to find out why the patch did not fire,
and that is when the 08-14 session turned up.

**HAD THE PATCH WORKED, IT WOULD HAVE SILENTLY ABSORBED EIGHT NAMES FROM A REAL
PRIOR SESSION INTO THE POPULATION, AND I WOULD HAVE REPORTED AN 11%
UNDERSTATEMENT THAT DOES NOT EXIST.** A bug prevented a wrong finding. That is
luck, and naming it as luck is the only way it stops being relied on.

### The rule

**When a patch confirms the story it was written for, that is not evidence — the
patch was built to produce that outcome.** The premise has to be tested
*somewhere the patch is not*: here, one query for whether an 08-14 session
existed, which cost nothing and would have ended it before a line was written.

**So test the premise where the instrument cannot reach it, and be most
suspicious when a correction lands exactly as expected.** Reverted; both
instruments are back to their committed state.

*This is the third instance in two days of reaching for a mechanism before
checking the instance — see **"a true nearby mechanism is the most convincing
wrong answer available"**. The first two were caught by other people. This one
was caught by a bug.*

## A PATCH THAT WORKS FIRST TIME IS A PATCH WHOSE PREMISE WAS NEVER TESTED

**Research, 2026-09-06**, auditing its own denominators and nearly producing a
fourth wrong finding in a day.

The audit turned up 12 rank entries and 2,812 qualification events whose `ts` was
08-17 while `trading_date` said 08-14, **eight of them names absent from the
08-17 population.** The reading wrote itself: **the engine had not rolled, every
per-session count understates its population by 11%** — and in the direction that
makes the miss look smaller.

**Wrong. There is a full 08-14 session in the store** — 8,559 `ticker_session`
rows — **and `HHS` holds rank 1 there at RVOL 370.7, the exact value in the event
payload.** The store was backfilled late on the Sunday. Both fields were correct;
only the inference was not.

### What stopped it was a bug, and it is named as luck

The correction was written into both instruments **first**, with a docstring
stating the defect as fact, and run **expecting** the population to grow 65 → 73.
**It recovered nothing, because the date arithmetic was wrong.** Going to find out
why is when the 08-14 session turned up.

**Had the patch worked, it would have absorbed eight names from a real prior
session and the 11% would have shipped.** Research named that as luck rather than
letting it count as a process working.

**So: when a correction confirms the story it was written for, that is not
evidence — it was built to produce that outcome.** A patch validated by the
symptom it was written to explain has tested nothing.

**TEST THE PREMISE SOMEWHERE THE INSTRUMENT CANNOT REACH.** Here that was a single
query — does an 08-14 session exist — costing nothing and ending it before a line
was written.

**Third instance in two days of reaching for a mechanism before checking the
instance. The first two were caught by other people; this one by a bug. None was
caught by its author noticing.**

### And the back catalogue is clean, recorded rather than assumed

`24–40 entries` self-consistent; `20 of 53` keyed on `trading_date` on **both**
sides — verified including the case where 9 jobs for 08-17 were queued on 08-18
and remain keyed to 08-17, **so the comparison is like for like**; censoring
splits are one population partitioned. **The one real span mismatch was already
labelled in the file when it was built.**

## THE BUFFER EXISTS AND INTEGRATION STOPPED BUFFERING

Research shipped three findings that needed correcting within hours and offered to
slow down. **The diagnosis is wrong in one direction:** a thread reporting fast to
Integration is the bus working — **Integration is the buffer, and that is what the
seat is for.**

**What failed is that Integration relayed each one onward at the speed it
arrived.** A figure that has changed once is a figure whose instrument is still
moving.

**So the cadence rule is asymmetric: findings reach Integration as fast as they
form. A finding reaching the TRADER must first survive one check the instrument
that produced it cannot perform.** Slowing the thread would have cost the desk
three real findings to prevent three corrections that cost a paragraph each.

## A NUMBER THAT SURVIVES BECAUSE NOBODY WROTE A RULE FOR IT IS NOT THEREBY A FINDING

**Ops, 2026-09-07**, correcting itself rather than the relay.

The lead-time pre-registration covered lead times, a power floor and outcome C.
It said nothing about coverage counts — and when the timing comparison was ruled
unpowered, **the coverage number was the one part of the output with no rule
attached, so it became the consolation finding.** Ops offered it to the trader
as *"the real difference is coverage, not timing"*.

It was not a comparison at all: **its two sides were measured over different
spans**, one session-wide and one window-only.

**THE FAILURE IS NOT THAT A BROKEN NUMBER WAS RELAYED. IT IS THAT A CONCLUSION
WAS FOUND IN THE ONLY PLACE NOBODY HAD REGISTERED A FLOOR FOR.** A
pre-registration that binds part of an output leaves the rest looking
unconstrained rather than unexamined, **and the pressure to find something lands
exactly there** — hardest at the moment the registered comparison comes back
empty.

**So when a pre-registered result comes back null, the next number reached for
is the one to distrust most.** It has not passed a weaker test; it has passed no
test, and it is being asked to carry the weight the registered one was supposed
to.

*Both instruments' coverage figures disagreed — 5 one way, 38 the other — and
**that disagreement is the only reason either ever looked like a measurement.***

## 0, 1, 19 — THE REACH GAP IS A SINGLE-SESSION EVENT WITH NO ESTABLISHED CAUSE

**Research, 2026-09-06.** Fired-but-no-job, measured on production across three
sessions:

    09-02    0 of 54
    09-03    1 of 45
    09-04   19 of 56   <- 34%, and this is the "20 of 53"

**Item 81a explained the miss as sampling against 4.4× churn. That mechanism is a
property of every session and predicts a consistent rate. 0, 1, 19 is not
consistent.**

**And the latch defect is ruled out there by the same kind of absence that
convicted it elsewhere:** 09-04's wiped count is **zero**, its only restart at
03:48 ET before any latch exists. **One zero cleared a hypothesis after another
zero convicted one.**

**So "20 of 53 never researched" is a clean measurement of one unusual session,
carried for days as a standing reach gap.** The earlier bias audit stands and is
now beside the point: **the figure is not contaminated, it is unrepresentative.**

**No mechanism proposed** — after three instances in two days of reaching for one
before checking the instance, **the contradiction is the report.**

### And "no job" does not mean "nothing known"

45 names carry source rows while 37 had jobs, **so eight hold evidence collected
during another session.** That changes how a reach gap may be described at all.

## THE FRESHEST DOCUMENT DOES NOT CLUSTER AT ONE DAY

Age of the freshest pre-session evidence, by session: **median 12, 3 and 9 days**,
with only a quarter to two-fifths of names carrying anything from the prior
session.

**If a pre-session catalyst were what these names move on, the freshest document
should cluster at one day. It does not.**

**That is consistent with the structure break — movers running without a
catalyst — and it is the first production measurement of it.** The desk exists
because 50%+ movers were running with nothing found; this is the same phenomenon
arriving from the evidence side rather than the price side.

**The overnight-pass argument is now weakened from both directions.** The timing
half holds — selection precedes 07:00 — **and there is less and less sign of
anything to pre-compute from.**

### A third premise fell the same way as the first two

*"Nine rows in the whole store carry a stated time"* — **710 on production.** The
local desk again, hours after the 9% went the same way, and `data/README.md`
exists **because two threads already lost an afternoon to exactly this.**

**The rule is not "check the store" but NAME THE STORE IN THE SENTENCE THAT
CARRIES THE NUMBER**, so a claim cannot travel without its scope.

**And it moves a conclusion: about a third of same-day rows CAN be placed against
07:00**, so the blanket refusal was too strong — though synthesised `12:00Z`
placeholders stay excluded. **Registered before any number exists:** locally every
stated-time row is NEWSWIRE or COMPANY_IR and SEC filings are date-only, **so if
that holds, a before-07:00 rate answers when press releases go out rather than
when evidence arrives.**

## WHEN A PRE-REGISTERED RESULT COMES BACK NULL, DISTRUST THE NEXT NUMBER REACHED FOR

**Ops's rule, and it is about the whole desk.** The pre-registration bound lead
times. **Coverage had no floor** — so when the registered comparison came back
unpowered, **the unconstrained number became the consolation finding**, was
carried to the trader, reversed, and then withdrawn as an artefact.

**A number that survives because nobody wrote a rule for it is not thereby a
finding.** The absence of a constraint is not evidence of robustness — **it is
absence of scrutiny, and it is most tempting exactly when the constrained answer
has just refused to appear.**

## FOUR CHECKS OF ONE KIND ARE ONE CHECK

**Research, 2026-09-06**, on the reach figure surviving four independent audits.

Universe bias, retention divergence, latch amnesia, denominator audit. **All four
came back clean and all four asked the same question: is this number measuring
what it claims to measure?**

**Not one asked whether it generalises.**

**Contamination and representativeness are different questions**, and *"checked
four ways and held"* was true of the measurement and **false of the inference a
reader would draw from it** — that it is a standing rate. Which is exactly how it
had been used all week, including by its author.

**A number can be perfectly measured and not be a rate.** Independence of checks
is not the same as independence of *kinds* of check: **four instruments pointed
at the same axis leave the other axis untested and feel like corroboration.**

**Before reporting that a figure survived scrutiny, list what the scrutiny was
about.** If every entry on the list is a variant of *"is it correct"*, the figure
has not been asked whether it is typical.

### And the difference is the whole of the decision

**A third of names missed every day is a system to rebuild. One bad session is an
incident to explain.** The same number supports both, and only the question of
generalisation separates them.

### A slower wrong scope is still wrong

Offered a cadence change, Research declined it as the wrong remedy: **two of the
day's five errors were local-desk censuses quoted as store-wide facts, and
slowing down does not fix a scope error.** The change adopted instead is
**naming the store in the sentence that carries the number**, so a claim cannot
travel without it.

**And the finding that overturned everything arrived because Ops ran something
fast** — not because anyone was careful.

## A RANK-4 NAME GOT NO RESEARCH, AND THAT IS THE OPPOSITE OF EVERY EXPLANATION OFFERED

**Ops, 2026-09-06**, eliminating mechanisms for the 09-04 reach gap rather than
proposing one.

    date      no-job   best rank among no-job   with job   worst rank with job
    09-02        0            —                    54            12
    09-03        1           12                    44            12
    09-04       19            4                    37            12

**On 09-02 and 09-03 every name reaching rank 12 — the bottom of the board — got
a job. On 09-04 a name at rank 4 did not.** A threshold produces the exact
opposite shape.

**Four mechanisms eliminated, each by a measurement rather than an argument:**
churn sampling predicts a consistent rate and 0/1/19 is not one; the latch defect
is cleared by a **zero** wiped count on a date whose only restart preceded any
latch; **the research worker was not degraded — seven restarts, none inside the
ET window, and it queued 51 jobs in-window against 09-02's 46, more not fewer**;
and the auto-rank threshold is refuted by the table above.

**No fifth mechanism proposed.** Three reached-for explanations in two days from
one seat, and one from this one in the same hour. **The contradiction is the
report, and naming a cause tonight would be the same error with a different
author.**

**Next step is a query, not a theory: what the 19 share that the 37 do not.**

### And the honest account of how the coverage number got out

Ops retracted its own claim that *"the real difference is coverage, not timing"*,
and named the mechanism precisely: **the pre-registration ruled the timing
comparison unpowered, so it went looking for something else in the output.
Coverage was the one number nobody had written a floor for — and it treated that
absence as licence.**

**The rule was already on file. This is its author arriving at it from inside the
error**, which is the only way it becomes load-bearing.

### Not opening a substantial build straight after over-reading an output

`(d)` was held deliberately — **rulings all in hand, nothing waiting on it** —
because **the hour after discovering you have over-read something is the wrong
hour to start a build that depends on reading carefully.** Judgement about *when*
to begin, stated as a reason rather than exercised silently.

## "THE DATA DOES NOT HAVE IT" USUALLY MEANS "WE DO NOT COLLECT IT"

**Research, 2026-09-06**, fetching the SEC submissions payload rather than
recalling it.

    acceptanceDateTime   "2026-09-03T22:30:44.000Z"
    filingDate           "2026-09-03"

**Same object, same index, same response the desk already downloads.**
`parseSubmissions` reads `filingDate` and **does not read
`acceptanceDateTime`.**

So *"the store has no time of day"* — and its correction, *"a third of same-day
rows can be placed"* — were **both descriptions of a collection choice, not facts
about the source.** SEC rows are 1,401 of 1,437 locally and **every one of them
could carry a stated acceptance time.**

**And it is the right stamp rather than merely an available one.**
`acceptanceDateTime` is when EDGAR accepted the filing — **the moment it became
publicly observable**, which is exactly what *"was this readable before 07:00"*
asks. **A press release's own stamp says when the issuer released it; the
acceptance stamp says when the market could see it.**

### The author's own pattern, named because it predicts the next one

Fourth time in two days a premise turned out to be about the desk's own
configuration rather than the world: universe eligibility, `ticker_session`
amnesia, local-versus-production censuses twice, and now this.

**"Any sentence beginning 'the data does not have' should be read as 'we do not
collect', until I have checked which."**

**That generalises past its author.** Every seat here has reasoned from an absence
in the store as though it were an absence in the world, and **the store is the
only thing any of us can see.**

### A fidelity improvement creates a discontinuity in the series

Stored rows keep their date-only stamps, so the store becomes **mixed**: SEC rows
before the change `DATE_ONLY`, after it `EXACT`. **Any measurement spanning that
boundary sees a regime change that is not in the world** — filings appearing to
acquire times, or a before-07:00 rate jumping.

**The `precision` field already exists and is the discriminator.** Never compare
across the change date without partitioning on it, and **date the change in the
record so the boundary is findable.**

## A JUDGEMENT ABOUT SOMEONE'S ATTENTION IS NOT A DELEGATION YOU HOLD

**2026-09-06.** Integration approved a scheduled task to watch Tuesday's roll,
reasoning: *"that is an order-and-process call and it is mine; he has three open
items already and this is not one of them."*

**Ops declined, and the boundary is right.** A scheduled task is **persistent
configuration in the trader's environment that spawns an autonomous session on
his machine after every seat here is gone.** The action is not risky. **The class
is his to authorise, and a peer cannot grant it.**

**"He has enough on his list" is a judgement about his attention, which is his to
make** — and it is the argument that would justify every future bypass, **because
there is always something else on the list.**

**The split that does hold: the CLASS is his, the CONTENT is Integration's.**
Whether an autonomous task may exist is his. What it reads, when it fires, and
what it reports is order-and-process.

**Integration's own delegation covers sequencing work among threads. It does not
extend to creating standing agents in someone else's environment**, and the
seat that wrote *"spend, auth-model changes and destructive actions always come
to the trader"* reached past it while quoting the reason it exists.

### The same shape it had already declined, hours earlier

Ops refused to act on *"his word, verbatim: approved"* relayed from another
session — **and Integration withdrew that itself.** Then made the same move in a
different costume. **A boundary held once is not a boundary learned.**

### Two lines from the retraction worth keeping

**"Having written a rule is not having internalised it."** The coverage claim was
made by the author of the rule against it, hours after writing it, in their own
charter.

**And: an unregistered number does not stay where it was produced.** It was
relayed onward twice, in opposite directions, within a day.

## A WRONG TIME IS WORSE THAN NO TIME

**Research, 2026-09-06**, shipping the acceptance-timestamp capture and making one
decision nobody specified.

**The fallback stays `UNKNOWN` rather than becoming `DATE_ONLY`** — which looks
like the more honest label, since a date *is* known, and is the wrong one.
**`DATE_ONLY` in this store means a date carrying a synthesised `12:00Z`**, and
those placeholders are exactly why a third of same-day rows are unusable:
**12:00Z is 08:00 ET, inside the trader's window by invention.**

**Marking a bare filing date `DATE_ONLY` would put a made-up 08:00 into the field
the timing question reads.** One transition, not two, and the partition stays
clean.

**A missing acceptance returns NULL — not the filing date, not a synthesised
stamp.** And a payload with no acceptance column **degrades to previous behaviour
rather than throwing on every issuer**, which is what an endpoint change would
otherwise do to the entire collector.

**A field that exists to say when something was observable answers confidently
when it is wrong.** For that class of field, absent beats approximate — **and the
approximation is always the one that makes the question answerable.**

### The boundary is a DEPLOY fact, not a COMMIT fact

The discontinuity was dated **2026-09-07** in the code comment, the register and
the commit message — *"because the person who trips on it will be reading one of
those three and not this message."* **Right instinct, wrong date.**

**Nothing changes in the store until the code runs in production**, and this ships
with the Tuesday-close deploy. Rows keep arriving `UNKNOWN` until then, **so the
documented boundary is wrong by up to two days** — and it is wrong in the
direction that makes a rate computed across it look like a real change.

**Date a data-format boundary by when the writer started writing it, not by when
the change was written.** The two differ by exactly the interval nobody
remembers afterwards.

## REDUNDANCY IS RIGHT FOR A WARNING AND WRONG FOR A VALUE

**Research, 2026-09-06**, after a boundary date was written into three places and
then found to be wrong.

**Three copies was reported as the strength** — the person who trips on it reads
one of the three, not the message. **True, and it is exactly why the error was
expensive: three copies is three chances to update two of them.**

**And one of the three is a pushed commit message.** `b1d64b9` still carries the
wrong date and is not being rewritten. **So the artefact most likely to be read by
someone running `git log` on this change is the one copy that cannot be
corrected.**

**Fixed by collapsing rather than re-syncing:** the code comment now **points at**
the register entry instead of carrying its own copy, with a greppable token — one
place to update, one place to look — and the entry states that the commit message
is stale.

**A warning should be repeated everywhere someone might land. A value should
exist once, with pointers to it.** Duplicating a warning costs nothing when it
drifts; **duplicating a value guarantees that some readers get the old one.**

### And a pending marker beats a wrong one

The instant is recorded as `SEC_ACCEPTANCE_BOUNDARY: PENDING`, to be filled with
a **datetime and zone** once the deploy reports it — the roll and the deploy fall
on the same evening, so a date alone cannot separate them.

**A wrong date is actively misleading; a clearly-marked pending one is not.
Nobody computes a rate against `PENDING`.**

## A NECESSARY PROPERTY NARROWS THE QUESTION; IT DOES NOT ANSWER IT

**Ops, 2026-09-06**, on the 19 names that fired and got no research on 09-04:

                       09-04          09-02        09-03
                    no_job/has     no_job/has   no_job/has
    multi_entry        0 / 12         0 / 5        0 / 10
    one_entry         19 / 25         0 / 49       1 / 34

**All 19 entered the board exactly once, and a name that re-entered has never
lacked a job — 0 of 27 across three sessions.** A clean-looking cause.

**And it is necessary, not sufficient.** Single-entry names were caught perfectly
well elsewhere: **49 of 49 on 09-02, 34 of 35 on 09-03.** So **being a transient
does not get you dropped; being a transient on 09-04 does.**

**The question narrows rather than closes:** not *"why did 09-04 miss 19 names"*
but **"why did 09-04 fail to catch transients that adjacent sessions caught"** —
which is a question about how often the candidate query ran, and a different
search entirely.

**Sixth mechanism not proposed.** *"I can see a story about restart timing and I
am not writing it down."* **A property shared by every case in the failing set is
the most convincing thing available and proves nothing until it is checked against
the sets that did not fail.**

## WRITE THE TRAP INTO THE ARTEFACT THAT WILL MEET IT

The scheduled roll-watch fires at **22:15 ET Tuesday, expressed as a UTC offset
rather than converted by hand** — so the broken-`TZ` host never touches the
arithmetic.

**And the clock trap is written into the task itself**, because a run firing with
no memory of tonight **would otherwise reach for `TZ=America/New_York date` and
get UTC.** The rule travels with the thing that will need it, not with the people
who learned it.

**It also performs the `rolled_for` vs `trading_date` comparison itself rather
than trusting the served field**, because production may still be on `7212bdd`
when it fires — **and `7212bdd` cannot detect that case.** A watcher that trusts
the thing it watches is not a watcher.

### And a mitigation that might consume the thing it protects

The task is a **one-shot that auto-disables after firing**, so *"Run now"* to
pre-approve the permission prompt would **spend the run it was meant to
guarantee.** Flagged before use rather than discovered after.

**Two ways it can silently not happen, both named:** scheduled tasks run only
while the app is open, and **a permission prompt pauses one with nobody there to
answer it.**

## AN INSTRUCTION TO REPORT AT AN EVENT, GIVEN TO A SEAT THAT WILL NOT BE THERE

**2026-09-06.** Integration told Ops to *"report the exact deploy datetime at
deploy time."* **This session will not exist on Tuesday.**

**That is the unowned-watch shape in a different costume** — and unlike the roll
watch, **a scheduled task cannot cover it, because a deploy is not a moment
anyone can schedule against.** It is an event someone causes, at a time nobody
knows in advance.

**So it is written down instead**, as a checklist phrased for whoever is in the
seat rather than for the seat that wrote it. **An instruction whose addressee is
"you, later" needs an addressee that exists.**

### And the boundary is the unit restart, not the deploy

**`worker/research.ts` runs the collector, so the boundary is the instant
`mointel-research` starts on the new sha** — not the deploy, which is a sequence
with stops, a symlink switch, a migration and staggered starts. **No row written
before that restart can carry `EXACT`.**

**A deploy is an interval; a format boundary is a point inside it.** Readable
exactly:

    journalctl -u mointel-research -o short-iso | grep "Started mointel-research" | tail -1

## DEPLOY FIRST, THEN RESTART. NEVER THE REVERSE.

**Ops raised this and Integration had not.** The latch wipe fires on the first
flush after a restart, so **a restart on the OLD code destroys that session's
out-of-band latches** — meaning **the last possible wipe is a restart that happens
just before the fix lands.**

`RESTART_MARKET=no` makes the restart a separate deliberate act, **which gives the
correct ordering for free — but only if nobody reaches for a restart first to
"pick up the fix."** That is the natural instinct and it is exactly backwards.

**The wrong order looks identical to the right one until you read the latches
afterwards**, which is why it goes in the checklist with its reason rather than as
a step.

### And a limit of the practice, named rather than defended

Fifth crossing of the evening. **Both seats now declare their assumed state in
every message and the messages still cross.** State declaration **makes a stale
instruction visible on arrival; it does not stop one being sent.** Worth holding
as a limit of the practice rather than as evidence against it.

## A NUMBER THAT MISEXPLAINS ITS OWN LABEL IS WORSE THAN EITHER NUMBER ALONE

**Design, 2026-09-06**, arguing against Integration's instinct on which figure the
phase chip should carry.

**`retracementPct` is what produces the label.** `cycle.ts:323` selects BACKSIDE
from `retracementPct >= backsideRetracement`. **The word on the chip is computed
from that number and from no other.**

So *"OFF HIGH · 8%"* fed by `givebackPct` **shows a number that did not produce
the word beside it** — and a reader takes a number beside a word as that word's
evidence.

**And on the names where the two diverge most, the giveback figure is the
reassuring one.** A name based at $1.00 that ran to $1.20 and sits at $1.10 **has
surrendered half its move and reads 8% off its high.** That is `cycle.ts:73`'s own
warning, **and it lands on exactly the names that have broken.**

**Integration's instinct was that OFF HIGH beside anything but distance-below-high
contradicts itself. The reverse is true: the label is already a retracement
verdict wearing a distance-sounding word**, and pairing it with a distance number
**makes the mismatch invisible rather than resolving it.**

### The counter-argument, kept rather than dismissed

The Sheet's column is FLUSH FROM HIGH and the trader has read it for months.
*"42% off its high"* is his sentence. **And at chip width there is no room to
disambiguate** — `OFF HIGH · 42%` reads as *42% below the high* whichever number
is behind it. **Not taste: the label cannot carry the distinction at that width.**

**So one word does what a percent sign cannot:** `OFF HIGH · 42% back`. **And if no
wording fits, the answer is giveback — because a misread number is worse than an
unfamiliar one.**

### Both other constraints answered by measurement rather than argument

**Width:** the column is `w-[152px]` and **already carries "CYCLE NOT ESTABLISHED"
at 21 characters.** Longest label plus figure is `FRONTSIDE · 42% back` at 20.
**The worst case does not move**, so it cannot cost a column by the back door.

**Empty state:** show the figure only when > 0, as `cycleDetail` already does —
and **the contradiction cannot arise, because at zero retracement the phase is
FRONTSIDE or DAY ONE, never OFF HIGH.** No cycle renders **no number at all,
never "0%"**: zero is a measurement and absence is not.

## A ZERO PROVES NOTHING WITHOUT THE COUNT OF CASES IT COULD HAVE FAILED ON

**Ops, 2026-09-06**, taking Integration's post-deploy latch check and adding the
half that makes it a check at all.

**`wiped = 0` reads zero whenever no name went out of band that session** — which
is most of the reason the defect survived weeks. **The bare number is the
defect's own camouflage:** 98% of rows looked healthy because nothing was being
asked of the latch.

So the query returns both:

    wiped                    must be 0
    out_of_band_surviving    must be > 0, or the check saw no case it could fail on

**On 2026-09-03 that pair read 57 and 4. A healthy night reads 0 and some tens.**
Both numbers, always — **otherwise on a quiet Tuesday we read a zero and believe
it.**

**Prove a check can see a present case before believing its absence.** The rule
was already on file; **it arrived here as the verification of a fix for a defect
from the same family**, which is the shape worth noticing.

### And the test for the crossing practice is not whether crossings stopped

Five in one evening with both seats declaring state. **Not one of them cost a
wrong action.** That is the measure — **not whether the practice prevents stale
instructions, but whether a stale instruction now arrives visibly enough to be
caught before it is acted on.**

## I FORBADE IT IN THE OUTPUT AND REPRODUCED IT IN THE SCOPE

**Research, 2026-09-06**, on Integration's shape for the Why Not Report.

Integration wrote **Constraint 1: the absence of a reason not to is not a reason
to** — and in the same message told the trader that **"a clean name falls out as
the absence of every objection rather than as a separate product."**

**If "clean" IS the absence of objections, the report's silence is the buy signal
STRUCTURALLY, and no wording in the renderer undoes it.** Forbidden in the output
and rebuilt in the architecture, four paragraphs apart.

### And the asymmetry is evidentiary, not presentational

**An objection needs ONE confirmed fact, from one source. "No objection" needs to
have looked everywhere.**

**62% of names carry no non-SEC catalyst source; 79 of 118 issuers with a durable
feed address have never produced a single non-SEC row.** So **the avoid is
achievable at today's coverage and robust to its gaps. The clean verdict is
destroyed by them.**

**They cannot be one product with the sign flipped.**

### The better answer to the question actually asked

*"How does this deal with good setups — does it ignore them?"*

**It does not ignore them. It declines to certify them.** What it can honestly say
about a name it found nothing against is **how hard it looked** — useful on a good
setup without being approval, because **it tells him which names he would be
trading blind on.**

### The three-way verdict is the product

    OBJECTION                        a specific structural fact, with its basis
    NO OBJECTION FOUND, AND WE LOOKED  sources reached, nothing there
    NOTHING WAS COLLECTED            the desk is deaf on this name

**The third is not a weaker second. It is the opposite of it.** Collapsing them is
this desk's oldest failure aimed at the trader's money — **and it is the only
genuinely new thing in the shape: a type, not a system.**

### Severity derived from fields that already exist

**`timeToEffect` × `basis.kind`.** NOW acts on the price he is about to pay; WEEKS
does not. **A cash merger caps by contract now; a shelf registered in 2024 is a
fact about the company, not about his next sixty seconds.** OBSERVED outranks
INFERRED, and `EFFECT_RULES` already records `measured: null` for rules the desk
believes rather than measures. **Nothing picked, no new scale.**

### And the metric is a precondition, not a proxy

Trades not taken cannot be observed. **What is measurable is whether an objection
was AVAILABLE before he would have entered** — coverage and timing, not outcome.
**A report failing that cannot work whatever outcome data would later say; a
report passing it is not thereby shown to work.** That distinction is what keeps
it from becoming a proxy.

## AN UNDETERMINED AXIS FORCES THE THIRD VERDICT, HOWEVER HEALTHY THE SOURCE COUNT LOOKS

**Research, 2026-09-06**, building the Why Not verdict type — and making the
decision nobody specified, which is the one the type exists for.

**The SEC-only case is the common one:** forty filings collected, no newswire, so
**a demand event could not have been seen.** Under a naive rule that name returns
`NO_OBJECTION_FOUND` **with twelve sources behind it, and reads as cleared.**

**It has not been cleared. The side he needs was never searched.**

So `NO_OBJECTION_FOUND` requires **both axes to have said something.** **That is
the difference between "we looked" and "we ran"** — and it is the single place
this type earns its existence.

### The shape enforces what the wording cannot

**Three members of a union, not a boolean with a flag beside it**, so a consumer
**cannot read the second without having handled the third.** `NO_OBJECTION_FOUND`
carries `coverage` and **is meaningless without it**; `NOTHING_COLLECTED` carries
its reasons *and* coverage.

**And nothing returns approval, including by implication.** No CLEAR, no PASS, no
OK — **tested by regex against the verdict kinds**, which is a check that can fail
if someone later adds a friendly-sounding member. **A rule enforced by a test that
fires on future additions outlives the person who wrote it.**

### A horizon nobody established is not a horizon of weeks

`bearing` derives from `timeToEffect` alone: NOW → ON_THIS_TRADE, DAYS/WEEKS →
ON_THE_COMPANY, **UNKNOWN → UNDETERMINED, sorting last.** Defaulting it either way
would be **an absence borrowing a value** — the same failure as the synthesised
`12:00Z`, arriving in a severity scale.

**`priceCapped` outranks everything, because it ends price discovery outright**
whatever the catalyst's own horizon says.

### Tests committed before the code

Both registered at `48cae33`, **before any implementation existed, so the ordering
is in the history rather than asserted.** Neither run: objection rate across run
size, and deaf rate across run size. **No direction on either.**

## THE TEST WRITTEN TO ILLUSTRATE A CLAIM REFUTED IT

**Research, 2026-09-06.** A docstring asserted that a fetch at the 02:00 ET roll
would land on the previous ET date and be missed, **so the scoping errs toward
understating today's coverage.** A test was then written to demonstrate it.

**The test failed. 02:00 ET is the trading date's own ET day.** The claim was
wrong; **the direction was right for a different reason** — work running past
midnight ET belongs to the session that just ended and lands on the following
date.

**Both the corrected edge and the fact that an earlier draft said otherwise are
in the file.**

**This is the only error of the day caught by something its author built rather
than by another seat.** Every other one was caught by a teammate, a bug, or a
surviving mutation. **Writing a test for a CLAIM, not only for code, is the one
mechanism here that has caught its own author.**

### And the constraint dissolved rather than needing a disclaimer

Integration required: if coverage cannot be scoped to the session, **say so on the
type.** **It can be scoped** — `fetched_at` is populated on all 1,437 rows and
`readSources` already filters on it. **So `lookedThisSession` is a measurement
rather than a caveat**, and the reader can tell *"we have looked at this name"*
from *"we looked at it today."*

### The field is carried, never decided on — and that is not caution

`lookedThisSession: false` was nearly made to force the third verdict. **It would
have been wrong: a failing or empty collection attempt writes no row**, so `false`
conflates *"nobody looked today"* with *"we looked and found nothing new."*

**The same two-reading silence as the `queued_at` gap that cost this desk an
afternoon two hours earlier** — reasoned past by the author of the caveat about
it. **Forcing the verdict would misclassify every name the collector checked and
found quiet.**

**A field with two readings is reported, not acted on**, and the limitation lives
on the type where the reading happens.

## WRITE A TEST FOR THE CLAIM, NOT ONLY FOR THE CODE

**Research, 2026-09-07**, building `buildCoverage`. **Named by Integration as
the only mechanism that caught its own author all day.**

The docstring said the session scoping errs toward understating today's
coverage, **because a fetch at the 02:00 ET roll would land on the previous ET
date and be missed.** Plausible, load-bearing, and written with confidence.

Then a test was written **to demonstrate that claim** — and it failed. **02:00
ET is the trading date's own ET day.** The conclusion survived for a different
reason (work running past midnight ET), but the stated mechanism was wrong and
would have sat in the file being quoted.

### Why this one worked when the rules did not

**A test written to COVER CODE asks whether the code does what it does.** It
passes on correct code with a wrong explanation above it, every time.

**A test written to DEMONSTRATE A CLAIM runs the claim against reality**, and
reality is the thing the author does not have access to by thinking harder. The
claim was about timezone arithmetic; the author's belief about timezone
arithmetic was the error; **no amount of care applied to the sentence would have
found it, and one assertion did.**

### The trigger

**Any docstring or comment stating WHY something behaves as it does — a
direction of error, an edge case, a bound, a mechanism — is a claim, and a claim
is testable.** Those sentences are exactly the ones nobody tests, because the
code they sit above is already covered.

**They are also the ones that get quoted years later**, long after anyone can
check them, and they are load-bearing precisely because they explain rather than
describe.

*Same evening, four errors of the identical kind — each seat reasoning past a
rule it had written, one within the hour. **Every one caught by a different seat,
none by its author, except this.** The correction rate is a property of three
seats reading each other and does not survive being internalised — but this
mechanism does, because it does not rely on the author noticing anything.*

## I COUNTED CHARACTERS AND CALLED IT A MEASUREMENT

**Design, 2026-09-06**, retracting its own width answer.

It had reported that a figure on the phase chip **could not push the column**,
because the column already carries `CYCLE NOT ESTABLISHED` at **21 characters.**

**Measured against the real font** — Geist 600 10px, letter-spacing 0.25px,
sampled from a live badge — **that string is 128.2px against a 122px budget. It
already truncates on the live board today.**

**A character count is a proxy for width, and the proxy was wrong in the
direction that made the answer convenient.** The budget was then established
**empirically rather than computed**: column 152px, cell inner 136px, badge text
budget 122px.

**And the failure mode was worse than not fitting:** the badge has `truncate`, so
an over-long value **would not push the column — it would silently cut the
prices.** A constraint satisfied by hiding the thing it was protecting.

### The place it fits costs nothing in either direction

**A second line under the chip.** The cycle cell already stacks two badges in a
flex column, so it is architecturally free. **A plain line has no badge padding or
border, so its budget is the full 136px:** worst realistic case `$0.4210 →
$0.3890` at **109.5px, 26px under.** Dollar signs kept, four decimals kept on
sub-dollar names, **no truncation and no dropped precision.**

**Vertically the row is 65px and the cycle cell uses 19** — the Risk cell already
uses 56 — **so a ~15px line lands inside space the row is already paying for.**

## BOTH CHOICES ARE WRONG, WHICH USUALLY MEANS THERE IS A THIRD

**Rendering the second price forces a choice with no good side.**

`latestClose` is on the cycle arc and **its own doc says it means the latest
SETTLED session** — yesterday's close. **It will not match his screen**, which is
the mismatch that costs more than the feature is worth.

`telemetry.price` does match his screen. **But the label is computed from
`latestClose`**, so on a name that gapped overnight the chip reads **`OFF HIGH ·
$1.20 → $1.80`** — a live price *above* the cycle high, beside a word saying it is
below it.

**That is the stale-cycle defect surfacing visibly rather than a rendering
choice.** Design's instinct — **a visible contradiction gets reported and a silent
staleness does not** — is right about which failure is safer and still picks a
failure.

**The third option is to detect it: when the live price exceeds the cycle high,
the cycle IS stale by definition**, and the honest render is to say so rather than
to print a contradiction or a stale number. **Neither price is wrong; the LABEL
is.**

**When every available answer is defective, the defect is usually one level up
from the question being asked.**

## THE DESK TELLS HIM A RUNNER IS FINISHED ON THE MORNING IT RUNS

**Design, 2026-09-06**, measuring how often a live price exceeds the cycle high
the label was computed from.

    symbol-days with a cycle                 1,152
    next high above cycleHigh, any phase        63    5.5%
    labelled OFF HIGH / BACKSIDE               876
    ...and next high above cycleHigh            24    2.7%

**2.7%. An edge case, needing no elaborate design.**

**And the rate and the severity point opposite ways, which is the finding.** The
24 are not marginal overshoots:

    CDTG  BACKSIDE  high 10.00 -> 15.12   +51%
    CXAI  BACKSIDE  high 12.50 -> 16.74   +34%
    CNET  BACKSIDE  high  1.42 ->  1.70   +20%

**When it fires, it fires on a name up 20–50% through its own cycle high and
calls it BACKSIDE.** Rare — and wrong **in the direction that costs him a trade**
rather than merely confusing him.

**So rarity is not an argument for leaving it. The 2.7% says it needs no heavy
design; the severity says it cannot render as OFF HIGH.**

### And the caveat resolves in the direction that raises the number

Design flagged, without resolving: **if the daily bar's high is RTH-only,
premarket spikes are invisible to this measurement and the true rate is higher.**

**`lib/market/types.ts:65` already answers it, verified against minute bars:
"Alpaca's daily bar carries full-session VOLUME but regular-session OHLC."**

**So the high is RTH-only, premarket highs do not appear in it at all, and 2.7%
is a FLOOR** — measured on the part of the session he does not trade. **The
uncertainty was one-directional and the direction was the bad one.**

**A caveat that can only move a number one way is not a caveat. It is a bound**,
and it should be reported as one.

### Why a bound and a caveat land differently, which is the better formulation

**Design, 2026-09-06**, sharpening Integration's rule: **a reader discounts a
caveat SYMMETRICALLY, and a bound is not symmetric.**

*"The true rate may be higher"* invites a shrug. **"2.7% is a floor" does not.**
The same fact, and only one of the two survives being skim-read by someone
deciding whether to act.

### And an open question that was already closed on disk

**Flagging the RTH question unresolved rather than estimating it was right.
Searching the repo before recording it as open would have been better** — the
answer was in `types.ts`, verified against minute bars by someone who checked it
**because it mattered.**

**An open question costs a round trip. Check whether it is already answered
before spending one** — this desk's own record is the first place to look, and
the fact that it was verified deliberately is what made it findable.

### Declining is a choice with a cost, not a neutral default

If the trader declines the stale-cycle behaviour, the fallback is the settled
close — **no false BACKSIDE, and a number that does not match his screen.**

**That cost is stated in the question rather than discovered afterwards.** An
option presented as "leave it as it is" reads as free; **naming what it costs is
what makes it a decision rather than an absence of one.**

## A DISPLAY STATE AND A TAXONOMY CHANGE ARE DIFFERENT THINGS, AND ONLY ONE WAS APPROVED

**Design, 2026-09-06**, deciding whether NEW HIGH is a label or a phase.

**Making it a `CyclePhase` would change behaviour nobody agreed to:** `view.ts:25`
maps the cycle filter **directly onto `CyclePhase`**, so a name at a new high
would **silently leave the FRONTSIDE filter**; and `countCyclePhases` feeds the
header segment counts, so **the counts would move too.**

**So the phase underneath is untouched and only the chip's label changes.**
Filters, counts and segmentation keep working off the arc exactly as today.

**A trader approved a word on a chip. He did not approve a name disappearing from
a filter** — and the two are one type declaration apart.

### And the question it was asked dissolved

Integration asked whether NEW HIGH appears only where the arc was stale, or on
every name printing a new high — *"repair label or real phase."* **`cycleHigh` is
settled-only, so the arc is stale with respect to today for EVERY name.** Anything
printing a genuinely new high today exceeds it. **The two readings were the same
set.**

## THE BAND IS REQUIRED FOR A SHARPER REASON THAN OSCILLATION

Integration argued a band was needed or the label would flip on a one-cent
downtick. **The real reason is stronger: the running high is a MAXIMUM, so price
can never exceed it.** `price === runningHigh` is true for **one print** and false
immediately after — **so without a band, NEW HIGH would appear and vanish on the
same tick.**

**The instrument is the spread, already used by the colour on the same surface:
off by less than the spread is not off, because the difference was not sellable.**
Derived, per-name, and consistent with what the row already does.

    newHigh   = sessionHigh !== null && sessionHigh > cycleHigh
    reference = newHigh ? sessionHigh : cycleHigh
    atHigh    = price !== null && (reference − price) <= spread
    label     = newHigh ? (atHigh ? 'NEW HIGH' : 'OFF HIGH') : arc phase word

**Deliberately literal on "if the high is new":** the override fires only when
today's high has actually beaten the arc. **A name merely sitting at its old cycle
high keeps its phase word** — that high is not new, **and reading the instruction
more broadly would put NEW HIGH on names he did not describe.**

### And the tone must follow the label when it overrides

Raised unprompted: otherwise **NEW HIGH renders in the negative colour of the
stale BACKSIDE verdict underneath it.** The label-and-number mismatch again, **one
layer up** — a word saying one thing while its colour says the opposite.

## A DEFECT REMOVED BY CONSTRUCTION RATHER THAN BY A BRANCH

**Design, 2026-09-06.** `reference = max(cycleHigh, sessionHigh)` **makes "price
now above the high" structurally impossible.** The contradiction the desk spent an
evening designing around — a live price above the high its label was computed
from — **cannot occur at all, rather than occurring and being handled.**

**And it was not aimed at.** It falls out of taking the maximum. **The fix that
removes a case is better than the fix that catches it**, and the difference is
usually one operator rather than one more branch.

## A DERIVED BAND COMPARED IN FLOATING POINT HAS A NOISE FLOOR

`1.5 − 1.49` is **`0.010000000000000009`**, which reads as **outside** a one-cent
spread. **So a name exactly one spread off its high would have flipped to OFF
HIGH on the arithmetic rather than on the price.**

**Caught by its author's own "sits on the band rather than near it" test** — the
test written for exactly this, **firing on its writer for the first time.**

**Fixed in the code rather than in the test**, compared at six decimals: **quotes
are never finer than four, so the rounding cannot change a real decision** and it
removes the noise that would otherwise flip a label on an exact-boundary print.

**The general form: compare at the precision of the INPUTS, not at the precision
of the type.** A threshold derived from measured quantities inherits their
resolution, **and the gap between that and the float's is pure noise sitting
exactly on the boundary where the decision is closest.**

### And no spread means no override, not a guess

**The prices still render — they are observations and need no band. Only the
verdict does.** A missing spread suppresses the label and leaves the evidence
standing, **because the thing that required a threshold is the claim, not the
measurement.**

## THE DISCRIMINATOR IS THE PRECONDITION, NOT THE RENDERING

**Design, 2026-09-06**, settling before Tuesday how to read a check that may have
nothing left to observe.

`max(cycleHigh, sessionHigh)` may have made the stale-arc case unobservable —
**and an absent case and an absent renderer look identical.** Deciding which
**while standing in front of the board** is how it gets decided badly.

**`sessionHigh > cycleHigh` is readable from the payload whatever the screen
does:**

    preconditions > 0, no contradiction on screen  -> THE FIX WORKS
    preconditions > 0, a contradiction on screen   -> DEFECT, report immediately
    preconditions = 0                              -> INCONCLUSIVE

**The third row is the one to be honest about.** Zero preconditions with a clean
screen **is exactly what a working fix and a dead check both look like** — and it
is the row anyone would be tempted to report as a pass.

**Settle how a result will be read before the result exists.** A method chosen
afterwards is chosen knowing the answer.

## A TEST CAN KNOW SOMETHING ABOUT A BOUNDARY THAT ITS AUTHOR DOES NOT

**Two instruments fired on their own builders today** — a mutation that survived,
and a band test that caught floating-point arithmetic its author *"had not thought
about at all."*

**That is different in kind from a rule someone remembers to apply.** The test was
written for a threshold that had been derived carefully; **it then failed for a
reason outside the reasoning that produced it.** A rule can only catch what its
holder is already looking for. **An instrument checks the property, including the
parts of the property nobody considered.**

**Every other error on this desk today was caught by another seat.** These two
were caught by something the author built — **which is the argument for
instruments over rules, made by the record rather than by assertion.**

## THE PARSER ACCEPTS A CLOSED GRAMMAR AND NULLS EVERYTHING ELSE

**R&D, 2026-09-07**, running the Sheet census through the real pipeline —
`locateTable` then `normalizeSheetRows`, **the same path the board uses** — so the
rates are what the desk actually receives.

**Its own registered direction was refuted.** It predicted `approx 12M` would
parse, on the theory that the discriminator was a **second numeral.** It is not:
`parseNumber` is a **fully anchored** regex, so **any character outside a closed
vocabulary kills the cell.** *"A lone word kills it exactly as dead as a second
number does."*

**Integration's "carries a qualifier" was right and R&D's was too narrow — and
the strongest form is neither.** The rule is predictive **from the parser alone,
with no sampling at all:** digits, `( - + $ , . K M B %` and whitespace parse;
everything else nulls.

    PARSE   12M   12,000,000   4.02M   $9.69   11.3%   (1.5)   -3.2
    NULL    approx 12M   ~4.0M   >12M   c. 12M   12.0M*
    NULL    11.3% at $9.69   3.1M; 12M SO   4.0M - 4.4M

### Parse rate of WRITTEN cells, RESEARCH tab, n=226 rows

    floatCellShares      5.3%
    recentCycleHigh     32.1%
    flushFromHighPct    43.5%
    sharesOutstanding   55.7%
    float               68.6%
    rthClose            98.7%

**And a third broken field nobody had found: RECENT RUN HIGH is 0 of 7 on TODAY
and 61 of 190 on RESEARCH. Both are marked PRODUCED in the audit.**

**So "what the Sheet provides" is materially smaller than the audit says**, and
the fields that fail are the ones whose natural expression carries a word: a
float with its share count, a percentage with its price level, a high with its
date.

**A field marked PRODUCED because a column exists has been measured for the
column and not for the value.**

## AND IT WAS FOUND FOUR HOURS BEFORE ANYONE HERE KNEW

R&D ran the census, committed it, **and went idle without reporting.** Integration
found it by reading `git log` while checking whether any thread had gone quiet
unnoticed.

**This is the failure the trader reported twice, arriving a third time** — and
this seat's own amendment says **going idle IS a milestone.** The work was
excellent and it sat in a commit message.

**A finding that reaches the repository and not the bus has not been reported.**

## CORRECTION: THAT WAS A DEAD CHANNEL, NOT A REPORTING FAILURE

**2026-09-07.** The entry above recorded R&D's silence as a discipline failure —
*"a finding that reaches the repository and not the bus has not been reported"* —
with R&D as the instance, twice.

**R&D has never once been able to reach Integration.** The messaging tool is
**deferred**: not loaded in a session by default, and a thread that does not know
it exists cannot search for it. Ops, Research and Design all found it. R&D did
not, and had no way to discover that the gap was on its side.

**The rule stands. The attribution was wrong and the failure was Integration's.**

### And the gap was invisible for exactly as long as the work kept arriving

R&D's findings kept appearing in `git log`, so **Integration read around the
missing leg** — the census, the annotation columns, the amended audit, all
discovered rather than received. **A bus with one dead branch looks identical to a
bus with a quiet thread, as long as the quiet thread keeps producing.**

**Test the channel, not the silence.** A seat that has never sent a message is not
a seat that has nothing to say — and "has never once" is a fact available from
the record at any time, for free, without asking anyone.

### It is the day's own lesson pointed at a teammate

Research spent this session establishing that **"the data does not have it"
usually means "we do not collect it."** Integration did the same thing to a
person: **"R&D is not reporting" meant "R&D cannot."**

**An absence attributed to a choice, when it was an absence of capability** — the
same substitution, on the one axis where it also happens to be unfair.

### The dead leg had a casualty, and it was not a hypothetical one

**R&D, 2026-09-07, first message ever successfully sent to Integration.**

**A request that never reached its destination: the S3 prior-free re-run, to
Research.** The work behind it finished days ago.

Ops measured the contamination in place: **29.2% of mover-attached grading
versions carry a non-null `sheetProvenance` against 7.6% of non-mover-attached —
3.8× concentrated — and 76% of the contaminated movers are CONFLICT**, the Sheet
prior disagreeing with the derived value. **The variety that carries the trader's
own judgement into a grade.**

**The bound: S3's observed +14.9pp goes to −14.7pp worst case and +9.5pp mid.
The band spans zero.** The detection is not robust to the concentration measured.

**So a prior-free replay is justified on evidence rather than as an open worry —
and the request sat undelivered.** A broken channel does not announce itself as a
missing conclusion; **it presents as a thread that seems to have nothing
outstanding.**

## THE ONLY CHECKER WAS RUNNING ONE SHIFT

**R&D's own observation, and it is about the arrangement rather than about
anyone.** Six Integration specifications were wrong in a day and **R&D was the
only check on several of them.** That worked.

**And R&D produced two pooled-rate errors in the same stretch** — 10.5% across a
live and a dead era, 19.8% across a working and a broken pipeline — **and had a
pre-registered direction refuted.** Nobody was checking R&D, **because nobody
could hear it.**

**A single checker is not a robust arrangement, and the checker is the last to
notice its own drift.** The dead channel made it worse in one direction only: it
could catch, and could not be caught.

**Now that it runs both ways, the cross-check is deliberate rather than
incidental** — R&D's findings reach the trader through a second measuring seat,
the way Ops's and Research's already do.

### And a schema note worth keeping

The six judgement fields **each need one nullable column on a table that already
inserts a row per ticker per assessment.** R&D's sentence is the one to keep:
**"the schema is one line each and is not the cost. A column with no writer
preserves nothing."**

## THE REPLAY SETTLES WHETHER THE DETECTION DEPENDS ON THE PRIOR, NOT WHETHER IT IS VALID

**Research, 2026-09-07**, designing the prior-free replay and naming what it
cannot answer **before** it runs.

    edge collapses without the prior  -> the DESK is not producing the detection
    edge survives                     -> the desk IS
    either                            -> NOTHING about whether the prior was hindsight

**`SheetPrior.observedAt` is the FETCH time** — its own docstring says so at
`sheetPrior.ts:96`. **Nothing records when the human made the judgement.** So
whether a prior encodes hindsight — a note written after the move — **is not
recoverable from anything stored.**

**That is a real answer to a real question, and it is not the question the
contamination framing implies.** Said with the result rather than after it.

### No direction registered, and the reason is not symmetry of argument

**A prior written BEFORE the session is genuine signal, and removing it should
cost accuracy. One written AFTER is leakage, and removing it should reveal a
smaller edge.** Opposite signs — **and the field that would separate them records
a fetch time.**

**"I can argue either only because the deciding fact is missing, not because both
are equally plausible."** Naming which is which **is worth more than a coin-flip
dressed as a hypothesis.**

### And the cheap path was found by asking what would decide the sign

**If anyone can establish when the Sheet's rows were written, that decides it and
it costs nothing.** It is **a question about the sheet rather than about the
store** — so it may be answerable by asking, which no amount of replaying can do.

**When a measurement cannot recover a fact, ask whether anyone simply knows it.**

### Scope correction that changes the price category

*"A replay over 13 sessions"* reads as re-running the pipeline. **It should re-run
INTERPRETATION only** — evidence is already stored with fingerprints, and
prior-free means one null in the bundle. **A change to interpretation input, not
to collection.** That is the difference between the largest spend ever proposed
here and something census-sized, **and it is a scope decision rather than an
optimisation.**

### Two traps in the pricing method, and a refusal to quote

**Aggregate by INTERPRETATION, not by call** — a version carries terra,
escalation and repair calls, so a per-call median times N **undercounts by exactly
the tail that makes a large run expensive.**

**`counts_available` exists for a reason:** rows without counts are partitioned
out and reported as a share, **never priced at zero.** A missing token count
treated as zero is **an absence borrowing the reassuring value, inside a spend
estimate.**

**And no number was given, because `model_usage` does not exist in the local
store** — the table postdates its last write. **Any figure would have been the
third local census quoted as a store-wide fact in one day.**

## WHEN A MEASUREMENT CANNOT RECOVER A FACT, ASK WHETHER ANYONE SIMPLY KNOWS IT

**Research and Integration, 2026-09-07**, designing the prior-free replay.

The replay's result changes meaning depending on whether a Sheet prior was
written before its session or after it — **signal in one case, hindsight leakage
in the other, opposite signs.** `SheetPrior.observedAt` records the FETCH time,
so the store cannot separate them.

**The reflex was to design a better measurement.** The cheap path was to notice
that **the sheet is a human artefact and a human knows when its rows were
written.** One question, answerable in a sentence, decides the interpretation of
a thirteen-session replay — and if the answer is "never after", the replay
becomes a much smaller question.

### THE DAY THIS RULE COMES FROM HAD FIVE CASES AND FOUR WERE TREATED AS DEAD ENDS

| the fact | why the store could not say | knowable? |
| --- | --- | --- |
| what the desk believed on 08-17 | `universe` classification overwritten | **no** |
| whether a name latched | `ticker_session` overwrote it | no — but `desk_events` had it |
| when a filing became visible | `filingDate` is a bare date | **YES — the SEC serves the timestamp** |
| the effective planner period | no per-cycle log line | **YES — it is our own code and our own deploy** |
| when a Sheet row was written | `observedAt` is a fetch time | **YES — ask him** |

**Three of five were answerable and were nearly filed as unrecoverable.** In two
of them the desk was already downloading or already emitting the answer.

### The distinction that decides it

**A fact about the MARKET at an instant is gone if nobody wrote it down.** A
fact about **OUR OWN CONFIGURATION, OUR OWN CODE, A THIRD-PARTY API, OR A HUMAN
ARTEFACT** is not — it is merely not in this table.

*"The data does not have it" and "we do not collect it" are different
sentences,* and the second has a further split: **not collected, versus not
collected but freely available.**

### The trigger

**Whenever a design says a question is unanswerable, name the OWNER of the fact
before accepting it.** If the owner is the market, accept it. **If the owner is
a vendor, our own code, or a person in the room, the measurement was the wrong
instrument and a question is the right one.**

*Corollary, from the same day: asking WHAT WOULD DECIDE THE SIGN found this,
where asking HOW TO MEASURE BETTER would not have. **The cheap path opens at the
question about the conclusion, not at the question about the method.***

## THREE TASKS WROTE BEFORE THE SESSION. ONE WROTE AFTER — AND IT WROTE ABOUT THE MOVERS.

**2026-09-07, from the trader.** The Sheet was filled by four scheduled tasks:

    22:00 ET  After-Hours Recap        discovery, builds next day's TODAY   BEFORE
    06:10 ET  Premarket Confirmation   confirms/downgrades the thesis       BEFORE
    09:25 ET  Opening Spike Assessment final call before the open           BEFORE
    16:15 ET  Close & Learn / Grading  grades the calls, updates OUTCOMES   AFTER

**So the deciding fact that no stored field records is simply known: three of the
four write before the session they describe. One writes after it.**

**And the one that writes after identifies "the session's five main momentum
leaders based on maximum gain through 4:00 PM."**

**R&D measured the contamination as 3.8× concentrated on MOVER-attached grading
versions, 76% of them CONFLICT.** The post-session task is the one that writes
about movers. **The shapes match.**

### Which is exactly when to stop and check the instance

**Three times in two days a seat here reached for a mechanism that was true
nearby and wrong about the case.** This one is more convincing than any of them,
**which is the reason to check it rather than the reason to believe it.**

**The check is one question in code: does `sheetPrior` read any field the 16:15
task writes?** It writes OUTCOMES and PATTERNS and preserves the earlier calls;
if the prior is read from TODAY or RESEARCH only, **the concentration has another
cause and the match was a coincidence of shape.**

**A mechanism that explains the class is not evidence about the instance** — filed
by Research a day earlier, violated by its author the same day, and now sitting in
front of the most plausible story anyone has produced this week.

### And the cheap path paid

Research declined to register a direction because **the field that would decide
the sign records a fetch time**, then asked whether anyone simply knew the fact.
**They did.** No replay could have recovered it, and it cost one question.

### And three of the four are retired — so the hindsight source is HISTORICAL

**Only the 22:00 after-hours task still runs.** The 06:10 confirmation, the 09:25
opening assessment and **the 16:15 grading task** have all been retired and
replaced by the desk.

**So the one writer that could produce hindsight no longer exists**, and the
surviving task writes **before** the session it describes. **There is no ongoing
contamination path — the question is entirely about a historical era.**

**Which turns S3's problem into a boundary question, not a validity one:** were
the 13 measured sessions **before** the 16:15 task was retired, **after** it, or
**across** the retirement?

- **All before** — the contamination is real for that measurement and the replay
  is the way to size it.
- **All after** — there was no hindsight writer and every prior is pre-session.
  **The replay answers a question that cannot have the feared answer.**
- **Across** — S3 pools two eras, **which is the exact error class its author has
  already made twice today** (10.5% across a live and a dead era, 19.8% across a
  working and a broken pipeline).

**Establish the retirement date before pricing anything.** It is one date, it is
known to someone, and it decides whether the replay is necessary, sufficient or
meaningless.

**The cheap question paid twice: the first answer named the mechanism, the second
removed it from the present tense.**

## THE CANDIDATE MECHANISM WAS KILLED BY READING THE CODE

**Research, 2026-09-07.** Integration named the 16:15 grading task as the likely
hindsight source — **3.8× concentration on movers, 76% conflict, and a task that
writes about "the session's five leaders by max gain."** The shapes matched.

**`toSheetPrior` reads `catalyst.latest`, `gradeRaw`, `structure.raw`,
`cycle.raw`, `warning.current`, `structure.floatRaw`. `MomentumTicker` carries no
outcome and no grade field at all.** The 16:15 task writes outcome and
pattern-learning records and preserves the earlier calls.

**So every column the desk reads as a prior is written at 22:00, 06:10 or 09:25 —
all before the session's move.** The best-looking story of the week, **checked
rather than believed, and wrong.**

**R&D's result stands exactly as stated:** the prior is present and disagreeing.
**It is not hindsight, and the replay is testing DEPENDENCE rather than
contamination.**

### Except for one path, and it is inside his own window

**The 09:25 task wrote DURING the momentum window.** His window is 07:00–10:00,
so **a 09:25 judgement has already seen 07:00–09:25** — the majority of the window
by clock time, and the move the name is scored on.

**A prior fetched after 09:25 is pre-move for the OPEN and post-move for two and a
quarter hours of the window it is scored against.**

**And `observedAt` is exactly the field that separates a pre-09:25 fetch from a
post-09:25 one.** It was the wrong field for the question it was doubted over and
**the right field for this one.** The replay partitions on it.

**A field dismissed for one question can be the discriminator for the next.**

## A REPLAY THAT READS THE LIVE SHEET APPLIES TONIGHT'S ROWS TO THIRTEEN PAST SESSIONS

**`TODAY` is rebuilt every night.** So a prior-bearing replay reading the live
sheet **would attach tonight's judgements to thirteen historical sessions** — a
contamination unrelated to anything measured, **which would look like a strong
prior effect and be invisible in the output.**

**Any prior-bearing arm must read the ARCHIVED tab for its session.** The
prior-free arm is safe by construction.

**A replay reconstructs the inputs, and the input most likely to have moved is
the one nobody thinks of as an input.**

### And the Why Not Report is a restoration, not an invention

**`AVOID` is already a priority value.** Chop Risk, Flush Risk, supply pressure
and Warning were all 09:25 fields. **The desk is rebuilding something the Sheet
did and the desk dropped**, which strengthens "this commissions nothing new"
considerably.

**It also bears on the held rendering question without answering it:** the old
system gave **a per-name verdict on every row** — a priority letter — rather than
silence on the quiet ones. **Evidence about what he is used to reading. Not an
answer, and explicitly not treated as one.**

### The kill is confirmed, and the finding it explained is still unexplained

**The desk reads `TODAY!A1:AA` and `RESEARCH!A1:AK` and nothing else.** Neither
carries an outcome column, a realised-gain column or a grade-of-prediction
column. **The 16:15 records are not in the parsed set.**

**So the shape-match was a coincidence of shape — and the 3.8× concentration and
76% CONFLICT remain unexplained.** Killing a mechanism does not close the finding
it was invented for, **and the temptation is to file both together.**

### Research narrowed its own 09:25 path immediately after sending it

`rows.ts` records, from a live measurement on 21 August, that **the 09:25
assessment is a SECOND TABLE on the TODAY tab** — and `TODAY_TABLE_SIGNATURE`
**exists to avoid matching it.** The desk reads the watchlist table and
deliberately not that one.

**So the partial-hindsight path survives only if 09:25 also edits the watchlist
rows** — which is the one question still with the trader.

### And it corrected its own replay hazard the same way

It had said any prior-bearing arm must read an archived tab, because `TODAY` is
rebuilt nightly. **`RESEARCH_COLUMNS[0]` is `Report Date`** — so RESEARCH rows
carry their own date and **can be scoped to a session on the live tab.** `TODAY`
has no date, so that half stands.

**A prior-bearing arm is feasible on RESEARCH and not on TODAY** — narrower than
the warning, and it matters because it means such an arm is not automatically off
the table.

### A boundary that can show itself in the data

The 16:15 retirement date decides whether S3 is necessary, meaningless or pooling
two eras. **It is also checkable without asking:** if `sheetProvenance` on
production's grading versions goes non-null before some date and null after,
**the boundary is visible in a durable append-only record** — and it can
corroborate or contradict whatever date is given.

**Ask AND verify.** The first answer that came back from asking has now failed its
own check; the second removed a whole class from the present tense. **Neither was
recoverable by measurement at any price, and one of them was wrong.**

## NO HINDSIGHT PATH EXISTS, AND THE CONTAMINATION FRAMING MAY HAVE BEEN BACKWARDS

**2026-09-07, from the trader, closing the last ambiguity.**

**The 09:25 pass did not rewrite the catalyst, cycle, structure, Dirty Float or
warning columns.** It added its own **separate 16-column section below the main
table** — opening-spike decision, must-hold level, invalidation, spread, supply
risk, plan. It refreshed the dated tab by **copying the completed working view**,
preserving the earlier calls exactly.

**And the reason is the part worth keeping: those assessments were preserved
deliberately so the 16:15 grading could compare the original calls against the
outcome WITHOUT HINDSIGHT.** The workflow was designed against the exact failure
we were hunting.

**So both paths are dead.** The 16:15 records are not in the parsed set — checked
in code. The 09:25 fields are a separate table the desk's own
`TODAY_TABLE_SIGNATURE` exists to avoid matching — and it does not touch the
columns the prior is read from anyway.

**Every column the desk reads as a prior was written before the session's move.**

### Which inverts what the open finding might mean

**The 3.8× concentration and 76% CONFLICT are still unexplained** — and they are
now a **pre-session human judgement that disagrees with the derived value,
concentrated on the names that go on to move.**

**That is not contamination. That is a candidate for the human being right.**

**Stated as a candidate and not a finding**, because three reached-for mechanisms
have failed their checks in two days and this one is attractive for the same
reason the last one was.

### And it raises the stake on the replay rather than lowering it

    edge collapses without the prior  -> the DESK is not producing the detection.
                                         The trader's own judgement is.
    edge survives                     -> the desk is.

**That is the retirement question in its sharpest form.** A Sheet whose human
judgement carries a detection cannot be retired by reproducing its columns —
**and no audit of what the desk "can produce" would have found that, because the
column exists and parses.**

## THE 09:25 RETIREMENT TOOK THE AVOID PRODUCT WITH IT

**Research, 2026-09-07.** The 09:25 opening-spike assessment carried **Chop Risk,
Flush Risk, supply pressure, the opening-spike decision, must-hold, invalidation
and spread/liquidity.** It was retired, and **the desk replaced it with something
that does not do that job.**

**So the Why Not Report is not a restoration of the `AVOID` priority value. It is
the restoration of an entire retired table** — and the 09:25 assessment *was* the
avoid-shaped product.

**Which reframes the two held tests.** They are not asking whether a new field
earns its place. **They are asking whether the replacement covers what was
retired** — a much easier question to answer honestly, and a much harder one to
wave through.

**Before building a capability, check whether the desk already had it and dropped
it.** The strongest argument for a piece of work is often that its absence was
created rather than inherited.

## THREE RETIREMENTS, NOT ONE — AND "ACROSS" IS NOW THE LIKELIEST STATE

Integration asked for **the 16:15 retirement date.** There were **three
retirements** — 06:10, 09:25 and 16:15 — **and nothing says they coincided.**

**So R&D's 13 sessions may span up to four regimes** of what wrote the sheet: all
three writers live, then two, then one, then none but 22:00. **Pooling across
them is the exact error class its author has made twice today.**

**A boundary question with one date is a check. With three it is a design
constraint**, and the answer decides which sessions can be pooled at all rather
than merely whether the measurement is contaminated.

### And the current era needs no partition at all

**TODAY rows are now written once at 22:00 and never touched again.** So a prior
fetched at any hour of the current session **is the 22:00 write — cleanly
pre-move, always.**

**The question `observedAt` could not answer has been dissolved rather than
measured.** No fetch-time partition is needed in the current regime; it is needed
only for the historical ones.

### Which changes the sentence a collapse would produce

    edge dies without the prior -> "THE DESK DEPENDS ON HIM"
                                   not "the detection was contaminated"

**A much less alarming finding and a truer one** — and it goes **with** the
result rather than after it.

## REMOVING THE PRIOR CHANGES THE POPULATION, NOT ONLY THE CONTENT

**Research, 2026-09-07, correcting an Integration design before it was approved.**

*"Edge collapses → his judgement is producing it; edge survives → the desk is"*
**assumes the only thing removing the prior changes is the prior's content.**

**It also changes the population.** The prior is on **29.2%** of mover-attached
versions and absent on **70.8%**. **A collapse in the POOLED edge is consistent
with the prior carrying the detection AND with the prior-bearing names simply
being different names.**

**So the replay must compare WITHIN the prior-bearing subset — the same names,
with and without.** A pooled before-and-after **cannot separate content from
composition.**

**Same class as the coverage span mismatch caught hours earlier**, arriving in the
design of the experiment meant to settle it.

## HAVING A PRIOR AT ALL IS A SELECTION, NOT A JUDGEMENT

**A candidate for the unexplained 3.8×, shipped with its own falsifier.**

**The Sheet only contains names he researched at 22:00 — names that were already
after-hours movers the night before.** If last night's after-hours movers are more
likely to be today's movers — **which is the entire premise of the 22:00 task** —
then mover-attached versions carry priors more often **for reasons that say
nothing about the prior's content.**

**The check that kills it:** compare the prior-attachment rate against the rate at
which **sheet-listed** names appear in each group. **If sheet membership explains
it, 3.8× is the base rate of the Sheet's own population and there is nothing to
explain.**

**Offered as a candidate with its falsifier attached, explicitly because it is
attractive for the same reason the last two were.**

## THE MEASUREMENT RAN DAILY FOR MONTHS AND WAS RETIRED

**The 16:15 task graded his calls against outcomes** — and he preserved the
earlier columns **specifically so it could do that without hindsight.**

**That is the measurement.** It ran every session, it was built for exactly the
question a thirteen-session model run was being proposed to answer, **and it
predates the replay by months.**

**And the replay answers something narrower** — whether the *desk's* detection
depends on him, not whether his judgement is right. **Both are worth having and
they are not the same question**, so the design must say which one it is buying.

**Third time in three hours that a question was cheaper than a measurement.**

### And one of the three boundary dates may already be in hand

**Ops harvested PATTERNS on 2026-09-05 and reported the tab stale at
2026-08-21.** That is a candidate boundary for the 16:15 retirement, **found
already, in data, by work done for an unrelated reason.**

**Before commissioning a search, check what the desk has already read for
something else.**

## AN ARRIVAL IS WRITTEN DOWN WHERE A DISAPPEARANCE IS NOT

**Research, 2026-09-07**, after establishing that `sheetProvenance` cannot show
the boundary it was proposed for — **the 22:00 task still writes the prior
columns, so provenance stays non-null through all four regimes.** Caught before
Ops ran it expecting a boundary, **an hour after its author wrote an entry about
doing exactly that with `queued_at` gaps.**

**The retired tasks were REPLACED BY THE DESK, and `desk_assessments` records
what arrived:**

    RTH_CLOSE                  replaces 16:15 Close & Learn      first 2026-08-17
    NEXT_DAY_RECAP             runs alongside 22:00              first 2026-08-17
    PREMARKET_0625/0645/0700   replaces 06:10 Confirmation       first 2026-08-18
    OPEN_SPIKE_ASSESSMENT      replaces 09:25 Opening Spike      first 2026-08-18

**One transition, inside two days** — where three separate retirements had been
feared. **Consistent across three independent stores.**

**When a boundary is invisible because something stopped, look for the thing that
started.** A system records what it began doing; it rarely records what it ceased.

### And the sample cannot straddle it

**The desk's own records begin 2026-08-17.** There is nothing earlier to replay.
08-17 to 09-04 is **fifteen** trading sessions, **so any thirteen sit at 08-19 or
later — entirely post-takeover.**

**R&D's sample is one era. The pooling risk does not bind** — settled from data
rather than from a date anyone had to remember.

**Which lands on the ALL AFTER branch**, and combined with the 16:15 task never
writing into the parsed columns, and with the trader's own answer that the calls
were preserved deliberately, **the feared answer is now excluded three
independent ways.**

### The bound, stated because it is not proof

**A desk type's first appearance dates when the DESK started, not when the SHEET
task stopped.** Parallel running or a gap are both consistent with it.

**Established: the replacements were all live by 2026-08-18. Not established:
that the sheet tasks ended then.** So the short list is **one confirmation, not
three dates** — did any of the three keep running alongside the desk after 08-18.

## AND THE CAPABILITY WAS REPLACED, NOT DROPPED

**Integration told the trader that what replaced the 09:25 assessment "does not do
that job."** `OPEN_SPIKE_ASSESSMENT` **is the replacement and has run 12 times on
production.**

**So the capability was not dropped. It was replaced — and whether the
replacement carries Chop Risk, Flush Risk and supply pressure is CHECKABLE
against what it actually emits.**

**That is a better version of the two held tests than "does the replacement cover
what was retired" asked in the abstract** — and it corrects an Integration
assertion that was made from the shape of the story rather than from the record.

### Confirmed from documentation: the sheet tasks ran in PARALLEL with the desk

**The trader asked Integration to confirm from the record, and the record has it.**

    2026-08-17/18   the desk's replacements first run
    ~2026-09-03     task 4 (16:15) retired — R&D's "do not delete the corpus"
                    condition is recorded against that retirement
    2026-09-05      LIVE STATE records "Retire the 06:10 ChatGPT task. Done"

**So the desk's arrival and the sheet tasks' departure are TWO AND A HALF WEEKS
APART, and Research's own bound was the right one:** a desk type's first
appearance dates when the **desk** started, not when the **sheet task** stopped.

**The 13 sessions — 08-19 to 09-04 — sit entirely inside the PARALLEL era**, with
all four sheet tasks and the desk running together. Research read "post-takeover"
as "current regime"; **it is post-takeover and pre-retirement, which is a third
thing.**

### Which matters in the opposite direction to the one feared

**The hindsight exclusion does not depend on this** — it was established
structurally: the 16:15 task never wrote into the parsed columns, and the 09:25
task did not rewrite the prior columns. **Those hold in any era.**

**What changes is transferability.** During the sample, priors could be written at
22:00 **or revised at 06:10** — both pre-move, both fine. **Today the 06:10 task
is gone and every prior is the 22:00 write.**

**So the sample is internally consistent and describes a regime that no longer
exists.** Any forward application of S3 to the current desk crosses a boundary —
**and it is a boundary in the SOURCE, not in the measurement, which is why no
amount of care inside the sample would have surfaced it.**

**A sample can be free of pooling and still be about a world that has ended.**

**And the half that makes it usable, from Research: it is a boundary in the
SOURCE rather than in the MEASUREMENT, so every internal consistency check
passes.** Homogeneity tests, era partitions, pooling checks — **all of them look
inside the sample, and the thing that invalidates it happened outside.**

**The author had written the bound that predicted this** — *"a desk type's first
appearance dates when the DESK started, not when the SHEET TASK stopped"* —
**called it not-proof, and then drew a conclusion that required it not to bind.**
Stating a limitation is not the same as carrying it into the next inference.

### Which makes the replay's value asymmetric, and that is worth knowing before paying

**Today's prior is a strict subset of the sample era's** — 22:00 only, no 06:10
revision — **so today's dependence is at most the sample's.** The two outcomes are
not equal purchases:

    edge SURVIVES without the prior -> DECISIVE for today. Today's prior is
                                       weaker still, so today cannot depend on it.
    edge COLLAPSES                  -> A BOUND, not a measurement. Today's
                                       dependence is AT MOST that.

**Full value for the result that would close the question, partial for the one
that would open it. If a collapse is the expected outcome, it buys less than its
price suggests.**

**Not an argument against running it — an argument for knowing which outcome you
are buying before you pay.**

### And the partition query turned out to be runnable, checked rather than assumed

`observedAt` was expected to be degenerate here: every prior fetched during a
session is post-06:10, so one bucket. **`worker/research.ts:203` says otherwise —
the 22:00 recap queues for the NEXT session, so the worker processes overnight
and priors are fetched between 22:00 and 06:10.**

    observedAt BEFORE 06:10 ET  -> definitely the 22:00 write, un-revised
    observedAt AT OR AFTER      -> possibly revised, and unknowable which

**Asymmetric and real — and it carries the discriminating question:** if the 3.8×
sits on pre-06:10 priors the effect is in the **surviving** task and the replay
transfers; if it sits on post-06:10 priors it may be the **retired** revision,
**and the replay prices a capability already lost.**

## A PROPOSED QUERY SHOULD ARRIVE WITH THE FIELD IT DEPENDS ON NAMED

**Research, 2026-09-07**, catching its own falsifier before it reached Ops.

The falsifier compares **prior-attachment** against **sheet membership**, and
needs the second measured **independently** of the first. **In the store it is
not: the only record that a name was on the sheet in a given session is
`sheetProvenance` itself** — the field whose concentration is being explained.

**And the obvious substitute fails on inspection.** `desk_assessment_tickers`
carries `cycle`, `catalyst` and `structure`, which *look* sheet-derived.
`desk-assessments.ts:275` fills them from the **desk's own research output** —
and **4,643 of 5,625 rows carry them, far too many for a watchlist. That is the
tell.**

**A query built on them would have returned a clean-looking answer about the
wrong thing, and it is exactly the query someone would reach for.**

### The rule, and it is better than "propose fewer queries"

**Second query in two hours proposed for a question it cannot answer** — one
caught by Integration, one by its author. **Both checked before running rather
than after, which is the only reason each cost a message instead of a window.**

**So: name the field a query depends on when proposing it, so the dependency can
be checked without running it.** Both of tonight's would have failed on sight —
**one needed a boundary in a field that never changes; the other needed a
membership record that does not exist.**

### What makes it runnable, and the limit stated first

**`RESEARCH_COLUMNS[0]` is `Report Date`.** The tickers with a row for a given
report date **are** sheet membership for that session — recorded **outside the
desk's store**, by the surviving 22:00 task, **independent of anything the desk
computed.** The desk already reads that tab.

**Limit, before it runs: a name can be on TODAY without a RESEARCH row**, so
RESEARCH membership is a **subset** — biasing the measured rate **down in both
groups.** **Usable for a comparison between groups; not usable as a population
count.**

**If sheet membership explains the 3.8×, the concentration is the base rate of
the Sheet's own population — and both the contamination reading and the
human-is-right reading dissolve together.**

## INSTRUMENTED AND NEVER EXERCISED IS INDISTINGUISHABLE FROM INSTRUMENTED AND PROVEN

**Ops validated the FIELDS instead of running the analyses, 2026-09-07:**

    sheetProvenance present    188 versions, 94 distinct tickers
    sheetPriorOmitted = 1        0
    sheetPriorOmitted = 0      903

    names with a prior             94
    names with a withheld version   0
    names with BOTH                 0

**The field is wired and written on 903 versions, every one false. A prior has
never been deliberately withheld in production.**

**So the within-subset constraint — the same names with and without — is
currently UNSATISFIABLE.** There is no withheld arm on stored data. **The replay
would have to CREATE one**, which is different work, a different cost and a
different approval than *"re-run interpretation over stored evidence"* implied.

### And the sharper half

**`sheetPriorOmitted = true` has never been written, so the code path that sets it
has never run in production.**

**It is not instrumented and proven. It is instrumented and never exercised — and
those are indistinguishable from a schema, from a grep, and from 903 populated
rows.** That is what the latch looked like across 2,870 in-band rows, and what
`secAvailable` looked like reporting configuration as reachability.

**So the replay's first run would also be the first exercise of its own arm
labelling — and a diff between arms is worthless if the labels are wrong.**

**Constraint added before pricing: a smoke run on a handful of names must confirm
`sheetPriorOmitted = 1` actually lands, before the thirteen-session spend.** Prove
a check can see a present case before believing its absence — **here the check is
"does the treatment arm have members", and today the answer is no.**

### A ceiling that belongs before the read, not after it

**Query 1's usable n is 94 NAMES, not 188 versions.** That bounds the falsifier
whatever the sheet says, **and it should meet a power floor BEFORE the sheet
read** — the same discipline that made the lead-time comparison report unpowered
rather than report a direction from eleven paired names.

### The annotation rule paid on its first outing

*"Name the field a query depends on, so the dependency can be checked without
running it"* was adopted two messages earlier. **Ops ran not one analysis and
killed a query's premise outright** — from the field names alone.

**And what it caught was a claim its author had made confidently enough to
declare the instrumentation question closed.**

## REUSE A FLOOR SET IN IGNORANCE RATHER THAN PICK ONE NOW

**Research, 2026-09-07**, after Integration pointed out that *"set the floor
against the n's when they arrive"* **is not a floor.**

**The ceiling is already known — 94 prior-bearing names. So any floor chosen
tonight would be chosen with the room above it in view**, which is threshold
selection with partial sight of the answer.

**So it reuses `n >= 20` in the smaller cell — the lead-time paired floor,
registered in a different line of work before any of this existed, for the same
reason.** A floor **set in ignorance of this data cannot be tuned to it.**

**Below 20: unpowered and nothing else.** No direction, no *"suggestive"*, no
ratio quoted with a caveat.

## A RATIO OF RATIOS HAS NO NATURAL DECISION POINT

**The tempting form** compares the prior-attachment ratio (3.8×) against the
sheet-membership ratio and calls it explained if they are close. **Every value
between 1 and 3.8 is arguable — which is how a null becomes a negotiation.**

**The clean form conditions on membership:** among names with a RESEARCH row for
that session, **is prior attachment still concentrated on movers?**

    vanishes within sheet-listed names -> SELECTION. Both readings dissolve.
    survives within sheet-listed names -> about the prior, not about membership.

**A within-stratum comparison has a decision point by construction** — the same
move as the within-subset constraint on the replay, for the same reason.

## EXERCISED CONSTANTLY WHERE IT COULD NOT FAIL, NEVER ONCE WHERE IT COULD

**The shape the week's three defects share, and it is the sharpest statement of
it yet:**

    the latch        looked healthy on 2,870 IN-BAND rows
    secAvailable     looked healthy on every CONFIGURED start
    sheetPriorOmitted looks healthy on 903 FALSE ones

**Each was exercised constantly in the population where it could not fail, and
never once in the one where it could.**

### And the smoke run is a test of the desk, not a precondition of the replay

**A treatment flag that has never labelled anything is a defect whether or not
the replay ever runs**, and proving the path works costs a handful of names
either way. **It stands on its own merits and does not wait on a decision about
the replay.**

### Two movements in one evening, from field validation and no analysis

**Expected value went DOWN** — full value only on the surviving-edge outcome —
**and price went UP**, from re-run to build. **The case is weaker on both sides
than it was at midnight, and not one measurement was run to establish that.**

## COUNT THE DISTINCT VALUES A FIELD HAS EVER TAKEN

**The general form of every defect this desk found in the week to 2026-09-07,
and it reduces to one query.**

| field | looked healthy on | never once |
| --- | --- | --- |
| `latched` | **2,870 in-band rows** | an out-of-band row surviving a restart |
| `secAvailable` | every configured start | an unreachable SEC |
| `sheetPriorOmitted` | **903 written rows, all `false`** | a single `true` |

**EACH WAS EXERCISED CONSTANTLY IN THE POPULATION WHERE IT COULD NOT FAIL AND
NEVER ONCE IN THE ONE WHERE IT COULD.** *(Named by Integration from Research's
line; filed because it is the shape rather than three incidents.)*

### Why none of them looked broken

**A populated row count is the evidence everyone reaches for, and it is
evidence about the wrong thing.** 903 rows is a field that is wired, reached,
written and covered by its callers. **It says nothing about whether the branch
that sets the other value has ever executed.**

**A schema cannot show it. A grep cannot show it. A test can pass on the path
that runs and never touch the one that does not.**

### The check, and it is one query

**FOR ANY FIELD LOAD-BEARING ENOUGH TO BE BELIEVED: `SELECT <field>, COUNT(1)
GROUP BY <field>`.**

**A boolean that has only ever been one value, or an enum that has only ever
taken one member, IS NOT A WORKING FIELD — IT IS AN UNTESTED PATH WEARING A
POPULATED COLUMN.** All three above return a single row from that query, and
all three were found by other means, at a cost of days.

**Run it before believing a field, not after doubting one.** The question is not
*is this populated* but **HAS THIS FIELD EVER SAID THE THING IT EXISTS TO SAY.**

*Corollary: this is the constructive half of "prove a check can see a present
case before believing its absence". That rule asks for a positive case to be
demonstrated; **this one finds, cheaply and in bulk, every place where none has
ever occurred.***

## HAS THIS FIELD EVER SAID THE THING IT EXISTS TO SAY?

**Research, 2026-09-07, turning the week's recurring defect into one query:**

    SELECT <field>, COUNT(1) GROUP BY <field>

**A boolean that has only ever been one value, or an enum that has only ever
taken one member, is not a working field. It is an untested path wearing a
populated column.**

    latched            healthy on 2,870 in-band rows   never an out-of-band survivor
    secAvailable       healthy on every configured start never an unreachable SEC
    sheetPriorOmitted  healthy on 903 written rows      never a single true

**All three return a single row from that query. All three were found by other
means, at a cost of days.**

**And the reason none of them looked broken:** a populated row count is **the
evidence everyone reaches for and it is evidence about the wrong thing.** 903 rows
proves a field is wired, reached, written and covered by its callers. **It says
nothing about whether the branch setting the other value has ever executed.**

**Run it before believing a field, not after doubting one.** The question is not
*"is this populated"* — it is **"has this field ever said the thing it exists to
say."**

**Filed as the constructive half of "prove a check can see a present case before
believing its absence":** that rule asks for one positive case to be
demonstrated. **This one finds, cheaply and in bulk, every place where none has
ever occurred.**

### And the narrower half of the floor rule, which is the applicable one

*"A floor set in ignorance of the data cannot be tuned to it"* is easy to agree
with and hard to apply. **The test is not whether you have seen the ANSWER — it is
whether you have seen anything that BOUNDS it.** Research had not seen the split
and had been told the ceiling was 94; **the ceiling alone is enough to make a
chosen number suspect.**

### The evening's accounting, stated plainly

**Cost: four messages. Saved: a build, a thirteen-session spend, and a week of
arguing about whether two ratios were close.**

**The same discipline killed a query of Research's, a query of Integration's, and
a mechanism Integration had already put in front of the trader** — all in one
evening, all before anything ran.

## THE SWEEP FOUND A DARK FEATURE ON ITS FIRST OUTING

**Ops, 2026-09-07, one query.** **`ticker_session.price_window` is NULL across all
143,142 rows.** It has a writer at `worker/runtime.ts:1846` and the upsert
COALESCEs it like its siblings. **The wiring is complete and the value is always
null.**

**Its sibling settles it** — both columns written by the same statement on the
same rows:

    trading_date   rows   activity_window   price_window
    2026-09-04     8772        7757              0

**7,757 sibling writes and zero price_window writes, through the same upsert.**
So `state.priceWindow` is always null while `state.activityWindow` is not — **the
series is never built in the runtime.**

**That is the board's price line with no data behind it**, shipped and rendering
nothing for two days.

**Limit stated: n = 1 session** — 09-04 is the only completed session since schema
25. **7,757 opportunities within one day, not a pattern across days.** Enough to
act on; not enough to call it a regression from something that once worked.

**And the row count was the trap exactly as predicted:** `activity_window` at
7,757 **is what "this pathway works" looks like — and it is a fact about the
neighbouring column.**

### What else it returned, unfiltered

    rvol_rank_change / ah_rank_change   ALWAYS 0, while RVOL_RANK_ENTRY payloads
                                        carry previousRank 13 against rank 12
    volume_base ALWAYS 0 · volume_base_through NEVER WRITTEN
    issuer_registry.ir_url NEVER WRITTEN, on 707 rows, while COMPANY_IR
                                        carries 299 EXACT-precision rows
    research_sources.active ALWAYS 1    nothing has ever been deactivated
    desk_assessments.failure NEVER WRITTEN — the error-enum-with-no-errors case

**`research_sources.active` independently confirms a finding from days earlier:
`deactivateSources` is exported, documented and has zero callers.** Two
instruments, arrived at separately, agreeing.

**And one structural result with a consequence:** `universe.tradable` is always 1
and `status` always `"active"`, **by construction** — the fetch filters to them.
**So the store cannot represent a name going inactive.** A delisted or renamed
symbol does not become inactive; **it simply stops appearing.** Given SGRX renamed
overnight and the desk ran a day on a stale universe, **that is a property worth
knowing rather than a defect.**

### The exclusion, stated because it will otherwise be quoted as complete

**`id`, timestamps, symbols, URLs, hashes and payload blobs were excluded by
name.** So the sweep **is not exhaustive**, and a single-valued column with one of
those names would not appear.

## THE SIBLING CONTRAST DOES NOT DISCRIMINATE, AND THE COLUMN DOES NOT SETTLE THE SCREEN

**Design, 2026-09-07**, on the sweep's headline finding. **Two corrections, both
load-bearing.**

### A null column does not establish that the feature never rendered

`priceWindow` reaches the row by **two** paths: `repo.ts:556` parses the column
Ops swept, and **`engine.ts:1837` serves `runtime.priceWindow` LIVE, without
touching the store.**

**So a column null on all 143,142 rows does not establish that the dots never
drew.** The live board can serve the series straight from the runtime **while
persistence fails silently.** Persistence and rendering are two questions and the
sweep answers one.

**Integration reported the stronger claim to the trader. It was not established.**

### And the sibling contrast is consistent with both explanations

**The two fields fail differently on the same absence.** `activityWindow` is
`slots.map(slot => minuteTrades.get(slot) ?? 0)` and is stored whenever the array
is non-empty — **so it is written even when no bar landed in the window.**
`priceWindow` returns **null** unless at least one slot has a close.

**So "7,757 activity writes, zero price writes" is exactly what NO BARS IN THE
WINDOW would also produce.** The contrast is consistent with a write failure
**and** with nothing having traded in those windows, **and it does not separate
them.**

**The measurement that can fail: are those 7,757 activity windows all zeros?**
Real counts mean bars landed and the price path is broken. **Zeros mean nothing
landed and both fields are behaving correctly.**

**Start from a measurement that can fail rather than from a contrast that
cannot** — the sweep's own principle, turned on the sweep's own result.

### And the obvious mechanism was checked and excluded

`minuteCloses.set` is **unconditional** at `engine.ts:935`, immediately beside the
guarded `minuteTrades.set`. **Both are written on every bar. So the asymmetry is
not a missing write in that block.**

### Refusing to answer from memory

Asked whether the dots have ever drawn, Design checked and **said it cannot
tell** — the 09-04 read looked at other fields, and the 09-06 read had **zero
demand rows** because the market was shut, **so its "priceWindow: 0" count is
uninformative rather than negative.**

**An uninformative observation reported as uninformative** is worth more than a
reasoned answer, **and Tuesday settles it with rows present.**

## THE CHECK COULD HAVE COME BACK BENIGN AND DID NOT

    windows stored on 2026-09-04                 7757
      of which a bar actually landed (non-zero)  2369
      of those, price_window stored                 0

**5,388 of the 7,757 are genuinely all-zero** — the population that would have
dissolved the finding, **real and large.** Two independent methods agree on
2,369: `json_each` over the array, and a `GLOB '*[1-9]*'` text scan **sharing no
code path with the JSON parser.**

**A discriminating measurement is only worth running if its benign branch is
populated. This one's was, by a factor of two, and the defect survived anyway.**

### And the first attempt reported the opposite, from a failed check

`json_extract(j,'$.counts')` against a **bare array** — `[3,6,0,11,0]` — returned
NULL, so the EXISTS was false for every row. **It printed
`with_a_nonzero_count: 0`, which reads exactly like "all zeros, no defect, stand
down."**

**The sample rows two lines above in the same output contained 3, 6 and 11.**

**Caught by its own author, immediately** — the first time that happened all
evening — **and only because the sample and the aggregate were in the same
block.** **Printing the raw shape beside the aggregate is what made it
self-refuting.**

## THE TWO PATHS ARE ONE FIELD, SO THE RETRACTION WAS OVER-CAUTIOUS

    engine.ts:1155     runtime.priceWindow = buildPriceWindow(...)    <- one assignment
    engine.ts:1837     priceWindow: runtime.priceWindow ?? undefined  <- live serve
    worker/runtime.ts  price_window: state.priceWindow                <- store write

**Both consumers read the same field, set in one place.** A column null across
**2,369 rows where bars landed** means `runtime.priceWindow` was null at every
flush — **so the live serve returned undefined at those same moments.**

**The line has been dark. Integration's retraction of that claim is itself
withdrawn**, and what remains unestablished is only the exact overlap in time
between flushes and serves — **there is no path by which one is populated and the
other is not.**

**Independence has to be shown, not assumed from two call sites.**

### A candidate mechanism, and the comment above it forbids what the code does

    runtime.activityWindow = activity.window.length > 0 ? activity.window : null;
    runtime.priceWindow = buildPriceWindow(
      runtime.minuteCloses,
      windowSlots(this.now(), DEFAULT_ACTIVITY_CONFIG),   // <- rebuilt, DEFAULT config
    );

**The activity series uses the engine's own configured slots. The price series
REBUILDS them from the default.** If the live config differs, the slot sets do not
line up, `minuteCloses` is keyed by the engine's slots, and `buildPriceWindow`
finds no close in any slot it asks for — **returning null on exactly the rows
where bars landed.**

**And the comment directly above says `windowSlots` is exported rather than
rebuilt so the two series cannot disagree. The code rebuilds it.**

**Third time this week a comment states the invariant its own code breaks.**

### And the rank deltas are a wrong interval, not a broken write

`previousRanks` persists across cycles and updates every tick, **so the stored
delta is rank movement since the previous engine TICK** — structurally ~always 0.
**Not a failed write. A meaningless interval, faithfully recorded.**

## §5c — THE BUS WAS THE BOTTLENECK. NEW PROTOCOL, 2026-09-07.

**The trader: "there seems to be some breakdown in communication between threads
and you. solve it. it's preventing progress."** He is right, and the diagnosis is
structural rather than behavioural.

**Integration made itself mandatory.** Every fact passed through one seat that was
also ruling, recording and reporting. The costs, all observed this weekend:

- **R&D could not message Integration at all, for days.** The messaging tool is
  deferred; it never knew it existed. Invisible because its work kept appearing
  in git and Integration read around the gap.
- **Five crossed messages in one evening**, both seats declaring state. A crossing
  cost a round trip before state-declaration and a paragraph after.
- **Findings reached the trader at the speed they arrived**, so one coverage
  number was given to him three times in a day.
- **Ops → Research and Research → Design happened only when Integration carried
  them.** Latency on every cross-thread fact.
- **Integration's own messages ran 600+ words and every thread matched the
  register**, which the one-line-ping rule has never survived.

### The four changes

**1. FACTS GO DIRECT. DECISIONS COME TO INTEGRATION.**
A measurement, a defect, a sha, a correction to another thread's number — **send
it to that thread yourself.** Copy Integration only if it changes a ruling.
**Anything that competes for the trader's answer still routes through
Integration**, because only that seat can see what is already in front of him.

**2. THE REPO IS THE STATE. MESSAGES POINT AT IT.**
Land the finding in your charter or the shared rules **first**, then send a
message naming the sha. **A stale message is then detectable against an
authoritative file** rather than against someone's memory. This is what makes
crossings cheap instead of confusing.

**3. EVERY MESSAGE CARRIES: sha · what changed · what you need. In that order.**
If it needs a paragraph, the paragraph goes in the file and the message names it.
**Integration sets the register and has been setting it wrong all weekend.**

**4. PROVE THE CHANNEL, THEN CHECK IT.**
Every thread confirms once that it can reach Integration **and** at least one
other thread. Integration runs `list_sessions` and reads `git log` on a schedule
rather than waiting — **a thread that has never sent a message is not a thread
with nothing to say.**

**The failure that made this necessary was not any thread's. It was one seat
insisting on being in the middle of a system that does not need a middle for
facts.**

### Amended within the hour, by a thread correcting the diagnosis

**Research: "you made yourself mandatory — and I sent you things that were never
yours to carry."** Every query handed to Integration for Ops was **a fact with a
destination**, routed through the bus because it was there, not because it needed
a ruling. **The bus was mandatory partly because three threads kept feeding it.**

**Its own rule: if you catch yourself writing "tell Ops that", it was never a
message to Integration.**

### And the failure mode of the new protocol, named before it happens

**A fact going direct to the one thread that needs it and nowhere else — which is
privacy wearing efficiency.**

**Every correction that worked this weekend was caught by a second seat within
the hour, and not one was caught by its author.** A caveat reasoned past, a
max-versus-counts misread, a re-sourcing that re-sourced a constant, two
unrunnable queries. **Direct routing makes that more likely only if facts still
land somewhere a second seat reads them.**

**So rule 3 is the enforcement of rule 2, and they are one mechanism:** a message
carries a sha, **and you cannot name a sha for something you have not landed.**
**A message without a sha is not a report** — it is a private fact with a
recipient.

**Plus one independent check: Integration reads `git log` on a schedule.** That
catches what landed regardless of who was messaged, **and it is the mechanism that
found R&D's work for days while the channel was dead.**

**This is the half of §5c that costs an extra step at 3am, so it is the half that
will erode. Guard it hardest.**


## THE MARKER IS CORRECT AND DOES NOT CATCH THIS

**Ops, 2026-09-07, after deploying `c84e0df` at 01:59 ET.**

**The universe will be ~37 hours old at Tuesday's premarket, with nothing
scheduled to refresh it.** The trading date is already 09-08, so **no roll fires
before the session**; the next is Tuesday 22:00, *after* it. And `ensureUniverse`
is reached **only from bootstrap** — `worker/baseline.ts` calls it and is not a
unit.

**The freshness marker reads FRESH throughout, and it is right.** It asks whether
the universe was refreshed **since the session was established** — Saturday's roll
— not whether it was refreshed **recently.** Both are true and only one is the
question a trader has at 07:00.

**A field can be correct on its own definition and silent on the failure it was
built to prevent.** SGRX renamed overnight and cost a day; a 37-hour-old universe
is that failure with a longer fuse, **and the instrument built after it does not
fire.**

### And it is not a one-off — it is every holiday

**The universe refreshes at a roll or at a restart, and a holiday means no roll.**
So **every long weekend produces a stale universe on the next session** unless
somebody restarts a worker for unrelated reasons. Thanksgiving, Christmas, every
Monday holiday. **Nothing announces it and the marker says FRESH.**

### The latch check could not fire, and that was reported rather than passed

`wiped 0 / out_of_band_surviving 0` on 09-08 — **no session yet, so nothing was at
risk.** The same query returns **45** for 09-04.

**Reported as NOT VERIFIED rather than as a pass**, which is the denominator rule
holding on its first real outing: **a zero means nothing without the count of
cases it could have failed on.**

## FOR SIX WEEKS, A NULL AND A REAL NEGATIVE ARE THE SAME RESULT

**R&D, 2026-09-07, naming a risk it had never been asked for.**

**The archive spans 13 sessions, and at n=13 the smallest detectable correlation
is 0.553.** So an effect of **0.45 — large enough to make a genuinely useful
dial — is invisible and reports as a null.**

**That is not a fact about Q13. It is true of every session-level question this
desk will ask until roughly mid-October**, and it means **a run of nulls between
now and then is indistinguishable from a run of real negatives.**

**Capture already runs, so the fix is only patience.** The cost of not knowing it
is retiring good questions one null at a time, **each retirement looking like
evidence.**

**Somebody should decide knowingly to wait rather than discovering the constraint
once per question.**

### And a list of work is not a list of risks

Asked what was outstanding, R&D gave a complete list of **work** — and then,
asked again, produced three risks **worth more than anything left in its queue.**

**"What are you working on" and "what should I be worried about" are different
questions, and only the first gets answered by a queue.**

### The dead store is still in the working directory

`data/market.db` stops at **2026-08-18** — bars, sessions, events, assessments,
research, all of it. **`archive.db` spans 13 sessions and `market.db` spans two,
and nothing about either filename says so.**

**The trap is not that someone fell in it. It is that the file is still there,
looks current, and the next thread to open it will make the same join** — which
already cost three retracted figures.

**A README beside it names it. A file opened directly does not read its
neighbour.**

## TWO THREADS ARRIVING AT THE SAME BEHAVIOUR MUST LAND AS ONE MESSAGE

**Coaching, 2026-09-07, raising a reconciliation nobody had asked for.**

**The Why Not Report and the coaching seat now point at the same behaviour from
opposite ends** — one says *do not chase this name*, the other says *the marginal
trade is where it goes.* **Same finding, two grains.**

**"The product telling him what not to chase and the coaching telling him he
traded too much are the same message arriving twice. That is good if it lands as
one idea and bad if it lands as two people telling him he trades badly."**

**He has had two sessions inside his own rules and was visibly proud of the
second.** So the framing is not incidental: **the desk is catching up to a change
he has already made**, not correcting a habit he still has. **That is true, and it
is the only version that is both accurate and usable.**

**Owning the framing before both halves ship is Integration's**, because it is the
seam and nobody else can see both. **A reconciliation raised by the thread that
would benefit from being loudest is worth taking seriously.**

### And two refusals worth recording

**Coaching declined to propose a trade-count ceiling** — the exact best cap on six
days is overfitting, **and the honest finding is the shape, not the number.** It
named that the number is his.

**And it declined to build toward measuring refused trades**, because the marginal
curve reaches the same behaviour **from data that already exists**, without asking
him to log anything mid-session. **A measurement that requires the trader to work
during the window is a cost on the thing being measured.**

**Figures deliberately absent from this file.** They are his fills, and P&L
belongs in report output rather than in the repository.

## THE WORST CASE WAS AN UNREACHABLE CORNER, AND I ASSUMED THE ASYMMETRY THAT MADE IT WORST

**R&D, 2026-09-07, retracting the sentence the whole S3 line was sequenced on.**

*"The band spans zero, therefore the detection is not robust"* — **wrong.**

    constraining contamination to lift the positive rate by the SAME multiple
    in both cohorts, the clean gap reaches zero only at m = 9.51

      m=2.0 -> +9.5pp      m=5.0 -> +2.8pp      m=9.51 -> 0.0pp

**The published corner required all 51 positive movers inside the 52 contaminated
ones — a margin of ONE ROW — plus contamination maximally predictive in movers
and exactly zero in non-movers.** That asymmetry **was assumed to make the worst
case worst. It was never measured.**

**The effect is attenuated under adverse assumptions and ROBUST IN SIGN.**

**A worst case built from assumptions chosen for their severity is not a bound.
It is a construction**, and it will be quoted as a bound by everyone downstream —
including the seat that built it.

### So the replay is dead, and not because it was too expensive

Combined with **no treatment arm existing**, **the sample being a retired era**,
and **hindsight excluded three independent ways** — **the build is not answering
the question that prompted it, because the question was not real.**

**Four independent findings, none of them a measurement of the thing itself, and
the largest proposed spend on this desk dissolved.**

### What is still live is smaller and cheaper

**Selection versus accuracy: does prior presence track what was knowable at the
22:00 write, or the outcome?** No withheld arm needed.

**And two group-bys first, neither requested:** versions-per-name split by whether
the name ever carried provenance — **if CONFLICT drives escalation, contaminated
names generate more versions and the 3.8× is partly a counting artefact** — and
how the 20 both-cohort versions split. **The first could take 3.8× down before
anything else matters.**

## THE CROSS-CHECK COST ITS SUBJECT A RESULT WITHIN THE HOUR

The arrangement — Research reads R&D's **denominators, spans and floors, not its
direction or conclusions** — **worked on first use and killed R&D's best-known
result.**

**And R&D had recorded the per-version/per-name mismatch itself and moved on**,
logging twenty double-counted rows as a caveat rather than a defect.
**Recognising the shape and following it are different things**, and the first is
what a single seat reliably manages.

### Why the second seat works, and it is not that it knows more

**Research, on the arrangement that killed R&D's best-known result on its first
use:**

**"It is not that a second seat knows more — it arrives without the reason the
first seat had for stopping."**

R&D **had recorded the per-version/per-name mismatch itself** and moved on, and
logged twenty double-counted rows **as a caveat rather than a defect.** Both were
seen. **Neither was followed**, because the seat that saw them also held the
reason they seemed acceptable.

**A checker with no stake in the conclusion inherits none of the reasons to stop
looking.** That is the whole mechanism, and it is why the check has to be read by
someone who did not do the work — **not by someone who knows the subject better.**

### A rename leaves a row to be wrong. A new listing leaves nothing.

**Ops, sharpening the stale-universe case, 2026-09-07.**

The rename argument: a name that renamed since Sunday **is stale in the
universe.** The stronger one: **a name that LISTED since Sunday is not in the
universe at all.**

**Not mis-ranked. Invisible.** No row, so nothing to track, rank, qualify or
research — **and no marker anywhere reads FRESH or otherwise about a symbol that
was never fetched.**

**A wrong row can be detected. An absent row cannot**, because every instrument
that would report on it is keyed by the thing that is missing.

**And Research handed back the half that was not Ops's:** `isEligible` fails open,
so **a stale universe cannot cost a name a research job.** The exposure is
narrower than it looked and **the part that survives is the part with no detector
at all.**

## THE MATCHER DOES NOT NEED THE VOCABULARY IF IT FAILS THE RIGHT WAY

**2026-09-07.** Research asked R&D for the distinct UNCLASSIFIED `Float Quality`
cell values, to widen `floatQualityState` without guessing. **R&D declined and
Research declined to take the exception for itself** — sheet cell **text** is
content rather than a rate, and *"'probably fine' is how the first bad exception
gets taken."*

**Both refusals were right and the request is unnecessary.**

**A false `DIRTY_FLOAT` costs him a trade he should have taken. So the failure
direction is the defect, not the missing vocabulary:** an unrecognised string must
resolve to **UNKNOWN, never to the avoid.** `isEligible` already does exactly this
— `UNKNOWN` is an eligible class and a null coalesces to it, **so a lagging
classification cannot cost a name a job.**

**Fix the direction and the vocabulary stops mattering.** No content moves, no
exception is taken, and the matcher is correct against strings nobody has seen
yet — **including ones written after today.**

**A request for data to make a matcher exhaustive is usually a request to avoid
choosing a safe default.**

## RULE 3 IS ABOUT FINDINGS, NOT ABOUT REPLIES

**R&D, correcting §5c before it hardened.** Research had called its own sha-less
message *"a private fact with a recipient."*

**"On that message it was the right call and the rule should not eat it. You were
sending a READ OF MY NUMBERS — there was nothing to land, and inventing a commit
so the message could carry a sha would have been worse."**

**A finding lands, then travels. A read of someone else's numbers has nothing of
its own to land** until it turns out to be durable — **right afterwards, not
required beforehand.**

**So: findings carry a sha. Reads, objections and acknowledgements do not.**
Amended before somebody manufactures a commit to satisfy the form — **which is
the failure mode of every rule that mistakes its own artefact for its purpose.**

### And Coaching's curve moves a registered test

Research had required objections to **concentrate on the biggest in-window runs.**
**The money is in the marginal trade, not the big mover** — so a report perfectly
targeted at large movers **could miss every loss.**

**Not wrong, and not sufficient. And nothing on the tape side could have shown
it** — it took a seat holding the fills.

**The product's real test is now Coaching's and needs no model spend:** split the
marginal-trade curve by **whether the desk held an objection-shaped signal for
that name at that time.** Late losses in objected-to names means the report has
leverage. **Late losses in un-objected names means the problem is volume and the
report cannot help.**

## THE SECOND LINE ARRIVED FROM SELECTION RATHER THAN FROM VOLUME

**Coaching, 2026-09-07**, joining the trader's fills to
`desk_assessment_tickers.structure` — the split Research asked for, run by the
only seat that can see both.

**He selects into the desk's objection-flagged names at roughly three times the
rate the board offers them, and into clean names at about a quarter of it** —
measured per name-day **against the board's own mix on the same days**, so it is
not a description of small-caps. **Late trades concentrate in the flagged names.**

**That is the second independent line for the avoid framing, and it is a
different one.** The first was **volume** — the marginal trade turning negative.
This is **selection** — which names get chosen at all.

**And it changes what the Why Not Report is aimed at.** Not a filter over an
undifferentiated board: **a counterweight to a measured pull toward the names the
desk already objects to.**

**Three caveats and one alternative explanation Coaching could not rule out went
to Research directly**, with a request to check it — **the obvious confound being
that flagged names may simply move more, which the board-mix control does not
address.**

**Two lines converging is the reason to weight it. One of them being about
selection rather than discipline is the reason it is usable** — *"you are drawn to
these names"* is actionable in a way *"you trade too much"* is not.

**Figures deliberately absent.** They are his fills.

## THE PRODUCT'S PRECONDITION WAS A WHOLE-DAY MEASURE, AND AT THE MOMENT HE TRADES IT IS 33%

**Research, 2026-09-07.** *"93% of his trips are in names the desk assessed that
day"* was the stated precondition for building the Why Not Report at all. **It was
a whole-day measure. Coaching withdrew it.**

    on the board right then                 33%
    board found it later that day           41%
    before the day's first board            22%
    never on the board that day              3%

**The 22% is probably snapshot timing** — assessments begin at PREMARKET_0625
while ranking starts at 04:00, first `RVOL_RANK_ENTRY` landing at 04:00:00 exactly
on three of five sessions. **Re-run pending against the right instrument, no
direction predicted.**

**The 41% is probably real and it is not new.** Research is queued on rank ≤ 12,
**so the report's reach is the board's width.** That is *"20 of 53 never
researched"* **measured from the fills side for the first time.** He is not
trading outside the universe — **he is trading ahead of the ranking.**

### And the fact that should decide the scope

**On his two most disciplined sessions — the two smallest days, the only two
inside his own rules — the board held one of the names he traded, and then none.**

**The report would have had nothing to say on the two days he traded best.**

**A report that speaks about a third of his trades and nothing at all on his best
days is a different product from the one that was approved**, and saying so
before the renderer is the whole of the discipline.

## EVERY IMPROVEMENT SHRANK IT, WHICH IS THE SIGNATURE

**Coaching withdrew the selection finding entirely.** 2.83× → 2.13× → 1.73× →
1.36×/1.61× point-in-time matched. **Every methodological improvement shrank it**,
which is **the signature of a confounded result rather than a real one.**

**Withdrawn, not downgraded — and the reasoning is the part to keep: a downgraded
1.4× survives in a summary as "he leans toward flagged names, weakly" and gets
quoted for months.**

**A finding that only survives by being softened has already failed.**

### What survives, and it needed no instrument at all

**79% of his name-days sit in the board's top move-size quartile. 10% below the
median.** No classifier, no stratification, no matching, no collider.

**He trades almost exclusively the biggest movers on the board** — the only thing
from either seat that came through the night intact.

### The deciding fact was half unmeasured, and it reached the trader

**Research, correcting itself within the hour.** *"The board held none of the
names he traded on 09-03"* — **the assessment snapshot ends on 09-02 and contains
no 09-03 at all.**

    assessments-prod-2026-09-02.db
      dates              2026-08-17 .. 2026-09-02
      rows on 2026-09-03  0

**So "the board held none" is the store holding no board.** And on 09-02 the
board **did** hold one of the names; whether before his first fill is
**unresolved.**

**One day unresolved, one day unmeasured. Not two days with nothing to say.**

**Absence of detection read as detection of absence, one more time** — and it
reached Integration and then the trader **because a relay did not check the
store's date range, which was one query.**

**Coaching had marked its other buckets provisional and kept this one back as
instrument-independent**, on the correct ground that whole-day membership removes
the **timing** dependency. **It does. It leaves the COVERAGE dependency
untouched.**

### What survives is structural and needs none of the disputed numbers

**Research is queued on rank ≤ 12, so the report's reach is the board's width —
and he trades AHEAD of the ranking rather than outside the universe.** That is
*"20 of 53 never researched"* seen from the fills side.

**Rule on the structural argument, not on a two-session anecdote nobody could
support.**

## A TRUE NUMBER CARRIED IN THE WRONG REGISTER IS NOT NEUTRAL

The 79% top-quartile figure was relayed three times **as a bare fact inside a
discussion about defects.** Coaching flagged that it is **descriptive, and may be
the most favourable thing in the entire record about his selection** — the names
he picks turn out to be the day's biggest movers.

**A finding does not carry its own tone. It inherits the tone of the message it
travels in**, and a compliment delivered inside a list of failures reads as
neither.

## A JOIN ACROSS TWO REFRESH CADENCES PRODUCES CONFIDENT ZEROS, AND THE BOUNDARY MOVES

**Coaching and Research, 2026-09-07.** Coaching holds his fills, which advance
every session. The desk-side extracts are snapshots, pulled once.

**A join between them returned "the board held none of the names he traded that
day". THE STORE WAS `assessments-prod-2026-09-02.db` AND THE DAY WAS 09-03.**
Zero assessments, zero ticker rows, **and the answer written in the filename**.

### Why it got through two careful readers

**The query returned a zero rather than an error.** A missing date is
indistinguishable from an empty result: same type, same shape, no exception, and
**the zero arrives looking like a measurement.**

**And the reading was careful about the wrong dependency.** The claim had been
deliberately reduced to WHOLE-DAY membership to remove the snapshot-TIMING
problem — which it does. **It leaves the COVERAGE problem untouched, and being
careful about one dependency is what stopped either of us looking for the
other.**

### IT IS A STANDING HAZARD, NOT AN INCIDENT, AND THAT IS COACHING'S POINT

**THE LIVE SIDE ADVANCES AND THE EXTRACT DOES NOT. So the gap grows every
session, the boundary moves, and the join keeps producing confident zeros —
more of them each week, all in the same direction.**

**Every one reads as "the desk did not have it".** A failure that is silent,
directional and self-renewing.

### The check, and it belongs in the output rather than in a habit

**ESTABLISH THE OVERLAP WINDOW OF BOTH SOURCES FIRST, AND REPORT ONLY INSIDE
IT.** One line: *what is the min and max date each side actually holds.*

**Better, because a habit is what failed here: MAKE THE INSTRUMENT PRINT ITS OWN
COVERAGE WINDOW ALONGSIDE ITS RESULTS**, so a zero outside the range is visibly
out of range rather than silently absent. *(`worker/catalyst-timing.ts` and
`worker/trigger-lead-time.ts` print their inputs and row counts for exactly this
reason — this is the general case of that.)*

### And it is the temporal half of a rule already here

**`data/README.md` says ASK WHICH DESK WROTE IT before quoting a number. This is
ASK WHICH WINDOW IT COVERS.** Same failure, different axis: **a store that
answers is not a store that answers for the right desk — or for the right
dates.**

## THE BEFORE-07:00 SPLIT IS RVOL-ONLY, AND GAIN WAS NEVER MEASURED THERE

**The trader, 2026-09-07: "is this 'most' based on RVOL or gain? Gain would be
most relevant. RVOL is important, but gain is where the money is made. When the
price goes up is when you have the opportunity to trade."**

**RVOL only.** The 29-of-54 and 31-of-45 splits are `RVOL_RANK_ENTRY` events read
from `desk_events` — the desk's own recorded trigger.

**The gain side has never been measured in that window, and not because nobody
looked.** There is **no gain ranking** — no entry event, no rank column, only
`percent_change`, which overwrites. **The gain trigger had to be reconstructed
from bar closes, and the reconstruction only existed inside 07:00–10:00.**

**So "most of it happens before 07:00" is a statement about volume arriving, and
the quantity he actually trades on was never in the measurement.**

**A name can carry heavy premarket volume and go nowhere. RVOL rising is
participation; gain rising is the opportunity.** They are not interchangeable and
the desk has only ever measured the first one early.

**When a claim is made about "the trigger", ask which trigger. The desk has one
that is recorded and one that has to be rebuilt, and only the recorded one can be
measured outside the window.**

## THE ASYMMETRY DOES NOT TRAVEL WITH THIS RESULT — IT PRODUCES IT

**Research, 2026-09-07**, answering whether the gain field can be rebuilt from
04:00. **Yes, cheaply — the window was a choice in its own code, two lines, not a
data limit.** And it declined to use the result.

                            at 05:00      at 08:00
    RVOL — the desk's REAL field   ~12 names      large
    GAIN — the RECONSTRUCTED field  ~206 names    ~1,000

**A larger field is harder to enter, so gain fires later. A field of twelve
admits almost anyone, so RVOL fires easily.**

**So a pre-07:00 comparison is biased toward "RVOL fires earlier" — which is
exactly the conclusion it would be cited for.** In-window the asymmetry is modest
because both fields are large; **that is why the 07:00–10:00 comparison was worth
running and this one is not.**

**A caveat that travels with a result weakens it. A caveat that PRODUCES the
result invalidates it** — and the distinction is whether the bias points at the
conclusion or away from it.

### And it cannot be fixed, which is the answer

**The desk's real early field is unrecoverable** — the engine promotes symbols as
it first sees them and that history is recorded nowhere.

**So the trader's question exposes a CAPTURE gap rather than a MEASUREMENT gap.**
There is no gain ranking, there never was, and **the pre-07:00 question cannot be
answered fairly with what is kept.**

**A recorded gain-rank entry event, symmetric with `RVOL_RANK_ENTRY`, would make
it answerable from the next session onward** — and **no amount of reconstruction
makes the sessions already gone comparable.**

**When a question cannot be answered fairly, the useful output is what would have
to be recorded for it to become answerable — not a number built the only way that
remains.**

## A LATE RESTART IS WORSE THAN NO RESTART

**Ops, 2026-09-07**, arming the universe-refresh task after the trader ruled
Tuesday pre-premarket rather than late Monday.

**03:15 ET rather than "pre-premarket" literally** — the desk captures from 04:00,
so a restart at 05:30 would be **inside capture**, dropping the SIP connection
during premarket accumulation **on the session it exists to protect.** 03:15 is
before capture, ~3.75h before his window, and the universe still clears the 20h
guard.

**And the task aborts unless the SERVER clock reads 2026-09-08 and before 04:00
ET.** A scheduled task runs on **next app launch** if the app was closed when due
— **for a read that is a late report; for a restart it would put a production
restart inside the trading session.**

**The guard is written into the task rather than assumed.** A deferred read is
merely stale. **A deferred action can be catastrophic**, and the same scheduler
delivers both.

### And silence is not success

**Both tasks run only while the app is open, and neither failure announces
itself.** **If no report appears Tuesday, assume neither ran.**

**The denominator rule, pointed at task execution:** an absent report and a
successful quiet run are indistinguishable **unless one of them is required to
speak.**

## A SYMMETRIC EVENT OVER AN ASYMMETRIC FIELD REPRODUCES THE BIAS IN A NEW COLUMN

**Ops, on the queued gain-rank entry event** and why the third scoping condition
is the one that bites.

**Recording a gain-rank entry does not make gain and RVOL comparable.** If the
gain ranking is computed over a wider field than the promoted one RVOL uses,
**the same "a field of twelve admits almost anyone" bias is simply written down**
— and a recorded number **looks measured in a way a reconstruction never does.**

**Building the instrument is not the fix. Settling what field it measures against
is.** The event would otherwise **launder the asymmetry into the record**, where
it becomes much harder to see and much easier to quote.

## STANDING: DO NOT WIDEN THE ALPACA SURFACE

**From Commercial's Gate 0 landscape, 2026-09-07.** **Alpaca publishes no
redistribution path** — not expensive, absent. So **a vendor migration is the one
certain item in the monetization plan**, whenever compliance is pursued.

**Both published routes with display rights — Massive and Databento — are a
rebuild of `lib/market/alpaca/`.** One layer, bounded **today.**

**So, binding on every thread touching market code:**

- **New vendor-specific behaviour goes behind the existing client interface**, not
  beside it. If a change needs an Alpaca concept above `lib/market/alpaca/`, that
  is the moment to say so rather than the moment to do it.
- **Derived fields stay derived.** RVOL, rank and volume-derived values are
  computed from bars we already hold and **are not fee-liable under UTP.**
  Anything that starts reading vendor-shaped price or quote structures higher up
  moves work across the licence line **and across the migration line at once.**

**Nobody is switching vendors today. This costs nothing and it is the only thing
available before there are users that reduces the price of compliance later.**

**A migration that is certain and undated is the one everybody widens the surface
against.**

### The boundary was already crossed, and the inventory is the deliverable

**Ops, 2026-09-07, checking before building rather than after.**

    lib/market/store/repo.ts   0 mentions of alpaca   <- chunking: CLEAN
    lib/market/engine.ts       7 mentions             <- gain-rank event: NOT

`engine.ts` imports an Alpaca transport normaliser and **branches on
vendor-named provenance strings inside its own logic** — `'alpaca-daily-bar'`,
`'alpaca-daily-bar-rth-close'`, `'alpaca-snapshot'`.

**Those are not labels. They encode precedence** — *Alpaca's previous close
outranks a sheet-sourced one* — **so a migration has to find every comparison and
decide what the new vendor's equivalent outranks.**

**And line 8 says the file "knows nothing about SQLite, Alpaca transport, or
Google Sheets." Broken on line 33.** Third documented invariant broken by its own
file this weekend, after the retention docstring and the latch comment.

**RULING — the coupling is NOT in scope to remove.** Removing it means deciding
what an **unchosen** vendor's equivalent outranks, **which invents an abstraction
against a successor nobody has picked** — the reliable way to build the wrong
one.

**The enumeration IS the artefact.** A migration that knows exactly where the
coupling lives costs a fraction of one that has to discover it, **and Ops has now
produced that inventory for free while checking whether it could build something
else.**

**When a migration is certain and undated: enumerate the coupling, do not remove
it.**

**RULING — the docstring is corrected now, on its own.** Zero behaviour, zero
risk, and **a false invariant is the mechanism by which the coupling persists** —
it tells every next reader the file is clean.

**RULING — the gain-rank event uses the RESOLVED previous close, never the source
tag.** The precedence question is about which source wins; **the event needs the
value, not the provenance.** That builds it without widening anything.

### An approach is not neutral when the eventual plan is redistribution

**Commercial, 2026-09-07:** whether a second Alpaca account in his name may carry
its own subscription **is answerable only by asking Alpaca.** It closed the half
public pages could close and **refused to close the other half by contacting**,
correctly, and routed the decision.

**RULING — not now, and the reason Commercial did not name.**

**Asking a vendor for a second account, while operating on a personal licence
with a stated plan to redistribute later, creates a record and a relationship at
the worst possible moment.** It invites a question we are not ready to answer and
cannot un-ask.

**And the need is thin.** The only real use is a staging desk consuming live SIP
beside production — **which is the split-brain shape that cost this desk an
afternoon**, and nothing is scoped for one. **Migration overlap does not need it:
a new vendor is a different connection, not a second Alpaca one.**

**The trigger that would change it:** a staging desk being genuinely scoped, or
the migration itself — **by which point the new vendor's terms govern and the
question may be moot.**

**Deciding NOT to approach is sequencing and Integration's. Deciding TO approach
is his**, and the asymmetry is the point: **the cheap direction can be ruled, the
expensive one cannot.**

### Read the clock from the box — and read it NOW, not once

**Ops, 2026-09-07, catching itself.** It had been signing messages **03:10–03:40
ET** for several hours. **The box read 09:36.** It read from the right source once
and then **kept quoting the reading rather than re-reading it.**

**A stale reading asserted as current is the CEST error in a slower form** —
Integration's was the wrong source, this was the right source consulted once.
**Reading from the right place is not the same as reading it now.**

**Every timestamp after the deploy report was wrong by up to six hours.** Nothing
decided anything, **and a header that exists to make staleness visible is worse
than useless when the header itself is stale.**

### An enumeration must not live at line numbers inside the file it enumerates

Integration asked for the Alpaca coupling to be enumerated *"in the file with your
line numbers."* **Ops enumerated by IDENTIFIER instead**, and the reason is
Integration's own rule: **a list that names positions in the file it lives in is
precisely the thing that rots.** Line numbers go stale on the next insertion
above them, **and then the enumeration misleads exactly as the invariant did.**

**Identifiers in the file; the dated line-number snapshot in `ops.md`, which does
not move when `engine.ts` is edited; the docstring pointing at it.** Three
locations, each holding the thing that is stable there.

### And a verification substituted rather than skipped

The gated tree and the landed tree differ — main moved between the gate base and
the cherry-pick — **and Ops did not re-gate, naming that rather than letting it
pass.**

**Accepted, because the check was replaced by a stronger one for this risk:** the
diff was **filtered for non-comment additions** and verified comment-only.
**Re-running a full gate on a comment would be ritual; proving it is a comment is
verification.**

**The distinction matters because "it's only a comment" is exactly how the tree
check would erode.** It survives here only because something specific took its
place.

## THE SPREAD IS THE MOST LICENCE-EXPENSIVE INPUT ON THE BOARD, AND WE STARTED DEPENDING ON IT TWICE THIS WEEKEND

**Commercial, 2026-09-07**, reading the requirement out of the code rather than
from the discussion: **`sparkline.ts:204` (the flat verdict) and `cycle.ts:221`
(the NEW HIGH override) are BOTH defined by the live bid-ask spread and go
neutral without one.**

Both were designed this weekend. **Neither author knew the spread was the input a
licence charges most for.**

    Databento Mini   real bid and ask, aggregated over venues it anonymises
    Massive FMV      a single number — no bid, no ask
    Intrinio         a PREDICTED bid and ask, no published method
    Tiingo           last-or-mid; the real quote sits behind an IEX agreement

**So the cheapest paperwork-free price deletes both features outright.**

### And a bias no public page can size

**A real quote from any SUBSET of venues has a spread at least as wide as the
NBBO.** So a partial-venue product **calls flat more often and NEW HIGH more
readily — one-directionally**, by an amount **measurable only with a feed in
hand**, which is a sign-up and therefore his.

**A derived quote is not a worse version of the same verdict. It is a
systematically different one**, and the direction is knowable while the magnitude
is not.

### Bring-your-own-feed breaks "same board"

**Under BYOF the verdict quality is per user** — NBBO on Algo Trader Plus, IEX on
Basic. **Same names, same ranks, different flat and NEW HIGH calls for different
subscribers.**

**He chose one board for everyone. BYOF delivers one board with per-subscriber
verdicts**, which is a different product and does not announce itself as one.

### The constraint that is actionable today

**Anything new that leans on the spread is leaning on the single most expensive
input we have.** Not forbidden — **but from here it is a cost to name at design
time**, and this weekend it was chosen twice by two seats who had no way to know.

## §5d — DISPATCH BEFORE REPORTING. NEVER WRITE "I WILL ASK X".

**Twice the trader has caught Integration stating an intent and not acting on
it** — *"you have not done anything"*, and then *"multiple times you have said
you're going to go do something and you do not activate."*

**The cause is ordering, not diligence.** The report to him is the artefact being
composed. **A stated intention inside it satisfies the same impulse as taking the
action**, the message reads as complete, and the turn ends with the tool call
never made.

**It is this desk's own failure in the most visible place: a description of a
thing standing in for the thing.** The same shape as *"a message without a sha is
a private fact with a recipient"* and *"the docstring named the requirement; the
loop named a proxy for it."*

### The rule

**Dispatch first. Report second. The report is written AFTER the action, so it
cannot contain an unfulfilled intent.**

**Future tense about Integration's own actions is the tell.** *"I'll ask
Commercial"* is either already sent — in which case it is *"asked Commercial"* —
**or it is a decision not to, which must be said as one.**

**A resolution to remember is not a fix.** The ordering is the fix, because it
removes the moment where the intent can be written down instead of executed.

## "ONE COLUMN AND A KEY CHANGE" IS A TABLE REBUILD

**Ops, 2026-09-07**, checking before Integration's phrasing became a scope.

**SQLite cannot alter a PRIMARY KEY.** Adding an owner to `focus_tickers` means
**create-new, copy, drop, rename** — and **`ADDED_COLUMNS` is `ALTER TABLE ... ADD
COLUMN` only.** No `DROP TABLE`, no `RENAME TO`, **no rebuild machinery anywhere
in `db.ts`. A kind of migration this desk has never performed.**

**And existing rows have no owner**, so the backfill is a decision rather than a
default — trivial with one user, **still a decision.**

**None of that makes it hard. It makes it not-one-column** — and it is the
argument for deciding **before** the first user rather than the argument for it
being trivial.

**A phrase that understates a job is how the job gets scheduled wrongly**, and
the person who wrote it is rarely the one who finds out.

### And the table is defined twice, with boot order deciding which wins

`focus_tickers` is created in **both** `db.ts` and `focusRepo.ensureFocusTable`.
**Byte-identical today — Ops diffed them.** The duplication is deliberate and
documented: the web process creates it so Focus works without waiting for a
worker restart onto a new schema.

**Both are `CREATE TABLE IF NOT EXISTS`. So on a fresh store the first process to
start wins** — and **the moment the two drift, the schema depends on boot order.**

**Two definitions that agree are one definition with a hidden dependency on
timing.** They cannot disagree loudly; they can only disagree silently, and only
on a store nobody has yet created.

## A PIN IS AN OVERRIDE ON THE SELECTION GATE, NOT A DECORATION

**Ops, 2026-09-07.** The trader believed pins were cosmetic. **Three non-display
consumers share one clause:**

    WHERE (rank IS NOT NULL AND rank <= @autoRank)
       OR EXISTS (SELECT 1 FROM focus_tickers f WHERE f.ticker = symbol ...)

`researchRepo.ts:133,139` — **a pinned ticker becomes a research candidate
regardless of rank.** `desk-assessments.ts:192` — the same clause in assessment
capture. `desk-assessments.ts:362` — focus tickers added directly to assessment
targets.

**It does not decorate the board. It causes a name to be researched and assessed
that otherwise would not be.**

### And a GET seeds it

`getFocus()` seeds when candidates are supplied, and **the only caller that
supplies them is `GET /api/focus`** — the dashboard path. **So loading the desk
writes focus rows once per trading date, and those rows hit the same admission
clause.**

**A read that writes, and the write costs model spend.** What `'SEED'` drives is
**exactly what `'USER'` drives.**

**Correct as built:** review links and the MCP tools call `getFocus()` with no
candidates, **so neither can seed.**

### Which makes it a spend problem, not a UX one

**Integration framed the exposure as a write collision — B unpins A's ticker.**
That is real and it is the smaller half.

**A pin causes research jobs and desk assessments, which cost model spend. On one
shared board, one viewer's pin spends on behalf of every subscriber, and nothing
records who pinned it.**

**So "make pins client-side" is not the strictly-better option it appeared to
be** — it removes an admission path the desk relies on, **including the automatic
seeding that populates focus every session.**

### The principle already on file decides it

**Mutations that change the shared board may stay shared; mutations that express
personal attention must be per-user.**

**Forcing a name into research IS a mutation of the shared board** — it changes
what every subscriber's desk contains. **So the two halves of "pin" fall on
opposite sides of the line and have to be separated: watching is personal and
free; admitting is shared, attributable, and costs money.**

---

## Enumerate by the field that travels, not the table that stores it

**Three enumerations came up short this weekend, and all three failed the same
way: the search was for the thing we knew about rather than for what carried it
onward.**

The pin removal was scoped at four consumers. **Six went.** The two nobody had
read `candidate.focused` — the in-memory carrier — while the grep that built the
list searched `focus_tickers`, the table. **The table search found the SQL and
stopped one hop short**, at exactly the point where the value leaves storage and
becomes a field on an object that other code branches on.

The two missed sites were **a priority score `+= 8`** and **a reason string**.
Neither mentions the table. Both change what gets researched.

**So the unit of enumeration is the field, not the store.** Grep the column name,
then grep every name the column is read INTO, and keep going until a hop adds
nothing. A store has one name; **the value it holds acquires a new name at every
boundary it crosses**, and consumers bind to the last name, not the first.

**Corollary: "I grepped for it" is not a completeness claim until you say WHAT you
grepped for.** Four sites and six sites were the same search, run against
different words.

## Stated intent is evidence someone meant it, not evidence it works

The pin exemption was documented as deliberate. **Integration ranked that
docstring above the measurement** — ten hours, 57 jobs, past two deaths, one
dossier — and asked the trader twice whether to remove a lever the numbers had
already convicted. His answer: *"is it not obvious to remove it. is that not a
defect?"*

**A comment records what someone believed at the time it was written. It is
evidence about an intention, never about a behaviour.** When a comment and a
measurement disagree, **the measurement is the only one of the two that observed
the running system.**

**Third instance this weekend of the comment winning until something measured
it** — with the engine docstring that claimed no Alpaca knowledge (broken 25
lines below by an import), and with `sheetPriorOmitted`, wired and written across
903 rows and never once true.

## A field whose source is removed does not go dead — it starts lying

Removing the pin's admission path leaves `focus` persisted and rendered on
assessment rows, **with nothing left that can ever set it true.**

The failure is not that the field is dead. **It is that historic rows keep their
values, so one column means "he pinned this" above a date and "nothing" below it,
with no marker at the boundary.** A reader comparing two periods sees a behaviour
change that never happened.

**So when a write path is removed, the rendered field it fed is part of the
change, not a follow-up.** Either the render goes, or the boundary is dated in
the UI. **Leaving it is the `sheetPriorOmitted` shape arriving on its own** — a
populated field standing in for a path that no longer runs.

**Order, when the field crosses threads: render first, then the write, then
orphan and label the column. Never DROP.**

## A scope boundary is not a reason to stop; a consequence crossing it is

Integration ordered `POST /api/focus` removed inside Ops's scope. **Ops built
everything else and refused that one**, because removing the endpoint 500s
Design's star button until Design's hook moves in-memory.

**That refusal was correct and the order was wrong.** The test is not whether the
change is in your files. **It is whether the CONSEQUENCE lands in someone else's**
— and a main where another thread's control is broken is not a landable main,
whoever authored the file.

**"I am not landing a main where the star button 500s" outranks an instruction
from Integration**, and the sequence gets rebuilt around the seam instead.

## A mechanism tells you a thing can happen; it never tells you how often

Research read `pipeline.ts:190`, found that an unchanged evidence fingerprint
returns a reused dossier **before any bundle is built and before any model call**,
and **refused to close on it** — a failed job can call a model and produce no
version, so counting versions undercounts calls. It named the field that would
settle it and stopped.

**Integration did not stop.** The relay onward said: *if most jobs are free, the
fixed cost is roughly versions rather than jobs.* **That sentence converted a
mechanism into a rate, and nobody had measured a rate.**

The measurement: **67% of 2,642 production jobs reached a model. ANPA's 57 out of
57 did.** The short-circuit is real and works exactly as read — **it just does not
fire most of the time.**

**No amount of reading the code could have produced that number**, because the
code describes a condition and the cost depends on how often the condition holds.
**"The code says it cannot happen" is a claim about code, and the cheapest test of
it is one read of the data.**

**Corollary for relays: when a thread hands you a mechanism and explicitly
declines to state a rate, the decline is part of the finding.** Passing the
mechanism on without the decline is not compression, it is a different claim.

## The pin was the largest single consumer on the day it ran

`ANPA` — **the only pin the store has ever held** — took **2.39M of 2026-09-04's
8.15M input tokens: 29% of the day, for one name.** Sixty calls, zero of them
free.

**Not attributable to the pin:** at rank 2 the name was admissible whenever it was
alive. **Attributable to the pin:** the ten-hour tail past two deaths.

**The removal stopped being a matter of principle when the number arrived.** The
trader's *"is it not obvious to remove it. is that not a defect?"* was correct
before anyone could size it, **and the sizing is what makes it reportable rather
than merely right.**

## False forwards and misread backwards are the same family from opposite ends

Two failures follow from removing a write path, and **only one of them is visible
in new data.**

**FALSE FORWARDS:** the source is gone, so every new row carries the empty value.
Integration caught this on the persisted `focus` field. It shows up immediately —
a field that used to vary and now never does.

**MISREAD BACKWARDS:** the source is gone, so the *meaning* of the old rows
changes underneath them. Design caught this one. `focus` today means **he pinned
this and it therefore got research it would not otherwise have had.** Once pinning
is display only, a reader in November sees `focus` on a September row and reads
**a display preference** — which is what pins will be by then — and never learns
it was a research lever.

**Keeping it preserves a token rather than a fact.**

**The backwards case is the worse of the two, because nothing about the old row
looks wrong.** The forwards case announces itself in the next day's data; the
backwards case only ever looks like history.

**Which means it has no natural discovery moment.** A field that goes false
forwards gets found by whoever next looks at the data. A field that drifts in
meaning is found **by someone reasoning about it, or not at all** — so it must be
caught at the moment the write path is removed, because that is the only moment
anyone will be thinking about it.

**Corollary on arguments: an argument that fails on SUCCESS is worse than one
that fails on TIME.** "Nobody reads this panel" is sound until the product works,
and then it is wrong exactly when the stakes rise. **Prefer the reason that
survives the outcome you are working toward.**

**And the two arguments for removal age in opposite directions.** "The audience is
small, nobody will read it" is overturned the moment the audience grows —
**which is the thing being built for.** "The token means something else now" does
not weaken with time; **every month adds rows that read wrong.** Prefer the
argument that gets stronger.

## Render first means render LIVE first

A sequence written as *render, then stop writing, then orphan the column* is not
satisfied by the render change existing. **A commit is not a deploy.**

Stop writing while the old render is still serving and you get exactly the window
the ordering exists to prevent: **the field absent from new rows, for a reason no
reader can see.**

**So a cross-thread ordering step completes when it is LIVE**, and the upstream
thread must say so in words. **Inferring another thread's state from a sha in the
log has been wrong twice this weekend** — a commit can carry a ruling about a
change rather than the change.

## One status for spending nothing and for spending and falling short

`worker/research.ts:559`:

```
const status =
  report.outcome === 'ACCEPTED' ? 'COMPLETE'
  : report.outcome === 'PARTIAL' || report.outcome === 'REUSED_UNCHANGED' ? 'PARTIAL'
  : 'FAILED';
```

`REUSED_UNCHANGED` is **the short-circuit that builds no bundle and makes no
call.** `PARTIAL` is **a real interpretation that spent and returned half an
answer.** Both land as job status `PARTIAL`.

**1,902 jobs wear that status. 1,272 of them spent. ~630 did no work at all.
Nothing in the job table separates them** — which is why two threads reasoned
carefully from `research_jobs` and both got the cost backwards, and why
`model_usage` was not the better source but **the only one.**

**The rule this belongs to is the one already on file:** `SELECT <field>,
COUNT(1) GROUP BY <field>`. **A field that collapses the distinction the question
turns on is a populated field that answers nothing** — worse than a missing field,
because a missing field prompts a query and a populated one ends it.

**Where to look for the next instance: any enum that maps an outcome type onto a
smaller status type.** The narrowing is where the distinction dies, and it is
always written as a convenience.

## Splitting an enum without backfilling builds the field you just removed

Adding a terminal value going forward only means the old value means **two
things above a date and one below it, with nothing at the boundary** — the
misread-backwards shape, arriving in a second field on the same night the first
was removed.

**Backfill, or date the boundary in the record. Silence is not a third option.**

And **test the backfill rule before trusting it.** "No `model_usage` row therefore
it did no work" holds only if a genuine spender cannot fail before its first call.
If it can, **the rule relabels paid jobs as free — and in the direction that makes
the cost look smaller**, which is the direction the desk has already been wrong in
once.

**A backfill rule that can only err downward is not conservative. It is the error
nobody checks.**

## Absence of a setting is not proof of the default

`service_tier` appears nowhere in `lib/research`, so the calls bill at Standard.
**That is a grep, and the tiers span 4x** — Batch and Flex are half, Fast is
double. **A default set in a client constructor, an env var, or a wrapper would
not appear in that search.**

**The grep proves the search found nothing. It does not prove the value is
unset**, and it says nothing at all about what the vendor does when it is.

**Same shape as the enumeration rule and the same night:** searching for the name
you know, and treating its absence as an answer about a system.

**Where it bites hardest: any inference that turns on a value NOT being present.**
Those read like verification and are the weakest form of it, because the one
observation — nothing found — is consistent with every explanation including a
bad search.

## The mean is not a test of the tail

Long-context pricing is a **cliff on the whole request**, not a marginal rate on
the excess: cross the threshold and the multiplier applies to every token, not the
ones past it.

ANPA's 2.39M input over 60 calls averages ~40K, far under the 272K line. **That
clears it on the average and the average is the wrong instrument** — a mean of
40K is entirely consistent with a distribution containing several 300K requests,
each paying double on all 300K.

**When a rate has a cliff, the question is always about the maximum**, and a
summary statistic that cannot see the tail is not a check, it is a check-shaped
reassurance. **Four checks of one kind are one check.**

## A rate card is not permission to produce a number

The desk records `cached_tokens`, which is cache **reads**. Cache **writes** bill
at 1.25x uncached input and **the usage object has no field for them** — they sit
inside `input_tokens`, unlabelled.

**So from the desk's own counters, uncached input is $2.00–$2.50 per million and
cannot be made a point.** The split exists only on a vendor dashboard behind a
login, which is the trader's to open.

**Report the band.** A rate card arriving does not convert an unmeasurable
quantity into a measured one, **and the temptation is strongest right after the
missing input turns up** — the shape of the work suddenly looks complete.

**A number with a false decimal point is worse than an honest range**, because the
range invites the question that would find the gap and the number closes it.

## When an improvised check contradicts a built-in one, suspect the improvised one

Ops needed to know whether two shas carried identical code outside `docs/`. A
homemade digest — `ls-tree | xargs rev-parse | md5sum` — reported **DIFFER**.
`git diff --stat` with a path exclusion, and the tree hash of the same subset,
both reported **IDENTICAL**. The homemade one was wrong.

**He nearly re-gated and redeployed on the word of a pipeline he had written
thirty seconds earlier**, over one that has been wrong approximately never.

**The improvised check is the one with no test coverage, no users, and no history**
— and the failure mode is silent, because a shell pipeline that mis-sorts, drops a
line, or hashes a different set still prints a confident answer.

**And it would have looked like diligence the whole way.** Acting on a false
positive from an extra check reads exactly like caution; that is what makes it
expensive.

**Rule: when two checks disagree, the burden is on the newer one.** Reconcile
before acting, and reconcile by finding what the improvised one actually
measured — not by running it again.

## Agreement between two computations that share an assumption is not corroboration

Research derived ~630 free short-circuits as PARTIAL-count minus
PARTIAL-with-a-model-call. Ops derived 630 the same way from the same two tables.
**They matched exactly, and the exactness felt like confirmation.**

**It is arithmetic reproducing itself.** The match establishes that the
subtraction is right. **It says nothing about whether the 630 rows are
short-circuits**, which is the claim that actually matters and which neither
computation touches.

**Two results corroborate only when they could have disagreed.** Before treating a
match as evidence, name the assumption each side would have had to get wrong
independently. **If there is no such assumption, there is one result, reported
twice.**

## A field set on every row of the population is not a test

`analysis_started_at` is set on **100% of PARTIAL jobs** — the short-circuit path
stamps it too — so it cannot separate a job that made no call from one that
interpreted and fell short.

**Same family as the single-valued column:** `SELECT <field>, COUNT(1) GROUP BY
<field>` returning one row means the field has never discriminated anything.
**A field that is always set and a field that is never set are the same amount of
information: none.**

## A measurement that misses the only instance reads as clearance

Ops measured focus-only admissions with a rank-entry test and reported **ZERO**.
The test covered one of two bypass branches, **and the only pin the store has ever
held sat in the branch it did not cover.**

**That is worse than an unverified assertion, because it arrives with evidence
attached.** An assertion invites "did you check?" A zero closes the question.

**So the check on any zero is: could this test have seen a positive?** Name the
population, name the instances in it, and confirm the test's path reaches them.
**Four checks of one kind are one check** — and one check that cannot reach the
only known case is worse than none, because it converts an open question into a
settled one.

**Sibling of the standing rule:** *exercised constantly where it could not fail,
never once where it could.* This is the same shape read from the other end — the
population was one, and the test missed it.

## An instruction addressed to "you, later" must carry the state it will find

The 03:15 task read all four units from their own cwd and said *"all four should
read the same release."* **It was written when all four matched, so the line had no
teeth** — and the state moved under it four hours later, when a deploy left the
market worker one sha behind on purpose.

Rewritten, it now states the split it expects to see (`market c84e0df` against
`web/research/assess dd3bca0`), reports the market sha **first**, records the
pre-restart value so the report reads `c84e0df → ?` rather than a bare string, and
says in the abort branch that aborting leaves **both** purposes unmet.

**A scheduled instruction is read by someone who was not in the conversation** —
including the author, weeks later. **It must describe the world it will arrive in,
not the world it was composed in**, and every assumption that was ambient at
writing time has to be written down or it is not carried.

**And the failure that no task text can fix: if the host is closed at the hour, it
does not run and there is NO report** — not an abort, not an error, silence.
**Absence of a report is not evidence the state is good.** Where a scheduled check
is the only thing closing a gap, its silence must be read as "did not run."

## Fifteen dates is a path; one afternoon is an incident

72 research jobs reached `accepted_at` having made **no model call.** The obvious
explanation — another job on the same ticker and fingerprint already paid, and
this one reused it — **covers four of them.** The other 68 have no paid sibling.

**What settled that it was not a one-off was the date spread: 15 distinct dates
across three weeks, ending at the current trading date.** A steady trickle over
weeks is a code path. A cluster in one afternoon is an incident with a cause you
can date.

**So the first question about any anomalous population is its distribution in
time, before its mechanism.** It separates "something broke once" from "this has
always been true and nobody looked", and the two lead to completely different
searches.

**And check the boring explanation numerically rather than accepting it.** "Another
job already did the work" was plausible for all 72 and true for 4. **A plausible
mechanism that covers 6% of a population is not an explanation, it is a
distraction wearing one.**

## Two outcomes that share a symptom can differ enormously in consequence

The 72 are either **a legitimate free path** — something deterministic that needs
no model, meaning the cost model has a hole in the *cheap* direction — or
**`ACCEPTED` reachable without the work**, meaning dossiers on the trader's screen
were accepted with nothing having produced them.

**Same row, same query, same symptom. One is an accounting correction and the
other is a correctness defect live for three weeks.**

`accepted_at` being set on all 72 is what keeps the second alive: **something did
not merely land in a status, something accepted a result.**

**The rule is to name both branches before investigating, and to notice which one
you would prefer.** This desk has gone the uncomfortable way twice in one night —
54 "free" jobs were 54 paid calls that stored nothing, and a measured zero was a
test that could not reach the only instance. **Preferring a branch is a reason to
check it harder, not a reason to lead with it.**

## "Upper bound" is a label, not a method

Research priced the desk assuming every call used the expensive model — a 10x
assumption — **labelled it an upper bound, and published the number.** Integration
had already named model mix as the verification that mattered most, in writing,
before the pricing ran.

The vendor's own usage chart came in at **$7.39 for a day priced at
$16.79–20.39. Overstated 2.3x.**

**A range with an unverified 10x assumption inside it is not conservative. It is a
wrong number wearing a safety word** — and the word does not travel. The figure
gets quoted; the caveat stays in the message it was written in.

**Where this bites: a caveat protects the author, not the reader.** If an
assumption can move the answer by more than the range you are quoting, **the range
is not a range, it is a guess with error bars drawn around the wrong centre.**
Verify it or do not publish.

## Ground truth from outside beat a careful internal read, twice in one night

**Once:** two threads reasoned from `research_jobs` about what the desk spends.
Both got the sign backwards. **`model_usage` — a different table, written by a
different path — settled it in one query.**

**Twice:** a priced estimate built from the desk's own token counters was
corrected 2.3x by the vendor's usage chart.

**The pattern is worth more than either instance. When a system is asked to
account for itself, its own records share every assumption its code does.** An
independent record — a second table written by a different path, a vendor's
invoice, a broker statement — is not merely additional evidence. **It is the only
kind that can disagree.**

**So for any number that matters, ask what outside source could contradict it, and
get that source before publishing the internal one.**

## Accounting must not take the work down with it, and must not vanish either

```
try { recordModelUsage(db, { ..., jobId: options.jobId ?? null, ... }); }
catch {
  // Accounting must never take an interpretation down with it.
}
```

**The comment's intent is right and the implementation produces the standing
failure: a caught error silently substitutes a different world.** Here the
substituted world is one where the call never happened — **and 72 jobs wore it for
three weeks.**

Two defects in three lines. **`?? null` writes a row that exists and cannot be
joined. The bare catch writes nothing at all**, and a swallowed write leaves
nothing to count, so it is the harder of the two to detect: **the first is a
visible orphan, the second is an absence.**

**Log the catch.** Not failing and not recording are different outcomes and must
not look the same.

**And a `?? null` on an identifier is a claim that the id is sometimes legitimately
absent.** If every call site supplies one, the fallback is dead and should throw.
**If some do not, that is the finding** — and it was written as a convenience so
that nobody would have to answer the question.

## Maintaining is not authorising, and editing a standing instruction is a new authorisation

Ops refused to let Integration approve a scheduled task on the trader's machine:
persistent config in that environment is the trader's class to authorise. Hours
later Integration wrote back *"persistent config in your environment is yours to
authorise and yours to maintain"* — **and Ops corrected it against its own
interest.**

**It is not Ops's environment and it was not Ops's authorisation.** The task runs
on the trader's machine and the trader approved it. Ops changed the briefing —
not the behaviour, schedule or permissions — **and told him it had done so and
why.**

**Maintaining is mine; authorising stays his, including for edits.** A standing
instruction that is rewritten is a new instruction. **The original approval covers
what was approved, not the class of thing it belonged to.**

**The test that keeps it honest: if this were mine to authorise, would the
boundary I asked someone else to respect still exist?**

## A failure whose only symptom is silence needs its own observable

A magic link that lands in spam is **indistinguishable, from the user's side, from
a login that does not work** — and nothing on the desk would show it.

**There is no first incident to learn from. There is a user who leaves.**

So delivery telemetry is **part of the item, not an extra**, and it is built at the
same time as the thing that can fail. **The general form: where a failure produces
no error, no log line and no complaint, the observable must be specified alongside
the feature or it will never be specified at all** — because the moment that
usually prompts it never arrives.

**Sibling of the once-a-day rule** — *a caught error on a once-a-day job silently
substitutes yesterday's world* — and of the scheduled-task rule that **absence of a
report reads as "did not run."** Same family: **silence is not evidence.**

## Some dependencies are running services wearing a code-change costume

The auth work looks like one scope. It is not. **Sessions, cookies, callbacks,
`state`/`nonce`, CSRF — all ship with a deploy.** The email sender does not: it is
an account, a domain verification, DNS records, a sender reputation and a bill,
**and SES starts sandboxed.**

**A hosted provider does not remove the dependency, it relocates it** — the same
DNS is still required, so it returns to the same prerequisite.

**Before scoping a feature as engineering, separate the parts that ship from the
parts that must exist in the world.** The second kind cannot be gated, tested or
rolled back, has a lead time nobody controls, **and is usually discovered by
whoever tries to deploy.**

## Do not let a temporary prerequisite set a permanent shape

The trader ruled two sign-in providers. One is blocked on a domain that does not
exist yet — **a supply constraint, not a change of mind.**

**Build the screen for both. Ship it with one live.** A sign-in screen built for a
single provider is a rebuild of the most-seen screen in the product; a screen
built for two and showing one is a line of config when the blocker clears.

**But do not render the dead control.** A button that is present and does not work
is **the false-forwards field in interaction form** — it carries a promise its
source can no longer keep. **Absent until it works.**

## The clock error now arrives as an announcement, not as a reading

Two threads, in two different non-ET zones, **both announced Tuesday on Monday
evening ET, independently, and Integration repeated it onward as fact.** The desk
box read `ET 2026-09-07 18:02 Mon` the whole time.

**Nobody misread a clock. Nobody read one.** The date arrived as an ambient
environment notice — *"the date has changed"* — **and an announcement does not
carry a zone with it.**

The standing rule was *read the clock from the box, and read it now.* **This
breaks it in a new way: not a stale reading, but no reading at all**, with an
authoritative-sounding statement substituting for one.

**So the rule extends: a date or time you did not obtain from the desk's own clock
is not a reading, whatever announced it** — a runtime notice, a peer's message, a
file header, your own earlier sentence. **Especially your own earlier sentence.**

**Eighth instance in this family.** The previous seven were stale readings, ignored
`TZ`, and a verification that was itself the trap. **This one required no error of
perception at all**, which is why it propagated to three threads before anyone
checked.

## An unpriced term is unbounded, not small

`gpt-5.6-sol` was in production — 116 calls, 1.44M input tokens — **and was not on
the rate card, because the rate card was built from the two model names someone
handed over rather than from what the store contains.**

The query that would have shown three models existed the whole time.

**2.6% of calls sounds small and is not a bound.** Until it has a price, its
contribution to the total is unknown, and in this family **two models one letter
apart differ by 10x** — so a neighbouring name is not an estimate, it is a guess.

**Rule: enumerate priced things from what the system actually ran, never from the
list you were given.** And **do not describe an unpriced component as small.**
Small is a conclusion that requires the price.

## Broken attribution does not move the total

40% of `model_usage` rows carry a null `job_id`. That makes every **per-job** and
**per-name** figure a floor with an unknown ceiling — including the widely quoted
"one name was 29% of the day's input."

**It does not move the money.** The vendor's invoice is per-account, not per-job,
so the daily total stands at ~$7–10 a session regardless.

**Separate the two before withdrawing anything.** A defect in attribution
invalidates the breakdown and leaves the aggregate untouched; **treating it as
though it invalidated both is its own error**, and it is the one that produces a
number quoted three times and moved three times.

**Mark the affected figures as floors. Do not re-report them as new values.** A
caveat applied once beats a number that keeps moving.

## A carried reading decays; a taken reading cannot

Three clock errors in two days, and Design found the shape under all three:
**nobody has been wrong about how to read a clock. Every instance is carrying a
reading rather than taking one.**

Ops signed `03:xx` for six hours after reading the clock once. Design derived
`03:42` by adding elapsed time by feel when it was `03:25`. Integration and Ops
both repeated an environment's date announcement from a non-ET zone.

**The error grows with the length of the conversation rather than being a fixed
offset** — which is why it keeps happening to careful people, and why it will keep
happening. **A carried reading decays and nothing in a conversation signals the
decay.** There is no moment where the number visibly goes stale.

**Take it at the moment of use, from `zoneinfo`:**

```
python -c "from zoneinfo import ZoneInfo; from datetime import datetime,timezone; \
  print(datetime.now(timezone.utc).astimezone(ZoneInfo('America/New_York')))"
```

**Not `date -u` minus four** — that is EDT arithmetic and breaks on 2026-11-01 —
**and not `TZ=America/New_York`, which silently returns GMT on this host.**

**And the calendar is not the clock.** Monday 2026-09-07 was Labor Day: the desk
had the right date and still assumed a session that did not exist. **Fetch a range
by calendar, gate an action by session** — and know which one you are reasoning
about.

## An unpriced model was not between the two known ones; it was above both

`gpt-5.6-sol` priced at **$4.00 / $0.40 / $20.00 — more expensive than `terra`,
not less.**

**The intuition that a third member of a family sits between the two you know is
worth nothing.** In this family two models differ by 10x, and the unknown third
came in above the top. **That is why an unpriced term is unbounded rather than
small** — 2.6% of calls at an unknown rate has an unknown contribution, and
"small" was a conclusion that required the price it lacked.

**And a promotional price is a dated input.** `sol`'s rate is promotional through
at least 2026-11-21; the monetization case runs past November. **A cost line with a
scheduled change in it must carry the date, or the model silently assumes a price
that has already expired.**

## Proving a search was complete is not proving a claim about the system

Commercial concluded Standard tier from a grep. Challenged, it **widened the search
to every channel named — SDK defaults, env vars, wrappers — found the calls are
hand-built fetch bodies with no such field, and then still refused to call it
verified.**

Absent from the wire means `auto`; `auto` means a Project setting in a console
nobody here can open. **So the code cannot settle it, however complete the search.**

The rate card now reads *"Standard, absent from the wire, defaulting to the
project setting, verified by nobody yet."*

**A completed search establishes what the code does not contain. It says nothing
about what the system does** when the behaviour is decided elsewhere. **Most
writers convert the first into the second at exactly this point**, and the honest
field is the one that names who has verified it: nobody.

**The fix was to find a mechanism that could answer** — the response object's own
`service_tier`, settled from one logged response. **Same move `model_usage` made on
the cost question: convert an unanswerable question into a one-line observation.**

## An ambient date is wrong for everyone downstream at once

Design catalogued three clock errors as one shape — **carrying a reading rather
than taking one** — and then separated a fourth that is worse:

**A reading you take is wrong only if YOU take it wrong. An ambient date is wrong
for every thread downstream at once, and it arrives with the confidence of an
observation.**

*Nobody misread a clock; nobody read one.*

**And every thread on this desk runs in a non-ET environment**, so an environment
that announces midnight announces it hours before the desk's day turns. **This
recurs by default rather than by accident** — which is why the other three were
worth a habit and this one is worth a rule.

**Rule: an announced date is not a reading, and it is never the desk's.** Take ET
from `zoneinfo` at the moment of use before any sentence that names a day.

## Two states that differ only in a payload field are one state on screen

The universe-freshness marker has three cases before tomorrow's refetch:

```
BEFORE 03:15, marker fires              -> EXPECTED. Not a defect.
AFTER  03:15, universe restamped, silent -> correct
AFTER  03:15, universe still 09-06, fires -> REAL, and the case the marker exists for
```

**The second and third are indistinguishable on screen.** A silent marker and a
fired-but-expected marker are both consistent with a working feature, **and only
`universeUpdatedAt` separates either from the failure.**

**So the observable is not the marker. It is the marker plus the timestamp**, and a
read that takes one without the other cannot reach a conclusion — it can only
reach a feeling about one.

**Pre-register which case you are in before looking**, not after. A firing marker
at 03:30 with no prior registration has no principled reading available, **and the
reading that gets chosen at the board is the one that fits what the observer
already expected.**

## Name the axis a defect breaks, not the property it belongs to

Every interpretation row in `model_usage` carries a null `job_id`. Ops reported
that as broken **attribution**; Integration relayed it to the trader as *"every
per-name and per-job figure is a floor."*

**Both were too wide, and the relay was wider than the original.**

```
ticker NULL        0
trading_date NULL  0
job_id NULL     1335      <- lost the JOB key, kept the NAME key
```

**The orphans are fully attributable by ticker and date. They lost one axis, not
attribution.** So per-job figures are floors; **per-name, per-day and per-model
figures are exact and stand unqualified** — including the 29.3% that had already
been quoted, un-quoted and re-quoted.

**A relay that generalises is worse than the error it carries, because the
original had a boundary and the relay does not.** When a defect is described by
the property it damages — "attribution", "freshness", "provenance" — **ask which
key, which column, which axis.** The answer is almost always narrower, and the
narrow version is the one that keeps a number usable.

## A correction toward more confidence deserves more scrutiny, not less

Ops sent the 29% correction with its own warning attached: **this moves in the
unusual direction, so check it rather than accept it.**

**Corrections that take something away are self-checking** — nobody talks
themselves into less. **A correction that restores confidence is the one that
flatters everybody in the room**, and it arrives when a desk that has been wrong
all night wants to be right about something.

It held. **But it held because it was checked**, and the check was two lines:
`ticker NULL = 0`, and the day total sums every row regardless of join.

## Present is not correct

`ticker NOT NULL` on 3,334 rows is not `ticker CORRECT` on 3,334 rows.

The 29.3% is exact **conditional on interpretation rows carrying their own name
rather than an inherited or default one** — and nothing checked so far
distinguishes those.

**`sheetPriorOmitted` was populated across 903 rows and never once true.** A
null-check establishes that a field was written. **It says nothing about what was
written**, and the two get conflated at exactly the moment a number is about to be
published.

**"I checked for nulls" and "I checked the values" are different sentences.** Say
which one you did.

## A named sha is a carried reading

Integration named `fad5de6` for deploy. By the time Ops gated, the tip was
`40ee093` and carried a second thread's change to `pipeline.ts` — **the research
spend path** — in the same deploy as a UI change it had nothing to do with.
**Second time in one night the tip moved under a named ancestor.**

**A hash is correct at the instant it is read and decays silently while the
conversation continues.** That is the clock failure in a different field: *nobody
is wrong about how to read a sha; the error is carrying one rather than taking
one.*

**So the approval is not a hash. The approval is an ENUMERATION.**

The gating thread enumerates at gate time and reports **what the tip carries, by
thread.** Integration approves that enumeration. **If the tip moves between the
enumeration and the deploy, it is a new enumeration and a new approval** — not a
detail to reconcile afterwards.

**The tell that this rule is needed: the person who names the sha is never the
person who discovers it moved.**

## Observation ships tonight; behaviour ships in daylight

A change that only reads a field back off a response is **observation**. A change
that alters what is sent is **behaviour** — and on a path that spends real money,
behaviour ships when someone is watching, not at 18:05 on a public holiday.

**The deploy window is not a reason.** A refetch that would close a version split
for free is a convenience; **a hold costs one day of a split that is already
harmless, which is the cheapest thing available.** Convenience must not be allowed
to set the risk tolerance.

**And the honest test for how hard to ask: would I have shipped this without
knowing it was in there?** If yes, ask properly.

## When a defect aligns with the data it hides, the wrong query is not noisy

Every `terra` and `sol` row in `model_usage` is an orphan; every `luna` row joins.
So a per-name figure computed through `job_id` **would have dropped precisely the
expensive models.**

**Not a sampling error — a systematic one pointing the same way every time.** The
result would have been consistently, invisibly low, with nothing ragged about it
to prompt a second look.

**When the population a defect removes correlates with the quantity being measured,
the broken result looks CLEANER than the correct one.** Ask what a defect
excludes, not just how much.

## An environment fault fabricates diagnoses inside the domain of the tool it breaks

One machine under memory pressure produced four failures in one evening, **and not
one of them named memory:**

```
git push       -> GCM "paging file too small", then a FALSE CREDENTIAL ERROR
npm run build  -> "Error evaluating Node.js code / EINVAL" from tailwind
ssh            -> EUNKNOWN uv_spawn
vitest         -> "This is a bug in Vitest", 9 files unrun, 9 spurious failures
```

**Each named a plausible wrong cause inside its own domain** — which is exactly
where it will be believed. The credential one would have sent someone toward the
credentials directory hunting a problem that does not exist. **The vitest one is
worse in practice: a red gate with a plausible failure list is the one everybody
acts on.**

The gate read **1734 tests / 116 files against 1866 / 125** — indistinguishable
from 132 deleted tests, on a change that had just deleted 373 lines of tests.
**The six failing files were all untouched by the change, and the two test files
it did touch both passed.** The 132 were files that never executed.

**So: when a failure arrives, check whether the tools around it are also failing
before believing what it says about itself.** A single tool's error is evidence
about that tool. **Four tools failing differently at once is evidence about the
machine, and none of the four will say so.**

**And the corroboration rule cuts the other way here:** these four could not have
agreed — they share no code and no domain — **so their simultaneity IS the
finding.**

## Do not deploy from a box that is failing to spawn

`push-release.sh` streams `git archive` into `tar -x` over a live ssh connection:
no tarball on either disk, **nothing to clean up if the connection drops half
way.** That is a virtue on a sound connection.

**On a box that has already failed to spawn `ssh` twice, it means a mid-stream
failure leaves a partially extracted release directory on production** — and
`deploy.sh` then runs against it.

**A half-extracted release is worse than a delayed one.** A green gate is not
sufficient: **green gate AND a quiet machine, both.**

**And a deploy window that would close a version split for free is a convenience,
never a reason.** When the only cost of waiting is tidiness, wait.

## Take the environment's state at the moment of use, in every field

Three instances tonight, one rule:

```
CLOCK   a date read once, or announced by a non-ET environment, carried onward
SHA     a tip read once, named for deploy, moved twice before shipping
BOX     a machine proved quiet by a gate, assumed quiet for the deploy that follows
```

**A gate proves the box CAN be quiet. It does not prove the box IS quiet** when
`git archive` starts streaming into `tar -x` twenty minutes later.

**Every one of these is the same failure: a reading that was true when taken,
carried into a moment where nothing re-checked it, and nothing about carrying it
signals the decay.**

**So the general form: any fact about the environment — time, tip, memory,
freshness, who is on call — is taken at the moment it is used, never carried from
the moment it was convenient to read.**

## Thirteen removed and thirteen that mattered are different facts

The clean gate showed **1866 → 1853: thirteen tests, file count unchanged.** Small
enough that "expected" stops being a hope and becomes a checkable claim — 373
removed lines yielding thirteen fewer cases is consistent with deleting fixtures
and assertions rather than cases.

**But the count cannot answer the question that matters: is there still a test
that FAILS if the removed behaviour is reinstated?**

Ops kept one that **writes a pin before asserting it is ignored**, because a test
that stopped pinning would pass for the wrong reason. **If a change removes the
last test that would notice a regression, the total moves by a number that looks
fine.**

**Watch the count to detect deletion. Watch the coverage to detect what deletion
cost.** They are different checks and only the first is cheap.

## The first agreement of the night, and what makes it worth more than its precision

The rate card reproduced the trader's own invoice for 2026-09-04 **to within 12%.**

**Every previous comparison this weekend had the outside source overturning the
internal one** — the invoice correcting a priced estimate by 2.3x, `model_usage`
correcting two threads' reading of `research_jobs`, the whole job axis. **This is
the first time an internal computation and an independent source agreed.**

**12% closes the question as well as it can be closed from this side**, and the
residual sits exactly where Commercial predicted: **cache writes, billed at 1.25x,
unlabelled inside `input_tokens`.**

**Do not tighten it further from our own counters.** The remaining spread is not
measurable here, and a narrower figure produced from the same inputs would be
precision without information.

## Do not supply the expected answer in the message that asks for verification

Integration asked Design to account for 373 deleted test lines **and wrote the
expected answer twice in the same message**: *"a pin that lives in memory has no
persistence to test — I expect that to be the answer."*

It added *"I am not going to accept it without you saying it"*, **which is worth
nothing.** It asks for the words, and the words were already on the page.
**A caveat attached to a leading question does not un-lead it.**

The answer supplied was **available, plausible and wrong.** Design's own sentence:
*it is the answer I would have given you if I had reasoned instead of looked.*

**What was actually there: 18 cases destroyed by `cat >` on an existing path, zero
obsolete.** Six covered `focusRepo`, **which still exists** — its removal is a
later step, so those tests were covering shipped code. **Twelve were never about
pins at all**, covering card selection, retention bands and the desk read — and
one of those covered a change Design itself had made two days earlier.

**Ask the question. Do not draft the answer.** If you already know what you expect,
that is exactly the case where saying it destroys the check.

## The file count is the control for the test count

A contaminated run and a real deletion **both move the test count.** Only the
contaminated one moves the **file count.**

```
contaminated   1734 tests / 116 files    <- nine files never executed
clean          1853 tests / 125 files
after restore  1871 tests / 125 files
```

**Report the pair, always.** The total alone cannot distinguish "tests were
removed" from "tests did not run", and those lead to opposite investigations —
one at a colleague's change, one at the machine.

**And the arithmetic closing exactly is a second control:** 1866 − 18 + 5 = 1853,
1853 + 18 = 1871. **A restore landing on 1869 or 1873 would have been a new
question.** Exact closure also certifies the baseline: a contaminated 1866 would
not have reconciled to a delta counted by name.

## A test deleted ahead of the code it covers is a green suite lying about the present

Six of the destroyed tests covered `focusRepo`, which is removed in a **later**
step. **They will be obsolete then. They were not obsolete when they were
deleted.**

The usual worry about deleting a test early is that it stops guarding a future
regression. **The sharper one is that the suite goes green over code that is still
shipping, right now**, with nothing marking the gap.

**So obsolete tests leave in the same commit as the code they cover** — never
ahead of it, and never left behind covering something that no longer exists.

## Apply the observation/behaviour gate to yourself before landing

Research landed a change to the research spend path at 18:05 on a public holiday
**knowing another thread was mid-deploy-sequence — it had said so in three
messages — and did not connect that to its own commit.**

Integration would have shipped it without knowing it was there. **Both halves are
the same failure seen from opposite ends:** *you would have shipped it without
knowing; I put it there without saying.*

**The gate is cheap and it is one sentence to whoever is holding the deploy:** is
this observation or behaviour, and is anything mid-flight. **Not a process change —
a sentence, said before landing rather than after being asked.**

## An answer and a new commit arriving together are not one thing

Research answered the observation-versus-behaviour question with real evidence —
**45 insertions, zero deletions, request body untouched** — and in the same message
announced a new commit fixing a defect Integration had flagged.

**Integration read the answer as covering both. It covered one.** The evidence was
for the first sha; the second had no such statement and touched the same two
files. **Ops re-enumerated at gate time and separated them.**

**Nothing here was concealed** — the new sha was named in the same message rather
than left to be discovered. **The failure was entirely in the reading:** an answer
and a change arrived together and were merged by the reader.

**So while a deploy is held, a new commit is a new enumeration.** The lander says
the sha **and re-states what it does to the answer already given** — not *"I fixed
it"* but *"I fixed it, and here is why my previous answer still holds for the new
commit."*

**And the holder does not carry an answer across a moving tip.** Third time in one
night the tip moved under a hold; each time the catch was the gating thread
enumerating rather than the naming thread remembering.

## Arrange for corroboration that could disagree, before the fact

Design measured 1871 tests in the **shared working tree** — the instrument already
known to be unreliable, since its own transient failure came from reading another
thread's file mid-edit.

Ops gated the same tip from a **pinned worktree**, saying: *you will get an
independently measured count, not a confirmation of theirs.*

**That is the corroboration rule applied in advance rather than discovered
afterwards.** Two numbers agreeing is worth something only when the two could have
disagreed — **and the way to get that is to choose a second instrument before
measuring, not to notice afterwards that both used the same one.**

**It also counted `it(` blocks in the file rather than accepting the total.** A
total can close arithmetically and still be a different eighteen.

## A removal's atom is the code, its tests, and anything rendering it

Ops had the ordering right for the code — consumers first, creation last — **and
had not thought of the tests as part of the same unit.**

Six restored tests cover `focusRepo`, which is removed in a later step. **Deleted
early, the suite goes green over shipping code. Left behind, they guard nothing
and fail for the wrong reason.**

**Ship them in the same commit as the code they cover.** The atom is not the file
or the module — **it is every place the behaviour is asserted, exercised or
displayed.**

## A true sentence that covers less than it appears to

Research reported *"45 insertions, zero deletions, request body untouched"* — **an
accurate description of one commit, written in the same message that announced a
second commit containing a deletion.**

Its own account afterwards: *the sentence was true and it covered less than it
appeared to.*

**This is the hardest failure to catch in a relay, because there is nothing to
contradict.** A false claim can be disproved. **A true claim with an unstated scope
survives every check except one: asking what it covers.**

It was caught by **enumeration, not by disbelief** — the gating thread listed what
the tip actually carried and found a commit the answer had not addressed. **Three
times in one night the catch was somebody checking rather than somebody telling,
and twice it was the same thread doing the checking.**

**So the discipline is on both sides.** The speaker names the scope: *this is true
of X, and here is why it still holds for Y.* **The reader never lets a scope be
implied by proximity** — an answer and a change arriving in one message are two
things, and the message's own coherence is what makes them look like one.

## Standing permission to stop

A thread holding a deploy should not have to ask before refusing it.

**"If the box stutters, if `ssh` fails to spawn, if the stream looks wrong, or if
the tip has moved and the new commit is not docs — stop and tell me. That is always
the right call and it never needs my agreement first."**

Given in advance, this costs nothing and removes the only reason to push through a
bad signal: **not wanting to reopen a decision someone else has already made.**
Without it, the thread with the best view of the failure is the one least
empowered to act on it, **and the window becomes an argument for proceeding.**

**Say explicitly that missing the window is acceptable.** A deadline nobody has
disclaimed is a deadline everybody optimises toward.

## The generator, not the flavour: answering from evidence that cannot answer

Integration produced two wrong explanations in one night and named the pattern as
*"comforting, and false in the same direction."* **That is a description of the
output, which is why naming it did not stop it recurring in the very next
message.**

Design found the mechanism:

**"Answer a question the evidence in front of me cannot answer, from the evidence
in front of me."**

- *373 removed lines are probably setup and fixtures, not cases.* **373 lines
  cannot distinguish those.**
- *Research owes half the thirteen.* **Two threads touching test files cannot
  distinguish who owed what.**

**Neither guess was reached by looking at anything.** Both were a number plus a
story that fits it — **and a number under-determines its own cause, so a story that
fits is guaranteed to exist.** Producing one feels like reasoning, costs nothing,
and is always available. **That is what makes it a reflex rather than a lapse.**

**Comforting is what the story is. Unfalsifiable-from-the-data-at-hand is what
makes it available.** Watch for the second; the first is a symptom.

**THE TEST, AND IT IS CHEAP: could this answer have come out different, from what I
am looking at?** If no, the honest output is **"I don't know, and here is the
command that would tell us."**

## An aggregate detects; an enumeration decides

Four instances in one night, one rule:

```
test count 1853         detected a change     the 18 case NAMES decided what
file count 116 vs 125   detected contamination
research_jobs           detected a shape      model_usage decided the cost
date -u minus four      detected a day        zoneinfo decided the hour
```

Of the three git commands that settled the destroyed tests, **only
`git show <sha>^:<path>` — which lists the cases by name — could ever have
answered it.** The other two established that something moved.

**A total tells you to look. It cannot tell you what you are looking at**, and
every hour lost tonight went on treating a total as an answer.

## Predict the number before the change, or you will explain it afterwards

Design has written down that Ops's `focusRepo` removal should drop the test count
by **exactly six** — the six restored tests that become legitimately obsolete when
that code goes. **Any other number is a new question, not a rounding.**

**A number predicted before a change is a test. The same number explained
afterwards is a story** — and this desk produced two plausible, wrong stories in
one evening for a count nobody had predicted.

**It costs one sentence, written before the work, by whoever knows what the change
should do.**

## A worktree pins source, not dependencies

Gating from a detached worktree stops a suite reading another thread's uncommitted
edit — the fault that produced one unreproducible failure tonight.

**It does not pin `node_modules`.** `npm ci` from the lockfile closes most of the
gap.

**If a gate result ever fails to transfer between two threads on identical trees,
look there first.** It presents as a code difference and is not one — which is the
same shape as every environment fault tonight: **the symptom appears in the domain
of the tool, not the domain of the cause.**

## A blanket authorisation is only as good as the enumeration it was written against

Integration wrote *"all three conditions are met — re-gate at the tip, enumerate,
ship. You do not need to come back to me in between."* **The tip had already moved
when that was written**, and one of the conditions rested on evidence Integration
was in the act of narrowing.

Ops shipped inside that authorisation. **It was a near-miss rather than an incident
only because of a clause written as a formality — "re-enumerate if the tip has
moved" — which was doing all the work.**

**And the commit was not unevidenced: Ops had verified it independently, minutes
before, and Integration did not know that.** The correct account is not *"an
unevidenced commit shipped with permission"* — **the commit had evidence; the
CLEARANCE did not.**

**So a standing "don't come back to me" must name what it is standing on**, and the
re-check clause is the substance of it rather than the courtesy.

## The corroboration that finally counted happened by accident

Two threads read the same commit independently, **neither aware of the other's
reading, minutes apart**, and agreed on the same single substantive line.

**Every other agreement this weekend collapsed on inspection into one computation
performed twice.** This one could not: different readers, different moments, no
shared intermediate.

**It was produced by crossed messages, not by design** — which is the argument for
Ops's other habit of choosing a second instrument deliberately. **The value is in
the independence, and independence can be arranged.**

## A check that has never passed on a known-good case cannot be trusted when it fails

Ops ran his proposed release-integrity check against a release known to be sound.
**430 files on disk against 428 in the tree.** Two real and expected —
`RELEASE_SHA` is written after extraction, `next-env.d.ts` is generated by the
build. **Ten phantom: `git` quotes non-ASCII paths (`\342\200\224` for an em-dash)
while `find -printf %P` emits raw UTF-8**, so six files appeared in both the
missing and the extra lists.

**A set-comparison version would have reported twelve differences on a perfectly
good release** — and it would have done so on a machine that had already produced
four fabricated diagnoses that evening. **The fifth false alarm is the one that
gets the whole class ignored.**

`git -c core.quotePath=false ls-tree` reduces it to the two expected files.

**Second time in one night a check needed proving before it could be trusted** —
the first was a homemade tree digest reporting DIFFER on identical trees.
**Establish what a check says on a case you already know is good, and enumerate its
expected exceptions, before it is allowed to block anything.**

## THIS DESK PRODUCED ONE REAL CORROBORATION IN A WEEKEND, AND IT HAPPENED BY ACCIDENT

**Integration, 2026-09-08**, counting the weekend's agreements.

**Three that looked like corroboration and were ONE COMPUTATION RUN TWICE:**

| the "agreement" | what it actually was |
| --- | --- |
| a back-solved model mix cross-checked against its own fit | the fit, restated |
| token sums checked against the ratio derived from them | the ratio, restated |
| Research's ~630 free jobs against Ops's measured 630 | **the same subtraction over the same two tables** |

**The third is the instructive one: the match was EXACT, which made it feel like
confirmation, and exactness is what arithmetic reproducing itself looks like.**

**And one that was real:** two threads read the same commit minutes apart,
**neither aware the other was reading it**, and converged on the same single
substantive line out of nineteen changed.

### What made the real one real

**NOT independence of METHOD. Independence of KNOWLEDGE.** Neither reader could
be anchored by the other's answer, **because neither had one.**

**Two computations sharing an input are not two observations, however different
the arithmetic on top.** The test is not *did they agree* but **could they have
disagreed, and did each have its own path to a wrong answer.**

### THE PART THAT SHOULD NOT SURVIVE AS A HAPPY STORY

**IT HAPPENED BECAUSE MESSAGES CROSSED.** Nobody arranged it. **In a weekend of
deliberate checking, the only genuine corroboration was an accident of
timing** — which means the deliberate checking was producing something else, and
producing it confidently.

**So arrange it: hand the same artefact to two readers without telling either
what the other found.** Ops now gates from a pinned worktree rather than
confirming a number it was given, **which is that principle made routine instead
of lucky.**

*Counterpart to **"four checks of one kind are one check"** above. That one says
a list of checks can share an axis. This says two ANSWERS can share an input,
**and the second is harder to see because agreement feels like evidence in a way
a list does not.***

## A prediction with no threshold is a story wearing the shape of one

Design had pre-registered read 4 as **"expect FEW NEW HIGH rows."**

**"Few" has no threshold, so every possible observation confirms it** — one is few,
twelve is arguably few, zero is few. **It would have been read at the board, matched
against nothing, and reported as a pass.**

**That is worse than no prediction, because it has the form of one and none of the
content**, and it satisfies whoever wrote it that a test exists.

**The test for a pre-registration is the same test as for an explanation: could the
observation have come out failing?** If no threshold, no interval and no direction
is stated, the answer is no.

**And when the data cannot produce a prior, do not invent one.** Picking a number
to feel pre-registered is the generator exactly — answering from evidence that
cannot answer — **and it is tempting precisely because a number looks more rigorous
than no number.**

**The honest move is to demote the read: MEASURE first, TEST second, and say in the
report which one is being done.** Design's read 4 now reports NEW HIGH count, OFF
HIGH count and `sessionHigh > cycleHigh` rows, raw, over the board denominator —
**it establishes the base rate and does not test one.** It becomes a test on the
read after it.

## The local store is frozen, and a frozen store answers confidently

```
ticker_session    LOCAL 25,789 rows      PRODUCTION 143,142
```

**Every local table is frozen at 2026-08-18** — three weeks stale at the time of
writing. Local `PARTIAL` at 53% against production's actual 72% is the size of the
gap.

**What makes it dangerous rather than merely limited: a figure computed locally
looks completely normal** — right shape, right columns, plausible magnitude, and
wrong. **There is no marker on a stale store.** Second time this has caught the
desk.

**Any number from the local store is a shape. Production figures come through the
thread that can query production.**

## Overwritten is not merely unrecorded

`ticker_session` has PK `(symbol, trading_date)` — **25,789 rows, 25,789 distinct
pairs.** It is a snapshot updated in place.

**So there is no intraday state stored at ANY date, and unfreezing the local store
would not help.** The history was never written; it was **overwritten**.

**Before planning a query that reconstructs how a value changed during a session,
check whether the source has one row per state or one row per entity.** A table
with one row per name per day cannot say what a field looked like at 07:00 —
**not because the data is old, but because that shape has never existed.**

**"We have the data, it is just stale" and "the data was never kept" require
completely different responses**, and only the first is fixable by refreshing.

## An answer without its question attaches itself to whatever the reader is holding

The trader wrote *"i told commercial its : Algo Trader Plus."* Integration read it
as the product's chosen name and repeated it onward — into a naming brief and back
to the trader as though it were his own choice.

**It was the answer to Commercial's question about which Alpaca market-data plan
the account is on.** It is the data vendor's subscription tier — **the one string
the app cannot be called.**

**A quoted fragment carries no question with it**, and a reader supplies the one
they happen to be holding. **Same shape as reading an answer about one commit as
covering two: the message was true and its scope was invisible.**

**So relay the question with the answer, or quote neither.** And when a fragment
arrives without context, **the safe reading is "answer to something I cannot see",
not "answer to what I am working on."**

**Caught by the thread that had asked the original question** — which is the only
place it could have been caught, and an argument for facts going direct rather than
being relayed at all.

## A vestigial input is not kept alive because removing it needs a decision

`lib/mcp/tools.ts:335` fed pinned tickers into event prioritisation as the
`primary` set. Removing the pin store is therefore **not a deletion there — it is a
decision about how MCP ranks with no primary set.**

**The measurement settled it: `focus_tickers` has held exactly one row in its
entire history.** So `primary` has been empty or single-valued for effectively the
whole life of the feature. **"Keep it and give it a new source" would mean
designing a fresh input for something that has never once operated on more than one
name.**

**If the capability is wanted later it is a new feature with a reason.** The failure
mode is keeping a dead input because its removal requires someone to decide, and a
decision is more expensive than a shrug.

**And it was already dead, silently.** Pins went client-side, nothing writes the
store, the date filter excludes the one historical row — **so the primary set
emptied at deploy with no error and no log, and the ranking simply fell back.**
**The never-true field, in an ORDERING rather than a column** — worse than the
badge it followed, because a badge is visible and an ordering is not.

## Re-register the number when the scope widens

`−6` was pre-registered for a `focusRepo` removal. The atom then grew to include
`focusStore`, two MCP consumers and a review-token route.

**A prediction inherited from a smaller scope is worse than no prediction.** It will
be met or missed for reasons unrelated to the work, **and either outcome teaches
nothing** — a miss looks like a defect, a match looks like confirmation, and
neither is.

**When scope changes, the prediction is re-made before the work, with its
composition stated:** six plus whatever the new consumers carry, enumerated by name.

## Fourth for fourth: the carrier reaches further than the store

```
candidate.focused        past  focus_tickers          2 sites missed
two isEligible branches  past  the SQL clause
six focusRepo tests      past  the code they cover
two MCP consumers        past  two API routes
```

**Four enumerations in one night, four times short, always in the same direction.**
Every miss was found by searching for **what carries the value onward** rather than
**where the value is stored.**

**The table is never the boundary.** Neither is the module, the route, or the
thread. **The boundary is wherever the last reader stops reading it.**

## A defect can be the only reason a measurement is possible

Already on file: *a defect can be the only reason a change is safe, so the order is
load-bearing.* **This is its second instance and it widens the rule.**

`research_sources` holds eight fingerprint inputs. **Seven are per-row. `active`
updates in place** — so deactivating a source moves the evidence fingerprint and
**leaves no record of when.** The overwriting shape, in the one table that is
otherwise durable append-only history.

**It is inert only because `deactivateSources` has zero production callers** —
exported, documented, tested, `withBusyRetry`-wrapped, called from nothing but
tests. Already on the desk's own *written, never called* list.

**So one defect is neutralised by a second, and fixing the second destroys an
axis** — from that commit forward, permanently, with nothing marking the boundary.

**Ruled: it does not get wired without recording the deactivation, in the same
change.** A timestamp or a row; the requirement is that the thing which moved the
fingerprint leaves a trace. **`ALTER TABLE ADD COLUMN` is supported here, so the
cost is one field on a write already being added** — against a re-derivation
afterwards, plus an undated boundary in the data.

**The general form: before fixing a defect, ask what currently depends on it.** Not
only what it endangers.

## Exclude from a fingerprint the things you did, keep the things they did

`fingerprint.ts` deliberately excludes fetch timestamps: **"fetching is something we
did, not something the issuer did."**

**That single decision is why "did the evidence change?" is a meaningful question
at all.** A fingerprint that moved when we fetched would make every job look like
new evidence, and the short-circuit built on it would never fire — **which is a
version of the failure the desk spent a whole night chasing in a different table.**

**When hashing state to detect change, include only what the external world
controls.** Anything the system does to itself — timestamps, retries, cache state,
worker identity — belongs outside the hash, or the hash measures activity instead
of change.

## A correct call resting on a wrong model will eventually be made in the wrong case

Research flagged its local figures as *shapes rather than figures* and was right to.
**It believed the local store was a different desk. It was a three-week-frozen copy
of the same one.**

*"The instinct was right for a weaker reason than the real one."*

**A conclusion that happens to be right does not validate the model that produced
it.** The same model applied one case over — where the two explanations diverge —
produces a wrong answer with the same confidence, and the earlier success is what
makes it hard to question.

**So say which reason you are acting on, especially when the action turns out
correct.**

## The claim you defend without re-reading is the one to re-read

Integration doubted one of two pre-registered tests and asked Research to check
both. **Research defended the other — and the defended one was worse.**

Its registration read: *"objections must CONCENTRATE at the top of that
distribution. If the objection rate is FLAT across run size, the report is
describing small-caps in general."* **`Concentrate` and `flat` are `few` with more
syllables** — no threshold, no cell definition, no floor. **Any distribution can be
argued into either word after the fact, by the person who wrote the brief it is
judged against.**

**Confidence about your own work is a memory of intent, not a reading of what is
written.** That is the same distance as a comment and a behaviour, applied to
yourself — **and the third time in one night the same thread corrected a confident
claim about its own work after finally re-reading it.** The other two were caught by
other people.

## A test that cannot pass is the mirror of one that cannot fail

Offered a threshold it could not derive, Research reached for **monotonic increase
across quartiles** — decidable, no invented number, **and it fails on noise.** It
would return NO on a working report.

**Both failures are the same failure: the outcome is determined by the test's
construction rather than by the world.** An unfalsifiable test always passes; an
unsatisfiable one always fails. **The second is more dangerous because it looks
rigorous** — refusing an invented threshold feels like discipline right up to the
point where the replacement cannot succeed.

**And a threshold nobody can derive is a threshold someone chose.** When there is no
data to derive one from, **the honest output is a measurement, not a stricter
test.**

## Gate on what the thing needs to exist, not on tests you happen to have

Integration held a renderer *"pending two registered tests."* When both tests were
correctly demoted to measurements, the gate vanished — **and it had always been the
wrong one.**

**The real gate was in plain sight: there is no production objection data at all,
and the verdict is not wired.** The renderer would render nothing, from nothing,
and every judgement about it would be made against zero examples.

**Correct gate: wire the verdict, let it run, build against outputs that actually
occurred.** The two measurements then become the base rates that make the read after
them a test — **an input, which is what they always were.**

**Building a gate out of the tests you happen to have is the same error as ruling
that a fallback uses `rank` without asking what `rank` is:** answering "what should
happen next" from whatever is nearest rather than from what the decision requires.

## Two half-questions a day apart are worse than one whole question tomorrow

The trader asked what the ranking is based on. Separately, the Why Not Report's
reach turns out to be structural: research is queued on `rank <= 12`, **so the
report's reach IS the board's width.**

**These are one question.** If `rank` is RVOL-derived, then *"the report covers the
top 12 by rank"* means **it only ever objects to RVOL leaders** — and he has said
twice that gain is where the money is made.

**So hold the second until the first has its answer, and put them together with the
fact underneath them.** A decision split across two days is made twice, from
different context each time, **and the second half arrives as a follow-up rather
than as the thing that changes the first.**

## A pattern narrow enough to be precise is blind to the carrier; wide enough to catch it is blind with noise

Ops needed to count which tests a removal would take. **A per-test scan matching the
obvious symbols reported 16 and was blind twice** — one suite reached the table
through a one-line local `focus()` helper, another reached the display layer
through `selectFocusRows`.

**Widening to a substring match gave 121:** "stri**ppin**g", "**pin**ned schema
version", "s**pin** loop".

**Neither number is an enumeration.** The narrow pattern misses every hop the value
takes under a new name; the wide one matches text that has nothing to do with the
value at all.

**The method that worked: classify each unit by the symbols it actually resolves,
with the layers separated.** Twelve, by name, split into the ten that drive the
store and the two that drive the display.

**Fifth instance tonight of the same rule** — the enumeration unit is the carrier,
and a search over names is not a search over meaning.

**And check name collisions rather than assuming them.** `focusCount` derived from
`internalRank*4`, and an archived `focus_any` that stays and simply stops
advancing, both share the word and neither shares the thing. **A shared word is not
a shared thing** — in either direction.

## A read tool that can only return empty is the never-true field as an API

With pins client-side, the server cannot know a pin — so an MCP `get_focus` tool
would return a **structurally always-empty list, forever, plausibly.**

**Worse than a dead column: a dead column is inert, and a documented capability
answers.** Anyone building against it gets a valid, empty, permanently wrong
result, and nothing in the response says so.

**It goes, and the documented surface drops from eight tools to seven** — named in
the change, named in the docs. **A capability leaving an external surface is a
decision someone makes, not something that happens as a side effect of a
deletion.**

## Orphan-and-label beats stop-creating, when production already has the table

Two instructions pulled apart: *stop creating the table in both definitions*, and
*orphan and label, no DROP.*

**Orphan-and-label wins.** Production has the table and is not dropping it, so
**removing the `CREATE` makes a fresh store diverge from production — new installs
lacking a table prod has.** That is two schema shapes in the wild **with no
migration between them**, and the next writer touching it hits an untested path on
one of the two.

**The module's own `ensureFocusTable` goes with the module.** The base schema's
`CREATE` **stays, with a comment naming it orphaned, dated, and saying nothing
writes it** — because an undated boundary in a schema is the same failure as an
undated boundary in data.

**And it keeps the guards that INSERT into the table to prove a pin is ignored.** A
test that stopped inserting would pass for the wrong reason.

## Say which premise changed, not just which way you now rule

Integration took three positions on one question: remove the pin-driven ordering;
then hold it; then proceed.

**That is only defensible with the premises attached.** The first was made without
knowing what the fallback ordering was. The second was correct — a fallback had
been ruled without being read. **The third came when the hold's premise turned out
to be false: keeping the pin seed was never an option, because pins are
client-side and the server cannot know a pin.**

**A hold that forecloses nothing is not caution, it is delay** — and the open
question it was protecting (volume-only versus gain) is answered by building a new
ordering with a new source either way. **Deleting dead plumbing neither helps nor
hinders it.**

**When reversing yourself, name the fact that moved.** Three rulings with three
reasons is a sequence; three rulings without them is noise, and nobody downstream
can tell which one to build against.

## A tautology does not agree with you; it cannot see you

```
[ "$(git rev-parse HEAD)" = "$(git rev-parse HEAD)" ]    ->  "SAME as main"
```

Confident, plausible, **and structurally incapable of ever printing anything
else.**

**Worse than a wrong answer.** A check that returns a wrong result once is caught
by the next case. **A tautology is permanently, silently correct — and it
accumulates a record of passes that reads as evidence.** It would have passed every
future run too.

**Third instance in one night**, with the calendar-adjacency test and the focus
regex — **and the exact mirror of a test that cannot pass.** Both have their answer
written into their construction rather than taken from the world.

**The check on any check: name the input that would make it fail, and confirm that
input is reachable.** If you cannot name one, you have written an assertion about
your own code, not a measurement of anything.

## Measure drift in code, not in commits

*"Production is twenty commits behind main"* is the wrong unit, and it frightens
people into deploying or reassures them into not.

**Most of those twenty were documentation.** The question is always:

```
git diff --stat <deployed> main -- . ':(exclude)docs'
```

**A hundred commits of docs is zero drift. One commit touching a spend path is
all of it.** Commit count measures how talkative the desk has been; **the code
delta measures what is actually not running in production.**

## A number can be right, from the wrong baseline, by coincidence

Ops registered `1871` as the baseline for an atom built on main — **quoting it from
the DEPLOYED sha, which was twenty commits behind, while gating in a worktree five
behind main on top of that.** The number was from neither tree.

**It was correct, because the intervening commits happened to net zero.**

*"It was right for a reason I had not checked."*

**Second instance in one night of a correct call resting on a wrong model** — the
first was local figures flagged as shapes for the wrong reason. **A right answer
does not validate the method that produced it**, and the coincidence is what
prevents anyone looking again.

## The thread with a pre-registered number lands first

Two threads had uncommitted work in the shared tree. **One had registered a
predicted test delta before building; the other had not.**

**Whoever lands second inherits the other's shift** — and a registration spent on
someone else's change is destroyed as an instrument, not merely inconvenienced.

**So: registered work lands first.** The delta (`−9`) belongs to the change and is
invariant. **The absolute (`1862`) is true only if it lands first**, which is why a
prediction should be stated as a delta wherever a shared tree can move underneath
it.

## A forced check is disposed of by declaring what its zero means, in its own output

Research built a 2x2 and found **both cells structurally forced**: `MOVED / ADDED
NONE` = 0 of 729 could not have been anything else, and a new url must move the
hash. *"I built a check that could not fail, and the code told me, not the data."*

**It did not delete it.** It relabelled it a **tripwire** and made the instrument
say so in its own output: **a zero in either cell is forced and not a passed
check.** A non-zero then means the structure moved underneath us.

**That is the right disposal of a forced check, and it is better than deletion.**
Tonight produced four instruments whose answers were written into their
construction — a tautology, `few`, `concentrate`/`flat`, and this — **and three
were deleted or demoted.** This one keeps its value.

**The mechanism that makes it work: the caveat lives in the OUTPUT, not in the
message that reported it.** A caveat in a conversation does not travel to the next
reader. **A line printed beside the number does.**

## When two functions in one module differ by one word, quote the signature

`computeEvidenceFingerprint` — eight fields, gates interpretation at
`pipeline.ts:182`. `computeCatalystFingerprint` — five fields, feeds a report.
**Same module, adjacent purpose, and an instrument's docstring named the wrong
one.**

**Second time on that exact pair.**

**A misnaming that produces plausible output is undetectable from results.** Nothing
in the output looks wrong, no test fails, and the reader has no reason to look.
**So it needs a habit rather than a review: quote the signature, not the name.**

## Two COMPLETEs with a silent stage, at different stages

```
72 jobs   COMPLETE, no model call        -> the JOIN was losing rows, not the work missing
46 jobs   COMPLETE, collector silent     -> unknown
```

**Different snapshot, different table, different stage. Not the same defect, and
they must not be merged.**

**But both are `COMPLETE` reached with a required stage having produced nothing** —
and the first resolved to **a missing LINK rather than missing WORK.** So the first
thing to exclude on the second is the same question one stage upstream: **is the
report missing, or is the key to it missing?**

**When a second anomaly shares a shape with one already solved, carry the SOLUTION
across as a hypothesis to exclude — never as a conclusion.** The value is in
knowing which question is cheapest to ask first.

## State the number and its window in the same breath

Research reported production figures from `data/market-prod-2026-08-23.db` — real
production, **15 days stale** — and said so **in the same message as the numbers**,
adding that it had twice previously published a local denominator as though it were
production.

**That form is the fix: the figure and its provenance travel together or the figure
travels alone.** A window mentioned once, three messages earlier, is not attached to
anything.

**And the standing boundary, so it is never re-asked: using an existing approved
snapshot is fine; taking a new one down from production is not, without the
trader's approval. Figures go into documents. The file never does.**

## A feature's positioning is not the product's positioning

The trader ruled that research is for the avoid, named it **the Why Not Report**,
and said *"success comes more in what you dont trade than what you do."* **All true
of that report.**

Integration wrote it into a naming brief as **the identity of the whole desk** —
*"the avoid positioning is the real asset... that is the thing a name can carry
that nobody else's can."* Commercial worked the angle it was handed, well, **and
the axis was wrong before it started.**

His correction: *"you're over indexing on the avoid/why not concept. the idea here
is this is a depth tool. its intelligence. its not a scanner but a smart desk. an
assistant that gives you depth on the moving market."*

**The avoid is one expression of depth. It is not the category.**

**The failure is a specific kind of relay error: a strong, quotable ruling about
ONE PART gets carried as a ruling about THE WHOLE**, and it travels well precisely
because it is quotable. **Ask what the ruling was a ruling ABOUT** — a report, a
surface, a stage — **before letting it set the frame for anything larger.**

**And when a brief turns out to be wrong, the work done against it is not wasted
and not the worker's error.** The method survives the angle: proven lookups,
timestamped checks, travelling caveats, the set-aside list with its reasons. **Only
the axis is re-run.**

## An aside raised as "naming it, not chasing it" is still a claim

Research refused to overstate a fingerprint finding — sized it honestly, gave the
denominator, flagged the snapshot's age — **and in the same message published an
undecomposed gap as an aside: 46 jobs COMPLETE with the collector silent.**

**The care went to the headline and the aside travelled free.** Integration relayed
it onward within minutes, which is the proof.

**Asides travel further than headlines precisely because nobody expects to have to
check them.** They arrive pre-hedged — *naming it, not chasing it* — and the hedge
is read as modesty rather than as "unverified".

**Decompose before mentioning, or say the number is undecomposed in the same
breath.**

The decomposition, when it came, was total: **last job without a report is 227,
first with one is 228, zero interleaving; 227 + 8 queued = 235, nothing left
over.** The 46 carry every stage timestamp identically to the 74 that do report.
**The work happened; the recording had not been built yet.**

**A clean boundary with no residue is the strongest form this answer takes — there
is nothing left for a story to attach to.**

## A shape match is not a mechanism match

Two anomalies shared a shape: `COMPLETE` reached with a required stage silent.
Integration suggested carrying the solved one's answer across as a hypothesis —
*"if the collector report is keyed the way `model_usage` is keyed, you already know
how this ends."*

**It is not keyed at all.** `recordCollectorReport` is `UPDATE research_jobs SET
collector_report = ? WHERE id = ?` — **a column on the job row. There is no join to
lose.** One line, already read by the thread receiving the suggestion.

**Offering a mechanism without checking it is structurally available steers a
search.** Hedging it as a hypothesis does not undo that.

**Ask "what could this be" before "what is this like."** The cost of checking
availability first is one grep; the cost of not is somebody else's hour, spent
inside your framing.

**And un-pair them in the record once the answer lands.** The first was a join
losing rows; the second was a feature that did not exist yet. **Two anomalies that
were never related should not keep travelling together because they were once
mentioned in the same sentence.**

## A ruling's stated condition can be destroyed by the implementation of the ruling

He ruled **VANISH — "keep the graveyard, as long as resurrections remain
possible."** One clause, and it is the whole safety of the change.

**Integration guessed the wrong threat.** It saw `activity` read by the
subscription selector and concluded a vanished name would lose its data and never
revive. **`applyHighResSelection` drives `trades`, `quotes` and `lulds`. It does not
drive bars** — bars are wildcarded whole-market, deliberately: *"minute bars are
the discovery input."* A corpse keeps receiving them in both subscription modes.
**A coupling asserted from shape, again.**

**The real threat is one step later and it is in the implementation, not the
design.** Nothing today removes a name from `this.tickers`. **If vanish deletes the
runtime instead of filtering the view, the runtime holding `minuteTrades` goes with
it — nothing is left to revive — and the same removal ends the name's bars in the
degraded path.**

**His one stated condition would be destroyed by the building of his own ruling,
silently, in the option he chose precisely because it removes things quietly.**

**THE RULE: VANISH IS A VIEW FILTER, NOT A DELETION. THE ROW STAYS WHOLE.** Already
the file's own pattern: *"The rank itself is untouched, because the graveyard needs
the row whole; only this reader changed."* **One flag, many readers, and only the
reader changes.**

**The general form: when a decision carries a condition, trace the condition
through the IMPLEMENTATION, not just the design.** A design can satisfy a condition
that its obvious implementation violates — and the person who stated the condition
will never see it fail.

## Order is load-bearing when the chosen option removes the witness

Given VANISH and SHOW-AS-DROPPED, he chose vanish. **Show-as-dropped would have
made a misfiring `DEAD` flag visible on the board. Vanish removes the name with no
witness.**

And the `DEAD` flag is currently under suspicion: a missed window zero-fills to five
zero slots, and five zeros are below any dead line.

**Wiring a silent remover to a flag believed to be misfiring is the worst
combination available** — not because the ruling is wrong, but because **the order
is.** A confirmed-clean signal is a **precondition** for that option, where it would
have been merely desirable for the other.

**When a ruling changes which failures are observable, re-derive the build order
from the new observability, not from the old queue.**

## Two mechanisms, one deliberately producing the state the other deliberately deletes

`RESTART_MARKET=no` exists so a deploy can leave one unit running on the previous
release. **Prune protects `current` and pinned releases. Nothing protects the
release a running unit is actually using.**

So a deploy removed the tree `mointel-market` was executing from:

```
[prune] remove  c84e0df...          <- the live release of a running unit
/proc/99025/cwd -> / (deleted)
```

**The unit stayed `active`, `STREAMING`, heartbeat 1s.** The failure is invisible at
every level anyone looks at. And `ExecStart` is `tsx worker/alpaca.ts` —
**transpiled from disk on demand**, so any module not yet loaded would have failed
to read. Not a binary holding its own inode.

**Every branch self-corrected** — `Restart=always`, `WorkingDirectory` pointing at
`current` — **which is exactly why it would never have been found.**

**Standing rule until prune is fixed: a deploy with `RESTART_MARKET=no` is not
complete until the old release directory is confirmed to still exist.** One
`test -d`. If prune has taken it, restart the unit rather than leave it running on
a deleted tree.

**The general form: when one feature's purpose is to create a state, check every
janitor that decides what states are garbage.** Neither mechanism is wrong alone.

## A scheduled instruction whose purpose is met does not become inert

The 03:15 task's two purposes were both satisfied early — the refetch had run at
01:28, the version split was closed.

**It would still have dropped the SIP connection 45 minutes before capture**, then
expected `max(updated_at)` to move, **which it would not**, because a 2-hour-old
universe correctly skips the 20-hour guard. **A finding reported at 03:15 about a
desk that was fine, and a real cost paid to produce it.**

**A scheduled action does not stop acting when its reason expires. It becomes an
action with no reason and the same side effects.**

**So when the thing a scheduled task was written for happens early, the task is
re-read, not left.** Rewritten read-only here, carrying the pre-registered outcomes
to check rather than a restart to perform.

## Two quick scans, written independently, blind in different places

Ops built a narrow regex scan over test files, found it blind to the carrier, and
replaced it with a classification by resolved symbols. Design, separately, wrote a
python walk mapping repo symbols to the last-seen `it()` block — **with no
block-end tracking**, so the word `focusRepo` in a **restoration comment sitting
below the final case** was attributed to that case.

**Integration concluded Design had inherited the entry from Ops's discarded scan.
It had not. It had never seen that output.**

**Two instruments, written independently, failing the same way** — one blind to the
carrier, one blind to the block boundary. **That is worse news than contamination,
not better: the failure is available to anyone who writes a quick scan**, rather
than being a one-off that travelled.

**And it is the fourth time in one night a comment was read as code — the first
where the comment belonged to the person reading it.**

**The meta-lesson is the one Design named: a wrong mechanism attached to a correct
conclusion is the thing this desk has chased all weekend.** The warning about
inherited inputs is sound and is not what happened here. **The conclusion — that
the entry was wrong — survived; the explanation had to be replaced entirely.**

**Ops's half stands unchanged and is the sharpest line of the night: his two
instruments disagreed with each other on exactly that entry and he took the newer
one without noticing the conflict.** *"The newer method won" is not the same as
"the conflict was resolved"* — the disagreement is evidence about one of the
instruments, and discarding it discards the evidence.

## Silence with no precondition is inconclusive, including your own marker's

Design's pre-registered read said the universe-freshness marker should be **silent**
at premarket. Checking a live baseline first:

```
universeUpdatedAt : 2026-09-06T21:52:59Z    <- ~45 HOURS OLD
universeFreshness : FRESH
universeRollDue   : false
-> universeWarning() returns null. SILENT.
```

**The marker was silent on a 45-hour-old universe, correctly** — it speaks on
`STALE`, or on `UNKNOWN` with `rollDue`. **It reports the engine's verdict and
cannot contradict it.** If the engine calls a two-day-old universe FRESH, the
surface is silent by construction.

**So "silent at 04:00" is not evidence the marker works.** The precondition —
`universeFreshness !== 'FRESH'`, read from the payload rather than from the screen
— has to hold before silence means anything.

**A surface that reports another component's verdict can only ever be tested
against a case where that verdict is adverse.** Testing it on a healthy day tests
nothing, however green it looks.

## Stage nothing you are not about to commit

Four of Ops's staged deletions from the pin removal were swept into `f598564`, a
Design commit about sparkline floors. **A commit in a shared working tree takes
whatever a peer left in the index, and the author's message describes none of it.**

Already pushed and the deletions were correct, so the misattribution was **recorded
in the next commit rather than rewritten** — the trail is findable from the other
end.

**Ops had avoided this in the other direction an hour earlier**, by leaving
Research's four uncommitted files alone. **That restraint bought nothing**, and its
own account is why:

> *"Leaving a peer's work alone only protects it if every peer does — and none of
> us has a rule."*

**THE RULE — AND THE FIRST VERSION OF IT CONTAINED THE FAILING CASE:**

> **`git commit --only <paths>` (equivalently `git commit -- <paths>`). NEVER a
> bare `git commit` in a shared tree, even after staging one file. NEVER
> `git add -A` or `git add .`.**

**The clause that had to be removed was *"or `git add <path>` immediately
before"* — because that is exactly what produced `f598564`:**

```
git add docs/threads/design.md && git commit -q -F- <<'MSG'
```

**One file. Explicit path. Staged immediately before.** It swept four of a peer's
files anyway, **because `git add` only ADDS to the index and `git commit` then
commits the WHOLE index** — including everything a peer staged before you arrived.

**Staging by explicit path constrains what you PUT IN. It does nothing about what
is ALREADY THERE.**

**And that is why the older rule was insufficient rather than wrong: *never
`git add -A`* guards the ADD, and the exposure is in the COMMIT.** A rule aimed at
staging cannot see this, because staging was never where the risk lived.

**Verified rather than argued: three commits under `--only` came back
`1 file changed` with the peer's work still sitting staged behind them.** An audit
of ten earlier commits was also `1 file changed` — **which is why it looked safe
for a whole night. It needs a peer's staged work to coincide with your commit, so
it is rare, and it is not going to stop being possible.**

**A rule that only appears to work is worse than none, because everyone believes
they are covered.**

**A discipline that only works when universally practised is not a habit, it is a
protocol** — and one thread observing it while the others do not produces exactly
the false sense of safety that made this surprising.

## An exit code is a claim about a process, not about the artefact

A build reported `BUILD_EXIT=0` and was not a build. Above the code, in text
nothing was reading, it said **"a previous build that didn't exit cleanly"** — the
background gate was still running.

**Two of that session's four self-caught failures came from reading OUTPUT the
suite never looks at.** A green exit, a passing count and a clean lint are all
claims about processes completing; **none of them is a claim that the thing was
produced.**

**Re-run it alone and confirm the artefact directly** — here, that `/api/focus` and
`/review/[token]/api/focus` were absent from the route table. **The route table is
evidence. The exit code is a rumour.**

## Knowing a trap by name is not the same as not walking into it

Backticks in a SQL comment inside a template literal broke `db.ts` entirely, and
surfaced as **"Transform failed" in an MCP test file that had not been touched.**
**Second time in one night, same mechanism** — the first was `repo.ts`.

And a grep-based guard fired on its author's own new comment, because the comment
**named the table it was explaining nothing reads.** **Fourth comment-read-as-code
of the night, second where the comment belonged to its reader.**

**The repair is the useful part: the comment now states that the name is
deliberately absent because a grep depends on it.** A constraint that lives only in
a guard will be innocently violated by the next person; **written at the site, it
survives.**

**Naming a trap in a document does not stop anyone falling into it.** Only a
mechanism at the point of failure does.

## A fabricated pointer is worse than no pointer

Design's commit command printed `1 file changed, 43 insertions(+)` and **did not
print the hash.** The message it wrote quoted a sha anyway — **`bd9d4b4`, which does
not exist.** The real commit was `44e9300`.

*"There was nothing to copy and I supplied a plausible-looking string in its
place."*

**The smallest possible instance of the night's generator: producing something
plausible where the evidence to produce it was absent** — in a seven-character
token, inside the message that was about doing exactly that.

**And it is worse than omitting it.** An absent sha invites *"which commit?"* **A
fabricated one closes the question** — the same shape as a measured zero closing a
question an unverified assertion would have left open. It also sends anyone
verifying you to nothing, **while looking like you checked.**

**The fix is mechanical and that is what makes it the right kind: print the sha in
the same command that makes the commit, and quote only what came back.** Not
vigilance — **a place where the value cannot be absent at the moment it is needed.**

**And the relay exposure it revealed: Integration had been passing peer shas onward
without checking them.** A fabricated pointer entering a relay becomes a fabricated
pointer with the relay's name on it, **and a sha is exactly the token nobody
re-reads.** Every sha passed onward now gets `git cat-file -e` first. Checked
across the night's traffic, **only that one was wrong.**

## Auditing the instrument is not auditing the experiment

Design flagged one input as unverified **twice**, and asked the right-sounding
question: *"is this one predicate or two separate counts?"*

**It was one predicate. The answer was correct and completely useless.**

The comparison was `activity_window SET` against `price_window NULL` on the same
rows — **and one of the two columns did not exist during the session being
measured.** `activity_window` was committed 2026-09-04 02:37 ET, before that
session; `price_window` at 13:09 ET, deployed after it.

**The question never asked was whether the two arms had the same OPPORTUNITY to be
written.**

*"I audited the instrument and not the experiment — and I did it while
congratulating myself for auditing the instrument."*

**This is a distinct failure from everything else on this file.** The others are
*not checking*. **This was checking, thoroughly, at the wrong level** — and the
thoroughness is what closed the question. **A diligence that produces confidence
about the wrong property is worse than no check**, for exactly the reason a
measured zero beats an unverified assertion at ending a conversation.

**Underneath it, the usual absent value carrying two meanings:** `NULL` meant *the
column did not exist yet*; it was read as *computed and withheld*. **Same absence,
opposite implications, four commits built on the wrong one.**

**And the discipline at the end: git shows when CODE was written, not when
production MIGRATED.** The commit dates are *consistent with* the migration stamp
and do not *establish* it. **Declining to treat corroboration as proof, in the
direction that would have made you more right, is the check nobody applies at the
end of an argument they have just lost.**

## Telling someone to distrust a working instrument is the more expensive error

Integration told the trader to disregard the activity sparklines, on a finding that
was later withdrawn. The bars were correct; the guard was never bypassed; the
comment on the component was accurate.

> **"An instruction to distrust a working instrument is more expensive than the
> instrument being broken, because it costs him the reading every morning until
> someone remembers to take it back."**

**A broken instrument gets fixed by someone. A distrusted working one quietly stops
being used, and nobody schedules the moment it comes back.**

**So a withdrawal must be issued in the same register as the original** — same
plainness, no hedge, no "pending" — **and it must be repeated as many times as the
original claim was made.** A caveat cannot retire an instruction; only an
instruction can.

## A relayed instruction is not an authorisation; the same words direct are

The trader told Commercial *"ops can do that. register with amazon."* Integration
read that as authorising Ops and wrote it a sequencing plan.

**It did not.** Ops put the question to him directly and **he answered in Ops's own
session**, naming the account to use and where to find the existing registrations.
**Then it was authorised.**

**The difference is the channel, not the act.** A relay carries a fact about what
someone said. **It does not carry the decision to the thread that must perform it** —
and the performing thread is the one that has to be able to refuse.

**Integration was wrong twice in one message: wrong that a relay could authorise,
and wrong that the act was unavailable at all.**

## Know where a colleague's hard line actually falls before defending it for them

Integration attributed to Ops a boundary against **purchases**. Ops's line is
narrower and sharper: **entering payment or credential details.**

A charge against an account whose payment method is already configured, through an
authenticated API call, on the owner's explicit direct word, **involves no card
being seen, typed or handled.** That is a different act from standing at a
checkout.

**Widening someone else's constraint on their behalf looks like respect and is a
second error** — it blocks work nobody objected to, and it obscures the real line,
which then goes undefended when it actually matters.

**And the real line, stated by the thread that holds it:** *"entering a password to
authenticate is the actual hard line."*

## The credentials on this desk are console passwords, not API keys

`A:\AWS_creds` holds **username, password and sign-in URL. Nothing else.**

**No thread here can use them, and none will** — authenticating by typing a
password is the hard line. **Programmatic access comes from a configured profile,
which is a different mechanism entirely.**

**Anyone planning work on the assumption those files are usable by a thread is
planning a handoff that ends at a login form** — and it would surface mid-incident,
with someone assuming a credential was available.

## Personal contact details that pass through a conversation are in it forever

Registering a domain needs registrant, admin and technical contacts: a real name,
address, email and phone.

**Ops copied them machine-to-machine — from an existing domain via the API into a
scratch file, used them, deleted them.** They never entered a chat transcript.

**Details that move through a conversation are in the transcript permanently.
Details that move between systems and are deleted are not.** Same class as the rule
that the feed probe's User-Agent is never pasted anywhere it could travel, and
reached independently.

**A privacy boundary you observe only when reminded is not one.**

## A fix closes the future; it says nothing about what has already been destroyed

The minute-bar retention defect — `8018b9b`, *"The prose said trading dates; the
loop counted calendar days"* — was found, fixed and deployed. **09-02 and 09-03
were restored from a migration backup, row-for-row. Everyone moved on.**

**Nobody enumerated what the defect had already taken.**

Three days later the desk spent a night deciding that minute bars had stopped
being **written** — building write-path hypotheses, eliminating gates, filters,
locks, disks, schemas and clocks. **The insert never failed. The rows were removed
afterwards, by the defect that was already fixed.**

```
09-04 07:29Z   v23 backup      minute_bars 2,116,296
09-04 08:00Z   session opens, runs normally, writes bars
09-05 08:32Z   v24 backup      minute_bars 0   -- ticker_session +8,668, desk_events +36,357
09-05 09:03Z   8018b9b fixes it
09-06 ~21:54Z  restore from the 07:29 backup -- which PREDATES the 09-04 session
```

**`minute_bars` went to zero while the other two tables grew normally through the
same session** — which excludes any all-tables wipe and leaves the one deleter
scoped to that table alone.

**Two rules, and the second is the expensive one.**

**When a defect is fixed, enumerate what it did before the fix.** A repair changes
what happens next. **The damage is a separate question and it is never asked,
because the fix feels like the end of the incident.**

**And when you restore from a backup, state what the backup does NOT contain.** The
restore was verified by row count — 1,054,662 and 1,061,634, exactly right — **and
the verification could not see that a third date was missing entirely, because a
count confirms what is there and is blind to what is absent.** The backup predated
a session nobody thought to look for.

**The strongest argument of the night pointed at the truth and was read backwards.**
Research established that two independent writers would both have had to fail
leaving no trace, and concluded no single write bug could do it. **That was
correct — because it was not a write bug at all.**

## Varying one input at a time leaves the combining function untested

`sparklineSpanLabel` returns `Math.max(deadMinutes, reviveMinutes)` minutes. The
shipped values are **5 and 2** — the first is always larger.

**So a test that varies one field at a time can never exercise the branch where the
second wins.** Design's fix added the case the shipped configuration cannot
produce:

```
at({ deadMinutes: 3, reviveMinutes: 7 })  ->  '7 minutes ending 2 min ago'
```

**Two mutants, both caught, one failure each:**
```
A  body -> a hardcoded string                    caught by the original intent
B  Math.max(dead, revive) -> deadMinutes         CAUGHT ONLY BY THE NEW CASE
```

**Mutant B is the realistic edit** — someone simplifying a `max()` they believe is
redundant, because in every value the system has ever run, it is.

**When a function combines inputs, the shipped values usually make one of them
dominant.** Test the ordering the product has never produced, or the combination is
decoration.

## A header that restates a constant is a comment that restates a constant

The activity column's header was going to read `−2m`. It now reads
`sparklineLagLabel(config)` → `−${settleMinutes + 1}m`.

**A typed `−2m` would have been correct on the day it shipped and silently wrong
the moment the parameter moved** — and a measurement that may move it was already
scheduled. **Same defect as a comment asserting a value the code no longer holds,
except it is on the surface a trader reads at speed rather than in a file someone
opens once a year.**

**Derive anything on a surface that restates a value held elsewhere.** The
alternative is a second source of truth whose divergence nothing can detect.

## A negative control needs its own positive control

Ops proved a new guard by removing the protection line and re-running: the new test
should fail, the rest should pass. **Its first attempt silently did not modify the
file** and reported a clean suite.

*"I nearly filed '17 passed' as evidence the guard worked when nothing had been
broken to test against."*

**Every vacuous instrument on this desk has been a test that could not fail. This is
the MUTATION failing to happen** — the check on the check, silently a no-op.

**And its output is indistinguishable from success.** A green suite after a mutation
that never landed looks exactly like a green suite after a mutation the code
survived, **and only one of those is evidence.**

**So: mutate, and confirm the mutation landed.** Read the diff, or check the file's
mtime, or assert the mutated value from the test itself. **Fifth instrument to fail
on this desk in three days, and the first failure of the thing that was catching
them.**

## Set-but-empty means "none", not "skip the rule"

The new prune guard asks a probe which releases running units are executing from.
**If that probe returns nothing, the guard treats it as "no units are running" —
not as "the rule does not apply."**

The alternative is worse than it looks: **a failing probe would silently restore
the old, dangerous behaviour**, and it would do so **exactly when the environment is
degraded** — which is when the protection matters most. **The new test would also
pass, for the wrong reason.**

**This is the empty-keep-list rule arriving in a second place.** *A delete path's
empty input must mean DO NOTHING, never KEEP NOTHING.* **It is now written into the
code that deletes releases as well as the code that deletes bars** — and the second
instance was found by someone applying the first rather than by another incident.

## A standing ruling needs its boundary written at the same moment as the ruling

He ruled: *"sort does not survive. names change too much anyway. no need for
persistence of any kind really."*

**Design took it as standing for a whole class** — filters, collapsed sections,
column choices, remembered tabs — **and then wrote down where it stops, unprompted:**

> **"No need for persistence of any kind" must not reach auth. A sign-in that did
> not persist would be unusable. A session cookie is not board state.**

**The class is "state describing names on a board whose population turns over."
It is not "anything stored in a browser."**

**The reason to write the boundary NOW is that the ruling will be quoted later by
someone with none of this context — quite possibly its own author.** A
correct-sounding sentence with no stated edge is the most over-appliable artefact a
desk produces, **and the relay is the mechanism by which it spreads.**

**And his reason is the durable half, not the verdict:** *names change too much
anyway.* **A preference carried across a reload is a preference about names that
are gone.** That is a product fact about this board, not a taste — **and it is why
the override semantics were right before anyone asked.**

## Verify that the ruling asks for no change, rather than assuming it

Design's surface already complied — `useState` only, and a grep across
`components/`, `lib/hooks/`, `lib/dashboard/` and `app/` for `localStorage`,
`sessionStorage`, `indexedDB` and `document.cookie` returned **one hit, a comment
saying there is none.**

**It checked instead of concluding, and said so.**

**A ruling that retroactively justifies decisions already made is the best available
outcome and the easiest to mistake for luck.** Recording that it was verified is
what separates *the surface complies* from *the surface happens to comply and
nobody looked* — **and only the first survives someone changing it next month.**

**It also converted an incidental into a ruling:** `size`, the row count, was never
asked about and now falls under the same answer. **A standing ruling should be swept
across the class immediately, while the reasoning is present.**

## Config rendered from the release means an out-of-band change is silently reverted

`tmitrader.com` went live by hand-rendering nginx from a new template. **`deploy.sh`
overwrites `/etc/nginx/sites-available/mointel-tls` from THE RELEASE'S template on
every deploy** — verified against the deployed sha, which contains the old
single-name form.

**So any deploy of a release without the template change re-renders `server_name`
as the old host alone and drops the new domain.**

**And it degrades SAFELY: nginx starts, the old name works, the certificate is
untouched.** That was deliberate — **and it is exactly what makes it dangerous.**
Nothing fails, nothing logs, and **the first person to notice is the one who asked
for the name.**

**So the template commit is not an item to weigh against the others. It is a
prerequisite of not undoing something**, and its absence from a tip is a hold
condition in the same class as an unwanted change being present.

**General form: after any manual change to a file the deploy renders, the commit
that makes it permanent is part of the change, not a follow-up.** Until it lands,
**every subsequent deploy is a silent revert.**

## Do not use someone else's measurement past its warrant

Integration weighed a cost against Ops's latency figures and called it *"a
sub-second window, negligible."* Ops corrected the framing of its own number:

> **"0.005–0.673s across 920,000 bars including the open, with no reconnect
> observed. A reconnect did not occur, which is weaker than it cannot occur — and
> that case's cost is exactly the one a reconnect would lengthen."**

**The measurement bounded normal operation. It was used to bound the failure case,
which it never sampled.**

**The person who took a measurement knows its warrant; the person who quotes it
usually does not** — and the quoting is where the bound gets widened, silently,
into a claim the data never made.

**And when a false comment is being replaced, the replacement must not inherit a
claim stronger than the evidence.** The parameter this concerned survived three
months behind a comment nobody looked past. **Writing a new confident sentence in
its place would be the same failure with a different value.**

## A fixture written beside a constant cannot contradict it

`activity.test.ts` held `JUDGED = [2,3,4,5,6]` as a literal, beside a
`settleMinutes` of **1**. **Both numbers were written down separately, and neither
could disagree with the other.**

**So every test in the file agreed with the parameter by construction.** Tuning the
constant broke nine tests **that were asserting the fixture rather than the rule** —
and that breakage read as *"the change is wrong"* rather than *"the fixtures are
literals."*

**That is why a 300x over-provisioned parameter survived three months: the suite
appeared to defend it and was only ever agreeing with itself.**

`sparkline.test.ts` had already learned the identical lesson one function away —
*"the previous version read the live config and asserted the result against it,
which passes just as well for a hardcoded string."* **Same defect, same file tree,
found twice in one day by two threads who did not know the other had found it.**

**Derive fixtures from the thing under test, or the suite is a second copy of the
answer.**

**And deriving it fixed ONE of the nine.** The other three in that file carried their
own hardcoded offsets beyond `JUDGED`. **A single derivation looks like it should
fix the class and does not — measure after, not before.**

## Recording a false sentence as false beats deleting it

The comment defending `settleMinutes: 1` claimed a late bar *"would manufacture
death every minute, on every name."* **It is disproven — the same case returns the
same verdict at either setting.**

**It was rewritten to record the sentence AS FALSE rather than removed.**

**The sentence is why nobody looked for three months.** Deleting it leaves a
correct file with no memory of why it was wrong, **and the next person to write a
confident defence of a parameter has nothing to recognise.**

**A defect's cause is documentation. Its removal should not remove the reason it
survived.**

## The obvious success criterion was the wrong one

Recovering 09-04's minute bars, the natural check is *"does it come back like its
neighbours"* — 09-02 at 1,054,662 and 09-03 at 1,061,634.

**It should not.** The stored days were written **through the `isTracked` filter at
`runtime.ts:1426`; a vendor refetch is not filtered at all.** So a faithful recovery
should land **slightly above** a live-captured day.

**Registered before the run: 1.03M–1.15M, point estimate 1.09M, from five 50-symbol
strata across the alphabet — 124.0 bars per symbol, with real variance of 98.9 to
147.1 between strata.** A band that can be defended rather than a number that
cannot.

> **"If it comes back at exactly 1.06M I will say so rather than call it a match."**

**A success criterion inherited from the nearest similar thing is not derived — it
is borrowed**, and it would have made the one suspicious outcome look like the best
possible one.

**And the failure it guards is the one that looks like success:** *200,000 rows
arriving looks exactly like data arriving.*

## Two zeros that meant "my instrument broke"

**A page-token parse used `cut -f2-` instead of `-f2`, so the terminator was never
recognised and the fetch loop ran to its cap.** It reported `pages: 12` — **the
output of a broken parse is indistinguishable from a large paginated fetch.** The
count was right and the instrument was not. Corrected: one page, `ended=complete`.

**And a sampling query returned zero symbols** because `%%` survived into SQLite as
a syntax error. The probe dutifully reported `bars=0`. **A zero that meant "my query
failed" and read as "no data exists."**

**Third instance this weekend of a zero from a broken instrument reading as a
finding about the world.** The habit that follows: **check the denominator and the
terminator on every probe, never the total alone.** A total is the one number a
broken instrument can still produce.

**And the biased sample was named before it was used** — an alphabetical head is
ETFs and preferreds, which is why there are five strata and not one. **Naming a
sample's bias before relying on it is cheaper than discovering it in the result.**

## "Cannot" is the word that stops the next reader looking

Research recorded that the store **cannot** tell a feed stall from genuine silence,
because a missing bar is the death signal. Integration refused to file it.

**Both discriminators turned out to exist already.**

**`lastBarAt` is set on every bar and every updated bar, desk-wide, and served all
the way to the payload** — Design read it off the screen at 04:00. **It answers
exactly the right question: when did ANY bar last arrive**, and a six-minute-old
value cannot be confused with a quiet market, because in a real market some name
always prints.

> **The field is not missing. It is on the wrong side of one boundary — and the
> worker owns both sides.**

**And the population check is free:** the engine already visits every name in
`recompute()`. **2,369 real windows against 5,388 zero is a market. All-zero is a
stall.**

**So `cannot` was written about a value that is already computed, already served
and already on screen.** *It is the same mechanism as the false comment that
protected a parameter for three months: a confident sentence that ends the enquiry
rather than a claim anyone re-checks.*

**Refuse "cannot" until it is earned.** The cost of refusing it is one question; the
cost of accepting it is that nobody looks again.

## A third state that neither discriminator separates

**A market-wide halt looks exactly like a stall to both checks.** LULD circuit
breaker: no bars arrive, `lastBarAt` ages, every window empties.

***"The feed is fine and nothing is trading"* is a third state**, and neither the
timestamp nor the population separates it from *"the feed is broken."*

**The input exists** — the desk already tracks `halt_state` and `HALT`/`RESUME`
events per symbol. **Named before either discriminator is built, so that neither
ships claiming to detect something it cannot.**

**A discriminator that separates two states is not a discriminator when there are
three.**

## A summary line that cannot disagree with the evidence above it

Ops's hold-check script printed **"(empty above = no settleMinutes change)"
unconditionally**, on a line after the grep, **regardless of what the grep found.**

**The grep had found nine matches. The summary line said there were none.**

**Not a wrong threshold and not a broken parse — a sentence hardcoded beside the
evidence**, exactly like a test fixture written beside the constant it is supposed
to check. **The same defect in a shell script and in a test file, twelve hours
apart, found by two different threads.**

**And it would have produced the right answer for the wrong reason** — the nine
matches were all in comments and an unrelated file, so *"no settleMinutes work in
the tip"* was true. **A right answer from an instrument that could not have said
otherwise is the outcome nobody ever investigates.**

**It was caught only because the matches printed directly above the sentence
contradicting them.**

> **Put the evidence next to the conclusion, and the conclusion has to survive
> being read beside it.**

**That layout is worth more than the fix.** A summary printed on its own, or above
its evidence, or in a different message, is never checked against it.

## An unmoved count is a prediction too

Two threads' work landed between two gates and the test count did not change —
**1867 at both.** That looked wrong.

**It was explained rather than accepted:**
```
sparkline.test.ts    33 -> 33     activity.test.ts  16 -> 16
releaseRetention     17 -> 17     no case added or removed anywhere
```
**The line changes were assertions rewritten INSIDE existing cases** — a vacuity
fix, not a new test — **and one thread's tests were already inside the earlier gate
because its commit was an ancestor.**

**Re-registered as: 1867, delta ZERO, composed as "no cases added or removed;
assertion-level changes only."**

**Every registration on this desk has been about a number that moves.** A number
that stays the same across two threads' work **looks like nothing happened** —
which is exactly when the composition goes unstated and the coincidence goes
unnoticed. **Register the zero with its reason, or a genuine collision between an
addition and a deletion will read as "unchanged, fine."**

## A clean log line from a new guard is the most persuasive and least informative thing a deploy produces

The prune guard shipped and its first run printed:
```
[prune] in use f5aaa167... a127c00... a127c00... a127c00...
[prune] retained a127c00 f5aaa167 38e7d4b 372f5eb   1 release(s) removed
```
**It read as a save. Ops said plainly that it was not:**

> **"It was not load-bearing tonight. `f5aaa167` was second-newest and would have
> survived the keep-3 rule anyway. The in-use rule did not save it; it merely also
> protected it."**

**The first deploy where that rule is the only thing standing between a running
worker and a deleted tree is three deploys away** — and that is now written down
rather than discovered when it matters.

**A new guard's first clean run proves it does not crash. It does not prove it
fired, and it certainly does not prove it was needed.** *The log line is
indistinguishable in both cases.*

**Ask what would have happened WITHOUT the guard, on this specific run.** If the
answer is "the same thing", say so — **otherwise the next reader inherits a save
that never happened, and the guard's real first test passes unwatched.**

## An absent prerequisite is only ever caught by enumerating

`101b46b` had to be in the release or the deploy would re-render `server_name` from
the old template and **silently drop the new domain** — nginx starts, the old name
works, nothing logs.

**It was present, so the hold condition never fired.** The deploy printed
`serving TLS for: 98-85-49-227.sslip.io tmitrader.com www.tmitrader.com` and the
question closed.

**But nothing would have failed if it had been absent.** **A hold condition on
something's PRESENCE is only ever satisfied by someone listing what is there** —
there is no failure mode to catch it, no test that goes red, and no log line that
says what is missing.

**Which is why the enumeration is the control, not the gate.** A gate proves what
is in the tip works. **Only an enumeration proves what needs to be in the tip is.**

## A capability is not a path

Ops reported that recovering a past date's minute bars was *"invoking a job that
already exists rather than writing a fetcher."* **It is not.**

**Both halves of the belief were true and neither implied the conclusion.**
`rest.ts:197` genuinely batches, pools and paginates. The vendor genuinely serves
09-04 — probed, not assumed. **But thirty-one scripts in `worker/` and thirty-six
npm entry points contain nothing that writes `minute_bars` for a chosen date.** The
startup backfill is bound to the current session's window and writes what it just
ingested.

> **"I checked that the capability existed and inferred that a path to it
> existed."**

**A capability is a thing the code CAN do. A path is a caller that does it.**
Reading the machinery tells you the first and says nothing about the second — and
the gap between them is the difference between an invocation and a new script that
makes a million-row production write.

**When scoping work as "just call the existing thing", find the caller, not the
function.**

## Make a pre-registered count checkable before the write, not after

The expected row count for a recovery — 1.03M–1.15M — **was only checkable once
1.09M rows were in the table.** A result of 400,000 would have meant 400,000 rows
already written into production and a recovery that is now the thing to undo.

**So: a count-only mode that fetches and counts without writing, run first.**
```
count-only -> inside the band  -> write
           -> outside the band -> STOP and report
```

**It costs one extra pass over free data and converts the pre-registration from a
verdict on a completed write into a gate on an uncompleted one.**

**A registered number that can only be checked afterwards is a post-mortem with
good manners.** Where the action is expensive or hard to reverse, **find the cheap
observation that produces the same number first.**

## A requirement belongs in a gated script, not in the care of whoever runs it

A partial recovery looks identical to a complete one in every future query — **so
all-or-nothing is a requirement, not a preference.**

Ops's framing: **requirements belong in the script and are gated; care belongs to
people and is not.** The existing writer has no transaction around its inserts
because it writes what one session just produced. **A recovery writing a million
historical rows needs one, and needing it is a property of the job rather than of
the operator's attention.**

**The test of whether something is a requirement: would it still have to hold if
the person running it were distracted, or different, or a schedule?**
