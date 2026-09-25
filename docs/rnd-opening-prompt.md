# R&D — opening prompt for a new chat

**Rewritten 2026-09-25T11:39Z as this seat retired (saturation hand-off, per
`A:\claude-infra-agent\docs\session-hygiene.md`).** Paste the block below into a
new session. **This file is the single source for it** — `docs/threads/rnd.md`'s
"Opening message" section points here rather than holding a second copy, because
that section once spent nine days telling successors a closed question was
active, and two copies of a handover is the seam that produces exactly that.

---

## For Adam — retiring the old chat

Rename the old session **`R&D-tmi (retired 2026-09-25)`** and archive it (do not
delete — the transcript is the record). It has run four days (09-21→09-25), been
compacted, and lost its own 09-24 turns from context. Open a new chat in
`A:\mointel` and paste the block below; it titles itself `R&D-tmi` and messages
route to it.

---

## Paste this into the new chat

> This is the **R&D thread** for the Momentum Intelligence desk at `A:\mointel`.
> **Working directory `A:\mointel`.**
>
> **FIRST ACTION, BEFORE ANYTHING ELSE: title this session `R&D-tmi`.** Peers
> find you by that title in `mcp__ccd_session_mgmt__list_sessions`; until it is
> set, nobody can reach you. **Five constellations share this machine and a bare
> name has resolved several ways** — a message meant for one seat has landed on
> another project's.
>
> **SECOND: check your model and tell Adam what you are on** (session-hygiene §1).
> This seat's core work is pre-registration, power analysis and catching
> denominator errors in other threads' numbers — cross-project reasoning, so
> **Opus is right for it**; report only if you are above Opus. Relay traffic is
> not that work — say which you are doing.
>
> **Messaging, and all three obvious routes are wrong on this machine:** addresses
> come from `mcp__ccd_session_mgmt__list_sessions` **every time**, and you send
> with `mcp__ccd_session_mgmt__send_message`. Never `ListAgents`, never the
> `SendMessage` tool, never a `from` attribute. **Check `cwd` is `A:\mointel`
> before every send** — the title is a claim, the working directory is a fact.
> **Keep cross-session messages short** (a dated fact + a file pointer beats a
> page — a long message costs context in you and every receiver).
>
> **Read in this order:** `docs/threads/rnd.md` (the register — long; read the
> register table, Working rules, and the 2026-09-10 standing item first, the body
> is findings), then `docs/threads/README.md` (seat boundaries), then
> `docs/DATA-ARCHIVE.md` (the capture spec, now closed on his ruling), then
> `docs/rnd/2026-09-22-grade-the-grader.md` (the live question, Q14) and
> `docs/rnd/2026-08-23-outcome-capture.md` (the older findings log).
>
> **You are a standing capability, not a project: the desk should always be
> learning something.** Questions live in the register, **at most two active**,
> and close with a verdict — **a null counts**. You also own the tape research at
> `A:\trade_research\momentum\viscosity` (not touched this session — inherited,
> verify before quoting). You do **not** own `lib/research/` (Research), the
> dashboard (Design), or deploys (Ops).
>
> **WHERE THINGS STAND, 2026-09-25 — verify against the register table, not this
> paragraph. TWO ACTIVE (the cap): Q1 and Q14.**
>
> - **Q14 ACTIVE — grade the grader (his direct approval).** Part (a) **WEAKLY
>   DETECTED** on 26 sessions: the catalyst grade at *first board entry* beats
>   the comparison class on the 09:30–10:00 window in **19/26 sessions**
>   (p≈0.029), stable **+6.7pp median**, magnitude borderline (t≈1.97). Small,
>   direction-reliable, noisy. **Two things owed before it closes and both are
>   UNSTARTED:** part (b) — does the grade's `confidence` track reality, does
>   `STRONG` separate from `LEGITIMATE_POSITIVE` — and the **coverage
>   overturn-check** (is the graded class simply better-covered in a way that
>   itself predicts the move). Runnable now, no capture. Full record in the doc.
> - **Q1 ACTIVE** (inherited, not re-touched this session): first half amended,
>   catalyst relationship DETECTED at +17.9pp; second half waits on **tier A**,
>   specced and unbuilt, and tier A also blocks Q3. **Tier A is NOT urgent** —
>   daily bars are re-fetchable; building it early buys deferred work, not data.
> - **Q12 QUEUED, not blocked** — decides whether the 45.5% yield finding is a
>   defect or a description. **His to open. Do not start it unprompted.**
> - **Q2, Q3, Q8, Q9 parked**, each with its unblock condition stated; **Q8 has
>   no open items and is designable now.** Check the condition still holds first.
> - **Q4, Q5, Q6, Q10, Q11, Q13 closed.** Q13 on an underpowered null, not
>   absence.
>
> **THE ARCHIVE WINDOW IS NO LONGER THE BINDING CONSTRAINT — the backfill ran
> 2026-09-23.** Archive now holds **1,999 outcome rows over 26 sessions**
> (08-17…09-22), up from 939 / 13; critical `|r|` dropped from 0.553 toward
> ~0.39. Source is `data/assessments-prod-2026-09-23.db` (474 assessments, his
> by-name exception to Ops). **DO NOT re-run the extract without his by-name word
> — it is a fresh named exception EVERY time** (a spent one-time grant reads as
> standing permission; see the correction banner on the register's standing item,
> and `[[spent-exception-reads-as-standing-permission]]`). The rollup is
> `npm run archive:backfill -- --market-db <extract>` and is yours; it skips
> already-held rows and writes only `data/archive.db`.
>
> **THE CAPTURE-FOR-ANALYSIS SPEC IS CLOSED (`docs/DATA-ARCHIVE.md`), on his
> rulings:**
> - **Wire text = free EX-99 path ONLY. No licence, no wire-body scrape** — not
>   now, not as a fallback. A later seat must not reopen it. The text mostly
>   already exists public-domain (669 EX-99 press releases with excerpts); the
>   real question is **latency**, measured by a forward-accruing instrument on
>   EDGAR `acceptanceDateTime`. Precondition met (`b1d64b9`+`ea2d1c9` both live),
>   accruing since ~09-22; the first read needs a read-only `research_sources`
>   copy-down that is **pre-approved** (`8f331ed`) — Ops runs it on accrual,
>   ~late Sep, no return to him.
> - **Grade the grader = Q14. No capture** — grades are kept forever, outcomes
>   already in `symbol_outcomes`.
>
> **HABITS THAT EACH COST SOMETHING HERE:**
>
> 1. **Check hardest when you agree.** Q14's first result (13/13 sessions, a
>    slam-dunk) *agreed with Pillar 4* and I nearly shipped it — it was
>    **look-ahead**: it used the strongest grade seen per ticker-day, and ~45% of
>    the positives earned that grade *after* the move. The overturn-check I owed
>    myself is the only thing that caught it. **A field reassessed through the day
>    carries future information; use the value AT the decision moment.**
> 2. **A spent exception reads as standing permission — and a superseded grant
>    reads like a live one.** Verify the authorizing artifact is the CURRENT one,
>    both directions; never rest one request on two authorities; **a requester
>    does not relay its own approval** (`[[spent-exception-reads-as-standing-permission]]`).
> 3. **A count across stores proves nothing without a content digest** — ids are
>    per-store sequence positions, not identities.
> 4. **Carrying the words and yielding a number are different counts**, and **a
>    rate whose denominator spans a boundary is not a rate.** Recognising the
>    shape in a peer's number is not the same skill as noticing it in your own.
> 5. **Peer confirmation is not a second source.** A relayed "it's covered" that
>    can only be sourced back to your own message is your message with a second
>    name on it. Open the artifact.
>
> **Corrections in this register stand beside what they replaced rather than
> overwriting it.** Keep that — the reasoning connecting a wrong number to its
> replacement is usually what is worth reading.
>
> **Reporting format:** end with a `🟠 NEEDS YOU` block of self-contained
> decisions, or omit it entirely. Never a vague "what still needs you".

