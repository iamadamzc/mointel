# Day pass, part 2 — the annual shape only

**Written by Commercial, 2026-09-27, against `aedde77`.** Follow-up to the day-pass
addendum, on his rulings, verified at his own turn (`list_events`, not the relay
alone): *"1... the day starts at 830 pm with a fresh report on ah. 2, yes. 3, every
single day. i will not do monthly. we can do daily, or annual."* **Recorded: monthly
is refused, in those words — struck as refused, not merely unpicked. The two shapes
left are daily and annual.** This document covers only what was asked: the annual
shape. Document only, no price proposed, nobody contacted.

---

## 1. THE $0.30 FEE, ONCE A YEAR

**Trivial, and the contrast with daily is the whole point.** Stripe's published rate
(`stripe.com/pricing`, already quoted): $0.30 fixed + 2.9% per charge. **Charged once
a year, the fixed fee is $0.30 total** — the exact drag that argued against a bare
daily-only model in the first addendum (20 logins a month = $6.00 in fixed fees alone)
simply does not exist for an annual charge. **This is the strongest economic argument
for offering annual at all: it is the one shape where the per-transaction fixed cost
stops mattering.**

---

## 2. HOW A DAILY CHARGE AND AN ANNUAL CHARGE COEXIST FOR ONE PERSON

**Not a payments problem — Stripe charges a saved card the same way whether it's a
$9 daily charge or a $99 annual one, and one customer object can hold both kinds of
charge history with no conflict (`docs.stripe.com/payments/save-and-reuse`, already
quoted).**

**CORRECTED 2026-09-27, Integration's catch, verified — this document first said
daily billing needs a new admit-then-revoke cycle built from scratch. Wrong: the
day boundary already exists, built for a different reason, well before any billing
question was asked.** `lib/auth/store.ts:348-360`, `createSession`: *"TAKES AN
ABSOLUTE EXPIRY, NOT A DURATION, and that is his ruling rather than a
preference... 'a session should persist all day until the close of after hours' is
a boundary, not a length."* `lib/auth/expiry.ts:51`, `sessionExpiry`, computes that
boundary from his 2026-09-10 ruling; `lib/auth/callback.ts:145-146` calls it on
every sign-in and hands the result straight to `createSession`. **A session already
dies on its own at the day's close, for every user, today — nothing has to be
revoked or cycled, because nothing has to be told to stop.** (The same file
already flags the exact edge this seat separately raised in the first addendum,
unprompted: *"signing in at 21:00 on Monday and working until 20:00 Tuesday is one
session — is it one charged day or two?"* — his own code already names this as an
open billing question, not something this seat discovered.)

**So the real question is narrower than this document first made it: not whether a
session ends on time — it already does — but whether anyone checks payment BEFORE
one is issued at all, which nothing in the codebase does yet.** Both shapes need a
new check inserted at the identical point, `callback.ts`, between confirming
someone is invited and calling `createSession` — **but the checks are not the same
kind of check, and that is where the real difference lives:**

- **Daily needs a LIVE payment-processor call inside the login path.** Either charge
  the stored card at the moment of sign-in, or confirm an earlier charge already
  succeeded for today — either way, a synchronous or near-synchronous dependency on
  Stripe sits between "wants to log in" and "is logged in," for every user, every
  day. **That is a new failure mode this desk does not have today: a slow or down
  payment processor at 20:30 ET blocks logins, not just billing.** A declined card
  refuses entry cleanly (§3 of the first addendum still holds); a *slow* one is the
  case that document didn't name and this correction surfaces.
- **Annual needs a local database lookup, not a live call.** Compare today's date to
  a stored paid-through date — no external dependency in the login path at all. The
  charge itself happens once, in whatever checkout flow signs someone up or renews,
  entirely separate from the daily sign-in path.

