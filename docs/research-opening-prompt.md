# Opening prompt — Research seat, mointel

*Written 2026-09-29T16:56Z (12:56 ET, from zoneinfo), replacing the 12:37Z
version. Every sentence was true when written; where something is NOT
verified it says so. The session that wrote it (`local_e18a7d74`) ran
12:52Z–16:56Z and handed off on his "yes, hand off", after a REPEAT of an
already-corrected error class (the hygiene rule's §2 trigger; see "How this
session failed").*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order:**

1. `docs/threads/research.md` → **`## LIVE STATE`**, starting at the top of
   **"OPEN, MINE, AND WHAT EACH WAITS ON"**. Its first item, **"HAND-OFF
   2026-09-29T16:56Z — IN FLIGHT, IN TIME ORDER"**, is your work queue. Then read
   the charter under **`## Opening message for a new chat`**, then
   **`### Reporting`** under `## Working rules`. **Skip every `ARCHIVE` heading.**
2. `A:\claude-infra-agent\docs\session-hygiene.md`, which governs this session.
3. `docs/research/post-restart-check-2026-09-29.md`, **tonight's check, which
   you grade.**
4. Only when you touch them: `docs/research/session-reports/design.md`,
   `docs/Design/near-live-now-spec.md`, and
   `docs/research/benzinga-licence-cost-2026-09-29.md`.

**Check your own model now** and report it per section 1 of the hygiene rule.
This seat changes code that reaches a live trading board and reasons across
several files and seats, so **Opus is right for it.**

**Your first task is not to build.** Find Integration with `list_sessions`
(title `Integration-tmi`, `cwd` `A:\mointel`; it was the 18th seat,
`local_92208da3`, at hand-off, but re-find it, never reuse an id from a file).
**Tell Integration AND Ops (`Ops-tmi`) your session id at once:** tonight's
post-restart results are sent to Research BY ID, and anything sent to the
retired id is dropped. Then ask Integration for the live state of the items
below and read each off its artefact. **This prompt is a lead, not a source.**

### Where things stand, 2026-09-29T16:56Z

**Live in production `9d554e0`** (Ops `/proc` 16:18:16Z): the catalyst grade
definitions (his ruling 14:46:55Z), the research-worker busy-lock fix, the
`sessionEndUtc` memo and the poll fix. **On main, not shipped:** the report
checker fix (`31328d9`) and the report writer (`aebdf2f`, no model provider yet).

**In flight, in time order. The detail is in LIVE STATE, item 1:**

1. **TONIGHT, market-worker restart at 20:15 ET** (his word, verified at his
   turn). Ops runs the pre-registered post-restart check on schedule and sends
   the raw rows to you. **You grade them.** A zero positive control is
   UNTESTED, never passed.
2. **09-30 after 10:00 ET, the first live read of the new catalyst grades:**
   C (MTNB control) first, then A, then the amended B, with the boundary at
   16:17:16Z. Grade it by reading, and report to Integration.
3. **When Ops's post-close `market.db` copy lands, profile the ~480 ms
   `/api/market` build.** The local lead is that `loadMinuteBars` walks every
   retained session per board name. Report ratios, labelled as priors. Any fix
   is Ops's.
4. Then coalescing (its ship is his decision, as a freshness trade), then the
   report writer's provider and sizing.

### How this session failed, as mechanisms (all in the ERROR LEDGER)

- **Absence concluded from a search that could not see where the thing was,
  TWICE.** A pre-registered query matched `'%reverse split%'` and could not see
  "reverse stock split" or "share consolidation". On the 08-23 snapshot it
  missed 5 real cases. By Ops's read, relayed by Integration and not opened
  here, MTNB, its own named control, is worded "reverse stock split". Then "MTNB 2445 reached the record by relay" came from a grep of
  three thread docs; Ops had read it first-hand with a committed probe
  (`afe6109`). **Before you say something is absent, name what your search
  could see, and run it on a case you know is present.** `git grep` the whole
  tree, not the threads.
- **A clause he never ruled, written into ruled text:** "otherwise UNKNOWN"
  for unconfirmed compliance. It was caught before commit. **Build exactly
  what was adopted; flag any addition or drop.** The "fresh" clause was dropped
  AND reported, which is the right shape.
- **An inference recorded as a fact:** "the old worker stopped first" was
  Integration's inference from "down 2s". **Label an inference where it is
  written.**
- **What worked, keep it:**
  - Measure the checker against Marketing's real specimens before building on
    it. It struck 4 of 6 correct lines.
  - Prove writer and checker agree line by line.
  - Predict every mutant's kill count, and explain any shortfall. The 10.335
    shortfall was a wrong prediction about binary representation, not a
    vacuous test.
  - Gate every cut in a clean worktree against a declared count. Run
    `next typegen` there first.
  - Refuse to time an empty snapshot.
  - Verify every relayed ruling at his own turn in the raw transcripts.

### Standing, in full in LIVE STATE

**Never fetch `stockanalysis.com` server-side. No heavy read against production
`market.db` while a deploy unit is running. This seat cannot read production:
Ops can, so send exact queries.** Restarts and ships are his yes, taken by Ops.
**Five+ sessions share one git index: `git commit --only <paths>` (use `git add
-N` first for a new file), never `git add -A`; merge `origin/main` before
pushing. Peer seats rotate, so re-find them by title every time.** Never
`git checkout HEAD --` to undo a mutation test; restore from a temp copy.
Remove a worktree's `node_modules` junction with `rmdir` BEFORE
`git worktree remove`.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-29, 2nd)`**.
4. **Archive it, do not delete it.** The transcript is the record.
5. Peers find the new session by title. It tells Ops and Integration its id
   itself, before tonight's results.
