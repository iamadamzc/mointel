# Opening prompt: Research seat, mointel

*Written 2026-09-30 by the retiring seat `local_bed7ed93`, on his "c" (hand off at the next
quiet point after the 10:00 read). Every sentence was true when written; anything NOT verified
says so. This prompt is a lead, not a source.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order:**

1. `docs/threads/research.md` → **`## LIVE STATE`** → **"OPEN, MINE, AND WHAT EACH WAITS ON"**.
   Its first bullet, **QUEUE, IN ORDER**, is your work. Then the charter under
   **`## Opening message for a new chat`** and **`### Reporting`** under `## Working rules`.
   **Skip every `ARCHIVE` heading.**
2. `A:\claude-infra-agent\docs\session-hygiene.md`, which governs this session.
3. `docs/research/session-reports/data-map-2026-09-30.md`: every ruling on the next reports
   build, with what data exists at checkpoint time and what is missing. **Read it end to end
   before touching the writer or the checker.**
4. `docs/research/session-reports/design.md`, the sections "PRE-REGISTERED" (the pass bar and
   its two amendments), "RUN 1", "RUN 2", and §4 ("WRITER SIZED", "CHECKER BUILT", the voice runs).

**Check your own model now** and report it per section 1 of the hygiene rule. This seat changes
code that reaches a live board and the research model's prompt, so **Opus is right.**

**Your first task is not to build.** Find Integration-tmi and Ops-tmi with `list_sessions`
(re-find by title every time, never reuse an id from a file; **Ops changed seat on 09-30 and its
reminders died with the old one**). Tell both your session id. Then ask Integration for the live
state of the queue and read each item off its artefact.

### Where things stand (2026-09-30, ~14:30Z)

**Tonight's time-bound checks are all graded.** Post-restart items 1–4 PASS, item 5 UNTESTED (no
reconnect), and item 6 FAIL as registered / PASS-shaped post hoc (`post-restart-check-2026-09-29.md`).
Catalyst grades v2 first live read: C PASS, A PASS, B UNTESTED, because no v2 reverse-split
catalyst occurred. **Re-run B on a later window** (research.md LIVE STATE).

**Session reports (his biggest commission):**
- Built and on main, not shipped: the writer and its provider (`a3d9880`), writer prompt v4
  (`3d29859`), and the checker v2 frozen at `1c47bfb`, which **PASSED its pre-registered bar in
  run 2** (`d7c5df4`: 18/18 defects struck in all 3 runs, 0 control strikes).
- **He has since changed the shape** (verified at his turns, 04:06:07Z, 10:42:25Z, 10:43:39Z):
  an opening narrative, the price as a path, the catalyst itself and our read on it, the float
  as a verdict only, "what the company does", no city, "the shape is good" (Marketing's SANG
  block), and **"no em dashes in any writing. hard rule."** So the NEXT build is **v5: fact
  sheet v2, writer v5, the checker extended with new seed classes, a NEW frozen version and a
  NEW blind pre-registered pass bar.** Every rule for it is in the data map.
- Before v5, and separately, the queue has the em-dash text fixes in three research files, and
  **one** interpreter-prompt change (the business line plus an em-dash ban): one version bump,
  its own enumeration, never overlapping a live read window, with the grade risk named.
- Ops owns the per-range checkpoint table (`desk_assessment_ranges`, DDL `782ce0b`, answered by
  this seat), the after-hours high freeze and the 20:05 checkpoint. Design owns the surface,
  `watchCount` wording and the labels (final strings `c76e98f`). Marketing owns the voice.
  Commercial reviews the next sample before he sees it (`commercial.md` §8–§10).
- Then `GET /api/reports` and the range config. Then resistance levels (spec `c9f9835`).

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

- **A rule written from a document's wording, not from the code it governs (twice).** A checker
  rule required each line to name its ticker, copied from the writer prompt; Design's surface
  already prints the ticker, and the rule struck 12 true lines. Later it told Marketing "I moved
  the rank line", reading the drafts' look instead of its own diff. **Before a sentence about
  code, including your own change, open the code or the diff.**
- **A count on the wrong population.** After-hours totals were counted over every instrument
  (ETFs and warrants included) and reached two seats and an example before the board's own
  eligibility filter was applied. **Before any count reaches a peer, ask whose population the
  claim is about, and apply that filter.**
- **A claim wider than its object.** "Registration amended before any checker change", when
  only the strike logic was true (a peer caught it). **Scope the noun.**
- **Generated code loses backslashes (twice).** Python written through a bash heredoc drops an
  escape level: `\b` became a backspace. An `assert` caught the second. **Write any script that
  contains regex or escapes with the Write tool, and assert its target text exists before you
  replace it.**
- **What worked, keep it:**
  - Pre-register, commit the harness before any model call, and commit raw output before
    reading it. Twice tonight a prediction written before the run came true.
  - A seeded set written BLIND by another seat. Run 1's control failures were real checker
    gaps that its author (this seat) would not have seeded.
  - Verify every relayed ruling at his own turn. It caught that his approved float example
    ("small float…") cannot be produced from any stored field.
  - A control on every absence: grades B was "untested", not "passed", because C proved the
    pattern could see a split.

### Standing, in full in LIVE STATE

**No em dashes (U+2014) in anything you write to him, in docs or in product copy: his hard
rule** (memory `no-em-dashes`). Never fetch `stockanalysis.com` server-side. No heavy read
against production `market.db`; send Ops exact queries. The prod copy
`data/market-prod-2026-09-29.db` is READ-ONLY. **Five+ sessions share one git index:
`git commit --only <paths>` (`git add -N` first for a new file), never `git add -A`; merge
`origin/main` before pushing, and check the merge did not sweep in the uncommitted `CLAUDE.md`.**
Model spend for building, sizing and pass-bar tests is inside his "3 yes" (`907420a6`,
2026-09-27T23:13:38Z); anything past that goes back to him. Ship is his yes, by literal sha.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-30)`**.
4. **Archive it, do not delete it.** The transcript is the record.
5. Peers find the new session by title. It tells Ops and Integration its id itself.
