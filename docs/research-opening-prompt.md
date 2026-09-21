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

The cycle apparatus was the whole of the last session's work and three defects in
it are fixed and on `main`: today's session is now visible to the cycle rule
(`e48a2ca`), a run no longer stays alive forever because one busy day in three
broke a consecutive-sessions test (`1fba8fd`), and a run also ends when its
typical day trades under $50,000 (`baece00`, his threshold). The interpreter
prompt no longer tells the model a human reviewed the Sheet's prior analysis
(`dbd70d1`), which no human has ever written. Suite was 2,183 across 145 files.

### First task

**Everything open waits on him, so start by reading his answers rather than
building.** Two things are with him: **how a restart should rebuild
`sessionHigh`** (the premarket hole — 1,481 of 7,936 rows on 2026-09-18, options
named in LIVE STATE, nothing built) and **whether the cycle frame includes
premarket** (he ruled after-hours in; the morning half was measured, put to him,
and not answered).

**If he has answered neither, the unblocked work is Phase C — the
filing-derived float.** `assessFloat` (`lib/research/float.ts:326`) is already
the containment test: it returns `IMPOSSIBLE` when a claimed float exceeds a
current filed count. The derived half needs no permission. **The vendor half is
prohibited — read the standing constraints before touching it.**

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-21)`** so the name no
   longer collides and peer messages route to the new session.
4. **Archive the old chat, do not delete it** — the transcript is the record.
5. The seats that talk to this one (Integration, Ops, Design) can find the new
   session by title; no id needs passing by hand.
