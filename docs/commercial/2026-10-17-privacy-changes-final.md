# The privacy policy changes for the paid product: the final set

**Commercial-tmi (8th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** One list, in the order the policy reads, so he sees every changed line once. It replaces section 3 of `2026-10-17-purchase-strings.md` and section 3 of `2026-10-17-free-trial-strings.md`, and puts read 163's lines in the form he chose: **customer record kept for the life of the account** (his "3, a", Integration chat bf3b407e, uuid d600c7d1, 2026-10-17T10:57:12.305Z, checked at his turn). The email sign-in lines (the link is never stored, records and the IP hash deleted after 30 days, one cookie) stay in `2026-10-17-email-signin-strings.md` and are part of the same motion. Public copy: these exact strings go to him, never a summary. **Two sentences changed after his first yes, by his second yes** (Integration chat bf3b407e, uuid 86158214, 2026-10-17T11:40:41.785Z): "we never charge it" and "it is never charged" became "the trial never charges it", because the first form is false for a person who later buys with the same card (read 166b).

**One motion.** The adopted file says a material redraft sets `adopted` back to null and shows the draft banner until he adopts again, so these lines, the terms of sale, the pointer sentence in `terms.md` and the front page words are adopted together at go-live. Brackets are facts only he or his accountant or attorney can fill.

**The session cookie sentence, folded 2026-10-17 (ninth tenure)** from the text he approved word for word (Integration chat bf3b407e, uuid ebe864a6, "1, yes. 2, a.", 2026-10-17T12:15:21.014Z, checked at his turn; `docs/commercial/2026-10-17-paid-day-for-him.md` at `b63d7235`): see "Section 2, the session cookie" below. The charge text the new paid day changes is in the terms of sale (`docs/legal/terms-of-sale.md`, sections 1 to 3), not in this set.

## Section 2, what we collect

**After "When you use the desk.", a new paragraph:**
"**When you pay.** Stripe, our payment processor, collects your card details and billing postal code on its own page. We never receive your card number. To take payment we create a customer record for you at Stripe, with your email address and our number for your account, and we keep a link to it with your account. Stripe gives us a customer reference, a payment-method reference, and the result of each charge: the date, the amount, the plan, and whether it was paid or declined. We keep those so the desk can show your billing history and run your plan."

**After that, a new paragraph:**
"**When you start a free trial.** When you press Start free trial, we create a customer record for you at Stripe, with your email address and our number for your account, and we keep a link to it with your account. It exists even if you do not finish or the trial cannot start. You then enter a card on Stripe's page. Stripe checks it, and we ask Stripe to remove it from your account at once; the trial never charges it. We never receive your card number. Stripe gives us a code that identifies the card. We keep that code, Stripe's reference number for the check, and the time the trial started, with your account, so the same card cannot start a second trial. We keep them for as long as we offer the free trial, including after you close your account. Stripe keeps a record of the card, including its brand, last four digits and expiry date, under its own privacy policy."

**After that, a new paragraph:**
"**If a free trial cannot start.** The card is still removed from your account at once, the trial never charges it, and we do not keep a code for it. We keep a short record of the attempt: Stripe's reference for the check, your account, the reason it could not start, and the time. We delete this record 30 days after the attempt. Your customer record at Stripe and our link to it are not part of this record; section 6 says how long they are kept."

## Section 2, the session cookie (changes a sentence in the adopted policy)

Now: "A sign-in after 20:00 runs until 20:00 the following day, because a session that has already expired is not a session. It follows the calendar day rather than the trading day, so a Saturday sign-in ends at 20:00 that Saturday."

Becomes: "A sign-in after 20:00 can run until 20:00 the next trading day, because a session that has already expired is not a session. It follows the trading day rather than the calendar day, so a sign-in on a Saturday, a Sunday or a market holiday can run until 20:00 on the next trading day: up to 72 hours over a weekend, and longer over a holiday weekend."

## Section 3, what we do not collect

**The last bullet.** Now: "We do not ask for your date of birth, your address, your phone number, or any government identifier." Becomes: "We do not ask for your date of birth, your phone number, or any government identifier. When you pay, Stripe asks for your card details and billing postal code on its own page."

## Section 4, why we hold it, two new bullets

"**To take payment.** Stripe's references and the record of each charge are how we charge your card, show you what you paid, and end a plan when you cancel."

"**To stop the free trial being taken twice.** The card code is kept for this and for nothing else."

## Section 5, who else sees it, one new row

| Who | What they handle | Why |
| --- | --- | --- |
| Stripe, Inc. | Your email address, your card details, billing postal code, the record of each charge, and the check of a card for a free trial | It is the payment processor. The card number never reaches our servers. |

## Section 6, how long we keep it, four new bullets

- "**The record of each charge**: [RECORDS: his accountant sets the period]."
- "**A free trial that could not start**: deleted 30 days after the attempt. It holds Stripe's reference for the check, your account, the reason it could not start, and the time."
- "**The card code from a free trial**: kept for as long as we offer the free trial, including after you close your account."
- "**Your customer record at Stripe, and our link to it**: for as long as you have an account. If you ask us to delete your account, we delete both. Stripe keeps its record of each charge under its own privacy policy."

*Dependency, not a word:* "we delete both" is a promise. Until Billing builds it, Ops and Billing need a written manual step that deletes the Stripe customer and our link when an account is closed. Without it this bullet is false on the first request.

## Section 7, your rights, the deletion bullet

Add after "Delete it. Ask, and we close the account and delete the record. This cannot be undone, and it ends your access.":
"The exceptions are the card code from a free trial, Stripe's reference for the check, and the date, which we keep for the reason in section 2: otherwise the same card could start a second trial. Stripe keeps its own record of each charge under its own privacy policy." [ATTORNEY: whether the policy may keep these after a deletion request, and whether it must name a legal basis.]

## Section 8, where the service is, and who it is for

Now: "**We do not offer it to the public anywhere.** Access is by invitation, which is how the scope above stays a fact rather than a sentence: we choose who is invited."
Becomes: "**We sell it to anyone who pays.** It is made for people trading the US market, and the service and your data stay in the United States."
The paragraph that follows stays.

## What is not in this set

- The pointer sentence in `terms.md` and the terms of sale (`docs/legal/terms-of-sale.md`, sections 1 to 9): separate files, same motion.
- The refused-trial page (Marketing `06fd4a78`, read 161a) and the terms of sale section 9 sentence "A free trial is not available to an account that has already bought a day or a plan." They go to him with this set.
- Whether Stripe keeps the email on a deleted customer for its own legal reasons: not read. The bullets promise only what we do and say Stripe keeps its record of charges under its own policy.
