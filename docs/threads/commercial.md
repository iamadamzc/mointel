# Commercial — charter

**Created 2026-09-07 by Integration, at the trader's direction.** The sixth seat.
Nothing here overrides `docs/threads/README.md`; that file is the shared rules and
this one is the scope.

---

## WHAT THIS SEAT OWNS

- **Data licensing.** What the desk's feed permits, what redistribution requires,
  and what it costs. **The gate that can invalidate everything else.**
- **Vendor landscape.** Not "who is cheapest" — **who offers a path from personal
  to commercial without a rebuild.**
- **Pricing, packaging, terms, and the commercial half of `docs/monetization-gates.md`.**
- **The unlicensed-build plan.** The trader's stance, recorded verbatim so it is
  not softened by anyone later:

  > *"i'd also like to plan to deploy without commercial license, but plan for
  > it. i dont want to enter into any agreements with no user base. so we build it
  > on the personal license and if we get traction then we pursue the commercial
  > compliance."*

## WHAT THIS SEAT DOES NOT DO

- **No code, no deploys, no product decisions.** Same rule as Integration.
- **It never enters an agreement, signs up, accepts terms, or supplies payment or
  identity details to anyone.** Not a trial, not a free tier, not a "just to see
  the pricing page" registration. **Those are the trader's, always, and the seat
  brings him the decision rather than the outcome.**
- **It does not contact vendors.** Public documentation, published rate cards,
  published agreements. **An enquiry is an approach and an approach is his.**

## THE DISTINCTION THIS SEAT EXISTS TO HOLD

**Building on a personal licence and launching on one are different acts.**
Development against personal-use data is ordinary. **The moment an external user
sees the output, that is the redistribution event** — not the moment money
changes hands, and not the moment a contract is signed.

**So "build now, comply on traction" is coherent for the BUILD and needs a named
line for the LAUNCH.** The seat's first job is to establish where that line
actually falls, because it determines whether a private beta is preparation or
exposure.

**State this plainly to the trader when it is load-bearing and then get on with
the work. It is his call and he has made the strategy clear.**

## STANDING RULES INHERITED

- Addresses from `list_sessions` every time. Never from a `from` attribute.
- **§5c: facts go direct to the thread that needs them. Decisions route through
  Integration**, which is the only seat that can see what is already in front of
  him.
- **Findings carry a sha. Reads and objections do not.**
- Report on completion or on blocking. **Going idle is a milestone.**
- No figures from his fills, no P&L, in the repository.

## FIRST TASK — DELIVERED 2026-09-07, see LIVE STATE below

**The feed-licence landscape, from public documentation only.** For each credible
vendor: what personal use permits, what redistribution requires, whether the
integration changes between the two, and what the published commercial terms
are. **Alpaca included and not assumed** — *"maybe alpaca isn't the answer"* is
his, and it is an open question rather than a lean.

**Deliver the shape of the decision, not a recommendation to sign anything.**

---

## LIVE STATE — as of 2026-09-28T15:35Z

**If anything above disagrees with this section, this section is right and the
section above is stale.** This is a snapshot of now, not a diary; the diary is
in the archive at the foot of this file.

**This seat's tenure, 2026-09-25 to 2026-09-28.** Onboarded from
`docs/commercial-opening-prompt.md`, the prior tenure's hand-off (that prompt
is now stale and superseded by this one). **A genuinely heavy tenure, by
volume and by density of cross-session coordination** — ten dated documents
delivered or corrected, a five-stage day-boundary correction chain resolved by
his own direct final ruling, and a full four-seat design (this seat, Ops,
Design, Web) assembled, corrected twice, and closed. Retiring now on the
owner's own word, confirming this seat's judgement that it had reached
saturation — session-hygiene rule
(`A:\claude-infra-agent\docs\session-hygiene.md`). Hand-off prompt for the
successor: [`docs/commercial-opening-prompt.md`](../commercial-opening-prompt.md)
(overwritten with this tenure's hand-off; the prior one is in git history).

**What this tenure actually got wrong, named as mechanisms because a
successor who knows the shape catches it faster than one who doesn't:**

- **Endorsed a peer's recommendation without checking its premise twice** —
  twice. Once on the day-pass boundary (endorsed Web's "define by the clock"
  recommendation without registering that his own later ruling overruled it),
  and once on the newswire case (asserted "Warrior Trading is built on
  TradingView, therefore closed" from TradingView's own pages alone, without
  ever checking Warrior Trading's own published statement about its Scanner
  specifically — Integration caught both). **The shape both times: citing
  where a peer's or my own earlier claim CAME FROM is not the same as
  verifying what it actually ESTABLISHES.**
- **Stated an unmeasured number as a specific measurement, twice, in the same
  document** (the newswire coverage landscape): a 44-second desk-internal gap
  described as a distance from "Ops's query window" that was never involved,
  and a Benzinga-vs-wire latency claimed with no source anywhere establishing
  it — `research.md` itself says explicitly that latency was never measured.
  **Both were caught on a second, later re-read, not the first — a real gap
  between when a number reads clean and when it's actually checked against
  its cited source line-by-line.**
- **Wrote a ranking table cell that said more than the prose above it
  supported**, crediting a marketing claim ("1,000+ sources") as if it were
  closer to confirmed than it was. **The generalisable lesson across all of
  these: a document's summary artefacts — a headline, a table cell, a
  register line — decay independently of the prose that was actually
  corrected, and need their own explicit pass, every time, not an assumption
  that fixing the prose fixed everything reading from it.**

**None of these reached him wrong.** Integration's review caught all of them
before anything was sent, in every case. That is the process working as
designed, not a near-miss — but the density of catches in this tenure,
against a session running for days with heavy cross-thread traffic, is itself
the signal that closed this tenure rather than a single incident.

### Error ledger — this tenure (from 2026-09-28T15:41Z), per session-hygiene §2

| # | error (asserted → true) | type | already logged this session? | caught by |
| --- | --- | --- | --- | --- |
| 1 | Told Integration `monetization-gates.md:226` ("after Gate 1 closed", 09-07) contradicted the 09-27 day pass → it didn't; Gate 1 was ruled 09-07 (*"the unit sold is everything together"*), in `which-price.md:4`. Also wrote "answered 2026-09-27" into this charter's own open-items row (`15b609b`) on the same premise | **source-not-opened** (the prompt's mechanism 1: where a claim is discussed ≠ what establishes it) | no — first in this tenure; the class was the prior tenure's | peer (Integration) |
| 2 | Told Research "not grounds to reopen" his "no to both" ruling on the Benzinga enquiry, after a fact under that ruling changed → whether a changed premise reopens a ruling is his judgement, not this seat's; Research put it to him as a fresh question and was right to | **overstated authority** (stating a verdict on a question that is his to answer, not this seat's to pre-empt) | no — first instance | peer (Research) |
| 3 | Ruled a colon as the em-dash replacement in the registered statement, reading the clause in isolation → the sentence it sits in already has a colon ("not a signal service: it takes..."), so a second one collides; corrected to a full stop, Web's own first-ranked option | **excerpt-not-context** (checked the change against what the statement is relied on for, not against the sentence's own existing punctuation) | no — first instance | peer (Web) |
| 4 | Told Integration and him that direct-from-FINRA was closed two ways (non-commercial, and a software/AI bar), 2026-10-02 → those clauses are the FINRA WEBSITE's terms; the Query API is a separate contract (API Terms of Service 03/2026 plus Specific Terms for Equity Data) with no AI bar and an explicit derived-data redistribution right | **source-scope mismatch** (read a real clause correctly and applied it to a different instrument than the one the question reached; my own doc even said the API terms were 'not located' and I still concluded closed) | no, first instance (adjacent to the 09-29 class: the clause was right, the scope was not) | him, by asking a question my answer had not covered |
| 5 | Raised an exchange-fee exposure on a derived FINRA label (2026-10-02) from Nasdaq's and Cboe's price lists → the Equity Data Specific Terms I had already read say 'Third Party Terms: Not applicable'; the schedules price the exchanges' own reports, and no source showed an exchange claim over FINRA-published data | **read a clause and did not apply it** (a risk inferred from an adjacent price list while the governing text, already open, answered it) | no, first instance (adjacent to entry 4: scope, then inference) | him, who read the same terms and saw it |
| 6 | Told Research and Marketing the size grade 'can only understate, never overstate' (session-reports §13 R1, 2026-10-02) → true against float, true against the current share count only while the count is current and unissued; relaxing the gate to 120 days removes the precondition (stale count plus issuance overstates 'or more' claims) | **a guarantee stated without its precondition** (the floor was real; the condition that made it a floor was a gate someone could relax) | no, first instance (adjacent to entries 4 and 5: a true property applied past its scope) | peer (Integration 23rd, by asking whether RECONCILED was acceptable) |
| 7 | Ran `git fetch -q && git pull -q --no-edit 2>&1\|tail -1` in the shared tree, 2026-10-03: the pull conflicted on two of Research's files and `tail -1` showed only the last line, so the shared tree sat mid-merge blocking every seat's commits until Integration aborted it | **a check that returned a plausible answer** (the output looked like a routine sync; the one line that mattered was not the last) and **an action outside the seat's lane** (the shared tree's local main is Integration's to sync; this seat reads origin with `git show origin/main:<path>` and pushes only from a temp worktree off origin/main) | no, first instance of this class; the pull-in-shared-tree rule was already in memory | peer (Integration 24th, who aborted the merge) |

