# Opening prompt — Research seat, mointel

*Written 2026-09-29 by the retiring seat `local_d6996864`, on his "a, hand off
after tonight's checks". Every sentence was true when written; where something
is NOT verified it says so. Tonight's grades are filled in below once they are
in; if the "TONIGHT" block still says PENDING, the retiring seat did not finish,
so read `research.md` LIVE STATE and ask Ops for the raw rows.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order:**

1. `docs/threads/research.md` → **`## LIVE STATE`** → **"OPEN, MINE, AND WHAT EACH
   WAITS ON"**. Its top items are your queue. Then the charter under
   **`## Opening message for a new chat`**, then **`### Reporting`** under
   `## Working rules`. **Skip every `ARCHIVE` heading.**
2. `A:\claude-infra-agent\docs\session-hygiene.md`, which governs this session.
3. `docs/research/resistance-levels-spec.md`, **the build you own next** (current
   at `c9f9835`).
4. `docs/research/post-restart-check-2026-09-29.md`: its items 2–5 are yours at
   04:33 ET 09-30.

**Check your own model now** and report it per section 1 of the hygiene rule.
This seat changes code that reaches a live trading board, so **Opus is right.**

**Your first task is not to build.** Find Integration-tmi and Ops-tmi with
`list_sessions` (re-find by title every time; never reuse an id from a file).
**Tell both your session id at once:** the 04:33 ET post-restart rows and the
10:12 ET catalyst-grade rows are sent to Research BY ID, and anything sent to
the retired id is dropped. Then ask Integration for the live state of the items
below and read each off its artefact. **This prompt is a lead, not a source.**

### Where things stand (2026-09-29, evening ET)

**TONIGHT (graded by the retiring seat):** PENDING — filled in after the checks.

**In flight, in time order:**

0. **FIRST, A RED TEST ON MAIN IN YOUR AREA** (unless Integration has already
   routed it elsewhere; ask). `tests/research/interpret.test.ts` › "proves the
   overhang when established supply exceeds the share count" gets `BASIS_STALE`
   (reproduced at `8801f51`). **Diagnosis, read in code, NOT yet proven by a
   fixed-clock run:** the test's `run()` omits `asOf`, so
   `pipeline.ts:494-497` judges the fixture's share count (as of 2026-08-11)
   against the WALL CLOCK, and `FILED_SHARES_CURRENT_DAYS = 45` made it stale
   around 09-25. **Fix: pass `asOf: DATE` in `run()`'s `interpretPipeline`
   options.** Prove it with `vi.setSystemTime` far ahead, and grep the file for
   other pipeline calls without `asOf` that assert freshness.

1. **09-30, 04:33 ET: post-restart items 2–5** (Ops runs them and sends raw rows
   BY ID). Grade each against the pre-registered pass condition in the check
   file. A zero positive control is UNTESTED, never passed.
2. **09-30 after 10:00 ET: the first live read of the catalyst grades**
   (`scripts/ops/grades-v2-read.sql`, Ops's reminder 10:12 ET): C (the MTNB
   control) first, then A, then the amended B, boundary 16:17:16Z. Grade it by
   reading, and report to Integration.
