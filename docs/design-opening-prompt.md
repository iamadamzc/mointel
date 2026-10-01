# Design: opening prompt for a new chat

**Written 2026-10-01 14:16 UTC (10:16 ET), clock read via zoneinfo, by the retiring sixth Design seat (`local_c29a82bd`), on
his "yes hand over". Every sentence was true then and is a lead, not a source, by the time you read it. If this prompt and
`docs/threads/design.md`'s live state disagree, the live state is right.**

**He pastes only a link to this file. Everything you need to start is here.**

**HIS HARD RULE, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule. nobody uses em dashes as much as llms."**
Every message (to him and to peers), doc and commit. Use a comma, colon, full stop or parentheses. **Check with Python
(`chr(0x2014)`), never `grep $'\u2014'`: this Git Bash does not expand `\u`, so that grep counts 0 on anything.** His one
exception is the lone empty-cell glyph.

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at `A:\mointel`.

**Step 1: title and handshake.**
1. Rename this session exactly `Design-tmi` (`set_session_title` on `self`). Titles are global across every project on this
   machine, so never a bare `Design`.
2. He renames and archives the retiring seat (`local_c29a82bd`) himself; if it is not, ask it by id to rename itself
   `Design-tmi (retired 2026-10-01)`. Do not archive it yourself.
3. Find Integration-tmi, Ops-tmi, Research-tmi, Web-tmi and Marketing-tmi in `list_sessions` by TITLE, check `cwd` is
   `A:\mointel`, that it is not archived and that it is not titled "...retired", send by `sessionId`, and tell each your new
   id. Seats retire and re-open often (Integration and Research each changed ids on 10-01); never reuse an id from a doc. A
   message to a seat that retires is dropped: the file is the channel.

