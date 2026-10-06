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

## LIVE STATE: as of 2026-10-06 (last Commercial commit `bbfb7a17`; no clock time is stated here, read the commits)

**If anything above disagrees with this section, this section is right and the section
above is stale.** This is a snapshot of now, not a diary; the prior tenure's version is
in the archive at the foot of this file.

**This seat's third tenure, 2026-10-05 to 2026-10-06, ended by a RESET IN PLACE on his word ("reset"), not a retirement** (the self-reset hook, `docs/self-reset-hook-mointel.md`): same chat, same title `Commercial-tmi`. Sonnet 5.5 throughout; the work needed no more. Hand-off prompt: [`docs/commercial-opening-prompt.md`](../commercial-opening-prompt.md), rewritten for this reset. The seat was the claims reader for the float cell and page, the Setup grade, the entry gate, the free beta, the terms of sale, and the Warning Shot and Confirmation. Every read is a numbered section: `docs/commercial/2026-10-03-sheet-reproduction-claims-read.md` sections 5e to 5p (float), 6 to 6b (Setup grade), 7 to 7b (Warning Shot, Confirmation), and `docs/research/session-reports/commercial.md` section 12b (entry gate).

**What the third tenure delivered.** The float cell faces and wording through to a pass (dated claim, per-cause reasons, FILINGS_NOT_REREAD, legend, date label; Form A passes, Form B read ahead); the 90-day consequences (date on the cell face); the insider-sale defect found and fixed in the contract (S1); the effect of the measured issuance miss rate on the 5i and 5k reads; the Setup grade words (v3 passed), the legend after the outcome test (the outcomes sentence deleted, no result published); the entry gate's final text, built verbatim from terms section 7, with what DECLINE must do; the beta ruling recorded (free, invite-only, "covered" means accepted, not licensed); the terms of sale swept and re-read (still held); the Warning Shot prompt rule and word list and the Confirmation state names, to a pass on the design text.

**This seat's second tenure, 2026-09-28 to 2026-10-05, retired on his word ("yes, retire
it and write the hand-off") after the first repeat of an already-corrected class
(session-hygiene section 2).** Hand-off prompt:
[`docs/commercial-opening-prompt.md`](../commercial-opening-prompt.md). The seat ran on
Opus 5.5 and then Sonnet 5.5; the work needed no more than Sonnet.

**What this tenure delivered, in one paragraph.** Corrections to the Gate 1 record; the
newswire and Benzinga work closed and reopened by his own rulings; the entry-gate
disclaimer ruling; the historical-bars costing for Alpaca; the whole FINRA short interest
chain (vendor and licence landscape, the Query API route, who else uses the data, review
of the label design, Marketing's words, the share-count source reading and Web's
end-user wording); and, since 2026-10-03, the claims read on reproducing the Sheet (grade
wording, a model-researched float) and on the float page. Every document is in the table
below; the standing wording rulings are in `docs/research/session-reports/commercial.md`
sections 8 to 13.