### What this seat has delivered — dated documents, unchanged since landing

| document | what it settles | date |
| --- | --- | --- |
| [`commercial/2026-09-07-feed-licence-landscape.md`](../commercial/2026-09-07-feed-licence-landscape.md) | the licence line, vendor table, exchange layer, four product shapes, the exposure as the instruments describe it (§1b), how they would know (§1c), the 30-day notice (§1b) | 2026-09-07/08 |
| [`commercial/2026-09-07-which-price.md`](../commercial/2026-09-07-which-price.md) | which derived prices carry a real bid and ask (only Databento Mini) | 2026-09-07 |
| [`commercial/2026-09-07-volume-basis.md`](../commercial/2026-09-07-volume-basis.md) | which display tiers carry consolidated volume; the two floors and the defect each buys | 2026-09-07 |
| [`commercial/2026-09-07-model-rate-card.md`](../commercial/2026-09-07-model-rate-card.md) | OpenAI Standard rates for sol / terra / luna, per-row dates and expiry (sol promotional through 2026-11-21) | 2026-09-08 |
| [`commercial/2026-09-08-product-name.md`](../commercial/2026-09-08-product-name.md) | the name, the tagline, every claims ruling (§2e–§2g), the competitor-naming ruling, the session-report scoping | 2026-09-08 → 09-17 |
| [`commercial/2026-09-10-auth-providers.md`](../commercial/2026-09-10-auth-providers.md) | Google OAuth consent (contradiction reported), Apple phase two (needs an App Store app) | 2026-09-10 |
| [`commercial/2026-09-11-competitor-trademomentum.md`](../commercial/2026-09-11-competitor-trademomentum.md) | the "free watchlist ending" that did not end; a $147/mo signal product | 2026-09-11 |
| [`commercial/2026-09-25-newswire-licence-landscape.md`](../commercial/2026-09-25-newswire-licence-landscape.md) | four wire services' terms on redistribution (two bar it outright, two publish nothing on point); Alpaca News is bound by the same personal-use clause as the SIP tape, not a looser one; no vendor here publishes a self-serve commercial price | 2026-09-25 |
| [`commercial/2026-09-26-billing-onboarding-support-scope.md`](../commercial/2026-09-26-billing-onboarding-support-scope.md) | billing provider options (Stripe rail vs. Merchant of Record) filtered by Ops's PCI/webhook/no-staging requirements, packaging restated from Gate 2, ~~Gate 1 ("what is sold") named as unruled and load-bearing~~ **[false when written — ruled 2026-09-07; struck in the document 2026-09-28]**, the payment-terms trigger in the adopted `terms.md`, the licence exposure restated (not re-opened), support at `info@andromedagenius.com`; three-part scope complete (Web's flow and Ops's infra half both landed and linked) | 2026-09-26 |
| [`commercial/2026-09-26-india-momentum-traders.md`](../commercial/2026-09-26-india-momentum-traders.md) | India, US small-cap momentum traders: the LRS margin ban (primary RBI text), the FINRA PDT-rule removal (moot given LRS), and two named platforms (Vested, INDmoney) that engineered around the cash-account settlement cap without leverage as of mid-2026 — the practical-access barrier is mostly gone; population sizing for "day traders," "momentum traders" and "US small caps" specifically remains three separate, mostly unevidenceable claims, reported as such rather than merged | 2026-09-26 |
| [`commercial/2026-09-27-price-tiered-pricing-scope.md`](../commercial/2026-09-27-price-tiered-pricing-scope.md) | price-based tiers for higher-dollar names: capture cost is already sunk (the $40 bootstrap ceiling, verified); the real constraint (corrected twice, verified each time) is that a $20-$50 name never qualifies for high-resolution capture at all unless it "crossed" up from inside the $0.25-$20 qualify band — exclusion by construction, not unmeasured crowding, and the fix is a per-range slot allocation inside the existing 250 cap, never widening qualify (already ruled against — README, "widening what qualifies silently evicts the names you widened it for"); three tier shapes sized, none chosen; superseded in part by the day-pass addendum below | 2026-09-27 |
| [`commercial/2026-09-27-day-pass-addendum.md`](../commercial/2026-09-27-day-pass-addendum.md) | Gate 1 answered: his stated plan is a day pass, charged at login, "beginning with the first report to the end of that day's after hours" — maps onto the existing 22:00 roll with two named gaps (the 20:00-22:00 dead zone; a partial-day login paying full price); Stripe's own compliance text requires exactly the terms-of-sale document already flagged as owed; the $0.30 fixed fee compounds per login, arguing for a multi-day pass or a monthly cap; charge-at-login dissolves the failed-renewal case for `revokeEmail` but not its other reasons; no comparable product prices by notional traded, and this desk cannot observe it anyway — "one price for everything" may be the only implementable measure; the public "no sign-ups" sentence needs to move with whichever ships first | 2026-09-27 |
| [`commercial/2026-09-27-day-pass-addendum-2-annual.md`](../commercial/2026-09-27-day-pass-addendum-2-annual.md) | annual shape only, after monthly was refused ("i will not do monthly"): the $0.30 fee stops mattering once a year; **CORRECTED by Integration** — the per-day session boundary already exists (built 2026-09-10, unrelated to billing) so neither shape needs new revoke/cycling; the real asymmetry is daily needing a live payment-processor call inside every day's login path (a new failure mode) where annual needs only a local paid-through-date check; refund/cancellation shape quoted from a real comparable (Seeking Alpha: nonrefundable past a short window); an annual and a daily buyer are indistinguishable to `isUserInvited` today | 2026-09-27 |
| [`commercial/2026-09-28-newswire-coverage-landscape.md`](../commercial/2026-09-28-newswire-coverage-landscape.md) | "this can't happen" — the MEDS/ACCESS Newswire miss. **CORRECTED after Integration's review, before it reached him** — the first draft conflated two claims: TradingView itself is confirmed closed (explicit, broad no-product-building bar, unobtainable at any price), but whether Warrior Trading's SCANNER specifically runs on TradingView news was never checked and is NOT established — Warrior Trading's own disclaimer names no vendor for it; his own question stays open rather than answered on assumption. Added the AIFF/GlobeNewswire control (measured, `benzONLY`, `primary=YES`) as direct evidence the Benzinga bundle already carries some third-party wire content, replacing an inference drawn only from a marketing number. Fixed three coverage figures that had implied an impossible union. ACCESS Newswire: no reader terms, `robots.txt` disallows `/rss`,`/rss2`,`/api`. Newsfile: standard non-commercial-only. Direct Benzinga licence remains the best-supported next question, now grounded in a measurement rather than a claim. **Two more corrections after a second re-read (two unsourced timing claims, both fixed) and it's WHOLE — sent to him directly `416e187`** | 2026-09-28 |
| [`commercial/daily-billing-design/commercial.md`](../commercial/daily-billing-design/commercial.md) | **DAILY BILLING DESIGN — WHOLE AND CLOSED.** This seat's lead section plus Ops's infra ([`2026-09-28-daily-billing-infra.md`](../commercial/2026-09-28-daily-billing-infra.md)), Design's warning (`daily-billing-design/design-seat.md`) and Web's pages (`web/2026-09-27-paid-day-signup-scope.md`), all folded in. The day-boundary question ran five stages before his own direct final ruling closed it (§8, kept in full — it is a genuine correction history, not just a record): **the paid day is 20:00 ET to 20:00 ET, "end of ah to end of ah,"** matching `sessionExpiry` exactly, no boundary code change; the ~20:30 report is the day's first content, not its start; a paid day opening with the previous session's report is confirmed intentional in his own words, not a shortfall. Every other open item is RULED (§9): no charge on non-trading days, a lapsed hour ends only that day, retries only on card update, the OS notification ships as Design scoped it, first users are invited and billed by hand with self-serve later, and **daily billing is BUILD APPROVED**, strictly after the sign-in cut-over proves it refuses, with nothing charging anyone until he separately approves the first real run | 2026-09-27/28 |

