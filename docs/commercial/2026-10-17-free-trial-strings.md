# The free trial: the legal words, and where his phrase had to bend

**Commercial-tmi (7th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** His rulings, as Integration relays them (I did not open his turns): "let's also add a 2 day free trial product" (Billing chat, uuid 1e4137d9, 01:25:50Z) and "do a, but let's be clear in the text that we will not charge when the trial ends, we do not store the information and it is only to prevent trial cheating" (Integration chat, uuid 6aff9088, 2026-10-17T02:14:53.870Z). Option (a), as Integration states it: a card is required to start; two free trading days, once per account and once per card; the card is checked with no charge; only Stripe's card fingerprint is kept with the account id and date; the card is detached at once and never charged; after the trial, buying means entering a card again.

The words below are for the terms of sale, the privacy policy, the sentences beside the card field on the trial start screen, and the rules for the pricing page (Marketing writes those). Brackets are facts only Billing or he can fill.

## NEEDS YOU

Three short questions for him.

**How long do we remember a card that took a trial?** "Once per card" means remembering it. The privacy policy must say for how long.
- Choices: (a) for as long as the account exists, then delete it; (b) for a fixed time after the trial, for example a year, after which the same card could take a trial again; (c) as long as the trial rule exists, stated plainly, including after the account is closed.
- What changes: only (c) stops a person closing an account, opening a new one and taking a second trial on the same card. (a) and (b) let that happen. Under (c) the privacy policy must also say that a request to delete the account does not delete the code, and that is his attorney's to accept.
- My lean: (c), stated in one plain sentence, because "once per card" cannot be true otherwise. His call and his attorney's.

**What are the "two days"?** Two paid days (8:00pm ET to 8:00pm ET) that each end on a day the US market is open. The open question is how they are counted: (a) the first two such days after the trial starts, whether or not the person signs in; or (b) the first two such days the person signs in on, as with a daily buyer. A trial that starts on a Friday evening is Saturday's paid day, which is not a market day, so under either reading the two days are Monday's and Tuesday's.
- My lean: (a). It gives the trial one end time, known when it starts, so the screens can say "Your free trial runs to {trialEnd}" and the terms can say it in one sentence. Under (b) the end depends on when the person next signs in, and every screen that names an end time would have to say "after your second day".

**May a trial be refused or ended for using more than one account?** The draft says we may. It protects the rule he wants. His attorney reads it.

## 1. Where his phrase had to bend

His three points, and what is literally true. I kept his meaning and changed the words where the words would be false.

| His words | True as stated? | The words I used |
| --- | --- | --- |
| "we will not charge when the trial ends" | Yes. Nothing is charged at the start, at the end or after, unless the person later buys. | "We do not charge it, now or when the trial ends." |
| "we do not store the information" | **Not literally.** We never see or keep the card number, expiry or code: that is true. But we do keep a code that identifies the card (Stripe's fingerprint), with the account and the date, and Stripe, which takes the card, handles it and may keep a record of the check. A sentence that says "we store nothing" would be false the first time someone asked about the code. | "We do not keep your card. We keep one code that identifies it, with your account and the date." |
| "it is only to prevent trial cheating" | Yes as a purpose. The word "cheating" is accusatory on a page a stranger reads. | "We use it only to stop the same card starting a second trial." |

Two more places where the words stay careful:
- **"Detached" is not "deleted".** The relay says the card is detached from the Stripe customer at once. That means it cannot be charged. It does not say Stripe erases its record of the card or the check, and Billing is still reading what Stripe keeps. So no sentence says the card is deleted or that nobody keeps it. The sentences say "we ask Stripe to remove it from your account at once, so it cannot be charged".
- **"No charge" and a bank statement.** A card check can show on a bank statement as a pending authorization that is released. Billing has not said whether this one does. If it does, the screen says so in one line, because "no charge" is true and a pending amount on the statement is something a person would otherwise call us about. `[STATEMENT]`

## 2. Terms of sale: the changes

This replaces the default I applied ("no free first day"). The terms of sale are approved text, so each change below needs his yes.

**Section 1, the price table: add a row.**
`| Free trial | no charge | two paid days, once |`

**Section 2, first sentence.**
- Now: "You save a card the first time you sign in."
- Replace with: "You save a card when you buy your first paid day."

**Add section 9 at the end** (so no existing section number changes; "Who you are buying from" stays section 8):

"## 9. The free trial

You can try the desk free for two paid days. Each person can take the trial once, and each card can start a trial once.

To start, you enter a card. We use it to check that it has not already been used for a trial. **We do not charge it, now or when the trial ends, and we never will.** As soon as it has been checked, we ask Stripe, our payment processor, to remove it from your account, so it cannot be charged. We do not see your card number and we do not keep your card.

We keep one code that identifies the card, with your account and the date. We use it only to stop the same card starting a second trial. [FINGERPRINT RETENTION]

When the two days end, your access ends. Nothing is charged and nothing renews. To keep using the desk, you buy a day or a plan and enter a card then.

[TRIAL DAYS: which two days count.]

If the card cannot be checked, or has already been used for a trial, the trial does not start. We may refuse or end a trial if the same person is using more than one account."

## 3. Privacy policy: the changes

**Section 2, after "When you pay." add a paragraph:**
"**When you start a free trial.** You enter a card on Stripe's page. Stripe checks it, and we ask Stripe to remove it from your account at once; we never charge it. We never receive your card number. Stripe gives us a code that identifies the card. We keep that code with your account and the date the trial started, so the same card cannot start a second trial. [FINGERPRINT RETENTION] [STRIPE RETAINS: one sentence on what Stripe may keep, once Billing has read it.]"

**Section 4 ("Why we hold it"), add a bullet:**
"**To stop the free trial being taken twice.** The card code is kept for this and for nothing else."

**Section 5, the Stripe row (added with the purchase set).**
- Now: "Your card details, billing postal code, and the record of each charge"
- Replace with: "Your card details, billing postal code, the record of each charge, and the check of a card for a free trial"

**Section 6, add a bullet:**
"**The card code from a free trial**: [FINGERPRINT RETENTION]."

**Section 7 (your rights), "See what we hold" or deletion:** [ATTORNEY: whether a request to delete the account also deletes the card code. If he picks (c) above, the policy says it does not, and why, in one sentence.]

## 4. The sentences beside the card field on the trial start screen

Legal text, with the box unticked. Marketing's page words surround them. Same position as the checkout sentences.

"Free for two paid days. We use your card only to check that it has not been used for a trial before. We do not charge it, now or when the trial ends, and we do not keep it: we keep only a code that identifies it, so the same card cannot start a second trial. We ask Stripe to remove the card from your account at once. When the trial ends, nothing is charged and your access ends. [STATEMENT]"

"I have read and agree to the [Terms of sale](/terms-of-sale) and the [Terms of service](/terms)."

## 5. Rules for Marketing's pricing page and trial screens

I read them against these. They replace the earlier rule "no free trial", which belonged to the beta.
- The three points are on the page in plain words: no charge when the trial ends; we do not keep the card; the card is only to stop a second trial. Use the sentences above. Do not say "we store nothing", "nothing is kept", "no data" or "your card is deleted".
- "Free for two paid days" says what a day is the first time it appears (a paid day runs 8:00pm ET to 8:00pm ET). It does not say "two days" alone.
- No "risk-free", "no strings", "cancel anytime" (nothing renews, so there is nothing to cancel), "no commitment" or "try before you buy" as a promise of value. "Once per person and per card" is stated.
- It does not say the trial can be taken again later. It does not name a bank, a network or a vendor other than Stripe where the privacy policy names it.
- The trial is not "a plan". The pricing page lists it apart from the four prices.
- Still in force: prices with a period, "No refunds" near any button that buys, no outcome words, no data-licence claim, no "beta" or "invite".

## 6. What I need from Billing, for the brackets

1. What Stripe keeps about a card after it is detached from a customer, and about the check itself. `[STRIPE RETAINS]`
2. Whether the check shows on a cardholder's statement, and for how long. `[STATEMENT]`
3. What the fingerprint is and is not: Stripe's code for a card number, stable across customers on the same Stripe account, not the card number, and whether it changes when a card is reissued.
4. How the "two days" are counted in the build. `[TRIAL DAYS]`
5. What happens when a card is declined, is prepaid, or is a wallet card.
6. Whether the card is taken on Stripe's own page (a redirect), which keeps the privacy policy's line that our pages load nothing from anyone else's servers true, or in an embedded form, which does not.

## 7. Order

The trial words join the purchase motion: adopted together after his attorney's read, when the billing page exists. The trial cannot start before the terms of sale change in section 2 above is approved, because the approved text says a card is saved at first sign-in. Nothing is built or charged.
