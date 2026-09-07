# Monetization — the gates, in the order they can kill the plan

Written by Integration 2026-09-07. **This is a decision map, not a roadmap.**
Every gate below can invalidate the ones after it, so they are ordered by what
they would waste rather than by effort.

---

## GATE 0 — CAN WE REDISTRIBUTE THE DATA AT ALL?

**The desk runs on Alpaca SIP.** Market-data agreements distinguish *internal
use* from *redistribution or display to third parties*, and the second normally
requires a vendor agreement, per-subscriber reporting to the exchanges, and
per-user fees that are not small.

**This is a commercial and legal question, not an engineering one, and nothing
below matters until it is answered.**

Three shapes it could force, all viable:

| shape | what the customer sees | licensing exposure |
| --- | --- | --- |
| **Full desk** | live prices, board, everything | highest — full redistribution |
| **Analysis only** | catalysts, float, structure, verdicts — **no prices, no quotes** | much lower; derived facts about filings are ours |
| **Bring your own feed** | customer supplies credentials | lowest; we sell software, not data |

**The middle one is the interesting case**, because the differentiator is not the
price feed — **it is the explanation.** *"We can explain why a float is dirty,
with the numbers, instead of putting N/A"* is a statement about filings, not
about ticks.

---

## GATE 1 — WHAT IS THE UNIT SOLD?

Not answerable by engineering. **Everything downstream depends on it:**

- **The board** — a live surface. Highest licensing exposure, highest reliability
  bar, hardest to support.
- **The Why Not Report** — per-name, delivered. Lower exposure. Already the
  desk's stated purpose.
- **A daily brief** — one artefact, once a day. Lowest exposure, lowest cost,
  and it is the closest thing to what the 22:00 task already produces.

---

## GATE 2 — ONE-TO-MANY OR ONE-TO-ONE?

**The single most important cost fact on this desk:** if every customer sees the
**same** board, research is a **shared** cost — one interpretation serves N
subscribers and the marginal cost per customer is near zero.

If it is personalised — their watchlist, their names — **research becomes a
per-user cost at roughly 13k tokens per interpretation and 24–40 names a
session**, and the economics are completely different.

**Decide this before any tenancy work**, because it determines whether tenancy is
about *access* or about *isolation*.

---

## GATE 3 — THE RELIABILITY BAR

A single trader tolerates a defect because he can see round it. **A paying
subscriber cannot.**

This weekend alone found: a weekly mass deletion of the minute grain, a latch
destroyed in exactly the population it served, a shipped price line that never
rendered, a taxonomy built and unwired, and a treatment flag never once set.

**None of those was found by a test. All were found by looking.** The sweep that
found the last two is one query and did not exist on Friday.

**The defect rate is the product risk**, and the honest statement is that the
desk has never been operated to a standard where an outsider depended on it.

---

## WHAT IS ALREADY ON THE PATH

- **Sheet retirement.** A product cannot ship depending on a Google Sheet
  maintained by hand. His own words: *"not a production grade setup."* And the
  parse census says the Sheet delivers **less** than assumed — nine fields at
  risk by their grammar, three reaching the desk as nothing.
- **The float bound.** Pillar 5, and the thing vendors print `N/A` for.
- **The Why Not Report.** Type and coverage built; renderer held.
- **The catalyst taxonomy.** Built, unwired.

## WHAT IS NOT, AND HAS NO OWNER

- **Auth.** Currently none worth the name. **His decision by standing rule.**
- **Tenancy.** Nothing is keyed by user. Everything is keyed by trading date.
- **Billing, onboarding, support, terms.**
- **A commercial seat.** No thread owns any of the above.

### GATE 2 — ANSWERED 2026-09-07: SAME BOARD

> *"same board to start. we're serving this same market for now."*

**What it settles, and it is the good news:**

- **Research is a SHARED cost.** ~13k tokens a name across 24–40 names a session
  is a **fixed daily figure regardless of subscriber count.** The intelligence
  layer does not scale with users.
- **Tenancy is ACCESS, not isolation.** No per-user partitioning, no per-user
  universe, no per-user store. **The architecture already is this** — one store,
  one universe, one board, everything keyed by trading date.
- **The market is defined rather than assumed:** $1–$20 small-cap momentum,
  07:00–10:00 ET. The audience is **people who trade the way he does.**

**What it does NOT settle, and two of these get worse:**

- **Gate 0 is unchanged and arguably harder.** One board displayed to N users is
  **textbook redistribution.** "Same board" is the shape a licence cares most
  about.
- **The reliability bar rises.** Everyone sees the same defect at the same
  instant. A dark price line is one trader's annoyance or **N simultaneous
  support tickets.**
- **"To start" is deferral, not never.** Watchlists, dismissals and per-user
  state arrive the moment there are users, and **the first one is the expensive
  one**, because nothing today is keyed by user.

### And one consequence that is now a product question

**If everyone sees the same board, the board's width IS the product's width.**

The reach finding — research queued on rank ≤ 12, and he trades ahead of the
ranking — **stops being a fact about one trader and becomes a fact about what
subscribers would be paying for.**