Gate 0 is mapped and ruled at the top of [`monetization-gates.md`](../monetization-gates.md).
Method for all of them: public pages only, every load-bearing figure re-read by
this seat before it carried a sha, contradictions reported not resolved.

### His rulings this seat holds (verbatim in the documents; one line each here)

- **Name:** **TMI · The Momentum Intelligence Trading Desk** since 2026-09-18 (*"shifting so TMI stands for The Momentum Intelligence and trading desk is part"*, naming doc top; on the site in `app/page.tsx`, `layout.tsx`, the legal pages and sign-in — re-checked 2026-09-28); it superseded ~~TMI Trader · True Move Intelligence~~ · tmitrader.com (registered by Ops 2026-09-08, $16/yr, Route 53) · *"Intelligence on what's moving."* Trademark search waived (*"2, waive."*). **"do not want warrior mentioned"** (2026-09-16) — no competitor named in public copy.
- **Feed licence:** *"accept exposure … my call. the moment we have something moving, i'll sign up."* (2026-09-08). Trigger undefined; no seat invents one. Risk conversation deferred, Integration's to reopen before the page goes live.
- **Alpaca plan:** Algo Trader Plus, his word (2026-09-07).
- **Session report:** *"the report is for monetization, coaching is just for me."* Apple sign-in: *"phase 2."* Google consent screen: he meant OAuth consent verification.
- **Reporting format:** the 🟠 NEEDS YOU block (2026-09-19); nothing after it, omitted when nothing needs him.
- **Billing/onboarding/support, 2026-09-26, one word: *"scope it."*** Answering Integration's report that these have no owner and no build. Scope delivered same day (`2026-09-26-billing-onboarding-support-scope.md`); nothing built, nothing signed, four items waiting on him in its NEEDS YOU block.
- **Gate 1 ("what is sold") — RULED 2026-09-07 12:45Z, verbatim, verified at his own turn 2026-09-28: *"the unit sold is everything together."*** The billing shape on top of it, **2026-09-27, verbatim, verified at his own turn:** *"my plan was a subscriber pays for a days usage of everything. beginning with the first report to the end of that day's after hours is one full day. you log in, you get charged... maybe stock price isn't the correct tier measure. i dont know."* **A day pass — his stated plan for how "everything together" is sold, since built on by the daily-billing rulings below.** Tiers stay open; he explicitly does not know the right measure. Addendum at `2026-09-27-day-pass-addendum.md`.
- **Billing cadence, 2026-09-27, verbatim, verified at his own turn:** *"every single day. i will not do monthly. we can do daily, or annual."* **Monthly is refused, not merely unpicked.** The day-boundary question also produced a distinct operational finding, his own words: *"why is the run at 10pm if the ah closes at 8? the run should be at 805, then the day starts at 830 pm with a fresh report on ah"* — routed to Research (the 20:05 checkpoint), not this seat's to build. Annual-shape follow-up at `2026-09-27-day-pass-addendum-2-annual.md`.
- **Daily-billing shape, 2026-09-27/28, verbatim, verified at his own turn:** *"start with daily. if we have their card on file, let them in immediately, the charge happens in the background... you have 1 hour to fix this or your session is over."* And, on whether a cutoff inside 07:00-10:00 should hold to 10:00: *"1 hour. regardless of time."* **His explicit override of Integration's own recommendation** — the clock runs inside his own trading window, ends a session mid-move if that's where it lands, and he chose that over the alternative offered. Design at `daily-billing-design/commercial.md`.
- **The paid day, final, ~01:20Z 2026-09-28, verbatim, verified at his own turn:** *"days run from 8pm to 8pm... i look at my plan for premarket the night before, so my trading day starts in the evening the day before and ends after hours the next day. end of ah to end of ah."* **20:00 ET to 20:00 ET, no code change** — closes a five-stage boundary question this desk got wrong twice on the way there. **"rest agreed"**: no charge on non-trading days, a lapsed hour ends only that day, retries only on card update, first users invited and billed by hand, **daily billing BUILD APPROVED** after the sign-in cut-over proves it refuses, nothing charges anyone until he separately approves the first run.
- **Newswire source, 2026-09-25, verbatim:** *"yep, build the alpaca. we need to look at the pipeline now. it will change how we do things on the model interpretation."* Build Alpaca News (Benzinga-sourced, already in the account) under the accepted-exposure posture already ruled — no new vendor, no new spend, no new exposure category. Routed to Integration for Research to scope; this seat's licence question on this source is closed. A contracted commercial licence (Benzinga direct, or a primary wire) stays open below, not asked for.
- **What reaches him, 2026-09-25 (`README.md` "His rule: report what changes the product, not how the work went", `60a2f08`):** *"I don't care about how the back end conversations or the mechanics go relative to code or conflicts or Qnumbers... I care about the information that impacts the app relative to my decisions and what we're doing with the product."* **Applied to this seat:** a claims ruling, a licence-posture change, a vendor decision, or anything that changes what the product may say or fetch, reaches him. Which document records a ruling, register housekeeping, session titles, sha provenance and which seat corrected which peer do not — those stay in this charter and the commits. The vendor-float constraint (below) is the model of a ruling that reaches him because it changes what the app may DO; the fact that it lives in `commercial-seat-research-tooling.md` versus `commercial.md` does not.

