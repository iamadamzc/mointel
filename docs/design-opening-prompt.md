# Design: opening prompt for a new chat

**Written 2026-10-03 14:11 UTC (10:11 ET), clock read via zoneinfo, by the retiring seventh Design seat (`local_dfce21d4`),
on his "yes" to the hand-off. Every sentence was true then and is a lead, not a source, by the time you read it. If this
prompt and `docs/threads/design.md`'s live state disagree, the live state is right.**

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
2. He renames and archives the retiring seat (`local_dfce21d4`) himself; if it is not, ask it by id to rename itself
   `Design-tmi (retired 2026-10-03)`. Do not archive it yourself.
3. Find Integration-tmi, Ops-tmi, Research-tmi, Web-tmi and Marketing-tmi in `list_sessions` by TITLE, check `cwd` is
   `A:\mointel`, that it is not archived and that it is not titled "...retired", send by `sessionId`, and tell each your new
   id. **Look them up by title at EVERY send, not once:** on 10-02 and 10-03 Ops changed seats three times and Web and
   Integration once each, and this seat once sent to a retired Web by a remembered id. A message to a retired seat is
   dropped: the file is the channel.

**Step 2: check your own model.** If it is above Opus (Fable or Mythos), tell him in your first message with a
recommendation; Opus is right for this seat. Then follow `A:\claude-infra-agent\docs\session-hygiene.md` (context, the
error ledger, hand-off, the NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the LIVE STATE at the top (a table of open items with triggers,
then this seat's rules), "What he ruled, verbatim", the error ledger (the "Seventh seat" table is the newest), the reporting
rule, the working rules. Then `docs/threads/README.md` from the top through "FIVE SEATS, ONE `.git`" and the em-dash
section. Then `docs/Design/design-audit-report.md` completely (the design authority). Then `docs/Design/report-b-spec.md`
(the v6 report surface) and `docs/research/session-reports/design-seat.md` section 3a (why struck sentences leave no mark).
Rows that say "history in the archive" point to `docs/threads/design-archive-2026-09.md`, section "design.md live state
at the seventh seat's hand-off".

**Step 4, your first task: ask Ops-tmi and Integration-tmi for live state and read it off the artefacts.** Production's
literal web sha (Ops's /proc read, not a relay); which of the ready rows shipped (one ladder `9189b569`, AR `a4a06168`,
blue sky re-picked onto Web's `32db0d7e`) and when; whether Integration approved AR by literal sha.

**Then the work, in this order (details and triggers in design.md's live state):**

1. **Row B, the v6 report window, for HIS FIRST LOOK.** Render Research's samples (`66d51856`,
   `docs/research/reports-v6/voice-run-v6c-cards/`) through the surface tip `design/reports-v6-surface-ungated-54e2a407`
   at 1,280 and 1,024, send him the screenshots as files, tell Integration where they are. Then releaseRetention.test.ts
   alone and the full gate in Ops's slot, tag, Integration replays. The payload builder is
   `docs/Design/tools/v6_render_payload.py`; serve it through a temporary fixture route in YOUR worktree and restore it.
2. **Live reads after each ship:** the ladder (a populated row, collapsed and expanded, 1,024), the AR aria on a no-grade
   row, the blue-sky line and its hover. Review links only, never 07:00-10:00 ET.
3. **Sheet removal step 1** (`lib/data/`, Design owns it): mock only on USE_MOCK_DATA; absent credentials an explicit empty
   payload; the board's empty-state words must not read as a fault. Step 3's surface waits on his decisions 1 and 2.
4. **After v6 is live:** the one both-surfaces wording change (Marketing's words), checked at 1,024.

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 1 -Label design`, output to a
scratchpad file with `/review/[A-Za-z0-9_-]+` redacted in anything printed; read the URL with
`grep -o 'https://tmitrader.com/review/[A-Za-z0-9_-]*' <file>` (his standing permission rule is in
`A:\mointel\.claude\settings.local.json`). Revoke with `-Action revoke -Id N`; confirm dead by content (11,754 bytes, 0
`RVOL`, "revoked" behind a 200, read with a `fetch` from the still-open tab), close the tab, delete the file. Review links
now carry the reports route AND the levels route. /desk itself is behind Basic Auth that no seat types.

**How you see a build locally:** check out the sha DETACHED in your worktree `A:\mointel-design`; add a temporary
`design-local` entry to `A:\mointel\.claude\launch.json` (`runtimeExecutable` `node`, `runtimeArgs`
`["A:/mointel-design/node_modules/next/dist/bin/next", "dev", "A:/mointel-design", "-p", "3100"]`, `env` as needed); after,
stop the server, close the tab, `git checkout -- .claude/launch.json`, delete copies. What worked this seat:
- **Any stored session on the board:** copy `data/market.db` + `-wal` to your scratchpad, set `MARKET_DB_PATH`, and put a
  clock shim in `NODE_OPTIONS` (`--require <script>` that replaces `Date` with a function whose `now()` and no-argument
  construction are offset to `DESIGN_FAKE_NOW`; copy `parse` and `UTC` as OWN properties or Next throws
  `Date.parse is not a function`). 14:45Z on 2026-08-18 gives the day board, 22:00Z the evening board.
- **Real levels rows:** `node node_modules/tsx/dist/cli.mjs scripts/levels-box-cost.ts --db <copy> --history <new file in
  another dir> --now 2026-08-18T19:55:20Z` with huge bars, then `HISTORY_DB_PATH` at that file.
- **The hidden browser pane stops the poll:** for a LOCAL render only, override `document.hidden` /
  `visibilityState` and dispatch `visibilitychange`. Keep scripts under ~40 s.

**You don't deploy.** Build and gate in `A:\mointel-design`; commit with `git commit --only <paths>` (`git add` a new file
first; that worktree has its own index). Pin anything you hand over with a NEW `design/` tag and push it, never `-f` on a
name that exists (this seat broke that once on its own local tag). **Gate: `npm test`, `npm run lint`, `npm run build`,
`npm run typecheck`, each exit code read separately, in Git Bash; `rm -rf .next tsconfig.tsbuildinfo` first.** Declare
the test-file count before gating (`git ls-tree -r HEAD --name-only tests | grep -c '\.test\.ts$'`). **One heavy job on
this PC at a time: ask Ops for the slot and wait; release it to Ops with the counts.** Nothing heavy in 07:00-10:00 ET.
Push docs from your worktree detached on origin/main; if the push is refused, fetch, read the incoming stat, rebase, and
push in a SEPARATE command.

## This seat's failures, as mechanisms

- **Built before measuring.** The movers label went beside the ticker and was unit-tested before anyone measured the cell:
  101 px in a 96 px cell at 1,024. **Measure the fixed width a label lands in before writing it.**
- **A peer's citation taken as read.** I wrote that the report's DIRTY FLOAT chip loses a float number; the number is on
  NO FLAG FOUND (`risk.ts:249`). Research's own correction caught it. **Open the cited line before repeating the claim.**
- **Generated code loses backslashes, twice.** A heredoc-fed mutant script and then a ledger row in design.md each lost
  an escape level. **Write scripts with the Write tool; build special characters with `chr()`.**
- **A remembered id.** A note to Web went to the retired Web seat. **Look up by title at every send.**
- **A generated clock time.** "written from 03:00 UTC" before the clock read 02:55:55. **Quote a printed clock or none.**
- **A tool that refused silently in a batch.** At hand-off, a Write to this file was refused (the file had not been read
  in this session) while the commit beside it went through, so the old prompt was committed first. **Read the result of
  every tool in a batch before acting on the next.**
- **What worked:** rendering every change on REAL data before handing it over (a store copy, a real levels refresh, the
  samples through a fixture route) found three defects no test saw (the movers overflow, the ladder's wrapping distance
  column, the narrative's uneven figure emphasis) and one content contradiction for Research; predicting mutant kills and
  listing the dying tests, with every shortfall explained by a named second guard.

## His rulings since the sixth seat, so you don't re-ask

Verified at his turns: movers are normal board rows "labeled as moving", floors "10% with 500k shares, cap 15"
(2026-10-01); "Research adds levels to review links" (2026-10-02, to Design); the resistance levels "are inverted ...
incorporate the two" (2026-10-02T11:51:56Z); the Google Sheet is removed from the system (2026-10-03, via Integration);
ask-first for local runs (2026-10-02), lifted 2026-10-03. Integration calls, recorded with sources: one vocabulary on the
board and in reports (tags through the board's functions); struck name lines keep the card with no prose; the blue-sky
hover gives the price as traded.

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions and what we're doing with the product."* A
relevance filter, not a length limit. Shas, gate numbers and which seat corrected whom don't reach him. **The exception is
an error that reached, or could have reached, the app.** Plain words, no jargon, no question numbers, no em dashes. End with
the NEEDS YOU block only when a decision is his.

## What he does with the old chat

Rename it `Design-tmi (retired 2026-10-03)` and archive it. Do not delete it; the transcript is the record.