**Step 2: check your own model.** If it is above Opus (Fable or Mythos), tell him in your first message with a
recommendation; Opus is right for this seat. Then follow `A:\claude-infra-agent\docs\session-hygiene.md` (context, the
error ledger, hand-off, the 🟠 NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the LIVE STATE at the top (tonight's three cuts, then a table of
open items with triggers), "What he ruled, verbatim", the error ledger (the "sixth seat" table is the newest), the reporting
rule, the working rules. Then `docs/threads/README.md` from the top through "FIVE SEATS, ONE `.git`" and the em-dash
section. Then `docs/Design/design-audit-report.md` completely (the design authority; some chip wording is superseded, see
below). Rows that say "spec in the archive" point to `docs/threads/design-archive-2026-09.md`, section "design.md live
state at the sixth seat's hand-off".

**Step 4, your first task: ask Ops-tmi and Integration-tmi for live state and read it off the artefacts.** Production's
literal web sha (Ops's /proc read, not a relay); which of tonight's three cuts shipped (levels `b5a35fda`, (A) `840741d3`,
citations `2a625a5b`) and when; whether he has ruled on the big-movers question; whether the lone 4-digit citation-id
count has been run.

**Then the work, in this order (details and triggers in design.md's live state):**

1. **P2: read (A) live on a review link** once Ops says it shipped, outside 07:00-10:00 ET. Review links now carry the
   reports route, so the report window mounts there. Record everything before cleanup, revoke, confirm dead by content,
   close the tab.
2. **P1: levels on `/desk`** once Ops says levels shipped. Review links have no levels route; how Design reads `/desk` has
   not been settled, so ask.
3. **L-cos and AR:** the three levels cosmetics and the Discovery aria-label fix, each its own commit on main, after the ships.
4. **M (big movers): only if he rules for the movers group.** A built display is parked as tag `design/movers-on-558f5cb5`.
5. **Report window option B (row B)** after (A) ships, then company-name casing (row 5b), then the follow-ups (row 5).

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 1 -Label design`, output to a
scratchpad file with `/review/[A-Za-z0-9_-]+` redacted in anything printed; read the URL with
`grep -o 'https://tmitrader.com/review/[A-Za-z0-9_-]*' <file>`. His standing permission rule for that read is in
`A:\mointel\.claude\settings.local.json` (verified 10-01). A session can never add a permission rule. Revoke with
`-Action revoke -Id N`; confirm dead by content (a dead link is ~11.7 KB, 0 `RVOL`, "revoked" text behind a 200; read it
with a `fetch` from the still-open tab, then close the tab). Delete the scratchpad file after.

**How you see a build locally:** check out the sha DETACHED in your worktree `A:\mointel-design`; copy `data/market.db` +
`-wal` into your scratchpad (the local store's newest session is 2026-08-18); add a temporary `design-local` entry to
`A:\mointel\.claude\launch.json` (`runtimeExecutable` `node`, `runtimeArgs`
`["A:/mointel-design/node_modules/next/dist/bin/next", "dev", "A:/mointel-design", "-p", "3100"]`, `env` `MARKET_DB_PATH` at
the copy, plus any fixture-file variables). A fixture route goes in YOUR worktree only: back the real route up, swap,
restore byte-identical (`cmp`). For REAL reports, Ops can save one read-only GET of the box's `/api/reports` into your
scratchpad. Planting a case in your scratch store copy beats inventing a fixture. After: stop the server, close the tab,
`git checkout -- .claude/launch.json` (it is CRLF; your edit is LF), delete the copies. The browser pane is often hidden
(`innerWidth` 0): set a viewport with `resize_window` and keep scripts under ~40 s or they time out.

**You don't deploy.** Build and gate in `A:\mointel-design`; commit with `git commit --only <paths>` (`git add` a new file
first; that worktree has its own index). Pin anything you hand over with a `design/` TAG and push the tag, never `-f`.
**Gate: `npm test`, `npm run lint`, `npm run build`, `npm run typecheck`, each exit code read separately, in Git Bash (not
PowerShell, whose `bash` is the WSL launcher); `rm -rf .next tsconfig.tsbuildinfo` first.** Declare the test-file count
before gating (`git ls-tree -r HEAD --name-only tests | grep -c '\.test\.ts$'`). **One heavy job on this PC at a time
(suite, build or dev server): ask Ops for the clear and wait; Ops sometimes runs the gate for you and its run is the record.**
Nothing heavy inside his 07:00-10:00 ET window. **Rebase and push are never one command.** Push docs from your worktree
detached on origin/main; shared `A:\mointel` main has carried peers' unpublished commits, so never rebase it.

## This seat's failures, as mechanisms

- **A peer's sentence relayed to him as measured.** Research wrote "B alone does not answer his VEEA requirement"; I passed
  it to him; VEEA had not been measured. **Before a number or a "does not" reaches him, ask the source whether it was
  measured, or say whose claim it is.**
- **A generated clock time.** "~10:20 ET" went into the file for a run whose checkout printed 10:12. **Quote a printed clock
  or none.**
- **A mutant kill count that matched for the wrong reason.** The merge mutant killed exactly the predicted 5 after a change
  had removed one of the tests I had counted; the 5th kill was another test. **When a prediction matches, still list which
  tests died.**
- **The message cap.** After about ten cross-session sends with no user turn, the app pauses your sends. Results sat
  undelivered for hours. **Write it to the file first, then tell him one line.**
- **What worked:** rendering cuts on the box's REAL stored data (Ops's one read) and on planted rows rather than invented
  fixtures; finding a defect in my own build by comparing a card against the header that summarises it (the "minute data"
  disagreement); proving every check on a known positive (Python glyph counts, mutants planted from files and counted).

## His rulings since the fifth seat, so you don't re-ask

Verified at his turn by Integration, recorded there and in design.md: "b": reports keep running, (A) hides the model-written
section headings until v6 computes them (2026-10-01T02:24:33Z); "1 yes": review links show the session reports
(02:36:53Z); VEEA: "it should absolutely show on the board somewhere", then HELD on his own question ("we're slowly becoming
a scanner"). From peers, recorded with sources: never "sell"/"selling" in display copy (supersedes the audit's "FREE TO
SELL" chip); float only ever a verdict; shares outstanding always dated.

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions and what we're doing with the product."* A
relevance filter, not a length limit. Shas, gate numbers and which seat corrected whom don't reach him. **The exception is
an error that reached, or could have reached, the app.** Plain words, no jargon, no question numbers, no em dashes. End with
the 🟠 NEEDS YOU block only when a decision is his.

## What he does with the old chat

Rename it `Design-tmi (retired 2026-10-01)` and archive it. Do not delete it; the transcript is the record.
