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
