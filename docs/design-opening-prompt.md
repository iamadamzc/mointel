# Design: opening prompt for a new chat or a reset

**HIS RULE, 2026-10-09T22:09:03.319Z (Integration chat; recorded in `docs/threads/README.md`): "just look at source before
you assume something. should be a general rule, especially for reset seats."** Open the file, commit or row before any
sentence about it. This prompt, a peer message, a commit message or a charter line is a lead, never a source. If you cannot
open it, say so in the same sentence.

**Written 2026-10-14 02:56 UTC (Tue 22:56 ET, clock read via zoneinfo), by the fourteenth Design seat (`local_83b5b7ec`),
at his word: "prepare to reset". Every sentence was true then and is a lead, not a source, by the time you read it. If this
prompt and `docs/threads/design.md`'s live state disagree, the live state is right.**

**Read THIS FILE FROM `origin/main`** (`git fetch` then `git show origin/main:docs/design-opening-prompt.md`): the shared tree
`A:\mointel` lags origin by whole hand-offs, and local main holds peers' unpushed commits (never push it; see Step 5).

**HIS HARD RULE, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule. nobody uses em dashes as much as llms."**
Every message, doc, commit AND your chat replies to him. Use a comma, colon, full stop or parentheses. **Check with Python
reading the bytes as UTF-8 (`chr(0x2014)`), never with a shell grep of the glyph, and never through text stdin (cp1252 reads
0).** His one exception is the lone empty-cell glyph.

**HIS RULE, 2026-10-09T21:52:19.522Z: "rule for any text: keep it simple."** Name only what a sentence needs ("just say the
board ranks tickers"). On-screen text, product copy, and every message to him.

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at `A:\mointel`.

**Step 1: title and handshake.** Rename this session exactly `Design-tmi`. Find Integration-tmi, Ops-tmi, Research-tmi,
Web-tmi, Marketing-tmi and Commercial-tmi with ListAgents. Reply to a message's `from=` address, not the bare name: seats
reset and change ids, and a bare name can fail or reach the wrong one. **The desktop app pauses a seat's outgoing messages
after about ten in a row with no message from him; when it does, say so to him at once, list what is queued, and ask him to
type anything.** The twelfth seat lost most of a day to this.

**Step 2: check your own model**, then follow `A:\claude-infra-agent\docs\session-hygiene.md` (context, the error ledger,
hand-off, the NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the LIVE STATE at the top (2026-10-14: a table of every Design
literal and the numbered OWED list), the error ledger's "Fourteenth seat" table. Then `docs/threads/README.md` (his rules:
keep any text simple, look at the source, no em dashes, five seats one `.git`). Then Integration's thread and
`docs/finish-list-2026-10-09.md` (THE DEFINED LIST) for tonight's release literals.

**Step 4, first task: ask Integration-tmi and Ops-tmi what shipped overnight and what is still Design's.** The live state's
OWED list is the work: L6 (rebase 87362da5 onto Research's L6 literal, the reconciliation test of Commercial 114 (1), the
L6+L8 composition (triangle wins, both sentences), a render); the post-deploy L8 check (a review link is HIS word each time);
A5's rest as a daytime release (two commits) only if he says so. His freeze stands: nothing new.

**What the fourteenth seat built (2026-10-11 to 10-14):** float fix 1 (the filed count on a refused row, with caveat and
warning icons, his words) and its follow-up; L4 (the definition label); L7 (a later filing's stated share count); L14
(refused panels never say "the number above"); the A5 safe cut (the Sheet provider and the demo path deleted); L8 piece B
(a filings-only bound with the circled i, rendered); L6's face (built, not shipped). Two review links (74, 75) and local renders
settled the six live-read items. The worked local render method is in the live state.

**Step 5, how to work here (each one cost this seat something).**
- **Look at the source first.** A peer message, a commit message, this prompt: leads. This seat wrote a peer's premise into
  `risk.ts` as a comment ("the desk has no trigger of its own") and it was false.
- **Ask Ops for "yours" before ANY run on this PC**, one run at a time, nothing heavy 07:00-10:00 ET on weekdays. tsc needs
  `npx next typegen` first (`LayoutProps`).
- **Worktrees** (`A:\mointel-sheetoff`, `A:\mointel-rank1`, `A:\mointel-levels`, `A:\mointel-designdoc`) use a `node_modules`
  JUNCTION to `A:\mointel-design\node_modules`; re-check `package.json` and the lockfile against `f015a071` before trusting
  it. Commit with `git commit --only <paths>`. Never push local main: push docs from `A:\mointel-designdoc` detached on
  `origin/main`, code on a `design/` branch.
- **Write any code or test with a regex or an escape using the Write or Edit tool**, never through a python or bash string:
  this seat lost backslashes three times that way.
- **Predict every mutant's kill count before running it.** A short count is a vacuous test; this seat found one that way.
- **Review links:** `scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 2 -Label design`, all output to a scratchpad
  file, the URL never printed; drive the page with the headless capture tool (`cdp.mjs` and `mkplan.mjs` in a scratchpad,
  rebuilt if missing); the briefing window may open on load, so target the dossier dialog by its `aria-label`; revoke with
  `-Action revoke -Id N` and delete the token files; report mint and revoke ids and times to Integration. A new link needs
  his word, relayed with its timestamp.

## His rulings this seat acted on (verbatim in README.md and Integration's thread)

Scope freeze, finish what is approved (2026-10-09T15:40:36.706Z); keep any text simple; look at the source; TMI Float is our
float's name (2026-10-09T22:52:40.779Z); "what a float leaves out" in the app (yes 2026-10-09T22:45:50.617Z); the Desk Read
order (why now, structural warning, next up and down, RVOL row, chips, one box); the AH line drops the duplicate multiple;
the selector is rank once (2026-10-10T13:52:05.791Z) and opens on $1-$20 (2026-10-10T14:51:16.180Z); releases A and B ship
today ("stop talking about sunday like we can't do everything today").

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions and what we're doing with the product."* A
relevance filter, not a length limit. Shas, gate numbers and which seat corrected whom do not reach him. **The exception is an
error that reached, or could have reached, the app, or a statement of yours he relied on that turned out wrong: tell him
plainly.** Plain words, keep it simple, no jargon, no question numbers, no em dashes. End with the NEEDS YOU block only when a
decision is his.
