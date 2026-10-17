# For your yes: the next words, exact

**Commercial-tmi (9th tenure), 2026-10-17 (UTC). Exact words, nothing here is live or adopted.** Each item says what is there now, what it becomes, and whether you approved the earlier text. Sources, all opened: Marketing `9ddd0d4e` and `05bbc477`, my files `2026-10-17-invitation-sentences.md` and `2026-10-17-privacy-changes-final.md`, the served `terms.md` and `privacy-policy.md`, and Billing's fix `5cec6660`.

**What this changes for a buyer.** Two lines on the desk stop saying "today", because a Saturday sign-in belongs to Monday's paid day. A person waiting for their free trial to be recorded sees "Your free trial", not "Your payment". The privacy policy gains one exception to deletion (our record of each charge). And the sentences that say access is by invitation are replaced, because the front page will say "Start free trial".

## 1. The desk: the screen for a removed card

Where: the line under the headline "Add a card to open the desk." Shown when someone who removed their card opens the desk and has not paid for this paid day.
Now (you approved this, Marketing `1b11c496`): `You removed your card, so nothing was charged today. A paid day costs $5.50. Add a card to continue. No refunds.`
Becomes: `You removed your card, so nothing was charged for this paid day. A paid day costs $5.50. Add a card to continue. No refunds.`
Why now: Billing's fix `5cec6660` sends a buyer who already paid this paid day to the board, not to this screen. I read that fix. It leaves two narrow cases where the word "nothing" is not exact: a charge still being confirmed when the card was removed, and a charge that was refunded. If you want the line to be true in those too, the alternative is `You removed your card. A paid day costs $5.50. Add a card to continue. No refunds.` (Marketing `eeb566fb`), which says nothing about charging and drops the clause you approved. My recommendation is the line above.

## 2. The desk: the checking screen, Daily

Where: the headline of the screen shown to a Daily buyer whose last payment failed or lapsed, while the new payment is confirmed.
Now (you approved this, Marketing `1b11c496`): `Checking today's payment...`
Becomes: `Checking your payment...`
The line under it, `The desk opens when the payment is confirmed.`, and the plan headline `Checking your plan's renewal...` do not change. This is the same step as the declined-payment lines you approved on 2026-10-17 (the "day" word dropped).

## 3. The wait screen after a free trial starts

Where: the page you land on after Stripe's card check, before the trial is recorded. Today it says "Your payment has not been confirmed yet.", which is wrong for a trial.
For a trial, the headline becomes: `Your free trial has not been confirmed yet.`
The body (`You are signed in as {email}. Reload this page to check again.`), the buttons `Reload` and `Sign out`, and the whole screen for a paid purchase do not change.
The link under it becomes: `Ask about your trial` (it opens an email to desk@tmitrader.com with the subject "Trial"). For a paid purchase it stays `Ask about your payment`, subject "Payment".
New text, not approved before. Marketing `05bbc477`.

## 4. The privacy policy, section 7, one more exception to deletion

Now (you approved this, `b0b5d164`): "The exceptions are the card code from a free trial, Stripe's reference for the check, and the date, which we keep for the reason in section 2: otherwise the same card could start a second trial. Stripe keeps its own record of each charge under its own privacy policy."
Becomes: "The exceptions are the card code from a free trial, Stripe's reference for the check, and the date, which we keep for the reason in section 2: otherwise the same card could start a second trial. We also keep the record of each charge, for the period in section 6. Stripe keeps its own record of each charge under its own privacy policy."
Why: without it the policy says we delete everything on request while our charge records stay for the books. The period in section 6 is your accountant's. [ATTORNEY: whether the policy may keep these after a deletion request, and whether it must name a legal basis.]

## 5. The "by invitation" sentences in the terms and the privacy policy

These are in the served pages today and become false when the front page says "Start free trial". They change in the same adoption as the terms of sale and the privacy set. Each Now is the served text.

**Terms, section 2, first bullet.**
Now: "**Access is by invitation.** There is no public sign-up, and an invitation is ours to give and ours to withdraw."
Becomes: "**Access is by purchase or by the free trial.** You buy on our [terms of sale](/terms-of-sale), which also say how the free trial works. We can refuse a sale, and we can end access as section 9 says."
You approved an earlier version ("Access is by purchase. Anyone who is 18 or older can buy it on our terms of sale..."). It is replaced: a trial account has access without a purchase, and "Anyone ... can buy it" contradicts the right to refuse a sale in the next sentence.

**Terms, section 2, second bullet.** No change. The earlier version you approved ("We take payment from anyone ...") is dropped for the same reason. The served text stays: "The desk covers the **US market** and is offered to people trading it. We do not market it anywhere else."

**Terms, section 2, third bullet.**
Now: "You sign in with a Google account. You need to be entitled to use that account."
Becomes: "You sign in with a Google account, or with a link we email you. You need to be entitled to use that account or that email address."
You approved this (your "1, yes" of 2026-10-17T03:54:19.866Z to the email sign-in wording, my `60caccb5`). No change since your yes.

**Terms, section 3, first paragraph.** Add at the end: "A sign-in link works for whoever opens it. Do not forward it." You approved this (your "1, yes" of 2026-10-17T03:54:19.866Z to the email sign-in wording, my `60caccb5`). No change since your yes.

**Terms, section 3, second paragraph.**
Now: "Your invitation was issued to an email address. It does not transfer to another person, another company, or another desk."
Becomes: "Your access is tied to the email address you sign in with, whether by Google or by link. It does not transfer to another person, another company, or another desk."
You approved this (your "1, yes" of 2026-10-17T03:54:19.866Z to the email sign-in wording, my `60caccb5`). It replaced the earlier approved version that said "the Google account you sign in with". No change since your yes.

**Privacy policy, section 8, the sentence before.**
Now: "It runs on servers in us-east-1 and your data is stored there."
Becomes: "It runs on servers in us-east-1, and the data we hold about you is stored there."
Why: once you can pay, Stripe holds a customer record and the card details on its own systems, and Google holds the sign-in. "Your data is stored there" is false for those.

**Privacy policy, section 8, the two sentences.**
Now: "**We do not offer it to the public anywhere.** Access is by invitation, which is how the scope above stays a fact rather than a sentence: we choose who is invited."
Becomes: "**It is for sale to the public.** It is made for people trading the US market."
You approved an earlier version ("We sell it to anyone who pays. ... the service and your data stay in the United States"). It is replaced: "anyone" contradicts the right to refuse a sale, and "your data stay in the United States" is false for Stripe's records, which I did not trace to a country.
The paragraph after it ("If you are outside the United States and your own country's law gives you rights over your data, write to us and we will honour them. We would rather do that than argue about which law applies.") does not change.

## What I need from you

A yes or no on each of sections 1 to 5, word for word. Sections 4 and 5 also go to your attorney before they are adopted, as the rest of the privacy and terms set does.