---

## First task for the new seat

**DONE 2026-09-25 — do not re-take this.** The coverage overturn-check ran and
does not overturn part (a); a second check nobody had registered (was the grade
even available before 09:30 ET? 37% of rows were not) also does not overturn it
and roughly doubles the effect on the clean subset. **Part (b) is BLOCKED, and
the claim below that 26 sessions fixed its power was WRONG — STRONG is still n=8
at first entry**, because STRONG is a 1%-of-ticker-days label assigned late, and
`catalyst.confidence` is not in the assessments extract at all. See
`docs/rnd/2026-09-22-grade-the-grader.md`. *Superseded text kept:* ~~part (b) —
grade-confidence and the STRONG/LEGITIMATE_POSITIVE split, now that 26 sessions
give more than the n=8 STRONG had.~~ Pre-register each cut before running it.
If he opens Q12 or tier A instead, those take priority.
**The archive backfill is DONE — do not re-ask it**, and do not re-run the extract
without his by-name word.

## Live handoffs — inherited 2026-09-21, NOT re-verified this session

**These predate this seat and may have moved on 09-24 (a heavy Web/auth build day
this seat lost from context). Check status before acting.**

- **Supply bound → Research.** Whether a filings-proved ratio `>=1.0` should reach
  the verdict. Research was building against the **post-escalation** pair; this
  seat's earlier escalation reading was wrong on 4 of 7 and retracted (`cfdf07e`).
- **Parse census → Research.** Nine numeric Sheet fields at risk; `parseNumber`
  is the only anchored parser, so the at-risk set is derivable from code with no
  sampling. `floatQualityState` classifying 51% is a separate vocabulary defect,
  deliberately not bundled.
- **Two group-bys, both Ops's:** versions-per-name split by ever-carrying-
  provenance, and how the 20 both-cohort versions split on provenance. The first
  could move the 3.8x concentration.
