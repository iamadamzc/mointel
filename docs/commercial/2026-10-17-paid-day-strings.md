# The paid day, after his ruling: my strings

**Commercial-tmi (8th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** Worded against Billing's scope (`paid-day-fold-scope.md`, line numbers at `f23e4422`, which I read in full), not ahead of it. His ruling: Integration chat bf3b407e, uuid 5c1bc71e, 2026-10-17T10:55:28.221Z ("weekends will contain the premarket report ... a day starts in the time after AH, and that would include a non market day"), restated by Integration and accepted at uuid d600c7d1 ("1, see my comment before"). Public copy: the exact strings go to him, never a summary. Marketing writes the pricing page's sentences; the definition in section 1 is theirs (`71a5514a`), taken word for word so the pricing page, the checkout sentence and the terms say the same thing. One name throughout: "trading day", the pricing page's own term; "market day" is not used.

## What the code will do, in the words I rely on (Billing's scope)

- Every instant belongs to the next trading day's paid day. A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next. Monday's paid day runs Friday 8:00pm ET to Monday 8:00pm ET (72 hours). The Friday after Thanksgiving runs Wednesday 8:00pm ET to Friday 8:00pm ET.
- No paid day ends on a closed day, so "a paid day that ends on a closed day is free" goes away. A weekend sign-in is charged $5.50, for Monday. A Daily bought on a weekend is charged at Checkout, for Monday. Friday night plus Saturday plus Monday is one charge.
- The session runs to 8:00pm ET on that trading day (up to 72 hours, longer over a holiday). A plan whose period ends on a Saturday runs to Monday 8:00pm ET.
- The trial does not change (his answer in Billing's chat, uuid 9ed3b1e7): weekends and holidays are not counted.

## 1. Terms of sale, section 1

**Replace** "A paid day runs from 8:00pm ET to 8:00pm ET the next day, the same window your session already uses. A plan covers every paid day in its period." **with:**

"A trading day is a day the US stock market is open. A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next. Weekends and market holidays belong to the paid day that follows, so Monday's paid day runs from 8:00pm ET Friday to 8:00pm ET Monday, and signing in on a Saturday is signing in on Monday's paid day. A plan covers every paid day in its period."

**Add after the paragraph that counts a month:** "If the last day of a plan falls on a weekend or a market holiday, your access runs to 8:00pm ET on the next trading day."

## 2. Terms of sale, section 2

**Replace** "You pay only for the paid days you sign in on." **with:** "You pay only for the paid days you sign in on, and only once for each: signing in again on the same paid day is not charged again."

**Replace** the paragraph "There is no charge for a paid day that ends on a day the US stock market is closed, such as a weekend or a market holiday." **with:** "A paid day always ends on a trading day. If you sign in on a Saturday, a Sunday or a market holiday, you are charged for the paid day that follows."

## 3. Privacy policy, section 2, the `mointel_session` cookie

(An adopted document. This is a material change to a sentence that is true today, so it joins the adoption motion and the draft banner.)

**Replace** "A sign-in after 20:00 runs until 20:00 the following day, because a session that has already expired is not a session. It follows the calendar day rather than the trading day, so a Saturday sign-in ends at 20:00 that Saturday." **with:**

"A sign-in after 20:00 can run until 20:00 the next trading day, because a session that has already expired is not a session. It follows the trading day rather than the calendar day, so a sign-in on a Saturday, a Sunday or a market holiday can run until 20:00 on the next trading day: up to 72 hours over a weekend, and longer over a holiday weekend."

## 4. The sentence beside the Daily pay button (`CHECKOUT.legalDaily`)

**Now:** "You will be charged {amount} now, and automatically on each new paid day you sign in on, on this card, until you stop. A paid day runs 8:00pm ET to 8:00pm ET. No refunds. You can stop in the desk at any time."

**Becomes:** "You will be charged {amount} now, and automatically on each new paid day you sign in on, on this card, until you stop. A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next, so a purchase on a weekend or market holiday is for the next trading day. No refunds. You can stop in the desk at any time."

True on a weekend too: Checkout charges the $5.50 then, for Monday. So the closed-day variants (reads 159, 159a, 159b, Marketing `1182369a`: "Charged now: Nothing", the "First charge" row, the changed button sentence, the changed "You're in") are **obsolete and must not be built**. The plan sentence (`legalPlan`) does not define the day and does not change.

## 5. For Marketing and Web (their words, my truth constraints)

- `/pricing`, `PRICING.paidDay`: the two false sentences are "A paid day runs from 8:00pm ET to 8:00pm ET the next day" and "There is no charge for a paid day that ends on a day the US market is closed." Section 1's definition is true and short enough to use as written; keep "Its first report is the one going into the next premarket" only if still true of a weekend (the weekend report goes into Monday's premarket, which is the reason he gave).
- The checkout "Charged today" row stays "$5.50 for one paid day"; the Daily "Renews" row ("Each new paid day you sign in on") stays true.
- "You're in" and the billing page show an end time (`{endTime}`, "Paid through"): on a weekend purchase it names Monday, "8:00pm ET on Monday, October 19". True under the fold; Web and Design check the build, I read the built screens.
- The hero line "$5.50 for each day you sign in" is still true; a Saturday sign-in is a charged day now. The break-evens in read 162 are unchanged: one charge per trading day at most.
- Anything that says the weekend is free, a closed-day sign-in costs nothing, or a paid day is "8:00pm ET to 8:00pm ET" is now false.

## 6. Questions that are not words

1. **The calendar fallback (scope, "One design choice").** If the calendar cannot be read at sign-in, the session ends 20:00 that calendar day, shorter than section 3 says. "Runs until" would then be too long in that rare case, so section 3 says "can run until", true as a ceiling either way. Billing to confirm whether the fallback exists; the words do not wait on it.
2. **A plan renewing on a weekend.** A period that ends on a Saturday keeps access to Monday 8:00pm ET, and the renewal charge is taken at the period end (a Saturday). Billing to confirm the renewed period then does not also run from Saturday, which would make Saturday to Monday paid twice or the new period shorter by a day. The terms' "A plan covers every paid day in its period" depends on the answer.
3. **Existing weekend rows across the deploy** (scope, "Rows that exist across the switch"): no words needed.