### Standing rules this seat applies to claims

1. A percentage describing the market's behaviour is a fact of record; one attached to a name, a time and a reader is an outcome. **Outcome claims are prohibited in any form**, loss statements included.
2. No number about a named or inferable third party's data; no unagreed association with a named third party. The mechanism may be described without the vendor.
3. The public page is the evidence surface under accepted exposure: it says intelligence on what's moving and never sells the tape (Web removed LAST / CHG / RVOL / TAPE LIVE, `7d81bae`).
4. A positioning fact he states is not an instruction to publish it.
5. A paid report narrates the float **verdict**, never a float **number** — standing default, ruled by Integration under order-and-process 2026-09-17.
6. The registered plain statement (naming document §2e item 2) is the only description of the product; it rests on the board rendering not-researched as a state (verified by type, Design `ba13d79`).
7. The FINRA short interest label has no price of its own (Equity Data terms 2.3(b), landscape §10.6): part of the subscription, never an add-on, and in every tier equally if tiers ever exist.

### Open items — owner and what each waits on

| item | owner | waits on |
| --- | --- | --- |
| Billing, onboarding, terms of sale and support — scoped 2026-09-26, complete (`2026-09-26-billing-onboarding-support-scope.md`), with Web's flow and Ops's infra both landed and linked | him | that document's NEEDS YOU block, **re-read against later rulings before any of it is put to him again** — items 1 (what is sold — ruled 2026-09-07, day pass 2026-09-27) and 4 (invite-by-hand — ruled 2026-09-28) are answered and struck in place; items 2, 3, 5, 6, 7 not yet re-checked against the later rulings as of 2026-09-28 |
| The vendor decision (Massive Business $2,499 no spread vs Databento Plus $1,500 unstated-delay volume) | him | the undefined "something moving" trigger |
| The pre-launch exposure conversation | Integration | the page going live (`c7ada4f` trigger) |
| Session-report pricing and packaging | this seat | him; the report cannot narrate structure honestly until Phase C (filing-derived float) replaces the Sheet float |
| Marketing's claims as they arrive | this seat | each one; ruled in the naming document §2f |
| A second Alpaca account in his name (for a staging desk) | him | ruled deferred by Integration `1c0c0a6`; unresolvable from public pages; an enquiry is his |
| A contracted newswire licence — **RULED, ANSWERED, drafted, his to send** | him | His original "no to both" (2026-09-28, 23:32:53Z) was made believing Benzinga's source list unpublished; Research corrected that premise 2026-09-29 (`benzinga-licence-cost-2026-09-29.md`, this seat's landscape correction at `16fdbb0`) and put the fresh question to him once, not a re-ask. **He answered "yes draft the email," verified at his own turn 2026-09-29T02:20:59Z** (`55fcf3fe-...jsonl`, `origin.kind: human`), with two conditions on the draft: confirm the AWS free tier is unusable, and confirm a forum/other-source price search was done first. **The draft is in `benzinga-licence-cost-2026-09-29.md` §4, addressed to `licensing@benzinga.com`, his to send — no seat sends it.** **A FIRST QUOTED FIGURE, 2026-09-30, verbatim, verified at his own turn 23:28:15Z:** *"i heard from Benzinga today. a licesnse will cost $1000/mo."* Relayed by Integration, not an authorisation of anything — no seat has contacted Benzinga; this is what came back from wherever his own draft or enquiry landed. **Which product ($1,000/mo covers editorial Stock News, the Press Releases wire product this seat's draft actually asked about, or both) and on what terms (commercial display rights, redistribution) is unknown** — the figure alone doesn't answer the question the draft was built to ask. No action from this seat unless he raises it; recorded so a fresh session has the number rather than rediscovering it. |
| Watch, no clock | this seat | CT Plan agreements (2027-04-01; migration since 2026-09-01); IEX TOPS $1,000 from 2026-10-01; sol's promotional price after 2026-11-21; a 2026 Nasdaq Basic list |
| India as a market — deliverable sent 2026-09-26 (`2026-09-26-india-momentum-traders.md`) | him | reading it; the "can they" question is answered (mostly yes, recently), "do they" is not answerable from public sources — a market-research vendor or a direct platform question, both enquiries and both his |
| Session reports, commercial/legal section — filed 2026-09-27 at `docs/research/session-reports/commercial.md` (this seat's file alone), Research assembles the four-seat design | Research, then him | nothing from this seat; ruled the two flagged phrases (§3), sized the disclaimer gap (§4), named state-level adviser law as unchecked (§6) — does not stand alone, waits on Research's assembly |
| Daily-billing design — **CLOSED**, `daily-billing-design/commercial.md`, all four sections folded in, his final ruling on the paid day recorded | — | nothing; build approved, sequenced after the sign-in cut-over |
| Newswire coverage landscape, whole and sent directly 2026-09-28 (`2026-09-28-newswire-coverage-landscape.md`, `416e187`) | him (Benzinga item), closed (Warrior Trading item) | **His 2026-09-28 ruling was "no to both."** The Warrior Trading item stands closed — nothing has changed its premise. The Benzinga item's premise changed 2026-09-29 (source list corrected, see the row above); Research put the new fact to him as a fresh question, not a re-ask, and it waits on his answer. Landscape document itself corrected in place (`16fdbb0`), not reopened as a whole. |
| FINRA short interest as a derived label (his question, 2026-10-02; `2026-10-02-short-interest-landscape.md` §10 to §11b) | Research (label), Web (terms wording), a credential-holding seat (coverage check), then him | **He registered for the FINRA API Console and accepted the clause-2.2 exposure, his words direct 2026-10-02: "registered. accepted exposure".** Waits on: the coverage check (are Nasdaq and NYSE-listed small caps in the API dataset), Research's label design, his adoption of end-user terms wording, this seat's §8 review before anything ships. This seat holds no credential. |
| Terms of sale for the daily pass — drafted 2026-09-30 (`terms-of-sale-daily-pass.md`, `21865ca6`), ahead of an actual need | him, when billing is actually about to ship | **HELD, not active.** Drafted under a misread of the night's urgency — sign-in ships Friday, not that night (his own word, verified at his own turn, Web's session 15:51:36.984Z, "3, sign in friday"), and neither sign-in nor billing was built yet. Covers Stripe's four required sentences for the card-save flow; refund section is this seat's recommendation (no refund for a completed day) explicitly marked as his to rule, not decided. Ready the moment billing is actually about to ship; not to be put to him before then. |

### Hazards a fresh session must know on day one

- **Public sources only; register nothing; no vendor contact.** An enquiry is an approach and an approach is his. Not even a pricing page behind a login.
- **Never take a relayed word as a fact — open the file.** On 2026-09-17 this seat filed "his prior analysis" for a Sheet no human has ever written; two decisions were put to him on that premise and withdrawn. Three documents on the desk already said otherwise.
- **WebFetch fails on PDFs and JS pages; the in-app browser and pymupdf do not. Close the browser tab when the read is done** — an idle tab played YouTube audio on his machine with no visible owner (2026-09-11).
- **Commit with `git commit --only <paths>`;** five sessions share one index. Verify a push with `git branch -r --contains`, never by the push output.
- **Addresses from `list_sessions` every time.** Titles carry a `-tmi` suffix now (`Integration-tmi`, `Marketing-tmi`); there are three constellations on this machine.
- **No P&L and no figure from his fills in the repository.**

**Declined, deliberately:** any enquiry to any vendor, and any recommendation
to sign. Both are his.

## Opening message for a new chat

*Superseded 2026-09-21 by [`docs/commercial-opening-prompt.md`](../commercial-opening-prompt.md), which is the hand-off prompt for the next session. The paragraph that stood here from 2026-09-12 is preserved in git history.*


---

## ARCHIVE — the 2026-09-07 to 2026-09-17 diary, kept verbatim for provenance

*Superseded by the live state above on 2026-09-21. Every fact a fresh session needs is in the live state; this is the record of how each was reached and corrected, and nothing here overrides the section above.*

### Former LIVE STATE (as it stood 2026-09-17)

**If anything above disagrees with this section, this section is right and the
section above is stale.**

**Delivered, in the commit carrying this section:**

- [`docs/commercial/2026-09-07-feed-licence-landscape.md`](../commercial/2026-09-07-feed-licence-landscape.md)
  — the feed-licence landscape: where the line is, the desk side from the code,
  the vendor table, the three vendors with a published path in detail, the
  exchange layer, the four shapes re-costed, the integration change per move,
  the shape of the decision, what could not be established, sources.
- Gate 0 mapped in [`docs/monetization-gates.md`](../monetization-gates.md).
- [`docs/commercial/2026-09-07-which-price.md`](../commercial/2026-09-07-which-price.md)
  — Integration's follow-on task after Gate 1 closed: for each derived
  real-time price, is there a real bid and ask, whose spread is it, and what is
  the method. The requirement is read from the code (the flat verdict and the
  NEW HIGH override are both defined by the live spread and go neutral without
  one); the answer is that only Databento's Mini carries a real bid and ask,
  FMV carries none, EquitiesEdge's is modelled, Tiingo's is gated — and any
  subset quote widens the band one way, by an amount no public page gives.
- [`docs/commercial/2026-09-07-volume-basis.md`](../commercial/2026-09-07-volume-basis.md)
  — Integration's question after bring-your-own-feed was ruled out: do the
  cheap display tiers carry consolidated volume, which RVOL needs in both its
  numerator and its denominator. Tiingo: no, IEX-only intraday. Intrinio
  Startup: not stated anywhere. Massive Business: yes, real-time, by its own
  knowledge base. Databento: Mini is a venue subset; its consolidated-volume
  Summary dataset is on every tier (catalog panel, read after the first
  version of this line said the tier was unreadable — corrected the same day)
  and Databento's own pages disagree on whether it is delayed. **Verified floor
  for REAL-TIME RVOL as defined: Massive Business, $2,499/mo, with no bid and
  ask. Databento Plus, $1,500/mo annual, carries both a real bid and ask and
  consolidated volume of unstated delay.** §7–8 of the document answer
  Integration's completion and fifth-vendor questions: the cheapest live
  spread on Massive is the $499 IEX expansion; nobody with a published price
  packages both below the tape; Nasdaq Basic with NLS Plus is the one exchange
  product carrying both. The delay interval and Intrinio Startup's volume
  basis are settled only by a sign-up, which is his.
- [`docs/commercial/2026-09-07-model-rate-card.md`](../commercial/2026-09-07-model-rate-card.md)
  — Integration's rate-card task: OpenAI's published Standard-tier rates for
  gpt-5.6-terra ($2.00 input / $0.20 cached / $12.00 output per 1M) and
  gpt-5.6-luna ($0.20 / $0.02 / $1.20), from developers.openai.com, verified
  in a rendered browser, dated by the changelog to the 2026-07-30 price cut.
  **gpt-5.6-sol added 2026-09-08** after Integration found it running in the
  store: $4.00 / $0.40 / $20.00, same 272K whole-request cliff, same 1.25x
  cache-write rule, dated by the changelog to 2026-08-21 and **published as
  promotional "at least through November 21, 2026"** with no successor rate.
  Three models run; three are priced; the lesson is Integration's — enumerate
  by what the store contains, not by the names handed over.
  Two lines the desk's counters cannot see: cache writes at 1.25x the input
  rate (the API usage object records reads only), and a whole-request 2x/1.5x
  multiplier past 272K input tokens. So a cost from the desk's own counters
  is a band between $2.00 and $2.50 per million on uncached input, not a
  number, until the console dashboard — his to open — supplies the write
  count. **Corrected 2026-09-08:** the first version inferred the Standard
  tier from a grep, which Integration rightly called a search standing in for
  a value. The widened check: the request bodies are hand-built `fetch` calls
  with no tier field, no SDK, no env var, no wrapper — the field is absent
  from the wire — and OpenAI's reference says an absent field means *'auto'*,
  which means *"the service tier configured in the Project settings"*,
  *'default'* unless changed. So: Standard unless the console says otherwise,
  and the response object's `service_tier` field would settle it from one
  logged response — Research's path, sent to Research. **Research built it
  the same day (`40ee093`): the served tier is logged as "served at tier X";
  the value is unobserved until the next interpretation runs after deploy.**

**Method, so the next reader knows what the figures are worth.** Four research
passes over public pages on 2026-09-07; **every load-bearing quotation and
figure was then re-read by this seat against the primary page or the PDF's
extracted text** — VERIFIED 2026-09-07 by re-read, for everything not marked
otherwise. Figures read only by a pass are labelled *"pass only"* in the
landscape and are the minor vendors. No vendor was contacted, nothing was
signed up for, no login-gated page was opened. The extracted agreement texts
(Alpaca T&C and Customer Agreement, the NYSE and Nasdaq subscriber agreements,
the CTA and UTP schedules and policies, the IEX policies, the Nasdaq and Cboe
price lists, the CT Plan filings) live in this session's scratchpad, not the
repo — they are public documents and re-fetchable.

**The standing facts, one line each; the landscape carries the quotations.**

1. The licence ends at the first person other than the subscriber who sees the
   output, paid or not. Every instrument read says so.
2. Alpaca publishes no redistribution path; its multi-user product is a
   brokerage partnership; its OAuth `data` scope is the published
   bring-your-own-feed shape. The one-SIP-connection rule is a published
   property of the subscription class.
3. Massive ($2,499 + $1,999, SIP) and Databento ($1,500 + fees, annual, direct
   feeds) are the self-serve paths to display rights; both are a rebuild of
   `lib/market/alpaca/`.
4. The exchange layer: $1 per non-pro viewer per network, agreements, reporting,
   a firm floor of roughly $4,000–$6,000 a month; delayed data has no
   display-unit fees; RVOL and rank are not-fee-liable derived data under UTP,
   price/move/VWAP are not.
5. The CT Plan replaces CTA and UTP on 2027-04-01; migration began 2026-09-01.

- [`docs/commercial/2026-09-08-product-name.md`](../commercial/2026-09-08-product-name.md)
  — the naming research he asked for. **Reframed by him directly on
  2026-09-08:** *"this is a depth tool. its intelligence. its not a scanner
  but a smart desk. an assistant that give you depth on the moving market"*
  — so the first pass on the avoid angle is kept as a record and The Avoid is
  withdrawn as the pick. Second pass: eight names on the depth / intelligence
  / smart-desk angle, registry RDAP checks on `.com` and five alternatives
  (timestamped 2026-09-07 22:52–22:55 UTC, with positive controls), web-search
  collision flags, say-it-aloud notes. **Pick: Desk Read** (the product's own
  vocabulary; `.com` held since 2014 with no site, every alternative clear;
  no collision). His-name alternative: Mointel (Madrid firm flag, spelling
  tax). Story alternative: Why It Moves (MarketReader occupies the idea).
  Landscape fact found on the way: **MarketReader** is a positioned occupant
  of "intelligence, not a scanner" for investors at large. **His own
  candidate, checked 2026-09-08 05:45 UTC (§2b): TMI Trader / True Move
  Intelligence / tmitrader.com / "What your scanner doesn't tell you."**
  tmitrader.com and every alternative clear — the only name tonight clear
  everywhere at once; no occupant on the exact name; flags on the parts:
  TMi Markets (a retail CFD broker — his read: not worried), TMI the Trend
  Momentum Indicator (looked at closer at his request: a $29.99/mo
  TradingView buy/sell-arrow indicator by "Rising Express Inc", branded TMI
  with no ™, TikTok @tmi_indicator at 637 followers on 2026-09-08 — a signal
  product, not what the desk does; collision on the letters and the audience,
  not the product), TrueMove (a Thai telecom); tagline unclaimed and the
  strongest line produced. **DECIDED BY HIM 2026-09-08: TMI Trader / True
  Move Intelligence / tmitrader.com / "What your scanner doesn't tell you."**
  His words on the letters: a chart indicator with a few hundred followers, a
  colloquial expression, *"i think we're good. let's move ahead."* The
  registration: his instruction later that day, *"ops can do that. register
  with amazon"* — relayed verbatim to Ops (Route 53, his AWS account) with
  Integration copied as a purchase; this seat registers nothing. **Registered
  by Ops 2026-09-08 ~08:27 UTC on his direct answer to Ops, $16 standard, no
  premium, expires 2027-09-08, privacy on, DNS at Route 53; nothing deployed,
  no tagline anywhere.** DNS, mail
  authentication and email sign-in are Ops's and Integration's once the
  domain is his. **Tagline under review at his prompting** (§2c): the
  original reads as "instead of a scanner" and the product is a supplement;
  pick offered, *"Your scanner finds it. TMI explains it."*, with the case
  against; "the story behind the move" is occupied (ExplainThisMove, Benzinga
  WIIM) and both are now in the landscape section. **Second pass (§2d), held
  to his own standard after Integration named it — the line must name the
  product without naming a competitor, and must not imply completeness:**
  pick *"Intelligence on what's moving."*, plainer alternative *"What's
  moving, and what it is."*, six phrases searched exactly with no occupant
  found and the limits of a tagline search stated. Registration constraints
  recorded: stop on a price surprise, domain only, no tagline. **DECIDED BY
  HIM 2026-09-08: "Intelligence on what's moving."** The name is complete —
  TMI Trader · True Move Intelligence · tmitrader.com · the line — and this
  seat's naming work is closed. Where the line appears is Design's surface
  and Integration's sequencing. **The trademark knock-out search is WAIVED
  by him, 2026-09-09 (*"2, waive."*, Integration `902c8aa`); the §2b flags
  stay on file uncleared, which is the state he chose. Nothing on this seat
  was ever blocked on it.** Corrections
  carried: "Algo Trader Plus" is Alpaca's plan name; no name may borrow from
  a data vendor. Nothing registered; the purchase and any registrar enquiry
  are his.

- **RULED 2026-09-08 — the first-outside-viewer question, the one this seat
  named as never having been put to him.** His words via Integration: *"accept
  exposure. not going to pay for something i'm not sure is going to be used.
  my call. the moment we have something moving, i'll sign up. let's talk about
  the risk after we settle the other items."* Recorded at the top of the gates
  map with all four parts. What it means for this seat: the vendor decision is
  not due; the two floors and their defects stay ready in the volume-basis
  document for the moment the trigger fires; **the trigger — "something
  moving" — is undefined and this seat will not invent a threshold for it**;
  the risk conversation is Integration's to reopen. **He then asked what the
  risk really is and how it would be traced; answered from the contract
  text in the landscape §1b:** the switch is Alpaca's without cause at any
  time (structural, from the first viewer, no integrated fallback); the
  exchanges are third-party beneficiaries who may enforce against him and
  anyone he supplied; reclassification and retroactive fees are small at one
  subscriber and anything beyond that is unpublished; and detection is
  through the public product, not the data pipe, so it scales with publicity
  rather than viewers. What it means for him in practice is a lawyer's
  question and the conversation Integration holds. **Integration then asked
  whether the 30-day "User Application" notice is a free compliant path that
  would make his choice a false one. From the Terms: it is a notice, it costs
  nothing, and it licenses nothing — Content including market data stays
  "exclusively for personal and noncommercial" use without Alpaca's "express
  prior written consent", §30 of the Customer Agreement says the same, the
  published answer to that consent is no, and the exchange agreements forbid
  furnishing the data regardless. The choice was not false. The notice is
  free and not neutral: it converts a quiet exposure into a disclosed one.**
  **Then his mechanical question, "how do they know it's their data?" —
  answered in §1c from thirteen documents, each of four parts marked STATED
  or NOT DESCRIBED:** no identification mechanism in the data is described
  anywhere (what is described is visible attribution a compliant display
  must carry); the inquiry right is Nasdaq's "any reasonable request …
  regarding … receipt, processing, display and redistribution", no threshold;
  he is already obliged to report the change of circumstances himself, and
  the exchange side holds his name, address, occupation and employer from
  Alpaca's non-professional records; so the link is the account, made by
  inference and inquiry, and the honest answer is the admission. By field:
  a derived-only surface displays nothing any instrument polices; a price
  surface displays exactly what they do.

- [`docs/commercial/2026-09-10-auth-providers.md`](../commercial/2026-09-10-auth-providers.md)
  — Integration's commission after he named the providers: what Google and
  Apple require, as facts with citations. **He ruled Apple phase two and
  asked of Google's OAuth consent screen "is that required?"** Google answer
  landed, every page re-read 2026-09-10: for identity-only scopes an
  unverified app works for any Google user with the domain shown in place of
  name and logo; three Google pages say verification is not mandatory for
  that, two say production apps must verify — contradiction reported, not
  resolved; brand verification takes minutes to 2–3 business days and needs
  a public home page, privacy policy and terms on the owned domain and
  Search Console domain ownership by DNS TXT record, which sits in Route 53;
  no page states a price or "free". **Apple section landed the same day,
  re-read through the browser:** the deciding fact for phase two is Apple's
  own sentence, *"you must have an existing app in the App Store that uses
  Sign in with Apple"* — a web-only product with no iOS app is outside what
  the pages offer, and whether an unshipped App ID is accepted in practice
  is stated nowhere; the Program is $99 USD a year, individual enrolment is
  fine, organizations need a legal entity and a D-U-N-S number; `sub` is
  stable per team, a relay address is asserted verified but never matches a
  Google user's address, so Ops's link-from-session model already accepts
  Apple without a migration; the relay domain moves to private.icloud.com
  per Apple's 2026-08-24 update, and sending to a relay address needs the
  domain registered with Apple and SPF/DKIM.

- **Positioning on the public page, 2026-09-10 (naming document §2e), for
  Web, a new thread that owns every word a stranger sees.** He ruled "i like
  the layout, i dont like the sales pitch" and "invite only, can ask for
  invite." Answers: the scanner line is retired from the page (a hook by
  construction; the supplement relationship belongs in the plain statement);
  no one-paragraph plain statement is registered — Web writes it from the
  three registered sentences and hands it here; an invite request asks for
  an email address and nothing else. Raised unasked: the public page is the
  evidence surface under accepted exposure, so it should say intelligence on
  what's moving and not sell the tape. **Web acted on that the same day
  (`7d81bae`): the tape is off the page. And the plain statement is now
  REGISTERED (§2e item 2), written by Web from the three sentences and
  accepted here, with two dependencies recorded: "each one" rests on the
  board rendering not-researched as a state, and his word "assistant" was
  dropped by Web's judgement and can be restored with one word.**

