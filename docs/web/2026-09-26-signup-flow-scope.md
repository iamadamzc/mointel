# The stranger-facing flow, if the desk charges — SCOPE

**AS OF 2026-10-02 17:48 UTC: re-read end to end by the successor Web seat. A
dated scope; what has moved since it was written:**

- **§4's recommendation was RULED, 2026-09-28: first paying users are invited and
  billed by hand, self-serve later** (`docs/commercial/daily-billing-design/commercial.md`
  §8 and §9; struck in place in Commercial's lead scope). *So §3's paid-but-not-yet-invited
  case does not arise while the hand route holds: a person is on the allowlist
  before they first sign in.*
- **§3's "today's screen" is now built, unwired: `components/NotAdmitted.tsx`.**
  *It says "You are signed in. This account does not open the board.", which is
  true for every person who reaches `refused`, so it no longer reads as a broken
  purchase. The three-way split waits on a refusal reason the store does not
  carry (charter LIVE STATE).*
- **§3's grace-period question (is non-payment revocation immediate?) was
  ANSWERED by him 2026-09-27: "1 hour. regardless of time."** *The hour is the
  grace and `revokeEmail` is immediate at its end; recorded in
  [`2026-09-27-paid-day-signup-scope.md`](2026-09-27-paid-day-signup-scope.md) §1
  and §3. The first version of this bullet said no ruling was found; it was in
  this seat's own next file.*
- **§5's terms-of-sale item: Commercial drafted a SEPARATE terms of sale on
  2026-09-30 (`21865ca6`, route 2 below) and HOLDS it** until billing is about to
  ship; it has not been put to him. *Route 2 being drafted is not his choosing
  route 2.*
- **The live sentence in §4 is now at `app/page.tsx:443`**, not `:432`.

**Web, 2026-09-26 09:58 ET, against `cfb054d`.** Owner of this file: **Web**.
Written on Integration's relay of his *"scope it"* — the third section of a
three-part scope that **Commercial leads and holds**; Ops holds the infra half.

**The lead document is
[`../commercial/2026-09-26-billing-onboarding-support-scope.md`](../commercial/2026-09-26-billing-onboarding-support-scope.md),
which links to this one rather than absorbing it** — each thread's file stays
under its own charter. *Landed at `1644109` and it links back to this
file; the reciprocal pair is checked, not assumed.* **The split with Commercial, agreed 2026-09-26: this seat
scopes the pricing page's EXISTENCE, its states and what has to be true for it to
be honest, and specifies a hole; Commercial fills the tiers, the numbers and the
inclusions.** *No placeholder price from this side, no page design from that
one.*

> ## SCOPE, NOT BUILD. NOTHING HERE IS A DECISION.
>
> **No provider is selected, nobody has been contacted, nothing is signed, and
> no page is built.** *All of that is his.* **This document names what would
> have to exist and what each page would have to be honest about. It does not
> name a price, a tier or a vendor** — pricing and packaging are Commercial's,
> and a placeholder number in a scoping document gets quoted back later as a
> decision.

---

## 1. WHAT A STRANGER CAN REACH TODAY, AND WHERE THE PATH ENDS

**Measured from the route tree at `cfb054d`, not from memory.** *Public here
means reachable without the Basic-Auth password; everything else is `401`.*

```
PUBLIC   /  /privacy  /terms  /favicon.ico  /icon.svg  /apple-icon.png  /robots.txt
BUILT, NOT PUBLIC, NOT WIRED   /signin  /auth/start/google  /auth/callback/google  /auth/signout
THE DESK  /desk  /api/*            behind Basic Auth, gate not yet enforcing
```

**The landing page's primary action today is "Ask for an invite" — a `mailto:`.**
*That is the whole of the path from wanting this to having it, and it was the
right answer for an invite-only desk with no price.*

> **SO THE HONEST STATEMENT OF THE GAP IS NOT "WE NEED A PRICING PAGE".** *It is
> that **between "I want this" and "I am signed in" the product currently
> contains one `mailto:` link and a human reading email.*** **Everything below is
> what would have to be built to replace a person, and the recommendation in §4
> is that for the first users, it should not be.**

### The pages that do not exist

**Content ownership is marked because it is the thing that will be got wrong:
most of these are Web pages carrying Commercial's words.**

| page | what it has to do | copy |
| --- | --- | --- |
| **pricing** | what it costs, what is included, what is not | **Commercial's** — Web owns the page, never the numbers |
| **the intent step** | the moment a stranger says yes; today this is the `mailto:` | Web |
| **whatever takes payment** | **UNSPECIFIED AND DELIBERATELY SO** — a hosted page, an embedded form or an invoice by hand are three different products and the choice is his, not a default I pick by drawing one | — |
| **post-payment landing** | the page a person lands on holding a receipt and no access yet | Web |
| **access pending** | **the state this desk does not have and will need most** — see §3 | Web |
| **payment failed / abandoned** | the person who got most of the way and stopped | Web |
| **receipt / what I am paying for** | after the first day, the page that answers "am I still paying for this" | Web + Commercial |
| **support: how to reach a person** | **at one paying user this is an email address, and saying so plainly is better than implying a desk** | Commercial defines what support IS |

**Four of those eight are failure or waiting states.** *That ratio is not a
pessimism; it is what the charter already says about this desk — the states
nobody designs are the ones users hit, and refusal is a state rather than an
accident.*

---

## 2. THE LEGAL SURFACE, AND A DEFERRED RULING WHOSE TRIGGER THIS WORK PULLS

**The adopted terms already anticipated this exact moment and left instructions
for whoever reached it.** *`docs/legal/terms.md`, in the source comment above
the text — not in the rendered page.*

> **His ruling 2026-09-18 was "4 not a priority", and the payment terms were
> DEFERRED, NOT DECLINED, with the trigger written down: the payment gaps "cost
> nothing today and they start costing the day the desk charges for anything.
> WHOEVER SCOPES A PAID SESSION REPORT PUTS THIS BACK IN FRONT OF HIM AT THAT
> MOMENT, as part of that work rather than as a legal review appearing from
> nowhere."**

**This is that moment, so it is in front of him in §5 — as scope, not as a
request to draft anything.** *The trigger condition is his to judge: scoping a
paid tier is not the same act as charging for one, and he may reasonably rule
that the trigger is the first charge rather than the first scope.*

**What the adopted terms say today, read rather than assumed:**

- **§2 payment terms: there are NONE.** *No billing, renewal, refund, price
  change or tax.* **The liability cap survives it** — "the greater of what you
  have paid and US$100" resolves to US$100 at zero paid, which the file records
  as deliberate and forward-compatible.
- **Terms of SERVICE are adopted. Terms of SALE, a refund policy and a
  cancellation policy are different documents and none exists.**
- **Nobody with a law licence has read any of it.** *Recorded in the file, and it
  matters more the day money is involved than it did yesterday.*

**DOES A PAID TIER SET `adopted` TO NULL? MY READING: NOT AUTOMATICALLY, AND THE
DISTINCTION IS WORTH KEEPING.** *Adding payment terms to the terms of service
would be a material redraft of an adopted document, which sets `adopted` to null
and renders the DRAFT banner until he re-adopts.* **But a SEPARATE terms-of-sale
document does not touch the adopted one** — it is a new document that needs its
own adoption, and the existing terms stay adopted and stay rendering. *Which
route is taken is a drafting decision, not a Web decision; I flag only that one
route blanks a live banner on a public page and the other does not.*

### The market-data licence — ALREADY RULED, and it is not a caveat on this flow

**Commercial's, cited rather than re-derived, and confirmed by Commercial
2026-09-26 as the framing this section takes.**

**`docs/commercial/2026-09-07-feed-licence-landscape.md` §1 draws the licence
line at the first viewer who is not the subscriber — and states explicitly that
it is NOT drawn at payment.** *Seven sources quoted there to that effect.* **His
ruling 2026-09-08, verbatim in that file:** *"accept exposure. not going to pay
for something i'm not sure is going to be used. my call. the moment we have
something moving, i'll sign up."*

> **SO THIS FLOW IS NOT "SUBJECT TO A LICENCE POSITION BEING RESOLVED". THE
> POSITION IS RESOLVED AND THE EXPOSURE IS ACCEPTED, BY HIM, ON THE RECORD.**
> *An earlier draft of this section hedged it as an open question; Commercial
> corrected it, and the hedge would have published a doubt he had already
> settled.*

**What is true, stated without hedging it:** **the exposure begins at the first
outside viewer, invited or paying, so the invite-only gate already reaches it the
day it admits anyone who is not him.** *Billing does not create it and this scope
does not change it.* **What a paid tier changes is that it makes the accepted
exposure concrete for the first time.**

**AND THE TRIGGER IS DELIBERATELY UNDEFINED — "something moving" — with that
file's own instruction that NO SEAT IS TO INVENT A THRESHOLD FOR IT.** *So this
document does not say a paying customer is that trigger, which would be
inventing one under a different name.* **Commercial holds the mapping and is
raising it to Integration for the risk conversation Integration already owns.**
*Named here only so a reader of this scope does not conclude it was overlooked.*

---

## 3. WHERE THE INVITE MODEL AND A PAID MODEL DISAGREE — AND THE GOOD NEWS

**Read from `lib/auth/gate.ts` and `lib/auth/store.ts` at `cfb054d`, not from a
description of them.**

**The gate returns exactly three states**, and the middle one is the entire
answer to Integration's question:

```
anonymous   no valid session                      -> /signin
refused     a valid session, user NOT invited     -> 403, the refusal screen
admitted    a valid session, user invited         -> serve the desk
```

> **`refused` IS ALREADY DESIGNED AS A COMMON, LIVE-SESSION STATE RATHER THAN AN
> EDGE.** *His D2 ruling: refuse at the point of use, and issue a session even to
> a not-yet-admitted person.* **A stranger who pays and is not yet on the
> allowlist lands in exactly this state, holding a real session, with no code
> change required.**

**SO THE GAP BETWEEN PAYING AND BEING ADMITTED IS NOT A MISSING MECHANISM. IT IS
A MISSING SENTENCE.** *The mechanism exists and already behaves correctly. What
does not exist is a refusal screen that can tell apart the two people who reach
it:*

| who arrives at `refused` | what is true | what today's screen says |
| --- | --- | --- |
| a stranger who signed in uninvited | correctly refused, nothing owed | "you are not invited" — **right** |
| **a person who has just paid** | **owed access, waiting on a human** | "you are not invited" — **reads as a broken purchase** |

**The gate cannot tell them apart and should not be asked to.** *It answers from
the allowlist, and the allowlist is the authority on admission — teaching it
about payment would put a second authority on the same question.* **What the
page needs is the payment fact, carried separately, so the screen can say "your
payment went through and your access is being set up" instead of "you are not
invited."** *Whether that fact reaches the page as a receipt, a query parameter,
a flag or a second store is Ops's to design; from the outside, all it has to be
is trustworthy enough to change what a paying person reads.*

**AND `revokeEmail` ENDS LIVE SESSIONS IN THE SAME TRANSACTION** — his
*"immediate."* *So a lapsed or refunded subscription already has a working
mechanism for ending access, and it ends it mid-session.* **That behaviour is
correct and it needs a screen: a person whose payment lapsed at 09:41 is thrown
to a refusal in the middle of the session the desk exists for.** *Naming it here
because it is the one case where the honest copy and the trading day are in
direct conflict, and it is not a state anybody has drawn.*

> **STATUS, 2026-09-26: WITH HIM, AND DELIBERATELY UNOWNED UNTIL HE ANSWERS.**
> *Integration verified the behaviour independently and put it to him rather than
> routing it as design work, on the reasoning that **"immediate" was ruled for
> revoking somebody who should not be there, and non-payment is not that case.***
> **A grace period is a product decision with a money consequence, so no seat can
> rule it, and the design cannot be scoped before the policy exists.**

**THE CONSTRAINT THAT BINDS WHATEVER HE RULES, and it is recorded in
`lib/auth/gate.ts` rather than only here:** **the allowlist stays the single
authority on admission.** *A gate consulting both the allowlist and a payment fact
would hold two authorities on one question — and this repo already has a worked
example of two individually correct guards where one silently disabled the other.*
**The page carries the payment fact; the gate carries the allowlist.**

> **AND THIS ENTRY IS NOT THE WARNING — IT IS A COPY OF IT.** *Whoever wires
> payment will be working in `lib/auth/` and will not open this file, so the
> caution is written into the gate's own docblock where the trigger is pulled.*
> **Same correction Integration made about the `whyNot` dependency in
> `docs/web/README.md` §4b, applied at the moment of writing rather than after.*

---

## 4. THE RECOMMENDATION THAT MAKES MOST OF THIS UNNECESSARY FOR NOW

**INVITE THE FIRST PAYING USERS BY HAND, AND SAY SO ON THE PAGE.**

*Integration suggested this might be the honest answer; having read the code, I
think it is the right one, and for a reason stronger than "it is less work".*

- **A SELF-SERVE CHECKOUT WOULD MAKE A LIVE PUBLIC SENTENCE FALSE.** *Read from
  the live page today, not from the source:* **"There are no public sign-ups. An
  invite request goes to the operator by email and is answered by a person."**
  *`app/page.tsx:432`, and verified on the wire at `tmitrader.com`.* **That is a
  published claim, so this is not a preference about posture — shipping a buy
  button without changing that paragraph publishes a falsehood, and changing it
  is a copy decision with its own argument to make.**
- **Every page in §1 except pricing exists to replace a person**, and at one to
  ten users the person is better: **faster, no vendor, no webhook, no failure
  mode, and no post-payment landing page needed because nobody is left waiting
  in a browser.**
- **It removes the §3 problem entirely.** *If a human invites, the allowlist is
  updated before the person ever signs in, so `refused` never fires for a paying
  customer and no second authority on admission is needed.*
- **It does not defer the legal work** — §2 is owed at the first charge either
  way — **and it does not defer the licence question, which §2 shows was already
  owed.**

> **WHAT THIS WOULD ACTUALLY NEED: a pricing page that ends in "ask for access"
> rather than a checkout, and an invoice sent by a person.** *Two artefacts, one
> of which exists as a `mailto:`.*

**THE CONDITION THAT ENDS IT, written as a condition rather than a date:**
**self-serve becomes worth building when he no longer wants to read the emails**
— when the manual step is the thing rate-limiting sign-ups, not when a user
count is reached. *Same shape as the arbitration clause in the terms, deferred
until a class is possible rather than until a date.*

---

## 5. 🟠 WHAT THIS PUTS IN FRONT OF HIM

**One item, and it is here because the terms file instructed whoever reached
this moment to raise it rather than let it appear later as a legal review from
nowhere.**

**The payment terms he deferred on 2026-09-18 as "not a priority" have hit their
written trigger.** *The adopted terms of service contain no billing, renewal,
refund, price-change or tax terms, and there is no terms of sale, refund policy
or cancellation policy at all. Nobody with a law licence has read any of it.*

**Three routes, and the choice is his:**

1. **Nothing yet** — the trigger is the first CHARGE, not the first scope. *The
   gap stays at zero cost until money moves.* **Legitimate, and the file's own
   wording supports it.**
2. **Draft a separate terms of sale** — *the existing terms stay adopted and keep
   rendering; the new document carries its own adoption.*
3. **Add payment terms to the terms of service** — **this is a material redraft
   of an adopted document, so `adopted` goes to null and `/terms` renders the
   DRAFT banner to the public until he re-adopts.** *Flagged because it is the
   one route that changes a live public page before he has decided anything.*

**Nothing is needed from him to continue scoping.** *This is recorded so it is
not discovered by a stranger's lawyer instead.*
