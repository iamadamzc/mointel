# Design — opening prompt for a new chat

**Written 2026-09-30 00:06 UTC (2026-09-29 20:06 ET), clock read via zoneinfo,
by the retiring Design seat, on his "fresh session". Every sentence was true
then and is a lead, not a source, by the time you read it. If this prompt and
`docs/threads/design.md`'s live state disagree, the live state is right.**

**He pastes only a link to this file. Everything you need to start is here.**

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at
`A:\mointel`.

**Step 1: title and handshake, before anything else.**
1. Rename this session exactly `Design-tmi` (`set_session_title` on `self`).
   Session titles are global across every project on this machine, so never a
   bare `Design`.
2. Message the retiring seat by id, **`local_8568daaf-df6d-409c-9e5c-ad2a1ddd0cca`**
   (look it up in `list_sessions` to confirm; its title is `Design-tmi` until it
   renames), saying you are open, and asking it to rename itself
   `Design-tmi (retired 2026-09-30)`. **He archives it after that; you don't.**
   Then look up Integration-tmi and Ops-tmi in `list_sessions` (by title, check
   `cwd` is `A:\mointel`, send by `sessionId`) and tell them your new id.

**Step 2: check your own model.** If it's above Opus (Fable or Mythos), tell
him in your first message with a recommendation. This seat renders numbers a
trader acts on in seconds; Opus is the right level. Then follow
`A:\claude-infra-agent\docs\session-hygiene.md` (model, context saturation,
hand-off, the 🟠 NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the live state at
the top (a table of items 0–5 with triggers), open items, the error ledger, the
working rules at the bottom. Then `docs/threads/README.md` from the top through
"FIVE SEATS, ONE `.git`". Then `docs/Design/design-audit-report.md` completely;
it's the design authority. Then the specs your open items name:
`docs/Design/near-live-now-spec.md`, `docs/research/session-reports/design-seat.md` §1,
`docs/research/resistance-levels-spec.md` §2.

**Step 4, your first task: ask Integration-tmi and Ops-tmi for live state and
read it off the artefacts.** Specifically: production's literal web sha (it was
**1b5ead6**, gzip; Integration's CONE RULE is that every ship carries 1b5ead6),
whether the market-worker restart ran at 20:15 ET 09-29 and passed its checks,
and whether anything of Design's shipped since.

**Then the work, in this order (details and triggers in design.md's live state):**

0. **The red test**, routed to Design: `tests/research/interpret.test.ts` ›
   "proves the overhang when established supply exceeds the share count".
   `run()` (~l.1876) omits `asOf`, so the pipeline judges the fixture's share
   count (as of 2026-08-15) against the wall clock; it flipped at 00:00Z
   09-30. Test-only fix: `asOf: DATE`. Prove it at the wall clock AND under
   `vi.setSystemTime` far ahead. Grep `tests/research/` for siblings.
   Pre-register the file's pass count (93/94 today). Send Integration the sha.
1. **Brand header re-cut** `design/brand-header-on-1b5ead6-v2`: 1b5ead6 +
   `-x` c01a5b4 + `-x` your item-0 fix, **176** test files pre-registered.
   It's his "the compact lockup". Ops asks him to ship; not 04:00–10:15 ET.
2. **The `Now` cell's real-10 s read**, from 04:00 ET 09-30: `fa61410` is on
   main and rides NO deploy until that read passes. One page load on a fresh
   review link, no timing loops. Then ask Integration for a cut.
3. The session report window (`0f15521`) waits on Research's `/api/reports`.
4. Resistance levels, after item 2.

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost
mointel-ssm -Hours 1 -Label design`. The URL prints once. Revoke with
`-Action revoke -Id N` when done, and confirm it's dead **by content**: a dead
link is ~11.7 KB with 0 `RVOL` behind a 200; the live desk is ~1.2–1.4 MB.
**No heavy `/api/market` probing 07:00–10:00 ET, and none while he trades.**

**How you see a build locally:** copy `data/market.db` + `-wal` to your
scratchpad, run `next dev -p 3100` from the worktree via a temporary
`.claude/launch.json` entry that points `MARKET_DB_PATH` (and `TRADES_DB_PATH`
if you need a synthetic capture) at the copies. Spawn node directly, not a
shell (`cmd.exe` is not found from the preview launcher). Revert the entry,
stop the server, close the tab when done.

**You don't deploy.** Build and gate in the detached worktree `A:\mointel-design`
(`git checkout --detach origin/main`), commit with `git commit --only <paths>`,
rebase, **gate again if the rebase brought code**, `git push origin HEAD:main`,
verify with `git branch -r --contains`. Ship cuts are `design/` TAGS on
production's literal sha: one `-x` pick, the test-file count DECLARED against
THAT base before gating, the patch-id checked. **Gate from Bash:** `npm test`,
`npm run lint`, `npm run build`, THEN `npm run typecheck`, each exit code read
separately; `rm -rf .next` when switching bases (stale route stubs fail tsc).

## This seat's failures, as mechanisms

- **A probe that measured its own load.** I timed `/api/market` with 39 requests
  during his window, saw almost nothing land, and told him his board "may be
  frozen right now". The build is synchronous and runs to completion after an
  abort, so my requests made the slowness. His own access log said ~90% of polls
  landed. **Read the viewer's traffic for claims about the viewer; state the
  concurrency beside any timing.** (Memory: `a-probe-that-measures-its-own-load`.)
- **An order relayed as a dependency.** I told him the report window came "after
  the Now read"; that was Integration's queue, not a dependency, and he asked
  "why then?". **Name each date's cause, or say nothing blocks.**
- **A gate on a conflicted tree.** A `cherry-pick; npm test` chain ran the gate
  after the pick conflicted. **Chain with `&&` and read `git status` before
  any gate.**
- **A count against a stale base.** I predicted 187 files; main had grown to 188.
  **Count the base you're on, at the moment you declare.**
- **An estimated clock time written into a record** (`04:0xZ`). **Take times
  from a record (tagger date, `%cI`) or a clock read in the same step.**
- **The pane lies twice.** A hidden browser pane fires no ResizeObserver, so
  measure only after a reload. A click on a resize handle does not focus it,
  so call `.focus()` before key presses. Probe a fresh observer before you
  call anything a defect.
- **What worked:** predicting every mutant's kill count before running it (37
  mutants this session, all at or above prediction, each shortfall explained);
  reading his ruling AND the question it answered at his own turn before
  building; the dry-run pick before a cut; a baseline measured by swapping the
  old file in.

## What he ruled this session, so you don't re-ask

All are in `design.md` or the specs with his turn's timestamp: resizable
columns ship alone (shipped); the market poll fix (shipped); old-catalyst rows
dim + "No fresh catalyst · latest" and a `sheet · desk` disagreement mark
("2, your recs", shipped); the desk header takes the compact lockup; the session
report opens in a larger window like a ticker's; resistance levels are drawn,
all of them, labelled "resistance levels", tagged by timeframe, with no strength
highlighting.

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions
and what we're doing with the product."* A relevance filter, not a length
limit. Shas, gate numbers and which seat corrected whom don't reach him. **The
exception is an error that reached, or could have reached, the app.** Plain
words, no jargon, no question numbers.