**How this seat failed, as mechanisms (nine ledger entries below cluster into four).**
(1) A true statement carried past its scope: FINRA's website terms applied to its Query
API; "can only understate" stated without the precondition it rested on; a gloss written
into binding text. (2) A universal claim with no counterexample search, twice in one day:
"no filing carries a float" is contradicted by the 10-K cover (Rule 12b-2 public float, a
dollar value), and the same fault appeared in the replacement wording this seat supplied;
**one such sentence is live on the public site** (`app/page.tsx` line 280; Web is putting
the correction to him). (3) Reading a clause and not using it: an exchange-fee worry was
raised from price lists while the Equity Data terms already said "Third Party Terms: Not
applicable". (4) An action outside the lane hidden by a clipped output: a `git pull` in
the shared tree conflicted and `| tail -1` showed one line, so the tree sat mid-merge
until Integration aborted it. **The reviewers caught the first three before they shipped,
except the live sentence.**

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
| 8 | Cleared the public sentence 'Every float is somebody's computation. No filing carries one.' (naming doc 2f item 3, live at app/page.tsx:280) without checking the counterexample: a 10-K cover carries a dollar public float (dei:EntityPublicFloat) | **a universal claim cleared without a counterexample search** (true of the current tradable share count, stated as 'no filing carries one') | no, first instance | this seat, on reading Research's SEC data while reviewing Marketing's float legend |
| 9 | Marketing's float draft v2 said 'companies are not required to report a float'; I had told them (section 5 item 1) to say 'companies are not required to file a float', my own wording, which is false in the SEC's vocabulary (Rule 12b-2 'public float' is a dollar value that 10-K filers do report) | **a universal claim I supplied** (the same class as entry 8, in the suggested replacement text) | YES, repeat of entry 8's class within the same day: warn him and propose a hand-off per hygiene section 2 | this seat, on reviewing v2 against Rule 12b-2 |

### Error ledger: third tenure (from 2026-10-05), per session-hygiene section 2

| # | error (asserted -> true) | type | already logged this tenure? | caught by |
| --- | --- | --- | --- | --- |
| 1 | Passed the float popover and page ("the float is no more than X", "holdings dated at or before the count") in reads 5e to 5j with the contract's as-of rule open in front of me; the rule ignores every filing after the count, so an insider who SOLD after the count is still subtracted at the larger holding and today's float exceeds the bound. Found only in 5k, when asked about reusing a row | **a claim passed whose precondition I had open and did not test** (the same class as the second tenure's entries 6, 8 and 9: a bound without what changes between its date and the reader's) | no, first instance this tenure | me, in 5k, on Integration's reuse question |
| 2 | Reported "0 em dashes" on Marketing's files from a Python count over a pipe; on this PC stdin drops U+2014, so that count can never be non-zero | **a check that cannot see the case it tests, returning a plausible clean answer** | no, first instance | me, on finding 14 in the terms-of-sale draft and running a control |

### Error ledger: fourth tenure (from 2026-10-06), per session-hygiene section 2

| # | error (asserted -> true) | type | already logged this tenure? | caught by |
| --- | --- | --- | --- | --- |
| 1 | Read 7 (third tenure) passed the spec's "not researched yet" for the Warning Shot's NOT_YET state; NOT_YET is "dossier predates schema 3", and design section 6 keeps reused, researched dossiers there, so the string is false of researched names | **source-not-opened** (design read to section 4; the case that breaks the word was in section 6) | no, first instance this tenure | Marketing (v2 departed from it, with the reason), confirmed by me in 7c |
| 2 | Read 7 required the Unknown hover to say "the desk could not establish a risk" -> UNKNOWN also means a guardrail removed a sentence the model wrote (design section 2, a section I had read) | **a clause read and not applied** | no, first instance this tenure | me, building 7c from the state definitions |
| 3 | Read 7 item 4 asked for a label that is "the desk's reading of the main risk" and "does not claim the risk is the largest" -> "main" is the ranking claim; the constraint contradicted itself and Marketing built to the first half | **a constraint worded with the claim it forbids** | no, first instance this tenure | me, in 7c |
| 4 | Read 7a passed the Warning Shot's good example (a $25 million program, "with no sales recorded") against the guardrails only; as a text the model reads in every prompt and can copy, no rule checks the figure or the absence claim | **an example tested against the rules and not against being copied** | no, first instance this tenure | me, reading the built strings (7e) |

Entries 1 to 4 are errors in the third tenure's read 7 (entry 4 in its 7a), found in the fourth tenure on 2026-10-06; they are logged here because this seat found them and corrected them in 7c. Entry 1 and entry 2 repeat classes the second tenure's ledger names (source-not-opened, read-a-clause-and-did-not-apply); none is a repeat within this tenure. A further instance of any of the three classes in this tenure is a repeat, and the trigger in session-hygiene section 2.

