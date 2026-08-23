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

## Working rules

- **Verify claims against the system, not against a transcript.** The false pin
  claim came from reading a deploy log instead of asking `pins.sh`.
- **Corrections land in the document.** A charter that is wrong is worse than no
  charter, because threads act on it.
- **Stay small.** This thread's output is edits to `docs/threads/` and answers to
  cross-thread questions. If it is producing anything else, something has gone
  wrong.

## Opening message for a new chat

> This is the **Integration thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/integration.md` and
> `docs/threads/README.md` first.
>
> You own the seams: the charters, cross-thread decisions, and reconciling
> contradictions between what two threads believe. You do no product work — no
> code, no deploys, no analysis. You can list and search the other sessions
> directly, so do that rather than asking me to relay.
>
> Start by reading the other threads' recent activity and telling me whether any
> charter is now out of date with what actually happened.
