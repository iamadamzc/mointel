# Design: opening prompt for a new chat

**Written 2026-09-30 14:23 UTC (10:23 ET), clock read via zoneinfo, by the retiring
fourth Design seat (`local_72b49119`), on his "yes" to a fresh session. Every sentence
was true then and is a lead, not a source, by the time you read it. If this prompt and
`docs/threads/design.md`'s live state disagree, the live state is right.**

**He pastes only a link to this file. Everything you need to start is here.**

**HIS HARD RULE, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule. nobody
uses em dashes as much as llms." That includes every message you send, to him and to
peers, every doc and every commit. Use a comma, colon, full stop or parentheses.**

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at `A:\mointel`.

**Step 1: title and handshake, before anything else.**
1. Rename this session exactly `Design-tmi` (`set_session_title` on `self`). Titles are
   global across every project on this machine, so never a bare `Design`.
2. Message the retiring seat by id, **`local_72b49119-426e-4f91-827b-26ad48ec0da4`**
   (confirm in `list_sessions`), saying you are open and asking it to rename itself
   `Design-tmi (retired 2026-09-30)`. **He archives it; you don't.**
3. Find Integration-tmi, Ops-tmi, Research-tmi, Web-tmi and Marketing-tmi in
   `list_sessions` by title, check `cwd` is `A:\mointel`, send by `sessionId`, and tell
   each your new id. (Ops is a new seat since this morning; never reuse an id from a doc
   without looking it up.)

**Step 2: check your own model.** If it is above Opus (Fable or Mythos), tell him in your
first message with a recommendation; this seat renders numbers a trader acts on in
seconds, and Opus is the right level. Then follow
`A:\claude-infra-agent\docs\session-hygiene.md` (model, context saturation, the error
ledger, hand-off, the 🟠 NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the live state at the top (a
table of items with triggers), the open items, the error ledger (this seat's rows are the
"fourth seat" table), the reporting rule, the working rules at the bottom. Then
`docs/threads/README.md` from the top through "FIVE SEATS, ONE `.git`". Then
`docs/Design/design-audit-report.md` completely; it is the design authority. Then the
specs your open items name: `docs/Design/near-live-now-spec.md`;
`docs/research/session-reports/design-seat.md` §1 and Research's
`docs/research/session-reports/design.md` (its "DESIGN ANSWERED BOTH", "RUN 2" and the
data map `data-map-2026-09-30.md`); `docs/research/resistance-levels-spec.md` §2.

**Step 4, your first task: ask Ops-tmi and Integration-tmi for live state and read it off
the artefacts.** Specifically: did the Now cell (`design/now-cell-on-74c1818` = c3d0f06)
ship in Ops's 10:34-10:42 ET slot, did Ops's speed fix 84b0099 ship after it, and what is
production's literal web sha now (Ops's /proc read, not a relay).