**Classes, for a successor's own ledger:** source-not-opened (1), overstated authority (2), excerpt-not-context (3), source-scope mismatch (4), read-a-clause-and-did-not-apply-it (5), a guarantee stated without its precondition (6), a check that returned a plausible answer and an action outside the lane (7), a universal claim cleared or supplied without a counterexample search (8, 9). **Entry 9 repeated entry 8's class within a day, which is the retirement trigger.**

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
| [`commercial/2026-10-02-short-interest-landscape.md`](../commercial/2026-10-02-short-interest-landscape.md) | Short interest: how it is derived; Alpaca has none (borrow data only, locate quotes account-specific); FINRA website terms versus the **Query API terms** (Equity Data Specific Terms: derivative and Resultant Data permitted, redistribution to end users for non-commercial use with FINRA named owner and source, no incremental fee, Third Party Terms not applicable); Massive resells it; Ortex and borrow-fee sources (consumer terms bar display); who else uses FINRA data and how; his registration and accepted exposure on clause 2.2 (10.5); coverage answered by Ops (49 of 50 board names); Web's end-user wording reviewed (10.6). Sections 3, 6, 6b and 6c were corrected by 10 and 11b | 2026-10-02 |
| [`legal/terms-of-sale-daily-pass.md`](../legal/terms-of-sale-daily-pass.md) | A DRAFT terms of sale for the daily pass: the four sentences Stripe's compliance text requires. **HELD**, not urgent; refund line his; adoption sets the adopted terms to null if it edits `terms.md`, so it ships with billing | 2026-09-30 |
| [`research/session-reports/commercial.md`](../research/session-reports/commercial.md) sections 8 to 13 | Standing rulings on report and label wording: catalyst as characteristics, float verdict not number, shares outstanding dated and never called float, price paths as the licence class, the entry-gate disclaimer (12), and reviews of the SANG block, the v5 sample, the short interest label (R1 to R6), the size-source reading (13f: the grade is stated against the dated filed count; refuse on active issuance) | 2026-09-30 to 10-02 |
| [`commercial/2026-10-03-sheet-reproduction-claims-read.md`](../commercial/2026-10-03-sheet-reproduction-claims-read.md) | Claims read on reproducing the Sheet: the A/B/C/AVOID wording conflicts with the no-recommendation rules as defined and is fixed by wording (Setup grade, readings of five criteria, D for AVOID, one legend sentence); a model-researched float needs its error rate measured, honest labelling and a source allow-list; the landing sentence correction (4); the float page draft review (5, 5b, 5c) | 2026-10-03 to 10-05 |
| [`commercial/2026-10-03-sheet-reproduction-claims-read.md`](../commercial/2026-10-03-sheet-reproduction-claims-read.md) sections 5e to 5p, 6 to 6b, 7 to 7b | The third tenure's reads, in order: 5e to 5h the float cell faces, popover reasons, date in the popover while the max age is 45; 5i what changes at 90 days (date on the face); 5j and 5k the date measured to the checkpoint and the row-reuse wording; 5l to 5o S1 and the insider-sale rule, FILINGS_NOT_REREAD, Form A and Form B; 5p the measured issuance miss rate (BKYI at 43 days); 6 to 6b the Setup grade words and the legend after the outcome test; 7 to 7b the Warning Shot prompt rule and word list and the Confirmation state names | 2026-10-05 to 10-06 |
| [`research/session-reports/commercial.md`](../research/session-reports/commercial.md) section 12b | The entry gate's FINAL text, verbatim from terms section 7 with one sentence left out, and what DECLINE must do (`776f1415`) | 2026-10-05 |

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
- **Benzinga, 2026-09-28 to 09-30:** *"no to both"* (verified at his own turn 23:32:53Z on 09-28; the Benzinga item was then put to him again as a fresh question because its premise changed); *"yes draft the email"* (09-29T02:20:59Z; the draft is his to send, no seat sends it); his own report that Benzinga quoted *"$1000/mo"* (09-30T23:28:15Z; product and terms unknown).
- **Entry-gate disclaimer, 2026-09-30, direct to this seat:** *"let's add a disclaimer entry ... this is required before you can enter the platform"* (session-reports section 12).
- **No em dashes, 2026-09-30, HARD RULE:** *"no em dashes in any writing. hard rule."* Applies to chat replies and docs.
- **FINRA, 2026-10-02, direct to this seat:** *"registered. accepted exposure"* (clause 2.2, our own use; recorded in the landscape doc 10.5). Earlier the same day: *"we don't need to publish the details they provide, just do our own assessment and present a label."*
- **Local runs, 2026-10-03:** restricted by him for a few hours, then *"if they need to run anything its open."* Currently open.
- **The Sheet, 2026-10-03T17:20:45Z (typed to Integration):** *"we need to reproduce what the sheet does in the app. its that simple. the sheet is nothing more than a repository of model outputs."* Float: the SEC upper bound from insiders only, with a tooltip linking to a new public page "Are float quotes real?" (2026-10-05T00:40:36.015Z, verified at his own turn by the third tenure in transcript 267e4fe2; the same chat has "always show it, it's key." at 00:43:25.883Z, the Float column always on).
- **Third tenure, his words (each verified at his own turn by this seat unless marked):** free beta, invite-only, the invitees are testers under the accepted exposure, no lawyer (*"free beta, limited invites. 2, these will be considered testers, so its covered. 3, no."*, 2026-10-05T18:51:26.824Z, transcript 125cfd6b; **"covered" means accepted, not licensed**). Float: *"a, go with the SEC calculation... always show it, it's key."* (2026-10-05T00:40:36.015Z and 00:43:25.883Z, 267e4fe2). The new landing sentence: *"yes, use the new wording"* (23:20:42.913Z, 81e25ab4). Float wording approved but the page not: *"yes hand off. float wording is fine but i want to see the webpage."* (16:01:43.775Z, 019463d9). Maximum filed-count age: *"90 days, approve the badge draft, yes hand off"* (21:22:37.820Z, 125cfd6b). Warning Shot and Confirmation: *"yes, build both"* (2026-10-06T00:22:29.450Z, d947056e, relayed in Research's files, not re-read here). **Integration's rulings, not his:** S1 for insider sales (S0 only if the measurement's controls fail), and a direct submissions check (424B and 8-K item 3.02 after the count) before the float is ever on.

### Standing rules this seat applies to claims

1. A percentage describing the market's behaviour is a fact of record; one attached to a name, a time and a reader is an outcome. **Outcome claims are prohibited in any form**, loss statements included.
2. No number about a named or inferable third party's data; no unagreed association with a named third party. The mechanism may be described without the vendor.
3. The public page is the evidence surface under accepted exposure: it says intelligence on what's moving and never sells the tape (Web removed LAST / CHG / RVOL / TAPE LIVE, `7d81bae`).
4. A positioning fact he states is not an instruction to publish it.
5. A paid report narrates the float **verdict**, never a float **number** — standing default, ruled by Integration under order-and-process 2026-09-17.
6. The registered plain statement (naming document §2e item 2) is the only description of the product; it rests on the board rendering not-researched as a state (verified by type, Design `ba13d79`).
7. The FINRA short interest label has no price of its own (Equity Data terms 2.3(b), landscape §10.6): part of the subscription, never an add-on, and in every tier equally if tiers ever exist.
8. **A universal claim ("no", "never", "every", "all") about filings, vendors or third parties is not made without a counterexample search and a source opened.** The 10-K cover's public float is the worked example; one such sentence is live on the site.
9. **A grade or label states what it is computed against, with the date, and the precondition any "at least" or "at most" rests on.** A bound that holds only while a share count is current is stated against the dated count, and refused where issuance since is known.
10. **A bound, a grade or a label is dated to what it was computed for, and a present-tense "at most" carries only the conditions the desk checks.** A check for a hazard states what it cannot see (the issuance direct check cannot see ATM sales between supplements, conversions or exercises). No surface says "audited", "verified" or "safe" about the float.
11. **A check is proved able to see a present case before its clean result is believed** (the em-dash count over a pipe; a bound validated against the count's date only).

### Open items: owner and what each waits on (as of 2026-10-06; "unverified" means this seat did not re-read the artefact on that date)

| item | owner | waits on |
| --- | --- | --- |
| **Short interest label (FINRA).** Design, Marketing's words, Web's end-user wording and the share-count source reading all passed this seat's review. **Research recommended HOLD on the display decision on 2026-10-02** (`9b32ec4e`) after an Ortex comparison: FINRA alone shows no line on the most crowded of five names (SDEV: FINRA 2.39% of the filed count against Ortex's 12% of float). Nothing is built | him (display decision), Research | a pre-registered matched-date FINRA versus Ortex comparison (Research's note); any build then needs: Web's terms wording adopted by him in the same change as the label and the attribution, and this seat's section 8 review of the sample. Clause 2.2 is his accepted exposure |
| **FINRA end-user terms wording** (`docs/web/2026-10-02-finra-terms-draft.md`, Web `204d42c6`) | him, Web | passes this seat's check; held so adoption rides the label (the banner rule: an edit to `terms.md` sets `adopted` to null and publishes a DRAFT banner). Unverified whether it changed since |
| **Sheet reproduction: Priority grades.** Wording passed (Setup grade, A to D, legend with the rubric, "not tested against outcomes" tied to a tested flag) | Research (contract), Design, Web, Marketing | Research's field contract must apply the mapping on EVERY user-reachable surface (filters, URL values, tooltips, MCP tool output, exports, report tags); Marketing verifies it is in the contract |
| **Sheet reproduction: the float and the public page "Are float quotes real?".** Draft v2 reviewed (5c), final re-read 5d (`7fa31bcb`) PASS with two items: hedge "not required to file a count of floating shares" to "we know of no SEC filing that requires a count of floating shares", and add "and anyone else who reports on those forms"; Marketing folds them. Cell words open since 2026-10-05: Design measured 84 px at 1,024 (`16852a94`, `b1e769fd`); whether a date must be visible in the cell, and whether a shortened "Cannot verify" is acceptable, wait on Marketing's strings and Research's float gate age. Release pairing (Web, adopted): tooltip link and page ship together. **Third tenure, 2026-10-05: claims reads 5e to 5h passed the cell faces and page wording (v11, `56cdc9dc`); his turn at 16:01:43.775Z (transcript 019463d9): "yes hand off. float wording is fine but i want to see the webpage." So the WORDING is approved and the page is not: he wants to see it before it ships.** Still gating: the validation sample, the unbuilt as-of and split rules, Research on the `effectiveDate` field, Design's two-line measurement, the 45-day age ruling (the date returns to the cell face above 45) | Marketing (v3), Research, Web | **the insider-only validation sample (Research, NOT run) is a gate before any surface or the page**; Cannot verify after active issuance (open for the next Research seat); his sight of the draft; this seat's read of v3 **2026-10-05T21:22:37.820Z, his enqueue (transcript 125cfd6b, verified by this seat): "90 days, approve the badge draft, yes hand off." Float maximum filed-count age is 90 days, so the date goes on the CELL FACE and the six sentences in claims read 5i change; Marketing rewrites them and they come to this seat before they ship. Put to him with the stated risk (a longer window for an unflagged issuance; the validation PASS does not test the flag). Priority rubric approved as drafted; Setup grade words v3 passed (6a).** |
| **Landing-page sentence `app/page.tsx` line 280** ("No filing carries one") and its three canvas copies | Web, Ops | **HE ANSWERED: "yes, use the new wording" (his enqueue, Web's chat, transcript 81e25ab4, 2026-10-04T23:20:42.913Z), put to him as "No filing reports the current number of tradable shares."** `2fe136ac` carries it in `app/page.tsx` and two canvas files (read by Integration 25th); not an ancestor of production `6e7fff84`, so the old sentence stays live until the next ordinary release (Ops cuts after Monday 2026-10-05's spot check) |
| **Daily billing and terms of sale.** Sign-in released 2026-10-02 per Integration and Ops records (unverified here); daily billing build approved 2026-09-28 after sign-in proves it refuses; nothing charges until he separately approves the first run. Terms of sale drafted and held | him, Ops, Web, Design | the billing build and his approval of the first run; the terms of sale must be adopted before a live card is charged **2026-10-05 (third tenure, `3729eadf`): terms of sale swept of em dashes, contact filled, two ruling sentences added (retries only on card update; a new paid day charges afresh). Three items open, named in the file header: section 2 describes the self-serve save-card page while ruling 6 says first users are invited and billed by hand (Ops and Web, when billing starts); ruling 3 never says which paid days count as non-trading (his, or Ops if the code defines it); the refund line (his). Integration batches the last two to him when billing is close. Off the free-beta path; billing has no code yet.** |
| **Benzinga licence.** His enquiry email is drafted (`benzinga-licence-cost-2026-09-29.md` sections 4 and 4b); Benzinga replied with questions; he reported a $1,000 a month quote | him | which product the price covers and on what terms (display, redistribution) is unknown; whether the email was sent is unverified. No seat contacts Benzinga |
| **Entry-gate disclaimer** (session-reports section 12) | Web, Design | build status unverified; DECLINE must actually withhold the platform |
| **Session reports.** This seat reviews each new sample against session-reports sections 8 to 13 before it ships | Research, Integration | the next report sample; Marketing's wording stays Marketing's |
| **The pre-launch exposure conversation (CLOSED FOR THE FREE BETA); the vendor decision (Massive Business versus Databento Plus) for paid** | him; Integration | **His turn 2026-10-05T18:51:26.824Z (transcript 125cfd6b, verified by this seat): "free beta, limited invites. 2, these will be considered testers, so its covered. 3, no."** Meaning, per Integration 26th: the beta is free and invite-only; the invitees are testers under his 2026-09-08 accepted exposure; no lawyer before the beta. **What "covered" means, so it is not read as licensed:** it is his acceptance of the exposure, not a licence. The landscape (section 1b, "private beta: exposure") found no instrument with a tester category: Alpaca, the exchange agreements and the UTP trial policy treat a beta viewer as an external subscriber, and the UTP trial construct still requires a subscriber agreement. His ruling accepts that exposure for the beta; it does not remove it. The vendor decision and the undefined "something moving" trigger stay open for paid. Plan: `docs/beta-launch-path-2026-10-05.md` |
| **Ortex personal plan** | him | flag only: its consumer terms bar use "in connection with any business, professional or commercial activities", so using it to evaluate a product may breach them; a counsel question |
| Watch, no clock; India; a second Alpaca account | this seat; him | CT Plan agreements (2027-04-01); IEX TOPS $1,000 from 2026-10-01; sol's promotional price after 2026-11-21; a 2026 Nasdaq Basic list. India: sent 2026-09-26, "do they" is not answerable from public sources. A second Alpaca account: an enquiry, his |
| **THIRD-TENURE OPEN ITEMS (2026-10-06)** | | |
| Float cell and page | Marketing, Research, Design, Web, Ops, him | Wording: Form A passed; Form B (S1) needs a pass when the revised batch comes back and S1 is built and measured. Gates not mine: his sight of the webpage; Research's float job (built on branch `research/float-job`, gate passed, mutants not yet run); Ops's memory and ship slot; the direct issuance check (Integration's ruling, built before the float is on; its refusal can reuse the existing issuance string, 5p); and whether his 90-day ruling stands now that the issuance flag is measured to miss often (to him via Integration; unverified whether put) |
| Entry gate | Design, Web, Marketing | Text final (`776f1415`). Not built as of 2026-10-05. Marketing's voice check; I read the BUILT gate only if its words deviate from 12b |
| Setup grade | Marketing, Research, Design | Words v3 and the legend passed (6a, 6b); rubric approved as drafted. The rubric PAGE (thresholds) comes to this seat before it publishes. An outcome-result page only if he asks (recommended not now) |
| Warning Shot (field `evidenceRisk`) and Confirmation | Research, Marketing, Design | Design text passed (7b, `26597e9d`). Owed to this seat before any real-name run: the BUILT prompt string and word list. Marketing: the label (not "Warning Shot"), the Unknown face, the Confirmation words (no state name prints; never "Confirmed") |
| Terms of sale for the daily pass | him, Ops, Web | Held; swept of em dashes (`3729eadf`); three open items named in the file header: how a hand-billed user is charged, which paid days count as non-trading, the refund line |

### Hazards a fresh session must know on day one

- **Public sources only; register nothing; no vendor contact.** An enquiry is an approach and an approach is his. Not even a pricing page behind a login.
- **Never take a relayed word as a fact — open the file.** On 2026-09-17 this seat filed "his prior analysis" for a Sheet no human has ever written; two decisions were put to him on that premise and withdrawn. Three documents on the desk already said otherwise.
- **WebFetch fails on PDFs and JS pages; the in-app browser and pymupdf do not. Close the browser tab when the read is done** — an idle tab played YouTube audio on his machine with no visible owner (2026-09-11).
- **Git in the shared tree: never pull or merge here, and never pipe a state-changing git command through `tail` or `head`.** Local `main` carries many seats' held commits; syncing it is Integration's. Read origin with `git fetch` then `git show origin/main:<path>`. Push your own files from a temporary worktree (`git worktree add --detach <dir> origin/main`, commit, `git push origin HEAD:main`, verify with `git branch -r --contains <sha>`, remove it). `git commit --only <paths>` if you must commit in the shared tree; never `git add -A`.
- **No em dashes, in chat or docs, and search the entity forms.** His hard rule.
- **A "no" or "every" sentence needs a counterexample search.** See standing rule 8.
- **`sec.gov` blocks plain `curl`; read rule text through `law.cornell.edu`, filings through the browser pane, PDFs through `pymupdf`.** Verify a ruling at his own turn (transcripts under `C:\Users\adshu\.claude\projects\A--mointel\*.jsonl`, `queue-operation` `enqueue` records; a cross-session message with the same words is an echo).
- **Addresses from `list_sessions` every time.** Titles carry a `-tmi` suffix now (`Integration-tmi`, `Marketing-tmi`); there are three constellations on this machine.
- **Check the em-dash rule by bytes, with a control.** A Python count over a pipe cannot see U+2014 on this PC. Use `grep -c $'\xe2\x80\x94'` after proving it finds a planted glyph, or read the file with `encoding='utf-8'`. Search the HTML entity form of the dash too.
- **Long text and a bash command do not mix here.** Backticks and apostrophes in a heredoc broke the parser twice. Write the text to a file with the Write tool, then read it in Python by its Windows path (`C:\Users\...`); Python on this PC cannot resolve `/c/...` paths.
- **Verify a relayed approval at his turn, and carry its clauses.** The float wording "approval" arrived without "but i want to see the webpage".
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

---

## ARCHIVE: the 2026-09-25 to 2026-09-28 tenure's live-state head, kept for provenance

*Superseded 2026-10-05 by the live state above. Nothing here overrides it.*

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
