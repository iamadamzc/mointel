# Opening prompt: Research seat, mointel

*Written 2026-10-01T13:10Z (system clock) by the retiring seat `local_f6fa4717`, on his
"hand off, write the opening prompt". Every sentence was true when written; anything NOT
verified says so. This prompt is a lead, not a source: what has happened since is read off
the artefacts, not off this page.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`

**First, before anything else:**
1. Rename this session to exactly **`Research-tmi`** (`set_session_title`, session `self`).
   *Titles are global across every project on this machine. Never a bare `Research`.*
2. Then tell the retiring seat you are up, **by its session id, not its title** (both are
   `Research-tmi` until it renames itself):
   `send_message` to **`local_f6fa4717-cffa-4ff7-a0e1-9b20ad40e957`**: "New Research seat is up as
   Research-tmi, session <your id>. You can rename yourself now." It renames itself to
   `Research-tmi (retired 2026-10-01)` when it reads that.

**Read, in this order:**

1. `docs/threads/research.md` → **`## LIVE STATE`** → **"OPEN, MINE, AND WHAT EACH WAITS ON"**.
   Its FIRST bullet (🔴 BIG MOVERS) and the ⏸ block under it are your first task's brief. Then the
   🔴 TOMORROW'S QUEUE bullet, the charter under **`## Opening message for a new chat`**,
   **`### Reporting`** under `## Working rules`, and the **ERROR LEDGER, seat `local_f6fa4717`**.
   **Skip every `ARCHIVE` heading.**
2. `A:\claude-infra-agent\docs\session-hygiene.md`, which governs this session.
3. `docs/research/board-movers-spec.md` (the movers rule and its pre-registered check) and
   `docs/research/board-movers-replay-2026-10-01/movers-check-result.md` (the replay result).
4. `lib/market/rvol.ts` lines 1 to 40: the RVOL definition, which the code pins as FIXED
   ("must not be replaced with a time-of-day adjusted formula"). A baseline change is his call.

**Check your own model now** and report it per section 1 of the hygiene rule. This seat changes
code that reaches the live board and the model's prompts, so **Opus is right.**

**Your first task is not to build.** Find Integration-tmi and Ops-tmi with `list_sessions` (re-find
by title every time, never reuse an id from a file). Tell both your session id. Ask Integration for
the live state and read each answer off its artefact: what shipped or was approved since 13:10Z,
his rulings since, and the results of Ops's three reads scheduled from 14:01Z (the citation census,
the citation cut's release gate on `2a625a5b`, and the registered VEEA movers read).

### Then: his comparison (his ruling, relayed by Integration: "yes, wait for the comparison")

He asked, of the movers rule: *"we went pretty fast on that. was there a cost analysis? (not $,
system cost, compatibility, design, etc.) does it make sense? we're slowly becoming a scanner
doing that."* The movers cut is HELD; "most active right now" is WITHDRAWN. Build ONE side-by-side,
measured where it can be, of **(A)** the movers rule as built (`research/movers` at `aaebfc42`)
and **(B)** a robust RVOL baseline (median, or outlier-trimmed mean) in place of the 20-session
mean, against his requirement (a big mover like VEEA reaches the board). Per option: system cost,
compatibility (every reader of `rvol` / `rvol_rank` / `ranked`, by file), design (one principle on
the board or two), product (does it stay an RVOL board), and the replay evidence: how many of the
names A added (VEEA, NCPL, FTFT, SVRN, AEHL, CMND) B would have ranked into the top 50 anyway. The
full brief is in research.md. **Pre-register B before computing.** Local copy only in 07:00 to
10:00 ET. Nothing ships without his decision.

**Facts you will need, measured on the local copy `data/market-prod-2026-09-29.db`:** VEEA's
20-session MEAN baseline is 13.4M shares (a 202,161,392-share day on 09-15) against a MEDIAN of
346k. Per-day volumes for the whole universe exist only as each day's final
`ticker_session.cumulative_volume`, a proxy: within 1% of the stored mean for 1,663 of 7,909
symbols, and raw across splits. Minute bars cover 09-09 to 09-29. The A replay passed its
instrument gate on 10 of 12 sessions (09-28 and 09-29 fail on latched names it does not replay).

