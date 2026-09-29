# Opening prompt — Research seat, mointel

*Written 2026-09-29T01:42Z, replacing the 2026-09-28 version. Every sentence
was true when written; where something is NOT verified it says so. The session
that wrote it ran 2026-09-28T01:03Z to 2026-09-29 and retired on his
instruction ("hand off, write the prompt") after two repeated error classes.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order:**

1. `docs/threads/research.md` — **`## LIVE STATE`** first (the newest items sit
   at the top of "OPEN, MINE"), then the charter under **`## Opening message for
   a new chat`**, then **`### Reporting`** under `## Working rules`. **Skip every
   `ARCHIVE` heading**; one is 13,000 lines.
2. `docs/research/session-reports/design.md` — the report design this seat LEADS.
3. `A:\claude-infra-agent\docs\session-hygiene.md` — governs this session.
4. `docs/threads/README.md` — the two reporting entries near the top
   (`60a2f08`, `47efeb4`), his words on how every seat reports.

**Check your own model now** and report it per section 1 of the hygiene rule.
This seat changes a live trading board and reasons across several files at once,
so **Opus is right for it.**

**Your first task is not to build.** Ask Integration (`Integration-tmi`, find it
with `list_sessions` and check its `cwd` is `A:\mointel`) for the live state of
the items below, and read each off the artefact — this prompt is a lead, not a
source, and it goes stale between being written and being pasted.

### Where things stand, 2026-09-29T01:42Z

**Shipped or ready this session, all on `main`:**

- **News collector** (his ruling "collector first"): Alpaca/Benzinga adapter,
  multi-source by design, `lib/research/news/`. LIVE. **His ruling "no to both",
  2026-09-28T23:32:53Z: no second source** — Alpaca/Benzinga is the only one.
- **News re-check** (his "build the re-check next"): a top-12 poll every 180 s
  that re-queues a name when a release lands after its last job. LIVE as
  `dca4a04`; re-queue proven by job 5397 (`ARAY`, per Integration).
- **Halt-notice filter**: only "circuit breaker" and "stock now up|down N" —
  the two shapes seen live. Recall over precision; six disclosure-carrying halt
  headlines are pinned as never filtered. **Add a shape only when a live example
  turns up as a stored row.**
- **Board price range, server side** (band piece 4): `af15a13` (live in
  `2256c63`), `8d8e50c` latch scoped to the viewer's range, `d2c2582` SQL-ordered
  read under Ops's 20 ms gate + `diedWhileRanked`, `28a8cb1` `aboveRangeLatched`.
  **Not shipped: waits on Ops's live timing (set for 08:30 and 11:05 ET), Design's
  graveyard switch, the no-params default flip (Design + Integration decide which
  callers), and his deploy yes.**

**Queued, in this order — his rulings, all verified at his turn:**

1. **SESSION REPORTS, resumed** ("resume the session reports build",
   2026-09-28T23:34:24Z). Next: the two contract changes in
   `lib/desk/reports/contract.ts` — the `MissedCause` union and per-report
   `{min,max}`. **Tell Design before either lands**; its panel is built against
   the contract. Then the writer, the checker's semantic half, the
   **pre-registered pass-bar test** (`43c1b7c`: six seeded classes 6/6 struck,
   zero false passes, AND a control that strikes nothing on clean reports — it
   gates any enumeration and must not move to meet a result), then
   `GET /api/reports` and the range config. Model spend: sizing and the pass-bar
   test only.
2. **Near-live Now column, data side** ("yes build the near-live now column",
   2026-09-29T01:38:17Z). Design owns the spec; you own getting 10 s buckets to
   the board. **The worker already writes completed buckets to `trades.db` every
   1 s flush (`worker/runtime.ts:1523`), so the web tier reads `trades.db`
   read-only — no market-worker restart — PROVIDED Ops confirms
   `health.tradeCapture.bucketsWritten` is rising in production.** He rejected a
   rolling 60 s window. Only high-res names have buckets; the set is in LIVE
   STATE (`applyHighResSelection`) — a name without a feed reads "no live data",
   never 0.
   **⚠️ SUPERSEDED 2026-09-29 by the session this prompt started: "no
   market-worker restart" is FALSE.** A measured 0 needs membership intervals,
   and his 02:32:20Z ruling ("i want the trade counts, dots and direction
   color") needs a price per bucket — one engine change, one restart. See
   research.md LIVE STATE, the ~02:45Z Now-column item.
3. **A heartbeat write must not be able to kill the worker** — never started.

### How this session failed, as mechanisms

- **Code written through a script loses its escapes.** Twice: regex `\b` became
  backspace bytes (compiled, would never match); an escaped quote vanished from
  a test name. **Write code with the Edit/Write tools, not through a Python or
  heredoc string; if you must, grep the result for `\x08` and run tsc.**
- **An abbreviation of a verified fact becomes a false fact.** I had the
  high-res set right in `design.md` and wrote "top 50 + latched + pinned" in my
  charter — the exact line the desk retracted once before. **Copy the verified
  form or point at it; never shorten it.**
- **A claim about what a system does, sent before testing it against real
  data.** "Authority NEWSWIRE when the wire is recovered" — every Benzinga item
  has empty content, so it can never fire. And "the default range and the
  qualify band coincide at $1–$20" — production's band is $0.25–$20. **Both
  were in my own charter; check a charter claim against the box value before
  building on it.**
- **A hypothesis stated with its falsifier is fine; relaying it without the
  falsifier is not.** The FUSE "crowded out by the cap" reading carried its own
  test and died by it (the version's `source_ids` is the CITED set,
  `pipeline.ts:384`, not the bundle). Keep doing that.
- **What worked, keep it:** predict every mutant's kill count before running
  it (a survivor exposed an untested tie-break); gate the PICKED tree in a temp
  worktree before an enumeration; reproduce a peer's slow measurement before
  fixing it; verify every relayed ruling in the raw transcript
  (`C:\Users\adshu\.claude\projects\A--mointel\*.jsonl`, `type: user`).

### Standing, in full in LIVE STATE

**Never fetch `stockanalysis.com` server-side. No heavy read against production
`market.db` while a deploy unit is running. Ops takes deploy approvals from him
directly** — a web-tier change that alters his board is his yes, not a standing
grant. **Five sessions share one git index: `git commit --only <paths>`, never
`git add -A`; merge `origin/main` before pushing.** Never `git checkout HEAD --`
to undo a mutation test — restore from a temp copy.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-29)`**.
4. **Archive it, do not delete it** — the transcript is the record.
5. Peers find the new session by title.
