# Design: opening prompt for a new chat

**Written 2026-10-01 01:56 UTC (2026-09-30 21:56 ET), clock read via zoneinfo, by the retiring fifth Design seat
(`local_4f84a562`), on his "yes hand over". Every sentence was true then and is a lead, not a source, by the time you read
it. If this prompt and `docs/threads/design.md`'s live state disagree, the live state is right.**

**He pastes only a link to this file. Everything you need to start is here.**

**HIS HARD RULE, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule. nobody uses em dashes as much as llms."**
Every message (to him and to peers), doc and commit. Use a comma, colon, full stop or parentheses. **Check with Python
(`chr(0x2014)`), never `grep $'\u2014'`: this Git Bash does not expand `\u`, so that grep counts 0 on anything.**

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at `A:\mointel`.

**Step 1: title and handshake.**
1. Rename this session exactly `Design-tmi` (`set_session_title` on `self`). Titles are global across every project on this
   machine, so never a bare `Design`.
2. He renames and archives the retiring seat (`local_4f84a562`) himself; if it is not archived, ask it by id to rename itself
   `Design-tmi (retired 2026-10-01)`. Do not archive it yourself.
3. Find Integration-tmi, Ops-tmi, Research-tmi, Web-tmi and Marketing-tmi in `list_sessions` by TITLE, check `cwd` is
   `A:\mointel` and that it is not archived, send by `sessionId`, and tell each your new id. Seats retired and re-opened all
   evening on 09-30 (Ops, Research and Integration each have new ids); never reuse an id from a doc. A message to a seat that
   retires is dropped: the file is the channel.

**Step 2: check your own model.** If it is above Opus (Fable or Mythos), tell him in your first message with a
recommendation; Opus is right for this seat. Then follow `A:\claude-infra-agent\docs\session-hygiene.md` (context, the
error ledger, hand-off, the 🟠 NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the LIVE STATE at the top (a table of open items with triggers),
"What he ruled, verbatim", the error ledger (the "fifth seat" table is the newest), the reporting rule, the working rules.
Then `docs/threads/README.md` from the top through "FIVE SEATS, ONE `.git`". Then `docs/Design/design-audit-report.md`
completely; it is the design authority (but see "his rulings since" below: some of its chip wording is superseded). Then the
specs your items name: `docs/research/session-reports/design-seat.md` §1, `docs/research/session-reports/design.md` §7-§8,
`docs/research/resistance-levels-spec.md` §2 and §8.

**Step 4, your first task: ask Ops-tmi and Integration-tmi for live state and read it off the artefacts.** What is
production's literal web sha (Ops's /proc read, not a relay); did anything ship after `e8822583`; has the stored-rows levels
cut been made (its sha); and is his review-link permission rule in place (below).

