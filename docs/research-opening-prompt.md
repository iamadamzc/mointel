# Opening prompt — Research seat, mointel

*Written 2026-09-29T12:37Z, replacing the 2026-09-29T01:42Z version. Every
sentence was true when written; where something is NOT verified it says so. The
session that wrote it ran 2026-09-29T01:43Z–12:37Z and handed off on his yes
after the hygiene rule's saturation signs (long session, heavy cross-seat
traffic, five logged errors of its own — none repeated within the session).*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order:**

1. `docs/threads/research.md` — **`## LIVE STATE`**, starting at the top of
   **"OPEN, MINE, AND WHAT EACH WAITS ON"** (newest items first, including an
   **ERROR LEDGER** you continue), then the charter under **`## Opening message
   for a new chat`**, then **`### Reporting`** under `## Working rules`. **Skip
   every `ARCHIVE` heading.**
2. `A:\claude-infra-agent\docs\session-hygiene.md` — governs this session.
3. `docs/research/session-reports/design.md` — the report design this seat leads.
4. Only when you touch them: `docs/Design/near-live-now-spec.md` (Now column),
   `docs/research/catalyst-grade-definitions-draft.md`,
   `docs/research/benzinga-licence-cost-2026-09-29.md`.

**Check your own model now** and report it per section 1 of the hygiene rule.
This seat changes code that reaches a live trading board and reasons across
several files and seats at once, so **Opus is right for it.**

**Your first task is not to build.** Find Integration with `list_sessions`
(title `Integration-tmi`, check its `cwd` is `A:\mointel` — the seat rotated
three times in one night, so never reuse an id from a file). Ask it for the live
state of the items below and read each off its artefact. **This prompt is a
lead, not a source.**

### Where things stand, 2026-09-29T12:37Z

**Waiting on his yes, built and gated — nothing for you to do but not break them:**

- **Restart set** — tag `research/restart-set-on-2256c63` (`121f97c`): the Now
  column's data side (per-bucket last price, feed-membership intervals, web
  `nowBuckets` read, worker wiring **approved by Ops as owner**) + Ops's
  `trades.db` v2 + band pieces 2/3. One market-worker restart, Ops's time, his
  yes. **No worker rollback below `9508fb9` afterwards.** A **post-restart check
  is PRE-REGISTERED** in research.md ("POST-RESTART CHECK", 6 items) — run it or
  make sure Ops does; no unit test constructs `MarketRuntime`.
- **`sessionEndUtc` memo** — tag `research/sessionend-memo-on-0342e7d`
  (`635a9ae`), approved by Integration, ship question to him after 10:00 ET.
  Measured on a scratch copy: build median 189 → 58 ms (priors only).

**Open and yours:**

1. **Session reports** — contract landed (`13975c9`), `reportFacts` built
   (`d18a00c` + look-ahead fix). **Every set-range report is GATED on Ops's
   capture change** (store each range's own top N + frozen latch columns);
   `REPORT_NAME_CAP = 12` is a development guard. Next: the writer (model spend
   authorised for sizing and the pre-registered pass-bar test `43c1b7c` ONLY).
2. **Range read** — fails Ops's 20 ms gate on the box. Your covering-index
   proposal is ~3× on reads but costs +12–36% on the upsert (measured,
   interleaved) and probably fails Integration's three-part gate. Waiting on
   Ops's box read. Next lever (decoupling the header count) is **held** — it is
   Design's and possibly his.
3. **`/api/market` coalescing** — DEFERRED until the memo is live and re-read.
   Parameters recorded (≤500 ms, key = extraSymbols + served range, never
   re-stamp `fetchedAt`, board polls every **1,000 ms**).
4. **Catalyst grade definitions** — DRAFT with him via Integration, together
   with Design's stale-WHY-NOW proposal. No build.
5. **Benzinga** — replied, no price yet; an answer draft is in the benzinga doc
   §4b for HIM to send. If he saves their guidebook PDF, read it for tiers.
6. **Heartbeat write must not kill the research worker** (`researchRepo.ts`,
   `writeResearchHealth`) — still not started.

### How this session failed, as mechanisms (all in the ERROR LEDGER)

- **A sample from a different regime reported as the current answer.** "$1–$20
  complete to #19" came from checkpoints under the OLD $1 floor; under the
  current $0.25 band it is #13. The query could see sub-$1 rows — the instrument
  was checked, the experiment's frame was not. **Before quoting a store count,
  name the regime it was taken under.**
- **Asserting a system fact without opening the file.** "The board polls every
  2–5 s" — it is 1,000 ms. **Open it or don't say it.**
- **A trading-style justification in a grade argument** ("a reverse split is not
  obviously bad news for small-cap momentum"). Withdrawn. **Published source or
  store measurement only.**
- **Code written through a script lost an escape** (`\'` in a test name) — the
  same class the previous session logged. Caught because the suite collected 0
  tests. **Use Edit/Write for code; grep for `\x08`; watch the test count.**
- **A commit chained after `grep` of test output** committed a run with one
  failure. **Run the suite on its own, read it, then commit.**
- **What worked, keep it:** predict every mutant's kill count (a surplus kill
  and a wrong-reason kill were both caught this way); gate every production cut
  in a clean worktree against a DECLARED test-file count; interleave A/B timing
  and discard physically impossible results; check a build/probe is non-empty
  before timing it; when shared-tree tests fail, prove they are a peer's WIP in
  a clean worktree before committing; remove a worktree's `node_modules`
  junction with `rmdir` BEFORE `git worktree remove`.

### Standing, in full in LIVE STATE

**Never fetch `stockanalysis.com` server-side. No heavy read against production
`market.db` while a deploy unit is running. This seat cannot read production —
Ops can; send exact queries.** Restarts and ships are his yes, taken by Ops.
**Five+ sessions share one git index: `git commit --only <paths>`, never
`git add -A`; merge `origin/main` before pushing. Peer seats rotate — re-find
them by title every time.** Never `git checkout HEAD --` to undo a mutation
test — restore from a temp copy.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-29)`**.
4. **Archive it, do not delete it** — the transcript is the record.
5. Peers find the new session by title.
