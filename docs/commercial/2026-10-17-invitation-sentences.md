# The "by invitation" sentences in the served legal pages: the exact replacements

**Commercial-tmi (9th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** Integration's checklist item for the switch release (read 167b): the served `docs/legal/terms.md` lines 121 and 134 and `docs/legal/privacy-policy.md` lines 220 to 222 say access is by invitation, and are false once the front page says "Start free trial". They change in the same adoption motion as the terms of sale and the privacy set (`2026-10-17-privacy-changes-final.md`). Changing the adopted terms or policy sets `adopted` back to null and shows the draft banner until he adopts again.

**This file supersedes the earlier drafts of the same sentences** in `2026-10-17-purchase-strings.md` section 2 and section 3 (the Section 8 bullet) and in `2026-10-17-email-signin-strings.md` section 3 where they overlap, because each of those had a sentence with a counterexample I found on re-reading (marked below). Words he approved earlier in those files are approved only in their earlier form; the replacements below need his yes at adoption.

## Terms of service (`terms.md`), section 2, "Who may use it"

**First bullet.**
- Now: "**Access is by invitation.** There is no public sign-up, and an invitation is ours to give and ours to withdraw."
- Becomes: "**Access is by purchase or by the free trial.** You buy on our [terms of sale](/terms-of-sale), which also say how the free trial works. We can refuse a sale, and we can end access as section 9 says."
- Why it differs from the earlier draft ("Access is by purchase. Anyone who is 18 or older can buy it..."): a trial account has access without a purchase, and "anyone ... can buy" is contradicted by the next sentence of the same bullet. The 18 or older rule is already the first bullet.

**Second bullet.** No change. The earlier draft replaced "The desk covers the US market and is offered to people trading it. We do not market it anywhere else." with "We take payment from anyone ...", which is a universal the refusal right in the first bullet contradicts. The sentence in the policy now is true for a product sold to the public, so it stays.

**Third bullet.**
- Now: "You sign in with a Google account. You need to be entitled to use that account."
- Becomes: "You sign in with a Google account, or with a link we email you. You need to be entitled to use that account or that email address."

## Terms of service, section 3, "Your account is yours alone"

**First paragraph, add one sentence at the end:** "A sign-in link works for whoever opens it. Do not forward it."

**Second paragraph.**
- Now: "Your invitation was issued to an email address. It does not transfer to another person, another company, or another desk."
- Becomes: "Your access is tied to the email address you sign in with, whether by Google or by link. It does not transfer to another person, another company, or another desk."

## Privacy policy (`privacy-policy.md`), section 8, "Where the service is, and who it is for"

**The sentence before.**
- Now: "It runs on servers in us-east-1 and your data is stored there."
- Becomes: "It runs on servers in us-east-1, and the data we hold about you is stored there."
- Why: with payment, Stripe holds a customer record and the card details on its own systems, and Google holds the sign-in; "your data is stored there" is false for those. I did not open where Stripe stores its records, so the sentence claims only what we hold.

**The two sentences.**
- Now: "**We do not offer it to the public anywhere.** Access is by invitation, which is how the scope above stays a fact rather than a sentence: we choose who is invited."
- Becomes: "**It is for sale to the public.** It is made for people trading the US market."
- Why it differs from the earlier draft ("We sell it to anyone who pays. ... the service and your data stay in the United States"): "anyone" is contradicted by the terms' right to refuse a sale, and "your data stay in the United States" is a universal with the Stripe counterexample above.
- The paragraph that follows ("If you are outside the United States and your own country's law gives you rights over your data, write to us and we will honour them. We would rather do that than argue about which law applies.") stays.

## Not in this file

The cookie sentence, the Stripe and trial lines and the deletion exceptions are in `2026-10-17-privacy-changes-final.md`. The pointer sentence at the end of terms section 1 is in `2026-10-17-purchase-strings.md` section 2. The terms of sale are `docs/legal/terms-of-sale.md`.
