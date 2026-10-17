---
title: Terms of sale
status: DRAFT, not adopted
adopted: null
drafted: 2026-10-17
---

<!--
  DRAFT. NOT SERVED. This file is not in lib/legal/document.ts's FILES map, so
  /terms-of-sale does not render it and nothing links to it. It goes live only on
  his word, as one motion with the pointer sentence in terms.md and the
  checkout link ("drafting and adoption are one motion", terms.md's own rule).

  REPLACES the held draft docs/legal/terms-of-sale-daily-pass.md (2026-09-30),
  which covered the daily pass only. That file is kept, marked superseded.

  DRAFTED 2026-10-17 by Commercial (7th tenure) from his rulings, read at his
  turns through Integration and in this seat's session:
    - daily $5.50; monthly $89; six months $499; annual $899
    - the paid day runs 20:00 ET to 20:00 ET; charge at sign-in, in the
      background; no charge for a paid day on which the US market is closed
    - a failed charge gives one hour "regardless of time", counted once from
      the first failure; retry only when the card is updated; a lapsed hour ends
      only that day's session
    - "yes auto renew, make easy cancel. plans renwe on their own. no refunds."
    - "a month is as it is according to the market"
    - the sentence "If a charge was made in error, or the service was
      unavailable for a paid day through our own fault, contact
      desk@tmitrader.com and we will make it right." stays (his "yes to
      all", 2026-10-17T00:01:01.558Z, through Integration)

  FOLDED 2026-10-17 (Commercial, 8th tenure), from text he approved word for word
  (Integration chat bf3b407e, uuid 622497ba, "1, yes", 2026-10-17T11:04:55.669Z):
    - the free trial row in section 1's table, section 2's first sentence, and section 9
      (docs/commercial/2026-10-17-free-trial-strings.md section 2), with the sentence
      "A free trial is not available to an account that has already bought a day or a plan."
    - the trial's length in Marketing's wording (b3288fdc): "48 hours, not counting weekends
      and market holidays" (his turn, uuid 98d98873, rejected "of trading days"), and the exact
      stop times, which match lib/billing/trialClock.ts at f23e4422.
  NOT YET REWORDED: the paid day. His ruling of 2026-10-17 (uuid 5c1bc71e) makes weekends
  and holidays part of the next market day's paid day; sections 1 and 2 still carry the
  old 8:00pm to 8:00pm text and the closed-day sentence until Billing's scope of the code
  is in. Word against that scope, not ahead of it.

  BRACKETED ITEMS ARE NOT DECIDED. Each says who decides. Nothing in brackets
  ships as written.
  [PRICE CHANGE NOTICE] ANSWERED 2026-10-17: 30 days (his "4, yes", uuid 6c3dc8f3,
        2026-10-17T00:12:10.134Z, through Integration). No longer bracketed.
  [TAX] his accountant: whether prices include or exclude sales tax and what the
        checkout shows.
  [MONTH] ANSWERED 2026-10-17: "3, a": from the day you buy (the 17th to the 17th).
        No longer bracketed.
  [RECORDS] his accountant: how long the record of each charge is kept.
  [ATTORNEY] his attorney reads this whole file before it is adopted.
-->

# Terms of sale

This says what you are buying, how and when you are charged, how to stop, and
what happens if a charge fails. It applies alongside the
[Terms of service](/terms) and the [Privacy policy](/privacy).

## 1. What you are buying

Access to the desk, for a paid day or for a plan. Prices are in US dollars.

| What | Price | How long |
| --- | --- | --- |
| Daily | $5.50 | one paid day |
| Monthly | $89 | one month |
| Six months | $499 | six months |
| Annual | $899 | one year |
| Free trial | no charge | 48 hours, not counting weekends and market holidays, once |

[TAX: his accountant decides whether these prices include sales tax and what
the checkout shows.]

A paid day runs from 8:00pm ET to 8:00pm ET the next day, the same window your
session already uses. A plan covers every paid day in its period.

A month is a calendar month counted from the day you buy it. A plan bought on
the 17th runs to 8:00pm ET on the 17th of the next month. Six months and a
year count the same way.

## 2. Daily: how the charge works

You save a card when you buy your first paid day. From then on, each new paid day
you sign in on is charged automatically to that card. You are not asked to
approve each charge. You pay only for the paid days you sign in on.

There is no charge for a paid day that ends on a day the US stock market is
closed, such as a weekend or a market holiday.

**You are given access before the charge is confirmed.** If the charge fails,
you keep access for **one hour** from the failed attempt, whatever time of day
that is. If the card has not been fixed by then, your session ends for that
day. Signing in again is refused until the card is fixed. We do not retry a
failed charge on our own; it is tried again when you update your card. A new
paid day tries the charge afresh.

## 3. Plans: they renew on their own

A plan renews automatically at the end of each period, for a period of the same
length, and charges the card you saved. It keeps renewing until you cancel
(section 4). While a plan is active you are not charged the daily price.

Before you buy, the page shows the price, the date of the first renewal, and
how to cancel.

If we change the price of a plan, the new price starts at your next renewal.
We will tell you in the desk and on the pricing page at least
30 days before.

If you buy a plan while you are paying daily, days you have already paid for
are not credited against the plan.

If a renewal charge fails, you keep access for **one hour** from the failed
attempt, whatever time of day that is. After that your plan has ended and your
session ends. Signing in again is refused until you update your card.
After that, each paid day is charged at the daily price, unless you buy a plan
again.

## 4. How to stop

**Cancel in the desk, on the billing page, in one step.** You do not need to
email us or call.

- **A plan:** cancelling stops it renewing. You keep access to the end of the
  period you paid for.
- **Daily:** removing your card stops the daily charge. It takes effect for the
  next paid day. It does not interrupt a day you have already been charged for.

If you cannot reach the billing page, email desk@tmitrader.com and we
will do it for you.

## 5. No refunds

All charges are final. We do not refund a paid day, a plan, or the unused part
of a plan, including after you cancel.

If a charge was made in error, or the service was unavailable for a paid day
through our own fault, contact desk@tmitrader.com and we will make it
right.

## 6. Disputes

If you dispute a charge with your card provider instead of contacting us
first, we are not able to reverse that automatically; please reach out to
desk@tmitrader.com so we can resolve it directly.

## 7. Changes to these terms

If we change these terms in a way that matters, we will tell you in the desk
before the change applies to you. A change applies from your next renewal, or
your next paid day if you pay daily.

## 8. Who you are buying from

TMI is developed and sold by Andromeda Genius LLC, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX
78240, United States. You can reach a person at desk@tmitrader.com.

## 9. The free trial

You can try the desk free for 48 hours, not counting weekends and market
holidays. The clock stops from 8:00pm ET on Friday until 8:00pm ET on Sunday, and for a market holiday from
8:00pm ET the evening before until 8:00pm ET on the holiday. Each person can
take the trial once, and each card can start a trial once.

To start, you enter a card. We use it to check that it has not already been
used for a trial. **We do not charge it, now or when the trial ends, and we
never will.** As soon as it has been checked, we ask Stripe, our payment
processor, to remove it from your account, so it cannot be charged. We do not
see your card number and we do not keep your card. Stripe, which takes the
card, keeps a record of it under Stripe's own privacy policy. Your bank may
show a small pending amount while the card is checked. It is not a charge, and
we never take it.

We keep one code that identifies the card, Stripe's reference number for the
check, and the time the trial started, with your account. We use them only to
stop the same card starting a second trial. We keep them for as long as we
offer the free trial, including after you close your account, because
otherwise the same card could start a second trial.

When the 48 hours end, your access ends. Nothing is charged and nothing
renews. To keep using the desk, you buy a day or a plan and enter a card then.

The 48 hours are counted from the moment the trial starts, and only while the
clock is running, as set out above. In a week with no market holiday, a trial
that starts on a Thursday at 10:00am ET ends on the Monday at 10:00am ET. We
show you the end time when the trial starts.

If the card cannot be checked, or has already been used for a trial, the trial
does not start. A free trial is not available to an account that has already
bought a day or a plan. We may refuse or end a trial if the same person is
using more than one account.
