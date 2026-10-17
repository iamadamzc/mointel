# The Stripe customer record: privacy lines and one question for him

**Commercial-tmi (8th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** It amends `2026-10-17-free-trial-strings.md` (`83b91561`, section 3) and `2026-10-17-purchase-strings.md` (section 3). Public copy: the exact strings go to him, never a summary.

## What the code does (opened)

At `c0cd16b3`, `lib/billing/checkout.ts`:
- `ensureCustomer` (lines 54 to 61) creates a Stripe Customer with the person's **email address** and a metadata field carrying **our user id**, and writes our link to it (`linkCustomer`, `billing_customers`: user id, Stripe customer id, created time).
- It is called from `createTrialCheckoutSession` (line 163) **before the person has entered a card**, so every press of "Start free trial" creates the customer, finished, abandoned or refused. It is called the same way for a purchase (line 96). The checkout session and the setup intent also carry the email in their metadata at Stripe.
- No code deletes the Stripe customer or the link: a search of `lib`, `app` and `scripts` for a customer delete finds none; the only `customers.update` calls set the default card. The 30-day delete (`store.ts` line 651) removes only `billing_trial_refusals` rows.

## What my drafted lines said, and why they are not enough

They are true about the CARD (detached at once, no code kept for a refusal) and about the refusal record (deleted after 30 days). They say nothing about the customer record, and the refused-trial paragraph ("We keep a short record of the attempt ... We delete this record 30 days after the attempt") reads as if that were everything kept. A reader who is refused would take the email to be gone after 30 days. It is not. The adopted policy also lists no email at Stripe: section 5's Stripe row (in my purchase draft) names card details, postal code and charge records only.

**Yes, the privacy policy must disclose it, in four places.** Lines, for him verbatim:

1. **Section 2, the "When you pay." paragraph, add at its end:** "To take payment we create a customer record for you at Stripe, with your email address and our number for your account, and we keep a link to it with your account."
2. **Section 2, the "When you start a free trial." paragraph, add:** "We create a customer record for you at Stripe when you press Start free trial, before you enter a card, with your email address and our number for your account, and we keep a link to it with your account. It exists even if you do not finish or the trial cannot start."
3. **Section 2, the "If a free trial cannot start." paragraph, last sentence becomes:** "We delete this record 30 days after the attempt. Your customer record at Stripe and our link to it are not part of this record; they are kept as section 6 says."
4. **Section 5, the Stripe row (replaces my earlier replacement):** "Your email address, your card details, billing postal code, the record of each charge, and the check of a card for a free trial".

And one line in **section 6**, which depends on his answer below:

- **If kept for the life of the account (A):** "**Your customer record at Stripe, and our link to it**: for as long as you have an account. If you ask us to delete your account, we delete both. Stripe keeps its record of each charge under its own privacy policy."
- **If a never-bought person's record is deleted (B):** "**Your customer record at Stripe, and our link to it**: if you have never bought, 30 days after your free trial ended or could not start; otherwise for as long as you have an account. If you ask us to delete your account, we delete both. Stripe keeps its record of each charge under its own privacy policy."

Section 7, my earlier deletion exception also needs "and Stripe's own record of each charge": "...except the card code from a free trial, Stripe's reference for the check, and the date, which we keep for the reason in section 2 ... Stripe keeps its own record of each charge under its own privacy policy."

## For him

> **Should a person who never bought have their Stripe customer record deleted after 30 days?**
> Today nothing deletes it, so it stays as long as the account. The lines above say whatever is true either way. **My recommendation: no (option A).** It is the lighter build (none), the email is one the person gave us to sign in, and a person who comes back to buy finds the same customer. The cost is that a refused or abandoned trial leaves an email at Stripe indefinitely; the lines now say so. Option B (delete at Stripe and our link, 30 days after the trial ended or could not start, if never bought) is smaller on privacy and matches the 30 days he ruled for the refusal row, but it is a new build for Billing (and `ensureCustomer` creates with a fixed idempotency key, `tmi-customer-{userId}`, so Billing must check that a purchase soon after a delete does not get the deleted customer back; I did not read how long Stripe replays a key). Either way A is needed first: **section 7 promises deletion on request, and no code or runbook line deletes the Stripe customer.** Someone has to do it by hand in Stripe's dashboard until Billing builds it. That is Ops's and Billing's to write down; it is not his decision.

## Open, named as unknown

- Whether Stripe keeps the email on a deleted customer for its own legal reasons: not read; the lines say Stripe keeps its record of each charge under its own policy and promise nothing more.
- Whether the adopted policy's "info@andromedagenius.com" and "Inc" lines are already replaced in the cut (`0340be93` carries the LLC and `desk@` versions); not part of this file.