- [`docs/commercial/2026-09-11-competitor-trademomentum.md`](../commercial/2026-09-11-competitor-trademomentum.md)
  — his commission: the transcript of a competitor's "END of the free watch
  list" Short, what that channel publishes item by item, and the commercial
  read. Transcript got from YouTube's public panel in the in-app browser
  (auto-generated captions, consent declined). **The premise is stale: the
  free series did not end** — the same afternoon's list was posted, and the
  channel carries a "TOP 3 STOCKS" Short for every trading day through
  2026-09-11; the video names no price or date and funnels to an existing
  $147/mo chatroom. Per name he gives a five-part game plan — trigger,
  confirmation, targets, chase zone, "no break, no trade" — and no catalyst,
  float, structure or supply. It is a signal product with a personality, the
  opposite of the registered boundary; "track the same thing" splits into the
  levels and continuity the desk already computes and the entries it has
  ruled out. First published price in the desk's own audience: $147/mo.
  What to build is Integration's to route; nothing names him on the page.

- **May a competitor be named? — ruled 2026-09-15, naming document §2e-bis.**
  His voice-reference answer to Marketing named Warrior Trading as the style
  the app is patterned after and said he wants TMI to be complementary.
  Integration corrected the relay: §2e retired the line, not the
  relationship, which is registered and live in Web's card. Ruling: the
  relationship stays as registered; Warrior is not named in public copy — a
  positioning fact he states is not an instruction to publish it, naming
  puts a competitor back in the subject position against his own objection
  that retired the line, and an unagreed association with a named third
  party is the class this seat struck in §2f. What it licenses is the
  reader and the vocabulary, Marketing's to use. **Ruled by him 2026-09-16:
  "do not want warrior mentioned." His instruction now, not this seat's
  advice.**

