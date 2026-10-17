# Purchase pages: the exact legal strings, for him to approve verbatim

**Commercial-tmi (7th tenure), 2026-10-17 (UTC). Nothing here is adopted, built or live.** Each block says what it replaces and where. Marketing writes the pricing and checkout page words and sends them to me to read; the legal text below is mine. The parent document is `docs/commercial/2026-10-16-no-beta-purchase-decisions.md` (`df809387`). The terms of sale draft is `docs/legal/terms-of-sale.md` (same commit as this file).

His rulings these rest on (read at his turns through Integration): the ladder and renewal ("$89, $499, $899", "yes auto renew, make easy cancel. plans renwe on their own. no refunds."), "take whoever pays, say it's for people trading the US market", and, for the kept sentence, "yes to all. except 2." (Integration chat, uuid 0114ba50, 2026-10-17T00:01:01.558Z).

## Answered

His answers (Integration chat, uuid 6c3dc8f3, 2026-10-17T00:12:10.134Z, through Integration): "1, approved. 2, a. 3, a. 4, yes. 5, yes. 6, connected."
- **How a month is counted:** from the day you buy (the 17th to the 17th). Folded into the terms of sale.
- **Notice before a plan price changes:** 30 days. Folded into the terms of sale.
- **Terms of service section 9:** the added line below is approved and is part of the set.
- **A lapsed hour:** the next paid day's charge runs before the board opens; a card that is still failing sees "update your card", not the board. The terms of sale already say sign-in is refused until the card is fixed.

Two items belong to his accountant and attorney and are marked in brackets in the drafts: sales tax on the prices, and how long billing records are kept. The attorney reads the whole terms-of-sale file before adoption.

## 1. Terms of sale

The whole text is `docs/legal/terms-of-sale.md` (DRAFT, not served, not linked). It has eight short sections: what you are buying; daily; plans renew on their own; how to stop; no refunds; disputes; changes; who you are buying from. The exact words he approves are that file at the sha I send with this.

It replaces the held daily-pass draft (2026-09-30), which stays in the repo marked superseded.

## 2. Terms of service: three changes

**Superseded for the first and second bullets of section 2 and the Google wording of section 3 (ninth tenure, 2026-10-17):** the replacements in `2026-10-17-invitation-sentences.md` are the ones he approved last; adopt those, not the text in this section.

