# Opening prompt — Research seat, mointel

*Written 2026-09-21. Every sentence below was true on that date. The session that
wrote it retired at context saturation under
`A:\claude-infra-agent\docs\session-hygiene.md`.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order, and nothing else first:**

1. `docs/threads/research.md` — **`## LIVE STATE — 2026-09-21T09:40Z`** first (about
   40 lines: what shipped, what is open and what it waits on, the standing
   constraints, the hazards). Then the charter under **`## Opening message for a
   new chat`**, which holds who you are, what you own, and the working rules.
   **Skip every section whose heading begins `ARCHIVE`** — there are four, and one
   of them is 13,000 lines of working log. Search them; do not read them through.
2. `A:\claude-infra-agent\docs\session-hygiene.md` — the owner's rule on model,
   context, documents and hand-off. It governs this session.
3. `docs/threads/README.md` — only if you need the map of the other seats.

**Check your own model now** and report it to him in your first message per
section 1 of the hygiene rule. This seat makes irreversible changes to a live
trading board and reasons across several files at once, so **Opus is the right
model for it**; recommend no change if you are on Opus, and tell him with this
reasoning if you are above it.

**Follow the session-hygiene rule for the rest of the session**, including the
`## 🟠 NEEDS YOU` block — one fixed searchable block at the end of any message
that needs him, each item decidable from the block alone, and **omitted entirely
when nothing needs him.**

### Where things stand

**Two strands.**

**The cycle apparatus** was most of the last session and three defects are fixed
on `main`: today's session is now visible to the cycle rule (`e48a2ca`), a run no
longer survives forever because one busy day in three defeated a
consecutive-sessions test (`1fba8fd`), and a run also ends when its typical day
trades under **$50,000** (`baece00`, his threshold). The interpreter prompt no
longer tells the model a human reviewed the Sheet's prior analysis (`dbd70d1`) —
no human has ever written it. **Suite 2,183 across 145 files.**

**Jev, TypeSafe's System One model, is under evaluation for NEWS ANALYSIS** and
three documents carry it — read them before proposing anything, the way
`A:\jev-test\CLAUDE.md` asks:

- `docs/Jev_For_News_Analysis.md` — the assessment **and the probe result**. A
  triage probe over 227 documents **failed the 0.80 bar I set, at 0.790**, and the
  failure is diagnosed: it scored worst on the one ticker whose entire candidate
  set is SEC filings. Cost **1.1 cents**; the cadence claim held.
- `docs/Jev_Tape_Research_Harness_REVIEW.md` — **read the amendment at the top.**
  My first verdict was written before I read `A:\jev-test`, which contains a
  settled programme closing that mechanism. Tape is another project's problem.
- `docs/Wire_Feed_Collector_SCOPE.md` — **read "STEP 1 CHANGED SHAPE".**

**`A:\jev-test` is prior art and its `CLAUDE.md` is authoritative.** Pin
`jev-1.13.0`, never `jev-latest`; there is no seed, so cache by
`sha256(model‖state‖questions)`; the Python SDK crashes on this box, so call the
HTTP API. Rate card: **$0.042 per million INPUT tokens, output free.** The key is
in `A:\jev-test\jev.txt` — he approved using it; it is **not** in mointel's env.
The working probe is `A:\jev-test\mointel_news_triage.py`.

### First task — three things he approved on 2026-09-21, none started

**1. Wire `lib/market/replay.ts` so a restart rebuilds `sessionHigh` from stored
minute bars.** It is built and deliberately unwired. A restart at 21:05Z on
2026-09-18 left **1,481 of 7,936 rows** with a high below the one that printed,
and **1,160 of those highs were set in premarket**. The rebuild draws
`dailyBar.h` (09:30-16:00, every symbol) plus an after-hours reconstruction plus
a focused minute backfill covering only **200 names + pins**, so premarket is
recovered for the focused set and nobody else. **Replay is local and exact where
it applies; seed nothing and report UNKNOWN where no bars exist** (the promotion
population). *And this answers the volume-ownership question that stalled replay:
the snapshot owns VOLUME (measured NOT RTH-only, 0.1%), replay owns the HIGH and
LOW (measured RTH-only). Different fields; the measurement decides.* The seam is
in `worker/runtime.ts`, which is **Ops's file** — coordinate.

**2. The cycle frame includes PREMARKET.** He ruled after-hours in earlier and
premarket on 2026-09-21. The live sibling already uses
`max(session_high, ah_high)` (`e48a2ca`). What remains is the **settled** side:
`daily_bars.high` is 09:30-16:00 plus the closing cross, so an all-sessions
settled high must be built from `data/vendor/alpaca-1hour-split-...json`
(audited, 75 symbols, 62 sessions). **Then re-derive `BACKSIDE_RETRACEMENT = 0.5`
and `SUPERRUNNER_ADVANCE = 2.0`, which carry FRAME WARNINGS at their definition
sites and must not be cited as measured until this is done.**

**3. Persist EDGAR's `acceptanceDateTime` with `EXACT` precision.** See
`docs/Wire_Feed_Collector_SCOPE.md`. `sec/collector.ts:246` already reads it and
`:422` already prefers it, but **1 of 3,253 `SEC_FILING` rows has an exact
timestamp and all 878 exhibits are `INFERRED`** — so the desk cannot say whether
a press release became public at 08:00 or 18:00. **669 of those exhibits ARE
press releases** (EX-99), public-domain, already collected. That one distribution
decides whether a PR Newswire licence is worth buying, and measuring it is free.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-21)`** so the name no
   longer collides and peer messages route to the new session.
4. **Archive the old chat, do not delete it** — the transcript is the record.
5. The seats that talk to this one (Integration, Ops, Design) can find the new
   session by title; no id needs passing by hand.
