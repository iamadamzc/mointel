# For your yes: adopting the terms of sale, the terms of service and the privacy policy

**Commercial-tmi (9th tenure), 2026-10-17 (UTC). Exact words. Nothing here is adopted or live.** You ruled (Integration chat bf3b407e, uuid 5a0d0d6c, 2026-10-17T13:20:44.136Z, checked at your turn): prices include tax, charge records are kept 7 years, and adopt now without an attorney's read. This file is what adopting does, line by line. Every sentence you already approved word for word is applied as approved, from the files named below; this file lists only what is new.

**When it publishes.** The terms and the privacy policy are read from the release's files by `/terms` and `/privacy` whether or not buying is open (`lib/legal/document.ts`), so the adopted text goes out with the release that opens buying and not in the release that ships with buying closed; only `/terms-of-sale` is hidden while buying is closed.

## 1. The three blanks, filled

**The sales tax blank.** In `terms-of-sale.md`, section 1, the paragraph "[TAX: his accountant decides whether these prices include sales tax and what the checkout shows.]" becomes:
`Prices include any sales tax.`

**The records blank.** In `privacy-policy.md`, section 6, the bullet "**The record of each charge**: [RECORDS: his accountant sets the period]." becomes:
`**The record of each charge**: kept for 7 years after the charge.`
(Section 7's exception, which you approved, says "for the period in section 6", so it now means 7 years.)

**The attorney notes.** Every "[ATTORNEY: ...]" note is a note to you and is not copied into the served files. They sit in the drafts only (the privacy set `2026-10-17-privacy-changes-final.md`, the terms of sale's header comment). Adopting without the read leaves the questions they ask unanswered: whether the policy may keep the card code and the charge record after a deletion request, whether it must name a legal basis, and whether deleting the Stripe customer answers a deletion request or a Stripe redaction is expected.

## 2. Everything else adoption changes

**`docs/legal/terms-of-sale.md`**
- Front matter becomes `status: adopted`, `adopted: 2026-10-17`, `drafted: 2026-10-17`, `last_changed: 2026-10-17`. The page then shows the adoption date and no DRAFT banner. (If the release is cut on a later day, both dates are that day.)
- The long header comment (the DRAFT NOT SERVED block and the list of open brackets) is replaced by a short adoption record. It is not rendered.
- The body is otherwise as it now stands, including the paid-day text you approved on 2026-10-17 (uuid ebe864a6).

**`docs/legal/terms.md`** (front matter `adopted: 2026-10-17`, `last_changed: 2026-10-17`)
- Section 1, one sentence added at the end: `What you pay and when is in the [Terms of sale](/terms-of-sale).`
- Section 2, first bullet, third bullet; section 3, first and second paragraphs: exactly as approved in `2026-10-17-next-words-for-him.md` (your "yes to all five") and `2026-10-17-email-signin-strings.md` at `60caccb5` (your yes of 03:54:19Z).
- Section 9, one line added: `If we end your access and the reason is not your breach of these terms, we will make it right for the part of a plan you paid for and did not get.` (approved with the purchase set, uuid 6c3dc8f3).
- The header comment's note that the terms have no payment terms is updated: they now point to the terms of sale. Not rendered.

**`docs/legal/privacy-policy.md`** (front matter `adopted: 2026-10-17`, `last_changed: 2026-10-17`)
- Sections 2, 3, 4, 5, 6, 7 and 8 exactly as approved in `2026-10-17-privacy-changes-final.md` (your "1, yes" and "yes", uuids 622497ba and 86158214, and "yes to all five" for sections 7 and 8), plus the session-cookie sentence from the paid-day file.
- The sign-in additions exactly as approved in `2026-10-17-email-signin-strings.md` at `60caccb5`, including section 9: "sign-in is handled entirely by Google" becomes the approved sentence that covers the email link.

**The checkout and trial pages** already link to `/terms-of-sale`; no text change.

**Apply these edits to the release's tree, not to `origin/main`:** the release candidate `5e09179e` already carries the LLC name and the `desk@` address in `terms.md` and `privacy-policy.md`, and `origin/main` does not.

## 3. One promise in the adopted text that adoption triggers

Both documents say the same thing (terms section 11, privacy section 10): if we change something that matters, we tell signed-in users by email before it takes effect, and continuing to use the desk is how they accept it. Adopting these changes is such a change. The people signed in today are your testers. The email, to the people who have signed in, sent before the release that opens buying:

Subject: `Changes to the TMI terms and privacy policy`

`TMI opens to the public on {date}. On that day the terms of service and the privacy policy change, and terms of sale are added.`
`Access is now by purchase or a free trial, not by invitation. The terms of sale say what is charged and when. The privacy policy now covers payment and sign-in by email.`
`You can read all three from {date} at tmitrader.com/terms, tmitrader.com/privacy and tmitrader.com/terms-of-sale. If you keep using the desk after {date}, you accept them.`
`Questions: desk@tmitrader.com.`

{date} is the day buying opens, filled in when it is sent. Who sends it and from which address is Ops's to say (the SES setup approved so far is for sign-in links). Sending it is a message on your behalf, so it needs your yes here.

## What I need from you

A yes or no on each of sections 1, 2 and 3, word for word. If you would rather skip the email in section 3, the terms and privacy still say they will send it; the choice is yours.