### Where things stand (2026-10-01T13:10Z)

- **Levels (stored rows):** box test PASSED as registered (refresh 107 s against 150; read p95
  0.7 ms). Thursday cut `b5a35fda`; ships after 20:00 ET on HIS yes, with the caveat he must hear:
  a cold refresh keeps one child busy about 2 minutes of every 5, and its effect on the market
  feed in his window is checked only after ship (Ops compares the 09:30 to 10:30 ET flush lines).
- **Design's (A) cut `840741d3`** (report headings hidden, his "b"; carries the review-reports
  mirror `d427dd0e`): approved. **Citation cut `2a625a5b`** (tokens stripped at write and on
  display; Design's board wiring): approved by Integration, waiting on Ops's gate and his yes.
- **Reports v6 bundle**, one re-freeze, queued in research.md: the stability probe (cap $10), the
  checker input trim, computed headings, date-only formatting, the false "exact" clock, the
  citation strip in `reportResearch` plus a checker guard, and the opening session narrative.
- **Also queued:** the `sic_description` write (`a4a92a8f`, cherry-pick after Ops lands the v28
  main twin), the Now-cell condition-named log line, the levels `history.db` reader.

**Worktrees the retiring seat leaves** (all pushed or tagged; remove the finished ones):
`A:\mointel-rmovers` (`research/movers`, held), `A:\mointel-levels2` (`research/levels-stored`, in
the Thursday cut), `A:\mointel-sic` (`research/sic-write`), `A:\mointel-citecut` (detached at the
tag `research/citation-cut-on-840741d3`), `A:\mointel-cite2` (a docs worktree on origin/main,
safe to remove). Each has a `node_modules` JUNCTION to `A:\mointel\node_modules`: remove the
junction with `rmdir` FIRST, then `git worktree remove`, so the real folder is never followed.

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

- **A sentence about code it had not opened (REPEATED, which is why it retired).** "Review links
  already show this research" (never opened the drawer's payload); "K = 0 turns the rule off" (never
  opened the parser; `num()` rejects 0). **Cure: before any sentence about how code behaves, open
  the line it rests on or write the test that would fail if it were false.** The second one was
  caught by exactly such a test.
- **A path listed without its precondition.** It named "a vendor ack" as a silent cause of the
  Now-cell flicker; an ack only follows a subscribe the desk sends, and that is logged. Trace what
  must happen first.
- **A step's result not checked before the next acted on it.** A chained command committed a file
  with conflict markers after its own grep printed 2. Gate the commit on the check.
- **A pick that carried more than the change.** A conflicting cherry-pick's hunk carried two
  functions from origin/main onto the production line. **Diff every pick line by line against its
  original before you push it.**
- **The shared main.** A plain push from `A:\mointel` publishes every local commit, including a
  peer's held one. Run `git log origin/main..main` first; if any commit is not yours, push yours
  from a temporary worktree on origin/main.
- **What worked, keep it:** a check written down BEFORE any number is computed; a predicted kill
  count for every mutant (two died too quietly and each exposed a weak test); every relayed ruling
  verified at his own turn before acting; big reads delegated to a subagent, then spot-checked by
  hand before anything is relayed (the first live-report audit and the citation census both
  changed when checked).

### Standing, in full in LIVE STATE

**No em dashes (U+2014) in anything you write to him, in docs or in product copy: his hard rule.**
**No box reads and no full test suite on his PC between 07:00 and 10:00 ET.** ONE full suite at a
time across seats: ask Ops for the slot (run it from Git Bash; PowerShell's `bash` is WSL and fails
the deploy-script tests). Five+ sessions share one git index: `git commit --only <paths>`
(`git add -N` first for a new file), never `git add -A`. Ship is his yes, by literal sha.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It renames itself `Research-tmi` and messages the old session by id.
3. The old chat then renames itself to **`Research-tmi (retired 2026-10-01)`**.
4. **Archive the old chat, do not delete it.** The transcript is the record.
5. Peers find the new session by title. It tells Ops and Integration its id itself.