- **The session report is a product surface — scoped under standing rulings
  2026-09-16, naming document §2g.** His word: "the report is for
  monetization, coaching (what you do) is just for me." Three rulings already
  on this seat apply before it hardens: the licence line (a delivered report
  is the first-viewer event, covered by accepted exposure; prices in it put
  the tape in a persistent document, derived fields do not — the field list
  is the licence posture and the choice is his); the §2f claims principle (a
  report may state what happened as record, never as what the reader could
  have done; coverage stated, not implied); and single-tenancy as a shipping
  gate (a report narrating a Sheet-sourced field has no second customer;
  Research to trace which fields touch the Sheet). **Research traced one
  layer the same day: every narrated field resolves to the dossier or the
  ticker session store, and the assessment table has no float column, so
  the gate is cleared at that layer; **then traced one layer further and it
  does NOT clear: the Sheet's prior analysis is an input to the interpreter
  by default, so structure, catalyst and cycle in every stored dossier were
  produced with it available. Future rows: a switch, approved and never
  run, costing dossier quality — his call. The 6,512 stored dossiers cannot
  be retrofitted, so a report narrating history either narrates only
  post-switch dossiers or accepts the exposure for the back catalogue — a
  sequencing decision, his, before the report is called shippable.
  Attribution wording amended to say the classification was produced with
  his prior analysis available.** **CORRECTED 2026-09-17: "his prior
  analysis" was this seat's wrong word — no human has ever written or
  reviewed the Sheet; ChatGPT tasks write it, which the shared rules, the
  Design charter and the config comment all already said. Attribution
  withdrawn and re-worded to "a second automated pipeline's conclusion".
  Decision 1 is no longer a privacy trade and is being decided by the
  tasks' retirement. Decision 2 dissolves: no human judgement is in the
  back catalogue to leak; what remains is an operational dependency on a
  retiring task, not secrecy, and the sequencing question is withdrawn as
  put. The question that stands instead: a paid report narrating structure
  narrates a vendor float the desk measured wrong on 8 or 9 of 46 watched
  names until Phase C replaces it — narrate the verdict, never the number;
  whether that is enough before Phase C is his.** **RULED BY INTEGRATION
  under order-and-process, 2026-09-17: narrate the verdict, never the
  number, is the STANDING DEFAULT and does not need him — the verdict
  (PROVEN / NOT_PROVEN / BASIS_UNVERIFIABLE) is already computed and
  rendered to the board, so it is a default rather than a build, and a rule
  that can only fail toward saying less needs no signature. It becomes his
  only if someone proposes narrating the number itself, and nobody is. The
  larger question he holds is the migration: the report cannot narrate
  structure honestly until the desk owns the float, which is Phase C, the
  last leg of retiring the Sheet.** Research also found prices are the least
  load-bearing and most exposed content in the report, so the tape
  exposure there is optional, not structural.** Pricing and packaging of
  the report is open and waits on him.