The terms are adopted. Changing them sends `adopted` back to null and puts a DRAFT banner on `/terms` until he adopts again (the file's own rule), so these go with the terms of sale in one motion.

**Section 2, first bullet.**
- Now: "**Access is by invitation.** There is no public sign-up, and an invitation is ours to give and ours to withdraw."
- Replace with: "**Access is by purchase.** Anyone who is 18 or older can buy it on our terms of sale. We can refuse a sale, and we can end access as section 9 says."

**Section 2, second bullet.**
- Now: "The desk covers the **US market** and is offered to people trading it. We do not market it anywhere else."
- Replace with: "The desk is for people trading the **US market**. We take payment from anyone, and we do not market it outside the United States."

**Section 3, second paragraph.**
- Now: "Your invitation was issued to an email address. It does not transfer to another person, another company, or another desk."
- Replace with: "Your access is tied to the Google account you sign in with. It does not transfer to another person, another company, or another desk."

**One pointer sentence** goes at the end of section 1: "What you pay and when is in the [Terms of sale](/terms-of-sale)." (The page `/terms-of-sale` does not exist yet; Web builds it with the checkout.)

**Section 9, add this line** (approved):
"If we end your access and the reason is not your breach of these terms, we will make it right for the part of a plan you paid for and did not get."

## 3. Privacy policy: six changes

**Section 2, after "When you use the desk."** Add a paragraph:
"**When you pay.** Stripe, our payment processor, collects your card details and billing postal code on its own page. We never receive your card number. Stripe gives us a customer reference, a payment-method reference, and the result of each charge: the date, the amount, the plan, and whether it was paid or declined. We keep those so the desk can show your billing history and run your plan."

**Section 3, last bullets.**
- Now: "We do not ask for your date of birth, your address, your phone number, or any government identifier."
- Replace with: "We do not ask for your date of birth, your phone number, or any government identifier. When you pay, Stripe asks for your card details and billing postal code on its own page."

**Section 4 ("Why we hold it"), add a bullet:** "**To take payment.** Stripe's references and the record of each charge are how we charge your card, show you what you paid, and end a plan when you cancel."

**Section 5 table, add a row:** "Stripe, Inc. | Your card details, billing postal code, and the record of each charge | It is the payment processor. The card number never reaches our servers."

**Section 6, add a bullet:** "**The record of each charge**: [RECORDS: his accountant sets the period]."

**Section 8, the two sentences after "...your data is stored there."**
- Now: "**We do not offer it to the public anywhere.** Access is by invitation, which is how the scope above stays a fact rather than a sentence: we choose who is invited."
- Replace with: "**We sell it to anyone who pays.** It is made for people trading the US market, and the service and your data stay in the United States."
- The paragraph that follows stays: "If you are outside the United States and your own country's law gives you rights over your data, write to us and we will honour them. We would rather do that than argue about which law applies."

The privacy policy also says in section 1 that the service is "an information service for people who trade US small-cap equities" (unchanged) and in section 4 "We do not send marketing email" (unchanged and still true).

## 4. The sentences beside the pay button

These are legal text, not page copy: the renewal and refund terms have to be stated in plain words next to the button, and the buyer has to tick a box that is not ticked by default. Marketing's page words surround them. Templates; the variables are filled from the plan: {amount} is the dollar figure ("$89"), {for} is "one month", "six months" or "one year", {every} is "month", "six months" or "year". Revised 2026-10-17 (read 149): the daily sentence now says the charge is on each new paid day the buyer signs in on, which is what the build does; the plan sentence carries the amount and its length.

**Daily:**
"You will be charged {amount} now, and automatically on each new paid day you sign in on, on this card, until you stop. A paid day runs 8:00pm ET to 8:00pm ET. No refunds. You can stop in the desk at any time."

**A plan:**
"You will be charged {amount} now for {for}, and again every {every} from {renewal date}, at the price then in force, on this card, until you cancel. You can cancel in the desk at any time and keep access to the end of the period you paid for. No refunds."

**The box, unticked:** "I have read and agree to the [Terms of sale](/terms-of-sale) and the [Terms of service](/terms)."

The first charge, and for a plan the renewal date, are shown on the page before the buyer pays. Nothing is charged before the box is ticked.

## 5. Rules for Marketing's pricing and checkout words

I read them against these when they arrive.

- Every price says US dollars once on the page. No price is stated without its period.
- "No refunds" is on the page, near the button, in the same size as the price line. "Cancel in the desk" is said only when the cancel page exists; until then the page does not say it.
- A percent off is stated against its basis: the plan against the daily price of $5.50 for every trading day in the period. His ladder is 22.6, 27.7 and 34.9 percent under that, on an average month of 20.9 trading days. A page may say "about 23% less than paying daily" with that basis in the same place, or it may say the per-day figure as "about $4.26 a day on an average month". It may not say "save 22.6%" with no basis, because a short month changes it.
- No outcome words (`docs/marketing/what-it-is-not.md` rows 5 and 6): no "edge", "profit", "win", "never miss", no traction ("join", "traders use"), no testimonials. No "free trial" and no "limited". No "beta" and no "invite".
- No claim that the data is licensed or covered by a vendor (his 2026-10-05 ruling: "No surface a tester sees says 'licensed' or 'covered by'"). He now says the licence will be in place. The page may say only what the signed agreement says, after it is signed and I have read the agreement's name and scope.
- "For people trading the US market" appears on the pricing page and the checkout.
- No vendor names (Alpaca, Benzinga, Stripe) except Stripe where the privacy policy names it.
- The paid day is described as his ruling describes it: 8:00pm ET to 8:00pm ET, beginning with the report going into the next premarket.

## 6. What these strings need built, so nobody finds out later

- A billing page in the desk with a cancel in one step, and a remove-card action (Web, Design). The strings promise both.
- An in-desk notice for a price change or a change to these terms (the terms of sale promise one). There is no such notice today.
- A renewal reminder or a receipt by email, only if his attorney says one is due. The desk has no way to send a customer email.
- A `/terms-of-sale` page that renders `docs/legal/terms-of-sale.md` and goes live in one motion with the terms and privacy changes (Web; `lib/legal/document.ts` has a fixed list of files).
- Stripe's hosted page for the card, so the card number never reaches our servers. **This also keeps privacy section 3 true.** That section says "The pages load nothing from anyone else's servers: no fonts, no scripts, no images." If checkout embedded Stripe's own script or form on our page, that sentence would be false on that page and would need rewriting. A redirect to Stripe's page keeps it true (Stripe sets its own cookies on its own page, not ours); Web's link test (`app/page.tsx:35`) forbids an off-site link today and would need a deliberate exception.

## 7. Order

The words that say "by invitation" change in the same release as the first public purchase path, never after. The terms of sale, the terms of service changes and the privacy changes are one motion, adopted by him together. Nothing charges anyone until he approves the first real run (ruled 2026-09-28).
