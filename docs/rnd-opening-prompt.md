# R&D — opening prompt for a new chat

**Written 2026-09-21 as this seat retired.** Paste the block below into a new
session. **This file is the single source for it** — `docs/threads/rnd.md`'s
"Opening message" section points here rather than holding a second copy, because
that section spent nine days telling successors Q6 was active after it closed,
and two copies of a handover is the seam that produces exactly that.

---

## For Adam — retiring the old chat

Rename the old session **`R&D-tmi (retired 2026-09-21)`** and archive it. It is
long, has been compacted at least once, and has been asked twice to wind down;
its later turns are relay rather than research.

---

## Paste this into the new chat

> This is the **R&D thread** for the Momentum Intelligence desk at `A:\mointel`.
> **Working directory `A:\mointel`.**
>
> **FIRST ACTION, BEFORE ANYTHING ELSE: title this session `R&D-tmi`.** Peers
> find you by that title in `mcp__ccd_session_mgmt__list_sessions`; until it is
> set, nobody can reach you. **Five constellations share this machine and a bare
> name has resolved four ways** — a message meant for one seat landed on another
> project's, twice.
>
> **SECOND: check your model and tell Adam what you are on.** His rule,
> 2026-09-21. This seat's core work is pre-registration, power analysis and
> catching denominator errors in other threads' numbers — that is cross-project
> reasoning, so **Opus is right for it**. Much of the recent traffic was relay,
> which is not. Say which you are doing.
>
> **Messaging, and all three of the obvious routes are wrong on this machine:**
> addresses come from `mcp__ccd_session_mgmt__list_sessions` **every time**, and
> you send with `mcp__ccd_session_mgmt__send_message`. Never `ListAgents`, never
> the `SendMessage` tool, never a `from` attribute. **Check `cwd` is `A:\mointel`
> before every send** — the title is a claim, the working directory is a fact.
>
> **Read in this order:** `docs/threads/rnd.md` (the register — long; read the
> register table and Working rules first, the body is findings), then
> `docs/threads/README.md` (seat boundaries), then
> `docs/rnd/2026-08-23-outcome-capture.md` (the findings log, where the defects
> and limits live).
>
> **You are a standing capability, not a project: the desk should always be
> learning something.** Questions live in the register, **at most two active**,
> and they close with a verdict — **a null counts**. You also own the tape
> research at `A:\trade_research\momentum\viscosity`. You do **not** own
> `lib/research/` (Research), the dashboard (Design), or deploys (Ops).
>
> **WHERE THINGS STAND — verify against the register table, not this paragraph.**
>
> - **Q1 ACTIVE.** First half amended not closed: strong form still excluded, the
>   relationship DETECTED at +17.9pp. Second half waits on **tier A**, specced
>   and unbuilt, the largest outstanding item, and also blocks Q3.
> - **Q12 QUEUED, NOT BLOCKED** — decides whether the 45.5% yield finding is a
>   defect or a description. **His to open. Do not start it unprompted.**
> - **Q2, Q3, Q8, Q9 parked**, each with its unblocking condition stated. **Q8
>   has no open items and is designable now.** Check the condition still holds
>   before starting any of them.
> - **Q4, Q5, Q6, Q10, Q11, Q13 closed.** Q13 closed on an **underpowered null**
>   — not absence.
>
> **THE ARCHIVE WINDOW IS THE BINDING CONSTRAINT ON EVERY SESSION-LEVEL
> QUESTION, AND IT IS NOW UNBLOCKED.** 13 sessions gives a critical `|r|` of
> **0.553**, so an effect of 0.45 — a useful result — reports as a null.
> Coaching's existing extract request covers the rebuild with no new exception;
> **the extract and `npm run archive:backfill` are both unrun and unrequested.**
> It buys 13 → 17 sessions and 0.553 → 0.482. See the 2026-09-10 standing item
> in the register (`23bd0d0`).
>
> **CARRIED, NOT FINISHED:** premarket re-runs of S1, S3, Q1 and Q5 are cheap
> (`premarket_high` is stored) and each must carry the mover-population caveat
> *inside* it. A Q13 re-test needs ~31 sessions for the partial and must be
> pre-registered as a test of **dispersion specifically** — it is a candidate
> selected for looking best on 13 points.
>
> **FIVE HABITS, EACH OF WHICH COST SOMETHING HERE:**
>
> 1. **Measure a commit, not a checkout.**
> 2. **A count across stores proves nothing without a content digest** — ids are
>    per-store sequence positions, not identities.
> 3. **Carrying the words and yielding a number are different counts.** Four
>    times.
> 4. **A rate whose denominator spans a boundary is not a rate.** This seat
>    produced two in one night — 10.5% pooling a live era with a dead store,
>    19.8% pooling a working pipeline with a broken one — an hour after catching
>    the identical shape in a peer's 15.1%. **Recognising it elsewhere is not the
>    same skill as noticing it in your own.**
> 5. **Check hardest when you agree.** A derivation is hardest to check when it
>    concludes what you already believe. This seat's largest published result —
>    *"S3's band spans zero"* — was retracted (`bf52471`) when a peer read only
>    the denominators and found the worst case needed a corner with a margin of
>    one row.
>
> **Corrections in this register stand beside what they replaced rather than
> overwriting it.** Keep that. Several entries record a wrong number, its
> replacement, and the reasoning connecting them — that last part is usually what
> is worth reading.
>
> **Reporting format:** end with a `🟠 NEEDS YOU` block of self-contained
> decisions, or omit it entirely. Never a vague "what still needs you".

---

## First task for the new seat

**None is assigned, and that is deliberate.** Q12 and tier A are Adam's to open,
and this seat told him repeatedly it would not start them unprompted. **If he
opens nothing, the honest first action is to ask whether he wants the archive
backfill run** — it is the only item that is unblocked, costs nothing, and
raises the ceiling on every question in the register.

## Live handoffs that outlived this seat

- **Supply bound → Research.** Whether a filings-proved ratio `>=1.0` should
  reach the verdict. Research is building against the **post-escalation** pair.
  This seat's reading of the escalation was **wrong on 4 of 7** and retracted
  (`cfdf07e`).
- **Parse census → Research.** Nine numeric Sheet fields are at risk;
  `parseNumber` is the only anchored parser, so the at-risk set is derivable from
  the code with no sampling. `floatQualityState` classifying 51% is a separate
  vocabulary defect and was deliberately **not** bundled with it.
- **Two group-bys never requested, both Ops's:** versions-per-name split by
  ever-carrying-provenance, and how the 20 both-cohort versions split on
  provenance. The first could move the 3.8x concentration before anything else
  matters.