3. **SESSION REPORTS: A NAMED FIRST-DAY ITEM. It fell out between seats, and he
   has asked about it twice:** *"what about the session report? ive asked about
   this twice and it keeps getting left out"* (Integration 19th's session,
   2026-09-29T23:39:14Z). **Its order against the levels compute is his call,
   asked by Integration, which recommended reports first. Get his answer from
   Integration before you pick either up.** State: the writer (`aebdf2f`, no model
   provider) and the checker's deterministic half (`316c02e`, `d998973`, control
   fixed `31328d9`) are built, on main, not shipped. **Next steps, in order:**
   (a) wire the writer's model provider (per `docs/research/session-reports/
   design.md` §4) and SIZE it; (b) build the checker's semantic half; (c) run
   the pre-registered pass bar (`43c1b7c`): six seeded defect classes struck 6/6,
   zero false passes, AND a control that strikes nothing on uncorrupted reports.
   Still unbuilt after that: `GET /api/reports` and the range config (yours), and
   the 20:05 checkpoint (Ops's). **Presentation, his ruling (`8cd59d1e`,
   2026-09-29T23:51:49Z), Design's to build:** *"it can/should be its own page …
   im fine with the location of the link, but it needs to open up a larger window
   like when you click on a specific ticker"*: the briefing line stays as the
   link, and the side reading panel (`307e42d`) is rejected. Set-range reports also depend on Ops storing
   each range's own top N ("(a)" in LIVE STATE). **SPEND AUTHORITY, read at his
   turn by this seat:** transcript `907420a6`, 2026-09-27T23:13:38Z, *"1 set
   ranges, 2 yes, 3 yes"*. The "3" answered *"Approve the build? Yes: Research
   builds the writer and the checker … The checker test has to pass before
   anything goes live."* So model calls for building, sizing and the pass-bar
   test are inside that approval. "Sizing and the pass-bar test ONLY" in
   `research.md` is a seat's narrowing, not his words. It binds as the narrower
   reading, so anything past it goes back to him. Ship is his yes.
4. **THE BUILD: resistance levels ("mark your chart").** Routed by Integration
   19th. Spec `docs/research/resistance-levels-spec.md` (`c9f9835`). His rulings:
   show ALL levels; LABEL "resistance levels" (**his ruling, NOT a measurement**);
   windows *"5m candles for today only. 15m for anything older. up to 39 days. and
   dailys beyond."*; **one ladder PER WINDOW, merged** (not one continuous walk);
   clusters at 0.5% of price; no strength field. Start with the **today/5m window
   on stored 1m bars**, since the 15m/daily windows wait on Ops's history store
   (built after the 09-30 grades read). Publish nothing new to Design: the row
   contract (§2) is already with it. **The ship is his yes, by literal sha.**
5. **Ops owns:** the `loadMinuteBars` bound (D−1, not tonight), the history store
   (§3 of the spec: store by START, display by END; 39-day 15m backfill; the
   OVERLAP-CHECK split re-fetch), and the range-read decision.

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

- **A test's reach stated as a verdict, TWICE (the repeat that retired it).**
  "Recency is what the data supports" came from a test with NO control (levels
  were never compared with non-level prices). Then "neither test supports
  resistance" came from tests that measured touch-then-close-below on computer
  candidates, never his lines and never his use (break → next level). **Before
  any sentence of the form "the data supports/doesn't support X", name what the
  test measured, its control, and the claim it can NOT reach.**
- **A clause he never said, written into a spec:** "one continuous walk" across
  his windows. It would have hidden his own BIYA lines. **Build exactly what he
  said; flag every addition as yours.**
- **Generated clock times** ("~23:3xZ") in the record. **Cite a transcript
  timestamp or a commit sha, never a guessed time.**
- **What worked, keep it:**
  - Pre-register before computing, and amend BEFORE computing when you find a
    design flaw (the height-standardised placebo).
  - Verify every relayed ruling at his own turn in the raw transcripts.
  - Put a positive control on every "absence" (the invariant's +2-day control,
    the harness's empty-range guard).
  - Check a chart's date and time against the store before scoring it (his
    platform labels candles by END time).

### Standing, in full in LIVE STATE

**Never fetch `stockanalysis.com` server-side. No heavy read against production
`market.db` while a deploy unit is running; this seat cannot read production:
Ops can, so send exact queries (index seeks, never a full-table COUNT DISTINCT
on the live box).** The prod copy `data/market-prod-2026-09-29.db` (sha256
`885fd7fd…`) is READ-ONLY; never point a worker at it. **Five+ sessions share
one git index: `git commit --only <paths>` (`git add -N` first for a new file),
never `git add -A`; merge `origin/main` before pushing, and check that a merge
did not sweep in the uncommitted `CLAUDE.md`.** Peer seats rotate: re-find them
by title every time.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-29, 3rd)`**.
4. **Archive it, do not delete it.** The transcript is the record.
5. Peers find the new session by title. It tells Ops and Integration its id
   itself, before the 04:33 ET results.
