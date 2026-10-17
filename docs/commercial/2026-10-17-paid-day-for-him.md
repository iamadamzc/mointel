# For your yes: the paid day, in words

**Commercial-tmi, 2026-10-17 (UTC). Exact words, nothing here is live.** They follow your ruling that a paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next, so weekends and market holidays fall inside the next trading day's paid day (Integration chat, your messages of 2026-10-17T10:40:26Z and 10:55:28Z, and your "1, see my comment before"). They were written against Billing's scope of the code, and Billing has since confirmed two facts in its fold build: a session can run until the next trading day's 8:00pm ET, and a plan whose period ends on a weekend is charged at the period end and covered through the next trading day. Sources, all read: Marketing `71a5514a` and `4f88e995`, and `docs/commercial/2026-10-17-paid-day-strings.md`.

**What this means for a buyer, so you can check the words say it.** Signing in on a Saturday, a Sunday or a market holiday is charged $5.50, for the next trading day's paid day. Signing in more than once in the same paid day is one charge. Buying a Daily on a weekend charges $5.50 at checkout, for Monday. A plan whose period ends on a weekend keeps access to the next trading day's 8:00pm ET, and the weekend is not charged twice. The free trial does not change.

**Withdrawn, do not build:** the closed-day Daily words (Marketing `1182369a`): "Charged now: Nothing", the "First charge" row, the changed button sentence and the changed "You're in". No paid day ends on a closed day any more.

## The pricing page

**The paid-day paragraph.**
Now: `A paid day runs from 8:00pm ET to 8:00pm ET the next day. Its first report is the one going into the next premarket. There is no charge for a paid day that ends on a day the US market is closed.`
Becomes: `A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next. Weekends and market holidays belong to the paid day that follows, so Monday's paid day runs from 8:00pm ET Friday to 8:00pm ET Monday. Its first report is the one going into the next premarket. You are charged once for a paid day, on your first sign-in in it.`

## The checkout page

**The sentence beside the Daily pay button.**
Now: `You will be charged {amount} now, and automatically on each new paid day you sign in on, on this card, until you stop. A paid day runs 8:00pm ET to 8:00pm ET. No refunds. You can stop in the desk at any time.`
Becomes: `You will be charged {amount} now, and automatically on each new paid day you sign in on, on this card, until you stop. A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next, so a purchase on a weekend or market holiday is for the next trading day. No refunds. You can stop in the desk at any time.`

## After you pay

**A plan, "You're in".**
Now: `You were charged {amount} for {for}. Your plan runs to {endTime}, and renews then unless you cancel.`
Becomes: `You were charged {amount} for {for}. Your plan runs to {endTime}, and renews unless you cancel.`
Why: when a period ends on a weekend, the plan runs to Monday 8:00pm ET but the renewal is charged on the Saturday, so "renews then" would name the wrong moment. The renewal date is on the checkout page and the billing page.

**A Daily retry succeeds.**
Now: `Payment received. You're set for today.`
Becomes: `Payment received. You're set for this paid day.`

**After removing the card, Daily.**
Now: `Your card is removed. You will not be charged again. If you have already paid for today, access ends at {endTime}.`
Becomes: `Your card is removed. You will not be charged again. If this paid day is already paid for, access ends at {endTime}.`

## When a Daily payment does not go through (no day word, because the screen can be seen two days later)

- The update-your-card screen. Now: `Today's payment of {amount} didn't go through.` Becomes: `Your payment of {amount} didn't go through.`
- The bar across the top, amber and red. Now: `Today's payment didn't go through. Your session ends at {time}, {n} min left.` Becomes: `Your payment didn't go through. Your session ends at {time}, {n} min left.`
- The first notification. Now: `Today's payment didn't go through. Your session ends at {time}.` Becomes: `Your payment didn't go through. Your session ends at {time}.`

## Terms of sale

**Section 1, the paid day.**
Now: `A paid day runs from 8:00pm ET to 8:00pm ET the next day, the same window your session already uses. A plan covers every paid day in its period.`
Becomes: `A trading day is a day the US stock market is open. A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next. Weekends and market holidays belong to the paid day that follows, so Monday's paid day runs from 8:00pm ET Friday to 8:00pm ET Monday, and signing in on a Saturday is signing in on Monday's paid day. A plan covers every paid day in its period.`

**Section 1, added after the paragraph that counts a month.** `If the last day of a plan falls on a weekend or a market holiday, your access runs to 8:00pm ET on the next trading day.`

**Section 2, the pay-only-for-days sentence.**
Now: `You pay only for the paid days you sign in on.`
Becomes: `You pay only for the paid days you sign in on, and only once for each: signing in again on the same paid day is not charged again.`

**Section 2, the closed-day paragraph.**
Now: `There is no charge for a paid day that ends on a day the US stock market is closed, such as a weekend or a market holiday.`
Becomes: `A paid day always ends on a trading day. If you sign in on a Saturday, a Sunday or a market holiday, you are charged for the paid day that follows.`

**Section 3, added after the paragraph that starts "A plan renews automatically".** `A renewal is charged on the date your period ends. If that date is a weekend or a market holiday, your access for the period you paid for runs on to 8:00pm ET on the next trading day, and the new period still ends on its own date, so you do not pay twice for those days.`

## Privacy policy, section 2, the session cookie

Now: `A sign-in after 20:00 runs until 20:00 the following day, because a session that has already expired is not a session. It follows the calendar day rather than the trading day, so a Saturday sign-in ends at 20:00 that Saturday.`
Becomes: `A sign-in after 20:00 can run until 20:00 the next trading day, because a session that has already expired is not a session. It follows the trading day rather than the calendar day, so a sign-in on a Saturday, a Sunday or a market holiday can run until 20:00 on the next trading day: up to 72 hours over a weekend, and longer over a holiday weekend.`
This changes a sentence in the adopted policy, so it goes into the same adoption motion as the other privacy changes.

## Unchanged, checked

The hero line "$5.50 for each day you sign in" (a Saturday sign-in is a charged day now, and a plan still costs less per trading day), the plan prices and their footnote, the trial and all its words, "Charged today / $5.50 for one paid day", "Each new paid day you sign in on", and "Next charge: None. There is no card on file." (Marketing `f4cb40a6`, read 164a).
