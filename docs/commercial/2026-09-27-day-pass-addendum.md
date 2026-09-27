# Day pass — addendum on his stated plan for the unit sold

**Written by Commercial, 2026-09-27, against `7105907`.** Addendum, not a rewrite — the
billing scope (`2026-09-26-billing-onboarding-support-scope.md`, `9d49118`) and the
price-tier scope (`2026-09-27-price-tiered-pricing-scope.md`) both assumed Gate 1
("what is sold") was still open. **It has an answer.** Verified directly at his own
turn in Integration's session (`list_events`, not the relay alone), his words:

> *"my plan was a subscriber pays for a days usage of everything. beginning with the
> first report to the end of that day's after hours is one full day. you log in, you
> get charged. this was before the discussion on different pricing tiers. but as i
> think about it. penny stocks would be the cheapest, but there are people that do
> 10,000 dollars on a penny stock so maybe stock price isn't the correct tier measure.
> i dont know."*

**Recorded as his stated plan, not a ruling that closes the question — he said "i dont
know" about tiers, and this document holds that open rather than resolving it for
him.** Document only. No provider chosen, nobody contacted, nothing signed.

---

## 1. THE DAY BOUNDARY, IN THE DESK'S OWN TERMS

**Verified at `lib/desk/checkpointDates.ts`:** *"the trading date rolls at 22:00... a
session's last checkpoint — the 22:00 recap — falls at the exact minute the desk
starts calling itself the NEXT session."* His own description — *"beginning with the
first report to the end of that day's after hours"* — maps onto a boundary the system
already tracks with no new concept needed: **22:00 ET (the recap that becomes next
morning's premarket report) to 20:00 ET (the end of after-hours) the following
calendar day.**

**Two gaps his sentence doesn't answer, named rather than resolved:**

- **What happens 20:00–22:00?** The desk is between trading days in this window —
  the prior day's after-hours has ended and the next day's 22:00 recap hasn't run
  yet. A pass bought for "today" (ending 20:00) doesn't cover this window by his own
  definition; a person back at their desk at 21:30 is not inside any day's pass. **Is
  that a dead zone by design, or does the next day's pass need to be purchasable
  before 22:00 so a subscriber isn't locked out for two hours?**
- **Does a login at 15:00 buy the same full day as a login at 22:00?** His sentence —
  *"you log in, you get charged"* — describes when payment happens, not what it buys.
  A 22:00 login gets the premarket report, the full regular session and after-hours: a
  complete day. A 15:00 login has already missed the premarket report and part of the
  regular session. **If both cost the same, a late arrival pays full price for partial
  access — not necessarily wrong, but a fact worth him seeing rather than discovering
  from a support email.** The alternative — the day pass includes the day's
  already-published reports retroactively, however late the login — is a different
  product with a different cost basis and needs to be named as the other option
  rather than assumed.

---

## 2. CHARGING AT LOGIN — MECHANICS AND FEES, QUOTED

**What a stored payment method requires**, from Stripe's own documentation
(`docs.stripe.com/payments/save-and-reuse`, read in full): a card can be saved without
an initial charge (`mode=setup`) and charged later while the customer is offline, but
**Stripe's own compliance text requires the site's terms to state, in advance:** *"The
customer's agreement to your initiating a payment or a series of payments on their
behalf... The anticipated timing and frequency of payments... How you determine the
payment amount... Your cancellation policy."* **This is not optional boilerplate — it
is the specific gap this seat already flagged in the terms-of-sale scoping (billing
scope §3): a day-pass-at-login model cannot be built without exactly the document
that work already said was owed at the first charge.**

**The fee arithmetic, from Stripe's published rate (`stripe.com/pricing`, already
quoted in the billing scope): 2.9% + $0.30 per transaction.** The fixed $0.30 is the
part that matters here, because **charging once a day multiplies it by the number of
days someone logs in, where a monthly subscription pays it once.** A trader logging in
20 days in a month pays the $0.30 fixed fee **20 times ($6.00) regardless of what the
day pass costs** — a monthly-equivalent single charge for the same total revenue pays
it once. **The proportional bite is worse the cheaper the day pass is priced**, since
the fixed fee is fixed and the percentage fee is not: no price is proposed here, but
the shape of the effect does not depend on picking one.

**Two shapes this argues toward, options rather than a pick, per the brief:**

- **A multi-day or weekly pass**, priced for the block rather than per day, charged
  once, reducing transaction count without abandoning the day-usage unit.
- **A monthly cap**: charge per day up to a ceiling, after which the month is
  effectively unlimited — familiar from data-plan pricing, and it caps the fixed-fee
  drag for a heavy user (his own "20 days a month" case) while keeping the per-day
  unit for a light user.

