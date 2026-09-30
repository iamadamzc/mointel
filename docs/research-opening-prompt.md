# Opening prompt: Research seat, mointel

*Written 2026-09-30T23:09:51Z (system clock) by the retiring seat `local_4b09b3b2`, on his
"a, write the hand-off prompt". Every sentence was true when written; anything NOT verified
says so. This prompt is a lead, not a source.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order:**

1. `docs/threads/research.md` → **`## LIVE STATE`** → **"OPEN, MINE, AND WHAT EACH WAITS ON"**.
   The bullets marked 🔴 at its top are tonight's state and tomorrow's list. Then the charter
   under **`## Opening message for a new chat`**, **`### Reporting`** under `## Working rules`,
   and **this seat's ERROR LEDGER** (seat `local_4b09b3b2`). **Skip every `ARCHIVE` heading.**
2. `A:\claude-infra-agent\docs\session-hygiene.md`, which governs this session.
3. `docs/research/session-reports/design.md`: "v5 PASS BAR, PRE-REGISTERED" and everything
   under it (runs 1 to 4, their causes and the re-freezes), and §8 (the v5 contract).
4. `docs/research/resistance-levels-spec.md` §6 and §7 (tonight's levels registrations).

**Check your own model now** and report it per section 1 of the hygiene rule. This seat changes
code that reaches a live board and the model's prompts, so **Opus is right.**

**Your first task is not to build.** Find Integration-tmi and Ops-tmi with `list_sessions`
(re-find by title every time, never reuse an id from a file). Tell both your session id. Then
ask Integration for the live state: whether the reports release shipped, whether the levels box
cost test (spec §7) ran and what it printed, and anything he ruled after 23:09Z. Read each
answer off its artefact.

### Where things stand (2026-09-30T23:09Z)

**Session reports v5: built, and the checker PASSED its pre-registered bar on run 4**
(`ce09e3d`, set `240e2f3a`, checker re-frozen `cb6d030`: 19/19 seeded defects struck in all
3 runs, 0 control strikes). Runs 1 to 3 failed as registered; every cause is in `design.md`.
Integration's commit `394520d4` records his yes on the reports release as verified. **Whether
it shipped is for you to read, not assume.**

**Tomorrow's list (approved by Integration, owner Research, in LIVE STATE with its trigger):**
1. **Model-half stability.** Run 3 showed the checker's model striking TRUE lines in one run
   of three (WHLR "no fresh catalyst" under SECONDARY_STALE; ARTL "no share count is on file"
   with `sharesOutstanding` null). Run 4 did not show it; it was not fixed. **A proposal
   before any change.** Then a new registration, re-freeze, fresh set, run.
2. **The Now cell's one-poll board-wide "/min" fallback** (15:07:02 ET on `c3d0f06`), answered
   from the CODE only, no probes in his window: which paths blank `nowBuckets` for the whole
   board for one poll, and whether each leaves a journal line Ops can count.
3. **Levels `history.db` reader** (approved, not built; trigger: with or after the
   history-store release), so the ladder switches to his 39 days on its own.
4. Levels themselves: tonight they ship ONLY if the box cost test (spec §7, `4612eba`, branch
   `levels-request-path` at `8dfacf4`) passed. If it did, merge with the two nits Ops noted on
   `loadMinuteBarRange` (the format note and the ">=/<=" wording) as a separate commit. If it
   failed, the precomputed backup (`8bdedb9`, on the subagent branch) needs a NEW registration
   on production hardware, a non-blocking host, and ONE storage (Ops's `history.db`
   `resistance_levels` table), per Integration's ruling.
5. The premarket report reads the 22:00 recap tonight (the frozen `pipeline.ts`); his 20:05
   ruling moves it to the 20:05 checkpoint with a 22:00 update in the same slot. Re-gated.
6. `upsertIssuer`'s write of `sic_description` (v28 is gated): check it landed; if not, land it.
7. Grades B re-run on a later window, with `scripts/ops/grades-v2-read.sql` at `>= 2`.

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

- **Generated code loses backslashes (THREE repeats in one session).** Through bash heredocs and
  `node -e`, `\s` became `s` and a regex failed to compile. Asserts and tsc caught every one.
  **Every script with a backslash goes through the Write tool, built with
  `String.fromCharCode(92)` if needed; every edit script asserts its target occurs once.**
- **Asserting what I had not opened (two repeats).** "The report table is NOT in v28" (read an
  older commit); "09-26 exists" (a Saturday). **Open the current artefact before any sentence
  about it, including a date.**
- **A claim wider than its object.** "No name on 09-21 is NONE_FOUND" after scanning only each
  report's 12 covered names. **Scope the noun: say which population you looked at.**
- **Fixing one field instead of auditing the projection.** Run 1 failed on a supply field
  (`sourceFiling`) missing from the checker's research block; I added it alone. Run 3 failed on
  another (`dollarCapacity`) from the same block, and reports missed a night. **When one field
  is missing from a projection, audit every field of the source type.**
- **Changing a locked artefact to suit its reader.** I asked Marketing to reformat a hash-locked
  seed set; the reformat overwrote the lock. **After a lock, the harness adapts to the file.**
- **What worked, keep it:**
  - A prediction written in the harness BEFORE any call. Runs 1, 3 and 4's predictions were right.
  - A mutant with a predicted kill count. Four mutants died "too quietly" tonight and each
    exposed a weak test (a fixture that could not see the rule it guarded).
  - A pre-check proven able to fail before its pass is trusted (the coverage pre-check stopped
    on the void AUUD set first).
  - Integration's pre-fixed outcome rules, written before each result.

### Standing, in full in LIVE STATE

**No em dashes (U+2014) in anything you write to him, in docs or in product copy: his hard
rule.** Never fetch `stockanalysis.com` server-side. No heavy read against production
`market.db`; send Ops exact queries. The prod copy `data/market-prod-2026-09-29.db` is
READ-ONLY. **Five+ sessions share one git index: `git commit --only <paths>` (`git add -N`
first for a new file), never `git add -A`; merge `origin/main` before pushing, and check the
merge did not sweep in the uncommitted `CLAUDE.md`.** **ONE full test suite at a time across
seats: ask Ops for the slot.** Model spend for building, sizing and pass-bar runs is inside his
"3 yes" (`907420a6`); tonight's pass runs cost about $10. Ship is his yes, by literal sha.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-30)`**.
4. **Archive it, do not delete it.** The transcript is the record.
5. Peers find the new session by title. It tells Ops and Integration its id itself.
