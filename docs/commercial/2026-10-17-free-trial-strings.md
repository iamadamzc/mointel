# The free trial: the legal words, and where his phrase had to bend

**Commercial-tmi (7th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** His rulings, as Integration relays them (I did not open his turns): "let's also add a 2 day free trial product" (Billing chat, uuid 1e4137d9, 01:25:50Z) and "do a, but let's be clear in the text that we will not charge when the trial ends, we do not store the information and it is only to prevent trial cheating" (Integration chat, uuid 6aff9088, 2026-10-17T02:14:53.870Z). Option (a), as Integration states it: a card is required to start; two free trading days, once per account and once per card; the card is checked with no charge; only Stripe's card fingerprint is kept with the account id and date; the card is detached at once and never charged; after the trial, buying means entering a card again.

The words below are for the terms of sale, the privacy policy, the sentences beside the card field on the trial start screen, and the rules for the pricing page (Marketing writes those). Brackets are facts only Billing or he can fill.

## Answered, and two things left

His answers, typed in this session (2026-10-17): to how long we remember a card that took a trial, "forever"; and for the trial's length, "from session time +48 hours of trading days".

- **The card code is kept for as long as the free trial exists, including after an account is closed.** That is the option I leaned to. The privacy sentences below say it in one plain line and say that deleting an account does not delete the code. I wrote "for as long as we offer the free trial" and not the word "forever": it is the same while the trial exists, and it says when the code goes if the trial is ever withdrawn. If he wants "forever" literally, it is a swap of those words. His attorney has to accept this, because the privacy policy otherwise promises deletion on request.
- **The trial is 48 hours from the moment it starts, and hours on a day the US market is closed do not count.** An hour counts only if it falls inside a paid day (8:00pm ET to 8:00pm ET) that ends on a market day. Example: a trial that starts on a Thursday at 10:00am ET counts 10 hours to Thursday 8:00pm and 24 more through Friday 8:00pm, which is 34; the weekend does not count; Sunday 8:00pm to Monday 10:00am adds 14. It ends **Monday at 10:00am ET.** A trial that starts on a Saturday does not begin to count until Sunday 8:00pm and ends on Tuesday at 8:00pm ET. The end time is known when the trial starts, so the screens show it.
- **One confirmation for him:** is Monday 10:00am the right end for the Thursday example? That is my reading of "from session time +48 hours of trading days".
- **A trial may be refused or ended for using more than one account: yes** (his typed answer, 2026-10-17). The sentence in section 9 stays as drafted. His attorney reads it with the rest.
- **Billing answered his question about a temporary hold** (relayed): possible, not necessary to promise away. Stripe's docs do not say whether a US bank shows it or for how long, and hosted Checkout has no setting to avoid the check. The sentence is now: "Your bank may show a small pending amount while the card is checked. It is not a charge, and we never take it." It is in the terms of sale section 9 and beside the card field. The wording needs his yes with the rest. The trial start screen no longer waits on a fact; it waits on his approval of the words and of the terms of sale changes.

## 1. Where his phrase had to bend

His three points, and what is literally true. I kept his meaning and changed the words where the words would be false.

| His words | True as stated? | The words I used |
| --- | --- | --- |
| "we will not charge when the trial ends" | Yes. Nothing is charged at the start, at the end or after, unless the person later buys. | "We do not charge it, now or when the trial ends." |
| "we do not store the information" | **Not literally.** We never see or keep the card number, expiry or code: that is true. But we do keep a code that identifies the card (Stripe's fingerprint), with the account and the date, and Stripe, which takes the card, handles it and may keep a record of the check. A sentence that says "we store nothing" would be false the first time someone asked about the code. | "We do not keep your card. We keep one code that identifies it, with your account and the date." |
| "it is only to prevent trial cheating" | Yes as a purpose. The word "cheating" is accusatory on a page a stranger reads. | "We use it only to stop the same card starting a second trial." |

Two more places where the words stay careful:
- **"Detached" is not "deleted".** Billing reports from Stripe's API reference (relayed by Integration; I did not open it): detaching a card from a customer is permanent, so the card can no longer be used for payments or be attached again; and Stripe keeps a record of the detached card (its brand, last four digits, expiry, country, type and the code) under Stripe's own privacy policy. Billing found no statement that detaching deletes that record. So no sentence says the card is deleted or that nobody keeps the card details. The sentences say we ask Stripe to remove the card from the account at once, so it can never be charged, and that Stripe keeps a record under its own policy.
- **"No charge" and a bank statement.** Billing read Stripe's pages today (relayed; I did not open them): saving a card "is similar to a payment, but no charge is created", and it "may be necessary to ... check the card's validity with the customer's bank". Stripe's support answers, which are not documentation, say a $0 or rarely $1 validation that is "not always performed". Stripe's docs do not say whether a US bank shows it or for how long; the only page that addresses it is for a French card and says the temporary amount is reversed almost immediately. Billing found no setting in hosted Checkout that chooses $0 over $1 or turns the bank check off; the only way to skip it is our own card form, which puts Stripe's script on our pages, which Web's rule forbids. So it is possible that some banks show a small pending line, and nobody can say how long. The true sentence allows the possibility without promising it or a duration: **"Your bank may show a small pending amount while the card is checked. It is not a charge, and we never take it."** It is in the terms of sale and beside the card field. Only a real card at a real bank shows what one bank displays, and that is his action, never a seat's.

## 2. Terms of sale: the changes

This replaces the default I applied ("no free first day"). The terms of sale are approved text, so each change below needs his yes.

**Section 1, the price table: add a row.**
`| Free trial | no charge | 48 hours, once |`

**Section 2, first sentence.**
- Now: "You save a card the first time you sign in."
- Replace with: "You save a card when you buy your first paid day."

**Add section 9 at the end** (so no existing section number changes; "Who you are buying from" stays section 8):

"## 9. The free trial

You can try the desk free for 48 hours. The clock does not run on days the US market is closed. Each person can take the trial once, and each card can start a trial once.

To start, you enter a card. We use it to check that it has not already been used for a trial. **We do not charge it, now or when the trial ends, and we never will.** As soon as it has been checked, we ask Stripe, our payment processor, to remove it from your account, so it cannot be charged. We do not see your card number and we do not keep your card. Stripe, which takes the card, keeps a record of it under Stripe's own privacy policy. Your bank may show a small pending amount while the card is checked. It is not a charge, and we never take it.

We keep one code that identifies the card, Stripe's reference number for the check, and the time the trial started, with your account. We use them only to stop the same card starting a second trial. We keep them for as long as we offer the free trial, including after you close your account, because otherwise the same card could start a second trial.

When the 48 hours end, your access ends. Nothing is charged and nothing renews. To keep using the desk, you buy a day or a plan and enter a card then.

The 48 hours are counted from the moment the trial starts, and only on days the US market is open. A trial that starts on a Thursday at 10:00am ET ends on the Monday at 10:00am ET. We show you the end time when the trial starts.

If the card cannot be checked, or has already been used for a trial, the trial does not start. We may refuse or end a trial if the same person is using more than one account."

## 3. Privacy policy: the changes

**Section 2, after "When you pay." add a paragraph:**
"**When you start a free trial.** You enter a card on Stripe's page. Stripe checks it, and we ask Stripe to remove it from your account at once; we never charge it. We never receive your card number. Stripe gives us a code that identifies the card. We keep that code, Stripe's reference number for the check, and the time the trial started, with your account, so the same card cannot start a second trial. We keep them for as long as we offer the free trial, including after you close your account. Stripe keeps a record of the card, including its brand, last four digits and expiry date, under its own privacy policy."

**Section 2, after that paragraph, add one more (a trial that cannot start).** Billing read the code (relayed; I did not open it): a card refused at the trial page is detached from the Stripe customer in all four refusal cases before the reason is known, is never charged, and its code is not stored; one row is kept of the attempt: Stripe's reference for the check, our user id, the reason, and the time.
"**If a free trial cannot start.** The card is still removed from your account at once, it is never charged, and we do not keep a code for it. We keep a short record of the attempt: Stripe's reference for the check, your account, the reason it could not start, and the time. [REFUSAL RETENTION]"

**Section 6, add a bullet:**
"**A free trial that could not start**: [REFUSAL RETENTION]."

[REFUSAL RETENTION] is not ruled. His "forever" answer was about the trial code, not about refusals, and Billing's schema comment says "forever" as its own default. Nothing needs the row once the person has seen the page. **My lean: 30 days, then deleted**, the same period as the sign-in link records, because the purpose ends when the page has been shown and a short period is the plainer privacy line. The sentence then reads: "We delete this record 30 days after the attempt." If he wants it kept, the sentence says for how long and why. His call through Integration; Billing builds a daily delete if he picks the short period.

**Section 4 ("Why we hold it"), add a bullet:**
"**To stop the free trial being taken twice.** The card code is kept for this and for nothing else."

**Section 5, the Stripe row (added with the purchase set).**
- Now: "Your card details, billing postal code, and the record of each charge"
- Replace with: "Your card details, billing postal code, the record of each charge, and the check of a card for a free trial"

**Section 6, add a bullet:**
"**The card code from a free trial**: kept for as long as we offer the free trial, including after you close your account."

**Section 7 (your rights), deletion.** Add: "If you ask us to delete your account, we delete it, except the card code from a free trial, Stripe's reference for the check, and the date, which we keep for the reason in section 2: otherwise the same card could start a second trial." [ATTORNEY: whether the policy may keep these after a deletion request, and whether it must name a legal basis.]

## 4. The sentences beside the card field on the trial start screen

Legal text, with the box unticked. Marketing's page words surround them. Same position as the checkout sentences.

"Free for 48 hours. The clock does not run on days the US market is closed. We use your card only to check that it has not been used for a trial before. We do not charge it, now or when the trial ends, and we do not keep it: we keep only a code that identifies it, so the same card cannot start a second trial. We ask Stripe to remove the card from your account at once, so it can never be charged. Stripe keeps a record of the card under its own privacy policy. When the trial ends, nothing is charged and your access ends. Your bank may show a small pending amount while the card is checked. It is not a charge, and we never take it."

"I have read and agree to the [Terms of sale](/terms-of-sale) and the [Terms of service](/terms)."

## 5. Rules for Marketing's pricing page and trial screens

I read them against these. They replace the earlier rule "no free trial", which belonged to the beta.
- The three points are on the page in plain words: no charge when the trial ends; we do not keep the card; the card is only to stop a second trial. Use the sentences above. Do not say "we store nothing", "nothing is kept", "no data" or "your card is deleted".
- The trial is "48 hours", with "the clock does not run on days the US market is closed" in the same place and the end time shown when it starts. It does not say "two days" or "two trading days" alone, which a reader counts differently.
- No "risk-free", "no strings", "cancel anytime" (nothing renews, so there is nothing to cancel), "no commitment" or "try before you buy" as a promise of value. "Once per person and per card" is stated.
- It does not say the trial can be taken again later. It does not name a bank, a network or a vendor other than Stripe where the privacy policy names it.
- The trial is not "a plan". The pricing page lists it apart from the four prices.
- Still in force: prices with a period, "No refunds" near any button that buys, no outcome words, no data-licence claim, no "beta" or "invite".

## 6. The facts

**Received** (Billing's reading of Stripe's API reference, relayed by Integration, 2026-10-17; I did not open it):
- Detaching is permanent. The card can no longer be used for payments or attached again.
- Stripe keeps a record of the detached card (brand, last four digits, expiry, country, type, the code) under Stripe's own privacy policy. No statement was found that detaching deletes it.
- Our side keeps exactly: the user, the card fingerprint, the trial start time, and the setup intent id. No card number, last four or expiry.
- Link (Stripe's wallet) is off for the trial: cards only, because Link carries no fingerprint.
- Trial days count only on trading days.

**Still unknown, and named as unknown in the words:**
1. (Answered by Billing, today: possible, not promised; the sentence above.) How long a bank shows it is unknown and not claimed.
2. How long Stripe keeps its record of the card: Billing read Stripe's privacy policy (section 5, all but the last 2,700 of 102,700 characters): no fixed period; Stripe keeps personal data while it provides services and after, for legal obligations, fraud prevention and tax. No sentence of ours gives a period; it says Stripe keeps a record under its own policy.
3. (Answered by him: 48 hours from the start, counted only on market days. Billing builds the clock to the rule in the Answered section.)
4. (Answered by Billing: the card is taken on Stripe's own hosted page by redirect, on checkout.stripe.com; no card field is on our pages. The privacy line that our pages load nothing from anyone else's servers stays true.)

## 7. Order

The trial words join the purchase motion: adopted together after his attorney's read, when the billing page exists. The trial cannot start before the terms of sale change in section 2 above is approved, because the approved text says a card is saved at first sign-in. Nothing is built or charged.
