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
quoted).** **The real question is what the desk's OWN access state means when a
person is on one plan or the other, and today's code has an answer for neither,
because it has no concept of a paid-through date at all.**

Verified directly, `lib/auth/store.ts`: `invited_emails` carries exactly `invited_at`
and `revoked_at` — a person is admitted (`revoked_at IS NULL`) or not. **There is no
expiry, no duration, no "paid through" field anywhere in the schema.** The only
`expires_at` in the file (`:162`) belongs to a login *session* (a security timeout on
the browser cookie), not to billing — verified so as not to conflate the two the way
this seat's own earlier reading of a different file conflated capture with ranking.

**What this means for each shape, concretely:**

- **Daily, under his "every single day" ruling, needs something built that does not
  exist today: an automatic admit-then-revoke cycle running once per subscriber per
  day** — invite at the moment of charge, revoke at the day's own boundary (§1 of the
  first addendum; now his 20:30–20:30 shape). **This uses `revokeEmail`'s existing
  "immediate" mechanism, but as the ordinary daily off-boarding path for every paying
  subscriber, not the exceptional case (fraud, a ban) it was built for** — the same
  mechanism, a very different volume and pattern of use.
- **Annual needs almost nothing new.** Invite once at the moment of the charge, and
  leave the person invited — **exactly how the model already treats everyone today.**
  The only new work is a *separate* record of when the year is up, read by whatever
  process would prompt the renewal charge or the eventual revoke — **and that record
  does not have to be `invited_emails` itself; a paid-through date can live beside it
  without changing the admission check at all.**

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

**Yes, today, because the auth model does not distinguish them at all — and that is
worth him knowing plainly rather than assuming a distinction exists.** Per §2: the
admission check is one boolean, with no notion of which plan admitted someone or for
how long. **An annual buyer and a daily buyer, once invited, are indistinguishable to
`isUserInvited` — both simply "invited," full stop, until revoked.** The difference
between them lives entirely in bookkeeping the desk does not yet have: which plan a
person is on, and when the next charge or the next lapse is due. **Building daily
billing (§2) forces that bookkeeping to exist regardless of whether annual ships at
all** — the two are not independent features to choose between building; daily
billing is the one that requires the harder piece of infrastructure either way.

---

## SOURCES

`stripe.com/pricing`; `docs.stripe.com/payments/save-and-reuse`; `lib/auth/
store.ts` (`invited_emails` schema, `:162` session `expires_at`, `revokeEmail`);
`about.seekingalpha.com/terms`; this seat's own `2026-09-27-day-pass-addendum.md`.
His rulings verified via `list_events` on the Integration session, not taken from the
relay alone.