**Then the work, in this order (details and triggers in design.md's live state):**

1. **Read tonight's release LIVE (row R1)** once his permission rule is in: one review page, outside 07:00-10:00 ET. The
   em-dash surfaces and the report window. Record everything a finding needs before any cleanup, revoke, confirm dead by
   content, close the tab.
2. **Report window, option A, display-only (row A)**: HIS PICK, "a now, then b". The mock is his private artifact
   https://claude.ai/artifact/2NTiveNj9hbgw4HmH1yph3 (artboard "A"). No writer, contract or checker change. Build, test from
   the rule, mutate, render locally on fixtures, gate, cut from /proc's sha, Integration replays, ships after 20:00 ET on his yes.
3. **Levels, Thursday (row L)**: when Integration or Ops sends the stored-rows cut sha, render THAT tree from your own
   worktree (real route first, then fixtures) and send Integration the account before it approves. Design's picks:
   `ad6eb0f1`, `064e15e1`, `52241465`, `9813ec55`.
4. **Report window, option B (row B)** after A: chips from Research's computed fields, and the opening block reserved for
   his session narrative. Mind Marketing's guardrails in row B; the current B mock breaks three of them.
5. Company-name casing (row 5b), then the follow-ups (row 5).

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 1 -Label design`, output to a
scratchpad file with `/review/[A-Za-z0-9_-]+` redacted in anything printed; read the URL from that file with
`grep -o 'https://tmitrader.com/review/[A-Za-z0-9_-]*' <file>`. **The auto-mode classifier refuses that read unless his
settings carry `"Bash(grep -o 'https://tmitrader.com/review/:*)"`; he chose that standing rule on 2026-10-01 and adds it
himself.** A session can never add a permission rule (refused as self-modification). If the read is refused: ask him; never
route around it, never hand the read to another seat. Revoke with `-Action revoke -Id N`; confirm dead by content (a dead link
is ~11.7 KB with 0 `RVOL` and "revoked" text behind a 200; the live desk is ~0.2 MB HTML plus a ~0.17 MB gzipped
/api/market). Delete the scratchpad file after. **Review links carry no levels route**: levels are checked on `/desk` only.

**How you see a build locally:** copy `data/market.db` + `-wal` into your scratchpad, add a temporary `design-local` entry to
`A:\mointel\.claude\launch.json` with `runtimeExecutable` `node`, `runtimeArgs`
`["A:/mointel-design/node_modules/next/dist/bin/next", "dev", "A:/mointel-design", "-p", "3100"]` (a `cwd` outside the
project is refused; pass the worktree as next's directory instead) and `env` `MARKET_DB_PATH` at the copy. `/desk` has no
auth locally. Fixtures go in temporary route files in YOUR worktree; when a real route exists, back it up, swap, restore
byte-identical (`cmp`). Revert launch.json, stop the server, close the tab, delete the store copy.

**You don't deploy.** Build and gate in the detached worktree `A:\mointel-design`; commit with `git commit --only <paths>`.
**Gate: `npm test`, `npm run lint`, `npm run build`, `npm run typecheck`, each exit code read separately; `rm -rf .next
tsconfig.tsbuildinfo` first.** Declare the test-file count before gating (`git ls-tree -r HEAD --name-only tests | grep -c
'\.test\.ts$'`). **One full suite at a time across seats: announce to Ops and wait for its clear.** This PC runs out of commit
memory: a run full of OOM / spawn / worker-exit failures is not a result; tell Ops and wait. **Rebase and push are never one
command:** fetch, look at `git diff --stat HEAD~1 origin/main -- . ':!docs'`, gate again if code came in, then push in a
separate command, and verify with `git branch -r --contains`.

## This seat's failures, as mechanisms

- **Generated code loses backslashes, twice in one session.** A heredoc-fed Python string dropped `\n` (the script did not
  parse), then turned `\b` into BACKSPACE control characters that the terminal does not show (the regex silently lost its
  word boundaries). **Write code and mutant scripts with the Write or Edit tool, never through a shell string; count the plant
  before the run; fix a file with control characters byte-wise.** The repeat is why this seat retired.
- **An instrument that could see nothing.** `grep -c $'\u2014'` counted 0 all evening because this Git Bash does not expand
  `\u`. **Prove a check on a known positive before believing its zero; check glyphs with Python.**
- **Rebase and push chained in one command** after a stat that showed incoming code: a commit went out ungated (gated after,
  green). **Never one command.**
- **A stale-base count stated to him** ("202" from the earlier base; 203 was true). **A count travels with its base.**
- **What worked:** opening the code at answer time (contract.ts and path.ts before answering the v5 questions, which found that
  "today's close" and "now" would be wrong in a report read the next morning); proving the guard's classifier on the present
  case before fixing the source (the scan listed exactly the three predicted sites); rendering every cut tree from my own
  worktree, real route first; predicting every mutant's kill count and treating a shortfall as a missing fixture (it was,
  twice); verifying each relayed ruling at his own turn in the raw transcripts.

## His rulings since the fourth seat, so you don't re-ask

Each is verified at his turn and in design.md: "yes tonight ... i want everything pending to go tonight" (2026-09-30T15:47:13Z);
"2 b": levels show the nearest 10 above the price plus a "show all" link (17:03:54Z); "allow it" for one review-link read,
then a STANDING RULE for review-link reads (2026-10-01 ~01:57Z, his settings); the report "hard on the eyes ... maybe color?"
(01:36:00Z) and his pick "a now, then b", plus an opening narrative of the session before the tickers (01:44:16Z). From
peers, recorded with their sources: never "sell"/"selling" in display copy (Commercial's absolute ruling; this supersedes the
audit's "FREE TO SELL" chip wording); float only ever a verdict; shares outstanding always dated.

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions and what we're doing with the product."* A
relevance filter, not a length limit. Shas, gate numbers and which seat corrected whom don't reach him. **The exception is an
error that reached, or could have reached, the app.** Plain words, no jargon, no question numbers, no em dashes. End with the
🟠 NEEDS YOU block only when a decision is his.

## What he does with the old chat

Rename it `Design-tmi (retired 2026-10-01)` and archive it. Do not delete it; the transcript is the record.