**Neither is picked here.** Both require the stored-card mechanics above regardless of
which is chosen.

---

## 3. DOES CHARGING AT LOGIN DISSOLVE THE REVOCATION QUESTION? — PARTIALLY, NOT ENTIRELY

**Confirmed for the specific case Integration named, refuted as a general answer.**
`lib/auth/store.ts:515-521`, `revokeEmail`, verified: *"Withdraws an invitation AND
ends that person's live sessions in the same transaction... HIS RULING 2026-09-24, in
one word: 'immediate.'"* The scenario that ruling was written for — Web's own framing,
already on file — is a payment lapsing **while someone is mid-session**, forcing an
immediate mid-trade eviction.

**Under charge-at-login, that specific scenario cannot occur from a billing failure.**
There is no renewal to lapse mid-day; the day's access, once paid for, runs to its own
boundary (§1) regardless of anything that happens to the card afterward. A failed
card refuses entry at the door, exactly as Integration put it, and never removes
anyone already inside.

**But `revokeEmail`'s "immediate" rule was not written only for non-payment.** It
withdraws an invitation for any reason he or Ops decides — fraud, abuse, a person he
no longer wants signed in. **Those reasons do not go away under a day-pass model,**
and the mid-session-immediate mechanism still has a live job to do for them. **So the
correct statement is: charge-at-login removes the failed-renewal case from
`revokeEmail`'s workload, it does not retire the mechanism itself.**

---

## 4. TIERS UNDER A DAY PASS — HIS OWN INSTINCT, AND ONE THING STRONGER THAN INSTINCT

**No published evidence exists, searched for and not found, that any comparable
retail trading-information product prices by a customer's notional traded rather than
by a flat subscription tier of features.** His own reasoning — *"there are people that
do 10,000 dollars on a penny stock so maybe stock price isn't the correct tier
measure"* — is not merely a reasonable guess; **it is very likely the only workable
answer for a structural reason he may not have had in view: this product has no way to
observe what a subscriber actually trades.** Notional traded, position size and P&L
live in a subscriber's own brokerage account, which this desk has no access to and no
plan to integrate with. **A tier measure this product cannot see is not a pricing
choice available to it at all**, not merely one this seat advises against.

**"One price for everything" is not only the cheap option to start with — under a day
pass, it may be the only measure the desk can actually implement without a brokerage
integration it has never proposed.** This also **resolves the $20–$50 data-thinness
question raised in the price-tier scope**: if everyone pays the same for the same full
day regardless of what they look at, the minute-bar-only reality for most $20–$50
names (§2 of that document) is an honesty-in-labelling problem for that report, not a
fairness-in-pricing problem — exactly Integration's own read, confirmed rather than
merely restated.

---

## 5. THE PUBLIC SENTENCE — SEQUENCING WITH WEB, NAMED NOT DRAFTED

`app/page.tsx:432`, verified live at that line: *"There are no public sign-ups. An
invite request goes to the operator by email and is answered by a person."* **A day
pass sold at login, to anyone who can reach the login page, is a public sign-up in
substance — the invite gate decides who CAN log in, but a self-serve day-pass purchase
at the moment of login is not "answered by a person" the way that sentence promises.**
**This is Web's copy to change, not this seat's to draft** — named here so the
sequencing is explicit: the page's claim and the day-pass mechanism cannot both ship
true at the same time, and whichever lands first should not leave the other one false
in production, even briefly.

---

## WHAT THIS SUPERSEDES, NAMED RATHER THAN SILENTLY DROPPED

**Per the desk's own document-hygiene rule — strike through, don't delete, so the
record shows what was considered.** The billing scope's §1 recommendation (Stripe
Payment Links, a *recurring monthly* subscription) assumed the unit was ongoing
access, not a day pass; a day pass is a **repeating one-time charge per usage day**,
not a monthly-recurring one, though the same provider and much of the same mechanics
(§2) still apply. The price-tier scope's §2 finding (the $20–$50 data-thinness
problem) is not superseded — §4 above answers what kind of problem it is, not whether
it's real.

## SOURCES

`lib/desk/checkpointDates.ts`; `lib/auth/store.ts:515-521`; `app/page.tsx:432`;
`docs.stripe.com/payments/save-and-reuse`; `stripe.com/pricing` (already quoted in the
billing scope); this seat's own `2026-09-26-billing-onboarding-support-scope.md` and
`2026-09-27-price-tiered-pricing-scope.md`; his verbatim turn, read via `list_events`
on the Integration session rather than taken from the relay alone.
