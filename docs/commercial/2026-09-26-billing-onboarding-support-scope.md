# Billing, onboarding and support — SCOPE, not a build

**Written by Commercial, 2026-09-26 (checks run 15:40–19:10 UTC), against `4857c7a`.**
His ruling that opened this: **"scope it."** — one word, answering Integration's report
that billing, onboarding and support are the only launch blocker on this desk with
nobody on it. **This document leads and holds the three-part scope; Ops holds the infra
half as a written section (not yet landed — held open, §6); Web holds the
stranger-facing flow at
[`../web/2026-09-26-signup-flow-scope.md`](../web/2026-09-26-signup-flow-scope.md),
landed and read in full, and its finding reshapes everything below it.**

**The boundary, stated once because it governs every section:** no provider selected,
nobody contacted, no account created, no payment details entered, nothing signed. What
follows is options, what each costs, what each requires, and the decisions only he can
make — the same standing rule that governs the vendor-float ruling and the feed-licence
landscape.

---

## 0. THE QUESTION THAT REORDERS THE WHOLE SCOPE, ANSWERED BY WEB'S OWN READ OF THE CODE

**The opening question this document was going to ask him — is the first paying user
one, ten, or a self-serve public — has already been answered, and not by a ruling. By a
sentence already live on the public page.**

Web read `app/page.tsx:432` and verified it on the wire at `tmitrader.com`:

> *"There are no public sign-ups. An invite request goes to the operator by email and
> is answered by a person."*

**That is a published claim.** Building a self-serve checkout without changing it would
ship a buy button next to a sentence the page still states, which is a copy decision
with its own argument to make — not a default this document should assume. Web's
recommendation, and this document adopts it as the frame for pricing, packaging, terms
and support alike: **invite the first paying users by hand, invoice them by hand, and
say so on the page.** Reasons, Web's, not re-derived here: every missing page except
pricing exists to replace a person, and at one to ten users the person is faster,
carries no vendor integration, no webhook, and no failure mode a human doesn't already
handle by reading an email. It also does not defer the legal work (§3) or the licence
question (§4) — both are owed at the first charge regardless of how the charge is
collected.

**The condition that ends it, Web's formulation, kept:** self-serve is worth building
when the manual step — him reading and answering invite emails — is what's rate-limiting
sign-ups, not when a headcount is reached.

**What this changes below:** packaging stays to one bundle (already ruled, §2), the
billing question narrows to *what rail collects one invoice at a time* rather than *what
platform runs a public checkout*, and the infra Ops was asked to scope (webhooks,
allowlist mapping, payment-lapse revocation) very likely shrinks — flagged to Ops's
section rather than written for them, §6.

---

## 1. BILLING — PROVIDER OPTIONS, FOR THE MODEL WEB'S FINDING ACTUALLY CALLS FOR

**Two shapes exist, and they answer different questions. Read in order of what the
invite-by-hand model actually needs.**

### 1a. A payment RAIL for a hand-invoiced customer (what §0 calls for)

**Stripe Payment Links**, `stripe.com/payments/payment-links`, read in full:

> *"Use payment links to sell a product or service, start a subscription, or collect a
> donation... no code required... Use the Dashboard or email to be notified of a
> successful payment, and have the funds deposited into your bank account."*

**This is the rail, not a platform decision.** A link is generated once (recurring
subscription supported, per the same page), sent by hand to an invited person by email
— the same channel the invite already goes through — and Adam or whoever he delegates
gets a Dashboard or email notification when it's paid. **No webhook is required for this
shape**: a human reads the notification and flips the allowlist entry, exactly the
admission mechanism Web's §3 describes as already correct and code-complete. Cost, from
Stripe's own pricing page (`stripe.com/pricing`, read in full): **2.9% + 30¢ per
successful domestic-card transaction, plus 0.7% of billing volume for the recurring
mechanics (Stripe Billing, pay-as-you-go tier, `stripe.com/billing/pricing`) — no setup
fee, no monthly fee, no contract.** At the volume a handful of invited users implies,
this is the entire cost; the $620/month "pay monthly" tier on the same page is priced for
$100,000+/month billing volume and is not the shape this desk is in.

### 1b. A Merchant of Record (what a self-serve, cross-border product would need, and this one is neither)

**Paddle**, `paddle.com/pricing`, read in full: **5% + 50¢ per transaction, all-inclusive**
— sales tax and VAT compliance and remittance in every jurisdiction it sells into, fraud
and chargeback handling, and, materially for the support question in §5: *"Billing
support: we handle queries from your customers related to payments, subscriptions &
cancellations."* Stripe's own **Managed Payments** (`stripe.com/pricing`) is the same
shape from the same vendor: **3.5% on top of standard Payments fees**, described as
*"a complete merchant of record solution... offload tax compliance, fraud, disputes, and
customer support responsibilities."*

