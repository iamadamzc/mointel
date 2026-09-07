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

### GATE 0 — MAPPED 2026-09-07: THE LINE IS THE FIRST EXTERNAL VIEWER

*Commercial, from public documentation only. Full working, every quotation and
every source:
[commercial/2026-09-07-feed-licence-landscape.md](commercial/2026-09-07-feed-licence-landscape.md).
Mapped, not answered — no agreement, no approach, no recommendation to sign.*

**What the published material settles:**

- **The redistribution event is the first person other than the subscriber who
  sees the output.** Alpaca's terms, Massive's, Databento's, the CTA and UTP
  schedules and the two exchange agreements Alpaca's paid plan incorporates all
  draw that line, and **none of them turns on payment or on user count.** So a
  private beta is exposure, not preparation, on every definition read. The only
  published construct for a non-paying outside viewer (UTP's trial policy) still
  requires the subscriber agreement.
- **Alpaca is the published answer for the build and for bring-your-own-feed,
  and is not a published answer for any shape in which one subscription's data
  reaches another person.** Its redistribution statement is one sentence:
  *"Unfortunately, you cannot redistribute Alpaca API data."* Its only
  multi-user product is a brokerage partnership at sales pricing. Its OAuth
  `data` scope and Connect programme are the one documented way a third-party
  app shows a user their own feed.
- **Two vendors publish a self-serve path to real-time display rights:**
  Massive at $2,499 + $1,999 a month plus unpublished exchange fees (SIP), and
  Databento at $1,500 a month plus pass-through fees on an annual contract
  (direct feeds and a derived composite, not the SIP). **Both are a rebuild of
  the market worker.** Everything else with a published price is a partial or
  derived feed, or a brokerage.
- **The exchange layer is the bill for the full desk, not the vendor.** $1 per
  non-professional viewer per network today ($0.90 from April 2027), plus a
  vendor agreement, an approved system description, monthly reporting and a
  firm-level floor of roughly $4,000–$6,000 a month in redistribution and
  access fees. The one vendor-published all-in figure for real-time SIP is
  *"$10,000–$20,000 per month."*
- **The middle shape is confirmed as the interesting case, with a boundary.**
  The Why Not Report contains no tape. Under UTP's published derived-data test,
  RVOL and rank are in the not-fee-liable class; price, move % and VWAP are
  not. So a board that withholds its four price-bearing columns is a different
  licensing object under the exchange schedules — **but not under an individual
  subscription**, which forbids display to others of anything. The carve-out
  is a fee fact exercised through a vendor agreement.
- **Delayed data (15 min) carries no display-unit fees on either plan** and the
  daily brief is already that shape; a premarket board 15 minutes late is not.
- **Which price, if not the tape — mapped 2026-09-07 after Gate 1 closed:**
  [commercial/2026-09-07-which-price.md](commercial/2026-09-07-which-price.md).
  The board's flat verdict and NEW HIGH override are both defined by the live
  bid-ask spread and go neutral without one. Of the derived real-time prices,
  only Databento's Mini carries a real bid and ask (an aggregate over venues it
  does not name); Massive's FMV is a single number with no spread; Intrinio's is
  a predicted bid and ask with no published method; Tiingo's is a last-or-mid
  with the real quote behind an IEX agreement. A real quote from a subset of
  venues has a spread at least as wide as the NBBO, so those products bias the
  flat verdict one way, by an amount measurable only with a feed in hand.
- **Which tiers carry consolidated volume — mapped 2026-09-07 after
  bring-your-own-feed was ruled out:**
  [commercial/2026-09-07-volume-basis.md](commercial/2026-09-07-volume-basis.md).
  RVOL is cumulative consolidated session volume over a consolidated
  twenty-session average, and both halves are consolidated on Alpaca today.
  Tiingo's display tier is IEX-only intraday by its own field description and
  cannot run it. Intrinio Startup's volume basis is stated nowhere. Massive
  Business carries consolidated real-time aggregates by its own knowledge base.
  Databento's Mini is a venue subset, but its consolidated-volume Summary
  dataset is *"included with any Databento US Equities subscription"* — and
  Databento's own pages disagree on whether that volume is delayed, with no
  interval published anywhere. **So the verified floor for real-time RVOL as
  defined is Massive Business at $2,499/mo with no bid and ask; Databento Plus
  at $1,500/mo carries both a real bid and ask and consolidated volume of
  unstated delay. Neither published option gives today's board: one buys a
  lateness defect in the ranking, the other buys two dead spread features.**
  The cheapest published completion of Massive with a live spread is its $499
  IEX expansion, a one-venue book. No vendor with a published price packages
  both below the real tape; the one exchange product that carries both is
  Nasdaq Basic with NLS Plus, at $1 per non-pro viewer.
- **The CT Plan replaces CTA and UTP on 2027-04-01** — new per-viewer rates, a
  use-based professional test, and derived-data *creation* becoming fee-liable.
  Account migration started this month. **Any agreement signed before March
  2027 is signed under a schedule about to be replaced.**

**What it does not settle, and who does:**

- **Whether the first outsider sees prices, derived facts only, or their own
  feed.** That is Gate 1 wearing a licence, and it is a product decision:
  Integration, then the trader.
- **Whether a build intended for sale is still "personal and non-commercial
  purposes" before anyone else sees it.** No page reads "purpose" that way in
  either direction. It is his call, his strategy already makes it, and §1 of
  the landscape states it plainly rather than re-opening it.
- ~~**Which Alpaca plan the account is on.** Not in the repo; inferred from the
  feed setting.~~ **ANSWERED 2026-09-07, his word: Algo Trader Plus.**

### GATE 0 — MAPPED 2026-09-07 BY COMMERCIAL. THREE FACTS THAT DECIDE THE SHAPE.

**1. ALPACA PUBLISHES NO REDISTRIBUTION PATH.** Not expensive — **absent.** Its
only multi-user product is a brokerage partnership; its OAuth data scope is the
bring-your-own-feed shape. **So the current vendor cannot become the commercial
answer at any price**, and "build now, comply on traction" implies **a vendor
migration at the moment of compliance.**

**2. THE EXCHANGE LAYER IS THE BILL, NOT THE VENDOR** — and it is avoidable.
Intrinio publishes real-time SIP exchange fees at **$10,000–$20,000/mo.** But
**Massive's Stocks Business at $2,499/mo states "No Exchange Fees or Approvals"**
on a proprietary derived price, and **Databento's Mini "carries no exchange
licence fees for personal or commercial use."**

**An order of magnitude sits between the real tape and a derived real-time
price.**

**3. THE BOARD SPLITS CLEANLY ALONG THAT LINE.** Under UTP, **RVOL, rank and
volume-derived fields are not fee-liable. Price, VWAP and the trades/quotes
stream are.** Float, catalyst, structure and the Why Not verdicts are **filings
and research — ours outright.**

**So most of the desk is already on the cheap side of the line.**

### THE ENGINEERING CONSEQUENCE, AVAILABLE NOW AND COSTING NOTHING

Both published routes with display rights — **Massive and Databento — are a
rebuild of `lib/market/alpaca/`.** One layer, bounded.

**Nobody needs to switch vendors today. But every line written from here that
assumes Alpaca raises the price of compliance later**, and the migration is the
one certain item in the plan.

**The cheapest thing that can be done before there are any users is to stop
widening the integration surface.**

### And a dated regime change

**The CT Plan replaces CTA and UTP on 2027-04-01.** Any agreement signed now
lands inside a changing regime — **an argument for his own stance rather than
against it.**
