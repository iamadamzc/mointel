---
title: Terms of sale — daily pass
status: DRAFT, awaiting his adoption
drafted: 2026-09-30
---

<!--
  DRAFTED 2026-09-30, under time pressure ("everything pending to go tonight",
  his ruling, verified at his own turn, 4689366c, 2026-09-30T15:47:13Z), because
  daily billing is BUILD APPROVED and sequenced to ship tonight after the
  sign-in cut-over, and it has no terms-of-sale document at all today.

  WHY A SEPARATE DOCUMENT, NOT A REDRAFT OF THE ADOPTED docs/legal/terms.md:
  that file's own banner rule says a material redraft sends `adopted` back to
  null and puts a DRAFT banner on the whole in-force document until he adopts
  again — a much larger blast radius than tonight's question needs, and this
  seat's own earlier recommendation (2026-09-26-billing-onboarding-support-
  scope.md §7 item 3) was a separate document for exactly this reason. Unruled
  until now; ruling by necessity, under the stated deadline, not reopening it.

  WHAT THIS SATISFIES: docs/commercial/daily-billing-design/commercial.md §1,
  the four sentences Stripe's own compliance text requires for saving a card
  for off-session charges (docs.stripe.com/payments/save-and-reuse), applied
  to this specific shape (charge attempted once per paid day without fresh
  authorisation each time; access granted before the charge is confirmed and
  can end mid-session; the one-hour number stated as a number; cancellation).

  WHAT IS THIS SEAT'S RECOMMENDATION, NOT A RULING, AND NAMED AS SUCH: the
  no-refund-for-a-completed-day default. daily-billing-design/commercial.md §4
  found no day-pass-specific comparable, but the principle every comparable on
  file shares (Seeking Alpha's own terms) draws the refund line at consumption
  — a short window before the product is used, none after. By the time a paid
  day has ended, that day's reports have already been delivered in full, which
  is the logical limit of that same principle. This seat does not rule refund
  policy; it is his, same as it has been every time this document set has
  reached it.

  ADOPTION: this document goes live (a link from the card-save page, and from
  terms.md via a pointer sentence added at the same time) only on his word. If
  he wants a different refund shape, this text changes before it ships, not
  after — "drafting and adoption are one motion" (terms.md's own rule) applies
  here by the same reasoning, not just to the parent document.
-->

# Terms of sale — daily pass

This describes how a paid day works and what happens if a charge fails or you
change your mind. It applies alongside the [Terms of service](/terms) and
[Privacy policy](/privacy).

## 1. What a paid day is

A paid day runs from 8:00pm ET to 8:00pm ET the next day — the same window
your session already uses. Signing in starts a new paid day if the last one
has ended; if you are already inside a paid day, signing in again does not
charge you again.

## 2. How the charge works

You save a card when you first sign in. From then on, each new paid day is
charged automatically to that card — you are not asked to approve each charge
individually. **You are given access before the charge is confirmed.** If the
charge fails, you keep access for **one hour** from the failed attempt,
regardless of what time of day that is; if the card has not been fixed by
then, your session ends for that day. Signing in again is refused until the
card is fixed.

## 3. If you want to stop

You can remove your card, or ask us to stop billing you, at any time by
emailing [CONTACT]. This takes effect for the next paid day — it does not
interrupt a day you have already been charged for.

## 4. Refunds

[HIS TO SET. Recommended default, not yet ruled: no refund for a paid day
that has already run its course — by the time a day ends, that day's reports
have already been delivered in full. If a charge was made in error, or the
service was unavailable for a paid day through our own fault, contact
[CONTACT] and we will make it right.]

## 5. Disputes

If you dispute a charge with your card provider instead of contacting us
first, we are not able to reverse that automatically — please reach out to
[CONTACT] so we can resolve it directly.