**Neither is the right fit here, and the reason is his own ruling, not a cost
argument.** He has already said, on the international-scope question (naming document
§2e): *"anyone that trades US market i suppose, but i dont want any overhang on
international regs."* A Merchant of Record exists to absorb exactly the overhead a
company selling into 75+ tax jurisdictions carries — VAT, GST, cross-border compliance.
**This desk is a single US company (Andromeda Genius, Inc., per the adopted terms),
selling access to US-market intelligence, to a handful of invited people, priced in one
currency.** There is no international overhang to absorb, so the 2-3x fee premium buys a
capability this desk does not need yet. **Named because "handle payments" and "handle
customers" tempts toward the fuller product; the fee is the tell that it's built for a
different problem.**

**Recommendation: 1a, if and when he wants a rail at all.** Not urgent — see §0's
condition for when self-serve, and by extension any payment automation, is worth
building.

---

## 2. PACKAGING — ALREADY RULED, RESTATED SO THIS DOCUMENT DOESN'T RE-OPEN IT

**Gate 2 (`monetization-gates.md`), his words, 2026-09-07: *"same board to start. we're
serving this same market for now."*** One bundle, no tenancy split, no per-tier feature
gate. **Nothing in this scope proposes changing that.** The only packaging question this
document surfaces is one Gate 1 left open and nobody has asked since: **whether the unit
sold is the board, the Why Not Report, or the daily brief** — still unranked, per the
gates map's own unresolved list, and still waiting on him asking rather than a
default being picked here.

---

## 3. TERMS OF SALE, REFUND AND CANCELLATION — A DEFERRED RULING'S TRIGGER, PULLED BY THIS SCOPE

**Found by Web, reading `docs/legal/terms.md`'s own source comment rather than the
rendered page — credited because the finding is theirs and this section only acts on
it.** The adopted terms of service (`adopted: 2026-09-11`) carry, verbatim in the file's
own instructions to whoever reached this moment:

> *"Payment terms. There are NONE: no billing, renewal, refund, price change or tax...
> The gap is real the moment the desk charges for anything, and not before... WHOEVER
> SCOPES A PAID SESSION REPORT PUTS THIS BACK IN FRONT OF HIM AT THAT MOMENT, as part of
> that work rather than as a legal review appearing from nowhere."*

**This is that moment.** His 2026-09-18 ruling — *"4 not a priority"* — deferred this,
did not decline it, with the trigger written down by the seat that drafted it. Scoping a
paid tier is arguably the trigger firing; he may reasonably rule the trigger is the first
charge instead. **Either answer is legitimate; this document does not pick one for him.**

**Three routes exist, read from the code (`lib/legal/document.ts`) rather than assumed,
and this seat's recommendation is a route, not text:**

1. **Nothing yet** — the gap stays at zero cost until money moves. Consistent with the
   file's own wording.
2. **Draft a separate terms-of-sale document.** The existing `terms.md` stays adopted
   and keeps rendering with no interruption; the new document carries its own
   `adopted` date, independently.
3. **Add payment terms to `terms.md` itself.** This is, by the file's own rule, a
   material redraft: `adopted` goes to `null` and `/terms` renders a DRAFT banner on a
   live public page — under a real company name — until he re-adopts. The file's own
   comment calls drafting and adoption "one motion," not a change that sits open over a
   weekend.

**Recommendation: route 2**, for the reason route 3 rules itself out — it is the only
one of the three that changes a live public page's trust signal before he has decided
anything, and nothing about billing requires touching the in-force terms of service to
add a second, narrower document beside it.

**What a terms-of-sale document would need to cover, named as topics rather than
drafted as text, since this is scope and drafting is a separate step:**

- **Billing cycle and renewal** — monthly, and whether it auto-renews (the adopted
  terms already model month-to-month access; a subscription is a natural extension).
- **Price changes** — notice period, and whether an existing subscriber is grandfathered
  or moved to a new price at renewal.