**Then the work, in this order (details and triggers in design.md's live state):**

1. **Read the Now cell LIVE** once /proc confirms it. One page load on a fresh review link:
   LIVE rows with bars, dots and direction colour; FALLBACK rows muted with `/min`; the
   head reading `last 10s`; 1,024 px after a reload. **In the same load, before closing
   anything, record the first `/api/market` resource-timing split for Ops**
   (startTime to requestStart, requestStart to responseStart, responseStart to
   responseEnd, plus sizes and the UTC minute). A 15.5 s first load was seen once at
   04:06 ET and not reproduced at 04:53; it is unexplained. Revoke, confirm dead by
   content, close the tab.
2. **Before the cut, fix the guard hole in design.md item 6a** (Research's find: `isPlaceholder()` trims, so a space-dash-space separator literal passes as the placeholder; three strings survive: `why.ts:392`, `MarketStatus.tsx:115`, `ResearchEngineStatus.tsx:48`). Exempt only an UNTRIMMED whole-dash literal, add the fixture, predict kills, fix the three, gate, and add the sha to the picks after 9e0a3a0.
3. **The em-dash cut**, only after both ships resolve, onto /proc's sha: eleven `-x` picks in
   this order. Design: 1dacc16, 9a1d8e7, c76e98f, 9e0a3a0, then the 6a fix. Web: 5f3a272, f272bec,
   1703390, 32a9a84, e68137c, 69bafba (32a9a84 never without the three before it;
   69bafba after f272bec). Declare the test-file count against that base before gating
   (`git ls-tree -r <base> --name-only tests | grep -c '\.test\.ts$'`, never a `**`
   pathspec). Full gate, plus `npx vitest run tests/web/ tests/auth/` as Web's
   completeness check. Tag under `design/`, send Integration the sha for replay; it ships
   on his yes.
4. **Session reports.** When Research's contract carries `watchCount`, wire `watchLine`
   (already on main, a496207) into the report window's opening. Then the report v2
   surface (design.md item 3a): the opening narrative, and a per-ticker price path with
   POINT LABELS. The labels are Design's call and are shown to him; his own example
   ("3.5 --> 5.00 --> 4.25") is unlabelled, so never cite labels as his. A path point can
   be absent on older rows.
5. **Resistance levels** (item 4), now that item 1 is done.
6. Follow-ups in item 5.

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 1
-Label design`. The URL prints once. **Redact it from printed output**
(`/review/[A-Za-z0-9_-]+` to `/review/<redacted>`, full output to a scratchpad file) and
delete that file after. Revoke with `-Action revoke -Id N` and confirm dead **by
content**: a dead link is ~11.7 KB with 0 `RVOL` behind a 200; the live desk is
~1.2 MB. The desk is served at the review path, not at `/` (that is the public site). A
hidden browser pane does not poll, so the page makes one `/api/market` request, and the
pane may not return its body. **No heavy `/api/market` probing 07:00-10:00 ET, and none
while he trades; state your own concurrency beside any timing.**

**How you see a build locally:** copy `data/market.db` + `-wal` to your scratchpad, run
`next dev -p 3100` from the worktree via a temporary `.claude/launch.json` entry pointing
`MARKET_DB_PATH` at the copies. Spawn node directly, not a shell. Revert the entry, stop
the server, close the tab when done.

**You don't deploy.** Build and gate in the detached worktree `A:\mointel-design`
(`git checkout --detach origin/main`), commit with `git commit --only <paths>`. **Gate from
Bash: `npm test`, `npm run lint`, `npm run build`, then `npm run typecheck`, each exit
code read separately; `rm -rf .next` when switching bases.** Lint on the whole tree is part
of the gate (it was red this morning from another seat's script; a red that isn't yours is
reported to its owner, not ignored). **Rebase and push are NEVER one command:** fetch, look
at `git diff --stat HEAD origin/main -- . ':!docs'`, and if code came in, gate again
before pushing. Verify with `git branch -r --contains`.

## This seat's failures, as mechanisms

- **An instrument that cannot see a present case, twice.** A `tests/**/*.test.ts` pathspec
  cannot match a file directly under `tests/`, so a declared count was one short. Then the
  em-dash inventory and its guard test trimmed a dash sitting beside a value (a template
  part between two expressions, or JSX text next to one) to a bare dash and passed it as
  the empty-cell placeholder; six strings slipped through until Ops found one. **Prove
  every classifier on fixtures that hold each case, including the one it must reject.**
- **Generated code loses backslashes, twice.** Mutants planted through shell strings and
  heredocs silently failed to plant. **Count the plant before the run; mutate from a script
  file, by line, with a unique marker.**
- **Reversed the file, not the edit.** `git checkout -- <file>` to undo a mutant took the
  fix with it. Back up to one scratchpad path used by both the write and the restore.
- **A crossed de-duplication.** Design dropped its copy of a string for Research's while
  Research dropped its own for Design's; main had neither and `tsc` went red. **Whoever
  removes a copy names the survivor and waits for its owner's yes.**
- **Evidence discarded by cleanup.** The tab was closed (as the rule says) before the
  timing split was recorded. **Record everything a finding needs before any cleanup.**
- **Stated deployed from committed.** Told Ops "he sees none of them" about code on main
  only. **Say "on main at <sha>"; let Ops say what is live.**
- **Pushed without re-gating** a rebase that brought another seat's code.
- **A time written before the clock was read.**
- **What worked:** opening the code at answer time (the routed fix `asOf: DATE` would have
  emptied the evidence; the right cutoff was the sibling test's); splitting a zero into its
  two causes (a quiet session publishes, an all-struck one does not); predicting every
  mutant's kill count; **verifying each relayed ruling at his own turn** by reading the raw
  transcripts under `C:\Users\adshu\.claude\projects\A--mointel\*.jsonl` for `type: user`
  turns that are not cross-session relays.

## What he ruled, so you don't re-ask

Each is in `design.md` with its turn: no em dashes in any writing (10:43:39Z); the empty-cell
dash stays, "keep it. fine for that, not writing." (10:48:04Z); via Web, the legal texts
stay adopted and title pipes are fine; the report shape: voice right, uncomplicate, an
opening narrative, a price path instead of repeated price sentences, float as a verdict
only, "we're watching N names" with N the report's own list; "yes to both" ships this
morning; the compact lockup header (shipped, read live).

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions and what
we're doing with the product."* A relevance filter, not a length limit. Shas, gate numbers
and which seat corrected whom don't reach him. **The exception is an error that reached,
or could have reached, the app.** Plain words, no jargon, no question numbers, no em
dashes. End with the 🟠 NEEDS YOU block only when a decision is his.

## What he does with the old chat

Rename it `Design-tmi (retired 2026-09-30)` (the retiring seat does this on your request)
and archive it. Do not delete it; the transcript is the record.