**Open items.**

- ~~**The Alpaca plan tier is not in the repo.** Ask him; do not infer it into a
  document a second time.~~ **ANSWERED 2026-09-07, his word: Algo Trader
  Plus.** Recorded in the landscape §2 and the gates map; the inference is
  retired.
- **The first-viewer decision** — prices, derived facts only, or the user's own
  feed — is Integration's to put to him with Gate 1. This seat has the
  costings ready for whichever he picks.
- **The commercial half of the gates map beyond Gate 0** — pricing, packaging,
  terms — is unstarted and waits on Gate 1, because the unit sold decides the
  licensing object.
- **Watch, no clock:** the new CT Plan agreements at consolidatedtape.com
  (renders only a header today); a 2026 Nasdaq Basic price list; IEX's $1,000
  TOPS fee from 2026-10-01; Massive's unpublished exchange-fee amounts.
- **A second concurrent SIP consumer is a commercial decision, not an
  engineering one — RULED NOT NOW by Integration, `1c0c0a6`, and not put to
  him.** *Ops's reading of the connection fact, `d6ffec3`: "get a second
  connection" stops being an available remedy for a local desk beside
  production or a parallel worker.* **Corrected by Integration: a migration
  does not need it** — a new vendor is a different connection, not a second
  Alpaca one — so the only genuine need is a staging desk consuming live SIP
  beside production, which is the split-brain shape and is scoped nowhere.
  **The reason this seat did not name and Integration did: an approach to a
  vendor is not neutral when the eventual plan is redistribution on a personal
  licence.** Asking Alpaca for a second account creates a record and a
  relationship, invites a question the desk is not ready to answer, and cannot
  be un-asked. Deferred, not dropped — triggers: a staging desk genuinely
  scoped, or the migration itself, by which point the new vendor's terms
  govern. **The principle, now in the shared rules: deciding NOT to approach is
  sequencing and Integration's; deciding TO approach is his.** The published option set, for
  whenever that decision is wanted: Alpaca's Broker API partner plans publish
  5–10 stream connections, but that is a brokerage partnership at sales
  pricing; Massive Business publishes up to three websocket connections at
  $2,499/mo and is a rebuild; Alpaca's docs say the limit is 1 *"in many
  subscriptions"*. **Searched 2026-09-07, after Ops made both holes
  load-bearing (`bb00ad7`: the desk has never observed the limit, and the test
  that would costs production its feed):** (a) **a higher individual tier —
  CLOSED as far as public pages go.** None is published; Alpaca staff on the
  forum in 2021 said the paid plan carries *"a single websocket connection"*
  and in 2022 *"Only one active real-time connection is allowed now"*; the
  Broker API is the only published multi-stream product. (b) **A second
  account in the same name with its own subscription — still UNVERIFIED, and
  now known to be unresolvable from public pages.** No Alpaca page states a
  rule either way; the Customer Agreement's "Multiple Accounts" clause governs
  only securities-versus-crypto; the IRA page sets no limit on IRA accounts; a
  2021 staff reply treated a user's two accounts as a support matter. **The
  only way to close it is to ask Alpaca, and an enquiry is an approach — his,
  not this seat's.** Not a recommendation; an option set with one hole that
  public documentation cannot fill.

**Declined, deliberately:** any enquiry to any vendor, and any recommendation
to sign. Both are his.

---