- **Refund policy.** Three common shapes, named without a recommendation because this is
  a judgement about relationship with a first handful of known people, not a market
  fact: no refunds (common for information services, defensible given the liability
  cap's own reasoning); pro-rated refund on cancellation; or a short unconditional
  window (e.g. seven days) before the no-refund rule applies. **This is his to weigh
  against who these first few people actually are.**
- **Cancellation, requested by the person** — how they ask (a reply to the same email
  that invoiced them, at this scale) and when access ends (immediately vs. end of paid
  period). **A different and separately-owned question, flagged by Web and not this
  document's to answer: what happens on non-payment rather than a request** — a card
  failing at 08:14 is not the same event as somebody asking to leave, `revokeEmail`'s
  immediate-termination behaviour was ruled for revoking someone who shouldn't be there,
  and Integration has already put the non-payment policy to him as its own decision.
  **This document's cancellation terms should compose with whatever he rules there, not
  duplicate or pre-empt it.**
- **Tax.** None owed if this stays US-only, non-resale, low-volume, and Stripe's standard
  processing handles remittance the merchant owes on its own income the same way as any
  US company's revenue — a question for whoever handles the company's taxes generally,
  not a special commerce-tax question at this volume. Named so it isn't silently assumed
  clear.

---

## 4. THE LICENCE QUESTION — ALREADY RULED, RESTATED SO THIS DOCUMENT DOESN'T HEDGE IT

**Confirmed with Web, 2026-09-26, after an early draft of their section nearly reopened
this as a pending question.** `docs/commercial/2026-09-07-feed-licence-landscape.md` §1
draws the exposure line at the first outside viewer — invited or paying, it does not
distinguish — and his ruling of 2026-09-08 already accepts that exposure: *"accept
exposure... the moment we have something moving, i'll sign up."* **Billing does not
create a new licence gate. The invite-only gate already crosses this line the day it
admits anyone who isn't him**, and a paid tier only makes "traction" concrete in a way it
has not been before. **This document does not map a paying customer onto "something
moving"** — that trigger is deliberately undefined and no seat invents it — **but the
mapping is now a live question, raised to Integration for the pre-launch exposure
conversation it already owns**, not resolved here.

---

## 5. SUPPORT — WHAT IT MEANS AT ONE PAYING USER

**Adopting Web's framing exactly, and sharpened by Web's own correction of it: say what
it is, not what it's called.** *"support"* as a noun invites an expectation about hours
and response time nobody has agreed to; the true sentence is narrower and already
live. **`info@andromedagenius.com` — already the invite address on the public page
(`app/page.tsx:22,463`) and already described in the adopted privacy policy as reaching
"a person, not a queue" — is also the support address, the billing address, and the
cancellation address.** One inbox, one person, for as long as that's true; nothing new
to build, register, or announce, because the channel already exists and already carries
this description. **Writing this plainly, rather than implying a desk that doesn't
exist, is Web's call on copy and this seat's ruling on what "support" is scoped to
mean.**

**Where a vendor's own support obligations would only start to matter:** if he ever
authorizes a Merchant of Record (§1b), Paddle's own page states it will *"handle queries
from your customers related to payments, subscriptions & cancellations"* on his behalf —
relevant only if that path is ever chosen, not before.

---

## 6. OPS'S SECTION — HELD OPEN, WITH ONE THING FLAGGED AHEAD OF IT

**Not yet landed.** Integration's brief scoped it as the infra half: where a provider's
webhooks land, secrets transport, how a paid account maps onto `isUserInvited`, and the
failure modes (webhook down, payment lapsed, revoke on non-payment).

**Flagged for whoever writes it, not written for them:** if §0's invite-by-hand model
holds, **there may be no webhook to scope for phase one.** Web's §3 already establishes
that `refused` is a correct, live-session-issuing state and that `revokeEmail` already
ends sessions immediately — the mechanism this desk needs is a person updating
`isUserInvited` after confirming a Stripe Dashboard or email notification, which is an
operational runbook, not new infrastructure. Ops's section may be shorter than briefed,
or may be exactly as briefed if he decides self-serve is where this starts — that's
still his to weigh, not assumed here either way.

---

## 7. 🟠 WHAT THIS PUTS IN FRONT OF HIM

**Four items, none blocking the rest of the scope, each answerable in a sentence.**

1. **Does the payment-terms trigger fire now (scoping a paid tier) or at the first
   actual charge?** His 2026-09-18 ruling deferred to the second reading; this scope
   may or may not be that moment — his call, not this seat's to decide by proceeding.
2. **If he wants a terms-of-sale document at all right now: which route** — nothing yet,
   a separate document (this seat's recommendation), or a redraft of the adopted terms
   (puts a DRAFT banner on the live page until re-adopted)?
3. **Does he want the invite-by-hand model Web recommends, at least to start** — meaning
   a Stripe Payment Link sent by email rather than a public checkout — or does he want
   self-serve scoped and built now?
4. **Refund policy shape**, if he wants one drafted: no refunds, pro-rated, or a short
   unconditional window before it — a judgement about the first handful of people, not
   a market fact this seat can supply.

Nothing above blocks Research's work on the newswire pipeline or any other thread's
work; this is a parked scope, waiting on him, exactly as briefed.