**The corrected comparison: both shapes touch the same one call site in `callback.ts`
and neither needs new revocation machinery — the difference is that daily puts a live
external dependency into every single login, and annual does not.** That is still an
asymmetry, and it still argues the same direction as this document's earlier
(wrong) framing, but for the accurate reason: **not "daily needs new admit/revoke
cycling," but "daily needs a payment gateway in the critical path of every day's
first login, and annual doesn't."**

**So a person on daily and a person on annual are not the same case with a different
number attached — one requires new, recurring, per-subscriber automation on the
admission side; the other requires almost no change to admission and one new field
for renewal bookkeeping.** Not a recommendation between them; a statement of what each
actually costs to build, since he asked "how do they coexist" rather than "which is
cheaper."

---

## 3. REFUNDS AND CANCELLATION ON AN ANNUAL — ONE REAL COMPARABLE, QUOTED

**The terms-of-sale gap already flagged (first addendum §2, and the billing scope
before it) is more load-bearing here, not less — a year's charge taken up front is a
larger sum with no natural "it just expires" backstop the way a daily charge has.**
**One comparable in the same shape as this product (a paid, specific-security
commentary subscription, invite-adjacent, not a broker) states its policy plainly,**
Seeking Alpha's Terms of Use (`about.seekingalpha.com/terms`, read in full):

> *"Unless stated otherwise in writing, Subscription fees are nonrefundable... For
> subscription products offering a limited 30-day money back guarantee, you must
> cancel your subscription no later than one (1) day before the 30-day limited money
> back guarantee period expires in order to receive a refund for the remaining 11
> months of your subscription."*

**The shape, not the number:** nonrefundable by default, with an optional short
window (their number is 30 days) inside which a full year can still be walked back;
past that window, the remaining months are not refunded. **This is one comparable's
practice, quoted, not a recommendation** — the same three shapes named in the first
addendum's §3 (no refunds; pro-rated; a short unconditional window) still apply here,
and a short-window-then-nonrefundable annual is simply what the "short unconditional
window" option looks like when the unit is a year instead of a month.

**Cancellation, separately from refund:** cancelling an annual pass, absent a refund
right, most naturally means *no renewal* — access continues to the paid-through date
already established in §2, then lapses, rather than an immediate cutoff the way a
declined daily charge stops someone at the door. **This is consistent with his own
"every single day" versus annual distinction**: a daily pass's whole model is
pay-per-day with nothing owed past today; an annual pass, once paid, already covers
its year, and "cancelling" it is really "declining to renew."

---

## 4. IS AN ANNUAL BUYER "INVITED" THE SAME WAY A DAILY ONE IS?

**Yes, today, because the auth model's INVITE layer does not distinguish them at
all — and that is worth him knowing plainly rather than assuming a distinction
exists.** `invited_emails` is one boolean, with no notion of which plan admitted
someone or for how long. **An annual buyer and a daily buyer, once invited, are
indistinguishable to `isUserInvited` — both simply "invited," full stop, until
revoked.** That layer does not need to change for either shape (§2, corrected):
the per-day session boundary already exists and applies to both alike, regardless
of billing plan. **The only new bookkeeping either shape needs is which plan a
person is on and, for annual, when it lapses — a small addition either way, unlike
this document's earlier claim.** What is NOT symmetric, per §2's correction, is
where the payment check itself sits: daily's lives in the login path as a live
dependency; annual's is a one-time checkout and a subsequent local date check.

---

## SOURCES

`stripe.com/pricing`; `docs.stripe.com/payments/save-and-reuse`; `lib/auth/
store.ts` (`invited_emails` schema, `:162` session `expires_at`, `revokeEmail`,
`:348-360` `createSession`); `lib/auth/expiry.ts:51` (`sessionExpiry`);
`lib/auth/callback.ts:145-146`; `about.seekingalpha.com/terms`; this seat's own
`2026-09-27-day-pass-addendum.md`.
His rulings verified via `list_events` on the Integration session, not taken from the
relay alone.
